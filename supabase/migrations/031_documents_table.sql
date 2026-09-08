-- ═══════════════════════════════════════════════════════════════
-- 031 — Documents table (KYC / agent & deal document storage) —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as 029/030:
-- this file has not been run against the database. Do not apply until
-- reviewed line by line.
--
-- Confirmed live before drafting (2026-08-31): no genuine document/
-- file/attachment/upload table exists today. Real agent registration
-- (src/app/become-an-agent/page.tsx) writes only license_number/
-- agency_name/bio/years_experience to agent_profiles — no file upload
-- anywhere in that flow. A partial KYC design (kyc_status TEXT,
-- kyc_documents JSONB — intended shape {aadhaar, pan, rera_cert} per
-- its own comment) does exist in 001_nivila_schema.sql /
-- 010_agents_baseline_documented.sql, but on the dead `agents` table,
-- never wired to any live UI, and never present on the real canonical
-- `agent_profiles` table at all. This migration starts fresh against
-- agent_profiles rather than resuming that abandoned, wrong-table work.
--
-- Deliberate RLS asymmetry, called out explicitly rather than silently
-- copied from 030's pattern: the "agent's own docs" SELECT/INSERT
-- clause below does NOT check agent_profiles.status = 'approved',
-- unlike every other assigned-agent policy written tonight (024, 026,
-- 029, 030). Reasoning: KYC documents are frequently submitted *as
-- part of* becoming approved — gating an agent's own KYC uploads
-- behind approval already granted would be circular (they could never
-- submit the documents needed to get approved in the first place). The
-- three linked-record clauses (property/inquiry/deal) DO require
-- status = 'approved', mirroring 030 exactly, since those represent an
-- already-operating approved agent attaching a document to something
-- they're actively working — a materially different situation from a
-- pending applicant uploading their own KYC.
-- ═══════════════════════════════════════════════════════════════

-- 1. documents table.
CREATE TABLE documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id  uuid REFERENCES agent_profiles(id) ON DELETE CASCADE,
  property_id       uuid REFERENCES property_listings(id) ON DELETE SET NULL,
  inquiry_id        uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  deal_id           uuid REFERENCES deals(id) ON DELETE SET NULL,
  document_type     text NOT NULL,
  file_url          text NOT NULL,
  file_name         text,
  mime_type         text,
  uploaded_by       uuid NOT NULL REFERENCES profiles(id),
  notes             text,
  created_at        timestamptz DEFAULT now(),

  -- A document must belong to something — at least one of the four
  -- possible owners/attachments must be set.
  CONSTRAINT documents_must_have_an_owner
    CHECK (
      agent_profile_id IS NOT NULL
      OR property_id IS NOT NULL
      OR inquiry_id IS NOT NULL
      OR deal_id IS NOT NULL
    )
);

CREATE INDEX idx_documents_agent_profile_id ON documents(agent_profile_id);
CREATE INDEX idx_documents_property_id      ON documents(property_id);
CREATE INDEX idx_documents_inquiry_id       ON documents(inquiry_id);
CREATE INDEX idx_documents_deal_id          ON documents(deal_id);
CREATE INDEX idx_documents_uploaded_by      ON documents(uploaded_by);

-- Enable RLS explicitly.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- SELECT: an agent's own documents (no approval gate — see header),
-- OR an approved agent viewing a document attached to a property/
-- inquiry/deal they're assigned to (mirrors 030's pattern per link
-- type), OR is_admin() (SECURITY DEFINER, reused from
-- 008_admin_profiles_rls.sql, not redefined).
DROP POLICY IF EXISTS "Own docs or assigned agent or admin can view documents" ON documents;
CREATE POLICY "Own docs or assigned agent or admin can view documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = documents.agent_profile_id
        AND ap.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM property_listings pl
      JOIN agent_profiles ap ON ap.id = pl.assigned_agent_id
      WHERE pl.id = documents.property_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = documents.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM deals d
      JOIN agent_profiles ap ON ap.id = d.assigned_to
      WHERE d.id = documents.deal_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: identical structure as SELECT, as WITH CHECK against the row
-- being inserted.
DROP POLICY IF EXISTS "Own docs or assigned agent or admin can insert documents" ON documents;
CREATE POLICY "Own docs or assigned agent or admin can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = documents.agent_profile_id
        AND ap.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM property_listings pl
      JOIN agent_profiles ap ON ap.id = pl.assigned_agent_id
      WHERE pl.id = documents.property_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.id = documents.inquiry_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM deals d
      JOIN agent_profiles ap ON ap.id = d.assigned_to
      WHERE d.id = documents.deal_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- UPDATE: only the uploader may edit their own document's notes/
-- metadata, or an admin. Deliberately narrower than SELECT/INSERT —
-- being able to view or attach a document to something you're
-- assigned to doesn't mean you should be able to edit someone else's
-- upload.
DROP POLICY IF EXISTS "Uploader or admin can update documents" ON documents;
CREATE POLICY "Uploader or admin can update documents"
  ON documents FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
  );

-- No DELETE policy at all — matches deals' permanent-record pattern
-- (030 also defines no DELETE policy). Documents, like deals, are kept
-- as a durable record rather than removable.
