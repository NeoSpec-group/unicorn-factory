import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { callLLM, parseLLMJson } from '@/lib/ai/client';
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  IdeaCheckResult,
  ApiError,
} from '@/types';

const IDEA_CONSTRAINT_SYSTEM_PROMPT = `You are an intake classifier for a software MVP factory. Your job is to determine whether a user's idea is a technology product that can be built as a web or mobile application MVP.

Accept ideas that are: web apps, mobile apps, SaaS tools, APIs, developer tools, e-commerce platforms, marketplaces, productivity software, data tools, or any software-based product.

Decline ideas that are: physical products, services without a software component, vague concepts that cannot be built as software, illegal or harmful applications, or ideas that are not products at all (e.g. "I want to make money").

Respond ONLY with a JSON object in this exact format, with no additional text:
{"verdict":"accept","reason":"Brief reason why this is a valid tech product idea."}
or
{"verdict":"decline","reason":"Brief explanation of why this idea cannot be built as a software MVP, and what type of idea would be accepted."}`;

export async function POST(request: NextRequest): Promise<Response> {
  // Auth check
  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  // Parse and validate request body
  let body: CreateProjectRequest;
  try {
    body = (await request.json()) as CreateProjectRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }

  const { ideaText } = body;

  if (
    !ideaText ||
    typeof ideaText !== 'string' ||
    ideaText.trim().length < 20 ||
    ideaText.trim().length > 500
  ) {
    return Response.json(
      { error: 'Idea text must be between 20 and 500 characters.' } satisfies ApiError,
      { status: 400 },
    );
  }

  // Call LLM for constraint check (with one retry built into callLLM)
  let llmResult: IdeaCheckResult | null = null;
  try {
    const rawText = await callLLM(
      IDEA_CONSTRAINT_SYSTEM_PROMPT,
      `User idea: ${ideaText.trim()}`,
    );

    llmResult = parseLLMJson<IdeaCheckResult>(rawText);

    // Retry parse once if first parse failed (callLLM already retried the network call)
    if (!llmResult || !llmResult.verdict) {
      const retryText = await callLLM(
        IDEA_CONSTRAINT_SYSTEM_PROMPT,
        `User idea: ${ideaText.trim()}`,
      );
      llmResult = parseLLMJson<IdeaCheckResult>(retryText);
    }
  } catch {
    return Response.json(
      { error: 'LLM service unavailable. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  if (!llmResult || !llmResult.verdict) {
    return Response.json(
      { error: 'LLM returned unexpected format. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  // On decline, return reason without creating project
  if (llmResult.verdict === 'decline') {
    const declineResponse: CreateProjectResponse = {
      verdict: 'decline',
      reason: llmResult.reason,
    };
    return Response.json(declineResponse, { status: 200 });
  }

  // On accept, create project row
  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      status: 'idea_submitted',
      idea_text: ideaText.trim(),
    })
    .select('id')
    .single();

  if (insertError || !project) {
    console.error('[POST /api/projects] Insert error:', insertError?.message);
    return Response.json(
      { error: 'Failed to create project. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const acceptResponse: CreateProjectResponse = {
    projectId: project.id as string,
    verdict: 'accept',
    reason: llmResult.reason,
  };
  return Response.json(acceptResponse, { status: 201 });
}
