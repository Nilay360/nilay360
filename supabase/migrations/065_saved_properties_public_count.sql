-- ═══════════════════════════════════════════════════════════════
-- 065 — public_property_save_counts: public, always-accurate save count
-- per property (item #1)
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- WHY A LIVE VIEW, NOT A MAINTAINED COUNTER COLUMN:
-- saved_properties (002_saved_properties.sql) already exists and is the
-- real, working join table behind the save/unsave feature (useSavedProperties
-- hook, the heart icon on /properties, the homepage, and the property detail
-- page). A denormalized saves_count column on property_listings, kept in
-- sync via an INSERT/DELETE trigger, was the alternative — rejected because
-- correctness was the explicit priority here, and a triggered counter's
-- correctness depends on the trigger actually firing correctly on every
-- single insert/delete, forever (a migration that adds the trigger without
-- backfilling existing rows, a future bulk delete that bypasses the
-- trigger, a manual data fix that forgets to adjust the counter — any of
-- these silently desyncs the number from reality). A view that computes
-- COUNT(*) directly from saved_properties at query time cannot drift: there
-- is no second piece of state to keep in sync, so there is nothing to fail
-- to keep in sync. This guarantees correctness structurally, not through
-- diligence.
--
-- WHY THIS IS PUBLICLY READABLE DESPITE saved_properties' OWN RLS:
-- saved_properties' only policy ("Users manage own saves", USING (auth.uid()
-- = user_id)) means a direct query against that table — by anon, or by any
-- other signed-in user — returns only the querying user's own rows, never
-- the true total. A Postgres view does NOT need (and does not have — this
-- is a real syntax difference from functions) a "SECURITY DEFINER" clause
-- to see past that: a view is evaluated against its underlying tables using
-- the VIEW OWNER's privileges, not the querying role's. Since migrations run
-- as a privileged role, this view (like public_agent_contact,
-- 016_public_agent_contact_view.sql, the exact precedent this follows) sees
-- every row in saved_properties regardless of who queries the view — the
-- view itself is the only thing exposed to anon/authenticated, and it
-- exposes nothing but property_id + an aggregate count, never a user_id or
-- any other saver-identifying detail.
--
-- No RLS is added to or removed from saved_properties itself — that table's
-- existing owner-only policy is completely untouched. This view is a
-- separate, additive object, same as 016.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public_property_save_counts AS
SELECT
  property_id,
  COUNT(*) AS save_count
FROM saved_properties
GROUP BY property_id;

GRANT SELECT ON public_property_save_counts TO anon, authenticated;
