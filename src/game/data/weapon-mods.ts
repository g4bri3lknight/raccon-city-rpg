// ==========================================
// #3 — WEAPON MOD DATA (DB-driven)
// ==========================================
// Reads from ITEMS (loaded by loader.ts from DB) at runtime.
// Call rebuildWeaponModsFromItems() after ITEMS are populated.

import { ITEMS } from './loader';
import type { WeaponMod } from '../types';

export let WEAPON_MODS: Record<string, WeaponMod> = {};
export let ALL_MOD_IDS: string[] = [];

/** Rebuild WEAPON_MODS from ITEMS (call after loader has populated ITEMS) */
export function rebuildWeaponModsFromItems(): void {
  const mods: Record<string, WeaponMod> = {};
  const ids: string[] = [];
  for (const item of Object.values(ITEMS)) {
    if (item.type === 'weapon_mod') {
      mods[item.id] = {
        modId: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        rarity: item.rarity as WeaponMod['rarity'],
        type: (item.modType as WeaponMod['type']) || 'any',
        effects: item.effects || [],
      };
      ids.push(item.id);
    }
  }
  WEAPON_MODS = mods;
  ALL_MOD_IDS = ids;
}
