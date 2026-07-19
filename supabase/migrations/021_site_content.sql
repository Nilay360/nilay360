-- ═══════════════════════════════════════════════════════════════
-- 021 — Site content (admin-managed key/value copy)
--
-- Lets admins edit commonly-changed homepage copy (hero headline,
-- subtitle) without a code deploy. Public SELECT is required so the
-- homepage can render this for anonymous visitors; INSERT/UPDATE are
-- restricted to admins via is_admin() (already defined — see
-- 008_admin_profiles_rls.sql). No DELETE policy: rows are a fixed,
-- known set of keys the app reads by name, so removing one should be
-- a deliberate code change, not a stray admin click.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.site_content enable row level security;

create policy "site_content_public_select"
  on public.site_content for select
  using (true);

create policy "site_content_admin_insert"
  on public.site_content for insert
  with check (public.is_admin());

create policy "site_content_admin_update"
  on public.site_content for update
  using (public.is_admin())
  with check (public.is_admin());

insert into public.site_content (key, value) values
  ('hero_line1',      'Find Your Dream Property'),
  ('hero_line2',      'Now in Hyderabad'),
  ('hero_subtitle',   'From search to possession — India''s most trusted premium platform'),
  ('trust_bar_note',  '')
on conflict (key) do nothing;
