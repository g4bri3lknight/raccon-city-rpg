import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/**
 * GET /api/admin/avatars — list all avatars
 */
export async function GET() {
  try {
    const rows = await db.gameAvatar.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const avatars = rows.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt,
    }));

    return NextResponse.json(avatars);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Avatars]');
  }
}

/**
 * POST /api/admin/avatars — create a new avatar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const avatar = await db.gameAvatar.create({
      data: {
        id: body.id,
        name: body.name,
        emoji: body.emoji ?? '👤',
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(avatar);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate id' }, { status: 409 });
    }
    return safeErrorResponse(error, '[Admin Avatars]');
  }
}

/**
 * PUT /api/admin/avatars — update an existing avatar
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.emoji !== undefined) data.emoji = updateFields.emoji;
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const avatar = await db.gameAvatar.update({
      where: { id },
      data,
    });

    return NextResponse.json(avatar);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Avatars]');
  }
}

/**
 * DELETE /api/admin/avatars?id=xxx — delete an avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    await db.gameAvatar.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Avatars]');
  }
}
