'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Heart, X } from 'lucide-react';
import type { TargetSelectorProps } from './types';

export default function TargetSelector({
  targetingMode,
  isPlayerTurn,
  aliveEnemiesCount,
  alivePartyCount,
  onCancel,
}: TargetSelectorProps) {
  return (
    <>
      {/* ═══ DESKTOP: Floating targeting hint ═══ */}
      <AnimatePresence>
        {targetingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:block absolute z-30 left-2 sm:left-4 bottom-2 sm:bottom-3"
          >
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border backdrop-blur-sm text-[10px] font-semibold ${
              targetingMode === 'enemy'
                ? 'bg-red-950/80 border-red-700/40 text-red-300'
                : 'bg-green-950/80 border-green-700/40 text-green-300'
            }`}>
              {targetingMode === 'enemy' ? (
                <Crosshair className="w-3 h-3" />
              ) : (
                <Heart className="w-3 h-3" />
              )}
              <span>{targetingMode === 'enemy' ? 'Scegli bersaglio' : 'Scegli alleato'}</span>
              <span className="text-gray-500 ml-1">| {targetingMode === 'enemy' ? aliveEnemiesCount : alivePartyCount} targets · Esc per annullare</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE: Targeting hint ═══ */}
      <AnimatePresence>
        {targetingMode && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="lg:hidden shrink-0 px-2 pb-1.5"
          >
            <div className="glass-dark rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs text-gray-200">
                  {targetingMode === 'enemy' ? 'Scegli un nemico da attaccare' : 'Scegli un alleato da curare'}
                </span>
              </div>
              <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors px-2 py-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
