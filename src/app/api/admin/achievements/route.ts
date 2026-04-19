import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/**
 * GET /api/admin/achievements — list all achievements
 */
export async function GET() {
  try {
    const rows = await db.gameAchievement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const achievements = rows.map(ach => ({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      condition: ach.condition,
      hidden: ach.hidden,
      reward: ach.reward,
      sortOrder: ach.sortOrder,
      createdAt: ach.createdAt,
    }));

    return NextResponse.json(achievements);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Achievements]');
  }
}

/**
 * POST /api/admin/achievements — create a new achievement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name || !body.condition) {
      return NextResponse.json({ error: 'id, name and condition are required' }, { status: 400 });
    }

    const ach = await db.gameAchievement.create({
      data: {
        id: body.id,
        name: body.name,
        description: body.description ?? '',
        icon: body.icon ?? '🏆',
        category: body.category ?? 'combat',
        condition: body.condition,
        hidden: body.hidden ?? false,
        reward: body.reward ?? '',
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(ach);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate id' }, { status: 409 });
    }
    return safeErrorResponse(error, '[Admin Achievements]');
  }
}

/**
 * PUT /api/admin/achievements — update an existing achievement
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
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.icon !== undefined) data.icon = updateFields.icon;
    if (updateFields.category !== undefined) data.category = updateFields.category;
    if (updateFields.condition !== undefined) data.condition = updateFields.condition;
    if (updateFields.hidden !== undefined) data.hidden = updateFields.hidden;
    if (updateFields.reward !== undefined) data.reward = updateFields.reward;
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const ach = await db.gameAchievement.update({
      where: { id },
      data,
    });

    return NextResponse.json(ach);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Achievements]');
  }
}

/**
 * DELETE /api/admin/achievements?id=xxx — delete an achievement
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    await db.gameAchievement.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Achievements]');
  }
}
