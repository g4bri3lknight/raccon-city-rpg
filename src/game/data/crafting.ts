// ==========================================
// CRAFTING RECIPES
// ==========================================

export type CraftingCategory = 'ammo' | 'healing' | 'booster';

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CraftingCategory;
  ingredients: { itemId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  difficulty: 'easy' | 'medium' | 'hard';
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ── Ammunition (recycling gunpowder + scrap) ──
  {
    id: 'craft_pistol_ammo',
    name: 'Munizioni Pistola',
    description: 'Ricarica munizioni 9mm per la pistola.',
    icon: '🔶',
    category: 'ammo',
    ingredients: [
      { itemId: 'gunpowder', quantity: 1 },
      { itemId: 'metal_scrap', quantity: 1 },
    ],
    result: { itemId: 'ammo_pistol', quantity: 5 },
    difficulty: 'easy',
  },
  {
    id: 'craft_shotgun_shells',
    name: 'Munizioni Fucile',
    description: 'Ricarica cartucce per il fucile a pompa.',
    icon: '🔷',
    category: 'ammo',
    ingredients: [
      { itemId: 'gunpowder', quantity: 2 },
      { itemId: 'metal_scrap', quantity: 2 },
    ],
    result: { itemId: 'ammo_shotgun', quantity: 3 },
    difficulty: 'medium',
  },
  {
    id: 'craft_magnum_rounds',
    name: 'Munizioni Magnum',
    description: 'Ricarica munizioni .357 per il magnum.',
    icon: '🔴',
    category: 'ammo',
    ingredients: [
      { itemId: 'gunpowder', quantity: 3 },
      { itemId: 'metal_scrap', quantity: 3 },
      { itemId: 'empty_shell', quantity: 1 },
    ],
    result: { itemId: 'ammo_magnum', quantity: 2 },
    difficulty: 'hard',
  },

  // ── Healing / Antidotes ──
  {
    id: 'craft_antidote',
    name: 'Antidoto',
    description: 'Prepara un antidoto che cura il veleno.',
    icon: '💉',
    category: 'healing',
    ingredients: [
      { itemId: 'herb_green', quantity: 1 },
      { itemId: 'distilled_water', quantity: 1 },
    ],
    result: { itemId: 'crafted_antidote', quantity: 1 },
    difficulty: 'easy',
  },
  {
    id: 'craft_strong_bandage',
    name: 'Cerotto Potente',
    description: 'Benda medica potenziata. Ripristina 60 HP.',
    icon: '🩹',
    category: 'healing',
    ingredients: [
      { itemId: 'herb_green', quantity: 2 },
      { itemId: 'alcohol', quantity: 1 },
    ],
    result: { itemId: 'strong_bandage', quantity: 1 },
    difficulty: 'medium',
  },
  {
    id: 'craft_strong_painkiller',
    name: 'Analgesico Forte',
    description: 'Potente antidolorifico. Ripristina 100 HP.',
    icon: '💊',
    category: 'healing',
    ingredients: [
      { itemId: 'herb_green', quantity: 1 },
      { itemId: 'herb_red', quantity: 1 },
      { itemId: 'alcohol', quantity: 1 },
    ],
    result: { itemId: 'strong_painkiller', quantity: 1 },
    difficulty: 'hard',
  },

  // ── Power-ups / Boosters ──
  {
    id: 'craft_stimulant',
    name: 'Stimolante',
    description: 'Boost chimico. +5 ATT per 5 turni.',
    icon: '⚡',
    category: 'booster',
    ingredients: [
      { itemId: 'distilled_water', quantity: 1 },
      { itemId: 'gunpowder', quantity: 1 },
    ],
    result: { itemId: 'stimulant', quantity: 1 },
    difficulty: 'easy',
  },
  {
    id: 'craft_elastic_bandage',
    name: 'Benda Elastica',
    description: 'Protezione rinforzata. +5 DIF per 5 turni.',
    icon: '🛡️',
    category: 'booster',
    ingredients: [
      { itemId: 'metal_scrap', quantity: 2 },
      { itemId: 'herb_green', quantity: 1 },
    ],
    result: { itemId: 'elastic_bandage', quantity: 1 },
    difficulty: 'medium',
  },
  {
    id: 'craft_adrenaline',
    name: 'Adrenalina',
    description: 'Iniezione di adrenalina. +3 VEL per 5 turni.',
    icon: '💉',
    category: 'booster',
    ingredients: [
      { itemId: 'metal_scrap', quantity: 1 },
      { itemId: 'distilled_water', quantity: 1 },
      { itemId: 'alcohol', quantity: 1 },
    ],
    result: { itemId: 'adrenaline_shot', quantity: 1 },
    difficulty: 'medium',
  },
];

export const CRAFTING_CATEGORY_LABELS: Record<CraftingCategory, { name: string; icon: string; color: string }> = {
  ammo: { name: 'Munizioni', icon: '🔶', color: 'text-amber-300' },
  healing: { name: 'Guarigione', icon: '💚', color: 'text-green-300' },
  booster: { name: 'Potenziamenti', icon: '⚡', color: 'text-cyan-300' },
};

export const CRAFTING_DIFFICULTY_LABELS: Record<string, { name: string; color: string }> = {
  easy: { name: 'Semplice', color: 'text-green-400' },
  medium: { name: 'Medio', color: 'text-yellow-400' },
  hard: { name: 'Difficile', color: 'text-red-400' },
};
