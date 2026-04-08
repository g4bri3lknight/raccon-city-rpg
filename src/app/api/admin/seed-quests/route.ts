import { db } from '@/lib/db';
import { NPCS } from '@/game/data/npcs';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-quests
 * Extracts quests from NPC static data and seeds them into the side_quests table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const npcEntries = Object.values(NPCS);
    let created = 0;
    let updated = 0;

    for (const npc of npcEntries) {
      const quest = (npc as any).quest;
      if (!quest) continue;

      const existing = await db.sideQuest.findUnique({ where: { id: quest.id } });
      const data = {
        npcId: npc.id,
        name: quest.name,
        description: quest.description,
        type: quest.type,
        targetId: quest.targetId,
        targetCount: quest.targetCount,
        rewardItems: JSON.stringify(quest.rewardItems ?? []),
        rewardExp: quest.rewardExp ?? 0,
        rewardDialogue: JSON.stringify(quest.rewardDialogue ?? []),
        sortOrder: 0,
        prerequisiteQuestId: quest.prerequisiteQuestId ?? null,
      };

      if (existing) {
        await db.sideQuest.update({ where: { id: quest.id }, data });
        updated++;
      } else {
        await db.sideQuest.create({ data: { id: quest.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({ success: true, created, updated });
  } catch (error) {
    console.error('[seed-quests] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
