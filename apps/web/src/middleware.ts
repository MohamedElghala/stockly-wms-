import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths and static assets
  if (
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('favicon') || 
    pathname.includes('icon') || 
    pathname.endsWith('.ico') || 
    pathname.endsWith('.svg') || 
    pathname.endsWith('.png') || 
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';

  // Check cookies
  const role = request.cookies.get('userRole')?.value;
  const roleClass = request.cookies.get('roleClass')?.value;

  if (!role && !isLocalhost) {
    // Not logged in
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (role === 'pending' || role === 'blocked') {
    // Logged in but not allowed
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('status', role);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect / to /dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
