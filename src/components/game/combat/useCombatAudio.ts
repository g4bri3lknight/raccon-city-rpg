'use client';

import { useEffect, useRef } from 'react';
import { playZombieMoan } from '@/game/engine/sounds';
import { getSoundForEntry } from './combat-utils';
import type { CombatState, EnemyInstance } from '@/game/types';

/**
 * Manages combat audio side-effects:
 * - Ambient zombie moans when zombie-type enemies are alive
 * - Sound effects for new combat log entries
 */
export function useCombatAudio(
  combat: CombatState | null,
  enemies: EnemyInstance[],
): void {
  const zombieTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ambient zombie moan: periodic groan when zombie-type enemies are alive ──
  useEffect(() => {
    if (!combat || combat.isVictory || combat.isDefeat) return;
    // Check if any alive enemy is a zombie type
    const hasZombie = enemies.some(e => {
      if (e.currentHp <= 0) return false;
      const name = (e.name || '').toLowerCase();
      return name.includes('zombie') || name.includes('zombi') || name.includes('cadavere');
    });
    if (!hasZombie) return;
    // Play a random zombie moan every 4-8 seconds (recursive)
    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 4000; // 4–8 seconds
      return setTimeout(() => {
        try { playZombieMoan(); } catch {}
        zombieTimerRef.current = scheduleNext();
      }, delay);
    };
    zombieTimerRef.current = scheduleNext();
    return () => {
      if (zombieTimerRef.current) clearTimeout(zombieTimerRef.current);
    };
  }, [combat?.isVictory, combat?.isDefeat, enemies]);

  // ── Sound effects: play sounds when new combat log entries appear ──
  const lastLogLenRef = useRef(0);
  useEffect(() => {
    if (!combat?.log) return;
    const prevLen = lastLogLenRef.current;
    const newEntries = combat.log.slice(prevLen);
    lastLogLenRef.current = combat.log.length;

    if (newEntries.length === 0) return;
    const entry = newEntries[newEntries.length - 1];
    try {
      const soundFn = getSoundForEntry(entry);
      if (soundFn) soundFn();
    } catch { /* audio not available */ }
  }, [combat?.log?.length]);
}
