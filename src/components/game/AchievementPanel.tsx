'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORY_LABELS,
  TOTAL_ACHIEVEMENTS,
} from '@/game/data/achievements';
import { AchievementDefinition } from '@/game/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Trophy, Lock, Eye, EyeOff, Calendar, Gift } from 'lucide-react';

type CategoryKey = 'all' | string;

const CATEGORY_KEYS = ['all', ...Object.keys(ACHIEVEMENT_CATEGORY_LABELS)];

function formatUnlockDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function AchievementCard({
  definition,
  isUnlocked,
  unlockTimestamp,
}: {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  unlockTimestamp?: number;
}) {
  const isHidden = definition.hidden && !isUnlocked;

  if (isHidden) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0">
            <EyeOff className="w-4 h-4 text-white/20" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/20">???</div>
            <div className="text-xs text-white/10 mt-0.5">???</div>
          </div>
          <Badge className="text-[10px] bg-white/[0.03] text-white/15 border-0 shrink-0">
            <Lock className="w-2.5 h-2.5 mr-1" />
            Segreto
          </Badge>
        </div>
      </motion.div>
    );
  }

  if (isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-3 rounded-lg border border-amber-500/20 bg-amber-950/[0.08] shadow-[0_0_16px_rgba(245,158,11,0.06)]"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-xl">
            {definition.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-100">
              {definition.name}
            </div>
            <div className="text-xs text-white/50 mt-0.5 leading-relaxed">
              {definition.description}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {unlockTimestamp && (
                <span className="flex items-center gap-1 text-[10px] text-white/30">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatUnlockDate(unlockTimestamp)}
                </span>
              )}
              {definition.reward && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/60">
                  <Gift className="w-2.5 h-2.5" />
                  {definition.reward}
                </span>
              )}
            </div>
          </div>
          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shrink-0">
            ✓
          </Badge>
        </div>
      </motion.div>
    );
  }

  // Locked (not hidden, not unlocked)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-3 rounded-lg border border-white/[0.04] bg-white/[0.015] opacity-50"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0 text-xl grayscale">
          {definition.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/40">
            {definition.name}
          </div>
          <div className="text-xs text-white/20 mt-0.5 leading-relaxed">
            {definition.description}
          </div>
          {definition.reward && (
            <span className="flex items-center gap-1 text-[10px] text-white/15 mt-1">
              <Gift className="w-2.5 h-2.5" />
              {definition.reward}
            </span>
          )}
        </div>
        <Lock className="w-3.5 h-3.5 text-white/15 shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

export default function AchievementPanel() {
  const { achievements, achievementsOpen, toggleAchievements } = useGameStore();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');

  const unlockedCount = achievements.unlockedIds.length;
  const progressPct = TOTAL_ACHIEVEMENTS > 0 ? (unlockedCount / TOTAL_ACHIEVEMENTS) * 100 : 0;

  const allAchievements = useMemo(() => Object.values(ACHIEVEMENTS), []);
  const categoryAchievements = useMemo(() => {
    if (activeCategory === 'all') return allAchievements;
    return allAchievements.filter(a => a.category === activeCategory);
  }, [activeCategory, allAchievements]);

  const categoryTabLabel = (key: CategoryKey): string => {
    if (key === 'all') return '🏆 Tutti';
    return ACHIEVEMENT_CATEGORY_LABELS[key] || key;
  };

  return (
    <AnimatePresence>
      {achievementsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleAchievements();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg sm:max-w-2xl glass-dark rounded-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03] shrink-0">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Traguardi
                  </h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {unlockedCount}/{TOTAL_ACHIEVEMENTS} Sbloccati
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={toggleAchievements}
                className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ── Progress Bar ── */}
            <div className="px-4 pt-3 pb-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/40">Progresso Totale</span>
                <span className="text-[11px] font-mono text-amber-400/80">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                />
              </div>
            </div>

            {/* ── Category Tabs ── */}
            <div className="flex items-center gap-1 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0 overflow-x-auto">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap transition-all ${
                    activeCategory === key
                      ? 'bg-white/[0.08] text-white border border-white/20'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {categoryTabLabel(key)}
                </button>
              ))}
            </div>

            {/* ── Achievement List ── */}
            <div className="flex-1 overflow-y-auto glass-scrollbar p-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {categoryAchievements.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <Eye className="w-8 h-8 text-white/10 mb-3" />
                    <p className="text-sm text-white/30">
                      Nessun traguardo in questa categoria.
                    </p>
                  </motion.div>
                ) : (
                  categoryAchievements.map((def) => (
                    <AchievementCard
                      key={def.id}
                      definition={def}
                      isUnlocked={achievements.unlockedIds.includes(def.id)}
                      unlockTimestamp={achievements.unlockTimestamps[def.id]}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
              <p className="text-[10px] text-white/20 text-center">
                🏆 Sblocca tutti i traguardi per completare la tua collezione.
                I traguardi segreti vengono rivelati solo quando sbloccati.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
