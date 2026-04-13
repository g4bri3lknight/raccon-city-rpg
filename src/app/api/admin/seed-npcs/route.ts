import { db } from '@/lib/db';
import { SEED_NPCS } from '@/seed-data/npcs';
import { NextResponse } from 'next/server';

const NPC_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  npc_marco: { label: 'Meccanico', icon: '🔧', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30' },
  npc_dr_chen: { label: 'Medico', icon: '🥼', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30' },
  npc_soldier_reyes: { label: 'Soldato UBCS', icon: '🎖️', color: 'bg-red-900/40 text-red-300 border-red-700/30' },
  npc_hannah: { label: 'Esploratrice', icon: '🔦', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30' },
  npc_umbrella_scientist: { label: 'Scienziato Umbrella', icon: '🧬', color: 'bg-purple-900/40 text-purple-300 border-purple-700/30' },
};

/**
 * POST /api/admin/seed-npcs
 * Seeds the hardcoded NPCs from npcs.ts into the game_npcs table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(SEED_NPCS);
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
          badgeLabel: NPC_BADGES[npc.id]?.label ?? '',
          badgeIcon: NPC_BADGES[npc.id]?.icon ?? '',
          badgeColor: NPC_BADGES[npc.id]?.color ?? '',
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
          badgeLabel: NPC_BADGES[npc.id]?.label ?? '',
          badgeIcon: NPC_BADGES[npc.id]?.icon ?? '',
          badgeColor: NPC_BADGES[npc.id]?.color ?? '',
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
