-- ═══════════════════════════════════════════════════════════════
-- 042 — Notification triggers for messages and deal_collaborators —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Re-confirmed live (PostgREST schema cache, this session):
-- notifications' columns are unchanged since Phase 12 — id, user_id
-- (FK profiles.id, NOT NULL), title (NOT NULL), body (NOT NULL), type
-- (NOT NULL, plain text — not an enum), channel (enum
-- notification_channel, default 'in_app'), status (enum
-- notification_status, default 'unread'), action_url, metadata
-- (jsonb), created_at (default now()). Also re-confirmed messages
-- (id, conversation_id, sender_id — nullable, content, created_at)
-- and conversation_participants (id, conversation_id,
-- agent_profile_id, joined_at, last_read_at) to build the queries
-- below against real column names, not assumed ones. No pg_policy
-- access this session (same limitation noted in 041) — irrelevant
-- here, since this migration does not read or modify any table's RLS
-- policies at all; every insert below goes through a SECURITY
-- DEFINER function, which bypasses RLS by construction rather than
-- depending on it.
--
-- Why triggers, not client-side inserts: a client-side notification
-- insert only fires from the one UI code path that happens to
-- remember to call it. Every current and future way a messages or
-- deal_collaborators row can be created — the existing agent portal,
-- an admin action, a future API integration, a one-off script —
-- would need to duplicate that insert correctly, and any path that
-- forgets silently loses the notification with no error anywhere. An
-- AFTER INSERT trigger on the table itself fires exactly once per row
-- regardless of what inserted it, which is the actual reliability
-- property being asked for here — it can't be forgotten because it
-- isn't called from application code at all.
--
-- Why SECURITY DEFINER: in both triggers, the row being notified
-- belongs to a different user than the one making the insert — a
-- message sender's insert must produce a notification for the
-- recipient; an agent adding a collaborator must produce a
-- notification for that collaborator, not for themselves. Under the
-- inserting user's own RLS session, an insert into notifications for
-- someone else's user_id would be blocked by notifications' own
-- INSERT policy (own-row only, the same shape as every other own-row
-- table in this schema). This is the identical cross-user-access
-- reasoning behind every other SECURITY DEFINER function used tonight
-- (is_admin, log_admin_action, is_conversation_participant,
-- is_conversation_creator, is_deal_primary_agent,
-- is_deal_collaborator) — those bypass RLS for a cross-user *read*;
-- these two bypass it for a cross-user *write*, same mechanism.
-- SET search_path = public is the same hardening applied to all of
-- those, so an unqualified table name here can't be shadowed by
-- something earlier in a caller's search path.
--
-- Neither trigger function touches messages', conversation_
-- participants', deal_collaborators', or notifications' own RLS
-- policies — this is purely additive trigger logic on top of what's
-- already live.
-- ═══════════════════════════════════════════════════════════════

-- 1. messages AFTER INSERT — notify every OTHER participant in the
-- same conversation. Loops because a conversation can have more than
-- two participants (034's schema is group-capable, not 1:1 only).
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_recipient RECORD;
BEGIN
  -- sender_id is nullable on messages per the live schema, even though
  -- the app's own INSERT policy always sets it today. Without a
  -- sender there is nothing to attribute the notification to and no
  -- one to exclude from the recipient list, so skip entirely rather
  -- than write a notification with a blank/misleading sender.
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name INTO v_sender_name
  FROM agent_profiles ap
  JOIN profiles p ON p.id = ap.user_id
  WHERE ap.id = NEW.sender_id;

  FOR v_recipient IN
    SELECT ap.user_id AS user_id
    FROM conversation_participants cp
    JOIN agent_profiles ap ON ap.id = cp.agent_profile_id
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.agent_profile_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, action_url)
    VALUES (
      v_recipient.user_id,
      'New message',
      COALESCE(v_sender_name, 'Someone') || ': ' || left(NEW.content, 100),
      'message',
      '/agent/messages/' || NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created_notify ON messages;
CREATE TRIGGER on_message_created_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 2. deal_collaborators AFTER INSERT — notify the newly-added agent
-- (NEW.agent_profile_id), never the person who added them
-- (NEW.added_by) — the adder already knows, since they're the one who
-- just performed the action.
CREATE OR REPLACE FUNCTION public.notify_deal_collaborator_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_user_id uuid;
  v_added_by_name text;
  v_property_title text;
BEGIN
  SELECT ap.user_id INTO v_recipient_user_id
  FROM agent_profiles ap
  WHERE ap.id = NEW.agent_profile_id;

  -- added_by is nullable on deal_collaborators (ON DELETE SET NULL,
  -- per 041) — it can legitimately be null (e.g. the adder's own
  -- agent_profiles row was later removed), so this falls back to a
  -- generic phrase in the body rather than failing or leaving a NULL
  -- name in the notification text.
  IF NEW.added_by IS NOT NULL THEN
    SELECT p.full_name INTO v_added_by_name
    FROM agent_profiles ap
    JOIN profiles p ON p.id = ap.user_id
    WHERE ap.id = NEW.added_by;
  END IF;

  -- deals.property_id is nullable — a deal with no linked property
  -- falls back to the generic "a deal" phrasing named in the spec.
  SELECT pl.title INTO v_property_title
  FROM deals d
  JOIN property_listings pl ON pl.id = d.property_id
  WHERE d.id = NEW.deal_id;

  INSERT INTO public.notifications (user_id, title, body, type, action_url)
  VALUES (
    v_recipient_user_id,
    'Added to a deal',
    COALESCE(v_added_by_name, 'Someone') || ' added you to ' || COALESCE(v_property_title, 'a deal') || '.',
    'deal_collaborator',
    '/agent/deals/' || NEW.deal_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deal_collaborator_created_notify ON deal_collaborators;
CREATE TRIGGER on_deal_collaborator_created_notify
  AFTER INSERT ON deal_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.notify_deal_collaborator_added();
