import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * GET /api/admin/secret-rooms — list all secret rooms
 */
export async function GET() {
  try {
    const rows = await db.secretRoom.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const rooms = rows.map(room => ({
      id: room.id,
      locationId: room.locationId,
      name: room.name,
      description: room.description,
      discoveryMethod: room.discoveryMethod,
      requiredDocumentId: room.requiredDocumentId ?? null,
      requiredNpcQuestId: room.requiredNpcQuestId ?? null,
      searchChance: room.searchChance,
      hint: room.hint,
      lootTable: JSON.parse(room.lootTable || '[]'),
      uniqueItemId: room.uniqueItemId ?? null,
      uniqueItemQuantity: room.uniqueItemQuantity ?? null,
      sortOrder: room.sortOrder,
      createdAt: room.createdAt,
    }));

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('[admin/secret-rooms] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/secret-rooms — create a new secret room
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const room = await db.secretRoom.create({
      data: {
        id: body.id,
        locationId: body.locationId ?? '',
        name: body.name,
        description: body.description ?? '',
        discoveryMethod: body.discoveryMethod ?? 'search',
        requiredDocumentId: body.requiredDocumentId ?? null,
        requiredNpcQuestId: body.requiredNpcQuestId ?? null,
        searchChance: body.searchChance ?? 15,
        hint: body.hint ?? '',
        lootTable: jsonStr(body.lootTable, '[]'),
        uniqueItemId: body.uniqueItemId ?? null,
        uniqueItemQuantity: body.uniqueItemQuantity ?? null,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('[admin/secret-rooms] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/secret-rooms — update an existing secret room
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data from provided fields, safely serializing JSON values
    const data: Record<string, unknown> = {};
    if (updateFields.locationId !== undefined) data.locationId = updateFields.locationId;
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.discoveryMethod !== undefined) data.discoveryMethod = updateFields.discoveryMethod;
    if (updateFields.requiredDocumentId !== undefined) data.requiredDocumentId = updateFields.requiredDocumentId ?? null;
    if (updateFields.requiredNpcQuestId !== undefined) data.requiredNpcQuestId = updateFields.requiredNpcQuestId ?? null;
    if (updateFields.searchChance !== undefined) data.searchChance = updateFields.searchChance;
    if (updateFields.hint !== undefined) data.hint = updateFields.hint;
    if (updateFields.lootTable !== undefined) data.lootTable = jsonStr(updateFields.lootTable, '[]');
    if (updateFields.uniqueItemId !== undefined) data.uniqueItemId = updateFields.uniqueItemId ?? null;
    if (updateFields.uniqueItemQuantity !== undefined) data.uniqueItemQuantity = updateFields.uniqueItemQuantity ?? null;
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const room = await db.secretRoom.update({
      where: { id },
      data,
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('[admin/secret-rooms] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/secret-rooms?id=xxx — delete a secret room
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    // Delete associated GameImage records
    await db.gameImage.deleteMany({
      where: { associatedId: id },
    });

    await db.secretRoom.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/secret-rooms] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
