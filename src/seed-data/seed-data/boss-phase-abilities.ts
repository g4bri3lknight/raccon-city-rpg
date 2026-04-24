/**
 * Boss phase abilities — abilities that are added to bosses during phase transitions.
 * These are seeded as GameEnemyAbility records and referenced by boss phases via ability IDs.
 * Used by seed-enemy-abilities and seed-boss-phases routes.
 */

export interface SeedBossPhaseAbility {
  id: string;
  name: string;
  description: string;
  power: number;
  chance: number;
  effects: object[];
}

export const BOSS_PHASE_ABILITIES: SeedBossPhaseAbility[] = [
  // ── Tyrant Boss — Phase 2 Abilities ──
  {
    id: 'impatto_sismico',
    name: 'Impatto Sismico',
    description: 'Un pugno che incrina il suolo.',
    power: 2.2,
    chance: 25,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.2 },
      { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 40, duration: 1 },
    ],
  },
  {
    id: 'rantolo_mortale',
    name: 'Rantolo Mortale',
    description: 'Un rantolo che paralizza.',
    power: 0.8,
    chance: 15,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.8 },
      { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 60, duration: 1 },
    ],
  },
  // ── NEMESIS — Phase Abilities ──
  {
    id: 'barrage_razzo',
    name: 'Barrage Razzo',
    description: 'Spara una salva di razzi.',
    power: 1.8,
    chance: 20,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 1.8 },
    ],
  },
  {
    id: 'presa_letale',
    name: 'Presa Letale',
    description: 'Afferra e stritza.',
    power: 2.8,
    chance: 15,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.8, noMiss: true },
    ],
  },
  {
    id: 's_t_a_r_s',
    name: 'S.T.A.R.S!!!',
    description: 'Un urlo devastante.',
    power: 0.6,
    chance: 20,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.6 },
      { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'stunned', chance: 60, duration: 1 },
    ],
  },
  // ── Proto-Tyrant — Phase Abilities ──
  {
    id: 'rigenerazione',
    name: 'Rigenerazione',
    description: 'Si rigenera parzialmente.',
    power: 0.5,
    chance: 15,
    effects: [
      { type: 'heal', trigger: 'on_use', target: 'self', amount: 50 },
    ],
  },
  {
    id: 'attacco_self_destruct',
    name: 'Attacco Self-Destruct',
    description: 'Si autodistrugge causando danni enormi.',
    power: 3.0,
    chance: 10,
    effects: [
      { type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 3.0 },
    ],
  },
];
