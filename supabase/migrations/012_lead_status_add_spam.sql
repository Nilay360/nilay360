-- Adds 'spam' as its own lead_status label, distinct from 'lost'.
--
-- Verified directly against production (2026-08-28): of the 8 real live
-- rows in `inquiries`, one (bfccc611-b269-4015-83fc-ac0d6976d778) is
-- already marked status = 'spam'. 'lost' and 'spam' are not the same
-- concept — 'lost' is a real prospect who didn't convert; 'spam' means
-- there was never a real lead there. Folding them together would corrupt
-- future lost-conversion-rate reporting.
--
-- This must be its own migration: Postgres does not allow a newly added
-- enum value to be referenced in the same transaction that adds it, so
-- 013_inquiries_lead_management.sql (which converts inquiries.status to
-- this enum, including the real 'spam' row) must run as a separate,
-- later migration.

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'spam';
