import { VictoryCondition, EnemyInstance } from '../types';

// ==========================================
// #15 - VICTORY CONDITION DEFINITIONS
// ==========================================

export interface VictoryConditionDef {
  id: string;
  type: 'survive_turns' | 'destroy_weak_point' | 'kill_target';
  turnsRequired?: number;
  description: string;
  rewardExpBonus: number;
  rewardLabel: string;
  appliesTo: string[];   // enemy definition IDs where this can trigger
  chance: number;         // 0-100, chance of appearing for eligible fights
}

export const VICTORY_CONDITIONS: VictoryConditionDef[] = [
  {
    id: 'survive_5',
    type: 'survive_turns',
    turnsRequired: 5,
    description: 'Sopravvivi 5 turni!',
    rewardExpBonus: 30,
    rewardLabel: 'Sopravvissuto!',
    appliesTo: ['zombie', 'zombie_female', 'zombie_soldier', 'zombie_doctor', 'zombie_dog', 'cerberus_alpha'],
    chance: 30,
  },
  {
    id: 'survive_8',
    type: 'survive_turns',
    turnsRequired: 8,
    description: 'Sopravvivi 8 turni!',
    rewardExpBonus: 50,
    rewardLabel: 'Resistente!',
    appliesTo: ['licker', 'licker_smasher', 'licker_crawler', 'hunter'],
    chance: 20,
  },
  {
    id: 'destroy_weak_point_tyrant',
    type: 'destroy_weak_point',
    turnsRequired: 12,
    description: 'Distruggi il punto debole del Tyrant! (uccidi entro 12 turni)',
    rewardExpBonus: 80,
    rewardLabel: 'Punto Debole Distrutto!',
    appliesTo: ['tyrant_boss'],
    chance: 100,
  },
  {
    id: 'destroy_weak_point_nemesis',
    type: 'destroy_weak_point',
    turnsRequired: 10,
    description: 'Distruggi il punto debole di Nemesis! (uccidi entro 10 turni)',
    rewardExpBonus: 100,
    rewardLabel: 'Nemesis Annientato!',
    appliesTo: ['nemesis_boss'],
    chance: 100,
  },
  {
    id: 'kill_target_first',
    type: 'kill_target',
    description: 'Elimina il bersaglio primario per primo!',
    rewardExpBonus: 40,
    rewardLabel: 'Bersaglio Eliminato!',
    appliesTo: ['zombie', 'zombie_female', 'zombie_soldier', 'zombie_doctor', 'zombie_dog', 'cerberus_alpha', 'licker', 'licker_smasher', 'licker_crawler', 'hunter'],
    chance: 25,
  },
];

/**
 * Roll for a victory condition based on the enemies present in combat.
 * Returns a VictoryCondition if one applies, or null.
 */
export function rollVictoryCondition(enemies: EnemyInstance[]): VictoryCondition | null {
  if (enemies.length === 0) return null;

  const enemyDefIds = Array.from(new Set(enemies.map(e => e.definitionId)));

  for (const def of VICTORY_CONDITIONS) {
    // Check if any enemy type matches this condition's appliesTo
    if (!enemyDefIds.some(id => def.appliesTo.includes(id))) continue;

    // Roll for chance
    if (Math.random() * 100 >= def.chance) continue;

    // kill_target requires multi-enemy fights
    if (def.type === 'kill_target' && enemies.length < 2) continue;

    if (def.type === 'kill_target') {
      // Pick the strongest enemy (highest maxHp) as the target
      const candidates = enemies.filter(e => def.appliesTo.includes(e.definitionId));
      if (candidates.length === 0) continue;
      const target = candidates.reduce((a, b) => a.maxHp >= b.maxHp ? a : b);
      return {
        type: 'kill_target',
        targetEnemyId: target.id,
        description: `Elimina ${target.name} per primo!`,
        rewardExpBonus: def.rewardExpBonus,
        rewardLabel: def.rewardLabel,
      };
    }

    return {
      type: def.type,
      turnsRequired: def.turnsRequired,
      description: def.description,
      rewardExpBonus: def.rewardExpBonus,
      rewardLabel: def.rewardLabel,
    };
  }

  return null;
}
