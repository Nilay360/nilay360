-- ═══════════════════════════════════════════════════════════════
-- 018 — property_listings.kuula_tour_url
--
-- Optional admin-only field holding a Kuula 360° virtual tour embed
-- URL. Not exposed in the seller submission wizard — admins add it
-- from the admin listing edit/detail view after a listing is
-- submitted. The property detail page renders a "360° Virtual Tour"
-- section only when this is set.
-- ═══════════════════════════════════════════════════════════════

alter table public.property_listings add column if not exists kuula_tour_url text;
