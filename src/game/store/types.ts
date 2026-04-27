import {
  GameState,
  GamePhase,
  Character,
  EnemyInstance,
  CombatLogEntry,
  ItemInstance,
  StatusEffect,
  StatusDuration,
  Archetype,
  CombatAction,
  StoryEvent,
  EventOutcome,
  GameNotification,
  CustomCharacterConfig,
  DifficultyLevel,
  DifficultyConfig,
  PuzzleState,
  QTEState,
  QTESequence,
  GameDocument,
  GameNPC,
  DynamicEvent,
  SecretRoom,
  EndingDefinition,
  StoryChoiceTag,
  NPCQuest,
  DynamicEventChoice,
  RandomizedLocationData,
  RunStats,
  QuestChainProgress,
  QuestChainStep,
  PermanentEffect,
} from '../types';

export type {
  GameState,
  GamePhase,
  Character,
  EnemyInstance,
  CombatLogEntry,
  ItemInstance,
  StatusEffect,
  StatusDuration,
  Archetype,
  CombatAction,
  StoryEvent,
  EventOutcome,
  GameNotification,
  CustomCharacterConfig,
  DifficultyLevel,
  DifficultyConfig,
  PuzzleState,
  QTEState,
  QTESequence,
  GameDocument,
  GameNPC,
  DynamicEvent,
  SecretRoom,
  EndingDefinition,
  StoryChoiceTag,
  NPCQuest,
  DynamicEventChoice,
  RandomizedLocationData,
  RunStats,
  QuestChainProgress,
  QuestChainStep,
  PermanentEffect,
};

export interface SaveSlotInfo {
  slot: number;
  timestamp: string;
  turnCount: number;
  locationName: string;
  partySummary: string;
  phase: string;
  isNewGamePlus?: boolean;
  persistentRibbons?: number;
  collectedRibbons?: number;
}

export interface GameStore extends GameState {
  // Phase transitions
  startGame: () => void;
  goToCharacterSelect: () => void;
  goToCharacterCreator: () => void;
  startAdventure: (selectedArchetypes: Archetype[]) => void;
  startAdventureWithCustom: (presetArchetypes: Archetype[], customCharacters: CustomCharacterConfig[]) => void;
  gameOver: () => void;
  victory: () => void;
  restartGame: () => void;

  // Exploration
  explore: () => void;
  travelTo: (locationId: string) => void;
  searchArea: () => void;
  handleEventChoice: (choiceIndex: number) => void;
  closeEvent: () => void;
  toggleInventory: () => void;
  equipItem: (characterId: string, itemUid: string) => void;
  unequipItem: (characterId: string, itemUid: string) => void;
  // #29 Equipment management
  equipArmor: (characterId: string, itemUid: string) => void;
  unequipArmor: (characterId: string) => void;
  equipAccessory: (characterId: string, itemUid: string) => void;
  unequipAccessory: (characterId: string) => void;
  // #3 Weapon mod management
  installMod: (characterId: string, modItemUid: string) => void;
  removeMod: (characterId: string, modIndex: number) => void;
  consumeItemOutsideCombat: (characterId: string, itemUid: string) => void;
  quickHeal: () => void;
  combineHerbs: (characterId: string, redHerbUid: string) => boolean;
  selectCharacter: (characterId: string) => void;
  transferItem: (fromCharacterId: string, itemUid: string, toCharacterId: string, quantity?: number) => boolean;
  swapInventoryItems: (characterId: string, uid1: string, uid2: string) => void;

  // Map
  toggleMap: () => void;

  // Achievements & Bestiary
  toggleAchievements: () => void;
  toggleBestiary: () => void;

  // Settings
  toggleSettings: () => void;
  // Help overlay
  toggleHelp: () => void;
  setAutoCombatPreference: (val: boolean) => void;
  unlockAchievement: (id: string) => void;
  checkAchievements: () => void;

  // Combat
  selectCombatAction: (action: CombatAction) => void;
  selectCombatTarget: (targetId: string) => void;
  selectCombatItem: (itemUid: string) => void;
  executeCombatTurn: () => void;
  toggleAutoCombat: () => void;
  executeAutoCombatTurn: () => void;
  startBossFight: () => void;
  advanceToNextActor: (combatState?: GameStore['combat'] & { party?: Character[]; enemies?: EnemyInstance[] }) => void;

  // Save / Load
  saveSlotsMeta: Record<number, SaveSlotInfo>;
  refreshSaveSlots: () => Promise<void>;
  saveGame: (slot: number) => void;
  loadGame: (slot: number) => Promise<boolean>;
  autoSave: () => void;
  getSaveInfo: (slot: number) => SaveSlotInfo | null;
  deleteSave: (slot: number) => void;
  saveGameVictory: (slot: number) => number;
  startNewGamePlus: (persistentRibbons: number) => void;

  // Difficulty
  selectDifficulty: (difficulty: DifficultyLevel) => void;

  // #45 Randomizer
  toggleRandomizerMode: () => void;

  // Puzzle
  startPuzzle: (puzzle: NonNullable<StoryEvent['puzzle']>, title: string, description: string) => void;
  submitCombination: (input: string[]) => void;
  addDigitToCombination: (digit: string) => void;
  removeDigitFromCombination: () => void;
  resetCombination: () => void;
  handleSequenceInput: (direction: string) => void;
  closePuzzle: () => void;

  // QTE
  startQTE: (triggerSource: 'nemesis' | 'event' | 'boss') => void;
  handleQTEInput: (direction: string) => void;
  completeQTE: () => void;

  // #16 Documents
  toggleDocuments: () => void;
  markDocumentRead: (docId: string) => void;

  // #18 NPCs
  encounterNpc: (npcId: string, specificQuestId?: string) => void;
  talkToNpc: () => { handled: boolean; chatMessage?: string };
  acceptNpcQuest: () => void;
  tradeWithNpc: (tradeIndex: number) => { success: boolean; reason?: string };
  closeNpcDialog: () => void;
  toggleMissions: () => void;

  // #20 Dynamic Events
  triggerDynamicEvent: (eventId: string) => void;
  handleDynamicEventChoice: (choiceIndex: number) => void;
  tickDynamicEvent: () => void;

  // #22 Secret Rooms
  discoverSecretRoom: (roomId: string) => void;

  // Recipe Discovery
  discoverRecipe: (recipeId: string) => void;

  // #23 Endings
  determineEnding: () => EndingDefinition;

  // Mini-map
  exploreSubArea: (subAreaId: string) => void;

  // Safe Room & Item Box
  enterSafeRoom: () => void;
  exitSafeRoom: () => void;
  searchSafeRoom: () => void;
  depositToItemBox: (charId: string, itemUid: string, quantity: number) => boolean;
  withdrawFromItemBox: (charId: string, itemBoxIndex: number, quantity: number) => boolean;
  craftItem: (recipeIndex: number) => boolean;
  craftItemWithPoints: (recipeIndex: number) => boolean;
  breakdownItem: (charId: string, itemUid: string) => boolean;

  // Debug
  debugHealAll: () => void;
  debugGiveAllItems: () => void;
  debugGiveAllKeys: () => void;
  debugGiveAmmo: () => void;
  debugApplyStatus: (characterId: string, status: 'poison' | 'bleeding') => void;
  debugRemoveStatus: (characterId: string) => void;
  debugSpawnEnemy: (enemyId: string) => void;
  debugSetLevel: (level: number) => void;
  debugTeleport: (locationId: string) => void;
  debugKillAllEnemies: () => void;
  debugToggleGodMode: () => void;
  debugSpawnCollectible: () => void;
  debugGiveAllRibbons: () => void;
  debugSpawnItem: (itemId: string) => void;
  debugSpawnDocument: (docId: string) => void;
  debugUnlockAllRecipes: () => void;
  debugSetDifficulty: (difficulty: DifficultyLevel) => void;
  debugTriggerQTE: () => void;
  debugRevealMap: () => void;
  debugResetSearch: () => void;

  // Achievement extended
  incrementHerbCombine: () => void;
  checkPerfectCombat: () => void;
  checkAutoCombatVictory: () => void;

  // Run statistics
  incrementRunStat: (key: keyof RunStats, value?: number) => void;
  _trackCombatVictoryStats: (combatLog: CombatLogEntry[], defeatedEnemies: { definitionId: string; isBoss: boolean; currentHp: number }[], comboCount: number, partyTookDamage: boolean) => void;

  // Quest Chain system
  acceptQuestChain: (chainId: string) => void;
  advanceQuestChainStep: (chainId: string) => { completed: boolean; message: string };
  handleChainBranchChoice: (chainId: string, choiceIndex: number) => { message: string };
  getActiveChainForNpc: (npcId: string) => QuestChainStep | null;

  // NPC Reputation
  modifyNpcReputation: (npcId: string, amount: number) => void;

  // Chain Dynamic Events
  checkEventChain: (completedEventId: string) => void;

  // Admin data refresh
  bumpDataVersion: () => void;
}
