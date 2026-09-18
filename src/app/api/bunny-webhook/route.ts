import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { verifyBunnyWebhookSignature, bunnyThumbnailUrl } from '@/lib/bunny'

// Bunny Stream calls this when a video's transcoding state changes.
// Confirmed via Bunny's own docs during investigation: the payload is
// thin — {VideoLibraryId, VideoGuid, Status} only, no metadata we set
// at upload time comes back through it. Status is an integer enum;
// 3 = Finished, 5 = Failed (also confirmed against Bunny's docs) — every
// other value is an in-progress transcoding state, left as 'processing'.
//
// This uses a service-role client deliberately, same precedent as
// src/app/api/cron/check-follow-ups/route.ts's getAdminClient(): Bunny
// is an external system with no Supabase session of its own, writing to
// rows it doesn't own by user_id — RLS on video_upload_sessions has no
// UPDATE policy for any authenticated role at all (see migration 068),
// so only a service-role client can perform this write, on purpose.
function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function statusFromBunnyEnum(status: number): 'processing' | 'ready' | 'failed' {
  if (status === 3) return 'ready'
  if (status === 5) return 'failed'
  return 'processing'
}

export async function POST(req: NextRequest) {
  // Raw body required for signature verification — Bunny's docs are
  // explicit that re-serializing the parsed JSON breaks the HMAC, so
  // the text is read once and reused for both verification and parsing.
  const rawBody = await req.text()

  // GAP, not silently worked around: verifying this signature needs the
  // library's Read-Only API Key (a credential distinct from
  // BUNNY_STREAM_API_KEY), which is not present in this environment —
  // see lib/bunny.ts's verifyBunnyWebhookSignature() comment for the
  // full explanation. Until BUNNY_STREAM_READONLY_API_KEY is added,
  // verifyBunnyWebhookSignature() always returns false and every
  // request is refused here, rather than accepting unverified calls
  // that could otherwise flip any video's status from a spoofed
  // request. This route is not usable end-to-end until that key is
  // added and confirmed.
  const signature = req.headers.get('x-bunnystream-signature')
  if (!verifyBunnyWebhookSignature(rawBody, signature)) {
    console.error('bunny-webhook: signature verification unavailable or failed — refusing request. ' +
      'BUNNY_STREAM_READONLY_API_KEY is required for this route; see lib/bunny.ts.')
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  let payload: { VideoLibraryId?: number; VideoGuid?: string; Status?: number }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const videoGuid = payload.VideoGuid
  if (!videoGuid || typeof payload.Status !== 'number') {
    console.error('[bunny-webhook] rejecting: VideoGuid or Status missing/wrong-typed', {
      videoGuid, statusValue: payload.Status, statusType: typeof payload.Status,
    })
    return NextResponse.json({ error: 'Missing VideoGuid or Status' }, { status: 400 })
  }

  const status = statusFromBunnyEnum(payload.Status)
  // null until BUNNY_STREAM_PULL_ZONE_HOSTNAME is configured — see
  // lib/bunny.ts's bunnyThumbnailUrl() comment. Written as null rather
  // than omitted, so a previously-set thumbnail_url is never silently
  // left stale once this route starts running for real.
  const thumbnailUrl = status === 'ready' ? bunnyThumbnailUrl(videoGuid) : null
  const supabase = getAdminClient()

  // Authoritative record — always written, regardless of whether a
  // listing has claimed this video_asset_id yet (see migration 068's
  // chicken-and-egg explanation).
  //
  // TEMPORARY DIAGNOSTIC: .select() added so we can see exactly how many
  // rows this UPDATE actually touched — plain .update().eq() with no
  // .select() returns no error on a zero-row match, which is exactly
  // the failure mode being investigated (200 OK, no error, nothing
  // changed). Remove the .select() + the block below once resolved.
  const { data: updatedSessionRows, error: sessionErr } = await supabase
    .from('video_upload_sessions')
    .update({ status, thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
    .eq('video_asset_id', videoGuid)
    .select('video_asset_id, status, updated_at')
  if (sessionErr) {
    console.error('bunny-webhook: video_upload_sessions update error:', sessionErr)
    return NextResponse.json({ error: 'Could not record video status' }, { status: 500 })
  }

  if (!updatedSessionRows || updatedSessionRows.length === 0) {
    // Zero rows matched — the exact symptom reported. Pull back whatever
    // IS in the table so the incoming videoGuid can be diff'd against
    // real stored values (case, whitespace, truncation) instead of
    // guessing. Diagnostic-only reads, no writes.
    const [{ data: caseInsensitiveMatch }, { data: recentSessions }] = await Promise.all([
      supabase.from('video_upload_sessions').select('video_asset_id, status, created_at').ilike('video_asset_id', videoGuid),
      supabase.from('video_upload_sessions').select('video_asset_id, status, created_at').order('created_at', { ascending: false }).limit(5),
    ])
    console.error('[bunny-webhook] ZERO ROWS MATCHED for video_asset_id — diagnostic dump:', {
      incomingVideoGuid: videoGuid,
      incomingVideoGuidCharCodes: Array.from(videoGuid as string).map(c => c.charCodeAt(0)),
      caseInsensitiveMatch,
      mostRecentSessionsInTable: recentSessions,
    })
  }

  // Best-effort direct sync — covers the common case where the webhook
  // fires after the listing has already been submitted/saved with this
  // video_asset_id. If no row matches yet (webhook arrived first), this
  // is a no-op; the eventual submit/save reads the session row above
  // instead. See migration 068 for the known gap this does NOT cover.
  //
  // Unlike the video_upload_sessions update above, a zero-row match here
  // is EXPECTED in the common case (no listing has claimed this
  // video_asset_id yet) — so this stays a plain console.log for
  // visibility only, not an error/diagnostic dump. If this starts
  // showing up unexpectedly often for videos that DO have a listing
  // already, that's worth investigating as its own issue.
  const { data: updatedListingRows, error: listingErr } = await supabase
    .from('property_listings')
    .update({ video_asset_status: status, video_asset_thumbnail_url: thumbnailUrl })
    .eq('video_asset_id', videoGuid)
    .select('id')
  if (listingErr) {
    console.error('bunny-webhook: property_listings sync error:', listingErr)
    // Not fatal — the session row above is already the source of truth.
  } else if (!updatedListingRows || updatedListingRows.length === 0) {
    console.log('[bunny-webhook] property_listings sync: no listing has claimed this video_asset_id yet (expected no-op)', { videoGuid })
  }

  return NextResponse.json({ ok: true })
}
