import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

/** Generate a short unique id for quest chain steps */
function stepId(): string {
  return 'step_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Safely parse JSON string — return fallback on failure */
function safeJsonParse(val: unknown, fallback: unknown): unknown {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}

// GET /api/admin/quest-chains — list all quest chains with steps + finalReward
export async function GET() {
  try {
    const chains = await db.questChain.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
        finalReward: true,
      },
    });
    // Parse JSON fields for each chain
    const parsed = chains.map(chain => {
      const steps = chain.steps.map(s => ({
        ...s,
        rewardItems: safeJsonParse(s.rewardItems, []),
        rewardDialogue: safeJsonParse(s.rewardDialogue, []),
        branchChoice: s.branchChoice ? safeJsonParse(s.branchChoice, null) : undefined,
      }));
      const finalReward = chain.finalReward ? {
        ...chain.finalReward,
        rewardItems: safeJsonParse(chain.finalReward.rewardItems, []),
        dialogue: safeJsonParse(chain.finalReward.dialogue, []),
      } : undefined;
      return {
        id: chain.id,
        npcId: chain.npcId,
        name: chain.name,
        description: chain.description,
        sortOrder: chain.sortOrder,
        prerequisiteQuestId: chain.prerequisiteQuestId,
        steps,
        finalReward,
      };
    });
    return NextResponse.json(parsed);
  } catch (error) {
    return safeErrorResponse(error, '[Quest Chains GET]');
  }
}

// POST /api/admin/quest-chains — create a new quest chain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, npcId, name, description, sortOrder, prerequisiteQuestId, steps, finalReward } = body;

    if (!id || !npcId || !name) {
      return NextResponse.json({ error: 'Missing required fields: id, npcId, name' }, { status: 400 });
    }

    // Create chain
    const chain = await db.questChain.create({
      data: {
        id,
        npcId,
        name,
        description: description || '',
        sortOrder: sortOrder || 0,
        prerequisiteQuestId: prerequisiteQuestId || null,
      },
    });

    // Create steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await db.questChainStep.create({
          data: {
            id: step.id || stepId(),
            chainId: chain.id,
            stepIndex: step.stepIndex ?? 0,
            description: step.description || '',
            type: step.type || 'fetch',
            targetId: step.targetId || '',
            targetCount: step.targetCount ?? 1,
            nextStepId: step.nextStepId || '',
            rewardItems: jsonStr(step.rewardItems, '[]'),
            rewardExp: step.rewardExp || 0,
            rewardDialogue: jsonStr(step.rewardDialogue, '[]'),
            branchChoice: jsonStr(step.branchChoice, ''),
            sortOrder: step.sortOrder ?? 0,
          },
        });
      }
    }

    // Create final reward if provided
    if (finalReward) {
      await db.questChainFinalReward.create({
        data: {
          chainId: chain.id,
          rewardItems: jsonStr(finalReward.rewardItems, '[]'),
          rewardExp: finalReward.rewardExp || 0,
          dialogue: jsonStr(finalReward.dialogue, '[]'),
        },
      });
    }

    return NextResponse.json({ message: 'Quest chain created', id: chain.id }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Quest Chains POST]');
  }
}

// PUT /api/admin/quest-chains — update a quest chain (expects id in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, npcId, name, description, sortOrder, prerequisiteQuestId, steps, finalReward } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Update chain
    await db.questChain.update({
      where: { id },
      data: {
        ...(npcId !== undefined ? { npcId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(prerequisiteQuestId !== undefined ? { prerequisiteQuestId: prerequisiteQuestId || null } : {}),
      },
    });

    // Update steps if provided (delete all existing, recreate)
    if (steps !== undefined) {
      await db.questChainStep.deleteMany({ where: { chainId: id } });
      for (const step of steps) {
        await db.questChainStep.create({
          data: {
            id: step.id || stepId(),
            chainId: id,
            stepIndex: step.stepIndex ?? 0,
            description: step.description || '',
            type: step.type || 'fetch',
            targetId: step.targetId || '',
            targetCount: step.targetCount ?? 1,
            nextStepId: step.nextStepId || '',
            rewardItems: jsonStr(step.rewardItems, '[]'),
            rewardExp: step.rewardExp || 0,
            rewardDialogue: jsonStr(step.rewardDialogue, '[]'),
            branchChoice: jsonStr(step.branchChoice, ''),
            sortOrder: step.sortOrder ?? 0,
          },
        });
      }
    }

    // Update final reward if provided
    if (finalReward !== undefined) {
      await db.questChainFinalReward.deleteMany({ where: { chainId: id } });
      await db.questChainFinalReward.create({
        data: {
          chainId: id,
          rewardItems: jsonStr(finalReward.rewardItems, '[]'),
          rewardExp: finalReward.rewardExp || 0,
          dialogue: jsonStr(finalReward.dialogue, '[]'),
        },
      });
    }

    return NextResponse.json({ message: 'Quest chain updated', id });
  } catch (error) {
    return safeErrorResponse(error, '[Quest Chains PUT]');
  }
}

// DELETE /api/admin/quest-chains?id=xxx — delete a quest chain
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Cascade delete steps and final reward
    await db.questChainStep.deleteMany({ where: { chainId: id } });
    await db.questChainFinalReward.deleteMany({ where: { chainId: id } });
    await db.questChain.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Quest Chains DELETE]');
  }
}
