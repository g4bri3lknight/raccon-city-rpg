import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/items — list all
export async function GET() {
  try {
    const items = await db.item.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/items — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await db.item.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/items — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const item = await db.item.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/items — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.item.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
