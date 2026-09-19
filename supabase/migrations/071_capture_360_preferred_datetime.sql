-- ═══════════════════════════════════════════════════════════════
-- 071 — capture_360_requests.preferred_date / preferred_time_slot
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line.
--
-- NOT reusing scheduled_date/scheduled_time_slot (both already exist
-- on this table, 062_capture_360_requests.sql) — checked that
-- migration's own lifecycle comment before drafting this: those two
-- columns are explicitly the ADMIN's confirmed date/time, set only
-- after they review a pending request and move it to 'scheduled'.
-- What this migration adds is a different concept — the REQUESTER's
-- own preference, entered optionally at request time, before any
-- admin has looked at it. Conflating the two into the same columns
-- would silently overwrite (or be overwritten by) whichever side
-- wrote last, with no way to tell "what the agent asked for" from
-- "what got confirmed" — two different points in the same lifecycle,
-- kept in two different column pairs on purpose.
--
-- Both nullable, no default, no backfill — every existing row
-- (already 'pending' or further along) is unaffected. Same CHECK
-- vocabulary as scheduled_time_slot's own convention where practical;
-- using Morning/Afternoon/Evening slots specifically (not a raw time)
-- since the request is asking for a rough visit window, not a precise
-- appointment time.
-- ═══════════════════════════════════════════════════════════════

alter table public.capture_360_requests
  add column if not exists preferred_date       date,
  add column if not exists preferred_time_slot  text
    check (preferred_time_slot in ('morning', 'afternoon', 'evening'));
