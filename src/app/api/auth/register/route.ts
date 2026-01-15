// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

// Helper to handle BigInt for JSON responses
const serialize = (data: any) => 
    JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

export async function GET(req: Request) {
    try{
        
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

        const invite = await prisma.inviteToken.findUnique({ where: { token } });
        if (!invite || invite.isUsed) {
            return NextResponse.json({ error: 'Invalid or used token' }, { status: 401 });
        }

        const options = await generateRegistrationOptions({
            rpName: 'Math App',
            rpID: RP_ID,
            userName: `User-${token.substring(0, 5)}`,
        });

        return NextResponse.json(options);

    } catch (error) {
        console.error("INTERNAL_LOG:", error); // Logs to your PC/Vercel console (Private)

        // Send a generic message to the browser (Public)
        return NextResponse.json(
            { error: 'Internal Server Error' }, 
            { status: 500 }
        );
    }
    
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, attestationResponse, challenge } = body;
        
        const { searchParams } = new URL(req.url);
        const rawToken = searchParams.get('token');



        const verification = await verifyRegistrationResponse({
            response: attestationResponse,
            expectedChallenge: challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
                
            // This is the safest way to extract the data in the latest SimpleWebAuthn
                const regInfo = verification.registrationInfo;
                
        
                // NEW STRUCTURE: Everything is inside regInfo.credential
                const id = regInfo.credential.id; 
                const pubKey = regInfo.credential.publicKey;
                const counter = regInfo.credential.counter;

                if (!rawToken) {
                  return NextResponse.json({ error: 'Token is required' }, { status: 400 });
                }
                
                const invite = await prisma.inviteToken.findUnique({
                  where: { token: rawToken }
                });




                const newUser = await prisma.user.create({
                  data: {
                    username: `user_${Date.now()}`,
                    name: invite?.recipient || 'New Agent',
                    credentialID: id,
                    publicKey: Buffer.from(pubKey).toString('base64'),
                    counter: BigInt(counter),
                  },
                });

                const cookieStore = await cookies();
                
                cookieStore.set('userId', newUser.id, { 
                    httpOnly: true, 
                    secure: true, 
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24 * 7 // 1 week
                });

                await prisma.inviteToken.delete({
                    where: { token: token } 
                });

                return NextResponse.json(serialize({ success: true }));
            

        }

        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

    } catch (error) {
        console.error("INTERNAL_LOG:", error); // Logs to your PC/Vercel console (Private)

        // Send a generic message to the browser (Public)
        return NextResponse.json(
            { error: 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}