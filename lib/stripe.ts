import Stripe from 'stripe';

// WARNING: server-only. Never import into client components.
// Lazily initialised so builds succeed without real credentials (like the
// Supabase service client) — the key is only required at request time.
export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
