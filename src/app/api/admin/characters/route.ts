import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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
        startingItems: JSON.stringify(body.startingItems ?? []),
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
 * PUT /api/admin/characters?id=xxx — update an existing character
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    // Build update data from provided fields
    const data: Record<string, unknown> = {};
    if (body.archetype !== undefined) data.archetype = body.archetype;
    if (body.name !== undefined) data.name = body.name;
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.description !== undefined) data.description = body.description;
    if (body.maxHp !== undefined) data.maxHp = body.maxHp;
    if (body.atk !== undefined) data.atk = body.atk;
    if (body.def !== undefined) data.def = body.def;
    if (body.spd !== undefined) data.spd = body.spd;
    if (body.specialName !== undefined) data.specialName = body.specialName;
    if (body.specialDescription !== undefined) data.specialDescription = body.specialDescription;
    if (body.specialCost !== undefined) data.specialCost = body.specialCost;
    if (body.special2Name !== undefined) data.special2Name = body.special2Name;
    if (body.special2Description !== undefined) data.special2Description = body.special2Description;
    if (body.special2Cost !== undefined) data.special2Cost = body.special2Cost;
    if (body.passiveDescription !== undefined) data.passiveDescription = body.passiveDescription;
    if (body.portraitEmoji !== undefined) data.portraitEmoji = body.portraitEmoji;
    if (body.startingItems !== undefined) data.startingItems = JSON.stringify(body.startingItems);
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

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
