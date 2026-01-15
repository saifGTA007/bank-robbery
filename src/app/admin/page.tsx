'use client';
import { useState, useEffect, useMemo } from 'react';
import { sanitizeInput } from '../utils/security';

export default function AdminDashboard() {
  // Auth States
  const [pass, setPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  interface Log {
    id: string;
    action: string;
    details: string;
    userName: string;
    createdAt: string;
  }

  // Data States
    const [logs, setLogs] = useState<Log[]>([]);
  const [showGenBox, setShowGenBox] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Initial Auth Check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/check-auth', { cache: 'no-store' });
        if (res.ok) {
          setIsAuthorized(true);
          fetchLogs();
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const fetchLogs = async () => {
    const res = await fetch('/api/admin/logs');
    if (res.ok) {
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    }
  };

  const handleLogin = async () => {
    // Clear any old client-side cookies that might conflict
    document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    if (res.ok) {
      setIsAuthorized(true);
      fetchLogs();
    } else {
      alert("Invalid Access Code");
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
      fetchLogs(); // Refresh logs to show the new generation
    }
  };

    const filteredLogs = useMemo(() => {
      return logs.filter(l => 
        l.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [logs, searchTerm]);

  // Filtered Logs Logic

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    alert("Token copied to clipboard!");
  };


  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">INITIALIZING...</div>;

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 border border-red-900/30 p-8 rounded-2xl bg-gray-900/20">
          <h2 className="text-red-500 font-bold tracking-widest uppercase text-center">Admin Access</h2>
          <input 
            type="password" 
            className="w-full bg-black border border-gray-800 p-3 rounded-lg text-white focus:border-red-500 outline-none"
            placeholder="Enter Secure Key"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-red-600 py-3 rounded-lg font-bold hover:bg-red-500 transition-colors">ENTER</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-gray-300 font-mono">
      {/* HEADER */}
      <nav className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-red-500 font-black italic">VAULT_LOGS</h1>
          <button 
            onClick={() => setShowGenBox(true)}
            className="bg-blue-600 text-white text-xs px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            + GENERATE TOKEN
          </button>
        </div>
      </nav>

      {/* SEARCH BAR */}
      <div className="p-4 max-w-4xl mx-auto">
        <input 
          type="text"
          placeholder="Filter logs..."
          className="w-full bg-gray-900/50 border border-gray-800 p-3 rounded-xl text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LOGS LIST */}
      <div className="p-4 max-w-4xl mx-auto pb-24 space-y-2">
        {filteredLogs.map(log => (
          <div key={log.id} className="border-l-2 border-red-900/50 bg-gray-900/20 p-3 rounded-r-lg">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>{new Date(log.createdAt).toLocaleString()}</span>
              <span className="text-red-800 font-bold">{log.action}</span>
            </div>
            <p className="text-xs text-gray-200">{log.details}</p>
          </div>
        ))}
      </div>

      {/* TOKEN GENERATOR OVERLAY (BOX) */}
      {showGenBox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border border-blue-500/30 p-8 rounded-3xl w-full max-w-sm text-center relative">
            <button onClick={() => {setShowGenBox(false); setGeneratedToken('');}} className="absolute top-4 right-4 text-gray-500">✕</button>
            <h3 className="text-blue-400 font-bold mb-6">NEW INVITATION</h3>
            
            {!generatedToken ? (
              <>
                <input 
                  type="text"
                  placeholder="Recipient Name"
                  className="w-full bg-black border border-gray-800 p-3 rounded-xl mb-4 text-center"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <button 
                  onClick={handleGenerate}
                  className="w-full bg-blue-600 py-4 rounded-xl font-bold"
                >
                  CREATE TOKEN
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl font-black tracking-widest text-white">{generatedToken}</div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Share this code with {recipientName}</p>
                <button 
                  onClick={() => {setShowGenBox(false); setGeneratedToken(''); setRecipientName('');}}
                  className="w-full bg-gray-800 py-3 rounded-xl text-sm"
                >
                  DONE
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30"
                >
                  📋 COPY CODE
                </button>
              </div>
              
            )}
          </div>
        </div>
      )}
    </main>
  );
}