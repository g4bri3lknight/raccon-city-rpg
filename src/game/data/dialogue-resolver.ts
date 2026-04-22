// ==========================================
// Dynamic Dialogue Resolver
// ==========================================

import type { DynamicDialogue, DialogueCondition, GameState } from '../types';

/**
 * Context passed to the dialogue resolver — a minimal subset of GameState
 * needed to evaluate conditions efficiently.
 */
export interface DialogueContext {
  currentLocationId: string;
  turnCount: number;
  difficulty: string;
  collectedDocuments: string[];
  bestiary: { enemyId: string; defeated: boolean }[];
  achievements: { unlockedIds: string[] };
  visitedLocations: string[];
  activeDynamicEvent: { type: string } | null;
  npcQuestProgress: Record<string, { completed: boolean }>;
  questChainProgress: Record<string, { completed: boolean; flags: string[] }>;
  party: { currentHp: number; maxHp: number; statusEffects: string[]; inventory: { itemId: string; quantity: number }[] }[];
  storyChoices: string[];
  npcReputation: Record<string, number>;
}

/** Extract DialogueContext from GameState (cheap — no copies) */
export function buildDialogueContext(state: GameState): DialogueContext {
  return {
    currentLocationId: state.currentLocationId,
    turnCount: state.turnCount,
    difficulty: state.difficulty,
    collectedDocuments: state.collectedDocuments,
    bestiary: state.bestiary,
    achievements: state.achievements,
    visitedLocations: state.visitedLocations,
    activeDynamicEvent: state.activeDynamicEvent ? { type: state.activeDynamicEvent.type } : null,
    npcQuestProgress: state.npcQuestProgress,
    questChainProgress: state.questChainProgress,
    party: state.party.map(p => ({
      currentHp: p.currentHp,
      maxHp: p.maxHp,
      statusEffects: p.statusEffects,
      inventory: p.inventory.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
    })),
    storyChoices: state.storyChoices,
    npcReputation: state.npcReputation,
  };
}

/** Check a single condition against the context */
function evaluateCondition(cond: DialogueCondition, ctx: DialogueContext): boolean {
  const op = cond.compare || 'eq';

  switch (cond.type) {
    case 'location':
      return compare(ctx.currentLocationId, cond.value, op);

    case 'turn_min':
      return ctx.turnCount >= (cond.value as number);

    case 'turn_max':
      return ctx.turnCount <= (cond.value as number);

    case 'quest_completed': {
      const questId = cond.value as string;
      return ctx.npcQuestProgress[questId]?.completed === true;
    }

    case 'quest_active': {
      const questId = cond.value as string;
      const progress = ctx.npcQuestProgress[questId];
      return !!progress && !progress.completed;
    }

    case 'quest_chain_completed': {
      const chainId = cond.value as string;
      return ctx.questChainProgress[chainId]?.completed === true;
    }

    case 'quest_chain_flag': {
      const flag = cond.value as string;
      for (const cp of Object.values(ctx.questChainProgress)) {
        if (cp.flags.includes(flag)) return true;
      }
      return false;
    }

    case 'has_item': {
      const itemId = cond.value as string;
      const count = ctx.party.reduce((sum, p) =>
        sum + p.inventory.filter(i => i.itemId === itemId).reduce((s, i) => s + i.quantity, 0), 0
      );
      if (op === 'eq') return count > 0;
      if (op === 'gt') return count > (cond.value as number);
      if (op === 'gte') return count >= (cond.value as number);
      return count > 0;
    }

    case 'hp_below': {
      const threshold = cond.value as number;
      // Check if ANY party member is below threshold
      return ctx.party.some(p => p.currentHp > 0 && (p.currentHp / p.maxHp) * 100 < threshold);
    }

    case 'has_status': {
      const status = cond.value as string;
      return ctx.party.some(p => p.statusEffects.includes(status as any));
    }

    case 'ending_unlocked':
      // Simplified: always false unless explicitly set
      return false;

    case 'flag':
      return ctx.storyChoices.includes(cond.value as string);

    case 'difficulty':
      return compare(ctx.difficulty, cond.value, op);

    case 'achievement':
      return ctx.achievements.unlockedIds.includes(cond.value as string);

    case 'documents_found': {
      const count = ctx.collectedDocuments.length;
      if (op === 'gte') return count >= (cond.value as number);
      if (op === 'gt') return count > (cond.value as number);
      if (op === 'lt') return count < (cond.value as number);
      if (op === 'eq') return count === (cond.value as number);
      return false;
    }

    case 'bestiary_count': {
      const defeated = ctx.bestiary.filter(b => b.defeated).length;
      if (op === 'gte') return defeated >= (cond.value as number);
      if (op === 'gt') return defeated > (cond.value as number);
      if (op === 'eq') return defeated === (cond.value as number);
      return false;
    }

    case 'dynamic_event_active': {
      if (!ctx.activeDynamicEvent) return false;
      return compare(ctx.activeDynamicEvent.type, cond.value, op);
    }

    case 'boss_defeated': {
      const enemyId = cond.value as string;
      return ctx.bestiary.some(b => b.enemyId === enemyId && b.defeated);
    }

    case 'location_visited':
      return ctx.visitedLocations.includes(cond.value as string);

    default:
      return false;
  }
}

/** Generic compare helper */
function compare(actual: string | number | boolean, expected: string | number | boolean, op: string): boolean {
  switch (op) {
    case 'eq': return actual === expected;
    case 'gt': return (actual as number) > (expected as number);
    case 'lt': return (actual as number) < (expected as number);
    case 'gte': return (actual as number) >= (expected as number);
    case 'lte': return (actual as number) <= (expected as number);
    case 'contains': return (actual as string).includes(expected as string);
    case 'not_contains': return !(actual as string).includes(expected as string);
    default: return actual === expected;
  }
}

/**
 * Resolve dynamic dialogues for an NPC.
 * Returns the highest-priority matching dialogue text, or null if none match.
 */
export function resolveDynamicDialogue(
  dialogues: DynamicDialogue[] | undefined,
  ctx: DialogueContext,
): string | null {
  if (!dialogues || dialogues.length === 0) return null;

  // Sort by priority descending (higher priority = checked first)
  const sorted = [...dialogues].sort((a, b) => b.priority - a.priority);

  for (const d of sorted) {
    const allMatch = d.conditions.every(c => evaluateCondition(c, ctx));
    if (allMatch) return d.text;
  }

  return null;
}

/**
 * Check if the player has any item from a list of item IDs.
 * Used for contextual hints in the UI.
 */
export function getPlayerItemHints(
  npcId: string,
  partyInventory: { itemId: string; quantity: number }[][],
): string[] {
  // No automatic hints — NPCs define their own conditions via dynamic dialogues
  return [];
}
