import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/intake',
  '/projects',
  '/ops', // auth-gated here; the ops ROLE is enforced in the ops API + page
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return response;
}

// Match each protected route AND its sub-paths (`:path*`) so the `startsWith`
// guard above and the matcher agree — previously the matcher was exact-only,
// leaving sub-paths unguarded.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/intake/:path*',
    '/projects/:path*',
    '/ops/:path*',
    '/dashboard',
    '/intake',
    '/projects',
    '/ops',
  ],
};
