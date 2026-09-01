# Unicorn Factory — Deploy & Verification Runbook (Draft)

**Status:** Draft, authored by backend-1 (G-7a) per `design.md` Design Decision 5/6. The G-11 DevOps
Engineer finalizes this doc and executes it against the real Vercel + Supabase + Paystack production
environment, capturing the evidence listed at the bottom.

This is the **first-time production deploy** for Unicorn Factory. Nothing here has been run for real yet
— it documents the procedure and the exact evidence G-11 must capture, so the deploy is auditable rather
than "trust me it worked."

---

## 0. Prerequisites (provisioning — owner: user/DevOps, before G-11)

These are the Open Technical Questions tracked in `design.md` — none block test/CI implementation (G-7),
but all must be resolved before this runbook can actually be executed:

- A **Supabase production project** (separate from any local/dev project).
- A **Paystack account with USD/international transactions enabled**, plus test-mode (`sk_test_…`) keys
  for verification and live (`sk_live_…`) keys for the real cutover.
- A **public webhook URL** — the deployed Vercel URL for production (no tunnel needed once deployed).
- A **Vercel project** with a deploy token wired into GitHub Actions.
- An **Anthropic API key** for production AI flows.
- Confirmation that **email confirmation stays ON in production** (Design Decision 4's default) — flag
  to the user if this should instead be OFF for launch-friction reasons.

---

## 1. Apply database migrations to the production Supabase project

Migrations live in [`supabase/migrations/`](../supabase/migrations), applied **in filename order**, and
are safe to re-run (guarded with `IF NOT EXISTS` / `ON CONFLICT`):

| Migration | Purpose |
|---|---|
| `0001_baseline.sql` | `email_leads` + `projects` + `updated_at` trigger |
| `0002_leads_dedup.sql` | idempotent lead capture (unique email) |
| `0003_profiles.sql` | `profiles` table + `role` (`founder`\|`ops`) + `on_auth_user_created` auto-provision trigger |
| `0004_journey_v1.sql` | journey state-machine columns + estimate columns + `payments` table |
| `0005_brief.sql` | gated structured `brief` column (never returned pre-payment) |
| `0006_payments_reference.sql` | rename payments column for Paystack (`reference`) |
| `0007_portfolios.sql` | `portfolios` table + `projects.portfolio_id` (backfills existing ideas) |

Apply via the Supabase CLI (`supabase link` then `supabase db push`) or paste each file into the
Supabase **SQL Editor** in order. After applying, confirm in the Supabase dashboard:
- All 7 migrations show as applied (Database → Migrations, or `supabase migration list`).
- The `on_auth_user_created` trigger exists (Database → Triggers) — it auto-provisions a `profiles` row
  (`role = 'founder'`) for every new `auth.users` row.
- RLS is **enabled** on `projects`, `portfolios`, `payments`, `profiles`, `email_leads` (Authentication →
  Policies / Database → Tables → RLS toggle) — see `design.md`'s Data Models section for the exact
  policies expected on each table.

## 2. Promote the ops account

Role changes are **not** self-service (by design — `profiles.role` has no permissive UPDATE policy for
the founder's own row). After the ops person signs up normally through `/auth`, promote them via the SQL
Editor (service-role context):

```sql
UPDATE profiles
SET role = 'ops'
WHERE user_id = (SELECT id FROM auth.users WHERE email = '<ops-person-email>');
```

## 3. Set Vercel environment variables (Production)

See `.env.example` for the full inventory and purpose of each variable. Set all of the following in
**Vercel → Project → Settings → Environment Variables** for the **Production** environment:

| Var | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | production Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | **never** prefix with `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY` | server-only | production Anthropic key |
| `ANTHROPIC_MODEL` | server-only, optional | defaults to `claude-haiku-4-5` in code if unset |
| `PAYSTACK_SECRET_KEY` | server-only | **live** key (`sk_live_…`) for the real cutover; use `sk_test_…` while verifying |
| `PAYSTACK_PUBLIC_KEY` | public, optional | reserved for a future inline flow |
| `NEXT_PUBLIC_SITE_URL` | public | the production URL (e.g. `https://unicorn-factory.example.com`) — stabilizes the auth email-confirmation redirect base |

Also set the same set (with test-mode Paystack + a preview-appropriate `NEXT_PUBLIC_SITE_URL`) on
**Preview** deployments if preview verification is desired.

## 4. Configure Supabase Auth (email confirmation + redirect allow-list)

Per Design Decision 4 (email confirmation is **ON** in production):
- **Authentication → Providers → Email → Confirm email:** ON.
- **Authentication → URL Configuration → Site URL:** the production Vercel URL (same as
  `NEXT_PUBLIC_SITE_URL`).
- **Authentication → URL Configuration → Redirect URLs:** allow-list `https://<prod>/auth/callback` and,
  if preview verification is in scope, the Vercel preview pattern (e.g. `https://*-<project>.vercel.app/auth/callback`).
- The code-exchange callback itself (`app/auth/callback/route.ts`) is a frontend-1 (G-7b) deliverable —
  confirm it exists on the branch being deployed before relying on this config.

## 5. Configure the Paystack webhook

**Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL:**
```
https://<production-url>/api/paystack/webhook
```
Paystack signs with the account's **secret key** (no separate signing secret) — the app verifies
`x-paystack-signature` as HMAC-SHA512 of the raw body using `PAYSTACK_SECRET_KEY` (see
`app/api/paystack/webhook/route.ts`, exercised by `tests/integration/webhook.test.ts`). Charges are in
**USD** — confirm the Paystack account has USD/international transactions enabled before go-live.

For **pre-production verification** (G-10, test-mode), a public tunnel stands in for the production URL:
```bash
cloudflared tunnel --url http://localhost:3000    # or: ngrok http 3000
```
Set the tunnel's HTTPS URL + `/api/paystack/webhook` as the Paystack **test-mode** webhook, and keep the
tunnel running for the duration of the verification run — `charge.success` cannot reach the app otherwise
and `approved → paid` will never fire.

Test card for verification (test mode only): `4084 0840 8408 4081`, CVV `408`, any future expiry, PIN
`0000`, OTP `123456`.

## 6. Deploy

Deploy via the existing GitHub Actions → Vercel token pipeline (repo is already configured for
"Vercel token via GitHub Actions" per `design.md`). `.github/workflows/ci.yml` (this task) covers
typecheck/lint/test/RLS verification on every push/PR; the actual **Vercel deploy** workflow/step is a
G-11 DevOps concern (out of scope for this test-and-CI lane) — wire it to trigger on merges to `main`
once V1 is accepted (AC-G1).

## 7. Verify

1. **Reachability:** the app is reachable at the production URL (`AC-E1`).
2. **Health check:**
   ```bash
   curl -s https://<production-url>/api/health
   # expect: {"status":"ok","timestamp":"<ISO8601>"}  HTTP 200   (AC-E2)
   ```
3. **Migrations applied:** screenshot/log of the Supabase migration list showing `0001`–`0007` applied
   (`AC-E3`).
4. **Env vars set:** a note confirming each variable in the table above is set for Production — **names
   only, never values** (`AC-E4`).
5. **Auth config:** screenshot of Supabase Authentication config showing confirmation ON and the
   redirect-URL allow-list (Design Decision 4).
6. **Journey smoke test:** either re-run `e2e/journey.spec.ts` against the production/tunnel URL
   (`NEXT_PUBLIC_SITE_URL=https://<production-url> npm run test:e2e`) or manually walk Intake → Launch
   once as a smoke test.

All of the above evidence is captured in the **G-11 DevOps report**, per `design.md`.

---

## Local development

For local setup (not deploy) — installing, creating a local/dev Supabase project, applying migrations,
configuring `.env.local`, and running the app — see [`SETUP.md`](../SETUP.md), which this runbook
defers to rather than duplicating.

For running the **automated test suite** locally, including the RLS-isolation suite against a real local
Postgres:
```bash
npm run typecheck && npm run lint && npm run test   # unit + mocked route-integration (fast, no Docker)

npx supabase start                                   # starts local Supabase via Docker (Supabase CLI)
RUN_RLS_TESTS=1 npx vitest run tests/integration/rls-isolation.test.ts
npx supabase stop
```
See `tests/helpers/supabase-local.ts` for how the RLS suite connects to the local stack, and
`.github/workflows/ci.yml`'s `rls` job for how this runs in CI.
