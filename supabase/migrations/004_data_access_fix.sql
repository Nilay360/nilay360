DROP POLICY IF EXISTS "Users can view own listings" ON property_listings;
CREATE POLICY "Users can view own listings" ON property_listings
  FOR SELECT USING (seller_email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Users can delete own listings" ON property_listings;
CREATE POLICY "Users can delete own listings" ON property_listings
  FOR DELETE USING (seller_email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Users manage own saves" ON saved_properties;
CREATE POLICY "Users manage own saves" ON saved_properties
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
