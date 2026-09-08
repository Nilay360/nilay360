-- ═══════════════════════════════════════════════════════════════
-- 026 — Assigned agent can view the property tied to their own lead,
-- even if it's inactive/rejected/not theirs (Property Matching fix)
--
-- Root cause (2026-08-30): "Public can view active listings" (003_rls_
-- fixes.sql) gates property_listings SELECT with:
--   status = 'active' OR seller_email = auth.jwt() ->> 'email'
-- This policy was written for public visitors and is correct for that
-- audience, but it also silently blocked an approved agent from
-- reading the property referenced by their OWN assigned inquiry
-- whenever that listing is no longer active and isn't theirs — the
-- common case for older leads. Confirmed live: kalyan's inquiry
-- (1a01539b-...) references property 60cf8e70-... (status='rejected',
-- seller_email='vanith.hustlehive@gmail.com' — not ricky vanith's
-- email). Two visible symptoms, one root cause:
--   1. The Property Matching fallback query (src/app/agent/leads/[id]/
--      page.tsx findMatches()) reads this property first to get its
--      city/price/bedrooms as the similarity coordinates. Under RLS
--      it comes back null (silently denied, not an error), so the
--      code short-circuits to an empty result — even though real
--      similar active listings exist elsewhere.
--   2. The public /property/[slug] page hits the same policy, so
--      clicking through from the lead detail page to view the
--      original property gives "Property Not Found" even though the
--      row is real.
--
-- This is an agent-context need, not a security concern: an agent
-- legitimately needs to see what a customer originally inquired about
-- regardless of whether that listing later got rejected or the
-- assignment predates a status change. The fix is the same scoped
-- pattern already used for inquiries/inquiry_activities (024) — grant
-- SELECT only when the requester is the approved agent assigned to an
-- inquiry that references this exact property. Additive only: RLS
-- policies OR-combine, so this cannot narrow "Public can view active
-- listings" — it only adds a new case where a broader set of rows
-- becomes visible to the one agent who legitimately needs them.
--
-- STANDING LESSON — do not skip this next time: the initial "fix" for
-- the Property Matching fallback path was declared verified using the
-- service-role key, which bypasses RLS entirely. That proved the data
-- existed, not that the actual live page (running under the agent's
-- real, RLS-constrained session) could see it — and it couldn't. Any
-- future RLS-adjacent check in this codebase must be verified via the
-- anon key or the real role/session actually in effect on the page,
-- never the service-role key alone. See feedback memory
-- "RLS: Verify via Real Session, Not Service-Role" for the full
-- writeup (this is the second time this exact mistake happened in one
-- session).
--
-- TYPE FIX (2026-08-30): first version of this policy compared
-- `i.property_id = property_listings.id` directly and failed with
-- `operator does not exist: text = uuid`. Confirmed live via OpenAPI
-- introspection, not assumed: `inquiries.property_id` is TEXT (this
-- table has no CREATE TABLE migration anywhere in-repo — it was
-- created ad-hoc directly against Supabase, so `property_id` was never
-- actually constrained to uuid or given an FK), while
-- `property_listings.id` is a real UUID primary key. Same pattern as
-- `bedrooms`/`property_category` earlier tonight — the untyped/legacy
-- side is the one that needs casting, never assume which one.
--
-- Because `inquiries.property_id` has no CHECK constraint, no FK, and
-- no format validation, a bare `::uuid` cast is not safe: a future row
-- with a non-UUID-shaped value would make the cast throw at query
-- time, breaking this policy's USING clause for EVERY user's
-- property_listings SELECT, not just silently denying one row (all 8
-- real rows today are UUID-shaped, confirmed live, but nothing
-- guarantees that going forward). The regex guard below short-circuits
-- before casting, so a malformed property_id is treated as "doesn't
-- match" rather than a runtime error.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Assigned agent can view referenced property" ON property_listings;
CREATE POLICY "Assigned agent can view referenced property"
  ON property_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inquiries i
      JOIN agent_profiles ap ON ap.id = i.assigned_to
      WHERE i.property_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        AND i.property_id::uuid = property_listings.id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
  );
