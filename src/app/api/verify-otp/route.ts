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

// Supabase's admin.listUsers() max page size. Loops until either a match is
// found or a page comes back short (the last page) — does not assume the
// user base fits in one page, since that wasn't confirmed against live data.
const LIST_USERS_PAGE_SIZE = 1000

// Used only for the 'phone_exists' conflict path below: the attempted
// email has no guaranteed relationship to the real account's actual stored
// email, so the real account must be found by phone first, independent of
// whatever email this login attempt happened to use.
async function findUserByPhone(
  supabase: ReturnType<typeof adminClient>,
  phone: string
): Promise<{ id: string; email: string | null } | null> {
  // auth.users.phone is stored without a leading '+' by Supabase's phone
  // auth (E.164 digits only) — this app's own `fullPhone` convention
  // includes it (e.g. profiles.phone). Compare against both forms rather
  // than assume one, since this wasn't confirmed against live data either.
  // If neither form matches anywhere, this safely returns null rather than
  // silently matching the wrong user.
  const bare = phone.replace(/^\+/, '')

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: LIST_USERS_PAGE_SIZE })
    if (error) {
      console.error('[verify-otp] listUsers error while searching by phone:', error)
      return null
    }
    const match = data.users.find(u => u.phone === phone || u.phone === bare)
    if (match) return { id: match.id, email: match.email ?? null }
    if (data.users.length < LIST_USERS_PAGE_SIZE) return null // last page, no match anywhere
  }
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
    // (see below) — signals that Step 3 needs to run the created_at safety
    // check and self-heal the missing profiles row once it has recovered
    // the real user id.
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

      if (createErr?.code === 'phone_exists') {
        // Production incident, confirmed 2026-09-08/09: the attempted email
        // has no guaranteed relationship to the real account's actual
        // stored email — it can be a fresh synthetic value with no match
        // anywhere. Using it for generateLink caused Supabase to silently
        // CREATE A NEW ACCOUNT instead of erroring (the prior hotfix's bug,
        // confirmed creating real duplicate profiles in production —
        // reverted in a60c625). Never do that again: find the real account
        // by phone first, and only ever use ITS real stored email below.
        const realUser = await findUserByPhone(supabase, fullPhone)

        if (!realUser) {
          console.error(`[verify-otp] phone_exists conflict for ${fullPhone} but listUsers found no matching account — failing safely, not guessing.`)
          return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
          )
        }
        if (!realUser.email) {
          console.error(`[verify-otp] phone_exists conflict for ${fullPhone} — matched user ${realUser.id} has no email on file, generateLink is impossible. Failing safely.`)
          return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
          )
        }

        userEmail = realUser.email
        selfHealNeeded = true
      } else if (createErr?.code === 'email_exists') {
        // Safe, unambiguous: the email THIS ATTEMPT used is, by definition,
        // the one already registered on some account.
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

    if (selfHealNeeded) {
      // Last line of defense: if generateLink's resolved user was created
      // essentially right now, it didn't find an existing account — it
      // just silently made a new one (exactly last time's failure mode).
      // Refuse to proceed rather than sign the client into an account that
      // shouldn't exist. This can't undo a bad account generateLink may
      // already have created — but it guarantees no session/profile
      // self-heal ever completes for it, and the request fails safely
      // instead of succeeding on the wrong account. Deliberately not
      // auto-deleting the account here: an automated destructive action
      // inside a hot auth path is exactly the kind of autonomous overreach
      // that caused the original incident — logging the id for manual
      // review is the safer choice.
      const createdAtMs = linkData.user?.created_at ? new Date(linkData.user.created_at).getTime() : NaN
      const ageMs = Date.now() - createdAtMs
      const RECENT_ACCOUNT_THRESHOLD_MS = 10_000

      if (!linkData.user?.id || !Number.isFinite(ageMs) || ageMs < RECENT_ACCOUNT_THRESHOLD_MS) {
        console.error(
          `[verify-otp] SAFETY ABORT for ${fullPhone}: generateLink resolved to user ` +
          `${linkData.user?.id ?? 'unknown'} created ${Number.isFinite(ageMs) ? ageMs + 'ms' : 'unknown time'} ago — ` +
          `looks like a new account was just silently created instead of an existing one being found. ` +
          `Manual review needed for this user id.`
        )
        return NextResponse.json(
          { error: 'Failed to complete sign-in. Please try again.' },
          { status: 500 }
        )
      }

      // Minimal, honest self-heal (confirmed via investigation, 2026-09-09):
      // full_name/email are NOT reliably recoverable from auth.users — for
      // this app's test account, auth.users never had them at all
      // (raw_user_meta_data.full_name was empty, email was the synthetic
      // placeholder). profiles is this app's real source of truth for that
      // data; once its row is deleted, that data is honestly gone, not
      // reconstructable from auth.users no matter how this is implemented.
      // Restore only what's genuinely known to be safe and correct — the
      // existing "Complete your profile" flow already prompts for full_name
      // on next load when it's missing, same as it does for any account
      // still filling in its profile.
      const { error: selfHealErr } = await supabase.from('profiles').upsert({
        id:          linkData.user.id,
        // full_name is NOT NULL with no default — '' is the genuinely
        // honest value here (unknown, not fabricated), and the existing
        // "Complete your profile" flow already prompts for it when blank.
        full_name:   '',
        phone:       fullPhone,
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
