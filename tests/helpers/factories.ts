import type { Project, ProjectStatus, Portfolio } from '@/types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString().padStart(4, '0')}-0000-0000-000000000000`;
}

/** A fake authenticated Supabase user (shape used by `supabase.auth.getUser()`). */
export function makeUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: overrides.id ?? nextId('user'),
    email: overrides.email ?? 'founder@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

/** A fake `projects` row. */
export function makeProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? nextId('project'),
    user_id: overrides.user_id ?? nextId('user'),
    portfolio_id: overrides.portfolio_id ?? nextId('portfolio'),
    status: overrides.status ?? ('intake' as ProjectStatus),
    idea_text: overrides.idea_text ?? 'A marketplace connecting local bakers with nearby customers.',
    clarifying_questions: overrides.clarifying_questions ?? null,
    outputs: overrides.outputs ?? null,
    tier: overrides.tier ?? null,
    estimate_low: overrides.estimate_low ?? null,
    estimate_high: overrides.estimate_high ?? null,
    firm_price: overrides.firm_price ?? null,
    paid_at: overrides.paid_at ?? null,
    repo_url: overrides.repo_url ?? null,
    staging_url: overrides.staging_url ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    ...overrides,
  };
}

/** A fake `portfolios` row. */
export function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? nextId('portfolio'),
    user_id: overrides.user_id ?? nextId('user'),
    name: overrides.name ?? 'My First Portfolio',
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
  };
}

export function makeIdeaText(length: number): string {
  // Builds an idea string of an exact trimmed length for boundary testing
  // (20–500 chars per POST /api/projects).
  const base = 'x'.repeat(Math.max(length, 0));
  return base;
}
