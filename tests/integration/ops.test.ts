import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ops', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ops')>();
  return { ...actual, getOpsUser: vi.fn() };
});
vi.mock('@/lib/supabase/service', () => ({ getServiceSupabase: vi.fn() }));

import { getOpsUser } from '@/lib/ops';
import { getServiceSupabase } from '@/lib/supabase/service';
import { GET as getOpsProjects } from '@/app/api/ops/projects/route';
import { POST as opsAction } from '@/app/api/ops/projects/[id]/route';

import { createFakeSupabaseClient, ok, fail } from '../helpers/mocks';
import { makeRequest, makeMalformedJsonRequest, routeParams } from '../helpers/request';
import { makeProject } from '../helpers/factories';

function setService(config: Parameters<typeof createFakeSupabaseClient>[0]) {
  vi.mocked(getServiceSupabase).mockReturnValue(createFakeSupabaseClient(config) as never);
}

function asOps() {
  vi.mocked(getOpsUser).mockResolvedValue({ userId: 'ops-user-1' });
}
function asUnauth() {
  vi.mocked(getOpsUser).mockResolvedValue({ error: 'Unauthorized', status: 401 });
}
function asNonOps() {
  vi.mocked(getOpsUser).mockResolvedValue({ error: 'Forbidden — ops access required.', status: 403 });
}

beforeEach(() => {
  vi.mocked(getOpsUser).mockReset();
  vi.mocked(getServiceSupabase).mockReset();
});

// ============================================================
// GET /api/ops/projects
// ============================================================
describe('GET /api/ops/projects', () => {
  it('401s when unauthenticated', async () => {
    asUnauth();
    const res = await getOpsProjects(makeRequest('/api/ops/projects'));
    expect(res.status).toBe(401);
  });

  it('403s when authenticated but not ops role', async () => {
    asNonOps();
    const res = await getOpsProjects(makeRequest('/api/ops/projects'));
    expect(res.status).toBe(403);
  });

  it('200s with the ops queue for an ops user', async () => {
    asOps();
    const p = makeProject({ status: 'commissioned' });
    setService({ from: { projects: [ok([p])] } });

    const res = await getOpsProjects(makeRequest('/api/ops/projects'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]).toMatchObject({ id: p.id, status: 'commissioned' });
  });
});

// ============================================================
// POST /api/ops/projects/[id]
// ============================================================
describe('POST /api/ops/projects/[id]', () => {
  it('401s when unauthenticated', async () => {
    asUnauth();
    const res = await opsAction(
      makeRequest('/api/ops/projects/p1', { method: 'POST', body: { action: 'approve', firmPrice: 5000 } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(401);
  });

  it('403s when authenticated but not ops role', async () => {
    asNonOps();
    const res = await opsAction(
      makeRequest('/api/ops/projects/p1', { method: 'POST', body: { action: 'approve', firmPrice: 5000 } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(403);
  });

  it('400s on invalid JSON', async () => {
    asOps();
    const res = await opsAction(makeMalformedJsonRequest('/api/ops/projects/p1'), routeParams('p1'));
    expect(res.status).toBe(400);
  });

  it('404s when the project does not exist', async () => {
    asOps();
    setService({ from: { projects: [ok(null)] } });
    const res = await opsAction(
      makeRequest('/api/ops/projects/p1', { method: 'POST', body: { action: 'approve', firmPrice: 5000 } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(404);
  });

  it('400s on an unknown action', async () => {
    asOps();
    const project = makeProject({ status: 'commissioned' });
    setService({ from: { projects: [ok(project)] } });
    const res = await opsAction(
      makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'nuke' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(400);
  });

  describe('action=approve', () => {
    it('409s when not in commissioned', async () => {
      asOps();
      const project = makeProject({ status: 'paid' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'approve', firmPrice: 5000 } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(409);
    });

    it('400s on a non-positive firm price', async () => {
      asOps();
      const project = makeProject({ status: 'commissioned' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'approve', firmPrice: 0 } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(400);
    });

    it('200s and advances commissioned → approved with firm_price set', async () => {
      asOps();
      const project = makeProject({ status: 'commissioned' });
      setService({ from: { projects: [ok(project), ok(null)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'approve', firmPrice: 7500 } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, status: 'approved' });
    });
  });

  describe('action=decline', () => {
    it('409s when not in commissioned', async () => {
      asOps();
      const project = makeProject({ status: 'approved' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'decline' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(409);
    });

    it('200s and advances commissioned → declined (terminal)', async () => {
      asOps();
      const project = makeProject({ status: 'commissioned' });
      setService({ from: { projects: [ok(project), ok(null)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'decline' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, status: 'declined' });
    });
  });

  describe('action=forge', () => {
    it('409s when not in paid', async () => {
      asOps();
      const project = makeProject({ status: 'approved' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'forge' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(409);
    });

    it('200s and advances paid → building', async () => {
      asOps();
      const project = makeProject({ status: 'paid' });
      setService({ from: { projects: [ok(project), ok(null)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'forge' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, status: 'building' });
    });
  });

  describe('action=reforge', () => {
    it('409s when not in uat', async () => {
      asOps();
      const project = makeProject({ status: 'building' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'reforge' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(409);
    });

    it('200s and re-advances uat → building (revision round)', async () => {
      asOps();
      const project = makeProject({ status: 'uat' });
      setService({ from: { projects: [ok(project), ok(null)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'reforge' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, status: 'building' });
    });
  });

  describe('action=deliver', () => {
    it('409s when not in building', async () => {
      asOps();
      const project = makeProject({ status: 'paid' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, {
          method: 'POST',
          body: { action: 'deliver', stagingUrl: 'https://staging.example.com' },
        }),
        routeParams(project.id),
      );
      expect(res.status).toBe(409);
    });

    it('400s when stagingUrl is missing', async () => {
      asOps();
      const project = makeProject({ status: 'building' });
      setService({ from: { projects: [ok(project)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'deliver' } }),
        routeParams(project.id),
      );
      expect(res.status).toBe(400);
    });

    it('200s and advances building → uat with repo/staging + Reality Map recorded', async () => {
      asOps();
      const project = makeProject({ status: 'building' });
      setService({ from: { projects: [ok(project), ok(null)] } });
      const res = await opsAction(
        makeRequest(`/api/ops/projects/${project.id}`, {
          method: 'POST',
          body: {
            action: 'deliver',
            repoUrl: 'https://github.com/example/repo',
            stagingUrl: 'https://staging.example.com',
            handoverDoc: 'Here is how it works.',
            realityMap: [{ feature: 'Auth', status: 'real', note: 'Fully wired.' }],
          },
        }),
        routeParams(project.id),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, status: 'uat' });
    });
  });

  it('500s when the underlying update fails', async () => {
    asOps();
    const project = makeProject({ status: 'commissioned' });
    setService({ from: { projects: [ok(project), fail('db down')] } });
    const res = await opsAction(
      makeRequest(`/api/ops/projects/${project.id}`, { method: 'POST', body: { action: 'approve', firmPrice: 5000 } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(500);
  });
});
