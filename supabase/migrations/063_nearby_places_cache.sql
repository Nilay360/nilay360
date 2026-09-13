-- ═══════════════════════════════════════════════════════════════
-- 063 — nearby_places_cache: cached Google Places "nearby amenities"
-- results per property (item #10)
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- PURPOSE: display real, verifiable nearby places (hospitals, schools,
-- supermarkets, gas stations, shopping malls) on a property's detail
-- page — sourced from Google Places Nearby Search, not fabricated.
--
-- CACHING STRATEGY (why this table exists at all, not just a live API
-- call on every page view):
--   * Google Places API is billed per request. A property detail page
--     can be viewed many times a day; nearby amenities for a fixed
--     lat/lng essentially never change hour-to-hour, so paying for a
--     fresh Nearby Search call on every single page view would be pure
--     waste — this is the entire reason this cache table exists.
--   * Refresh cadence: no more than once per week per property. The
--     fetch route (not part of this migration) must check the most
--     recent fetched_at for that property_id/category before calling
--     Google at all, and skip the call if within 7 days — OR be
--     triggered on-demand via an explicit admin action (e.g. "force
--     refresh nearby places" on a listing), never automatically more
--     often than the weekly cadence.
--   * This migration only creates the storage; it deliberately does
--     NOT implement the refresh-cadence check itself (no trigger, no
--     cron) — that logic belongs in the application-layer fetch route,
--     which needs the Google API key and real request/error handling,
--     neither of which belongs in SQL.
--
-- SHAPE: one row per actual place found (not one JSON blob per
-- property per category) — deliberate, per spec: easier to query/
-- display/paginate individual places, and easier to reason about
-- per-row staleness (fetched_at) if a future need arises to expire or
-- refresh a single place rather than a whole category blob.
--
-- RLS: public, non-sensitive data — real places near a public listing,
-- the same kind of information Google Maps already shows anyone for
-- free. No owner/agent/admin distinction needed for reads. All writes
-- (insert/update/delete) happen exclusively through the fetch route
-- using the service-role key, which bypasses RLS entirely — so no
-- INSERT/UPDATE/DELETE policy is defined for any authenticated or
-- anonymous role. This mirrors public_agent_contact's read-only-view
-- posture (016_public_agent_contact_view.sql), just as a real table
-- with RLS instead of a view.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.nearby_places_cache (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  category         text NOT NULL
                     CHECK (category IN ('hospital', 'school', 'supermarket', 'gas_station', 'shopping_mall')),
  name             text NOT NULL,
  address          text,
  distance_meters  integer,
  rating           numeric,
  fetched_at       timestamptz NOT NULL DEFAULT now()
);

-- Common query pattern: "show me this property's hospitals" (property_id +
-- category together), not the two columns independently.
CREATE INDEX IF NOT EXISTS idx_nearby_places_cache_property_category
  ON public.nearby_places_cache(property_id, category);

ALTER TABLE public.nearby_places_cache ENABLE ROW LEVEL SECURITY;

-- ── SELECT: anyone, signed in or not — same posture as the property
-- listings themselves being publicly browsable ──
DROP POLICY IF EXISTS "Anyone can read nearby places" ON public.nearby_places_cache;
CREATE POLICY "Anyone can read nearby places"
  ON public.nearby_places_cache FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy for any role — the fetch route writes
-- exclusively via the service-role key, which bypasses RLS. This is
-- deliberate, not an oversight: there is no legitimate case for a
-- browser-side client (anon or authenticated) to write cached Places
-- data directly.
