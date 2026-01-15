'use client';
import { useState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { sanitizeInput } from '../utils/security';
import Link from 'next/link';

export default function RegisterPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, []);

// Updated handleRegister logic
const handleRegister = async () => {
    if (!token) return setStatus("Please enter a token");
    setIsProcessing(true);
    setStatus('Contacting Server...');

    try {
        // Step 1: Get Registration Options
        const resp = await fetch(`/api/auth/register?token=${token}`);
        
        if (resp.status === 429) throw new Error("Too many attempts. Wait 1 minute.");
        if (!resp.ok) throw new Error('Token is invalid or already used');
        
        const options = await resp.json();
        setStatus('Awaiting Biometric Scan...');
        
        // Step 2: Browser Biometric Prompt
        const attResp = await startRegistration(options);

        // Step 3: Verify and Save
        setStatus('Finalizing Security...');
        const verifyResp = await fetch(`/api/auth/register`, { // No need for ?token here if it's in the body
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token, 
                attestationResponse: attResp, 
                challenge: options.challenge 
            }),
        });

        if (verifyResp.ok) {
            setStatus('Success! Account secured.');
            setTimeout(() => router.push('/'), 1500);
        } else {
            const err = await verifyResp.json();
            throw new Error(err.error || 'Verification failed');
        }
    } catch (e: any) {
        console.error(e);
        setStatus(e.message || 'Error occurred');
    } finally {
        setIsProcessing(false);
    }
};

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">Initialize Security</h2>
        <p className="text-gray-400 text-sm mb-6">Enter your one-time invitation code below.</p>
        
        <input 
          type="text" 
          placeholder="Invite Token (e.g. 9be07edb)" 
          className="input-field w-full mb-4"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        
        <button onClick={handleRegister} disabled={isProcessing} className="btn-primary w-full mb-4 disabled:opacity-50">
          {isProcessing ? 'Communicating with Secure Enclave...' : 'Scan Biometrics'}
        </button>
        
        <Link href="/" className="block text-center text-sm text-gray-500 hover:text-white transition-colors">
          Cancel & Return
        </Link>

        {status && (
          <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/20 text-center text-sm text-blue-300">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}