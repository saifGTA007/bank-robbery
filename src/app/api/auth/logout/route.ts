import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = await cookies();
    // This expires the cookie immediately
    cookieStore.delete('auth_session'); 
    return NextResponse.json({ success: true });
}