import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { logEvent } from '@/app/utils/logger'; // <--- Add this import

export async function POST(req: Request) {
  try {
    const { adminPassword, name } = await req.json();

    // 1. Security Check
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Generate a secure random 6-digit token
    const token = randomBytes(3).toString('hex').toUpperCase();

    // 3. Save to Database with the recipient's name
    await prisma.inviteToken.create({
      data: {
        token: token,
        recipient: name, // Storing the name you entered in the Admin UI
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hour expiry
      },
    });

    await logEvent('TOKEN_GENERATED', `Issued new access token for ${name}`, 'Admin');

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}