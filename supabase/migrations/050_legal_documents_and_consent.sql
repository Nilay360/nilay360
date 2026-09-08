-- ═══════════════════════════════════════════════════════════════
-- 050 — Legal document versioning + consent audit trail
--
-- ARCHITECTURE DECISION (confirmed with Vanith): the six legal-brief
-- routes (terms, privacy, cookies, refund_policy, agent_terms,
-- grievance_redressal) stay as static Next.js pages — no CMS, no
-- DB-rendered content. This migration does NOT store legal text.
-- It tracks *version metadata alongside* the static pages: which
-- version of which document is currently live, when it was
-- published, and — separately — who agreed to what, when, and under
-- what version. Two concerns, two tables, intentionally decoupled
-- from page content itself.
--
-- Why this is lower-risk than a CMS-backed legal-docs system: the
-- pages a lawyer reviews and signs off on are the exact bytes that
-- ship in the deployed bundle, not a row a non-technical admin could
-- edit live without review. The trade-off is that "publishing a new
-- version" is a two-step manual process (ship the page change, then
-- record the new version here) rather than one atomic action — which
-- is exactly why content_hash exists below: to catch the failure
-- mode where step one happens without step two.
--
-- content_hash IS NOT full-text storage or a page-content backup. It
-- is a sha256 of the live page's rendered text, computed at publish
-- time and stored purely as a fingerprint. It is a DRIFT DETECTOR:
-- if a future automated check re-hashes the live page and gets a
-- value that doesn't match the is_current row's content_hash, that
-- means the page text changed without anyone bumping `version` —
-- i.e. a legal document changed without being recorded as a new
-- version, which is exactly the kind of silent-drift compliance gap
-- this whole sweep has been about closing. This migration only adds
-- the column and the row; computing and checking the hash is a
-- separate, not-yet-built process (out of scope here).
--
-- consent_events is the append-only audit trail: a permanent record
-- of "user X agreed to document Y version Z, in context W, at time
-- T" — same durable, never-mutated pattern already used by
-- `deals`, `documents`, and `call_logs` elsewhere in this schema.
--
-- READ-ONLY FINDING that shaped consent_events.user_id below (see
-- conversation for full trace): profiles.id is seeded by a SECURITY
-- DEFINER trigger (on_auth_user_created, migration 007) that fires
-- synchronously on every INSERT into auth.users — for BOTH phone-OTP
-- signups (verify-otp/route.ts calls auth.admin.createUser(), which
-- fires the trigger, before the route's own profile upsert or the
-- session-minting step ever run) and Google OAuth signups. In this
-- codebase, a profiles row is therefore guaranteed to exist before
-- any consent-capture UI step could realistically run. Confirmed
-- with Vanith: user_id is NOT NULL below — the nullable scenario
-- this column was originally hedging against does not occur
-- anywhere in the real signup flow, and an audit trail needs real
-- attribution (who agreed, provably) to be worth keeping at all.
-- ═══════════════════════════════════════════════════════════════

-- ─── legal_documents ──────────────────────────────────────────────
-- One row per published version of a legal document. Old versions
-- are never deleted — only is_current flips to false. The static
-- page itself is the source of truth for content; this table is
-- purely "what version is live, and since when."

CREATE TABLE public.legal_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN (
    'terms', 'privacy', 'cookies', 'refund_policy',
    'agent_terms', 'grievance_redressal'
  )),
  version       integer NOT NULL CHECK (version > 0),
  content_hash  text NOT NULL,
  published_at  timestamptz NOT NULL DEFAULT now(),
  published_by  uuid REFERENCES public.profiles(id),
  is_current    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Lets consent_events reference an exact (type, version) pair with
  -- real FK integrity, not just a bare integer that could point to a
  -- version that was never actually published.
  UNIQUE (document_type, version)
);

-- Only one is_current=true row per document_type at any time. A
-- partial unique index (not a table constraint) because the
-- uniqueness only applies when is_current is true — old, superseded
-- versions coexist with is_current=false and must NOT collide with
-- this rule.
CREATE UNIQUE INDEX legal_documents_one_current_per_type
  ON public.legal_documents (document_type)
  WHERE is_current;

CREATE INDEX legal_documents_type_current_idx
  ON public.legal_documents (document_type, is_current);

COMMENT ON TABLE public.legal_documents IS
  'Version metadata for the six static legal-brief pages. Does not store document content — the live Next.js page is the source of truth. content_hash is a drift-detection fingerprint, not a content backup.';
COMMENT ON COLUMN public.legal_documents.content_hash IS
  'sha256 of the published page''s rendered text, captured at publish time. A future automated check re-hashing the live page and finding a mismatch against the is_current row signals the page changed without a version bump.';

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: public. Anyone — including anonymous visitors — should be
-- able to see which version of a legal document is current and when
-- it was published (this is metadata about a public legal page, not
-- sensitive data).
CREATE POLICY "legal_documents_public_select"
  ON public.legal_documents FOR SELECT
  USING (true);

-- INSERT: admin only. Publishing a new version is a deliberate,
-- reviewed action, not something any authenticated user can trigger.
CREATE POLICY "legal_documents_admin_insert"
  ON public.legal_documents FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: admin only. In practice this is used to flip is_current
-- (old version → false, new version → true) as two updates, or to
-- correct a mis-recorded content_hash. Not used to rewrite history —
-- published_at/version/document_type of a past version shouldn't
-- change in normal operation, but RLS can't enforce "which columns"
-- without a trigger, so this relies on admin discipline plus the
-- admin_audit_log (see below) for accountability.
CREATE POLICY "legal_documents_admin_update"
  ON public.legal_documents FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No DELETE policy of any kind, for anyone, including admins. Old
-- versions are permanent history — deletion would defeat the point
-- of keeping a version trail at all. If a row is ever wrong, correct
-- it via UPDATE and let the audit log show the correction.

-- ─── consent_events ───────────────────────────────────────────────
-- Append-only record of a real person agreeing to a specific version
-- of a specific document, in a specific context. Never updated or
-- deleted once written — same permanent-record pattern as `deals`,
-- `documents`, and `call_logs`.

CREATE TABLE public.consent_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOT NULL: every consent event must be attributable to a real
  -- user. See header comment for the read-only finding that a
  -- profiles row already exists before any consent step can run in
  -- this codebase's actual signup flows — so there's no legitimate
  -- case for an unattributed row here.
  user_id           uuid NOT NULL REFERENCES public.profiles(id),
  document_type     text NOT NULL,
  document_version  integer NOT NULL,
  context           text NOT NULL,
  ip_address        text,
  user_agent        text,
  consented_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Real referential integrity: a consent row must point to a
  -- version that was genuinely published, not an arbitrary integer.
  FOREIGN KEY (document_type, document_version)
    REFERENCES public.legal_documents (document_type, version)
);

CREATE INDEX consent_events_user_idx ON public.consent_events (user_id);
CREATE INDEX consent_events_document_idx ON public.consent_events (document_type, document_version);

COMMENT ON TABLE public.consent_events IS
  'Append-only audit trail: who agreed to which document version, in what context, when. Never updated or deleted after insert.';
COMMENT ON COLUMN public.consent_events.user_id IS
  'NOT NULL: every row must be attributable to a real user. Read-only trace (see migration header) confirmed the profiles row is seeded synchronously via the on_auth_user_created trigger before any consent step could run in this codebase''s current signup flows (phone-OTP and Google OAuth both hit that trigger), so there is no legitimate pre-profile consent scenario to accommodate.';

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

-- INSERT: a user may only record consent as themselves. No NULL
-- branch — user_id is NOT NULL (see column comment), so every row
-- is provably attributable to the authenticated caller, matching
-- how call_logs/documents/deals already work.
CREATE POLICY "consent_events_insert_own"
  ON public.consent_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- SELECT: admin only, per spec. (Not granting users read access to
-- their own consent history here — if "show me what I agreed to" in
-- account settings is wanted later, that's an additive policy, not a
-- change to this one.)
CREATE POLICY "consent_events_admin_select"
  ON public.consent_events FOR SELECT
  USING (public.is_admin());

-- No UPDATE policy, no DELETE policy, for anyone, including admins.
-- This table is append-only by construction — RLS enforces that no
-- row, once written, can ever be changed or removed by any role.
