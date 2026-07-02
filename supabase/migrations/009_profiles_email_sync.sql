-- ═══════════════════════════════════════════════════════════════
-- 009 — Sync email from auth.users into public.profiles
--
-- Problem: the admin All Users panel cannot show user emails —
-- auth.users is not client-queryable and profiles has no email
-- column.
--
-- Fix: add profiles.email, populate it in handle_new_user() (007)
-- on insert, backfill existing rows, and keep it in sync when a
-- user changes their email in auth.
--
-- RLS: profiles SELECT is own-row plus admin_select_all_profiles
-- (008), so email is visible only to the user themselves and
-- admins — correct exposure for PII.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ── Populate email on new-user insert (replaces 007's version) ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, role, is_verified)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),  -- Google OAuth
      NULLIF(NEW.raw_user_meta_data->>'name', ''),       -- some OAuth providers use 'name'
      NEW.email,                                         -- email sign-ups
      NEW.phone,                                         -- phone-OTP sign-ups
      'New User'                                         -- full_name is NOT NULL — never fail
    ),
    NEW.phone,
    NEW.email,
    'buyer',       -- user_role enum default; agents self-select later in registration
    TRUE           -- standard users are verified; only agents need manual approval,
                   -- and the agent flow's client-side upsert sets that explicitly
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on_auth_user_created (007) already points at this function;
-- CREATE OR REPLACE keeps it wired — no re-create needed.

-- ── One-time backfill for existing profiles ──
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS NULL;

-- ── Keep in sync when a user changes their auth email ──
-- Tradeoff: without this, profiles.email goes stale after an email
-- change (rare, but silently wrong in the admin panel). With it, we
-- carry a second trigger on auth.users — cheap (fires only ON UPDATE
-- OF email) and SECURITY DEFINER like 007. Chosen: keep in sync.
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_update();
