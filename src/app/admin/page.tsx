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
  
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false); // New state for animation
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [showGenBox, setShowGenBox] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('COPY');

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
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });

      if (res.ok) {
        setIsAuthorized(true);
        setDataLoading(true);
        await fetchLogs();
        setDataLoading(false);
      } else {
        setError('ACCESS_DENIED - INVALID CREDENTIALS');
        setIsShaking(true); // Trigger shake
        setTimeout(() => setIsShaking(false), 500); // Reset shake
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

  const handleClearLogs = async () => {
    if (!confirm("Are you sure? This will wipe all system logs permanently.")) return;
    try {
      const res = await fetch('/api/admin/logs', { method: 'DELETE' });
      if (res.ok) fetchLogs();
    } catch (e) {
      console.error("Failed to clear logs");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    setCopyStatus('COPIED!');
    setTimeout(() => setCopyStatus('COPY'), 2000);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthorized(false);
    router.push('/');
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6 font-mono text-white">
        {/* Added dynamic class for shaking */}
        <div className={`w-full max-w-sm border border-red-900/30 p-8 rounded-2xl transition-all ${isShaking ? 'animate-shake border-red-600' : ''}`}>
          <h2 className="text-red-500 font-bold mb-4 text-center tracking-widest">ADMIN PORTAL</h2>
          
          <div className="mb-4">
            <input 
              type="password" 
              className={`w-full bg-gray-900 border ${error ? 'border-red-600' : 'border-gray-800'} p-3 rounded outline-none transition-colors`}
              placeholder="Enter Password"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && (
              <p className="text-[10px] text-red-500 mt-2 text-center font-bold tracking-tighter italic">
                {error}
              </p>
            )}
          </div>

          <button 
            onClick={handleLogin} 
            disabled={loading} 
            className="w-full bg-red-600 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'VERIFYING...' : 'ENTER'}
          </button>
        </div>
      </main>
    );
  }

  if (dataLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center font-mono text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest italic">Loading Logs</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-red-500 font-bold tracking-tighter">DASHBOARD</h1>
          <div className="flex gap-4">
            <button onClick={handleClearLogs} className="text-[10px] text-red-900 hover:text-red-600 transition-colors">CLEAR LOGS</button>
            <button onClick={handleLogout} className="text-[10px] text-gray-500 hover:text-white transition-colors">LOGOUT</button>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
            <button onClick={() => setShowGenBox(true)} className="bg-blue-600 flex-1 py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors">+ GENERATE TOKEN</button>
            <button onClick={fetchLogs} className="bg-gray-800 px-6 rounded-xl text-xs hover:bg-gray-700 transition-colors">REFRESH</button>
        </div>

        <div className="space-y-2">
          {logs.length > 0 ? logs.map((log: any) => (
            <div key={log.id} className="bg-gray-900/30 p-3 rounded border border-gray-800/50">
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span className="text-red-900 uppercase font-bold">{log.action}</span>
              </div>
              <p className="text-xs mt-1 text-gray-300">{log.details}</p>
            </div>
          )) : (
            <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
              <p className="text-gray-600 text-xs">NO SYSTEM LOGS RECORDED</p>
            </div>
          )}
        </div>
      </div>

      {showGenBox && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm border border-blue-500/20 shadow-2xl">
            {!generatedToken ? (
              <>
                <h3 className="text-blue-500 text-xs font-bold mb-4 uppercase tracking-widest">Identity Authorization</h3>
                <input 
                  type="text" 
                  placeholder="Recipient Name" 
                  className="w-full bg-black p-4 rounded-xl mb-4 border border-gray-800 focus:border-blue-500 outline-none transition-all"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <button onClick={handleGenerate} className="w-full bg-blue-600 py-3 rounded-xl font-bold">CREATE CLEARANCE</button>
                <button onClick={() => setShowGenBox(false)} className="w-full mt-4 text-gray-500 text-xs hover:text-white transition-colors">CANCEL</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 text-[10px] mb-2 uppercase tracking-widest">Clearance Token Generated</p>
                <div className="text-4xl font-bold mb-6 text-white tracking-widest bg-black py-4 rounded-xl border border-gray-800">
                  {generatedToken}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard} 
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${copyStatus === 'COPIED!' ? 'bg-green-600' : 'bg-gray-800'}`}
                  >
                    {copyStatus}
                  </button>
                  <button 
                    onClick={() => {setShowGenBox(false); setGeneratedToken(''); setRecipientName('');}} 
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold"
                  >
                    DONE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}