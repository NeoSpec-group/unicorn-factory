# Unicorn Factory — Quality Contract (Living Draft)

> **Status:** CONFIRMED (2026-08-23) — sub-decisions A, B, C agreed. Rolls up to discovery §6 #4.
> **Last updated:** 2026-08-23
> **Parent:** [`discovery.md`](./discovery.md)

**Purpose:** define what "a properly engineered MVP" means, what is real vs mocked at delivery,
and the scope rules that protect a fixed price and a 72hr promise. This is the backbone the
landing-page promise, the estimator, the approval gate, and delivery all reference.

Audience note: our beachhead (funded non-technical founders) can't judge code quality themselves.
So the contract is written as **plain-language guarantees they understand**, each backed by an
**internal verification** they don't have to trust on faith.

---

## Layer 1 — The Quality Floor (every MVP guarantees this)

| We guarantee | What it means | Verified internally by |
|---|---|---|
| **It works** | The complete core user journey runs end-to-end, in production — not just on a laptop. | Build passes, app deploys to a live URL, primary flows driven and observed (execution-in-loop QA). |
| **It's secure** | Proper auth, protected data, nothing sensitive exposed. | Auth + ownership/authorization checks, input validation, row-level data protection, secrets server-side only, zero hardcoded credentials. |
| **It's yours** | You own the code and IP and can run it on your own accounts — no lock-in to us. | Clean repo transferred to you; standard mainstream stack; deployable to your own infra/keys; `.env.example` + setup docs; one-command run. |
| **It's maintainable** | A future developer (yours or ours) can read and extend it. | Typed, structured, consistent conventions, no dead code, documented architecture; lint + typecheck pass. |
| **It's live** | Deployed and reachable at a real URL. | Deploy verification + health check; environment documented. |
| **It's explained** | You know exactly what you have, how to run/change it, and what's next — in plain English. | Non-technical **handover doc**: what it does, how to run it, the Reality Map (below), recommended next steps. |

**Explicitly *beyond* the floor** (named so there are no surprises — available via re-scope or the
managed-service tier, never silently assumed): load/scale hardening, comprehensive automated test
suites, accessibility & compliance regimes (SOC2/HIPAA/GDPR tooling), advanced
observability/analytics, pixel-perfect custom design systems, native mobile apps, data migration
from existing systems, SEO, and content/copywriting.

---

## Layer 2 — Real vs Mocked policy

The honesty mechanism. A "properly engineered MVP" is allowed to simulate expensive or external
pieces — but never to fake the value.

**The realness taxonomy** — every major component is tagged one of:

| Tag | Meaning | Typical use |
|---|---|---|
| **Real** | Fully functional, production-grade | The core differentiated value + the primary user journey |
| **Limited** | Works, with named caveats | Single provider/region, rate-capped, one integration |
| **Mocked** | Realistic placeholder behind a *real interface*, `// MOCK:`-labeled, with swap-in instructions | Expensive/external/peripheral pieces (heavy ML, 3rd-party data APIs) |
| **Excluded** | Named, not built | Out of scope this version |

**The one hard rule:** the **complete intended user journey is always demonstrable end-to-end.**
Mocks may sit *inside* the journey where a component is expensive or external — but the journey
itself is never faked. A user (or investor) can always go start → finish and *see* the product's value.

**The Reality Map** — a table delivered with the MVP tagging every major component Real / Limited /
Mocked / Excluded. Agreed at the **approval gate**, confirmed at delivery. It doubles as the
**upsell roadmap** ("make these real for $X, or via managed service").

**✅ Sub-decision C — default realness stance (CONFIRMED).** A standard MVP is **"core real,
periphery mockable with disclosure; journey always end-to-end,"** tuned per-deal at the estimate —
more "real" costs more.

---

## Layer 3 — Scope boundary & change control (protects fixed price + 72hr)

1. **The quote binds to a scope artifact** — the approved spec: screens, flows, integrations, data
   models, and the Reality Map. Anything not in it is out.
2. **Defect vs Change — the critical distinction:**
   - **Defect** = delivered work doesn't match the agreed spec or the floor → **fixed free.**
   - **Change** = new or altered scope → **re-quoted** through the approval gate. Not a free add-on.
3. **Complexity tiers** (reuse the harness's fast-track / standard classification) each have a
   **ceiling** — max screens, integrations, data models. Beyond the ceiling → next tier or re-quote.
   *The 72hr promise is tier-bound*, not universal.
4. **Clock-freeze:** the 72hr window runs against a *frozen* scope. A mid-build change request
   **pauses the clock** and re-enters approval/re-quote.
5. **Acceptance:** delivery is "accepted" when the agreed acceptance criteria pass — objective and
   QA-verified, not a matter of opinion.

**✅ Sub-decision B — included revision round (CONFIRMED).** One bounded acceptance-&-fixes window
(e.g., 7 days / 1 round) covering **defects only** (making delivered work match the agreed spec).
Changes are re-quoted. Builds trust without opening scope creep.

---

## The Delivery Guarantee

**✅ Sub-decision A — Delivery Guarantee (CONFIRMED).** If we *accept* a build and fail to hit the
quality floor + agreed scope, the customer doesn't pay (full refund). A powerful trust signal for a
new service, **de-risked by the approval gate** — we only accept builds validated as feasible, so we
rarely honor it, and it disciplines the gate to decline bad-fit builds.

---

## How this connects to the rest of the system

- **Estimator** reads scope + Reality Map + complexity tier → the provisional quote.
- **Approval gate** validates feasibility, freezes scope, sets the Reality Map, and is where the
  Delivery Guarantee is de-risked.
- **QA (harden-before-build workstream)** is what *enforces the floor* — the Layer 1 "verified by"
  column is effectively its spec. (Parked as agreed; noted here only as the dependency.)
- **Pricing** scales with realness (Layer 2) and tier (Layer 3).
- **Managed-service tier** is where "beyond the floor" and the Reality Map's upsells live.

---

## Confirmed sub-decisions (2026-08-23)

| # | Decision | Outcome |
|---|---|---|
| A | Delivery guarantee (no-charge if floor missed) | ✅ **Adopted** — de-risked by approval gate |
| B | Included revision round (defects only) | ✅ **Adopted** — 1 round / bounded window |
| C | Default realness stance | ✅ **Adopted** — core real, periphery mockable, journey end-to-end |
