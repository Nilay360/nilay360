-- ═══════════════════════════════════════════════════════════════
-- 030 — Deals table (Phase 15/16 groundwork) — DRAFTED FOR REVIEW,
-- NOT APPLIED. Same review discipline as 029: this file has not been
-- run against the database. Do not apply until reviewed line by line.
--
-- Confirmed live before drafting (2026-08-31): no existing "deal" /
-- pipeline / booking table anywhere in the public schema — the only
-- name match for that family was `transactions`, which is a payment/
-- billing record (gateway/invoice/GST fields), unrelated to a
-- property-sale pipeline. `inquiries` (assigned_to, property_id,
-- status enum) and `site_visits` (assigned_to, inquiry_id,
-- property_id) are the closest existing anchor points, which is why
-- this table links back to both rather than duplicating their fields.
-- ═══════════════════════════════════════════════════════════════

-- 1. deal_stage enum — order given is the intended lifecycle order
--    (Postgres enums are ordered by declaration, which matters if this
--    is ever sorted/compared by stage progression later).
CREATE TYPE deal_stage AS ENUM (
  'negotiation',
  'booking',
  'agreement',
  'registration',
  'closed',
  'lost'
);

-- 2. deals table.
CREATE TABLE deals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id     uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  site_visit_id  uuid REFERENCES site_visits(id) ON DELETE SET NULL,
  property_id    uuid REFERENCES property_listings(id) ON DELETE SET NULL,
  assigned_to    uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE RESTRICT,
  stage          deal_stage NOT NULL DEFAULT 'negotiation',
  deal_price     numeric,
  lost_reason    text,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),

  -- 3. CHECK constraint, not a trigger — the rule ("lost_reason can only
  --    be non-null when stage = 'lost'") only ever needs to see the row
  --    being written, no reference to the row's prior state (this isn't
  --    "lost_reason can only be set once" or "can't be cleared after
  --    being set" — either of those would need a trigger comparing OLD
  --    vs NEW). A single-row CHECK is simpler, declarative, and enforced
  --    the same way for INSERT and UPDATE with zero extra code.
  CONSTRAINT deals_lost_reason_requires_lost_stage
    CHECK (lost_reason IS NULL OR stage = 'lost')
);

CREATE INDEX idx_deals_assigned_to   ON deals(assigned_to);
CREATE INDEX idx_deals_inquiry_id    ON deals(inquiry_id);
CREATE INDEX idx_deals_site_visit_id ON deals(site_visit_id);
CREATE INDEX idx_deals_property_id   ON deals(property_id);

-- 5. Enable RLS explicitly.
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — mirrors 029's structure: assigned-agent ownership
-- check via agent_profiles.user_id = auth.uid() AND status = 'approved',
-- OR public.is_admin() (SECURITY DEFINER, checks profiles.role IN
-- ('admin','super_admin') — reused from 008_admin_profiles_rls.sql, not
-- redefined). No public/seller policy at all — unlike inquiries or
-- site_visits, this table has no public-facing origin; a deal is
-- created by an agent, not submitted by a visitor.

DROP POLICY IF EXISTS "Assigned agent or admin can view deals" ON deals;
CREATE POLICY "Assigned agent or admin can view deals"
  ON deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = deals.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Assigned agent or admin can update deals" ON deals;
CREATE POLICY "Assigned agent or admin can update deals"
  ON deals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = deals.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: an agent may only create a deal assigned to their own
-- agent_profiles.id (WITH CHECK runs against the row being inserted, so
-- this reads deals.assigned_to as the NEW row's value) — prevents one
-- agent creating a deal pre-assigned to a different agent. Admins are
-- not bound by that restriction.
DROP POLICY IF EXISTS "Assigned agent or admin can create deals" ON deals;
CREATE POLICY "Assigned agent or admin can create deals"
  ON deals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = deals.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );
