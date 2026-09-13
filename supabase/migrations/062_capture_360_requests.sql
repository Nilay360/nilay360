-- ═══════════════════════════════════════════════════════════════
-- 062 — capture_360_requests: 360° photography capture request workflow
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- CONFIRMED GENUINELY NEW, via fresh investigation (2026-09-12) before
-- drafting this — not a rename/reuse of either existing 360°-adjacent
-- field:
--
--   * property_listings.kuula_tour_url (018_kuula_tour_url.sql) — the
--     FINISHED tour link, set by an admin after a capture has already
--     happened and been uploaded to Kuula. Purely a display field, no
--     request/scheduling concept at all. Unrelated to this table, which
--     is the workflow that precedes and eventually produces that link.
--
--   * site_visits (006_site_visits.sql) — structurally the closest
--     precedent (request -> status -> admin action -> resolution), and
--     deliberately used as this table's shape template, but a genuinely
--     different CONCEPT: a prospective buyer requesting to visit a
--     property in person. Different actor (buyer vs. seller/agent),
--     different payload (visitor contact info vs. nothing extra needed
--     — the requester is already an authenticated platform user, not an
--     anonymous visitor), different resolution (a visit happens vs. a
--     photographer capture happens and a kuula_tour_url eventually gets
--     set). One concept, one table — this is not folded into
--     site_visits.
--
-- LIFECYCLE: pending (just requested) -> scheduled (admin accepted,
-- picked a date/time) -> completed (capture done) -> declined (admin
-- chose not to do it, e.g. via admin_notes explaining why). No
-- "cancelled by requester" state — per spec, only admin ever updates
-- status; a requester cannot withdraw their own request by writing to
-- this table (they'd need to contact an admin, same as site_visits has
-- no requester-side cancellation path either).
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.capture_360_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  requester_id        uuid NOT NULL REFERENCES public.profiles(id),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'scheduled', 'completed', 'declined')),
  scheduled_date      date,
  scheduled_time_slot text,
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_360_requests_property_id  ON public.capture_360_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_capture_360_requests_requester_id ON public.capture_360_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_capture_360_requests_status       ON public.capture_360_requests(status);

ALTER TABLE public.capture_360_requests ENABLE ROW LEVEL SECURITY;

-- ── INSERT: requester must both claim their own identity AND actually
-- own/be assigned to the property they're requesting capture for ──
--
-- A bare `requester_id = auth.uid()` check alone would only confirm the
-- row is honestly attributed to whoever is inserting it — it would NOT
-- stop any authenticated user from filing a capture request against a
-- property_id they have no connection to at all (any signed-in buyer
-- could spam capture requests for listings that aren't theirs). Given
-- this is meant to be a seller/agent action on their own listing, the
-- check needs to verify actual ownership of property_id too — same
-- pattern already established for property_listings itself
-- (026_property_listings_assigned_agent_rls.sql's
-- "agent_can_view_assigned_listings", 033's "Assigned agent can update
-- own properties"): the requester is either the listing's owner
-- (property_listings.user_id) or the approved agent it's assigned to
-- (via agent_profiles.user_id, matching property_listings.
-- assigned_agent_id).
DROP POLICY IF EXISTS "Owner or assigned agent can request capture" ON public.capture_360_requests;
CREATE POLICY "Owner or assigned agent can request capture"
  ON public.capture_360_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = capture_360_requests.property_id
        AND (
          pl.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.agent_profiles ap
            WHERE ap.id = pl.assigned_agent_id
              AND ap.user_id = auth.uid()
              AND ap.status = 'approved'
          )
        )
    )
  );

-- ── SELECT: the requester's own requests, or any admin ──
DROP POLICY IF EXISTS "Requester or admin can view capture requests" ON public.capture_360_requests;
CREATE POLICY "Requester or admin can view capture requests"
  ON public.capture_360_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR public.is_admin()
  );

-- ── UPDATE: admin only ──
-- Accepting/scheduling/declining is exclusively an admin action per
-- spec — unlike site_visits (where the seller can also confirm/cancel
-- their own listing's visit requests), a requester here never updates
-- their own request's status. This is a deliberate, narrower policy
-- than the site_visits precedent, not an oversight.
DROP POLICY IF EXISTS "Admin can update capture requests" ON public.capture_360_requests;
CREATE POLICY "Admin can update capture requests"
  ON public.capture_360_requests FOR UPDATE
  USING (public.is_admin());
