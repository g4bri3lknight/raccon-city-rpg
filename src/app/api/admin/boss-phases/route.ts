import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * GET /api/admin/boss-phases — list all boss phases
 */
export async function GET() {
  try {
    const rows = await db.gameBossPhase.findMany({
      orderBy: [{ enemyId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const phases = rows.map(phase => ({
      id: phase.id,
      enemyId: phase.enemyId,
      name: phase.name,
      hpThreshold: phase.hpThreshold,
      hpMultiplier: phase.hpMultiplier,
      atkMultiplier: phase.atkMultiplier,
      defMultiplier: phase.defMultiplier,
      spdMultiplier: phase.spdMultiplier,
      newAbilities: JSON.parse(phase.newAbilities || '[]'),
      message: phase.message,
      sortOrder: phase.sortOrder,
      createdAt: phase.createdAt,
    }));

    return NextResponse.json(phases);
  } catch (error) {
    console.error('[admin/boss-phases] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/boss-phases — create a new boss phase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.enemyId || !body.name) {
      return NextResponse.json({ error: 'id, enemyId and name are required' }, { status: 400 });
    }

    const phase = await db.gameBossPhase.create({
      data: {
        id: body.id,
        enemyId: body.enemyId,
        name: body.name,
        hpThreshold: body.hpThreshold ?? 0.5,
        hpMultiplier: body.hpMultiplier ?? 1.0,
        atkMultiplier: body.atkMultiplier ?? 1.0,
        defMultiplier: body.defMultiplier ?? 1.0,
        spdMultiplier: body.spdMultiplier ?? 1.0,
        newAbilities: jsonStr(body.newAbilities, '[]'),
        message: body.message ?? '',
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(phase);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate id' }, { status: 409 });
    }
    console.error('[admin/boss-phases] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/boss-phases — update an existing boss phase
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updateFields.enemyId !== undefined) data.enemyId = updateFields.enemyId;
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.hpThreshold !== undefined) data.hpThreshold = updateFields.hpThreshold;
    if (updateFields.hpMultiplier !== undefined) data.hpMultiplier = updateFields.hpMultiplier;
    if (updateFields.atkMultiplier !== undefined) data.atkMultiplier = updateFields.atkMultiplier;
    if (updateFields.defMultiplier !== undefined) data.defMultiplier = updateFields.defMultiplier;
    if (updateFields.spdMultiplier !== undefined) data.spdMultiplier = updateFields.spdMultiplier;
    if (updateFields.newAbilities !== undefined) data.newAbilities = jsonStr(updateFields.newAbilities, '[]');
    if (updateFields.message !== undefined) data.message = updateFields.message;
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const phase = await db.gameBossPhase.update({
      where: { id },
      data,
    });

    return NextResponse.json(phase);
  } catch (error) {
    console.error('[admin/boss-phases] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/boss-phases?id=xxx — delete a boss phase
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    await db.gameBossPhase.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/boss-phases] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
