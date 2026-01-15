import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse, generateAuthenticationOptions } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Use environment variables for these when going online!
const RP_ID = '7038ca0269c6.ngrok-free.app'; 
const ORIGIN = 'https://7038ca0269c6.ngrok-free.app'; 

export async function GET() {
    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'preferred',
    });
    return NextResponse.json(options);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { authResponse, challenge } = body;

        const user = await prisma.user.findFirst({
            where: { credentialID: authResponse.id }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 1. Lockout Check
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            const remaining = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
            return NextResponse.json({ 
                error: `Locked. Try again in ${remaining} minutes.` 
            }, { status: 423 });
        }

        // 2. Actual Verification
        const verification = await verifyAuthenticationResponse({
            response: authResponse,
            expectedChallenge: challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credential: {
                id: user.credentialID,
                publicKey: Buffer.from(user.publicKey, 'base64'),
                counter: Number(user.counter),
            },
        });

        if (verification.verified) {
            // 3. Success: Reset and Set Cookie
            await prisma.user.update({
                where: { id: user.id },
                data: { 
                    failedAttempts: 0, 
                    lockoutUntil: null,
                    counter: BigInt(verification.authenticationInfo.newCounter) 
                }
            });

            const cookieStore = await cookies();
            cookieStore.set('auth_session', user.id, {
                httpOnly: true,
                secure: true, // Required for WebAuthn/HTTPS
                sameSite: 'strict',
                maxAge: 60 * 60 * 24,
                path: '/',
            });

            return NextResponse.json({ success: true });
        } else {
            // 4. Failure: Increment attempts
            const newFailCount = user.failedAttempts + 1;
            const lockoutUntil = newFailCount >= 10 ? new Date(Date.now() + 5 * 60 * 1000) : null;

            await prisma.user.update({
                where: { id: user.id },
                data: { failedAttempts: newFailCount, lockoutUntil }
            });

            return NextResponse.json({ error: 'Fingerprint not recognized' }, { status: 401 });
        }
    } catch (error) {
        console.error("INTERNAL_LOG:", error); // Logs to your PC/Vercel console (Private)
        
        // Send a generic message to the browser (Public)
        return NextResponse.json(
            { error: 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}