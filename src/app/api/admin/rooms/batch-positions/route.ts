import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

interface PositionUpdate {
  id: string;
  mapRow: number | null;
  mapCol: number | null;
}

/**
 * PUT /api/admin/rooms/batch-positions
 *
 * Batch-update map positions (mapRow + mapCol) for multiple rooms
 * in a single transaction. Used by the room editor to save all
 * positions at once, avoiding race conditions from concurrent PUTs.
 */
export async function PUT(request: NextRequest) {
  try {
    const body: { positions: PositionUpdate[] } = await request.json();

    if (!Array.isArray(body.positions)) {
      return NextResponse.json(
        { error: 'positions array is required' },
        { status: 400 },
      );
    }

    // Update all positions in a single transaction
    await db.$transaction(
      body.positions.map((p) =>
        db.gameRoom.update({
          where: { id: p.id },
          data: {
            mapRow: p.mapRow ?? null,
            mapCol: p.mapCol ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({
      updated: body.positions.length,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Rooms Batch Positions]');
  }
}
