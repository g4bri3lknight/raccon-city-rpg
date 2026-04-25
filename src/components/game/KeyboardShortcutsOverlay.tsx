'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { useGameStore } from '@/game/store';
import { SHORTCUT_GROUPS } from './keyboard-shortcuts-data';

export function KeyboardShortcutsOverlay() {
  const helpOpen = useGameStore(s => s.helpOpen);
  const toggleHelp = useGameStore(s => s.toggleHelp);

  const close = useCallback(() => {
    if (helpOpen) toggleHelp();
  }, [helpOpen, toggleHelp]);

  // Close on Escape
  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [helpOpen, close]);

  return (
    <AnimatePresence>
      {helpOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="pointer-events-auto w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-white/[0.12] bg-black/95 backdrop-blur-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              role="dialog"
              aria-label="Scorciatoie tastiera"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4.5 h-4.5 text-amber-400" />
                  <h2 className="text-sm font-bold text-white/90">Scorciatoie Tastiera</h2>
                </div>
                <button
                  onClick={close}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
                  aria-label="Chiudi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Groups */}
              <div className="p-4 space-y-5">
                {SHORTCUT_GROUPS.map(group => (
                  <div key={group.label}>
                    <h3 className="text-[11px] font-bold text-white/35 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span>{group.icon}</span>
                      {group.label}
                    </h3>
                    <div className="space-y-1">
                      {group.shortcuts.map(s => (
                        <div
                          key={`${s.key}-${s.action}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                        >
                          <span className="text-xs text-white/60">{s.action}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/25 hidden sm:inline">{s.ctx}</span>
                            <kbd className="text-[10px] font-mono text-amber-400/80 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded">
                              {s.key}
                            </kbd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                <p className="text-[10px] text-white/25 text-center">
                  Premi <kbd className="font-mono text-amber-400/60">H</kbd> per aprire/chiudere rapidamente
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
