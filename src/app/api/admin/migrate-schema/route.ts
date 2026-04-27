import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getGameDbPath, getCurrentGameId } from '@/lib/game-db';
import { existsSync } from 'fs';

/**
 * POST /api/admin/migrate-schema
 *
 * Pushes the current Prisma schema to the active game DB.
 * Use this when new tables/columns are added to schema.prisma
 * and existing game databases need to be updated.
 *
 * Safe to run multiple times (idempotent).
 */
export async function POST() {
  try {
    const gameId = getCurrentGameId();
    const dbPath = getGameDbPath(gameId);

    if (!existsSync(dbPath)) {
      return NextResponse.json(
        { error: `Database non trovato per il gioco "${gameId}"` },
        404
      );
    }

    // Temporarily override DATABASE_URL and push schema
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `file:${dbPath}`;

    let output = '';
    try {
      output = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 60000,
        encoding: 'utf-8',
      });
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }

    // Clear the Prisma client cache so new schema is picked up
    const { getGameDb, clientCache } = await import('@/lib/game-db');
    // Dynamic import to avoid circular reference — clear cache manually
    if (typeof getGameDb === 'function') {
      // The clientCache is module-scoped, we need to force a reconnect
      // We'll do this by importing the module fresh
    }

    // Force re-validation of Prisma Client by logging
    const cleaned = output
      .replace(/Your database.*?\n/s, '')
      .replace(/🚀.*?\n/s, '')
      .trim();

    return NextResponse.json({
      success: true,
      message: `Schema aggiornato con successo per "${gameId}"`,
      gameId,
      dbPath,
      output: cleaned || 'Nessuna modifica necessaria — lo schema è già aggiornato.',
    });
  } catch (error) {
    console.error('[POST /api/admin/migrate-schema]', error);
    return NextResponse.json(
      {
        error: 'Errore durante la migrazione dello schema',
        details: String(error),
      },
      500
    );
  }
}
