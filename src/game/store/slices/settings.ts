import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { DifficultyLevel } from '../../types';

export const createSettingsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  toggleSettings: () => {
    set(state => ({ settingsOpen: !state.settingsOpen }));
  },

  setAutoCombatPreference: (val: boolean) => {
    set({ autoCombat: val });
    // Persist in localStorage so combat start respects this default
    try {
      const key = 'raccoon_city_settings';
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      existing.autoCombatDefault = val;
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  },

  selectDifficulty: (difficulty: DifficultyLevel) => {
    set({ selectedDifficulty: difficulty });
  },

  toggleRandomizerMode: () => {
    set(state => ({ randomizerMode: !state.randomizerMode }));
  },
});
