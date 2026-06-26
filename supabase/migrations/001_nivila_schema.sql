-- ============================================================
-- NIVILA — Complete Database Schema
-- Phase 1 (Public) + Phase 2 (Seller) + Phase 3 (Admin)
-- PostgreSQL via Supabase
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "postgis";        -- geo queries (optional, install if available)

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'buyer', 'seller', 'agent', 'agency',
  'moderator', 'content_manager', 'support',
  'finance_manager', 'sales_manager', 'admin', 'super_admin'
);

CREATE TYPE property_type AS ENUM (
  'apartment', 'villa', 'plot', 'penthouse',
  'townhouse', 'office', 'retail', 'warehouse', 'industrial'
);

CREATE TYPE listing_type AS ENUM ('sale', 'rent', 'commercial');

CREATE TYPE property_status AS ENUM (
  'draft', 'pending_review', 'active', 'paused',
  'sold', 'rented', 'rejected', 'archived'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified',
  'viewing_scheduled', 'negotiation', 'closed', 'lost'
);

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_type AS ENUM ('technical', 'billing', 'property_issue', 'agent_issue', 'general');

CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'agency', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');

CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp', 'push');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'dismissed');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');

-- ============================================================
-- PHASE 1 — CORE TABLES
-- ============================================================

-- ── 1. PROFILES (extends Supabase auth.users) ────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'buyer',
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  bio             TEXT,
  preferred_cities TEXT[],
  budget_min      BIGINT,
  budget_max      BIGINT,
  preferred_types property_type[],
  whatsapp        TEXT,
  date_of_birth   DATE,
  gender          TEXT,
  nationality     TEXT,
  is_nri          BOOLEAN DEFAULT FALSE,
  referral_code   TEXT UNIQUE DEFAULT SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
  referred_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CITIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  state           TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'India',
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  overview        TEXT,
  population      BIGINT,
  avg_sale_price  BIGINT,
  avg_rent_price  BIGINT,
  price_growth_yoy DECIMAL(5,2),
  image_url       TEXT,
  is_featured     BOOLEAN DEFAULT FALSE,
  listing_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. NEIGHBOURHOODS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS neighbourhoods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id         UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  avg_price       BIGINT,
  is_trending     BOOLEAN DEFAULT FALSE,
  listing_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city_id, slug)
);

-- ── 4. DEVELOPERS / BUILDERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS developers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  cover_url       TEXT,
  description     TEXT,
  founded_year    INT,
  rera_number     TEXT,
  cities          TEXT[],
  total_projects  INT DEFAULT 0,
  completed_projects INT DEFAULT 0,
  website         TEXT,
  phone           TEXT,
  email           TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_featured     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. AGENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id         UUID,                         -- FK added after agencies table
  rera_number       TEXT,
  specialisations   property_type[],
  languages         TEXT[],
  cities            TEXT[],
  years_experience  INT DEFAULT 0,
  total_listings    INT DEFAULT 0,
  total_sold        INT DEFAULT 0,
  total_rented      INT DEFAULT 0,
  rating            DECIMAL(3,2) DEFAULT 0,
  review_count      INT DEFAULT 0,
  is_verified       BOOLEAN DEFAULT FALSE,
  is_featured       BOOLEAN DEFAULT FALSE,
  subscription_plan subscription_plan DEFAULT 'free',
  kyc_status        TEXT DEFAULT 'pending',       -- pending, submitted, verified, rejected
  kyc_documents     JSONB,                         -- {aadhaar, pan, rera_cert}
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. AGENCIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  description     TEXT,
  rera_number     TEXT,
  cities          TEXT[],
  agent_count     INT DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  subscription_plan subscription_plan DEFAULT 'free',
  owner_id        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add agency FK to agents after agencies table exists
ALTER TABLE agents ADD CONSTRAINT agents_agency_fk
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;

-- ── 7. PROPERTIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  type                  property_type NOT NULL,
  listing_type          listing_type NOT NULL,
  status                property_status DEFAULT 'draft',
  approval_status       approval_status DEFAULT 'pending',

  -- Pricing
  price                 BIGINT NOT NULL,
  price_per_sqft        INT,
  is_price_negotiable   BOOLEAN DEFAULT FALSE,
  maintenance_fee       INT,
  deposit_amount        BIGINT,

  -- Specs
  area_sqft             INT NOT NULL,
  bedrooms              SMALLINT,
  bathrooms             SMALLINT,
  parking_spaces        SMALLINT DEFAULT 0,
  floor_number          SMALLINT,
  total_floors          SMALLINT,
  year_built            INT,
  is_furnished          BOOLEAN DEFAULT FALSE,
  is_new_construction   BOOLEAN DEFAULT FALSE,
  possession_date       DATE,

  -- Location
  address               TEXT NOT NULL,
  city                  TEXT NOT NULL,
  city_id               UUID REFERENCES cities(id),
  neighbourhood         TEXT,
  neighbourhood_id      UUID REFERENCES neighbourhoods(id),
  state                 TEXT NOT NULL DEFAULT 'Telangana',
  pincode               TEXT,
  latitude              DECIMAL(10,8),
  longitude             DECIMAL(11,8),
  map_link              TEXT,

  -- Media
  images                TEXT[] DEFAULT '{}',
  video_url             TEXT,
  virtual_tour_url      TEXT,
  floor_plan_urls       TEXT[] DEFAULT '{}',
  brochure_url          TEXT,

  -- Features
  amenities             TEXT[] DEFAULT '{}',
  facing                TEXT,            -- North, South, East, West
  vastu_compliant       BOOLEAN,

  -- Legal
  rera_number           TEXT,
  ownership_type        TEXT,            -- Freehold, Leasehold
  legal_clearance       BOOLEAN DEFAULT FALSE,

  -- Relations
  agent_id              UUID REFERENCES agents(id),
  developer_id          UUID REFERENCES developers(id),
  owner_id              UUID REFERENCES profiles(id),

  -- SEO
  seo_title             TEXT,
  seo_description       TEXT,
  meta_keywords         TEXT[],

  -- Analytics
  is_featured           BOOLEAN DEFAULT FALSE,
  is_boosted            BOOLEAN DEFAULT FALSE,
  boost_expires_at      TIMESTAMPTZ,
  views                 INT DEFAULT 0,
  saves                 INT DEFAULT 0,
  inquiry_count         INT DEFAULT 0,

  -- Admin
  rejection_reason      TEXT,
  admin_notes           TEXT,
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. PROPERTY PRICE HISTORY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS property_price_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  price       BIGINT NOT NULL,
  changed_by  UUID REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. LEADS / INQUIRIES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id          UUID REFERENCES profiles(id),
  agent_id          UUID REFERENCES agents(id),

  -- Contact info
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL,
  message           TEXT,

  -- Details
  budget            BIGINT,
  preferred_date    DATE,
  financing_status  TEXT,    -- cash, home_loan, nri_loan
  source            TEXT,    -- web, whatsapp, call, referral

  -- Pipeline
  status            lead_status DEFAULT 'new',
  priority          TEXT DEFAULT 'medium',
  assigned_to       UUID REFERENCES agents(id),

  -- Tracking
  last_contacted_at TIMESTAMPTZ,
  next_follow_up    TIMESTAMPTZ,
  notes             TEXT,
  tags              TEXT[],

  -- Viewing
  viewing_scheduled_at TIMESTAMPTZ,
  viewing_completed    BOOLEAN DEFAULT FALSE,
  viewing_notes        TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. LEAD ACTIVITIES (timeline) ────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id),
  type        TEXT NOT NULL,   -- call, email, whatsapp, sms, note, status_change, viewing
  content     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. SAVED / WISHLIST PROPERTIES ───────────────────────────
CREATE TABLE IF NOT EXISTS saved_properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ── 12. PROPERTY VIEWS (history) ──────────────────────────────
CREATE TABLE IF NOT EXISTS property_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  ip_address  TEXT,
  user_agent  TEXT,
  source      TEXT,           -- search, direct, featured, recommendation
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. SAVED SEARCHES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT,
  filters     JSONB NOT NULL,  -- SearchFilters object
  alert_email BOOLEAN DEFAULT TRUE,
  alert_push  BOOLEAN DEFAULT FALSE,
  last_alerted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. APPOINTMENTS / VIEWINGS ───────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id),
  lead_id         UUID REFERENCES leads(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INT DEFAULT 60,
  type            TEXT DEFAULT 'physical',   -- physical, virtual
  status          TEXT DEFAULT 'pending',    -- pending, confirmed, completed, cancelled
  notes           TEXT,
  meeting_link    TEXT,
  reminder_sent   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. REVIEWS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  content     TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 16. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL,    -- new_lead, price_drop, property_approved, viewing_reminder, etc.
  channel     notification_channel DEFAULT 'in_app',
  status      notification_status DEFAULT 'unread',
  action_url  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. COMPARE HISTORY ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS compare_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_ids UUID[] NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHASE 2 — SELLER / AGENT TABLES
-- ============================================================

-- ── 18. SUBSCRIPTIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan            subscription_plan NOT NULL DEFAULT 'free',
  status          subscription_status DEFAULT 'active',
  billing_cycle   TEXT DEFAULT 'monthly',     -- monthly, annual
  amount          INT NOT NULL DEFAULT 0,     -- in paise
  currency        TEXT DEFAULT 'INR',
  razorpay_sub_id TEXT,
  stripe_sub_id   TEXT,
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  listing_limit   INT DEFAULT 5,
  leads_limit     INT DEFAULT 50,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 19. TRANSACTIONS / PAYMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id),
  type                TEXT NOT NULL,    -- subscription, featured_listing, lead_credit, boost
  amount              BIGINT NOT NULL,  -- in paise
  currency            TEXT DEFAULT 'INR',
  status              TEXT DEFAULT 'pending',  -- pending, success, failed, refunded
  gateway             TEXT,             -- razorpay, stripe
  gateway_txn_id      TEXT,
  gateway_order_id    TEXT,
  gateway_payment_id  TEXT,
  invoice_number      TEXT UNIQUE,
  gst_amount          INT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 20. FEATURED LISTING PURCHASES ────────────────────────────
CREATE TABLE IF NOT EXISTS featured_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id),
  transaction_id UUID REFERENCES transactions(id),
  slot_type     TEXT DEFAULT 'homepage',   -- homepage, city, search
  starts_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHASE 3 — ADMIN / CMS TABLES
-- ============================================================

-- ── 21. BLOG CATEGORIES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  post_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 22. BLOG POSTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  content         TEXT NOT NULL,
  featured_image  TEXT,
  category_id     UUID REFERENCES blog_categories(id),
  author_id       UUID NOT NULL REFERENCES profiles(id),
  tags            TEXT[] DEFAULT '{}',
  is_published    BOOLEAN DEFAULT FALSE,
  is_featured     BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  read_time_mins  INT,
  views           INT DEFAULT 0,
  seo_title       TEXT,
  seo_description TEXT,
  schema_markup   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 23. CMS PAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_pages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  content         JSONB,             -- structured content blocks
  seo_title       TEXT,
  seo_description TEXT,
  is_published    BOOLEAN DEFAULT TRUE,
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 24. BANNERS / HOMEPAGE CONTENT ────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  cta_text    TEXT,
  cta_url     TEXT,
  position    TEXT DEFAULT 'hero',   -- hero, sidebar, popup, footer
  is_active   BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 25. TESTIMONIALS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  designation TEXT,
  company     TEXT,
  photo_url   TEXT,
  content     TEXT NOT NULL,
  rating      SMALLINT DEFAULT 5,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 26. SUPPORT TICKETS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE DEFAULT 'TKT-' || SUBSTRING(uuid_generate_v4()::TEXT, 1, 8),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  assigned_to   UUID REFERENCES profiles(id),
  type          ticket_type DEFAULT 'general',
  priority      ticket_priority DEFAULT 'medium',
  status        ticket_status DEFAULT 'open',
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL,
  resolved_at   TIMESTAMPTZ,
  sla_due_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 27. TICKET MESSAGES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  attachments TEXT[],
  is_internal BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 28. AUDIT LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,           -- property.approve, user.suspend, cms.update, etc.
  entity_type TEXT NOT NULL,           -- property, user, blog_post, etc.
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 29. FEATURE FLAGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled  BOOLEAN DEFAULT FALSE,
  roles       user_role[],            -- NULL = all roles
  updated_by  UUID REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 30. SEO REDIRECTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_redirects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_path   TEXT NOT NULL UNIQUE,
  to_path     TEXT NOT NULL,
  type        SMALLINT DEFAULT 301,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 31. NEWSLETTER SUBSCRIBERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  is_confirmed    BOOLEAN DEFAULT FALSE,
  confirm_token   TEXT,
  subscribed_at   TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  preferences     TEXT[] DEFAULT '{market_updates, new_listings}'
);

-- ── 32. CONTACT FORM SUBMISSIONS ──────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  subject     TEXT,
  message     TEXT NOT NULL,
  property_type TEXT,
  budget      TEXT,
  location    TEXT,
  source_page TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — performance for common queries
-- ============================================================

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_city         ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status       ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_type         ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_price        ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_featured     ON properties(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_properties_agent        ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_developer    ON properties(developer_id);
CREATE INDEX IF NOT EXISTS idx_properties_created      ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_slug         ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_search       ON properties USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_property    ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent       ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created     ON leads(created_at DESC);

-- Saved properties
CREATE INDEX IF NOT EXISTS idx_saved_user        ON saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_property    ON saved_properties(property_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, status) WHERE status = 'unread';

-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_published    ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_category     ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_slug         ON blog_posts(slug);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_logs(created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles(role);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — data isolation per user
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties     ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views       ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_sessions     ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own profile
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Admins can see all profiles
CREATE POLICY "profiles_admin" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Properties: active properties visible to everyone
CREATE POLICY "properties_public_read" ON properties
  FOR SELECT USING (status = 'active' AND approval_status = 'approved');

-- Owners can manage their own properties
CREATE POLICY "properties_owner" ON properties
  FOR ALL USING (owner_id = auth.uid() OR agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  ));

-- Saved properties: users manage their own
CREATE POLICY "saved_own" ON saved_properties
  FOR ALL USING (user_id = auth.uid());

-- Leads: agents see their own leads
CREATE POLICY "leads_agent" ON leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR buyer_id = auth.uid()
  );

-- Notifications: users see their own
CREATE POLICY "notif_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Appointments: buyer or agent can see
CREATE POLICY "appointments_own" ON appointments
  FOR ALL USING (
    buyer_id = auth.uid()
    OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Subscriptions: own only
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Transactions: own only
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (user_id = auth.uid());

-- Support tickets: own only (or admin)
CREATE POLICY "tickets_own" ON support_tickets
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'support'))
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated        BEFORE UPDATE ON profiles        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_properties_updated      BEFORE UPDATE ON properties      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_updated          BEFORE UPDATE ON agents          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agencies_updated        BEFORE UPDATE ON agencies        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated           BEFORE UPDATE ON leads           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated    BEFORE UPDATE ON appointments    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated   BEFORE UPDATE ON subscriptions   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_blog_posts_updated      BEFORE UPDATE ON blog_posts      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment property view count
CREATE OR REPLACE FUNCTION increment_property_views(prop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE properties SET views = views + 1 WHERE id = prop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update neighbourhood listing count
CREATE OR REPLACE FUNCTION update_listing_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE cities SET listing_count = listing_count + 1 WHERE id = NEW.city_id;
    UPDATE neighbourhoods SET listing_count = listing_count + 1 WHERE id = NEW.neighbourhood_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE cities SET listing_count = listing_count + 1 WHERE id = NEW.city_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE cities SET listing_count = GREATEST(listing_count - 1, 0) WHERE id = NEW.city_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_property_listing_count
  AFTER INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_listing_counts();

-- ============================================================
-- SEED DATA — feature flags
-- ============================================================
INSERT INTO feature_flags (key, description, is_enabled) VALUES
  ('ai_property_match',     'AI-powered property matching score',        FALSE),
  ('virtual_tour',          '360° virtual tour embedding',               TRUE),
  ('whatsapp_automation',   'Automated WhatsApp enquiry responses',      FALSE),
  ('investment_calculator', 'ROI and rental yield calculator',           TRUE),
  ('property_valuation',    'AI property valuation tool',                FALSE),
  ('compare_properties',    'Side-by-side property comparison',          TRUE),
  ('nri_portal',            'NRI-specific buyer portal features',        FALSE),
  ('blog_comments',         'Comment section on blog articles',          FALSE);

-- ============================================================
-- SEED DATA — blog categories
-- ============================================================
INSERT INTO blog_categories (name, slug, description) VALUES
  ('Buying Guides',        'buying-guides',        'Step-by-step guides for property buyers'),
  ('Renting Tips',         'renting-tips',         'Advice for tenants and landlords'),
  ('Investment Insights',  'investment-insights',  'ROI, yield, and market analysis'),
  ('Market Trends',        'market-trends',        'Property market data and forecasts'),
  ('Neighbourhood Guides', 'neighbourhood-guides', 'Area-by-area breakdowns across India'),
  ('Legal & Finance',      'legal-finance',        'RERA, loans, taxes, and legalities'),
  ('NRI Corner',           'nri-corner',           'Property investment guides for NRIs'),
  ('Commercial Real Estate','commercial',           'Office, retail, and industrial insights');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
