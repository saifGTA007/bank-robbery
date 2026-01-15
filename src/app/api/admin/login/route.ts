import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // Check against the hidden environment variable
    if (password === process.env.ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      
      // Set the "session" cookie securely from the server
      cookieStore.set('admin_auth', 'true', {
        httpOnly: true, // Prevents JavaScript from stealing the cookie
        secure: true,   // Only works over HTTPS
        sameSite: 'strict',
        maxAge: 3600,   // 1 hour
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}