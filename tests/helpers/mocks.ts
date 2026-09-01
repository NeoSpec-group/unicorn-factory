import { vi } from 'vitest';

/**
 * Test doubles for the Supabase boundary (`@/lib/supabase/server`,
 * `@/lib/supabase/service`) used by the route-handler integration suite.
 * Route handlers are invoked directly with these mocked at the module
 * boundary (Design Decision 1) so the auth/role/ownership/state-guard
 * branches are driven deterministically, with no live network/DB.
 *
 * Usage in a test file:
 *
 *   vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
 *   import { createServerClient } from '@/lib/supabase/server';
 *   import { createFakeSupabaseClient, authedUser, FakeQueryBuilder } from '../helpers/mocks';
 *
 *   vi.mocked(createServerClient).mockReturnValue(
 *     createFakeSupabaseClient({
 *       auth: authedUser(makeUser()),
 *       from: { projects: [{ data: someProject, error: null }] },
 *     }),
 *   );
 */

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export function ok<T>(data: T): QueryResult<T> {
  return { data, error: null };
}

export function fail(message: string, code?: string): QueryResult<null> {
  return { data: null, error: { message, code } };
}

/**
 * A chainable, thenable fake Postgrest query builder. Every chain method
 * (`select`, `eq`, `neq`, `order`, `in`, `update`, `insert`) returns `this`
 * so arbitrary chains type-check; the builder resolves to the configured
 * `QueryResult` whether the chain ends in `.single()` or is awaited directly
 * (matching real supabase-js's thenable filter builders).
 */
export interface CallRecord {
  method: string;
  args: unknown[];
}

export class FakeQueryBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  constructor(
    private result: QueryResult<T>,
    private log?: CallRecord[],
  ) {}

  private record(method: string, args: unknown[]): this {
    this.log?.push({ method, args });
    return this;
  }

  select(...args: unknown[]): this {
    return this.record('select', args);
  }
  eq(...args: unknown[]): this {
    return this.record('eq', args);
  }
  neq(...args: unknown[]): this {
    return this.record('neq', args);
  }
  order(...args: unknown[]): this {
    return this.record('order', args);
  }
  in(...args: unknown[]): this {
    return this.record('in', args);
  }
  update(...args: unknown[]): this {
    return this.record('update', args);
  }
  insert(...args: unknown[]): this {
    return this.record('insert', args);
  }
  single(): Promise<QueryResult<T>> {
    this.log?.push({ method: 'single', args: [] });
    return Promise.resolve(this.result);
  }
  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

export interface FakeAuth {
  user: { id: string; email?: string } | null;
  error: { message: string } | null;
}

export function authedUser(user: { id: string; email?: string }): FakeAuth {
  return { user, error: null };
}

export function unauthenticated(): FakeAuth {
  return { user: null, error: { message: 'Not authenticated' } };
}

export interface FakeSupabaseConfig {
  /** Omit for service-client fakes (`getServiceSupabase()`) which have no `.auth`. */
  auth?: FakeAuth;
  /** Per-table queues of results, consumed FIFO on each `.from(table)` call. */
  from?: Record<string, QueryResult<unknown>[]>;
  /**
   * Optional: per-table arrays that every chain-method call (`.eq()`, `.neq()`,
   * `.update()`, ...) across all `.from(table)` invocations gets appended to,
   * in order — lets a test assert the exact guarded query shape (e.g. the
   * webhook's idempotency guards `.neq('status','paid')` / `.eq('status','approved')`)
   * without a live database.
   */
  callLog?: Record<string, CallRecord[]>;
}

/**
 * Build a fake Supabase client matching the subset of the `@supabase/ssr` /
 * `@supabase/supabase-js` surface the route handlers use:
 * `auth.getUser()` and `from(table)` returning a `FakeQueryBuilder`.
 */
export function createFakeSupabaseClient(config: FakeSupabaseConfig) {
  const queues: Record<string, QueryResult<unknown>[]> = {};
  for (const [table, results] of Object.entries(config.from ?? {})) {
    queues[table] = [...results];
  }
  const auth = config.auth ?? unauthenticated();

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: auth.user },
        error: auth.error,
      }),
    },
    from(table: string) {
      const log = config.callLog?.[table];
      const queue = queues[table];
      if (!queue || queue.length === 0) {
        // Default to an empty success result if the test didn't configure
        // this table — surfaces as "not found" in most routes.
        return new FakeQueryBuilder(ok(null), log);
      }
      const next = queue.length > 1 ? queue.shift()! : queue[0];
      return new FakeQueryBuilder(next, log);
    },
  };
}

/** Shorthand: a fake client that is simply unauthenticated (401 paths). */
export function fakeUnauthClient() {
  return createFakeSupabaseClient({ auth: unauthenticated() });
}
