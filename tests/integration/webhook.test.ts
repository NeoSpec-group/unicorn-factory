import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Keep the REAL verifyPaystackSignature (crypto.createHmac('sha512', ...)) so the
// signature-verification security logic is genuinely exercised — only the
// network call to Paystack (`paystackVerify`) is mocked. `getServiceSupabase`
// is mocked at the module boundary per Design Decision 1's integration strategy.
vi.mock('@/lib/paystack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/paystack')>();
  return { ...actual, paystackVerify: vi.fn() };
});
vi.mock('@/lib/supabase/service', () => ({ getServiceSupabase: vi.fn() }));

import { paystackVerify } from '@/lib/paystack';
import { getServiceSupabase } from '@/lib/supabase/service';
import { POST as webhook } from '@/app/api/paystack/webhook/route';
import { createFakeSupabaseClient, ok, type CallRecord } from '../helpers/mocks';

const SECRET = 'test_paystack_secret';

function sign(rawBody: string): string {
  return crypto.createHmac('sha512', SECRET).update(rawBody).digest('hex');
}

function webhookRequest(rawBody: string, signature: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature !== null) headers['x-paystack-signature'] = signature;
  // NextRequest is a superset of Request; the route only uses request.text()
  // and request.headers, both present on plain Request, so a straight cast
  // (no runtime shim needed) is sufficient for these handler-level tests.
  return new Request('http://localhost:3000/api/paystack/webhook', {
    method: 'POST',
    headers,
    body: rawBody,
  }) as unknown as import('next/server').NextRequest;
}

const chargeSuccessBody = (overrides: { reference?: string; status?: string; projectId?: string } = {}) =>
  JSON.stringify({
    event: 'charge.success',
    data: {
      reference: overrides.reference ?? 'ref_abc123',
      status: overrides.status ?? 'success',
      metadata: { projectId: overrides.projectId ?? 'project-1' },
    },
  });

beforeAll(() => {
  process.env.PAYSTACK_SECRET_KEY = SECRET;
});

beforeEach(() => {
  vi.mocked(paystackVerify).mockReset();
  vi.mocked(getServiceSupabase).mockReset();
});

describe('POST /api/paystack/webhook — signature verification', () => {
  it('401s when the signature header is missing', async () => {
    const res = await webhook(webhookRequest(chargeSuccessBody(), null));
    expect(res.status).toBe(401);
  });

  it('401s when the signature is invalid (does not match HMAC-SHA512 of the raw body)', async () => {
    const res = await webhook(webhookRequest(chargeSuccessBody(), 'a'.repeat(128)));
    expect(res.status).toBe(401);
  });

  it('accepts a genuinely valid HMAC-SHA512 signature', async () => {
    const body = chargeSuccessBody({ status: 'success' });
    vi.mocked(paystackVerify).mockResolvedValue({ status: 'success' });
    vi.mocked(getServiceSupabase).mockReturnValue(
      createFakeSupabaseClient({ from: { payments: [ok(null)], projects: [ok(null)] } }) as never,
    );

    const res = await webhook(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});

describe('POST /api/paystack/webhook — malformed body', () => {
  it('400s on a malformed JSON body even with a valid signature over that (malformed) raw body', async () => {
    const rawBody = '{not-valid-json';
    const res = await webhook(webhookRequest(rawBody, sign(rawBody)));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/paystack/webhook — charge.success fulfillment + idempotency', () => {
  it('re-verifies with Paystack before fulfilling, and no-ops (200, no DB writes) if re-verification fails', async () => {
    const body = chargeSuccessBody();
    vi.mocked(paystackVerify).mockResolvedValue(null); // re-verify failed
    const svc = vi.fn();
    vi.mocked(getServiceSupabase).mockImplementation(svc);

    const res = await webhook(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(svc).not.toHaveBeenCalled(); // no fulfillment attempted without a verified charge
  });

  it('marks the payment paid and advances the project approved → paid on a verified charge, using idempotency-guarded queries', async () => {
    const body = chargeSuccessBody({ reference: 'ref_xyz', projectId: 'project-42' });
    vi.mocked(paystackVerify).mockResolvedValue({ status: 'success' });

    const paymentsLog: CallRecord[] = [];
    const projectsLog: CallRecord[] = [];
    vi.mocked(getServiceSupabase).mockReturnValue(
      createFakeSupabaseClient({
        from: { payments: [ok(null)], projects: [ok(null)] },
        callLog: { payments: paymentsLog, projects: projectsLog },
      }) as never,
    );

    const res = await webhook(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Payment fulfillment is guarded so a replay can't re-fulfil an already-paid row.
    expect(paymentsLog.some((c) => c.method === 'update')).toBe(true);
    expect(paymentsLog.some((c) => c.method === 'eq' && c.args[0] === 'reference' && c.args[1] === 'ref_xyz')).toBe(
      true,
    );
    expect(paymentsLog.some((c) => c.method === 'neq' && c.args[0] === 'status' && c.args[1] === 'paid')).toBe(true);

    // Project advance is guarded so an out-of-order/replayed event can't move status backward.
    expect(projectsLog.some((c) => c.method === 'update')).toBe(true);
    expect(projectsLog.some((c) => c.method === 'eq' && c.args[0] === 'id' && c.args[1] === 'project-42')).toBe(true);
    expect(projectsLog.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'approved')).toBe(
      true,
    );
  });

  it('a replayed identical event issues the same idempotency-guarded queries both times (cannot double-fulfil)', async () => {
    const body = chargeSuccessBody({ reference: 'ref_replay', projectId: 'project-replay' });
    vi.mocked(paystackVerify).mockResolvedValue({ status: 'success' });

    const runOnce = async () => {
      const paymentsLog: CallRecord[] = [];
      const projectsLog: CallRecord[] = [];
      vi.mocked(getServiceSupabase).mockReturnValue(
        createFakeSupabaseClient({
          from: { payments: [ok(null)], projects: [ok(null)] },
          callLog: { payments: paymentsLog, projects: projectsLog },
        }) as never,
      );
      const res = await webhook(webhookRequest(body, sign(body)));
      return { status: res.status, body: await res.json(), paymentsLog, projectsLog };
    };

    const first = await runOnce();
    const second = await runOnce();

    // Both calls return the same happy-path shape (webhook is always safe to retry)...
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual({ received: true });
    expect(second.body).toEqual({ received: true });

    // ...and both times the fulfillment query carries the guard that makes a
    // real replay a no-op once the row is actually `status = 'paid'`
    // (`.neq('status','paid')` on payments) or already advanced past
    // `approved` (`.eq('status','approved')` on projects) — proven for real
    // against Postgres in tests/integration/rls-isolation.test.ts / G-10.
    for (const run of [first, second]) {
      expect(run.paymentsLog.some((c) => c.method === 'neq' && c.args[1] === 'paid')).toBe(true);
      expect(run.projectsLog.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'approved')).toBe(
        true,
      );
    }
  });
});
