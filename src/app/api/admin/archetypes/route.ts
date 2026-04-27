import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/archetypes
export async function GET() {
  const archetypes = await db.gameArchetype.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(archetypes);
}

// POST /api/admin/archetypes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const archetype = await db.gameArchetype.create({ data: body });
  return NextResponse.json(archetype);
}

// PUT /api/admin/archetypes
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
  const updated = await db.gameArchetype.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/admin/archetypes
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
  await db.gameArchetype.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
