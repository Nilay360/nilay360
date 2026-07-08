import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    let userId: string
    let userEmail: string

    // Look up via profiles table (reliable source of truth for phone → user ID)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', fullPhone)
      .maybeSingle()

    if (existingProfile) {
      // ── Existing user ──
      userId = existingProfile.id

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
      const isAgent = account_type === 'agent'
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

      if (createErr || !newUserData.user) {
        console.error('admin.createUser error:', createErr)
        return NextResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        )
      }

      userId    = newUserData.user.id
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
