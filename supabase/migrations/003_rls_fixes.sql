-- ── 003_rls_fixes.sql ────────────────────────────────────────────────────────
-- Fix RLS policies for all four core tables.
-- Run this in Supabase SQL Editor after 002_saved_properties.sql.

-- ── 1. property_listings ─────────────────────────────────────────────────────

ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anyone can insert listings"         ON property_listings;
DROP POLICY IF EXISTS "Owners can select own listings"     ON property_listings;
DROP POLICY IF EXISTS "Owners can update own listings"     ON property_listings;
DROP POLICY IF EXISTS "Owners can delete own listings"     ON property_listings;
DROP POLICY IF EXISTS "Public can view active listings"    ON property_listings;

-- Authenticated or anonymous users can insert (seller submits listing)
CREATE POLICY "Anyone can insert listings"
  ON property_listings FOR INSERT
  WITH CHECK (true);

-- Public can view active listings
CREATE POLICY "Public can view active listings"
  ON property_listings FOR SELECT
  USING (status = 'active' OR seller_email = auth.jwt() ->> 'email');

-- Owner can update their own listing (by seller_email matching JWT email)
CREATE POLICY "Owners can update own listings"
  ON property_listings FOR UPDATE
  USING (seller_email = auth.jwt() ->> 'email')
  WITH CHECK (seller_email = auth.jwt() ->> 'email');

-- Owner can delete their own listing
CREATE POLICY "Owners can delete own listings"
  ON property_listings FOR DELETE
  USING (seller_email = auth.jwt() ->> 'email');


-- ── 2. saved_properties ──────────────────────────────────────────────────────

ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users manage own saves"           ON saved_properties;
DROP POLICY IF EXISTS "Users can view own saves"         ON saved_properties;
DROP POLICY IF EXISTS "Users can insert own saves"       ON saved_properties;
DROP POLICY IF EXISTS "Users can delete own saves"       ON saved_properties;

-- All four operations scoped to the authenticated user's own rows
CREATE POLICY "Users can view own saves"
  ON saved_properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saves"
  ON saved_properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves"
  ON saved_properties FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. profiles ──────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop recursive/broken policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"       ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"             ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"               ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile"             ON profiles;

-- Simple non-recursive policies using auth.uid() directly
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── 4. properties ────────────────────────────────────────────────────────────
-- This is the public listings catalogue (not user submissions)

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Public can view properties"          ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert"      ON properties;

-- Public SELECT — anyone can browse
CREATE POLICY "Public can view properties"
  ON properties FOR SELECT
  USING (true);

-- Only authenticated users can insert (admin/agent seeding)
CREATE POLICY "Authenticated users can insert"
  ON properties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
