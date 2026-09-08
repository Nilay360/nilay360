import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordConsent } from '@/lib/consent'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, otp } = body
    // Registration-only fields (absent on sign-in)
    const { email, full_name, account_type, city, whatsapp } = body

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
    }

    // ── Step 1: Verify OTP ───────────────────────────────────────────────────
    // Test mode: only active locally when MSG91_TEST_MODE=true (never in production)
    const isTestMode =
      process.env.MSG91_TEST_MODE === 'true' &&
      process.env.NODE_ENV !== 'production'

    if (!isTestMode || otp !== '123456') {
      const msg91Res = await fetch(
        `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${phone}`,
        { method: 'GET', headers: { authkey: process.env.MSG91_AUTH_KEY! } }
      )
      const msg91Data = await msg91Res.json()
      if (!msg91Res.ok || msg91Data.type === 'error') {
        return NextResponse.json(
          { error: 'Invalid or expired OTP. Please try again.' },
          { status: 400 }
        )
      }
    }

    // ── Step 2: Find or create the Supabase user ─────────────────────────────
    const supabase = adminClient()
    const fullPhone = `+91${phone}`
    // Synthetic email for phone-only users (internal only, never shown to users)
    const syntheticEmail = `phone_${phone}@auth.nilay360.com`

    let userEmail: string
    const isAgent = account_type === 'agent'
    // Set when admin.createUser() fails because the account already exists
    // (see below) — signals that Step 3 needs to self-heal the missing
    // profiles row once it has recovered the real user id.
    let selfHealNeeded = false

    // Look up via profiles table (reliable source of truth for phone → user ID)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', fullPhone)
      .maybeSingle()

    if (existingProfile) {
      // ── Existing user ──
      const userId = existingProfile.id

      // generateLink requires the user to have an email in auth.users.
      // Older accounts created via Supabase phone OTP may have none — patch them.
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)

      if (authUser?.email) {
        userEmail = authUser.email
      } else {
        await supabase.auth.admin.updateUserById(userId, {
          email: syntheticEmail,
          email_confirm: true,
        })
        userEmail = syntheticEmail
      }
    } else {
      // ── New user — create + upsert profile ──
      const { data: newUserData, error: createErr } = await supabase.auth.admin.createUser({
        phone:         fullPhone,
        phone_confirm: true,
        email:         email || syntheticEmail,
        email_confirm: true,
        user_metadata: {
          full_name:    full_name   || '',
          account_type: account_type || 'individual',
        },
      })

      // Production bug (confirmed via live logs, 2026-09-08): the profiles
      // lookup above is the only "does this user exist" check, so a prior
      // signup attempt that created the auth.users row but never completed
      // the profiles upsert (write failure, interrupted request, repeated
      // test attempts, etc.) makes every later retry wrongly take this
      // "new user" branch again. createUser then correctly rejects the
      // duplicate phone/email with a 422 (email_exists/phone_exists) — this
      // used to fall straight into the generic 500 below. Instead: treat a
      // duplicate-account conflict as proof the auth.users account already
      // exists, and fall through to Step 3 as an existing-user login. The
      // `status === 422` check is a defensive fallback in case this SDK
      // version doesn't populate `.code` on the error object.
      const isDuplicateConflict =
        createErr?.code === 'email_exists' ||
        createErr?.code === 'phone_exists' ||
        createErr?.status === 422

      if (isDuplicateConflict) {
        console.error(
          `[verify-otp] createUser conflict (${createErr?.code ?? createErr?.status}) for ${fullPhone} — ` +
          `an auth.users account already exists with no matching profiles row. ` +
          `Falling back to existing-user login instead of failing.`
        )
        userEmail = email || syntheticEmail
        selfHealNeeded = true
      } else if (createErr || !newUserData.user) {
        console.error('admin.createUser error:', createErr)
        return NextResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        )
      } else {
        const userId = newUserData.user.id
        userEmail = email || syntheticEmail

        // Profile upsert — non-fatal: user is created, profile can self-heal on
        // next sign-in if this write fails.
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id:          userId,
          full_name:   full_name || '',
          phone:       fullPhone,
          city:        city     || null,
          role:        isAgent ? 'agent' : 'buyer',
          is_verified: !isAgent,
          whatsapp:    whatsapp ? fullPhone : null,
        })
        if (upsertErr) console.error('Profile upsert error:', upsertErr)

        // Consent capture — new registrations only, never on plain sign-in.
        // The client already gated the checkboxes before this request was
        // ever sent; this just records that agreement server-side. Non-fatal
        // by design (see recordConsent) — never blocks account creation.
        await recordConsent(supabase, {
          userId,
          context: 'registration',
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          userAgent: req.headers.get('user-agent'),
        })
      }
    }

    // ── Step 3: Mint a session token via generateLink ────────────────────────
    // generateLink returns a hashed_token the client exchanges for a real
    // Supabase session using supabase.auth.verifyOtp({ token_hash, type }).
    // This is the correct approach for supabase-js v2 without a password flow.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type:  'magiclink',
      email: userEmail,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkErr, linkData)
      return NextResponse.json(
        { error: 'Failed to complete sign-in. Please try again.' },
        { status: 500 }
      )
    }

    // Self-heal path for the duplicate-conflict fallback above: generateLink's
    // response includes the full user object for the email it resolved,
    // which is how the real user id is recovered without a separate lookup
    // call — createUser's own conflict error doesn't return one. Upsert the
    // missing profiles row now that we have it.
    if (selfHealNeeded && linkData.user?.id) {
      const { error: selfHealErr } = await supabase.from('profiles').upsert({
        id:          linkData.user.id,
        full_name:   full_name || '',
        phone:       fullPhone,
        city:        city     || null,
        role:        isAgent ? 'agent' : 'buyer',
        is_verified: !isAgent,
        whatsapp:    whatsapp ? fullPhone : null,
      })
      if (selfHealErr) console.error('[verify-otp] Self-heal profile upsert error:', selfHealErr)

      // Same non-fatal registration-context consent capture as the genuine
      // new-user path — this really is this person's first completed
      // registration, even though the auth.users row predates it.
      await recordConsent(supabase, {
        userId: linkData.user.id,
        context: 'registration',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent'),
      })
    }

    return NextResponse.json({
      success:    true,
      verified:   true,
      token_hash: linkData.properties.hashed_token,
      type:       'magiclink',
      isNewUser:  !existingProfile,
      isAgent:    account_type === 'agent',
    })
  } catch (error) {
    console.error('verify-otp route error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
