import { defineConfig, devices } from '@playwright/test';

// E2E config for the Intake→Launch journey (founder + ops). Not run by the
// blocking CI PR pipeline (see .github/workflows/ci.yml) — needs live
// Anthropic + Paystack test mode + a public webhook URL/tunnel. Executed by
// the G-10 E2E Verifier with captured evidence (Design Decision 1).
//
// Required env (see .env.example):
//   NEXT_PUBLIC_SITE_URL       — base URL the app is served from (defaults to
//                                 http://localhost:3000 for the local webServer)
//   E2E_FOUNDER_EMAIL/PASSWORD — pre-confirmed founder test account
//   E2E_OPS_EMAIL/PASSWORD     — pre-confirmed ops-role test account
//   PAYSTACK_SECRET_KEY etc.   — test-mode keys (already required by the app)
const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the journey spec drives a single project through
  // sequential states — parallel workers would race the same project.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Boot the app locally unless a live URL is already provided (CI/E2E
  // verification against a deployed or tunneled instance sets
  // NEXT_PUBLIC_SITE_URL and skips the local webServer).
  webServer: process.env.NEXT_PUBLIC_SITE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
