'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import Link from 'next/link';
import "./extra.css"

export default function Home() {
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setStatus('Scanning...');
    try {
      const loginUrl = '/api/auth/signin';
      const resp = await fetch(loginUrl);
      const options = await resp.json();
      const authResponse = await startAuthentication(options);

      const verifyResp = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authResponse, challenge: options.challenge }),
      });

      if (verifyResp.ok) {
        router.push('/calculator');
      } else {
        setStatus('Login failed');
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
      <div className="glass-card p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8">MTA Bank Robbery cracker</h1>
        <button onClick={handleLogin} className="btn-primary w-full text-lg mb-6">
          Authenticate
        </button>
        <div className="flex flex-col gap-2 text-sm text-gray-400">
          <Link href="/register" className="hover:text-blue-400 underline">Enter Invite Token</Link>
          <Link href="/admin" className="hover:text-red-400 mt-4">Admin Portal</Link>

        </div>
        {status && <p className="mt-4 text-orange-400 font-medium">{status}</p>}
      </div>
      <div  className="footer-glass-card mb-6 text-lg  w-full max-w-md text-center">         
          <h3>made by</h3>
          <h3>saifGTA</h3>
          <p className='text-sm text-gray-400'>v1.0</p>
      </div>
    </main>
  );
}