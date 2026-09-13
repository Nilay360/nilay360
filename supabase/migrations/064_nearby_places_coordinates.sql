-- ═══════════════════════════════════════════════════════════════
-- 064 — Latitude/longitude on nearby_places_cache
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- nearby_places_cache (063) stores distance_meters (derived) but never the
-- place's own coordinates — a gap discovered while building the map marker
-- layer for item #10's redesign: a real marker needs a real position, and
-- distance-from-property alone isn't one. Plotting a marker from
-- distance_meters plus a fabricated bearing would show a hospital in a
-- direction it isn't actually in — actively misleading, not just
-- incomplete, so this is a real schema gap, not a display nicety.
--
-- Additive, nullable, no backfill: existing cached rows simply have NULL
-- lat/lng until their category's next weekly refresh (063's own cadence)
-- repopulates them with real coordinates from Google's own response, which
-- already includes geometry.location — the fetch route just wasn't
-- persisting it until this change. Same pattern as 052/058/060/063
-- tonight: nullable, no CHECK, no default, no backfill pass.
--
-- No RLS change needed — 063's existing "Anyone can read nearby places"
-- SELECT policy and service-role-only write posture apply unchanged to
-- these two new columns.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.nearby_places_cache
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
