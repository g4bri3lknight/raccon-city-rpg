// ── Achievement definitions are now loaded from DB at runtime via loader.ts ──
// This file only exports UI constants (category labels) used by the AchievementPanel.

import { ACHIEVEMENTS_DATA } from './loader';

// Re-export ACHIEVEMENTS from loader for backward compatibility
export { ACHIEVEMENTS_DATA as ACHIEVEMENTS };

export const ACHIEVEMENT_CATEGORY_LABELS: Record<string, string> = {
  combat: '⚔️ Combattimento',
  exploration: '🗺️ Esplorazione',
  collection: '🎁 Collezione',
  story: '📖 Storia',
  special: '⭐ Speciale',
};

// Computed from DB-loaded data — call this function to get the live count
export function getTotalAchievements(): number {
  return Object.keys(ACHIEVEMENTS_DATA).length;
}
