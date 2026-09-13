-- ═══════════════════════════════════════════════════════════════
-- 060 — Latitude/longitude on property_listings
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Confirmed fresh before drafting (2026-09-12): property_listings has no
-- latitude/longitude columns at all — grepped 001_property_listings_and_
-- storage.sql, the table's only real migration, and confirmed the only
-- lat/lng columns anywhere in this repo's migration history belong to the
-- dead 001_nivila_schema.sql / 002_seed_data.sql schema, never read by any
-- live code path. This is a genuinely new capability, not a rename/reuse.
--
-- Additive only: nullable, no CHECK, no default, no backfill — every
-- existing property_listings row is simply NULL here until either a new
-- submission geocodes it or the backfill pass (proposed separately, not
-- part of this migration) fills it in. Same pattern as 052 (rera_number)
-- and 058 (oc_number) tonight.
--
-- No RLS change needed — property_listings' existing insert/update
-- policies already permit the inserting/owning party to set arbitrary
-- column values on their own row, per 003_rls_fixes.sql / 057 (this
-- session's own SELECT-gap fix); a new nullable column needs no separate
-- grant.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- ── Index — added now, deliberately, not deferred to Phase 5 ──────
--
-- A plain composite B-tree on (latitude, longitude) supports the one
-- query shape every naive "properties near me" implementation starts
-- with: a bounding-box pre-filter (WHERE latitude BETWEEN :minLat AND
-- :maxLat AND longitude BETWEEN :minLng AND :maxLng) before a more
-- precise haversine distance calculation narrows the result further.
-- This is cheap to add now (the table is small, this index costs
-- essentially nothing today) and doesn't preclude anything Phase 5 might
-- choose to add later — a specialized radius-search structure (PostGIS
-- geography column + GiST index, or the earthdistance/cube extension) is
-- an ADDITIONAL, more precise index Phase 5 can layer on top of real
-- coordinate data, not a replacement for this one. Deferring even this
-- basic index would leave every listing geocoded by this migration with
-- no usable index at all until Phase 5 lands — an unforced gap for a
-- near-zero-cost addition.
--
-- Deliberately NOT done here: a PostGIS/geography column, a GiST index,
-- or any actual radius-search query/RPC — those are real Phase 5 design
-- decisions (which extension, which SRID, degrees-vs-meters tradeoffs)
-- that shouldn't be pre-empted by a migration whose only job is adding
-- two nullable numeric columns.
CREATE INDEX IF NOT EXISTS idx_property_listings_lat_lng
  ON public.property_listings (latitude, longitude);
