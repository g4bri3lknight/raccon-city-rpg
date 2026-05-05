import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/** Fields that are read-only or computed — must be stripped before Prisma write */
const READONLY_KEYS = new Set([
  'createdAt', 'updatedAt',
  'archetypeName',       // computed from archetype relation in GET
  'archetype',            // frontend sends legacy archetypeFallback as 'archetype'
]);

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
      include: { archetype: { select: { id: true, name: true, displayName: true, portraitEmoji: true } } },
    });

    const characters = rows.map(row => ({
      id: row.id,
      archetypeId: row.archetypeId,
      archetypeName: row.archetype?.displayName || row.archetype?.name || null,
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

    // Extract archetypeId — handle as relation
    const archetypeId = body.archetypeId || null;

    const character = await db.gameCharacter.create({
      data: {
        id: body.id,
        ...(archetypeId ? { archetype: { connect: { id: archetypeId } } } : {}),
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
    const { id, archetype, ...rawData } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Map frontend 'archetype' (string) back to DB 'archetypeFallback' (legacy compat)
    if (archetype !== undefined) {
      rawData.archetypeFallback = archetype;
    }

    // Auto-populate from archetype if archetypeId is set
    await applyArchetypeInheritance(rawData);

    // Strip read-only / computed fields
    for (const key of READONLY_KEYS) {
      delete rawData[key];
    }

    // Coerce number fields
    if (rawData.maxHp !== undefined) rawData.maxHp = Number(rawData.maxHp) || 100;
    if (rawData.atk !== undefined) rawData.atk = Number(rawData.atk) || 0;
    if (rawData.def !== undefined) rawData.def = Number(rawData.def) || 0;
    if (rawData.spd !== undefined) rawData.spd = Number(rawData.spd) || 0;
    if (rawData.specialCost !== undefined) rawData.specialCost = Number(rawData.specialCost) || 0;
    if (rawData.special2Cost !== undefined) rawData.special2Cost = Number(rawData.special2Cost) || 0;
    if (rawData.sortOrder !== undefined) rawData.sortOrder = Number(rawData.sortOrder) || 0;

    // Serialize startingItems
    if (rawData.startingItems !== undefined) {
      rawData.startingItems = jsonStr(rawData.startingItems, '[]');
    }

    // Extract archetypeId — handle as Prisma relation
    const archetypeId = rawData.archetypeId as string | null | undefined;
    delete rawData.archetypeId;

    const character = await db.gameCharacter.update({
      where: { id },
      data: {
        ...rawData,
        // Handle archetype relation separately
        ...(archetypeId
          ? { archetype: { connect: { id: archetypeId } } }
          : archetypeId === null || archetypeId === ''
            ? { archetype: { disconnect: true } }
            : {}
        ),
      },
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
