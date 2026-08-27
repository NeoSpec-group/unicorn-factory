import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client using the anon/public key.
 * Safe to use in 'use client' components for auth state and reading project data.
 *
 * IMPORTANT: memoized into a single instance. Creating multiple browser clients
 * spawns multiple GoTrueClient instances that deadlock on the Web Locks auth
 * storage lock — which makes auth calls (e.g. signInWithPassword) hang forever
 * in "pending". One shared instance avoids that.
 */
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
