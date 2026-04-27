import { create } from 'zustand';
import { GameStore, SaveSlotInfo } from './types';
import { getDefaultState } from './initial-state';
import { createCoreSlice } from './slices/core';
import { createExplorationSlice } from './slices/exploration';
import { createCombatSlice } from './slices/combat';
import { createInventorySlice } from './slices/inventory';
import { createAchievementsSlice } from './slices/achievements';
import { createSettingsSlice } from './slices/settings';
import { createPuzzleSlice } from './slices/puzzle';
import { createQteSlice } from './slices/qte';
import { createDocumentsSlice } from './slices/documents';
import { createNpcSlice } from './slices/npc';
import { createEventsSlice } from './slices/events';
import { createSafeRoomSlice } from './slices/safe-room';
import { createSaveSlice } from './slices/save';
import { createDebugSlice } from './slices/debug';
import { createRunStatsSlice } from './slices/run-stats';
import { createQuestChainsSlice } from './slices/quest-chains';

// Re-export for backward compatibility
export { getDifficultyConfig } from '../data/difficulty';
export { fetchGameSettings, getMaxInventorySlots, getMaxItemBoxSlots, getStartingInventorySlots, getDefaultItemBoxItems, DEFAULT_GAME_SETTINGS, applyThemeSettings } from './settings-cache';
export type { SaveSlotInfo } from './types';

const defaultState = getDefaultState();

export const useGameStore = create<GameStore>()((...a) => ({
  ...defaultState,
  ...createCoreSlice(...a),
  ...createExplorationSlice(...a),
  ...createCombatSlice(...a),
  ...createInventorySlice(...a),
  ...createAchievementsSlice(...a),
  ...createSettingsSlice(...a),
  ...createPuzzleSlice(...a),
  ...createQteSlice(...a),
  ...createDocumentsSlice(...a),
  ...createNpcSlice(...a),
  ...createEventsSlice(...a),
  ...createSafeRoomSlice(...a),
  ...createSaveSlice(...a),
  ...createDebugSlice(...a),
  ...createRunStatsSlice(...a),
  ...createQuestChainsSlice(...a),
}));
