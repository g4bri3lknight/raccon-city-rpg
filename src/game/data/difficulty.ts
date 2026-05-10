import type { DifficultyConfig } from '../types';

// ── Difficulty configuration (dynamic: levels come from template config) ──

/** Fallback defaults used when no template config is loaded (backwards compatibility) */
const FALLBACK_CONFIGS: Record<string, DifficultyConfig> = {
  sopravvissuto: { label: 'Sopravvissuto', color: '#22c55e', icon: '🏃', statMult: 0.6, lootMult: 1.5, minEnemies: 1, maxEnemies: 2, expMult: 1.4, enemyCritChance: 5, description: 'Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia.' },
  normale: { label: 'Normale', color: '#eab308', icon: '⚔️', statMult: 0.85, lootMult: 1.1, minEnemies: 1, maxEnemies: 3, expMult: 1.0, enemyCritChance: 10, description: "Bilanciato. L'esperienza RPG completa." },
  incubo: { label: 'Incubo', color: '#ef4444', icon: '💀', statMult: 1.4, lootMult: 0.6, minEnemies: 2, maxEnemies: 4, expMult: 0.8, enemyCritChance: 20, description: 'Nemici potenti, poco bottino. Solo per i più coraggiosi.' },
};

let DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = { ...FALLBACK_CONFIGS };

/** Available difficulty level keys (ordered) */
let DIFFICULTY_LEVELS: string[] = ['sopravvissuto', 'normale', 'incubo'];

/** Default difficulty level (first in the list) */
function getDefaultDifficulty(): string {
  return DIFFICULTY_LEVELS[0] || 'normale';
}

export function getDifficultyConfig(difficulty: string, partySize?: number): DifficultyConfig {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS[getDefaultDifficulty()];
  if (partySize) {
    const partyMult = partySize === 1 ? 0.9 : partySize === 2 ? 1.0 : 1.1;
    return { ...config, statMult: config.statMult * partyMult };
  }
  return config;
}

/** Update difficulty configs from DB (called by loader) */
export function setDifficultyConfigs(configs: Record<string, DifficultyConfig>) {
  DIFFICULTY_CONFIGS = { ...configs };
  DIFFICULTY_LEVELS = Object.keys(configs);
}

/** Get the list of available difficulty level keys */
export function getDifficultyLevels(): string[] {
  return DIFFICULTY_LEVELS;
}

/** Get the default difficulty key */
export { getDefaultDifficulty };
