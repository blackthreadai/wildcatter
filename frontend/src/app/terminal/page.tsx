'use client';

import { useState, useEffect, useRef } from 'react';

export default function TerminalPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'Energy Terminal v1.0.0',
    'Type "help" for available commands.',
    '',
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus input on load and keep it focused
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    let output = '';

    switch (trimmed) {
      case 'help':
        output = `Available commands:
  help     - Show this help message
  clear    - Clear terminal
  status   - Show system status
  wells    - Show wells overview
  markets  - Show market data
  exit     - Return to main menu`;
        break;
      case 'clear':
        setHistory(['Energy Terminal v1.0.0', 'Type "help" for available commands.', '']);
        return;
      case 'status':
        output = `System Status:
  Database: Connected (Neon PostgreSQL)
  Wells: 1,125,869 total
  Production data: 45,269 wells (4 states)
  Last sync: 2026-02-21 14:18:00 CST`;
        break;
      case 'wells':
        output = `Wells Overview:
  CA: 33,511 wells with production data
  PA: 11,351 wells with production data  
  WV: 293 wells with production data
  OH: 114 wells with production data
  
  Remaining states: TX, NM, CO, ND, WY, UT, LA, OK, AK, FL`;
        break;
      case 'markets':
        output = `Market Snapshot:
  WTI Crude: Loading...
  Brent Crude: Loading...
  Henry Hub Gas: Loading...
  RBOB Gasoline: Loading...
  Oil Rig Count: 409 rigs (0% WoW)`;
        break;
      case 'exit':
        window.location.href = '/';
        return;
      case '':
        break;
      default:
        output = `Command not found: ${cmd}. Type "help" for available commands.`;
    }

    setHistory(prev => [...prev, `> ${cmd}`, output, '']);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div 
        ref={terminalRef}
        className="h-screen overflow-y-auto p-4"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Terminal History */}
        <div className="whitespace-pre-wrap">
          {history.map((line, i) => (
            <div key={i} className="leading-relaxed">
              {line}
            </div>
          ))}
        </div>

        {/* Current Input Line */}
        <div className="flex items-center">
          <span className="text-green-300 mr-2">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-green-400 font-mono"
            autoComplete="off"
            spellCheck="false"
          />
          <span className="animate-pulse ml-1">_</span>
        </div>
      </div>
    </div>
  );
}