'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { sanitizeInput } from '../utils/security';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const hasCheckedAuth = useRef(false);
  
  // States
  const [pass, setPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGenBox, setShowGenBox] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  
useEffect(() => {
  // If we have already checked auth in this session, STOP.
  if (hasCheckedAuth.current) return;

  async function checkAuth() {
    hasCheckedAuth.current = true; // Mark as done immediately
    try {
      const res = await fetch('/api/admin/check-auth', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          setIsAuthorized(true);
          fetchLogs();
        }
      }
    } catch (e) {
      console.error("Auth check failed");
    } finally {
      setLoading(false);
    }
  }

  checkAuth();
}, []); // Keep this empty

  interface Log {
    id: string;
    action: string;
    details: string;
    userName: string;
    createdAt: string;
  }

  const [logs, setLogs] = useState<Log[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        setIsAuthorized(false); // Session died
      }
    } catch (e) {
      console.error("Log fetch failed");
    }
  };

  const handleLogin = async () => {
    // Clear legacy cookies
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
      fetchLogs(); 
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthorized(false);
    router.push('/');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">SYSTEM_LOADING...</div>;

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-sm space-y-4 border border-red-900/30 p-8 rounded-2xl bg-gray-900/10">
          <h2 className="text-red-500 font-bold tracking-widest uppercase text-center">Admin Access</h2>
          <input 
            type="password" 
            className="w-full bg-black border border-gray-800 p-3 rounded-lg text-white focus:border-red-500 outline-none transition-all"
            placeholder="Enter Secure Key"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-red-600 py-3 rounded-lg font-bold hover:bg-red-500 active:scale-95 transition-all text-white">ENTER</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-gray-300 font-mono">
      {/* STICKY HEADER SECTION */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          
          {/* Top Row: Title & Logout */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <h1 className="text-red-600 font-black italic tracking-tighter">VAULT_DASH</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] text-gray-500 hover:text-white border border-gray-800 px-3 py-1 rounded-md uppercase"
            >
              Exit System
            </button>
          </div>

          {/* Middle Row: Search and Action */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                placeholder="Search logs..."
                className="w-full bg-gray-900/80 border border-gray-800 p-3 rounded-xl text-sm focus:border-blue-900 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowGenBox(true)}
              className="bg-blue-600 text-white text-[10px] px-4 py-3 rounded-xl font-black shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-95 transition-all"
            >
              + NEW TOKEN
            </button>
          </div>
        </div>
      </div>

      {/* SCROLLABLE LOGS AREA */}
      <div className="p-4 max-w-4xl mx-auto pb-10 space-y-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">System Activity</span>
          <button onClick={fetchLogs} className="text-[10px] text-blue-500 font-bold">RE-SYNC</button>
        </div>
        
        {filteredLogs.map(log => (
          <div key={log.id} className="bg-gray-900/30 border border-white/5 p-4 rounded-xl hover:bg-gray-900/50 transition-colors">
            <div className="flex justify-between text-[10px] mb-2 opacity-50">
              <span className="font-bold text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
              <span className={`px-2 py-0.5 rounded-sm ${log.action.includes('TOKEN') ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                {log.action}
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">{log.details}</p>
            <p className="text-[9px] mt-2 text-gray-600 italic">Auth: @{log.userName || 'Root'}</p>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-20 text-gray-700 text-xs italic">No activity matching filter found.</div>
        )}
      </div>

      {/* GENERATOR MODAL */}
      {showGenBox && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-blue-500/20 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-blue-500 font-black mb-6 uppercase tracking-widest">Access Grant</h3>
            
            {!generatedToken ? (
              <div className="space-y-4">
                <input 
                  type="text"
                  placeholder="Recipient Name"
                  className="w-full bg-black border border-gray-800 p-4 rounded-xl text-center text-white outline-none focus:border-blue-500"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowGenBox(false)} className="flex-1 bg-gray-800 py-3 rounded-xl text-sm font-bold">CANCEL</button>
                  <button onClick={handleGenerate} className="flex-[2] bg-blue-600 py-3 rounded-xl text-sm font-bold">CREATE</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-black rounded-2xl border border-blue-500/10">
                  <div className="text-4xl font-black tracking-[0.2em] text-white">{generatedToken}</div>
                  <p className="text-[10px] text-gray-600 mt-2 uppercase">Valid for {recipientName}</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedToken);
                    alert("Token Copied");
                  }}
                  className="w-full bg-blue-600/10 text-blue-400 py-2 rounded-lg text-[10px] font-bold border border-blue-500/20"
                >
                  COPY TO CLIPBOARD
                </button>
                <button 
                  onClick={() => {setShowGenBox(false); setGeneratedToken(''); setRecipientName('');}}
                  className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm"
                >
                  DISMISS
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}