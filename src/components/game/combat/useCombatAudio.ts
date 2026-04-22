'use client';

import { useEffect, useRef } from 'react';
import { getSoundForEntry } from './combat-utils';
import type { CombatState, EnemyInstance } from '@/game/types';

/**
 * Manages combat audio side-effects:
 * - Sound effects for new combat log entries
 *
 * Zombie moan has been removed — zombie sounds play only via
 * getSoundForEntry() when a zombie actually attacks in combat.
 */
export function useCombatAudio(
  combat: CombatState | null,
  _enemies: EnemyInstance[],
): void {
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
