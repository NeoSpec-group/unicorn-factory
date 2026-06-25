import type { NextRequest } from 'next/server';
import type { HealthResponse } from '@/types';

export function GET(_request: NextRequest): Response {
  const body: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status: 200 });
}
