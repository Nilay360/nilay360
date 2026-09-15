-- ═══════════════════════════════════════════════════════════════
-- 067 — Unpublish reason + listing_status_history (item #7)
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- CONFIRMED BEFORE DRAFTING:
--   * admin/page.tsx's existing "Unpublish" action (handleListingStatus,
--     onUnpublish) is a plain window.confirm() with no reason captured
--     at all — this migration adds the storage for that reason; the UI
--     rewire (dropdown + note field replacing window.confirm, plus
--     agent-facing access) is a separate, later change, not part of
--     this file.
--   * deals.property_id (030_deals_table.sql) already links a deal to a
--     property_listings row, and deal_stage already has a 'closed'
--     value — so "deal closed -> unpublish" has a real FK path to hang
--     off of, confirmed live rather than assumed.
--   * property_listings.user_id and .assigned_agent_id — re-verified
--     directly against real application code before drafting this
--     (not carried over from other migrations' comments by assumption):
--     user_id is set at insert by post-property/page.tsx:1730
--     (`user_id: authUserId`) and filtered on by my-listings/page.tsx's
--     own listings query; assigned_agent_id has a literal
--     `ALTER TABLE property_listings ADD COLUMN ... assigned_agent_id`
--     in 011_agent_portal_schema.sql. Both names are also load-bearing
--     inside 062's and 066's already-applied RLS policies — a
--     CREATE POLICY referencing a nonexistent column fails outright at
--     apply time, so their successful application independently
--     confirms these column names.
--
-- WRITE MECHANISM — SECURITY DEFINER FUNCTION, NOT A SERVICE-ROLE ROUTE:
-- Two other write patterns exist elsewhere in this schema tonight:
--   (a) capture_360_requests (062) — a direct authenticated-session
--       INSERT, permitted by a real ownership-scoped RLS INSERT policy,
--       because the writer is inserting a row about their own action.
--   (b) property_view_events / property_image_clicks (066) — a
--       service-role Next.js API route, because those tables must
--       accept writes from anonymous visitors with no session identity
--       to scope an RLS policy against at all.
-- listing_status_history matches neither: there is always a real,
-- identifiable signed-in actor (admin today, owner/agent per the
-- planned follow-up), and the whole point of a status-history log is
-- that it must be append-only and never editable, even by admins
-- acting outside the intended path. That is exactly the shape of
-- admin_audit_log / log_admin_action (013_admin_audit_log.sql): a
-- SECURITY DEFINER function is the only writer, actor identity is
-- stamped server-side from auth.uid() (never trusted from the client),
-- and the table itself carries no direct INSERT/UPDATE/DELETE policy
-- for any role.
--
-- ATOMICITY: the status UPDATE and the history INSERT both happen
-- inside log_listing_status_change() — one function call, one
-- transaction — rather than the client making two separate calls that
-- could partially fail (a dropped connection between them would
-- otherwise leave status changed with no history row, or vice versa).
-- old_status is derived server-side via `SELECT ... FOR UPDATE` rather
-- than trusted from a client-supplied parameter, for the same reason
-- log_admin_action() stamps actor_id from auth.uid() instead of trusting
-- the client: a client-supplied old_status could be stale or wrong.
--
-- HISTORY SURVIVES LISTING DELETION — RECONSIDERED FROM THE ORIGINAL
-- "ON DELETE CASCADE" PLAN: my-listings/page.tsx:104 has a real, live
-- hard-delete path (`supabase.from("property_listings").delete()`, the
-- seller's own Delete button). A CASCADE here would destroy a listing's
-- entire status/reason history — including a 'deal_closed' unpublish
-- record — the moment a seller deletes it, which defeats the purpose of
-- an audit trail. listing_status_history.property_id is therefore a
-- bare uuid with NO foreign key and no cascade, matching
-- admin_audit_log.entity_id's actual shape exactly: history is fully
-- decoupled from the listing's lifecycle and cannot be destroyed by
-- deleting the listing. Tradeoff, stated plainly: the owner/assigned-
-- agent SELECT policy below can no longer prove ownership once the
-- listing row is gone, so a deleted listing's history becomes
-- admin-only rather than lost outright (public.is_admin() short-
-- circuits independently of the ownership EXISTS check).
--
-- CHECK CONSTRAINT PARITY: property_listings.unpublish_reason and
-- listing_status_history.reason use the byte-for-byte identical value
-- list ('deal_closed', 'expired', 'owner_requested', 'admin_review',
-- 'other') so a join or comparison between "why is this listing
-- currently unpublished" and "what reason was logged for this status
-- change" can never diverge into two different vocabularies.
--
-- unpublish_reason/unpublish_note ON property_listings represent "the
-- reason for the CURRENT status," not specifically "the reason it was
-- last unpublished" — log_listing_status_change() always overwrites
-- both (to NULL, for a plain approve/reject with no reason given), so a
-- stale unpublish reason can never linger on a listing after it goes
-- active again.
--
-- p_new_status VALIDATION: property_listings.status itself has NO CHECK
-- constraint at the table level (confirmed via 051_grievance_queue_
-- extension.sql's own comment: "property_listings.status is plain TEXT
-- with no CHECK constraint") — so nothing in the database stops a typo
-- or a bad client value from being written. The real, live status
-- vocabulary was independently confirmed by reading application code,
-- not assumed: 'pending_review'/'active'/'rejected' via
-- handleListingStatus, plus a fourth value, 'frozen', via admin/
-- page.tsx's separate report-freeze workflow
-- (handleReportFreezeListing sets status:'frozen', reversed back to
-- 'active' on unfreeze). The function validates p_new_status against
-- exactly this set before doing anything else.
--
-- SECOND AUTHORIZATION LAYER — WHICH STATUS, NOT JUST WHICH LISTING:
-- the ownership/admin check above only proves the caller may act on
-- THIS listing at all; it says nothing about which new_status they're
-- allowed to set. Without a second check, an owner/assigned agent could
-- call this function with p_new_status = 'active' on their own listing
-- the moment it's wired up for agent-facing access — self-approving a
-- listing, or self-clearing a 'frozen' report-moderation state, neither
-- of which should ever be self-service. So a non-admin caller is
-- restricted to p_new_status = 'pending_review' only (unpublish is the
-- sole self-service transition); admins remain unrestricted across all
-- four values.
-- ═══════════════════════════════════════════════════════════════

-- ── property_listings: unpublish reason/note + optional expiry ──
-- All nullable, no default, no backfill — every existing row is
-- unaffected until an actual unpublish/status change sets these.
ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS unpublish_reason text
    CHECK (unpublish_reason IN ('deal_closed', 'expired', 'owner_requested', 'admin_review', 'other')),
  ADD COLUMN IF NOT EXISTS unpublish_note text,
  ADD COLUMN IF NOT EXISTS listing_expires_at timestamptz;

-- ── listing_status_history ────────────────────────────────────
-- property_id is deliberately NOT a foreign key — see the header
-- comment above (history must survive a listing's hard deletion).
CREATE TABLE IF NOT EXISTS public.listing_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL,
  old_status   text,
  new_status   text NOT NULL,
  reason       text
    CHECK (reason IN ('deal_closed', 'expired', 'owner_requested', 'admin_review', 'other')),
  note         text,
  changed_by   uuid REFERENCES public.profiles(id),
  changed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_status_history_property_id ON public.listing_status_history(property_id);

ALTER TABLE public.listing_status_history ENABLE ROW LEVEL SECURITY;

-- SELECT: admin (always, regardless of whether the listing still
-- exists), or the listing's own owner/approved assigned agent while the
-- listing row still exists to prove that relationship against — same
-- "owner or assigned agent" shape as 062/066.
DROP POLICY IF EXISTS "Owner, assigned agent, or admin can view listing status history" ON public.listing_status_history;
CREATE POLICY "Owner, assigned agent, or admin can view listing status history"
  ON public.listing_status_history FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = listing_status_history.property_id
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

-- No direct INSERT/UPDATE/DELETE policy for any role — append-only,
-- same posture as admin_audit_log. The function below is the only
-- writer; even an admin cannot quietly edit or backfill history by
-- writing to this table directly.
CREATE OR REPLACE FUNCTION public.log_listing_status_change(
  p_property_id uuid,
  p_new_status  text,
  p_reason      text DEFAULT NULL,
  p_note        text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_is_admin   boolean;
BEGIN
  v_is_admin := public.is_admin();

  IF NOT (
    v_is_admin
    OR EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.id = p_property_id
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
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_new_status NOT IN ('pending_review', 'active', 'rejected', 'frozen') THEN
    RAISE EXCEPTION 'invalid new_status: %', p_new_status;
  END IF;

  -- Second authorization layer: passing the check above only proves the
  -- caller may act on THIS listing at all — it says nothing about which
  -- new_status they're allowed to set. A non-admin caller (owner or
  -- assigned agent) is restricted to 'pending_review' only, i.e.
  -- unpublish is the sole self-service transition; approving, rejecting,
  -- and freezing stay admin-only even once this function is wired up
  -- for agent-facing access.
  IF NOT v_is_admin AND p_new_status <> 'pending_review' THEN
    RAISE EXCEPTION 'not authorized for this status transition';
  END IF;

  -- FOR UPDATE locks the row for the rest of this transaction, so a
  -- concurrent call for the same property can't read the same
  -- old_status and race this one.
  SELECT status INTO v_old_status FROM public.property_listings WHERE id = p_property_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found';
  END IF;

  UPDATE public.property_listings
  SET status = p_new_status,
      unpublish_reason = p_reason,
      unpublish_note = p_note,
      updated_at = now()
  WHERE id = p_property_id;

  INSERT INTO public.listing_status_history (property_id, old_status, new_status, reason, note, changed_by)
  VALUES (p_property_id, v_old_status, p_new_status, p_reason, p_note, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.log_listing_status_change(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_listing_status_change(uuid, text, text, text) TO authenticated;
