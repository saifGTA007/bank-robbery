// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { logEvent } from '@/app/utils/logger';

const prisma = new PrismaClient();
const RP_ID = process.env.RP_ID || 'localhost ' || '66125277e47a.ngrok-free.app';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000' || 'https://66125277e47a.ngrok-free.app/';

// Helper to handle BigInt for JSON responses
const serialize = (data: any) => 
    JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

let serverHitCount = 0;

export async function GET(req: Request) {
    serverHitCount++;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const debugId = searchParams.get('debug');

    console.log(`\n--- [SERVER GET] Hit #${serverHitCount} ---`);
    console.log(`Debug ID from Client: ${debugId}`);
    console.log(`Token Received: ${token}`);

    try {
        if (!token) {
            console.error("Result: Missing Token");
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const invite = await prisma.inviteToken.findUnique({ where: { token } });
        
        if (!invite) {
            console.error(`Result: Token ${token} not found in DB`);
            return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        }

        console.log(`Result: Token valid for recipient: ${invite.recipient}`);

        const options = await generateRegistrationOptions({
            rpName: 'Security Vault',
            rpID: RP_ID,
            userID: Buffer.from(invite.id), 
            userName: invite.recipient || 'new_agent', 
            userDisplayName: invite.recipient || 'New Agent',
        });

        console.log(`Result: Success. Sending options with challenge: ${options.challenge.slice(0, 10)}...`);

        return NextResponse.json(options, {
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (error) {
        console.error("Result: Internal Error", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Get EVERYTHING from the body
        const { token, attestationResponse, challenge } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const verification = await verifyRegistrationResponse({
            response: attestationResponse,
            expectedChallenge: challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const regInfo = verification.registrationInfo;
            
            // Look up the invite using the token from the BODY
            const invite = await prisma.inviteToken.findUnique({
                where: { token: token }
            });

            if (!invite) {
                return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
            }

            const internalUserId = crypto.randomUUID();
            const newUser = await prisma.user.create({
                data: {
                    id: internalUserId,
                    username: invite.recipient?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`,
                    name: invite.recipient || 'New Agent',
                    credentialID: regInfo.credential.id,
                    publicKey: Buffer.from(regInfo.credential.publicKey).toString('base64'),
                    counter: BigInt(regInfo.credential.counter),
                },
            });

            if(newUser.name) {
                await logEvent('USER_REGISTERED', `Vault access granted.`, newUser.name);
            }
            

            // Set Cookie
            const cookieStore = await cookies();
            cookieStore.set('userId', newUser.id, { 
                httpOnly: true, 
                secure: true, 
                sameSite: 'strict',
                path: '/', // Ensure path is root
                maxAge: 60 * 60 * 24 * 7 
            });

            // Delete token LAST
            await prisma.inviteToken.delete({ where: { token: token } });

            return NextResponse.json(serialize({ success: true }));
        }

        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

    } catch (error) {
        console.error("POST_ERROR:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}