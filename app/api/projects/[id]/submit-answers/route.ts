import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import { generateBlueprint, type GeneratedBlueprint } from '@/lib/ai/blueprint';
import { TIER_BANDS } from '@/types';
import type {
  SubmitAnswersRequest,
  SubmitAnswersResponse,
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
    assertProjectStatus(typedProject.status, 'intake');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  // Generate the Blueprint + estimate via the LLM. If generation fails (model
  // unavailable or unparseable after a retry), fall back to a safe default so the
  // funnel never hard-blocks — the founder still gets a Blueprint they can act on.
  let generated: GeneratedBlueprint | null = await generateBlueprint(
    typedProject.idea_text,
    answers,
  );
  if (!generated) {
    generated = {
      blueprint: {
        refinedIdea: typedProject.idea_text,
        roadmap: [
          { title: 'Core flow', detail: 'The primary end-to-end journey your product delivers.' },
          { title: 'Accounts & data', detail: 'Authentication and persistence for your users.' },
          { title: 'Polish & ship', detail: 'A clean, deployable MVP wired to your accounts.' },
        ],
      },
      brief: {
        problem: 'Not specified.',
        targetUsers: 'Not specified.',
        coreFeatures: [],
        outOfScope: [],
        successCriteria: [],
      },
      tier: 'standard',
    };
  }

  const { blueprint, brief, tier } = generated;
  const existingOutputs: ProjectOutputs = (typedProject.outputs as ProjectOutputs) ?? {};
  const updatedOutputs: ProjectOutputs = { ...existingOutputs, blueprint };

  // Save answers, blueprint (free), brief (gated), estimate, and advance state.
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      clarifying_questions: answers,
      outputs: updatedOutputs,
      brief,
      tier,
      estimate_low: TIER_BANDS[tier].low,
      estimate_high: TIER_BANDS[tier].high,
      status: 'blueprint_ready',
    })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/submit-answers] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to save answers. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const responseBody: SubmitAnswersResponse = { success: true, nextStatus: 'blueprint_ready' };
  return Response.json(responseBody, { status: 200 });
}
