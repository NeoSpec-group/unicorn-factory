# Unicorn Factory — Product Discovery (Living Draft)

> **Status:** DRAFT / living document — updated as we refine. Not final.
> **Last updated:** 2026-08-23
> **Stage:** Discovery & Definition (pre-build). Build planning (plan mode) comes later.

---

## 1. Vision & pitch

**"Have an idea? Let's build it."** — TechTeam-as-a-Service for founders.
Refine your idea with us for free; when you're happy with its shape, we engineer your MVP —
delivered in **under 72 hours** — for **cash or equity**. Then we hand it over, or keep running it for you.

---

## 2. Two-product architecture

| Product | Role | Status in this plan |
|---|---|---|
| **The Business** (this doc) | Customer-facing studio: idea refinement → MVP → handover/manage | Being defined here |
| **The Harness** (agent-delivery-harness) | Internal production engine that builds the MVPs | **Assumed working to spec.** Improvements are a tracked *pre-build workstream*, out of scope for this planning. Only explicit blockers get raised. |

---

## 3. Business model

- **Hybrid pricing:** cash **or** equity — not equity-only.
- **Equity path:** minimum **10%**, **selective** (subject to internal review/diligence — we choose, we don't auto-accept).
- **Estimator produces a *provisional* cost**, made firm only at the internal approval gate.
- **Managed-service retainer** (post-handover) = recurring revenue, the durable core; build is customer acquisition.

---

## 4. Customer funnel (the product flow)

```
Landing page  ──▶  Free idea validation & refinement (AI)  ──▶  Founder confirms idea shape
                          │  (also captures structured scope)
                          ▼
                Reveal — tiered artifact  [RESOLVED: free = idea+roadmap+estimate; gated = spec+build]
                          ▼
                AI cost estimate (band + scope boundary; complexity tiers from harness)
                          ▼
                Build request form
                  • Cash: "$X–Y band, <72hr — proceed?"
                  • Equity: "≥10%, subject to review"
                          ▼
        ╔═════════ INTERNAL REVIEW & APPROVAL GATE ═════════╗
        ║ Revalidate cost, scope, feasibility.              ║
        ║ Outcomes: approve as-is / re-scope & re-quote /   ║
        ║           approve with conditions / decline.      ║
        ║ Firm quote is set here. Equity selection happens  ║
        ║ here.                                             ║
        ╚═══════════════════════════════════════════════════╝
                          ▼
                Commitment  →  T-0 (72hr clock start)
                  • Cash:   payment confirmation = T-0
                  • Equity: executed agreement = T-0 (exact trigger set during review)
                          ▼
                Build (harness)  ──▶  Verified delivery  ──▶  Handover
                          ▼
                Upsell: "We can run it for you" (managed retainer)
```

**Key mechanics locked so far:**
- The refinement step *is* the sales process and doubles as scope capture.
- The approval gate is the safety valve that makes fixed-price + fast delivery survivable — the AI estimate is provisional until a human validates it.
- The 72hr clock never starts before commitment is confirmed (payment, or executed equity agreement).

---

## 5. Lean Canvas (one-pager — fill as we learn)

| Block | Current state |
|---|---|
| **Problem** | Founders (esp. non-technical) can't get from idea → working MVP without hiring a team, raising money, or months of time. |
| **Customer segments** | **Beachhead: funded non-technical founders** (operators, domain experts, pre-seed founders with some capital + a real product idea). Broke idea-stage founders = free top-of-funnel. SMB internal-tools = possible parallel cash line (off-brand). Technical founders = *not* the target. |
| **Unique value prop** | "Idea → properly-engineered MVP in <72hrs. Refined free, built for cash or equity, handed over or managed." |
| **Solution** | Free AI idea-refinement funnel → AI cost estimate → human-approved build via the harness → handover or managed operation. |
| **Channels** | TBD (landing page + ?). |
| **Revenue streams** | Build fees (cash), equity stakes (selective), **managed-service retainers (recurring)**. |
| **Cost structure** | Harness compute + human oversight per build; est. ~$Xk/MVP (input to confirm). |
| **Key metrics** | TBD — e.g. refinement→build conversion, est-vs-actual cost delta, on-time delivery %, retainer attach rate. |
| **Unfair advantage** | The harness as a cost-advantaged production engine → equity bets and 72hr delivery a normal studio can't match. |

---

## 6. Open decisions (tracked)

| # | Decision | Current lean |
|---|---|---|
| ~~1~~ | ~~Free vs gated artifact line.~~ | ✅ **RESOLVED (2026-08-23):** *Free* = validated idea + roadmap + cost estimate (trust demo). *Gated (paid)* = production-grade spec/architecture + build (the moat). Free artifact designed as an *input-to-us*, not a standalone handoff, so the gate is self-enforcing. |
| ~~2~~ | ~~First customer segment.~~ | ✅ **RESOLVED (2026-08-23):** Beachhead = **funded non-technical founders**. This choice is what makes the generous free tier safe (they can't self-execute → low leakage). |
| **3** | **Equity clock-start trigger + selection criteria.** | Likely executed agreement; exact trigger + selection bar set during equity review. |
| ~~4~~ | ~~Quality contract.~~ | ✅ **RESOLVED (2026-08-23):** See [`quality-contract.md`](./quality-contract.md). 3 layers (Quality Floor / Real-vs-Mocked + Reality Map / Scope boundary). Delivery Guarantee, 1 defects-only revision round, and "core real, periphery mockable, journey end-to-end" default all adopted. |
| ~~5~~ | ~~Estimator policy — confidence band width, scope-boundary rules, margin buffer.~~ | ✅ **RESOLVED (2026-08-26):** 3 tiers (Spark $3k–5k / Standard $7k–12k / Advanced $15k–22k), value-anchored, quote as a band that the approval gate collapses to firm; 72hr promise tier-gated (Tier 3 may exceed). See [`architecture.md`](./architecture.md) ADR-8. Bands tighten empirically via per-run telemetry. |
| **6** | **Center of gravity** — agency-first (cash flow) graduating select bets to studio. | Leaning agency-first hybrid. |

---

## 7. Key risks / assumptions to validate

- **Estimation accuracy** — mitigated by the approval gate, but est-vs-actual delta must be tracked from day 1.
- **72hr feasibility per complexity tier** — the delivery promise must be honest about which tiers it applies to.
- **Demand** — will founders pay $X for a 72hr MVP, or give ≥10% equity? Cheapest possible test needed.
- **Artifact leakage** vs funnel value (Open Decision #1).
- **Harness throughput/capacity** at volume (parked — pre-build workstream).
- **Competitive watch — founder-facing factory front-ends.** Agentic "software factory" engines are
  emerging (e.g. **Yesod / yesod.work** — a self-hosted, cost-aware multi-agent factory for *engineering
  teams*; validates the harness pattern but sells the engine, not a founder studio). Our moat is the
  founder-facing wrapper (free refinement funnel + approval gate + quality contract + ownership handover +
  managed service), which these don't touch. **Real** future threat = someone putting a "describe your
  idea → we build it for equity" front-end on a factory like this. Watch, don't react. (Build-vs-buy for
  our own engine: **decided — build our harness**, commoditize later; see architecture.md ADR-1.)

---

## 8. Next steps

1. ✅ Resolved: free/gated line (#1), beachhead (#2), quality contract (#4) — see §6.
2. ✅ **Platform MVP scope** complete — see [`mvp-scope.md`](./mvp-scope.md). Reuse + cleanup; S1–S4 adopted (cash-only, concierge ops, AI-assisted+human-confirmed estimator, Model A white-glove handover).
3. ✅ **Phase C — system design & architecture** complete (2026-08-26) — see [`architecture.md`](./architecture.md). All ADRs resolved (harness=standalone CLI/build-own, repo+fresh infra per build, Stripe Checkout, 3-tier value-anchored estimator).
4. **→ NEXT: plan mode** — sequence the mvp-scope.md module map into an implementation plan.
5. *(Optional, parallel)* **Sharpen the wedge** — an initial vertical within *funded non-technical founders*.
6. *(Deferred to build)* #3 equity clock-start + selection. #5 estimator ✅ resolved. #6 (agency-first hybrid) settled.
