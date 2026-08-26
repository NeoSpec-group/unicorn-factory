import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assertProjectStatus } from '@/lib/state-machine';
import type { CommissionResponse, Project, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Founder commissions the build (cash path). blueprint_ready → commissioned.
// The internal Green-Light review (ops) sets the firm price before payment.
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
    assertProjectStatus(typedProject.status, 'blueprint_ready');
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid state.' } satisfies ApiError,
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: 'commissioned' })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/projects/[id]/commission] Update error:', updateError.message);
    return Response.json(
      { error: 'Failed to submit build request. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const responseBody: CommissionResponse = { success: true, status: 'commissioned' };
  return Response.json(responseBody, { status: 200 });
}
