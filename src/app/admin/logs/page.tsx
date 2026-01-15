'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Log {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]); // Default is empty array
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/admin/logs');
        
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }

        const data = await res.json();
        
        // --- CRITICAL FIX: Only map if data is an Array ---
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
          setError(data.error || "Failed to load logs");
        }
      } catch (e) {
        setError("Network error occurred.");
      }
    }
    
    fetchLogs();
  }, []); // [] ensure it only runs once (fixes the 429 loop)

  return (
    <main className="p-8 min-h-screen bg-black text-gray-300 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-red-500 uppercase tracking-tighter">System Audit Logs</h1>
          <Link href="/admin" className="text-xs hover:text-white border border-gray-700 px-3 py-1 rounded">Back to Portal</Link>
        </div>

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
            ⚠️ {error}
          </div>
        ) : (
          <div className="space-y-2">
            {logs.length === 0 && <p className="text-gray-600 italic">No logs found...</p>}
            {logs.map((log) => (
              <div key={log.id} className="text-[10px] md:text-xs flex gap-4 p-2 hover:bg-white/5 rounded transition-colors border-l border-transparent hover:border-red-500/50">
                <span className="text-gray-600">[{new Date(log.createdAt).toLocaleString()}]</span>
                <span className="text-blue-400 w-32 font-bold shrink-0">{log.action}</span>
                <span className="text-white flex-1">{log.details}</span>
                <span className="text-gray-500 italic shrink-0">{log.userName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}