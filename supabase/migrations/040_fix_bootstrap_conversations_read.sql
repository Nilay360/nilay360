-- ═══════════════════════════════════════════════════════════════
-- 040 — Fix RLS bootstrap failure on conversation_participants
-- INSERT Condition B — DRAFTED FOR REVIEW, NOT APPLIED. Same review
-- discipline as every migration tonight: this file has not been run
-- against the database.
--
-- Same class of bug as 036, one layer deeper. Root cause:
-- conversation_participants' INSERT policy's Condition B (the
-- creator-bootstrap check) reads the `conversations` table via a
-- plain JOIN to confirm the requester is that conversation's
-- created_by. Any read against an RLS-enabled table is itself
-- subject to that table's own policies — `conversations`' SELECT
-- policy requires the requester to already be a participant, which
-- is exactly not true yet at the one moment Condition B exists to
-- handle: seating the very first participant of a brand-new
-- conversation. So the JOIN can't see the row, Condition B evaluates
-- false, and the bootstrap insert that 036 was supposed to unblock
-- still fails.
--
-- Audited every policy across conversations / conversation_participants
-- / messages (034 as amended by 036, plus 035) for this same shape of
-- risk (a policy reading a different RLS-protected table via a plain
-- EXISTS/JOIN, not a SECURITY DEFINER function, where that table's
-- own visibility could plausibly be false at the exact moment of the
-- operation). Found exactly one other structurally-identical case —
-- `conversations`' own SELECT policy also reads
-- `conversation_participants` via a plain EXISTS — but traced every
-- current call site in the app and none of them evaluates that policy
-- before the caller is already seated as a participant (conversation
-- creation no longer re-reads the row after insert; the list and
-- thread pages only ever query conversations the caller already has a
-- conversation_participants row for). It is not fixed here, per
-- explicit instruction not to change anything else defensively — it's
-- a dormant risk of the same shape, not a currently-triggered bug,
-- and is left as-is with this note for the record. No other policy
-- reads a participant-gated table via a plain EXISTS/JOIN; the
-- messages policies' plain reads of conversation_participants are
-- safe because message operations never occur during the bootstrap
-- window.
--
-- Fix: a second SECURITY DEFINER helper, is_conversation_creator,
-- exactly the same technique 036 used for is_conversation_participant
-- — its internal query bypasses conversations' RLS entirely, so
-- there's no policy to recurse or block on.
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function.
CREATE OR REPLACE FUNCTION public.is_conversation_creator(p_conversation_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id AND created_by = p_agent_profile_id
  );
$$;

-- 2. conversation_participants INSERT — Condition B rewritten to call
--    the function instead of the plain JOIN against conversations.
--    Condition A (already fixed in 036, calls is_conversation_participant)
--    and the is_admin() branch are untouched — no other condition in
--    this policy changes.
DROP POLICY IF EXISTS "Participant or creator-bootstrap or admin can add conversation_participants" ON conversation_participants;
CREATE POLICY "Participant or creator-bootstrap or admin can add conversation_participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Condition A — requesting agent is already a participant of this conversation.
    public.is_conversation_participant(
      conversation_participants.conversation_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR
    -- Condition B — bootstrap: the conversation's own creator seating
    -- themselves as its first participant. The agent_profiles check
    -- (is the requester an approved agent, and does the row being
    -- inserted belong to them) stays inline — that subquery is safe,
    -- agent_profiles' approved rows are unconditionally public. Only
    -- the "are they this conversation's creator" check moves into the
    -- new function.
    (
      EXISTS (
        SELECT 1 FROM agent_profiles ap
        WHERE ap.id = conversation_participants.agent_profile_id
          AND ap.user_id = auth.uid()
          AND ap.status = 'approved'
      )
      AND public.is_conversation_creator(
        conversation_participants.conversation_id,
        conversation_participants.agent_profile_id
      )
    )
    OR public.is_admin()
  );
