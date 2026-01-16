'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { sanitizeInput } from '../utils/security';

export default function RegisterPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // CRITICAL: Stop the spam
  const router = useRouter();
  let renderCount = 0;

  // ONLY grab the token from the URL once, do NOT fetch anything automatically
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, []);

  renderCount++;
  console.log(`[CLIENT] Render #${renderCount} - Token: ${token}`);

  const [callCounter, setCallCounter] = useState(0);

const handleRegister = async () => {
    const currentCall = callCounter + 1;
    setCallCounter(currentCall);

    console.log(`[CLIENT] handleRegister Execution #${currentCall} started`);
    
    if (isProcessing) {
        console.warn(`[CLIENT] Blocked: isProcessing is true`);
        return;
    }
    
    setIsProcessing(true);
    setStatus('Verifying Token...');

    try {
        console.log(`[CLIENT] #${currentCall} Fetching GET options for token: ${token}`);
        
        const resp = await fetch(`/api/auth/register?token=${token}&debug=${currentCall}`, {
            cache: 'no-store'
        });

        console.log(`[CLIENT] #${currentCall} GET Response status:`, resp.status);

        if (resp.status === 429) throw new Error('Too many attempts (429)');
        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
        
        const options = await resp.json();
        console.log(`[CLIENT] #${currentCall} Received Options (Challenge):`, options.challenge);

        setStatus('Scan your biometric key...');
        const attResp = await startRegistration(options);
        console.log(`[CLIENT] #${currentCall} Biometric Scan Success:`, attResp.id);

        setStatus('Securing Account...');
        const verifyResp = await fetch(`/api/auth/register`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token, 
                attestationResponse: attResp, 
                challenge: options.challenge,
                debugId: currentCall
            }),
        });

        console.log(`[CLIENT] #${currentCall} POST Response status:`, verifyResp.status);

        if (verifyResp.ok) {
            setStatus('Access Granted!');
            setTimeout(() => router.push('/'), 1500);
        } else {
            const err = await verifyResp.json();
            throw new Error(err.error || 'Verification failed');
        }
    } catch (e: any) {
        console.error(`[CLIENT] #${currentCall} Error:`, e);
        setStatus(e.message);
    } finally {
        console.log(`[CLIENT] #${currentCall} handleRegister finished (isProcessing -> false)`);
        setIsProcessing(false);
    }
};

  return (
    <main className="flex items-center justify-center min-h-screen bg-black p-4 font-mono">
      <div className="border border-blue-900/30 p-8 w-full max-w-md rounded-2xl bg-gray-900/10">
        <h2 className="text-xl font-bold text-blue-500 mb-2 uppercase">Identify Yourself</h2>
        <p className="text-gray-500 text-xs mb-6 font-sans">Enter the one-time clearance token provided by your administrator.</p>
        
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

        {status && (
          <div className="mt-6 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center text-[10px] text-blue-400 uppercase tracking-widest">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}