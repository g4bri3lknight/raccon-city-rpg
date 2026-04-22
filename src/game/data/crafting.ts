// ==========================================
// CRAFTING RECIPE TYPES
// At runtime, recipe data is loaded from DB via loader.ts → /api/game-data.
// Seed data: src/seed-data/recipes.ts
// ==========================================

import { ItemQuality, Rarity } from '../types';

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'ammo' | 'healing' | 'booster';
  ingredients: { itemId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  difficulty: 'easy' | 'medium' | 'hard';
  hidden?: boolean; // if true, recipe is not visible until discovered
  // #8 Crafting Avanzato
  pointCost?: number; // crafting points required (e.g. easy=3, medium=5, hard=8)
  pointOnly?: boolean; // if true, can ONLY be crafted with points (no ingredients)
  ngPlusOnly?: boolean; // if true, only available in NG+ cycle 1+
  forceMasterQuality?: boolean; // if true, result is always master quality
}

// Quality labels for display
export const QUALITY_LABELS: Record<ItemQuality, { label: string; stars: string; color: string }> = {
  normal: { label: 'Normale', stars: '', color: 'text-white/60' },
  superior: { label: 'Qualità Superiore', stars: '⭐', color: 'text-blue-400' },
  master: { label: 'Qualità Maestra', stars: '⭐⭐', color: 'text-amber-400' },
};

// Points yielded by item rarity when breaking down
export const RARITY_POINTS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 5,
  legendary: 8,
};
