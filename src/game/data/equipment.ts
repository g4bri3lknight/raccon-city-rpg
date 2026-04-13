// ==========================================
// #29 — EQUIPMENT DATA (Armor & Accessories) — DB-driven
// #3  — WEAPON MOD DATA helpers — DB-driven
// ==========================================
// Reads from ITEMS (loaded by loader.ts from DB) at runtime.
// Call rebuildEquipmentFromItems() after ITEMS are populated.

import { ITEMS } from './loader';
import type { EquipmentInstance, WeaponMod, ItemDefinition } from '../types';
import { WEAPON_MODS } from './weapon-mods';

export let EQUIPMENT_STATS: Record<string, EquipmentInstance> = {};
export let ALL_EQUIPMENT_IDS: string[] = [];
export let ALL_MOD_ITEM_IDS: string[] = [];

/** Rebuild all equipment/mod data from ITEMS (call after loader has populated ITEMS) */
export function rebuildEquipmentFromItems(): void {
  const eqStats: Record<string, EquipmentInstance> = {};
  const eqIds: string[] = [];
  const modIds: string[] = [];

  for (const item of Object.values(ITEMS)) {
    if (item.type === 'armor' || item.type === 'accessory') {
      const slot = item.type === 'armor' ? 'armor' as const : 'accessory' as const;
      eqStats[item.id] = {
        itemId: item.id,
        name: item.name,
        slot,
        icon: item.icon,
        rarity: item.rarity as EquipmentInstance['rarity'],
        description: item.description,
        effects: item.effects || [],
      };
      eqIds.push(item.id);
    } else if (item.type === 'weapon_mod') {
      modIds.push(item.id);
    }
  }

  EQUIPMENT_STATS = eqStats;
  ALL_EQUIPMENT_IDS = eqIds;
  ALL_MOD_ITEM_IDS = [...modIds, ...Object.keys(WEAPON_MODS)];
}

// Helper: create a mod item instance for loot
export function createModItemInstance(modId: string): ItemDefinition & { uid: string; quantity: number; modStats?: WeaponMod } {
  const mod = WEAPON_MODS[modId];
  if (!mod) throw new Error(`Mod ${modId} not found`);
  const itemDef = ITEMS[modId];
  if (!itemDef) throw new Error(`Mod item ${modId} not found in ITEMS`);
  return {
    ...itemDef,
    uid: `${modId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity: 1,
    modStats: mod,
  };
}
