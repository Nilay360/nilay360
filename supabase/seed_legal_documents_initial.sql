-- ═══════════════════════════════════════════════════════════════
-- Seed: initial legal_documents rows for 'terms' and 'privacy'
--
-- This is seed data, not a schema change — deliberately NOT a
-- numbered migration file (050, 051, ...), since it's a one-time
-- data insert rather than a repeatable structural change. Run once,
-- manually, after migration 050 is applied.
--
-- content_hash: 'not-yet-computed' is a deliberate, honest
-- placeholder — NOT a real sha256 fingerprint. Migration 050's own
-- header comment is explicit that computing and checking the hash
-- is "a separate, not-yet-built process (out of scope here)." Since
-- no automated hashing process exists yet, storing a fake-looking
-- hash string here would be worse than storing nothing: it would
-- look like drift-detection is live and working when it isn't. This
-- placeholder makes that gap impossible to miss. Replace it with a
-- real sha256 of each page's rendered text once that process exists
-- — until then, the drift-detection feature content_hash exists to
-- support is effectively inert for these two rows.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.legal_documents
  (document_type, version, content_hash, published_at, published_by, is_current)
VALUES
  ('terms',   1, 'not-yet-computed', now(), null, true),
  ('privacy', 1, 'not-yet-computed', now(), null, true);
