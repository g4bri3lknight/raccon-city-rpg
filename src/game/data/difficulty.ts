import type { DifficultyLevel, DifficultyConfig } from '../types';

// ── Difficulty configuration (mutable: loaded from DB via loader, falls back to defaults) ──
let DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  sopravvissuto: { label: 'Sopravvissuto', color: '#22c55e', icon: '🏃', statMult: 0.6, lootMult: 1.5, minEnemies: 1, maxEnemies: 2, expMult: 1.4, enemyCritChance: 5, description: 'Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia.' },
  normale: { label: 'Normale', color: '#eab308', icon: '⚔️', statMult: 0.85, lootMult: 1.1, minEnemies: 1, maxEnemies: 3, expMult: 1.0, enemyCritChance: 10, description: 'Bilanciato. La vera esperienza di Raccoon City.' },
  incubo: { label: 'Incubo', color: '#ef4444', icon: '💀', statMult: 1.4, lootMult: 0.6, minEnemies: 2, maxEnemies: 4, expMult: 0.8, enemyCritChance: 20, description: 'Nemici potenti, poco bottino. Solo per i più coraggiosi.' },
};

export function getDifficultyConfig(difficulty: DifficultyLevel, partySize?: number): DifficultyConfig {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normale;
  if (partySize) {
    const partyMult = partySize === 1 ? 0.9 : partySize === 2 ? 1.0 : 1.1;
    return { ...config, statMult: config.statMult * partyMult };
  }
  return config;
}

/** Update difficulty configs from DB (called by loader) */
export function setDifficultyConfigs(configs: Record<string, DifficultyConfig>) {
  const updated = { ...DIFFICULTY_CONFIGS };
  for (const [key, cfg] of Object.entries(configs)) {
    if (key in updated) updated[key as DifficultyLevel] = cfg;
  }
  DIFFICULTY_CONFIGS = updated;
}
