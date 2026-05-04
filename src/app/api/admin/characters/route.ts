import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * When archetypeId is set, auto-fill character fields from the archetype.
 * This ensures the game engine has all data it needs without changes.
 */
async function applyArchetypeInheritance(data: Record<string, unknown>): Promise<void> {
  const archetypeId = data.archetypeId as string | null | undefined;
  if (!archetypeId) return;

  const archetype = await db.gameArchetype.findUnique({ where: { id: archetypeId } });
  if (!archetype) return;

  // Copy stats from archetype
  data.maxHp = archetype.maxHp;
  data.atk = archetype.atk;
  data.def = archetype.def;
  data.spd = archetype.spd;

  // Resolve specials: archetype stores specialId (ID), character stores specialName (name)
  if (archetype.specialId) {
    const spec1 = await db.gameSpecial.findUnique({ where: { id: archetype.specialId } });
    if (spec1) {
      data.specialName = spec1.name;
      data.specialDescription = spec1.description;
      data.specialCost = spec1.cooldown;
    }
  }
  if (archetype.special2Id) {
    const spec2 = await db.gameSpecial.findUnique({ where: { id: archetype.special2Id } });
    if (spec2) {
      data.special2Name = spec2.name;
      data.special2Description = spec2.description;
      data.special2Cost = spec2.cooldown;
    }
  }

  // Copy passive
  data.passiveDescription = archetype.passiveDescription || '';

  // Copy starting items (only if character doesn't have its own)
  const charItems = data.startingItems;
  const charItemsEmpty = !charItems || 
    (typeof charItems === 'string' && (charItems === '[]' || charItems === '')) ||
    (Array.isArray(charItems) && charItems.length === 0);
  if (charItemsEmpty) {
    data.startingItems = archetype.startingItems || '[]';
  }

  // Set fallback
  data.archetypeFallback = archetype.name || 'custom';
}

/**
 * GET /api/admin/characters — list all characters from DB
 */
export async function GET() {
  try {
    const rows = await db.gameCharacter.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const characters = rows.map(row => ({
      id: row.id,
      archetypeId: row.archetypeId,
      archetype: row.archetypeFallback,
      name: row.name,
      displayName: row.displayName,
      description: row.description,
      maxHp: row.maxHp,
      atk: row.atk,
      def: row.def,
      spd: row.spd,
      specialName: row.specialName,
      specialDescription: row.specialDescription,
      specialCost: row.specialCost,
      special2Name: row.special2Name,
      special2Description: row.special2Description,
      special2Cost: row.special2Cost,
      passiveDescription: row.passiveDescription,
      portraitEmoji: row.portraitEmoji,
      startingItems: JSON.parse(row.startingItems || '[]'),
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }));

    return NextResponse.json(characters);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Characters]');
  }
}

/**
 * POST /api/admin/characters — create a new character
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name || !body.displayName) {
      return NextResponse.json({ error: 'id, name and displayName are required' }, { status: 400 });
    }

    // Auto-populate from archetype if archetypeId is set
    await applyArchetypeInheritance(body);

    const character = await db.gameCharacter.create({
      data: {
        id: body.id,
        archetypeId: body.archetypeId || null,
        archetypeFallback: body.archetypeFallback ?? body.archetype ?? 'custom',
        name: body.name,
        displayName: body.displayName,
        description: body.description ?? '',
        maxHp: body.maxHp ?? 100,
        atk: body.atk ?? 10,
        def: body.def ?? 10,
        spd: body.spd ?? 10,
        specialName: body.specialName ?? '',
        specialDescription: body.specialDescription ?? '',
        specialCost: body.specialCost ?? 15,
        special2Name: body.special2Name ?? '',
        special2Description: body.special2Description ?? '',
        special2Cost: body.special2Cost ?? 15,
        passiveDescription: body.passiveDescription ?? '',
        portraitEmoji: body.portraitEmoji ?? '🎮',
        startingItems: jsonStr(body.startingItems, '[]'),
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Characters]');
  }
}

/**
 * PUT /api/admin/characters — update an existing character
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, archetype, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Map frontend 'archetype' (string) back to DB 'archetypeFallback' (legacy compat)
    if (archetype !== undefined) {
      data.archetypeFallback = archetype;
    }

    // Auto-populate from archetype if archetypeId is set
    await applyArchetypeInheritance(data);

    // Coerce number fields from string to number
    if (data.maxHp !== undefined) data.maxHp = Number(data.maxHp) || 100;
    if (data.atk !== undefined) data.atk = Number(data.atk) || 0;
    if (data.def !== undefined) data.def = Number(data.def) || 0;
    if (data.spd !== undefined) data.spd = Number(data.spd) || 0;
    if (data.specialCost !== undefined) data.specialCost = Number(data.specialCost) || 0;
    if (data.special2Cost !== undefined) data.special2Cost = Number(data.special2Cost) || 0;
    if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder) || 0;

    // Serialize startingItems if it's not already a string
    if (data.startingItems !== undefined) {
      data.startingItems = jsonStr(data.startingItems, '[]');
    }

    const character = await db.gameCharacter.update({
      where: { id },
      data,
    });

    return NextResponse.json(character);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Characters]');
  }
}

/**
 * DELETE /api/admin/characters?id=xxx — delete a character
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    // Cascade delete associated GameImage records
    await db.gameImage.deleteMany({
      where: { associatedId: id },
    });

    await db.gameCharacter.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Characters]');
  }
}
