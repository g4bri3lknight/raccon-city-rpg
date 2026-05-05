import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';

/** Serialize a value to JSON string — skip if already a string (handleCreate already serializes) */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * GET /api/admin/rooms — list all rooms, optionally filter by ?locationId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const where = locationId ? { locationId } : {};

    const rows = await db.gameRoom.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        doorsFrom: {
          include: { toRoom: { select: { id: true, name: true } } },
        },
        doorsTo: {
          include: { fromRoom: { select: { id: true, name: true } } },
        },
      },
    });

    const rooms = rows.map(r => {
      // Merge doorsFrom and doorsTo into a single _doors array
      const _doors = [
        ...r.doorsFrom.map(d => ({
          id: d.id,
          fromRoomId: d.fromRoomId,
          toRoomId: d.toRoomId,
          fromSide: d.fromSide,
          toSide: d.toSide,
          state: d.state,
          requiredItemId: d.requiredItemId,
          lockedMessage: d.lockedMessage,
          puzzle: d.puzzle ? JSON.parse(d.puzzle) : null,
          otherRoomName: d.toRoom.name,
        })),
        ...r.doorsTo.map(d => ({
          id: d.id,
          fromRoomId: d.fromRoomId,
          toRoomId: d.toRoomId,
          fromSide: d.fromSide,
          toSide: d.toSide,
          state: d.state,
          requiredItemId: d.requiredItemId,
          lockedMessage: d.lockedMessage,
          puzzle: d.puzzle ? JSON.parse(d.puzzle) : null,
          otherRoomName: d.fromRoom.name,
        })),
      ];

      return {
        id: r.id,
        locationId: r.locationId,
        name: r.name,
        description: r.description,
        type: r.type,
        icon: r.icon,
        corridorPreset: r.corridorPreset,
        nextRooms: JSON.parse(r.nextRooms || '[]'),
        lockedRooms: JSON.parse(r.lockedRooms || '[]'),
        enemyPool: JSON.parse(r.enemyPool || '[]'),
        itemPool: JSON.parse(r.itemPool || '[]'),
        searchChance: r.searchChance,
        searchMax: r.searchMax,
        npcIds: JSON.parse(r.npcIds || '[]'),
        storyEvent: r.storyEvent ? JSON.parse(r.storyEvent) : null,
        ambientText: JSON.parse(r.ambientText || '[]'),
        sortOrder: r.sortOrder,
        mapRow: r.mapRow,
      mapCol: r.mapCol,
      mapX: r.mapX,
      mapY: r.mapY,
      mapWidth: r.mapWidth,
      mapHeight: r.mapHeight,
      orientation: r.orientation,
      backgroundImage: r.backgroundImage,
      travelCost: r.travelCost,
      createdAt: r.createdAt,
      _doors,
      };
    });

    return NextResponse.json(rooms);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Rooms]');
  }
}

/**
 * POST /api/admin/rooms — create a new room
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name || !body.locationId) {
      return NextResponse.json({ error: 'id, name, and locationId are required' }, { status: 400 });
    }

    const room = await db.gameRoom.create({
      data: {
        id: body.id,
        locationId: body.locationId,
        name: body.name,
        description: body.description ?? '',
        type: body.type ?? 'normal',
        icon: body.icon ?? '🚪',
        nextRooms: jsonStr(body.nextRooms, '[]'),
        lockedRooms: jsonStr(body.lockedRooms, '[]'),
        enemyPool: jsonStr(body.enemyPool, '[]'),
        itemPool: jsonStr(body.itemPool, '[]'),
        searchChance: body.searchChance != null ? Number(body.searchChance) : null,
        searchMax: body.searchMax != null ? Number(body.searchMax) : null,
        npcIds: jsonStr(body.npcIds, '[]'),
        storyEvent: body.storyEvent ? jsonStr(body.storyEvent, '') : '',
        ambientText: jsonStr(body.ambientText, '[]'),
        sortOrder: Number(body.sortOrder) || 0,
        mapRow: body.mapRow != null ? Number(body.mapRow) : null,
        mapCol: body.mapCol != null ? Number(body.mapCol) : null,
        mapX: body.mapX != null ? Number(body.mapX) : null,
        mapY: body.mapY != null ? Number(body.mapY) : null,
        mapWidth: Number(body.mapWidth) || 0,
        mapHeight: Number(body.mapHeight) || 0,
        orientation: body.orientation ?? 'auto',
        backgroundImage: body.backgroundImage ?? '',
        corridorPreset: body.corridorPreset ?? null,
        travelCost: Number(body.travelCost) || 1,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Rooms]');
  }
}

/**
 * PUT /api/admin/rooms — update an existing room
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
    if (updateFields.locationId !== undefined) data.locationId = updateFields.locationId;
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.type !== undefined) data.type = updateFields.type;
    if (updateFields.icon !== undefined) data.icon = updateFields.icon;
    if (updateFields.nextRooms !== undefined) data.nextRooms = jsonStr(updateFields.nextRooms, '[]');
    if (updateFields.lockedRooms !== undefined) data.lockedRooms = jsonStr(updateFields.lockedRooms, '[]');
    if (updateFields.enemyPool !== undefined) data.enemyPool = jsonStr(updateFields.enemyPool, '[]');
    if (updateFields.itemPool !== undefined) data.itemPool = jsonStr(updateFields.itemPool, '[]');
    if (updateFields.searchChance !== undefined) data.searchChance = updateFields.searchChance != null ? Number(updateFields.searchChance) : null;
    if (updateFields.searchMax !== undefined) data.searchMax = updateFields.searchMax != null ? Number(updateFields.searchMax) : null;
    if (updateFields.npcIds !== undefined) data.npcIds = jsonStr(updateFields.npcIds, '[]');
    if (updateFields.storyEvent !== undefined) data.storyEvent = updateFields.storyEvent ? jsonStr(updateFields.storyEvent, '') : '';
    if (updateFields.ambientText !== undefined) data.ambientText = jsonStr(updateFields.ambientText, '[]');
    if (updateFields.sortOrder !== undefined) data.sortOrder = Number(updateFields.sortOrder) || 0;
    if (updateFields.mapRow !== undefined) data.mapRow = updateFields.mapRow != null ? Number(updateFields.mapRow) : null;
    if (updateFields.mapCol !== undefined) data.mapCol = updateFields.mapCol != null ? Number(updateFields.mapCol) : null;
    if (updateFields.mapX !== undefined) data.mapX = updateFields.mapX != null ? Number(updateFields.mapX) : null;
    if (updateFields.mapY !== undefined) data.mapY = updateFields.mapY != null ? Number(updateFields.mapY) : null;
    if (updateFields.mapWidth !== undefined) data.mapWidth = Number(updateFields.mapWidth) || 0;
    if (updateFields.mapHeight !== undefined) data.mapHeight = Number(updateFields.mapHeight) || 0;
    if (updateFields.orientation !== undefined) data.orientation = updateFields.orientation;
    if (updateFields.backgroundImage !== undefined) data.backgroundImage = updateFields.backgroundImage;
    if (updateFields.corridorPreset !== undefined) data.corridorPreset = updateFields.corridorPreset || null;
    if (updateFields.travelCost !== undefined) data.travelCost = Number(updateFields.travelCost) || 1;

    const room = await db.gameRoom.update({
      where: { id },
      data,
    });

    return NextResponse.json(room);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Rooms]');
  }
}

/**
 * DELETE /api/admin/rooms?id=xxx — delete a room
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    await db.gameRoom.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Rooms]');
  }
}
