import { db } from '@/lib/db';
import { STATIC_LOCATIONS } from '@/game/data/locations';
import { NextResponse } from 'next/server';

const MAP_LAYOUT: Record<string, { row: number; col: number; icon: string; danger: string }> = {
  city_outskirts: { row: 2, col: 1, icon: '🏚️', danger: 'bassa' },
  rpd_station: { row: 1, col: 2, icon: '🏛️', danger: 'media' },
  hospital_district: { row: 2, col: 3, icon: '🏥', danger: 'alta' },
  sewers: { row: 3, col: 2, icon: '🕳️', danger: 'molto alta' },
  laboratory_entrance: { row: 3, col: 3, icon: '⚗️', danger: 'critica' },
  clock_tower: { row: 4, col: 3, icon: '🕰️', danger: 'FINALE' },
};

/**
 * POST /api/admin/seed-locations
 * Seeds the 6 hardcoded locations from locations.ts into the game_locations table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(STATIC_LOCATIONS);
    let seeded = 0;

    for (const loc of entries) {
      const layout = MAP_LAYOUT[loc.id];

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
          mapRow: layout?.row ?? null,
          mapCol: layout?.col ?? null,
          mapIcon: layout?.icon ?? null,
          mapDanger: layout?.danger ?? null,
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
          mapRow: layout?.row ?? null,
          mapCol: layout?.col ?? null,
          mapIcon: layout?.icon ?? null,
          mapDanger: layout?.danger ?? null,
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
