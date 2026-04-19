import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_BOSS_PHASES } from '@/seed-data/boss-phases';

import { safeErrorResponse } from '@/lib/api-utils';
type SeedResult = { entity: string; total: number; created: number; updated: number };

/**
 * POST /api/admin/seed-boss-phases
 * Seeds all boss phase data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    let created = 0, updated = 0;

    for (const phase of SEED_BOSS_PHASES) {
      const existing = await db.gameBossPhase.findUnique({ where: { id: phase.id } });
      const data = {
        enemyId: phase.enemyId,
        name: phase.name,
        hpThreshold: phase.hpThreshold,
        hpMultiplier: phase.hpMultiplier,
        atkMultiplier: phase.atkMultiplier,
        defMultiplier: phase.defMultiplier,
        spdMultiplier: phase.spdMultiplier,
        newAbilities: JSON.stringify(phase.newAbilities ?? []),
        message: phase.message,
        sortOrder: phase.sortOrder,
      };
      if (existing) {
        await db.gameBossPhase.update({ where: { id: phase.id }, data });
        updated++;
      } else {
        await db.gameBossPhase.create({ data: { id: phase.id, ...data } });
        created++;
      }
    }

    const result: SeedResult = { entity: 'boss-phases', total: SEED_BOSS_PHASES.length, created, updated };

    return NextResponse.json({
      success: true,
      message: `Seed fasi boss completato: ${SEED_BOSS_PHASES.length} fasi (${created} nuove, ${updated} agg.)`,
      result,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Boss Phases]');
  }
}
