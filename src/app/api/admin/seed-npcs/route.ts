import { db } from '@/lib/db';
import { NPCS } from '@/game/data/npcs';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-npcs
 * Seeds the hardcoded NPCs from npcs.ts into the game_npcs table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(NPCS);
    let seeded = 0;

    for (let i = 0; i < entries.length; i++) {
      const npc = entries[i];

      await db.gameNPC.upsert({
        where: { id: npc.id },
        update: {
          name: npc.name,
          portrait: npc.portrait,
          locationId: npc.locationId,
          greeting: npc.greeting,
          dialogues: JSON.stringify(npc.dialogues),
          farewell: npc.farewell,
          questId: npc.quest?.id ?? null,
          tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
          questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
          sortOrder: i,
        },
        create: {
          id: npc.id,
          name: npc.name,
          portrait: npc.portrait,
          locationId: npc.locationId,
          greeting: npc.greeting,
          dialogues: JSON.stringify(npc.dialogues),
          farewell: npc.farewell,
          questId: npc.quest?.id ?? null,
          tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
          questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
          sortOrder: i,
        },
      });

      seeded++;
    }

    return NextResponse.json({ seeded });
  } catch (error) {
    console.error('[seed-npcs] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
