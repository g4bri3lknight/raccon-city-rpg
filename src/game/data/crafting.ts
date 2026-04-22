// ==========================================
// CRAFTING RECIPE TYPES
// At runtime, recipe data is loaded from DB via loader.ts → /api/game-data.
// Seed data: src/seed-data/recipes.ts
// ==========================================

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
}
