import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/api-game';
import {
  listGameDbFiles,
  initGameDb,
  cloneGameDb,
  getActiveGameId,
  setActiveGameId,
} from '@/lib/game-db';
import { listGames, setGameEntry } from '@/lib/game-registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/games — List all games with metadata (from editor DB)
 * POST /api/games — Create a new game
 */
export async function GET() {
  try {
    const activeGameId = getActiveGameId();
    const entries = await listGames({ sync: true });

    const games = entries.map(entry => ({
      ...entry,
      active: entry.id === activeGameId,
    }));

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
    } else {
      await initGameDb(gameId);
    }

    // Add to editor DB registry (metadata lives in custom.db, NOT in the game DB)
    await setGameEntry(gameId, { name, description, status: 'active' });

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
