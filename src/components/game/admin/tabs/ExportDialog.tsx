'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Copy, Check, X, Terminal, Package, Info, Loader2, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'game' | 'editor';
  gameId?: string;
  gameName?: string;
}

type Phase = 'info' | 'building' | 'done' | 'error';

export default function ExportDialog({ open, onClose, mode, gameId, gameName }: ExportDialogProps) {
  const [phase, setPhase] = useState<Phase>('info');
  const [buildId, setBuildId] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [elapsed, setElapsed] = useState('');
  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logsEndRef, setLogsEndRef] = useState<HTMLDivElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const displayName = mode === 'game' ? (gameName ?? gameId ?? 'Gioco') : 'Editor Completo';

  // Compute fallback command
  useEffect(() => {
    setCommand(
      mode === 'game'
        ? `npm run export:game ${gameId ?? 'GAME_ID'}`
        : 'npm run export:editor'
    );
  }, [mode, gameId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Start build
  const startBuild = useCallback(async () => {
    setPhase('building');
    setProgress('Avvio...');
    setLogs([]);
    setFileName('');
    setFileSize(0);

    try {
      const body: Record<string, string> = { mode };
      if (mode === 'game' && gameId) body.gameId = gameId;

      const res = await adminFetch('/api/admin/export-portable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const id = data.buildId;
      setBuildId(id);

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await adminFetch(`/api/admin/export-portable?buildId=${id}`);
          if (!statusRes.ok) return;
          const status = await statusRes.json();

          setProgress(status.progress);
          setElapsed(status.elapsed);
          setLogs(status.logs || []);

          if (status.status === 'done') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPhase('done');
            setFileName(status.fileName);
            setFileSize(status.fileSize);
          } else if (status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPhase('error');
          }
        } catch {
          // Keep polling
        }
      }, 3000);
    } catch (err) {
      setPhase('error');
      setProgress(`Errore: ${err}`);
    }
  }, [mode, gameId]);

  // Download
  const downloadFile = () => {
    if (!fileName) return;
    const adminKey = localStorage.getItem('rpg_admin_key') || 'rpg_admin_2024';
    const url = `/api/admin/export-portable/download?file=${encodeURIComponent(fileName)}`;
    window.open(url, '_blank');
  };

  // Copy command
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Reset to info phase
  const resetToInfo = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPhase('info');
    setBuildId(null);
    setProgress('');
    setLogs([]);
    setFileName('');
    setFileSize(0);
    setElapsed('');
  };

  // Close and reset
  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    resetToInfo();
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(12, 12, 20, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            phase === 'building' ? 'bg-blue-500/10 border border-blue-500/20' :
            phase === 'done' ? 'bg-green-500/10 border border-green-500/20' :
            phase === 'error' ? 'bg-red-500/10 border border-red-500/20' :
            'bg-violet-500/10 border border-violet-500/20'
          }`}>
            {phase === 'building' ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : phase === 'done' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : phase === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <Download className="w-4 h-4 text-violet-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white/90">
              {phase === 'building' ? 'Esportazione in corso...' :
               phase === 'done' ? 'Esportazione completata!' :
               phase === 'error' ? 'Esportazione fallita' :
               mode === 'game' ? 'Esporta Gioco' : 'Esporta Editor Completo'}
            </h3>
            <p className="text-[12px] text-white/35 truncate">
              {phase === 'building' ? progress :
               phase === 'done' ? fileName :
               phase === 'error' ? progress :
               mode === 'game'
                ? 'Crea un eseguibile portatile per questo gioco'
                : 'Crea un eseguibile portatile con tutti i giochi'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 admin-scrollbar space-y-4">

          {/* ── INFO PHASE ── */}
          {phase === 'info' && (
            <>
              {/* Target info */}
              <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/15 px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Package className="w-3.5 h-3.5 text-violet-400/70" />
                  <span className="text-[11px] text-violet-300/70 uppercase tracking-wider font-semibold">
                    {mode === 'game' ? 'Gioco da esportare' : 'Contenuto incluso'}
                  </span>
                </div>
                {mode === 'game' ? (
                  <div className="space-y-1">
                    <p className="text-[13px] text-white/70 font-medium">{displayName}</p>
                    {gameName && gameName !== gameId && (
                      <p className="text-[12px] text-white/30 font-mono">{gameId}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-white/60">
                    Tutti i giochi presenti nel database verranno inclusi.
                  </p>
                )}
              </div>

              {/* What's included */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Cosa viene incluso</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="text-[12px] text-white/40 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-violet-400/50 shrink-0" />
                    Database SQLite del gioco (dati, mappe, oggetti)
                  </li>
                  <li className="text-[12px] text-white/40 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-violet-400/50 shrink-0" />
                    Server API embedded (Node.js runtime)
                  </li>
                  <li className="text-[12px] text-white/40 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-violet-400/50 shrink-0" />
                    Frontend React compilato (Electron + Chromium)
                  </li>
                  <li className="text-[12px] text-white/40 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-violet-400/50 shrink-0" />
                    {mode === 'game' ? 'Singola istanza di gioco (senza editor)' : 'Editor completo con tutti i giochi'}
                  </li>
                </ul>
              </div>

              {/* Requirements */}
              <div className="rounded-lg bg-amber-500/[0.05] border border-amber-500/12 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-amber-400/60" />
                  <span className="text-[11px] text-amber-300/60 uppercase tracking-wider font-semibold">Note</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="text-[12px] text-white/35 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
                    Il processo richiede 2-3 minuti
                  </li>
                  <li className="text-[12px] text-white/35 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
                    Electron e electron-builder devono essere installati: <code className="text-amber-300/50 bg-amber-500/[0.08] px-1.5 py-0.5 rounded text-[11px] font-mono">npm install -D electron electron-builder</code>
                  </li>
                </ul>
              </div>

              {/* Manual command fallback */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Oppure da terminale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-black/40 border border-white/[0.1] px-3.5 py-2.5 font-mono text-[13px] text-white/50 select-all truncate">
                    {command}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className={`shrink-0 h-9 px-3 text-xs gap-1.5 transition-all ${
                      copied
                        ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                        : 'bg-white/[0.06] border border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiato!' : 'Copia'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── BUILDING PHASE ── */}
          {phase === 'building' && (
            <>
              {/* Progress card */}
              <div className="rounded-lg bg-blue-500/[0.06] border border-blue-500/15 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-blue-300/80 font-medium flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {progress}
                  </span>
                  <span className="text-[11px] text-white/25 font-mono">{elapsed}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500/50 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: progress.includes('Step 1') ? '10%' :
                             progress.includes('Step 2') ? '25%' :
                             progress.includes('Step 3') ? '40%' :
                             progress.includes('Step 4') ? '55%' :
                             progress.includes('Step 5') ? '70%' :
                             progress.includes('Packaging') ? '85%' :
                             '5%',
                    }}
                  />
                </div>
              </div>

              {/* Live logs */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Log in tempo reale</span>
                </div>
                <div
                  ref={logContainerRef}
                  className="rounded-lg bg-black/60 border border-white/[0.08] px-3 py-2 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed admin-scrollbar"
                >
                  {logs.length === 0 ? (
                    <span className="text-white/20">Avvio del processo...</span>
                  ) : (
                    logs.map((line, i) => (
                      <div
                        key={i}
                        className={`${
                          line.includes('✅') || line.includes('Copied') ? 'text-green-400/60' :
                          line.includes('❌') || line.includes('ERRORE') || line.includes('Error') ? 'text-red-400/60' :
                          line.includes('⚠️') || line.includes('warn') ? 'text-amber-400/50' :
                          line.includes('Step') || line.includes('🎮') ? 'text-blue-400/60' :
                          'text-white/30'
                        }`}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))
                  )}
                  <div ref={setLogsEndRef} />
                </div>
              </div>

              {/* Info */}
              <p className="text-[11px] text-white/20 text-center">
                La finestra di esportazione puo essere chiusa, il processo continua in background.
              </p>
            </>
          )}

          {/* ── DONE PHASE ── */}
          {phase === 'done' && (
            <>
              <div className="rounded-lg bg-green-500/[0.08] border border-green-500/20 px-5 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm font-bold text-green-300 mb-1">Esportazione completata!</p>
                <p className="text-[12px] text-white/40">
                  {fileName} ({formatSize(fileSize)})
                </p>
                <p className="text-[11px] text-white/25 mt-1">Tempo totale: {elapsed}</p>
              </div>

              <Button
                onClick={downloadFile}
                className="w-full h-11 text-sm gap-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
              >
                <Download className="w-4 h-4" />
                Scarica {fileName}
              </Button>

              {/* Terminal command fallback */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Comando terminale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-black/40 border border-white/[0.1] px-3.5 py-2.5 font-mono text-[13px] text-white/50 select-all truncate">
                    {command}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className={`shrink-0 h-9 px-3 text-xs gap-1.5 transition-all ${
                      copied
                        ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                        : 'bg-white/[0.06] border border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiato!' : 'Copia'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── ERROR PHASE ── */}
          {phase === 'error' && (
            <>
              <div className="rounded-lg bg-red-500/[0.08] border border-red-500/20 px-5 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm font-bold text-red-300 mb-1">Esportazione fallita</p>
                <p className="text-[12px] text-white/40 max-w-sm mx-auto">{progress}</p>
              </div>

              {/* Error logs */}
              {logs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Terminal className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Ultimi log</span>
                  </div>
                  <div
                    ref={logContainerRef}
                    className="rounded-lg bg-black/60 border border-white/[0.08] px-3 py-2 h-40 overflow-y-auto font-mono text-[11px] leading-relaxed admin-scrollbar"
                  >
                    {logs.slice(-15).map((line, i) => (
                      <div
                        key={i}
                        className={`${
                          line.includes('ERRORE') || line.includes('Error') || line.includes('error') ? 'text-red-400/60' :
                          line.includes('warn') ? 'text-amber-400/50' :
                          'text-white/30'
                        }`}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Possible causes */}
              <div className="rounded-lg bg-amber-500/[0.05] border border-amber-500/12 px-4 py-3">
                <p className="text-[11px] text-amber-300/60 uppercase tracking-wider font-semibold mb-2">Cause comuni</p>
                <ul className="space-y-1.5">
                  <li className="text-[12px] text-white/35 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
                    Electron non installato: <code className="text-amber-300/50 bg-amber-500/[0.08] px-1.5 py-0.5 rounded text-[11px] font-mono">npm install -D electron electron-builder</code>
                  </li>
                  <li className="text-[12px] text-white/35 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
                    Memoria insufficiente (prova a chiudere altre applicazioni)
                  </li>
                  <li className="text-[12px] text-white/35 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
                    Oppure usa il comando da terminale mostrato qui sotto
                  </li>
                </ul>
              </div>

              {/* Terminal fallback */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Comando terminale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-black/40 border border-white/[0.1] px-3.5 py-2.5 font-mono text-[13px] text-white/50 select-all truncate">
                    {command}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className={`shrink-0 h-9 px-3 text-xs gap-1.5 transition-all ${
                      copied
                        ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                        : 'bg-white/[0.06] border border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiato!' : 'Copia'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex gap-2 bg-black/80">
          {phase === 'error' && (
            <Button
              onClick={resetToInfo}
              className="flex-1 text-xs gap-1.5 bg-amber-600/15 border border-amber-500/25 text-amber-300 hover:bg-amber-600/25 hover:text-amber-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Riprova
            </Button>
          )}
          {phase === 'info' && (
            <Button
              onClick={startBuild}
              className="flex-1 text-xs gap-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 hover:text-violet-200"
            >
              <Download className="w-3.5 h-3.5" />
              Avvia Esportazione
            </Button>
          )}
          <Button
            onClick={handleClose}
            variant={phase === 'info' ? 'default' : undefined}
            className={`text-xs gap-1.5 ${
              phase === 'info'
                ? 'flex-1 bg-white/[0.06] border border-white/[0.1] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                : 'flex-1 bg-white/[0.06] border border-white/[0.1] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            {phase === 'building' ? 'Chiudi (continua in background)' : 'Chiudi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
