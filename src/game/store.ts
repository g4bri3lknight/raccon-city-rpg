import { create } from 'zustand';
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
} from './types';
import { CHARACTER_ARCHETYPES, getCharacterStats, getCustomStartingItems, ARCHETYPE_STAT_POINTS, computeGrowthRates } from './data/characters';
import { ENEMIES } from './data/enemies';
import { BOSS_PHASES } from './data/enemies';
import { ITEMS } from './data/items';
import { LOCATIONS } from './data/locations';
import {
  executePlayerAttack,
  executePlayerSpecial,
  executePlayerSpecial2,
  executePlayerDefend,
  executeUseItem,
  executeEnemyAttack,
  calculateFleeChance,
  generateLoot,
  addExp,
  WEAPON_AMMO,
} from './engine/combat';
import { WeaponInstance } from './types';
import { ACHIEVEMENTS } from './data/achievements';
import { DOCUMENTS } from './data/documents';
import { audioEngine as audio } from './engine/sounds';
import {
  playLocationAmbient,
  playTravel,
  playSearch,
  playLevelUp,
  playEncounter,
  playVictory,
  playDefeat,
  playDocumentFound,
  playNPCEncounter,
  playPuzzleFail,
  playPuzzleSuccess,
  playAchievement,
  playItemPickup,
  playMenuOpen,
  playMenuClose,
} from './engine/sounds';
import { NPCS } from './data/npcs';
import { DYNAMIC_EVENTS } from './data/dynamic-events';
import { SECRET_ROOMS } from './data/secrets';
import { ENDINGS } from './data/endings';

const MAX_INVENTORY_SLOTS = 12;

// ── Auto-merge inventory stacks: combines items with the same itemId ──
function mergeInventoryStacks(inventory: ItemInstance[]): ItemInstance[] {
  const stackMap = new Map<string, ItemInstance>();
  for (const item of inventory) {
    const existing = stackMap.get(item.itemId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      stackMap.set(item.itemId, { ...item });
    }
  }
  return Array.from(stackMap.values());
}

// ── Helper: add item to any party member's inventory with stacking ──
// Tries preferred character first, then falls back to any alive member with space.
// Stackable items (ammo, healing, antidote) merge into existing stacks.
function addItemToParty(
  party: Character[],
  itemId: string,
  quantity: number,
  preferCharacterId?: string | null,
): { party: Character[]; added: boolean; characterName: string; characterId: string } {
  const itemDef = ITEMS[itemId];
  if (!itemDef) return { party, added: false, characterName: '', characterId: '' };

  const isStackable = itemDef.type === 'ammo' || itemDef.type === 'healing' || itemDef.type === 'antidote';
  const uid = `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newItem: ItemInstance = {
    uid,
    itemId,
    name: itemDef.name,
    description: itemDef.description,
    type: itemDef.type,
    rarity: itemDef.rarity,
    icon: itemDef.icon,
    usable: itemDef.usable,
    equippable: itemDef.equippable,
    effect: itemDef.effect,
    quantity,
  };

  let updatedParty = [...party];
  let added = false;
  let charName = '';
  let charId = '';

  // Build ordered list: preferred character first, then everyone else
  const pref = preferCharacterId ? updatedParty.find(p => p.id === preferCharacterId) : null;
  const rest = preferCharacterId ? updatedParty.filter(p => p.id !== preferCharacterId) : updatedParty;
  const charOrder = pref ? [pref, ...rest] : rest;

  for (const char of charOrder) {
    if (!char || added || char.currentHp <= 0) continue;

    if (isStackable) {
      // Try to merge into existing stack
      const existingIdx = char.inventory.findIndex(i => i.itemId === itemId);
      if (existingIdx >= 0) {
        added = true;
        charName = char.name;
        charId = char.id;
        const updatedInv = [...char.inventory];
        updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + quantity };
        updatedParty = updatedParty.map(p => p.id === char.id ? { ...p, inventory: updatedInv } : p);
        break;
      }
    }
    // No existing stack (or non-stackable), add as new entry if space
    if (char.inventory.length < char.maxInventorySlots) {
      added = true;
      charName = char.name;
      charId = char.id;
      updatedParty = updatedParty.map(p => p.id === char.id ? { ...p, inventory: [...p.inventory, newItem] } : p);
      break;
    }
  }

  return { party: updatedParty, added, characterName: charName, characterId: charId };
}

let notifId = 0;
let charUid = 0;
function newCharId() { return `char_${++charUid}`; }
let enemyUid = 0;
function newEnemyId() { return `enemy_${++enemyUid}`; }

// ── Weapon stats for all equippable weapons (used when equipping found loot) ──
const WEAPON_STATS: Record<string, WeaponInstance> = {
  pipe: { itemId: 'pipe', name: 'Tubo di Piombo', atkBonus: 5, type: 'melee' },
  scalpel: { itemId: 'scalpel', name: 'Bisturi', atkBonus: 4, type: 'melee' },
  pistol: { itemId: 'pistol', name: 'Pistola M1911', atkBonus: 8, type: 'ranged', special: 'pierce', ammoType: 'ammo_pistol' },
  shotgun: { itemId: 'shotgun', name: 'Fucile a Pompa', atkBonus: 14, type: 'ranged', ammoType: 'ammo_shotgun' },
  combat_knife: { itemId: 'combat_knife', name: 'Coltello da Combattimento', atkBonus: 7, type: 'melee' },
  magnum: { itemId: 'magnum', name: 'Magnum .357', atkBonus: 18, type: 'ranged', ammoType: 'ammo_magnum' },
  machinegun: { itemId: 'machinegun', name: 'Mitragliatrice MP5', atkBonus: 13, type: 'ranged', ammoType: 'ammo_machinegun' },
  grenade_launcher: { itemId: 'grenade_launcher', name: 'Lanciagranate M79', atkBonus: 24, type: 'ranged', ammoType: 'ammo_grenade' },
};

// ── Difficulty configuration ──
const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  sopravvissuto: { label: 'Sopravvissuto', color: '#22c55e', icon: '🏃', statMult: 0.6, lootMult: 1.5, minEnemies: 1, maxEnemies: 2, expMult: 1.4, enemyCritChance: 5, description: 'Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia.' },
  normale: { label: 'Normale', color: '#eab308', icon: '⚔️', statMult: 0.85, lootMult: 1.1, minEnemies: 1, maxEnemies: 3, expMult: 1.0, enemyCritChance: 10, description: 'Bilanciato. La vera esperienza di Raccoon City.' },
  incubo: { label: 'Incubo', color: '#ef4444', icon: '💀', statMult: 1.4, lootMult: 0.6, minEnemies: 2, maxEnemies: 4, expMult: 0.8, enemyCritChance: 20, description: 'Nemici potenti, poco bottino. Solo per i più coraggiosi.' },
};

function getDifficultyConfig(difficulty: DifficultyLevel, partySize?: number): DifficultyConfig {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normale;
  // Optional party-size secondary scaling (slight adjustment)
  if (partySize) {
    const partyMult = partySize === 1 ? 0.9 : partySize === 2 ? 1.0 : 1.1;
    return { ...config, statMult: config.statMult * partyMult };
  }
  return config;
}

export { DIFFICULTY_CONFIGS, getDifficultyConfig };

function createCharacter(archetypeId: Archetype): Character {
  const archetype = CHARACTER_ARCHETYPES.find(a => a.id === archetypeId);
  if (!archetype) throw new Error(`Archetype ${archetypeId} not found`);
  const points = ARCHETYPE_STAT_POINTS[archetype.id] || ARCHETYPE_STAT_POINTS.custom;
  const growth = computeGrowthRates(points);
  const maxHp = points.hp * 10;
  return {
    id: newCharId(),
    archetype: archetype.id,
    name: archetype.displayName,
    currentHp: maxHp,
    maxHp: maxHp,
    baseAtk: points.atk,
    baseDef: points.def,
    baseSpd: points.spd,
    level: 1,
    exp: 0,
    expToNext: 50,
    statusEffects: [],
    isDefending: false,
    inventory: archetype.startingItems.map(item => ({ ...item, uid: `${item.uid}_${Date.now()}` })),
    maxInventorySlots: 6,
    weapon: archetype.startingItems.find(i => i.weaponStats)?.weaponStats || null,
    statGrowth: growth,
  };
}

function createCustomCharacter(config: CustomCharacterConfig): Character {
  const baseArchetype = config.baseArchetype && config.baseArchetype !== 'custom' ? config.baseArchetype : undefined;
  const startingItems = getCustomStartingItems(baseArchetype);
  const basePoints = baseArchetype ? ARCHETYPE_STAT_POINTS[baseArchetype] : null;

  // Use custom stats if provided, otherwise inherit from base archetype
  const statPoints = config.customStats
    ? config.customStats
    : basePoints || ARCHETYPE_STAT_POINTS.custom;

  const hp = statPoints.hp * 10;
  const atk = statPoints.atk;
  const def = statPoints.def;
  const spd = statPoints.spd;
  const growth = computeGrowthRates(statPoints);

  return {
    id: newCharId(),
    archetype: baseArchetype || 'custom',
    name: config.name,
    biography: config.biography,
    avatarUrl: config.avatarUrl,
    currentHp: hp,
    maxHp: hp,
    baseAtk: atk,
    baseDef: def,
    baseSpd: spd,
    level: 1,
    exp: 0,
    expToNext: 50,
    statusEffects: [],
    isDefending: false,
    inventory: startingItems.map(item => ({ ...item, uid: `${item.uid}_${Date.now()}` })),
    maxInventorySlots: 6,
    weapon: startingItems.find(i => i.weaponStats)?.weaponStats || null,
    special1Id: config.special1Id,
    special2Id: config.special2Id,
    passiveDescription: config.passiveDescription,
    statGrowth: growth,
  };
}

function createEnemyInstance(enemyId: string, statMult: number = 1): EnemyInstance {
  const def = ENEMIES[enemyId];
  const round = (v: number) => Math.round(v * statMult);
  const hp = round(def.maxHp);
  return {
    id: newEnemyId(),
    definitionId: enemyId,
    name: def.name,
    currentHp: hp,
    maxHp: hp,
    atk: round(def.atk),
    def: round(def.def),
    spd: round(def.spd),
    icon: def.icon,
    statusEffects: [],
    isDefending: false,
    abilities: [...def.abilities],
    isBoss: def.isBoss,
    currentPhase: 0,
    phaseNames: def.isBoss && BOSS_PHASES[def.id] ? BOSS_PHASES[def.id].map(p => p.name) : [],
    isPhaseTransitioning: false,
  };
}

// ── Build lookup: for each key item, which locked paths require it ──
// Key items that auto-discard when all their doors are opened
const KEY_ITEM_IDS = new Set(['key_rpd', 'key_sewers', 'key_lab']);

function buildKeyPathLookup(): Record<string, { fromId: string; toId: string }[]> {
  const lookup: Record<string, { fromId: string; toId: string }[]> = {};
  for (const [locId, loc] of Object.entries(LOCATIONS)) {
    if (loc.lockedLocations) {
      for (const locked of loc.lockedLocations) {
        if (!lookup[locked.requiredItemId]) lookup[locked.requiredItemId] = [];
        lookup[locked.requiredItemId].push({ fromId: locId, toId: locked.locationId });
      }
    }
  }
  return lookup;
}
const KEY_PATH_LOOKUP = buildKeyPathLookup();

function isKeyStillNeeded(itemId: string, unlockedPaths: string[]): boolean {
  const paths = KEY_PATH_LOOKUP[itemId];
  if (!paths) return false; // Not a key or no paths defined
  const remaining = paths.filter(
    p => !unlockedPaths.includes(`${p.fromId}→${p.toId}`)
  );
  return remaining.length > 0;
}

interface GameStore extends GameState {
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
  consumeItemOutsideCombat: (characterId: string, itemUid: string) => void;
  combineHerbs: (characterId: string, redHerbUid: string) => boolean;
  selectCharacter: (characterId: string) => void;
  transferItem: (fromCharacterId: string, itemUid: string, toCharacterId: string) => boolean;

  // Map
  toggleMap: () => void;

  // Achievements & Bestiary
  toggleAchievements: () => void;
  toggleBestiary: () => void;
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

  // Save / Load
  saveGame: (slot: number) => void;
  loadGame: (slot: number) => boolean;
  getSaveInfo: (slot: number) => SaveSlotInfo | null;
  deleteSave: (slot: number) => void;
  saveGameVictory: (slot: number) => number;
  startNewGamePlus: (persistentRibbons: number) => void;

  // Difficulty
  selectDifficulty: (difficulty: DifficultyLevel) => void;

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

  // #18 NPCs
  encounterNpc: (npcId: string) => void;
  talkToNpc: () => void;
  acceptNpcQuest: () => void;
  tradeWithNpc: (tradeIndex: number) => boolean;
  closeNpcDialog: () => void;

  // #20 Dynamic Events
  triggerDynamicEvent: (eventId: string) => void;
  handleDynamicEventChoice: (choiceIndex: number) => void;
  tickDynamicEvent: () => void;

  // #22 Secret Rooms
  discoverSecretRoom: (roomId: string) => void;

  // #23 Endings
  determineEnding: () => EndingDefinition;

  // Mini-map
  exploreSubArea: (subAreaId: string) => void;

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
}

// ==========================================
// SAVE / LOAD TYPES
// ==========================================

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

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  party: [],
  currentLocationId: 'city_outskirts',
  combat: null,
  enemies: [],
  activeEvent: null,
  eventOutcome: null,
  messageLog: [],
  turnCount: 0,
  difficulty: 'normale' as DifficultyLevel,
  selectedDifficulty: null,
  puzzleState: null,
  puzzleSourceLocationId: null,
  qteState: null,
  inventoryOpen: false,
  selectedCharacterId: null,
  searchCounts: {},
  searchMaxes: {},
  partySize: 2,
  autoCombat: false,
  unlockedPaths: [],
  visitedLocations: [],
  mapOpen: false,
  debugOpen: false,
  godMode: false,
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
  collectedDocuments: [],
  documentsOpen: false,
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

  // ==========================================
  // PHASE TRANSITIONS
  // ==========================================
  startGame: () => {
    set({ phase: 'title' });
  },

  goToCharacterSelect: () => {
    set({ phase: 'character-select', party: [], messageLog: [], turnCount: 0, searchCounts: {}, searchMaxes: {}, partySize: 2, unlockedPaths: [], visitedLocations: [], mapOpen: false, completedEvents: [], collectedRibbons: 0, persistentRibbons: 0, isNewGamePlus: false, gameStartTime: 0, achievements: { unlockedIds: [], unlockTimestamps: {} }, achievementsOpen: false, bestiary: [], bestiaryOpen: false, newAchievementNotification: null, selectedDifficulty: null, collectedDocuments: [], documentsOpen: false, activeNpc: null, npcQuestProgress: {}, npcsEncountered: [], npcsOpen: false, activeDynamicEvent: null, dynamicEventTurnsLeft: 0, storyChoices: [], discoveredSecretRooms: [], endingType: null, exploredSubAreas: {} });
  },

  goToCharacterCreator: () => {
    set({ phase: 'character-creator' });
  },

  startAdventure: (selectedArchetypes: Archetype[]) => {
    const state = get();
    const party = selectedArchetypes.filter(id => id !== 'custom').map(id => createCharacter(id));
    const activeDifficulty = state.selectedDifficulty || state.difficulty;
    const diffConfig = getDifficultyConfig(activeDifficulty, party.length);
    const startLocation = LOCATIONS['city_outskirts'];
    set({
      phase: 'exploration',
      party,
      currentLocationId: 'city_outskirts',
      enemies: [],
      combat: null,
      activeEvent: startLocation.storyEvent || null,
      eventOutcome: null,
      messageLog: ['Iniziate il vostro viaggio attraverso le strade desolate di Raccoon City...', `\n🎮 Difficoltà: ${diffConfig.icon} ${diffConfig.label} — ${diffConfig.description}`],
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
      // persistentRibbons is preserved (set externally for New Game+)
    });
  },

  startAdventureWithCustom: (presetArchetypes: Archetype[], customCharacters: CustomCharacterConfig[]) => {
    const state = get();
    const presetParty = presetArchetypes.filter(id => id !== 'custom').map(id => createCharacter(id));
    const customParty = customCharacters.map(config => createCustomCharacter(config));
    const party = [...presetParty, ...customParty];
    const pSize = party.length;
    const activeDifficulty = state.selectedDifficulty || state.difficulty;
    const diffConfig = getDifficultyConfig(activeDifficulty, pSize);
    const startLocation = LOCATIONS['city_outskirts'];
    set({
      phase: 'exploration',
      party,
      currentLocationId: 'city_outskirts',
      enemies: [],
      combat: null,
      activeEvent: startLocation.storyEvent || null,
      eventOutcome: null,
      messageLog: ['Iniziate il vostro viaggio attraverso le strate desolate di Raccoon City...', `\n🎮 Difficoltà: ${diffConfig.icon} ${diffConfig.label} — ${diffConfig.description}`],
      turnCount: 0,
      inventoryOpen: false,
      selectedCharacterId: party[0]?.id || null,
      searchCounts: {},
      searchMaxes: {},
      partySize: pSize,
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
      // persistentRibbons is preserved (set externally for New Game+)
    });
  },

  gameOver: () => {
    set({ phase: 'game-over' });
  },

  victory: () => {
    const state = get();
    const ending = get().determineEnding();
    set({ phase: 'victory', endingType: ending.id });
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
      selectedDifficulty: null,
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      collectedDocuments: [],
      documentsOpen: false,
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
    });
  },

  // ==========================================
  // EXPLORATION
  // ==========================================
  explore: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];

    // Play location ambient sound (#33)
    try { playLocationAmbient(state.currentLocationId); } catch {}

    // Random ambient text
    const ambient = location.ambientText[Math.floor(Math.random() * location.ambientText.length)];
    const newLog = [...state.messageLog, `[${state.turnCount}] ${ambient}`];

    // Check for combat encounter (skip if just resolved an event)
    const shouldSkipEncounter = state.skipNextEncounter;
    if (shouldSkipEncounter) {
      set({ messageLog: newLog, turnCount: state.turnCount + 1, skipNextEncounter: false });
      return;
    }

    if (Math.random() * 100 < location.encounterRate) {
      // Play encounter sound (#36)
      try { playEncounter(); } catch {}

      const diff = getDifficultyConfig(state.difficulty, state.partySize);
      // Spawn enemies scaled by party size
      const numEnemies = diff.minEnemies + Math.floor(Math.random() * (diff.maxEnemies - diff.minEnemies + 1));
      const enemies: EnemyInstance[] = [];
      for (let i = 0; i < numEnemies; i++) {
        const enemyId = location.enemyPool[Math.floor(Math.random() * location.enemyPool.length)];
        enemies.push(createEnemyInstance(enemyId, diff.statMult));
      }

      const enemyNames = enemies.map(e => e.name).join(', ');

      // ── SECRET BOSS CHECK (proto_tyrant) ──
      // After defeating tyrant_boss AND being in laboratory_entrance, 15% chance to encounter proto_tyrant
      const defeatedTyrant = state.bestiary.some(b => b.enemyId === 'tyrant_boss' && b.defeated);
      if (defeatedTyrant && state.currentLocationId === 'laboratory_entrance' && Math.random() < 0.15) {
        const protoBoss = createEnemyInstance('proto_tyrant', diff.statMult);
        enemies.length = 0;
        enemies.push(protoBoss);
      }

      const secretEnemyNames = enemies.map(e => e.name).join(', ');

      // Show encounter notification first, then transition to combat
      set({
        messageLog: [...newLog, `[${state.turnCount}] ⚔️ Combattimento iniziato contro ${secretEnemyNames}!`],
        notification: {
          id: `notif_${++notifId}`,
          type: 'encounter',
          message: `Incontro: ${secretEnemyNames}`,
          icon: '⚔️',
          subMessage: 'Preparati al combattimento!',
        },
      });

      // Delay combat start to show notification
      setTimeout(() => {
        const currentState = get();
        // Determine turn order
        const allActors = [
          ...currentState.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
        const firstActor = allActors[0];

        // Update bestiary - mark enemies as encountered
        const currentBestiary = [...currentState.bestiary];
        for (const enemy of enemies) {
          const existing = currentBestiary.find(b => b.enemyId === enemy.definitionId);
          if (!existing) {
            currentBestiary.push({ enemyId: enemy.definitionId, encountered: true, defeated: false, timesDefeated: 0 });
          } else if (!existing.encountered) {
            existing.encountered = true;
          }
        }

        set({
          phase: 'combat',
          enemies,
          autoCombat: false,
          combat: {
            turn: 1,
            playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
            enemyOrder: allActors.filter(a => a.type === 'enemy').map(a => a.id),
            fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
            currentActorId: firstActor.id,
            currentActorType: firstActor.type,
            selectedAction: null,
            selectedTarget: null,
            selectedItemUid: null,
            isProcessing: false,
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Combattimento', message: `Incontro con ${secretEnemyNames}!` }],
            isVictory: false,
            isDefeat: false,
            fled: false,
            statusDurations: {},
            specialCooldowns: {},
            special2Cooldowns: {},
            tauntTargetId: null,
          },
          notification: null,
          bestiary: currentBestiary,
        });

        // If enemy goes first, trigger their action after a short delay
        if (firstActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 1400);
        }
      }, 1200);
      return;
    }

    // ── NEMESIS INVASION CHECK (Persistent Pursuit) ──
    // Nemesis pursues the player persistently (pursuit level 0-5)
    // Level 5 = permanently defeated. Each escape increases pursuit level.
    const nemesisPursuitLevel = state.nemesisPursuitLevel;
    const nemesisPermanentlyDefeated = nemesisPursuitLevel >= 5;
    const turnsSinceLastSeen = state.nemesisLastSeenTurn > 0 ? state.turnCount - state.nemesisLastSeenTurn : 999;
    const canNemesisAppear = state.turnCount >= 15 && !nemesisPermanentlyDefeated && turnsSinceLastSeen >= 10;

    // Invasion chance scales with pursuit level (8% base + 3% per level)
    if (canNemesisAppear && Math.random() < (0.08 + nemesisPursuitLevel * 0.03)) {
      // Play encounter sound for Nemesis invasion (#36)
      try { playEncounter(); } catch {}

      const diff = getDifficultyConfig(state.difficulty, state.partySize);
      // Stronger Nemesis based on pursuit level
      const nemesisStatMult = diff.statMult * (0.8 + 0.1 * nemesisPursuitLevel);
      const nemesis = createEnemyInstance('nemesis_boss', nemesisStatMult);

      const pursuitLabel = nemesisPursuitLevel === 0 ? 'Primo Incontro' :
        nemesisPursuitLevel === 1 ? 'Inseguimento' :
        nemesisPursuitLevel === 2 ? 'Caccia Spietata' :
        nemesisPursuitLevel === 3 ? 'Furia' :
        'Rabbia Estrema';

      set({
        messageLog: [...newLog, `[${state.turnCount}] 💀 "S.T.A.R.S...." Un suono terrificante riecheggia... NEMESIS appare! [Livello Inseguimento: ${nemesisPursuitLevel + 1}/5 — ${pursuitLabel}]`],
        turnCount: state.turnCount + 1,
        notification: {
          id: `notif_${++notifId}`,
          type: 'encounter',
          message: `💀 NEMESIS INVASIONE! [Lv.${nemesisPursuitLevel + 1}]`,
          icon: '💀',
          subMessage: `S.T.A.R.S... ${pursuitLabel}!`,
        },
        nemesisLastSeenLocation: state.currentLocationId,
        nemesisLastSeenTurn: state.turnCount,
      });

      setTimeout(() => {
        const currentState = get();
        const allActors = [
          ...currentState.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...[nemesis].map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
        const firstActor = allActors[0];

        const nemesisBestiary = [...currentState.bestiary];
        const existingNem = nemesisBestiary.find(b => b.enemyId === 'nemesis_boss');
        if (!existingNem) {
          nemesisBestiary.push({ enemyId: 'nemesis_boss', encountered: true, defeated: false, timesDefeated: 0 });
        } else {
          existingNem.encountered = true;
        }

        set({
          phase: 'combat',
          enemies: [nemesis],
          autoCombat: false,
          combat: {
            turn: 1,
            playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
            enemyOrder: allActors.filter(a => a.type === 'enemy').map(a => a.id),
            fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
            currentActorId: firstActor.id,
            currentActorType: firstActor.type,
            selectedAction: null,
            selectedTarget: null,
            selectedItemUid: null,
            isProcessing: false,
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Invasione', message: `NEMESIS è apparso! "S.T.A.R.S.!" [Livello ${nemesisPursuitLevel + 1}/5]` }],
            isVictory: false,
            isDefeat: false,
            fled: true,
            statusDurations: {},
            specialCooldowns: {},
            special2Cooldowns: {},
            tauntTargetId: null,
          },
          bestiary: nemesisBestiary,
          notification: null,
        });

        if (firstActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 1400);
        }
      }, 1500);
      return;
    }

    // ── DYNAMIC EVENT CHECK ──
    if (!state.activeDynamicEvent) {
      const eligibleEvents = Object.values(DYNAMIC_EVENTS).filter(e => {
        if (state.turnCount < e.minTurn) return false;
        if (e.locationIds.length > 0 && !e.locationIds.includes(state.currentLocationId)) return false;
        return Math.random() * 100 < e.triggerChance;
      });
      if (eligibleEvents.length > 0) {
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        set({
          messageLog: [...newLog, `[${state.turnCount}] ${event.icon} ${event.onTriggerMessage}`],
          turnCount: state.turnCount + 1,
          activeDynamicEvent: event,
          dynamicEventTurnsLeft: event.duration,
          notification: {
            id: `notif_${++notifId}`,
            type: 'encounter',
            message: `${event.icon} ${event.title}`,
            icon: event.icon,
            subMessage: event.onTriggerMessage,
          },
        });
        return;
      }
    }
    // ── DYNAMIC EVENT TICK ──
    else {
      const evt = state.activeDynamicEvent;
      const dmg = evt?.effect.damagePerTurn || 0;
      let tickLog: string[] = [];
      let updatedParty = [...state.party];
      if (dmg > 0) {
        updatedParty = updatedParty.map(p => ({
          ...p,
          currentHp: Math.max(1, p.currentHp - dmg),
        }));
        tickLog.push(`[${state.turnCount}] 💔 ${evt!.icon} ${dmg} danni a tutti (${state.dynamicEventTurnsLeft - 1} turni rimasti)`);
      }
      const newTurnsLeft = state.dynamicEventTurnsLeft - 1;
      if (newTurnsLeft <= 0) {
        tickLog.push(`[${state.turnCount}] ✅ ${evt!.onEndMessage}`);
        set({
          activeDynamicEvent: null,
          dynamicEventTurnsLeft: 0,
          party: updatedParty,
          messageLog: [...newLog, ...tickLog],
          turnCount: state.turnCount + 1,
        });
      } else {
        set({
          dynamicEventTurnsLeft: newTurnsLeft,
          party: updatedParty,
          messageLog: [...newLog, ...tickLog],
          turnCount: state.turnCount + 1,
        });
      }
      return;
    }

    // ── NPC ENCOUNTER CHECK ──
    const locationNpcs = Object.values(NPCS).filter(n => n.locationId === state.currentLocationId);
    const newNpcs = locationNpcs.filter(n => !state.npcsEncountered.includes(n.id));
    if (newNpcs.length > 0 && Math.random() < 0.15) {
      const npc = newNpcs[Math.floor(Math.random() * newNpcs.length)];
      get().encounterNpc(npc.id);
      return;
    }

    // Check for random item find
    if (Math.random() < 0.3 && location.itemPool.length > 0) {
      // Filter out key items already in party inventory BEFORE selection
      const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
      const eligibleItems = location.itemPool.filter(entry =>
        !(KEY_ITEM_IDS.has(entry.itemId) && partyItemIds.has(entry.itemId))
      );
      const availableItems = eligibleItems.filter(() => Math.random() * 100 < 50);
      if (availableItems.length > 0) {
        const foundEntry = availableItems[Math.floor(Math.random() * availableItems.length)];
        const itemDef = ITEMS[foundEntry.itemId];
        if (itemDef) {
          // ── Play item pickup sound (#36) ──
          if (itemDef.type !== 'collectible') {
            try { playItemPickup(); } catch {}
          }
          if (itemDef.type === 'collectible') {
            if (state.collectedRibbons >= 10) {
              // Already found all ribbons
              set({ messageLog: newLog, turnCount: state.turnCount + 1 });
              return;
            }
            const newCount = state.collectedRibbons + 1;
            set({
              messageLog: [...newLog, `[${state.turnCount}] 🎀 Nastro d'Inchiostro trovato! (${newCount}/10)`],
              turnCount: state.turnCount + 1,
              collectedRibbons: newCount,
              notification: {
                id: `notif_${++notifId}`,
                type: 'collectible_found' as const,
                message: `Nastro d'Inchiostro`,
                icon: '🎀',
                itemId: 'ink_ribbon',
                subMessage: `Collezionabili: ${newCount}/10`,
              },
            });
            setTimeout(() => get().checkAchievements(), 100);
            return;
          }

          // ── BAG: auto-equip only if inventory full, otherwise add as item ──
          if (itemDef.type === 'bag' && itemDef.effect?.type === 'add_slots') {
            const targetId = state.selectedCharacterId || state.party[0]?.id;
            const targetChar = state.party.find(p => p.id === targetId);
            const isFull = targetChar ? targetChar.inventory.length >= targetChar.maxInventorySlots : false;

            if (isFull && targetChar && targetChar.maxInventorySlots < MAX_INVENTORY_SLOTS) {
              // Auto-equip: expand slots immediately
              const newSlots = Math.min(MAX_INVENTORY_SLOTS, targetChar.maxInventorySlots + itemDef.effect.value);
              const expanded = newSlots > targetChar.maxInventorySlots;
              const oldSlots = targetChar.maxInventorySlots;
              const updatedParty = state.party.map(p =>
                p.id === targetId ? { ...p, maxInventorySlots: newSlots } : p
              );
              set({
                messageLog: [...newLog,
                  expanded
                    ? `[${state.turnCount}] 🧳 ${targetChar.name} usa ${itemDef.name}! Inventario espanso: ${oldSlots} → ${newSlots} slot.`
                    : `[${state.turnCount}] 🧳 ${itemDef.name} trovato, ma l'inventario è già al massimo.`,
                ],
                party: updatedParty,
                turnCount: state.turnCount + 1,
                notification: expanded ? {
                  id: `notif_${++notifId}`,
                  type: 'bag_expand',
                  message: `Inventario espanso!`,
                  icon: '🧳',
                  itemId: foundEntry.itemId,
                  subMessage: `${targetChar.name}: ${oldSlots} → ${newSlots} slot`,
                  characterId: targetId,
                } : null,
              });
            } else {
              // Add to inventory as normal item
              const bagItem: ItemInstance = {
                uid: `bag_${Date.now()}`,
                itemId: foundEntry.itemId,
                name: itemDef.name,
                description: itemDef.description,
                type: itemDef.type,
                rarity: itemDef.rarity,
                icon: itemDef.icon,
                usable: itemDef.usable,
                equippable: itemDef.equippable,
                effect: itemDef.effect,
                quantity: foundEntry.quantity,
              };
              const updatedParty = state.party.map(p =>
                p.id === targetId ? { ...p, inventory: [...p.inventory, bagItem] } : p
              );
              set({
                messageLog: [...newLog, `[${state.turnCount}] 🧳 ${targetChar?.name || 'Qualcuno'} ha trovato ${itemDef.name}! (Usalo dall'inventario per espandere lo spazio)`],
                party: updatedParty,
                turnCount: state.turnCount + 1,
                notification: {
                  id: `notif_${++notifId}`,
                  type: 'item_found',
                  message: itemDef.name,
                  icon: itemDef.icon,
                  itemId: foundEntry.itemId,
                  subMessage: `Ricevuto da ${targetChar?.name || 'qualcuno'}`,
                  characterId: targetId,
                },
              });
            }
            return;
          }

          // ── KEY ITEM CHECK: prevent duplicate keys (safety net, should not trigger due to pre-filter) ──
          if (KEY_ITEM_IDS.has(foundEntry.itemId)) {
            const partyAlreadyHasKey = state.party.some(p =>
              p.inventory.some(i => i.itemId === foundEntry.itemId)
            );
            if (partyAlreadyHasKey) {
              set({ messageLog: [...newLog, `[${state.turnCount}] 🎒 Avete trovato ${itemDef.name}, ma ne avete già una copia.`], turnCount: state.turnCount + 1 });
              return;
            }
          }

          // ── NORMAL ITEM: add to inventory ──
          const newItem: ItemInstance = {
            uid: `${foundEntry.itemId}_${Date.now()}`,
            itemId: foundEntry.itemId,
            name: itemDef.name,
            description: itemDef.description,
            type: itemDef.type,
            rarity: itemDef.rarity,
            icon: itemDef.icon,
            usable: itemDef.usable,
            equippable: itemDef.equippable,
            effect: itemDef.effect,
            quantity: foundEntry.quantity,
          };

          // Find character with space (try selected first, then any), auto-stack if same item exists
          const targetId = state.selectedCharacterId || state.party[0]?.id;
          let finder: typeof state.party[0] | null = null;
          const updatedParty = state.party.map(p => {
            if (!finder && p.id === targetId) {
              // Try to add to existing stack first
              const existingIdx = p.inventory.findIndex(i => i.itemId === foundEntry.itemId);
              if (existingIdx >= 0) {
                finder = p;
                const updatedInv = [...p.inventory];
                updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + foundEntry.quantity };
                return { ...p, inventory: updatedInv };
              }
              // No existing stack, add as new entry if space available
              if (p.inventory.length < p.maxInventorySlots) {
                finder = p;
                return { ...p, inventory: [...p.inventory, newItem] };
              }
            }
            return p;
          });
          // Fallback: any party member with space
          if (!finder) {
            const fallbackParty = updatedParty.map(p => {
              if (!finder && p.currentHp > 0) {
                const existingIdx = p.inventory.findIndex(i => i.itemId === foundEntry.itemId);
                if (existingIdx >= 0) {
                  finder = p;
                  const updatedInv = [...p.inventory];
                  updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + foundEntry.quantity };
                  return { ...p, inventory: updatedInv };
                }
                if (p.inventory.length < p.maxInventorySlots) {
                  finder = p;
                  return { ...p, inventory: [...p.inventory, newItem] };
                }
              }
              return p;
            });
            set({
              messageLog: [
                ...newLog,
                finder
                  ? `[${state.turnCount}] 🎒 ${finder.name} ha trovato: ${itemDef.name}!`
                  : `[${state.turnCount}] 🎒 Avete trovato ${itemDef.name}, ma gli inventari sono pieni.`,
              ],
              party: fallbackParty,
              turnCount: state.turnCount + 1,
              notification: finder ? {
                id: `notif_${++notifId}`,
                type: 'item_found',
                message: itemDef.name,
                icon: itemDef.icon,
                itemId: foundEntry.itemId,
                subMessage: `Ricevuto da ${finder.name}`,
                characterId: finder.id,
              } : null,
            });
          } else {
            set({
              messageLog: [...newLog, `[${state.turnCount}] 🎒 ${finder.name} ha trovato: ${itemDef.name}!`],
              party: updatedParty,
              turnCount: state.turnCount + 1,
              notification: {
                id: `notif_${++notifId}`,
                type: 'item_found',
                message: itemDef.name,
                icon: itemDef.icon,
                itemId: foundEntry.itemId,
                subMessage: `Ricevuto da ${finder.name}`,
                characterId: finder.id,
              },
            });
          }
          return;
        }
      }
    }

    // ── DOCUMENT DISCOVERY IN EXPLORE ──
    const locationDocs = Object.values(DOCUMENTS).filter(d =>
      d.locationId === state.currentLocationId &&
      !state.collectedDocuments.includes(d.id)
    );
    if (locationDocs.length > 0 && Math.random() < 0.25) {
      const doc = locationDocs[Math.floor(Math.random() * locationDocs.length)];
      if (doc.hintRequired && !state.collectedDocuments.includes(doc.hintRequired)) {
        set({ messageLog: newLog, turnCount: state.turnCount + 1 });
        return;
      }
      // Play document found sound (#36)
      try { playDocumentFound(); } catch {}
      const newDocs = [...state.collectedDocuments, doc.id];
      set({
        messageLog: [...newLog, `[${state.turnCount}] 📖 Documento trovato: "${doc.title}"`],
        collectedDocuments: newDocs,
        turnCount: state.turnCount + 1,
        notification: {
          id: `notif_${++notifId}`,
          type: 'item_found',
          message: doc.title,
          icon: doc.icon,
          subMessage: doc.type === 'umbrella_file' ? '📄 File Umbrella' : `📝 ${doc.type}`,
        },
      });
      return;
    }

    set({ messageLog: newLog, turnCount: state.turnCount + 1 });
  },

  travelTo: (locationId: string) => {
    const state = get();
    const currentLocation = LOCATIONS[state.currentLocationId];
    const destination = LOCATIONS[locationId];
    if (!destination) return;

    // Play travel sound (#36) and ambient (#33)
    try { playTravel(); } catch {}
    try { playLocationAmbient(locationId); } catch {}

    // Check if destination is locked from current location
    const lockedEntry = currentLocation.lockedLocations?.find(l => l.locationId === locationId);
    let newUnlockedPaths = [...state.unlockedPaths];
    let updatedParty = [...state.party];
    let keyDiscardMsg = '';

    if (lockedEntry) {
      // Check if any party member has the required key
      const hasKey = state.party.some(p => p.inventory.some(i => i.itemId === lockedEntry.requiredItemId));
      if (!hasKey) {
        set({
          messageLog: [...state.messageLog, `[${state.turnCount}] ${lockedEntry.lockedMessage}`],
        });
        return;
      }
      // Register this path as unlocked
      const pathKey = `${state.currentLocationId}→${locationId}`;
      if (!newUnlockedPaths.includes(pathKey)) {
        newUnlockedPaths.push(pathKey);
      }

      // Check if the key is still needed for any other locked paths
      if (KEY_ITEM_IDS.has(lockedEntry.requiredItemId) && !isKeyStillNeeded(lockedEntry.requiredItemId, newUnlockedPaths)) {
        const keyDef = ITEMS[lockedEntry.requiredItemId];
        const keyName = keyDef?.name || lockedEntry.requiredItemId;
        // Remove all instances of this key from all party inventories
        updatedParty = updatedParty.map(p => ({
          ...p,
          inventory: p.inventory.filter(i => i.itemId !== lockedEntry.requiredItemId),
        }));
        keyDiscardMsg = ` 🔑 ${keyName} scartata — non serve più.`;
      }
    }

    // Track visited location
    const newVisited = state.visitedLocations.includes(locationId)
      ? state.visitedLocations
      : [...state.visitedLocations, locationId];

    const newLog = [
      ...state.messageLog,
      `[${state.turnCount}] 📍 Viaggiando verso: ${destination.name}`,
      `[${state.turnCount}] ${destination.description}`,
    ];
    if (keyDiscardMsg) {
      newLog.push(`[${state.turnCount}]${keyDiscardMsg}`);
    }

    const turnIncrease = destination.encounterRate > 40 ? 2 : 1;

    // Only show event if not already completed
    const eventAlreadyCompleted = state.completedEvents.includes(locationId);
    const showEvent = destination.storyEvent && !eventAlreadyCompleted;

    set({
      currentLocationId: locationId,
      messageLog: newLog,
      turnCount: state.turnCount + turnIncrease,
      activeEvent: showEvent ? destination.storyEvent : null,
      eventOutcome: null,
      unlockedPaths: newUnlockedPaths,
      visitedLocations: newVisited,
      party: updatedParty,
      skipNextEncounter: true, // Prevent immediate combat after traveling
    });
    setTimeout(() => get().checkAchievements(), 100);
  },

  toggleMap: () => {
    try {
      const isOpen = get().mapOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ mapOpen: !state.mapOpen }));
  },

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
    // Clear notification after 4 seconds
    setTimeout(() => {
      set({ newAchievementNotification: null });
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
    const allKeys = ['key_rpd', 'key_sewers', 'key_lab'];
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
    if (state.bestiary.filter(b => b.defeated).length >= 12) {
      checkAndUnlock('bestiary_all');
    }

    // help_survivors: completedEvents includes city_outskirts
    if (state.completedEvents.includes('city_outskirts')) {
      checkAndUnlock('savior');
    }

    // game_victory: phase is 'victory'
    if (state.phase === 'victory') {
      checkAndUnlock('victory');
    }
  },

  searchArea: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    const locId = state.currentLocationId;
    const searchCount = state.searchCounts[locId] || 0;

    // Play search sound (#36)
    try { playSearch(); } catch {}

    // Determine max searches for this location (random 1-3, set once on first search)
    const maxSearches = state.searchMaxes[locId] || (Math.floor(Math.random() * 3) + 1);
    const newSearchMaxes = state.searchMaxes[locId] ? state.searchMaxes : { ...state.searchMaxes, [locId]: maxSearches };

    // Area exhausted — player doesn't know the limit, just show nothing
    if (searchCount >= maxSearches) {
      const emptyMessages = [
        'Non trovate nulla di interessante.',
        'La zona non ha più segreti da svelare.',
        'Perlustrate ogni angolo, ma non c\'è più nulla.',
        'Avete già controllato tutto a fondo.',
      ];
      const msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
      set({
        messageLog: [...state.messageLog, `[${state.turnCount}] 🔍 ${msg}`],
        turnCount: state.turnCount + 1,
      });
      return;
    }

    const searcherName = state.party.find(p => p.id === state.selectedCharacterId)?.name || 'Qualcuno';
    const newLog = [...state.messageLog, `[${state.turnCount}] 🔍 ${searcherName} cerca nella zona...`];

    // Increment search count
    const newSearchCounts = { ...state.searchCounts, [locId]: searchCount + 1 };

    // ~60% chance to find something at all (search is more thorough than explore, but not guaranteed)
    const searchFlavourTexts = [
      `${searcherName} ispeziona gli scaffali...`,
      `${searcherName} rovista tra i detriti...`,
      `${searcherName} controlla dietro ogni angolo...`,
      `${searcherName} fruga in un armadio socchiuso...`,
      `${searcherName} scava tra le macerie...`,
    ];
    const flavourText = searchFlavourTexts[Math.floor(Math.random() * searchFlavourTexts.length)];

    if (Math.random() < 0.4) {
      // Nothing found
      const missMessages = [
        `${flavourText} Nulla di utile.`,
        `${flavourText} Solo polvere e ragnatele.`,
        `${flavourText} Niente che valga la pena prendere.`,
        `${flavourText} Questa zona è già stata saccheggiata.`,
      ];
      const msg = missMessages[Math.floor(Math.random() * missMessages.length)];
      set({
        messageLog: [...newLog, `[${state.turnCount}] ${msg}`],
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        searchMaxes: newSearchMaxes,
      });
      return;
    }

    // Find items from pool (exclude key items already in party inventory)
    const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
    const foundItems: string[] = [];
    for (const entry of location.itemPool) {
      // Skip key items already owned by the party
      if (KEY_ITEM_IDS.has(entry.itemId) && partyItemIds.has(entry.itemId)) continue;
      if (Math.random() * 100 < entry.chance) {
        foundItems.push(entry.itemId);
      }
    }

    if (foundItems.length === 0) {
      set({
        messageLog: [...newLog, `[${state.turnCount}] ${flavourText} Non trovate nulla di utile qui.`],
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        searchMaxes: newSearchMaxes,
      });
      return;
    }

    const targetId = state.selectedCharacterId || state.party[0]?.id;
    let updatedParty = [...state.party];
    const foundNames: string[] = [];
    const foundNotifItems: { name: string; itemId: string; icon?: string }[] = [];
    let lastNotif: GameNotification | null = null;
    let newRibbonCount = state.collectedRibbons;

    for (const itemId of foundItems) {
      const itemDef = ITEMS[itemId];
      if (!itemDef) continue;

      // ── COLLECTIBLE: don't add to inventory, track separately ──
      if (itemDef.type === 'collectible') {
        if (newRibbonCount < 10) {
          newRibbonCount += 1;
          foundNames.push(`🎀 ${itemDef.name} (${newRibbonCount}/10)`);
          lastNotif = {
            id: `notif_${++notifId}`,
            type: 'collectible_found' as const,
            message: itemDef.name,
            icon: itemDef.icon,
            itemId: 'ink_ribbon',
            subMessage: `Collezionabili: ${newRibbonCount}/10`,
          };
        }
        continue;
      }

      const targetChar = updatedParty.find(p => p.id === targetId);

      // ── BAG: auto-equip only if inventory full, otherwise add as item ──
      if (itemDef.type === 'bag' && itemDef.effect?.type === 'add_slots') {
        const isFull = targetChar ? targetChar.inventory.length >= targetChar.maxInventorySlots : false;
        if (isFull && targetChar && targetChar.maxInventorySlots < MAX_INVENTORY_SLOTS) {
          const newSlots = Math.min(MAX_INVENTORY_SLOTS, targetChar.maxInventorySlots + itemDef.effect.value);
          const oldSlots = targetChar.maxInventorySlots;
          updatedParty = updatedParty.map(p =>
            p.id === targetId ? { ...p, maxInventorySlots: newSlots } : p
          );
          foundNames.push(`${itemDef.name} (slot ${oldSlots}→${newSlots})`);
          lastNotif = {
            id: `notif_${++notifId}`,
            type: 'bag_expand' as const,
            message: `Inventario espanso!`,
            icon: '🧳',
            itemId,
            subMessage: `${targetChar.name}: ${oldSlots} → ${newSlots} slot`,
            characterId: targetId,
          };
        } else {
          const bagItem: ItemInstance = {
            uid: `bag_${Date.now()}_${Math.random()}`,
            itemId,
            name: itemDef.name,
            description: itemDef.description,
            type: itemDef.type,
            rarity: itemDef.rarity,
            icon: itemDef.icon,
            usable: itemDef.usable,
            equippable: itemDef.equippable,
            effect: itemDef.effect,
            quantity: 1,
          };
          updatedParty = updatedParty.map(p =>
            p.id === targetId ? { ...p, inventory: [...p.inventory, bagItem] } : p
          );
          foundNames.push(itemDef.name);
          foundNotifItems.push({ name: itemDef.name, itemId, icon: itemDef.icon });
        }
        continue;
      }

      // ── KEY ITEM CHECK: prevent duplicate keys (safety net, should not trigger due to pre-filter) ──
      if (KEY_ITEM_IDS.has(itemId)) {
        const partyAlreadyHasKey = updatedParty.some(p =>
          p.inventory.some(i => i.itemId === itemId)
        );
        if (partyAlreadyHasKey) {
          continue; // Skip silently — already filtered above, this is just a safety net
        }
      }

      // ── NORMAL ITEM (auto-stack if same item exists) ──
      const finderChar = updatedParty.find(p => p.id === targetId);
      // Try to add to existing stack first
      const existingIdx = finderChar ? finderChar.inventory.findIndex(i => i.itemId === itemId) : -1;
      if (existingIdx >= 0) {
        updatedParty = updatedParty.map(p => {
          if (p.id !== targetId) return p;
          const updatedInv = [...p.inventory];
          updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + 1 };
          return { ...p, inventory: updatedInv };
        });
        foundNames.push(itemDef.name);
        foundNotifItems.push({ name: itemDef.name, itemId, icon: itemDef.icon });
      } else {
        const hasSpace = finderChar && finderChar.inventory.length < finderChar.maxInventorySlots;
        if (hasSpace) {
          const newItem: ItemInstance = {
            uid: `${itemId}_${Date.now()}_${Math.random()}`,
            itemId,
            name: itemDef.name,
            description: itemDef.description,
            type: itemDef.type,
            rarity: itemDef.rarity,
            icon: itemDef.icon,
            usable: itemDef.usable,
            equippable: itemDef.equippable,
            effect: itemDef.effect,
            quantity: 1,
          };
          updatedParty = updatedParty.map(p =>
            p.id === targetId ? { ...p, inventory: [...p.inventory, newItem] } : p
          );
          foundNames.push(itemDef.name);
          foundNotifItems.push({ name: itemDef.name, itemId, icon: itemDef.icon });
        } else {
          foundNames.push(`${itemDef.name} (inventario pieno!)`);
        }
      }
    }

    // Build bundled notification for multiple items found, or single item notification
    // Play item pickup sound if any items were found (#36)
    if (foundNotifItems.length > 0) {
      try { playItemPickup(); } catch {}
    }
    const finderChar = updatedParty.find(p => p.id === targetId);
    if (!lastNotif && foundNotifItems.length > 0) {
      if (foundNotifItems.length === 1) {
        // Single item — show standard single-item notification
        const item = foundNotifItems[0];
        lastNotif = {
          id: `notif_${++notifId}`,
          type: 'item_found' as const,
          message: item.name,
          icon: item.icon,
          itemId: item.itemId,
          subMessage: `Ricevuto da ${finderChar?.name || 'qualcuno'}`,
          characterId: targetId,
        };
      } else {
        // Multiple items — bundled notification showing all items
        lastNotif = {
          id: `notif_${++notifId}`,
          type: 'item_found' as const,
          message: `${foundNotifItems.length} oggetti trovati!`,
          icon: '🎒',
          subMessage: `Ricevuti da ${finderChar?.name || 'qualcuno'}`,
          characterId: targetId,
          items: foundNotifItems,
        };
      }
    }

    // ── DOCUMENT DISCOVERY IN SEARCH ──
    const searchDocs = Object.values(DOCUMENTS).filter(d =>
      d.locationId === locId &&
      !state.collectedDocuments.includes(d.id) &&
      (!d.hintRequired || state.collectedDocuments.includes(d.hintRequired))
    );
    if (searchDocs.length > 0 && Math.random() < 0.35) {
      const doc = searchDocs[Math.floor(Math.random() * searchDocs.length)];
      const newDocs = [...state.collectedDocuments, doc.id];
      // Play document found sound (#36)
      try { playDocumentFound(); } catch {}
      set({
        messageLog: [...newLog, `[${state.turnCount}] 🎒 ${flavourText}`, `[${state.turnCount}] 📖 ${searcherName} trova un documento: "${doc.title}"`],
        collectedDocuments: newDocs,
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        searchMaxes: newSearchMaxes,
        notification: {
          id: `notif_${++notifId}`,
          type: 'item_found',
          message: doc.title,
          icon: doc.icon,
          subMessage: doc.type === 'umbrella_file' ? '📄 File Umbrella' : `📝 ${doc.type}`,
        },
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    // ── SECRET ROOM DISCOVERY ──
    const locationSecrets = Object.values(SECRET_ROOMS).filter(s =>
      s.locationId === locId &&
      !state.discoveredSecretRooms.includes(s.id)
    );
    for (const secret of locationSecrets) {
      let canDiscover = false;
      if (secret.discoveryMethod === 'search' && Math.random() * 100 < secret.searchChance) {
        canDiscover = true;
      }
      if (secret.discoveryMethod === 'document' && secret.requiredDocumentId && state.collectedDocuments.includes(secret.requiredDocumentId)) {
        canDiscover = Math.random() * 100 < 50;
      }
      if (secret.discoveryMethod === 'npc_hint' && secret.requiredNpcQuestId) {
        const questProgress = state.npcQuestProgress[secret.requiredNpcQuestId];
        if (questProgress?.completed && Math.random() * 100 < secret.searchChance) {
          canDiscover = true;
        }
      }
      if (canDiscover) {
        get().discoverSecretRoom(secret.id);
        return;
      }
    }

    set({
      messageLog: [...newLog, `[${state.turnCount}] 🎒 ${flavourText} Trovati: ${foundNames.join(', ')}.`],
      party: updatedParty,
      turnCount: state.turnCount + 1,
      searchCounts: newSearchCounts,
      searchMaxes: newSearchMaxes,
      notification: lastNotif,
      collectedRibbons: newRibbonCount,
    });
    // Check achievements after search (may have found ribbons)
    setTimeout(() => get().checkAchievements(), 100);
  },

  handleEventChoice: (choiceIndex: number) => {
    const state = get();
    const event = state.activeEvent;
    if (!event) return;

    const choice = event.choices[choiceIndex];
    if (!choice) return;

    // ── PUZZLE CHECK: If event has a puzzle and this is the first choice, start puzzle instead ──
    if (event.puzzle && choiceIndex === 0) {
      get().startPuzzle(event.puzzle, event.title, event.description);
      return;
    }

    const outcome = choice.outcome;
    let updatedParty = [...state.party];
    const logMessages: string[] = [
      `[${state.turnCount}] 📖 Evento: ${event.title}`,
      `[${state.turnCount}] ${event.description}`,
      `[${state.turnCount}] → ${choice.text}`,
      `[${state.turnCount}] 📖 ${outcome.description}`,
    ];

    // HP change
    if (outcome.hpChange) {
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
      }));
      logMessages.push(`[${state.turnCount}] ${outcome.hpChange > 0 ? '❤️' : '💔'} ${Math.abs(outcome.hpChange)} HP ${outcome.hpChange > 0 ? 'recuperati' : 'persi'}.`);
    }

    // Receive items (with stacking)
    if (outcome.receiveItems) {
      const lootSummary: string[] = [];
      for (const itemEntry of outcome.receiveItems) {
        const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
        updatedParty = result.party;
        if (result.added) {
          lootSummary.push(`${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
        } else {
          lootSummary.push(`${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → perso (inventario pieno)`);
        }
      }
      if (lootSummary.length > 0) {
        logMessages.push(`[${state.turnCount}] 🎒 Bottino ottenuto:`);
        for (const line of lootSummary) {
          logMessages.push(`[${state.turnCount}]   · ${line}`);
        }
      }
    }

    // Trigger combat
    if (outcome.triggerCombat && outcome.combatEnemyIds) {
      const eventDiff = getDifficultyConfig(state.difficulty, state.partySize);
      const enemies = outcome.combatEnemyIds.map(id => createEnemyInstance(id, eventDiff.statMult));
      const allActors = [
        ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
        ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
      ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);

      const firstActor = allActors[0];

      // Mark event as completed even when it triggers combat
      const newCompletedCombat = state.completedEvents.includes(state.currentLocationId)
        ? state.completedEvents
        : [...state.completedEvents, state.currentLocationId];

      set({
        phase: 'combat',
        party: updatedParty,
        autoCombat: false,
        enemies,
        activeEvent: null,
        eventOutcome: outcome,
        completedEvents: newCompletedCombat,
        combat: {
          turn: 1,
          playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
          enemyOrder: allActors.filter(a => a.type === 'enemy').map(a => a.id),
          fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
          currentActorId: firstActor.id,
          currentActorType: firstActor.type,
          selectedAction: null,
          selectedTarget: null,
          selectedItemUid: null,
          isProcessing: false,
          log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Combattimento', message: `Incontro con ${enemies.map(e => e.name).join(', ')}!` }],
          isVictory: false,
          isDefeat: false,
          fled: false,
          statusDurations: {},
          specialCooldowns: {},
          special2Cooldowns: {},
          tauntTargetId: null,
        },
        messageLog: [...state.messageLog, ...logMessages],
      });

      // If enemy goes first, trigger their action
      if (firstActor.type === 'enemy') {
        setTimeout(() => get().advanceToNextActor(), 1200);
      }
      return;
    }

    // Check for game over
    if (updatedParty.every(p => p.currentHp <= 0)) {
      const newCompleted = state.completedEvents.includes(state.currentLocationId)
        ? state.completedEvents
        : [...state.completedEvents, state.currentLocationId];
      set({
        phase: 'game-over',
        party: updatedParty,
        activeEvent: null,
        eventOutcome: outcome,
        messageLog: [...state.messageLog, ...logMessages],
        completedEvents: newCompleted,
      });
      return;
    }

    // Mark event as completed for this location
    const newCompleted = state.completedEvents.includes(state.currentLocationId)
      ? state.completedEvents
      : [...state.completedEvents, state.currentLocationId];

    // Track story choices for multiple endings
    const newStoryChoices = [...state.storyChoices];
    if (state.currentLocationId === 'city_outskirts') {
      if (choiceIndex === 0 && !newStoryChoices.includes('help_survivors')) newStoryChoices.push('help_survivors');
      if (choiceIndex === 1 && !newStoryChoices.includes('ignore_survivors')) newStoryChoices.push('ignore_survivors');
    }
    if (state.currentLocationId === 'hospital_district') {
      if (choiceIndex === 0 && !newStoryChoices.includes('enter_lab')) newStoryChoices.push('enter_lab');
      if (choiceIndex === 1 && !newStoryChoices.includes('skip_lab')) newStoryChoices.push('skip_lab');
    }
    if (state.currentLocationId === 'sewers') {
      if (choiceIndex === 0 && !newStoryChoices.includes('go_back_sewers')) newStoryChoices.push('go_back_sewers');
      if (choiceIndex === 1 && !newStoryChoices.includes('proceed_sewers')) newStoryChoices.push('proceed_sewers');
    }
    if (state.currentLocationId === 'laboratory_entrance') {
      if (choiceIndex === 0 && !newStoryChoices.includes('hack_computer')) newStoryChoices.push('hack_computer');
      if (choiceIndex === 1 && !newStoryChoices.includes('skip_computer')) newStoryChoices.push('skip_computer');
    }

    set({
      activeEvent: null,
      eventOutcome: outcome,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMessages],
      turnCount: state.turnCount + 1,
      skipNextEncounter: true,
      completedEvents: newCompleted,
      storyChoices: newStoryChoices,
    });
    // Check achievements after event completion (help_survivors, etc.)
    setTimeout(() => get().checkAchievements(), 100);
  },

  closeEvent: () => {
    set({ activeEvent: null, eventOutcome: null, skipNextEncounter: true });
  },

  toggleInventory: () => {
    // Play menu open/close sound (#36)
    try {
      const isOpen = get().inventoryOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ inventoryOpen: !state.inventoryOpen }));
  },

  equipItem: (characterId: string, itemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || !item.equippable) return p;

        // If item already has weaponStats (starting items), use them directly
        // Otherwise, build from WEAPON_STATS lookup
        let weaponData = item.weaponStats || WEAPON_STATS[item.itemId] || null;
        if (!weaponData) return p;

        // Unequip current weapon
        let newInventory = p.inventory.map(i => ({ ...i, isEquipped: false }));
        
        // Equip new weapon (attach weaponStats to the item)
        newInventory = newInventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: true, weaponStats: weaponData } : i
        );

        return {
          ...p,
          weapon: weaponData,
          inventory: newInventory,
        };
      });
      return { party };
    });
  },

  consumeItemOutsideCombat: (characterId: string, itemUid: string) => {
    const MAX_SLOTS = 12;
    let logMsg = `[Turno ${get().turnCount}] 🎒 Oggetto usato.`;

    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || !item.usable || !item.effect) return p;

        let updatedCharacter = { ...p };
        const log: string[] = [];

        switch (item.effect.type) {
          case 'heal': {
            const healAmount = item.effect.value;
            const statusCured = item.effect.statusCured || [];
            const actualHeal = Math.min(updatedCharacter.maxHp, updatedCharacter.currentHp + healAmount) - updatedCharacter.currentHp;
            updatedCharacter.currentHp = Math.min(updatedCharacter.maxHp, updatedCharacter.currentHp + healAmount);
            if (statusCured.length > 0) {
              const hadStatus = statusCured.some(s => updatedCharacter.statusEffects.includes(s));
              updatedCharacter.statusEffects = updatedCharacter.statusEffects.filter(s => !statusCured.includes(s));
              if (hadStatus) {
                const curedNames = statusCured.filter(s => updatedCharacter.statusEffects.includes(s) || true).map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s).join(', ');
                log.push(`${p.name} usa ${item.name}. +${actualHeal} HP! ✨ Status negativi curati!`);
                logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP! Status curati!`;
              } else {
                log.push(`${p.name} usa ${item.name}. +${actualHeal} HP!`);
                logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP!`;
              }
            } else {
              log.push(`${p.name} usa ${item.name}. +${actualHeal} HP!`);
              logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP!`;
            }
            break;
          }
          case 'heal_full': {
            const actualHeal = updatedCharacter.maxHp - updatedCharacter.currentHp;
            const statusCured = item.effect.statusCured || [];
            updatedCharacter.currentHp = updatedCharacter.maxHp;
            if (statusCured.length > 0) {
              const hadStatus = statusCured.some(s => updatedCharacter.statusEffects.includes(s));
              updatedCharacter.statusEffects = updatedCharacter.statusEffects.filter(s => !statusCured.includes(s));
              if (hadStatus) {
                log.push(`${p.name} usa ${item.name}. HP completamente ripristinati (+${actualHeal})! ✨ Status negativi curati!`);
                logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP! Status curati!`;
              } else {
                log.push(`${p.name} usa ${item.name}. HP completamente ripristinati (+${actualHeal})!`);
                logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP!`;
              }
            } else {
              log.push(`${p.name} usa ${item.name}. HP completamente ripristinati (+${actualHeal})!`);
              logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. +${actualHeal} HP!`;
            }
            break;
          }
          case 'cure': {
            const cured = item.effect.statusCured || [];
            updatedCharacter.statusEffects = updatedCharacter.statusEffects.filter(s => !cured.includes(s));
            log.push(`${p.name} usa ${item.name}. Effetti curati!`);
            logMsg = `[Turno ${state.turnCount}] 🎒 ${p.name} usa ${item.name}. Effetti curati!`;
            break;
          }
          case 'add_slots': {
            const slotsToAdd = item.effect.value;
            const currentSlots = updatedCharacter.maxInventorySlots;
            if (currentSlots >= MAX_SLOTS) {
              log.push(`${p.name} ha già il massimo di slot (${MAX_SLOTS}).`);
              logMsg = `[Turno ${state.turnCount}] 🎒 Inventario già al massimo (${MAX_SLOTS} slot).`;
              // Don't consume the item if slots are maxed
              return p;
            }
            const newSlots = Math.min(MAX_SLOTS, currentSlots + slotsToAdd);
            updatedCharacter.maxInventorySlots = newSlots;
            log.push(`${p.name} equipaggia ${item.name}! +${newSlots - currentSlots} slot (totale: ${newSlots}/${MAX_SLOTS}).`);
            logMsg = `[Turno ${state.turnCount}] 🧳 ${p.name} equipaggia ${item.name}! Inventario: ${newSlots}/${MAX_SLOTS} slot.`;
            break;
          }
        }

        // Decrease quantity, remove only if qty reaches 0, then auto-merge stacks
        const newInventory = mergeInventoryStacks(
          p.inventory
            .map(i => {
              if (i.uid !== itemUid) return { ...i };
              const newQty = i.quantity - 1;
              if (newQty <= 0) return null;
              return { ...i, quantity: newQty };
            })
            .filter((i): i is NonNullable<typeof i> => i !== null)
        );

        return { ...updatedCharacter, inventory: newInventory };
      });

      return {
        party,
        messageLog: [...state.messageLog, logMsg],
      };
    });
  },

  combineHerbs: (characterId: string, redHerbUid: string) => {
    let combined = false;
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const redHerb = p.inventory.find(i => i.uid === redHerbUid && i.itemId === 'herb_red');
        if (!redHerb) return p;

        // Find a green herb in the same inventory
        const greenIdx = p.inventory.findIndex(i => i.itemId === 'herb_green');
        if (greenIdx === -1) return p;

        // Remove red herb and green herb, add mixed herb
        const mixedDef = ITEMS['herb_mixed'];
        if (!mixedDef) return p;

        const mixedHerb: ItemInstance = {
          uid: `herb_mixed_${Date.now()}_${Math.random()}`,
          itemId: 'herb_mixed',
          name: mixedDef.name,
          description: mixedDef.description,
          type: mixedDef.type,
          rarity: mixedDef.rarity,
          icon: mixedDef.icon,
          usable: mixedDef.usable,
          equippable: mixedDef.equippable,
          effect: mixedDef.effect,
          quantity: 1,
        };

        combined = true;
        return {
          ...p,
          inventory: [
            ...p.inventory.filter((_, idx) => idx !== greenIdx && p.inventory[idx].uid !== redHerbUid),
            mixedHerb,
          ],
        };
      });

      const logMsg = combined
        ? `[Turno ${state.turnCount}] 🌱 Erbe miscelate! Erba Verde + Erba Rossa = Erba Mista (cura 70 HP + rimuove status).`
        : '';

      return {
        party,
        messageLog: combined ? [...state.messageLog, logMsg] : state.messageLog,
      };
    });
    return combined;
  },

  selectCharacter: (characterId: string) => {
    set({ selectedCharacterId: characterId });
  },

  transferItem: (fromCharacterId: string, itemUid: string, toCharacterId: string) => {
    if (fromCharacterId === toCharacterId) return false;

    let transferred = false;
    let logMsg = '';

    set(state => {
      const fromChar = state.party.find(p => p.id === fromCharacterId);
      const toChar = state.party.find(p => p.id === toCharacterId);
      if (!fromChar || !toChar) return state;

      const item = fromChar.inventory.find(i => i.uid === itemUid);
      if (!item) return state;

      // If transferring an equipped weapon, unequip it first
      let updatedFromChar = { ...fromChar };
      let updatedToChar = { ...toChar };
      let updatedParty = state.party;

      if (item.isEquipped && item.weaponStats) {
        updatedFromChar = { ...updatedFromChar, weapon: null };
      }

      // Remove item from source
      updatedFromChar = {
        ...updatedFromChar,
        inventory: updatedFromChar.inventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: false } : i
        ).filter(i => i.uid !== itemUid),
      };

      // ── Stack with existing same-item on target if possible (ammo, healing, antidote) ──
      const isStackable = item.type === 'ammo' || item.type === 'healing' || item.type === 'antidote';
      const existingTargetIdx = updatedToChar.inventory.findIndex(i => i.itemId === item.itemId);
      if (isStackable && existingTargetIdx >= 0) {
        // Merge into existing stack — no extra slot needed
        const updatedInv = [...updatedToChar.inventory];
        updatedInv[existingTargetIdx] = { ...updatedInv[existingTargetIdx], quantity: updatedInv[existingTargetIdx].quantity + item.quantity };
        updatedToChar = { ...updatedToChar, inventory: updatedInv };
      } else if (updatedToChar.inventory.length < updatedToChar.maxInventorySlots || item.type === 'bag') {
        // Add as new entry
        updatedToChar = {
          ...updatedToChar,
          inventory: [...updatedToChar.inventory, { ...item, isEquipped: false }],
        };
      } else {
        // Target inventory full and can't stack
        logMsg = `[Turno ${state.turnCount}] 🚫 Inventario di ${toChar.name} pieno!`;
        return {
          party: state.party.map(p => {
            if (p.id === fromCharacterId) return updatedFromChar;
            return p;
          }),
          messageLog: [...state.messageLog, logMsg],
        };
      }

      // Update party
      updatedParty = state.party.map(p => {
        if (p.id === fromCharacterId) return updatedFromChar;
        if (p.id === toCharacterId) return updatedToChar;
        return p;
      });

      transferred = true;
      logMsg = `[Turno ${state.turnCount}] 🔄 ${fromChar.name} passa ${item.name} a ${toChar.name}.`;

      // ── BAG: auto-use if target inventory is full ──
      if (item.type === 'bag' && item.effect?.type === 'add_slots') {
        const MAX_INVENTORY_SLOTS = 12;
        const isFull = updatedToChar.inventory.length >= updatedToChar.maxInventorySlots;
        if (isFull && updatedToChar.maxInventorySlots < MAX_INVENTORY_SLOTS) {
          const newSlots = Math.min(MAX_INVENTORY_SLOTS, updatedToChar.maxInventorySlots + item.effect.value);
          updatedToChar = { ...updatedToChar, maxInventorySlots: newSlots, inventory: updatedToChar.inventory.filter(i => i.uid !== itemUid) };
          logMsg += ` 🧳 ${toChar.name} usa ${item.name}! Inventario: ${updatedToChar.maxInventorySlots - item.effect.value} → ${newSlots} slot.`;
          updatedParty = state.party.map(p => {
            if (p.id === fromCharacterId) return updatedFromChar;
            if (p.id === toCharacterId) return updatedToChar;
            return p;
          });
        }
      }

      return {
        party: updatedParty,
        messageLog: [...state.messageLog, logMsg],
      };
    });

    return transferred;
  },

  startBossFight: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    if (!location.bossId) return;

    const diff = getDifficultyConfig(state.difficulty, state.partySize);
    const boss = createEnemyInstance(location.bossId, diff.statMult);
    const allActors = [
      ...state.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
      { id: boss.id, spd: boss.spd, type: 'enemy' as const },
    ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);

    const firstActor = allActors[0];

    set({
      phase: 'combat',
      enemies: [boss],
      autoCombat: false,
      combat: {
        turn: 1,
        playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
        enemyOrder: [boss.id],
        fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
        currentActorId: firstActor.id,
        currentActorType: firstActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        isProcessing: false,
        log: [
          { turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Boss Fight', message: `⭐ BOSS: ${boss.name} appare! ${boss.description}` },
        ],
        isVictory: false,
        isDefeat: false,
        fled: false,
        statusDurations: {},
        specialCooldowns: {},
        special2Cooldowns: {},
        tauntTargetId: null,
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] ⭐ BOSS: ${boss.name} blocca la via!`],
    });

    // If boss goes first, trigger their action
    if (firstActor.type === 'enemy') {
      setTimeout(() => get().advanceToNextActor(), 1200);
    }
  },

  // ==========================================
  // COMBAT
  // ==========================================
  selectCombatAction: (action: CombatAction) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    if (action === 'defend') {
      // Execute defend immediately
      const character = state.party.find(p => p.id === state.combat!.currentActorId)!;
      const result = executePlayerDefend(character, state.combat.turn);
      
      const updatedParty = state.party.map(p =>
        p.id === character.id ? result.updatedCharacter! : p
      );

      const newLog = [...state.combat.log, result.log];

      // Move to next actor
      get().advanceToNextActor({
        ...state.combat,
        log: newLog,
        party: updatedParty,
      });
      return;
    }

    if (action === 'flee') {
      const canFlee = calculateFleeChance(state.party, state.enemies);
      if (canFlee) {
        set({
          phase: 'exploration',
          combat: null,
          enemies: [],
          messageLog: [...state.messageLog, `[${state.turnCount}] 🏃 Fuga riuscita!`],
        });
        return;
      } else {
        const newLog = [...state.combat.log, {
          turn: state.combat.turn,
          actorName: 'Sistema',
          actorType: 'player' as const,
          action: 'Fuga',
          message: 'Tentativo di fuga fallito!',
        }];
        // Move to next actor (skip to enemies)
        get().advanceToNextActor({
          ...state.combat,
          log: newLog,
        });
        return;
      }
    }

    set({
      combat: { ...state.combat, selectedAction: action, selectedTarget: null, selectedItemUid: null },
    });
  },

  selectCombatTarget: (targetId: string) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    set({ combat: { ...state.combat, selectedTarget: targetId } });
  },

  selectCombatItem: (itemUid: string) => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player') return;

    set({ combat: { ...state.combat, selectedItemUid: itemUid } });
  },

  executeCombatTurn: () => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player' || !state.combat.selectedAction) return;

    const character = state.party.find(p => p.id === state.combat!.currentActorId)!;
    let updatedParty = [...state.party];
    let updatedEnemies = [...state.enemies];
    let newLog = [...state.combat.log];
    let newPhase: GamePhase | null = null;
    let updatedCooldowns: Record<string, number> = { ...(state.combat.specialCooldowns || {}) };
    let updatedCooldowns2: Record<string, number> = { ...(state.combat.special2Cooldowns || {}) };
    let tauntTargetId: string | null = state.combat.tauntTargetId || null;
    let updatedCombatStatusDurations: Record<string, StatusDuration[]> = { ...(state.combat.statusDurations || {}) };

    switch (state.combat.selectedAction) {
      case 'attack': {
        if (!state.combat.selectedTarget) return;
        const enemy = updatedEnemies.find(e => e.id === state.combat!.selectedTarget)!;
        const result = executePlayerAttack(character, enemy, state.combat.turn);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        // Consume ammo if ranged attack was used
        if (result.consumedAmmoUid) {
          updatedParty = updatedParty.map(p => {
            if (p.id === character.id) {
              return {
                ...p,
                inventory: p.inventory.map(item => {
                  if (item.uid === result.consumedAmmoUid) {
                    const newQty = item.quantity - 1;
                    if (newQty <= 0) return null; // remove item
                    return { ...item, quantity: newQty };
                  }
                  return item;
                }).filter((item): item is typeof item => item !== null),
              };
            }
            return p;
          });
        }
        break;
      }
      case 'special': {
        if (!state.combat.selectedTarget) return;
        // Healer targets allies; Tank/DPS target enemies
        let target;
        if (character.archetype === 'healer') {
          target = updatedParty.find(p => p.id === state.combat!.selectedTarget) || character;
        } else {
          target = updatedEnemies.find(e => e.id === state.combat!.selectedTarget) || updatedEnemies[0];
        }
        const result = executePlayerSpecial(character, target, state.combat.turn, updatedParty, updatedEnemies);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
        }
        // Track status durations on enemies after applying specials (poison, bleed, stun)
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: 3 },
              ];
            }
          }
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        // Handle applied buff (e.g., Adrenalina)
        if (result.appliedBuff) {
          const existing = updatedCombatStatusDurations[result.appliedBuff.targetId] || [];
          if (!existing.some(d => d.effect === result.appliedBuff!.effect)) {
            updatedCombatStatusDurations[result.appliedBuff.targetId] = [
              ...existing,
              { effect: result.appliedBuff.effect, turnsLeft: result.appliedBuff.duration },
            ];
          }
        }
        // Set 2-turn cooldown for special
        updatedCooldowns[character.id] = 2;
        break;
      }
      case 'special2': {
        if (!state.combat.selectedTarget) return;
        // Tank: no target needed (self-buff/taunt), but still accept click on self
        // Healer: no target needed (group heal), accept click on self
        // DPS: needs enemy target
        let target;
        if (character.archetype === 'dps') {
          target = updatedEnemies.find(e => e.id === state.combat!.selectedTarget) || updatedEnemies[0];
        } else {
          target = updatedParty.find(p => p.id === state.combat!.selectedTarget) || character;
        }
        const result = executePlayerSpecial2(character, target, state.combat.turn, updatedParty, updatedEnemies);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedEnemies) {
          updatedEnemies = result.updatedEnemies;
        }
        // Track status durations on enemies after applying specials (poison, bleed, stun)
        for (const e of updatedEnemies) {
          const prevEnemy = state.enemies.find(pe => pe.id === e.id);
          if (!prevEnemy) continue;
          const newEffects = e.statusEffects.filter(s => !prevEnemy.statusEffects.includes(s) && s !== 'none');
          for (const effect of newEffects) {
            if (!updatedCombatStatusDurations[e.id]?.some(d => d.effect === effect)) {
              const existing = updatedCombatStatusDurations[e.id] || [];
              updatedCombatStatusDurations[e.id] = [
                ...existing,
                { effect: effect as StatusEffect, turnsLeft: 3 },
              ];
            }
          }
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          updatedParty = result.updatedParty;
        }
        // Set taunt if tank used Immolation
        if (result.tauntTargetId) {
          tauntTargetId = result.tauntTargetId;
        }
        // Handle applied buff (e.g., Adrenalina)
        if (result.appliedBuff) {
          const existing = updatedCombatStatusDurations[result.appliedBuff.targetId] || [];
          if (!existing.some(d => d.effect === result.appliedBuff!.effect)) {
            updatedCombatStatusDurations[result.appliedBuff.targetId] = [
              ...existing,
              { effect: result.appliedBuff.effect, turnsLeft: result.appliedBuff.duration },
            ];
          }
        }
        // Set 3-turn cooldown for special2
        updatedCooldowns2[character.id] = 3;
        break;
      }
      case 'use_item': {
        if (!state.combat.selectedItemUid || !state.combat.selectedTarget) return;
        const item = character.inventory.find(i => i.uid === state.combat!.selectedItemUid);
        if (!item) return;
        
        // Rocket launcher: kill_all targets all enemies
        if (item.effect?.type === 'kill_all') {
          const result = executeUseItem(character, item, character, updatedParty, state.combat.turn);
          newLog.push(result.log);
          // Kill ALL enemies instantly
          updatedEnemies = updatedEnemies.map(e => ({ ...e, currentHp: 0, isDefending: false }));
          // Consume the item
          if (result.consumeItem) {
            const consumedUid = state.combat!.selectedItemUid;
            updatedParty = updatedParty.map(p => {
              if (p.id === character.id) {
                return {
                  ...p,
                  inventory: p.inventory
                    .map(i => {
                      if (i.uid !== consumedUid) return { ...i };
                      const newQty = i.quantity - 1;
                      if (newQty <= 0) return null;
                      return { ...i, quantity: newQty };
                    })
                    .filter((i): i is NonNullable<typeof i> => i !== null),
                };
              }
              return p;
            });
          }
          break;
        }
        
        let healTarget: Character;
        if (item.effect?.target === 'one_ally') {
          healTarget = updatedParty.find(p => p.id === state.combat!.selectedTarget) || character;
        } else if (item.effect?.target === 'all_allies') {
          healTarget = character;
        } else {
          healTarget = character;
        }
        
        const result = executeUseItem(character, item, healTarget, updatedParty, state.combat.turn);
        newLog.push(result.log);
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
        }
        if (result.updatedParty) {
          updatedParty = result.updatedParty;
        }
        if (result.consumeItem) {
          const consumedUid = state.combat!.selectedItemUid;
          updatedParty = updatedParty.map(p => {
            if (p.id === character.id) {
              return {
                ...p,
                inventory: p.inventory
                  .map(i => {
                    if (i.uid !== consumedUid) return { ...i };
                    const newQty = i.quantity - 1;
                    if (newQty <= 0) return null;
                    return { ...i, quantity: newQty };
                  })
                  .filter((i): i is NonNullable<typeof i> => i !== null),
              };
            }
            return p;
          });
        }
        // Clean statusDurations for cured statuses
        if (result.curedStatuses && result.curedStatuses.length > 0) {
          const curedSet = new Set(result.curedStatuses);
          const targetId = healTarget?.id || character.id;
          if (result.updatedParty) {
            // all_allies cure: clean all party members
            for (const charId of Object.keys(updatedCombatStatusDurations)) {
              const filtered = updatedCombatStatusDurations[charId].filter(d => !curedSet.has(d.effect));
              if (filtered.length > 0) {
                updatedCombatStatusDurations[charId] = filtered;
              } else {
                delete updatedCombatStatusDurations[charId];
              }
            }
          } else if (updatedCombatStatusDurations[targetId]) {
            const filtered = updatedCombatStatusDurations[targetId].filter(d => !curedSet.has(d.effect));
            if (filtered.length > 0) {
              updatedCombatStatusDurations[targetId] = filtered;
            } else {
              delete updatedCombatStatusDurations[targetId];
            }
          }
        }
        break;
      }
    }

    // ── BOSS PHASE TRANSITION CHECK ──
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i];
      if (!enemy.isBoss || enemy.currentHp <= 0) continue;
      const phases = BOSS_PHASES[enemy.definitionId];
      if (!phases || enemy.currentPhase >= phases.length) continue;

      const phaseDef = phases[enemy.currentPhase];
      const hpPercent = enemy.currentHp / enemy.maxHp;

      if (hpPercent <= phaseDef.hpThreshold) {
        // Transition to next phase!
        const newPhase = enemy.currentPhase + 1;
        enemy.currentPhase = newPhase;
        enemy.isPhaseTransitioning = true;

        // Apply stat multipliers from this phase
        enemy.maxHp = Math.round(enemy.maxHp * phaseDef.hpMultiplier);
        enemy.currentHp = Math.max(enemy.currentHp, Math.round(enemy.maxHp * phaseDef.hpThreshold * 0.5));
        enemy.atk = Math.round(enemy.atk * phaseDef.atkMultiplier);
        enemy.def = Math.round(enemy.def * phaseDef.defMultiplier);
        enemy.spd = Math.round(enemy.spd * phaseDef.spdMultiplier);

        // Add new abilities if phase defines them
        if (phaseDef.newAbilities) {
          enemy.abilities = [...enemy.abilities, ...phaseDef.newAbilities];
        }

        newLog.push({
          turn: state.combat.turn,
          actorName: enemy.name,
          actorType: 'enemy',
          action: `Fase ${newPhase}: ${phaseDef.name}`,
          message: phaseDef.message,
        });

        // Reset phase transitioning flag after visual delay (handled in UI)
        setTimeout(() => {
          set(state => ({
            enemies: state.enemies.map(e => e.id === enemy.id ? { ...e, isPhaseTransitioning: false } : e),
          }));
        }, 2000);
      }
    }

    // Check if all enemies are dead
    if (updatedEnemies.every(e => e.currentHp <= 0)) {
      newPhase = 'exploration';
      
      // Get difficulty config for loot/EXP multipliers
      const lootDiff = getDifficultyConfig(state.difficulty, state.partySize);

      // Generate loot (with difficulty multiplier)
      const allLoot: string[] = [];
      for (const enemy of updatedEnemies) {
        allLoot.push(...generateLoot(enemy.definitionId, lootDiff.lootMult));
      }

      // Filter out collectibles from combat loot (they are exploration-only)
      const combatLoot = allLoot.filter(id => {
        const def = ITEMS[id];
        return !def || def.type !== 'collectible';
      });

      // Distribute loot (auto-merge stacks of same item)
      const lostLoot: string[] = [];
      for (const itemId of combatLoot) {
        const itemDef = ITEMS[itemId];
        if (!itemDef) continue;
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (added) return p;
          // Try to add to existing stack first
          const existingIdx = p.inventory.findIndex(i => i.itemId === itemId);
          if (existingIdx >= 0) {
            added = true;
            const updatedInv = [...p.inventory];
            updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + 1 };
            return { ...p, inventory: updatedInv };
          }
          // No existing stack, add as new entry
          if (p.inventory.length < p.maxInventorySlots) {
            added = true;
            const newItem: ItemInstance = {
              uid: `${itemId}_${Date.now()}_${Math.random()}`,
              itemId,
              name: itemDef.name,
              description: itemDef.description,
              type: itemDef.type,
              rarity: itemDef.rarity,
              icon: itemDef.icon,
              usable: itemDef.usable,
              equippable: itemDef.equippable,
              effect: itemDef.effect,
              quantity: 1,
            };
            return { ...p, inventory: [...p.inventory, newItem] };
          }
          return p;
        });
        if (!added) {
          lostLoot.push(itemDef.name);
        }
      }

      // Award EXP (with difficulty multiplier)
      const rawExp = updatedEnemies.reduce((sum, e) => sum + ENEMIES[e.definitionId].expReward, 0);
      const totalExp = Math.round(rawExp * lootDiff.expMult);
      const levelUpMessages: string[] = [];
      for (const char of updatedParty) {
        if (char.currentHp > 0) {
          const result = addExp(char, totalExp);
          updatedParty = updatedParty.map(p => p.id === result.updated.id ? result.updated : p);
          if (result.leveledUp) {
            // Play level up sound (#36)
            try { playLevelUp(); } catch {}
            levelUpMessages.push(`⬆️ ${result.updated.name} sale al livello ${result.updated.level}!`);
          }
        }
      }

      const lootNames = combatLoot.map(id => ITEMS[id]?.name).filter(Boolean);
      let victoryMsg = `⚔️ Sei sopravvissuto allo scontro. +${totalExp} EXP.`;
      if (lostLoot.length > 0) {
        victoryMsg += ` ⚠️ Inventario pieno! Persi: ${lostLoot.join(', ')}`;
      }

      newLog.push({
        turn: state.combat.turn,
        actorName: 'Sistema',
        actorType: 'player',
        action: 'Sopravvissuto',
        message: victoryMsg,
      });

      // Check if this was a boss fight (victory condition)
      // Update bestiary - mark defeated enemies
      const victoryBestiary = [...state.bestiary];
      const defeatedEnemyIds: string[] = [];
      for (const enemy of updatedEnemies) {
        if (enemy.currentHp <= 0) {
          defeatedEnemyIds.push(enemy.definitionId);
          const existing = victoryBestiary.find(b => b.enemyId === enemy.definitionId);
          if (!existing) {
            victoryBestiary.push({ enemyId: enemy.definitionId, encountered: true, defeated: true, timesDefeated: 1, firstDefeatTimestamp: Date.now() });
          } else {
            existing.defeated = true;
            existing.timesDefeated += 1;
            if (!existing.firstDefeatTimestamp) existing.firstDefeatTimestamp = Date.now();
          }
        }
      }

      // Update NPC kill quest progress
      let updatedNpcQuestProgress = { ...state.npcQuestProgress };
      const questLogMsgs: string[] = [];

      // ── NEMESIS PERSISTENT: if Nemesis is defeated, set pursuit level to 5 ──
      let newNemesisPursuitLevel = state.nemesisPursuitLevel;
      if (defeatedEnemyIds.includes('nemesis_boss') && state.nemesisPursuitLevel < 5) {
        newNemesisPursuitLevel = 5;
        questLogMsgs.push(`[${state.turnCount}] 💀 NEMESIS è stato eliminato definitivamente! L'inseguimento è finito.`);
      }

      for (const enemyId of defeatedEnemyIds) {
        for (const npc of Object.values(NPCS)) {
          if (npc.quest?.type === 'kill' && npc.quest.targetId === enemyId) {
            const qp = { ...(updatedNpcQuestProgress[npc.quest.id] || { currentCount: 0, completed: false }) };
            if (!qp.completed) {
              qp.currentCount += 1;
              if (qp.currentCount >= npc.quest.targetCount) {
                qp.completed = true;
                questLogMsgs.push(`[${state.turnCount}] 📋 Missione completata: ${npc.quest.name}!`);
                if (npc.quest.rewardItems) {
                  for (const reward of npc.quest.rewardItems) {
                    const rewardDef = ITEMS[reward.itemId];
                    if (!rewardDef) continue;
                    const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
                    updatedParty = result.party;
                    if (result.added) questLogMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
                  }
                }
              }
              updatedNpcQuestProgress[npc.quest.id] = qp;
            }
          }
        }
      }

      if (updatedEnemies.some(e => e.isBoss)) {
        // Play victory sound for boss kill (#36)
        try { playVictory(); } catch {}

        set({
          notification: {
            id: `notif_${++notifId}`,
            type: 'victory',
            message: 'EVASIONE COMPLETATA',
            icon: '🚪',
            subMessage: `Boss eliminato. +${totalExp} EXP`,
            lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
            levelUps: levelUpMessages,
          },
          combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
          party: updatedParty,
          enemies: updatedEnemies,
          messageLog: [
            ...state.messageLog,
            `[${state.turnCount}] ⚔️ Boss eliminato. Sei sopravvissuto. +${totalExp} EXP`,
            ...levelUpMessages,
            ...questLogMsgs,
          ],
          bestiary: victoryBestiary,
          npcQuestProgress: updatedNpcQuestProgress,
          nemesisPursuitLevel: newNemesisPursuitLevel,
        });
        setTimeout(() => {
          set({ phase: 'victory', combat: null, enemies: [], notification: null });
          setTimeout(() => get().checkAchievements(), 100);
        }, 3500);
        return;
      }

      // Play victory sound for regular combat (#36)
      try { playVictory(); } catch {}

      set({
        notification: {
          id: `notif_${++notifId}`,
          type: 'victory',
          message: 'SOPRAVVVISSUTO',
          icon: '⚔️',
          subMessage: `Sei sopravvissuto allo scontro. +${totalExp} EXP`,
          lootNames: combatLoot.map(id => ITEMS[id]?.name).filter(Boolean),
          levelUps: levelUpMessages,
        },
        combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
        party: updatedParty,
        enemies: updatedEnemies,
        messageLog: [
          ...state.messageLog,
          `[${state.turnCount}] ⚔️ Sei sopravvissuto allo scontro. +${totalExp} EXP`,
          ...levelUpMessages,
          ...questLogMsgs,
        ],
        bestiary: victoryBestiary,
        npcQuestProgress: updatedNpcQuestProgress,
        nemesisPursuitLevel: newNemesisPursuitLevel,
      });
      setTimeout(() => {
        set({ phase: 'exploration', combat: null, enemies: [], notification: null });
        setTimeout(() => get().checkAchievements(), 100);
      }, 3500);
      return;
    }

    // Check if all party members are dead
    if (updatedParty.every(p => p.currentHp <= 0)) {
      // Play defeat sound (#36)
      try { playDefeat(); } catch {}

      set({
        notification: {
          id: `notif_${++notifId}`,
          type: 'defeat',
          message: 'SCONFITTA...',
          icon: '💀',
          subMessage: 'Il gruppo è stato eliminato',
        },
        combat: { ...state.combat, log: newLog, isDefeat: true, isProcessing: true },
        party: updatedParty,
        messageLog: [...state.messageLog, `[${state.turnCount}] 💀 Tutti i membri del gruppo sono caduti...`],
      });
      setTimeout(() => {
        set({ phase: 'game-over', combat: null, enemies: [], notification: null });
      }, 3500);
      return;
    }

    // Advance to next actor
    get().advanceToNextActor({
      ...state.combat,
      log: newLog,
      party: updatedParty,
      enemies: updatedEnemies,
      specialCooldowns: updatedCooldowns,
      special2Cooldowns: updatedCooldowns2,
      tauntTargetId,
      statusDurations: updatedCombatStatusDurations,
    });
  },

  toggleAutoCombat: () => {
    set(state => ({ autoCombat: !state.autoCombat }));
  },

  executeAutoCombatTurn: () => {
    const state = get();
    if (!state.combat || state.combat.currentActorType !== 'player' || state.combat.isVictory || state.combat.isDefeat) return;

    const character = state.party.find(p => p.id === state.combat!.currentActorId);
    if (!character || character.currentHp <= 0) return;

    const aliveEnemies = state.enemies.filter(e => e.currentHp > 0);
    const aliveParty = state.party.filter(p => p.currentHp > 0);
    if (aliveEnemies.length === 0 || aliveParty.length === 0) return;

    const specialCd = state.combat.specialCooldowns?.[character.id] ?? 0;
    const special2Cd = state.combat.special2Cooldowns?.[character.id] ?? 0;

    // ── AI Decision Logic ──
    // 1. Healer: group heal if multiple wounded + special2 available
    if (character.archetype === 'healer') {
      const woundedCount = aliveParty.filter(p => p.currentHp < p.maxHp * 0.6).length;
      if (woundedCount >= 2 && special2Cd === 0) {
        get().selectCombatAction('special2');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      // Heal single wounded ally if special available
      const wounded = aliveParty.find(p => p.currentHp < p.maxHp * 0.5);
      if (wounded && specialCd === 0) {
        get().selectCombatAction('special');
        get().selectCombatTarget(wounded.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      // Otherwise attack weakest enemy
      const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
      get().selectCombatAction('attack');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), 600);
      return;
    }

    // 2. Tank: use Immolation (special2) if multiple enemies and available
    if (character.archetype === 'tank') {
      if (special2Cd === 0 && aliveEnemies.length >= 2) {
        get().selectCombatAction('special2');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      // Barricata if available and HP < 70%
      if (specialCd === 0 && character.currentHp < character.maxHp * 0.7) {
        get().selectCombatAction('special');
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      // Defend if HP low and specials on cooldown
      if (character.currentHp < character.maxHp * 0.3) {
        get().selectCombatAction('defend');
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
    }

    // 3. Control: use Gas Venefico (special2) if multiple enemies alive, Cristalli Sonici (special) if available
    if (character.archetype === 'control') {
      if (special2Cd === 0 && aliveEnemies.length >= 2) {
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('special2');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      if (specialCd === 0) {
        const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
        get().selectCombatAction('special');
        get().selectCombatTarget(weakest.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
    }

    // 4. DPS: use Raffica (special2) if multiple enemies alive + available
    if (character.archetype === 'dps' && special2Cd === 0 && aliveEnemies.length >= 2) {
      const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
      get().selectCombatAction('special2');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), 600);
      return;
    }
    // DPS: use Colpo Mortale if available and only 1 enemy or boss
    if (character.archetype === 'dps' && specialCd === 0) {
      const weakest = aliveEnemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
      get().selectCombatAction('special');
      get().selectCombatTarget(weakest.id);
      setTimeout(() => get().executeCombatTurn(), 600);
      return;
    }

    // 4. All archetypes: use healing item if HP < 40%
    if (character.currentHp < character.maxHp * 0.4) {
      const healItem = character.inventory.find(i => i.usable && i.effect?.type === 'heal' && i.itemId !== 'herb_red');
      if (healItem) {
        get().selectCombatAction('use_item');
        get().selectCombatItem(healItem.uid);
        const target = healItem.effect?.target === 'one_ally'
          ? aliveParty.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b)
          : character;
        get().selectCombatTarget(target.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
      const mixedHerb = character.inventory.find(i => i.itemId === 'herb_mixed');
      if (mixedHerb) {
        get().selectCombatAction('use_item');
        get().selectCombatItem(mixedHerb.uid);
        get().selectCombatTarget(character.id);
        setTimeout(() => get().executeCombatTurn(), 600);
        return;
      }
    }

    // 5. Default: attack — target lowest HP% enemy
    const weakest = aliveEnemies.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
    get().selectCombatAction('attack');
    get().selectCombatTarget(weakest.id);
    setTimeout(() => get().executeCombatTurn(), 600);
  },

  advanceToNextActor: (combatState: GameStore['combat'] & { party?: Character[]; enemies?: EnemyInstance[] }) => {
    const state = get();
    const combat = combatState || state.combat;
    if (!combat) return;

    const party = combatState?.party || state.party;
    const enemies = combatState?.enemies || state.enemies;
    const statusDurations = combat.statusDurations || {};

    // Build alive actor set for quick lookup
    const alivePartyIds = new Set(party.filter(p => p.currentHp > 0).map(p => p.id));
    const aliveEnemyIds = new Set(enemies.filter(e => e.currentHp > 0).map(e => e.id));

    // Use stable turn order from combat state, filter out dead actors
    const allActors = (combat.fullTurnOrder || []).filter(a =>
      (a.type === 'player' && alivePartyIds.has(a.id)) ||
      (a.type === 'enemy' && aliveEnemyIds.has(a.id))
    );

    // Safety: if no actors alive, bail
    if (allActors.length === 0) return;

    const currentIdx = allActors.findIndex(a => a.id === combat.currentActorId);
    let nextIdx: number;
    let isNewTurn: boolean;

    if (currentIdx === -1) {
      // Current actor is dead or not in order — start from beginning (new turn)
      nextIdx = 0;
      isNewTurn = true;
    } else {
      nextIdx = (currentIdx + 1) % allActors.length;
      isNewTurn = nextIdx === 0;
    }

    let newTurn = isNewTurn ? combat.turn + 1 : combat.turn;

    // Decrement special cooldowns at new turn
    const statusLogEntries: CombatLogEntry[] = [];
    let updatedCooldowns: Record<string, number> = { ...(combat.specialCooldowns || {}) };
    let updatedCooldowns2: Record<string, number> = { ...(combat.special2Cooldowns || {}) };
    // Clear taunt at new turn (immolation lasts 1 turn)
    let tauntTargetId = combat.tauntTargetId;
    if (isNewTurn) {
      tauntTargetId = null;
    }
    if (isNewTurn) {
      const decrementedCooldowns: Record<string, number> = {};
      for (const [charId, turnsLeft] of Object.entries(updatedCooldowns)) {
        const newCooldown = turnsLeft - 1;
        if (newCooldown > 0) {
          decrementedCooldowns[charId] = newCooldown;
        } else {
          // Cooldown expired — notify
          const charName = party.find(p => p.id === charId)?.name || charId;
          statusLogEntries.push({ turn: newTurn, actorName: 'Sistema', actorType: 'player', action: 'Cooldown', message: `✅ ${charName}: Speciale pronta!` });
        }
      }
      updatedCooldowns = decrementedCooldowns;

      // Decrement special2 cooldowns
      const decrementedCooldowns2: Record<string, number> = {};
      for (const [charId, turnsLeft] of Object.entries(updatedCooldowns2)) {
        const newCooldown = turnsLeft - 1;
        if (newCooldown > 0) {
          decrementedCooldowns2[charId] = newCooldown;
        } else {
          const charName = party.find(p => p.id === charId)?.name || charId;
          statusLogEntries.push({ turn: newTurn, actorName: 'Sistema', actorType: 'player', action: 'Cooldown', message: `✅ ${charName}: Speciale 2 pronta!` });
        }
      }
      updatedCooldowns2 = decrementedCooldowns2;
    }

    const nextActor = allActors[nextIdx];

    // Process status effects at new turn start
    let updatedParty = party.map(p => ({ ...p, isDefending: false }));
    let updatedStatusDurations: Record<string, StatusDuration[]> = JSON.parse(JSON.stringify(statusDurations));

    if (isNewTurn) {
      for (const p of updatedParty) {
        const charDurations = updatedStatusDurations[p.id] || [];
        let hp = p.currentHp;
        const remainingDurations: StatusDuration[] = [];

        for (const sd of charDurations) {
          if (sd.effect === 'poison') {
            const poisonDmg = Math.max(1, Math.floor(p.maxHp * 0.06));
            hp = Math.max(0, hp - poisonDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Avvelenamento',
              damage: poisonDmg,
              message: `🟢 ${p.name} soffre di avvelenamento! -${poisonDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'bleeding') {
            const bleedDmg = Math.max(1, Math.floor(p.maxHp * 0.04));
            hp = Math.max(0, hp - bleedDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Sanguinamento',
              damage: bleedDmg,
              message: `🩸 ${p.name} perde sangue! -${bleedDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'adrenaline') {
            statusLogEntries.push({
              turn: newTurn,
              actorName: p.name,
              actorType: 'player',
              action: 'Adrenalina',
              message: `💉 ${p.name} è sotto adrenalina! +25% danni (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          // Decrement turns; keep only effects that still have turns left
          const newTurnsLeft = sd.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingDurations.push({ effect: sd.effect, turnsLeft: newTurnsLeft });
          } else {
            // Effect expired — remove from character's statusEffects
            const effectLabel = sd.effect === 'poison' ? 'avvelenamento' : sd.effect === 'bleeding' ? 'sanguinamento' : sd.effect === 'adrenaline' ? 'adrenalina' : sd.effect;
            const emoji = sd.effect === 'adrenaline' ? '💉' : '✨';
            const verb = sd.effect === 'adrenaline' ? "L'effetto di" : 'si è ripreso da';
            statusLogEntries.push({
              turn: newTurn,
              actorName: 'Sistema',
              actorType: 'player',
              action: 'Recupero',
              message: `${emoji} ${verb} ${effectLabel} è terminato per ${p.name}!`,
            });
          }
        }

        updatedParty = updatedParty.map(ch =>
          ch.id === p.id
            ? {
                ...ch,
                currentHp: hp,
                statusEffects: remainingDurations.map(rd => rd.effect),
              }
            : ch
        );

        if (remainingDurations.length > 0) {
          updatedStatusDurations[p.id] = remainingDurations;
        } else {
          delete updatedStatusDurations[p.id];
        }
      }
    }

    // Process status effects on ENEMIES at new turn start (DOT for poison/bleeding)
    let updatedEnemiesForStatus = [...enemies];
    if (isNewTurn) {
      for (const enemy of updatedEnemiesForStatus) {
        if (enemy.currentHp <= 0) continue;
        const enemyDurations = updatedStatusDurations[enemy.id] || [];
        if (enemyDurations.length === 0 && !enemy.statusEffects.includes('poison') && !enemy.statusEffects.includes('bleeding')) continue;

        let hp = enemy.currentHp;
        const remainingDurations: StatusDuration[] = [];

        for (const sd of enemyDurations) {
          if (sd.effect === 'poison') {
            const poisonDmg = Math.max(1, Math.floor(enemy.maxHp * 0.06));
            hp = Math.max(0, hp - poisonDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Avvelenamento',
              damage: poisonDmg,
              message: `🟢 ${enemy.name} è avvelenato! -${poisonDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'bleeding') {
            const bleedDmg = Math.max(1, Math.floor(enemy.maxHp * 0.04));
            hp = Math.max(0, hp - bleedDmg);
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Sanguinamento',
              damage: bleedDmg,
              message: `🩸 ${enemy.name} sanguina! -${bleedDmg} HP (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          if (sd.effect === 'stunned') {
            // Stun tick message (actual skip is handled when enemy's turn arrives)
            statusLogEntries.push({
              turn: newTurn,
              actorName: enemy.name,
              actorType: 'enemy',
              action: 'Stordito',
              message: `💫 ${enemy.name} è stordito! (${sd.turnsLeft - 1} turni rimasti)`,
            });
          }
          // Decrement turns; keep only effects that still have turns left
          const newTurnsLeft = sd.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingDurations.push({ effect: sd.effect, turnsLeft: newTurnsLeft });
          } else {
            // Effect expired — remove from enemy's statusEffects
            const effectLabel = sd.effect === 'poison' ? 'avvelenamento' : sd.effect === 'bleeding' ? 'sanguinamento' : sd.effect === 'stunned' ? 'stordimento' : sd.effect;
            statusLogEntries.push({
              turn: newTurn,
              actorName: 'Sistema',
              actorType: 'enemy',
              action: 'Recupero',
              message: `✨ ${enemy.name} si è ripreso da ${effectLabel}!`,
            });
          }
        }

        updatedEnemiesForStatus = updatedEnemiesForStatus.map(e =>
          e.id === enemy.id
            ? {
                ...e,
                currentHp: hp,
                statusEffects: remainingDurations.map(rd => rd.effect),
              }
            : e
        );

        if (remainingDurations.length > 0) {
          updatedStatusDurations[enemy.id] = remainingDurations;
        } else {
          delete updatedStatusDurations[enemy.id];
        }
      }

      // Check if any enemy died from DOT — log victory
      if (updatedEnemiesForStatus.some(e => e.currentHp <= 0)) {
        // Update aliveEnemyIds for the turn order check below
        for (const e of updatedEnemiesForStatus) {
          if (e.currentHp <= 0) aliveEnemyIds.delete(e.id);
        }
      }
    }

    const newLog = isNewTurn
      ? [
          ...combat.log,
          { turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'Turno', message: `--- Turno ${newTurn} ---` },
          ...statusLogEntries,
        ]
      : combat.log;

    // If next actor is enemy, execute AI
    if (nextActor.type === 'enemy') {
      const enemy = updatedEnemiesForStatus.find(e => e.id === nextActor.id)!;

      // Check if enemy is stunned — skip turn and decrement stun duration
      if (enemy.statusEffects.includes('stunned')) {
        const enemyStunDurations = updatedStatusDurations[enemy.id] || [];
        const stunEntry = enemyStunDurations.find(d => d.effect === 'stunned');

        // Decrement stun duration; remove only when fully expired
        let newEnemyStatusEffects = [...enemy.statusEffects];
        if (!stunEntry || stunEntry.turnsLeft <= 1) {
          // Stun expired — remove it
          newEnemyStatusEffects = newEnemyStatusEffects.filter(s => s !== 'stunned');
          if (updatedStatusDurations[enemy.id]) {
            updatedStatusDurations[enemy.id] = updatedStatusDurations[enemy.id].filter(d => d.effect !== 'stunned');
            if (updatedStatusDurations[enemy.id].length === 0) delete updatedStatusDurations[enemy.id];
          }
        } else {
          // Decrement stun turns left
          updatedStatusDurations[enemy.id] = enemyStunDurations.map(d =>
            d.effect === 'stunned' ? { ...d, turnsLeft: d.turnsLeft - 1 } : d
          );
        }

        const stunUpdatedEnemies = updatedEnemiesForStatus.map(e =>
          e.id === enemy.id ? { ...e, statusEffects: newEnemyStatusEffects } : e
        );
        const stunLog: CombatLogEntry = {
          turn: newTurn,
          actorName: enemy.name,
          actorType: 'enemy',
          action: 'Stordito',
          message: `💫 ${enemy.name} è stordito e salta il turno!`,
        };

        // Find next actor after this stunned enemy
        let stunNextIdx = nextIdx + 1;
        while (stunNextIdx < allActors.length) {
          const candidate = allActors[stunNextIdx];
          if (candidate.type === 'enemy' && !aliveEnemyIds.has(candidate.id)) { stunNextIdx++; continue; }
          if (candidate.type === 'player' && !alivePartyIds.has(candidate.id)) { stunNextIdx++; continue; }
          break;
        }
        if (stunNextIdx >= allActors.length) stunNextIdx = 0;
        const stunNextActor = allActors[stunNextIdx];
        let stunNextTurn = newTurn;
        if (stunNextIdx === 0) stunNextTurn = newTurn + 1;

        set({
          enemies: stunUpdatedEnemies,
          combat: {
            ...combat,
            turn: stunNextTurn,
            currentActorId: stunNextActor.id,
            currentActorType: stunNextActor.type,
            selectedAction: null,
            selectedTarget: null,
            selectedItemUid: null,
            log: [...newLog, stunLog],
            statusDurations: updatedStatusDurations,
            specialCooldowns: updatedCooldowns,
            special2Cooldowns: updatedCooldowns2,
            tauntTargetId,
          },
        });

        // If next is also enemy, chain
        if (stunNextActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 900);
        }
        return;
      }

      const { log, updatedParty: afterEnemyAttack, appliedStatus } = executeEnemyAttack(enemy, updatedParty, newTurn, tauntTargetId);

      // Record applied status duration
      if (appliedStatus) {
        const existing = updatedStatusDurations[appliedStatus.targetId] || [];
        if (!existing.some(d => d.effect === appliedStatus.effect)) {
          updatedStatusDurations[appliedStatus.targetId] = [
            ...existing,
            { effect: appliedStatus.effect, turnsLeft: appliedStatus.duration },
          ];
        }
      }

      // Check game over after enemy attack
      if (afterEnemyAttack.every(p => p.currentHp <= 0)) {
        // Play defeat sound (#36)
        try { playDefeat(); } catch {}

        set({
          phase: 'game-over',
          party: afterEnemyAttack,
          enemies: updatedEnemiesForStatus,
          messageLog: [...state.messageLog, `[${state.turnCount}] 💀 Tutti i membri del gruppo sono caduti...`],
        });
        return;
      }

      // Find next actor after this enemy (skip dead ones)
      let nextNextIdx = nextIdx + 1;
      while (nextNextIdx < allActors.length) {
        const candidate = allActors[nextNextIdx];
        if (candidate.type === 'enemy' && !aliveEnemyIds.has(candidate.id)) { nextNextIdx++; continue; }
        if (candidate.type === 'player' && !alivePartyIds.has(candidate.id)) { nextNextIdx++; continue; }
        break;
      }
      // If we reached the end, wrap to beginning (new turn)
      if (nextNextIdx >= allActors.length) nextNextIdx = 0;
      const nextNextActor = allActors[nextNextIdx];
      let nextNextTurn = newTurn;
      if (nextNextIdx === 0) nextNextTurn = newTurn + 1;

      set({
        party: afterEnemyAttack,
        enemies: updatedEnemiesForStatus,
        combat: {
          ...combat,
          turn: nextNextTurn,
          currentActorId: nextNextActor.id,
          currentActorType: nextNextActor.type,
          selectedAction: null,
          selectedTarget: null,
          selectedItemUid: null,
          log: [...newLog, log],
          statusDurations: updatedStatusDurations,
          specialCooldowns: updatedCooldowns,
          special2Cooldowns: updatedCooldowns2,
          tauntTargetId,
        },
      });

      // If next is also enemy, chain
      if (nextNextActor.type === 'enemy') {
        setTimeout(() => get().advanceToNextActor(), 900);
      }
      return;
    }

    set({
      party: updatedParty,
      enemies: updatedEnemiesForStatus,
      combat: {
        ...combat,
        turn: newTurn,
        currentActorId: nextActor.id,
        currentActorType: nextActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        log: newLog,
        statusDurations: updatedStatusDurations,
        specialCooldowns: updatedCooldowns,
        special2Cooldowns: updatedCooldowns2,
        tauntTargetId,
      },
    });
  },

  // ==========================================
  // DIFFICULTY SELECTION
  // ==========================================
  selectDifficulty: (difficulty: DifficultyLevel) => {
    set({ selectedDifficulty: difficulty });
  },

  // ==========================================
  // PUZZLE SYSTEM
  // ==========================================
  startPuzzle: (puzzle, title, description) => {
    const state = get();
    const puzzleState: PuzzleState = {
      type: puzzle.type,
      title,
      description,
      codeLength: puzzle.combinationCode?.length || 4,
      currentInput: [],
      targetCode: puzzle.combinationCode || '',
      attemptsLeft: 5,
      maxAttempts: 5,
      feedback: [],
      sequencePattern: puzzle.sequencePattern || [],
      playerSequence: [],
      isShowingPattern: true,
      currentPatternIndex: 0,
      showPhaseStep: 0,
      requiredItemIds: puzzle.requiredItemIds || (puzzle.requiredItemId ? [puzzle.requiredItemId] : []),
      successOutcome: puzzle.successOutcome,
      failMessage: puzzle.failMessage,
      isSolved: false,
      isFailed: false,
    };
    set({
      phase: 'puzzle',
      puzzleState,
      puzzleSourceLocationId: state.currentLocationId,
    });
  },

  submitCombination: (input: string[]) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination') return;

    // Validate: check each position
    const feedback: ('correct' | 'misplaced' | 'wrong')[] = [];
    const targetArr = ps.targetCode.split('');
    const inputArr = [...input];
    const targetUsed = new Set<number>();
    const inputUsed = new Set<number>();

    // First pass: correct positions
    for (let i = 0; i < inputArr.length; i++) {
      if (inputArr[i] === targetArr[i]) {
        feedback.push('correct');
        targetUsed.add(i);
        inputUsed.add(i);
      } else {
        feedback.push('wrong');
      }
    }
    // Second pass: misplaced
    for (let i = 0; i < inputArr.length; i++) {
      if (inputUsed.has(i)) continue;
      for (let j = 0; j < targetArr.length; j++) {
        if (targetUsed.has(j)) continue;
        if (inputArr[i] === targetArr[j]) {
          feedback[i] = 'misplaced';
          targetUsed.add(j);
          break;
        }
      }
    }

    const newFeedback = [...ps.feedback, feedback];
    const isSolved = feedback.every(f => f === 'correct');
    const attemptsLeft = ps.attemptsLeft - 1;
    const isFailed = attemptsLeft <= 0 && !isSolved;

    if (isSolved) {
      // Puzzle solved! Apply success outcome
      const outcome = ps.successOutcome;
      let updatedParty = [...state.party];
      const logMessages: string[] = [
        `[${state.turnCount}] 🧩 Puzzle risolto! ${ps.title}`,
        `[${state.turnCount}] 📖 ${outcome.description}`,
      ];

      if (outcome.hpChange) {
        updatedParty = updatedParty.map(p => ({
          ...p,
          currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
        }));
      }

      if (outcome.receiveItems) {
        for (const itemEntry of outcome.receiveItems) {
          const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
          updatedParty = result.party;
          if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
        }
      }

      const completedEvents = state.completedEvents.includes(state.puzzleSourceLocationId || '')
        ? state.completedEvents
        : [...state.completedEvents, state.puzzleSourceLocationId || ''];

      // Play puzzle success sound (#36)
      try { playPuzzleSuccess(); } catch {}

      set({
        phase: 'exploration',
        puzzleState: { ...ps, isSolved: true, feedback: newFeedback, attemptsLeft },
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        completedEvents,
        activeEvent: null,
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    if (isFailed) {
      // Play puzzle fail sound (#36)
      try { playPuzzleFail(); } catch {}

      set({
        puzzleState: { ...ps, isFailed: true, feedback: newFeedback, attemptsLeft: 0 },
        messageLog: [...state.messageLog, `[${state.turnCount}] 🧩 ${ps.failMessage}`],
      });
      return;
    }

    set({
      puzzleState: { ...ps, feedback: newFeedback, attemptsLeft, currentInput: [] },
    });
  },

  addDigitToCombination: (digit: string) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination' || ps.isSolved || ps.isFailed) return;
    if (ps.currentInput.length >= ps.codeLength) return;
    const newInput = [...ps.currentInput, digit];
    if (newInput.length === ps.codeLength) {
      // Auto-submit when full
      get().submitCombination(newInput);
    } else {
      set({ puzzleState: { ...ps, currentInput: newInput } });
    }
  },

  removeDigitFromCombination: () => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination' || ps.currentInput.length === 0) return;
    set({ puzzleState: { ...ps, currentInput: ps.currentInput.slice(0, -1) } });
  },

  resetCombination: () => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination') return;
    set({ puzzleState: { ...ps, currentInput: [] } });
  },

  handleSequenceInput: (direction: string) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'sequence' || ps.isShowingPattern || ps.isSolved || ps.isFailed) return;

    const newSequence = [...ps.playerSequence, direction];
    const currentIdx = newSequence.length - 1;

    if (direction !== ps.sequencePattern[currentIdx]) {
      // Wrong input — fail
      set({
        puzzleState: { ...ps, playerSequence: newSequence, isFailed: true },
        messageLog: [...state.messageLog, `[${state.turnCount}] 🧩 ${ps.failMessage}`],
      });
      return;
    }

    if (newSequence.length === ps.sequencePattern.length) {
      // All correct! Solve puzzle
      const outcome = ps.successOutcome;
      let updatedParty = [...state.party];
      const logMessages: string[] = [
        `[${state.turnCount}] 🧩 Sequenza corretta! ${ps.title}`,
        `[${state.turnCount}] 📖 ${outcome.description}`,
      ];

      if (outcome.hpChange) {
        updatedParty = updatedParty.map(p => ({
          ...p,
          currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
        }));
      }

      if (outcome.receiveItems) {
        for (const itemEntry of outcome.receiveItems) {
          const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
          updatedParty = result.party;
          if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
        }
      }

      const completedEvents = state.completedEvents.includes(state.puzzleSourceLocationId || '')
        ? state.completedEvents
        : [...state.completedEvents, state.puzzleSourceLocationId || ''];

      // Play puzzle success sound for sequence puzzle (#36)
      try { playPuzzleSuccess(); } catch {}

      set({
        phase: 'exploration',
        puzzleState: { ...ps, isSolved: true, playerSequence: newSequence },
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        completedEvents,
        activeEvent: null,
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    set({ puzzleState: { ...ps, playerSequence: newSequence } });
  },

  closePuzzle: () => {
    const state = get();
    const locId = state.puzzleSourceLocationId;
    const completedEvents = locId
      ? state.completedEvents.includes(locId)
        ? state.completedEvents
        : [...state.completedEvents, locId]
      : state.completedEvents;
    set({
      phase: 'exploration',
      puzzleState: null,
      puzzleSourceLocationId: null,
      completedEvents,
      activeEvent: null,
      skipNextEncounter: true,
    });
  },

  // ==========================================
  // QTE SYSTEM
  // ==========================================
  startQTE: (triggerSource: 'nemesis' | 'event' | 'boss') => {
    const state = get();
    const difficulty = state.difficulty;
    const sequenceCount = difficulty === 'sopravvissuto' ? 3 : difficulty === 'normale' ? 4 : 5;
    const baseTime = difficulty === 'sopravvissuto' ? 2500 : difficulty === 'normale' ? 2000 : 1400;

    const directions: Array<'up' | 'down' | 'left' | 'right' | 'space'> = ['up', 'down', 'left', 'right', 'space'];
    const sequences: Array<QTESequence> = [];
    for (let i = 0; i < sequenceCount; i++) {
      sequences.push({
        direction: directions[Math.floor(Math.random() * directions.length)],
        timeLimit: baseTime - (i * 100),
      });
    }

    const hpSave = difficulty === 'sopravvissuto' ? 30 : difficulty === 'normale' ? 20 : 10;

    let postSuccessMessage = '📊 Riesci a schivare!';
    let postFailureMessage = '💀 Non sei riuscito a schivare!';
    let postSuccessItems: { itemId: string; quantity: number }[] | undefined;
    let postFailureCombat: string[] | undefined;

    if (triggerSource === 'nemesis') {
      postSuccessMessage = '🏃 Sei riuscito a fuggire da NEMESIS! Trovi un nascondiglio sicuro.';
      postFailureMessage = '💀 NEMESIS ti colpisce! Sei ferito ma sei sopravvissuto... per ora.';
      postSuccessItems = [{ itemId: 'first_aid', quantity: 1 }];
    } else if (triggerSource === 'event') {
      postSuccessMessage = '🏃 Sei scappato appena in tempo!';
      postFailureMessage = '💥 Sei caduto e ti sei ferito!';
    }

    set({
      phase: 'qte',
      qteState: {
        sequences,
        currentStep: 0,
        isProcessing: false,
        isComplete: false,
        successes: 0,
        failures: 0,
        timeRemaining: sequences[0]?.timeLimit || 2000,
        result: 'pending',
        rewardHpSave: hpSave,
        triggerSource,
        postSuccessMessage,
        postFailureMessage,
        postSuccessItems,
        postFailureCombat,
      },
    });
  },

  handleQTEInput: (direction: string) => {
    const state = get();
    const qs = state.qteState;
    if (!qs || qs.isProcessing || qs.isComplete) return;

    const current = qs.sequences[qs.currentStep];
    if (!current) return;

    qs.isProcessing = true;

    if (direction === current.direction) {
      // Success!
      const newSuccesses = qs.successes + 1;
      const nextStep = qs.currentStep + 1;

      if (nextStep >= qs.sequences.length) {
        // All sequences done — determine result
        const ratio = newSuccesses / qs.sequences.length;
        const result = ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'partial' : 'failure';

        setTimeout(() => {
          get().completeQTE();
        }, 500);

        set({
          qteState: { ...qs, successes: newSuccesses, currentStep: nextStep, isProcessing: true, isComplete: true, result },
        });
      } else {
        setTimeout(() => {
          set(state => ({
            qteState: state.qteState ? {
              ...state.qteState,
              currentStep: nextStep,
              isProcessing: false,
              timeRemaining: state.qteState.sequences[nextStep]?.timeLimit || 2000,
            } : null,
          }));
        }, 400);

        set({ qteState: { ...qs, successes: newSuccesses, currentStep: nextStep, isProcessing: true } });
      }
    } else {
      // Failure!
      const newFailures = qs.failures + 1;
      const nextStep = qs.currentStep + 1;

      if (nextStep >= qs.sequences.length) {
        const ratio = qs.successes / qs.sequences.length;
        const result = ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'partial' : 'failure';

        setTimeout(() => {
          get().completeQTE();
        }, 500);

        set({
          qteState: { ...qs, failures: newFailures, currentStep: nextStep, isProcessing: true, isComplete: true, result },
        });
      } else {
        setTimeout(() => {
          set(state => ({
            qteState: state.qteState ? {
              ...state.qteState,
              currentStep: nextStep,
              isProcessing: false,
              timeRemaining: state.qteState.sequences[nextStep]?.timeLimit || 2000,
            } : null,
          }));
        }, 400);

        set({ qteState: { ...qs, failures: newFailures, currentStep: nextStep, isProcessing: true } });
      }
    }
  },

  completeQTE: () => {
    const state = get();
    const qs = state.qteState;
    if (!qs) return;

    let updatedParty = [...state.party];
    const logMessages: string[] = [];

    if (qs.result === 'success') {
      logMessages.push(`[${state.turnCount}] ✅ ${qs.postSuccessMessage}`);
      // Heal party by rewardHpSave
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.min(p.maxHp, p.currentHp + qs.rewardHpSave),
      }));
      logMessages.push(`[${state.turnCount}] ❤️ +${qs.rewardHpSave} HP a tutto il gruppo!`);

      // Give items if any
      if (qs.postSuccessItems) {
        for (const itemEntry of qs.postSuccessItems) {
          const itemDef = ITEMS[itemEntry.itemId];
          if (!itemDef) continue;
          let added = false;
          updatedParty = updatedParty.map(p => {
            if (!added && p.inventory.length < p.maxInventorySlots) {
              added = true;
              return { ...p, inventory: [...p.inventory, { uid: `${itemEntry.itemId}_${Date.now()}_${Math.random()}`, itemId: itemEntry.itemId, name: itemDef.name, description: itemDef.description, type: itemDef.type, rarity: itemDef.rarity, icon: itemDef.icon, usable: itemDef.usable, equippable: itemDef.equippable, effect: itemDef.effect, quantity: itemEntry.quantity }] };
            }
            return p;
          });
          if (added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${itemDef.name} x${itemEntry.quantity}`);
        }
      }

      // Successful escape from Nemesis increases pursuit level
      if (qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5) {
        const newPursuitLevel = state.nemesisPursuitLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 NEMESIS vi rintraccerà... Livello Inseguimento: ${newPursuitLevel}/5`);
      }
    } else if (qs.result === 'partial') {
      logMessages.push(`[${state.turnCount}] ⚠️ ${qs.postFailureMessage} (parziale)`);
      // Deal some damage
      const dmg = Math.floor(10 * (state.difficulty === 'incubo' ? 1.5 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // Partial escape still increases Nemesis pursuit level
      if (qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5) {
        const newPursuitLevel = state.nemesisPursuitLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 NEMESIS vi rintraccerà... Livello Inseguimento: ${newPursuitLevel}/5`);
        set({
          phase: 'exploration' as const,
          party: updatedParty,
          qteState: null,
          messageLog: [...state.messageLog, ...logMessages],
          nemesisPursuitLevel: newPursuitLevel,
          turnCount: state.turnCount + 1,
        });
        return;
      }
    } else {
      logMessages.push(`[${state.turnCount}] 💀 ${qs.postFailureMessage}`);
      // Deal heavy damage
      const dmg = Math.floor(25 * (state.difficulty === 'incubo' ? 2 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // If nemesis QTE failed, trigger combat
      if (qs.triggerSource === 'nemesis' && qs.postFailureCombat) {
        const diff = getDifficultyConfig(state.difficulty, state.partySize);
        const enemies = qs.postFailureCombat.map(id => createEnemyInstance(id, diff.statMult));
        const allActors = [
          ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
        const firstActor = allActors[0];

        set({
          phase: 'combat',
          party: updatedParty,
          enemies,
          qteState: null,
          combat: {
            turn: 1,
            playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
            enemyOrder: allActors.filter(a => a.type === 'enemy').map(a => a.id),
            fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
            currentActorId: firstActor.id,
            currentActorType: firstActor.type,
            selectedAction: null,
            selectedTarget: null,
            selectedItemUid: null,
            isProcessing: false,
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player' as const, action: 'QTE Fallito', message: `NEMESIS vi ha raggiunto!` }],
            isVictory: false,
            isDefeat: false,
            fled: true,
            statusDurations: {},
            specialCooldowns: {},
            special2Cooldowns: {},
            tauntTargetId: null,
          },
          messageLog: [...state.messageLog, ...logMessages],
        });
        if (firstActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 1400);
        }
        return;
      }
    }

    set({
      phase: 'exploration',
      qteState: null,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMessages],
      skipNextEncounter: true,
    });
  },

  // ==========================================
  // SAVE / LOAD
  // ==========================================
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
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
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
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }
  },

  loadGame: (slot: number) => {
    const saveKey = `raccoon_city_save_${slot}`;

    try {
      if (typeof window === 'undefined') return false;

      const raw = localStorage.getItem(saveKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

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
        selectedDifficulty: data.selectedDifficulty || null,
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
        endingType: data.endingType || null,
        exploredSubAreas: data.exploredSubAreas || {},
        documentsOpen: false,
        npcsOpen: false,
      });
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
      endingType: state.endingType,
      exploredSubAreas: state.exploredSubAreas,
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
    set({
      phase: 'character-select',
      party: [],
      messageLog: ['🎀 Nuovo Gioco+ attivato! Nastri persistenti: ' + persistentRibbons + '/10', '\nScegli i tuoi personaggi per la nuova avventura...'],
      turnCount: 0,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: Math.min(persistentRibbons, 10),
      isNewGamePlus: true,
      gameStartTime: 0,
      inventoryOpen: false,
      selectedCharacterId: null,
      enemies: [],
      combat: null,
      activeEvent: null,
      eventOutcome: null,
      difficulty: 'normale',
      selectedDifficulty: null,
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      collectedDocuments: [],
      documentsOpen: false,
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
    });
  },

  // ==========================================
  // NPC METHODS
  // ==========================================

  encounterNpc: (npcId: string) => {
    const npc = NPCS[npcId];
    if (!npc) return;
    // Play NPC encounter sound (#36)
    try { playNPCEncounter(); } catch {}
    set(state => ({
      activeNpc: npc,
      npcsEncountered: [...state.npcsEncountered, npcId],
      messageLog: [...state.messageLog, `[${state.turnCount}] 👤 Incontrate ${npc.name}! "${npc.greeting}"`],
      notification: {
        id: `notif_${++notifId}`,
        type: 'item_found',
        message: npc.name,
        icon: npc.portrait,
        subMessage: 'Sopravvissuto trovato!',
      },
    }));
  },

  talkToNpc: () => {
    const state = get();
    if (!state.activeNpc) return;
    const npc = state.activeNpc;

    // ── Check for fetch quest completion ──
    if (npc.quest && npc.quest.type === 'fetch' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        // Count how many of the required items the party has
        let partyItemCount = 0;
        for (const p of state.party) {
          for (const inv of p.inventory) {
            if (inv.itemId === npc.quest.targetId) {
              partyItemCount += inv.quantity;
            }
          }
        }

        if (partyItemCount >= npc.quest.targetCount) {
          // Player has enough items → complete the quest
          // Remove required items from party inventory
          let updatedParty = [...state.party];
          let toRemove = npc.quest.targetCount;
          for (const p of updatedParty) {
            if (toRemove <= 0) break;
            for (let i = p.inventory.length - 1; i >= 0; i--) {
              if (p.inventory[i].itemId === npc.quest.targetId && toRemove > 0) {
                const avail = p.inventory[i].quantity;
                if (avail <= toRemove) {
                  toRemove -= avail;
                  updatedParty = updatedParty.map(pp =>
                    pp.id === p.id ? { ...pp, inventory: pp.inventory.filter((_, idx) => idx !== i) } : pp
                  );
                } else {
                  p.inventory[i].quantity -= toRemove;
                  toRemove = 0;
                  updatedParty = [...updatedParty];
                }
              }
            }
          }

          // Award rewards
          const logMsgs: string[] = [`[${state.turnCount}] 💬 ${npc.name}: "Grazie! Hai portato esattamente quello che mi serviva!"`];
          logMsgs.push(`[${state.turnCount}] 📋 Missione completata: "${npc.quest.name}"!`);
          if (npc.quest.rewardItems) {
            for (const reward of npc.quest.rewardItems) {
              const rewardDef = ITEMS[reward.itemId];
              if (!rewardDef) continue;
              const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
              updatedParty = result.party;
              if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
            }
          }
          if (npc.quest.rewardExp > 0) {
            logMsgs.push(`[${state.turnCount}] ⬆️ +${npc.quest.rewardExp} EXP (missione completata)`);
            // Grant EXP to alive party members
            updatedParty = updatedParty.map(p => {
              if (p.currentHp <= 0) return p;
              return { ...p, exp: p.exp + npc.quest.rewardExp };
            });
          }

          set({
            party: updatedParty,
            npcQuestProgress: {
              ...state.npcQuestProgress,
              [npc.quest.id]: { currentCount: npc.quest.targetCount, completed: true },
            },
            messageLog: [...state.messageLog, ...logMsgs],
          });
          return;
        } else if (partyItemCount > 0) {
          // Has some but not enough
          set(state => ({
            messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Vedo che hai ${partyItemCount}/${npc.quest.targetCount} di quello che ti ho chiesto... portami il resto!"`],
          }));
          return;
        }
      }
    }

    // ── Check for explore quest completion ──
    if (npc.quest && npc.quest.type === 'explore' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress && state.visitedLocations?.includes(npc.quest.targetId)) {
        // Player has visited the target location → complete the quest
        const logMsgs: string[] = [`[${state.turnCount}] 💬 ${npc.name}: "${npc.quest.rewardDialogue?.[0] || 'Hai fatto un ottimo lavoro esplorando!'}"`];
        logMsgs.push(`[${state.turnCount}] 📋 Missione completata: "${npc.quest.name}"!`);

        let updatedParty = [...state.party];
        if (npc.quest.rewardItems) {
          for (const reward of npc.quest.rewardItems) {
            const rewardDef = ITEMS[reward.itemId];
            if (!rewardDef) continue;
            const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
            updatedParty = result.party;
            if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
          }
        }
        if (npc.quest.rewardExp > 0) {
          logMsgs.push(`[${state.turnCount}] ⬆️ +${npc.quest.rewardExp} EXP (missione completata)`);
          updatedParty = updatedParty.map(p => {
            if (p.currentHp <= 0) return p;
            return { ...p, exp: p.exp + npc.quest.rewardExp };
          });
        }

        set({
          party: updatedParty,
          npcQuestProgress: {
            ...state.npcQuestProgress,
            [npc.quest.id]: { currentCount: 1, completed: true },
          },
          messageLog: [...state.messageLog, ...logMsgs],
        });
        return;
      } else if (questProgress) {
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Non hai ancora esplorato ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a cercare!"`],
        }));
        return;
      }
    }

    // ── Check for kill quest status ──
    if (npc.quest && npc.quest.type === 'kill' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        const remaining = npc.quest.targetCount - questProgress.currentCount;
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Devi ancora eliminare ${remaining} ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a combattere!"`],
        }));
        return;
      }
    }

    // ── Default: random dialogue ──
    const dialogue = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    set(state => ({
      messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${dialogue}"`],
    }));
  },

  acceptNpcQuest: () => {
    const state = get();
    if (!state.activeNpc?.quest) return;
    const quest = state.activeNpc.quest;
    if (state.npcQuestProgress[quest.id]?.completed) return;
    set(state => ({
      npcQuestProgress: {
        ...state.npcQuestProgress,
        [quest.id]: state.npcQuestProgress[quest.id] || { currentCount: 0, completed: false },
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] 📋 Missione accettata: "${quest.name}" — ${quest.description}`],
    }));
  },

  tradeWithNpc: (tradeIndex: number) => {
    const state = get();
    if (!state.activeNpc?.tradeInventory) return false;
    const trade = state.activeNpc.tradeInventory[tradeIndex];
    if (!trade) return false;
    const hasPriceItem = state.party.some(p =>
      p.inventory.some(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity)
    );
    if (!hasPriceItem) {
      set(state => ({
        messageLog: [...state.messageLog, `[${state.turnCount}] ❌ Non avete gli oggetti necessari per lo scambio.`],
      }));
      return false;
    }
    let updatedParty = [...state.party];
    let priceRemoved = false;
    for (const p of updatedParty) {
      if (priceRemoved) break;
      const idx = p.inventory.findIndex(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity);
      if (idx >= 0) {
        const item = p.inventory[idx];
        if (item.quantity > trade.priceQuantity) {
          updatedParty = updatedParty.map(pp =>
            pp.id === p.id ? {
              ...pp,
              inventory: pp.inventory.map((ii, iiIdx) =>
                iiIdx === idx ? { ...ii, quantity: ii.quantity - trade.priceQuantity } : ii
              ),
            } : pp
          );
        } else {
          updatedParty = updatedParty.map(pp =>
            pp.id === p.id ? { ...pp, inventory: pp.inventory.filter((_, iiIdx) => iiIdx !== idx) } : pp
          );
        }
        priceRemoved = true;
      }
    }
    const tradedDef = ITEMS[trade.itemId];
    if (!tradedDef) return false;
    const result = addItemToParty(updatedParty, trade.itemId, 1);
    updatedParty = result.party;
    set(state => ({
      party: updatedParty,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🤝 Scambio completato! Ricevuto: ${tradedDef.name}${result.added ? ` → ${result.characterName}` : ' (inventario pieno!)'}`],
    }));
    return true;
  },

  closeNpcDialog: () => {
    set({ activeNpc: null });
  },

  // ==========================================
  // DYNAMIC EVENT METHODS
  // ==========================================

  triggerDynamicEvent: (eventId: string) => {
    const event = DYNAMIC_EVENTS[eventId];
    if (!event) return;
    set(state => ({
      activeDynamicEvent: event,
      dynamicEventTurnsLeft: event.duration,
      messageLog: [...state.messageLog, `[${state.turnCount}] ${event.icon} ${event.onTriggerMessage}`],
      notification: {
        id: `notif_${++notifId}`,
        type: 'encounter',
        message: `${event.icon} ${event.title}`,
        icon: event.icon,
        subMessage: event.description,
      },
    }));
  },

  handleDynamicEventChoice: (choiceIndex: number) => {
    const state = get();
    if (!state.activeDynamicEvent) return;
    const choice = state.activeDynamicEvent.choices[choiceIndex];
    if (!choice) return;
    const outcome = choice.outcome;
    let updatedParty = [...state.party];
    const logMessages = [`[${state.turnCount}] ${outcome.description}`];
    if (outcome.hpChange) {
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp + outcome.hpChange),
      }));
    }
    if (outcome.receiveItems) {
      for (const itemEntry of outcome.receiveItems) {
        const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
        updatedParty = result.party;
        if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ricevuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
      }
    }
    if (outcome.endEvent) {
      logMessages.push(`[${state.turnCount}] ${state.activeDynamicEvent.onEndMessage}`);
      set({
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        turnCount: state.turnCount + 1,
      });
    } else {
      set({
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        turnCount: state.turnCount + 1,
      });
    }
  },

  tickDynamicEvent: () => {
    const state = get();
    if (!state.activeDynamicEvent) return;
    const newTurnsLeft = state.dynamicEventTurnsLeft - 1;
    const logMsgs: string[] = [];
    let updatedParty = [...state.party];
    if (state.activeDynamicEvent.effect.damagePerTurn > 0) {
      const dmg = state.activeDynamicEvent.effect.damagePerTurn;
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMsgs.push(`[${state.turnCount}] 💔 ${state.activeDynamicEvent.icon} ${dmg} danni a tutti (${newTurnsLeft} turni rimasti)`);
    }
    if (newTurnsLeft <= 0) {
      logMsgs.push(`[${state.turnCount}] ✅ ${state.activeDynamicEvent.onEndMessage}`);
      set({
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMsgs],
      });
    } else {
      set({
        dynamicEventTurnsLeft: newTurnsLeft,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMsgs],
      });
    }
  },

  // ==========================================
  // SECRET ROOM + ENDING + DOCUMENTS + MINI-MAP
  // ==========================================

  discoverSecretRoom: (roomId: string) => {
    const state = get();
    const secret = SECRET_ROOMS[roomId];
    if (!secret || state.discoveredSecretRooms.includes(roomId)) return;
    // Play item pickup sound for secret room discovery (#36)
    try { playItemPickup(); } catch {}
    const newDiscovered = [...state.discoveredSecretRooms, roomId];
    const logMsgs = [
      `[${state.turnCount}] 🚪 Stanza segreta trovata: ${secret.name}!`,
      `[${state.turnCount}] ${secret.description}`,
    ];
    let updatedParty = [...state.party];
    if (secret.uniqueItem) {
      const itemDef = ITEMS[secret.uniqueItem.itemId];
      if (itemDef) {
        const result = addItemToParty(updatedParty, secret.uniqueItem.itemId, secret.uniqueItem.quantity);
        updatedParty = result.party;
        if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Trovato: ${itemDef.name}! → ${result.characterName}`);
      }
    }
    for (const entry of secret.lootTable) {
      if (Math.random() * 100 < entry.chance) {
        const itemDef = ITEMS[entry.itemId];
        if (itemDef) {
          const result = addItemToParty(updatedParty, entry.itemId, entry.quantity);
          updatedParty = result.party;
          if (result.added) logMsgs.push(`[${state.turnCount}] 🎒 Trovato: ${itemDef.name} x${entry.quantity} → ${result.characterName}`);
        }
      }
    }
    set({
      discoveredSecretRooms: newDiscovered,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMsgs],
      turnCount: state.turnCount + 1,
      notification: {
        id: `notif_${++notifId}`,
        type: 'item_found',
        message: `🚪 ${secret.name}`,
        icon: '🚪',
        subMessage: 'Stanza segreta scoperta!',
      },
    });
    setTimeout(() => get().checkAchievements(), 100);
  },

  determineEnding: () => {
    const state = get();
    const endings = Object.values(ENDINGS).sort((a, b) => b.priority - a.priority);
    for (const ending of endings) {
      const met = ending.requirements.every(req => {
        switch (req.type) {
          case 'boss_defeated':
            return state.bestiary.some(b => b.enemyId === req.value && b.defeated);
          case 'npc_saved':
            return state.npcsEncountered.length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'documents_found':
            return state.collectedDocuments.length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'turn_limit':
            return state.turnCount <= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'party_alive':
            return state.party.filter(p => p.currentHp > 0).length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'choice':
            return state.storyChoices.includes(String(req.value) as StoryChoiceTag);
          case 'secret_rooms':
            return state.discoveredSecretRooms.length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          default: return true;
        }
      });
      if (met) return ending;
    }
    return ENDINGS['ending_escape'];
  },

  toggleDocuments: () => {
    try {
      const isOpen = get().documentsOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ documentsOpen: !state.documentsOpen }));
  },

  exploreSubArea: (subAreaId: string) => {
    const state = get();
    const locId = state.currentLocationId;
    const currentSubAreas = state.exploredSubAreas[locId] || [];
    if (currentSubAreas.includes(subAreaId)) return;
    set(state => ({
      exploredSubAreas: {
        ...state.exploredSubAreas,
        [locId]: [...currentSubAreas, subAreaId],
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] 🗺️ Nuova area esplorata: ${subAreaId}`],
    }));
  },

  // ==========================================
  // DEBUG TOOLS
  // ==========================================
  debugHealAll: () => {
    set(state => ({
      party: state.party.map(p => ({ ...p, currentHp: p.maxHp, statusEffects: [] })),
      messageLog: [...state.messageLog, `[DEBUG] ✅ Tutti i personaggi curati al massimo HP. Status rimossi.`],
    }));
  },

  debugGiveAllItems: () => {
    set(state => {
      const itemIds = Object.keys(ITEMS).filter(id => {
        const def = ITEMS[id];
        return def && def.type !== 'weapon' && !id.startsWith('key_');
      });
      const newItems: ItemInstance[] = itemIds.map(id => {
        const def = ITEMS[id];
        return {
          uid: `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          effect: def.effect,
          quantity: 5,
        };
      });
      // Add to first alive character with space, distributing
      let updatedParty = state.party.map(p => ({ ...p }));
      for (const item of newItems) {
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (!added && p.currentHp > 0 && p.inventory.length < p.maxInventorySlots) {
            added = true;
            return { ...p, inventory: [...p.inventory, item] };
          }
          return p;
        });
      }
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🎒 Aggiunti oggetti (qty 5) a tutti i personaggi.`],
      };
    });
  },

  debugGiveAllKeys: () => {
    const keyIds = ['key_rpd', 'key_sewers', 'key_lab', 'crank_handle', 'fuse'];
    set(state => {
      const newItems: ItemInstance[] = keyIds.map(id => {
        const def = ITEMS[id];
        if (!def) return null;
        return {
          uid: `debug_${id}_${Date.now()}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          effect: def.effect,
          quantity: 1,
        };
      }).filter(Boolean) as ItemInstance[];
      const target = state.party.find(p => p.currentHp > 0);
      if (!target) return state;
      const updatedParty = state.party.map(p => {
        if (p.id !== target.id) return p;
        return { ...p, inventory: [...p.inventory, ...newItems] };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🔑 Tutte le chiavi e strumenti aggiunti a ${target.name}.`],
      };
    });
  },

  debugGiveAmmo: () => {
    const ammoIds = ['ammo_pistol', 'ammo_shotgun', 'ammo_magnum', 'ammo_machinegun', 'ammo_grenade'];
    set(state => {
      const newItems: ItemInstance[] = ammoIds.map(id => {
        const def = ITEMS[id];
        if (!def) return null;
        return {
          uid: `debug_ammo_${id}_${Date.now()}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          quantity: 50,
        };
      }).filter(Boolean) as ItemInstance[];
      const target = state.party.find(p => p.currentHp > 0);
      if (!target) return state;
      const updatedParty = state.party.map(p => {
        if (p.id !== target.id) return p;
        return { ...p, inventory: [...p.inventory, ...newItems] };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🔫 50 munizioni per ogni arma aggiunte a ${target.name}.`],
      };
    });
  },

  debugApplyStatus: (characterId: string, status: 'poison' | 'bleeding') => {
    set(state => ({
      party: state.party.map(p => {
        if (p.id !== characterId) return p;
        if (p.statusEffects.includes(status)) return p;
        return { ...p, statusEffects: [...p.statusEffects, status] };
      }),
      messageLog: [...state.messageLog, `[DEBUG] ${status === 'poison' ? '☠️ Veleno' : '🩸 Sanguinamento'} applicato a ${state.party.find(p => p.id === characterId)?.name}.`],
    }));
  },

  debugRemoveStatus: (characterId: string) => {
    set(state => ({
      party: state.party.map(p => {
        if (p.id !== characterId) return p;
        return { ...p, statusEffects: [] };
      }),
      messageLog: [...state.messageLog, `[DEBUG] ✨ Status rimossi da ${state.party.find(p => p.id === characterId)?.name}.`],
    }));
  },

  debugSpawnEnemy: (enemyId: string) => {
    const state = get();
    if (state.phase !== 'exploration') {
      // If already in combat, add enemy to existing combat
      if (state.phase === 'combat' && state.combat) {
        const def = ENEMIES[enemyId];
        if (!def) return;
        const newEnemy = createEnemyInstance(enemyId, 1);
        const allActors = [
          ...state.combat.fullTurnOrder,
          { id: newEnemy.id, type: 'enemy' as const },
        ];
        set({
          enemies: [...state.enemies, newEnemy],
          combat: {
            ...state.combat,
            fullTurnOrder: allActors,
            enemyOrder: [...state.combat.enemyOrder, newEnemy.id],
            log: [...state.combat.log, {
              turn: state.combat.turn,
              actorName: 'DEBUG',
              actorType: 'player' as const,
              action: 'Spawn',
              message: `[DEBUG] 👾 ${def.name} spawnato in combattimento!`,
            }],
          },
        });
        return;
      }
      return;
    }
    const def = ENEMIES[enemyId];
    if (!def) return;
    const diff = getDifficultyConfig(state.difficulty, state.partySize);
    const enemy = createEnemyInstance(enemyId, diff.statMult);
    const allActors = [
      ...state.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
      { id: enemy.id, spd: enemy.spd, type: 'enemy' as const },
    ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
    const firstActor = allActors[0];
    set({
      phase: 'combat',
      enemies: [enemy],
      autoCombat: false,
      combat: {
        turn: 1,
        playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
        enemyOrder: [enemy.id],
        fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
        currentActorId: firstActor.id,
        currentActorType: firstActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        isProcessing: false,
        log: [{ turn: 1, actorName: 'DEBUG', actorType: 'player' as const, action: 'Spawn', message: `[DEBUG] 👾 ${def.name} spawnato!` }],
        isVictory: false,
        isDefeat: false,
        fled: false,
        statusDurations: {},
        specialCooldowns: {},
        special2Cooldowns: {},
        tauntTargetId: null,
      },
      messageLog: [...state.messageLog, `[DEBUG] 👾 Combattimento iniziato contro ${def.name}!`],
    });
    if (firstActor.type === 'enemy') {
      setTimeout(() => get().advanceToNextActor(), 1400);
    }
  },

  debugSetLevel: (level: number) => {
    set(state => {
      const updatedParty = state.party.map(char => {
        if (char.currentHp <= 0) return char;
        const growth = { tank: { hp: 12, atk: 2, def: 2, spd: 0 }, healer: { hp: 8, atk: 1, def: 1, spd: 1 }, dps: { hp: 9, atk: 3, def: 1, spd: 1 }, control: { hp: 9, atk: 2, def: 1, spd: 2 } }[char.archetype] || { hp: 8, atk: 1, def: 1, spd: 1 };
        let newMaxHp = char.maxHp;
        let newAtk = char.baseAtk;
        let newDef = char.baseDef;
        let newSpd = char.baseSpd;
        const levelsToAdd = Math.max(0, level - char.level);
        for (let i = 0; i < levelsToAdd; i++) {
          newMaxHp += growth.hp;
          newAtk += growth.atk;
          newDef += growth.def;
          newSpd += growth.spd;
        }
        return {
          ...char,
          level,
          maxHp: newMaxHp,
          currentHp: newMaxHp,
          baseAtk: newAtk,
          baseDef: newDef,
          baseSpd: newSpd,
        };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] ⬆️ Tutti i personaggi portati al livello ${level}. HP massimo ripristinato.`],
      };
    });
  },

  debugTeleport: (locationId: string) => {
    const state = get();
    const dest = LOCATIONS[locationId];
    if (!dest) return;
    set({
      phase: 'exploration',
      combat: null,
      enemies: [],
      currentLocationId: locationId,
      visitedLocations: [...new Set([...state.visitedLocations, locationId])],
      activeEvent: null,
      messageLog: [...state.messageLog, `[DEBUG] 📍 Teletrasportato a ${dest.name}.`],
    });
  },

  debugKillAllEnemies: () => {
    const state = get();
    if (!state.combat || state.phase !== 'combat') return;
    const killedEnemies = state.enemies.map(e => ({ ...e, currentHp: 0 }));
    set({
      enemies: killedEnemies,
      messageLog: [...state.messageLog, `[DEBUG] 💀 Tutti i nemici uccisi.`],
    });
    // Trigger victory check
    setTimeout(() => get().executeCombatTurn(), 500);
  },

  debugToggleGodMode: () => {
    set(state => ({
      godMode: !state.godMode,
      messageLog: [...state.messageLog, `[DEBUG] ${!state.godMode ? '🛡️ GOD MODE ON — danni nemici ridotti a 0' : '🔓 GOD MODE OFF — danni normali'}`],
    }));
  },

  debugSpawnCollectible: () => {
    set(state => {
      if (state.collectedRibbons >= 10) {
        return { messageLog: [...state.messageLog, '[DEBUG] 🎀 Hai già trovato tutti e 10 i nastri in questa run!'] };
      }
      const newCount = state.collectedRibbons + 1;
      return {
        collectedRibbons: newCount,
        messageLog: [...state.messageLog, `[DEBUG] 🎀 Nastro d'Inchiostro spawnato! (${newCount}/10)`],
        notification: {
          id: `notif_debug_${Date.now()}`,
          type: 'collectible_found' as const,
          message: "Nastro d'Inchiostro",
          icon: '🎀',
          itemId: 'ink_ribbon',
          subMessage: `Collezionabili: ${newCount}/10`,
        },
      };
    });
  },

  debugGiveAllRibbons: () => {
    set(state => ({
      collectedRibbons: 10,
      persistentRibbons: 10,
      messageLog: [...state.messageLog, '[DEBUG] 🎀 Tutti e 10 i nastri sbloccati (run + persistenti)!'],
    }));
  },
}));
