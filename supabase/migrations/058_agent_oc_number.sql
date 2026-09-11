-- ═══════════════════════════════════════════════════════════════
-- 058 — Agent Occupancy Certificate (OC) number on agent_profiles
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Confirmed live before drafting (fresh check, this session): no
-- oc_number or similarly-named occupancy-certificate column exists
-- anywhere in this repo's migration history — grepped every migration
-- for rera_number/oc_number/occupancy and only rera_number turned up
-- (on the dead agents/properties/developers schema, and on
-- agent_profiles itself since 052_agent_rera_and_ownership.sql). This
-- is a genuinely new field, not a rename or reuse of anything existing.
--
-- Same pattern as 052 (rera_number) exactly: additive, nullable, no
-- CHECK, no default, no backfill — every existing agent_profiles row
-- is unaffected. No RLS change needed — the existing owner/admin
-- policies on agent_profiles (011_agent_portal_schema.sql) already
-- grant select/update on the whole row, so a new nullable column needs
-- no separate grant.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.agent_profiles
  ADD COLUMN IF NOT EXISTS oc_number text;
