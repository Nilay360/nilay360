-- ═══════════════════════════════════════════════════════════════
-- 012 — Admin INSERT policies for agent_profiles / agent_service_cities
--
-- 011_agent_portal_schema.sql only added an owner-scoped INSERT policy
-- (user_id = auth.uid()). The admin "Add Agent Manually" flow inserts
-- a row on behalf of ANOTHER user, which that policy correctly blocks.
-- This adds the missing admin-path INSERT policies. Existing owner
-- INSERT policies are untouched — policies OR-combine.
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "agent_profiles_admin_insert_all"
  ON agent_profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "agent_service_cities_admin_insert_all"
  ON agent_service_cities FOR INSERT
  WITH CHECK (public.is_admin());
