// ═══════════════════════════════════════════════════════════════
// Shared types for field editor components
// ═══════════════════════════════════════════════════════════════

/** Starting item entry for character starting items editor */
export interface StartingItemEntry {
  itemId: string;
  quantity: number;
  isEquipped?: boolean;
}

/** Story event data for location story event editor */
export interface StoryEventData {
  title: string;
  description: string;
  choices: {
    text: string;
    outcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
      triggerCombat?: boolean;
      combatEnemyIds?: string[];
    };
  }[];
  puzzle?: {
    type: 'combination' | 'sequence' | 'key_required';
    requiredItemId?: string;
    requiredItemIds?: string[];
    successOutcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
    };
    failMessage: string;
    combinationCode?: string;
    sequencePattern?: string[];
  };
}
