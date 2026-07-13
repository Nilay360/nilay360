-- ═══════════════════════════════════════════════════════════════
-- 017 — Public read on profiles for approved agents (fixes blank
-- name/phone/email on /agents/[slug] for real agents)
--
-- Discovered live, mid-Tier-2-testing: the real /agents/[slug] fetch
-- (016) embeds profiles(full_name, phone, email) via agent_profiles.
-- agent_profiles already has a public-read policy for approved rows
-- (011_agent_portal_schema.sql), but profiles itself only allows a
-- user to read their own row (004_data_access_fix.sql) or an admin to
-- read all (008_admin_profiles_rls.sql) — there was no policy letting
-- a random visitor read an approved agent's public-facing name/phone/
-- email. PostgREST silently returns the embed as null under RLS
-- denial rather than erroring, which is why the page rendered with a
-- real agent_profiles row but a blank name.
--
-- Additive only — mirrors the existing agent_service_cities_public_
-- select_approved pattern. OR-combines with existing profiles
-- policies, so no existing access is narrowed.
-- ═══════════════════════════════════════════════════════════════

create policy "profiles_public_select_approved_agents"
  on public.profiles for select
  using (
    exists (
      select 1 from public.agent_profiles
      where agent_profiles.user_id = profiles.id
        and agent_profiles.status = 'approved'
    )
  );
