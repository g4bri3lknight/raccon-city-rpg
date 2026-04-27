/**
 * Game Registry — DB-backed game metadata store.
 *
 * Game metadata (name, description, coverImage, status) is stored in the
 * `games` table of the EDITOR database (custom.db) — NOT in each game's DB
 * and NOT in a JSON file.
 *
 * The registry auto-populates by scanning `db/games/*.db`:
 * any DB file without a registry entry gets one with the file ID as name.
 */

import { getEditorDb, resetEditorDb } from './editor-db';
import { listGameDbFiles } from './game-db';

export interface GameRegistryEntry {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync registry with DB files on disk.
 * Any DB file missing a Game record gets one auto-created.
 */
export async function syncRegistry(): Promise<GameRegistryEntry[]> {
  const db = getEditorDb();
  const dbIds = listGameDbFiles();

  for (const id of dbIds) {
    const existing = await db.game.findUnique({ where: { id } });
    if (!existing) {
      await db.game.create({
        data: {
          id,
          name: id,
          status: 'active',
        },
      });
    }
  }

  return listGamesFromDb(dbIds);
}

/**
 * List all games from the editor DB.
 * Optionally syncs first to include newly added DB files.
 */
export async function listGames(options?: { sync?: boolean }): Promise<GameRegistryEntry[]> {
  const dbIds = listGameDbFiles();

  if (options?.sync !== false) {
    return syncRegistry();
  }

  return listGamesFromDb(dbIds);
}

/**
 * Internal: query games from DB, filtered to only include those with
 * a matching .db file on disk.
 */
async function listGamesFromDb(dbIds: string[]): Promise<GameRegistryEntry[]> {
  const db = getEditorDb();

  if (dbIds.length === 0) return [];

  const games = await db.game.findMany({
    where: { id: { in: dbIds } },
    orderBy: { createdAt: 'asc' },
  });

  return games.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    coverImage: g.coverImage,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));
}

/**
 * Get a single game entry from the editor DB.
 */
export async function getGameEntry(gameId: string): Promise<GameRegistryEntry | null> {
  // Verify the DB file exists
  if (!listGameDbFiles().includes(gameId)) return null;

  const db = getEditorDb();
  const g = await db.game.findUnique({ where: { id: gameId } });

  if (!g) return null;

  return {
    id: g.id,
    name: g.name,
    description: g.description,
    coverImage: g.coverImage,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

/**
 * Create or update a game entry in the editor DB.
 */
export async function setGameEntry(
  gameId: string,
  data: Partial<Omit<GameRegistryEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<GameRegistryEntry> {
  const db = getEditorDb();

  const g = await db.game.upsert({
    where: { id: gameId },
    update: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.status !== undefined && { status: data.status }),
    },
    create: {
      id: gameId,
      name: data.name ?? gameId,
      description: data.description ?? '',
      coverImage: data.coverImage ?? '',
      status: data.status ?? 'active',
    },
  });

  return {
    id: g.id,
    name: g.name,
    description: g.description,
    coverImage: g.coverImage,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

/**
 * Remove a game entry from the editor DB.
 *
 * Tries `delete` first. On failure, resets the Prisma connection and retries.
 * If still failing, falls back to `deleteMany` which bypasses FK checks in SQLite.
 */
export async function removeGameEntry(gameId: string): Promise<boolean> {
  let db = getEditorDb();
  try {
    await db.game.delete({ where: { id: gameId } });
    return true;
  } catch (primaryErr) {
    console.error(`[removeGameEntry] delete failed for "${gameId}":`, primaryErr);

    // Stale connection — reset and retry with a fresh client
    resetEditorDb();
    db = getEditorDb();
    try {
      await db.game.delete({ where: { id: gameId } });
      console.log(`[removeGameEntry] retry succeeded for "${gameId}"`);
      return true;
    } catch (retryErr) {
      console.error(`[removeGameEntry] retry failed for "${gameId}", trying deleteMany:`, retryErr);
      try {
        const result = await db.game.deleteMany({ where: { id: gameId } });
        if (result.count > 0) return true;
        console.error(`[removeGameEntry] deleteMany found 0 rows for "${gameId}"`);
        return false;
      } catch (fallbackErr) {
        console.error(`[removeGameEntry] deleteMany also failed for "${gameId}":`, fallbackErr);
        return false;
      }
    }
  }
}
