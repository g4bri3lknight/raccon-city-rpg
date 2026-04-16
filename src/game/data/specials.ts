// Static special ability data has been moved to src/seed-data/specials.ts for seed routes.
// At runtime, specials are loaded from DB via loader.ts → /api/game-data.

import { SpecialAbilityDefinition, SpecialCategory, SpecialEffect } from '../types';

export function getSpecialByIdStatic(id: string): SpecialAbilityDefinition | undefined {
  // This is now a stub — specials are loaded from DB via loader.ts
  // Use getSpecialById from loader.ts instead
  return undefined;
}

/** @deprecated Use loader.ts equivalent — this hardcoded value shadows the DB-loaded version */
export const CUSTOM_STAT_BUDGET = {
  totalPoints: 50,
  minPerStat: 5,
  maxPerStat: 25,
  defaults: { hp: 10, atk: 12, def: 10, spd: 8 },
};

/** @deprecated Use loader.ts equivalent — this hardcoded value shadows the DB-loaded version */
export const CUSTOM_STARTING_ITEMS: { itemId: string; name: string; description: string; type: string; rarity: string; icon: string; usable: boolean; equippable: boolean; quantity: number; effect?: any; weaponStats?: any }[] = [
  {
    itemId: 'pipe',
    name: 'Tubo di Piombo',
    description: 'Un pesante tubo di piombo, affidabile come mazza.',
    type: 'weapon',
    rarity: 'common',
    icon: '🔧',
    usable: false,
    equippable: true,
    quantity: 1,
    weaponStats: { itemId: 'pipe', name: 'Tubo di Piombo', type: 'melee', modSlots: [], effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 5, flat: true }] },
  },
  {
    itemId: 'bandage',
    name: 'Benda',
    description: 'Una benda per fermare le emorragie. Ripristina 25 HP.',
    type: 'healing',
    rarity: 'common',
    icon: '🩹',
    usable: true,
    equippable: false,
    quantity: 2,
    effect: { type: 'heal', value: 25, target: 'self' },
  },
  {
    itemId: 'herb_green',
    name: 'Erba Verde',
    description: "Un'erba medicinale. Ripristina 30 HP.",
    type: 'healing',
    rarity: 'common',
    icon: '🌿',
    usable: true,
    equippable: false,
    quantity: 2,
    effect: { type: 'heal', value: 30, target: 'self' },
  },
];

/** @deprecated Use loader.ts equivalent (AVATARS_DATA / re-exported PREDEFINED_AVATARS) */
export const PREDEFINED_AVATARS = [
  { id: 'avatar_soldier', name: 'Avatar 1', path: '/api/media/image?id=avatar_soldier', emoji: '🪖' },
  { id: 'avatar_medic', name: 'Avatar 2', path: '/api/media/image?id=avatar_medic', emoji: '🩺' },
  { id: 'avatar_agent', name: 'Avatar 3', path: '/api/media/image?id=avatar_agent', emoji: '🕵️' },
  { id: 'avatar_cop', name: 'Avatar 4', path: '/api/media/image?id=avatar_cop', emoji: '👮' },
  { id: 'avatar_scientist', name: 'Avatar 5', path: '/api/media/image?id=avatar_scientist', emoji: '🔬' },
  { id: 'avatar_civilian', name: 'Avatar 6', path: '/api/media/image?id=avatar_civilian', emoji: '👤' },
  { id: 'avatar_jax', name: 'Avatar 7', path: '/api/media/image?id=avatar_jax', emoji: '⚔️' },
  { id: 'avatar_elena', name: 'Avatar 8', path: '/api/media/image?id=avatar_elena', emoji: '🩺' },
  { id: 'avatar_marco', name: 'Avatar 9', path: '/api/media/image?id=avatar_marco', emoji: '✈️' },
];
