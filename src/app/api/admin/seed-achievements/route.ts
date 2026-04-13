import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_ACHIEVEMENTS } from '@/seed-data/achievements';

type SeedResult = { entity: string; total: number; created: number; updated: number };

/**
 * POST /api/admin/seed-achievements
 * Seeds all achievement data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    let created = 0, updated = 0;

    for (const ach of SEED_ACHIEVEMENTS) {
      const existing = await db.gameAchievement.findUnique({ where: { id: ach.id } });
      const data = {
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        condition: ach.condition,
        hidden: ach.hidden ?? false,
        reward: ach.reward,
        sortOrder: ach.sortOrder,
      };
      if (existing) {
        await db.gameAchievement.update({ where: { id: ach.id }, data });
        updated++;
      } else {
        await db.gameAchievement.create({ data: { id: ach.id, ...data } });
        created++;
      }
    }

    const result: SeedResult = { entity: 'achievements', total: SEED_ACHIEVEMENTS.length, created, updated };

    return NextResponse.json({
      success: true,
      message: `Seed traguardi completato: ${SEED_ACHIEVEMENTS.length} traguardi (${created} nuovi, ${updated} agg.)`,
      result,
    });
  } catch (error) {
    console.error('[seed-achievements] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
