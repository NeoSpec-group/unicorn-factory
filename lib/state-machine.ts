import type { ProjectStatus } from '@/types';

export interface StateTransition {
  from: ProjectStatus | null;  // null = project does not exist yet
  to: ProjectStatus;
  trigger: string;
  guard: string;
}

export const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: null,
    to: 'idea_submitted',
    trigger: 'POST /api/projects — LLM verdict = accept',
    guard: 'ideaText length between 20 and 500 chars; LLM returns accept verdict',
  },
  {
    from: 'idea_submitted',
    to: 'questions_answered',
    trigger: 'POST /api/projects/[id]/submit-answers',
    guard: 'All clarifying_questions entries have non-empty answer strings',
  },
  {
    from: 'questions_answered',
    to: 'research_running',
    trigger: 'POST /api/projects/[id]/research { phase: "start" }',
    guard: 'Project status is exactly questions_answered',
  },
  {
    from: 'research_running',
    to: 'research_complete',
    trigger: 'POST /api/projects/[id]/research { phase: "complete" }',
    guard: 'Project status is exactly research_running',
  },
  {
    from: 'research_complete',
    to: 'checkpoint_reviewed',
    trigger: 'POST /api/projects/[id]/proceed',
    guard: 'Project status is exactly research_complete',
  },
  {
    from: 'research_complete',
    to: 'stopped',
    trigger: 'POST /api/projects/[id]/stop',
    guard: 'Project status is exactly research_complete',
  },
  {
    from: 'checkpoint_reviewed',
    to: 'build_running',
    trigger: 'POST /api/projects/[id]/build { phase: "start" }',
    guard: 'Project status is exactly checkpoint_reviewed',
  },
  {
    from: 'build_running',
    to: 'build_complete',
    trigger: 'POST /api/projects/[id]/build { phase: "complete" }',
    guard: 'Project status is exactly build_running',
  },
];

// Terminal states — no transitions out
export const TERMINAL_STATES: ProjectStatus[] = ['build_complete', 'stopped'];

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
