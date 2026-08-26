import type { NextRequest } from 'next/server';
import { getOpsUser, isOpsError } from '@/lib/ops';
import { getServiceSupabase } from '@/lib/supabase/service';
import type {
  Project,
  ProjectOutputs,
  ProjectStatus,
  DeliverRequest,
  RealityMapEntry,
  RealityStatus,
  ApiError,
} from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type OpsAction = 'approve' | 'decline' | 'forge' | 'deliver';
const VALID_REALITY: RealityStatus[] = ['real', 'limited', 'mocked', 'excluded'];

function bad(error: string, status: number): Response {
  return Response.json({ error } satisfies ApiError, { status });
}

// Ops-driven transitions (concierge). approve/decline (Green-Light), forge
// (start The Forge), deliver (mark delivered → Proving Ground). Uses the service
// client for cross-user writes after verifying the ops role.
export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const auth = await getOpsUser(request);
  if (isOpsError(auth)) return bad(auth.error, auth.status);

  let body: { action?: OpsAction; firmPrice?: unknown } & Partial<DeliverRequest>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON body.', 400);
  }

  const svc = getServiceSupabase();
  const { data: project, error: fetchError } = await svc
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !project) return bad('Project not found.', 404);
  const p = project as Project;

  function requireStatus(expected: ProjectStatus): Response | null {
    return p.status === expected ? null : bad(`Project is in '${p.status}', expected '${expected}'.`, 409);
  }

  let update: Record<string, unknown>;

  switch (body.action) {
    case 'approve': {
      const guard = requireStatus('commissioned');
      if (guard) return guard;
      const firmPrice = Number(body.firmPrice);
      if (!Number.isFinite(firmPrice) || firmPrice <= 0) {
        return bad('A positive firm price is required.', 400);
      }
      update = { status: 'approved', firm_price: Math.round(firmPrice) };
      break;
    }
    case 'decline': {
      const guard = requireStatus('commissioned');
      if (guard) return guard;
      update = { status: 'declined' };
      break;
    }
    case 'forge': {
      const guard = requireStatus('paid');
      if (guard) return guard;
      update = { status: 'building' };
      break;
    }
    case 'deliver': {
      const guard = requireStatus('building');
      if (guard) return guard;
      const repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim() : '';
      const stagingUrl = typeof body.stagingUrl === 'string' ? body.stagingUrl.trim() : '';
      const handoverDoc = typeof body.handoverDoc === 'string' ? body.handoverDoc.trim() : '';
      if (!stagingUrl) return bad('A staging URL is required to deliver.', 400);
      const realityMap: RealityMapEntry[] = Array.isArray(body.realityMap)
        ? body.realityMap
            .filter(
              (e): e is RealityMapEntry =>
                !!e &&
                typeof e.feature === 'string' &&
                VALID_REALITY.includes(e.status) &&
                typeof e.note === 'string',
            )
            .map((e) => ({ feature: e.feature.trim(), status: e.status, note: e.note.trim() }))
        : [];
      const existing: ProjectOutputs = (p.outputs as ProjectOutputs) ?? {};
      update = {
        status: 'uat',
        repo_url: repoUrl || null,
        staging_url: stagingUrl,
        outputs: { ...existing, deliverables: { handoverDoc, realityMap } },
      };
      break;
    }
    default:
      return bad('Unknown action.', 400);
  }

  const { error: updateError } = await svc.from('projects').update(update).eq('id', id);
  if (updateError) {
    console.error('[POST /api/ops/projects/[id]] update error:', updateError.message);
    return bad('Failed to update project.', 500);
  }

  return Response.json({ success: true, status: update.status }, { status: 200 });
}
