-- ═══════════════════════════════════════════════════════════════
-- 022 — property_floor_plans
--
-- Seller-uploadable floor plan images, one-to-many per listing (for
-- multi-config projects, e.g. "2BHK - Type A" / "3BHK - Type B").
-- Uploaded via the same Cloudinary pipeline as listing photos
-- (/api/upload-image); this table only stores the resulting URLs.
--
-- Gating on the detail page mirrors kuula_tour_url (018): free/
-- logged-out see a locked blurred preview, premium sees the full
-- image(s). That gating is a subscription_tier check done in the
-- app layer — this migration only governs who can read/write rows.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.property_floor_plans (
  id             uuid        primary key default gen_random_uuid(),
  property_id    uuid        not null references public.property_listings(id) on delete cascade,
  image_url      text        not null,
  label          text,                    -- e.g. "2BHK - Type A"; null for single-plan listings
  display_order  integer     not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.property_floor_plans is
  'Seller-uploaded floor plan images for a property_listings row. Tier-gated on the detail page like kuula_tour_url.';

create index if not exists property_floor_plans_property_id_idx
  on public.property_floor_plans (property_id);

alter table public.property_floor_plans enable row level security;

-- Public can read floor plans only for listings that are live.
create policy "Public read floor plans of active listings"
  on public.property_floor_plans
  for select
  using (
    exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.status = 'active'
    )
  );

-- Owner (seller_email match, same pattern as property_listings' own
-- update/delete policies in 003_rls_fixes.sql) or admin can write.
create policy "Owner or admin insert floor plans"
  on public.property_floor_plans
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.seller_email = auth.jwt() ->> 'email'
    )
    -- Anon-submission carve-out: the post-property wizard inserts
    -- property_listings without requiring auth (see 001's "post-property
    -- form submits without auth" comment), so a brand-new anonymous
    -- seller has no JWT email to match yet. Mirrors that same anon
    -- trust window — restricted to listings still awaiting moderation.
    or exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.status = 'pending_review'
    )
  );

create policy "Owner or admin update floor plans"
  on public.property_floor_plans
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.seller_email = auth.jwt() ->> 'email'
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.seller_email = auth.jwt() ->> 'email'
    )
  );

create policy "Owner or admin delete floor plans"
  on public.property_floor_plans
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.property_listings pl
      where pl.id = property_floor_plans.property_id
        and pl.seller_email = auth.jwt() ->> 'email'
    )
  );
