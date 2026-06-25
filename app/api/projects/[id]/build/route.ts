// MOCK: This route simulates the build agent pipeline.
// In production, replace with a call to the real build agent service.

import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import { MOCK_BUILD_OUTPUTS } from '@/lib/mock-data';
import type {
  BuildRequest,
  BuildResponse,
  Project,
  ProjectOutputs,
  ApiError,
} from '@/types';

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

  // Parse request body
  let body: BuildRequest;
  try {
    body = (await request.json()) as BuildRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }

  const { phase } = body;

  if (phase !== 'start' && phase !== 'complete') {
    return Response.json(
      { error: 'phase must be "start" or "complete".' } satisfies ApiError,
      { status: 400 },
    );
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

  if (phase === 'start') {
    // Guard: must be in checkpoint_reviewed
    try {
      assertProjectStatus(typedProject.status, 'checkpoint_reviewed');
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'build_running' })
      .eq('id', id);

    if (updateError) {
      console.error('[POST /api/projects/[id]/build start] Update error:', updateError.message);
      return Response.json(
        { error: 'Failed to start build. Please try again.' } satisfies ApiError,
        { status: 500 },
      );
    }

    const startResponse: BuildResponse = { success: true, status: 'build_running' };
    return Response.json(startResponse, { status: 200 });
  }

  // phase === 'complete'
  // Guard: must be in build_running
  try {
    assertProjectStatus(typedProject.status, 'build_running');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  // Write mock build outputs — MOCK: replace with real build agent deliverables
  const existingOutputs: ProjectOutputs = (typedProject.outputs as ProjectOutputs) ?? {};
  const updatedOutputs: ProjectOutputs = {
    ...existingOutputs,
    build: MOCK_BUILD_OUTPUTS,
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: 'build_complete', outputs: updatedOutputs })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/build complete] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to complete build. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const completeResponse: BuildResponse = { success: true, status: 'build_complete' };
  return Response.json(completeResponse, { status: 200 });
}
