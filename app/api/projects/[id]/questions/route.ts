import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { callLLM, parseLLMJson } from '@/lib/ai/client';
import type { QuestionsResponse, QuestionsResult, Project, ApiError } from '@/types';

const DEFAULT_QUESTION = 'What is the one feature that makes your product unique?';

const CLARIFYING_QUESTIONS_SYSTEM_PROMPT = `You are a product discovery assistant for a software MVP factory. Given a user's tech product idea, generate exactly 3 concise clarifying questions that will help the engineering team build the right MVP.

Focus your questions on: target user, core differentiator, and primary success metric. Questions should be short (under 20 words each), concrete, and directly answerable by a non-technical user.

Respond ONLY with a JSON object in this exact format, with no additional text:
{"questions":["Question 1?","Question 2?","Question 3?"]}`;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
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

  // Fetch project — ownership enforced by user_id filter + RLS
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !project) {
    return Response.json({ error: 'Project not found.' } satisfies ApiError, { status: 404 });
  }

  const typedProject = project as Project;

  // Ownership check — 403 if project belongs to a different user
  if (typedProject.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' } satisfies ApiError, { status: 403 });
  }

  // Return cached questions if already generated
  if (
    typedProject.clarifying_questions &&
    typedProject.clarifying_questions.length > 0
  ) {
    const cached = typedProject.clarifying_questions.map((q) => q.question);
    const responseBody: QuestionsResponse = { questions: cached };
    return Response.json(responseBody, { status: 200 });
  }

  // Generate questions via LLM
  let questionsResult: QuestionsResult | null = null;
  try {
    const rawText = await callLLM(
      CLARIFYING_QUESTIONS_SYSTEM_PROMPT,
      `Product idea: ${typedProject.idea_text}`,
    );
    questionsResult = parseLLMJson<QuestionsResult>(rawText);

    if (!questionsResult || !Array.isArray(questionsResult.questions)) {
      // Retry parse once
      const retryText = await callLLM(
        CLARIFYING_QUESTIONS_SYSTEM_PROMPT,
        `Product idea: ${typedProject.idea_text}`,
      );
      questionsResult = parseLLMJson<QuestionsResult>(retryText);
    }
  } catch {
    return Response.json(
      { error: 'Could not generate questions. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  if (!questionsResult || !Array.isArray(questionsResult.questions)) {
    return Response.json(
      { error: 'Could not generate questions. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  // Normalise: cap at 3, pad with default if under 1
  let questions = questionsResult.questions.slice(0, 3);
  while (questions.length < 1) {
    questions.push(DEFAULT_QUESTION);
  }

  // Persist questions to project (cached for subsequent fetches)
  const clarifyingQuestions = questions.map((q) => ({ question: q, answer: null }));
  const { error: updateError } = await supabase
    .from('projects')
    .update({ clarifying_questions: clarifyingQuestions })
    .eq('id', id);

  if (updateError) {
    console.error('[GET /api/projects/[id]/questions] Update error:', updateError.message);
    // Non-fatal — return questions even if caching fails
  }

  const responseBody: QuestionsResponse = { questions };
  return Response.json(responseBody, { status: 200 });
}
