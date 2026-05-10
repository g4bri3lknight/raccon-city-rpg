import { Character, DifficultyLevel, GameNotification, RandomizedLocationData, ItemInstance, RunStats, QuestChainProgress, PermanentEffect } from '../types';
import { getDifficultyConfig } from '../data/difficulty';
import { LOCATIONS, validateEffectsIntegrity } from '../data/loader';
import { generateRandomizedData } from '../data/randomizer';

export function buildStartState(
  party: Character[],
  activeDifficulty: DifficultyLevel,
  randomizerMode: boolean,
  startMessage: string,
) {
  const diffConfig = getDifficultyConfig(activeDifficulty, party.length);

  // Get first location by sortOrder
  const allLocationIds = Object.keys(LOCATIONS);
  const firstLocationId = allLocationIds[0] || 'city_outskirts';
  const startLocation = LOCATIONS[firstLocationId];
  const firstRoomId = startLocation?.rooms?.[0]?.id || null;

  // Validate effects integrity on game start
  const effectsWarnings = validateEffectsIntegrity();
  const warningLog: string[] = [];
  if (effectsWarnings) {
    const grouped = new Map<string, string[]>();
    for (const w of effectsWarnings) {
      if (!grouped.has(w.source)) grouped.set(w.source, []);
      grouped.get(w.source)!.push(w.name);
    }
    console.error('[Effects Integrity] Found abilities with empty effects[]:', effectsWarnings);
    warningLog.push('⚠️ ATTENZIONE: Trovate abilità con effects[] vuoto!');
    for (const [source, names] of grouped) {
      warningLog.push(`  📌 ${source}: ${names.join(', ')}`);
    }
    warningLog.push('  Queste abilità non produrranno alcun effetto in combattimento.');
  }

  return {
    ...getDefaultState(),
    // Game-specific overrides
    phase: 'exploration' as const,
    party,
    currentLocationId: firstLocationId,
    currentRoomId: firstRoomId,
    activeEvent: null,
    eventOutcome: null,
    messageLog: [...warningLog, startMessage, `\n🎮 Difficoltà: ${diffConfig.icon} ${diffConfig.label} — ${diffConfig.description}`],
    selectedCharacterId: party[0]?.id || null,
    partySize: party.length,
    visitedLocations: [firstLocationId],
    skipNextEncounter: false,
    isExploring: false,
    gameStartTime: Date.now(),
    achievements: { unlockedIds: [], unlockTimestamps: {} },
    achievementsOpen: false,
    bestiary: [],
    bestiaryOpen: false,
    newAchievementNotification: null,
    difficulty: activeDifficulty,
    randomizerMode,
    randomizedLocationData: randomizerMode ? generateRandomizedData() : null,
    notification: null as GameNotification | null,
    // persistentRibbons is preserved (set externally for New Game+)
  };
}

/** Default initial state values for the store */
export function getDefaultState() {
  return {
    phase: 'title' as const,
    party: [],
    currentLocationId: '' as const,
    combat: null,
    enemies: [],
    activeEvent: null as any,
    eventOutcome: null as any,
    messageLog: [] as string[],
    turnCount: 0,
    difficulty: 'normale' as DifficultyLevel,
    selectedDifficulty: 'normale' as DifficultyLevel,
    puzzleState: null as any,
    puzzleSourceLocationId: null as string | null,
    qteState: null as any,
    inventoryOpen: false,
    selectedCharacterId: null as string | null,
    searchCounts: {} as Record<string, number>,
    searchMaxes: {} as Record<string, number>,
    partySize: 2,
    autoCombat: false,
    unlockedPaths: [] as string[],
    visitedLocations: [] as string[],
    mapOpen: false,
    debugOpen: false,
    godMode: false,
    skipNextEncounter: false,
    isExploring: false,
    herbCombineCount: 0,
    completedEvents: [] as string[],
    collectedRibbons: 0,
    persistentRibbons: 0,
    isNewGamePlus: false,
    gameStartTime: 0,
    achievements: { unlockedIds: [] as string[], unlockTimestamps: {} as Record<string, number> },
    achievementsOpen: false,
    bestiary: [] as any[],
    bestiaryOpen: false,
    newAchievementNotification: null as string | null,
    collectedDocuments: [] as string[],
    documentsOpen: false,
    missionsOpen: false,
    activeNpc: null as any,
    npcQuestProgress: {} as Record<string, any>,
    npcsEncountered: [] as string[],
    npcsOpen: false,
    activeDynamicEvent: null as any,
    dynamicEventTurnsLeft: 0,
    storyChoices: [] as string[],
    discoveredSecretRooms: [] as string[],
    discoveredRecipes: [] as string[],
    endingType: null as string | null,
    exploredSubAreas: {} as Record<string, string[]>,
    randomizerMode: false,
    randomizedLocationData: null as RandomizedLocationData | null,
    // Room system
    currentRoomId: null as string | null,
    roomHistory: [] as string[],
    exploredRooms: [] as string[],
    clearedRooms: [] as string[],
    foundRoomItems: {} as Record<string, string[]>,
    currentSubArea: null as string | null,
    itemBoxItems: [] as ItemInstance[],
    searchedSafeRooms: [] as string[],
    combatRoomId: null as string | null,
    readDocuments: [] as string[],
    dataVersion: 0,
    nemesisPursuitLevel: 0,
    nemesisLastSeenLocation: null as string | null,
    nemesisLastSeenTurn: 0,
    bossPhases: {} as Record<string, any>,
    notification: null as GameNotification | null,
    settingsOpen: false,
    helpOpen: false,
    saveSlotsMeta: {},
    lastAutoSaveTurn: 0,
    questChainProgress: {} as Record<string, QuestChainProgress & { currentStep?: number }>,
    npcReputation: {} as Record<string, number>,
    completedPermanentEvents: [] as string[],
    activePermanentEffects: [] as PermanentEffect[],
    pendingChainEvent: null as { eventId: string; triggerTurn: number } | null,
    completedChains: [] as string[],
    ngPlusCycle: 0,
    ngPlusEnemyMultiplier: 1,
    // #8 Crafting Advanced
    craftingPoints: 0,
    totalCrafted: 0,
    masterQualityCrafted: 0,
    // Run statistics
    runStats: {
      totalDamageDealt: 0,
      totalDamageReceived: 0,
      totalHealingDone: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      itemsCrafted: 0,
      itemsUsed: 0,
      documentsFound: 0,
      secretRoomsDiscovered: 0,
      recipesDiscovered: 0,
      questsCompleted: 0,
      questChainsCompleted: 0,
      distanceTraveled: 0,
      searchesPerformed: 0,
      combatTurnsTotal: 0,
      perfectCombats: 0,
      longestCombo: 0,
      turnsSurvived: 0,
      dynamicEventsSurvived: 0,
      playTimeSeconds: 0,
      endingType: null,
      characterArchetypes: [],
      ngPlusCycle: 0,
    } as RunStats,
  };
}
