'use client';
import { useState, useEffect } from 'react';
import { sanitizeInput } from '../utils/security';
import Link from 'next/link';

export default function AdminPage() {
  const [pass, setPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientName, setRecipientName] = useState('');

  const handleAdminLogin = () => {
    if (pass === 'YOUR_SECRET_PASSWORD') { // Replace with your logic
      // Set a cookie that expires in 1 hour
      document.cookie = "admin_auth=true; path=/; max-age=3600; SameSite=Strict";
      setIsAuthorized(true);
    } else {
      alert("Please enter a password.");
    }
  };

  useEffect(() => {
    // Check if the admin cookie exists
    if (document.cookie.split('; ').find(row => row.startsWith('admin_auth=true'))) {
      setIsAuthorized(true);
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            adminPassword: sanitizeInput(pass),
            name: sanitizeInput(recipientName)
         })
      });
      
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        alert('Access Denied: Incorrect Administrative Password');
        setIsAuthorized(false);
      }
    } catch (e) {
      alert('System Error: Could not reach Admin API');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
  // Clear the admin cookie
  document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  setIsAuthorized(false);
  window.location.href = '/';
};

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card p-8 w-full max-w-md border-red-500/20">
        
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-red-500">
            {isAuthorized ? 'Token Generator' : 'Admin Portal'}
          </h2>
        </div>

        {!isAuthorized ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 mb-2">Authorization Required</p>
            <input 
              type="password" 
              placeholder="Enter Admin Password" 
              className="input-field w-full focus:ring-red-500"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button 
              onClick={handleAdminLogin}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg w-full transition-all active:scale-95"
            >
              Enter System
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-green-500 font-bold mb-2 italic">✓ System Authorized</p>
            
            <label className="block text-xs text-gray-400 uppercase tracking-tighter">Recipient Name</label>
            <input 
              type="text" 
              placeholder="e.g. Agent Smith" 
              className="input-field w-full mb-4 focus:ring-blue-500 border-blue-500/20"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />

            <button 
              onClick={handleGenerate} 
              disabled={loading || !recipientName}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg w-full transition-all active:scale-95 disabled:opacity-30"
            >
              {loading ? 'Processing...' : 'Generate Secure Invite'}
            </button>

            {/* --- NEW: LINK TO ACTIVITY LOGS --- */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <Link 
                  href="/admin/logs" 
                  className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-colors py-2 border border-dashed border-gray-700 rounded-lg"
                >
                  📜 View System Audit Logs
                </Link>
            </div>
          </div>
        )}

        {token && (
          <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
            <p className="text-xs text-yellow-500 font-bold uppercase mb-2">Invite for {recipientName}</p>
            <p className="text-4xl font-mono text-white tracking-tighter">{token}</p>
            <p className="text-[10px] text-gray-500 mt-4 italic">Give this to the user. Valid for single use only.</p>
          </div>
        )}

        <button 
          onClick={handleLogout} 
          className="block mx-auto text-sm text-gray-500 mt-6 hover:text-white"
        >
          Logout & Exit
        </button>
      </div>
    </main>
  );
}