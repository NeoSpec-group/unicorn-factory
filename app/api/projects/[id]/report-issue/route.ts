import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import type { ReportIssueRequest, Project, ProjectOutputs, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Founder reports a defect during Proving Ground (the defects-only revision
// round from the quality contract). Records the note and keeps status at uat;
// ops is pinged (concierge) and can re-forge for the fix.
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

  let body: ReportIssueRequest;
  try {
    body = (await request.json()) as ReportIssueRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note) {
    return Response.json({ error: 'Please describe the issue.' } satisfies ApiError, { status: 400 });
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
    assertProjectStatus(typedProject.status, 'uat');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  const existing: ProjectOutputs = (typedProject.outputs as ProjectOutputs) ?? {};
  const { error: updateError } = await supabase
    .from('projects')
    .update({ outputs: { ...existing, issueNote: note } })
    .eq('id', id);
  if (updateError) {
    console.error('[POST /api/projects/[id]/report-issue] Update error:', updateError.message);
    return Response.json({ error: 'Failed to report issue. Please try again.' } satisfies ApiError, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
