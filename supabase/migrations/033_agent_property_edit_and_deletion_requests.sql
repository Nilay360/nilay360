-- ═══════════════════════════════════════════════════════════════
-- 033 — Agent property-update RLS + deletion-request column —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Confirmed live before drafting (2026-08-31): property_listings.status
-- is a plain TEXT column — {"format":"text","type":"string"}, no
-- "enum" key in the live OpenAPI schema at all, unlike inquiries.status
-- (public.lead_status) or deals.stage (public.deal_stage), both of
-- which DO show an enum. Live values in use today: 'active',
-- 'pending_review', 'rejected'. This means a future 'removed' status
-- is a one-line application/RLS-policy concern whenever that's built —
-- no ALTER TYPE, no enum migration. Confirmed, not assumed, since this
-- exact question was asked directly before drafting anything.
--
-- Scope, deliberately narrow — schema only, nothing else:
--   PART A grants an assigned agent UPDATE access on their own
--   property_listings row. It does NOT define what "removed" means, it
--   does not gate on it, and it grants no DELETE capability — an
--   agent-facing "delete my listing" action still doesn't exist after
--   this migration, only the ability to UPDATE fields on a row they're
--   assigned to (which a future status-change UI would need anyway).
--
--   PART B adds one nullable column to `reports` so a future deletion-
--   request feature can distinguish itself from a general content
--   report without a new table. No CHECK constraint on its values,
--   same reasoning as `documents.document_type` (011... actually 031)
--   and `calendar_events.event_type` (032): free text, no state
--   machine, no other column's validity depends on it, so an enum
--   would only cost a migration every time the vocabulary needs a new
--   value. All existing and future general reports are unaffected —
--   the column defaults to NULL, nothing currently written to
--   `reports` sets it.
--
-- No admin-side review logic, no new status value, no DELETE policy —
-- all deliberately left for separate, later build work once this is
-- reviewed and applied.
-- ═══════════════════════════════════════════════════════════════

-- PART A — Assigned agent can UPDATE their own property_listings row.
-- Additive only: does not touch the existing seller-scoped UPDATE
-- policy from 003_rls_fixes.sql ("Owners can update own listings",
-- USING seller_email = auth.jwt() ->> 'email') — RLS policies
-- OR-combine, so this only adds a new case where a broader set of rows
-- becomes updatable, by the one additional person who legitimately
-- needs it. Mirrors 026's EXISTS/approved-status pattern exactly (the
-- property_listings SELECT policy for an agent viewing a lead's
-- referenced property), adapted for UPDATE and for the direct
-- assigned_agent_id relationship rather than the inquiry-chain one.

DROP POLICY IF EXISTS "Assigned agent can update own properties" ON property_listings;
CREATE POLICY "Assigned agent can update own properties"
  ON property_listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = property_listings.assigned_agent_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

-- PART B — Deletion-request distinction on reports. Nullable, no
-- default, no CHECK — every existing and future general report is
-- unaffected unless a future feature explicitly sets this.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS request_type text;
