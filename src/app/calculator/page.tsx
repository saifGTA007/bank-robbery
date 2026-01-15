'use client';
import { useState, useEffect } from 'react';

export default function CalculatorPage() {
  // --- New State for User Personalization ---
  const [userName, setUserName] = useState<string>('Agent');

  // Binary Search State
  const [range, setRange] = useState({ min: 1, max: 5000000 });
  const [currentGuess, setCurrentGuess] = useState(2500000);
  const [history, setHistory] = useState<{ min: number; max: number; guess: number }[]>([]);
  const [isCooldown, setIsCooldown] = useState(false);

  const attempts = history.length + 1;

  // --- Fetch User Name on Load ---
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user/me'); // We need this endpoint to return { name: "UserX" }
        if (res.ok) {
          const data = await res.json();
          if (data.name) setUserName(data.name);
        }
      } catch (e) {
        console.error("Failed to fetch user name");
      }
    }
    fetchUser();
  }, []);

  // Global Logout Function
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/'; 
  };

  // Binary Search Move Logic
  const makeMove = (newMin: number, newMax: number) => {
    if (isCooldown || newMin > newMax) return;
    setHistory([...history, { ...range, guess: currentGuess }]);
    const nextGuess = Math.floor((newMin + newMax) / 2);
    setRange({ min: newMin, max: newMax });
    setCurrentGuess(nextGuess);
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 500);
  };

  const handleUndo = () => {
    if (history.length === 0 || isCooldown) return;
    const previousState = history[history.length - 1];
    setRange({ min: previousState.min, max: previousState.max });
    setCurrentGuess(previousState.guess);
    setHistory(history.slice(0, -1));
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 500);
  };

  const resetGame = () => {
    setRange({ min: 1, max: 5000000 });
    setCurrentGuess(2500000);
    setHistory([]);
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card p-8 w-full max-w-lg relative overflow-hidden">
        
        {/* Updated Header with Welcome Message */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Welcome, <span className="text-blue-400">{userName}</span>
            </h2>
            <p className="text-[10px] uppercase text-gray-500 font-mono">Security Clearance: Active</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-blue-400 font-mono mb-1">Attempt #{attempts}</p>
             <button 
                onClick={handleLogout}
                className="text-[10px] uppercase font-bold border border-red-500/30 text-red-500 px-2 py-1 rounded hover:bg-red-500/10 transition-all"
             >
                Sign Out
             </button>
          </div>
        </div>

        {/* The Guess Display */}
        <div className="text-center mb-10 bg-white/5 py-10 rounded-2xl border border-white/10 shadow-inner">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Is your number...?</p>
          <p className="text-5xl font-bold text-white tabular-nums drop-shadow-md">
            {currentGuess.toLocaleString()}
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500 font-mono">
            <span>Min: {range.min.toLocaleString()}</span>
            <span>Max: {range.max.toLocaleString()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={isCooldown || currentGuess <= range.min}
            onClick={() => makeMove(range.min, currentGuess - 1)}
            className="btn-primary bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold"
          >
            📉 Lower
          </button>
          <button 
            disabled={isCooldown || currentGuess >= range.max}
            onClick={() => makeMove(currentGuess + 1, range.max)}
            className="btn-primary bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold"
          >
            📈 Higher
          </button>
        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between">
          <button 
            onClick={handleUndo}
            disabled={history.length === 0 || isCooldown}
            className="text-sm text-gray-400 hover:text-white disabled:opacity-20 flex items-center gap-2 transition-colors"
          >
            ↩ Undo Move
          </button>
          <button 
            onClick={resetGame}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Reset Range
          </button>
        </div>

        {/* Cooldown Overlay */}
        {isCooldown && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-progress" />
        )}
      </div>
    </main>
  );
}