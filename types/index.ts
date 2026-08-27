// ============================================================
// Project State Machine — the refined founder journey
// ============================================================
//
// Internal status (DB) vs. founder-facing journey stage are decoupled: statuses
// drive guards/routing, JOURNEY_STAGES + STATUS_TO_STAGE drive the UI tracker.

export type ProjectStatus =
  | 'intake'           // idea accepted; The Workshop (clarifying Q&A) in progress
  | 'blueprint_ready'  // free Blueprint generated (refined idea + roadmap + estimate)
  | 'commissioned'     // founder commissioned the build (cash); awaiting Green-Light
  | 'approved'         // ops green-lit + firm quote set; awaiting payment
  | 'declined'         // ops declined (terminal)
  | 'paid'             // payment confirmed = T-0 / Ignition
  | 'building'         // The Forge — harness building
  | 'uat'              // Proving Ground — delivered to staging, in acceptance
  | 'handover'         // Handover — keys & knowledge transfer
  | 'launched'         // delivered, full handover (terminal)
  | 'managed'          // delivered, managed service (terminal)
  | 'parked';          // founder stopped (terminal)

export const TERMINAL_STATES: ProjectStatus[] = ['declined', 'launched', 'managed', 'parked'];

// ── Founder-facing journey (display) ────────────────────────────────────────────
export interface JourneyStage {
  key: string;   // stable id
  label: string; // display name
  blurb: string; // one-line description
}

export const JOURNEY_STAGES: JourneyStage[] = [
  { key: 'intake',    label: 'Intake',         blurb: 'Submit your idea' },
  { key: 'workshop',  label: 'The Workshop',   blurb: 'We shape it with you' },
  { key: 'blueprint', label: 'Blueprint',      blurb: 'Validated idea, roadmap & estimate' },
  { key: 'commission',label: 'Commission',     blurb: 'Commission the build' },
  { key: 'greenlight',label: 'Green-Light',    blurb: 'We review & set the firm quote' },
  { key: 'ignition',  label: 'Ignition',       blurb: 'Payment confirmed — 72-hour clock starts' },
  { key: 'forge',     label: 'The Forge',      blurb: 'Your MVP is built' },
  { key: 'proving',   label: 'Proving Ground', blurb: 'Test-drive your MVP' },
  { key: 'handover',  label: 'Handover',       blurb: 'Keys & knowledge transfer' },
  { key: 'launch',    label: 'Launch',         blurb: "It's yours — or we run it" },
];

// Which journey stage each status sits at (0-based index into JOURNEY_STAGES),
// plus terminal / off-happy-path markers so the tracker can render them specially.
export interface StatusStage {
  stageIndex: number;
  terminal: boolean;
  offPath?: 'declined' | 'parked';
}

export const STATUS_TO_STAGE: Record<ProjectStatus, StatusStage> = {
  intake:          { stageIndex: 1, terminal: false }, // The Workshop active
  blueprint_ready: { stageIndex: 2, terminal: false }, // Blueprint
  commissioned:    { stageIndex: 4, terminal: false }, // Green-Light (in review)
  approved:        { stageIndex: 5, terminal: false }, // Ignition (awaiting payment)
  paid:            { stageIndex: 6, terminal: false }, // The Forge (queued)
  building:        { stageIndex: 6, terminal: false }, // The Forge (active)
  uat:             { stageIndex: 7, terminal: false }, // Proving Ground
  handover:        { stageIndex: 8, terminal: false }, // Handover
  launched:        { stageIndex: 9, terminal: true },  // Launch (full handover)
  managed:         { stageIndex: 9, terminal: true },  // Launch (managed service)
  declined:        { stageIndex: 4, terminal: true, offPath: 'declined' },
  parked:          { stageIndex: 2, terminal: true, offPath: 'parked' },
};

// ============================================================
// Estimator (ADR-8) — tiers & price bands
// ============================================================

export type Tier = 'spark' | 'standard' | 'advanced';

export const TIER_BANDS: Record<Tier, { low: number; high: number; label: string }> = {
  spark:    { low: 3000,  high: 5000,  label: 'Spark' },
  standard: { low: 7000,  high: 12000, label: 'Standard' },
  advanced: { low: 15000, high: 22000, label: 'Advanced' },
};

// ============================================================
// Database Entities
// ============================================================

export interface RoadmapItem {
  title: string;
  detail: string;
}

// The free Blueprint artifact (refined idea, target users, key features, roadmap).
// The estimate lives in dedicated project columns. The technical/executable brief
// stays gated (projects.brief), never surfaced here.
export interface BlueprintOutputs {
  refinedIdea: string;      // Markdown — a solid paragraph
  targetUsers: string;      // who it's for
  keyFeatures: string[];    // "what we'll build" — visible scope
  roadmap: RoadmapItem[];
}

// The internal, GATED structured brief (targets the harness brief.md schema).
// Stored in projects.brief and consumed at build time — never returned to the
// founder pre-payment (ADR-6 free/gated enforcement).
export interface Brief {
  problem: string;
  targetUsers: string;
  coreFeatures: string[];
  outOfScope: string[];
  successCriteria: string[];
}

export type RealityStatus = 'real' | 'limited' | 'mocked' | 'excluded';

export interface RealityMapEntry {
  feature: string;
  status: RealityStatus;
  note: string;
}

// Post-build deliverables recorded at handover (harness = external CLI; ops paste links).
export interface DeliverableOutputs {
  handoverDoc: string;          // Markdown — plain-language handover
  realityMap: RealityMapEntry[];
}

export interface ProjectOutputs {
  blueprint?: BlueprintOutputs;
  deliverables?: DeliverableOutputs;
  issueNote?: string; // founder-reported defect during Proving Ground (UAT)
}

export interface ClarifyingQuestionEntry {
  question: string;
  answer: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  status: ProjectStatus;
  idea_text: string;
  clarifying_questions: ClarifyingQuestionEntry[] | null;
  outputs: ProjectOutputs | null;
  // Estimate (ADR-8) — firm_price is null until Green-Light.
  tier: Tier | null;
  estimate_low: number | null;
  estimate_high: number | null;
  firm_price: number | null;
  paid_at: string | null;       // ISO 8601 — T-0
  repo_url: string | null;
  staging_url: string | null;
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}

// ============================================================
// ProgressTracker step shape (animated forge/status displays)
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
// Portfolios (a user owns many; each holds many ideas)
// ============================================================

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaSummary {
  id: string;
  status: ProjectStatus;
  title: string;       // short label derived from the idea text
  stageLabel: string;  // founder-facing journey stage
  stageIndex: number;  // for a mini progress bar
  updatedAt: string;
}

export interface PortfolioWithIdeas {
  id: string;
  name: string;
  createdAt: string;
  ideas: IdeaSummary[];
}

export interface PortfoliosResponse {
  portfolios: PortfolioWithIdeas[];
}

export interface CreatePortfolioRequest {
  name: string;
}

export interface RenamePortfolioRequest {
  name: string;
}

// ============================================================
// API: POST /api/projects
// ============================================================

export interface CreateProjectRequest {
  portfolioId: string;
  ideaText: string; // 20–500 chars
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
  questions: string[]; // 1–3 items
}

// ============================================================
// API: POST /api/projects/[id]/submit-answers
// ============================================================

export interface SubmitAnswersRequest {
  answers: ClarifyingQuestionEntry[];
}

export interface SubmitAnswersResponse {
  success: boolean;
  nextStatus: 'blueprint_ready';
}

// ============================================================
// API: POST /api/projects/[id]/commission
// ============================================================

export interface CommissionResponse {
  success: boolean;
  status: 'commissioned';
}

// ============================================================
// API: POST /api/projects/[id]/park
// ============================================================

export interface ParkResponse {
  success: boolean;
  status: 'parked';
}

// ============================================================
// API: Proving Ground → Handover → Launch (founder)
// ============================================================

export interface AcceptResponse {
  success: boolean;
  status: 'handover';
}

export interface ReportIssueRequest {
  note: string;
}

export interface FinishRequest {
  choice: 'launch' | 'managed';
}

export interface FinishResponse {
  success: boolean;
  status: 'launched' | 'managed';
}

// ============================================================
// API: POST /api/projects/[id]/checkout
// ============================================================

export interface CheckoutResponse {
  url: string;
}

// ============================================================
// API: GET /api/projects/[id]
// ============================================================

export interface EstimateView {
  tier: Tier | null;
  low: number | null;
  high: number | null;
  firmPrice: number | null;
}

export interface ProjectResponse {
  id: string;
  status: ProjectStatus;
  ideaText: string;
  clarifyingQuestions: ClarifyingQuestionEntry[] | null;
  outputs: ProjectOutputs | null;
  estimate: EstimateView;
  paidAt: string | null;
  repoUrl: string | null;
  stagingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Ops surface (role: ops)
// ============================================================

export interface OpsProjectSummary {
  id: string;
  status: ProjectStatus;
  ideaText: string;
  tier: Tier | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  firmPrice: number | null;
  repoUrl: string | null;
  stagingUrl: string | null;
  issueNote: string | null; // founder-reported defect during Proving Ground
  createdAt: string;
  updatedAt: string;
}

export interface OpsProjectsResponse {
  projects: OpsProjectSummary[];
}

export interface ApproveRequest {
  firmPrice: number; // whole USD
}

export interface DeliverRequest {
  repoUrl: string;
  stagingUrl: string;
  handoverDoc: string;
  realityMap: RealityMapEntry[];
}

// ============================================================
// API: GET /api/health
// ============================================================

export interface HealthResponse {
  status: 'ok';
  timestamp: string; // ISO 8601
}

// ============================================================
// LLM Internal Types (used in lib/ai/client.ts — not exposed in API)
// ============================================================

export interface IdeaCheckResult {
  verdict: 'accept' | 'decline';
  reason: string;
}

export interface QuestionsResult {
  questions: string[];
}

// ============================================================
// API Error Shape
// ============================================================

export interface ApiError {
  error: string;
}
