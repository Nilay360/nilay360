-- ═══════════════════════════════════════════════════════════════
-- 014 — Admin RLS for inquiries (flagged gap, needs approval)
--
-- The `inquiries` table has no CREATE TABLE migration anywhere in
-- this repo — it was created directly against the live Supabase
-- project, out of band. Because of that, its RLS policies could not
-- be verified from source before adding admin delete/mark-spam
-- actions in the admin panel (Tier 1, 2026-07-11).
--
-- This migration is additive only: RLS policies for the same command
-- are OR-combined by Postgres, so adding these can only GRANT access
-- an admin doesn't already have — it cannot revoke or replace any
-- existing policy on the table. Safe to run even if equivalent
-- policies already exist elsewhere (the DROP IF EXISTS/CREATE pair
-- below only touches policies with these exact names).
--
-- Do not apply until reviewed — the actual live state of this
-- table's RLS is unconfirmed.
-- ═══════════════════════════════════════════════════════════════

alter table public.inquiries enable row level security;

drop policy if exists "admin_select_inquiries" on public.inquiries;
create policy "admin_select_inquiries"
  on public.inquiries for select
  using (public.is_admin());

drop policy if exists "admin_update_inquiries" on public.inquiries;
create policy "admin_update_inquiries"
  on public.inquiries for update
  using (public.is_admin());

drop policy if exists "admin_delete_inquiries" on public.inquiries;
create policy "admin_delete_inquiries"
  on public.inquiries for delete
  using (public.is_admin());
