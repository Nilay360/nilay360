-- ═══════════════════════════════════════════════════════════════
-- 041 — deal_collaborators table + SECURITY DEFINER helpers —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Why SECURITY DEFINER from the start, not added later as a fix:
-- tonight's 036 and 040 both diagnosed the same failure class after
-- the fact —
--   036: a policy on table T containing a plain EXISTS/JOIN back into
--        T's own rows forces Postgres to re-evaluate T's policy to
--        decide visibility of the rows the policy itself is
--        checking, which recurses forever (Postgres error 42P17).
--   040: even a plain EXISTS/JOIN from table A's policy into a
--        DIFFERENT RLS-protected table B is unsafe if B's own
--        visibility can plausibly be false at the exact moment of
--        the operation (the bootstrap-timing case) — the read
--        silently returns no rows and the condition evaluates false,
--        not an error, which is worse: it looks like "access denied"
--        instead of a broken policy.
-- This migration has both shapes by construction: deal_collaborators'
-- own SELECT policy needs to check deals (a different table) for the
-- primary-agent condition, and deals' SELECT policy (extended below)
-- needs to check deal_collaborators (a different table) right back.
-- That is a two-table mutual cross-reference — exactly the shape 040
-- warns about, just with two tables instead of one table checking
-- itself. Rather than write plain EXISTS/JOIN here and wait to
-- rediscover 036/040 a third time, both cross-table checks are
-- SECURITY DEFINER helpers from the start: their internal SELECTs run
-- with the function owner's privileges and bypass RLS entirely, so
-- neither can recurse into or block on the other table's policy,
-- regardless of evaluation order or bootstrap timing.
--
-- Caveat on the deals policy rewrite in section 5: I do not have
-- direct pg_policies access this session (the debug RPCs from
-- 037/038 were dropped in 039, and no other raw-SQL path is
-- available to me right now). The "current" deals SELECT policy
-- rewritten below is reproduced verbatim from 030_deals_table.sql,
-- the last authored version — NOT re-confirmed against the live
-- database. Before applying this file, re-verify the live policy
-- text matches what's rewritten here (e.g. via the pg_policy query
-- already handed to you), in case it drifted between 030 and now.
-- ═══════════════════════════════════════════════════════════════

-- 1. deal_collaborators table.
CREATE TABLE deal_collaborators (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id           uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  agent_profile_id  uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  added_by          uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),

  CONSTRAINT deal_collaborators_unique_membership UNIQUE (deal_id, agent_profile_id)
);

CREATE INDEX idx_deal_collaborators_deal_id          ON deal_collaborators(deal_id);
CREATE INDEX idx_deal_collaborators_agent_profile_id ON deal_collaborators(agent_profile_id);

ALTER TABLE deal_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Helper — is the given agent the deal's primary (assigned_to) agent?
-- Reads `deals`, a different table from the one this is used to gate
-- below, but per the header note this cross-table check is still
-- made SECURITY DEFINER proactively rather than a plain EXISTS/JOIN,
-- since deals' own SELECT policy (section 5) reads deal_collaborators
-- right back — a mutual two-table reference, the exact shape 040
-- flags as unsafe with plain reads.
CREATE OR REPLACE FUNCTION public.is_deal_primary_agent(p_deal_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deals WHERE id = p_deal_id AND assigned_to = p_agent_profile_id
  );
$$;

-- 3. Helper — is the given agent a collaborator on the given deal?
-- Reads deal_collaborators itself, used from deals' SELECT policy (a
-- different table) — an ordinary cross-table reference in isolation,
-- but made SECURITY DEFINER for the same mutual-reference reason as
-- is_deal_primary_agent above, and for symmetry with it.
CREATE OR REPLACE FUNCTION public.is_deal_collaborator(p_deal_id uuid, p_agent_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_collaborators WHERE deal_id = p_deal_id AND agent_profile_id = p_agent_profile_id
  );
$$;

-- 4. deal_collaborators RLS.
--
-- SELECT: three ways in —
--   (a) the row is the requester's own membership row (an agent can
--       always see their own collaborator entries),
--   (b) the requester is the deal's primary agent (via
--       is_deal_primary_agent — reads `deals`, a different table,
--       SECURITY DEFINER per the header note), viewing the full
--       collaborator list for a deal they own,
--   (c) is_admin().
DROP POLICY IF EXISTS "Own membership, primary agent, or admin can view deal_collaborators" ON deal_collaborators;
CREATE POLICY "Own membership, primary agent, or admin can view deal_collaborators"
  ON deal_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = deal_collaborators.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_deal_primary_agent(
      deal_collaborators.deal_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- INSERT: only the deal's primary agent (or admin) may add
-- collaborators. WITH CHECK runs against the row being inserted, so
-- deal_collaborators.deal_id here is the NEW row's deal_id.
DROP POLICY IF EXISTS "Primary agent or admin can add deal_collaborators" ON deal_collaborators;
CREATE POLICY "Primary agent or admin can add deal_collaborators"
  ON deal_collaborators FOR INSERT
  WITH CHECK (
    public.is_deal_primary_agent(
      deal_collaborators.deal_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- DELETE: same condition as INSERT — only the primary agent (or
-- admin) may remove collaborators. First DELETE policy on any table
-- added tonight: deal_collaborators rows are membership records, not
-- durable business records like the deal itself, so removability is
-- appropriate here in a way it wasn't for deals/documents/
-- calendar_events.
DROP POLICY IF EXISTS "Primary agent or admin can remove deal_collaborators" ON deal_collaborators;
CREATE POLICY "Primary agent or admin can remove deal_collaborators"
  ON deal_collaborators FOR DELETE
  USING (
    public.is_deal_primary_agent(
      deal_collaborators.deal_id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );

-- No UPDATE policy: membership rows aren't edited, only added or
-- removed.

-- 5. Extend deals' SELECT policy — additive only. INSERT and UPDATE
-- policies on deals (both from 030) are NOT touched at all, per
-- instruction. Full policy shown below, not just the new clause, per
-- instruction; the single EXISTS/agent-ownership branch is
-- reproduced verbatim from 030 (see the header caveat: not
-- re-confirmed live), along with the is_admin() branch, with one OR
-- clause added for the collaborator case via is_deal_collaborator.
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
    OR public.is_deal_collaborator(
      deals.id,
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved')
    )
    OR public.is_admin()
  );
