import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/game-data
 * Returns all game data (items, events, documents, quests, locations, npcs, characters) as JSON.
 * This is the server-side data layer — the client-side loader fetches from here.
 */
export async function GET() {
  try {
    const [items, events, documents, quests, locations, npcs, characters, specials, enemies, enemyAbilities] = await Promise.all([
      db.item.findMany({ orderBy: { createdAt: 'asc' } }),
      db.dynamicEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      db.document.findMany({ orderBy: { createdAt: 'asc' } }),
      db.sideQuest.findMany({ orderBy: { createdAt: 'asc' } }),
      db.gameLocation.findMany({ orderBy: { createdAt: 'asc' } }),
      db.gameNPC.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameCharacter.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameSpecial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameEnemy.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.gameEnemyAbility.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return NextResponse.json({ items, events, documents, quests, locations, npcs, characters, specials, enemies, enemyAbilities });
  } catch (error) {
    console.error('[game-data] Failed to load:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
