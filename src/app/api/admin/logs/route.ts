import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// --- GET HANDLER ---
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_auth');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json(logs);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// --- DELETE HANDLER ---
export async function DELETE() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_auth');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Wipe the table
    await prisma.activityLog.deleteMany({});

    // Create the fresh start log
    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM_WIPE',
        details: 'Administrative override: All logs cleared.',
        userName: 'ADMIN'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: 'Failed to wipe logs' }, { status: 500 });
  }
}