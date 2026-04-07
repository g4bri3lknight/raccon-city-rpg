import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/documents — list all
export async function GET() {
  try {
    const documents = await db.document.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/documents — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const document = await db.document.create({ data: body });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/documents — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const document = await db.document.update({ where: { id }, data });
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/documents — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
