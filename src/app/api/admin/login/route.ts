// src/app/api/admin/login/route.ts
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    
    cookieStore.set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only true in production
      sameSite: 'lax', // 'lax' is more compatible with different browsers than 'strict'
      path: '/',
      maxAge: 3600, 
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}