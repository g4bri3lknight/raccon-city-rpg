import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/sounds — list all (excluding binary data from list)
export async function GET() {
  try {
    const sounds = await db.gameSound.findMany({ orderBy: { createdAt: 'asc' }, select: {
      id: true, name: true, refKey: true, filePath: true, category: true,
      volume: true, loopable: true, mimeType: true, createdAt: true,
      // Include a flag for whether data exists
      data: true,
    }});
    // Return data but mark as boolean (has data or not) for the list
    const safe = sounds.map(s => ({
      ...s,
      data: s.data ? `[BLOB: ${s.data.length} bytes]` : null,
    }));
    return NextResponse.json(safe);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/sounds — create metadata only (use /upload for binary)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data: _d, mimeType: _m, ...safeBody } = body;
    const sound = await db.gameSound.create({ data: safeBody });
    return NextResponse.json(sound, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/sounds — update metadata only (use /upload for binary)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, data: _d, mimeType: _m, ...safeData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const sound = await db.gameSound.update({ where: { id }, data: safeData });
    return NextResponse.json(sound);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/sounds — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.gameSound.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
