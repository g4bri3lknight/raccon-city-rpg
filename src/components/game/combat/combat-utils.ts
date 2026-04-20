/**
 * Pure utility functions for the combat screen.
 * No React dependencies — only data transformations and lookups.
 */

import type { CombatLogEntry, Character, ItemInstance } from '@/game/types';
import { audio, playEnemyAttack } from '@/game/engine/sounds';
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
 * Uses item/special metadata (weaponType, type, category) instead of
 * hardcoded Italian name strings to determine the appropriate sound effect.
 * New weapons/specials automatically get sounds based on their category.
 *
 * Entity-specific sounds: if a custom sound has been uploaded via the admin
 * panel for a special ability (sfx_special_{id}) or enemy ability, it will
 * be used instead of the generic category-based sound.
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

  // 3. Look up special ability by name → entity-specific sound (DB only)
  const special = ALL_SPECIAL_ABILITIES.find(s => s.name === action);
  if (special) {
    // Use entity-specific sound: sfx_special_{id} from DB — no fallback
    return () => audio.playEntitySpecial(special.id, special.category);
  }

  // 4. Look up item by name → weaponType/type-based sound
  const itemDef = Object.values(ITEMS).find(i => i.name === action);
  if (itemDef) {
    if (itemDef.weaponType === 'ranged') return audio.playRangedAttack;
    if (itemDef.weaponType === 'melee') return audio.playAttack;
    if (itemDef.type === 'healing' || itemDef.type === 'antidote') return audio.playHeal;
  }

  // 5. Look up enemy ability by name → entity-specific sound (DB only)
  const enemyAbility = Object.values(ENEMY_ABILITIES_DATA).find(a => a.name === action);
  if (enemyAbility) {
    return () => audio.playEntityEnemyAbility(enemyAbility.id);
  }

  // 6. Any remaining enemy damage action → try entity-specific attack sound from DB
  if (entry.damage && entry.damage > 0 && entry.actorType === 'enemy') {
    return () => playEnemyAttack(entry.actorName, entry.action);
  }

  return null;
}

// ── Animation helpers ──

/** Derive animation info for a specific entity from the last few log entries */
export function getAnimForTarget(lastEntries: CombatLogEntry[], id: string, name: string): AnimResult | null {
  for (const entry of lastEntries) {
    // Check if this entity is a target: match single targetId OR multi-target targetIds array
    const isTarget = (entry.targetId && entry.targetId === id) || (entry.targetIds && entry.targetIds.includes(id));
    if (isTarget) {
      if (entry.isMiss) return { type: 'miss' as const, isMiss: true, isCritical: false };
      if (entry.damage && entry.damage > 0) return { type: 'damage' as const, value: entry.damage, isCritical: !!entry.isCritical, isMiss: false };
      if (entry.heal) {
        // For multi-target heals, show per-target heal value if available
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
