-- 0002_leads_dedup.sql
-- Make landing-page lead capture idempotent: one row per email address
-- (case-insensitive). The /api/leads route treats a duplicate as success.

-- Collapse any pre-existing duplicates before adding the unique index.
DELETE FROM email_leads a
USING email_leads b
WHERE a.ctid < b.ctid
  AND lower(a.email) = lower(b.email);

CREATE UNIQUE INDEX IF NOT EXISTS email_leads_email_unique_idx
  ON email_leads (lower(email));
