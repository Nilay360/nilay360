-- ============================================================
-- NIVILA — Migration 001
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ── 1. property_listings table ────────────────────────────────────────────────

create table if not exists public.property_listings (

  -- Identity
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        unique,
  title               text,

  -- Classification
  listing_type        text        not null,                  -- 'sale' | 'rent' | 'commercial'
  property_category   text        not null,                  -- 'apartment' | 'villa' | 'plot' | ...
  status              text        not null default 'pending_review',

  -- Pricing
  price               numeric,
  price_negotiable    boolean     not null default false,
  maintenance_charge  numeric,
  emi_enabled         boolean     not null default false,

  -- Size & layout
  built_up_area       numeric,
  carpet_area         numeric,
  bedrooms            text,
  bathrooms           text,
  balconies           text,
  floor_number        numeric,
  total_floors        numeric,

  -- Property attributes
  facing              text,
  property_age        text,
  furnishing          text,
  parking             text,
  possession_status   text,

  -- Location
  address             text,
  locality            text,
  city                text,
  state               text,
  pincode             text,
  landmark            text,

  -- Content
  highlights          text,
  amenities           text[]      not null default '{}',
  photo_urls          text[]      not null default '{}',
  video_url           text,

  -- Seller contact
  seller_name         text,
  seller_email        text,
  seller_phone        text,
  seller_whatsapp     text,

  -- Metadata
  is_featured         boolean     not null default false,
  views               integer     not null default 0,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.property_listings is
  'Seller-submitted property listings. status=pending_review until moderated.';


-- ── 2. RLS policies ───────────────────────────────────────────────────────────

alter table public.property_listings enable row level security;

-- Anyone (including unauthenticated visitors) can read active listings.
create policy "Public read active listings"
  on public.property_listings
  for select
  using (status = 'active');

-- The post-property form submits without auth — allow anon inserts so long as
-- status is pending_review. Moderation happens on the admin side.
create policy "Anon insert pending listings"
  on public.property_listings
  for insert
  to anon
  with check (status = 'pending_review');

-- Authenticated users can insert too (same guard).
create policy "Auth insert pending listings"
  on public.property_listings
  for insert
  to authenticated
  with check (status = 'pending_review');


-- ── 3. updated_at trigger ─────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_property_listings_updated_at
  before update on public.property_listings
  for each row execute function public.set_updated_at();


-- ── 4. Storage bucket: property-images ───────────────────────────────────────
-- Creates a public bucket so uploaded photo URLs are readable without auth.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  10485760,   -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

-- Allow anyone to upload (anon POST). Listings are not auth-gated on the form.
create policy "Anon upload property images"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'property-images');

create policy "Auth upload property images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'property-images');

-- Anyone can read from this public bucket.
create policy "Public read property images"
  on storage.objects
  for select
  using (bucket_id = 'property-images');


-- ── 5. Fix infinite-recursion RLS policy on profiles ─────────────────────────
-- The profiles table has a recursive policy that causes all anon selects to
-- return HTTP 500. Drop whatever policy references profiles from within itself
-- and replace with a simple non-recursive one.

-- List current policies so you can identify the bad one if needed:
-- select policyname from pg_policies where tablename = 'profiles';

-- Safe drop of the most common culprit names (add yours if different):
drop policy if exists "Users can view all profiles"     on public.profiles;
drop policy if exists "Enable read access for all users" on public.profiles;
drop policy if exists "profiles_select_policy"          on public.profiles;

-- Users can read any profile (non-recursive, uses auth.uid() not a subquery).
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Admins can read all profiles.
create policy "Admins can read all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' in ('admin','super_admin')
    )
  );
