import { NextResponse } from 'next/server';
import { syncGameDbSchema, getCurrentGameId } from '@/lib/game-db';

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
    const result = await syncGameDbSchema(gameId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, 400);
    }

    return NextResponse.json({
      success: true,
      message: `Schema aggiornato con successo per "${gameId}"`,
      gameId,
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
