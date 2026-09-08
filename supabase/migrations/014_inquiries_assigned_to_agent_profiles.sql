-- Fixes the agents-vs-agent_profiles identity split: agent_profiles is the
-- real, canonical agent table (2 real approved agents, backs the live
-- become-an-agent → admin-approval → dashboard-self-edit flow, and is what
-- property_listings.assigned_agent_id already correctly points to).
-- `agents` is dead schema from 001_nivila_schema.sql — 0 real rows besides
-- a test insert made earlier tonight. `inquiries.assigned_to` was pointed
-- at `agents(id)` in 013_inquiries_lead_management.sql, before this split
-- was discovered. This migration re-points it at the real table.
--
-- Confirmed directly before writing this: exactly one non-null value exists
-- in inquiries.assigned_to today (rajesh's inquiry, assigned to the test
-- `agents` row created tonight for manual testing) — not real user data,
-- safe to clear.

-- 1. Clear the one existing test assignment — it references an identity
--    (the test `agents` row) that will not exist in the new FK target.
UPDATE inquiries SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- 2. Drop the old FK to agents(id) and re-add pointing at agent_profiles(id).
--    Constraint name follows Postgres's default auto-naming for a FK added
--    via plain `ADD COLUMN ... REFERENCES` (no explicit CONSTRAINT name was
--    given in 013), i.e. `<table>_<column>_fkey`.
ALTER TABLE inquiries
  DROP CONSTRAINT IF EXISTS inquiries_assigned_to_fkey;

ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES agent_profiles(id) ON DELETE SET NULL;
