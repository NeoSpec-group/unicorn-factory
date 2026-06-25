import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import type { LeadRequest, LeadResponse, ApiError } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest): Promise<Response> {
  let body: LeadRequest;
  try {
    body = (await request.json()) as LeadRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' } satisfies ApiError, { status: 400 });
  }

  const { email } = body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return Response.json({ error: 'A valid email address is required.' } satisfies ApiError, {
      status: 400,
    });
  }

  const { error } = await getServiceSupabase().from('email_leads').insert({ email: email.trim() });

  if (error) {
    console.error('[POST /api/leads] Supabase error:', error.message);
    return Response.json(
      { error: 'Failed to save email. Please try again.' } satisfies ApiError,
      { status: 500 },
    );
  }

  const responseBody: LeadResponse = { success: true };
  return Response.json(responseBody, { status: 200 });
}
