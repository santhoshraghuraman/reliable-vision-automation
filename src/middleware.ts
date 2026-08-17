import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware — Stage 2: Real Supabase session detection.
 *
 * Supabase JS v2 stores the session in localStorage on the browser,
 * but also sets an 'sb-<project-ref>-auth-token' cookie automatically
 * when using the default storage strategy.
 *
 * We detect a live session by looking for Supabase's own access_token
 * cookie (sb-<ref>-auth-token.0 / sb-<ref>-auth-token) or the
 * legacy sb-auth cookie we set during the transition period.
 */

const SUPABASE_PROJECT_REF = 'qumijqnkzfphsytwizkv';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/leads',
  '/campaigns',
  '/conversations',
  '/follow-ups',
  '/analytics',
  '/settings',
];

function hasValidSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();

  return cookies.some((c) => {
    const name = c.name.toLowerCase();
    return (
      // Supabase SSR / JS v2 real session cookies
      name.startsWith(`sb-${SUPABASE_PROJECT_REF}-auth-token`) ||
      name === 'sb-access-token' ||
      name === 'sb-refresh-token' ||
      // Legacy fallback (manual cookie set during demo period)
      name === 'sb-auth'
    );
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = pathname.startsWith('/login');

  const authenticated = hasValidSession(request);

  // Unauthenticated → redirect to /login
  if (isProtectedRoute && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → redirect away from /login to /dashboard
  if (isAuthRoute && authenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.searchParams.delete('redirect');
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/campaigns/:path*',
    '/conversations/:path*',
    '/follow-ups/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/login',
  ],
};
