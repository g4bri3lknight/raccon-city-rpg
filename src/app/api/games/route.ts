import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/api-game';
import {
  listGameDbFiles,
  initGameDb,
  deleteGameDb,
  cloneGameDb,
  getActiveGameId,
  setActiveGameId,
  getGameDb,
} from '@/lib/game-db';

/**
 * GET /api/games — List all games with metadata
 * POST /api/games — Create a new game
 */
export async function GET() {
  try {
    const gameIds = listGameDbFiles();
    const activeGameId = getActiveGameId();
    
    const games = await Promise.all(
      gameIds.map(async (id) => {
        try {
          const client = getGameDb(id);
          const gameRecord = await client.game.findFirst();
          return {
            id,
            name: gameRecord?.name || id,
            description: gameRecord?.description || '',
            coverImage: gameRecord?.coverImage || '',
            status: gameRecord?.status || 'active',
            active: id === activeGameId,
            createdAt: gameRecord?.createdAt,
            updatedAt: gameRecord?.updatedAt,
          };
        } catch {
          return {
            id,
            name: id,
            description: '',
            coverImage: '',
            status: 'active',
            active: id === activeGameId,
            createdAt: null,
            updatedAt: null,
          };
        }
      })
    );
    
    return jsonResponse({ games });
  } catch (error) {
    console.error('[GET /api/games]', error);
    return jsonResponse({ error: 'Failed to list games' }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description = '', cloneFrom } = body;

    if (!name || typeof name !== 'string') {
      return jsonResponse({ error: 'Game name is required' }, 400);
    }

    // Generate game ID from name (slug format)
    const gameId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    if (!gameId) {
      return jsonResponse({ error: 'Invalid game name' }, 400);
    }

    // Check if game already exists
    const existing = listGameDbFiles();
    if (existing.includes(gameId)) {
      return jsonResponse({ error: `Game "${gameId}" already exists` }, 409);
    }

    // Clone from existing game or create fresh
    if (cloneFrom && existing.includes(cloneFrom)) {
      const cloned = await cloneGameDb(cloneFrom, gameId);
      if (!cloned) {
        return jsonResponse({ error: `Failed to clone game "${cloneFrom}"` }, 500);
      }
      // Update name in cloned DB
      const client = getGameDb(gameId);
      await client.game.updateMany({
        data: { name, description, id: gameId },
        where: { id: cloneFrom },
      });
    } else {
      // Create fresh game DB
      const client = await initGameDb(gameId);
      await client.game.create({
        data: { id: gameId, name, description },
      });
    }

    return jsonResponse({
      success: true,
      gameId,
      message: `Game "${name}" created successfully`,
    }, 201);
  } catch (error) {
    console.error('[POST /api/games]', error);
    return jsonResponse({ error: 'Failed to create game' }, 500);
  }
}
