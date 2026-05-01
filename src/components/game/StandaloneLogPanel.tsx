'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

let globalLogId = 0;

function getTimestamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function StandaloneLogPanel() {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const prevExpandedRef = useRef(false);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    const entry: LogEntry = {
      id: ++globalLogId,
      time: getTimestamp(),
      message,
      level,
    };
    setLogs(prev => {
      const next = [...prev, entry];
      // Keep max 300 entries
      if (next.length > 300) return next.slice(-300);
      return next;
    });
    if (level === 'error' || level === 'warn') {
      setErrorCount(prev => prev + 1);
    }
  }, []);

  // Capture runtime errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || 'Unknown error';
      const src = event.filename ? `${event.filename}:${event.lineno}` : '';
      addLog(`${src ? src + ' — ' : ''}${msg}`, 'error');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason?.message || reason?.toString?.() || 'Unknown promise rejection';
      addLog(`Promise: ${msg}`, 'error');
    };

    // Intercept console.error
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      addLog(msg, 'error');
      origError.apply(console, args);
    };

    // Intercept console.warn
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      addLog(msg, 'warn');
      origWarn.apply(console, args);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Listen for Neutralino log events from main.js
    let cleanupNeutralino: (() => void) | null = null;
    try {
      // @ts-expect-error Neutralino global
      if (typeof Neutralino !== 'undefined' && Neutralino.events) {
        // @ts-expect-error Neutralino global
        Neutralino.events.on('appLog', (event: { detail?: { message: string; level?: string } }) => {
          const data = event.detail || event;
          addLog(data.message || String(data), (data.level as LogEntry['level']) || 'info');
        });
        addLog('Log listener attivo', 'success');
      }
    } catch {
      // Neutralino not available (running in browser dev mode)
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = origError;
      console.warn = origWarn;
      cleanupNeutralino?.();
    };
  }, [addLog]);

  // Auto-scroll when expanded
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, expanded]);

  // Auto-expand on first error
  useEffect(() => {
    if (errorCount === 1 && !prevExpandedRef.current) {
      setExpanded(true);
      prevExpandedRef.current = true;
    }
  }, [errorCount]);

  const levelColor: Record<string, string> = {
    info: 'text-zinc-400',
    warn: 'text-amber-400 bg-amber-500/5',
    error: 'text-red-400 bg-red-500/10',
    success: 'text-emerald-400',
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] font-mono text-[11px] leading-relaxed select-none">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-2 w-full px-3 py-1 border-t border-white/[0.06] cursor-pointer transition-colors"
        style={{ background: 'rgba(10, 10, 18, 0.92)', backdropFilter: 'blur(8px)' }}
        title="Espandi/Comprimi log"
      >
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          className="flex-shrink-0 transition-transform text-white/40"
          style={{ transform: expanded ? 'rotate(45deg)' : 'rotate(-45deg)' }}
        >
          <path
            d="M3 8L6 4L9 8"
            stroke="currentColor" strokeWidth="1.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>

        <span className="text-white/40">Log</span>

        {/* Error badge */}
        {errorCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold leading-none bg-red-500/20 text-red-400">
            {errorCount}
          </span>
        )}

        <span className="flex-1" />

        <span className="text-white/20">{logs.length} righe</span>
      </button>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="overflow-hidden transition-all duration-200 border-t border-white/[0.04]"
        style={{
          height: expanded ? 180 : 0,
          background: 'rgba(8, 8, 15, 0.96)',
          backdropFilter: 'blur(12px)',
          overflowY: expanded ? 'auto' : 'hidden',
        }}
      >
        <div className="p-1.5 space-y-px">
          {logs.map(entry => (
            <div
              key={entry.id}
              className={`px-1.5 py-px break-all ${levelColor[entry.level] || levelColor.info}`}
            >
              <span className="text-white/20 mr-1.5">{entry.time}</span>
              {entry.message}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
