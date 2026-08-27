# Unicorn Factory — V1 Delivery Brief (harness input)

> **How to use:** from inside the `unicorn-factory` repo, run `/orch docs/harness/v1-brief.md`.
> `/orch` will detect the `unicorn-factory` project (via the git remote) and normalize this into
> its own `brief.md`. This is an **ongoing project** — the harness is NOT starting from scratch.

---

## Goal

**Completely deliver V1** of Unicorn Factory: take the existing, working-but-unhardened build to a
**production-ready, tested, verified, and deployed** state. This is a finishing + hardening job, not a
rebuild. **V2 is explicitly out of scope** — after V1 is delivered and approved, a separate brief will
request V2.

## Current status (what already exists)

A substantial V1 build exists on branch **`feat/v1-platform-restructure`** (14 commits ahead of
`main`; **not yet pushed** — see "First steps"). Built and compiling green (typecheck + lint clean),
but **never tested or deployed end-to-end**. What's implemented:

- **Founder journey** (10 stages): Intake → The Workshop → Blueprint → Commission → Green-Light →
  Ignition → The Forge → Proving Ground → Handover → Launch (+ Parked/Declined terminals). A
  status-driven single page `/projects/[id]` renders the stage matching the server-verified status —
  **no per-stage URLs** (founders cannot manually jump stages).
- **Portfolios → Ideas** model: `/dashboard` lists portfolios, each holding multiple ideas with status
  + progress. Users hold many ideas concurrently.
- **Real AI**: idea intake classifier, Workshop clarifying Q&A, and LLM-generated **Blueprint**
  (refined idea + target users + feature list + roadmap + complexity tier) with a **PDF export**. The
  gated technical brief is stored server-side and never returned pre-payment.
- **Estimator**: 3 tiers (Spark $3k–5k / Standard $7k–12k / Advanced $15k–22k), value-anchored; band →
  firm price at Green-Light.
- **Payments**: **Paystack** hosted checkout (USD) + signature-verified webhook → `paid` (T-0).
- **Ops surface** `/ops` (role-gated): approve/decline + set firm price, start The Forge, mark
  delivered (repo/staging URLs + Reality Map), re-forge for revisions.
- **Handover**: package (live URL + handover doc + Reality Map) + full-ownership vs managed-service fork.
- **Data**: Supabase, migrations `0001`–`0007` in `supabase/migrations/`, RLS throughout, `profiles`
  roles (founder|ops), `portfolios`, `payments`.
- **Auth**: defense-in-depth (proxy route guard + per-route `getUser()` + RLS), memoized browser client.

**Full context** lives in the repo:
- `docs/product/discovery.md`, `mvp-scope.md`, `quality-contract.md`, `architecture.md` — the product
  definition + all ADRs (harness=CLI, Stripe→Paystack, portfolios, estimator tiers).
- `SETUP.md` — local setup + the two-role (founder/ops) demo walkthrough.
- `README.md`, `AGENTS.md`.

## Scope — what "deliver V1" means (acceptance)

1. **Automated tests (currently NONE).** Add a test framework + meaningful coverage: unit (state
   machine, estimator, guards), integration (each API route incl. auth 401/403 + state 409 guards, RLS
   isolation, the Paystack webhook signature + idempotency), and an **end-to-end journey** test
   (Intake → … → Launch, both founder and ops roles).
2. **Execution verification (not static review).** Actually run the flow against a real Supabase +
   Anthropic + Paystack (test mode) and prove each stage advances correctly; verify gated artifacts are
   never exposed pre-payment.
3. **Professional UX pass** across every screen (dashboard, journey stages, ops console) — this is a
   priority; use the UI/UX specialist. Consistency, empty/error/loading states, responsive, accessible.
4. **Brand configurability** — make brand artifacts (name, logo, colors, key copy) centrally
   configurable (use the Brand specialist), so the platform isn't hardcoded to one look.
5. **Deploy** to Vercel; `/api/health` green; migrations documented/applied; env documented.
6. **Close known rough edges** (see below).
7. **Merge to `main`** as the delivered V1.

## Constraints (non-negotiable)

- **Stack:** Next.js **16** (App Router, TS — note `AGENTS.md`: read `node_modules/next/dist/docs/`
  before Next-specific code; middleware is `proxy.ts`), Supabase, Tailwind v4, Vercel AI SDK
  (Anthropic), **Paystack (USD)**, Vercel, jsPDF.
- **Honor the decisions:** the quality contract (Quality Floor, Real-vs-Mocked + Reality Map, scope
  boundary), the state machine + server-side guards, RLS, the single-status-driven project page (no
  manual stage nav), concierge ops (human approval + external harness build trigger).
- **Do not regress** the existing journey or data model. Extend/harden, don't rewrite.
- **V1 = cash-only (Paystack), concierge ops.** No equity path.

## Out of scope (V2 — do NOT build now)

Equity path + agreements, fully automated approval/orchestration, gate/status streaming to customers,
managed-service billing portal, the pixel-art interactive-factory visualization, multi-currency.

## Known gaps / open questions for the CTO to resolve

- No test framework or CI yet.
- The production build/deploy has never been verified against a live Vercel + Supabase.
- Paystack requires a **USD-enabled** account; webhook needs a public URL (tunnel locally).
- Supabase email-confirmation is environment-config dependent (documented in `SETUP.md`); confirm the
  intended production auth UX (confirmation on/off, and if on, build the callback).
- The landing page copy + brand are first-draft; the UX/Brand pass should elevate them.
- Est-vs-actual and other telemetry (from the harness notes) are not yet captured — nice-to-have, not
  required for V1 sign-off unless the CTO deems it in-scope.

## First steps for the CTO

1. Confirm understanding (Gate 0) with the current-status framing above.
2. Ensure the **`feat/v1-platform-restructure` branch is pushed** and treated as the working baseline
   (the harness should build/harden on top of it, not on the old `main` mock).
3. Plan the V1-completion gates (spec → UX/design → hardening/impl across N engineers → QA → deploy →
   UAT), then proceed gate by gate.
