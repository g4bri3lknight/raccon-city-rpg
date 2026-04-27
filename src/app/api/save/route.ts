import { withGameDb } from '@/lib/api-game';
import { db } from '@/lib/db';
import { safeErrorResponse } from '@/lib/api-utils';

// ─── GET /api/save          → all save slots meta ────────────────────────────
// ─── GET /api/save?slot=N   → full save data for slot N ─────────────────────
export const GET = withGameDb(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const slotParam = searchParams.get('slot');

    // ── Specific slot requested ──────────────────────────────────────────────
    if (slotParam !== null) {
      const slot = parseInt(slotParam, 10);
      if (isNaN(slot)) {
        return Response.json({ error: 'Invalid slot parameter' }, { status: 400 });
      }

      const save = await db.saveGame.findUnique({ where: { slot } });
      if (!save) {
        return Response.json({ error: 'Save slot not found' }, { status: 404 });
      }

      let parsedData: unknown = null;
      let parsedMeta: unknown = null;

      try {
        parsedData = JSON.parse(save.data);
      } catch {
        parsedData = save.data;
      }

      try {
        parsedMeta = JSON.parse(save.meta);
      } catch {
        parsedMeta = save.meta;
      }

      return Response.json({
        slot: save.slot,
        data: parsedData,
        meta: parsedMeta,
        createdAt: save.createdAt,
        updatedAt: save.updatedAt,
      });
    }

    // ── No slot param → return all slots overview ────────────────────────────
    const saves = await db.saveGame.findMany({
      orderBy: { slot: 'asc' },
      select: {
        slot: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const slots = saves.map((s) => {
      let parsedMeta: unknown = null;
      try {
        parsedMeta = JSON.parse(s.meta);
      } catch {
        parsedMeta = null;
      }

      return {
        slot: s.slot,
        meta: parsedMeta,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return Response.json({ slots });
  } catch (error) {
    return safeErrorResponse(error, '[Save GET]');
  }
});

// ─── POST /api/save          → upsert a save slot ────────────────────────────
export const POST = withGameDb(async (req: Request) => {
  try {
    const body = await req.json();
    const { slot, data, meta } = body;

    if (typeof slot !== 'number' || (slot !== -1 && (slot < 1 || slot > 3))) {
      return Response.json(
        { error: 'Invalid slot — must be 1, 2, 3, or -1 (autosave)' },
        { status: 400 },
      );
    }

    if (data === undefined || data === null) {
      return Response.json({ error: 'Missing required field: data' }, { status: 400 });
    }

    const stringifiedData = JSON.stringify(data);
    const stringifiedMeta = meta !== undefined ? JSON.stringify(meta) : '{}';

    await db.saveGame.upsert({
      where: { slot },
      update: {
        data: stringifiedData,
        meta: stringifiedMeta,
      },
      create: {
        slot,
        data: stringifiedData,
        meta: stringifiedMeta,
      },
    });

    return Response.json({ success: true, slot });
  } catch (error) {
    return safeErrorResponse(error, '[Save POST]');
  }
});

// ─── DELETE /api/save?slot=N → delete a save slot ───────────────────────────
export const DELETE = withGameDb(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const slotParam = searchParams.get('slot');

    if (slotParam === null) {
      return Response.json({ error: 'Missing required query parameter: slot' }, { status: 400 });
    }

    const slot = parseInt(slotParam, 10);
    if (isNaN(slot)) {
      return Response.json({ error: 'Invalid slot parameter' }, { status: 400 });
    }

    await db.saveGame.deleteMany({ where: { slot } });

    return Response.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Save DELETE]');
  }
});
