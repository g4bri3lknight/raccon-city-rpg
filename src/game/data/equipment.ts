// ==========================================
// #29 — EQUIPMENT DATA (Armor & Accessories)
// #3  — WEAPON MOD DATA (as inventory items)
// ==========================================

import { EquipmentInstance, WeaponMod, ItemDefinition } from '../types';

// ── Equipment definitions (not ItemDefinition, these are stat containers) ──
export const EQUIPMENT_STATS: Record<string, EquipmentInstance> = {
  // ── ARMOR ──
  vest_light: {
    itemId: 'vest_light', name: 'Gilet Leggero', slot: 'armor', icon: '🦺',
    rarity: 'common', defBonus: 3, description: 'Un gilet di protezione leggero. +3 DEF.',
  },
  vest_police: {
    itemId: 'vest_police', name: 'Giubbotto RPD', slot: 'armor', icon: '🦺',
    rarity: 'uncommon', defBonus: 5, hpBonus: 15, description: 'Un giubbotto antiproiettile del dipartimento di polizia. +5 DEF, +15 HP.',
  },
  vest_tactical: {
    itemId: 'vest_tactical', name: 'Giubbotto Tattico', slot: 'armor', icon: '🦺',
    rarity: 'rare', defBonus: 8, hpBonus: 25, description: 'Un giubbotto militare con piastra ceramica. +8 DEF, +25 HP.',
  },
  vest_umbrella: {
    itemId: 'vest_umbrella', name: 'Armatura Umbrella', slot: 'armor', icon: '🦺',
    rarity: 'legendary', defBonus: 12, hpBonus: 40, specialEffect: { type: 'poison_resist', value: 50 },
    description: 'Armatura sperimentale Umbrella. +12 DEF, +40 HP, 50% resistenza veleno.',
  },
  lab_coat: {
    itemId: 'lab_coat', name: 'Camice da Laboratorio', slot: 'armor', icon: '🥼',
    rarity: 'common', defBonus: 2, hpBonus: 10, description: 'Un camice da laboratorio resistente. +2 DEF, +10 HP.',
  },
  swat_armor: {
    itemId: 'swat_armor', name: 'Armatura SWAT', slot: 'armor', icon: '🦺',
    rarity: 'rare', defBonus: 10, hpBonus: 30, specialEffect: { type: 'bleed_resist', value: 40 },
    description: 'Armatura completa della SWAT. +10 DEF, +30 HP, 40% resistenza sanguinamento.',
  },

  // ── ACCESSORIES ──
  watch: {
    itemId: 'watch', name: 'Orologio da Polso', slot: 'accessory', icon: '⌚',
    rarity: 'common', spdBonus: 2, description: 'Un orologio che migliora i riflessi. +2 SPD.',
  },
  amulet: {
    itemId: 'amulet', name: 'Amuleto Benedetto', slot: 'accessory', icon: '📿',
    rarity: 'uncommon', hpBonus: 20, defBonus: 2, description: 'Un amuleto che infonde coraggio. +20 HP, +2 DEF.',
  },
  compass: {
    itemId: 'compass', name: 'Bussola Militare', slot: 'accessory', icon: '🧭',
    rarity: 'uncommon', spdBonus: 3, atkBonus: 2, description: 'Una bussola che aumenta la precisione. +3 SPD, +2 ATK.',
  },
  first_aid_badge: {
    itemId: 'first_aid_badge', name: 'Distintivo Croce Rossa', slot: 'accessory', icon: '🎖️',
    rarity: 'uncommon', hpBonus: 30, specialEffect: { type: 'hp_regen', value: 3 },
    description: 'Un distintivo che ispira cura. +30 HP, rigenera 3 HP/turno.',
  },
  dog_tags: {
    itemId: 'dog_tags', name: 'Piastre Militari', slot: 'accessory', icon: '🏷️',
    rarity: 'rare', atkBonus: 3, critBonus: 5, description: 'Piastre di un soldato caduto. +3 ATK, +5% critico.',
  },
  ring_virus: {
    itemId: 'ring_virus', name: 'Anello del Virus-T', slot: 'accessory', icon: '💍',
    rarity: 'legendary', atkBonus: 5, hpBonus: 15, specialEffect: { type: 'thorns', value: 5 },
    description: 'Un anello contaminato dal T-Virus. +5 ATK, +15 HP, riflette 5 danni.',
  },
  goggles: {
    itemId: 'goggles', name: 'Occhiali Tattici', slot: 'accessory', icon: '🥽',
    rarity: 'uncommon', critBonus: 8, description: 'Lenti tattiche per una migliore mira. +8% critico.',
  },
  gas_mask: {
    itemId: 'gas_mask', name: 'Maschera Antigas', slot: 'accessory', icon: '😷',
    rarity: 'rare', defBonus: 3, hpBonus: 15, specialEffect: { type: 'poison_resist', value: 80 },
    description: 'Protezione contro agenti chimici. +3 DEF, +15 HP, 80% resistenza veleno.',
  },
};

// ── Weapon mods are already defined in weapon-mods.ts ──
// This file re-exports them and also creates ItemDefinition entries for loot
import { WEAPON_MODS, ALL_MOD_IDS } from './weapon-mods';

// Create item definitions for weapon mods (so they can appear in loot/inventory)
export const MOD_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};
for (const modId of ALL_MOD_IDS) {
  const mod = WEAPON_MODS[modId];
  MOD_ITEM_DEFINITIONS[modId] = {
    id: modId,
    name: mod.name,
    description: mod.description,
    type: 'weapon_mod' as const,
    rarity: mod.rarity,
    icon: mod.icon,
    usable: false,
    equippable: false,
    stackable: false,
    maxStack: 1,
    unico: true,
  };
}

// Create item definitions for equipment items
export const EQUIPMENT_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};
for (const [id, eq] of Object.entries(EQUIPMENT_STATS)) {
  EQUIPMENT_ITEM_DEFINITIONS[id] = {
    id: eq.itemId,
    name: eq.name,
    description: eq.description,
    type: eq.slot === 'armor' ? 'armor' as const : 'accessory' as const,
    rarity: eq.rarity,
    icon: eq.icon,
    usable: false,
    equippable: true,
    stackable: false,
    maxStack: 1,
    unico: true,
  };
}

// All equipment item IDs for loot tables
export const ALL_EQUIPMENT_IDS = Object.keys(EQUIPMENT_STATS);
export const ALL_MOD_ITEM_IDS = ALL_MOD_IDS;

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
