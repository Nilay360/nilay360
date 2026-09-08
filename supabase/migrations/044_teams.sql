-- ═══════════════════════════════════════════════════════════════
-- 044 — Teams, team membership, and a third are_agents_connected
-- condition — DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline
-- as every migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Re-confirmed live before drafting (this session): no table matching
-- "team" (case-insensitive) exists anywhere in the public schema (59
-- tables total, fresh PostgREST schema-cache check). are_agents_
-- connected's live parameter signature (p_agent_a uuid, p_agent_b
-- uuid) matches what 043 drafted, confirmed via PostgREST's OpenAPI
-- spec — its function BODY could not be independently confirmed this
-- way (PostgREST only exposes RPC signatures, not source; that needs
-- pg_proc.prosrc, which requires raw-SQL access unavailable this
-- session, same standing limitation as every pg_policy/pg_proc check
-- tonight). Section 5 below reproduces 043's two existing branches
-- (deal, conversation) verbatim from the drafted text, on the
-- reasonable assumption 043 was applied as drafted — re-verify with
-- `SELECT pg_get_functiondef('public.are_agents_connected(uuid,
-- uuid)'::regprocedure);` before applying this file, in case it
-- drifted.
--
-- Why is_team_member/is_team_lead are SECURITY DEFINER proactively:
-- same reasoning as 041's is_deal_primary_agent/is_deal_collaborator —
-- teams' own RLS needs to check team_members (a different table,
-- via is_team_member) and team_members' own RLS needs to check teams
-- right back (via is_team_lead). That is a mutual two-table
-- cross-reference, the same shape 036/040 diagnosed as unsafe with
-- plain EXISTS/JOIN — both helpers are SECURITY DEFINER from the
-- start rather than waiting to rediscover that failure class a fourth
-- time tonight.
--
-- Bootstrap-timing reasoning for team_members INSERT (is_team_lead
-- reading teams at the moment a team's first member — the lead
-- themselves — is seated) — reasoned through explicitly, not assumed:
-- there is NO bootstrap problem here, for a more fundamental reason
-- than "statement ordering happens to work out". 040's actual bug was
-- never about timing per se — it was that Condition B used a PLAIN
-- EXISTS/JOIN directly against `conversations`, which made that read
-- subject to conversations' own SELECT policy for the calling role,
-- and that policy required already being a participant — exactly the
-- thing being bootstrapped. is_team_lead is SECURITY DEFINER from its
-- very first version here (not patched in later, the way
-- is_conversation_creator was), so its internal read of `teams`
-- bypasses teams' RLS entirely regardless of whether the caller could
-- otherwise see that row — that failure mode cannot occur by
-- construction. Separately and independently: a team's row is created
-- (with lead_agent_id already set) via an earlier INSERT INTO teams,
-- before any team_members row is ever inserted for it — ordinary
-- same-transaction MVCC visibility means that row already exists by
-- the time team_members' INSERT policy evaluates, even before
-- accounting for the SECURITY DEFINER bypass. Both reasons
-- independently converge on "no bootstrap problem," which is why
-- team_members' INSERT policy below needs no special-cased bootstrap
-- condition analogous to 034/040's "Condition B".
-- ═══════════════════════════════════════════════════════════════

-- 1. teams table.
CREATE TABLE teams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  lead_agent_id  uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE RESTRICT,
  created_by     uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 2. team_members table.
CREATE TABLE team_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_profile_id  uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  created_at        timestamptz DEFAULT now(),

  CONSTRAINT team_members_unique_membership UNIQUE (team_id, agent_profile_id)
);

CREATE INDEX idx_team_members_team_id          ON team_members(team_id);
CREATE INDEX idx_team_members_agent_profile_id ON team_members(agent_profile_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. Helpers — see header for why both are SECURITY DEFINER from the
-- start (mutual cross-table reference between teams and team_members).
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND agent_profile_id = p_agent_profile_id);
$$;

CREATE OR REPLACE FUNCTION public.is_team_lead(p_team_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND lead_agent_id = p_agent_profile_id);
$$;

-- 4. RLS.

-- teams SELECT: any current member, the lead, or admin.
DROP POLICY IF EXISTS "Member or lead or admin can view teams" ON teams;
CREATE POLICY "Member or lead or admin can view teams"
  ON teams FOR SELECT
  USING (
    public.is_team_member(
      teams.id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_team_lead(
      teams.id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- teams INSERT: the requester may only create a team with themselves
-- as lead_agent_id — WITH CHECK runs against the row being inserted.
-- Admins are not bound by this restriction.
DROP POLICY IF EXISTS "Self as lead or admin can create teams" ON teams;
CREATE POLICY "Self as lead or admin can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = teams.lead_agent_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- teams UPDATE: only the lead or admin.
DROP POLICY IF EXISTS "Lead or admin can update teams" ON teams;
CREATE POLICY "Lead or admin can update teams"
  ON teams FOR UPDATE
  USING (
    public.is_team_lead(
      teams.id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- team_members SELECT: any current member of that team, or admin.
DROP POLICY IF EXISTS "Member or admin can view team_members" ON team_members;
CREATE POLICY "Member or admin can view team_members"
  ON team_members FOR SELECT
  USING (
    public.is_team_member(
      team_members.team_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- team_members INSERT: only the team's lead may add members (including
-- seating themselves as the team's first member — see header for why
-- this has no bootstrap-timing problem). Admins are not bound by this
-- restriction.
DROP POLICY IF EXISTS "Lead or admin can add team_members" ON team_members;
CREATE POLICY "Lead or admin can add team_members"
  ON team_members FOR INSERT
  WITH CHECK (
    public.is_team_lead(
      team_members.team_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- team_members DELETE: only the team's lead or admin may remove
-- members.
DROP POLICY IF EXISTS "Lead or admin can remove team_members" ON team_members;
CREATE POLICY "Lead or admin can remove team_members"
  ON team_members FOR DELETE
  USING (
    public.is_team_lead(
      team_members.team_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- No UPDATE policy on team_members: membership rows aren't edited,
-- only added or removed — same reasoning as deal_collaborators (041).

-- 5. are_agents_connected — CREATE OR REPLACE, additive third
-- condition. The deal and conversation branches are reproduced
-- verbatim from 043 (see header caveat: not re-confirmed live via
-- pg_proc, only via matching RPC signature); the new team branch
-- checks whether p_agent_a and p_agent_b share any team_id in
-- team_members. Full function shown below, not just the new clause.
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
  ) OR EXISTS (
    -- Same team
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.agent_profile_id = p_agent_a AND tm2.agent_profile_id = p_agent_b
  );
$$;
