'use client';
import { useState } from 'react';
import { sanitizeInput } from '../utils/security';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  interface SystemLog {
    id: string;
    action: string;
    details: string;
    userName: string;
    createdAt: string;
  }
  
  // States
  const [pass, setPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [showGenBox, setShowGenBox] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false); // New state for logs

  // MANUAL LOG FETCH
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Manual fetch failed");
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });

      if (res.ok) {
        setIsAuthorized(true);
        setDataLoading(true); // Start small circle
        await fetchLogs();    // Wait for data
        setDataLoading(false); // Stop small circle
      } else {
        alert("Access Denied");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sanitizeInput(recipientName) })
    });
    const data = await res.json();
    if (data.token) {
      setGeneratedToken(data.token);
      fetchLogs(); 
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthorized(false);
    router.push('/');
  };

  // 1. LOGIN VIEW
  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6 font-mono text-white">
        <div className="w-full max-w-sm border border-red-900/30 p-8 rounded-2xl">
          <h2 className="text-red-500 font-bold mb-4 text-center">ADMIN PORTAL</h2>
          <input 
            type="password" 
            className="w-full bg-gray-900 border border-gray-800 p-3 rounded mb-4"
            placeholder="Enter Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button onClick={handleLogin} disabled={loading} className="w-full bg-red-600 py-3 rounded font-bold">
            {loading ? 'VERIFYING...' : 'ENTER'}
          </button>
        </div>
      </main>
    );
  }

  // 2. SMALL LOADING CIRCLE VIEW
  if (dataLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center font-mono text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Loading Logs</span>
        </div>
      </main>
    );
  }

  // 3. DASHBOARD VIEW
  return (
    <main className="min-h-screen bg-black text-white font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-red-500 font-bold">DASHBOARD</h1>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="text-xs text-gray-500">LOGOUT</button>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setShowGenBox(true)} 
              className="bg-blue-600 flex-1 py-4 rounded-xl font-bold"
            >
              + GENERATE TOKEN
            </button>
            <button 
              onClick={fetchLogs} 
              className="bg-gray-800 px-6 rounded-xl text-xs"
            >
              REFRESH LOGS
            </button>
        </div>

        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="bg-gray-900/50 p-3 rounded border border-gray-800">
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span className="text-red-900">{log.action}</span>
              </div>
              <p className="text-xs mt-1">{log.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* GENERATOR BOX */}
      {showGenBox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm border border-blue-500/20">
            {!generatedToken ? (
              <>
                <input 
                  type="text" 
                  placeholder="Recipient Name" 
                  className="w-full bg-black p-4 rounded mb-4 border border-gray-800"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <button onClick={handleGenerate} className="w-full bg-blue-600 py-3 rounded font-bold">CREATE</button>
                <button onClick={() => setShowGenBox(false)} className="w-full mt-2 text-gray-500 text-xs">CANCEL</button>
              </>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold mb-4">{generatedToken}</div>
                <button onClick={() => {setShowGenBox(false); setGeneratedToken('');}} className="w-full bg-white text-black py-2 rounded font-bold">DONE</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}