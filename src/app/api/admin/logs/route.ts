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

export async function DELETE() {
    try {
        // 1. Optional: Check if user is actually an admin via cookies/session
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Wipe the logs
        await prisma.activityLog.deleteMany({});

        // 3. Create a fresh log entry so the dashboard isn't completely empty
        await prisma.activityLog.create({
            data: {
                action: 'SYSTEM_WIPE',
                details: 'All previous system logs were cleared by administrative override.',
                userName: 'ROOT_ADMIN'
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Clear Logs Error:", error);
        return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
    }
}