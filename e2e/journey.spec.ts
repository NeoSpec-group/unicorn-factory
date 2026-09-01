import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Full journey E2E — Intake → … → Launch, driving BOTH the founder and ops
 * roles against a live/seeded Supabase + real Anthropic + Paystack test mode
 * (Design Decision 1 / FR-A5, AC-A6). This is the spec the G-10 E2E Verifier
 * runs with captured evidence (Design Decision 1, FR-B3) — it is NOT part of
 * the blocking CI PR pipeline (needs live external services + a public
 * webhook URL).
 *
 * ---------------------------------------------------------------------------
 * Required setup (see .env.example / docs/DEPLOY.md — provisioning owned by
 * DevOps/user per design.md's Open Technical Questions, not this test):
 *
 *   E2E_FOUNDER_EMAIL / E2E_FOUNDER_PASSWORD
 *     A pre-confirmed Supabase auth account (profiles.role = 'founder',
 *     the default). Pre-confirmed via the Supabase admin API
 *     (`admin.createUser({ email_confirm: true })`, Design Decision 4) so
 *     this spec never waits on an inbox and never exercises the sign-up /
 *     email-confirmation UI or `app/auth/callback/route.ts` — it signs in
 *     directly with an already-confirmed account.
 *
 *   E2E_OPS_EMAIL / E2E_OPS_PASSWORD
 *     A second pre-confirmed account additionally promoted to the ops role
 *     via `UPDATE profiles SET role = 'ops' WHERE user_id = ...` (role
 *     changes are not self-service — Design Decision 5, step 2).
 *
 *   NEXT_PUBLIC_SITE_URL   Set by playwright.config.ts's `baseURL`; when set,
 *                          the local `next start` webServer is skipped and
 *                          this run targets a live/tunneled/deployed URL.
 *
 *   PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY (test-mode `sk_test_`/`pk_test_`)
 *     Must already be configured on the app under test, with the app's
 *     `/api/paystack/webhook` reachable from the public internet (a
 *     cloudflared/ngrok tunnel for local runs — Design Decision 6) and
 *     registered as the Paystack test webhook. Without a reachable webhook,
 *     `charge.success` never arrives and the "approved → paid" step below
 *     will time out — this is a known external dependency, not a bug in
 *     this spec.
 *
 * The Paystack hosted-checkout page itself is a third-party UI outside this
 * repo; the card-entry step uses the documented SETUP.md test card
 * (4084 0840 8408 4081 / CVV 408 / PIN 0000 / OTP 123456) against Paystack's
 * commonly-labelled fields. If Paystack changes their checkout DOM, the G-10
 * E2E Verifier adjusts the selectors in that one step — the rest of the
 * journey (founder intake→commission, ops approve/forge/deliver, founder
 * accept→handover→launch) does not depend on Paystack's UI at all.
 * ---------------------------------------------------------------------------
 */

test.describe.configure({ mode: 'serial' });

const FOUNDER_EMAIL = process.env.E2E_FOUNDER_EMAIL ?? '';
const FOUNDER_PASSWORD = process.env.E2E_FOUNDER_PASSWORD ?? '';
const OPS_EMAIL = process.env.E2E_OPS_EMAIL ?? '';
const OPS_PASSWORD = process.env.E2E_OPS_PASSWORD ?? '';

test.skip(
  !FOUNDER_EMAIL || !FOUNDER_PASSWORD || !OPS_EMAIL || !OPS_PASSWORD,
  'E2E_FOUNDER_EMAIL/PASSWORD and E2E_OPS_EMAIL/PASSWORD must be set to run the live journey spec ' +
    '(see the header comment in this file / docs/DEPLOY.md). Skipping rather than failing so this ' +
    'file is safely collectible without live credentials.',
);

// A unique idea per run so re-runs against a shared environment never collide
// on existing rows.
const IDEA_TEXT =
  `E2E journey run ${Date.now()} — a marketplace connecting local independent ` +
  'bakers with nearby customers for same-day pickup and delivery.';

const ANSWER_TEXT = 'We are targeting home bakers and small bakeries in mid-size cities, US-first.';

let projectId = '';
let founderPage: Page;
let founderContext: BrowserContext;
let opsPage: Page;
let opsContext: BrowserContext;

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth');
  // Pre-confirmed accounts sign in directly — no email-confirmation UI/callback exercised here.
  // The "Sign In" tab button and (once active) the "Sign In" submit button
  // render with identical accessible names; `.last()` on DOM order picks the
  // submit button, which is always rendered after the tab switcher.
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.getByPlaceholder(/you@example\.com/i).fill(email);
  await page.getByPlaceholder(/your password/i).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/** Reload the founder's project page until its heading matches, or time out. */
async function waitForFounderHeading(pattern: RegExp, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await founderPage.reload();
      await expect(founderPage.getByRole('heading', { name: pattern })).toBeVisible({ timeout: 5_000 });
      return;
    } catch (err) {
      lastError = err;
      await founderPage.waitForTimeout(3_000);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for heading matching ${pattern}`);
}

test.beforeAll(async ({ browser }) => {
  founderContext = await browser.newContext();
  founderPage = await founderContext.newPage();
  opsContext = await browser.newContext();
  opsPage = await opsContext.newPage();
});

test.afterAll(async () => {
  await founderContext?.close();
  await opsContext?.close();
});

test('founder signs in with a pre-confirmed account', async () => {
  await signIn(founderPage, FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await expect(founderPage.getByRole('heading', { name: /your portfolios/i })).toBeVisible();
});

test('founder creates a portfolio and submits an idea (verdict: accept → intake)', async () => {
  const portfolioName = `E2E Portfolio ${Date.now()}`;
  await founderPage.getByPlaceholder(/new portfolio name/i).fill(portfolioName);
  await founderPage.getByRole('button', { name: /new portfolio/i }).click();
  await expect(founderPage.getByRole('heading', { name: portfolioName })).toBeVisible({ timeout: 15_000 });

  await founderPage.getByRole('button', { name: /\+ new idea/i }).click();
  await founderPage.waitForURL(/\/intake\?portfolio=/);

  await founderPage.getByPlaceholder(/describe your product idea/i).fill(IDEA_TEXT);
  await founderPage.getByRole('button', { name: /submit idea/i }).click();

  // The intake LLM verdict call is real (not mocked) — allow generous time.
  await founderPage.waitForURL(/\/projects\/[0-9a-f-]+/i, { timeout: 60_000 });
  projectId = new URL(founderPage.url()).pathname.split('/').pop() ?? '';
  expect(projectId).not.toBe('');

  await expect(founderPage.getByRole('heading', { name: /the workshop/i })).toBeVisible({ timeout: 15_000 });
});

test('founder completes the Workshop clarifying Q&A (intake → blueprint_ready)', async () => {
  await expect(founderPage.getByRole('heading', { name: /the workshop/i })).toBeVisible();

  // 1–3 clarifying questions, each rendered as a numbered label + text input.
  const answerInputs = founderPage.getByPlaceholder(/your answer/i);
  const count = await answerInputs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await answerInputs.nth(i).fill(ANSWER_TEXT);
  }

  await founderPage.getByRole('button', { name: /generate my blueprint/i }).click();

  // Blueprint generation is a real LLM call — allow generous time; on LLM
  // failure the route falls back to a standard-tier Blueprint and still
  // advances (per design.md), so this heading appears either way.
  await expect(founderPage.getByRole('heading', { name: /your blueprint/i })).toBeVisible({ timeout: 60_000 });
});

test('founder commissions the build (blueprint_ready → commissioned)', async () => {
  await founderPage.getByRole('button', { name: /commission the build/i }).click();
  await expect(founderPage.getByRole('heading', { name: /commission the build/i })).toBeVisible();

  await founderPage.getByRole('checkbox').check();
  await founderPage.getByRole('button', { name: /submit build request/i }).click();

  await expect(founderPage.getByRole('heading', { name: /green-light/i })).toBeVisible({ timeout: 15_000 });
});

test('ops signs in and approves the build with a firm price (commissioned → approved)', async () => {
  await signIn(opsPage, OPS_EMAIL, OPS_PASSWORD);
  await opsPage.goto('/ops');
  await expect(opsPage.getByRole('heading', { name: /ops console/i })).toBeVisible();

  const card = opsPage.locator('div.space-y-3', { hasText: IDEA_TEXT }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByPlaceholder(/firm price/i).fill('7500');
  await card.getByRole('button', { name: /^approve$/i }).click();

  // The card re-renders once the queue reloads; approved projects no longer
  // show the approve/decline controls for this row.
  await expect(card.getByPlaceholder(/firm price/i)).toHaveCount(0, { timeout: 15_000 });
});

test('founder pays via Paystack test-mode checkout (approved → paid via webhook)', async () => {
  await waitForFounderHeading(/approved.*ignition/i, 30_000);

  const [checkoutPage] = await Promise.all([
    founderContext.waitForEvent('page', { timeout: 30_000 }),
    founderPage.getByRole('button', { name: /pay.*ignite/i }).click(),
  ]);
  await checkoutPage.waitForLoadState('domcontentloaded');

  // Paystack hosted-checkout test card (SETUP.md / Design Decision 6). Field
  // labels below are Paystack's commonly-documented placeholders as of this
  // writing; the G-10 E2E Verifier adjusts these if Paystack's checkout DOM
  // has changed since — this one step is the spec's only third-party-UI
  // dependency.
  await checkoutPage.getByPlaceholder(/card number/i).fill('4084 0840 8408 4081');
  await checkoutPage.getByPlaceholder(/mm\/yy|expiry/i).fill('12/30');
  await checkoutPage.getByPlaceholder(/cvv/i).fill('408');
  await checkoutPage.getByRole('button', { name: /pay/i }).click();

  const pinField = checkoutPage.getByPlaceholder(/pin/i);
  if (await pinField.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await pinField.fill('0000');
    await checkoutPage.getByRole('button', { name: /submit|pay/i }).click();
  }
  const otpField = checkoutPage.getByPlaceholder(/otp/i);
  if (await otpField.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await otpField.fill('123456');
    await checkoutPage.getByRole('button', { name: /submit|verify|pay/i }).click();
  }

  // Paystack redirects back to the app; the project flips approved → paid
  // only once the async `charge.success` webhook is fulfilled (needs the
  // public webhook URL/tunnel — Design Decision 6). Poll generously.
  await founderPage.waitForURL(/\/projects\//, { timeout: 60_000 });
  await waitForFounderHeading(/ignition.*clock/i, 120_000);
});

test('ops starts the Forge (paid → building)', async () => {
  await opsPage.reload();
  const card = opsPage.locator('div.space-y-3', { hasText: IDEA_TEXT }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: /start the forge/i }).click();
  await expect(card.getByRole('button', { name: /start the forge/i })).toHaveCount(0, { timeout: 15_000 });
});

test('ops marks the build delivered with staging/repo + Reality Map (building → uat)', async () => {
  await opsPage.reload();
  const card = opsPage.locator('div.space-y-3', { hasText: IDEA_TEXT }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByPlaceholder(/repo url/i).fill('https://github.com/example/e2e-journey-mvp');
  await card.getByPlaceholder(/staging url/i).fill('https://e2e-journey-mvp.example.test');
  await card.getByPlaceholder(/handover guide/i).fill('# Handover\nEverything is set up and ready.');
  await card.getByPlaceholder(/^feature$/i).fill('Bakery listings');
  await card.getByPlaceholder(/^note$/i).fill('Fully functional.');

  await card.getByRole('button', { name: /mark delivered/i }).click();
  await expect(card.getByRole('button', { name: /mark delivered/i })).toHaveCount(0, { timeout: 15_000 });
});

test('founder reviews the delivered MVP and accepts (uat → handover)', async () => {
  await waitForFounderHeading(/proving ground/i, 30_000);
  await founderPage.getByRole('button', { name: /accept & continue/i }).click();
  await expect(founderPage.getByRole('heading', { name: /handover/i })).toBeVisible({ timeout: 15_000 });
});

test('founder takes full ownership to complete the journey (handover → launched)', async () => {
  await founderPage.getByRole('button', { name: /take full ownership/i }).click();
  await expect(founderPage.getByText(/it.?s all yours/i)).toBeVisible({ timeout: 15_000 });
});
