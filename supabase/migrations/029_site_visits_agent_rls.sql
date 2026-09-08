-- ═══════════════════════════════════════════════════════════════
-- 029 — Agent-facing RLS on site_visits (Phase 13 build, 2026-08-31)
--
-- Found while building /agent/site-visits, not applied yet — flagged
-- rather than assumed working, per the standing lesson from earlier
-- tonight (service-role reads prove data exists, never that a real
-- session can see it).
--
-- 006_site_visits.sql's only real, live RLS policies on this table are:
--   "Seller or admin can view visits"   USING seller_email = jwt email OR admin
--   "Seller or admin can update visits" USING seller_email = jwt email OR admin
-- Neither policy has any concept of an assigned agent or of "this visit
-- is linked to one of my leads" — migration 028 added the assigned_to
-- and inquiry_id columns, but (as far as I can confirm without direct
-- pg_policies access — unconfirmed, not assumed) nothing added matching
-- RLS. Without this, every query in /agent/site-visits and the new
-- inline summary on /agent/leads/[id] would silently return zero rows
-- for a real agent session, even though the assigned_to/inquiry_id data
-- is correct — the exact same failure shape as the property_listings
-- gap fixed in 026.
--
-- This migration is additive only (RLS policies OR-combine): it cannot
-- narrow the existing seller/admin policies, it only adds two new cases
-- where an approved agent can also see/update a row.
-- ═══════════════════════════════════════════════════════════════

-- SELECT: the assigned agent, OR the approved agent who owns the linked
-- inquiry (covers a visit an admin/other flow assigned to a lead before
-- assigned_to was set on the visit itself).
DROP POLICY IF EXISTS "Assigned agent can view own site visits" ON site_visits;
CREATE POLICY "Assigned agent can view own site visits"
  ON site_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = site_visits.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = site_visits.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

-- UPDATE: assigned agent only (status changes) — narrower than SELECT on
-- purpose, an agent who only owns the linked lead but isn't the assigned
-- visit agent can view the visit summary but shouldn't change its status.
DROP POLICY IF EXISTS "Assigned agent can update own site visits" ON site_visits;
CREATE POLICY "Assigned agent can update own site visits"
  ON site_visits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = site_visits.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );
