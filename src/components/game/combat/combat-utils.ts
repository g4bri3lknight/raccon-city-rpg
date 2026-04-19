/**
 * Pure utility functions for the combat screen.
 * No React dependencies — only data transformations and lookups.
 */

import type { CombatLogEntry, Character, ItemInstance } from '@/game/types';
import { audio, playEnemyAttack } from '@/game/engine/sounds';
import { ALL_SPECIAL_ABILITIES, ITEMS } from '@/game/data/loader';
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

/** Maps special ability category → sound category for data-driven lookup */
const SPECIAL_CATEGORY_SOUND: Record<string, 'heal' | 'defend' | 'special'> = {
  support: 'heal',
  defensive: 'defend',
  offensive: 'special',
  control: 'special',
};

/**
 * Data-driven sound lookup for combat log entries.
 * Uses item/special metadata (weaponType, type, category) instead of
 * hardcoded Italian name strings to determine the appropriate sound effect.
 * New weapons/specials automatically get sounds based on their category.
 */
export function getSoundForEntry(entry: CombatLogEntry): (() => void) | null {
  // 1. Entry-level flags (highest priority)
  if (entry.isMiss) return audio.playMiss;
  if (entry.isCritical && entry.damage && entry.damage > 0) return audio.playCritical;

  const action = entry.action;

  // 2. System-generated combat actions (not from game data)
  if (action === 'Difesa') return audio.playDefend;
  if (action === 'Avvelenamento') return audio.playPoisonTick;
  if (action === 'Sanguinamento') return audio.playBleedTick;
  if (action === 'Attacco' || action === 'Colpo corpo a corpo') {
    return entry.actorType === 'player' ? audio.playAttack : null;
  }

  // 3. Look up special ability by name → category-based sound
  const special = ALL_SPECIAL_ABILITIES.find(s => s.name === action);
  if (special) {
    const soundCat = SPECIAL_CATEGORY_SOUND[special.category];
    if (soundCat === 'heal') return audio.playHeal;
    if (soundCat === 'defend') {
      // Defensive specials with taunt effect get taunt sound (e.g. Immolazione)
      if (special.effects?.some(e => e.type === 'taunt')) return audio.playTaunt;
      return audio.playDefend;
    }
    if (soundCat === 'special') return audio.playSpecial;
  }

  // 4. Look up item by name → weaponType/type-based sound
  const itemDef = Object.values(ITEMS).find(i => i.name === action);
  if (itemDef) {
    if (itemDef.weaponType === 'ranged') return audio.playRangedAttack;
    if (itemDef.weaponType === 'melee') return audio.playAttack;
    if (itemDef.type === 'healing' || itemDef.type === 'antidote') return audio.playHeal;
  }

  // 5. Fallback: any damage from enemy
  if (entry.damage && entry.damage > 0 && entry.actorType === 'enemy') {
    return () => playEnemyAttack(entry.actorName, entry.action);
  }

  return null;
}

// ── Animation helpers ──

/** Derive animation info for a specific entity from the last few log entries */
export function getAnimForTarget(lastEntries: CombatLogEntry[], id: string, name: string): AnimResult | null {
  for (const entry of lastEntries) {
    // Use targetId for precise matching; fall back to name for defend/legacy
    if (entry.targetId && entry.targetId === id) {
      if (entry.isMiss) return { type: 'miss' as const, isMiss: true, isCritical: false };
      if (entry.damage && entry.damage > 0) return { type: 'damage' as const, value: entry.damage, isCritical: !!entry.isCritical, isMiss: false };
      if (entry.heal) return { type: 'heal' as const, value: entry.heal, isCritical: false, isMiss: false };
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
