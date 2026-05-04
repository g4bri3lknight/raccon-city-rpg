import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

interface PositionUpdate {
  id: string;
  mapRow?: number | null;
  mapCol?: number | null;
  mapX?: number | null;
  mapY?: number | null;
  mapWidth?: number;
  mapHeight?: number;
}

/**
 * PUT /api/admin/rooms/batch-positions
 *
 * Batch-update map positions for multiple rooms
 * in a single transaction. Supports both grid (mapRow/mapCol)
 * and free-form (mapX/mapY) positioning plus visual size (mapWidth/mapHeight).
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
            ...(p.mapRow !== undefined ? { mapRow: p.mapRow ?? null } : {}),
            ...(p.mapCol !== undefined ? { mapCol: p.mapCol ?? null } : {}),
            ...(p.mapX !== undefined ? { mapX: p.mapX ?? null } : {}),
            ...(p.mapY !== undefined ? { mapY: p.mapY ?? null } : {}),
            ...(p.mapWidth !== undefined ? { mapWidth: p.mapWidth } : {}),
            ...(p.mapHeight !== undefined ? { mapHeight: p.mapHeight } : {}),
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
