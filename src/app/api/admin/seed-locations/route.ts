import { db } from '@/lib/db';
import { SEED_LOCATIONS } from '@/seed-data/locations';
import { NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/**
 * POST /api/admin/seed-locations
 * Seeds the 6 hardcoded locations from locations.ts into the game_locations table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(SEED_LOCATIONS);
    let seeded = 0;

    for (const loc of entries) {
      const commonFields = {
        name: loc.name,
        description: loc.description,
        encounterRate: loc.encounterRate,
        enemyPool: JSON.stringify(loc.enemyPool),
        itemPool: JSON.stringify(loc.itemPool),
        storyEvent: loc.storyEvent ? JSON.stringify(loc.storyEvent) : '',
        isBossArea: loc.isBossArea,
        bossId: loc.bossId ?? null,
        ambientText: JSON.stringify(loc.ambientText ?? []),
        lockedLocations: JSON.stringify(loc.lockedLocations ?? []),
        subAreas: JSON.stringify(loc.subAreas ?? []),
        mapRow: loc.mapRow ?? null,
        mapCol: loc.mapCol ?? null,
        mapIcon: loc.mapIcon ?? null,
        mapDanger: loc.mapDanger ?? 0,
        mapDangerAuto: true,
        searchChance: loc.searchChance ?? null,
        docChance: loc.docChance ?? null,
        searchMax: loc.searchMax ?? null,
        shortName: loc.shortName ?? null,
      };

      await db.gameLocation.upsert({
        where: { id: loc.id },
        update: commonFields,
        create: { id: loc.id, ...commonFields },
      });

      seeded++;
    }

    return NextResponse.json({ message: `Seeded ${seeded} locations`, seeded });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Locations]');
  }
}
