import { createClient } from '@supabase/supabase-js';

/**
 * Harness for `tests/integration/rls-isolation.test.ts` (AC-A4). Runs against
 * a REAL local Postgres with migrations 0001–0007 applied, started via the
 * Supabase CLI (`supabase start` — see `supabase/config.toml`).
 *
 * This suite is opt-in: it only runs when `RUN_RLS_TESTS=1` is set. The fast
 * `verify` CI job (and local `npm run test`) does not set this, so the file
 * is collected but every test self-skips there — zero cost, zero flake, no
 * Docker requirement for the common path. The dedicated `rls` CI job (and
 * anyone locally running `supabase start` first) sets `RUN_RLS_TESTS=1` to
 * actually exercise it (Design Decision 1).
 *
 * Defaults below are the standard `supabase start` local dev credentials
 * (well-known, non-secret demo JWTs — not project secrets) so the suite
 * works out of the box against a freshly-started local stack.
 */
export const RLS_TESTS_ENABLED = process.env.RUN_RLS_TESTS === '1';

const LOCAL_API_URL = process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  process.env.SUPABASE_LOCAL_ANON_KEY ??
  // Standard `supabase start` demo anon key (printed by the CLI; not a secret).
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_ROLE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
  // Standard `supabase start` demo service_role key (printed by the CLI; not a secret).
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export function getServiceClient() {
  return createClient(LOCAL_API_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAnonClient() {
  return createClient(LOCAL_API_URL, LOCAL_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  /** Anon-key client signed in as this user (per Design Decision 4: pre-confirmed via admin API). */
  client: ReturnType<typeof getAnonClient>;
}

/**
 * Create + pre-confirm a throwaway user via the admin API (Design Decision 4
 * — E2E/test accounts skip the inbox-confirmation wait), then sign in an
 * anon-key client as that user.
 */
export async function seedUser(label: string): Promise<SeededUser> {
  const svc = getServiceClient();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = 'Test-Password-1234!';

  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`[supabase-local] failed to seed user ${label}: ${error?.message}`);
  }

  const client = getAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`[supabase-local] failed to sign in seeded user ${label}: ${signInError.message}`);
  }

  return { id: data.user.id, email, password, client };
}

/** Clean up a seeded user (cascades to their portfolios/projects/payments via FK ON DELETE CASCADE). */
export async function deleteUser(userId: string): Promise<void> {
  const svc = getServiceClient();
  await svc.auth.admin.deleteUser(userId);
}
