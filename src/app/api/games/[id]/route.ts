import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/api-game';
import {
  getGameDb,
  getActiveGameId,
  setActiveGameId,
  deleteGameDb,
  listGameDbFiles,
} from '@/lib/game-db';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/games/[id] — Get game details
 * PATCH /api/games/[id] — Update game metadata or set active
 * DELETE /api/games/[id] — Delete a game
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  
  if (!listGameDbFiles().includes(id)) {
    return jsonResponse({ error: `Game "${id}" not found` }, 404);
  }
  
  try {
    const client = getGameDb(id);
    const game = await client.game.findFirst();
    if (!game) {
      return jsonResponse({ error: 'Game record not found' }, 404);
    }
    
    return jsonResponse({
      game: {
        ...game,
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
    
    const client = getGameDb(id);
    
    // Update metadata (updateMany without where: exactly 1 Game record per DB)
    if (name || description !== undefined || coverImage !== undefined || status) {
      await client.game.updateMany({
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(coverImage !== undefined && { coverImage }),
          ...(status && { status }),
        },
      });
    }
    
    // Set as active game
    if (setActive) {
      setActiveGameId(id);
    }
    
    const game = await client.game.findFirst();
    
    return jsonResponse({
      success: true,
      game: {
        ...game,
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
