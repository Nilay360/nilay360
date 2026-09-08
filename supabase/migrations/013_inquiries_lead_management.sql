-- Retrofits the real, live `inquiries` table into a proper lead-management
-- record, instead of building a separate/duplicate leads table.
--
-- Confirmed directly against production (2026-08-28, PostgREST OpenAPI
-- introspection + a live row read) before writing this:
--   * `inquiries` is real, has 8 live rows today, and `status` is a bare
--     `text` column (default 'new', no enum, no constraint).
--   * The `lead_status` enum (new/contacted/qualified/viewing_scheduled/
--     negotiation/closed/lost) already exists, created by
--     001_nivila_schema.sql for the never-wired-up `leads` table, and is
--     safe to reuse here.
--   * The real, live `agents` table (formalized in
--     010_agents_baseline_documented.sql) is the correct target for
--     `assigned_to` — NOT the aspirational `agents` shape the frontend used
--     to assume.
--   * A read of all 8 live rows (2026-08-28) found status values
--     new/contacted/closed/spam. 'spam' is NOT folded into 'lost' — they
--     are different concepts (lost = a real prospect who didn't convert;
--     spam = never a real lead) and merging them would corrupt future
--     lost-conversion-rate reporting. 'spam' was added as its own
--     lead_status label in the prerequisite migration
--     012_lead_status_add_spam.sql (must run first — Postgres does not
--     allow a new enum value to be used in the same transaction that adds
--     it).
--
-- This does NOT touch the dead `leads` / `lead_activities` tables from
-- 001_nivila_schema.sql — they remain unused. `inquiries` becomes the one
-- real table for this concept, per the "one concept, one table" rule.

-- 1. Convert `status` from untyped text to the existing lead_status enum
--    (now including 'spam', added in 012_lead_status_add_spam.sql).
--    The ELSE branch is a defensive fallback for any *future* stray value,
--    not a known real case today — every one of the 8 live rows' actual
--    values (new/contacted/closed/spam) is explicitly handled above it.
ALTER TABLE inquiries
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE inquiries
  ALTER COLUMN status TYPE lead_status
  USING (
    CASE
      WHEN status IN ('new','contacted','qualified','viewing_scheduled','negotiation','closed','lost','spam')
        THEN status::lead_status
      ELSE 'new'::lead_status
    END
  );

ALTER TABLE inquiries
  ALTER COLUMN status SET DEFAULT 'new'::lead_status;

-- 2. Ownership: who is working this inquiry.
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to);

-- 3. Fields the dead `leads` design had that a real pipeline needs and the
--    current `inquiries` shape lacks.
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- 4. Activity/notes timeline — modeled on the dead `lead_activities` table,
--    but pointing at `inquiries` (the one real table), not a separate
--    `leads` table.
CREATE TABLE IF NOT EXISTS inquiry_activities (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  content     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_activities_inquiry_id ON inquiry_activities(inquiry_id);

ALTER TABLE inquiry_activities ENABLE ROW LEVEL SECURITY;

-- Additive only: these are new policy names and do not touch the existing
-- seller/admin RLS policies on `inquiries` from 003_rls_fixes.sql /
-- 004_data_access_fix.sql.
DROP POLICY IF EXISTS "Assigned agent can view own inquiries" ON inquiries;
CREATE POLICY "Assigned agent can view own inquiries" ON inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = inquiries.assigned_to AND a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Assigned agent can update own inquiries" ON inquiries;
CREATE POLICY "Assigned agent can update own inquiries" ON inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = inquiries.assigned_to AND a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Assigned agent can view activities on own inquiries" ON inquiry_activities;
CREATE POLICY "Assigned agent can view activities on own inquiries" ON inquiry_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inquiries i JOIN agents a ON a.id = i.assigned_to
      WHERE i.id = inquiry_activities.inquiry_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assigned agent can log activity on own inquiries" ON inquiry_activities;
CREATE POLICY "Assigned agent can log activity on own inquiries" ON inquiry_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inquiries i JOIN agents a ON a.id = i.assigned_to
      WHERE i.id = inquiry_activities.inquiry_id AND a.user_id = auth.uid()
    )
  );

-- Admins get read-only visibility into agent activity notes, matching the
-- visibility they already have over `inquiries` itself elsewhere in the
-- schema. Reuses public.is_admin() — verified live via a direct RPC call
-- (2026-08-28) rather than recreated; per 008_admin_profiles_rls.sql it is
-- SECURITY DEFINER, checks profiles.role IN ('admin','super_admin'), and
-- is non-recursive. No admin UPDATE/DELETE policy is added: agents' notes
-- stay agent-authored and append-only, admins can only view them.
DROP POLICY IF EXISTS "Admins can view all inquiry activities" ON inquiry_activities;
CREATE POLICY "Admins can view all inquiry activities" ON inquiry_activities
  FOR SELECT USING (public.is_admin());
