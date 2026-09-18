'use client'

import React, { useState } from 'react'

// Bunny Stream's iframe embed shape — verified against bunny.net's own
// docs/search results during Phase 2 investigation:
// https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?autoplay=true
// Unlike lib/bunny.ts's server-side helpers (which import `crypto` and must
// never reach a client bundle), this needs to run in the browser, so it's
// a small standalone helper in this client component instead of importing
// from lib/bunny.ts.
//
// libraryId here is intentionally read from a NEW public env var,
// NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID — not the existing server-only
// BUNNY_STREAM_LIBRARY_ID, which is unreachable from client code. This is
// not a new secret: the library id already appears in plain text inside
// every visitor's rendered iframe src by Bunny's own design (unlike the
// AccessKey / Read-Only key, which stay server-side). Flagging as a new
// required env var — not present as of this investigation — same
// discipline as Phase 1's credential gaps.
function bunnyEmbedUrl(videoId: string): string | null {
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID
  if (!libraryId) return null
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`
}

interface VideoSlideProps {
  videoAssetId: string
  thumbnailUrl: string | null
  title: string
  height: string // matches the sibling <img>'s height at each call site exactly
}

// Tap-to-play only, by design (this feature's whole point tonight): shows
// the already-fetched thumbnail with a play badge until the visitor
// explicitly clicks it. The iframe/player only mounts after that click —
// never on load, never on scroll into view.
//
// Fail-soft, walked through explicitly per the build brief:
// - Missing thumbnail (null, or the <img> itself 404s): falls back to a
//   plain dark tile with just the play icon — never a broken-image icon.
// - Bunny CDN hiccup on the iframe itself: contained inside the iframe's
//   own box: worst case a blank/erroring frame within this one slide,
//   never a crash of the surrounding page (an <iframe> failing to load
//   cannot throw into the parent React tree).
// - Missing NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID: bunnyEmbedUrl() returns
//   null; the click handler no-ops rather than mounting an iframe with an
//   empty/undefined src. The caller (PropertyDetailClient) additionally
//   gates whether this component is rendered at all on that same env var
//   being present, so in practice this branch is a second, redundant
//   safety net, not the only one.
export default function VideoSlide({ videoAssetId, thumbnailUrl, title, height }: VideoSlideProps) {
  const [playing, setPlaying] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)
  const embedUrl = bunnyEmbedUrl(videoAssetId)

  if (playing && embedUrl) {
    return (
      <div style={{ position: 'relative', height, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={embedUrl}
          title={`${title} — walkthrough video`}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    )
  }

  const showThumb = thumbnailUrl && !thumbFailed

  return (
    <div
      onClick={() => { if (embedUrl) setPlaying(true) }}
      style={{
        position: 'relative', height, overflow: 'hidden', cursor: 'pointer',
        background: showThumb ? undefined : 'linear-gradient(135deg, #020C1C 0%, #0A1526 100%)',
      }}
    >
      {showThumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={`${title} — walkthrough video thumbnail`}
          onError={() => setThumbFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', pointerEvents: 'none' }} />
      <div
        aria-label="Play walkthrough video"
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.35)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <span style={{
        position: 'absolute', top: 10, left: 10, padding: '3px 9px', borderRadius: 999,
        background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        Video
      </span>
    </div>
  )
}
