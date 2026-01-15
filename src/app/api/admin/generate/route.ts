// src/app/api/admin/generate/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    // SIMPLE SECURITY: Check for a hardcoded admin password in the body
    const body = await req.json();
    if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = randomBytes(4).toString('hex'); // Generates like "a1b2c3d4"

    await prisma.inviteToken.create({
        data: { token }
    });

    return NextResponse.json({ token });
}