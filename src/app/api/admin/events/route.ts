import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/events — list all
export async function GET() {
  try {
    const events = await db.dynamicEvent.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/events — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await db.dynamicEvent.create({ data: body });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/events — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const event = await db.dynamicEvent.update({ where: { id }, data });
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/events — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.dynamicEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
