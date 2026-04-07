import { QUESTS } from './loader';
import type { NPCQuest } from '../types';

export function getQuestsForNpc(npcId: string): NPCQuest[] {
  return Object.values(QUESTS)
    .filter(q => q && q.npcId === npcId)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function getFirstAvailableQuest(npcId: string, completedQuestIds: string[]): NPCQuest | undefined {
  const quests = getQuestsForNpc(npcId);
  return quests.find(q => {
    if (completedQuestIds.includes(q.id)) return false;
    if (q.prerequisiteQuestId && !completedQuestIds.includes(q.prerequisiteQuestId)) return false;
    return true;
  });
}
