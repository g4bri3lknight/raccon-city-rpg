import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { Archetype, CustomCharacterConfig, DifficultyLevel } from '../../types';
import { fetchGameSettings } from '../settings-cache';
import { buildStartState } from '../initial-state';
import { createCharacter, createCustomCharacter } from '../helpers';

export const createCoreSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  startGame: () => {
    fetchGameSettings(); // preload settings in background
    set({ phase: 'title' });
  },

  goToCharacterSelect: () => {
    set({
      phase: 'character-select',
      party: [],
      messageLog: [],
      turnCount: 0,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: 0,
      isNewGamePlus: false,
      gameStartTime: 0,
      achievements: { unlockedIds: [], unlockTimestamps: {} },
      achievementsOpen: false,
      bestiary: [],
      bestiaryOpen: false,
      newAchievementNotification: null,
      selectedDifficulty: 'normale',
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
      currentSubArea: null,
      itemBoxItems: [],
      searchedSafeRooms: [],
      readDocuments: [],
      nemesisPursuitLevel: 0,
      nemesisLastSeenLocation: null,
      nemesisLastSeenTurn: 0,
      bossPhases: {},
      notification: null,
      autoCombat: false,
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      randomizerMode: false,
      randomizedLocationData: null,
      lastAutoSaveTurn: 0,
      currentLocationId: null,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      inventoryOpen: false,
      selectedCharacterId: null,
      debugOpen: false,
      godMode: false,
      skipNextEncounter: false,
      dataVersion: 0,
      settingsOpen: false,
      questChainProgress: {},
      npcReputation: {},
      completedPermanentEvents: [],
      activePermanentEffects: [],
      pendingChainEvent: null,
      completedChains: [],
      ngPlusCycle: 0,
      craftingPoints: 0,
      totalCrafted: 0,
      masterQualityCrafted: 0,
    });
  },

  goToCharacterCreator: () => {
    set({ phase: 'character-creator' });
  },

  startAdventure: (selectedArchetypes: Archetype[]) => {
    const state = get();
    const party = selectedArchetypes.filter(id => id !== 'custom').map(id => createCharacter(id));
    const activeDifficulty = state.selectedDifficulty || state.difficulty;
    set(buildStartState(party, activeDifficulty, state.randomizerMode, 'Iniziate il vostro viaggio attraverso le strade desolate di Raccoon City...'));
  },

  startAdventureWithCustom: (presetArchetypes: Archetype[], customCharacters: CustomCharacterConfig[]) => {
    const state = get();
    const presetParty = presetArchetypes.filter(id => id !== 'custom').map(id => createCharacter(id));
    const customParty = customCharacters.map(config => createCustomCharacter(config));
    const party = [...presetParty, ...customParty];
    const activeDifficulty = state.selectedDifficulty || state.difficulty;
    set(buildStartState(party, activeDifficulty, state.randomizerMode, 'Iniziate il vostro viaggio attraverso le strade desolate di Raccoon City...'));
  },

  gameOver: () => {
    set({ phase: 'game-over' });
  },

  victory: () => {
    const ending = get().determineEnding();
    const state = get();
    // Track run stats: play time, ending type, character archetypes
    const playTime = state.gameStartTime && state.gameStartTime > 0
      ? Math.floor((Date.now() - state.gameStartTime) / 1000)
      : 0;
    const archetypes = [...new Set(state.party.map(p => p.archetype))];
    set(s => ({
      phase: 'victory',
      endingType: ending.id,
      runStats: {
        ...s.runStats,
        playTimeSeconds: playTime,
        endingType: ending.id,
        ngPlusCycle: s.ngPlusCycle,
        characterArchetypes: archetypes,
      },
    }));
    setTimeout(() => get().checkAchievements(), 100);
  },

  restartGame: () => {
    set({
      phase: 'title',
      party: [],
      enemies: [],
      combat: null,
      activeEvent: null,
      eventOutcome: null,
      messageLog: [],
      turnCount: 0,
      inventoryOpen: false,
      selectedCharacterId: null,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      skipNextEncounter: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: 0,
      isNewGamePlus: false,
      gameStartTime: 0,
      achievements: { unlockedIds: [], unlockTimestamps: {} },
      achievementsOpen: false,
      bestiary: [],
      bestiaryOpen: false,
      newAchievementNotification: null,
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
      endingType: null,
      exploredSubAreas: {},
      bossPhases: {},
      nemesisPursuitLevel: 0,
      nemesisLastSeenLocation: null,
      nemesisLastSeenTurn: 0,
      randomizerMode: false,
      randomizedLocationData: null,
      currentSubArea: null,
      itemBoxItems: [],
      searchedSafeRooms: [],
      readDocuments: [],
      lastAutoSaveTurn: 0,
      isExploring: false,
      questChainProgress: {},
      npcReputation: {},
      completedPermanentEvents: [],
      activePermanentEffects: [],
      pendingChainEvent: null,
      completedChains: [],
      ngPlusCycle: 0,
      craftingPoints: 0,
      totalCrafted: 0,
      masterQualityCrafted: 0,
    });
  },
});
