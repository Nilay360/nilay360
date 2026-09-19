-- ═══════════════════════════════════════════════════════════════
-- 073 — property_floor_plans: admin SELECT bypass
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- CONFIRMED GAP (this session's investigation, reading 022_property_
-- floor_plans.sql directly, not assumed): that migration's INSERT,
-- UPDATE, and DELETE policies on property_floor_plans all already
-- include a `public.is_admin() OR ...` bypass, but its SELECT policy
-- — "Public read floor plans of active listings" — does not:
--
--   create policy "Public read floor plans of active listings"
--     on public.property_floor_plans
--     for select
--     using (
--       exists (
--         select 1 from public.property_listings pl
--         where pl.id = property_floor_plans.property_id
--           and pl.status = 'active'
--       )
--     );
--
-- Effect of the gap: an admin reviewing a pending (non-'active')
-- listing gets zero floor plan rows back — not an error, just an
-- empty result — even though they can already legitimately write to
-- that same table for the same row. This blocks the in-admin pending-
-- review preview from ever showing floor plans for anything not yet
-- approved.
--
-- Fix is purely additive: the exact same USING clause as before,
-- OR'd with public.is_admin(), so every existing (non-admin) reader's
-- access is completely unchanged — this can only ever grant MORE rows
-- to admins, never take rows away from anyone. Same DROP+CREATE
-- pattern used throughout tonight's other policy changes (Postgres has
-- no "add a condition to an existing policy" statement — the full
-- USING clause has to be redefined).
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public read floor plans of active listings" ON public.property_floor_plans;

CREATE POLICY "Public read floor plans of active listings"
  ON public.property_floor_plans
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = property_floor_plans.property_id
        AND pl.status = 'active'
    )
  );
