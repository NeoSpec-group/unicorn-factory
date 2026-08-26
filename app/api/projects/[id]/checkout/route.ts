import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe';
import type { Project, CheckoutResponse, ApiError } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Founder pays the firm price (Ignition). Requires an approved project with a
// firm_price set at Green-Light. Creates a Stripe Checkout session and a pending
// payments row; the webhook confirms payment and sets T-0.
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

  const origin = request.nextUrl.origin;
  let sessionUrl: string | null;
  let sessionId: string;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Unicorn Factory — MVP build' },
            unit_amount: typedProject.firm_price * 100, // dollars → cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/status?paid=1`,
      cancel_url: `${origin}/status`,
      metadata: { projectId: id },
    });
    sessionUrl = session.url;
    sessionId = session.id;
  } catch (err) {
    console.error('[POST /api/projects/[id]/checkout] Stripe error:', err);
    return Response.json(
      { error: 'Could not start checkout. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  if (!sessionUrl) {
    return Response.json(
      { error: 'Could not start checkout. Please try again.' } satisfies ApiError,
      { status: 502 },
    );
  }

  // Record a pending payment (service role — trusted server write).
  const { error: payError } = await getServiceSupabase().from('payments').insert({
    project_id: id,
    stripe_session_id: sessionId,
    amount: typedProject.firm_price,
    status: 'pending',
  });
  if (payError) {
    console.error('[POST /api/projects/[id]/checkout] payments insert error:', payError.message);
    // Non-fatal: the webhook can still reconcile via metadata.
  }

  const responseBody: CheckoutResponse = { url: sessionUrl };
  return Response.json(responseBody, { status: 200 });
}
