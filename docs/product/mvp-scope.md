# Unicorn Factory — Platform MVP Scope (Phase B, Living Draft)

> **Status:** CONFIRMED (2026-08-24) — S1–S4 adopted. Phase B complete → Phase C (architecture).
> **Last updated:** 2026-08-23
> **Builds on:** [`discovery.md`](./discovery.md), [`quality-contract.md`](./quality-contract.md)
> **This is Phase B (WHAT v1 ships). Phase C = system design/architecture (HOW). Then plan mode.**

---

## Build approach — reuse with strategic cleanup (DECIDED)

The existing `unicorn-factory` Next.js 16 app is **already a partial prototype of the customer
funnel** — not just a scaffold. Its screens map substantially onto the refined funnel.

- **Reuse:** stack (Next 16 / Supabase / Tailwind / Vercel AI SDK), the defense-in-depth **auth**,
  the **state-machine pattern**, UI components, the LLM client, and the mock/real discipline.
- **Rework:** the flow + state machine to match the refined funnel (insert estimate → build-request
  → payment/approval → build); repurpose "research/checkpoint" as refinement, "deliverables" as handover.
- **Add (new):** estimator, build-request + payment, internal approval workflow, harness integration,
  tiered-artifact gating, handover, managed-service hooks.
- **Clean up:** README stack drift (says 14, is 16), `proxy.ts` matcher exact-vs-`startsWith`,
  duplicate `TERMINAL_STATES`, and the never-verified build (ties to the QA-hardening workstream).

---

## Module map (v1)

| # | Module | Face | Reuse status |
|---|--------|------|--------------|
| 1 | Landing + lead capture | Customer | ♻️ Reuse |
| 2 | Auth / founder accounts | Customer | ♻️ Reuse (keep defense-in-depth) |
| 3 | Idea intake + AI refinement | Customer | 🔧 Rework (seed: idea + questions screens) |
| 4 | Free artifact reveal — validated idea + roadmap + estimate | Customer | 🔧 Rework (seed: checkpoint/deliverables) |
| 5 | Cost estimator (refined idea → tiered, costed quote) | Customer | ✨ New |
| 6 | Build request + commitment (cash) + payment | Customer | ✨ New |
| 7 | Project status / dashboard | Customer | 🔧 Rework (seed: research/build/deliverables) |
| 8 | Handover (repo access + plain-language handover doc) | Customer | ✨ New-ish |
| 9 | Approval workflow (review / revalidate / approve / re-scope / decline) | Ops | ✨ New |
| 10 | Harness integration / build orchestration | Ops | ✨ New (the engine boundary) |
| 11 | Payments (Stripe) | Cross | ✨ New |
| 12 | Data model (founders, projects, estimates, requests, builds, deliverables) | Cross | 🔧 Rework (extend `projects`) |

---

## Proposed v1 cut — lean / concierge

**Principle:** automate the *customer experience*; keep the *operational engine* human-in-the-loop
until volume justifies automating it. This is the concierge-MVP pattern — and it fits our approval-gate
philosophy exactly (a human validates before every build).

**IN v1 — automated customer path:**
- Landing + auth
- Idea intake + AI refinement
- Free artifact reveal (idea + roadmap + estimate)
- Build request form + payment (**cash path**)
- Project status page
- Basic handover

**IN v1 — concierge / manual behind the scenes:**
- **Estimator:** AI-assisted but **human-confirmed** (not fully auto)
- **Approval gate:** lightweight internal view (even Slack/email to start) — a human action
- **Build orchestration:** ops **triggers the harness manually** and delivers

**LATER (v2+):**
- Equity path + agreement flow + selection
- Fully automated approval workflow
- Automated harness orchestration + gate/status streaming to the customer
- Managed-service portal + retainer billing
- Referral/virality, analytics, admin tooling

---

## Confirmed scope decisions (2026-08-24)

| # | Decision | Outcome |
|---|----------|---------|
| S1 | Cash-only in v1; defer equity path | ✅ **Adopted** |
| S2 | Concierge ops (manual approval + manual harness trigger) | ✅ **Adopted** |
| S3 | Estimator = AI-assisted + human-confirmed (not fully auto) | ✅ **Adopted** |
| S4 | Handover = **Model A** (build-in-ours, white-glove transfer at end) | ✅ **Adopted** — see below |

## Handover model (S4)

**Model A — build in our environment, transfer at the end.** White-glove / ops-done in v1 (not self-serve).

**Build happy path:** approval gate freezes scope + Reality Map → payment = T-0 → ops triggers the harness
in our build env (our GitHub org + staging Supabase/Vercel) → harness pipeline builds + execution-verifies
against the quality floor → live staging app + deliverables → customer previews & accepts (defects fixed
free within the revision window) → **handover** (or managed service).

**Full handover transfers 5 things (ownership is real, no lock-in):**
1. **Code** → their GitHub repo (clean history, README).
2. **Running app** → their Vercel (their domain if any).
3. **DB & auth** → their Supabase project (schema applied, RLS intact).
4. **Keys** → their API keys wired in; our build-time secrets rotated out.
5. **IP** → signed assignment; they own it outright.

**Handover package (for a non-technical owner):** live URL · plain-language handover doc · Reality Map
(Real/Limited/Mocked/Excluded + how-to-make-real = upsell roadmap) · accounts & cost inventory ·
5–10 min walkthrough (video or live call) · "grow it" menu.

**Fork at handover:** *Full handover* (transfer above, we revoke access) **or** *Managed service*
(we keep running it, retainer begins; package still delivered for transparency). This is the
recurring-revenue on-ramp, presented at the highest-trust moment.

---

## Architecture inputs (feed Phase C — see architecture.md)

- ✅ **DECIDED:** reuse existing `unicorn-factory` codebase with strategic cleanup.
- ✅ **DECIDED (S4):** Model A — build in our env (our GitHub org + staging Supabase/Vercel), white-glove transfer to customer accounts at handover.
- **OPEN (Phase C):** harness integration boundary — CLI/tool vs service vs job queue.
- **OPEN (Phase C):** per-build environment isolation (repo + staging infra per build).
- **OPEN (Phase C):** data-model extension of the existing `projects` table.
- Payments: Stripe (likely). Auth: keep the defense-in-depth pattern.
- Cleanup backlog (above) folds into the first build.

---

## Build-time tooling — skills shortlist (evaluate at build, not now)

Agent-skills repos to vet when we build (star counts in the source were inflated hype — judge on merit).
Design/methodology/token ones double as **harness-output-quality inputs** (feed the quality contract), so
they route to both our tooling *and* the harness workstream.
- ⭐ **awesome-claude-skills** (curated index — start here) · **Anthropic official skills** (baseline) ·
  **superpowers** (spec→plan→TDD→review; ↔ our gates) · **UI/UX Pro Max** + **Taste** (↔ quality contract,
  so shipped MVPs don't look generic).
- 🔶 **caveman** (token reduction ↔ harness margin) · **Matt Pocock** · **Addy Osmani** (everyday eng).
- ⚪ **Karpathy** (a CLAUDE.md ruleset, trivial) · **ADHD** (concise-output preference).

## Next

1. ✅ S1–S4 confirmed (2026-08-24).
2. ✅ **Phase C — system design & architecture** complete — see [`architecture.md`](./architecture.md).
