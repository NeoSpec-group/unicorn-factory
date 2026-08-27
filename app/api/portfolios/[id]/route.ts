import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { Portfolio, RenamePortfolioRequest, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Rename a portfolio (RLS ensures ownership).
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  let body: RenamePortfolioRequest;
  try {
    body = (await request.json()) as RenamePortfolioRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) {
    return Response.json({ error: 'A portfolio name (1–80 chars) is required.' } satisfies ApiError, { status: 400 });
  }

  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error || !portfolio) {
    return Response.json({ error: 'Portfolio not found.' } satisfies ApiError, { status: 404 });
  }

  return Response.json(portfolio as Portfolio, { status: 200 });
}
