import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/npcs — list all NPCs from DB
 */
export async function GET() {
  try {
    const rows = await db.gameNPC.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const npcs = rows.map(row => ({
      id: row.id,
      name: row.name,
      portrait: row.portrait,
      locationId: row.locationId,
      greeting: row.greeting,
      dialogues: JSON.parse(row.dialogues || '[]'),
      farewell: row.farewell,
      questId: row.questId ?? null,
      tradeInventory: JSON.parse(row.tradeInventory || '[]'),
      questCompletedDialogue: JSON.parse(row.questCompletedDialogue || '[]'),
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }));

    return NextResponse.json(npcs);
  } catch (error) {
    console.error('[admin/npcs] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/npcs — create a new NPC
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const npc = await db.gameNPC.create({
      data: {
        id: body.id,
        name: body.name,
        portrait: body.portrait ?? '',
        locationId: body.locationId ?? '',
        greeting: body.greeting ?? '',
        dialogues: JSON.stringify(body.dialogues ?? []),
        farewell: body.farewell ?? '',
        questId: body.questId ?? null,
        tradeInventory: JSON.stringify(body.tradeInventory ?? []),
        questCompletedDialogue: JSON.stringify(body.questCompletedDialogue ?? []),
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(npc);
  } catch (error) {
    console.error('[admin/npcs] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/npcs?id=xxx — update an existing NPC
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
    if (body.name !== undefined) data.name = body.name;
    if (body.portrait !== undefined) data.portrait = body.portrait;
    if (body.locationId !== undefined) data.locationId = body.locationId;
    if (body.greeting !== undefined) data.greeting = body.greeting;
    if (body.dialogues !== undefined) data.dialogues = JSON.stringify(body.dialogues);
    if (body.farewell !== undefined) data.farewell = body.farewell;
    if (body.questId !== undefined) data.questId = body.questId;
    if (body.tradeInventory !== undefined) data.tradeInventory = JSON.stringify(body.tradeInventory);
    if (body.questCompletedDialogue !== undefined) data.questCompletedDialogue = JSON.stringify(body.questCompletedDialogue);
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const npc = await db.gameNPC.update({
      where: { id },
      data,
    });

    return NextResponse.json(npc);
  } catch (error) {
    console.error('[admin/npcs] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/npcs?id=xxx — delete an NPC
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

    await db.gameNPC.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/npcs] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
