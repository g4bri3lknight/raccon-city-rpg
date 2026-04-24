/**
 * Boss phase seed data — static definitions for 3 bosses, 6 total phases.
 * Used by seed-boss-phases route to populate the DB.
 * At runtime, boss phases are loaded from DB via loader.ts → /api/game-data.
 */

export interface SeedBossPhase {
  id: string;
  enemyId: string;
  name: string;
  hpThreshold: number;
  hpMultiplier: number;
  atkMultiplier: number;
  defMultiplier: number;
  spdMultiplier: number;
  newAbilities?: string[]; // ability IDs
  message: string;
  sortOrder: number;
}

export const SEED_BOSS_PHASES: SeedBossPhase[] = [
  // ── T-103 Tyrant ──
  {
    id: 'tyrant_boss_phase_1',
    enemyId: 'tyrant_boss',
    name: 'Terminus',
    hpThreshold: 0.6,
    hpMultiplier: 1.0,
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    spdMultiplier: 1.0,
    message: '⚠️ Il T-103 emette un gemito metallico e la sua pelle inizia a spaccarsi. ENRAGE FASE 1!',
    sortOrder: 0,
  },
  {
    id: 'tyrant_boss_phase_2',
    enemyId: 'tyrant_boss',
    name: 'Cortus',
    hpThreshold: 0.3,
    hpMultiplier: 1.2,
    atkMultiplier: 1.3,
    defMultiplier: 0.7,
    spdMultiplier: 1.3,
    newAbilities: ['impatto_sismico', 'rantolo_mortale'],
    message: '⚠️ Il Tyrant rivela i tentacoli! Le sue ferite si rigenerano. ENRAGE FASE 2 — Più veloce e letale!',
    sortOrder: 1,
  },
  // ── NEMESIS ──
  {
    id: 'nemesis_boss_phase_1',
    enemyId: 'nemesis_boss',
    name: 'Pursuer',
    hpThreshold: 0.65,
    hpMultiplier: 1.0,
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    spdMultiplier: 1.0,
    newAbilities: ['barrage_razzo'],
    message: '💀 "S.T.A.R.S..." — NEMESIS si toglie il cappotto! Le armi sono esposte! FASE 2!',
    sortOrder: 0,
  },
  {
    id: 'nemesis_boss_phase_2',
    enemyId: 'nemesis_boss',
    name: 'Avenger',
    hpThreshold: 0.35,
    hpMultiplier: 1.3,
    atkMultiplier: 1.4,
    defMultiplier: 0.8,
    spdMultiplier: 1.2,
    newAbilities: ['presa_letale', 's_t_a_r_s'],
    message: '💀 NEMESIS è furioso! I tentacoli esplodono! FASE 3 — ULTIMA FORMA!',
    sortOrder: 1,
  },
  // ── Proto-Tyrant (Secret Boss) ──
  {
    id: 'proto_tyrant_phase_1',
    enemyId: 'proto_tyrant',
    name: 'Instabile',
    hpThreshold: 0.55,
    hpMultiplier: 1.0,
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    spdMultiplier: 1.0,
    newAbilities: ['rigenerazione'],
    message: '🧪 Il Proto-Tyrant si contorce! La mutazione si accelera! FASE 1!',
    sortOrder: 0,
  },
  {
    id: 'proto_tyrant_phase_2',
    enemyId: 'proto_tyrant',
    name: 'Completo',
    hpThreshold: 0.25,
    hpMultiplier: 1.5,
    atkMultiplier: 1.5,
    defMultiplier: 0.5,
    spdMultiplier: 1.4,
    newAbilities: ['attacco_self_destruct'],
    message: '🧪 Il Proto-Tyrant raggiunge la forma finale! È ora o mai! FASE 2 — MAX POTENZA!',
    sortOrder: 1,
  },
];
