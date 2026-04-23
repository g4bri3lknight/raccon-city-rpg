import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
// GET /api/admin/documents — list all
export async function GET() {
  try {
    const documents = await db.document.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(documents);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Documents]');
  }
}

// POST /api/admin/documents — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.isSecret !== undefined) body.isSecret = !!body.isSecret;
    const document = await db.document.create({ data: body });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Documents]');
  }
}

// PUT /api/admin/documents — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    if (data.isSecret !== undefined) data.isSecret = !!data.isSecret;
    const document = await db.document.update({ where: { id }, data });
    return NextResponse.json(document);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Documents]');
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
    return safeErrorResponse(error, '[Admin Documents]');
  }
}
