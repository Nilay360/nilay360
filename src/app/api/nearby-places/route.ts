import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

// Public data, no admin gate — same posture as 063_nearby_places_cache.sql's
// RLS: reads are open to anyone (this route mostly reads/serves cached rows),
// but every WRITE to nearby_places_cache must go through the service-role
// client since the migration deliberately defines no INSERT/UPDATE/DELETE
// policy for anon/authenticated roles.
function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Reuses GOOGLE_GEOCODING_API_KEY (@/lib/geocode.ts's server-only, IP/API-
// restricted key — never NEXT_PUBLIC_, never sent to the browser) rather than
// introducing a second env var. Confirmed with Vanith before building: all
// needed Google APIs are enabled on this one key and it is API-restricted
// (not referrer-restricted), which is exactly the restriction mode a
// server-to-server call needs — the same reasoning geocode.ts's own header
// comment lays out for why a referrer-restricted key would fail here. The
// var name is now a little narrower than what it covers (Geocoding + Places),
// but renaming it is a separate, purely cosmetic follow-up — not done here to
// avoid touching an unrelated working env var during this change.
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY

const CATEGORIES = ['hospital', 'school', 'supermarket', 'gas_station', 'shopping_mall'] as const
type Category = typeof CATEGORIES[number]

// Refresh no more than once a week per property+category — see
// 063_nearby_places_cache.sql's header comment. This is the one place that
// cadence is actually enforced.
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const SEARCH_RADIUS_METERS = 5000
// Cap per category — "a reasonable number", per spec.
const TOP_N_PER_CATEGORY = 5

type CachedRow = {
  id: string
  category: string
  name: string
  address: string | null
  distance_meters: number | null
  rating: number | null
  latitude: number | null
  longitude: number | null
  fetched_at: string
}

// Haversine — legacy Places Nearby Search returns each place's own lat/lng
// but no distance-from-origin field, so distance is computed here from the
// property's coordinates (the search origin) to each result.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

async function fetchCategoryFromGoogle(
  category: Category,
  latitude: number,
  longitude: number,
): Promise<Omit<CachedRow, 'id' | 'fetched_at'>[] | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('[nearby-places] GOOGLE_GEOCODING_API_KEY not set — skipping Google call.')
    return null
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${SEARCH_RADIUS_METERS}&type=${category}&key=${GOOGLE_PLACES_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    // ZERO_RESULTS is a normal, successful outcome (no hospitals within
    // radius) — not an error. Only OK and ZERO_RESULTS are treated as
    // "the call worked"; anything else (REQUEST_DENIED, INVALID_REQUEST,
    // OVER_QUERY_LIMIT, UNKNOWN_ERROR) is a real failure for this category.
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[nearby-places] Google Places error for "${category}": ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`)
      return null
    }

    const results = (data.results ?? []) as any[]
    const mapped = results
      .filter(r => r.geometry?.location)
      .map(r => ({
        category,
        name: String(r.name ?? 'Unknown'),
        address: typeof r.vicinity === 'string' ? r.vicinity : null,
        distance_meters: distanceMeters(latitude, longitude, r.geometry.location.lat, r.geometry.location.lng),
        rating: typeof r.rating === 'number' ? r.rating : null,
        // Persisted so the map can plot a real marker later, including for
        // cache-fresh reads that never re-call Google (064_nearby_places_
        // coordinates.sql) — Google already returns this in geometry.location,
        // it just wasn't being kept before.
        latitude: r.geometry.location.lat as number,
        longitude: r.geometry.location.lng as number,
      }))
      .sort((a, b) => (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity))
      .slice(0, TOP_N_PER_CATEGORY)

    return mapped
  } catch (err) {
    console.error(`[nearby-places] Unexpected error fetching "${category}":`, err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const propertyId = body?.propertyId
  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)

  if (!propertyId || typeof propertyId !== 'string' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'propertyId, latitude, and longitude are required' }, { status: 400 })
  }

  const supabase = adminClient()
  const now = Date.now()

  // One category at a time, non-fatal per category — a failure or a stale
  // Google call for "school" must never block "hospital" from refreshing
  // and being returned.
  for (const category of CATEGORIES) {
    const { data: latest, error: latestErr } = await supabase
      .from('nearby_places_cache')
      .select('fetched_at')
      .eq('property_id', propertyId)
      .eq('category', category)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestErr) {
      console.error(`[nearby-places] Cache freshness check failed for "${category}":`, latestErr)
      continue
    }

    const isFresh = latest?.fetched_at && (now - new Date(latest.fetched_at).getTime()) < CACHE_MAX_AGE_MS
    if (isFresh) continue // cache-fresh — skip the Google call for this category entirely

    const freshResults = await fetchCategoryFromGoogle(category, latitude, longitude)
    if (freshResults === null) continue // Google call failed — leave existing (possibly stale, possibly absent) rows as-is

    // Replace wholesale: delete this property+category's old rows, insert the new set.
    const { error: deleteErr } = await supabase
      .from('nearby_places_cache')
      .delete()
      .eq('property_id', propertyId)
      .eq('category', category)
    if (deleteErr) {
      console.error(`[nearby-places] Failed to clear old "${category}" rows:`, deleteErr)
      continue
    }

    if (freshResults.length > 0) {
      const { error: insertErr } = await supabase
        .from('nearby_places_cache')
        .insert(freshResults.map(r => ({ ...r, property_id: propertyId })))
      if (insertErr) {
        console.error(`[nearby-places] Failed to insert new "${category}" rows:`, insertErr)
      }
    }
  }

  // Return whatever is now in the cache for this property, regardless of
  // which categories above succeeded, failed, or were already fresh —
  // the caller always gets the best currently-available data.
  const { data: rows, error: selectErr } = await supabase
    .from('nearby_places_cache')
    .select('id, category, name, address, distance_meters, rating, latitude, longitude, fetched_at')
    .eq('property_id', propertyId)
    .order('distance_meters', { ascending: true })

  if (selectErr) {
    console.error('[nearby-places] Failed to read final cache rows:', selectErr)
    return NextResponse.json({ error: 'Failed to load nearby places' }, { status: 500 })
  }

  const grouped: Record<string, CachedRow[]> = {}
  for (const row of (rows ?? []) as CachedRow[]) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push(row)
  }

  return NextResponse.json({ places: grouped })
}
