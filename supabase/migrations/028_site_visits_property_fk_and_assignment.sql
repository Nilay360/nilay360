-- ═══════════════════════════════════════════════════════════════
-- 028 — Retroactive documentation of a schema change already applied
-- live to site_visits, directly via the Supabase SQL Editor — this
-- file does NOT execute anything new. Same discipline as
-- 010_agents_baseline_documented.sql: the live database is the source
-- of truth, and this migration exists purely so the repo's migration
-- history has a record of what's actually there, instead of drifting
-- further out of sync. Confirmed live via PostgREST/OpenAPI
-- introspection on 2026-08-31 before writing this — not assumed.
--
-- What changed, confirmed live:
--   1. site_visits.property_id was converted from its original TEXT
--      (as created in 006_site_visits.sql, no FK, no format
--      constraint) to a real UUID column.
--   2. A foreign key was added: site_visits.property_id ->
--      property_listings.id, ON DELETE SET NULL.
--   3. A new nullable column `assigned_to` (uuid) was added, FK ->
--      agent_profiles.id, ON DELETE SET NULL.
--   4. A new nullable column `inquiry_id` (uuid) was added, FK ->
--      inquiries.id, ON DELETE SET NULL.
--   5. The one existing row (visitor "prashanth",
--      id 2ee87c98-7e74-453b-b065-60fcf8d9472b) had its property_id
--      nulled — it referenced aaaaaaaa-0000-0000-0000-000000000005,
--      the same dead seed id (from 002_seed_data.sql's `properties`
--      table, never a real property_listings row) already traced back
--      for two orphaned `inquiries` rows before migration 027. Same
--      root cause, same fix shape: null the dead reference, keep the
--      row — no data was lost.
--
-- The SQL below is written the same way 010 documented `agents` — as
-- a safe, idempotent statement of the real schema (CREATE TABLE IF
-- NOT EXISTS style guards throughout), so a fresh environment ends up
-- with the same live shape, NOT as a script meant to be re-run against
-- this production database. Do not execute this file here.
-- ═══════════════════════════════════════════════════════════════

-- 1/5. Null out any dead-seed or otherwise orphaned property_id
--      references before the type conversion, mirroring 027's
--      approach exactly (regex format guard + existence check) rather
--      than a bare cast, since site_visits.property_id had no format
--      constraint either.
UPDATE site_visits
SET property_id = NULL
WHERE property_id IS NOT NULL
  AND (
    property_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR NOT EXISTS (
      SELECT 1 FROM property_listings pl WHERE pl.id = site_visits.property_id::uuid
    )
  );

-- 2. Convert property_id to a real uuid column.
ALTER TABLE site_visits
  ALTER COLUMN property_id TYPE uuid USING property_id::uuid;

-- 3. Add the FK now that every remaining value is valid + real.
ALTER TABLE site_visits
  DROP CONSTRAINT IF EXISTS site_visits_property_id_fkey;
ALTER TABLE site_visits
  ADD CONSTRAINT site_visits_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES property_listings(id)
  ON DELETE SET NULL;

-- 4. assigned_to — which agent this site visit is assigned to.
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE site_visits
  DROP CONSTRAINT IF EXISTS site_visits_assigned_to_fkey;
ALTER TABLE site_visits
  ADD CONSTRAINT site_visits_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES agent_profiles(id)
  ON DELETE SET NULL;

-- 5. inquiry_id — which lead (if any) this site visit is tied to.
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE site_visits
  DROP CONSTRAINT IF EXISTS site_visits_inquiry_id_fkey;
ALTER TABLE site_visits
  ADD CONSTRAINT site_visits_inquiry_id_fkey
  FOREIGN KEY (inquiry_id) REFERENCES inquiries(id)
  ON DELETE SET NULL;
