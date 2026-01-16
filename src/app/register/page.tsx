'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';

export default function RegisterPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, []);

  const [callCounter, setCallCounter] = useState(0);

  const handleRegister = async () => {
    const currentCall = callCounter + 1;
    setCallCounter(currentCall);
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    setStatus('Verifying Token...');

    try {
        const resp = await fetch(`/api/auth/register?token=${token}&debug=${currentCall}`, {
            cache: 'no-store'
        });

        // 1. Parse the JSON once
        const data = await resp.json();

        // 2. Check for errors (Ngrok 429 or Invalid Token)
        if (resp.status === 429) throw new Error('Too many attempts (429)');
        if (!resp.ok || data.valid === false) {
            throw new Error(data.error || 'This token is invalid.');
        }

        // 3. 'data' now contains your registration options
        setStatus('Scan your biometric key...');
        const attResp = await startRegistration(data);
        
        setStatus('Securing Account...');
        const verifyResp = await fetch(`/api/auth/register`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token, 
                attestationResponse: attResp, 
                challenge: data.challenge,
                debugId: currentCall
            }),
        });

        if (verifyResp.ok) {
            setStatus('Access Granted!');
            setTimeout(() => router.push('/'), 1500);
        } else {
            const err = await verifyResp.json();
            throw new Error(err.error || 'Verification failed');
        }
    } catch (e: any) {
        setStatus(e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-black p-4 font-mono">
      <div className="border border-blue-900/30 p-8 w-full max-w-md rounded-2xl bg-gray-900/10">
        <h2 className="text-xl font-bold text-blue-500 mb-2 uppercase">Identify Yourself</h2>
        <p className="text-gray-500 text-xs mb-6 font-sans">Enter the one-time clearance token provided by the administrator.</p>
        
        <input 
          type="text" 
          placeholder="Clearance Token" 
          className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white mb-4 outline-none focus:border-blue-600 transition-all"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={isProcessing}
        />
        
        <button 
          onClick={handleRegister} 
          disabled={isProcessing || !token}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl active:scale-95 transition-all disabled:opacity-30"
        >
          {isProcessing ? 'COMMUNICATING...' : 'BEGIN BIOMETRIC SCAN'}
        </button>

        {/* RETURN BUTTON */}
        <button 
          onClick={() => router.push('/')}
          disabled={isProcessing}
          className="w-full mt-4 py-2 text-gray-600 text-[10px] uppercase tracking-widest hover:text-gray-400 transition-colors"
        >
          ← Return to Entry
        </button>

        {status && (
          <div className="mt-6 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center text-[10px] text-blue-400 uppercase tracking-widest">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}