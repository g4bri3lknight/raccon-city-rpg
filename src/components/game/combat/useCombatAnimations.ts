'use client';

import { useState, useEffect, useRef } from 'react';
import { playEnemyDeath } from '@/game/engine/sounds';
import type { CombatState, EnemyInstance } from '@/game/types';

export interface UseCombatAnimationsReturn {
  screenShake: string | null;
  killFlash: boolean;
  hitTargetId: string | null;
  hitIsCritical: boolean;
  deathTargetId: string | null;
  bossPhaseId: string | null;
  arenaShakeClass: string;
}

/**
 * Manages all combat animation state and side-effects:
 * - Screen shake on enemy death / critical hits
 * - Kill flash on enemy death
 * - Hit animations on damage (including criticals)
 * - Death animations on enemy death
 * - Boss phase change animations
 */
export function useCombatAnimations(
  combat: CombatState | null,
  enemies: EnemyInstance[],
): UseCombatAnimationsReturn {
  const [screenShake, setScreenShake] = useState<string | null>(null);
  const [killFlash, setKillFlash] = useState(false);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [hitIsCritical, setHitIsCritical] = useState(false);
  const [deathTargetId, setDeathTargetId] = useState<string | null>(null);
  const [bossPhaseId, setBossPhaseId] = useState<string | null>(null);

  // ── Enemy death detection: play death sound + trigger screen shake & kill flash + death anim ──
  const prevEnemyHpRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!combat) return;
    const newDeaths: string[] = [];
    const deathIds: string[] = [];
    for (const enemy of enemies) {
      const prevHp = prevEnemyHpRef.current[enemy.id] ?? enemy.currentHp;
      if (prevHp > 0 && enemy.currentHp <= 0) {
        newDeaths.push(enemy.name);
        deathIds.push(enemy.id);
      }
    }
    // Update HP ref
    const hpMap: Record<string, number> = {};
    for (const enemy of enemies) hpMap[enemy.id] = enemy.currentHp;
    prevEnemyHpRef.current = hpMap;
    // Play death sound + screen shake + kill flash for each newly dead enemy
    if (newDeaths.length > 0 && !combat.isVictory) {
      try { playEnemyDeath(); } catch {}
      // Heavy screen shake on enemy death
      queueMicrotask(() => {
        setScreenShake('heavy');
        setTimeout(() => setScreenShake(null), 800);
      });
      // Kill flash
      queueMicrotask(() => {
        setKillFlash(true);
        setTimeout(() => setKillFlash(false), 800);
      });
      // Trigger death animation on each dead enemy (staggered)
      queueMicrotask(() => {
        deathIds.forEach((did, i) => {
          setTimeout(() => setDeathTargetId(did), i * 200);
          setTimeout(() => setDeathTargetId(null), i * 200 + 800);
        });
      });
    }
  }, [enemies, combat?.isVictory]);

  // ── Screen shake + hit animations on critical/damage hits (detected from log) ──
  const prevLogLenForShakeRef = useRef(0);
  useEffect(() => {
    if (!combat?.log) return;
    const prevLen = prevLogLenForShakeRef.current;
    const newEntries = combat.log.slice(prevLen);
    prevLogLenForShakeRef.current = combat.log.length;
    if (newEntries.length === 0) return;
    const lastEntry = newEntries[newEntries.length - 1];
    if (lastEntry.isCritical && lastEntry.damage && lastEntry.damage > 0) {
      queueMicrotask(() => {
        setScreenShake('normal');
        setTimeout(() => setScreenShake(null), 500);
      });
    }
    // Trigger hit animation on target
    if (lastEntry.targetId && lastEntry.damage && lastEntry.damage > 0) {
      setHitTargetId(lastEntry.targetId);
      setHitIsCritical(!!lastEntry.isCritical);
      setTimeout(() => { setHitTargetId(null); setHitIsCritical(false); }, 400);
    }
    // Trigger boss phase animation
    if (lastEntry.action === 'Cambio Fase') {
      const bossEnemy = enemies.find(e => e.isBoss && e.currentHp > 0);
      if (bossEnemy) {
        setBossPhaseId(bossEnemy.id);
        setTimeout(() => setBossPhaseId(null), 2000);
      }
    }
  }, [combat?.log?.length, enemies]);

  const arenaShakeClass = screenShake === 'heavy'
    ? 'animate-screen-shake-heavy'
    : screenShake === 'normal'
      ? 'animate-screen-shake-improved'
      : '';

  return {
    screenShake,
    killFlash,
    hitTargetId,
    hitIsCritical,
    deathTargetId,
    bossPhaseId,
    arenaShakeClass,
  };
}
