/**
 * Pure utility functions for the combat screen.
 * No React dependencies — only data transformations and lookups.
 */

import type { CombatLogEntry, Character, ItemInstance } from '@/game/types';
import { audio } from '@/game/engine/sounds';
import { ALL_SPECIAL_ABILITIES, ITEMS, ENEMY_ABILITIES_DATA } from '@/game/data/loader';
import { getWeaponAmmoType } from '@/game/engine/combat';
import type { AnimResult } from './types';

// ── Settings ──

const SETTINGS_KEY = 'raccoon_city_settings';

export function getCombatSpeed(): 1 | 2 | 3 {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const speed = parsed.combatSpeed;
      if (speed === 1 || speed === 2 || speed === 3) return speed;
    }
  } catch {}
  return 1;
}

// ── Sound lookup ──

/**
 * Data-driven sound lookup for combat log entries.
 * Uses entity-specific sounds only — no hardcoded/seeded fallbacks.
 * If the admin has uploaded a sound for the entity, it plays; otherwise silence.
 */
export function getSoundForEntry(entry: CombatLogEntry): (() => void) | null {
  const action = entry.action;

  // Entity basic attack → player attacks — no hardcoded sound (silence unless entity-specific weapon sound is added)
  if (action === 'Attacco' || action === 'Colpo corpo a corpo') {
    return null;
  }

  // Look up special ability by name → entity-specific sound: sfx_special_{id}
  const special = ALL_SPECIAL_ABILITIES.find(s => s.name === action);
  if (special) {
    return () => audio.playEntitySpecial(special.id, special.category);
  }

  // Look up item by name — no hardcoded sound for items (admin can upload entity-specific sounds)
  const itemDef = Object.values(ITEMS).find(i => i.name === action);
  if (itemDef) {
    return null;
  }

  // Look up enemy ability by name → entity-specific sound: sfx_eability_{abilityId}
  const enemyAbility = Object.values(ENEMY_ABILITIES_DATA).find(a => a.name === action);
  if (enemyAbility) {
    return () => audio.playEntityEnemyAbility(enemyAbility.id);
  }

  return null;
}

// ── Animation helpers ──

/** Derive animation info for a specific entity from the last few log entries */
export function getAnimForTarget(lastEntries: CombatLogEntry[], id: string, name: string): AnimResult | null {
  for (const entry of lastEntries) {
    const isTarget = (entry.targetId && entry.targetId === id) || (entry.targetIds && entry.targetIds.includes(id));
    if (isTarget) {
      if (entry.isMiss) return { type: 'miss' as const, isMiss: true, isCritical: false };
      if (entry.damage && entry.damage > 0) return { type: 'damage' as const, value: entry.damage, isCritical: !!entry.isCritical, isMiss: false };
      if (entry.heal) {
        const perTargetHeal = entry.healPerTarget?.[id];
        return { type: 'heal' as const, value: perTargetHeal ?? entry.heal, isCritical: false, isMiss: false };
      }
    }
    if (entry.action === 'Difesa' && entry.actorName === name) return { type: 'defend' as const, isCritical: false, isMiss: false };
  }
  return null;
}

// ── Ammo count ──

/** Count ammo for a character's ranged weapon, or null if not ranged */
export function getWeaponAmmoCount(character: Character | undefined): number | null {
  if (!character?.weapon || character.weapon.type !== 'ranged') return null;
  const requiredAmmoId = getWeaponAmmoType(character.weapon.itemId);
  if (!requiredAmmoId) return null;
  const ammoItems = character.inventory.filter(i => i.itemId === requiredAmmoId);
  const total = ammoItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  return total;
}

// ── Usable items filter ──

/** Filter a character's inventory to items usable in combat */
export function getUsableItems(character: Character | undefined): ItemInstance[] {
  return character?.inventory.filter(i =>
    i.usable &&
    i.type !== 'ammo' &&
    i.type !== 'weapon_mod' &&
    i.type !== 'weapon' &&
    i.type !== 'bag' &&
    i.type !== 'collectible' &&
    i.type !== 'key' &&
    i.effects &&
    i.effects.length > 0
  ) || [];
}
