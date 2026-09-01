import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';

/**
 * Email-confirmation code-exchange callback (Design Decision 4).
 *
 * Supabase redirects here with `?code=...&next=...` after the founder clicks
 * the confirmation link in their inbox. We exchange the code for a session
 * and land the founder signed-in on `next` (default `/dashboard`) — no UI of
 * its own.
 *
 * This needs a **cookie-writing** Supabase client: `lib/supabase/server.ts`
 * (used by API routes) has an intentional no-op `setAll` since those routes
 * only ever *read* an existing session cookie. Here we must *establish* the
 * session, so `setAll` writes the Supabase auth cookies onto the
 * `NextResponse` that carries the redirect — otherwise the exchanged session
 * never reaches the browser and the founder would land on `/dashboard`
 * signed out.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const redirectTo = new URL(next, origin);
    const response = NextResponse.redirect(redirectTo);

    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL('/auth?error=confirm', origin));
}
