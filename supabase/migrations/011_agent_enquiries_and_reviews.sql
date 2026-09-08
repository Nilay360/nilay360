-- Creates two tables the frontend already queries/inserts into but that were
-- never migrated and do NOT exist in the live database (confirmed via
-- PostgREST OpenAPI introspection on 2026-08-28 — both return "not found").
--
-- Effect of the missing tables today:
--   * The agent profile contact form (`agent_enquiries`) silently fails on
--     every submission (caught by an empty try/catch) while still showing
--     the user a "Message Sent!" success state — messages are being
--     silently discarded and users are told otherwise.
--   * The agent profile reviews tab (`agent_reviews`) always errors, so the
--     page always falls back to hardcoded placeholder reviews.
--
-- CORRECTED 2026-08-29, before this migration was ever applied: `agent_id`
-- originally referenced `agents(id)`, written before the agents-vs-
-- agent_profiles identity split was discovered. `agent_profiles` is the
-- real, canonical agent table (2 real approved agents, backs the live
-- become-an-agent/admin-approval/dashboard-self-edit flow); `agents` is
-- dead schema. Fixed here directly rather than via a follow-up ALTER
-- migration, since this file was never run against production.

CREATE TABLE IF NOT EXISTS agent_enquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  agent_name  TEXT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_enquiries_agent_id ON agent_enquiries(agent_id);

ALTER TABLE agent_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an agent enquiry" ON agent_enquiries;
CREATE POLICY "Anyone can submit an agent enquiry" ON agent_enquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Agent can view own enquiries" ON agent_enquiries;
CREATE POLICY "Agent can view own enquiries" ON agent_enquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agent_profiles a WHERE a.id = agent_enquiries.agent_id AND a.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS agent_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  reviewer_name  TEXT NOT NULL,
  reviewer_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating         INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT,
  property_title TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id);

ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read agent reviews" ON agent_reviews;
CREATE POLICY "Public can read agent reviews" ON agent_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can submit a review" ON agent_reviews;
CREATE POLICY "Authenticated users can submit a review" ON agent_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
