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
  LOCATIONS,
  getSpecialById as getSpecialByIdFromLoader,
  getCombatDelay,
  COMBAT_CONFIG,
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
  onTakeHit,
  onTurnStart,
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
import { audio } from '../../engine/sounds';

/** Clean all combat-only status effects from party members (poison, bleeding, stunned, adrenaline).
 *  Called when combat ends to prevent stale statuses from leaking into exploration
 *  or causing bugs in the next combat (e.g. stunned skipping first turn permanently). */
function cleanCombatStatusEffects(party: Character[]): Character[] {
  return party.map(p => ({
    ...p,
    statusEffects: [] as StatusEffect[],
    isDefending: false,
  }));
}

/** Calculate combo bonus percentage based on combo count.
 *  Linear interpolation between thresholds:
 *    combo 2 → +10%, combo 3 → +20%, combo 5 → +35%, combo 8+ → +50%
 */
function getComboBonus(comboCount: number): number {
  if (comboCount < 2) return 0;
  if (comboCount >= 8) return 50;
  const thresholds = [
    { combo: 2, bonus: 10 },
    { combo: 3, bonus: 20 },
    { combo: 5, bonus: 35 },
    { combo: 8, bonus: 50 },
  ];
  for (let i = 0; i < thresholds.length - 1; i++) {
    const lower = thresholds[i];
    const upper = thresholds[i + 1];
    if (comboCount >= lower.combo && comboCount <= upper.combo) {
      const t = (comboCount - lower.combo) / (upper.combo - lower.combo);
      return Math.round(lower.bonus + t * (upper.bonus - lower.bonus));
    }
  }
  return 0;
}

/** Merge new active effects with existing ones, refreshing duration instead of stacking same type+stat+target */
function mergeActiveEffects(existing: ActiveCombatEffect[], incoming: ActiveCombatEffect[]): ActiveCombatEffect[] {
  const result = [...existing];
  for (const newEffect of incoming) {
    // Check for same type + stat + targetId (for buff_stat/debuff_stat)
    if (newEffect.type === 'buff_stat' || newEffect.type === 'debuff_stat') {
      const existingIdx = result.findIndex(e =>
        e.type === newEffect.type &&
        e.stat === newEffect.stat &&
        e.targetId === newEffect.targetId
      );
      if (existingIdx >= 0) {
        // Refresh duration instead of stacking
        result[existingIdx] = { ...result[existingIdx], remainingTurns: newEffect.remainingTurns, amount: newEffect.amount };
        continue;
      }
    }
    // For shield: if same targetId already has a shield, refresh it
    if (newEffect.type === 'shield') {
      const existingIdx = result.findIndex(e =>
        e.type === 'shield' && e.targetId === newEffect.targetId
      );
      if (existingIdx >= 0) {
        // Refresh shield (use the higher value)
        result[existingIdx] = {
          ...result[existingIdx],
          remainingTurns: Math.max(result[existingIdx].remainingTurns, newEffect.remainingTurns),
          shieldHp: Math.max(result[existingIdx].shieldHp || 0, newEffect.shieldHp || 0),
          amount: Math.max(result[existingIdx].amount || 0, newEffect.amount || 0),
        };
        continue;
      }
    }
    // FIX: For taunt: if there's already a taunt effect, replace it (only one taunt active at a time)
    if (newEffect.type === 'taunt') {
      const existingIdx = result.findIndex(e => e.type === 'taunt');
      if (existingIdx >= 0) {
        result[existingIdx] = newEffect;
        continue;
      }
    }
    result.push(newEffect);
  }
  return result;
}

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
        comboCount: 0,
        comboTargetId: null,
        lastOffensiveAction: null,
      });
      return;
    }

    if (action === 'flee') {
      const canFlee = calculateFleeChance(state.party, state.enemies);
      const hasNemesis = state.enemies.some(e => e.definitionId === 'nemesis_boss');

      if (hasNemesis) {
        // Fleeing from Nemesis triggers a QTE — success = escape, failure = combat continues
        get().startQTE('nemesis');
        return;
      }

      if (canFlee) {
        const fleeBehavior: string = (COMBAT_CONFIG as any).fleeBehavior || 'return';
        const roomHistory = state.roomHistory || [];

        if (fleeBehavior === 'return' && roomHistory.length > 0) {
          // Return to previous room
          const previousRoomId = roomHistory[roomHistory.length - 1];
          const location = LOCATIONS[state.currentLocationId];
          const previousRoom = location?.rooms?.find(r => r.id === previousRoomId);

          set({
            phase: 'exploration',
            combat: null,
            enemies: [],
            party: cleanCombatStatusEffects(state.party),
            currentRoomId: previousRoomId,
            roomHistory: roomHistory.slice(0, -1), // pop the previous room from history
            combatRoomId: null,
            messageLog: [
              ...state.messageLog,
              `[${state.turnCount}] 🏃 Fuga riuscita! Ti sei ritirato${previousRoom ? ` in ${previousRoom.icon || '🚪'} ${previousRoom.name}` : ''}.`,
            ],
          });
        } else if (fleeBehavior === 'retry') {
          // Enemies remain — room stays uncleared, combat just ends
          // Player stays in current room but combat ends. If they re-enter combat, enemies respawn.
          set({
            phase: 'exploration',
            combat: null,
            enemies: [],
            party: cleanCombatStatusEffects(state.party),
            // Don't clear combatRoomId — room stays uncleared, enemies will respawn on next entry
            messageLog: [
              ...state.messageLog,
              `[${state.turnCount}] 🏃 Fuga riuscita! Ma i nemici sono ancora ${roomHistory.length > 0 ? 'nella stanza' : 'nelle vicinanze'}...`,
            ],
          });
        } else {
          // 'stay' — default behavior, room becomes temporarily safe until re-entry
          set({
            phase: 'exploration',
            combat: null,
            enemies: [],
            party: cleanCombatStatusEffects(state.party),
            messageLog: [
              ...state.messageLog,
              `[${state.turnCount}] 🏃 Fuga riuscita! Ti sei allontanato momentaneamente.`,
            ],
          });
        }
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
          comboCount: 0,
          comboTargetId: null,
          lastOffensiveAction: null,
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
          updatedCombatActiveEffects = mergeActiveEffects(updatedCombatActiveEffects, result.activeEffects);
        }
        // Track status durations on enemies from weapon on_hit effects (poison, bleed, stun)
        // FIX: Look for the duration from the weapon's on_hit apply_status effect instead of hardcoding 3
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              let duration = 3; // default
              if (character.weapon?.effects) {
                const matchingEffect = character.weapon.effects.find(
                  eff => eff.type === 'apply_status' && (eff as any).statusType === effect
                );
                if (matchingEffect && (matchingEffect as any).duration) {
                  duration = (matchingEffect as any).duration;
                }
              }
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: duration },
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
        // FIX: Look for the duration from the special's apply_status effect instead of hardcoding 3
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              let duration = 3; // default
              if (specialDef?.effects) {
                const matchingEffect = specialDef.effects.find(
                  eff => eff.type === 'apply_status' && (eff as any).statusType === effect
                );
                if (matchingEffect && (matchingEffect as any).duration) {
                  duration = (matchingEffect as any).duration;
                }
              }
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: duration },
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
          updatedCombatActiveEffects = mergeActiveEffects(updatedCombatActiveEffects, result.activeEffects);
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
        // FIX: Look for the duration from the special2's apply_status effect instead of hardcoding 3
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              let duration = 3; // default
              if (specialDef2?.effects) {
                const matchingEffect = specialDef2.effects.find(
                  eff => eff.type === 'apply_status' && (eff as any).statusType === effect
                );
                if (matchingEffect && (matchingEffect as any).duration) {
                  duration = (matchingEffect as any).duration;
                }
              }
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: duration },
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
          updatedCombatActiveEffects = mergeActiveEffects(updatedCombatActiveEffects, result.activeEffects);
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
          const found = updatedEnemies.find(e => e.id === state.combat!.selectedTarget && e.currentHp > 0);
          if (!found) {
            // Selected enemy is dead or not found — skip this action
            get().advanceToNextActor({ ...state.combat!, log: newLog, party: updatedParty, enemies: updatedEnemies });
            return;
          }
          itemTarget = found;
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
          // FIX: Look for the duration from the item's apply_status effect instead of hardcoding 3
          for (const e of updatedEnemies) {
            const prevEnemy = state.enemies.find(pe => pe.id === e.id);
            if (!prevEnemy) continue;
            const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
            for (const effect of newEffects) {
              if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
                let duration = 3; // default
                if (effectiveItem.effects) {
                  const matchingEffect = effectiveItem.effects.find(
                    eff => eff.type === 'apply_status' && (eff as any).statusType === effect
                  );
                  if (matchingEffect && (matchingEffect as any).duration) {
                    duration = (matchingEffect as any).duration;
                  }
                }
                const existing = updatedCombatStatusDurations[e.id] || [];
                updatedCombatStatusDurations[e.id] = [
                  ...existing,
                  { effect: effect as StatusEffect, turnsLeft: duration },
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
          updatedCombatActiveEffects = mergeActiveEffects(updatedCombatActiveEffects, result.activeEffects);
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
        // Track run stats: items used in combat
        if (result.consumeItem) {
          try { get().incrementRunStat('itemsUsed'); } catch {}
        }
        break;
      }
    }

    // ── COMBO CHAIN SYSTEM ──
    // Track consecutive offensive actions against the same enemy for bonus damage
    const selectedAction = state.combat.selectedAction;
    const isOffensive = selectedAction === 'attack' || selectedAction === 'special' || selectedAction === 'special2';
    let comboCount = state.combat.comboCount || 0;
    let comboTargetId = state.combat.comboTargetId || null;
    let lastOffensiveAction = state.combat.lastOffensiveAction || null;

    if (isOffensive) {
      const actionTargetId = state.combat.selectedTarget;
      // If targeting a different enemy than the combo target, reset combo
      if (comboTargetId !== null && actionTargetId !== comboTargetId) {
        comboCount = 0;
      }

      // Check if the action successfully dealt damage (not a miss)
      const lastLog = newLog[newLog.length - 1];
      const didHit = lastLog && lastLog.damage !== undefined && lastLog.damage > 0 && !lastLog.isMiss;

      if (didHit && actionTargetId) {
        comboCount += 1;
        comboTargetId = actionTargetId;
        lastOffensiveAction = selectedAction;

        if (comboCount >= 2) {
          const bonusPercent = getComboBonus(comboCount);
          const baseDamage = lastLog.damage!;
          const bonusDamage = Math.max(1, Math.floor(baseDamage * (bonusPercent / 100)));

          // Apply bonus damage directly to the combo target
          updatedEnemies = updatedEnemies.map(e => {
            if (e.id === comboTargetId) {
              return { ...e, currentHp: Math.max(0, e.currentHp - bonusDamage) };
            }
            return e;
          });

          newLog.push({
            turn: state.combat.turn,
            actorName: 'Sistema',
            actorType: 'player',
            action: 'Combo',
            message: `🔥 Combo x${comboCount}! (+${bonusPercent}% danno, +${bonusDamage})`,
            damage: bonusDamage,
          });
        }

        // If the combo target died from bonus damage, reset combo
        if (comboTargetId && updatedEnemies.find(e => e.id === comboTargetId)?.currentHp <= 0) {
          comboCount = 0;
          comboTargetId = null;
          lastOffensiveAction = null;
        }
      }
    } else {
      // Non-offensive action (use_item, etc.) — reset combo
      comboCount = 0;
      comboTargetId = null;
      lastOffensiveAction = null;
    }

    // ── BOSS PHASE TRANSITION CHECK ──
    const targetIndex: number[] = [];
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i];
      if (!enemy.isBoss || enemy.currentHp <= 0) continue;
      const phases = BOSS_PHASES[enemy.definitionId];
      if (!phases || enemy.currentPhase >= phases.length) continue;

      const phaseDef = phases[enemy.currentPhase];
      if (enemy.maxHp <= 0) continue;
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
          actorDefinitionId: enemy.definitionId,
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
            levelUpMessages.push(`⬆️ ${result.updated.name} sale al livello ${result.updated.level}!`);
          }
        }
      }

      // Check victory condition for bonus EXP
      const vc = state.combat?.victoryCondition;
      let bonusExp = 0;
      if (vc) {
        let vcMet = false;
        if (vc.type === 'survive_turns' && vc.turnsRequired && state.combat.turn >= vc.turnsRequired) {
          vcMet = true;
        } else if (vc.type === 'destroy_weak_point') {
          vcMet = !vc.turnsRequired || state.combat.turn <= vc.turnsRequired;
        } else if (vc.type === 'kill_target' && vc.targetEnemyId) {
          vcMet = updatedEnemies.some(e => e.id === vc.targetEnemyId && e.currentHp <= 0);
        }
        if (vcMet) {
          bonusExp = vc.rewardExpBonus;
          for (const char of updatedParty) {
            if (char.currentHp > 0) {
              const result = addExp(char, bonusExp);
              updatedParty = updatedParty.map(p => p.id === result.updated.id ? result.updated : p);
              if (result.leveledUp) {
                levelUpMessages.push(`⬆️ ${result.updated.name} sale al livello ${result.updated.level}!`);
              }
            }
          }
          newLog.push({
            turn: state.combat.turn,
            actorName: 'Sistema',
            actorType: 'player',
            action: 'Sfida',
            message: `🏆 ${vc.rewardLabel} +${bonusExp} EXP bonus!`,
          });
        }
      }

      const lootNames = combatLoot.map(id => ITEMS[id]?.name).filter(Boolean);
      let victoryMsg = `⚔️ Sei sopravvissuto allo scontro. +${totalExp}${bonusExp > 0 ? `+${bonusExp}` : ''} EXP.`;
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

      // ── Track combat victory stats (damage, kills, combo, etc.) ──
      const defeatedEnemyList = updatedEnemies.filter(e => e.currentHp <= 0).map(e => ({
        definitionId: e.definitionId,
        isBoss: e.isBoss,
        currentHp: e.currentHp,
      }));
      const partyTookDamage = newLog.some(entry => entry.damage !== undefined && entry.damage > 0 && entry.actorType === 'enemy');
      try {
        get()._trackCombatVictoryStats(
          newLog,
          defeatedEnemyList,
          state.combat?.comboCount || 0,
          partyTookDamage,
        );
      } catch {}

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

      // ── Room cleared logic ──
      let updatedClearedRooms = [...state.clearedRooms];
      let roomClearMsgs: string[] = [];
      if (state.combatRoomId && !updatedClearedRooms.includes(state.combatRoomId)) {
        updatedClearedRooms = [...updatedClearedRooms, state.combatRoomId];
        roomClearMsgs.push(`[${state.turnCount}] ✅ Stanza pulita! Nessun nemico rimarrà qui.`);
      }

      if (updatedEnemies.some(e => e.isBoss)) {
        set({
          notification: {
            id: nextNotifId(),
            type: 'victory',
            message: 'EVASIONE COMPLETATA',
            icon: '🚪',
            subMessage: `Boss eliminato. +${totalExp}${bonusExp > 0 ? `+${bonusExp}` : ''} EXP`,
            lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
            levelUps: levelUpMessages,
          },
          combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
          party: cleanCombatStatusEffects(updatedParty),
          enemies: updatedEnemies,
          messageLog: [
            ...state.messageLog,
            `[${state.turnCount}] ⚔️ Boss eliminato. Sei sopravvissuto. +${totalExp}${bonusExp > 0 ? `+${bonusExp}` : ''} EXP`,
            ...roomClearMsgs,
            ...levelUpMessages,
            ...questLogMsgs,
          ],
          bestiary: victoryBestiary,
          npcQuestProgress: updatedNpcQuestProgress,
          nemesisPursuitLevel: newNemesisPursuitLevel,
          clearedRooms: updatedClearedRooms,
          combatRoomId: null,
        });
        setTimeout(() => {
          // Auto-save after boss victory before transitioning
          try { get().autoSave(); } catch {}
          get().victory();
        }, (COMBAT_CONFIG.summaryDisplayTime || 3.5) * 1000);
        return;
      }

      set({
        notification: {
          id: nextNotifId(),
          type: 'victory',
          message: 'SOPRAVVVISSUTO',
          icon: '⚔️',
          subMessage: `Sei sopravvissuto allo scontro. +${totalExp}${bonusExp > 0 ? `+${bonusExp}` : ''} EXP`,
          lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
          levelUps: levelUpMessages,
        },
        combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
        party: cleanCombatStatusEffects(updatedParty),
        enemies: updatedEnemies,
        messageLog: [
          ...state.messageLog,
          `[${state.turnCount}] ⚔️ Sei sopravvissuto allo scontro. +${totalExp}${bonusExp > 0 ? `+${bonusExp}` : ''} EXP`,
          ...roomClearMsgs,
          ...levelUpMessages,
          ...questLogMsgs,
        ],
        bestiary: victoryBestiary,
        npcQuestProgress: updatedNpcQuestProgress,
        nemesisPursuitLevel: newNemesisPursuitLevel,
        clearedRooms: updatedClearedRooms,
        combatRoomId: null,
      });
      setTimeout(() => {
        set({ phase: 'exploration', combat: null, enemies: [], notification: null });
        setTimeout(() => {
          get().checkAchievements();
          get().checkPerfectCombat();
          get().checkAutoCombatVictory();
        }, 100);
      }, (COMBAT_CONFIG.summaryDisplayTime || 3.5) * 1000);
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
      comboCount,
      comboTargetId,
      lastOffensiveAction,
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

      // 5b. Use healing items on wounded allies (self or other party members)
      // FIX: Auto-combat now uses healing items on the most wounded ally
      const woundedAlly = aliveParty
        .filter(p => p.currentHp > 0 && p.currentHp < p.maxHp * 0.5)
        .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      if (woundedAlly) {
        // Find best healing item for this ally
        const healingItems = myUsableItems.filter(i => getItemHealInfo(i));
        if (healingItems.length > 0) {
          // Prefer full heal items if ally is very low HP
          let bestItem;
          if (woundedAlly.currentHp < woundedAlly.maxHp * 0.25) {
            bestItem = healingItems.find(i => getItemHealInfo(i)?.isFullHeal) || healingItems[0];
          } else {
            // Use the smallest heal that will help (don't waste full heals)
            bestItem = healingItems.find(i => !getItemHealInfo(i)?.isFullHeal) || healingItems[0];
          }
          if (bestItem) {
            get().selectCombatAction('use_item');
            get().selectCombatItem(bestItem.uid);
            get().selectCombatTarget(woundedAlly.id);
            setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
            return;
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // FALLBACK: Attack weakest enemy — safety net for ALL archetypes
    // This prevents auto-combat from freezing when:
    //   - survivor archetype has no dedicated AI block
    //   - tank/healer/control conditions don't match
    //   - no usable items in inventory
    // ═══════════════════════════════════════════════════════
    const fallbackEnemies = get().enemies.filter(e => e.currentHp > 0);
    if (fallbackEnemies.length > 0) {
      const weakest = fallbackEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
      get().selectCombatAction('attack');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), getCombatDelay(600));
      return;
    }

    // Absolute safety: if we get here with no enemies, force advance
    setTimeout(() => get().advanceToNextActor(), getCombatDelay(300));
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
    // FIX: Taunt duration is now tracked via ActiveCombatEffect.
    // Only clear tauntTargetId if there are no active taunt effects remaining.
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
      // FIX: Don't blindly clear taunt — it's now tracked via ActiveCombatEffect.
      // TauntTargetId will be updated after processActiveEffectsTick removes expired effects.
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

      // FIX: Update tauntTargetId based on remaining active taunt effects.
      // If all taunt effects have expired, clear the taunt target.
      const activeTauntEffects = currentActiveEffects.filter(e => e.type === 'taunt' && e.remainingTurns > 0);
      if (activeTauntEffects.length > 0) {
        tauntTargetId = activeTauntEffects[0].targetId;
      } else {
        tauntTargetId = null;
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
              actorDefinitionId: enemy.definitionId,
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
              actorDefinitionId: enemy.definitionId,
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
              actorDefinitionId: enemy.definitionId,
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
      // Clean ALL combat-only status effects from party (not just poison/bleeding)
      const updatedPartyAfterDot = cleanCombatStatusEffects(updatedParty);
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
      // Check victory condition for bonus EXP (auto-combat DOT victory)
      const dotVc = combat?.victoryCondition;
      let dotBonusExp = 0;
      if (dotVc) {
        let vcMet = false;
        if (dotVc.type === 'survive_turns' && dotVc.turnsRequired && newTurn >= dotVc.turnsRequired) {
          vcMet = true;
        } else if (dotVc.type === 'destroy_weak_point') {
          vcMet = !dotVc.turnsRequired || newTurn <= dotVc.turnsRequired;
        } else if (dotVc.type === 'kill_target' && dotVc.targetEnemyId) {
          vcMet = updatedEnemiesForStatus.some(e => e.id === dotVc.targetEnemyId && e.currentHp <= 0);
        }
        if (vcMet) {
          dotBonusExp = dotVc.rewardExpBonus;
          for (const char of finalParty) {
            if (char.currentHp <= 0) continue;
            const result = addExp(char, dotBonusExp);
            finalParty = finalParty.map(p => p.id === result.updated.id ? result.updated : p);
            if (result.leveledUp) {
              levelUpMessages.push(`⬆️ ${char.name} è salito al livello ${result.updated.level}!`);
            }
          }
          finalLog.push({ turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'Sfida', message: `🏆 ${dotVc.rewardLabel} +${dotBonusExp} EXP bonus!` });
        }
      }
      const isBoss = updatedEnemiesForStatus.some(e => e.isBoss);

      // ── Room cleared logic ──
      let autoClearedRooms = [...get().clearedRooms];
      let autoRoomClearMsgs: string[] = [];
      const autoCombatRoomId = get().combatRoomId;
      if (autoCombatRoomId && !autoClearedRooms.includes(autoCombatRoomId)) {
        autoClearedRooms = [...autoClearedRooms, autoCombatRoomId];
        autoRoomClearMsgs.push(`[${get().turnCount}] ✅ Stanza pulita! Nessun nemico rimarrà qui.`);
      }

      set({
        notification: {
          id: nextNotifId(),
          type: 'victory',
          message: isBoss ? 'EVASIONE COMPLETATA' : 'SOPRAVVVISSUTO',
          icon: isBoss ? '🚪' : '⚔️',
          subMessage: isBoss ? `Boss eliminato. +${totalExp}${dotBonusExp > 0 ? `+${dotBonusExp}` : ''} EXP` : `Nemici sconfitti. +${totalExp}${dotBonusExp > 0 ? `+${dotBonusExp}` : ''} EXP`,
          levelUps: levelUpMessages,
        },
        combat: { ...combat, log: finalLog, isVictory: true, isProcessing: true, turn: newTurn },
        party: finalParty,
        enemies: updatedEnemiesForStatus,
        messageLog: [
          ...get().messageLog,
          `[${get().turnCount}] ⚔️ ${isBoss ? 'Boss eliminato' : 'Nemici sconfitti'}. +${totalExp}${dotBonusExp > 0 ? `+${dotBonusExp}` : ''} EXP`,
          ...autoRoomClearMsgs,
          ...levelUpMessages,
        ],
        bestiary: victoryBestiary,
        clearedRooms: autoClearedRooms,
        combatRoomId: null,
      });
      setTimeout(() => {
        if (isBoss) {
          try { get().autoSave(); } catch {}
          get().victory();
        } else {
          set({ phase: 'exploration', combat: null, enemies: [], notification: null });
          setTimeout(() => get().checkAchievements(), 100);
        }
      }, (COMBAT_CONFIG.summaryDisplayTime || 3.5) * 1000);
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
          // Turn boundary crossed — check cooldown expiries
          // FIX: Don't blindly clear taunt — check if taunt effects are still active
          const wrapTauntEffects = currentActiveEffects.filter(e => e.type === 'taunt' && e.remainingTurns > 1);
          tauntTargetId = wrapTauntEffects.length > 0 ? wrapTauntEffects[0].targetId : null;
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
          actorDefinitionId: enemy.definitionId,
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
          // Turn boundary crossed — check cooldown expiries
          // FIX: Don't blindly clear taunt — check if taunt effects are still active
          const stunTauntEffects = currentActiveEffects.filter(e => e.type === 'taunt' && e.remainingTurns > 1);
          tauntTargetId = stunTauntEffects.length > 0 ? stunTauntEffects[0].targetId : null;
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

      const { log, updatedParty: _afterEnemyAttack, appliedStatus, updatedEnemies: enemySelfEffects, activeEffects: enemyActiveEffects } = executeEnemyAttack(enemy, updatedParty, newTurn, tauntTargetId, updatedEnemiesForStatus, currentActiveEffects);
      let afterEnemyAttack = _afterEnemyAttack;

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

      // FIX: Process on_take_hit effects for characters that took damage
      let afterOnTakeHit = afterEnemyAttack;
      for (const p of afterEnemyAttack) {
        const prevP = updatedParty.find(pp => pp.id === p.id);
        if (prevP && p.currentHp < prevP.currentHp && p.currentHp > 0) {
          // Character took damage and is still alive — trigger on_take_hit
          const takeHitResult = onTakeHit(p, enemy, prevP.currentHp - p.currentHp, newTurn, afterOnTakeHit, updatedEnemiesForStatus);
          if (takeHitResult.activeEffects && takeHitResult.activeEffects.length > 0) {
            currentActiveEffects = [...currentActiveEffects, ...takeHitResult.activeEffects];
          }
          if (takeHitResult.shieldLog) {
            finalLog.push(takeHitResult.shieldLog);
          }
        }
      }
      // Replace afterEnemyAttack with the onTakeHit-processed version
      afterEnemyAttack = afterOnTakeHit;

      for (const p of afterEnemyAttack) {
        if (p.currentHp <= 0) alivePartyIds.delete(p.id);
      }

      if (afterEnemyAttack.every(p => p.currentHp <= 0)) {
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
        // Turn boundary crossed — check cooldown expiries
        // FIX: Don't blindly clear taunt — check if taunt effects are still active
        const enemyTauntEffects = currentActiveEffects.filter(e => e.type === 'taunt' && e.remainingTurns > 1);
        tauntTargetId = enemyTauntEffects.length > 0 ? enemyTauntEffects[0].targetId : null;
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

    // FIX: Process on_turn_start effects for the current player character
    if (effectiveNextActor.type === 'player') {
      const char = updatedParty.find(p => p.id === effectiveNextActor.id);
      if (char && char.currentHp > 0) {
        const turnStartResult = onTurnStart(char, newTurn, updatedParty, updatedEnemiesForStatus);
        if (turnStartResult.log && turnStartResult.log.length > 0) {
          finalLog = [...finalLog, ...turnStartResult.log];
        }
        if (turnStartResult.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === turnStartResult.updatedCharacter!.id ? turnStartResult.updatedCharacter! : p);
        }
        if (turnStartResult.activeEffects && turnStartResult.activeEffects.length > 0) {
          currentActiveEffects = [...currentActiveEffects, ...turnStartResult.activeEffects];
        }
      }
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
        comboCount: 0,
        comboTargetId: null,
        lastOffensiveAction: null,
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] ⭐ BOSS: ${boss.name} blocca la via!`],
    });

    // If boss goes first, trigger their action
    if (firstActor.type === 'enemy') {
      setTimeout(() => get().advanceToNextActor(), 1200);
    }
  },
});
