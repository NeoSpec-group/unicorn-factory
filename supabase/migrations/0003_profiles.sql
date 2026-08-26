-- 0003_profiles.sql
-- Roles for the platform. Every authenticated user gets a profile row (default
-- role 'founder'); 'ops' unlocks the internal /ops surface (approval + build ops).
-- This is the basis for the concierge ops gate (architecture.md ADR-4).

CREATE TABLE IF NOT EXISTS profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'founder' CHECK (role IN ('founder', 'ops')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- A user may read their own profile (so the app can check their role).
-- Role changes are intentionally NOT self-service — they happen via SQL / service role.
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-provision a profile whenever a new auth user is created.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill profiles for any users that already exist.
INSERT INTO public.profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ── Granting ops ───────────────────────────────────────────────────────────────
-- After you have signed up, promote your account to ops (run once, manually):
--   UPDATE profiles SET role = 'ops'
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
