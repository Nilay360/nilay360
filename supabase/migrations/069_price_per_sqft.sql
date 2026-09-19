-- ═══════════════════════════════════════════════════════════════
-- 069 — property_listings.area_sqft / price_per_sqft / show_price_per_sqft
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- NAMING COLLISION, checked and flagged, not a duplicate: property_
-- listings.built_up_area (001_property_listings_and_storage.sql) is
-- the wizard's existing REQUIRED Step 3 field ("Built-up Area (sq
-- ft) *") and stays completely untouched — this migration's area_sqft
-- is a deliberately SEPARATE, optional value, entered only when an
-- agent wants to show a ₹/sq.ft figure. Confirmed with the requester:
-- reusing built_up_area for this was the simpler option (one area
-- value, no drift risk) but was explicitly declined in favor of a
-- second, independent field — that's a deliberate choice, not an
-- oversight, so don't consolidate these later without re-confirming.
--
-- There are ALSO already-existing columns named area_sqft and
-- price_per_sqft — but on the `properties` table
-- (001_nivila_schema.sql), the dead seed/catalog schema from earlier
-- tonight's investigation, not property_listings (the live,
-- user-submitted table everything else in this feature set is built
-- against). Same names, unrelated table, not reused, not a conflict.
--
-- src/app/property/[slug]/PropertyDetailClient.tsx's local `Property`
-- type ALREADY has a `price_per_sqft: number | null` field and ALREADY
-- renders it (next to the main price) — it's just hardcoded to `null`
-- in mapListingToProperty() for every property_listings-sourced row,
-- since that column never existed there before now. This migration
-- lets that existing field/render path actually populate for real
-- listings, rather than adding a second one.
-- ═══════════════════════════════════════════════════════════════

alter table public.property_listings
  add column if not exists area_sqft            integer,
  add column if not exists price_per_sqft        integer,
  add column if not exists show_price_per_sqft   boolean not null default false;
