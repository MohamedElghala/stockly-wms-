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

  // Open Preview & Inspection: Auto-grant admin session if not set
  if (!role) {
    if (pathname === '/') {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      const maxAge = 60 * 60 * 24 * 30;
      response.cookies.set('userRole', 'admin', { path: '/', maxAge, sameSite: 'lax' });
      response.cookies.set('roleClass', 'role-admin', { path: '/', maxAge, sameSite: 'lax' });
      return response;
    }
    const response = NextResponse.next();
    const maxAge = 60 * 60 * 24 * 30;
    response.cookies.set('userRole', 'admin', { path: '/', maxAge, sameSite: 'lax' });
    response.cookies.set('roleClass', 'role-admin', { path: '/', maxAge, sameSite: 'lax' });
    return response;
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
