import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/supabase/service', () => ({ getServiceSupabase: vi.fn() }));
vi.mock('@/lib/paystack', () => ({ paystackInitialize: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { paystackInitialize } from '@/lib/paystack';
import { POST as checkout } from '@/app/api/projects/[id]/checkout/route';

import { createFakeSupabaseClient, authedUser, unauthenticated, ok } from '../helpers/mocks';
import { makeRequest, routeParams } from '../helpers/request';
import { makeUser, makeProject } from '../helpers/factories';

function setClient(config: Parameters<typeof createFakeSupabaseClient>[0]) {
  vi.mocked(createServerClient).mockReturnValue(createFakeSupabaseClient(config) as never);
}
function setService(config: Parameters<typeof createFakeSupabaseClient>[0] = {}) {
  vi.mocked(getServiceSupabase).mockReturnValue(createFakeSupabaseClient(config) as never);
}

beforeEach(() => {
  vi.mocked(createServerClient).mockReset();
  vi.mocked(getServiceSupabase).mockReset();
  vi.mocked(paystackInitialize).mockReset();
});

describe('POST /api/projects/[id]/checkout', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await checkout(makeRequest('/api/projects/p1/checkout', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('404s when the project does not exist', async () => {
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await checkout(makeRequest('/api/projects/p1/checkout', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(404);
  });

  it('404s for a non-owner (RLS masks the row before the ownership check)', async () => {
    const project = makeProject({ user_id: 'someone-else', status: 'approved', firm_price: 5000 });
    // RLS-scoped client returns zero rows for a non-owner, not the mismatched-owner row.
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(404);
  });

  it('409s when status is not approved', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'commissioned', firm_price: null });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('409s when approved but firm_price is still null', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'approved', firm_price: null });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('400s when the account has no email on file', async () => {
    const user = makeUser();
    delete (user as { email?: string }).email;
    const project = makeProject({ user_id: user.id, status: 'approved', firm_price: 5000 });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(400);
  });

  it('502s when Paystack initialization fails', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'approved', firm_price: 5000 });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    vi.mocked(paystackInitialize).mockResolvedValue(null);

    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(502);
  });

  it('200s with the hosted checkout URL and records a pending payment (service client)', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'approved', firm_price: 5000 });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    setService({ from: { payments: [ok(null)] } });
    vi.mocked(paystackInitialize).mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc123',
      reference: 'uf_ref_abc123',
    });

    const res = await checkout(
      makeRequest(`/api/projects/${project.id}/checkout`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.paystack.com/abc123' });
    expect(vi.mocked(paystackInitialize)).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 5000 * 100, currency: 'USD', email: user.email }),
    );
  });
});
