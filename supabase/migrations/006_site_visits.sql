-- ── 006_site_visits.sql ──────────────────────────────────────────────────────
-- Stores site-visit requests submitted from the property detail page
-- (Batch 3, Feature 2). Run after 005_profiles_city.sql.

CREATE TABLE IF NOT EXISTS site_visits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     text,
  property_slug   text,
  property_title  text,
  seller_email    text,
  visitor_name    text NOT NULL,
  visitor_phone   text NOT NULL,
  visit_date      date NOT NULL,
  visit_time_slot text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_slug   ON site_visits(property_slug);
CREATE INDEX IF NOT EXISTS idx_site_visits_seller ON site_visits(seller_email);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can request a site visit" ON site_visits;
DROP POLICY IF EXISTS "Seller or admin can view visits"  ON site_visits;
DROP POLICY IF EXISTS "Seller or admin can update visits" ON site_visits;

-- Visitors (including anonymous) may create a request.
CREATE POLICY "Anyone can request a site visit"
  ON site_visits FOR INSERT
  WITH CHECK (true);

-- The listing's seller (matched by email) or an admin may read requests.
CREATE POLICY "Seller or admin can view visits"
  ON site_visits FOR SELECT
  USING (
    seller_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- The seller or an admin may update status (e.g. confirm / cancel).
CREATE POLICY "Seller or admin can update visits"
  ON site_visits FOR UPDATE
  USING (
    seller_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
