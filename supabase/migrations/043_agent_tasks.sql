-- ═══════════════════════════════════════════════════════════════
-- 043 — Agent tasks table, connection-gated assignment, column-level
-- UPDATE restriction, notification trigger — DRAFTED FOR REVIEW, NOT
-- APPLIED. Same review discipline as every migration tonight: this
-- file has not been run against the database. Do not apply until
-- reviewed line by line.
--
-- Why are_agents_connected (SECURITY DEFINER): the INSERT policy needs
-- to confirm the assigner and assignee share some existing working
-- relationship (same deal — as primary or collaborator, either
-- direction — or the same conversation) before letting one agent hand
-- a task to another. That check reads deals, deal_collaborators, and
-- conversation_participants — three tables whose own RLS policies are
-- scoped to "rows involving me", not "rows involving two arbitrary
-- agents I name" — so a plain EXISTS/JOIN evaluated under the
-- requesting agent's own session could come back empty even for a
-- real, connected pair, for the same reason 036/040 diagnosed
-- tonight: a policy (here, tasks' own INSERT policy) reading another
-- RLS-protected table's rows is only reliable if that read bypasses
-- the other table's RLS entirely. SECURITY DEFINER + SET search_path
-- = public is the same mechanism used throughout tonight
-- (is_conversation_participant, is_conversation_creator,
-- is_deal_primary_agent, is_deal_collaborator) for exactly this
-- reason, applied here to a read spanning three tables instead of one.
--
-- Why a trigger for the UPDATE column restriction, not RLS alone: RLS
-- USING/WITH CHECK clauses gate whole rows, not individual columns —
-- there is no RLS construct for "this role may update column X but
-- not column Y on a row it's otherwise allowed to update". The UPDATE
-- policy below only does the row-level gate (assigned_to, assigned_by,
-- or admin may attempt the statement at all); a BEFORE UPDATE trigger
-- then does the column-level check the RLS layer structurally cannot:
-- an assignee (not the assigner, not admin) may change status and
-- completed_at, and nothing else.
--
-- Why the trigger function is SECURITY DEFINER — confirmed reasoning,
-- not assumed: the trigger's own logic never writes to another user's
-- row and never needs elevated privilege for that reason (it only
-- inspects OLD/NEW on the very row the RLS-gated UPDATE statement
-- already targeted). The one thing it does need is to resolve
-- auth.uid() to the caller's own agent_profiles.id, by reading
-- agent_profiles. Whether that self-lookup would succeed under
-- SECURITY INVOKER depends on agent_profiles' own SELECT policy
-- letting an agent read their own row — plausible, but I have no
-- pg_policy access this session (same standing limitation as 041/042)
-- to confirm that policy exists or covers every agent status. Rather
-- than make an authorization-critical check depend on an unconfirmed
-- assumption about a different table's live RLS, the lookup is done
-- SECURITY DEFINER so it works regardless. This is a different reason
-- than 042's notification triggers (which bypass RLS for a genuine
-- cross-user *write*) — flagged as such rather than citing the same
-- justification for a different situation.
--
-- Why the notification trigger (notify_task_assigned) is SECURITY
-- DEFINER: this one IS the ordinary cross-user-write case — the
-- notification is inserted for assigned_to, a different user than
-- whoever ran the INSERT, which notifications' own INSERT policy
-- (own-row only) would otherwise block. Same reasoning and mechanism
-- as 042.
--
-- action_url placeholder: '/agent/tasks/' || NEW.id points at a page
-- that does not exist yet — no agent tasks UI has been built this
-- session. Flagged, not silently assumed built; update this once that
-- UI exists if the route differs.
-- ═══════════════════════════════════════════════════════════════

-- 1. tasks table.
CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to   uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  assigned_by   uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'pending',
  due_date      timestamptz,
  completed_at  timestamptz,
  inquiry_id    uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  property_id   uuid REFERENCES property_listings(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  -- Same pattern as documents_must_have_an_owner (031) — a task must
  -- be attached to something.
  CONSTRAINT tasks_must_reference_something
    CHECK (
      inquiry_id IS NOT NULL
      OR deal_id IS NOT NULL
      OR property_id IS NOT NULL
    )
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_deal_id     ON tasks(deal_id);
CREATE INDEX idx_tasks_inquiry_id  ON tasks(inquiry_id);
CREATE INDEX idx_tasks_property_id ON tasks(property_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. are_agents_connected — see header for why this is SECURITY
-- DEFINER. Symmetric in both arguments by construction (each EXISTS
-- checks both p_agent_a and p_agent_b against the same deal/
-- conversation), so are_agents_connected(x, y) and
-- are_agents_connected(y, x) always agree — reproduced verbatim from
-- the instruction, not altered.
CREATE OR REPLACE FUNCTION public.are_agents_connected(p_agent_a uuid, p_agent_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Same deal: either as the deal's primary agent or a collaborator, both directions
    SELECT 1 FROM deals d
    WHERE (d.assigned_to = p_agent_a OR EXISTS (SELECT 1 FROM deal_collaborators dc WHERE dc.deal_id = d.id AND dc.agent_profile_id = p_agent_a))
      AND (d.assigned_to = p_agent_b OR EXISTS (SELECT 1 FROM deal_collaborators dc WHERE dc.deal_id = d.id AND dc.agent_profile_id = p_agent_b))
  ) OR EXISTS (
    -- Same conversation
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.agent_profile_id = p_agent_a AND cp2.agent_profile_id = p_agent_b
  );
$$;

-- 3. RLS.

-- SELECT: own tasks (as assignee or assigner, both approved-agent
-- gated, same convention as every other assigned-agent policy
-- tonight), or admin.
DROP POLICY IF EXISTS "Assignee or assigner or admin can view tasks" ON tasks;
CREATE POLICY "Assignee or assigner or admin can view tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = tasks.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = tasks.assigned_by
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: the requester must be the assigned_by being inserted (an
-- approved agent can't create a task "from" someone else), AND must
-- be connected to the assignee via are_agents_connected — or admin,
-- who is not bound by either restriction.
DROP POLICY IF EXISTS "Connected assigner or admin can create tasks" ON tasks;
CREATE POLICY "Connected assigner or admin can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM agent_profiles ap
        WHERE ap.id = tasks.assigned_by
          AND ap.user_id = auth.uid()
          AND ap.status = 'approved'
      )
      AND public.are_agents_connected(tasks.assigned_by, tasks.assigned_to)
    )
    OR public.is_admin()
  );

-- UPDATE: row-level gate only — assigned_to, assigned_by, or admin may
-- attempt an update at all. Same status='approved' gate as every
-- other assigned-agent policy tonight is included here too, even
-- though the instruction's UPDATE bullet didn't restate "approved"
-- explicitly — matching 030's own UPDATE policy, which does include
-- it. The actual "who may change which columns" rule is enforced by
-- the trigger below, not here — see header.
DROP POLICY IF EXISTS "Assignee or assigner or admin can update tasks" ON tasks;
CREATE POLICY "Assignee or assigner or admin can update tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = tasks.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = tasks.assigned_by
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- DELETE: only the task's creator (assigned_by) or admin. Same
-- approved-agent gate as above, for the same reason (not explicitly
-- restated in the instruction's DELETE bullet, but consistent with
-- every other write policy here and elsewhere tonight).
DROP POLICY IF EXISTS "Assigner or admin can delete tasks" ON tasks;
CREATE POLICY "Assigner or admin can delete tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = tasks.assigned_by
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- 4. Column-level UPDATE restriction — see header for the SECURITY
-- DEFINER reasoning (a self-lookup reliability concern, not a
-- cross-user write).
CREATE OR REPLACE FUNCTION public.enforce_task_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_agent_id uuid;
BEGIN
  -- Admins are not bound by the column restriction at all.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT ap.id INTO v_my_agent_id
  FROM agent_profiles ap
  WHERE ap.user_id = auth.uid();

  -- The assigner may change any column — RLS's USING clause already
  -- confirmed they're either assigned_to or assigned_by (or admin,
  -- handled above) before this trigger ever runs.
  IF v_my_agent_id IS NOT NULL AND v_my_agent_id = OLD.assigned_by THEN
    RETURN NEW;
  END IF;

  -- The assignee may only change status and/or completed_at. Every
  -- other column must be unchanged from OLD.
  IF v_my_agent_id IS NOT NULL AND v_my_agent_id = OLD.assigned_to THEN
    IF NEW.title       IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.due_date     IS DISTINCT FROM OLD.due_date
      OR NEW.inquiry_id   IS DISTINCT FROM OLD.inquiry_id
      OR NEW.deal_id      IS DISTINCT FROM OLD.deal_id
      OR NEW.property_id  IS DISTINCT FROM OLD.property_id
      OR NEW.assigned_to  IS DISTINCT FROM OLD.assigned_to
      OR NEW.assigned_by  IS DISTINCT FROM OLD.assigned_by
    THEN
      RAISE EXCEPTION 'An assignee may only update status and completed_at on a task';
    END IF;
    RETURN NEW;
  END IF;

  -- Neither assignee, assigner, nor admin. RLS's USING clause should
  -- already have made this row unreachable by this statement — fail
  -- closed here rather than silently allow, in case that assumption
  -- is ever wrong (e.g. the policy above is edited later without
  -- updating this trigger to match).
  RAISE EXCEPTION 'Not authorized to update this task';
END;
$$;

DROP TRIGGER IF EXISTS before_task_update_enforce_columns ON tasks;
CREATE TRIGGER before_task_update_enforce_columns
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_update_columns();

-- 5. Notification trigger — same pattern as 042. Genuine cross-user
-- write (notifies assigned_to, not the inserting assigned_by), so
-- SECURITY DEFINER here is the ordinary reason, not the self-lookup
-- reliability reason used for the trigger above.
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_user_id uuid;
  v_assigner_name text;
BEGIN
  SELECT ap.user_id INTO v_recipient_user_id
  FROM agent_profiles ap
  WHERE ap.id = NEW.assigned_to;

  -- assigned_by is nullable (ON DELETE SET NULL) and could in
  -- principle be null even at insert time (the column has no NOT NULL
  -- constraint) — falls back to a generic phrase rather than failing.
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT p.full_name INTO v_assigner_name
    FROM agent_profiles ap
    JOIN profiles p ON p.id = ap.user_id
    WHERE ap.id = NEW.assigned_by;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, action_url)
  VALUES (
    v_recipient_user_id,
    'New task assigned',
    COALESCE(v_assigner_name, 'Someone') || ': ' || NEW.title,
    'task',
    -- Placeholder route — no agent tasks UI exists yet. See header.
    '/agent/tasks/' || NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_created_notify ON tasks;
CREATE TRIGGER on_task_created_notify
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();
