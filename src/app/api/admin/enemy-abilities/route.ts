import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/enemy-abilities — list all
export async function GET() {
  try {
    const rows = await db.gameEnemyAbility.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('[enemy-abilities GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/enemy-abilities — create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, power, chance, statusType, statusChance, statusDuration, sortOrder } = body;
    if (!id || !name) {
      return NextResponse.json({ error: 'id e name sono obbligatori' }, { status: 400 });
    }
    const row = await db.gameEnemyAbility.create({
      data: {
        id,
        name,
        description: description ?? '',
        power: power ?? 1.0,
        chance: chance ?? 50,
        statusType: statusType ?? '',
        statusChance: statusChance ?? 0,
        statusDuration: statusDuration ?? 0,
        sortOrder: sortOrder ?? 0,
      },
    });
    return NextResponse.json(row);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: `ID "${error.meta?.target?.[0]}" già esistente` }, { status: 409 });
    }
    console.error('[enemy-abilities POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/enemy-abilities — update
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });
    }
    const row = await db.gameEnemyAbility.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.power !== undefined && { power: Number(data.power) }),
        ...(data.chance !== undefined && { chance: Number(data.chance) }),
        ...(data.statusType !== undefined && { statusType: data.statusType }),
        ...(data.statusChance !== undefined && { statusChance: Number(data.statusChance) }),
        ...(data.statusDuration !== undefined && { statusDuration: Number(data.statusDuration) }),
        ...(data.sortOrder !== undefined && { sortOrder: Number(data.sortOrder) }),
      },
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error('[enemy-abilities PUT]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/enemy-abilities?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });
    }
    await db.gameEnemyAbility.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[enemy-abilities DELETE]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
