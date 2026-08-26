# Unicorn Factory — Platform System Design & Architecture (Phase C, Living Draft)

> **Status:** ✅ COMPLETE (2026-08-26) — all ADRs resolved. Phase C done → next is plan mode.
> **Last updated:** 2026-08-26
> **Builds on:** [`discovery.md`](./discovery.md) · [`mvp-scope.md`](./mvp-scope.md) · [`quality-contract.md`](./quality-contract.md)
> **Scope:** the *platform's* architecture (Model A). The **harness** (build engine) is assumed working —
> we design how the platform *integrates* it, not the harness internals.

---

## 1. System context & topology

```
                 ┌─────────────────────────── FOUNDER (customer) ───────────────────────────┐
                 ▼                                                                            │
        ┌──────────────────┐        ┌──────────────┐                                         │
        │  Customer Web App│──auth──│   Supabase   │  Postgres + Auth + RLS  (platform data) │
        │   (Next.js 16)   │──data──│  (platform)  │                                         │
        │  landing · refine │       └──────────────┘                                         │
        │  artifact · quote │        ┌──────────────┐                                        │
        │  request · pay ───┼──pay──▶│    Stripe    │                                        │
        │  status · handover│        └──────────────┘                                        │
        └───────┬──────────┘        ┌──────────────┐                                         │
                │  refine/estimate  │  Anthropic   │ (Vercel AI SDK)                         │
                └──────────────────▶│    (LLM)     │                                         │
                                    └──────────────┘                                         │
                 ▲                                                                            │
                 │ status/artifacts                                                          │
        ┌────────┴─────────┐   trigger    ┌──────────────────┐    builds into   ┌────────────┴───────┐
        │  OPS / ADMIN     │─────────────▶│  HARNESS (engine)│─────────────────▶│  BUILD ENVIRONMENT │
        │  approval queue  │  (manual v1) │  spec→design→    │   repo + staging │  our GitHub org +  │
        │  build trigger   │◀─────────────│  impl→QA→deploy  │                  │  staging Supabase/ │
        │  delivery        │  artifacts   └──────────────────┘                  │  Vercel (per build)│
        └──────────────────┘                                                    └─────────┬──────────┘
                                                                    white-glove transfer   │
                                                                    at handover (Model A)   ▼
                                                                          CUSTOMER'S OWN ACCOUNTS
                                                                     (their GitHub / Vercel / Supabase)
```

**Three actors:** Founder (customer), Ops (us — concierge in v1), Harness (build engine).

---

## 2. Confirmed foundations

- **Stack:** reuse Next.js 16 (App Router, TS) + Tailwind v4 + Supabase + Vercel AI SDK (Anthropic).
- **Hosting:** Vercel (platform app) + Supabase (platform DB/auth).
- **Auth:** reuse defense-in-depth (route guard + per-route `getUser()` + RLS); add an `ops/admin` role.
- **Ops posture:** concierge — manual approval + manual harness trigger (S2).
- **Handover:** Model A — build-in-ours → white-glove transfer (S4).

---

## 3. Architecture Decision Records

### ADR-1 — Harness integration boundary **[DECIDE]**
How does the platform invoke the build engine?
- **(a) Standalone CLI/tool ops runs**, platform just records the request + links to produced artifacts.
- (b) Separate internal service the platform calls over HTTP.
- (c) Job queue + workers (full automation).

**Recommendation: (a) for v1.** Matches concierge — zero orchestration infra; the platform stores the
request and the artifact links (repo URL, staging URL, deliverables, Reality Map). (b)/(c) are v2 once
volume justifies automating the trigger.

**Build-vs-buy (decided 2026-08-26):** the engine is **our own harness — build, not buy.** A vendor
factory (e.g. Yesod, a self-hosted agentic-factory product for eng teams) could technically fill this
box, but the harness is our cost advantage — the thing that makes 72hr delivery + equity bets viable —
so renting it would cede our margin and moat. We own it. **Commoditize/spin it out later** (its own
market exists) once Unicorn Factory has taken off. Harness improvements remain a pre-build workstream.

### ADR-2 — Data model **[light input]**
Extend the existing `projects` table into a small schema:
`founder(user)` · `refinement_session` · `estimate` · `build_request` · `build` · `deliverable` /
`reality_map` · `payment`. Multi-tenant via `user_id` + RLS; the ops/admin surface uses the service role.
**Recommendation:** single Supabase project, extend schema incrementally.

### ADR-3 — Per-build environment & isolation **[DECIDE]**
Each customer build needs its own repo + staging infra in *our* accounts (Model A).
- **(a) Repo-per-build in one GitHub org + a fresh Supabase + Vercel project per build.**
- (b) Shared staging infra with namespacing.

**Recommendation: (a).** Clean isolation, and it makes the Model A transfer trivial — you hand over
*that* repo/project. Provisioned by ops in v1 (concierge); scriptable → automated later.

### ADR-4 — Auth & roles **[decided-ish]**
Reuse Supabase auth; add `role` (`founder` | `ops`). Ops/admin surface gated by role; RLS isolates
founder data. No change to the strong per-route pattern.

### ADR-5 — Payments **[light input]**
Stripe **Checkout** (hosted). On the success webhook → mark `build_request` paid → **T-0**. Cash only in v1.
**Recommendation:** hosted Checkout — least to build, PCI offloaded.

### ADR-6 — Free vs gated enforcement **[policy-decided]**
Free artifact (idea + roadmap + estimate) is generated and viewable/downloadable. The **executable spec +
build are produced only after payment/approval** and never exposed pre-payment. Enforced server-side.

### ADR-7 — Refinement engine **[design]**
LLM-driven conversational refinement → a **structured brief**. Reuse the LLM client. Key alignment: the
refined brief should target **the harness's `brief.md` schema** — so refinement output drops straight into
the build engine. Output also feeds the estimator.

### ADR-8 — Estimator **[DECIDED 2026-08-26]**
Input: the structured brief. Classify complexity into **3 tiers**, each mapped to a price band, a
time band (72hr promise is tier-gated), a scope ceiling, and a draft Reality Map. AI-assisted, output as
a **band**; the **human approval gate (S3) collapses the band to a firm number.** Pricing is
**value-anchored** (price to the founder's alternative — hiring a team = $15k+ over months — not to our
low marginal cost; the harness cost advantage means margin is high at every tier and funds equity bets).

| Tier | Scope | Reality posture | Price band (cash) | Time |
|------|-------|-----------------|-------------------|------|
| **1 · Spark** | One core flow + auth + DB; periphery mocked | 1 core journey real, rest Limited/Mocked | **$3k–5k** | <72hr |
| **2 · Standard** | Multi-flow app + 1 key integration real (payments *or* one external API) + dashboard | Core + one integration real | **$7k–12k** | <72hr |
| **3 · Advanced** | Multiple real integrations, richer domain logic | 2–3 integrations real | **$15k–22k** | 72hr **or up to ~1 week** (tier breaks the 72hr promise) |

**Design rules baked in:**
- **Quote is a band, not a point** — the band is the estimator's honesty about uncertainty; the approval
  gate sets the firm number after a human validates scope/feasibility.
- **72hr is tier-gated** — Tiers 1–2 hold the promise; **Tier 3 explicitly may not** (keeps the
  Delivery Guarantee honest; ties to the discovery.md 72hr-feasibility risk).
- **Tier sets price *and* the quality-contract scope boundary at once** — one classification drives
  price band, time band, and the Real-vs-Mocked ceiling.
- Marginal cost ≈ $300–600/build (LLM tokens + concierge ops hours + mostly-free infra), so gross margin
  is ~88–96% across tiers; the pricing lever is willingness-to-pay, not cost recovery.

**Numbers are v1 straw-man → tighten empirically.** Per-run telemetry (see harness workstream notes) makes
est-vs-actual delta measurable so bands narrow over time. This resolves **Open Decision #5**.

---

## 4. Data flow (happy path)

`refinement_session → brief → estimate → build_request → payment(T-0) → [ops] approval →
[ops] harness run in isolated env → build + deliverables recorded → status to customer →
accept → handover (transfer) | managed-service`

---

## 5. Cleanup backlog (folds into the first build)

README stack drift (14→16) · `proxy.ts` matcher exact-vs-`startsWith` · duplicate `TERMINAL_STATES` ·
verify the build actually compiles/deploys (ties to the QA-hardening workstream).

---

## 6. Phase C decisions — RESOLVED (2026-08-26)

| ADR | Decision | Resolution |
|-----|----------|------------|
| **1** | Harness integration boundary | ✅ **Standalone CLI/tool ops runs**; platform records request + artifact links. Build our own engine (not buy). |
| **3** | Per-build environment isolation | ✅ **Repo-per-build + fresh Supabase/Vercel per build** in our accounts (clean isolation → trivial Model-A transfer). |
| **5** | Payments | ✅ **Stripe hosted Checkout**; success webhook = paid = T-0. Cash only in v1. |
| **8** | Estimator tiers + price bands | ✅ **3 tiers, value-anchored $3k–22k, band→firm at gate** (see ADR-8). Closes Open Dec #5. |

*ADRs 1/3/5 adopted as recommended (all low-controversy for a concierge v1) — flag any objection and we revisit.*

---

## 7. Next

✅ Phase C complete — all ADRs resolved. **→ Switch to plan mode** for the build plan (sequence the
module map from mvp-scope.md into an implementation plan).
