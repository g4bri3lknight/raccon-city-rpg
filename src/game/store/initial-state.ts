import { Character, DifficultyLevel, GameNotification, RandomizedLocationData, ItemInstance } from '../types';
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
  const startLocation = LOCATIONS['city_outskirts'];

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
    phase: 'exploration' as const,
    party,
    currentLocationId: 'city_outskirts' as const,
    enemies: [],
    combat: null,
    activeEvent: startLocation.storyEvent || null,
    eventOutcome: null,
    messageLog: [...warningLog, startMessage, `\n🎮 Difficoltà: ${diffConfig.icon} ${diffConfig.label} — ${diffConfig.description}`],
    turnCount: 0,
    inventoryOpen: false,
    selectedCharacterId: party[0]?.id || null,
    searchCounts: {},
    searchMaxes: {},
    partySize: party.length,
    unlockedPaths: [],
    visitedLocations: ['city_outskirts'],
    mapOpen: false,
    skipNextEncounter: false,
    completedEvents: [],
    collectedRibbons: 0,
    gameStartTime: Date.now(),
    achievements: { unlockedIds: [], unlockTimestamps: {} },
    achievementsOpen: false,
    bestiary: [],
    bestiaryOpen: false,
    newAchievementNotification: null,
    difficulty: activeDifficulty,
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
    endingType: null,
    exploredSubAreas: {},
    randomizerMode,
    randomizedLocationData: randomizerMode ? generateRandomizedData() : null,
    currentSubArea: null,
    itemBoxItems: [],
    searchedSafeRooms: [],
    readDocuments: [],
    nemesisPursuitLevel: 0,
    nemesisLastSeenLocation: null as string | null,
    nemesisLastSeenTurn: 0,
    bossPhases: {} as Record<string, any>,
    notification: null as GameNotification | null,
    lastAutoSaveTurn: 0,
    // persistentRibbons is preserved (set externally for New Game+)
  };
}

/** Default initial state values for the store */
export function getDefaultState() {
  return {
    phase: 'title' as const,
    party: [],
    currentLocationId: 'city_outskirts' as const,
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
    endingType: null as string | null,
    exploredSubAreas: {} as Record<string, string[]>,
    randomizerMode: false,
    randomizedLocationData: null as RandomizedLocationData | null,
    currentSubArea: null as string | null,
    itemBoxItems: [] as ItemInstance[],
    searchedSafeRooms: [] as string[],
    readDocuments: [] as string[],
    dataVersion: 0,
    nemesisPursuitLevel: 0,
    nemesisLastSeenLocation: null as string | null,
    nemesisLastSeenTurn: 0,
    bossPhases: {} as Record<string, any>,
    notification: null as GameNotification | null,
    settingsOpen: false,
    lastAutoSaveTurn: 0,
  };
}
