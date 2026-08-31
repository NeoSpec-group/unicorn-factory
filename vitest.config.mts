import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Unit + route-handler integration tests only (server logic, no DOM).
// `tests/integration/rls-isolation.test.ts` self-skips unless RUN_RLS_TESTS=1
// is set (see tests/helpers/supabase-local.ts) — it needs a real local
// Postgres (via `supabase start`) and is exercised by the dedicated CI `rls`
// job, not the fast `verify` job. E2E (Playwright) lives in `e2e/` and is
// intentionally out of this config's scope (see playwright.config.ts).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
    globals: false,
    testTimeout: 10000,
  },
});
