import { db } from '@/lib/db';
import { SEED_CHARACTERS } from '@/seed-data/characters';
import { NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/admin/seed-characters
 * Seeds the hardcoded characters from characters.ts into the game_characters table.
 * Uses upsert for idempotency.
 *
 * Characters are auto-linked to their matching archetype by a name→archetype mapping.
 * When linked, stats/abilities/passive/equipment are inherited so we clear the duplicates.
 *
 * Mapping:
 *   Tank → tank, Medico → healer, DPS → dps, Controllo → control, Sopravvissuta → custom
 */
const ARCHETYPE_NAME_MAP: Record<string, string> = {
  'Tank': 'tank',
  'Medico': 'healer',
  'DPS': 'dps',
  'Controllo': 'control',
  'Sopravvissuta': 'custom',
};

export async function POST() {
  try {
    // Fetch all archetypes for name→id lookup
    const archetypes = await db.gameArchetype.findMany({ select: { id: true, name: true } });
    const archetypeByName = new Map(archetypes.map(a => [a.name, a.id]));

    const characters = SEED_CHARACTERS;
    let seeded = 0;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];

      // Match character name to archetype name using explicit mapping
      const archetypeKey = ARCHETYPE_NAME_MAP[char.name] || char.name.toLowerCase();
      const archetypeId = archetypeByName.get(archetypeKey) || null;

      // If linked to archetype, clear redundant fields (they'll be inherited via applyArchetypeInheritance)
      await db.gameCharacter.upsert({
        where: { id: char.id },
        update: {
          archetypeId,
          archetypeFallback: archetypeKey,
          name: char.name,
          displayName: char.displayName,
          description: char.description,
          // If linked, clear inherited fields so they come from archetype
          maxHp: archetypeId ? undefined : char.maxHp,
          atk: archetypeId ? undefined : char.atk,
          def: archetypeId ? undefined : char.def,
          spd: archetypeId ? undefined : char.spd,
          specialName: archetypeId ? '' : char.specialName,
          specialDescription: archetypeId ? '' : char.specialDescription,
          specialCost: archetypeId ? 15 : char.specialCost,
          special2Name: archetypeId ? '' : char.special2Name,
          special2Description: archetypeId ? '' : char.special2Description,
          special2Cost: archetypeId ? 15 : char.special2Cost,
          passiveDescription: archetypeId ? '' : char.passiveDescription,
          portraitEmoji: char.portraitEmoji,
          startingItems: archetypeId ? '[]' : JSON.stringify(char.startingItems),
          sortOrder: i,
        },
        create: {
          id: char.id,
          archetypeId,
          archetypeFallback: archetypeKey,
          name: char.name,
          displayName: char.displayName,
          description: char.description,
          maxHp: char.maxHp,
          atk: char.atk,
          def: char.def,
          spd: char.spd,
          specialName: archetypeId ? '' : char.specialName,
          specialDescription: archetypeId ? '' : char.specialDescription,
          specialCost: archetypeId ? 15 : char.specialCost,
          special2Name: archetypeId ? '' : char.special2Name,
          special2Description: archetypeId ? '' : char.special2Description,
          special2Cost: archetypeId ? 15 : char.special2Cost,
          passiveDescription: archetypeId ? '' : char.passiveDescription,
          portraitEmoji: char.portraitEmoji,
          startingItems: archetypeId ? '[]' : JSON.stringify(char.startingItems),
          sortOrder: i,
        },
      });

      seeded++;
    }

    return NextResponse.json({ seeded });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Characters]');
  }
}
