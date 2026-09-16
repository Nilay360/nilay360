import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const MAX_OTP_REQUESTS_PER_HOUR = 5

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Test mode: only active when explicitly set AND not in production.
    // Placed before the rate-limit check so test mode is fully exempt — it
    // never touches MSG91 or its quota, so there's nothing to rate-limit.
    if (process.env.MSG91_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, requestId: 'test-mode', testMode: true })
    }

    // Same +91XXXXXXXXXX convention as verify-otp/route.ts's fullPhone — the
    // one canonical format this codebase uses, per 056_phone_normalization.sql.
    const fullPhone = `+91${phone}`

    // Rate limit: 5 sends per phone per hour (059_otp_rate_limiting.sql).
    // Checked before calling MSG91 at all — a caller over the limit never
    // reaches MSG91, so this also protects against burning MSG91 send quota.
    const supabase = adminClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countErr } = await supabase
      .from('otp_requests')
      .select('id', { count: 'exact', head: true })
      .eq('phone', fullPhone)
      .gte('requested_at', oneHourAgo)

    if (countErr) {
      // Fail open on a counting error rather than blocking every OTP send —
      // an unreachable rate-limit table shouldn't take down sign-in/register
      // entirely. Logged loudly so it's visible, not silently ignored.
      console.error('[send-otp] otp_requests count query failed — failing open:', countErr)
    } else if ((count ?? 0) >= MAX_OTP_REQUESTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      )
    }

    const payload = {
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: `91${phone}`,
      sender: process.env.MSG91_SENDER_ID || 'NILAYS',
      otp_length: 6,
    }

    // DIAGNOSTIC — remove after OTP-length instability is resolved
    console.log(`[send-otp DIAG ${new Date().toISOString()}] payload=${JSON.stringify(payload)}`)

    // Explicit timeout — without this, a MSG91 connection that's accepted
    // but never responds (as opposed to erroring immediately) would hang
    // until the platform's own function timeout, leaving the user staring
    // at "Sending OTP…" with zero feedback for minutes. Caught separately
    // from other fetch failures below so a genuine timeout gets its own
    // distinct message/status, not the same generic 500 as a real MSG91
    // rejection or network error — useful both to the user and to anyone
    // reading logs later trying to tell the two apart.
    let response: Response
    try {
      response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': process.env.MSG91_AUTH_KEY!,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      })
    } catch (fetchErr) {
      if (fetchErr instanceof Error && fetchErr.name === 'TimeoutError') {
        console.error('[send-otp] MSG91 request timed out after 12s')
        return NextResponse.json(
          { error: 'The OTP service is taking too long to respond. Please try again in a moment.' },
          { status: 504 }
        )
      }
      throw fetchErr // any other fetch failure (DNS, connection refused, ...) falls through to the outer catch below
    }

    const data = await response.json()

    if (!response.ok || data.type === 'error') {
      console.error('MSG91 send-otp error:', data)
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    // Record this send for future rate-limit counts. Non-fatal — an insert
    // failure here shouldn't fail an OTP send that already succeeded with
    // MSG91; it only means this one send under-counts toward the limit.
    const { error: insertErr } = await supabase
      .from('otp_requests')
      .insert({ phone: fullPhone })
    if (insertErr) console.error('[send-otp] Failed to record otp_requests row:', insertErr)

    return NextResponse.json({ success: true, requestId: data.request_id })
  } catch (error) {
    console.error('send-otp route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
