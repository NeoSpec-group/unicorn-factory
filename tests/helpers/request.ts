import { NextRequest } from 'next/server';

/**
 * Build a NextRequest for invoking App Router route handlers directly in
 * tests (per Design Decision 1's integration test strategy — route handlers
 * are exported functions, invoked with a crafted NextRequest, with
 * `@/lib/supabase/*`, `@/lib/ai/*`, and `@/lib/paystack` mocked at the module
 * boundary via `vi.mock`).
 */
export function makeRequest(
  url: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    rawBody?: string;
  } = {},
): NextRequest {
  const { method = 'GET', body, headers = {}, rawBody } = init;

  const finalHeaders: Record<string, string> = { ...headers };
  let finalBody: string | undefined;

  if (rawBody !== undefined) {
    finalBody = rawBody;
  } else if (body !== undefined) {
    finalHeaders['content-type'] = finalHeaders['content-type'] ?? 'application/json';
    finalBody = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: finalHeaders,
    body: finalBody,
  });
}

/** Build a NextRequest with a deliberately malformed JSON body (400 path). */
export function makeMalformedJsonRequest(
  url: string,
  method = 'POST',
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'content-type': 'application/json' },
    body: '{not-valid-json',
  });
}

/** Build the `{ params: Promise<{ id: string }> }` shape App Router dynamic routes receive. */
export function routeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
