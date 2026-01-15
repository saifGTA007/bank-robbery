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
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch('/api/admin/logs').then(res => res.json()).then(setLogs);
  }, []);

  return (
    <main className="p-8 min-h-screen bg-black text-gray-300 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-red-500 uppercase tracking-tighter">System Audit Logs</h1>
          <Link href="/admin" className="text-xs hover:text-white border border-gray-700 px-3 py-1 rounded">Back to Portal</Link>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="text-xs flex gap-4 p-2 hover:bg-white/5 rounded transition-colors">
              <span className="text-gray-600">[{new Date(log.createdAt).toLocaleString()}]</span>
              <span className="text-blue-400 w-32 font-bold">{log.action}</span>
              <span className="text-white flex-1">{log.details}</span>
              <span className="text-gray-500 italic">{log.userName}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}