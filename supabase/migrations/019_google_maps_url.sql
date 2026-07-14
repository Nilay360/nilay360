-- ═══════════════════════════════════════════════════════════════
-- 019 — property_listings.google_maps_url
--
-- Optional admin-only field holding a real Google Maps share URL for
-- the listing. Not exposed in the seller submission wizard — admins
-- add it from the admin listing edit/detail view, same pattern as
-- kuula_tour_url (018). The property detail page embeds it inline
-- (appending output=embed) when set, falling back to the existing
-- auto-generated locality/city search link when not.
-- ═══════════════════════════════════════════════════════════════

alter table public.property_listings add column if not exists google_maps_url text;
