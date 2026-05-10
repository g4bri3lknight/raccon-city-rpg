import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
import { calculateDangerLevel } from '@/lib/danger-calculator';

/** Calculate danger level from enemy pool for a specific location.
 *  Queries the DB for enemy stats matching the given enemy IDs. */
async function calcAutoDanger(enemyPoolStr: string): Promise<number> {
  let poolIds: string[] = [];
  try { poolIds = JSON.parse(enemyPoolStr || '[]'); } catch { return 0; }
  if (!poolIds || poolIds.length === 0) return 0;

  const enemies = await db.gameEnemy.findMany({
    where: { id: { in: poolIds } },
    select: { id: true, maxHp: true, atk: true, def: true, isBoss: true, abilities: true },
  });

  const enemyMap: Record<string, { maxHp: number; atk: number; def: number; abilities: unknown[]; isBoss: boolean }> = {};
  for (const e of enemies) {
    let abLen = 0;
    try { abLen = JSON.parse(e.abilities || '[]').length; } catch { abLen = 0; }
    enemyMap[e.id] = { maxHp: e.maxHp, atk: e.atk, def: e.def, abilities: new Array(abLen).fill(null), isBoss: e.isBoss };
  }

  return calculateDangerLevel(poolIds, enemyMap);
}
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
      include: {
        _count: { select: { rooms: true } },
      },
    });

    const locations = rows.map(loc => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      backgroundImage: `/api/media/image?id=bg_${loc.id}`,
      encounterRate: loc.encounterRate,
      nextLocations: JSON.parse(loc.nextLocations || '[]'),
      isBossArea: loc.isBossArea,
      bossId: loc.bossId ?? null,
      lockedLocations: JSON.parse(loc.lockedLocations || '[]'),
      sortOrder: loc.sortOrder,
      mapRow: loc.mapRow,
      mapCol: loc.mapCol,
      mapX: loc.mapX,
      mapY: loc.mapY,
      mapIcon: loc.mapIcon,
      mapDanger: loc.mapDanger,
      mapDangerAuto: loc.mapDangerAuto,
      shortName: loc.shortName ?? null,
      _roomCount: loc._count.rooms,
    }));

    return NextResponse.json(locations);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Locations]');
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

    // Handle mapDanger: if 'auto' (-1) is selected, calculate from enemy pool
    let mapDanger = 0;
    let mapDangerAuto = false;
    const rawDanger = String(body.mapDanger ?? '0');
    if (rawDanger === '-1' || rawDanger === 'auto') {
      const enemyPoolStr = jsonStr(body.enemyPool, '[]');
      mapDanger = await calcAutoDanger(enemyPoolStr);
      mapDangerAuto = true;
    } else {
      mapDanger = parseInt(rawDanger, 10) || 0;
    }

    const location = await db.gameLocation.create({
      data: {
        id: body.id,
        name: body.name,
        description: body.description ?? '',
        encounterRate: Number(body.encounterRate) || 0,
        enemyPool: jsonStr(body.enemyPool, '[]'),
        itemPool: jsonStr(body.itemPool, '[]'),
        storyEvent: body.storyEvent ? jsonStr(body.storyEvent, '') : '',
        nextLocations: jsonStr(body.nextLocations, '[]'),
        isBossArea: !!body.isBossArea,
        bossId: body.bossId ?? null,
        ambientText: jsonStr(body.ambientText, '[]'),
        lockedLocations: jsonStr(body.lockedLocations, '[]'),
        subAreas: jsonStr(body.subAreas, '[]'),
        sortOrder: Number(body.sortOrder) || 0,
        searchChance: body.searchChance != null ? Number(body.searchChance) : null,
        docChance: body.docChance != null ? Number(body.docChance) : null,
        searchMax: body.searchMax != null ? Number(body.searchMax) : null,
        mapRow: body.mapRow != null ? Number(body.mapRow) : null,
        mapCol: body.mapCol != null ? Number(body.mapCol) : null,
        mapIcon: body.mapIcon ?? null,
        mapDanger,
        mapDangerAuto,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Locations]');
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

    // Handle mapDanger: if 'auto' (-1) is selected, calculate from enemy pool;
    // otherwise store the manual value directly.
    if (updateFields.mapDanger !== undefined) {
      const rawVal = String(updateFields.mapDanger);
      if (rawVal === '-1' || rawVal === 'auto') {
        // Auto mode: calculate from enemy pool
        const enemyPoolStr = updateFields.enemyPool != null
          ? (typeof updateFields.enemyPool === 'string' ? updateFields.enemyPool : JSON.stringify(updateFields.enemyPool))
          : (await db.gameLocation.findUnique({ where: { id }, select: { enemyPool: true } }))?.enemyPool ?? '[]';
        data.mapDanger = await calcAutoDanger(enemyPoolStr);
        data.mapDangerAuto = true;
      } else {
        data.mapDanger = parseInt(rawVal, 10) || 0;
        data.mapDangerAuto = false;
      }
    }

    // If enemy pool changes and the location is in auto mode, recalculate danger
    if (updateFields.enemyPool !== undefined && !updateFields.mapDanger) {
      const loc = await db.gameLocation.findUnique({ where: { id }, select: { mapDangerAuto: true } });
      if (loc?.mapDangerAuto) {
        const enemyPoolStr = typeof updateFields.enemyPool === 'string' ? updateFields.enemyPool : JSON.stringify(updateFields.enemyPool);
        data.mapDanger = await calcAutoDanger(enemyPoolStr);
      }
    }

    const location = await db.gameLocation.update({
      where: { id },
      data,
    });

    return NextResponse.json(location);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Locations]');
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
    return safeErrorResponse(error, '[Admin Locations]');
  }
}
