import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/enemies — list all
export async function GET() {
  try {
    const enemies = await db.gameEnemy.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(enemies);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/enemies — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enemy = await db.gameEnemy.create({ data: body });
    return NextResponse.json(enemy, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/enemies — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const enemy = await db.gameEnemy.update({ where: { id }, data });
    return NextResponse.json(enemy);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/enemies — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    // Cascade delete associated GameImage records
    await db.gameImage.deleteMany({ where: { associatedId: id } });
    await db.gameEnemy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
