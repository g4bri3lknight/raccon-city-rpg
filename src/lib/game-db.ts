/**
 * Multi-DB Game Database Factory
 * 
 * Each RPG game has its own SQLite database in db/games/{gameId}.db
 * The "active game" is tracked via db/.active-game file
 * 
 * Usage:
 *   import { getGameDb, setRequestGame, getActiveGameId } from '@/lib/game-db'
 *   const gameDb = getGameDb('my-fantasy-rpg')
 *   const items = await gameDb.item.findMany()
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync, openSync, closeSync } from 'fs';
import { join } from 'path';

// GAMES_DIR and ACTIVE_GAME_FILE can be overridden via env vars
// (used by Neutralino portable builds)
const GAMES_DIR = process.env.GAMES_DIR || join(process.cwd(), 'db', 'games');
const ACTIVE_GAME_FILE = process.env.ACTIVE_GAME_FILE || join(process.cwd(), 'db', '.active-game');

// ── Client Cache ──
const clientCache = new Map<string, PrismaClient>();

// ── Per-request game context (for concurrent request safety) ──
// This is set by API route wrappers and read by the db proxy
let _requestGameId: string | null = null;

/**
 * Get the game DB path for a given game ID
 */
export function getGameDbPath(gameId: string): string {
  return join(GAMES_DIR, `${gameId}.db`);
}

/**
 * Set the per-request game context (thread-local equivalent)
 * Call this at the start of each API route handler
 */
export function setRequestGame(gameId: string): void {
  _requestGameId = gameId;
}

/**
 * Clear the per-request game context
 */
export function clearRequestGame(): void {
  _requestGameId = null;
}

/**
 * Get the current game ID (request context > active file > default)
 */
export function getCurrentGameId(): string {
  if (_requestGameId) return _requestGameId;
  return getActiveGameId();
}

/**
 * Read the active game ID from the .active-game file
 */
export function getActiveGameId(): string {
  try {
    if (existsSync(ACTIVE_GAME_FILE)) {
      const id = readFileSync(ACTIVE_GAME_FILE, 'utf-8').trim();
      if (id) return id;
    }
  } catch {
    // File doesn't exist or can't be read
  }
  return 'raccoon-city'; // Default game
}

/**
 * Write the active game ID to the .active-game file
 */
export function setActiveGameId(gameId: string): void {
  writeFileSync(ACTIVE_GAME_FILE, gameId, 'utf-8');
}

/**
 * Create or get a PrismaClient for a specific game DB
 */
export function getGameDb(gameId?: string): PrismaClient {
  const id = gameId || getCurrentGameId();
  
  if (!clientCache.has(id)) {
    if (!existsSync(GAMES_DIR)) {
      mkdirSync(GAMES_DIR, { recursive: true });
    }
    const dbPath = join(GAMES_DIR, `${id}.db`);
    const client = new PrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` }
      },
      log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : [],
    });
    clientCache.set(id, client);
  }
  
  return clientCache.get(id)!;
}

/**
 * Push the Prisma schema to a specific game DB file.
 * Uses `bunx prisma db push` to add missing columns/tables without data loss.
 */
export async function syncSchemaToDb(dbPath: string): Promise<{ success: boolean; message: string }> {
  const { execSync } = await import('child_process');
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${dbPath}`;
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 30000,
    });
    return { success: true, message: 'Schema synced successfully' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Schema sync failed' };
  } finally {
    process.env.DATABASE_URL = originalUrl;
  }
}

/**
 * Sync the Prisma schema to an existing game DB and refresh the cached client.
 */
export async function syncGameDbSchema(gameId: string): Promise<{ success: boolean; message: string }> {
  const dbPath = getGameDbPath(gameId);
  
  if (!existsSync(dbPath)) {
    return { success: false, message: `Database file not found: ${dbPath}` };
  }
  
  const result = await syncSchemaToDb(dbPath);
  
  if (result.success) {
    // Disconnect and remove cached client so it picks up new schema
    if (clientCache.has(gameId)) {
      try {
        await clientCache.get(gameId)!.$disconnect();
      } catch { /* ignore */ }
      clientCache.delete(gameId);
    }
    // Re-create the client
    getGameDb(gameId);
  }
  
  return result;
}

/**
 * Initialize a new game DB with the full schema
 * Returns the PrismaClient for the new game
 */
export async function initGameDb(gameId: string): Promise<PrismaClient> {
  const dbPath = getGameDbPath(gameId);
  
  // Create empty DB file if it doesn't exist
  if (!existsSync(dbPath)) {
    const fd = openSync(dbPath, 'w');
    closeSync(fd);
  }
  
  // Push schema to the new DB
  await syncSchemaToDb(dbPath);
  
  // Return cached client (or create new one)
  if (clientCache.has(gameId)) {
    // Disconnect old client (if any) to pick up new schema
    const old = clientCache.get(gameId)!;
    old.$disconnect();
    clientCache.delete(gameId);
  }
  
  return getGameDb(gameId);
}

/**
 * Disconnect all cached clients
 */
export async function disconnectAll(): Promise<void> {
  for (const client of clientCache.values()) {
    await client.$disconnect();
  }
  clientCache.clear();
}

/**
 * List all existing game DB files
 */
export function listGameDbFiles(): string[] {
  if (!existsSync(GAMES_DIR)) return [];

  return readdirSync(GAMES_DIR)
    .filter((f: string) => f.endsWith('.db'))
    .map((f: string) => f.replace('.db', ''));
}

/**
 * Delete a game DB file and remove from cache.
 * Disconnects the cached Prisma client first, then removes the file.
 * Retries file deletion up to 3 times with a short delay (handles SQLite WAL locks).
 */
export async function deleteGameDb(gameId: string): Promise<boolean> {
  if (gameId === 'raccoon-city') return false; // Can't delete the default game
  
  // Disconnect the cached client for this game (may hold WAL/SHM file locks)
  if (clientCache.has(gameId)) {
    try {
      await clientCache.get(gameId)!.$disconnect();
    } catch {
      // connection may already be dead
    }
    clientCache.delete(gameId);
  }
  
  // Delete the DB file with retries (handles transient file locks)
  const dbPath = getGameDbPath(gameId);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      unlinkSync(dbPath);
      // Also clean up WAL/SHM files if they exist
      for (const ext of ['-wal', '-shm']) {
        try { unlinkSync(dbPath + ext); } catch { /* ignore */ }
      }
      return true;
    } catch {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }
  console.error(`[deleteGameDb] Failed to delete DB file after 3 attempts: ${dbPath}`);
  return false;
}

/**
 * Clone a game DB to a new ID
 */
export async function cloneGameDb(sourceId: string, targetId: string): Promise<boolean> {
  const sourcePath = getGameDbPath(sourceId);
  const targetPath = getGameDbPath(targetId);
  
  if (!existsSync(sourcePath)) return false;
  
  try {
    copyFileSync(sourcePath, targetPath);
    
    // Clear cache for target (in case it existed)
    if (clientCache.has(targetId)) {
      await clientCache.get(targetId)!.$disconnect();
      clientCache.delete(targetId);
    }
    
    // Update the Game record ID in the cloned DB (needed for SaveGame FK)
    const targetClient = getGameDb(targetId);
    await targetClient.game.updateMany({
      data: { id: targetId },
      where: { id: sourceId },
    });
    
    return true;
  } catch {
    return false;
  }
}
