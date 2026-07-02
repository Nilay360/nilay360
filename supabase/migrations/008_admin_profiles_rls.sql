-- ═══════════════════════════════════════════════════════════════
-- 008 — Admin SELECT visibility on profiles (fixes "All Users" tab)
--
-- Verified live state (pg_policies, 2026-07-03): profiles has exactly
-- four policies — profiles_select / profiles_insert / profiles_update
-- (own-row, correct) and "Admins can update all profiles" (UPDATE,
-- already gated on is_admin()). There is NO admin SELECT policy, so
-- the admin "All Users" page can only read the admin's own row.
--
-- is_admin() already exists in the database (the UPDATE policy
-- references it) and is intentionally NOT recreated here. Its
-- definition was verified before this migration ran: SECURITY
-- DEFINER, checks profiles.role IN ('admin','super_admin'),
-- non-recursive.
--
-- This migration adds the single missing policy. Own-row policies
-- are untouched; policies OR-combine, so user self-access is
-- unchanged.
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "admin_select_all_profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());
