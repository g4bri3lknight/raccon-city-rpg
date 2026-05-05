import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
/**
 * GET /api/game-data
 * Returns all game data (items, events, documents, quests, locations, npcs, characters) as JSON.
 * This is the server-side data layer — the client-side loader fetches from here.
 */
export async function GET() {
  try {
    const [items, events, documents, quests, locations, npcs, characters, specials, enemies, enemyAbilities, secretRooms, recipes, bossPhases, achievements, endings, avatars, questChains, questChainSteps, questChainFinalRewards, rooms, doors] = await Promise.all([
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
      db.secretRoom.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameRecipe.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameBossPhase.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameAchievement.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameEnding.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameAvatar.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.questChain.findMany({ orderBy: { createdAt: 'asc' } }),
      db.questChainStep.findMany({ orderBy: [{ chainId: 'asc' }, { stepIndex: 'asc' }] }),
      db.questChainFinalReward.findMany(),
      db.gameRoom.findMany({ orderBy: [{ locationId: 'asc' }, { sortOrder: 'asc' }] }),
      db.gameDoor.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return NextResponse.json({ items, events, documents, quests, locations, npcs, characters, specials, enemies, enemyAbilities, secretRooms, recipes, bossPhases, achievements, endings, avatars, questChains, questChainSteps, questChainFinalRewards, rooms, doors });
  } catch (error) {
    return safeErrorResponse(error, '[Game Data]');
  }
}
