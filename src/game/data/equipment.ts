// ==========================================
// #29 — EQUIPMENT DATA (Armor & Accessories) — DB-driven
// #3  — WEAPON MOD DATA helpers — DB-driven
// ==========================================
// Reads from ITEMS (loaded by loader.ts from DB) at runtime.
// Call rebuildEquipmentFromItems() after ITEMS are populated.

import { ITEMS } from './loader';
import type { EquipmentInstance, WeaponMod, ItemDefinition, SpecialEffect } from '../types';
import { WEAPON_MODS } from './weapon-mods';

export let EQUIPMENT_STATS: Record<string, EquipmentInstance> = {};
export let ALL_EQUIPMENT_IDS: string[] = [];
export let ALL_MOD_ITEM_IDS: string[] = [];
export let EQUIPMENT_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};
export let MOD_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};

/** Rebuild all equipment/mod data from ITEMS (call after loader has populated ITEMS) */
export function rebuildEquipmentFromItems(): void {
  const eqStats: Record<string, EquipmentInstance> = {};
  const eqIds: string[] = [];
  const eqDefs: Record<string, ItemDefinition> = {};
  const modDefs: Record<string, ItemDefinition> = {};

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
      eqDefs[item.id] = {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: false,
        equippable: true,
        stackable: false,
        maxStack: 1,
        unico: true,
      };
    } else if (item.type === 'weapon_mod') {
      modDefs[item.id] = {
        id: item.id,
        name: item.name,
        description: item.description,
        type: 'weapon_mod' as const,
        rarity: item.rarity,
        icon: item.icon,
        usable: false,
        equippable: false,
        stackable: false,
        maxStack: 1,
        unico: true,
      };
    }
  }

  EQUIPMENT_STATS = eqStats;
  ALL_EQUIPMENT_IDS = eqIds;
  ALL_MOD_ITEM_IDS = Object.keys(WEAPON_MODS);
  EQUIPMENT_ITEM_DEFINITIONS = eqDefs;
  MOD_ITEM_DEFINITIONS = modDefs;
}

// Helper: create an equipment item instance for loot
export function createEquipmentItemInstance(itemId: string): ItemDefinition & { uid: string; quantity: number; equipmentStats?: EquipmentInstance } {
  const eq = EQUIPMENT_STATS[itemId];
  if (!eq) throw new Error(`Equipment ${itemId} not found`);
  return {
    ...EQUIPMENT_ITEM_DEFINITIONS[itemId],
    uid: `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity: 1,
    equipmentStats: eq,
  };
}

// Helper: create a mod item instance for loot
export function createModItemInstance(modId: string): ItemDefinition & { uid: string; quantity: number; modStats?: WeaponMod } {
  const mod = WEAPON_MODS[modId];
  if (!mod) throw new Error(`Mod ${modId} not found`);
  return {
    ...MOD_ITEM_DEFINITIONS[modId],
    uid: `${modId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity: 1,
    modStats: mod,
  };
}
