import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/api-game';
import {
  getActiveGameId,
  setActiveGameId,
  deleteGameDb,
  listGameDbFiles,
} from '@/lib/game-db';
import { getGameEntry, setGameEntry, removeGameEntry } from '@/lib/game-registry';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/games/[id] — Get game details (from editor DB)
 * PATCH /api/games/[id] — Update game metadata (in editor DB) or set active
 * DELETE /api/games/[id] — Delete a game
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  if (!listGameDbFiles().includes(id)) {
    return jsonResponse({ error: `Game "${id}" not found` }, 404);
  }

  try {
    const entry = await getGameEntry(id);
    if (!entry) {
      return jsonResponse({ error: `Game "${id}" not found in registry` }, 404);
    }

    return jsonResponse({
      game: {
        ...entry,
        active: id === getActiveGameId(),
      },
    });
  } catch (error) {
    console.error(`[GET /api/games/${id}]`, error);
    return jsonResponse({ error: 'Failed to get game details' }, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  if (!listGameDbFiles().includes(id)) {
    return jsonResponse({ error: `Game "${id}" not found` }, 404);
  }

  try {
    const body = await req.json();
    const { name, description, coverImage, status, setActive } = body;

    // Update metadata in editor DB (custom.db)
    if (name || description !== undefined || coverImage !== undefined || status) {
      await setGameEntry(id, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(status && { status }),
      });
    }

    // Set as active game
    if (setActive) {
      setActiveGameId(id);
    }

    const entry = await getGameEntry(id);

    return jsonResponse({
      success: true,
      game: {
        ...entry,
        active: id === getActiveGameId(),
      },
    });
  } catch (error) {
    console.error(`[PATCH /api/games/${id}]`, error);
    return jsonResponse({ error: 'Failed to update game' }, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  if (id === 'raccoon-city') {
    return jsonResponse({ error: 'Cannot delete the default game' }, 403);
  }

  if (!listGameDbFiles().includes(id)) {
    return jsonResponse({ error: `Game "${id}" not found` }, 404);
  }

  try {
    const deleted = await deleteGameDb(id);
    if (!deleted) {
      return jsonResponse({ error: 'Failed to delete game' }, 500);
    }

    // Remove from editor DB registry
    await removeGameEntry(id);

    // If deleted game was active, switch to default
    if (id === getActiveGameId()) {
      setActiveGameId('raccoon-city');
    }

    return jsonResponse({ success: true, message: `Game "${id}" deleted` });
  } catch (error) {
    console.error(`[DELETE /api/games/${id}]`, error);
    return jsonResponse({ error: 'Failed to delete game' }, 500);
  }
}
