-- ═══════════════════════════════════════════════════════════════
-- 037 — TEMPORARY diagnostic RPC, debug_whoami() — DRAFTED FOR
-- REVIEW, NOT APPLIED. Same review discipline as every migration
-- tonight: this file has not been run against the database.
--
-- THIS IS NOT A PERMANENT FEATURE. It exists solely to answer one
-- question during the ongoing "new row violates row-level security
-- policy for table conversations" (42501) investigation: what does
-- Postgres itself see as auth.uid() during a real authenticated
-- request from the app, as opposed to what the client believes its
-- own session is. Every diagnostic so far (client-side getSession(),
-- reads against agent_profiles and conversation_participants) can
-- only prove a request was ACCEPTED — RLS makes a SELECT fail
-- silently (empty result) rather than erroring when auth.uid()
-- doesn't match, so none of those reads can distinguish "correctly
-- authenticated, genuinely no matching data" from "wrong/null user
-- id, nothing could ever have matched." Asking Postgres directly, in
-- the same request, is the one check that can't produce that same
-- false signal.
--
-- SECURITY INVOKER (not DEFINER) is deliberate: this must run as the
-- calling role, exactly like every other RLS-gated request in this
-- app, so auth.uid() resolves the same way it would inside the
-- conversations INSERT policy itself.
--
-- DROP THIS FUNCTION once the messaging bug is resolved — it has no
-- reason to exist in the schema afterward. Do not leave it live as a
-- permanent feature.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_whoami()
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.debug_whoami() TO authenticated;
