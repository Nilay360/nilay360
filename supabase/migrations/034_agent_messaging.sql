-- ═══════════════════════════════════════════════════════════════
-- 034 — Agent messaging (conversations / conversation_participants /
-- messages) — DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline
-- as every migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Confirmed live before drafting (2026-08-31): a fresh, full OpenAPI
-- introspection of the public schema (54 tables, case-insensitive scan
-- for "message"/"chat"/"conversation"/"thread") found no existing
-- messaging/chat table of any kind. The only name matches were
-- `contact_messages` (4 rows — a public "contact us" form submission
-- log: name/email/phone/subject/message/status, no thread structure,
-- no reply capability) and `ticket_messages` (0 rows — support-ticket
-- internal messaging, FK'd to support_tickets, unrelated to
-- agent-to-agent conversations). Neither is a match for this feature.
-- This is genuinely new schema, not a rename/retrofit of anything.
-- ═══════════════════════════════════════════════════════════════

-- 1. conversations — a direct (2-person) or group thread. `type` is
--    free text, not an enum, matching this codebase's existing
--    precedent for pure-categorization fields (document_type on
--    documents, event_type on calendar_events) rather than every field
--    that only ever holds a small fixed set of values.
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  name        text,
  created_by  uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. conversation_participants — membership join table. UNIQUE on the
--    pair so the same agent can't be added to the same conversation
--    twice. ON DELETE CASCADE both ways: if the conversation goes, its
--    membership rows are meaningless; if an agent_profiles row goes,
--    their membership rows go too (unlike messages.sender_id below,
--    there's no "keep this row visible after the agent leaves" need
--    here — the whole row IS the membership).
CREATE TABLE conversation_participants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_profile_id   uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  joined_at          timestamptz DEFAULT now(),
  last_read_at       timestamptz,
  UNIQUE (conversation_id, agent_profile_id)
);

-- 3. messages. sender_id is ON DELETE SET NULL, deliberately not
--    CASCADE — a departed participant's past messages should remain
--    visible to the rest of the conversation (deleting them would
--    silently rewrite conversation history for everyone else still in
--    it), same reasoning as deals.inquiry_id/site_visit_id being
--    SET NULL rather than CASCADE in migration 030.
CREATE TABLE messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
  content          text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- 4. Indexes — participant lookups by conversation and by agent (both
--    directions of the join table get queried independently: "who's in
--    this conversation" and "which conversations is this agent in"),
--    plus messages by conversation (loading a thread) and by
--    created_at (ordering/pagination).
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_agent_profile_id ON conversation_participants(agent_profile_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 5. Enable RLS explicitly on all three.
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ── RLS: conversations ───────────────────────────────────────────

-- SELECT: the requesting agent must be a participant (EXISTS check
-- joining conversation_participants -> agent_profiles, same
-- user_id = auth.uid() AND status = 'approved' gate used by
-- leads/deals/site-visits/calendar_events all night), OR is_admin().
DROP POLICY IF EXISTS "Participant or admin can view conversations" ON conversations;
CREATE POLICY "Participant or admin can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
      WHERE cp.conversation_id = conversations.id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: any approved agent can create a conversation. WITH CHECK
-- only requires the creator to be an approved agent whose own
-- agent_profiles.id matches created_by — it does NOT check
-- participant membership, because at the moment this row is inserted
-- no conversation_participants rows exist yet for it (those are
-- added by a separate insert immediately after, covered by the
-- conversation_participants INSERT policy below).
DROP POLICY IF EXISTS "Approved agent can create conversations" ON conversations;
CREATE POLICY "Approved agent can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = conversations.created_by
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );

-- No UPDATE/DELETE policy on conversations — nothing in the brief asks
-- for renaming a group or deleting a conversation, and no DELETE
-- policy on any of these three tables at all, matching the
-- permanent-record pattern deals/documents/calendar_events already
-- established tonight.

-- ── RLS: conversation_participants ───────────────────────────────

-- SELECT: the requesting agent is themselves a participant of that
-- same conversation (so members can see the full participant list of
-- conversations they're in), OR is_admin().
DROP POLICY IF EXISTS "Participant or admin can view conversation_participants" ON conversation_participants;
CREATE POLICY "Participant or admin can view conversation_participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: two OR'd conditions, because of a genuine bootstrap edge
-- case.
--
-- Condition A (steady state) — any existing member of a conversation
-- may add new participants to it, per explicit decision: the
-- requesting agent already has a conversation_participants row for
-- this conversation_id.
--
-- Condition B (bootstrap) — the very first participant row for a
-- brand-new conversation cannot satisfy Condition A, because at that
-- exact moment no conversation_participants rows exist for it yet
-- (that's what this INSERT is about to create). Without a second
-- clause, a newly-created conversation would be permanently stuck
-- with zero participants able to ever join it — the creator couldn't
-- even add themselves, since Condition A checks for a row that isn't
-- there yet. Condition B closes this by allowing the insert when the
-- row being inserted is the requesting agent adding THEMSELVES
-- (agent_profile_id being inserted = their own agent_profiles.id)
-- AND they are conversations.created_by for that conversation_id —
-- i.e. only the conversation's own creator gets this bootstrap
-- allowance, and only to seat themselves, not arbitrary others. Every
-- subsequent participant (including ones the creator adds after
-- seating themselves) goes through Condition A instead, once the
-- creator's own participant row exists.
DROP POLICY IF EXISTS "Participant or creator-bootstrap or admin can add conversation_participants" ON conversation_participants;
CREATE POLICY "Participant or creator-bootstrap or admin can add conversation_participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Condition A — requesting agent is already a participant of this conversation.
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR
    -- Condition B — bootstrap: the conversation's own creator seating
    -- themselves as its first participant.
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

-- No UPDATE policy — last_read_at updates aren't in this migration's
-- scope (not requested); no DELETE policy, matching the pattern above.

-- ── RLS: messages ─────────────────────────────────────────────────

-- SELECT: the requesting agent is a participant of the message's
-- conversation, OR is_admin().
DROP POLICY IF EXISTS "Participant or admin can view messages" ON messages;
CREATE POLICY "Participant or admin can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
      WHERE cp.conversation_id = messages.conversation_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: the requesting agent must be a participant of the target
-- conversation AND the sender_id being inserted must equal their own
-- agent_profiles.id — prevents one participant sending a message that
-- impersonates another participant as the sender.
DROP POLICY IF EXISTS "Participant can send own messages, or admin" ON messages;
CREATE POLICY "Participant can send own messages, or admin"
  ON messages FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
        WHERE cp.conversation_id = messages.conversation_id
          AND ap.user_id = auth.uid()
          AND ap.status = 'approved'
      )
      AND EXISTS (
        SELECT 1 FROM agent_profiles ap
        WHERE ap.id = messages.sender_id
          AND ap.user_id = auth.uid()
          AND ap.status = 'approved'
      )
    )
    OR public.is_admin()
  );

-- No UPDATE/DELETE policy on messages — permanent record, same pattern
-- as above; editing/retracting a sent message is not in scope here.
