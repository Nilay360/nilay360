-- ═══════════════════════════════════════════════════════════════
-- 068 — property_listings video upload (Bunny Stream), Phase 1
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- NAMING — deliberately distinct from the existing, untouched
-- property_listings.video_url (018_kuula_tour_url.sql's sibling
-- column, defined in 001_nivila_schema.sql / 001_property_listings_
-- and_storage.sql): that field is a seller-pasted YouTube/Vimeo embed
-- link, rendered by its own separate "Video Tour" section in
-- PropertyDetailClient.tsx (parseVideoUrl(), ~line 354/2073) — a
-- different concept, staying exactly as-is. Everything here uses the
-- video_asset_* prefix instead, for a seller-UPLOADED clip hosted on
-- Bunny Stream and rendered as a gallery slide (Phase 2, not this
-- migration).
--
-- CHICKEN-AND-EGG PROBLEM AND ITS SOLUTION — flagged per investigation
-- request, not silently assumed away:
--
-- A seller can pick a video file as early as the wizard's Photos step
-- (create flow), long before the property_listings row is inserted at
-- final submit. Bunny's Create Video API call — which mints the
-- video's guid — has to happen right when the file is picked (the TUS
-- upload needs that guid to exist first), so at that moment there is
-- no property_listings.id to attach video_asset_id to yet. Worse,
-- Bunny's transcoding webhook (POST to /api/bunny-webhook) can fire at
-- any time after that — including before the wizard is ever submitted,
-- or never if the seller abandons the wizard entirely — and its
-- payload only carries {VideoLibraryId, VideoGuid, Status}, no
-- listing-identifying metadata at all (confirmed against Bunny's own
-- webhook docs).
--
-- Solution: video_upload_sessions below is keyed purely by
-- video_asset_id (known the instant Bunny's Create Video call
-- returns) and has no dependency on a property_listings row existing.
-- /api/upload-video inserts a 'processing' row into it as soon as the
-- guid is minted; /api/bunny-webhook updates that row's status/
-- thumbnail_url by video_asset_id whenever Bunny calls back — always,
-- regardless of wizard progress. At submit (create) or save (edit),
-- the client reads this session's current row (RLS-scoped to its own
-- user_id) and copies provider/id/status/thumbnail_url into the
-- property_listings write, the same way photo_urls is only written
-- into property_listings at that same moment, not as each photo
-- uploads.
--
-- CREDENTIAL GAPS, flagged rather than worked around — two more Bunny
-- credentials are needed beyond BUNNY_STREAM_API_KEY/LIBRARY_ID before
-- this is usable end-to-end: BUNNY_STREAM_READONLY_API_KEY (webhook
-- signature verification — src/app/api/bunny-webhook/route.ts refuses
-- every request without it) and BUNNY_STREAM_PULL_ZONE_HOSTNAME
-- (thumbnail URL construction — src/lib/bunny.ts's bunnyThumbnailUrl()
-- returns null without it). Both env vars, neither present in this
-- environment as of this migration.
--
-- Known Phase-1 gap, not solved here: if the webhook fires BEFORE
-- submit, video_upload_sessions has the fresh status and the submit-
-- time copy picks it up correctly. If the webhook fires AFTER submit
-- (the far more common case — transcoding takes longer than filling
-- out the rest of the wizard), /api/bunny-webhook ALSO attempts a
-- direct `UPDATE property_listings ... WHERE video_asset_id = $1` so
-- that case self-heals without a separate poller. But if a listing is
-- submitted with video_asset_status still 'processing' AND the seller
-- never revisits/edits that listing again, nothing currently re-checks
-- it once the webhook has already fired and gone — there is no cron or
-- property-detail-page-triggered re-sync in this phase. Flagging this
-- rather than building a poller that wasn't asked for; worth deciding
-- deliberately before Phase 2 ships this as a gallery slide.
-- ═══════════════════════════════════════════════════════════════

alter table public.property_listings
  add column if not exists video_asset_provider     text,
  add column if not exists video_asset_id            text,
  add column if not exists video_asset_status        text
    check (video_asset_status in ('processing', 'ready', 'failed')),
  add column if not exists video_asset_thumbnail_url text;

-- ── video_upload_sessions ──────────────────────────────────────────
-- Decoupled from property_listings entirely, by design (see above).
-- video_asset_id is Bunny's own video guid, already globally unique —
-- used directly as the primary key rather than adding a synthetic one.
CREATE TABLE IF NOT EXISTS public.video_upload_sessions (
  video_asset_id text PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES public.profiles(id),
  status         text NOT NULL DEFAULT 'processing'
                   CHECK (status IN ('processing', 'ready', 'failed')),
  thumbnail_url  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_upload_sessions_user_id ON public.video_upload_sessions(user_id);

ALTER TABLE public.video_upload_sessions ENABLE ROW LEVEL SECURITY;

-- INSERT: only /api/upload-video does this, using the caller's own
-- session-scoped client (not service-role) — so this policy is the
-- real enforcement, not a formality.
DROP POLICY IF EXISTS "User can create own video upload session" ON public.video_upload_sessions;
CREATE POLICY "User can create own video upload session"
  ON public.video_upload_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- SELECT: the uploader polls their own session's status (e.g. while
-- still on the wizard's Photos step, or at submit time to copy the
-- current status into property_listings).
DROP POLICY IF EXISTS "User can view own video upload session" ON public.video_upload_sessions;
CREATE POLICY "User can view own video upload session"
  ON public.video_upload_sessions FOR SELECT
  USING (user_id = auth.uid());

-- No UPDATE policy for any authenticated role, deliberately — status/
-- thumbnail_url are only ever written by /api/bunny-webhook, which
-- authenticates the caller as Bunny itself (HMAC signature over the
-- raw body, verified against the library's Read-Only API key — see
-- that route's own comments for the exact contract and the credential
-- gap it flags) and uses a service-role client to bypass RLS for that
-- single, narrow write. This mirrors the existing
-- check-follow-ups/route.ts precedent: a trusted server-side caller
-- writing on behalf of a row it doesn't itself own, not a user
-- action — never a path a signed-in user's own session can reach.
