import { db } from '@/lib/db';
import { SEED_LOCATIONS } from '@/seed-data/locations';
import { NextResponse } from 'next/server';

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
      await db.gameLocation.upsert({
        where: { id: loc.id },
        update: {
          name: loc.name,
          description: loc.description,
          encounterRate: loc.encounterRate,
          enemyPool: JSON.stringify(loc.enemyPool),
          itemPool: JSON.stringify(loc.itemPool),
          storyEvent: loc.storyEvent ? JSON.stringify(loc.storyEvent) : '',
          nextLocations: JSON.stringify(loc.nextLocations),
          isBossArea: loc.isBossArea,
          bossId: loc.bossId ?? null,
          ambientText: JSON.stringify(loc.ambientText ?? []),
          lockedLocations: JSON.stringify(loc.lockedLocations ?? []),
          subAreas: JSON.stringify(loc.subAreas ?? []),
          mapRow: loc.mapRow ?? null,
          mapCol: loc.mapCol ?? null,
          mapIcon: loc.mapIcon ?? null,
          mapDanger: loc.mapDanger != null ? String(loc.mapDanger) : null,
          shortName: loc.shortName ?? null,
        },
        create: {
          id: loc.id,
          name: loc.name,
          description: loc.description,
          encounterRate: loc.encounterRate,
          enemyPool: JSON.stringify(loc.enemyPool),
          itemPool: JSON.stringify(loc.itemPool),
          storyEvent: loc.storyEvent ? JSON.stringify(loc.storyEvent) : '',
          nextLocations: JSON.stringify(loc.nextLocations),
          isBossArea: loc.isBossArea,
          bossId: loc.bossId ?? null,
          ambientText: JSON.stringify(loc.ambientText ?? []),
          lockedLocations: JSON.stringify(loc.lockedLocations ?? []),
          subAreas: JSON.stringify(loc.subAreas ?? []),
          mapRow: loc.mapRow ?? null,
          mapCol: loc.mapCol ?? null,
          mapIcon: loc.mapIcon ?? null,
          mapDanger: loc.mapDanger != null ? String(loc.mapDanger) : null,
          shortName: loc.shortName ?? null,
        },
      });

      seeded++;
    }

    return NextResponse.json({ seeded });
  } catch (error) {
    console.error('[seed-locations] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
