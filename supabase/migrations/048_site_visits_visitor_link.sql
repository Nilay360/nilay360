-- ═══════════════════════════════════════════════════════════════
-- 048 — site_visits.visitor_user_id — DRAFTED FOR REVIEW, NOT
-- APPLIED. Same review discipline as every migration tonight: this
-- file has not been run against the database. Do not apply until
-- reviewed line by line.
--
-- Why this column exists: site_visits (006) was built as a public,
-- anonymous-capable booking form — it captures visitor_name/
-- visitor_phone as free text, with no link back to a logged-in user
-- at all. That's fine for the seller/agent side (seller_email,
-- assigned_to, inquiry_id all already exist), but it means there has
-- never been a real way to show a signed-in buyer "the site visits
-- I've booked" — the only candidate approach without this column
-- would be matching profiles.phone/email against visitor_phone as
-- free text, which is fragile (format/country-code inconsistency
-- between however the public form captured the number and however
-- profiles.phone was entered elsewhere) and was flagged, not
-- silently assumed workable, when this table's columns were
-- re-confirmed earlier tonight. This column replaces that fragile
-- text match with a real foreign key, enabling an honest "My
-- Appointments" feature for signed-in buyers.
--
-- Historical rows booked before this migration will have
-- visitor_user_id = NULL and will NOT appear in a buyer's "my
-- visits" view once that's built — stated plainly, not glossed over:
-- this is expected (there was never a user link captured for them),
-- not a bug to work around. Nothing back-fills or attempts to guess
-- past rows' owners via phone/email matching here.
--
-- Why no SECURITY DEFINER on the new policy: this is a plain
-- self-ownership check (visitor_user_id = auth.uid()) against the
-- same table the policy is defined on, reading no other table at
-- all — not the "policy on table T needs to check a different table
-- U, or T needs to check its own rows via a subquery" shape 036/040/
-- 041 had to work around. It's the same shape as call_logs' own
-- SELECT policy (046) tonight, and needs nothing more than that.
-- ═══════════════════════════════════════════════════════════════

-- 1. Column. Nullable — visits booked signed-out (the existing INSERT
-- policy, "Anyone can request a site visit", WITH CHECK (true), fully
-- permits this) have no user to link, same as every historical row.
ALTER TABLE site_visits
  ADD COLUMN visitor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_site_visits_visitor_user_id ON site_visits(visitor_user_id);

-- 2. New additive SELECT policy — a signed-in user can see their own
-- site_visits rows. Does not touch the existing INSERT policy (still
-- WITH CHECK (true), already permits a client to set visitor_user_id
-- on insert if it chooses to — no change needed there for a future
-- booking flow to start populating this column) or any other
-- existing SELECT/UPDATE policy on this table (006's seller/admin
-- policies, 029's agent policies, 045's teammate clause) — RLS
-- policies OR-combine, so this can only add visibility, never narrow
-- what any of those already grant.
DROP POLICY IF EXISTS "Visitor can view own site visits" ON site_visits;
CREATE POLICY "Visitor can view own site visits"
  ON site_visits FOR SELECT
  USING (visitor_user_id = auth.uid());
