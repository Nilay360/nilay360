-- ═══════════════════════════════════════════════════════════════
-- 011 — Agent Portal: database layer (tables + RLS only, no UI)
--
-- profiles.role already has 'agent' in the user_role enum
-- (001_nivila_schema.sql:18) — not recreated here.
--
-- public.is_admin() already exists in the live database (referenced
-- in 008_admin_profiles_rls.sql) and is reused here, not redefined.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. agent_profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  license_number    TEXT,
  agency_name       TEXT,
  bio               TEXT,
  years_experience  INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_status  ON agent_profiles(status);

-- ── 2. agent_service_cities ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_service_cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES agent_profiles(id) NOT NULL,
  city        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, city)
);

CREATE INDEX IF NOT EXISTS idx_agent_service_cities_agent_id ON agent_service_cities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_service_cities_city     ON agent_service_cities(city);

-- ── 3. property_listings.assigned_agent_id ────────────────────────
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agent_profiles(id);

CREATE INDEX IF NOT EXISTS idx_property_listings_assigned_agent_id ON property_listings(assigned_agent_id);

-- ── 4. RLS ──────────────────────────────────────────────────────────

ALTER TABLE agent_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_service_cities ENABLE ROW LEVEL SECURITY;

-- agent_profiles: agents read/update own row
CREATE POLICY "agent_profiles_select_own"
  ON agent_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "agent_profiles_update_own"
  ON agent_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "agent_profiles_insert_own"
  ON agent_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- agent_profiles: admins read/update all
CREATE POLICY "agent_profiles_admin_select_all"
  ON agent_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "agent_profiles_admin_update_all"
  ON agent_profiles FOR UPDATE
  USING (public.is_admin());

-- agent_profiles: public can read approved rows only (future public profile pages)
CREATE POLICY "agent_profiles_public_select_approved"
  ON agent_profiles FOR SELECT
  USING (status = 'approved');

-- agent_service_cities: same ownership pattern, scoped via agent_id → agent_profiles.user_id
CREATE POLICY "agent_service_cities_select_own"
  ON agent_service_cities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = agent_service_cities.agent_id
        AND agent_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_service_cities_insert_own"
  ON agent_service_cities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = agent_service_cities.agent_id
        AND agent_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_service_cities_update_own"
  ON agent_service_cities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = agent_service_cities.agent_id
        AND agent_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_service_cities_delete_own"
  ON agent_service_cities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = agent_service_cities.agent_id
        AND agent_profiles.user_id = auth.uid()
    )
  );

-- agent_service_cities: admins read/update all
CREATE POLICY "agent_service_cities_admin_select_all"
  ON agent_service_cities FOR SELECT
  USING (public.is_admin());

CREATE POLICY "agent_service_cities_admin_update_all"
  ON agent_service_cities FOR UPDATE
  USING (public.is_admin());

-- agent_service_cities: public can read cities for approved agents (future public profile pages)
CREATE POLICY "agent_service_cities_public_select_approved"
  ON agent_service_cities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = agent_service_cities.agent_id
        AND agent_profiles.status = 'approved'
    )
  );

-- property_listings: agents can READ listings assigned to them.
-- Existing policies are untouched — this ADDs read access, it does not
-- grant write/update. Policies OR-combine, so no existing access is lost.
CREATE POLICY "agent_can_view_assigned_listings"
  ON property_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles
      WHERE agent_profiles.id = property_listings.assigned_agent_id
        AND agent_profiles.user_id = auth.uid()
    )
  );
