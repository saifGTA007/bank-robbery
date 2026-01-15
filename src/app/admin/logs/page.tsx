'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface Log {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/admin/logs');
        if (res.status === 401) {
          setError("Session expired.");
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) setLogs(data);
      } catch (e) {
        setError("Network error.");
      }
    }
    fetchLogs();
  }, []);

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, filterAction]);

  // Get unique actions for the filter dropdown
  const uniqueActions = ['ALL', ...new Set(logs.map(l => l.action))];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-300 pb-20">
      {/* Sticky Mobile Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-red-500 tracking-tighter uppercase">Audit Logs</h1>
            <Link href="/admin" className="text-xs bg-gray-900 px-3 py-1 rounded border border-gray-700">Back</Link>
          </div>

          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input 
              type="text"
              placeholder="Search by agent or detail..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm outline-none"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 mt-4">
        {error ? (
          <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-center">{error}</div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    log.action.includes('TOKEN') ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-white mb-1 leading-relaxed">{log.details}</p>
                <div className="text-[11px] text-gray-400 italic">
                  Agent: <span className="text-gray-200">@{log.userName || 'System'}</span>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-20 text-gray-600 italic">No matching records found.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}