// Static enemy data has been moved to src/seed-data/enemies.ts for seed routes.
// At runtime, enemies are loaded from DB via loader.ts → /api/game-data.

import { EnemyDefinition } from '../types';

// Image URL templates (Category B — no DB table yet)
export const ENEMY_IMAGES: Record<string, string> = {
  zombie: '/api/media/image?id=zombie',
  zombie_female: '/api/media/image?id=zombie_female',
  zombie_soldier: '/api/media/image?id=zombie_soldier',
  zombie_doctor: '/api/media/image?id=zombie_doctor',
  zombie_dog: '/api/media/image?id=zombie_dog',
  cerberus_alpha: '/api/media/image?id=cerberus_alpha',
  licker: '/api/media/image?id=licker',
  licker_smasher: '/api/media/image?id=licker_smasher',
  licker_crawler: '/api/media/image?id=licker_crawler',
  hunter: '/api/media/image?id=hunter',
  tyrant_boss: '/api/media/image?id=tyrant',
  nemesis_boss: '/api/media/image?id=nemesis',
};

export const CHARACTER_IMAGES: Record<string, string> = {
  tank: '/api/media/image?id=tank',
  healer: '/api/media/image?id=healer',
  dps: '/api/media/image?id=dps',
  control: '/api/media/image?id=control',
};

// Boss phases are now loaded from DB via loader.ts.
// Seed data: src/seed-data/boss-phases.ts
// No static export — use BOSS_PHASES from loader.ts instead.
