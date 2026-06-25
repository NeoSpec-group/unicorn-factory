// MOCK: This route simulates the research agent pipeline.
// In production, replace with a call to the real research agent service and poll for completion.

import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import { MOCK_RESEARCH_OUTPUTS } from '@/lib/mock-data';
import type {
  ResearchRequest,
  ResearchResponse,
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
  let body: ResearchRequest;
  try {
    body = (await request.json()) as ResearchRequest;
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
    // Guard: must be in questions_answered
    try {
      assertProjectStatus(typedProject.status, 'questions_answered');
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'research_running' })
      .eq('id', id);

    if (updateError) {
      console.error('[POST /api/projects/[id]/research start] Update error:', updateError.message);
      return Response.json(
        { error: 'Failed to start research. Please try again.' } satisfies ApiError,
        { status: 500 },
      );
    }

    const startResponse: ResearchResponse = { success: true, status: 'research_running' };
    return Response.json(startResponse, { status: 200 });
  }

  // phase === 'complete'
  // Guard: must be in research_running
  try {
    assertProjectStatus(typedProject.status, 'research_running');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  // Write mock research outputs — MOCK: replace with real agent output
  const existingOutputs: ProjectOutputs = (typedProject.outputs as ProjectOutputs) ?? {};
  const updatedOutputs: ProjectOutputs = {
    ...existingOutputs,
    research: MOCK_RESEARCH_OUTPUTS,
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: 'research_complete', outputs: updatedOutputs })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/research complete] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to complete research. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const completeResponse: ResearchResponse = { success: true, status: 'research_complete' };
  return Response.json(completeResponse, { status: 200 });
}
