import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ProjectResponse, Project, ApiError } from '@/types';

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

  // Fetch project — RLS enforced at DB layer AND explicit user_id filter for clarity
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !project) {
    return Response.json({ error: 'Project not found.' } satisfies ApiError, { status: 404 });
  }

  const typedProject = project as Project;

  const responseBody: ProjectResponse = {
    id: typedProject.id,
    status: typedProject.status,
    ideaText: typedProject.idea_text,
    clarifyingQuestions: typedProject.clarifying_questions,
    outputs: typedProject.outputs,
    estimate: {
      tier: typedProject.tier,
      low: typedProject.estimate_low,
      high: typedProject.estimate_high,
      firmPrice: typedProject.firm_price,
    },
    paidAt: typedProject.paid_at,
    repoUrl: typedProject.repo_url,
    stagingUrl: typedProject.staging_url,
    createdAt: typedProject.created_at,
    updatedAt: typedProject.updated_at,
  };

  return Response.json(responseBody, { status: 200 });
}
