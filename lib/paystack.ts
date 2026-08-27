import crypto from 'crypto';

// Server-only Paystack helpers (no SDK — plain REST with the secret key).
const BASE = 'https://api.paystack.co';

function secret(): string {
  return process.env.PAYSTACK_SECRET_KEY!;
}

export interface PaystackInit {
  authorizationUrl: string;
  reference: string;
}

/**
 * Initialize a transaction and get a hosted checkout URL to redirect to.
 * `amountMinor` is in the currency's smallest unit (cents for USD).
 */
export async function paystackInitialize(params: {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<PaystackInit | null> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountMinor,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });
  const json = (await res.json()) as {
    status?: boolean;
    data?: { authorization_url?: string; reference?: string };
  };
  if (!res.ok || !json.status || !json.data?.authorization_url || !json.data.reference) return null;
  return { authorizationUrl: json.data.authorization_url, reference: json.data.reference };
}

/** Verify a transaction server-side. Returns the transaction status (e.g. "success"). */
export async function paystackVerify(reference: string): Promise<{ status: string } | null> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
  });
  const json = (await res.json()) as { status?: boolean; data?: { status?: string } };
  if (!res.ok || !json.status || !json.data?.status) return null;
  return { status: json.data.status };
}

/**
 * Verify a webhook came from Paystack: HMAC-SHA512 of the raw body, keyed with
 * the secret key, compared (constant-time) to the x-paystack-signature header.
 */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac('sha512', secret()).update(rawBody).digest('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
