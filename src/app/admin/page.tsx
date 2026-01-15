'use client';
import { useState } from 'react';
import { sanitizeInput } from '../utils/security';
import Link from 'next/link';

export default function AdminPage() {
  const [pass, setPass] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: sanitizeInput(pass) })
      });
      const data = await res.json();
      if (data.token) setToken(data.token);
      else alert('Access Denied: Incorrect Administrative Password');
    } catch (e) {
      alert('System Error: Could not reach Admin API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card p-8 w-full max-w-md border-red-500/20">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-red-500">Admin Portal</h2>
        </div>

        <input 
          type="password" 
          placeholder="Enter Admin Password" 
          className="input-field w-full mb-4 focus:ring-red-500"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg w-full transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Issue New Token'}
        </button>

        {token && (
          <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
            <p className="text-xs text-yellow-500 font-bold uppercase mb-2">One-Time Invite Code</p>
            <p className="text-4xl font-mono text-white tracking-tighter">{token}</p>
            <p className="text-[10px] text-gray-500 mt-4 italic">Give this to the user. It will expire after use.</p>
          </div>
        )}

        <Link href="/" className="block text-center text-sm text-gray-500 mt-6 hover:text-white">
          Exit Portal
        </Link>
      </div>
    </main>
  );
}