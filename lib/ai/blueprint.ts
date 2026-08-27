import { callLLM, parseLLMJson } from '@/lib/ai/client';
import type {
  BlueprintOutputs,
  Brief,
  RoadmapItem,
  Tier,
  ClarifyingQuestionEntry,
} from '@/types';

export interface GeneratedBlueprint {
  blueprint: BlueprintOutputs;
  brief: Brief;
  tier: Tier;
}

const SYSTEM_PROMPT = `You are a senior product architect at a software MVP factory. Given a founder's idea and their answers to clarifying questions, produce a Blueprint: a validated shape of the idea, who it's for, what you'll build, a build roadmap, a complexity tier, and an internal structured brief.

Classify complexity into exactly one tier, using these definitions:
- "spark": a single core flow + authentication + database; peripheral features mocked.
- "standard": a multi-flow app + one real integration (e.g. payments OR one external API) + a dashboard.
- "advanced": multiple real integrations and richer domain logic.

Respond ONLY with a JSON object in this exact shape, no prose, no markdown fences:
{
  "refinedIdea": "A confident 4-6 sentence Markdown summary that sharpens the idea, names the core value, and reads like a mini product brief the founder would be proud of",
  "targetUsers": "1-2 sentences on exactly who this is for",
  "keyFeatures": ["A concrete feature we'll build", "..."],
  "roadmap": [{"title": "Short phase name", "detail": "1-2 sentences on what gets built in this phase and why"}],
  "tier": "spark" | "standard" | "advanced",
  "brief": {
    "problem": "The core problem in one sentence",
    "targetUsers": "Who this is for",
    "coreFeatures": ["feature", "..."],
    "outOfScope": ["explicitly excluded thing", "..."],
    "successCriteria": ["measurable acceptance criterion", "..."]
  }
}
Make keyFeatures 4-8 concrete items. Make roadmap 4-6 substantive phases. Keep brief arrays concise (2-5 items each).`;

const VALID_TIERS: Tier[] = ['spark', 'standard', 'advanced'];

interface RawBlueprint {
  refinedIdea?: unknown;
  targetUsers?: unknown;
  keyFeatures?: unknown;
  roadmap?: unknown;
  tier?: unknown;
  brief?: unknown;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

function normalizeRoadmap(v: unknown): RoadmapItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const title = asString(rec.title);
        const detail = asString(rec.detail);
        if (title) return { title, detail };
      }
      return null;
    })
    .filter((x): x is RoadmapItem => x !== null)
    .slice(0, 6);
}

/**
 * Generate a Blueprint from the idea + clarifying Q&A. Returns null if the model
 * output can't be parsed into a usable shape after a retry — the caller falls back.
 */
export async function generateBlueprint(
  ideaText: string,
  qa: ClarifyingQuestionEntry[],
): Promise<GeneratedBlueprint | null> {
  const qaText = qa
    .map((entry, i) => `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.answer ?? ''}`)
    .join('\n\n');
  const userPrompt = `Founder's idea:\n${ideaText}\n\nClarifying answers:\n${qaText}`;

  let raw: RawBlueprint | null = null;
  for (let attempt = 1; attempt <= 2 && !raw; attempt++) {
    const text = await callLLM(SYSTEM_PROMPT, userPrompt, 2048);
    raw = parseLLMJson<RawBlueprint>(text);
  }
  if (!raw) return null;

  const refinedIdea = asString(raw.refinedIdea);
  const targetUsers = asString(raw.targetUsers, 'Not specified.');
  const keyFeatures = asStringArray(raw.keyFeatures);
  const roadmap = normalizeRoadmap(raw.roadmap);
  const tier: Tier = VALID_TIERS.includes(raw.tier as Tier) ? (raw.tier as Tier) : 'standard';

  // Require the essentials; otherwise let the caller fall back.
  if (!refinedIdea || roadmap.length === 0) return null;

  const briefRaw = (raw.brief ?? {}) as Record<string, unknown>;
  const brief: Brief = {
    problem: asString(briefRaw.problem, 'Not specified.'),
    targetUsers: asString(briefRaw.targetUsers, 'Not specified.'),
    coreFeatures: asStringArray(briefRaw.coreFeatures),
    outOfScope: asStringArray(briefRaw.outOfScope),
    successCriteria: asStringArray(briefRaw.successCriteria),
  };

  return { blueprint: { refinedIdea, targetUsers, keyFeatures, roadmap }, brief, tier };
}
