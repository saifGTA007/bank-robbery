import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('admin_auth');

  // If cookie isn't there, send an error instead of crashing the frontend
  if (auth?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return NextResponse.json(logs); // This returns the Array the frontend wants
}