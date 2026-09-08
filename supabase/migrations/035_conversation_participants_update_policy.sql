-- ═══════════════════════════════════════════════════════════════
-- 035 — conversation_participants UPDATE policy — DRAFTED FOR
-- REVIEW, NOT APPLIED. Same review discipline as every migration
-- tonight: this file has not been run against the database. Do not
-- apply until reviewed line by line.
--
-- Closes a gap identified when reviewing 034: that migration gave
-- conversation_participants a `last_read_at` column and SELECT/INSERT
-- policies, but no UPDATE policy at all. With RLS enabled and no
-- UPDATE policy, every UPDATE is denied by default — meaning
-- last_read_at could never actually be set by anyone (short of an
-- admin), making unread-message tracking impossible despite the
-- column existing. This migration adds exactly the one UPDATE policy
-- needed to close that gap: a participant may update their own
-- membership row (in practice, to set last_read_at when they view a
-- conversation) and nobody else's.
-- ═══════════════════════════════════════════════════════════════

-- UPDATE: USING restricts which existing rows can be targeted — the
-- row's agent_profile_id must match the requesting agent's own
-- agent_profiles.id (same user_id = auth.uid() AND status = 'approved'
-- gate used throughout tonight), OR is_admin(). WITH CHECK applies the
-- same restriction to the resulting row after the update, so a
-- participant can't use an UPDATE to re-point their own row's
-- agent_profile_id at someone else's id (which would otherwise let
-- them silently take over — or vacate — another participant's
-- membership row). Together these mean a participant can only ever
-- change fields on their own row (last_read_at, in practice) and can
-- never touch another participant's row — no marking someone else's
-- messages read, no changing someone else's joined_at.
DROP POLICY IF EXISTS "Participant can update own row, or admin" ON conversation_participants;
CREATE POLICY "Participant can update own row, or admin"
  ON conversation_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = conversation_participants.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = conversation_participants.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );
