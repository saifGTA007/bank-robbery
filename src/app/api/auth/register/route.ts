// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { logEvent } from '@/app/utils/logger';

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

        // 1. Create a unique string ID
        const internalId = crypto.randomUUID();

        // 2. Convert the string into a Uint8Array
        const encoder = new TextEncoder();
        const userIdentifierBuffer = encoder.encode(internalId);

        const options = await generateRegistrationOptions({
            rpName: 'Math App',
            rpID: RP_ID,
            userID: userIdentifierBuffer, // Unique ID for this session
            userName: invite.recipient || 'New Agent', // THIS is what the user sees in the popup
            userDisplayName: invite.recipient || 'New Agent',
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
                const internalUserId = crypto.randomUUID();
        
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
    // 1. Use the UUID we generated earlier
    id: internalUserId, 
    
    // 2. Make the username a readable version of their name
    username: invite?.recipient?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`,
    
    // 3. This is what shows up in your "Welcome" header
    name: invite?.recipient || 'New Agent',
    
    // 4. Store the WebAuthn specific data
    credentialID: id,
    
    // 5. Use Buffer for 'Bytes' types in Prisma (better than base64 strings)
    publicKey: Buffer.from(pubKey).toString('base64'), 
    
    // 6. Prisma handles BigInt automatically
    counter: BigInt(counter),
  },
});

                await logEvent(
                  'USER_REGISTERED', 
                  `Biometric registration successful. Vault access granted.`, 
                  newUser.name || 'Unknown'
                );

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