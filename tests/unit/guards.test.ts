import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';
import { getOpsUser, isOpsError } from '@/lib/ops';
import { createFakeSupabaseClient, authedUser, unauthenticated, ok } from '../helpers/mocks';
import { makeRequest } from '../helpers/request';
import { makeUser } from '../helpers/factories';

describe('lib/ops — getOpsUser guard', () => {
  beforeEach(() => {
    vi.mocked(createServerClient).mockReset();
  });

  it('returns { error, status: 401 } when unauthenticated', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      createFakeSupabaseClient({ auth: unauthenticated() }) as never,
    );

    const auth = await getOpsUser(makeRequest('/api/ops/projects'));
    expect(isOpsError(auth)).toBe(true);
    if (isOpsError(auth)) {
      expect(auth.status).toBe(401);
    }
  });

  it('returns { error, status: 403 } when authenticated but role !== ops', async () => {
    const user = makeUser();
    vi.mocked(createServerClient).mockReturnValue(
      createFakeSupabaseClient({
        auth: authedUser(user),
        from: { profiles: [ok({ role: 'founder' })] },
      }) as never,
    );

    const auth = await getOpsUser(makeRequest('/api/ops/projects'));
    expect(isOpsError(auth)).toBe(true);
    if (isOpsError(auth)) {
      expect(auth.status).toBe(403);
    }
  });

  it('returns { error, status: 403 } when the profile row is missing entirely', async () => {
    const user = makeUser();
    vi.mocked(createServerClient).mockReturnValue(
      createFakeSupabaseClient({
        auth: authedUser(user),
        from: { profiles: [ok(null)] },
      }) as never,
    );

    const auth = await getOpsUser(makeRequest('/api/ops/projects'));
    expect(isOpsError(auth)).toBe(true);
    if (isOpsError(auth)) {
      expect(auth.status).toBe(403);
    }
  });

  it('returns { userId } when authenticated with role === ops', async () => {
    const user = makeUser();
    vi.mocked(createServerClient).mockReturnValue(
      createFakeSupabaseClient({
        auth: authedUser(user),
        from: { profiles: [ok({ role: 'ops' })] },
      }) as never,
    );

    const auth = await getOpsUser(makeRequest('/api/ops/projects'));
    expect(isOpsError(auth)).toBe(false);
    if (!isOpsError(auth)) {
      expect(auth.userId).toBe(user.id);
    }
  });
});

describe('isOpsError type guard', () => {
  it('distinguishes the error shape from the success shape', () => {
    expect(isOpsError({ error: 'Forbidden', status: 403 })).toBe(true);
    expect(isOpsError({ userId: 'abc' })).toBe(false);
  });
});
