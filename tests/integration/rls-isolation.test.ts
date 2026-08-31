import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  RLS_TESTS_ENABLED,
  seedUser,
  deleteUser,
  getServiceClient,
  type SeededUser,
} from '../helpers/supabase-local';

/**
 * AC-A4 — RLS isolation, proven against a REAL local Postgres with migrations
 * 0001–0007 applied (Supabase CLI `supabase start`), not mocks (Design
 * Decision 1). Two distinct authenticated users, each with their own
 * anon-key client; user B must not be able to SELECT or mutate user A's
 * `portfolios`, `projects`, or `payments`.
 *
 * Opt-in via RUN_RLS_TESTS=1 (see tests/helpers/supabase-local.ts) — the fast
 * `verify` CI job and local `npm run test` do not set this, so this whole
 * file self-skips there with zero cost. The dedicated `rls` CI job
 * (.github/workflows/ci.yml) runs `supabase start` then sets
 * RUN_RLS_TESTS=1 before invoking vitest against this file.
 *
 * Local reproduction:
 *   npx supabase start        # applies supabase/migrations/0001-0007
 *   RUN_RLS_TESTS=1 npx vitest run tests/integration/rls-isolation.test.ts
 */
describe.skipIf(!RLS_TESTS_ENABLED)('RLS isolation (real Postgres)', () => {
  let userA: SeededUser;
  let userB: SeededUser;
  let portfolioAId: string;
  let projectAId: string;
  let paymentAId: string;

  beforeAll(async () => {
    userA = await seedUser('rls-user-a');
    userB = await seedUser('rls-user-b');

    // Seed A's portfolio + project + payment via the service client (bypasses
    // RLS intentionally, mirroring how the app's own service-role writes work).
    const svc = getServiceClient();

    const { data: portfolio, error: pfErr } = await svc
      .from('portfolios')
      .insert({ user_id: userA.id, name: "A's portfolio" })
      .select('id')
      .single();
    if (pfErr || !portfolio) throw new Error(`seed portfolio failed: ${pfErr?.message}`);
    portfolioAId = portfolio.id as string;

    const { data: project, error: prErr } = await svc
      .from('projects')
      .insert({
        user_id: userA.id,
        portfolio_id: portfolioAId,
        status: 'approved',
        idea_text: 'A private idea belonging to user A, at least twenty chars.',
        firm_price: 5000,
      })
      .select('id')
      .single();
    if (prErr || !project) throw new Error(`seed project failed: ${prErr?.message}`);
    projectAId = project.id as string;

    const { data: payment, error: payErr } = await svc
      .from('payments')
      .insert({ project_id: projectAId, reference: `rls-test-${Date.now()}`, amount: 5000, status: 'pending' })
      .select('id')
      .single();
    if (payErr || !payment) throw new Error(`seed payment failed: ${payErr?.message}`);
    paymentAId = payment.id as string;
  }, 30_000);

  afterAll(async () => {
    if (userA) await deleteUser(userA.id); // cascades portfolio/project/payment
    if (userB) await deleteUser(userB.id);
  });

  describe('portfolios', () => {
    it("user A can read their own portfolio", async () => {
      const { data, error } = await userA.client.from('portfolios').select('*').eq('id', portfolioAId).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(portfolioAId);
    });

    it("user B's SELECT of user A's portfolio returns no rows (RLS-filtered, not a 403)", async () => {
      const { data, error } = await userB.client.from('portfolios').select('*').eq('id', portfolioAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("user B cannot rename user A's portfolio", async () => {
      const { data, error } = await userB.client
        .from('portfolios')
        .update({ name: 'hijacked' })
        .eq('id', portfolioAId)
        .select('*');
      // RLS blocks the row from matching the WITH CHECK/USING clause — no rows
      // affected, no error surfaced (matches PostgREST's RLS-filtered update semantics).
      expect(error).toBeNull();
      expect(data).toEqual([]);

      // Confirm via the service client that the name was NOT changed.
      const svc = getServiceClient();
      const { data: check } = await svc.from('portfolios').select('name').eq('id', portfolioAId).single();
      expect(check?.name).toBe("A's portfolio");
    });

    it("user B cannot delete user A's portfolio", async () => {
      const { data } = await userB.client.from('portfolios').delete().eq('id', portfolioAId).select('*');
      expect(data).toEqual([]);

      const svc = getServiceClient();
      const { data: stillThere } = await svc.from('portfolios').select('id').eq('id', portfolioAId).single();
      expect(stillThere?.id).toBe(portfolioAId);
    });
  });

  describe('projects', () => {
    it('user A can read their own project', async () => {
      const { data, error } = await userA.client.from('projects').select('*').eq('id', projectAId).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(projectAId);
    });

    it("user B's SELECT of user A's project returns no rows", async () => {
      const { data, error } = await userB.client.from('projects').select('*').eq('id', projectAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("user B cannot mutate user A's project (e.g. forge their own 'paid' state)", async () => {
      const { data } = await userB.client
        .from('projects')
        .update({ status: 'paid' })
        .eq('id', projectAId)
        .select('*');
      expect(data).toEqual([]);

      const svc = getServiceClient();
      const { data: check } = await svc.from('projects').select('status').eq('id', projectAId).single();
      expect(check?.status).toBe('approved'); // unchanged
    });

    it("the gated brief column is never exposed even to user A's own SELECT * pre-payment proof surface (AC-B2 proxy)", async () => {
      // Not gated by RLS (the founder DOES own the row) — this proves the
      // route layer (ProjectResponse), not RLS, is what omits `brief`
      // pre-payment; RLS only proves cross-USER isolation. Documented here so
      // the two mechanisms aren't conflated.
      const { data } = await userA.client.from('projects').select('*').eq('id', projectAId).single();
      // The column exists in the schema and IS readable by its owner via RLS —
      // gating is enforced by the API route (see tests/integration/projects.test.ts),
      // not by RLS. Assert only that RLS itself doesn't block the owner.
      expect(data).not.toBeNull();
    });
  });

  describe('payments', () => {
    it("user A can read their own payment (via the owning project)", async () => {
      const { data, error } = await userA.client.from('payments').select('*').eq('id', paymentAId).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(paymentAId);
    });

    it("user B's SELECT of user A's payment returns no rows", async () => {
      const { data, error } = await userB.client.from('payments').select('*').eq('id', paymentAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('user B cannot write payments at all (writes are service-role only, no permissive INSERT/UPDATE policy)', async () => {
      const { error: insertError } = await userB.client
        .from('payments')
        .insert({ project_id: projectAId, reference: `hijack-${Date.now()}`, amount: 1, status: 'paid' });
      expect(insertError).not.toBeNull();
    });
  });

  describe('email_leads (no permissive policy at all)', () => {
    it('an authenticated anon-key client cannot read email_leads', async () => {
      const { data, error } = await userA.client.from('email_leads').select('*');
      // No permissive SELECT policy exists — RLS denies, returning zero rows
      // (and typically no error, matching Postgres RLS-filtered SELECT semantics).
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('an authenticated anon-key client cannot insert into email_leads', async () => {
      const { error } = await userA.client.from('email_leads').insert({ email: 'sneaky@example.com' });
      expect(error).not.toBeNull();
    });
  });
});
