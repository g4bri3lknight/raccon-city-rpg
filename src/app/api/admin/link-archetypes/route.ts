import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/admin/link-archetypes
 *
 * Links existing characters to archetypes by matching character IDs
 * to archetype names (case-insensitive).
 *
 * Also migrates character stats to archetype if archetype stats are defaults.
 *
 * Body (optional):
 *   { dryRun: true }  — preview changes without applying them
 *   { mappings: { "characterId": "archetypeId", ... } }  — manual override
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const customMappings: Record<string, string> = body.mappings || {};

    // Fetch all archetypes and characters
    const archetypes = await db.gameArchetype.findMany({ orderBy: { sortOrder: 'asc' } });
    const characters = await db.gameCharacter.findMany({ orderBy: { sortOrder: 'asc' } });

    if (archetypes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nessun archetipo trovato. Esegui prima il seed degli archetipi.',
      });
    }

    // Build name → archetype map (match by name or displayName, case-insensitive)
    const archetypeByName = new Map<string, typeof archetypes[0]>();
    const archetypeByDisplayName = new Map<string, typeof archetypes[0]>();
    for (const a of archetypes) {
      archetypeByName.set(a.name.toLowerCase(), a);
      if (a.displayName) {
        archetypeByDisplayName.set(a.displayName.toLowerCase(), a);
      }
    }

    // Plan the linking operations
    const operations: {
      characterId: string;
      characterName: string;
      archetypeId: string;
      archetypeName: string;
      method: string;
    }[] = [];

    for (const char of characters) {
      // Skip if already linked
      if (char.archetypeId) continue;

      let targetArchetype: typeof archetypes[0] | null = null;
      let method = '';

      // 1. Check custom mappings first
      if (customMappings[char.id]) {
        const found = archetypes.find(a => a.id === customMappings[char.id]);
        if (found) {
          targetArchetype = found;
          method = 'custom-mapping';
        }
      }

      // 2. Match by character ID → archetype name
      if (!targetArchetype) {
        const match = archetypeByName.get(char.id.toLowerCase());
        if (match) {
          targetArchetype = match;
          method = 'id-to-name';
        }
      }

      // 3. Match by character ID → archetype displayName
      if (!targetArchetype) {
        const match = archetypeByDisplayName.get(char.id.toLowerCase());
        if (match) {
          targetArchetype = match;
          method = 'id-to-displayName';
        }
      }

      // 4. Match by character displayName → archetype name
      if (!targetArchetype && char.displayName) {
        const match = archetypeByName.get(char.displayName.toLowerCase());
        if (match) {
          targetArchetype = match;
          method = 'displayName-to-name';
        }
      }

      // 5. Match by character name → archetype name
      if (!targetArchetype && char.name) {
        const match = archetypeByName.get(char.name.toLowerCase());
        if (match) {
          targetArchetype = match;
          method = 'name-to-name';
        }
      }

      if (targetArchetype) {
        operations.push({
          characterId: char.id,
          characterName: char.displayName || char.name || char.id,
          archetypeId: targetArchetype.id,
          archetypeName: targetArchetype.displayName || targetArchetype.name,
          method,
        });
      }
    }

    if (operations.length === 0) {
      return NextResponse.json({
        success: true,
        message: dryRun
          ? 'Nessun collegamento necessario — tutti i personaggi sono già collegati o non c\'è corrispondenza.'
          : 'Nessun collegamento effettuato.',
        dryRun,
        totalCharacters: characters.length,
        linkedBefore: characters.filter(c => c.archetypeId).length,
        operations: [],
      });
    }

    // Apply linking (unless dry run)
    if (!dryRun) {
      for (const op of operations) {
        await db.gameCharacter.update({
          where: { id: op.characterId },
          data: {
            archetypeId: op.archetypeId,
            archetypeFallback: op.archetypeName.toLowerCase(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `📖 Anteprima: ${operations.length} personaggi verrebbero collegati (dry run)`
        : `✅ ${operations.length} personaggi collegati con successo agli archetipi`,
      dryRun,
      totalCharacters: characters.length,
      alreadyLinked: characters.filter(c => c.archetypeId).length,
      newlyLinked: operations.length,
      operations,
    });
  } catch (error) {
    console.error('[POST /api/admin/link-archetypes]', error);
    return NextResponse.json(
      {
        error: 'Errore durante il collegamento archetipi',
        details: String(error),
      },
      500
    );
  }
}
