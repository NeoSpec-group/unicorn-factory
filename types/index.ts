// ============================================================
// Project State Machine
// ============================================================

export type ProjectStatus =
  | 'idea_submitted'
  | 'questions_answered'
  | 'research_running'
  | 'research_complete'
  | 'checkpoint_reviewed'
  | 'build_running'
  | 'build_complete'
  | 'stopped';

export const TERMINAL_STATES: ProjectStatus[] = ['build_complete', 'stopped'];

// ============================================================
// Database Entities
// ============================================================

export interface Competitor {
  name: string;
  description: string;
  weakness: string;
}

export interface ResearchOutputs {
  painPointSignal: string;
  competitorMap: Competitor[];
  recommendation: {
    verdict: 'GO' | 'NO-GO';
    rationale: string;
  };
}

export interface BuildOutputs {
  researchReport: string;   // Markdown
  recommendation: string;   // Markdown
  requirementsDoc: string;  // Markdown
  liveMvpUrl: string;
  githubLink: string;
  growthStrategy: string;   // Markdown
}

export interface ProjectOutputs {
  research?: ResearchOutputs;
  build?: BuildOutputs;
}

export interface ClarifyingQuestionEntry {
  question: string;
  answer: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  status: ProjectStatus;
  idea_text: string;
  clarifying_questions: ClarifyingQuestionEntry[] | null;
  outputs: ProjectOutputs | null;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

// ============================================================
// Mock Data Step Shape (for ProgressTracker component)
// ============================================================

export interface MockStep {
  name: string;
  status: 'pending' | 'running' | 'complete';
  durationMs: number;
}

// ============================================================
// API: POST /api/leads
// ============================================================

export interface LeadRequest {
  email: string;
}

export interface LeadResponse {
  success: boolean;
}

// ============================================================
// API: POST /api/projects
// ============================================================

export interface CreateProjectRequest {
  ideaText: string;  // 20–500 chars
}

export interface CreateProjectAcceptResponse {
  projectId: string;
  verdict: 'accept';
  reason: string;
}

export interface CreateProjectDeclineResponse {
  verdict: 'decline';
  reason: string;
}

export type CreateProjectResponse = CreateProjectAcceptResponse | CreateProjectDeclineResponse;

// ============================================================
// API: GET /api/projects/[id]/questions
// ============================================================

export interface QuestionsResponse {
  questions: string[];  // 1–3 items
}

// ============================================================
// API: POST /api/projects/[id]/submit-answers
// ============================================================

export interface SubmitAnswersRequest {
  answers: ClarifyingQuestionEntry[];
}

export interface SubmitAnswersResponse {
  success: boolean;
  nextStatus: 'questions_answered';
}

// ============================================================
// API: POST /api/projects/[id]/research
// ============================================================

export interface ResearchRequest {
  phase: 'start' | 'complete';
}

export interface ResearchStartResponse {
  success: boolean;
  status: 'research_running';
}

export interface ResearchCompleteResponse {
  success: boolean;
  status: 'research_complete';
}

export type ResearchResponse = ResearchStartResponse | ResearchCompleteResponse;

// ============================================================
// API: POST /api/projects/[id]/proceed
// ============================================================

export interface ProceedResponse {
  success: boolean;
  status: 'checkpoint_reviewed';
}

// ============================================================
// API: POST /api/projects/[id]/stop
// ============================================================

export interface StopResponse {
  success: boolean;
  status: 'stopped';
}

// ============================================================
// API: POST /api/projects/[id]/build
// ============================================================

export interface BuildRequest {
  phase: 'start' | 'complete';
}

export interface BuildStartResponse {
  success: boolean;
  status: 'build_running';
}

export interface BuildCompleteResponse {
  success: boolean;
  status: 'build_complete';
}

export type BuildResponse = BuildStartResponse | BuildCompleteResponse;

// ============================================================
// API: GET /api/projects/[id]
// ============================================================

export interface ProjectResponse {
  id: string;
  status: ProjectStatus;
  ideaText: string;
  clarifyingQuestions: ClarifyingQuestionEntry[] | null;
  outputs: ProjectOutputs | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API: GET /api/health
// ============================================================

export interface HealthResponse {
  status: 'ok';
  timestamp: string;  // ISO 8601
}

// ============================================================
// LLM Internal Types (used in lib/ai/client.ts — not exposed in API)
// ============================================================

export interface IdeaCheckResult {
  verdict: 'accept' | 'decline';
  reason: string;
}

export interface QuestionsResult {
  questions: string[];  // exactly 3 items
}

// ============================================================
// API Error Shape
// ============================================================

export interface ApiError {
  error: string;
}

// ============================================================
// State Routing Helper
// ============================================================

export function getRouteForStatus(status: ProjectStatus): string {
  const routeMap: Record<ProjectStatus, string> = {
    idea_submitted:      '/questions',
    questions_answered:  '/research',
    research_running:    '/research',
    research_complete:   '/checkpoint',
    checkpoint_reviewed: '/build',
    build_running:       '/build',
    build_complete:      '/deliverables',
    stopped:             '/checkpoint',  // stopped state renders on checkpoint screen
  };
  return routeMap[status];
}
