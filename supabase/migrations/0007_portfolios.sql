-- 0007_portfolios.sql
-- Introduce Portfolios: a user owns many portfolios, each holding many ideas
-- (projects). Backfills existing projects into a default portfolio per user.

CREATE TABLE IF NOT EXISTS portfolios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My First Portfolio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their portfolios"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON portfolios (user_id);

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Link projects to a portfolio.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE;

-- Backfill: one default portfolio per user that has projects, then assign.
INSERT INTO portfolios (user_id, name)
SELECT DISTINCT user_id, 'My First Portfolio'
FROM projects
WHERE portfolio_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM portfolios pf WHERE pf.user_id = projects.user_id);

UPDATE projects p
SET portfolio_id = (
  SELECT id FROM portfolios pf WHERE pf.user_id = p.user_id ORDER BY created_at ASC LIMIT 1
)
WHERE portfolio_id IS NULL;

CREATE INDEX IF NOT EXISTS projects_portfolio_id_idx ON projects (portfolio_id);

-- New users: auto-provision a profile AND a default portfolio.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.portfolios (user_id, name) VALUES (NEW.id, 'My First Portfolio');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
