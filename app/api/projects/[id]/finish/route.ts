import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import type { FinishRequest, FinishResponse, Project, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Founder completes handover: full handover (launched) or managed service (managed).
export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  let body: FinishRequest;
  try {
    body = (await request.json()) as FinishRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }
  if (body.choice !== 'launch' && body.choice !== 'managed') {
    return Response.json({ error: "choice must be 'launch' or 'managed'." } satisfies ApiError, { status: 400 });
  }

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !project) {
    return Response.json({ error: 'Project not found.' } satisfies ApiError, { status: 404 });
  }

  const typedProject = project as Project;
  if (typedProject.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' } satisfies ApiError, { status: 403 });
  }

  try {
    assertProjectStatus(typedProject.status, 'handover');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  const nextStatus = body.choice === 'launch' ? 'launched' : 'managed';
  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: nextStatus })
    .eq('id', id);
  if (updateError) {
    console.error('[POST /api/projects/[id]/finish] Update error:', updateError.message);
    return Response.json({ error: 'Failed to complete handover. Please try again.' } satisfies ApiError, { status: 500 });
  }

  const responseBody: FinishResponse = { success: true, status: nextStatus };
  return Response.json(responseBody, { status: 200 });
}
