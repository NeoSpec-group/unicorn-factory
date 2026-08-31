import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';
import { GET as listPortfolios, POST as createPortfolio } from '@/app/api/portfolios/route';
import { PATCH as renamePortfolio } from '@/app/api/portfolios/[id]/route';

import { createFakeSupabaseClient, authedUser, unauthenticated, ok, fail } from '../helpers/mocks';
import { makeRequest, makeMalformedJsonRequest, routeParams } from '../helpers/request';
import { makeUser, makePortfolio } from '../helpers/factories';

function setClient(config: Parameters<typeof createFakeSupabaseClient>[0]) {
  vi.mocked(createServerClient).mockReturnValue(createFakeSupabaseClient(config) as never);
}

beforeEach(() => {
  vi.mocked(createServerClient).mockReset();
});

describe('GET /api/portfolios', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await listPortfolios(makeRequest('/api/portfolios'));
    expect(res.status).toBe(401);
  });

  it('200s with portfolios + their ideas, scoped by RLS to the caller', async () => {
    const user = makeUser();
    const pf = makePortfolio({ user_id: user.id });
    setClient({
      auth: authedUser(user),
      from: {
        portfolios: [ok([pf])],
        projects: [ok([])],
      },
    });
    const res = await listPortfolios(makeRequest('/api/portfolios'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portfolios).toEqual([{ id: pf.id, name: pf.name, createdAt: pf.created_at, ideas: [] }]);
  });

  it('500s when the underlying query fails', async () => {
    setClient({
      auth: authedUser(makeUser()),
      from: { portfolios: [fail('db down')], projects: [ok([])] },
    });
    const res = await listPortfolios(makeRequest('/api/portfolios'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/portfolios', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await createPortfolio(
      makeRequest('/api/portfolios', { method: 'POST', body: { name: 'New idea bucket' } }),
    );
    expect(res.status).toBe(401);
  });

  it('400s on invalid JSON', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createPortfolio(makeMalformedJsonRequest('/api/portfolios'));
    expect(res.status).toBe(400);
  });

  it('400s on an empty name', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createPortfolio(
      makeRequest('/api/portfolios', { method: 'POST', body: { name: '   ' } }),
    );
    expect(res.status).toBe(400);
  });

  it('400s on a name over 80 chars', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createPortfolio(
      makeRequest('/api/portfolios', { method: 'POST', body: { name: 'x'.repeat(81) } }),
    );
    expect(res.status).toBe(400);
  });

  it('201s and creates a portfolio for the caller', async () => {
    const user = makeUser();
    const pf = makePortfolio({ user_id: user.id, name: 'New idea bucket' });
    setClient({ auth: authedUser(user), from: { portfolios: [ok(pf)] } });
    const res = await createPortfolio(
      makeRequest('/api/portfolios', { method: 'POST', body: { name: 'New idea bucket' } }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(pf);
  });
});

describe('PATCH /api/portfolios/[id]', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await renamePortfolio(
      makeRequest('/api/portfolios/pf1', { method: 'PATCH', body: { name: 'Renamed' } }),
      routeParams('pf1'),
    );
    expect(res.status).toBe(401);
  });

  it('400s on an empty name', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await renamePortfolio(
      makeRequest('/api/portfolios/pf1', { method: 'PATCH', body: { name: '' } }),
      routeParams('pf1'),
    );
    expect(res.status).toBe(400);
  });

  it('404s when not found or not owned (RLS-scoped update)', async () => {
    setClient({ auth: authedUser(makeUser()), from: { portfolios: [ok(null)] } });
    const res = await renamePortfolio(
      makeRequest('/api/portfolios/not-mine', { method: 'PATCH', body: { name: 'Renamed' } }),
      routeParams('not-mine'),
    );
    expect(res.status).toBe(404);
  });

  it('200s and renames the portfolio', async () => {
    const user = makeUser();
    const pf = makePortfolio({ user_id: user.id, name: 'Renamed' });
    setClient({ auth: authedUser(user), from: { portfolios: [ok(pf)] } });
    const res = await renamePortfolio(
      makeRequest(`/api/portfolios/${pf.id}`, { method: 'PATCH', body: { name: 'Renamed' } }),
      routeParams(pf.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(pf);
  });
});
