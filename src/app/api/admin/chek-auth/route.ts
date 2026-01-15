import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('admin_auth');

  if (auth?.value === 'true') {
    return NextResponse.json({ authorized: true });
  }

  return NextResponse.json({ authorized: false }, { status: 401 });
}