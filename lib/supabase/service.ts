import { createClient } from '@supabase/supabase-js';

// WARNING: Never import this file in any client-side component or expose to the browser.
// The service role key bypasses ALL Row Level Security policies.
// Used exclusively in server-side API routes (currently: app/api/leads/route.ts).

/**
 * Returns a Supabase client with service role privileges.
 * Lazily initialised so that missing env vars fail at request time (not module load time),
 * which allows Next.js static analysis and builds to succeed without real credentials.
 */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
