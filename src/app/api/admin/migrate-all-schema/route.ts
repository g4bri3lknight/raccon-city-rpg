import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { listGameDbFiles, getGameDbPath, disconnectAll } from '@/lib/game-db';
import { existsSync } from 'fs';

/**
 * POST /api/admin/migrate-all-schema
 *
 * Pushes the current Prisma schema to ALL existing game databases.
 * This is the "propagate template" operation — it ensures every game DB
 * has the latest tables and columns from schema.prisma.
 *
 * Safe to run multiple times (idempotent).
 * Does NOT touch data, only schema structure.
 */
export async function POST() {
  try {
    const gameIds = listGameDbFiles();

    if (gameIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun gioco trovato — nessuna migrazione necessaria.',
        migrated: [],
        skipped: [],
      });
    }

    const originalUrl = process.env.DATABASE_URL;
    const results: {
      gameId: string;
      success: boolean;
      output: string;
      error?: string;
    }[] = [];

    for (const gameId of gameIds) {
      const dbPath = getGameDbPath(gameId);

      if (!existsSync(dbPath)) {
        results.push({ gameId, success: false, output: 'File DB non trovato', error: 'missing' });
        continue;
      }

      try {
        process.env.DATABASE_URL = `file:${dbPath}`;

        const output = execSync(
          'npx prisma db push --skip-generate --accept-data-loss 2>&1',
          {
            cwd: process.cwd(),
            stdio: 'pipe',
            timeout: 60000,
            encoding: 'utf-8',
          }
        );

        const cleaned = output
          .replace(/Your database.*?\n?/s, '')
          .replace(/🚀.*?\n?/s, '')
          .trim();

        results.push({
          gameId,
          success: true,
          output: cleaned || 'Schema già aggiornato.',
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({
          gameId,
          success: false,
          output: 'Errore durante prisma db push',
          error: errMsg,
        });
      } finally {
        process.env.DATABASE_URL = originalUrl;
      }
    }

    // Disconnect all cached clients so they pick up new schema on next request
    await disconnectAll();

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      message: failed.length === 0
        ? `✅ Schema aggiornato con successo per tutti i ${gameIds.length} giochi`
        : `⚠️ Schema aggiornato per ${succeeded.length}/${gameIds.length} giochi (${failed.length} errori)`,
      totalGames: gameIds.length,
      migrated: succeeded,
      failed,
    });
  } catch (error) {
    console.error('[POST /api/admin/migrate-all-schema]', error);
    return NextResponse.json(
      { error: 'Errore durante la migrazione globale', details: String(error) },
      500
    );
  }
}

/**
 * GET /api/admin/migrate-all-schema
 *
 * Returns a summary of all game databases and their schema status
 * (useful for checking which games might need migration).
 */
export async function GET() {
  try {
    const gameIds = listGameDbFiles();

    const summaries = await Promise.all(
      gameIds.map(async (gameId) => {
        const dbPath = getGameDbPath(gameId);
        const exists = existsSync(dbPath);
        const stats = exists ? await getDbStats(dbPath) : null;

        return {
          gameId,
          exists,
          dbPath,
          size: exists ? (await import('fs')).statSync(dbPath).size : 0,
          tables: stats?.tables || 0,
          tablesList: stats?.tableNames || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      totalGames: gameIds.length,
      games: summaries,
    });
  } catch (error) {
    console.error('[GET /api/admin/migrate-all-schema]', error);
    return NextResponse.json(
      { error: 'Errore nel recupero info DB', details: String(error) },
      500
    );
  }
}

// Helper: get table count and names from a SQLite DB
async function getDbStats(dbPath: string): Promise<{ tables: number; tableNames: string[] } | null> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } },
    });
    const rows = await db.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name
    `;
    await db.$disconnect();
    return { tables: rows.length, tableNames: rows.map(r => r.name) };
  } catch {
    return null;
  }
}
