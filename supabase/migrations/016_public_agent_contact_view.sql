-- Makes the 2 real approved agents' public contact info visible on
-- /agents and /agents/[slug], without opening any broader access to
-- `profiles` — a pre-existing gap (anon has zero working read access to
-- `profiles` for any row today, confirmed directly) that was invisible
-- until tonight's agents-vs-agent_profiles consolidation gave `/agents`
-- real data to actually try rendering.
--
-- Why this is a VIEW, not a bare RLS policy on `profiles`:
-- A Postgres RLS policy controls which ROWS are visible — it cannot
-- restrict which COLUMNS are exposed once a row is visible. Column-level
-- restriction requires GRANT SELECT (col, col, ...), which is scoped to a
-- ROLE for the WHOLE table, not per-policy. `profiles` has real sensitive
-- columns (budget_min, budget_max, date_of_birth, gender, nationality,
-- is_nri, referral_code, role, subscription_tier, preferred_cities,
-- preferred_types) that must not become newly readable. A bare row policy
-- would also leak these to any *logged-in* visitor (running as
-- `authenticated`, which already has broader column access for the
-- existing "view own row" policy) viewing another approved agent's
-- profile through this same new row policy — GRANT can't be scoped
-- per-policy to prevent that. A view exposing only the exact columns
-- /agents and /agents/[slug] actually render sidesteps this cleanly:
-- confirmed by reading both files directly, they render full_name,
-- avatar_url, bio, city, phone, whatsapp, email — nothing else.
--
-- No existing `profiles` RLS policy is touched. `profiles` RLS is not
-- modified at all — this view is a separate, additive object.

CREATE OR REPLACE VIEW public_agent_contact AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.phone,
  p.whatsapp,
  p.email
FROM profiles p
JOIN agent_profiles ap ON ap.user_id = p.id
WHERE ap.status = 'approved';

GRANT SELECT ON public_agent_contact TO anon, authenticated;
