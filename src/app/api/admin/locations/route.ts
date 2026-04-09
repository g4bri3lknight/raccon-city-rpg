import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Serialize a value to JSON string — skip if already a string (handleCreate already serializes) */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

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
      searchChance: loc.searchChance,
      docChance: loc.docChance,
      searchMax: loc.searchMax,
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
        enemyPool: jsonStr(body.enemyPool, '[]'),
        itemPool: jsonStr(body.itemPool, '[]'),
        storyEvent: body.storyEvent ? jsonStr(body.storyEvent, '') : '',
        nextLocations: jsonStr(body.nextLocations, '[]'),
        isBossArea: body.isBossArea ?? false,
        bossId: body.bossId ?? null,
        ambientText: jsonStr(body.ambientText, '[]'),
        lockedLocations: jsonStr(body.lockedLocations, '[]'),
        subAreas: jsonStr(body.subAreas, '[]'),
        sortOrder: body.sortOrder ?? 0,
        searchChance: body.searchChance != null ? body.searchChance : null,
        docChance: body.docChance != null ? body.docChance : null,
        searchMax: body.searchMax != null ? body.searchMax : null,
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
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data from provided fields, safely serializing JSON values
    const data: Record<string, unknown> = {};
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.encounterRate !== undefined) data.encounterRate = updateFields.encounterRate;
    if (updateFields.enemyPool !== undefined) data.enemyPool = jsonStr(updateFields.enemyPool, '[]');
    if (updateFields.itemPool !== undefined) data.itemPool = jsonStr(updateFields.itemPool, '[]');
    if (updateFields.storyEvent !== undefined) data.storyEvent = updateFields.storyEvent ? jsonStr(updateFields.storyEvent, '') : '';
    if (updateFields.nextLocations !== undefined) data.nextLocations = jsonStr(updateFields.nextLocations, '[]');
    if (updateFields.isBossArea !== undefined) data.isBossArea = updateFields.isBossArea;
    if (updateFields.bossId !== undefined) data.bossId = updateFields.bossId;
    if (updateFields.ambientText !== undefined) data.ambientText = jsonStr(updateFields.ambientText, '[]');
    if (updateFields.lockedLocations !== undefined) data.lockedLocations = jsonStr(updateFields.lockedLocations, '[]');
    if (updateFields.subAreas !== undefined) data.subAreas = jsonStr(updateFields.subAreas, '[]');
    if (updateFields.sortOrder !== undefined) data.sortOrder = updateFields.sortOrder;
    if (updateFields.searchChance !== undefined) data.searchChance = updateFields.searchChance != null ? updateFields.searchChance : null;
    if (updateFields.docChance !== undefined) data.docChance = updateFields.docChance != null ? updateFields.docChance : null;
    if (updateFields.searchMax !== undefined) data.searchMax = updateFields.searchMax != null ? updateFields.searchMax : null;
    if (updateFields.mapRow !== undefined) data.mapRow = updateFields.mapRow;
    if (updateFields.mapCol !== undefined) data.mapCol = updateFields.mapCol;
    if (updateFields.mapIcon !== undefined) data.mapIcon = updateFields.mapIcon;
    if (updateFields.mapDanger !== undefined) data.mapDanger = updateFields.mapDanger;

    const location = await db.gameLocation.update({
      where: { id },
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

    await db.gameLocation.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error('[admin/locations] DELETE failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
