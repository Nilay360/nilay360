-- Formalizes the live "agents" table into version control.
-- This table already exists in production (created out-of-band, never migrated).
-- CREATE TABLE IF NOT EXISTS makes this a safe no-op there while giving every
-- other environment (fresh DB, other branches) the real schema.
-- Confirmed against the live PostgREST OpenAPI schema on 2026-08-28.

CREATE TABLE IF NOT EXISTS agents (
  id                 UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id          UUID REFERENCES agencies(id) ON DELETE SET NULL,
  rera_number        TEXT,
  specialisations    property_type[] DEFAULT '{}',
  languages          TEXT[] DEFAULT '{}',
  cities             TEXT[] DEFAULT '{}',
  years_experience   INT DEFAULT 0,
  total_listings     INT DEFAULT 0,
  total_sold         INT DEFAULT 0,
  total_rented       INT DEFAULT 0,
  rating             NUMERIC DEFAULT 0,
  review_count       INT DEFAULT 0,
  is_verified        BOOLEAN DEFAULT false,
  is_featured        BOOLEAN DEFAULT false,
  subscription_plan  subscription_plan DEFAULT 'free',
  kyc_status         TEXT DEFAULT 'pending',
  kyc_documents      JSONB,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Public can view agents whose linked profile is active (mirrors the intent
-- the frontend already assumed with the now-corrected `profiles.is_active` join).
DROP POLICY IF EXISTS "Public can view agents with active profile" ON agents;
CREATE POLICY "Public can view agents with active profile" ON agents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = agents.user_id AND p.is_active = true)
  );

-- An agent can view and update their own agent row.
DROP POLICY IF EXISTS "Agents manage own row" ON agents;
CREATE POLICY "Agents manage own row" ON agents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
