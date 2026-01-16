import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ipMap = new Map<string, { count: number; lastReset: number }>();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0] : (realIp ?? '127.0.0.1');
  const now = Date.now();

  if (pathname.startsWith('/api')) {
    const windowMs = 60 * 1000;
    
    // Check if it's an admin or auth route
    const isAdminRoute = pathname.startsWith('/api/admin');
    const isRegisterRoute = pathname.startsWith('/api/auth/register');

    // FIX: Increase Admin limit to 50 so you don't get blocked while working.
    // Keep Registration at 5 to prevent brute forcing tokens.
    let maxRequests = 30;
    if (isAdminRoute) maxRequests = 50; 
    if (isRegisterRoute) maxRequests = 5;

    const userData = ipMap.get(ip) || { count: 0, lastReset: now };

    if (now - userData.lastReset > windowMs) {
      userData.count = 1;
      userData.lastReset = now;
    } else {
      userData.count++;
    }

    ipMap.set(ip, userData);

    if (userData.count > maxRequests) {
      console.warn(`[RATE LIMIT] ${ip} blocked on ${pathname}`);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Try again in a minute.',
          type: isAdminRoute ? 'ADMIN_LIMIT' : 'SECURITY_BLOCK'
        }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. PAGE PROTECTION
  if (pathname.startsWith('/calculator')) {
    const session = request.cookies.get('auth_session');
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}