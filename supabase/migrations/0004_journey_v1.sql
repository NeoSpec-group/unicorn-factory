-- 0004_journey_v1.sql
-- Reshape the projects table for the refined founder journey (architecture.md):
-- intake → blueprint_ready → commissioned → approved → paid → building → uat →
-- handover → launched|managed, plus terminals declined|parked.
-- Adds estimate columns + a payments table (Stripe).

-- ── Drop the old status CHECK, migrate existing rows, add the new one ───────────
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Map any legacy statuses onto the new model (safe if the table is empty).
UPDATE projects SET status = CASE status
  WHEN 'idea_submitted'      THEN 'intake'
  WHEN 'questions_answered'  THEN 'intake'
  WHEN 'research_running'    THEN 'blueprint_ready'
  WHEN 'research_complete'   THEN 'blueprint_ready'
  WHEN 'checkpoint_reviewed' THEN 'blueprint_ready'
  WHEN 'build_running'       THEN 'building'
  WHEN 'build_complete'      THEN 'uat'
  WHEN 'stopped'             THEN 'parked'
  ELSE status
END;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check CHECK (status IN (
    'intake',
    'blueprint_ready',
    'commissioned',
    'approved',
    'declined',
    'paid',
    'building',
    'uat',
    'handover',
    'launched',
    'managed',
    'parked'
  ));

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'intake';

-- ── Estimate + delivery columns (ADR-8 / ADR-3) ────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tier          TEXT
  CHECK (tier IN ('spark', 'standard', 'advanced'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimate_low  INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimate_high INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS firm_price    INTEGER;   -- set at Green-Light
ALTER TABLE projects ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMPTZ; -- T-0
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repo_url      TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS staging_url   TEXT;

-- ── Payments (Stripe) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stripe_session_id  TEXT UNIQUE,        -- idempotency key for the webhook
  amount             INTEGER NOT NULL,   -- USD (whole dollars)
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'failed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at            TIMESTAMPTZ
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Founders may read their own payments (via the owning project). Writes happen
-- through the service role in the Stripe webhook.
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = payments.project_id AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS payments_project_id_idx ON payments (project_id);
