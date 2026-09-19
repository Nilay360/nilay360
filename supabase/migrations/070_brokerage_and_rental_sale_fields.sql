-- ═══════════════════════════════════════════════════════════════
-- 070 — Rental extra fields, sale extra fields, brokerage
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- MAINTENANCE — NOT duplicated, upgraded: property_listings.
-- maintenance_charge (numeric, 001_property_listings_and_storage.sql)
-- already exists and keeps its exact meaning for SALE listings
-- (unchanged, per spec). maintenance_type below is the only new
-- column here — a rental-only mode selector ('included' means no
-- charge applies at all, so maintenance_charge stays null;
-- 'additional' means maintenance_charge holds the ₹ amount, the same
-- existing column, just newly meaningful for rentals now that there's
-- a way to distinguish "not entered" from "included, zero charge").
--
-- NAME COLLISIONS CHECKED, all confirmed to be different, unrelated
-- concepts — not reused, not renamed, kept fully separate:
--   - rera_number: agent_profiles.rera_number already exists
--     (052_agent_rera_and_ownership.sql) — that is the AGENT's own
--     professional RERA registration. This migration's rera_number is
--     a property-level field (the listing/project's RERA number),
--     added fresh to property_listings, a genuinely different concept
--     despite the same word.
--   - listed_by (Owner/Agent/Builder): deliberately NOT named
--     ownership_type — that name already exists on the dead
--     `properties` seed/catalog table (001_nivila_schema.sql) meaning
--     Freehold/Leasehold, an unrelated concept. Also deliberately
--     distinct from property_listings.ownership_warranty_confirmed
--     (053_ownership_warranty.sql) — that's the seller's legal-
--     authority-to-sell confirmation checkbox, not who is posting the
--     listing. Three different "ownership" words, three different
--     things — listed_by picked specifically to not collide with
--     either existing one.
--   - deposit_amount: same name as the dead `properties` table's
--     column (001_nivila_schema.sql, BIGINT) — different, unrelated
--     table, same non-conflict pattern already established in
--     migration 069 for area_sqft/price_per_sqft.
--
-- BROKERAGE, one shared pair of columns for both listing types rather
-- than four separate ones: brokerage_mode's vocabulary covers both
-- ('days_rent'/'months_rent' for rentals, 'percentage'/'fixed' for
-- sale) and brokerage_value is interpreted according to which mode is
-- set — e.g. mode='months_rent', value=1.5 means "1.5 months' rent";
-- mode='percentage', value=2 means "2%". numeric (not integer) since
-- both a fractional month multiplier (0.5, 1.5) and a percentage
-- (2.5%) need decimal precision. A single show_brokerage_details
-- toggle covers both listing types too, since a listing is only ever
-- one type at a time.
-- ═══════════════════════════════════════════════════════════════

alter table public.property_listings
  -- Rental: maintenance mode (amount itself stays in the existing
  -- maintenance_charge column)
  add column if not exists maintenance_type       text
    check (maintenance_type in ('included', 'additional')),
  -- Rental: deposit, availability, tenant preference
  add column if not exists deposit_amount         integer,
  add column if not exists available_from         date,
  add column if not exists preferred_tenant        text
    check (preferred_tenant in ('family', 'bachelor', 'anyone')),
  -- Shared: brokerage (rental days'/months' rent, or sale %/fixed)
  add column if not exists brokerage_mode          text
    check (brokerage_mode in ('days_rent', 'months_rent', 'percentage', 'fixed')),
  add column if not exists brokerage_value         numeric,
  add column if not exists show_brokerage_details  boolean not null default false,
  -- Sale: ownership + RERA
  add column if not exists listed_by               text
    check (listed_by in ('owner', 'agent', 'builder')),
  add column if not exists rera_number             text;
