import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory storage for rate limiting
const ipMap = new Map<string, { count: number; lastReset: number }>();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. SAFE IP EXTRACTION
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // Priority: 1. Forwarded Header, 2. Real IP Header, 3. Fallback
  const ip = forwarded 
    ? forwarded.split(',')[0] 
    : (realIp ?? '127.0.0.1');
  const now = Date.now();

  // 2. DYNAMIC RATE LIMITING
  if (pathname.startsWith('/api')) {
    const windowMs = 60 * 1000; // 1 minute
    
    // Define "Sensitive" routes that need a strict 5-request limit
    const isSensitive = 
        pathname.startsWith('/api/admin') || 
        pathname.startsWith('/api/auth/register');

    const maxRequests = isSensitive ? 5 : 30;

    const userData = ipMap.get(ip) || { count: 0, lastReset: now };

    // Reset logic
    if (now - userData.lastReset > windowMs) {
      userData.count = 1;
      userData.lastReset = now;
    } else {
      userData.count++;
    }

    ipMap.set(ip, userData);

    if (userData.count > maxRequests) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Try again in a minute.',
          type: isSensitive ? 'SECURITY_BLOCK' : 'TRAFFIC_BLOCK'
        }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. PAGE PROTECTION (Direct Access Bypass Protection)
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

export const config = {
  matcher: ['/api/:path*', '/calculator/:path*'],
};