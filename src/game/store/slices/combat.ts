import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import {
  GamePhase,
  Character,
  EnemyInstance,
  CombatLogEntry,
  ItemInstance,
  StatusEffect,
  StatusDuration,
  ActiveCombatEffect,
  SpecialEffect,
} from '../../types';
import { getDifficultyConfig } from '../../data/difficulty';
import {
  ITEMS,
  ENEMIES,
  BOSS_PHASES,
  NPCS,
  getSpecialById as getSpecialByIdFromLoader,
  getCombatDelay,
  COMBAT_BOOL_CONFIG,
} from '../../data/loader';
import { WEAPON_MODS } from '../../data/weapon-mods';
import { EQUIPMENT_STATS } from '../../data/equipment';
import {
  executePlayerAttack,
  executePlayerSpecial,
  executePlayerSpecial2,
  executePlayerDefend,
  executeUseItem,
  executeEnemyAttack,
  calculateFleeChance,
  generateLoot,
  addExp,
  processActiveEffectsTick,
  getEffectiveAtk,
  getEffectiveDef,
  getEffectiveEnemyDef,
  getEffectiveSpd,
  resolveSpecialId,
} from '../../engine/combat';
import { getItemHealInfo, getItemHasStatusCure, getItemEffectTarget } from '../../utils/item-effects';
import { WeaponInstance, EffectTarget } from '../../types';
import {
  addItemToParty,
  createEnemyInstance,
  getAutoCombatDefault,
  nextNotifId,
} from '../helpers';
import { getMaxInventorySlots } from '../settings-cache';
import {
  playLevelUp,
  playVictory,
  playDefeat,
  audio,
} from '../../engine/sounds';

export const createCombatSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  selectCombatAction: (action: CombatAction) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    if (action === 'defend') {
      // Execute defend immediately
      const character = state.party.find(p => p.id === state.combat!.currentActorId)!;
      const result = executePlayerDefend(character, state.combat.turn);
      
      const updatedParty = state.party.map(p =>
        p.id === character.id ? result.updatedCharacter! : p
      );

      const newLog = [...state.combat.log, result.log];

      // Move to next actor
      get().advanceToNextActor({
        ...state.combat,
        log: newLog,
        party: updatedParty,
      });
      return;
    }

    if (action === 'flee') {
      const canFlee = calculateFleeChance(state.party, state.enemies);
      if (canFlee) {
        const hasNemesis = state.enemies.some(e => e.definitionId === 'nemesis_boss');
        set({
          phase: 'exploration',
          combat: null,
          enemies: [],
          messageLog: [...state.messageLog, `[${state.turnCount}] 🏃 Fuga riuscita!${hasNemesis ? ' 💀 Ma NEMESIS vi rintraccerà...' : ''}`],
          ...(hasNemesis && state.nemesisPursuitLevel < 5 ? { nemesisPursuitLevel: state.nemesisPursuitLevel + 1 } : {}),
        });
        return;
      } else {
        const newLog = [...state.combat.log, {
          turn: state.combat.turn,
          actorName: 'Sistema',
          actorType: 'player' as const,
          action: 'Fuga',
          message: 'Tentativo di fuga fallito!',
        }];
        // Move to next actor (skip to enemies)
        get().advanceToNextActor({
          ...state.combat,
          log: newLog,
        });
        return;
      }
    }

    set({
      combat: { ...state.combat, selectedAction: action, selectedTarget: null, selectedItemUid: null },
    });
  },

  selectCombatTarget: (targetId: string) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    set({ combat: { ...state.combat, selectedTarget: targetId } });
  },

  selectCombatItem: (itemUid: string) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    set({ combat: { ...state.combat, selectedItemUid: itemUid } });
  },

  executeCombatTurn: () => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player' || !state.combat.selectedAction) return;

    const character = state.party.find(p => p.id === state.combat!.currentActorId)!;

    // FIX: Stunned players cannot act — auto-skip their turn (same as auto-combat)
    if (character.statusEffects.includes('stunned')) {
      const stunLog: CombatLogEntry = {
        turn: state.combat.turn,
        actorName: character.name,
        actorType: 'player',
        action: 'Stordito',
        message: `${character.name} è stordito e non può agire!`,
      };
      get().advanceToNextActor({
        ...state.combat,
        log: [...state.combat.log, stunLog],
      });
      return;
    }
    let updatedParty = [...state.party];
    let updatedEnemies = [...state.enemies];
    let newLog = [...state.combat.log];
    let newPhase: GamePhase | null = null;
    let updatedCooldowns: Record<string, number> = { ...(state.combat.specialCooldowns || {}) };
    let updatedCooldowns2: Record<string, number> = { ...(state.combat.special2Cooldowns || {}) };
    let tauntTargetId: string | null = state.combat.tauntTargetId || null;
    let updatedCombatStatusDurations: Record<string, StatusDuration[]> = { ...(state.combat.statusDurations || {}) };
    let updatedCombatActiveEffects: ActiveCombatEffect[] = [...(state.combat.activeEffects || [])];

    switch (state.combat.selectedAction) {
      case 'attack': {
        if (!state.combat.selectedTarget) return;
        const enemy = updatedEnemies.find(e => e.id === state.combat!.selectedTarget && e.currentHp > 0);
        if (!enemy) {
          // Target died before this action could execute — skip
          get().advanceToNextActor({ ...state.combat!, log: newLog, party: updatedParty, enemies: updatedEnemies });
          return;
        }
        const result = executePlayerAttack(character, enemy, state.combat.turn, updatedParty, updatedEnemies, updatedCombatActiveEffects);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          updatedParty = result.updatedParty;
        }
        // Track active effects from weapon on_hit
        if (result.activeEffects && result.activeEffects.length > 0) {
          updatedCombatActiveEffects.push(...result.activeEffects);
        }
        // Track status durations on enemies from weapon on_hit effects (poison, bleed, stun)
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: 3 },
              ];
            }
          }
        }
        // Consume ammo if ranged attack was used
        if (result.consumedAmmoUid) {
          updatedParty = updatedParty.map(p => {
            if (p.id === character.id) {
              return {
                ...p,
                inventory: p.inventory.map(item => {
                  if (item.uid === result.consumedAmmoUid) {
                    const newQty = item.quantity - 1;
                    if (newQty <= 0) return null; // remove item
                    return { ...item, quantity: newQty };
                  }
                  return item;
                }).filter((item): item is typeof item => item !== null),
              };
            }
            return p;
          });
        }
        break;
      }
      case 'special': {
        if (!state.combat.selectedTarget) return;
        // Guard: cannot use special while on cooldown
        // FIX: Turn-based cooldown — value is the turn when the special becomes available again
        if ((state.combat.specialCooldowns || {})[character.id] > state.combat.turn) return;
        // Determine target based on the special ability's effects/targetType
        // Use resolveSpecialId to handle both predefined archetypes and custom characters
        const specialId = resolveSpecialId(character, 'special1Id');
        const specialDef = specialId ? getSpecialByIdFromLoader(specialId) : undefined;
        const firstTarget = specialDef?.targetType || specialDef?.effects?.[0]?.target;
        const isEnemyTarget = firstTarget === 'enemy' || firstTarget === 'all_enemies' || firstTarget === 'random_enemy';
        let target;
        if (isEnemyTarget) {
          // FIX: Only target alive enemies — never fall back to a different enemy
          const selectedEnemy = updatedEnemies.find(e => e.id === state.combat!.selectedTarget && e.currentHp > 0);
          if (!selectedEnemy) {
            // Selected enemy is dead or not found — skip this action
            get().advanceToNextActor({ ...state.combat!, log: newLog, party: updatedParty, enemies: updatedEnemies });
            return;
          }
          target = selectedEnemy;
        } else {
          // For non-enemy targets, resolve based on selectedTarget
          const enemyMatch = updatedEnemies.find(e => e.id === state.combat!.selectedTarget);
          if (enemyMatch) {
            target = enemyMatch;
          } else {
            const allyMatch = updatedParty.find(p => p.id === state.combat!.selectedTarget);
            target = allyMatch || character;
          }
        }
        const result = executePlayerSpecial(character, target, state.combat.turn, updatedParty, updatedEnemies, updatedCombatActiveEffects);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
        }
        // Track status durations on enemies after applying specials (poison, bleed, stun)
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: 3 },
              ];
            }
          }
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          // FIX: Clean up statusDurations for any statuses that were removed by this special
          // (e.g., Pronto Soccorso cures poison/bleeding — must also remove from statusDurations
          // otherwise the DOT will re-apply on next turn and overwrite the cure)
          for (const updatedP of result.updatedParty) {
            const prevP = state.party.find(sp => sp.id === updatedP.id);
            if (!prevP) continue;
            const removedStatuses = prevP.statusEffects.filter(s => !updatedP.statusEffects.includes(s) && s !== 'none');
            if (removedStatuses.length > 0 && updatedCombatStatusDurations[updatedP.id]) {
              const removedSet = new Set(removedStatuses);
              const filtered = updatedCombatStatusDurations[updatedP.id].filter(d => !removedSet.has(d.effect));
              if (filtered.length > 0) {
                updatedCombatStatusDurations[updatedP.id] = filtered;
              } else {
                delete updatedCombatStatusDurations[updatedP.id];
              }
            }
          }
          updatedParty = result.updatedParty;
        }
        // Handle applied buff (e.g., Adrenalina)
        if (result.appliedBuff) {
          const existing = updatedCombatStatusDurations[result.appliedBuff.targetId] || [];
          if (!existing.some(d => d.effect === result.appliedBuff!.effect)) {
            updatedCombatStatusDurations[result.appliedBuff.targetId] = [
              ...existing,
              { effect: result.appliedBuff.effect, turnsLeft: result.appliedBuff.duration },
            ];
          }
        }
        // Set taunt if present
        if (result.tauntTargetId) {
          tauntTargetId = result.tauntTargetId;
        }
        // Track active effects from special (buffs, shields, HoT, reflect)
        if (result.activeEffects && result.activeEffects.length > 0) {
          updatedCombatActiveEffects.push(...result.activeEffects);
        }
        // Only set cooldown if the ability was actually resolved
        // (if specialDef is undefined, the ability failed — no point setting a cooldown)
        // FIX: Turn-based cooldown — store the turn when the special becomes available again.
        // This eliminates the off-by-one bug from counter-based cooldowns where
        // decrementing in the same advanceToNextActor call could shorten the cooldown.
        // The special is unavailable for `cooldown` full turns after the current turn.
        if (specialDef) {
          updatedCooldowns[character.id] = state.combat.turn + specialDef.cooldown;
        }
        break;
      }
      case 'special2': {
        if (!state.combat.selectedTarget) return;
        // Guard: cannot use special2 while on cooldown
        // FIX: Turn-based cooldown — value is the turn when the special becomes available again
        if ((state.combat.special2Cooldowns || {})[character.id] > state.combat.turn) return;
        // Determine target based on the special ability's effects/targetType
        // Use resolveSpecialId to handle both predefined archetypes and custom characters
        const specialId2 = resolveSpecialId(character, 'special2Id');
        const specialDef2 = specialId2 ? getSpecialByIdFromLoader(specialId2) : undefined;
        const firstTarget2 = specialDef2?.targetType || specialDef2?.effects?.[0]?.target;
        const isEnemyTarget2 = firstTarget2 === 'enemy' || firstTarget2 === 'all_enemies' || firstTarget2 === 'random_enemy';
        let target;
        if (isEnemyTarget2) {
          // FIX: Only target alive enemies — never fall back to a different enemy
          const selectedEnemy = updatedEnemies.find(e => e.id === state.combat!.selectedTarget && e.currentHp > 0);
          if (!selectedEnemy) {
            // Selected enemy is dead or not found — skip this action
            get().advanceToNextActor({ ...state.combat!, log: newLog, party: updatedParty, enemies: updatedEnemies });
            return;
          }
          target = selectedEnemy;
        } else {
          // For non-enemy targets, resolve based on selectedTarget
          const enemyMatch = updatedEnemies.find(e => e.id === state.combat!.selectedTarget);
          if (enemyMatch) {
            target = enemyMatch;
          } else {
            const allyMatch = updatedParty.find(p => p.id === state.combat!.selectedTarget);
            target = allyMatch || character;
          }
        }
        const result = executePlayerSpecial2(character, target, state.combat.turn, updatedParty, updatedEnemies, updatedCombatActiveEffects);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
        }
        // Track status durations on enemies after applying specials (poison, bleed, stun)
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: 3 },
              ];
            }
          }
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          // FIX: Clean up statusDurations for any statuses that were removed by this special2
          for (const updatedP of result.updatedParty) {
            const prevP = state.party.find(sp => sp.id === updatedP.id);
            if (!prevP) continue;
            const removedStatuses = prevP.statusEffects.filter(s => !updatedP.statusEffects.includes(s) && s !== 'none');
            if (removedStatuses.length > 0 && updatedCombatStatusDurations[updatedP.id]) {
              const removedSet = new Set(removedStatuses);
              const filtered = updatedCombatStatusDurations[updatedP.id].filter(d => !removedSet.has(d.effect));
              if (filtered.length > 0) {
                updatedCombatStatusDurations[updatedP.id] = filtered;
              } else {
                delete updatedCombatStatusDurations[updatedP.id];
              }
            }
          }
          updatedParty = result.updatedParty;
        }
        // Set taunt if tank used Immolation
        if (result.tauntTargetId) {
          tauntTargetId = result.tauntTargetId;
        }
        // Handle applied buff (e.g., Adrenalina)
        if (result.appliedBuff) {
          const existing = updatedCombatStatusDurations[result.appliedBuff.targetId] || [];
          if (!existing.some(d => d.effect === result.appliedBuff!.effect)) {
            updatedCombatStatusDurations[result.appliedBuff.targetId] = [
              ...existing,
              { effect: result.appliedBuff.effect, turnsLeft: result.appliedBuff.duration },
            ];
          }
        }
        // Track active effects from special2
        if (result.activeEffects && result.activeEffects.length > 0) {
          updatedCombatActiveEffects.push(...result.activeEffects);
        }
        // Only set cooldown if the ability was actually resolved
        // FIX: Turn-based cooldown — store the turn when the special becomes available again
        if (specialDef2) {
          updatedCooldowns2[character.id] = state.combat.turn + specialDef2.cooldown;
        }
        break;
      }
      case 'use_item': {
        if (!state.combat.selectedItemUid || !state.combat.selectedTarget) return;
        const item = character.inventory.find(i => i.uid === state.combat!.selectedItemUid);
        if (!item) return;
        
        // Determine target based on item's effects (like specials do)
        const firstTarget = item.effects?.[0]?.target;
        const isEnemyTarget = firstTarget === 'enemy' || firstTarget === 'all_enemies' || firstTarget === 'random_enemy';
        let itemTarget: EnemyInstance | Character;
        if (isEnemyTarget) {
          itemTarget = updatedEnemies.find(e => e.id === state.combat!.selectedTarget) || updatedEnemies[0];
        } else {
          itemTarget = updatedParty.find(p => p.id === state.combat!.selectedTarget) || character;
        }

        // Heal-ally support: if item is self-targeted but user selected a different ally,
        // clone effects and override target from 'self' to 'one_ally'
        let effectiveItem = item;
        if (item.effects && itemTarget.id !== character.id) {
          const hasSelfTarget = item.effects.some(e =>
            (e.trigger === 'on_use' || !e.trigger) && e.target === 'self'
          );
          if (hasSelfTarget) {
            effectiveItem = {
              ...item,
              effects: item.effects.map(e =>
                (e.trigger === 'on_use' || !e.trigger) && e.target === 'self'
                  ? { ...e, target: 'one_ally' as const }
                  : e
              ),
            };
          }
        }
        
        const result = executeUseItem(character, effectiveItem, itemTarget, updatedParty, updatedEnemies, state.combat.turn, updatedCombatActiveEffects);
        newLog.push(result.log);
        
        // Handle enemy updates (e.g., deal_damage to all_enemies for rocket launcher)
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
          // Track status durations on enemies after applying item effects (poison, bleed, stun)
          for (const e of updatedEnemies) {
            const prevEnemy = state.enemies.find(pe => pe.id === e.id);
            if (!prevEnemy) continue;
            const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
            for (const effect of newEffects) {
              if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
                const existing = updatedCombatStatusDurations[e.id] || [];
                updatedCombatStatusDurations[e.id] = [
                  ...existing,
                  { effect: effect as StatusEffect, turnsLeft: 3 },
                ];
              }
            }
          }
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          updatedParty = result.updatedParty;
        }
        // Track active effects from item (buffs, shields, hoTs, reflect)
        if (result.activeEffects && result.activeEffects.length > 0) {
          updatedCombatActiveEffects.push(...result.activeEffects);
        }
        // Handle applied buff
        if (result.appliedBuff) {
          const existing = updatedCombatStatusDurations[result.appliedBuff.targetId] || [];
          if (!existing.some(d => d.effect === result.appliedBuff!.effect)) {
            updatedCombatStatusDurations[result.appliedBuff.targetId] = [
              ...existing,
              { effect: result.appliedBuff.effect, turnsLeft: result.appliedBuff.duration },
            ];
          }
        }
        // Set taunt if present
        if (result.tauntTargetId) {
          tauntTargetId = result.tauntTargetId;
        }
        // Consume the item
        if (result.consumeItem) {
          const consumedUid = state.combat!.selectedItemUid;
          updatedParty = updatedParty.map(p => {
            if (p.id === character.id) {
              return {
                ...p,
                inventory: p.inventory
                  .map(i => {
                    if (i.uid !== consumedUid) return { ...i };
                    const newQty = i.quantity - 1;
                    if (newQty <= 0) return null;
                    return { ...i, quantity: newQty };
                  })
                  .filter((i): i is NonNullable<typeof i> => i !== null),
              };
            }
            return p;
          });
        }
        // Clean statusDurations for cured statuses
        if (result.curedStatuses && result.curedStatuses.length > 0) {
          const curedSet = new Set(result.curedStatuses);
          const targetId = (!isEnemyTarget && 'id' in itemTarget) ? itemTarget.id : character.id;
          if (result.updatedParty) {
            // all_allies cure: clean all party members
            for (const charId of Object.keys(updatedCombatStatusDurations)) {
              const filtered = updatedCombatStatusDurations[charId].filter(d => !curedSet.has(d.effect));
              if (filtered.length > 0) {
                updatedCombatStatusDurations[charId] = filtered;
              } else {
                delete updatedCombatStatusDurations[charId];
              }
            }
          } else if (updatedCombatStatusDurations[targetId]) {
            const filtered = updatedCombatStatusDurations[targetId].filter(d => !curedSet.has(d.effect));
            if (filtered.length > 0) {
              updatedCombatStatusDurations[targetId] = filtered;
            } else {
              delete updatedCombatStatusDurations[targetId];
            }
          }
        }
        break;
      }
    }

    // ── BOSS PHASE TRANSITION CHECK ──
    const targetIndex: number[] = [];
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i];
      if (!enemy.isBoss || enemy.currentHp <= 0) continue;
      const phases = BOSS_PHASES[enemy.definitionId];
      if (!phases || enemy.currentPhase >= phases.length) continue;

      const phaseDef = phases[enemy.currentPhase];
      const hpPercent = enemy.currentHp / enemy.maxHp;

      if (hpPercent <= phaseDef.hpThreshold) {
        targetIndex.push(i);
      }
    }
    if (targetIndex.length > 0) {
      updatedEnemies = updatedEnemies.map((enemy, i) => {
        if (!targetIndex.includes(i)) return enemy;
        const phases = BOSS_PHASES[enemy.definitionId];
        const phaseDef = phases![enemy.currentPhase];
        const newPhase = enemy.currentPhase + 1;
        const newMaxHp = Math.round(enemy.maxHp * phaseDef.hpMultiplier);
        const newCurrentHp = Math.max(enemy.currentHp, Math.round(newMaxHp * phaseDef.hpThreshold * 0.5));
        const newAbilities = phaseDef.newAbilities
          ? [...enemy.abilities, ...phaseDef.newAbilities]
          : enemy.abilities;

        newLog.push({
          turn: state.combat.turn,
          actorName: enemy.name,
          actorType: 'enemy',
          action: `Fase ${newPhase}: ${phaseDef.name}`,
          message: phaseDef.message,
        });

        // Play entity-specific boss phase sound
        try { audio.playEntityBossPhase(phaseDef.id); } catch {}

        // Reset phase transitioning flag after visual delay (handled in UI)
        setTimeout(() => {
          set(state => ({
            enemies: state.enemies.map(e => e.id === enemy.id ? { ...e, isPhaseTransitioning: false } : e),
          }));
        }, 2000);

        return {
          ...enemy,
          currentPhase: newPhase,
          isPhaseTransitioning: true,
          maxHp: newMaxHp,
          currentHp: newCurrentHp,
          atk: Math.round(enemy.atk * phaseDef.atkMultiplier),
          def: Math.round(enemy.def * phaseDef.defMultiplier),
          spd: Math.round(enemy.spd * phaseDef.spdMultiplier),
          abilities: newAbilities,
        };
      });
    }

    // Check if all enemies are dead
    if (updatedEnemies.every(e => e.currentHp <= 0)) {
      newPhase = 'exploration';
      
      // Get difficulty config for loot/EXP multipliers
      const lootDiff = getDifficultyConfig(state.difficulty, state.partySize);

      // Generate loot (with difficulty multiplier)
      const allLoot: string[] = [];
      for (const enemy of updatedEnemies) {
        allLoot.push(...generateLoot(enemy.definitionId, lootDiff.lootMult));
      }

      // Filter out collectibles from combat loot (they are exploration-only)
      const combatLoot = allLoot.filter(id => {
        const def = ITEMS[id];
        return !def || def.type !== 'collectible';
      });

      // Distribute loot (auto-merge stacks of same item)
      const lostLoot: string[] = [];
      for (const itemId of combatLoot) {
        const itemDef = ITEMS[itemId];
        if (!itemDef) continue;
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (added) return p;
          // Equipment and mods are unique — don't stack
          if (itemDef.type === 'armor' || itemDef.type === 'accessory' || itemDef.type === 'weapon_mod') {
            if (p.inventory.length < p.maxInventorySlots) {
              added = true;
              const equipStats = EQUIPMENT_STATS[itemId];
              const modStats = WEAPON_MODS[itemId];
              const newItem: ItemInstance = {
                uid: `${itemId}_${Date.now()}_${Math.random()}`,
                itemId,
                name: itemDef.name,
                description: itemDef.description,
                type: itemDef.type,
                rarity: itemDef.rarity,
                icon: itemDef.icon,
                usable: itemDef.usable,
                equippable: itemDef.equippable,
            
                effects: itemDef.effects,
                quantity: 1,
                equipmentStats: equipStats || undefined,
                modStats: modStats || undefined,
              };
              return { ...p, inventory: [...p.inventory, newItem] };
            }
            return p;
          }
          // Try to add to existing stack first (stackable items)
          const existingIdx = p.inventory.findIndex(i => i.itemId === itemId);
          if (existingIdx >= 0) {
            added = true;
            const updatedInv = [...p.inventory];
            updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + 1 };
            return { ...p, inventory: updatedInv };
          }
          // No existing stack, add as new entry
          if (p.inventory.length < p.maxInventorySlots) {
            added = true;
            const newItem: ItemInstance = {
              uid: `${itemId}_${Date.now()}_${Math.random()}`,
              itemId,
              name: itemDef.name,
              description: itemDef.description,
              type: itemDef.type,
              rarity: itemDef.rarity,
              icon: itemDef.icon,
              usable: itemDef.usable,
              equippable: itemDef.equippable,
          
              effects: itemDef.effects,
              quantity: 1,
            };
            return { ...p, inventory: [...p.inventory, newItem] };
          }
          return p;
        });
        if (!added) {
          lostLoot.push(itemDef.name);
        }
      }

      // Award EXP (with difficulty multiplier)
      const rawExp = updatedEnemies.reduce((sum, e) => sum + ENEMIES[e.definitionId].expReward, 0);
      const totalExp = Math.round(rawExp * lootDiff.expMult);
      const levelUpMessages: string[] = [];
      for (const char of updatedParty) {
        if (char.currentHp > 0) {
          const result = addExp(char, totalExp);
          updatedParty = updatedParty.map(p => p.id === result.updated.id ? result.updated : p);
          if (result.leveledUp) {
            // Play level up sound (#36)
            try { playLevelUp(); } catch {}
            levelUpMessages.push(`⬆️ ${result.updated.name} sale al livello ${result.updated.level}!`);
          }
        }
      }

      const lootNames = combatLoot.map(id => ITEMS[id]?.name).filter(Boolean);
      let victoryMsg = `⚔️ Sei sopravvissuto allo scontro. +${totalExp} EXP.`;
      if (lostLoot.length > 0) {
        victoryMsg += ` ⚠️ Inventario pieno! Persi: ${lostLoot.join(', ')}`;
      }

      newLog.push({
        turn: state.combat.turn,
        actorName: 'Sistema',
        actorType: 'player',
        action: 'Sopravvissuto',
        message: victoryMsg,
      });

      // Check if this was a boss fight (victory condition)
      // Update bestiary - mark defeated enemies
      const victoryBestiary = [...state.bestiary];
      const defeatedEnemyIds: string[] = [];
      for (const enemy of updatedEnemies) {
        if (enemy.currentHp <= 0) {
          defeatedEnemyIds.push(enemy.definitionId);
          const existing = victoryBestiary.find(b => b.enemyId === enemy.definitionId);
          if (!existing) {
            victoryBestiary.push({ enemyId: enemy.definitionId, encountered: true, defeated: true, timesDefeated: 1, firstDefeatTimestamp: Date.now() });
          } else {
            existing.defeated = true;
            existing.timesDefeated += 1;
            if (!existing.firstDefeatTimestamp) existing.firstDefeatTimestamp = Date.now();
          }
        }
      }

      // Update NPC kill quest progress
      let updatedNpcQuestProgress = { ...state.npcQuestProgress };
      const questLogMsgs: string[] = [];

      // ── NEMESIS PERSISTENT: if Nemesis is defeated, set pursuit level to 5 ──
      let newNemesisPursuitLevel = state.nemesisPursuitLevel;
      if (defeatedEnemyIds.includes('nemesis_boss') && state.nemesisPursuitLevel < 5) {
        newNemesisPursuitLevel = 5;
        questLogMsgs.push(`[${state.turnCount}] 💀 NEMESIS è stato eliminato definitivamente! L'inseguimento è finito.`);
      }

      for (const enemyId of defeatedEnemyIds) {
        for (const npc of Object.values(NPCS)) {
          if (npc.quest?.type === 'kill' && npc.quest.targetId === enemyId) {
            const qp = { ...(updatedNpcQuestProgress[npc.quest.id] || { currentCount: 0, completed: false }) };
            if (!qp.completed) {
              qp.currentCount += 1;
              if (qp.currentCount >= npc.quest.targetCount) {
                qp.completed = true;
                questLogMsgs.push(`[${state.turnCount}] 📋 Missione completata: ${npc.quest.name}!`);
                if (npc.quest.rewardItems) {
                  for (const reward of npc.quest.rewardItems) {
                    const rewardDef = ITEMS[reward.itemId];
                    if (!rewardDef) continue;
                    const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
                    updatedParty = result.party;
                    if (result.added) questLogMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
                  }
                }
              }
              updatedNpcQuestProgress[npc.quest.id] = qp;
            }
          }
        }
      }

      if (updatedEnemies.some(e => e.isBoss)) {
        // Play victory sound for boss kill (#36)
        try { playVictory(); } catch {}

        set({
          notification: {
            id: `notif_${++notifId}`,
            type: 'victory',
            message: 'EVASIONE COMPLETATA',
            icon: '🚪',
            subMessage: `Boss eliminato. +${totalExp} EXP`,
            lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
            levelUps: levelUpMessages,
          },
          combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
          party: updatedParty,
          enemies: updatedEnemies,
          messageLog: [
            ...state.messageLog,
            `[${state.turnCount}] ⚔️ Boss eliminato. Sei sopravvissuto. +${totalExp} EXP`,
            ...levelUpMessages,
            ...questLogMsgs,
          ],
          bestiary: victoryBestiary,
          npcQuestProgress: updatedNpcQuestProgress,
          nemesisPursuitLevel: newNemesisPursuitLevel,
        });
        setTimeout(() => {
          // Auto-save after boss victory before transitioning
          try { get().autoSave(); } catch {}
          get().victory();
        }, 3500);
        return;
      }

      // Play victory sound for regular combat (#36)
      try { playVictory(); } catch {}

      set({
        notification: {
          id: `notif_${++notifId}`,
          type: 'victory',
          message: 'SOPRAVVVISSUTO',
          icon: '⚔️',
          subMessage: `Sei sopravvissuto allo scontro. +${totalExp} EXP`,
          lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
          levelUps: levelUpMessages,
        },
        combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
        party: updatedParty,
        enemies: updatedEnemies,
        messageLog: [
          ...state.messageLog,
          `[${state.turnCount}] ⚔️ Sei sopravvissuto allo scontro. +${totalExp} EXP`,
          ...levelUpMessages,
          ...questLogMsgs,
        ],
        bestiary: victoryBestiary,
        npcQuestProgress: updatedNpcQuestProgress,
        nemesisPursuitLevel: newNemesisPursuitLevel,
      });
      setTimeout(() => {
        set({ phase: 'exploration', combat: null, enemies: [], notification: null });
        setTimeout(() => get().checkAchievements(), 100);
      }, 3500);
      return;
    }

    // ── ENEMIES STILL ALIVE: persist state and advance to next actor ──
    // This is the normal (non-victory) path — apply all computed changes
    // and let advanceToNextActor handle turn progression, cooldowns, etc.
    get().advanceToNextActor({
      ...state.combat,
      log: newLog,
      party: updatedParty,
      enemies: updatedEnemies,
      specialCooldowns: updatedCooldowns,
      special2Cooldowns: updatedCooldowns2,
      tauntTargetId,
      statusDurations: updatedCombatStatusDurations,
      activeEffects: updatedCombatActiveEffects,
    });
  },

  toggleAutoCombat: () => {
    set(state => ({ autoCombat: !state.autoCombat }));
  },

  executeAutoCombatTurn: () => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player' || state.combat.isVictory || state.combat.isDefeat || state.combat.isProcessing) return;

    const character = state.party.find(p => p.id === state.combat!.currentActorId);
    if (!character || character.currentHp <= 0) {
      // Dead character set as current actor — recover by advancing to next alive
      setTimeout(() => get().advanceToNextActor(), getCombatDelay(300));
      return;
    }

    // Stunned characters cannot act — skip their turn
    if (character.statusEffects.includes('stunned')) {
      const stunLog: CombatLogEntry = { turn: state.combat.turn, actorName: character.name, actorType: 'player', action: 'Stordito', message: `${character.name} è stordito e non può agire!` };
      set(s => ({ combat: s.combat ? { ...s.combat, log: [...s.combat.log, stunLog] } : s.combat }));
      setTimeout(() => get().advanceToNextActor(), getCombatDelay(600));
      return;
    }

    const aliveEnemies = state.enemies.filter(e => e.currentHp > 0);
    const aliveParty = state.party.filter(p => p.currentHp > 0);
    // Safety: if no enemies alive but victory not declared, force advance
    if (aliveEnemies.length === 0) {
      setTimeout(() => get().advanceToNextActor(), getCombatDelay(300));
      return;
    }
    if (aliveParty.length === 0) {
      // All party dead but defeat not declared — force game over
      try { playDefeat(); } catch {}
      set({ phase: 'game-over', combat: null, enemies: [], messageLog: [...state.messageLog, `[${state.turnCount}] 💀 Game Over`] });
      return;
    }

    // FIX: Turn-based cooldown — check if current turn < expiry turn
    const currentTurn = state.combat.turn;
    const specialCd = state.combat.specialCooldowns?.[character.id] ?? 0;
    const special2Cd = state.combat.special2Cooldowns?.[character.id] ?? 0;
    const specialOnCd = specialCd > currentTurn;
    const special2OnCd = special2Cd > currentTurn;

    // ── AI Decision Logic ──
    // 1. Healer: group heal if multiple wounded + special2 available
    if (character.archetype === 'healer') {
      const woundedCount = aliveParty.filter(p => p.currentHp < p.maxHp * 0.6).length;
      if (woundedCount >= 2 && !special2OnCd) {
        get().selectCombatAction('special2');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // Heal single wounded ally if special available
      const wounded = aliveParty.find(p => p.currentHp < p.maxHp * 0.5);
      if (wounded && !specialOnCd) {
        get().selectCombatAction('special');
        get().selectCombatTarget(wounded.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // If healer is wounded or has status effects, fall through to item usage (step 5)
      // instead of always attacking — this allows the healer to use healing items
      const selfNeedsHelp = character.currentHp < character.maxHp * 0.5
        || character.statusEffects.includes('poison')
        || character.statusEffects.includes('bleeding');
      if (!selfNeedsHelp) {
        // Otherwise attack weakest enemy
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('attack');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // Falls through to step 5 (item usage) when self needs help
    }

    // 2. Tank: use Immolation (special2) if multiple enemies and available
    if (character.archetype === 'tank') {
      if (!special2OnCd && aliveEnemies.length >= 2) {
        get().selectCombatAction('special2');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // Barricata if available and HP < 70%
      if (!specialOnCd && character.currentHp < character.maxHp * 0.7) {
        get().selectCombatAction('special');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // Defend if HP low and specials on cooldown
      if (character.currentHp < character.maxHp * 0.3) {
        get().selectCombatAction('defend');
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
    }

    // 3. Control: use Gas Venefico (special) if multiple enemies alive (AoE), Cristalli Sonici (special2) if single
    if (character.archetype === 'control') {
      if (!specialOnCd && aliveEnemies.length >= 2) {
        // FIX: Use special1 (Gas Venefico - AoE) when multiple enemies
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('special');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      if (!special2OnCd) {
        // Use special2 (Cristalli Sonici - single target stun) 
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('special2');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
      // Fallback to special1 if special2 on cooldown (even against single enemy)
      if (!specialOnCd) {
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('special');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
        return;
      }
    }

    // 4. DPS / Custom: use Raffica (special2) if multiple enemies alive + available
    if ((character.archetype === 'dps' || character.archetype === 'custom') && !special2OnCd && aliveEnemies.length >= 2) {
      const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
      get().selectCombatAction('special2');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
      return;
    }
    // DPS / Custom: use Colpo Mortale if available and only 1 enemy or boss
    if ((character.archetype === 'dps' || character.archetype === 'custom') && !specialOnCd) {
      const weakest = aliveEnemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
      get().selectCombatAction('special');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
      return;
    }

    // 4b. Custom archetype fallback: if no specials available, just attack
    if (character.archetype === 'custom') {
      const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
      get().selectCombatAction('attack');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
      return;
    }

    // 5. Universal item usage — healing, curing, emergency items
    // Only use items from the CURRENT character's inventory (consistent with manual play)
    // Guarded by combat.autoUseItems setting
    const autoUseItems = COMBAT_BOOL_CONFIG.autoUseItems !== false;
    const myUsableItems = character.inventory.filter(i => i.usable && i.type !== 'ammo' && i.type !== 'weapon_mod' && i.type !== 'bag' && i.type !== 'collectible' && i.type !== 'key' && i.effects && i.effects.length > 0);

    if (autoUseItems && myUsableItems.length > 0) {
      // 5a. Cure status effects (poison/bleeding) — high priority
      // Check self first, then any ally with status effects
      const selfHasStatus = character.statusEffects.includes('poison') || character.statusEffects.includes('bleeding');
      const allyWithStatus = !selfHasStatus
        ? aliveParty.find(p => p.id !== character.id && (p.statusEffects.includes('poison') || p.statusEffects.includes('bleeding')))
        : null;
      const statusTarget = selfHasStatus ? character : allyWithStatus;
      if (statusTarget) {
        // Prefer herb_mixed (heals + cures) if target's HP is also low
        const mixedHerb = myUsableItems.find(i => i.itemId === 'herb_mixed');
        if (mixedHerb && statusTarget.currentHp < statusTarget.maxHp * 0.7) {
          get().selectCombatAction('use_item');
          get().selectCombatItem(mixedHerb.uid);
          get().selectCombatTarget(statusTarget.id);
          setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
          return;
        }
        // Use antidote for poison-only
        if (statusTarget.statusEffects.includes('poison')) {
          const antidote = myUsableItems.find(i => i.itemId === 'antidote');
          if (antidote) {
            get().selectCombatAction('use_item');
            get().selectCombatItem(antidote.uid);
            get().selectCombatTarget(statusTarget.id);
            setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
            return;
          }
        }
        // Use first_aid (heal_full + cures)
        const firstAidKit = myUsableItems.find(i => getItemHealInfo(i)?.isFullHeal && getItemHasStatusCure(i));
        if (firstAidKit) {
          get().selectCombatAction('use_item');
          get().selectCombatItem(firstAidKit.uid);
          get().selectCombatTarget(statusTarget.id);
          setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
          return;
        }
      }
    }
  },

      advanceToNextActor: (combatState: GameStore['combat'] & { party?: Character[]; enemies?: EnemyInstance[] }) => {
    const state = get();
    const combat = combatState || state.combat;
    if (!combat) return;

    const party = combatState?.party || state.party;
    const enemies = combatState?.enemies || state.enemies;
    const statusDurations = combat.statusDurations || {};

    // Build alive actor set for quick lookup
    const alivePartyIds = new Set(party.filter(p => p.currentHp > 0).map(p => p.id));
    const aliveEnemyIds = new Set(enemies.filter(e => e.currentHp > 0).map(e => e.id));

    // Use stable turn order from combat state, filter out dead actors
    const allActors = (combat.fullTurnOrder || []).filter(a =>
      (a.type === 'player' && alivePartyIds.has(a.id)) ||
      (a.type === 'enemy' && aliveEnemyIds.has(a.id))
    );

    // Safety: if no actors alive, bail
    if (allActors.length === 0) return;

    const currentIdx = allActors.findIndex(a => a.id === combat.currentActorId);
    let nextIdx: number;
    let isNewTurn: boolean;

    if (currentIdx === -1) {
      // Current actor is dead or not in order — start from beginning (new turn)
      nextIdx = 0;
      isNewTurn = true;
    } else {
      nextIdx = (currentIdx + 1) % allActors.length;
      isNewTurn = nextIdx === 0;
    }

    let newTurn = isNewTurn ? combat.turn + 1 : combat.turn;

    // FIX: Turn-based cooldown system — no more decrementing!
    // Cooldown values now store the TURN NUMBER when the special becomes available again.
    // We just clean up expired cooldowns and generate notifications at turn boundaries.
    const statusLogEntries: CombatLogEntry[] = [];
    let updatedCooldowns: Record<string, number> = { ...(combat.specialCooldowns || {}) };
    let updatedCooldowns2: Record<string, number> = { ...(combat.special2Cooldowns || {}) };
    // Clear taunt at new turn (immolation lasts 1 turn)
    let tauntTargetId = combat.tauntTargetId;

    // Helper: check for cooldown expiries and generate log notifications.
    // Called whenever a turn boundary is crossed.
    const checkCooldownExpiries = (currentTurn: number) => {
      // Check special1 cooldowns
      for (const [charId, expiryTurn] of Object.entries(updatedCooldowns)) {
        if (expiryTurn <= currentTurn) {
          // Cooldown has expired — notify and remove
          const charName = party.find(p => p.id === charId)?.name || charId;
          statusLogEntries.push({ turn: currentTurn, actorName: 'Sistema', actorType: 'player', action: 'Cooldown', message: `✅ ${charName}: Speciale pronta!` });
          delete updatedCooldowns[charId];
        }
      }

      // Check special2 cooldowns
      for (const [charId, expiryTurn] of Object.entries(updatedCooldowns2)) {
        if (expiryTurn <= currentTurn) {
          const charName = party.find(p => p.id === charId)?.name || charId;
          statusLogEntries.push({ turn: currentTurn, actorName: 'Sistema', actorType: 'player', action: 'Cooldown', message: `✅ ${charName}: Speciale 2 pronta!` });
          delete updatedCooldowns2[charId];
        }
      }
    };

    if (isNewTurn) {
      tauntTargetId = null;
      checkCooldownExpiries(newTurn);
    }

    const nextActor = allActors[nextIdx];

    // Process status effects at new turn start
    let updatedParty = party.map(p => ({ ...p, isDefending: false }));
    let updatedStatusDurations: Record<string, StatusDuration[]> = JSON.parse(JSON.stringify(statusDurations));

    // Initialize currentActiveEffects in function scope so it's accessible everywhere
    let currentActiveEffects = [...(combat.activeEffects || [])];

    if (isNewTurn) {
      // Process active combat effects tick (HoT, buff/debuff, shield, reflect)
      if (currentActiveEffects.length > 0) {
        const tickResult = processActiveEffectsTick(currentActiveEffects, updatedParty, enemies, newTurn);
        statusLogEntries.push(...tickResult.log);
        updatedParty = tickResult.updatedParty;
        // Remove expired effects
        const expiredIds = new Set(tickResult.expiredEffects);
        if (expiredIds.size > 0) {
          currentActiveEffects.splice(0, currentActiveEffects.length,
            ...currentActiveEffects.filter(e => !expiredIds.has(e.id)));
        }
      }

      // Process status effects on party members
      for (const p of updatedParty) {
        const charDurations = updatedStatusDurations[p.id] || [];
        let hp = p.currentHp;
        const remainingDurations: StatusDuration[] = [];

        for (const sd of charDurations) {
          if (sd.effect === 'poison') {
            const poisonDmg = Math.max(1, Math.floor(p.maxHp * 0.06));
            hp = Math.max(0, hp - poisonDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Avvelenamento',
              damage: poisonDmg,
              message: `🟢 ${p.name} soffre di avvelenamento! -${poisonDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'bleeding') {
            const bleedDmg = Math.max(1, Math.floor(p.maxHp * 0.04));
            hp = Math.max(0, hp - bleedDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Sanguinamento',
              damage: bleedDmg,
              message: `🩸 ${p.name} perde sangue! -${bleedDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'adrenaline') {
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Adrenalina',
              message: `💉 ${p.name} è sotto adrenalina! +25% danni (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          // Decrement turns; keep only effects that still have turns left
          const newTurnsLeft = sd.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingDurations.push({ effect: sd.effect, turnsLeft: newTurnsLeft });
          } else {
            // Effect expired — remove from character's statusEffects
            const effectLabel = sd.effect === 'poison' ? 'avvelenamento' : sd.effect === 'bleeding' ? 'sanguinamento' : sd.effect === 'adrenaline' ? 'adrenalina' : sd.effect;
            const emoji = sd.effect === 'adrenaline' ? '💉' : '✨';
            const verb = sd.effect === 'adrenaline' ? "L'effetto di" : 'si è ripreso da';
            statusLogEntries.push({
              turn: newTurn,
              actorName: 'Sistema',
              actorType: 'player',
              action: 'Recupero',
              message: `${emoji} ${verb} ${effectLabel} è terminato per ${p.name}!`,
            });
          }
        }

        updatedParty = updatedParty.map(ch =>
          ch.id === p.id
            ? {
                ...ch,
                currentHp: hp,
                statusEffects: remainingDurations.map(rd => rd.effect),
              }
            : ch
        );

        if (remainingDurations.length > 0) {
          updatedStatusDurations[p.id] = remainingDurations;
        } else {
          delete updatedStatusDurations[p.id];
        }

        // Update alivePartyIds if a party member died from DOT
        if (hp <= 0) {
          alivePartyIds.delete(p.id);
        }
      }
    }

    // Process status effects on ENEMIES at new turn start (DOT for poison/bleeding)
    let updatedEnemiesForStatus = [...enemies];
    if (isNewTurn) {
      for (const enemy of updatedEnemiesForStatus) {
        if (enemy.currentHp <= 0) continue;
        const enemyDurations = updatedStatusDurations[enemy.id] || [];
        if (enemyDurations.length === 0 && !enemy.statusEffects.includes('poison') && !enemy.statusEffects.includes('bleeding')) continue;

        let hp = enemy.currentHp;
        const remainingDurations: StatusDuration[] = [];

        for (const sd of enemyDurations) {
          if (sd.effect === 'poison') {
            const poisonDmg = Math.max(1, Math.floor(enemy.maxHp * 0.06));
            hp = Math.max(0, hp - poisonDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Avvelenamento',
              damage: poisonDmg,
              message: `🟢 ${enemy.name} è avvelenato! -${poisonDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'bleeding') {
            const bleedDmg = Math.max(1, Math.floor(enemy.maxHp * 0.04));
            hp = Math.max(0, hp - bleedDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Sanguinamento',
              damage: bleedDmg,
              message: `🩸 ${enemy.name} sanguina! -${bleedDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'stunned') {
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Stordito',
              message: `💫 ${enemy.name} è stordito! (${sd.turnsLeft} turni rimasti)`,
            });
          }
          const newTurnsLeft = sd.effect === 'stunned' ? sd.turnsLeft : sd.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingDurations.push({ effect: sd.effect, turnsLeft: newTurnsLeft });
          } else {
            const effectLabel = sd.effect === 'poison' ? 'avvelenamento' : sd.effect === 'bleeding' ? 'sanguinamento' : sd.effect === 'stunned' ? 'stordimento' : sd.effect;
            statusLogEntries.push({
              turn: newTurn,
              actorName: 'Sistema',
              actorType: 'enemy',
              action: 'Recupero',
              message: `✨ ${enemy.name} si è ripreso da ${effectLabel}!`,
            });
          }
        }

        updatedEnemiesForStatus = updatedEnemiesForStatus.map(e =>
          e.id === enemy.id
            ? {
                ...e,
                currentHp: hp,
                statusEffects: remainingDurations.map(rd => rd.effect),
              }
            : e
        );

        if (remainingDurations.length > 0) {
          updatedStatusDurations[enemy.id] = remainingDurations;
        } else {
          delete updatedStatusDurations[enemy.id];
        }
      }

      // Check if any enemy died from DOT — update tracking
      if (updatedEnemiesForStatus.some(e => e.currentHp <= 0)) {
        for (const e of updatedEnemiesForStatus) {
          if (e.currentHp <= 0) {
            aliveEnemyIds.delete(e.id);
            statusLogEntries.push({ turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'DOT', message: `☠️ ${e.name} è stato sconfitto dai danni nel tempo!` });
          }
        }
      }
    }

    // Build final log with all status entries
    let finalLog: CombatLogEntry[] = isNewTurn
      ? [
          ...combat.log,
          { turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'Turno', message: `--- Turno ${newTurn} ---` },
          ...statusLogEntries,
        ]
      : [...combat.log];

    // Check if ALL enemies died from DOT → declare victory
    if (aliveEnemyIds.size === 0 && updatedEnemiesForStatus.length > 0) {
      const updatedPartyAfterDot = updatedParty.map(p => {
        if (p.statusEffects.includes('poison') || p.statusEffects.includes('bleeding')) {
          return { ...p, statusEffects: p.statusEffects.filter(s => s !== 'poison' && s !== 'bleeding') };
        }
        return p;
      });
      let totalExp = 0;
      const victoryBestiary = [...get().bestiary];
      for (const e of updatedEnemiesForStatus) {
        totalExp += ENEMIES[e.definitionId]?.expReward ?? 0;
        const existing = victoryBestiary.find(b => b.enemyId === e.definitionId);
        if (existing) {
          existing.defeated = true;
          existing.timesDefeated += 1;
        } else {
          victoryBestiary.push({ enemyId: e.definitionId, encountered: true, defeated: true, timesDefeated: 1 });
        }
      }
      let finalParty = updatedPartyAfterDot;
      const levelUpMessages: string[] = [];
      for (const char of finalParty) {
        if (char.currentHp <= 0) continue;
        const result = addExp(char, totalExp);
        if (result.leveledUp) {
          finalParty = finalParty.map(p => p.id === char.id ? result.updated : p);
          levelUpMessages.push(`⬆️ ${char.name} è salito al livello ${result.updated.level}!`);
        }
      }
      const isBoss = updatedEnemiesForStatus.some(e => e.isBoss);
      try { playVictory(); } catch {}
      set({
        notification: {
          id: nextNotifId(),
          type: 'victory',
          message: isBoss ? 'EVASIONE COMPLETATA' : 'SOPRAVVVISSUTO',
          icon: isBoss ? '🚪' : '⚔️',
          subMessage: isBoss ? `Boss eliminato. +${totalExp} EXP` : `Nemici sconfitti. +${totalExp} EXP`,
          levelUps: levelUpMessages,
        },
        combat: { ...combat, log: finalLog, isVictory: true, isProcessing: true, turn: newTurn },
        party: finalParty,
        enemies: updatedEnemiesForStatus,
        messageLog: [
          ...get().messageLog,
          `[${get().turnCount}] ⚔️ ${isBoss ? 'Boss eliminato' : 'Nemici sconfitti'}. +${totalExp} EXP`,
          ...levelUpMessages,
        ],
        bestiary: victoryBestiary,
      });
      setTimeout(() => {
        if (isBoss) {
          try { get().autoSave(); } catch {}
          get().victory();
        } else {
          set({ phase: 'exploration', combat: null, enemies: [], notification: null });
          setTimeout(() => get().checkAchievements(), 100);
        }
      }, 3500);
      return;
    }

    // Check if ALL party members died from DOT → declare defeat
    if (alivePartyIds.size === 0 && updatedParty.length > 0) {
      finalLog.push({ turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'Sconfitta', message: '💀 Tutti i membri del gruppo sono caduti...' });
      set({
        phase: 'game-over',
        combat: { ...combat, log: finalLog, isDefeat: true, isProcessing: true },
        party: updatedParty,
        enemies: updatedEnemiesForStatus,
        messageLog: [...get().messageLog, `[${get().turnCount}] 💀 Game Over — Tutti i membri del gruppo sono caduti.`],
      });
      return;
    }

    // Skip nextActor if they died from DOT processing
    if (nextActor.type === 'player' && updatedParty.find(p => p.id === nextActor.id)?.currentHp <= 0) {
      alivePartyIds.delete(nextActor.id);
    }
    if (nextActor.type === 'enemy' && updatedEnemiesForStatus.find(e => e.id === nextActor.id)?.currentHp <= 0) {
      aliveEnemyIds.delete(nextActor.id);
    }

    // If next actor died from DOT, find next alive actor
    let effectiveNextActor = nextActor;
    let effectiveNextIdx = nextIdx;
    if (
      (nextActor.type === 'player' && !alivePartyIds.has(nextActor.id)) ||
      (nextActor.type === 'enemy' && !aliveEnemyIds.has(nextActor.id))
    ) {
      let searchIdx = nextIdx + 1;
      let wrapped = false;
      while (searchIdx !== nextIdx || !wrapped) {
        if (searchIdx >= allActors.length) {
          searchIdx = 0;
          wrapped = true;
          newTurn = newTurn + 1;
          // Turn boundary crossed — check cooldown expiries and clear taunt
          tauntTargetId = null;
          checkCooldownExpiries(newTurn);
        }
        const candidate = allActors[searchIdx];
        if (
          (candidate.type === 'player' && alivePartyIds.has(candidate.id)) ||
          (candidate.type === 'enemy' && aliveEnemyIds.has(candidate.id))
        ) {
          effectiveNextActor = candidate;
          effectiveNextIdx = searchIdx;
          break;
        }
        searchIdx++;
      }
      // No alive actors at all
      if ((effectiveNextActor.type === 'player' && !alivePartyIds.has(effectiveNextActor.id)) ||
          (effectiveNextActor.type === 'enemy' && !aliveEnemyIds.has(effectiveNextActor.id))) {
        return;
      }
    }

    // If effective next actor is enemy, execute AI
    if (effectiveNextActor.type === 'enemy') {
      const enemy = updatedEnemiesForStatus.find(e => e.id === effectiveNextActor.id);
      if (!enemy || enemy.currentHp <= 0) {
        setTimeout(() => get().advanceToNextActor(), getCombatDelay(300));
        return;
      }

      // Check if enemy is stunned — skip turn and decrement stun duration
      if (enemy.statusEffects.includes('stunned')) {
        const enemyStunDurations = updatedStatusDurations[enemy.id] || [];
        const stunEntry = enemyStunDurations.find(d => d.effect === 'stunned');

        let newEnemyStatusEffects = [...enemy.statusEffects];
        if (!stunEntry || stunEntry.turnsLeft <= 1) {
          newEnemyStatusEffects = newEnemyStatusEffects.filter(s => s !== 'stunned');
          if (updatedStatusDurations[enemy.id]) {
            updatedStatusDurations[enemy.id] = updatedStatusDurations[enemy.id].filter(d => d.effect !== 'stunned');
            if (updatedStatusDurations[enemy.id].length === 0) delete updatedStatusDurations[enemy.id];
          }
        } else {
          updatedStatusDurations[enemy.id] = enemyStunDurations.map(d =>
            d.effect === 'stunned' ? { ...d, turnsLeft: d.turnsLeft - 1 } : d
          );
        }

        const stunUpdatedEnemies = updatedEnemiesForStatus.map(e =>
          e.id === enemy.id ? { ...e, statusEffects: newEnemyStatusEffects } : e
        );
        const stunLog: CombatLogEntry = {
          turn: newTurn,
          actorName: enemy.name,
          actorType: 'enemy',
          action: 'Stordito',
          message: `💫 ${enemy.name} è stordito e salta il turno!`,
        };

        let stunNextIdx = effectiveNextIdx + 1;
        while (true) {
          if (stunNextIdx >= allActors.length) stunNextIdx = 0;
          const candidate = allActors[stunNextIdx];
          if (candidate.type === 'enemy' && !aliveEnemyIds.has(candidate.id)) { stunNextIdx++; continue; }
          if (candidate.type === 'player' && !alivePartyIds.has(candidate.id)) { stunNextIdx++; continue; }
          break;
        }
        const stunNextActor = allActors[stunNextIdx];
        let stunNextTurn = newTurn;
        if (stunNextIdx === 0) {
          stunNextTurn = newTurn + 1;
          // Turn boundary crossed — check cooldown expiries and clear taunt
          tauntTargetId = null;
          checkCooldownExpiries(stunNextTurn);
        }

        set({
          enemies: stunUpdatedEnemies,
          combat: {
            ...combat,
            turn: stunNextTurn,
            currentActorId: stunNextActor.id,
            currentActorType: stunNextActor.type,
            selectedAction: null,
            selectedTarget: null,
            selectedItemUid: null,
            isProcessing: false,
            log: [...finalLog, stunLog],
            statusDurations: updatedStatusDurations,
            specialCooldowns: updatedCooldowns,
            special2Cooldowns: updatedCooldowns2,
            tauntTargetId,
            activeEffects: currentActiveEffects,
          },
        });

        if (stunNextActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), getCombatDelay(900));
        }
        return;
      }

      const { log, updatedParty: afterEnemyAttack, appliedStatus, updatedEnemies: enemySelfEffects, activeEffects: enemyActiveEffects } = executeEnemyAttack(enemy, updatedParty, newTurn, tauntTargetId, updatedEnemiesForStatus, currentActiveEffects);

      if (enemySelfEffects) {
        updatedEnemiesForStatus = updatedEnemiesForStatus.map(e => {
          const updated = enemySelfEffects.find(ue => ue.id === e.id);
          return updated || e;
        });
      }

      if (enemyActiveEffects && enemyActiveEffects.length > 0) {
        currentActiveEffects = [...currentActiveEffects, ...enemyActiveEffects];
      }

      if (appliedStatus) {
        const existing = updatedStatusDurations[appliedStatus.targetId] || [];
        if (!existing.some(d => d.effect === appliedStatus.effect)) {
          updatedStatusDurations[appliedStatus.targetId] = [
            ...existing,
            { effect: appliedStatus.effect, turnsLeft: appliedStatus.duration },
          ];
        }
      }

      for (const p of afterEnemyAttack) {
        if (p.currentHp <= 0) alivePartyIds.delete(p.id);
      }

      if (afterEnemyAttack.every(p => p.currentHp <= 0)) {
        try { playDefeat(); } catch {}

        set({
          phase: 'game-over',
          party: afterEnemyAttack,
          enemies: updatedEnemiesForStatus,
          messageLog: [...get().messageLog, `[${get().turnCount}] 💀 Tutti i membri del gruppo sono caduti...`],
        });
        return;
      }

      let nextNextIdx = effectiveNextIdx + 1;
      while (true) {
        if (nextNextIdx >= allActors.length) nextNextIdx = 0;
        const candidate = allActors[nextNextIdx];
        if (candidate.type === 'enemy' && !aliveEnemyIds.has(candidate.id)) { nextNextIdx++; continue; }
        if (candidate.type === 'player' && !alivePartyIds.has(candidate.id)) { nextNextIdx++; continue; }
        break;
      }
      const nextNextActor = allActors[nextNextIdx];
      let nextNextTurn = newTurn;
      if (nextNextIdx === 0) {
        nextNextTurn = newTurn + 1;
        // Turn boundary crossed — check cooldown expiries and clear taunt
        tauntTargetId = null;
        checkCooldownExpiries(nextNextTurn);
      }

      set({
        party: afterEnemyAttack,
        enemies: updatedEnemiesForStatus,
        combat: {
          ...combat,
          turn: nextNextTurn,
          currentActorId: nextNextActor.id,
          currentActorType: nextNextActor.type,
          selectedAction: null,
          selectedTarget: null,
          selectedItemUid: null,
          isProcessing: false,
          log: [...finalLog, log],
          statusDurations: updatedStatusDurations,
          specialCooldowns: updatedCooldowns,
          special2Cooldowns: updatedCooldowns2,
          tauntTargetId,
          activeEffects: currentActiveEffects,
        },
      });

      if (nextNextActor.type === 'enemy') {
        setTimeout(() => get().advanceToNextActor(), getCombatDelay(900));
      }
      return;
    }

    // Use effectiveNextActor (handles case where original nextActor died from DOT)
    set({
      party: updatedParty,
      enemies: updatedEnemiesForStatus,
      combat: {
        ...combat,
        turn: newTurn,
        currentActorId: effectiveNextActor.id,
        currentActorType: effectiveNextActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        isProcessing: false,
        log: finalLog,
        statusDurations: updatedStatusDurations,
        specialCooldowns: updatedCooldowns,
        special2Cooldowns: updatedCooldowns2,
        tauntTargetId,
        activeEffects: currentActiveEffects,
      },
    });
  },

  startBossFight: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];

    // #45 Randomizer: use randomized boss assignment
    const effectiveLoc = getEffectiveLocation(state.currentLocationId, state.randomizedLocationData);
    const bossId = effectiveLoc?.bossEnemy || location.bossId;
    if (!bossId) return;

    const diff = getDifficultyConfig(state.difficulty, state.partySize);
    const boss = createEnemyInstance(bossId, diff.statMult);
    const allActors = [
      ...state.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
      { id: boss.id, spd: boss.spd, type: 'enemy' as const },
    ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);

    const firstActor = allActors[0];

    // Update bestiary - mark boss as encountered
    const currentBestiary = [...state.bestiary];
    const existingBossEntry = currentBestiary.find(b => b.enemyId === boss.definitionId);
    if (!existingBossEntry) {
      currentBestiary.push({ enemyId: boss.definitionId, encountered: true, defeated: false, timesDefeated: 0 });
    }

    set({
      phase: 'combat',
      enemies: [boss],
      autoCombat: getAutoCombatDefault(),
      bestiary: currentBestiary,
      combat: {
        turn: 1,
        playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
        enemyOrder: [boss.id],
        fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
        currentActorId: firstActor.id,
        currentActorType: firstActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        isProcessing: false,
        log: [
          { turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Boss Fight', message: `⭐ BOSS: ${boss.name} appare! ${ENEMIES[boss.definitionId]?.description || ''}` },
        ],
        isVictory: false,
        isDefeat: false,
        fled: false,
        statusDurations: {},
        specialCooldowns: {},
        special2Cooldowns: {},
        tauntTargetId: null,
        activeEffects: [],
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] ⭐ BOSS: ${boss.name} blocca la via!`],
    });

    // If boss goes first, trigger their action
    if (firstActor.type === 'enemy') {
      setTimeout(() => get().advanceToNextActor(), 1200);
    }
  },
});
