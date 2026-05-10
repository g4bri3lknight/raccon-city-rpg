import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { SaveSlotInfo } from '../types';
import { LOCATIONS, NGPLUS_CONFIG } from '../../data/loader';
import { playSafeRoomAmbient } from '../../engine/sounds';
import { getDefaultState } from '../initial-state';

// ─── Helper: build the save data blob ─────────────────────────────────
function buildSaveData(state: ReturnType<GameStore['getState']>, isAutoSave = false) {
  const d = state;
  return {
    version: 1,
    ...(isAutoSave ? { isAutoSave: true } : {}),
    timestamp: new Date().toISOString(),
    party: d.party,
    currentLocationId: d.currentLocationId,
    combat: null,
    enemies: [],
    activeEvent: null,
    eventOutcome: null,
    messageLog: d.messageLog.slice(-50),
    turnCount: d.turnCount,
    difficulty: d.difficulty,
    selectedDifficulty: d.selectedDifficulty,
    selectedCharacterId: d.selectedCharacterId,
    searchCounts: d.searchCounts,
    searchMaxes: d.searchMaxes,
    partySize: d.partySize,
    unlockedPaths: d.unlockedPaths,
    visitedLocations: d.visitedLocations,
    completedEvents: d.completedEvents || [],
    collectedRibbons: d.collectedRibbons || 0,
    persistentRibbons: d.persistentRibbons || 0,
    isNewGamePlus: d.isNewGamePlus || false,
    gameStartTime: d.gameStartTime || Date.now(),
    collectedDocuments: d.collectedDocuments,
    activeNpc: null,
    npcQuestProgress: d.npcQuestProgress,
    npcsEncountered: d.npcsEncountered,
    activeDynamicEvent: null,
    dynamicEventTurnsLeft: 0,
    storyChoices: d.storyChoices,
    discoveredSecretRooms: d.discoveredSecretRooms,
    discoveredRecipes: d.discoveredRecipes,
    craftingCombineCount: d.craftingCombineCount || d.herbCombineCount || 0,
    endingType: isAutoSave ? null : d.endingType,
    exploredSubAreas: d.exploredSubAreas,
    randomizerMode: d.randomizerMode,
    randomizedLocationData: d.randomizedLocationData,
    currentSubArea: d.currentSubArea,
    itemBoxItems: d.itemBoxItems,
    readDocuments: d.readDocuments,
    pursuerLevel: d.pursuerLevel || d.nemesisPursuitLevel || 0,
    pursuerLastSeenLocation: d.pursuerLastSeenLocation || d.nemesisLastSeenLocation || null,
    pursuerLastSeenTurn: d.pursuerLastSeenTurn || d.nemesisLastSeenTurn || 0,
    bossPhases: d.bossPhases,
    searchedSafeRooms: d.searchedSafeRooms || [],
    lastAutoSaveTurn: d.lastAutoSaveTurn,
    bestiary: d.bestiary || [],
    achievements: d.achievements || { unlockedIds: [], unlockTimestamps: {} },
    autoCombat: d.autoCombat ?? false,
    dataVersion: d.dataVersion ?? 0,
    settingsOpen: false,
    helpOpen: false,
    npcReputation: d.npcReputation || {},
    questChainProgress: d.questChainProgress || {},
    completedPermanentEvents: d.completedPermanentEvents || [],
    activePermanentEffects: d.activePermanentEffects || [],
    pendingChainEvent: d.pendingChainEvent || null,
    completedChains: d.completedChains || [],
    ngPlusCycle: d.ngPlusCycle || 0,
    ngPlusEnemyMultiplier: d.ngPlusEnemyMultiplier || 1,
    craftingPoints: d.craftingPoints || 0,
    totalCrafted: d.totalCrafted || 0,
    masterQualityCrafted: d.masterQualityCrafted || 0,
    runStats: d.runStats,
  };
}

// ─── Helper: build save meta ──────────────────────────────────────────
function buildMeta(state: ReturnType<GameStore['getState']>, slot: number, phase?: string): SaveSlotInfo {
  const location = LOCATIONS[state.currentLocationId];
  return {
    slot,
    timestamp: new Date().toISOString(),
    turnCount: state.turnCount,
    locationName: location?.name || (phase === 'victory' ? 'Vittoria' : 'Sconosciuto'),
    partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
    phase: phase || state.phase,
    isNewGamePlus: state.isNewGamePlus || false,
    persistentRibbons: state.persistentRibbons || 0,
    collectedRibbons: state.collectedRibbons || 0,
  };
}

// ─── Helper: trim save data if too large ──────────────────────────────
function trimIfLarge(saveData: Record<string, unknown>) {
  if (saveData.randomizedLocationData !== null) {
    const json = JSON.stringify(saveData);
    if (json.length > 4_000_000) {
      console.warn(`[save] Save data is ${(json.length / 1024).toFixed(0)}KB, trimming randomizedLocationData`);
      saveData.randomizedLocationData = null;
    }
  }
}

// ─── Helper: POST save to API ────────────────────────────────────────
async function apiSave(slot: number, saveData: Record<string, unknown>, meta: SaveSlotInfo) {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, data: saveData, meta }),
  });
  if (!res.ok) throw new Error(`Save API error: ${res.status}`);
}

// ─── Helper: GET save from API ───────────────────────────────────────
async function apiLoad(slot: number): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/save?slot=${slot}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

// ─── Helper: DELETE save from API ────────────────────────────────────
async function apiDelete(slot: number) {
  await fetch(`/api/save?slot=${slot}`, { method: 'DELETE' });
}

// ─── Helper: GET all save slots meta from API ────────────────────────
async function apiFetchAllMeta(): Promise<Record<number, SaveSlotInfo>> {
  const res = await fetch('/api/save');
  if (!res.ok) return {};
  const json = await res.json();
  const map: Record<number, SaveSlotInfo> = {};
  for (const s of (json.slots || [])) {
    if (s.meta && typeof s.meta === 'object') {
      map[s.slot as number] = s.meta as SaveSlotInfo;
    }
  }
  return map;
}

export const createSaveSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  // Local cache for save slot metadata (sync access via getSaveInfo)
  saveSlotsMeta: {},

  // Fetch all save slots from API and update cache
  refreshSaveSlots: async () => {
    try {
      const metaMap = await apiFetchAllMeta();
      set({ saveSlotsMeta: metaMap });
    } catch (err) {
      console.warn('[refreshSaveSlots] Failed to fetch save slots:', err);
    }
  },

  saveGame: (slot: number) => {
    const state = get();
    if (state.phase === 'combat') return;

    const saveData = buildSaveData(state);
    trimIfLarge(saveData);
    const meta = buildMeta(state, slot);

    // Fire-and-forget API call
    apiSave(slot, saveData, meta).then(() => {
      // Refresh meta cache after save
      get().refreshSaveSlots();
    }).catch(err => {
      console.warn('[saveGame] API save failed:', err);
    });
  },

  autoSave: () => {
    const state = get();
    if (state.phase === 'combat' || state.phase === 'game-over' || state.phase === 'title' || state.phase === 'victory') return;
    if (!state.party || state.party.length === 0) return;

    const saveData = buildSaveData(state, true);
    trimIfLarge(saveData);
    const meta = buildMeta(state, -1);

    apiSave(-1, saveData, meta).then(() => {
      set({ lastAutoSaveTurn: state.turnCount });
    }).catch(err => {
      console.warn('[autoSave] Failed:', err);
      set({ lastAutoSaveTurn: state.turnCount });
    });
  },

  loadGame: async (slot: number) => {
    try {
      const data = await apiLoad(slot);
      if (!data || (data as Record<string, unknown>).version !== 1) return false;

      // Validate party structure
      if (
        !Array.isArray(data.party) ||
        typeof data.turnCount !== 'number'
      ) {
        console.warn('[loadGame] Save data missing required fields. Aborting load.');
        return false;
      }
      for (const member of data.party as Array<Record<string, unknown>>) {
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
          ...(data.messageLog || []),
          `[Turno ${data.turnCount}] 💾 Partita caricata dallo Slot ${slot}.${isNGP ? ' 🎀 Nastri persistenti: ' + persistentRibs + '/10' : ''}`,
        ],
        turnCount: data.turnCount,
        difficulty: data.difficulty || 'normale',
        selectedDifficulty: data.selectedDifficulty || 'normale',
        inventoryOpen: false,
        selectedCharacterId: data.selectedCharacterId || (data.party as Array<Record<string, unknown>>)[0]?.id || null,
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
        craftingCombineCount: data.craftingCombineCount || data.herbCombineCount || 0,
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
        pursuerLevel: data.pursuerLevel || data.nemesisPursuitLevel || 0,
        pursuerLastSeenLocation: data.pursuerLastSeenLocation || data.nemesisLastSeenLocation || null,
        pursuerLastSeenTurn: data.pursuerLastSeenTurn || data.nemesisLastSeenTurn || 0,
        bossPhases: data.bossPhases || {},
        lastAutoSaveTurn: data.lastAutoSaveTurn || 0,
        bestiary: data.bestiary || [],
        achievements: data.achievements || { unlockedIds: [], unlockTimestamps: {} },
        autoCombat: data.autoCombat ?? false,
        dataVersion: data.dataVersion ?? 0,
        searchedSafeRooms: data.searchedSafeRooms || [],
        settingsOpen: false,
        helpOpen: false,
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
        ngPlusEnemyMultiplier: data.ngPlusEnemyMultiplier || 1,
        craftingPoints: data.craftingPoints || 0,
        totalCrafted: data.totalCrafted || 0,
        masterQualityCrafted: data.masterQualityCrafted || 0,
        runStats: data.runStats || getDefaultState().runStats,
      });

      // Play correct ambient after loading
      if (data.currentSubArea === 'safe_room' && data.currentLocationId) {
        try { playSafeRoomAmbient(data.currentLocationId); } catch {}
      }

      // Refresh save slots meta cache
      get().refreshSaveSlots();

      // Auto-save after loading
      setTimeout(() => { try { get().autoSave(); } catch {} }, 200);
      return true;
    } catch (err) {
      console.warn('[loadGame] Failed to load save:', err);
      return false;
    }
  },

  getSaveInfo: (slot: number) => {
    const meta = get().saveSlotsMeta;
    return meta[slot] || null;
  },

  deleteSave: (slot: number) => {
    apiDelete(slot).then(() => {
      get().refreshSaveSlots();
    }).catch(err => {
      console.warn('[deleteSave] Failed:', err);
    });
  },

  // Save at victory (New Game+ save): merges run ribbons into persistent, flags as NG+
  saveGameVictory: (slot: number) => {
    const state = get();
    const totalPersistent = Math.min((state.persistentRibbons || 0) + (state.collectedRibbons || 0), 10);

    const saveData = buildSaveData(state);
    saveData.collectedRibbons = 0;
    saveData.persistentRibbons = totalPersistent;
    saveData.isNewGamePlus = true;
    trimIfLarge(saveData);

    const meta = buildMeta(state, slot, 'victory');
    meta.isNewGamePlus = true;
    meta.persistentRibbons = totalPersistent;
    meta.collectedRibbons = 0;

    apiSave(slot, saveData, meta).catch(err => {
      console.warn('[saveGameVictory] Failed:', err);
    });

    return totalPersistent;
  },

  // Start a New Game+ from a victory save (no localStorage needed — pure state reset)
  startNewGamePlus: (persistentRibbons: number) => {
    const state = get();
    const currentCycle = state.ngPlusCycle || 0;
    const newCycle = currentCycle + 1;

    const carriedBestiary = state.bestiary || [];
    const carriedAchievements = state.achievements || { unlockedIds: [], unlockTimestamps: {} };
    const carriedPersistentRibbons = Math.min(persistentRibbons, 10);
    const carriedDiscoveredRecipes = state.discoveredRecipes || [];
    const carriedCraftingPoints = Math.floor((state.craftingPoints || 0) * (Number(NGPLUS_CONFIG.carriedCraftPointsPercent) / 100));
    const ngPlusEnemyMultiplier = newCycle === 1 ? Number(NGPLUS_CONFIG.cycle1Multiplier) : newCycle === 2 ? Number(NGPLUS_CONFIG.cycle2Multiplier) : Number(NGPLUS_CONFIG.cycle3PlusMultiplier);
    const bonusItemCount = newCycle >= Number(NGPLUS_CONFIG.bonusItemCycle) ? Number(NGPLUS_CONFIG.bonusItemQuantity) : 0;

    set({
      phase: 'character-select',
      party: [],
      messageLog: [
        `🎀 Nuovo Gioco+ Ciclo ${newCycle} attivato! Nastri persistenti: ${carriedPersistentRibbons}/10`,
        `📈 Moltiplicatore nemici: ×${ngPlusEnemyMultiplier}`,
        bonusItemCount > 0 ? `🎁 Bonus NG+: ${Number(NGPLUS_CONFIG.bonusItemQuantity)} ${String(NGPLUS_CONFIG.bonusItemId)} all'inizio dell'avventura!` : '',
        carriedCraftingPoints > 0 ? `🔧 Punti crafting conservati: ${carriedCraftingPoints} (${Number(NGPLUS_CONFIG.carriedCraftPointsPercent)}%)` : '',
        '\nScegli i tuoi personaggi per la nuova avventura...',
      ].filter(Boolean),
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
      craftingCombineCount: 0,
      questChainProgress: {},
      endingType: null,
      exploredSubAreas: {},
      bossPhases: {},
      pursuerLevel: 0,
      pursuerLastSeenLocation: null,
      pursuerLastSeenTurn: 0,
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
      helpOpen: false,
      dataVersion: 0,
      npcReputation: {},
      completedPermanentEvents: [],
      activePermanentEffects: [],
      pendingChainEvent: null,
      completedChains: [],
      craftingPoints: carriedCraftingPoints,
      totalCrafted: 0,
      masterQualityCrafted: 0,
      ngPlusCycle: newCycle,
      ngPlusEnemyMultiplier,
      bestiary: carriedBestiary,
      achievements: carriedAchievements,
      runStats: { ...(get().runStats), totalDamageDealt: 0, totalDamageReceived: 0, totalHealingDone: 0, enemiesDefeated: 0, bossesDefeated: 0, itemsCrafted: 0, itemsUsed: 0, documentsFound: 0, secretRoomsDiscovered: 0, recipesDiscovered: 0, questsCompleted: 0, questChainsCompleted: 0, distanceTraveled: 0, searchesPerformed: 0, combatTurnsTotal: 0, perfectCombats: 0, longestCombo: 0, turnsSurvived: 0, dynamicEventsSurvived: 0, playTimeSeconds: 0, endingType: null, characterArchetypes: [], ngPlusCycle: newCycle },
    });
  },
});
