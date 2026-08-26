-- 0005_brief.sql
-- The internal, gated structured brief (targets the harness brief.md schema).
-- Consumed at build time by ops/harness — never returned by the founder-facing
-- project GET (ADR-6 free/gated enforcement). RLS on projects still applies.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS brief JSONB;
