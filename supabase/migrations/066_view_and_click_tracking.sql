-- ═══════════════════════════════════════════════════════════════
-- 066 — property_view_events + property_image_clicks (item #2)
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- CONFIRMED GENUINELY NEW before drafting: property_listings.views is a
-- dead column (initialized to 0 on creation, read back, never
-- incremented by any live code path — the only increment logic that
-- exists anywhere, increment_property_views() in the dead
-- 001_nivila_schema.sql, targets the dead `properties` seed table and is
-- never called from application code). No per-image click tracking of
-- any kind exists in this schema today. This migration replaces neither
-- — property_listings.views is left completely untouched; these are two
-- new, additive tables.
--
-- WHY TWO TABLES, NOT A COUNTER COLUMN: same reasoning as
-- 065_saved_properties_public_count.sql's live-aggregate-over-trigger
-- decision — a per-event table with a genuine DB-level uniqueness
-- constraint is the only structurally-guaranteed way to dedupe "one
-- view per visitor per day," and per-image click history is itself the
-- point (item #2's actual ask), not something a single counter could
-- represent at all.
--
-- VIEWER IDENTITY: no stable anonymous-visitor identifier exists
-- anywhere in this codebase today (confirmed — useRecentlyViewed.ts
-- stores viewed PROPERTIES per-device, never a visitor identity of any
-- kind). viewer_key is deliberately a single text column covering both
-- cases with a tagged format rather than two nullable uuid columns:
-- 'user:<uuid>' for a signed-in visitor (their real auth.users id) or
-- 'anon:<uuid>' for a signed-out one (a UUID the client generates once
-- and persists to localStorage, mirroring useRecentlyViewed's own
-- storage pattern). A single text column keeps the UNIQUE constraint
-- below simple (one column, not "whichever of two nullable columns is
-- non-null") and keeps the dedup logic identical for both visitor
-- kinds.
--
-- RLS — RECONSIDERED FROM THE ORIGINAL "public view" PLAN:
-- A plain view (public_property_save_counts', public_agent_contact's
-- own pattern) runs with the VIEW OWNER's privileges against the
-- underlying table — that's what lets it see past RLS, but it also
-- means it cannot discriminate by who is asking. Granting such a view
-- to `authenticated` would show every property's view/click numbers to
-- every signed-in visitor equally — any agent could see a competitor's
-- exact analytics. That's the deliberately-intended behavior for saves
-- (a public social-proof count) but is wrong here: view/click analytics
-- must be visible only to admin and to that specific listing's own
-- owner/assigned agent, per spec.
--
-- So instead of a public view, real SELECT policies sit directly on
-- these two tables, restricting rows to: is_admin(), OR the querying
-- user owns the listing (property_listings.user_id = auth.uid()), OR
-- the querying user is the listing's approved assigned agent — the
-- exact "owner or assigned agent" shape already established three times
-- tonight (026_property_listings_assigned_agent_rls.sql,
-- 033_agent_property_edit_and_deletion_requests.sql,
-- 062_capture_360_requests.sql). A normal authenticated query against
-- these tables is then correctly filtered per-row by Postgres itself —
-- no separate aggregate object to keep in sync, and no way for one
-- party's numbers to leak to another.
--
-- WRITES: exclusively via a service-role API route (same posture as
-- 063_nearby_places_cache.sql) — no INSERT/UPDATE/DELETE policy for
-- anon/authenticated on either table. The route is expected to
-- `INSERT ... ON CONFLICT (property_id, viewer_key, view_date) DO
-- NOTHING` for property_view_events (the UNIQUE constraint below is the
-- actual dedup guarantee, not application logic remembering not to
-- double-insert) and a plain INSERT for property_image_clicks (every
-- click is a distinct real engagement event — no day-dedup, per spec).
-- ═══════════════════════════════════════════════════════════════

-- ── Table 1: property_view_events ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_view_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  viewer_key  text NOT NULL,
  view_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, viewer_key, view_date)
);

CREATE INDEX IF NOT EXISTS idx_property_view_events_property_id ON public.property_view_events(property_id);

ALTER TABLE public.property_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner, assigned agent, or admin can view property view events" ON public.property_view_events;
CREATE POLICY "Owner, assigned agent, or admin can view property view events"
  ON public.property_view_events FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = property_view_events.property_id
        AND (
          pl.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.agent_profiles ap
            WHERE ap.id = pl.assigned_agent_id
              AND ap.user_id = auth.uid()
              AND ap.status = 'approved'
          )
        )
    )
  );

-- No INSERT/UPDATE/DELETE policy for any role — every write goes through
-- a service-role API route, which bypasses RLS entirely. Deliberate, not
-- an oversight: there is no legitimate case for a browser-side client
-- (anon or authenticated) to write a view event directly.

-- ── Table 2: property_image_clicks ────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_image_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  image_url   text,
  viewer_key  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_image_clicks_property_id ON public.property_image_clicks(property_id);

ALTER TABLE public.property_image_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner, assigned agent, or admin can view property image clicks" ON public.property_image_clicks;
CREATE POLICY "Owner, assigned agent, or admin can view property image clicks"
  ON public.property_image_clicks FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = property_image_clicks.property_id
        AND (
          pl.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.agent_profiles ap
            WHERE ap.id = pl.assigned_agent_id
              AND ap.user_id = auth.uid()
              AND ap.status = 'approved'
          )
        )
    )
  );

-- No INSERT/UPDATE/DELETE policy for any role — same reasoning as
-- property_view_events above: every write goes through a service-role
-- API route.
