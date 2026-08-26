import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { paystackInitialize } from '@/lib/paystack';
import type { Project, CheckoutResponse, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Founder pays the firm price (Ignition). Requires an approved project with a
// firm_price set at Green-Light. Initializes a Paystack transaction and returns
// the hosted checkout URL; the webhook confirms payment and sets T-0.
export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
  }

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !project) {
    return Response.json({ error: 'Project not found.' } satisfies ApiError, { status: 404 });
  }

  const typedProject = project as Project;

  if (typedProject.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' } satisfies ApiError, { status: 403 });
  }

  if (typedProject.status !== 'approved' || typedProject.firm_price === null) {
    return Response.json(
      { error: 'This project is not ready for payment yet.' } satisfies ApiError,
      { status: 409 },
    );
  }

  if (!user.email) {
    return Response.json({ error: 'Your account has no email on file.' } satisfies ApiError, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const reference = `uf_${id.slice(0, 8)}_${crypto.randomUUID()}`;

  const init = await paystackInitialize({
    email: user.email,
    amountMinor: typedProject.firm_price * 100, // USD dollars → cents
    currency: 'USD',
    reference,
    callbackUrl: `${origin}/status?paid=1`,
    metadata: { projectId: id },
  });

  if (!init) {
    return Response.json(
      { error: 'Could not start checkout. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  // Record a pending payment (service role — trusted server write).
  const { error: payError } = await getServiceSupabase().from('payments').insert({
    project_id: id,
    reference: init.reference,
    amount: typedProject.firm_price,
    status: 'pending',
  });
  if (payError) {
    console.error('[POST /api/projects/[id]/checkout] payments insert error:', payError.message);
    // Non-fatal: the webhook can still reconcile via metadata + reference.
  }

  const responseBody: CheckoutResponse = { url: init.authorizationUrl };
  return Response.json(responseBody, { status: 200 });
}
