import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * GET /api/admin/specials — list all special abilities from DB
 */
export async function GET() {
  try {
    const rows = await db.gameSpecial.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const specials = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      targetType: row.targetType,
      cooldown: row.cooldown,
      category: row.category,
      effects: row.effects ? JSON.parse(row.effects) : [],
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }));

    return NextResponse.json(specials);
  } catch (error) {
    console.error('[admin/specials] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/specials — create a new special ability
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const special = await db.gameSpecial.create({
      data: {
        id: body.id,
        name: body.name,
        description: body.description ?? '',
        icon: body.icon ?? '',
        targetType: body.targetType ?? 'enemy',
        cooldown: body.cooldown ?? 2,
        category: body.category ?? 'offensive',
        effects: jsonStr(body.effects, '[]'),
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(special);
  } catch (error) {
    console.error('[admin/specials] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/specials — update an existing special ability
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.icon !== undefined) data.icon = updateFields.icon;
    if (updateFields.targetType !== undefined) data.targetType = updateFields.targetType;
    if (updateFields.cooldown !== undefined) data.cooldown = updateFields.cooldown;
    if (updateFields.category !== undefined) data.category = updateFields.category;
    if (updateFields.effects !== undefined) data.effects = jsonStr(updateFields.effects, '[]');
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const special = await db.gameSpecial.update({
      where: { id },
      data,
    });

    return NextResponse.json(special);
  } catch (error) {
    console.error('[admin/specials] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/specials?id=xxx — delete a special ability
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

    await db.gameSpecial.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/specials] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
