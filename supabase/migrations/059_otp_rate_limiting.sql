-- ═══════════════════════════════════════════════════════════════
-- 059 — otp_requests: send-attempt tracking for OTP rate limiting
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- WHY THIS EXISTS: confirmed tonight — send-otp/route.ts currently has
-- zero rate limiting of any kind (no per-phone counter, no IP throttle,
-- no cooldown), and no existing rate-limiting utility exists anywhere
-- in this codebase to reuse. This table is the minimal state needed to
-- enforce the agreed limit: 5 OTP sends per phone number per hour.
--
-- SCOPE: table only. The actual "count requests for this phone in the
-- last hour and reject the 6th" check is application-layer logic in
-- send-otp/route.ts, built in a separate pass once this table exists —
-- not part of this migration.
--
-- phone FORMAT: stored as +91XXXXXXXXXX, matching this codebase's one
-- established canonical convention (056_phone_normalization.sql) rather
-- than introducing a third format for a third table to get wrong.
-- send-otp/route.ts currently receives a bare 10-digit phone from the
-- client (AuthModal.tsx's cleanPhone()) — the application-layer code
-- that inserts into this table is responsible for prefixing it to
-- +91XXXXXXXXXX before the insert, same as verify-otp/route.ts's
-- fullPhone convention. Not enforced by a DB constraint here (no CHECK
-- added) for the same reason 056 didn't force one on profiles.phone
-- retroactively — this table starts empty, so there's no existing data
-- to be inconsistent with, but the write path still needs to get the
-- format right by convention, not by DB enforcement.
--
-- INDEX: composite (phone, requested_at) supports the exact query this
-- table exists for — "how many rows for this phone in the last hour" —
-- as an index range scan rather than a sequential scan, which matters
-- once this table accumulates volume across every OTP send, successful
-- or not.
--
-- RLS: enabled with zero policies — deny-all for anon/authenticated,
-- matching the same posture as change_log (054) and admin_audit_log
-- (013)'s write side (no insert/update/delete policy for anyone,
-- including admins) — the only writer is send-otp/route.ts, which uses
-- the service-role key (adminClient() pattern already established in
-- verify-otp/route.ts) and therefore bypasses RLS entirely regardless
-- of policy count. Unlike change_log/admin_audit_log, this table has no
-- legitimate read case for anyone through the client either (it's pure
-- rate-limit bookkeeping, not an audit trail anyone needs to review),
-- so no admin SELECT policy is added — RLS enabled with no policies at
-- all is the correct, simplest posture here, not an oversight.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.otp_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_phone_requested_at
  ON public.otp_requests (phone, requested_at);

ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- No policies — deny-all for anon/authenticated by default. Only the
-- service-role key (which bypasses RLS) ever reads or writes this table.
