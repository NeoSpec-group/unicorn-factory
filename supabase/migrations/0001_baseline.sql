-- 0001_baseline.sql
-- Baseline schema for Unicorn Factory, extracted from the original README setup block
-- so that migration history matches the live database. A fresh Supabase project should
-- run every file in supabase/migrations/ in order.
--
-- This file reflects the ORIGINAL funnel (8-state mock pipeline). The refined journey
-- state machine + extended columns are applied by later migrations (see 0004+).

-- ── Table: email_leads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;
-- No permissive policy: writes go through the service role (app/api/leads).

-- ── Table: projects ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'idea_submitted'
                         CHECK (status IN (
                           'idea_submitted',
                           'questions_answered',
                           'research_running',
                           'research_complete',
                           'checkpoint_reviewed',
                           'build_running',
                           'build_complete',
                           'stopped'
                         )),
  idea_text            TEXT NOT NULL,
  clarifying_questions JSONB,
  outputs              JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx  ON projects (status);

-- Shared updated_at trigger function (reused by later tables).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
