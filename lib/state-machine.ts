import type { ProjectStatus } from '@/types';

export { TERMINAL_STATES } from '@/types';

export interface StateTransition {
  from: ProjectStatus | null; // null = project does not exist yet
  to: ProjectStatus;
  trigger: string;
  guard: string;
  actor: 'founder' | 'ops' | 'system';
}

// The refined founder journey. Founder-driven transitions run through the app;
// ops-driven transitions run through the /ops surface (concierge v1); system
// transitions are triggered by webhooks (payment).
export const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: null,
    to: 'intake',
    trigger: 'POST /api/projects — LLM verdict = accept',
    guard: 'ideaText 20–500 chars; LLM returns accept verdict',
    actor: 'founder',
  },
  {
    from: 'intake',
    to: 'blueprint_ready',
    trigger: 'POST /api/projects/[id]/submit-answers',
    guard: 'All clarifying_questions answered; Blueprint + estimate generated',
    actor: 'founder',
  },
  {
    from: 'blueprint_ready',
    to: 'commissioned',
    trigger: 'POST /api/projects/[id]/commission',
    guard: 'Project status is exactly blueprint_ready',
    actor: 'founder',
  },
  {
    from: 'blueprint_ready',
    to: 'parked',
    trigger: 'POST /api/projects/[id]/park',
    guard: 'Project status is exactly blueprint_ready',
    actor: 'founder',
  },
  {
    from: 'commissioned',
    to: 'approved',
    trigger: 'Ops approve (sets firm_price)',
    guard: 'Project status is exactly commissioned; firm_price set',
    actor: 'ops',
  },
  {
    from: 'commissioned',
    to: 'declined',
    trigger: 'Ops decline',
    guard: 'Project status is exactly commissioned',
    actor: 'ops',
  },
  {
    from: 'approved',
    to: 'paid',
    trigger: 'Stripe checkout.session.completed webhook',
    guard: 'Project status is exactly approved; sets paid_at = T-0',
    actor: 'system',
  },
  {
    from: 'paid',
    to: 'building',
    trigger: 'Ops trigger the harness (The Forge)',
    guard: 'Project status is exactly paid',
    actor: 'ops',
  },
  {
    from: 'building',
    to: 'uat',
    trigger: 'Ops mark delivered (paste repo_url / staging_url + Reality Map)',
    guard: 'Project status is exactly building',
    actor: 'ops',
  },
  {
    from: 'uat',
    to: 'handover',
    trigger: 'Founder accepts the delivered MVP',
    guard: 'Project status is exactly uat',
    actor: 'founder',
  },
  {
    from: 'uat',
    to: 'building',
    trigger: 'Ops re-forge for a reported defect (revision round)',
    guard: 'Project status is exactly uat',
    actor: 'ops',
  },
  {
    from: 'handover',
    to: 'launched',
    trigger: 'Full handover complete (accounts transferred)',
    guard: 'Project status is exactly handover',
    actor: 'ops',
  },
  {
    from: 'handover',
    to: 'managed',
    trigger: 'Founder chooses managed service (retainer)',
    guard: 'Project status is exactly handover',
    actor: 'founder',
  },
];

/**
 * Guard helper — use in every API route that changes state.
 * Throws an Error if the current status does not match the expected status.
 */
export function assertProjectStatus(
  currentStatus: ProjectStatus,
  expectedStatus: ProjectStatus,
): void {
  if (currentStatus !== expectedStatus) {
    throw new Error(
      `Invalid state transition: project is in '${currentStatus}', expected '${expectedStatus}'.`,
    );
  }
}
