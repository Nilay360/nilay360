-- ═══════════════════════════════════════════════════════════════
-- 039 — Drop temporary diagnostic RPCs — DRAFTED FOR REVIEW, NOT
-- APPLIED. Same review discipline as every migration tonight: this
-- file has not been run against the database.
--
-- debug_whoami() (037) and debug_check_create_policy() (038) were
-- created solely to diagnose the "new row violates row-level security
-- policy for table conversations" (42501) investigation. Root cause
-- found and fixed in application code (handleCreate now generates the
-- conversation id client-side and skips .select().single() on the
-- insert, avoiding the INSERT...RETURNING re-read that was silently
-- failing against the conversations SELECT policy). Neither function
-- has any further reason to exist — apply this only once that fix is
-- confirmed working live.
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.debug_check_create_policy(uuid);
DROP FUNCTION IF EXISTS public.debug_whoami();
