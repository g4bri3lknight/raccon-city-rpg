import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { SaveSlotInfo } from '../types';
import { LOCATIONS } from '../../data/loader';

export const createSaveSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  saveGame: (slot: number) => {
    const state = get();

    // Don't allow saving during combat
    if (state.phase === 'combat') return;

    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50), // Keep last 50 messages
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: state.collectedRibbons || 0,
      persistentRibbons: state.persistentRibbons || 0,
      isNewGamePlus: state.isNewGamePlus || false,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      discoveredRecipes: state.discoveredRecipes,
      herbCombineCount: state.herbCombineCount,
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
      searchedSafeRooms: state.searchedSafeRooms || [],
      lastAutoSaveTurn: state.lastAutoSaveTurn,
      bestiary: state.bestiary || [],
      achievements: state.achievements || { unlockedIds: [], unlockTimestamps: {} },
      autoCombat: state.autoCombat ?? false,
      dataVersion: state.dataVersion ?? 0,
      settingsOpen: false,
      npcReputation: state.npcReputation || {},
      questChainProgress: state.questChainProgress || {},
      completedPermanentEvents: state.completedPermanentEvents || [],
      activePermanentEffects: state.activePermanentEffects || [],
      pendingChainEvent: state.pendingChainEvent || null,
      completedChains: state.completedChains || [],
      ngPlusCycle: state.ngPlusCycle || 0,
      craftingPoints: state.craftingPoints || 0,
      totalCrafted: state.totalCrafted || 0,
      masterQualityCrafted: state.masterQualityCrafted || 0,
      runStats: state.runStats,
    };

    const saveKey = `raccoon_city_save_${slot}`;
    const saveMetaKey = `raccoon_city_save_meta_${slot}`;

    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Sconosciuto',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: state.phase,
      isNewGamePlus: state.isNewGamePlus || false,
      persistentRibbons: state.persistentRibbons || 0,
      collectedRibbons: state.collectedRibbons || 0,
    };

    try {
      if (typeof window !== 'undefined') {
        // Check size first; trim randomizedLocationData if too large, then stringify once
        if (saveData.randomizedLocationData !== null) {
          const json = JSON.stringify(saveData);
          if (json.length > 4_000_000) {
            // localStorage ~5MB limit; warn and trim randomizedLocationData
            console.warn(`[saveGame] Save data is ${(json.length / 1024).toFixed(0)}KB, trimming randomizedLocationData`);
            saveData.randomizedLocationData = null;
          } else {
            localStorage.setItem(saveKey, json);
            localStorage.setItem(saveMetaKey, JSON.stringify(meta));
            return;
          }
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }
  },

  autoSave: () => {
    const state = get();

    // Don't auto-save during combat, game-over, or title screen
    if (state.phase === 'combat' || state.phase === 'game-over' || state.phase === 'title' || state.phase === 'victory') return;
    // Don't auto-save if party is empty (not in adventure)
    if (!state.party || state.party.length === 0) return;

    const saveData = {
      version: 1,
      isAutoSave: true,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: state.collectedRibbons || 0,
      persistentRibbons: state.persistentRibbons || 0,
      isNewGamePlus: state.isNewGamePlus || false,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      discoveredRecipes: state.discoveredRecipes,
      herbCombineCount: state.herbCombineCount,
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
      searchedSafeRooms: state.searchedSafeRooms || [],
      lastAutoSaveTurn: state.turnCount,
      bestiary: state.bestiary || [],
      achievements: state.achievements || { unlockedIds: [], unlockTimestamps: {} },
      autoCombat: state.autoCombat ?? false,
      dataVersion: state.dataVersion ?? 0,
      settingsOpen: false,
      npcReputation: state.npcReputation || {},
      questChainProgress: state.questChainProgress || {},
      completedPermanentEvents: state.completedPermanentEvents || [],
      activePermanentEffects: state.activePermanentEffects || [],
      pendingChainEvent: state.pendingChainEvent || null,
      completedChains: state.completedChains || [],
      ngPlusCycle: state.ngPlusCycle || 0,
      craftingPoints: state.craftingPoints || 0,
      totalCrafted: state.totalCrafted || 0,
      masterQualityCrafted: state.masterQualityCrafted || 0,
      runStats: state.runStats,
    };

    const saveKey = 'raccoon_city_autosave';
    const saveMetaKey = 'raccoon_city_autosave_meta';

    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot: -1,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Sconosciuto',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: state.phase,
      isNewGamePlus: state.isNewGamePlus || false,
      persistentRibbons: state.persistentRibbons || 0,
      collectedRibbons: state.collectedRibbons || 0,
    };

    try {
      if (typeof window !== 'undefined') {
        if (saveData.randomizedLocationData !== null) {
          const json = JSON.stringify(saveData);
          if (json.length > 4_000_000) {
            saveData.randomizedLocationData = null;
          } else {
            localStorage.setItem(saveKey, json);
            localStorage.setItem(saveMetaKey, JSON.stringify(meta));
            set({ lastAutoSaveTurn: state.turnCount });
            return;
          }
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }

    set({ lastAutoSaveTurn: state.turnCount });
  },

  loadGame: (slot: number) => {
    const saveKey = `raccoon_city_save_${slot}`;

    try {
      if (typeof window === 'undefined') return false;

      const raw = localStorage.getItem(saveKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

      // Basic structural validation of saved data
      // Note: phase is not validated because saves always set it to null/omit it
      if (
        !Array.isArray(data.party) ||
        typeof data.turnCount !== 'number'
      ) {
        console.warn('[loadGame] Save data missing required top-level fields (party, turnCount). Aborting load.');
        return false;
      }
      for (const member of data.party) {
        if (
          !member.id ||
          !member.name ||
          typeof member.currentHp !== 'number' ||
          typeof member.maxHp !== 'number' ||
          !Array.isArray(member.inventory)
        ) {
          console.warn(`[loadGame] Party member missing required fields: ${member?.id ?? '(no id)'}. Aborting load.`);
          return false;
        }
      }

      // Check if this is a New Game+ save (saved after victory)
      const isNGP = data.isNewGamePlus || false;
      const persistentRibs = data.persistentRibbons || 0;

      set({
        phase: isNGP && data.phase === 'victory' ? 'victory' : 'exploration',
        party: data.party,
        currentLocationId: data.currentLocationId,
        combat: data.combat,
        enemies: data.enemies || [],
        activeEvent: data.activeEvent,
        eventOutcome: data.eventOutcome,
        messageLog: [
          ...data.messageLog,
          `[Turno ${data.turnCount}] 💾 Partita caricata dallo Slot ${slot}.${isNGP ? ' 🎀 Nastri persistenti: ' + persistentRibs + '/10' : ''}`,
        ],
        turnCount: data.turnCount,
        difficulty: data.difficulty || 'normale',
        selectedDifficulty: data.selectedDifficulty || 'normale',
        inventoryOpen: false,
        selectedCharacterId: data.selectedCharacterId || data.party[0]?.id || null,
        searchCounts: data.searchCounts || {},
        searchMaxes: data.searchMaxes || {},
        partySize: data.partySize || 2,
        unlockedPaths: data.unlockedPaths || [],
        visitedLocations: data.visitedLocations || [],
        completedEvents: data.completedEvents || [],
        mapOpen: false,
        collectedRibbons: data.collectedRibbons || 0,
        persistentRibbons: persistentRibs,
        isNewGamePlus: isNGP,
        gameStartTime: data.gameStartTime || Date.now(),
        collectedDocuments: data.collectedDocuments || [],
        activeNpc: null,
        npcQuestProgress: data.npcQuestProgress || {},
        npcsEncountered: data.npcsEncountered || [],
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        storyChoices: data.storyChoices || [],
        discoveredSecretRooms: data.discoveredSecretRooms || [],
        discoveredRecipes: data.discoveredRecipes || [],
        herbCombineCount: data.herbCombineCount || 0,
        endingType: data.endingType || null,
        exploredSubAreas: data.exploredSubAreas || {},
        documentsOpen: false,
        missionsOpen: false,
        npcsOpen: false,
        randomizerMode: data.randomizerMode || false,
        randomizedLocationData: data.randomizedLocationData || null,
        currentSubArea: data.currentSubArea || null,
        itemBoxItems: data.itemBoxItems || [],
        readDocuments: data.readDocuments || [],
        nemesisPursuitLevel: data.nemesisPursuitLevel || 0,
        nemesisLastSeenLocation: data.nemesisLastSeenLocation || null,
        nemesisLastSeenTurn: data.nemesisLastSeenTurn || 0,
        bossPhases: data.bossPhases || {},
        lastAutoSaveTurn: data.lastAutoSaveTurn || 0,
        bestiary: data.bestiary || [],
        achievements: data.achievements || { unlockedIds: [], unlockTimestamps: {} },
        autoCombat: data.autoCombat ?? false,
        dataVersion: data.dataVersion ?? 0,
        searchedSafeRooms: data.searchedSafeRooms || [],
        settingsOpen: false,
        skipNextEncounter: false,
        godMode: data.godMode ?? false,
        debugOpen: false,
        npcReputation: data.npcReputation || {},
        questChainProgress: data.questChainProgress || {},
        completedPermanentEvents: data.completedPermanentEvents || [],
        activePermanentEffects: data.activePermanentEffects || [],
        pendingChainEvent: data.pendingChainEvent || null,
        completedChains: data.completedChains || [],
        ngPlusCycle: data.ngPlusCycle || 0,
        craftingPoints: data.craftingPoints || 0,
        totalCrafted: data.totalCrafted || 0,
        masterQualityCrafted: data.masterQualityCrafted || 0,
        runStats: data.runStats || undefined,
      });
      // Auto-save after loading
      setTimeout(() => { try { get().autoSave(); } catch {} }, 200);
      return true;
    } catch {
      return false;
    }
  },

  getSaveInfo: (slot: number) => {
    const saveMetaKey = `raccoon_city_save_meta_${slot}`;

    try {
      if (typeof window === 'undefined') return null;

      const raw = localStorage.getItem(saveMetaKey);
      if (!raw) return null;

      return JSON.parse(raw) as SaveSlotInfo;
    } catch {
      return null;
    }
  },

  deleteSave: (slot: number) => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(`raccoon_city_save_${slot}`);
      localStorage.removeItem(`raccoon_city_save_meta_${slot}`);
    } catch {
      // silently fail
    }
  },

  // Save at victory (New Game+ save): merges run ribbons into persistent, flags as NG+
  saveGameVictory: (slot: number) => {
    const state = get();
    const totalPersistent = Math.min((state.persistentRibbons || 0) + (state.collectedRibbons || 0), 10);

    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: 0, // reset for next run
      persistentRibbons: totalPersistent,
      isNewGamePlus: true,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      discoveredRecipes: state.discoveredRecipes,
      herbCombineCount: state.herbCombineCount,
      endingType: state.endingType,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
      searchedSafeRooms: state.searchedSafeRooms || [],
      lastAutoSaveTurn: state.lastAutoSaveTurn,
      bestiary: state.bestiary || [],
      achievements: state.achievements || { unlockedIds: [], unlockTimestamps: {} },
      autoCombat: state.autoCombat ?? false,
      dataVersion: state.dataVersion ?? 0,
      settingsOpen: false,
      npcReputation: state.npcReputation || {},
      questChainProgress: state.questChainProgress || {},
      completedPermanentEvents: state.completedPermanentEvents || [],
      activePermanentEffects: state.activePermanentEffects || [],
      pendingChainEvent: state.pendingChainEvent || null,
      completedChains: state.completedChains || [],
      ngPlusCycle: state.ngPlusCycle || 0,
      craftingPoints: state.craftingPoints || 0,
      totalCrafted: state.totalCrafted || 0,
      masterQualityCrafted: state.masterQualityCrafted || 0,
      runStats: state.runStats,
    };

    const saveKey = `raccoon_city_save_${slot}`;
    const saveMetaKey = `raccoon_city_save_meta_${slot}`;
    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Vittoria',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: 'victory',
      isNewGamePlus: true,
      persistentRibbons: totalPersistent,
      collectedRibbons: 0,
    };

    try {
      if (typeof window !== 'undefined') {
        // Check size first; trim randomizedLocationData if too large
        if (saveData.randomizedLocationData !== null) {
          const json = JSON.stringify(saveData);
          if (json.length > 4_000_000) {
            console.warn(`[saveGameVictory] Save data is ${(json.length / 1024).toFixed(0)}KB, trimming randomizedLocationData`);
            saveData.randomizedLocationData = null;
          } else {
            localStorage.setItem(saveKey, json);
            localStorage.setItem(saveMetaKey, JSON.stringify(meta));
            return totalPersistent;
          }
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // silently fail
    }

    return totalPersistent;
  },

  // Start a New Game+ from a victory save
  startNewGamePlus: (persistentRibbons: number) => {
    const state = get();
    const currentCycle = state.ngPlusCycle || 0;
    const newCycle = currentCycle + 1;

    // ── Carry forward elements across NG+ ──
    const carriedBestiary = state.bestiary || [];
    const carriedAchievements = state.achievements || { unlockedIds: [], unlockTimestamps: {} };
    const carriedPersistentRibbons = Math.min(persistentRibbons, 10);
    const carriedDiscoveredRecipes = state.discoveredRecipes || [];

    set({
      phase: 'character-select',
      party: [],
      messageLog: [
        `🎀 Nuovo Gioco+ Ciclo ${newCycle} attivato! Nastri persistenti: ${carriedPersistentRibbons}/10`,
        `📈 Difficoltà: nemici ×${newCycle === 1 ? '1.15' : newCycle === 2 ? '1.30' : '1.50'}, incontri +${newCycle === 1 ? '5' : newCycle === 2 ? '10' : '15'}%`,
        '\nScegli i tuoi personaggi per la nuova avventura...',
      ],
      turnCount: 0,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      skipNextEncounter: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: carriedPersistentRibbons,
      isNewGamePlus: true,
      gameStartTime: 0,
      inventoryOpen: false,
      selectedCharacterId: null,
      enemies: [],
      combat: null,
      activeEvent: null,
      eventOutcome: null,
      difficulty: 'normale',
      selectedDifficulty: 'normale',
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      collectedDocuments: [],
      documentsOpen: false,
      missionsOpen: false,
      activeNpc: null,
      npcQuestProgress: {},
      npcsEncountered: [],
      npcsOpen: false,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: [],
      discoveredSecretRooms: [],
      discoveredRecipes: carriedDiscoveredRecipes,
      herbCombineCount: 0,
      questChainProgress: {},
      endingType: null,
      exploredSubAreas: {},
      bossPhases: {},
      nemesisPursuitLevel: 0,
      nemesisLastSeenLocation: null,
      nemesisLastSeenTurn: 0,
      debugOpen: false,
      godMode: false,
      autoCombat: false,
      notification: null,
      randomizerMode: false,
      randomizedLocationData: null,
      currentSubArea: null,
      itemBoxItems: [],
      searchedSafeRooms: [],
      readDocuments: [],
      lastAutoSaveTurn: 0,
      settingsOpen: false,
      dataVersion: 0,
      npcReputation: {},
      completedPermanentEvents: [],
      activePermanentEffects: [],
      pendingChainEvent: null,
      completedChains: [],
      craftingPoints: 0,
      totalCrafted: 0,
      masterQualityCrafted: 0,
      // ── Carried-forward NG+ elements ──
      ngPlusCycle: newCycle,
      bestiary: carriedBestiary,
      achievements: carriedAchievements,
      runStats: { ...(get().runStats), totalDamageDealt: 0, totalDamageReceived: 0, totalHealingDone: 0, enemiesDefeated: 0, bossesDefeated: 0, itemsCrafted: 0, itemsUsed: 0, documentsFound: 0, secretRoomsDiscovered: 0, recipesDiscovered: 0, questsCompleted: 0, questChainsCompleted: 0, distanceTraveled: 0, searchesPerformed: 0, combatTurnsTotal: 0, perfectCombats: 0, longestCombo: 0, turnsSurvived: 0, dynamicEventsSurvived: 0, playTimeSeconds: 0, endingType: null, characterArchetypes: [], ngPlusCycle: newCycle },
    });
  },
});
