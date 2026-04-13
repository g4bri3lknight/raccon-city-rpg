// Static character data has been moved to src/seed-data/characters.ts for seed routes.
// At runtime, characters are loaded from DB via loader.ts → /api/game-data.

import { CharacterArchetype, Archetype, Character } from './types';

let uid = 0;
const genUid = () => `item_${++uid}_${Date.now()}`;

// Stat point system: rebuilt from DB data by loader.ts
// (No longer exported — consumers use ARCHETYPE_STAT_POINTS from loader.ts)
const ARCHETYPE_STAT_POINTS: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
  custom: { hp: 10, atk: 12, def: 10, spd: 8 },
};

// Compute proportional growth rates from stat point distribution
export function computeGrowthRates(stats: { hp: number; atk: number; def: number; spd: number }): { hp: number; atk: number; def: number; spd: number } {
  const total = stats.hp + stats.atk + stats.def + stats.spd;
  const budget = 12;
  return {
    hp: Math.max(4, Math.round((stats.hp / total) * budget)),
    atk: Math.max(1, Math.round((stats.atk / total) * budget)),
    def: Math.max(1, Math.round((stats.def / total) * budget)),
    spd: Math.max(0, Math.round((stats.spd / total) * budget)),
  };
}

export function getCharacterStats(archetype: CharacterArchetype, level: number) {
  const points = ARCHETYPE_STAT_POINTS[archetype.id] || ARCHETYPE_STAT_POINTS.custom;
  const growth = computeGrowthRates(points);
  return {
    maxHp: points.hp * 10 + growth.hp * (level - 1),
    atk: points.atk + growth.atk * (level - 1),
    def: points.def + growth.def * (level - 1),
    spd: points.spd + growth.spd * (level - 1),
  };
}

// Get growth rates for a given archetype (unified proportional system)
export function getGrowthRates(archetype: Archetype, customGrowth?: { hp: number; atk: number; def: number; spd: number }) {
  if (customGrowth) return customGrowth;
  const points = ARCHETYPE_STAT_POINTS[archetype];
  if (points) return computeGrowthRates(points);
  return { hp: 10, atk: 2, def: 1, spd: 1 };
}

// Get passive description for custom characters based on their stat distribution
export function getCustomPassiveDescription(stats: { hp: number; atk: number; def: number; spd: number }): string {
  const total = stats.hp + stats.atk + stats.def + stats.spd;
  const highest = Math.max(stats.hp, stats.atk, stats.def, stats.spd);
  
  if (highest === stats.hp) return 'Resistenza Innata: Sopravvive più a lungo grazie alla sua corporatura robusta. +10% HP massimo.';
  if (highest === stats.atk) return 'Istinto Predatore: I suoi colpi sono più precisi. +15% probabilità di colpo critico.';
  if (highest === stats.def) return 'Pelle Coriacea: Riduce i danni subiti del 10% in modo passivo.';
  return 'Riflessi Felini: La sua velocità naturale gli conferisce +10% probabilità di schivare.';
}

// Starting items: inherit from base archetype if available, otherwise generic kit
export function getCustomStartingItems(baseArchetype?: Archetype) {
  // Note: This now returns a static fallback. The DB-loaded characters
  // have their startingItems set via loader.ts → mapDbCharacter()
  return [
    {
      uid: genUid(), itemId: 'pipe', name: 'Tubo di Piombo', description: 'Un pesante tubo di piombo, affidabile come mazza.',
      type: 'weapon' as const, rarity: 'common' as const, icon: '🔧', usable: false, equippable: true, quantity: 1,
      weaponStats: { itemId: 'pipe', name: 'Tubo di Piombo', type: 'melee' as const, modSlots: [], effects: [{ type: 'buff_stat' as const, trigger: 'on_equip' as const, target: 'self' as const, stat: 'atk' as const, amount: 5, flat: true }] },
    },
    {
      uid: genUid(), itemId: 'bandage', name: 'Benda', description: 'Una benda per fermare le emorragie. Ripristina 25 HP.',
      type: 'healing' as const, rarity: 'common' as const, icon: '🩹', usable: true, equippable: false, quantity: 2,
      effect: { type: 'heal' as const, value: 25, target: 'self' as const },
    },
    {
      uid: genUid(), itemId: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP.',
      type: 'healing' as const, rarity: 'common' as const, icon: '🌿', usable: true, equippable: false, quantity: 2,
      effect: { type: 'heal' as const, value: 30, target: 'self' as const },
    },
  ];
}
