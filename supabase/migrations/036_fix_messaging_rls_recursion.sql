-- ═══════════════════════════════════════════════════════════════
-- 036 — Fix RLS infinite recursion on conversation_participants —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Diagnosed live error: 42P17 "infinite recursion detected in policy
-- for relation conversation_participants", surfaced while creating a
-- new conversation.
--
-- Root cause: 034's conversation_participants SELECT policy
-- ("Participant or admin can view conversation_participants") and
-- INSERT policy's Condition A ("Participant or creator-bootstrap or
-- admin can add conversation_participants") both contain an EXISTS
-- subquery that selects FROM conversation_participants itself
-- (aliased `cp`) to check "is the requester already a participant of
-- this conversation". That is a policy on table T querying T's own
-- rows directly — Postgres has to apply conversation_participants'
-- RLS policies again to evaluate visibility of those inner `cp` rows,
-- which means re-running the very policy currently being evaluated,
-- forever. This is a known, general Postgres RLS limitation, not a
-- bug specific to this schema: a policy can never safely query its
-- own table directly.
--
-- Fix: a SECURITY DEFINER helper function, is_conversation_participant.
-- SECURITY DEFINER means the function body runs with the privileges of
-- its owner (not the calling role), so its internal SELECT against
-- conversation_participants bypasses RLS entirely — there is no
-- policy re-evaluation to recurse into. This is not a new technique
-- introduced here: it is exactly how public.is_admin() (referenced
-- throughout every migration tonight) already works, applied to the
-- one case in this schema where a table's own policy needs to check
-- that table's own rows.
--
-- Only the two recursive policies are rewritten below:
--   - conversation_participants SELECT ("Participant or admin can
--     view conversation_participants")
--   - conversation_participants INSERT, Condition A only
--     ("Participant or creator-bootstrap or admin can add
--     conversation_participants")
-- Every other policy from 034 (conversations SELECT/INSERT, messages
-- SELECT/INSERT, and INSERT Condition B's bootstrap check) queries
-- conversation_participants from a DIFFERENT table's policy, which is
-- an ordinary cross-table RLS reference, not self-referential — those
-- were never recursive and are untouched here, including 035's
-- conversation_participants UPDATE policy (also not self-referential:
-- it checks agent_profiles, not conversation_participants). They were
-- only failing as a side effect of conversation_participants' own
-- broken policies making that table unusable at all.
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function — breaks the recursion. SET search_path = public
--    is the same hardening already applied to every SECURITY DEFINER
--    function in this codebase (is_admin, log_admin_action), so a
--    caller can't shadow `conversation_participants` with an
--    unqualified name from a different schema earlier in their path.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND agent_profile_id = p_agent_profile_id
  );
$$;

-- 2. conversation_participants SELECT — same conditions as 034,
--    only the self-referencing EXISTS block is replaced. The
--    requester's own approved agent_profiles.id is resolved via a
--    scalar subquery against agent_profiles (not self-referential —
--    a different table, and this exact pattern already appears
--    throughout 034/035) and handed to the function; if the caller
--    has no approved agent_profiles row, that subquery is NULL and
--    the function call correctly returns false, preserving the
--    original policy's implicit "AND ap.status = 'approved'"
--    requirement without querying conversation_participants inline.
DROP POLICY IF EXISTS "Participant or admin can view conversation_participants" ON conversation_participants;
CREATE POLICY "Participant or admin can view conversation_participants"
  ON conversation_participants FOR SELECT
  USING (
    public.is_conversation_participant(
      conversation_participants.conversation_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- 3. conversation_participants INSERT — Condition A rewritten the
--    same way; Condition B (the creator-bootstrap check) is
--    untouched, exactly as specified — it queries agent_profiles and
--    conversations, never conversation_participants, so it was never
--    part of the recursion.
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
    -- themselves as its first participant. Unchanged from 034.
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      JOIN conversations c ON c.id = conversation_participants.conversation_id
      WHERE ap.id = conversation_participants.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
        AND c.created_by = ap.id
    )
    OR public.is_admin()
  );
