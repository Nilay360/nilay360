-- ═══════════════════════════════════════════════════════════════
-- 051 — Grievance/takedown admin queue extension
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- This EXTENDS the existing `reports` table — it does not create a
-- new table. Grievance/takedown review reuses the same reporter_id/
-- entity_type/entity_id/reason/details/status shape that general
-- content reports already use (same decision already made earlier
-- tonight for the `request_type` column in 033: one table, one
-- concept, distinguished by column values rather than duplicated
-- schema).
--
-- The six-state status vocabulary below maps directly to the
-- compliance brief's flow:
--   Received       -> 'open'           (existing, default, unchanged)
--   Acknowledged    -> 'acknowledged'   (new)
--   Frozen          -> 'frozen'         (new)
--   Under Review    -> 'under_review'   (new)
--   Resolved        -> 'resolved'       (existing, unchanged)
--   Rejected        -> 'dismissed'      (existing, unchanged — this
--                                        migration does not rename
--                                        'dismissed' to 'rejected';
--                                        that would touch every
--                                        existing row and the admin
--                                        UI's REPORT_STATUS_FILTERS
--                                        constant, which is out of
--                                        scope here)
--
-- 'frozen' is a REPORTS status value only in this migration. It is
-- NOT a new property_listings status and this migration makes no
-- schema change to property_listings. Confirmed live before drafting:
-- property_listings.status is plain TEXT with no CHECK constraint
-- (033's finding, re-confirmed today), so an admin action that sets
-- property_listings.status = 'frozen' needs no migration at all —
-- that is application-layer work for a later admin-UI change, out of
-- scope for this schema-only migration. Also re-confirmed today: the
-- public visibility policy "Public can view active listings"
-- (003_rls_fixes.sql) gates on `status = 'active' OR seller_email =
-- auth.jwt() ->> 'email'` — a bare equality check against 'active',
-- not an exclusion list — so a future 'frozen' listing status is
-- automatically excluded from public SELECT with no policy change
-- required. This migration touches no RLS policy.
--
-- SLA columns are plain, nullable timestamptz — no trigger, no
-- auto-computation on insert/update. If an admin wants SLA tracking,
-- they set these manually (e.g. via an admin-UI "Acknowledge" action
-- that also stamps sla_acknowledge_due_at = now() + interval '48
-- hours'). No default is set here because there is no agreed SLA
-- policy yet to encode — same reasoning as request_type in 033
-- (nullable, no CHECK, vocabulary/behavior decided at the
-- application layer, not the schema layer).
-- ═══════════════════════════════════════════════════════════════

-- 1. Widen the status CHECK constraint from 3 values to 6.
--    Postgres has no ALTER CHECK — the constraint must be dropped and
--    recreated. The constraint name below ('reports_status_check') is
--    the default Postgres-assigned name for an inline column CHECK
--    declared as `status text ... check (status in (...))` with no
--    explicit CONSTRAINT name given in 015_reports.sql — this should
--    be confirmed against \d+ reports (or the live pg_constraint
--    catalog) before this migration is applied, in case the name
--    differs.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('open', 'acknowledged', 'frozen', 'under_review', 'resolved', 'dismissed'));

-- Existing default ('open') and existing rows (all necessarily one of
-- the original 3 values, which remain valid members of the new set)
-- are unaffected by this change.

-- 2. SLA tracking columns — additive, nullable, no behavior change
--    for any existing row or query until an admin action starts
--    setting them.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS sla_acknowledge_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_resolve_due_at     timestamptz;

-- No RLS change. admin_select_reports / admin_update_reports
-- (015_reports.sql) already grant admins full select/update on this
-- table, including the two new columns and the three new status
-- values, with no policy edit needed. reports_insert_own is also
-- unaffected — a reporting user still only ever inserts with the
-- unchanged default 'open'.

-- No property_listings change. See header comment above.
