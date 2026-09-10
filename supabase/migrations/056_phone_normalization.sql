-- ═══════════════════════════════════════════════════════════════
-- 056 — Structural phone-number normalization for profiles.phone
--
-- ROOT CAUSE THIS FIXES:
-- A read-only audit (2026-09-10) confirmed the same real phone number had
-- accumulated FOUR separate auth.users/profiles accounts because phone
-- format was written inconsistently across the codebase, and no lookup
-- path was fully defended against the inconsistency:
--
--   1. verify-otp/route.ts        — writes '+91XXXXXXXXXX' (correct),
--                                    but its existingProfile lookup was a
--                                    strict single-format .eq() match.
--   2. profile/edit/page.tsx      — writes the raw form value verbatim,
--                                    no '+91' construction, no stripping.
--   3. DashboardClient.tsx        — same bug as #2 (likely the highest-
--                                    traffic write path — the main
--                                    in-app profile editor).
--   4. admin/page.tsx user editor — same bug as #2, admin-only.
--   5. handle_new_user() trigger  — an independent DB-level write path
--                                    (007/009) that copies auth.users.phone
--                                    (Supabase's own bare, no-'+' storage
--                                    format) straight into profiles.phone
--                                    with zero normalization.
--
-- Five app-level write paths plus one independent DB trigger, all with
-- different (or no) formatting discipline, feeding a single TEXT column
-- with no CHECK/UNIQUE constraint (confirmed fresh from 001_nivila_schema.sql
-- — no format or uniqueness enforcement exists anywhere at the DB layer).
-- Any lookup that assumes one canonical format silently misses rows
-- written in another, and the OTP flow's self-heal logic then creates a
-- new account instead of finding the real one.
--
-- FIX: move normalization to the database layer via a BEFORE INSERT OR
-- UPDATE trigger, so correctness no longer depends on every current and
-- future write path remembering to format the value correctly. This
-- makes format uniform regardless of which of the 5+ known call sites
-- (or any future one) performs the write.
--
-- SCOPE / RISK: the one-time backfill (Step 4) rewrites every existing
-- profiles.phone value in the live database. Read the backfill section
-- before running this migration — it includes a commented, read-only
-- pre-check query to run FIRST and inspect for rows that would fail
-- normalization, so a bad row is found and decided on deliberately
-- rather than aborting the migration transaction by surprise.
-- ═══════════════════════════════════════════════════════════════

-- ── Step 1 + 2: normalize_phone() trigger function ──────────────
--
-- Canonicalizes any of the following into '+91XXXXXXXXXX':
--   - 10 digits                        e.g. 9391526625
--   - 11 digits, leading 0 (STD-style) e.g. 09391526625
--   - 12 digits, leading 91             e.g. 919391526625
--   - already '+91XXXXXXXXXX'          e.g. +919391526625 (12 digits once
--                                       the '+' is stripped — the '+' is
--                                       not a digit, so this collapses
--                                       into the same 12-digit/leading-91
--                                       case as the bare form above)
--
-- NULL passthrough: some profiles may legitimately have no phone (e.g.
-- Google OAuth sign-ups before ProfileCompletionModal ever runs). NULL
-- is never touched — only a non-NULL value is normalized or rejected.
--
-- MALFORMED INPUT — reject vs. pass-through-with-warning, and why reject
-- was chosen:
--   A trigger that silently passes through anything it can't normalize
--   defeats the entire point of this migration: the audit's conclusion
--   was that format correctness must become STRUCTURALLY GUARANTEED,
--   not dependent on every write path behaving. A warning logged via
--   RAISE WARNING/NOTICE inside a Postgres trigger has no durable,
--   visible home in this app (nothing here ships to captured Postgres
--   logs to any monitored destination) — it would be silently swallowed
--   in practice, which is exactly the failure mode that produced the
--   4-duplicate-account bug in the first place. RAISE EXCEPTION instead
--   makes a malformed write fail LOUDLY, at the moment of the write, to
--   the caller that sent bad data — consistent with this session's
--   standing discipline of failing safely and reporting mistakes
--   plainly rather than proceeding on a guess (see hotfix-v2's
--   phone_exists handling, which took the same stance).
--
-- Deliberate deviation from "always take the last 10 digits": digit
-- counts outside {10, 11-with-leading-0, 12-with-leading-91} are NOT
-- blindly truncated to their last 10 digits. Blind truncation of an
-- unexpected length (e.g. 13, 15, or a stray extra digit from a typo)
-- risks silently turning one real phone number into a DIFFERENT but
-- still-plausible-looking one — a worse failure than rejecting outright,
-- because it corrupts data invisibly instead of surfacing the problem.
-- Only the three documented, unambiguous shapes are normalized; anything
-- else is rejected for a human to look at.
CREATE OR REPLACE FUNCTION public.normalize_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  digits TEXT;
  digit_count INT;
BEGIN
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  digits := regexp_replace(NEW.phone, '\D', '', 'g');
  digit_count := length(digits);

  IF digit_count = 10 THEN
    NEW.phone := '+91' || digits;
  ELSIF digit_count = 11 AND left(digits, 1) = '0' THEN
    NEW.phone := '+91' || right(digits, 10);
  ELSIF digit_count = 12 AND left(digits, 2) = '91' THEN
    NEW.phone := '+91' || right(digits, 10);
  ELSE
    RAISE EXCEPTION
      'normalize_phone: cannot normalize profiles.phone value % (% digit% after stripping non-digits) into +91XXXXXXXXXX — expected 10 digits, 11 with a leading 0, or 12 with a leading 91',
      NEW.phone, digit_count, (CASE WHEN digit_count = 1 THEN '' ELSE 's' END)
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.normalize_phone() IS
  'Canonicalizes profiles.phone to +91XXXXXXXXXX on every insert/update. '
  'NULL passes through untouched. Anything that cannot be unambiguously '
  'normalized (not 10 digits, or 11/12 digits without the expected '
  'leading 0/91 prefix) raises an exception rather than being truncated '
  'or silently passed through — see 056_phone_normalization.sql for why.';

-- ── Step 3: trigger, applies regardless of which write path fires ──
-- "UPDATE OF phone" (not a bare UPDATE) — only re-runs normalization
-- when phone itself is part of the SET clause, so unrelated profile
-- updates (bio, city, etc.) don't pay for a needless re-check.
DROP TRIGGER IF EXISTS trg_normalize_phone ON public.profiles;
CREATE TRIGGER trg_normalize_phone
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_phone();

-- ── Step 4: one-time backfill of existing rows ──────────────────
--
-- BEFORE RUNNING THE BACKFILL BELOW: run this read-only check first,
-- separately, and review any rows it returns. These are the rows that
-- WILL cause the backfill (and this whole migration transaction) to
-- fail with the exception above, because their digit shape doesn't
-- match any of the three normalizable patterns. Decide by hand what to
-- do with each (fix manually, null it out, or reject the account) BEFORE
-- running the backfill — do not run the backfill blind.
--
--   SELECT id, phone,
--          regexp_replace(phone, '\D', '', 'g') AS stripped_digits,
--          length(regexp_replace(phone, '\D', '', 'g')) AS digit_count
--   FROM public.profiles
--   WHERE phone IS NOT NULL
--     AND length(regexp_replace(phone, '\D', '', 'g')) NOT IN (10, 11, 12);
--   -- (11/12-digit rows also need their leading-digit checked by hand;
--   -- the query above only catches the length outliers to start with.)
--
-- WHY A GENUINE UPDATE RATHER THAN A SEPARATE HAND-WRITTEN BACKFILL PASS:
-- Writing a second, standalone normalization expression here (instead of
-- routing through the trigger) would duplicate the exact logic in
-- normalize_phone() in a second place — inviting the two to drift apart
-- over time, which is the same class of bug this migration exists to
-- eliminate. `SET phone = phone` is a genuine UPDATE of the phone column,
-- so it invokes trg_normalize_phone via the identical code path every
-- future write will use — one source of truth for the normalization
-- logic, proven against production data by the same trigger that
-- protects all future writes.
UPDATE public.profiles
SET phone = phone
WHERE phone IS NOT NULL;

-- ── Step 5 — see verify-otp/route.ts diff (separate file/section) ──
-- Belt-and-suspenders: existingProfile's lookup is also made
-- dual-format tolerant, matching findUserByPhone()'s proven pattern,
-- in case of any edge case even after DB-level normalization is live
-- (e.g. mid-migration timing, or a direct write that predates this
-- trigger being deployed to a given environment).
