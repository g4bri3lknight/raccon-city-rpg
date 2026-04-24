// ==========================================
// #29 — EQUIPMENT DATA (Armor & Accessories)
// #3  — WEAPON MOD DATA (as inventory items)
// ==========================================
// MIGRATION NOTE: All legacy bonus fields have been converted to atomic effects.

import { EquipmentInstance, WeaponMod, ItemDefinition } from '@/game/types';

// ── Equipment definitions (stat bonuses now in effects array) ──
export const EQUIPMENT_STATS: Record<string, EquipmentInstance> = {
  // ── ARMOR ──
  vest_light: {
    itemId: 'vest_light', name: 'Gilet Leggero', slot: 'armor', icon: '🦺',
    rarity: 'common', description: 'Un gilet di protezione leggero. +3 DEF.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 3, flat: true },
    ],
  },
  vest_police: {
    itemId: 'vest_police', name: 'Giubbotto RPD', slot: 'armor', icon: '🦺',
    rarity: 'uncommon', description: 'Un giubbotto antiproiettile del dipartimento di polizia. +5 DEF, +15 HP.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 5, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 15, flat: true },
    ],
  },
  vest_tactical: {
    itemId: 'vest_tactical', name: 'Giubbotto Tattico', slot: 'armor', icon: '🦺',
    rarity: 'rare', description: 'Un giubbotto militare con piastra ceramica. +8 DEF, +25 HP.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 8, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 25, flat: true },
    ],
  },
  vest_umbrella: {
    itemId: 'vest_umbrella', name: 'Armatura Umbrella', slot: 'armor', icon: '🦺',
    rarity: 'legendary', description: 'Armatura sperimentale Umbrella. +12 DEF, +40 HP, 50% resistenza veleno.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 12, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 40, flat: true },
      { type: 'status_resist', trigger: 'on_equip', target: 'self', statusType: 'poison', value: 50 },
    ],
  },
  lab_coat: {
    itemId: 'lab_coat', name: 'Camice da Laboratorio', slot: 'armor', icon: '🥼',
    rarity: 'common', description: 'Un camice da laboratorio resistente. +2 DEF, +10 HP.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 2, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 10, flat: true },
    ],
  },
  swat_armor: {
    itemId: 'swat_armor', name: 'Armatura SWAT', slot: 'armor', icon: '🦺',
    rarity: 'rare', description: 'Armatura completa della SWAT. +10 DEF, +30 HP, 40% resistenza sanguinamento.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 10, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 30, flat: true },
      { type: 'status_resist', trigger: 'on_equip', target: 'self', statusType: 'bleeding', value: 40 },
    ],
  },

  // ── ACCESSORIES ──
  watch: {
    itemId: 'watch', name: 'Orologio da Polso', slot: 'accessory', icon: '⌚',
    rarity: 'common', description: 'Un orologio che migliora i riflessi. +2 SPD.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'spd', amount: 2, flat: true },
    ],
  },
  amulet: {
    itemId: 'amulet', name: 'Amuleto Benedetto', slot: 'accessory', icon: '📿',
    rarity: 'uncommon', description: 'Un amuleto che infonde coraggio. +20 HP, +2 DEF.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 20, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 2, flat: true },
    ],
  },
  compass: {
    itemId: 'compass', name: 'Bussola Militare', slot: 'accessory', icon: '🧭',
    rarity: 'uncommon', description: 'Una bussola che aumenta la precisione. +3 SPD, +2 ATK.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'spd', amount: 3, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 2, flat: true },
    ],
  },
  first_aid_badge: {
    itemId: 'first_aid_badge', name: 'Distintivo Croce Rossa', slot: 'accessory', icon: '🎖️',
    rarity: 'uncommon', description: 'Un distintivo che ispira cura. +30 HP, rigenera 3 HP/turno.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 30, flat: true },
      { type: 'hot', trigger: 'on_turn_start', target: 'self', amountPerTurn: 3, duration: 1 },
    ],
  },
  dog_tags: {
    itemId: 'dog_tags', name: 'Piastre Militari', slot: 'accessory', icon: '🏷️',
    rarity: 'rare', description: 'Piastre di un soldato caduto. +3 ATK, +5% critico.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 3, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'crit', amount: 5, flat: true },
    ],
  },
  ring_virus: {
    itemId: 'ring_virus', name: 'Anello del Virus-T', slot: 'accessory', icon: '💍',
    rarity: 'legendary', description: 'Un anello contaminato dal T-Virus. +5 ATK, +15 HP, riflette 5 danni.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 5, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 15, flat: true },
      { type: 'reflect', trigger: 'on_take_hit', target: 'self', percent: 5, duration: 1 },
    ],
  },
  goggles: {
    itemId: 'goggles', name: 'Occhiali Tattici', slot: 'accessory', icon: '🥽',
    rarity: 'uncommon', description: 'Lenti tattiche per una migliore mira. +8% critico.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'crit', amount: 8, flat: true },
    ],
  },
  gas_mask: {
    itemId: 'gas_mask', name: 'Maschera Antigas', slot: 'accessory', icon: '😷',
    rarity: 'rare', description: 'Protezione contro agenti chimici. +3 DEF, +15 HP, 80% resistenza veleno.',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'def', amount: 3, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'hp', amount: 15, flat: true },
      { type: 'status_resist', trigger: 'on_equip', target: 'self', statusType: 'poison', value: 80 },
    ],
  },
};

// ── Weapon mods ──
export const WEAPON_MODS: Record<string, WeaponMod> = {
  mod_red_dot: {
    modId: 'mod_red_dot', name: 'Mirino Rosso', description: '+3 ATK, +10% Critico. Solo armi a distanza.',
    icon: '🎯', rarity: 'uncommon', type: 'ranged',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 3, flat: true },
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'crit', amount: 10, flat: true },
    ],
  },
  mod_extended_mag: {
    modId: 'mod_extended_mag', name: 'Caricatore Esteso', description: '+2 ATK. Solo armi a distanza.',
    icon: '📦', rarity: 'rare', type: 'ranged',
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 2, flat: true }],
  },
  mod_laser_sight: {
    modId: 'mod_laser_sight', name: 'Mirino Laser', description: '+15% Critico. Solo armi a distanza.',
    icon: '🔴', rarity: 'uncommon', type: 'ranged',
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'crit', amount: 15, flat: true }],
  },
  mod_silencer: {
    modId: 'mod_silencer', name: 'Silenziatore', description: '+10% Schivata nemica. Solo armi a distanza.',
    icon: '🔇', rarity: 'uncommon', type: 'ranged',
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 1, flat: true }],
  },
  mod_combat_grip: {
    modId: 'mod_combat_grip', name: 'Impugnatura Tattica', description: '+4 ATK. Tutte le armi.',
    icon: '✊', rarity: 'rare', type: 'any',
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 4, flat: true }],
  },
  mod_toxic_coating: {
    modId: 'mod_toxic_coating', name: 'Coating Velenoso', description: '+3 ATK, +30% Veleno. Solo armi bianche.',
    icon: '☠️', rarity: 'rare', type: 'melee',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 3, flat: true },
      { type: 'status_chance_boost', trigger: 'on_equip', target: 'self', amount: 30 },
    ],
  },
  mod_electric_coil: {
    modId: 'mod_electric_coil', name: 'Bobina Elettrica', description: '+5 ATK, +20% Stordimento. Solo armi bianche.',
    icon: '⚡', rarity: 'rare', type: 'melee',
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 5, flat: true },
      { type: 'status_chance_boost', trigger: 'on_equip', target: 'self', amount: 20 },
    ],
  },
  mod_bio_booster: {
    modId: 'mod_bio_booster', name: 'Bio-Boost Umbrella', description: '+6 ATK. Tutte le armi. Tecnologia segreta Umbrella.',
    icon: '🧬', rarity: 'legendary', type: 'any',
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 6, flat: true }],
  },
};

// All mod IDs for random drops
export const ALL_MOD_IDS = Object.keys(WEAPON_MODS);

// Create item definitions for weapon mods
export const MOD_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};
for (const modId of ALL_MOD_IDS) {
  const mod = WEAPON_MODS[modId];
  MOD_ITEM_DEFINITIONS[modId] = {
    id: modId, name: mod.name, description: mod.description,
    type: 'weapon_mod' as const, rarity: mod.rarity, icon: mod.icon,
    usable: false, equippable: false, stackable: false, maxStack: 1, unico: true,
  };
}

// Create item definitions for equipment items
export const EQUIPMENT_ITEM_DEFINITIONS: Record<string, ItemDefinition> = {};
for (const [id, eq] of Object.entries(EQUIPMENT_STATS)) {
  EQUIPMENT_ITEM_DEFINITIONS[id] = {
    id: eq.itemId, name: eq.name, description: eq.description,
    type: eq.slot === 'armor' ? 'armor' as const : 'accessory' as const,
    rarity: eq.rarity, icon: eq.icon,
    usable: false, equippable: true, stackable: false, maxStack: 1, unico: true,
  };
}

// All equipment item IDs for loot tables
export const ALL_EQUIPMENT_IDS = Object.keys(EQUIPMENT_STATS);
export const ALL_MOD_ITEM_IDS = ALL_MOD_IDS;
