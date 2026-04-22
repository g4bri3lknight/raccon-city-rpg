import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { RunStats, CombatLogEntry } from '../../types';

export const createRunStatsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  incrementRunStat: (key: keyof RunStats, value: number = 1) => {
    const current = get().runStats[key];
    if (typeof current !== 'number') return; // skip non-numeric keys
    set(state => ({
      runStats: {
        ...state.runStats,
        [key]: current + value,
      },
    }));
  },

  _trackCombatVictoryStats: (combatLog: CombatLogEntry[], defeatedEnemies: { definitionId: string; isBoss: boolean; currentHp: number }[], comboCount: number, partyTookDamage: boolean) => {
    const state = get();
    // Track damage dealt and received from combat log
    let dmgDealt = 0;
    let dmgReceived = 0;
    let combatTurns = 0;
    for (const entry of combatLog) {
      if (entry.damage && entry.damage > 0) {
        if (entry.actorType === 'player') dmgDealt += entry.damage;
        if (entry.actorType === 'enemy') dmgReceived += entry.damage;
      }
      if (entry.heal && entry.heal > 0 && entry.actorType === 'player') {
        get().incrementRunStat('totalHealingDone', entry.heal);
      }
    }
    // Combat turns = highest turn number in the log
    for (const entry of combatLog) {
      if (entry.turn > combatTurns) combatTurns = entry.turn;
    }

    get().incrementRunStat('totalDamageDealt', dmgDealt);
    get().incrementRunStat('totalDamageReceived', dmgReceived);
    get().incrementRunStat('combatTurnsTotal', combatTurns);

    let enemiesKilled = 0;
    let bossesKilled = 0;
    for (const e of defeatedEnemies) {
      if (e.currentHp <= 0) {
        enemiesKilled++;
        if (e.isBoss) bossesKilled++;
      }
    }
    if (enemiesKilled > 0) get().incrementRunStat('enemiesDefeated', enemiesKilled);
    if (bossesKilled > 0) get().incrementRunStat('bossesDefeated', bossesKilled);

    // Track combo
    if (comboCount > state.runStats.longestCombo) {
      set(s => ({ runStats: { ...s.runStats, longestCombo: comboCount } }));
    }

    // Track perfect combat
    if (!partyTookDamage && enemiesKilled > 0) {
      get().incrementRunStat('perfectCombats');
    }
  },
});
