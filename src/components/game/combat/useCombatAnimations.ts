'use client';

import { useState, useEffect, useRef } from 'react';
import { audio } from '@/game/engine/sounds';
import type { CombatState, EnemyInstance } from '@/game/types';

export interface UseCombatAnimationsReturn {
  screenShake: string | null;
  killFlash: boolean;
  hitTargetId: string | null;
  hitTargetIds: string[];  // All targets for multi-target hits
  hitIsCritical: boolean;
  deathTargetId: string | null;
  bossPhaseId: string | null;
  arenaShakeClass: string;
  heavyHitClass: string | null;
  healTargetId: string | null;
}

/**
 * Manages all combat animation state and side-effects:
 * - Screen shake on enemy death / critical hits / heavy hits (>50 dmg)
 * - Kill flash on enemy death
 * - Hit animations on damage (including criticals)
 * - Death animations on enemy death
 * - Boss phase change animations
 * - Heal flash on player heal
 */
export function useCombatAnimations(
  combat: CombatState | null,
  enemies: EnemyInstance[],
): UseCombatAnimationsReturn {
  const [screenShake, setScreenShake] = useState<string | null>(null);
  const [killFlash, setKillFlash] = useState(false);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [hitTargetIds, setHitTargetIds] = useState<string[]>([]);
  const [hitIsCritical, setHitIsCritical] = useState(false);
  const [deathTargetId, setDeathTargetId] = useState<string | null>(null);
  const [bossPhaseId, setBossPhaseId] = useState<string | null>(null);
  const [heavyHitClass, setHeavyHitClass] = useState<string | null>(null);
  const [healTargetId, setHealTargetId] = useState<string | null>(null);

  // ── Enemy death detection: play entity-specific death sound + trigger animations ──
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
    // Play entity-specific death sound + screen shake + kill flash for each newly dead enemy
    if (newDeaths.length > 0 && !combat.isVictory) {
      for (const enemy of enemies) {
        if (newDeaths.includes(enemy.name) && enemy.currentHp <= 0) {
          try { audio.playEntityEnemyDeath(enemy.definitionId); } catch {}
        }
      }
      queueMicrotask(() => {
        setScreenShake('heavy');
        setTimeout(() => setScreenShake(null), 800);
      });
      queueMicrotask(() => {
        setKillFlash(true);
        setTimeout(() => setKillFlash(false), 800);
      });
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

    if (lastEntry.damage && lastEntry.damage > 50 && !lastEntry.isMiss) {
      queueMicrotask(() => {
        setHeavyHitClass('animate-screen-shake-heavy-hit');
        setTimeout(() => setHeavyHitClass(null), 600);
      });
    }

    if (lastEntry.heal && lastEntry.heal > 0) {
      const healId = lastEntry.targetId || (lastEntry.targetIds?.[0]) || null;
      if (healId) {
        queueMicrotask(() => {
          setHealTargetId(healId);
          setTimeout(() => setHealTargetId(null), 600);
        });
      }
    }

    const hitIds = [
      ...(lastEntry.targetId ? [lastEntry.targetId] : []),
      ...(lastEntry.targetIds && lastEntry.targetIds.length > 0 ? lastEntry.targetIds : []),
    ];
    const uniqueHitIds = [...new Set(hitIds)];
    if (uniqueHitIds.length > 0 && lastEntry.damage && lastEntry.damage > 0) {
      queueMicrotask(() => {
        setHitTargetId(uniqueHitIds[0]);
        setHitTargetIds(uniqueHitIds);
        setHitIsCritical(!!lastEntry.isCritical);
        setTimeout(() => { setHitTargetId(null); setHitTargetIds([]); setHitIsCritical(false); }, 400);
      });
    }
    if (lastEntry.action.startsWith('Fase ') && lastEntry.actorType === 'enemy') {
      const bossEnemy = enemies.find(e => e.isBoss && e.currentHp > 0);
      if (bossEnemy) {
        queueMicrotask(() => {
          setBossPhaseId(bossEnemy.id);
          setTimeout(() => setBossPhaseId(null), 2000);
        });
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
    hitTargetIds,
    hitIsCritical,
    deathTargetId,
    bossPhaseId,
    arenaShakeClass,
    heavyHitClass,
    healTargetId,
  };
}
