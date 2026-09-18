import crypto from 'crypto'

// Bunny Stream (video.bunnycdn.com) — verified against bunny.net's own API
// reference during investigation (not guessed): Create Video is a plain
// AccessKey-authenticated POST; the actual file bytes never touch our
// server — the client uploads directly to Bunny over the TUS resumable
// protocol using a short-lived, server-minted signature, so the raw
// BUNNY_STREAM_API_KEY is never exposed to the browser.

const BUNNY_STREAM_API_BASE = 'https://video.bunnycdn.com'
export const BUNNY_TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload'

function requireEnv(name: 'BUNNY_STREAM_API_KEY' | 'BUNNY_STREAM_LIBRARY_ID'): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

interface BunnyCreateVideoResult {
  guid: string
  title: string
}

// POST https://video.bunnycdn.com/library/{libraryId}/videos
// Header: AccessKey: <BUNNY_STREAM_API_KEY>
// Body: { title }
// Returns a VideoModel; we only need its guid here.
export async function createBunnyVideo(title: string): Promise<BunnyCreateVideoResult> {
  const libraryId = requireEnv('BUNNY_STREAM_LIBRARY_ID')
  const apiKey = requireEnv('BUNNY_STREAM_API_KEY')

  const res = await fetch(`${BUNNY_STREAM_API_BASE}/library/${libraryId}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bunny create-video failed (${res.status}): ${text || res.statusText}`)
  }

  const json = await res.json()
  if (!json?.guid) throw new Error('Bunny create-video response missing guid')
  return { guid: json.guid as string, title: json.title as string }
}

export interface BunnyTusCredentials {
  tusEndpoint: string
  libraryId: string
  videoId: string
  authorizationSignature: string
  authorizationExpire: number
}

// TUS resumable-upload signature — verified against bunny.net's own docs:
// SHA256(libraryId + apiKey + expirationTime + videoId), hex digest.
// This is what lets the browser upload directly to Bunny without ever
// holding BUNNY_STREAM_API_KEY itself.
export function signBunnyTusUpload(videoId: string, expireSeconds = 3600): BunnyTusCredentials {
  const libraryId = requireEnv('BUNNY_STREAM_LIBRARY_ID')
  const apiKey = requireEnv('BUNNY_STREAM_API_KEY')
  const authorizationExpire = Math.floor(Date.now() / 1000) + expireSeconds

  const authorizationSignature = crypto
    .createHash('sha256')
    .update(`${libraryId}${apiKey}${authorizationExpire}${videoId}`)
    .digest('hex')

  return {
    tusEndpoint: BUNNY_TUS_ENDPOINT,
    libraryId,
    videoId,
    authorizationSignature,
    authorizationExpire,
  }
}

// Thumbnail URL construction: Bunny's webhook payload never includes a
// thumbnail URL (confirmed — it's just {VideoLibraryId, VideoGuid,
// Status}). Bunny's own convention is
// https://{pullZoneHostname}/{videoGuid}/thumbnail.jpg, which needs a
// THIRD Bunny credential/config value (e.g. vz-xxxxxxxx-xxx.b-cdn.net),
// separate from both BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.
// BUNNY_STREAM_PULL_ZONE_HOSTNAME is now configured and confirmed
// working in this environment. The null-check/fallback below is kept
// deliberately — this still needs to fail soft (no thumbnail, not a
// crash) in any environment where that env var isn't set, e.g. a
// preview/staging deploy that hasn't had it added yet.
export function bunnyThumbnailUrl(videoGuid: string): string | null {
  const host = process.env.BUNNY_STREAM_PULL_ZONE_HOSTNAME
  if (!host) return null
  return `https://${host}/${videoGuid}/thumbnail.jpg`
}

// Webhook signature verification: Bunny's docs state the
// X-BunnyStream-Signature header is an HMAC-SHA256 of the raw request
// body keyed with the library's Read-Only API Key — a SEPARATE
// credential from BUNNY_STREAM_API_KEY (the main/full key used above
// for AccessKey auth and TUS signing). BUNNY_STREAM_READONLY_API_KEY is
// now configured and confirmed working (live Bunny webhook calls
// verify correctly). The fallback below is kept deliberately — if this
// env var is ever unset in some environment, verification must still
// fail closed (refuse every request) rather than silently accept
// unverified webhook calls.
export function verifyBunnyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const readOnlyKey = process.env.BUNNY_STREAM_READONLY_API_KEY
  if (!readOnlyKey || !signatureHeader) return false

  const expected = crypto.createHmac('sha256', readOnlyKey).update(rawBody, 'utf8').digest('hex')

  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signatureHeader.trim().toLowerCase(), 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
