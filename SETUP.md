# Unicorn Factory — Setup & Demo Guide

Get the platform running locally and walk the full founder journey end-to-end:

**Intake → The Workshop → Blueprint → Commission → Green-Light → Ignition → The Forge → Proving Ground → Handover → Launch**

---

## Prerequisites

- **Node.js 18+** (`node --version`)
- A free **[Supabase](https://supabase.com)** project (Auth + Postgres)
- An **[Anthropic API key](https://console.anthropic.com)** (idea intake, Workshop questions, Blueprint)
- A **[Stripe](https://dashboard.stripe.com)** account in **test mode** (payment at Ignition)
- Optional: the **[Stripe CLI](https://stripe.com/docs/stripe-cli)** for local webhook forwarding

---

## 1. Install

```bash
npm install
```

## 2. Create a Supabase project

In [supabase.com](https://supabase.com) create a project, then from **Settings → API** copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Apply the database migrations

The schema lives in [`supabase/migrations/`](./supabase/migrations) — the source of truth. Run each file
**in filename order** in the Supabase **SQL Editor** (or `supabase db push` with the CLI):

```
0001_baseline.sql     email_leads + projects + updated_at trigger
0002_leads_dedup.sql  idempotent lead capture (unique email)
0003_profiles.sql     profiles + role (founder|ops) + auto-provision trigger
0004_journey_v1.sql   journey state machine + estimate columns + payments table
0005_brief.sql        gated structured brief column
```

Re-running is safe (guarded with `IF NOT EXISTS` / `ON CONFLICT`).

## 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in every value:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server-only, never NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-api03-...     # server-only
ANTHROPIC_MODEL=claude-haiku-4-5       # optional override
STRIPE_SECRET_KEY=sk_test_...          # test mode
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen` (see step 6)
```

> Keys without `NEXT_PUBLIC_` are server-only and must never be exposed to the browser.

## 5. Run

```bash
npm run dev      # http://localhost:3000
```

Sign up on `/auth`, then walk **Intake → Workshop → Blueprint → Commission**. The founder path works with
just Supabase + Anthropic. Payment and ops steps need steps 6–7.

## 6. Stripe webhook (for Ignition / payment)

In a second terminal, forward Stripe events to the local webhook:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local`, then restart `npm run dev`.
At checkout use test card **`4242 4242 4242 4242`**, any future expiry, any CVC.

## 7. Grant yourself the ops role

The internal `/ops` console (approvals + build ops) requires the `ops` role. After signing up, run in the
Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'ops'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```

---

## Full demo walkthrough

You'll play **two roles**: the **founder** (main app) and **ops** (`/ops`). Easiest with two browsers (or
a normal + incognito window) so you can hold two sessions — but a single ops-roled account can do both.

### As the founder
1. **Intake** — `/auth` → sign up → describe your idea (20–500 chars). The LLM accepts/declines it.
2. **The Workshop** — answer the AI's clarifying questions.
3. **Blueprint** — see the real, LLM-generated refined idea + roadmap + tier estimate band. You can
   **download** it (free) or **Commission the build**, or **Park**.
4. **Commission** — confirm the build request → lands on **Status** ("In review — Green-Light").

### As ops (`/ops`)
5. **Green-Light** — the project appears in the queue as `commissioned`. Set a **firm price** → **Approve**
   (or Decline).

### As the founder
6. **Ignition** — Status now shows "Approved". Click **Pay … & ignite** → Stripe Checkout → test card
   `4242…`. The webhook flips the project to `paid` (T-0) and you're redirected back with a confirmation.

### As ops
7. **The Forge** — the project is now `paid`. Click **Start The Forge** (build it externally with the
   harness). When ready, in the `building` card paste the **repo URL**, **staging URL**, a **handover
   guide**, and **Reality Map** rows → **Mark delivered**.

### As the founder
8. **Proving Ground** — Status shows your staging link. **Accept & continue**, or **Report an issue**
   (ops can then **Re-forge** for a revision, and re-deliver).
9. **Handover** — on `/handover`, choose **Take full ownership** (→ Launched) or **Managed service**
   (→ Managed). See the live app, handover guide, and Reality Map.

The **JourneyTracker** at the top of every screen shows exactly where the project sits the whole way.

---

## What's real vs. concierge (v1)

- **Real:** auth, AI intake + Workshop questions, AI-generated Blueprint + tier estimate, Stripe payment,
  the full state machine + gating, ops approvals, handover flow.
- **Concierge (human-in-the-loop):** the build itself — ops runs the harness externally and records the
  artifact links. Estimates are AI-assisted but a human sets the firm price at Green-Light.
- **Gated:** the executable `brief` is stored server-side and never returned to the founder pre-payment.
- **v1 scope:** cash only (equity path deferred); single defects-only revision round.

## Deploy (Vercel)

```bash
npm i -g vercel && vercel --prod
```

Set all `.env.local` variables in **Vercel → Settings → Environment Variables**, and point a Stripe
**Dashboard webhook** at `https://your-domain/api/stripe/webhook` (event: `checkout.session.completed`),
using that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`.
