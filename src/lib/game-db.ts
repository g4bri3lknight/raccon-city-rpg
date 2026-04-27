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
// (used by Electron portable builds)
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
  const { execSync } = await import('child_process');
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${dbPath}`;
  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 30000,
    });
  } finally {
    process.env.DATABASE_URL = originalUrl;
  }
  
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
 * Delete a game DB file and remove from cache
 */
export async function deleteGameDb(gameId: string): Promise<boolean> {
  if (gameId === 'raccoon-city') return false; // Can't delete the default game
  
  // Disconnect client
  if (clientCache.has(gameId)) {
    await clientCache.get(gameId)!.$disconnect();
    clientCache.delete(gameId);
  }
  
  // Delete file
  const dbPath = getGameDbPath(gameId);
  try {
    unlinkSync(dbPath);
    return true;
  } catch {
    return false;
  }
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
    
    // Update the cloned DB's game name in the games table
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
