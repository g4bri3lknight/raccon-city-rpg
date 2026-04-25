'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import LogText from '@/components/game/LogText';
import type { Character, CombatLogEntry } from '@/game/types';

type LogFilter = 'all' | 'damage' | 'heal' | 'status';

const FILTER_LABELS: Record<LogFilter, string> = {
  all: 'Tutto',
  damage: 'Danno',
  heal: 'Cura',
  status: 'Stato',
};

/** Determine the category of a log entry for filtering */
function getLogCategory(entry: CombatLogEntry): LogFilter | null {
  if (entry.damage && entry.damage > 0 && !entry.isMiss) return 'damage';
  if (entry.heal && entry.heal > 0) return 'heal';
  if (entry.action === 'Avvelenamento' || entry.action === 'Sanguinamento' || entry.action === 'Stordito' || entry.statusEffect) return 'status';
  if (entry.action === 'Difesa') return 'status';
  if (entry.action === 'Fuga') return 'status';
  if (entry.action === 'Combo') return 'damage';
  return null;
}

/** Get the type icon for a log entry */
function getLogIcon(entry: CombatLogEntry): string {
  if (entry.isMiss) return '💨';
  if (entry.isCritical && entry.damage) return '💥';
  if (entry.heal && entry.heal > 0) return '💚';
  if (entry.action === 'Sanguinamento') return '🩸';
  if (entry.action === 'Avvelenamento') return '☠️';
  if (entry.action === 'Stordito') return '⚡';
  if (entry.statusEffect === 'adrenaline') return '💊';
  if (entry.action === 'Difesa') return '🛡️';
  if (entry.action === 'Fuga') return '🏃';
  if (entry.action === 'Fase' && entry.actorType === 'enemy') return '💀';
  if (entry.damage && entry.damage > 0) return '⚔️';
  if (entry.action === 'Combo') return '🔥';
  if (entry.heal) return '💚';
  return '';
}

/** Get the color class for a log entry */
function getLogColorClass(entry: CombatLogEntry): string {
  if (entry.isMiss) return 'text-gray-500 italic';
  if (entry.isCritical && entry.damage) return 'text-yellow-400 font-bold';
  if (entry.damage && entry.damage > 0) {
    return entry.actorType === 'player' ? 'text-green-400' : 'text-red-400';
  }
  if (entry.heal && entry.heal > 0) return 'text-emerald-300';
  if (entry.action === 'Sanguinamento') return 'text-red-400';
  if (entry.action === 'Avvelenamento') return 'text-purple-400';
  if (entry.action === 'Stordito') return 'text-yellow-400';
  if (entry.statusEffect === 'adrenaline') return 'text-orange-400';
  if (entry.action === 'Difesa') return 'text-cyan-400';
  if (entry.action === 'Fuga') return 'text-blue-300';
  if (entry.action === 'Fase' && entry.actorType === 'enemy') return 'text-orange-500 font-bold';
  if (entry.action === 'Combo') return 'text-amber-400 font-bold';
  if (entry.message.startsWith('---')) return 'text-gray-600 text-center';
  return 'text-gray-400';
}

export default function CombatLogPanel({
  log,
  party,
  dataVersion,
  logRef,
}: {
  log: CombatLogEntry[];
  party: Character[];
  dataVersion: number;
  logRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isUserScrolledUp = useRef(false);

  // ── Detect if user has scrolled up ──
  const handleScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    const wasAtBottom = !isUserScrolledUp.current;
    isUserScrolledUp.current = !atBottom;
    setShowScrollBtn(!atBottom);
    // If user scrolled back to bottom, re-enable auto-scroll
    if (atBottom && wasAtBottom) {
      // Auto-scroll will pick up next time
    }
  }, [logRef]);

  // ── Smart auto-scroll: only scroll if user hasn't scrolled up ──
  useEffect(() => {
    if (log.length === 0) return;
    if (isUserScrolledUp.current) return;
    const el = logRef.current;
    if (!el) return;
    // Only scroll if element is visible
    if (el.offsetHeight === 0) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [log.length, logRef]);

  // ── Scroll to bottom button handler ──
  const scrollToBottom = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    isUserScrolledUp.current = false;
    setShowScrollBtn(false);
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [logRef]);

  // ── Build filtered entries with turn separators ──
  const filteredEntries = useMemo(() => {
    if (!log || log.length === 0) return [];

    const result: Array<{ type: 'separator'; turn: number } | { type: 'entry'; entry: CombatLogEntry }> = [];
    let lastTurn = -1;

    for (const entry of log) {
      // Skip non-action system messages for filtering (but not separators)
      const cat = getLogCategory(entry);
      if (activeFilter !== 'all' && cat !== null && cat !== activeFilter) continue;

      // Add turn separator when turn changes
      if (entry.turn !== lastTurn && entry.turn > 0) {
        result.push({ type: 'separator', turn: entry.turn });
        lastTurn = entry.turn;
      }

      result.push({ type: 'entry', entry });
    }

    return result;
  }, [log, activeFilter]);

  const partyAvatars = useMemo(() => party.map((p: Character) => ({
    name: p.name,
    avatarSrc: mediaUrl(p.avatarUrl || CHARACTER_IMAGES[p.archetype] || '', dataVersion),
  })), [party, dataVersion]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-1">
      {/* ── Filter buttons ── */}
      <div className="flex items-center gap-1 shrink-0 px-0.5">
        {(Object.keys(FILTER_LABELS) as LogFilter[]).map((f) => (
          <button
            key={f}
            className={`combat-log-filter-btn ${activeFilter === f ? 'is-active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* ── Log entries ── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={logRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto rounded-lg border border-white/[0.06] glass-dark-inner p-2.5 sm:p-3 inventory-scrollbar"
          aria-live="polite"
          aria-label="Registro combattimento"
        >
          <div className="space-y-0.5">
            {filteredEntries.map((item, i) => {
              if (item.type === 'separator') {
                return (
                  <div key={`sep-${item.turn}-${i}`} className="combat-log-separator">
                    ─── Turno {item.turn} ───
                  </div>
                );
              }

              const entry = item.entry;
              const isNew = i === filteredEntries.length - 1;
              const icon = getLogIcon(entry);
              const colorClass = getLogColorClass(entry);

              return (
                <motion.p
                  key={i}
                  initial={isNew ? { opacity: 0, x: -10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-[15px] sm:text-base leading-relaxed ${colorClass}`}
                >
                  {icon && <span className="mr-0.5">{icon}</span>}
                  <LogText text={entry.message} party={partyAvatars} />
                </motion.p>
              );
            })}

            {filteredEntries.length === 0 && (
              <p className="text-gray-600 text-center text-xs italic py-4">
                Nessuna voce per questo filtro
              </p>
            )}
          </div>
        </div>

        {/* ── Scroll to bottom button ── */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="scroll-to-bottom-btn"
              onClick={scrollToBottom}
            >
              ↓
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
