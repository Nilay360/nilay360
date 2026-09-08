-- ═══════════════════════════════════════════════════════════════
-- 045 — Team-based SELECT visibility on deals/inquiries/site_visits —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- migration tonight: this file has not been run against the database.
-- Do not apply until reviewed line by line.
--
-- THIS IS A MEANINGFUL POLICY CHANGE, NOT A MINOR ADDITION — flagged
-- plainly, per instruction. Until now, an agent's deals/leads/site
-- visits were visible only to that agent, that deal's own
-- collaborators (041), and admins. This migration makes an agent's
-- entire pipeline — every deal, lead, and site visit they're the
-- primary agent on — visible (SELECT only) to every one of their
-- teammates, across the whole agent portal, the moment 044's teams/
-- team_members exist and someone is placed on a team. That is a real,
-- deliberate expansion of who can see what, not a narrow fix — a
-- teammate did not previously have any visibility into a colleague's
-- pipeline at all, and after this migration they see all of it
-- (view-only). No UPDATE/INSERT/DELETE policy on any of these three
-- tables is touched — teammates get team-dashboard visibility, not
-- edit rights.
--
-- DEPENDS ON 044 — must be applied together with, and after, 044:
-- this migration's shares_team_with() and the rewritten
-- are_agents_connected() both read team_members, and section 3 rewrite
-- of are_agents_connected replaces 044's own version of that function.
-- Applying 045 without 044 first would fail outright (team_members
-- doesn't exist yet); applying 044 without immediately following it
-- with 045 leaves are_agents_connected's "same team" branch as 044's
-- inline duplicate rather than delegating to shares_team_with — not
-- broken, just the exact duplication this migration exists to remove.
--
-- Why shares_team_with is extracted rather than inlined again: 044
-- wrote the "do p_agent_a and p_agent_b share a team" check directly
-- inline inside are_agents_connected. This migration needs the
-- identical check in three more places (deals, inquiries, site_visits
-- SELECT policies) — inlining it a fourth and fifth and sixth time
-- would leave six copies of the same query to keep in sync by hand.
-- One SECURITY DEFINER function, called from all four places
-- (including the rewritten are_agents_connected itself), is the
-- reusable version. SECURITY DEFINER here for the same standing
-- reason as every other cross-table helper tonight: it's called from
-- deals'/inquiries'/site_visits' policies (different tables again),
-- reading team_members — a plain EXISTS/JOIN in that position would
-- reintroduce the exact "policy reads a different RLS-protected
-- table's rows without bypassing its RLS" risk 036/040 diagnosed.
-- ═══════════════════════════════════════════════════════════════

-- 1. shares_team_with — reusable helper, replaces the inline "same
-- team" duplicate 044 wrote directly inside are_agents_connected.
CREATE OR REPLACE FUNCTION public.shares_team_with(p_agent_a uuid, p_agent_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.agent_profile_id = p_agent_a AND tm2.agent_profile_id = p_agent_b
  );
$$;

-- 2. are_agents_connected — CREATE OR REPLACE. Deal and conversation
-- branches unchanged from 044 (reproduced verbatim); the team branch
-- now calls shares_team_with instead of repeating its own copy of the
-- same query. Full function shown, not just the changed clause.
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
  ) OR public.shares_team_with(p_agent_a, p_agent_b);
$$;

-- 3. deals SELECT — additive teammate clause. Current live policy
-- (034 as amended by 041, adding the collaborator branch) reproduced
-- in full below; only the new shares_team_with OR-clause is added.
-- INSERT/UPDATE on deals are NOT touched.
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
    OR public.shares_team_with(
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved'),
      deals.assigned_to
    )
    OR public.is_admin()
  );

-- 4. inquiries SELECT — additive teammate clause. Current live policy
-- is 024_inquiries_agent_rls_agent_profiles.sql's "Assigned agent can
-- view own inquiries" (confirmed still current — 025, the only later
-- migration touching inquiries, only adds columns, no RLS changes),
-- reproduced in full below with the new clause added. This does NOT
-- touch inquiries' separate seller-facing or admin SELECT policies
-- from 003/004 (untouched by 024 too, and out of scope here), nor
-- inquiries' UPDATE policy, nor inquiry_activities at all.
DROP POLICY IF EXISTS "Assigned agent can view own inquiries" ON inquiries;
CREATE POLICY "Assigned agent can view own inquiries" ON inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = inquiries.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.shares_team_with(
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved'),
      inquiries.assigned_to
    )
  );

-- 5. site_visits SELECT — additive teammate clause. Current live
-- policy is 029_site_visits_agent_rls.sql's "Assigned agent can view
-- own site visits" — its own two existing branches (direct
-- assignment, and via the linked inquiry's assigned agent) reproduced
-- in full below, with the new clause added as a third. site_visits'
-- separate seller/admin SELECT policy (006) and the UPDATE policy
-- (029) are untouched.
DROP POLICY IF EXISTS "Assigned agent can view own site visits" ON site_visits;
CREATE POLICY "Assigned agent can view own site visits"
  ON site_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = site_visits.assigned_to
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = site_visits.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.shares_team_with(
      (SELECT ap.id FROM agent_profiles ap WHERE ap.user_id = auth.uid() AND ap.status = 'approved'),
      site_visits.assigned_to
    )
  );
