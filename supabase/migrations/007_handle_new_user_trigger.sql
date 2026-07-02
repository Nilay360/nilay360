-- ═══════════════════════════════════════════════════════════════
-- 007 — Auto-create profile rows for new auth users
--
-- Problem: profiles are only created client-side by the phone-OTP
-- registration flow (AuthModal). Google OAuth sign-ups and OTP
-- sign-ins that never completed registration end up with an
-- auth.users row but no public.profiles row, breaking role lookups
-- and dashboard reads.
--
-- Fix: a SECURITY DEFINER trigger on auth.users that seeds a
-- minimal profile for every new user, regardless of sign-in method.
-- ON CONFLICT DO NOTHING keeps the existing client-side upsert
-- authoritative when it runs first (it carries richer data: city,
-- role=agent, whatsapp).
--
-- Note: role must be a valid user_role enum value. 'user' is not in
-- the enum; 'buyer' is the schema default and what the app expects.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, is_verified)
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
    'buyer',       -- user_role enum default; agents self-select later in registration
    TRUE           -- standard users are verified; only agents need manual approval,
                   -- and the agent flow's client-side upsert sets that explicitly
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── One-time backfill: seed profiles for existing orphaned users ──
-- (auth users with no profiles row — e.g. Google OAuth accounts)
INSERT INTO public.profiles (id, full_name, phone, role, is_verified)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    u.email,
    u.phone,
    'New User'
  ),
  u.phone,
  'buyer',
  TRUE
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
