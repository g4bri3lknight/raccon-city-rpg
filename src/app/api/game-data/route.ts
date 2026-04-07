import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/game-data
 * Returns all game data (items, events, documents, quests) as JSON.
 * This is the server-side data layer — the client-side loader fetches from here.
 */
export async function GET() {
  try {
    const [items, events, documents, quests] = await Promise.all([
      db.item.findMany({ orderBy: { createdAt: 'asc' } }),
      db.dynamicEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      db.document.findMany({ orderBy: { createdAt: 'asc' } }),
      db.sideQuest.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    return NextResponse.json({ items, events, documents, quests });
  } catch (error) {
    console.error('[game-data] Failed to load:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
