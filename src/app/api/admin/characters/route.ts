import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
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
      archetype: row.archetype,
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
    console.error('[admin/characters] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
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

    const character = await db.gameCharacter.create({
      data: {
        id: body.id,
        archetype: body.archetype ?? 'custom',
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
    console.error('[admin/characters] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/characters — update an existing character
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

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
    console.error('[admin/characters] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    console.error('[admin/characters] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
