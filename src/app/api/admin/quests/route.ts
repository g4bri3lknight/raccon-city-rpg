import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/quests — list all
export async function GET() {
  try {
    const quests = await db.sideQuest.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(quests);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/quests — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quest = await db.sideQuest.create({ data: body });
    return NextResponse.json(quest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/quests — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const quest = await db.sideQuest.update({ where: { id }, data });
    return NextResponse.json(quest);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/quests — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.sideQuest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
