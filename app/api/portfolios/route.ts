import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { JOURNEY_STAGES, STATUS_TO_STAGE } from '@/types';
import type {
  Project,
  Portfolio,
  IdeaSummary,
  PortfolioWithIdeas,
  PortfoliosResponse,
  CreatePortfolioRequest,
  ApiError,
} from '@/types';

function title(ideaText: string): string {
  const t = ideaText.trim();
  return t.length > 64 ? `${t.slice(0, 64)}…` : t;
}

// List the user's portfolios, each with its ideas (RLS scopes to the user).
export async function GET(request: NextRequest): Promise<Response> {
  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  const [{ data: portfolios, error: pErr }, { data: projects, error: prErr }] = await Promise.all([
    supabase.from('portfolios').select('*').order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('id, portfolio_id, status, idea_text, updated_at')
      .order('updated_at', { ascending: false }),
  ]);

  if (pErr || prErr) {
    console.error('[GET /api/portfolios] error:', pErr?.message ?? prErr?.message);
    return Response.json({ error: 'Failed to load portfolios.' } satisfies ApiError, { status: 500 });
  }

  const ideasByPortfolio = new Map<string, IdeaSummary[]>();
  for (const p of (projects ?? []) as Pick<
    Project,
    'id' | 'portfolio_id' | 'status' | 'idea_text' | 'updated_at'
  >[]) {
    if (!p.portfolio_id) continue;
    const stage = STATUS_TO_STAGE[p.status];
    const summary: IdeaSummary = {
      id: p.id,
      status: p.status,
      title: title(p.idea_text),
      stageLabel: JOURNEY_STAGES[stage.stageIndex]?.label ?? '—',
      stageIndex: stage.stageIndex,
      updatedAt: p.updated_at,
    };
    const list = ideasByPortfolio.get(p.portfolio_id) ?? [];
    list.push(summary);
    ideasByPortfolio.set(p.portfolio_id, list);
  }

  const result: PortfolioWithIdeas[] = ((portfolios ?? []) as Portfolio[]).map((pf) => ({
    id: pf.id,
    name: pf.name,
    createdAt: pf.created_at,
    ideas: ideasByPortfolio.get(pf.id) ?? [],
  }));

  const body: PortfoliosResponse = { portfolios: result };
  return Response.json(body, { status: 200 });
}

// Create a portfolio.
export async function POST(request: NextRequest): Promise<Response> {
  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  let body: CreatePortfolioRequest;
  try {
    body = (await request.json()) as CreatePortfolioRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) {
    return Response.json({ error: 'A portfolio name (1–80 chars) is required.' } satisfies ApiError, { status: 400 });
  }

  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .insert({ user_id: user.id, name })
    .select('*')
    .single();
  if (error || !portfolio) {
    console.error('[POST /api/portfolios] insert error:', error?.message);
    return Response.json({ error: 'Failed to create portfolio.' } satisfies ApiError, { status: 500 });
  }

  return Response.json(portfolio as Portfolio, { status: 201 });
}
