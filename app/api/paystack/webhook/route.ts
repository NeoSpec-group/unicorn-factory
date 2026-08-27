import type { NextRequest } from 'next/server';
import { verifyPaystackSignature, paystackVerify } from '@/lib/paystack';
import { getServiceSupabase } from '@/lib/supabase/service';

// Paystack webhook. Unauthenticated but signature-verified (x-paystack-signature,
// HMAC-SHA512 of the raw body with the secret key). On charge.success we
// re-verify the transaction, then mark the payment paid and the project 'paid'
// (T-0). Idempotent via status guards.
export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!verifyPaystackSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: { reference?: string; status?: string; metadata?: { projectId?: string } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (event.event === 'charge.success' && event.data?.reference) {
    const reference = event.data.reference;
    const projectId = event.data.metadata?.projectId;

    // Re-verify with Paystack before fulfilling (defence in depth).
    const verified = await paystackVerify(reference);
    if (!verified || verified.status !== 'success') {
      return Response.json({ received: true }, { status: 200 });
    }

    const paidAt = new Date().toISOString();
    const svc = getServiceSupabase();

    await svc
      .from('payments')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('reference', reference)
      .neq('status', 'paid');

    if (projectId) {
      const { error } = await svc
        .from('projects')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', projectId)
        .eq('status', 'approved'); // guard: replays/out-of-order can't move backwards
      if (error) {
        console.error('[paystack/webhook] project update error:', error.message);
      }
    }
  }

  return Response.json({ received: true }, { status: 200 });
}
