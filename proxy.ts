import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_ROUTES = [
  '/intake',
  '/workshop',
  '/blueprint',
  '/commission',
  '/status',
  '/handover',
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
    '/intake/:path*',
    '/workshop/:path*',
    '/blueprint/:path*',
    '/commission/:path*',
    '/status/:path*',
    '/handover/:path*',
    '/intake',
    '/workshop',
    '/blueprint',
    '/commission',
    '/status',
    '/handover',
  ],
};
