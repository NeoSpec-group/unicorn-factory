import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import type {
  SubmitAnswersRequest,
  SubmitAnswersResponse,
  Project,
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
  let body: SubmitAnswersRequest;
  try {
    body = (await request.json()) as SubmitAnswersRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }

  const { answers } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: 'Answers array is required.' } satisfies ApiError, { status: 400 });
  }

  // Validate all answers are non-empty strings
  const allAnswered = answers.every(
    (a) => a && typeof a.answer === 'string' && a.answer.trim().length > 0,
  );
  if (!allAnswered) {
    return Response.json(
      { error: 'All questions must have non-empty answers.' } satisfies ApiError,
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

  // State guard
  try {
    assertProjectStatus(typedProject.status, 'idea_submitted');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  // Save answers and advance state
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      clarifying_questions: answers,
      status: 'questions_answered',
    })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/submit-answers] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to save answers. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const responseBody: SubmitAnswersResponse = { success: true, nextStatus: 'questions_answered' };
  return Response.json(responseBody, { status: 200 });
}
