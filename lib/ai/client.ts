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
): Promise<string> {
  const model = anthropic(MODEL_ID);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 512,
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
 * Safely parse LLM JSON output.
 * Returns null if parsing fails — callers should retry or fall back gracefully.
 */
export function parseLLMJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
