import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/** Serialize a value to JSON string — skip if already a string (handleCreate already serializes) */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

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
      greeting: row.greeting,
      dialogues: JSON.parse(row.dialogues || '[]'),
      farewell: row.farewell,
      tradeInventory: JSON.parse(row.tradeInventory || '[]'),
      questCompletedDialogue: JSON.parse(row.questCompletedDialogue || '[]'),
      sortOrder: row.sortOrder,
      badgeLabel: row.badgeLabel,
      badgeIcon: row.badgeIcon,
      badgeColor: row.badgeColor,
      dynamicDialogues: row.dynamicDialogues ? JSON.parse(row.dynamicDialogues) : [],
      createdAt: row.createdAt,
    }));

    return NextResponse.json(npcs);
  } catch (error) {
    return safeErrorResponse(error, '[Admin NPCs]');
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
        greeting: body.greeting ?? '',
        dialogues: jsonStr(body.dialogues, '[]'),
        farewell: body.farewell ?? '',
        tradeInventory: jsonStr(body.tradeInventory, '[]'),
        questCompletedDialogue: jsonStr(body.questCompletedDialogue, '[]'),
        sortOrder: body.sortOrder ?? 0,
        badgeLabel: body.badgeLabel ?? '',
        badgeIcon: body.badgeIcon ?? '',
        badgeColor: body.badgeColor ?? '',
        dynamicDialogues: jsonStr(body.dynamicDialogues, '[]'),
      },
    });

    return NextResponse.json(npc);
  } catch (error) {
    return safeErrorResponse(error, '[Admin NPCs]');
  }
}

/**
 * PUT /api/admin/npcs — update an existing NPC
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data from provided fields
    const data: Record<string, unknown> = {};
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.portrait !== undefined) data.portrait = updateFields.portrait;
    if (updateFields.greeting !== undefined) data.greeting = updateFields.greeting;
    if (updateFields.dialogues !== undefined) data.dialogues = jsonStr(updateFields.dialogues, '[]');
    if (updateFields.farewell !== undefined) data.farewell = updateFields.farewell;
    if (updateFields.tradeInventory !== undefined) data.tradeInventory = jsonStr(updateFields.tradeInventory, '[]');
    if (updateFields.questCompletedDialogue !== undefined) data.questCompletedDialogue = jsonStr(updateFields.questCompletedDialogue, '[]');
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;
    if (updateFields.badgeLabel !== undefined) data.badgeLabel = updateFields.badgeLabel;
    if (updateFields.badgeIcon !== undefined) data.badgeIcon = updateFields.badgeIcon;
    if (updateFields.badgeColor !== undefined) data.badgeColor = updateFields.badgeColor;
    if (updateFields.dynamicDialogues !== undefined) data.dynamicDialogues = jsonStr(updateFields.dynamicDialogues, '[]');

    const npc = await db.gameNPC.update({
      where: { id },
      data,
    });

    return NextResponse.json(npc);
  } catch (error) {
    return safeErrorResponse(error, '[Admin NPCs]');
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
    return safeErrorResponse(error, '[Admin NPCs]');
  }
}
