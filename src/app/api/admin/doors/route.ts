import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

const VALID_SIDES = ['north', 'south', 'east', 'west'] as const;
const VALID_STATES = ['open', 'key_locked', 'locked', 'inaccessible'] as const;

function validateDoor(body: Record<string, unknown>): string | null {
  if (!body.fromRoomId || !body.toRoomId) return 'fromRoomId e toRoomId sono obbligatori';
  if (body.fromRoomId === body.toRoomId) return 'fromRoomId e toRoomId devono essere diversi';
  if (!VALID_SIDES.includes(body.fromSide as string)) return `fromSide non valido: ${body.fromSide}. Valori: ${VALID_SIDES.join(', ')}`;
  if (!VALID_SIDES.includes(body.toSide as string)) return `toSide non valido: ${body.toSide}. Valori: ${VALID_SIDES.join(', ')}`;
  if (body.state && !VALID_STATES.includes(body.state as string)) return `state non valido: ${body.state}. Valori: ${VALID_STATES.join(', ')}`;
  return null;
}

/**
 * GET /api/admin/doors?roomId=xxx — list doors for a room (both directions)
 * GET /api/admin/doors?locationId=xxx — list all doors in a location
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const locationId = searchParams.get('locationId');

    let doors;
    if (roomId) {
      doors = await db.gameDoor.findMany({
        where: {
          OR: [{ fromRoomId: roomId }, { toRoomId: roomId }],
        },
        include: {
          fromRoom: { select: { id: true, name: true, icon: true } },
          toRoom: { select: { id: true, name: true, icon: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    } else if (locationId) {
      const roomIds = await db.gameRoom.findMany({
        where: { locationId },
        select: { id: true },
      });
      const ids = roomIds.map(r => r.id);
      doors = await db.gameDoor.findMany({
        where: {
          OR: [
            { fromRoomId: { in: ids } },
            { toRoomId: { in: ids } },
          ],
        },
        include: {
          fromRoom: { select: { id: true, name: true, icon: true } },
          toRoom: { select: { id: true, name: true, icon: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    } else {
      return NextResponse.json({ error: 'roomId o locationId sono richiesti' }, { status: 400 });
    }

    return NextResponse.json(doors);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Doors GET]');
  }
}

/**
 * POST /api/admin/doors — create a door
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const err = validateDoor(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    // Check if a door already exists between these rooms (either direction)
    const existing = await db.gameDoor.findFirst({
      where: {
        OR: [
          { fromRoomId: body.fromRoomId, toRoomId: body.toRoomId },
          { fromRoomId: body.toRoomId, toRoomId: body.fromRoomId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Esiste già una porta tra queste stanze' }, { status: 409 });
    }

    const door = await db.gameDoor.create({
      data: {
        id: body.id || `door_${body.fromRoomId}_${body.toRoomId}`,
        fromRoomId: body.fromRoomId,
        toRoomId: body.toRoomId,
        fromSide: body.fromSide,
        toSide: body.toSide,
        state: body.state ?? 'open',
        requiredItemId: body.requiredItemId ?? null,
        lockedMessage: body.lockedMessage ?? '',
        puzzle: typeof body.puzzle === 'string' ? body.puzzle : (body.puzzle ? JSON.stringify(body.puzzle) : ''),
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(door);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Doors POST]');
  }
}

/**
 * PUT /api/admin/doors — update a door
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id è obbligatorio' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.fromSide !== undefined) {
      if (!VALID_SIDES.includes(body.fromSide)) return NextResponse.json({ error: `fromSide non valido` }, { status: 400 });
      data.fromSide = body.fromSide;
    }
    if (body.toSide !== undefined) {
      if (!VALID_SIDES.includes(body.toSide)) return NextResponse.json({ error: `toSide non valido` }, { status: 400 });
      data.toSide = body.toSide;
    }
    if (body.state !== undefined) {
      if (!VALID_STATES.includes(body.state)) return NextResponse.json({ error: `state non valido` }, { status: 400 });
      data.state = body.state;
    }
    if (body.requiredItemId !== undefined) data.requiredItemId = body.requiredItemId || null;
    if (body.lockedMessage !== undefined) data.lockedMessage = body.lockedMessage;
    if (body.puzzle !== undefined) data.puzzle = typeof body.puzzle === 'string' ? body.puzzle : (body.puzzle ? JSON.stringify(body.puzzle) : '');
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const door = await db.gameDoor.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json(door);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Doors PUT]');
  }
}

/**
 * DELETE /api/admin/doors?id=xxx — delete a door
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id è obbligatorio' }, { status: 400 });
    }

    await db.gameDoor.delete({ where: { id } });
    return NextResponse.json({ deleted: id });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Doors DELETE]');
  }
}
