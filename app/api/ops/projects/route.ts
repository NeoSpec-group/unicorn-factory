import type { NextRequest } from 'next/server';
import { getOpsUser, isOpsError } from '@/lib/ops';
import { getServiceSupabase } from '@/lib/supabase/service';
import type { Project, OpsProjectSummary, OpsProjectsResponse, ApiError } from '@/types';

// Ops queue: every project currently in an ops-relevant stage, across all users.
const OPS_STAGES = ['commissioned', 'approved', 'paid', 'building', 'uat', 'handover'];

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await getOpsUser(request);
  if (isOpsError(auth)) {
    return Response.json({ error: auth.error } satisfies ApiError, { status: auth.status });
  }

  const { data, error } = await getServiceSupabase()
    .from('projects')
    .select('*')
    .in('status', OPS_STAGES)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/ops/projects] error:', error.message);
    return Response.json({ error: 'Failed to load queue.' } satisfies ApiError, { status: 500 });
  }

  const projects: OpsProjectSummary[] = (data as Project[]).map((p) => ({
    id: p.id,
    status: p.status,
    ideaText: p.idea_text,
    tier: p.tier,
    estimateLow: p.estimate_low,
    estimateHigh: p.estimate_high,
    firmPrice: p.firm_price,
    repoUrl: p.repo_url,
    stagingUrl: p.staging_url,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const body: OpsProjectsResponse = { projects };
  return Response.json(body, { status: 200 });
}
