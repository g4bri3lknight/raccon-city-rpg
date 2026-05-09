import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/admin/migrate-quests
 * One-time migration: converts all SideQuest records to QuestChain with 1 step.
 * The SideQuest model has been removed from the schema, so this reads from the
 * raw SQLite table if it still exists.
 */
export async function POST() {
  try {
    // Try to query the old side_quests table directly (it may have been dropped)
    // If the table doesn't exist, return 0
    let sideQuests: Array<{
      id: string;
      npcId: string;
      name: string;
      description: string;
      type: string;
      targetId: string;
      targetCount: number;
      rewardItems: string;
      rewardExp: number;
      rewardDialogue: string;
      sortOrder: number;
      prerequisiteQuestId: string | null;
    }> = [];

    try {
      const result = await db.$queryRawUnsafe(
        `SELECT id, npcId, name, description, type, targetId, targetCount, rewardItems, rewardExp, rewardDialogue, sortOrder, prerequisiteQuestId FROM side_quests`
      ) as any[];
      if (Array.isArray(result)) {
        sideQuests = result;
      }
    } catch {
      // Table doesn't exist — nothing to migrate
      return NextResponse.json({ message: 'Nessuna SideQuest trovata (tabella non esiste o vuota)', migrated: 0 });
    }

    if (sideQuests.length === 0) {
      return NextResponse.json({ message: 'Nessuna SideQuest da migrare', migrated: 0 });
    }

    let migrated = 0;
    let skipped = 0;

    for (const q of sideQuests) {
      // Check if a QuestChain with this ID already exists
      const existing = await db.questChain.findUnique({ where: { id: q.id } });
      if (existing) {
        skipped++;
        continue;
      }

      // Create QuestChain
      await db.questChain.create({
        data: {
          id: q.id,
          npcId: q.npcId,
          name: q.name,
          description: q.description,
          sortOrder: q.sortOrder,
          prerequisiteQuestId: q.prerequisiteQuestId,
        },
      });

      // Create single step
      await db.questChainStep.create({
        data: {
          id: `${q.id}_step_1`,
          chainId: q.id,
          stepIndex: 0,
          description: q.description,
          type: q.type,
          targetId: q.targetId,
          targetCount: q.targetCount,
          nextStepId: '',
          rewardItems: q.rewardItems || '[]',
          rewardExp: q.rewardExp || 0,
          rewardDialogue: q.rewardDialogue || '[]',
          branchChoice: '',
          sortOrder: 0,
        },
      });

      // Create final reward
      await db.questChainFinalReward.create({
        data: {
          chainId: q.id,
          rewardItems: '[]',
          rewardExp: 0,
          dialogue: '[]',
        },
      });

      migrated++;
    }

    // Optionally drop the old table
    try {
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS side_quests');
    } catch {
      // ignore if already dropped
    }

    return NextResponse.json({
      message: `Migrazione completata: ${migrated} convertite, ${skipped} saltate (già esistenti)`,
      migrated,
      skipped,
      total: sideQuests.length,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Migrate Quests]');
  }
}
