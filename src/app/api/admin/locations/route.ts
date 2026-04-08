import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/locations — list all locations from DB
 */
export async function GET() {
  try {
    const rows = await db.gameLocation.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const locations = rows.map(loc => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      backgroundImage: `/api/media/image?id=bg_${loc.id}`,
      encounterRate: loc.encounterRate,
      enemyPool: JSON.parse(loc.enemyPool || '[]'),
      itemPool: JSON.parse(loc.itemPool || '[]'),
      storyEvent: loc.storyEvent ? JSON.parse(loc.storyEvent) : null,
      nextLocations: JSON.parse(loc.nextLocations || '[]'),
      isBossArea: loc.isBossArea,
      bossId: loc.bossId ?? null,
      ambientText: JSON.parse(loc.ambientText || '[]'),
      lockedLocations: JSON.parse(loc.lockedLocations || '[]'),
      subAreas: JSON.parse(loc.subAreas || '[]'),
      sortOrder: loc.sortOrder,
      mapRow: loc.mapRow,
      mapCol: loc.mapCol,
      mapIcon: loc.mapIcon,
      mapDanger: loc.mapDanger,
      hasSubAreas: (JSON.parse(loc.subAreas || '[]') as unknown[]).length > 0,
      hasStoryEvent: !!loc.storyEvent && loc.storyEvent !== '',
    }));

    return NextResponse.json(locations);
  } catch (error) {
    console.error('[admin/locations] GET failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/locations — create a new location
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const location = await db.gameLocation.create({
      data: {
        id: body.id,
        name: body.name,
        description: body.description ?? '',
        encounterRate: body.encounterRate ?? 0,
        enemyPool: JSON.stringify(body.enemyPool ?? []),
        itemPool: JSON.stringify(body.itemPool ?? []),
        storyEvent: body.storyEvent ? JSON.stringify(body.storyEvent) : '',
        nextLocations: JSON.stringify(body.nextLocations ?? []),
        isBossArea: body.isBossArea ?? false,
        bossId: body.bossId ?? null,
        ambientText: JSON.stringify(body.ambientText ?? []),
        lockedLocations: JSON.stringify(body.lockedLocations ?? []),
        subAreas: JSON.stringify(body.subAreas ?? []),
        sortOrder: body.sortOrder ?? 0,
        mapRow: body.mapRow ?? null,
        mapCol: body.mapCol ?? null,
        mapIcon: body.mapIcon ?? null,
        mapDanger: body.mapDanger ?? null,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('[admin/locations] POST failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/locations — update an existing location
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data from provided fields
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.encounterRate !== undefined) data.encounterRate = body.encounterRate;
    if (body.enemyPool !== undefined) data.enemyPool = JSON.stringify(body.enemyPool);
    if (body.itemPool !== undefined) data.itemPool = JSON.stringify(body.itemPool);
    if (body.storyEvent !== undefined) data.storyEvent = body.storyEvent ? JSON.stringify(body.storyEvent) : '';
    if (body.nextLocations !== undefined) data.nextLocations = JSON.stringify(body.nextLocations);
    if (body.isBossArea !== undefined) data.isBossArea = body.isBossArea;
    if (body.bossId !== undefined) data.bossId = body.bossId;
    if (body.ambientText !== undefined) data.ambientText = JSON.stringify(body.ambientText);
    if (body.lockedLocations !== undefined) data.lockedLocations = JSON.stringify(body.lockedLocations);
    if (body.subAreas !== undefined) data.subAreas = JSON.stringify(body.subAreas);
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.mapRow !== undefined) data.mapRow = body.mapRow;
    if (body.mapCol !== undefined) data.mapCol = body.mapCol;
    if (body.mapIcon !== undefined) data.mapIcon = body.mapIcon;
    if (body.mapDanger !== undefined) data.mapDanger = body.mapDanger;

    const location = await db.gameLocation.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('[admin/locations] PUT failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/locations?id=xxx — delete a location
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    // Delete associated GameImage records
    await db.gameImage.deleteMany({
      where: { associatedId: id },
    });

    // Delete the location
    await db.gameLocation.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/locations] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
