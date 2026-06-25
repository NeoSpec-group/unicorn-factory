import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

/**
 * Server-side Supabase client for API routes.
 * Reads cookies from the incoming NextRequest — honours the user's session JWT.
 * The setAll no-op is intentional: API routes do not refresh tokens.
 * If session expiry causes redirect friction, consider upgrading to full cookie management.
 */
export function createServerClient(request: NextRequest) {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // API routes: cookies are read-only at this layer.
          // Auth relies on the JWT passed in cookies from the browser client.
          // This no-op is acceptable for MVP; upgrade to full setAll for production token refresh.
        },
      },
    },
  );
}
