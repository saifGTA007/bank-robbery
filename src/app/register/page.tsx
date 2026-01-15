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


  
  const handleRegister = async () => {
    // 1. Sanitize the token input
    const safeToken = sanitizeInput(token, 12);
    setStatus('Verifying Token...');

      useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const t = searchParams.get('token');
        if (t) setToken(t);
      }, []);
    

    try {
      const resp = await fetch(`/api/auth/register?token=${safeToken}`);
      if (!resp.ok) throw new Error('Token is invalid or already used');
      
      const options = await resp.json();
      const attResp = await startRegistration(options);

const verifyResp = await fetch(`/api/auth/register?token=${safeToken}`, { // Add the ?token= here
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: safeToken, 
            attestationResponse: attResp, 
            challenge: options.challenge 
        }),
      });

      if (verifyResp.ok) {
        setStatus('Success! Account secured.');
        setTimeout(() => router.push('/'), 2000);
      } else {
        const err = await verifyResp.json();
        throw new Error(err.error);
      }
    } catch (e: any) {
    // If the user cancelled, just clear the status or say "Cancelled"
    if (e.name === 'NotAllowedError') {
        setStatus('Login cancelled.');
    } else if (e.name === 'SecurityError') {
        setStatus('Security block: Use HTTPS or check domain.');
    } else {
        // For everything else, show a generic "safe" error
        setStatus('Authentication failed. Please try again.');
        console.error("Technical details hidden from user:", e);
    }
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
        
        <button onClick={handleRegister} className="btn-primary w-full mb-4">
          Scan Biometrics
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