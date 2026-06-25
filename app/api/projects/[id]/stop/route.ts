import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import type { StopResponse, Project, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  // Auth check
  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  // Fetch and own-check project
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

  // State guard: must be in research_complete
  try {
    assertProjectStatus(typedProject.status, 'research_complete');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: 'stopped' })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/stop] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to stop project. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const responseBody: StopResponse = { success: true, status: 'stopped' };
  return Response.json(responseBody, { status: 200 });
}
