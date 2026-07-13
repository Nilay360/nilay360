-- ═══════════════════════════════════════════════════════════════
-- 015 — Reports/flagging system (Tier 2)
--
-- Signed-in-only reporting (kills anonymous drive-by abuse of the
-- report button) with manual admin review (no auto-thresholds yet —
-- easy to add once real report volume/patterns are visible).
--
-- RLS: signed-in users can insert their OWN reports; admins can
-- select/update all; there is deliberately NO public/general SELECT
-- policy — reports are not public data, only admins see who reported
-- what. No DELETE policy either (reports are resolved/dismissed via
-- status, not removed).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) not null,
  entity_type text not null check (entity_type in ('listing', 'profile')),
  entity_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create index if not exists idx_reports_entity on public.reports(entity_type, entity_id);
create index if not exists idx_reports_status on public.reports(status);

alter table public.reports enable row level security;

create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "admin_select_reports"
  on public.reports for select
  using (public.is_admin());

create policy "admin_update_reports"
  on public.reports for update
  using (public.is_admin());
