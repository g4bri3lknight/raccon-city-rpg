import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_ENDINGS } from '@/seed-data/endings';

import { safeErrorResponse } from '@/lib/api-utils';
type SeedResult = { entity: string; total: number; created: number; updated: number };

/**
 * POST /api/admin/seed-endings
 * Seeds all ending data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    let created = 0, updated = 0;

    for (const ending of SEED_ENDINGS) {
      const existing = await db.gameEnding.findUnique({ where: { id: ending.id } });
      const data = {
        title: ending.title,
        subtitle: ending.subtitle,
        description: ending.description,
        icon: ending.icon,
        color: ending.color,
        requirements: JSON.stringify(ending.requirements),
        priority: ending.priority,
        sortOrder: ending.sortOrder,
      };
      if (existing) {
        await db.gameEnding.update({ where: { id: ending.id }, data });
        updated++;
      } else {
        await db.gameEnding.create({ data: { id: ending.id, ...data } });
        created++;
      }
    }

    const result: SeedResult = { entity: 'endings', total: SEED_ENDINGS.length, created, updated };

    return NextResponse.json({
      success: true,
      message: `Seed finali completato: ${SEED_ENDINGS.length} finali (${created} nuovi, ${updated} agg.)`,
      result,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Endings]');
  }
}
