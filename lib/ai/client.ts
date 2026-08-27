import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Allow model override via env var — no code change needed to swap models.
// Default: claude-haiku-4-5. Fallback: claude-3-haiku-20240307 (set ANTHROPIC_MODEL in .env).
const MODEL_ID = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';

/**
 * Wrapper around generateText with one automatic retry on failure.
 * Throws after the second failure — callers must handle this and return HTTP 502.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 512,
): Promise<string> {
  const model = anthropic(MODEL_ID);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens,
      });
      return text;
    } catch (err) {
      lastError = err;
      // Brief pause before retry — avoids thundering herd on transient errors
      if (attempt === 1) await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw lastError;
}

/**
 * Safely parse LLM JSON output. Tries a strict parse first, then falls back to
 * extracting the outermost JSON object/array (models sometimes wrap JSON in
 * prose or ```json fences). Returns null if nothing parses.
 */
export function parseLLMJson<T>(text: string): T | null {
  const strict = tryParse<T>(text.trim());
  if (strict !== null) return strict;

  // Strip code fences, then grab the first {...} or [...] span.
  const unfenced = text.replace(/```(?:json)?/gi, '').trim();
  const objMatch = unfenced.match(/[{[][\s\S]*[}\]]/);
  if (objMatch) {
    const extracted = tryParse<T>(objMatch[0]);
    if (extracted !== null) return extracted;
  }
  return null;
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
