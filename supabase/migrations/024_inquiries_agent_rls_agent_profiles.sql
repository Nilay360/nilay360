-- ═══════════════════════════════════════════════════════════════
-- 024 — Fix stale `agents`-table RLS on inquiries/inquiry_activities
--
-- 013_inquiries_lead_management.sql wrote the four agent-facing RLS
-- policies below against the `agents` table, before the agents-vs-
-- agent_profiles split was discovered. 014_inquiries_assigned_to_
-- agent_profiles.sql re-pointed the `inquiries.assigned_to` FOREIGN
-- KEY to agent_profiles(id), but never touched these policies — so
-- inquiries.assigned_to has held an agent_profiles.id ever since,
-- while every one of these EXISTS checks still looks it up against
-- agents.id. Confirmed live (2026-08-30): rajesh's inquiry has
-- assigned_to = 89a8c861-f086-4dc4-afc3-389f715e3b80 (ricky vanith's
-- real agent_profiles.id); the `agents` table's row for the same
-- person has a different id (528f7b58-...), so `a.id = assigned_to`
-- never matches and the policy silently denies the read — the actual
-- root cause of ricky vanith not seeing rajesh's lead on /agent/leads.
--
-- This migration re-points all four policies at agent_profiles, and
-- adds `agent_profiles.status = 'approved'` to each — matching the
-- same gate the /agent/leads page's own identity lookup already uses
-- (src/app/agent/leads/page.tsx), so a rejected/pending agent account
-- can't retain access to inquiries/activities through this policy
-- alone.
--
-- Does NOT touch "Admins can view all inquiry activities" (013) —
-- confirmed it only checks public.is_admin(), no agents reference.
-- Confirmed via grep across every migration file that no other
-- policy anywhere references `agents` for inquiries or
-- inquiry_activities.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Assigned agent can view own inquiries" ON inquiries;
CREATE POLICY "Assigned agent can view own inquiries" ON inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = inquiries.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Assigned agent can update own inquiries" ON inquiries;
CREATE POLICY "Assigned agent can update own inquiries" ON inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = inquiries.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Assigned agent can view activities on own inquiries" ON inquiry_activities;
CREATE POLICY "Assigned agent can view activities on own inquiries" ON inquiry_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = inquiry_activities.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Assigned agent can log activity on own inquiries" ON inquiry_activities;
CREATE POLICY "Assigned agent can log activity on own inquiries" ON inquiry_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = inquiry_activities.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );
