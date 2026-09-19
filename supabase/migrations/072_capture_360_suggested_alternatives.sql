-- ═══════════════════════════════════════════════════════════════
-- 072 — capture_360_requests.suggested_alternative_date_1/2
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- Admin-side, entered only on decline: up to two structured alternative
-- dates the admin can propose when the requester's preferred_date (071)
-- doesn't work. Deliberately two plain date columns, not an array/jsonb
-- and no time slot — per explicit scope, "just dates," and two is a
-- fixed, known cap (the decline modal has exactly two optional date
-- inputs), so a normalized array would be overhead for a value that
-- never needs more than two entries or its own query/filter surface.
-- Both nullable, no default, no backfill — every existing row is
-- unaffected.
-- ═══════════════════════════════════════════════════════════════

alter table public.capture_360_requests
  add column if not exists suggested_alternative_date_1  date,
  add column if not exists suggested_alternative_date_2  date;
