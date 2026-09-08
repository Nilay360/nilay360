-- ═══════════════════════════════════════════════════════════════
-- 038 — TEMPORARY diagnostic RPC, debug_check_create_policy() —
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- migration tonight: this file has not been run against the
-- database.
--
-- THIS IS NOT A PERMANENT FEATURE. 037's debug_whoami() confirmed
-- auth.uid() resolves correctly (47f4b62d-...) during the real
-- request, yet the conversations INSERT policy's WITH CHECK still
-- rejects it (42501). Every individual fact checked out in isolation
-- — this function stops inferring from separate pieces and instead
-- evaluates the policy's EXACT boolean expression, verbatim, in one
-- shot: the identical EXISTS(...) block from the conversations
-- INSERT policy's WITH CHECK, taking created_by as a parameter so it
-- can be called with the exact value actually being sent.
--
-- SECURITY INVOKER (not DEFINER) is deliberate, same reasoning as
-- 037: this must run as the calling role under the same RLS
-- constraints the real policy evaluates under, not bypass them.
--
-- DROP THIS FUNCTION once the messaging bug is resolved — it has no
-- reason to exist in the schema afterward. Do not leave it live as a
-- permanent feature.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_check_create_policy(check_created_by uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = check_created_by
      AND ap.user_id = auth.uid()
      AND ap.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.debug_check_create_policy(uuid) TO authenticated;
