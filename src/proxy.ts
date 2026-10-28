import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Every page and API route requires a signed-in, allow-listed Google account,
// except: the sign-in flow itself, the login page, and the cron/admin routes,
// which keep their own CRON_SECRET / ADMIN_SECRET checks.
const PUBLIC_PREFIXES = ['/api/auth', '/login', '/api/cron', '/api/admin'];

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (req.auth) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const login = new URL('/login', req.nextUrl.origin);
  login.searchParams.set('callbackUrl', `${pathname}${search}`);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
