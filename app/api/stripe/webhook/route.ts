import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase/service';

// Stripe webhook. Unauthenticated but signature-verified. On a completed
// checkout, marks the payment paid and sets the project to 'paid' (T-0).
// Idempotent: status guards make repeated deliveries no-ops.
export async function POST(request: NextRequest): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return Response.json({ error: 'Missing signature or secret.' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const projectId = session.metadata?.projectId;
    const paidAt = new Date().toISOString();
    const svc = getServiceSupabase();

    // Mark the payment paid (idempotent — only flips a non-paid row).
    await svc
      .from('payments')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('stripe_session_id', sessionId)
      .neq('status', 'paid');

    // Advance the project to Ignition (T-0). Guarded to 'approved' so replays
    // and out-of-order events can't move a project backwards.
    if (projectId) {
      const { error } = await svc
        .from('projects')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', projectId)
        .eq('status', 'approved');
      if (error) {
        console.error('[stripe/webhook] project update error:', error.message);
      }
    }
  }

  return Response.json({ received: true }, { status: 200 });
}
