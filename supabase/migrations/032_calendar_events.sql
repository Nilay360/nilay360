-- ═══════════════════════════════════════════════════════════════
-- 032 — Calendar Events table — DRAFTED FOR REVIEW, NOT APPLIED. Same
-- review discipline as 029/030/031: this file has not been run against
-- the database. Do not apply until reviewed line by line.
--
-- Confirmed live before drafting (2026-08-31): no calendar/schedule/
-- event/availability/reminder table exists anywhere in the public
-- schema. Unlike site_visits (028) or the KYC-document design fragment
-- (001_nivila_schema.sql's agents.kyc_status/kyc_documents), this is a
-- genuinely new table — there is no dead schema being retrofitted here,
-- nothing to reconcile against, no prior abandoned attempt at this
-- concept.
--
-- event_type is TEXT, not an enum — deliberately following
-- `documents.document_type`'s precedent rather than `deals.stage`'s.
-- The distinction: deal_stage is a real state machine (ordered
-- progression, a CHECK constraint tying lost_reason to one specific
-- state) — an event_type is pure categorization ('call', 'meeting',
-- 'personal', 'other') with no transitions, no ordering, and no other
-- column's validity depends on its value. An enum would buy nothing
-- here but a migration every time a new type is wanted.
--
-- reminder_sent is a plain boolean, not the metadata-based dedup the
-- follow-ups cron (check-follow-ups/route.ts) uses. Different problem
-- shape: a follow-up date can be edited repeatedly (same inquiry, many
-- possible dates over time), so that cron dedupes per (inquiry_id,
-- specific date) using metadata because there's no single natural
-- "already handled" flag on the inquiry row itself. A calendar_events
-- row is different — it's already one row per event, so it needs
-- exactly one bit of state: has *this* row's reminder fired yet.
-- A boolean is the direct, correct fit; reusing the metadata-dedup
-- pattern here would just be indirection with no benefit.
-- ═══════════════════════════════════════════════════════════════

-- 1. calendar_events table.
CREATE TABLE calendar_events (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id            uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  title                       text NOT NULL,
  description                 text,
  event_type                  text NOT NULL,
  start_at                    timestamptz NOT NULL,
  end_at                      timestamptz,
  location                    text,
  inquiry_id                  uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  site_visit_id               uuid REFERENCES site_visits(id) ON DELETE SET NULL,
  deal_id                     uuid REFERENCES deals(id) ON DELETE SET NULL,
  property_id                 uuid REFERENCES property_listings(id) ON DELETE SET NULL,
  reminder_minutes_before     integer,
  reminder_sent               boolean NOT NULL DEFAULT false,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX idx_calendar_events_agent_profile_id ON calendar_events(agent_profile_id);
CREATE INDEX idx_calendar_events_start_at          ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_inquiry_id         ON calendar_events(inquiry_id);
CREATE INDEX idx_calendar_events_site_visit_id      ON calendar_events(site_visit_id);
CREATE INDEX idx_calendar_events_deal_id            ON calendar_events(deal_id);
CREATE INDEX idx_calendar_events_property_id        ON calendar_events(property_id);

-- Enable RLS explicitly.
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERT/UPDATE: the owning agent (must be approved), or admin.
-- This mirrors the assigned-agent pattern from 024/029/030, but unlike
-- 031 (documents' own-KYC exception, deliberately NOT gated on
-- approval), this table IS gated on status = 'approved' — a calendar
-- is an operational feature like leads/deals/site-visits, not a
-- pre-approval KYC submission, so the same approval gate applies here
-- that applies everywhere else.

DROP POLICY IF EXISTS "Owning agent or admin can view calendar events" ON calendar_events;
CREATE POLICY "Owning agent or admin can view calendar events"
  ON calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = calendar_events.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Owning agent or admin can insert calendar events" ON calendar_events;
CREATE POLICY "Owning agent or admin can insert calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = calendar_events.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Owning agent or admin can update calendar events" ON calendar_events;
CREATE POLICY "Owning agent or admin can update calendar events"
  ON calendar_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = calendar_events.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- No DELETE policy at all — same permanent-record pattern as deals
-- (030) and documents (031).
