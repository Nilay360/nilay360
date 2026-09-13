import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geocode'

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// One-time backfill for existing property_listings rows missing coordinates
// (060_property_geocoordinates.sql added the columns with no backfill of its
// own, by design). Processes BATCH_SIZE rows per call rather than the whole
// table at once — even though the current live row count fits in a single
// batch, this keeps the same safe, re-callable shape if the table grows
// before this route is ever needed again. Call repeatedly until `processed`
// comes back 0.
const BATCH_SIZE = 20
// Small delay between sequential Google Geocoding API calls — a one-time,
// non-time-sensitive backfill has nothing to gain from bursting requests,
// and everything to lose from tripping a per-second quota.
const DELAY_MS = 150

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(_req: NextRequest) {
  // Admin-only — verified server-side via the request's own session cookie,
  // never trusted from the client. Same role check as the client-side
  // pattern already established (admin/page.tsx:2480, agents/[slug]/
  // page.tsx's isAdmin), just read from profiles directly here since this
  // is a server context, not the AuthContext hook.
  const cookieClient = await createCookieClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: callerProfile, error: profileErr } = await cookieClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = callerProfile?.role === 'admin' || callerProfile?.role === 'super_admin'
  if (profileErr || !isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Everything past this point uses the service-role client — reading and
  // updating rows regardless of which seller/agent owns them, same as
  // every other admin-only backend action tonight (notify-admin-agent, etc).
  const supabase = adminClient()

  const { data: rows, error: selectErr } = await supabase
    .from('property_listings')
    .select('id, address, locality, city, state, pincode')
    .is('latitude', null)
    .not('address', 'is', null)
    .limit(BATCH_SIZE)

  if (selectErr) {
    console.error('[backfill-geocodes] Failed to select candidate rows:', selectErr)
    return NextResponse.json({ error: 'Failed to query listings' }, { status: 500 })
  }

  const candidates = rows ?? []
  let succeeded = 0
  const failed: { id: string; reason: string }[] = []

  // Sequential, not parallel — see DELAY_MS comment above. Each row is
  // independent: one failure never aborts the rest of the batch.
  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i]
    const addressString = [row.address, row.locality, row.city, row.state, row.pincode]
      .filter(Boolean).join(', ')

    try {
      const geo = await geocodeAddress(addressString)
      if (!geo) {
        failed.push({ id: row.id, reason: 'Geocoding returned no result' })
      } else {
        const { error: updateErr } = await supabase
          .from('property_listings')
          .update({ latitude: geo.latitude, longitude: geo.longitude })
          .eq('id', row.id)
        if (updateErr) {
          failed.push({ id: row.id, reason: `Update failed: ${updateErr.message}` })
        } else {
          succeeded++
        }
      }
    } catch (err) {
      failed.push({ id: row.id, reason: err instanceof Error ? err.message : 'Unexpected error' })
    }

    if (i < candidates.length - 1) await sleep(DELAY_MS)
  }

  return NextResponse.json({
    processed: candidates.length,
    succeeded,
    failed,
  })
}
