import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/endings — list all endings
 */
export async function GET() {
  try {
    const rows = await db.gameEnding.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const endings = rows.map(e => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      description: e.description,
      icon: e.icon,
      color: e.color,
      requirements: e.requirements,
      priority: e.priority,
      sortOrder: e.sortOrder,
      createdAt: e.createdAt,
    }));

    return NextResponse.json(endings);
  } catch (error) {
    console.error('[admin/endings] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/endings — create a new ending
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.title) {
      return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }

    const ending = await db.gameEnding.create({
      data: {
        id: body.id,
        title: body.title,
        subtitle: body.subtitle ?? '',
        description: body.description ?? '',
        icon: body.icon ?? '🏆',
        color: body.color ?? '#22c55e',
        requirements: body.requirements ?? '[]',
        priority: body.priority ?? 0,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(ending);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate id' }, { status: 409 });
    }
    console.error('[admin/endings] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/endings — update an existing ending
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updateFields.title !== undefined) data.title = updateFields.title;
    if (updateFields.subtitle !== undefined) data.subtitle = updateFields.subtitle;
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.icon !== undefined) data.icon = updateFields.icon;
    if (updateFields.color !== undefined) data.color = updateFields.color;
    if (updateFields.requirements !== undefined) data.requirements = updateFields.requirements;
    if (updateFields.priority !== undefined) data.priority = updateFields.priority;
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;

    const ending = await db.gameEnding.update({
      where: { id },
      data,
    });

    return NextResponse.json(ending);
  } catch (error) {
    console.error('[admin/endings] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/endings?id=xxx — delete an ending
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    await db.gameEnding.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/endings] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
