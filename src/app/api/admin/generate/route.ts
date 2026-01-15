import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers'; // Add this
import { logEvent } from '@/app/utils/logger';

export async function POST(req: Request) {
  try {
    // Check for the secure cookie instead of a password in the body
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');

    if (auth?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    const token = randomBytes(3).toString('hex').toUpperCase();

    await prisma.inviteToken.create({
      data: {
        token: token,
        recipient: name,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await logEvent('TOKEN_GENERATED', `Issued token for ${name}`, 'Admin');

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}