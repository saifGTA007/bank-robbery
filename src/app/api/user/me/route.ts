import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // 1. Await the cookies (This fixes your TS2339 error)
    const cookieStore = await cookies(); 
    
    // 2. Get the userId from your session cookie
    // Note: Make sure 'userId' matches the name you used in your Sign-in/Register logic
    const userId = cookieStore.get('userId')?.value; 

    if (!userId) {
      return NextResponse.json({ name: 'Agent' }, { status: 200 });
    }

    // 3. Fetch the name from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    return NextResponse.json({ 
      name: user?.name || 'Agent' 
    });

  } catch (error) {
    console.error("Identity API Error:", error);
    return NextResponse.json({ name: 'Agent' }, { status: 500 });
  }
}