-- ═══════════════════════════════════════════════════════════════
-- 075 — site_contacts (admin-editable contact numbers)
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration: this file has not been run against the database.
-- Do not apply until reviewed line by line.
--
-- Replaces the hardcoded phone number 7075792497, which previously
-- appeared independently in 9 places across 6 files (in 4 different
-- formats) plus 3 places reading it from src/constants/index.ts's
-- BRAND.phone/BRAND.whatsapp — confirmed via direct grep across the
-- whole codebase, not assumed. One table, one row per real contact
-- purpose, following the same "one concept, one table" discipline as
-- every other table added this session.
--
-- Modeled directly on site_content (021_site_content.sql)'s own
-- shape and RLS reasoning — public SELECT is required so visitor-
-- facing pages can render this without a session, admin-only
-- writes — with one deliberate difference: site_content has no
-- "active" concept (a key either exists or it doesn't), but a
-- contact number needs to be temporarily hideable without deleting
-- the row (e.g. a sales number pulled from display during a staffing
-- gap) — hence is_active, and a SELECT policy that lets admins see
-- disabled rows (to re-enable them) while visitors only ever see
-- active ones.
--
-- contact_type is a PRIMARY KEY, not a plain column — one row per
-- purpose, edit-in-place, same pattern as site_content.key. The CHECK
-- list below is intentionally wider than what's seeded today: only
-- 'general' is being seeded in this migration (the only number that
-- has ever actually existed anywhere in this codebase — confirmed by
-- investigation, not assumed); 'customer_care'/'sales'/'capture_team'
-- are headroom for the admin to add later via the new admin panel
-- section, not fabricated placeholder data.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.site_contacts (
  contact_type  text primary key
    check (contact_type in ('general', 'customer_care', 'sales', 'capture_team')),
  label         text not null,
  phone         text not null,
  whatsapp      text,
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id)
);

alter table public.site_contacts enable row level security;

create policy "site_contacts_select"
  on public.site_contacts for select
  using (public.is_admin() or is_active = true);

create policy "site_contacts_admin_insert"
  on public.site_contacts for insert
  with check (public.is_admin());

create policy "site_contacts_admin_update"
  on public.site_contacts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "site_contacts_admin_delete"
  on public.site_contacts for delete
  using (public.is_admin());

-- Display format is "+91 70933 36360" (5+5 grouping) — the single
-- stored value used both for on-screen display and, via a shared
-- digits-only strip function applied at render time, for tel:/wa.me
-- hrefs. Never stored twice in two formats.
insert into public.site_contacts (contact_type, label, phone, whatsapp) values
  ('general', 'General Enquiries', '+91 70933 36360', '+91 70933 36360')
on conflict (contact_type) do nothing;
