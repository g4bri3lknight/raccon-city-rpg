import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/images — list all (excluding binary data from list)
export async function GET() {
  try {
    const images = await db.gameImage.findMany({ orderBy: { createdAt: 'asc' }, select: {
      id: true, name: true, refKey: true, filePath: true, category: true,
      altText: true, associatedId: true, sortOrder: true, mimeType: true, createdAt: true,
      data: true,
    }});
    const safe = images.map(img => ({
      ...img,
      data: img.data ? `[BLOB: ${img.data.length} bytes]` : null,
    }));
    return NextResponse.json(safe);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/admin/images — create metadata only (use /upload for binary)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data: _d, mimeType: _m, ...safeBody } = body;
    const image = await db.gameImage.create({ data: safeBody });
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/images — update metadata only (use /upload for binary)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, data: _d, mimeType: _m, ...safeData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const image = await db.gameImage.update({ where: { id }, data: safeData });
    return NextResponse.json(image);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/images — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.gameImage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
