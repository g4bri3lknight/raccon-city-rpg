'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

// ── Types ──

interface ValidationIssue {
  message: string;
  entityType: string;
  entityId: string | null;
  fix: string;
  tabId?: string;
}

interface ValidationCategory {
  id: string;
  label: string;
  icon: string;
  issues: ValidationIssue[];
}

interface ValidationReport {
  score: number;
  totalIssues: number;
  categories: ValidationCategory[];
}

interface GameValidatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateTo: (tabId: string, entityId?: string) => void;
}

// ── Helpers ──

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

function progressColor(score: number): string {
  if (score >= 80) return '[&>[data-slot=progress-indicator]]:bg-emerald-500';
  if (score >= 50) return '[&>[data-slot=progress-indicator]]:bg-amber-500';
  return '[&>[data-slot=progress-indicator]]:bg-red-500';
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Eccellente';
  if (score >= 80) return 'Buono';
  if (score >= 60) return 'Accettabile';
  if (score >= 40) return 'Da migliorare';
  return 'Critico';
}

function categoryIcon(categoryId: string) {
  switch (categoryId) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />;
    case 'warnings':
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    default:
      return null;
  }
}

// ── Component ──

export function GameValidator({
  open,
  onOpenChange,
  onNavigateTo,
}: GameValidatorProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/validate');
      if (!res.ok) throw new Error('Errore nel caricamento della validazione');
      const data: ValidationReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open, fetchReport]);

  const handleNavigate = (tabId?: string, entityId?: string) => {
    if (tabId) {
      onOpenChange(false);
      onNavigateTo(tabId, entityId || undefined);
    }
  };

  const allClear = report && report.totalIssues === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Shield className="h-5 w-5 text-emerald-400" />
            Game Completeness Validator
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Analisi completa della consistenza dei dati di gioco
          </DialogDescription>
        </DialogHeader>

        {/* Score display */}
        <div className="shrink-0 flex flex-col items-center gap-2 py-2">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 py-6">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Analisi in corso...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-red-400 text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchReport}
                className="mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Riprova
              </Button>
            </div>
          ) : report ? (
            <>
              <div
                className={`relative flex items-center justify-center w-28 h-28 rounded-full border-2 ${scoreBgColor(report.score)}`}
              >
                <div className="text-center">
                  <span className={`text-4xl font-bold ${scoreColor(report.score)}`}>
                    {report.score}
                  </span>
                  <span className={`block text-xs ${scoreColor(report.score)} opacity-70`}>
                    / 100
                  </span>
                </div>
              </div>
              <span className={`text-sm font-medium ${scoreColor(report.score)}`}>
                {scoreLabel(report.score)}
              </span>
              <div className="w-48">
                <Progress
                  value={report.score}
                  className={`h-2 bg-zinc-800 ${progressColor(report.score)}`}
                />
              </div>
              <span className="text-xs text-zinc-500">
                {report.totalIssues === 0
                  ? 'Nessun problema rilevato'
                  : `${report.totalIssues} problema${report.totalIssues === 1 ? '' : 'mi'} trovato${report.totalIssues === 1 ? '' : 'ti'}`}
              </span>
            </>
          ) : null}
        </div>

        {/* Issues list */}
        {!loading && !error && report && !allClear && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 custom-scrollbar">
            {report.categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-sm font-semibold text-zinc-200">
                    {cat.label}
                  </span>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                    {cat.issues.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {cat.issues.map((iss, idx) => (
                    <div
                      key={`${cat.id}-${idx}`}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                    >
                      <div className="mt-0.5">{categoryIcon(cat.id)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 leading-snug">
                          {iss.message}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {iss.fix}
                        </p>
                      </div>
                      {iss.tabId && iss.entityId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleNavigate(iss.tabId, iss.entityId || undefined)
                          }
                          className="shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-7 px-2"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}{' '}
                      {iss.tabId && !iss.entityId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigate(iss.tabId)}
                          className="shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-7 px-2"
                        >
                          Vai
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All clear state */}
        {!loading && !error && report && allClear && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <p className="text-emerald-400 font-medium">
              Tutti i controlli superati!
            </p>
            <p className="text-zinc-500 text-sm text-center max-w-xs">
              Nessun problema di consistenza rilevato nei dati di gioco.
            </p>
          </div>
        )}

        {/* Footer actions */}
        {!loading && report && (
          <div className="shrink-0 pt-2 border-t border-zinc-800 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Rivalida
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
