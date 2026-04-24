import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ACHIEVEMENTS } from '../../data/loader';
import { getKeyItemIds } from '../helpers';
import { playMenuOpen, playMenuClose, playAchievement } from '../../engine/sounds';

let achievementNotifTimer: ReturnType<typeof setTimeout> | null = null;

export const createAchievementsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  toggleAchievements: () => {
    try {
      const isOpen = get().achievementsOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ achievementsOpen: !state.achievementsOpen }));
  },

  toggleBestiary: () => {
    try {
      const isOpen = get().bestiaryOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ bestiaryOpen: !state.bestiaryOpen }));
  },

  unlockAchievement: (id: string) => {
    const state = get();
    if (state.achievements.unlockedIds.includes(id)) return;
    const ach = ACHIEVEMENTS[id];
    const name = ach?.name || id;
    // Play achievement sound (#36)
    try { playAchievement(); } catch {}
    set({
      achievements: {
        unlockedIds: [...state.achievements.unlockedIds, id],
        unlockTimestamps: { ...state.achievements.unlockTimestamps, [id]: Date.now() },
      },
      newAchievementNotification: `🏆 Traguardo sbloccato: ${name}`,
    });
    // Clear notification after 4 seconds (with race-condition protection)
    if (achievementNotifTimer) clearTimeout(achievementNotifTimer);
    achievementNotifTimer = setTimeout(() => {
      set({ newAchievementNotification: null });
      achievementNotifTimer = null;
    }, 4000);
  },

  checkAchievements: () => {
    const state = get();
    const alreadyUnlocked = new Set(state.achievements.unlockedIds);

    const checkAndUnlock = (conditionId: string) => {
      if (alreadyUnlocked.has(conditionId)) return;
      get().unlockAchievement(conditionId);
      alreadyUnlocked.add(conditionId);
    };

    // first_kill: Any enemy defeated (bestiary has any defeated entry)
    if (state.bestiary.some(b => b.defeated && b.timesDefeated > 0)) {
      checkAndUnlock('first_blood');
    }

    // kill_100: Sum of all bestiary timesDefeated >= 100
    const totalKills = state.bestiary.reduce((sum, b) => sum + b.timesDefeated, 0);
    if (totalKills >= 100) {
      checkAndUnlock('centurion');
    }

    // defeat_tyrant: bestiary has tyrant_boss with defeated=true
    if (state.bestiary.some(b => b.enemyId === 'tyrant_boss' && b.defeated)) {
      checkAndUnlock('boss_slayer');
    }

    // defeat_nemesis_invasion: bestiary has nemesis_boss with defeated=true
    if (state.bestiary.some(b => b.enemyId === 'nemesis_boss' && b.defeated)) {
      checkAndUnlock('nemesis_defeated');
    }

    // reach_level_10: Any party member has level >= 10
    if (state.party.some(p => p.level >= 10)) {
      checkAndUnlock('level_10');
    }

    // visit_all_locations: visitedLocations.length >= 6
    if (state.visitedLocations.length >= 6) {
      checkAndUnlock('explorer');
    }

    // survive_50_turns: turnCount >= 50
    if (state.turnCount >= 50) {
      checkAndUnlock('survivor_50_turns');
    }

    // victory_under_60_turns: phase is 'victory' and turnCount < 60
    if (state.phase === 'victory' && state.turnCount < 60) {
      checkAndUnlock('speedrunner');
    }

    // find_all_keys: Any party member has all 3 keys simultaneously
    const allKeys = [...getKeyItemIds()];
    if (state.party.some(p => allKeys.every(k => p.inventory.some(i => i.itemId === k)))) {
      checkAndUnlock('all_keys_found');
    }

    // collect_ribbon_1: collectedRibbons >= 1
    if (state.collectedRibbons >= 1) {
      checkAndUnlock('ribbon_1');
    }

    // collect_ribbon_5: collectedRibbons >= 5
    if (state.collectedRibbons >= 5) {
      checkAndUnlock('ribbon_5');
    }

    // collect_all_ribbons: collectedRibbons >= 10
    if (state.collectedRibbons >= 10) {
      checkAndUnlock('ribbon_all');
    }

    // bestiary_5: bestiary entries with encountered=true >= 5
    if (state.bestiary.filter(b => b.encountered).length >= 5) {
      checkAndUnlock('bestiary_5');
    }

    // bestiary_all: bestiary entries with defeated=true >= 12
    if (state.bestiary.filter(b => b.defeated).length >= 13) {
      checkAndUnlock('bestiary_all');
    }

    // help_survivors: completedEvents includes city_outskirts
    if (state.completedEvents.includes('city_outskirts')) {
      checkAndUnlock('savior');
    }

    // no_damage_victory: won combat without any party member losing HP
    if (state.phase === 'victory' || state.phase === 'exploration') {
      // Check after combat: if party has no missing HP from start of last combat
      if (state.herbCombineCount >= 3) {
        checkAndUnlock('herb_master');
      }
    }

    // game_victory: phase is 'victory'
    if (state.phase === 'victory') {
      checkAndUnlock('victory');

      // NG+ exclusive achievements
      const ngCycle = state.ngPlusCycle || 0;
      if (ngCycle >= 1) {
        checkAndUnlock('ng_plus_victory');
      }
      if (ngCycle >= 3) {
        checkAndUnlock('ng_plus_master_victory');
      }
      // NG+ cycle milestones
      if (ngCycle >= 1) {
        checkAndUnlock('ach_ng_plus_1');
      }
      if (ngCycle >= 3) {
        checkAndUnlock('ach_ng_plus_3');
      }
      if (ngCycle >= 5) {
        checkAndUnlock('ach_ng_plus_5');
      }
    }

    // chain_survivor: completed at least one chain event sequence
    if (state.completedChains && state.completedChains.length > 0) {
      checkAndUnlock('chain_survivor');
    }

    // #8 Crafting achievements
    if ((state.totalCrafted || 0) >= 20) {
      checkAndUnlock('master_crafter');
    }
    if ((state.masterQualityCrafted || 0) >= 3) {
      checkAndUnlock('quality_crafter');
    }
  },

  incrementHerbCombine: () => {
    const state = get();
    const newCount = state.herbCombineCount + 1;
    set({ herbCombineCount: newCount });
    // Check immediately
    if (newCount >= 3) {
      get().checkAchievements();
    }
  },

  checkPerfectCombat: () => {
    const state = get();
    if (state.achievements.unlockedIds.includes('perfect_combat')) return;
    // A combat just ended — check if party took zero damage
    const allFullHp = state.party.every(p => p.currentHp > 0 && p.currentHp === p.maxHp);
    const anyDamageTaken = state.combat?.log?.some(entry =>
      entry.actorType === 'enemy' && entry.targetType === undefined && entry.damage && entry.damage > 0
    ) ?? false;
    if (!anyDamageTaken) {
      get().unlockAchievement('perfect_combat');
    }
  },

  checkAutoCombatVictory: () => {
    const state = get();
    if (state.achievements.unlockedIds.includes('auto_combat_win')) return;
    if (state.phase === 'victory' && state.autoCombat) {
      get().unlockAchievement('auto_combat_win');
    }
  },
});
