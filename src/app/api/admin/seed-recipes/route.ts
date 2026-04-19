import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_RECIPES } from '@/seed-data/recipes';

import { safeErrorResponse } from '@/lib/api-utils';
/**
 * POST /api/admin/seed-recipes
 * Seeds all recipe data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    let created = 0, updated = 0;

    for (const recipe of SEED_RECIPES) {
      const existing = await db.gameRecipe.findUnique({ where: { id: recipe.id } });
      const data = {
        name: recipe.name,
        description: recipe.description ?? '',
        icon: recipe.icon ?? '🔧',
        category: recipe.category,
        ingredients: recipe.ingredients,
        resultItemId: recipe.resultItemId,
        resultQty: recipe.resultQty ?? 1,
        difficulty: recipe.difficulty,
        sortOrder: recipe.sortOrder ?? 0,
      };
      if (existing) {
        await db.gameRecipe.update({ where: { id: recipe.id }, data });
        updated++;
      } else {
        await db.gameRecipe.create({ data: { id: recipe.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seed ricette completato: ${SEED_RECIPES.length} ricette (${created} nuove, ${updated} agg.)`,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Recipes]');
  }
}
