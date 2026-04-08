import { db } from '@/lib/db';
import { CHARACTER_ARCHETYPES } from '@/game/data/characters';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-characters
 * Seeds the hardcoded character archetypes from characters.ts into the game_characters table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const archetypes = CHARACTER_ARCHETYPES;
    let seeded = 0;

    for (let i = 0; i < archetypes.length; i++) {
      const arch = archetypes[i];

      await db.gameCharacter.upsert({
        where: { id: arch.id },
        update: {
          archetype: arch.id,
          name: arch.name,
          displayName: arch.displayName,
          description: arch.description,
          maxHp: arch.maxHp,
          atk: arch.atk,
          def: arch.def,
          spd: arch.spd,
          specialName: arch.specialName,
          specialDescription: arch.specialDescription,
          specialCost: arch.specialCost,
          special2Name: arch.special2Name,
          special2Description: arch.special2Description,
          special2Cost: arch.special2Cost,
          passiveDescription: arch.passiveDescription,
          portraitEmoji: arch.portraitEmoji,
          startingItems: JSON.stringify(arch.startingItems),
          sortOrder: i,
        },
        create: {
          id: arch.id,
          archetype: arch.id,
          name: arch.name,
          displayName: arch.displayName,
          description: arch.description,
          maxHp: arch.maxHp,
          atk: arch.atk,
          def: arch.def,
          spd: arch.spd,
          specialName: arch.specialName,
          specialDescription: arch.specialDescription,
          specialCost: arch.specialCost,
          special2Name: arch.special2Name,
          special2Description: arch.special2Description,
          special2Cost: arch.special2Cost,
          passiveDescription: arch.passiveDescription,
          portraitEmoji: arch.portraitEmoji,
          startingItems: JSON.stringify(arch.startingItems),
          sortOrder: i,
        },
      });

      seeded++;
    }

    return NextResponse.json({ seeded });
  } catch (error) {
    console.error('[seed-characters] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
