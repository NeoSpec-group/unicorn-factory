import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/ai/client', () => ({ callLLM: vi.fn(), parseLLMJson: vi.fn() }));
vi.mock('@/lib/ai/blueprint', () => ({ generateBlueprint: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';
import { callLLM, parseLLMJson } from '@/lib/ai/client';
import { generateBlueprint } from '@/lib/ai/blueprint';

import { POST as createProject } from '@/app/api/projects/route';
import { GET as getProject } from '@/app/api/projects/[id]/route';
import { POST as submitAnswers } from '@/app/api/projects/[id]/submit-answers/route';
import { GET as getQuestions } from '@/app/api/projects/[id]/questions/route';
import { POST as commission } from '@/app/api/projects/[id]/commission/route';
import { POST as park } from '@/app/api/projects/[id]/park/route';
import { POST as accept } from '@/app/api/projects/[id]/accept/route';
import { POST as reportIssue } from '@/app/api/projects/[id]/report-issue/route';
import { POST as finish } from '@/app/api/projects/[id]/finish/route';

import { createFakeSupabaseClient, authedUser, unauthenticated, ok, fail } from '../helpers/mocks';
import { makeRequest, makeMalformedJsonRequest, routeParams } from '../helpers/request';
import { makeUser, makeProject, makeIdeaText } from '../helpers/factories';

function setClient(config: Parameters<typeof createFakeSupabaseClient>[0]) {
  vi.mocked(createServerClient).mockReturnValue(createFakeSupabaseClient(config) as never);
}

beforeEach(() => {
  vi.mocked(createServerClient).mockReset();
  vi.mocked(callLLM).mockReset();
  vi.mocked(parseLLMJson).mockReset();
  vi.mocked(generateBlueprint).mockReset();
});

// ============================================================
// POST /api/projects
// ============================================================
describe('POST /api/projects', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await createProject(
      makeRequest('/api/projects', { method: 'POST', body: { ideaText: makeIdeaText(30), portfolioId: 'p1' } }),
    );
    expect(res.status).toBe(401);
  });

  it('400s on invalid JSON body', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createProject(makeMalformedJsonRequest('/api/projects'));
    expect(res.status).toBe(400);
  });

  it('400s when ideaText is under 20 chars', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createProject(
      makeRequest('/api/projects', { method: 'POST', body: { ideaText: 'too short', portfolioId: 'p1' } }),
    );
    expect(res.status).toBe(400);
  });

  it('400s when ideaText is over 500 chars', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(501), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400s when portfolioId is missing', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await createProject(
      makeRequest('/api/projects', { method: 'POST', body: { ideaText: makeIdeaText(30) } }),
    );
    expect(res.status).toBe(400);
  });

  it('404s when the portfolio is not found / not owned', async () => {
    setClient({ auth: authedUser(makeUser()), from: { portfolios: [ok(null)] } });
    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'not-mine' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('502s when the LLM is unavailable', async () => {
    setClient({ auth: authedUser(makeUser()), from: { portfolios: [ok({ id: 'p1' })] } });
    vi.mocked(callLLM).mockRejectedValue(new Error('network down'));

    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(502);
  });

  it('502s when the LLM output is unparseable (after retry)', async () => {
    setClient({ auth: authedUser(makeUser()), from: { portfolios: [ok({ id: 'p1' })] } });
    vi.mocked(callLLM).mockResolvedValue('not json');
    vi.mocked(parseLLMJson).mockReturnValue(null);

    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(502);
    expect(vi.mocked(callLLM)).toHaveBeenCalledTimes(2); // one retry
  });

  it('200s with verdict decline and does NOT create a project', async () => {
    setClient({ auth: authedUser(makeUser()), from: { portfolios: [ok({ id: 'p1' })] } });
    vi.mocked(callLLM).mockResolvedValue('{"verdict":"decline","reason":"not software"}');
    vi.mocked(parseLLMJson).mockReturnValue({ verdict: 'decline', reason: 'not software' });

    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ verdict: 'decline', reason: 'not software' });
  });

  it('201s with verdict accept and creates a project', async () => {
    setClient({
      auth: authedUser(makeUser()),
      from: {
        portfolios: [ok({ id: 'p1' })],
        projects: [ok({ id: 'new-project-id' })],
      },
    });
    vi.mocked(callLLM).mockResolvedValue('{"verdict":"accept","reason":"good idea"}');
    vi.mocked(parseLLMJson).mockReturnValue({ verdict: 'accept', reason: 'good idea' });

    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ projectId: 'new-project-id', verdict: 'accept', reason: 'good idea' });
  });

  it('500s when the insert fails after an accept verdict', async () => {
    setClient({
      auth: authedUser(makeUser()),
      from: {
        portfolios: [ok({ id: 'p1' })],
        projects: [fail('insert failed')],
      },
    });
    vi.mocked(callLLM).mockResolvedValue('{"verdict":"accept","reason":"good idea"}');
    vi.mocked(parseLLMJson).mockReturnValue({ verdict: 'accept', reason: 'good idea' });

    const res = await createProject(
      makeRequest('/api/projects', {
        method: 'POST',
        body: { ideaText: makeIdeaText(30), portfolioId: 'p1' },
      }),
    );
    expect(res.status).toBe(500);
  });
});

// ============================================================
// GET /api/projects/[id]
// ============================================================
describe('GET /api/projects/[id]', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await getProject(makeRequest('/api/projects/p1'), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('404s when not found or not owned (own-scoped query, not 403)', async () => {
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await getProject(makeRequest('/api/projects/p1'), routeParams('p1'));
    expect(res.status).toBe(404);
  });

  it('200s with the ProjectResponse shape and never includes the gated brief', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'blueprint_ready', tier: 'standard' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });

    const res = await getProject(makeRequest(`/api/projects/${project.id}`), routeParams(project.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty('brief');
    expect(body).toMatchObject({
      id: project.id,
      status: 'blueprint_ready',
      ideaText: project.idea_text,
      estimate: { tier: 'standard', low: null, high: null, firmPrice: null },
    });
  });
});

// ============================================================
// POST /api/projects/[id]/submit-answers
// ============================================================
describe('POST /api/projects/[id]/submit-answers', () => {
  const validAnswers = { answers: [{ question: 'Who is it for?', answer: 'Small bakeries.' }] };

  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await submitAnswers(
      makeRequest('/api/projects/p1/submit-answers', { method: 'POST', body: validAnswers }),
      routeParams('p1'),
    );
    expect(res.status).toBe(401);
  });

  it('400s on invalid JSON', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await submitAnswers(
      makeMalformedJsonRequest('/api/projects/p1/submit-answers'),
      routeParams('p1'),
    );
    expect(res.status).toBe(400);
  });

  it('400s when answers is empty', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await submitAnswers(
      makeRequest('/api/projects/p1/submit-answers', { method: 'POST', body: { answers: [] } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(400);
  });

  it('400s when any answer is blank', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await submitAnswers(
      makeRequest('/api/projects/p1/submit-answers', {
        method: 'POST',
        body: { answers: [{ question: 'Q1', answer: '   ' }] },
      }),
      routeParams('p1'),
    );
    expect(res.status).toBe(400);
  });

  it('404s when the project does not exist', async () => {
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await submitAnswers(
      makeRequest('/api/projects/p1/submit-answers', { method: 'POST', body: validAnswers }),
      routeParams('p1'),
    );
    expect(res.status).toBe(404);
  });

  it('403s when the project belongs to a different user', async () => {
    const project = makeProject({ user_id: 'someone-else' });
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(project)] } });
    const res = await submitAnswers(
      makeRequest(`/api/projects/${project.id}/submit-answers`, { method: 'POST', body: validAnswers }),
      routeParams(project.id),
    );
    expect(res.status).toBe(403);
  });

  it('409s when the project status is not intake', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'blueprint_ready' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await submitAnswers(
      makeRequest(`/api/projects/${project.id}/submit-answers`, { method: 'POST', body: validAnswers }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s and advances to blueprint_ready on successful LLM generation', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'intake' });
    setClient({
      auth: authedUser(user),
      from: { projects: [ok(project), ok(null)] }, // fetch, then update (thenable, no .single())
    });
    vi.mocked(generateBlueprint).mockResolvedValue({
      blueprint: { refinedIdea: 'Refined.', targetUsers: 'Bakers.', keyFeatures: ['f1'], roadmap: [{ title: 't', detail: 'd' }] },
      brief: { problem: 'p', targetUsers: 'u', coreFeatures: [], outOfScope: [], successCriteria: [] },
      tier: 'spark',
    });

    const res = await submitAnswers(
      makeRequest(`/api/projects/${project.id}/submit-answers`, { method: 'POST', body: validAnswers }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, nextStatus: 'blueprint_ready' });
  });

  it('falls back to a standard-tier default Blueprint on LLM failure and STILL advances to blueprint_ready (never hard-blocks)', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'intake' });
    setClient({
      auth: authedUser(user),
      from: { projects: [ok(project), ok(null)] },
    });
    vi.mocked(generateBlueprint).mockResolvedValue(null);

    const res = await submitAnswers(
      makeRequest(`/api/projects/${project.id}/submit-answers`, { method: 'POST', body: validAnswers }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, nextStatus: 'blueprint_ready' });
  });

  it('500s when the update fails', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'intake' });
    setClient({
      auth: authedUser(user),
      from: { projects: [ok(project), fail('db down')] },
    });
    vi.mocked(generateBlueprint).mockResolvedValue(null);

    const res = await submitAnswers(
      makeRequest(`/api/projects/${project.id}/submit-answers`, { method: 'POST', body: validAnswers }),
      routeParams(project.id),
    );
    expect(res.status).toBe(500);
  });
});

// ============================================================
// GET /api/projects/[id]/questions
// ============================================================
describe('GET /api/projects/[id]/questions', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await getQuestions(makeRequest('/api/projects/p1/questions'), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('404s when the project does not exist', async () => {
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await getQuestions(makeRequest('/api/projects/p1/questions'), routeParams('p1'));
    expect(res.status).toBe(404);
  });

  it('403s when the project belongs to a different user', async () => {
    const project = makeProject({ user_id: 'someone-else' });
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(project)] } });
    const res = await getQuestions(makeRequest(`/api/projects/${project.id}/questions`), routeParams(project.id));
    expect(res.status).toBe(403);
  });

  it('200s with cached questions when already generated', async () => {
    const user = makeUser();
    const project = makeProject({
      user_id: user.id,
      clarifying_questions: [{ question: 'Q1?', answer: null }],
    });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await getQuestions(makeRequest(`/api/projects/${project.id}/questions`), routeParams(project.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ questions: ['Q1?'] });
  });

  it('200s generating fresh questions via the LLM when none are cached', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, clarifying_questions: null });
    setClient({
      auth: authedUser(user),
      from: { projects: [ok(project), ok(null)] }, // fetch, then cache-update
    });
    vi.mocked(callLLM).mockResolvedValue('{"questions":["Q1?","Q2?","Q3?"]}');
    vi.mocked(parseLLMJson).mockReturnValue({ questions: ['Q1?', 'Q2?', 'Q3?'] });

    const res = await getQuestions(makeRequest(`/api/projects/${project.id}/questions`), routeParams(project.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ questions: ['Q1?', 'Q2?', 'Q3?'] });
  });
});

// ============================================================
// POST /api/projects/[id]/commission
// ============================================================
describe('POST /api/projects/[id]/commission', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await commission(makeRequest('/api/projects/p1/commission', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('404s when not found', async () => {
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(null)] } });
    const res = await commission(makeRequest('/api/projects/p1/commission', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(404);
  });

  it('403s for a non-owner', async () => {
    const project = makeProject({ user_id: 'someone-else', status: 'blueprint_ready' });
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(project)] } });
    const res = await commission(
      makeRequest(`/api/projects/${project.id}/commission`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(403);
  });

  it('409s when not in blueprint_ready', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'intake' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await commission(
      makeRequest(`/api/projects/${project.id}/commission`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s and advances blueprint_ready → commissioned', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'blueprint_ready' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await commission(
      makeRequest(`/api/projects/${project.id}/commission`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'commissioned' });
  });
});

// ============================================================
// POST /api/projects/[id]/park
// ============================================================
describe('POST /api/projects/[id]/park', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await park(makeRequest('/api/projects/p1/park', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('409s when not in blueprint_ready', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'commissioned' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await park(
      makeRequest(`/api/projects/${project.id}/park`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s and advances blueprint_ready → parked (terminal)', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'blueprint_ready' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await park(
      makeRequest(`/api/projects/${project.id}/park`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'parked' });
  });
});

// ============================================================
// POST /api/projects/[id]/accept
// ============================================================
describe('POST /api/projects/[id]/accept', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await accept(makeRequest('/api/projects/p1/accept', { method: 'POST' }), routeParams('p1'));
    expect(res.status).toBe(401);
  });

  it('403s for a non-owner', async () => {
    const project = makeProject({ user_id: 'someone-else', status: 'uat' });
    setClient({ auth: authedUser(makeUser()), from: { projects: [ok(project)] } });
    const res = await accept(
      makeRequest(`/api/projects/${project.id}/accept`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(403);
  });

  it('409s when not in uat', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'building' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await accept(
      makeRequest(`/api/projects/${project.id}/accept`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s and advances uat → handover', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'uat' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await accept(
      makeRequest(`/api/projects/${project.id}/accept`, { method: 'POST' }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'handover' });
  });
});

// ============================================================
// POST /api/projects/[id]/report-issue
// ============================================================
describe('POST /api/projects/[id]/report-issue', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await reportIssue(
      makeRequest('/api/projects/p1/report-issue', { method: 'POST', body: { note: 'broken' } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(401);
  });

  it('400s on invalid JSON', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await reportIssue(makeMalformedJsonRequest('/api/projects/p1/report-issue'), routeParams('p1'));
    expect(res.status).toBe(400);
  });

  it('400s on a blank note', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await reportIssue(
      makeRequest('/api/projects/p1/report-issue', { method: 'POST', body: { note: '   ' } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(400);
  });

  it('409s when not in uat', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'handover' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await reportIssue(
      makeRequest(`/api/projects/${project.id}/report-issue`, { method: 'POST', body: { note: 'broken' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s and records the note while status stays uat', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'uat' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await reportIssue(
      makeRequest(`/api/projects/${project.id}/report-issue`, { method: 'POST', body: { note: 'broken' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});

// ============================================================
// POST /api/projects/[id]/finish
// ============================================================
describe('POST /api/projects/[id]/finish', () => {
  it('401s when unauthenticated', async () => {
    setClient({ auth: unauthenticated() });
    const res = await finish(
      makeRequest('/api/projects/p1/finish', { method: 'POST', body: { choice: 'launch' } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(401);
  });

  it('400s on an invalid choice', async () => {
    setClient({ auth: authedUser(makeUser()) });
    const res = await finish(
      makeRequest('/api/projects/p1/finish', { method: 'POST', body: { choice: 'bogus' } }),
      routeParams('p1'),
    );
    expect(res.status).toBe(400);
  });

  it('409s when not in handover', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'uat' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project)] } });
    const res = await finish(
      makeRequest(`/api/projects/${project.id}/finish`, { method: 'POST', body: { choice: 'launch' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(409);
  });

  it('200s launched on choice=launch', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'handover' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await finish(
      makeRequest(`/api/projects/${project.id}/finish`, { method: 'POST', body: { choice: 'launch' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'launched' });
  });

  it('200s managed on choice=managed', async () => {
    const user = makeUser();
    const project = makeProject({ user_id: user.id, status: 'handover' });
    setClient({ auth: authedUser(user), from: { projects: [ok(project), ok(null)] } });
    const res = await finish(
      makeRequest(`/api/projects/${project.id}/finish`, { method: 'POST', body: { choice: 'managed' } }),
      routeParams(project.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'managed' });
  });
});
