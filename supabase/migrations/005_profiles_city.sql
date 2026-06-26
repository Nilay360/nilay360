-- ── 005_profiles_city.sql ────────────────────────────────────────────────────
-- Adds a single `city` column to profiles.
--
-- The auth registration flow (AuthModal) collects the user's primary city and
-- upserts it onto the profile, and the Navbar already reads profiles.city to
-- display under the user's name. The original schema only had
-- preferred_cities TEXT[], so this adds the scalar column those features expect.
--
-- Run this in the Supabase SQL Editor after 004_data_access_fix.sql.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
