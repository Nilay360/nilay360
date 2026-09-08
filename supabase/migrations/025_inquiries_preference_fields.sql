-- ═══════════════════════════════════════════════════════════════
-- 025 — Structured preference fields on inquiries (Property Matching,
-- Phase 10 — Part 1 of 4: schema only)
--
-- Confirmed live via PostgREST OpenAPI introspection (2026-08-30),
-- not assumed, before choosing these types:
--   * property_listings.bedrooms   -> {"format":"text","type":"string"}
--     Real values seen: "2","3","5","5+","7","9" — a free-form text
--     bucket, NOT an integer (note the "5+" value, which would not
--     round-trip through an int column). `bhk` below is TEXT so it
--     can be compared/joined against bedrooms without a type cast or
--     silent truncation of the "5+" bucket.
--   * property_listings.property_category -> {"format":"text","type":"string"}
--     Real values seen: apartment, villa, plot, office, retail,
--     warehouse, penthouse, townhouse — free-form text, not an enum.
--     `property_type_preference` below is TEXT for the same reason.
--   * property_listings.price -> numeric. budget_min/budget_max below
--     are NUMERIC to compare directly against it without a cast.
--
-- All six columns are nullable with NO default — every existing row
-- must read as "no stated preference" (null), not as an inferred
-- zero/empty-string value. Backfilling any of them is a separate,
-- human-reviewed step (see the Part 3 backfill report script), never
-- automatic as part of this migration.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS budget_min                numeric,
  ADD COLUMN IF NOT EXISTS budget_max                numeric,
  ADD COLUMN IF NOT EXISTS bhk                       text,
  ADD COLUMN IF NOT EXISTS preferred_locality        text,
  ADD COLUMN IF NOT EXISTS preferred_city            text,
  ADD COLUMN IF NOT EXISTS property_type_preference  text;
