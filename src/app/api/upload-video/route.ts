import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBunnyVideo, signBunnyTusUpload } from '@/lib/bunny'

// Init step only — no video bytes pass through this route. The client
// calls this once a file is picked, gets back Bunny TUS credentials, and
// uploads the actual bytes directly to Bunny from the browser. Mirrors
// the reasoning in supabase/migrations/068_property_video_upload.sql:
// Bunny's Create Video call has to happen here (server-side, holding the
// real AccessKey) before any upload can start, well before a
// property_listings row necessarily exists.

// Client-side pre-check target for a phone-recorded walkthrough clip:
// 90 seconds max, 100 MB max. Reasoning: a typical phone recording at
// 1080p H.264 sits around 8-12 Mbps, so a 90s clip lands in the
// ~90-135MB range at the high end and ~60-90MB in the common case —
// 100MB comfortably admits a normal 60-90s walkthrough while still
// rejecting an accidentally-long or unusually high-bitrate recording
// before it ties up a TUS session. These are enforced client-side
// before this route is even called (duration read from the file's own
// metadata); this route re-validates size only, since duration isn't
// knowable server-side without decoding the file.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 90
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'You must be signed in to upload a video.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const filename = typeof body?.filename === 'string' ? body.filename : ''
    const filetype = typeof body?.filetype === 'string' ? body.filetype : ''
    const sizeBytes = typeof body?.sizeBytes === 'number' ? body.sizeBytes : null

    if (!filename || !filetype) {
      return NextResponse.json({ error: 'filename and filetype are required.' }, { status: 400 })
    }
    if (!ALLOWED_VIDEO_TYPES.includes(filetype)) {
      return NextResponse.json({ error: `Unsupported video type: ${filetype}` }, { status: 400 })
    }
    if (sizeBytes != null && sizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `Video is over the ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit.` },
        { status: 400 }
      )
    }

    const video = await createBunnyVideo(filename)
    const tus = signBunnyTusUpload(video.guid)

    const { error: insErr } = await supabase
      .from('video_upload_sessions')
      .insert([{ video_asset_id: video.guid, user_id: session.user.id, status: 'processing' }])
    if (insErr) {
      console.error('upload-video: video_upload_sessions insert error:', insErr)
      return NextResponse.json({ error: 'Could not start the video upload. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      videoAssetId: video.guid,
      videoAssetProvider: 'bunny',
      tus: {
        endpoint: tus.tusEndpoint,
        headers: {
          AuthorizationSignature: tus.authorizationSignature,
          AuthorizationExpire: String(tus.authorizationExpire),
          LibraryId: tus.libraryId,
          VideoId: tus.videoId,
        },
        metadata: { filetype, title: filename },
      },
    })
  } catch (error) {
    console.error('upload-video: init failed:', error)
    const message = error instanceof Error ? error.message : 'Video upload could not be started.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
