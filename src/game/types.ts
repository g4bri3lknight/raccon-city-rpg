// ==========================================
// RACCOON CITY ESCAPE - Game Types
// ==========================================

export type GamePhase = 'title' | 'character-select' | 'character-creator' | 'exploration' | 'combat' | 'event' | 'inventory' | 'game-over' | 'victory' | 'puzzle' | 'qte';

// ==========================================
// DIFFICULTY
// ==========================================

export type DifficultyLevel = 'sopravvissuto' | 'normale' | 'incubo';

export interface DifficultyConfig {
  label: string;
  color: string;
  icon: string;
  statMult: number;
  lootMult: number;
  maxEnemies: number;
  minEnemies: number;
  expMult: number;
  enemyCritChance: number;
  encounterRateMod: number; // +/- percentage modifier to base encounter rate
  description: string;
}

export type Archetype = 'tank' | 'healer' | 'dps' | 'control' | 'custom';

export type StatusEffect = 'poison' | 'bleeding' | 'stunned' | 'adrenaline' | 'none';

export type ItemType = 'weapon' | 'healing' | 'ammo' | 'utility' | 'antidote' | 'bag' | 'collectible' | 'material' | 'booster';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ==========================================
// SPECIAL ABILITIES
// ==========================================

export type SpecialTargetType = 'self' | 'enemy' | 'ally' | 'all_allies';
export type SpecialCategory = 'offensive' | 'defensive' | 'support' | 'control';

export interface SpecialAbilityDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetType: SpecialTargetType;
  cooldown: number; // 2 or 3
  category: SpecialCategory;
  executionType: string; // maps to combat execution logic
  powerMultiplier?: number; // for offensive abilities
  healAmount?: number; // for healing abilities
  statusToApply?: { type: StatusEffect; chance: number }; // for abilities that apply status
}

// ==========================================
// CHARACTER
// ==========================================

export interface CharacterArchetype {
  id: Archetype;
  name: string;        // archetype role name (e.g. "Tank", "Medico")
  displayName: string; // character name (e.g. "Marvin", "Rebecca")
  description: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  specialName: string;
  specialDescription: string;
  specialCost: number;
  special2Name: string;
  special2Description: string;
  special2Cost: number;
  startingItems: ItemInstance[];
  passiveDescription: string;
  portraitEmoji: string;
}

export interface Character {
  id: string;
  archetype: Archetype;
  name: string;
  biography?: string;
  avatarUrl?: string; // custom avatar path or base64 data URL
  currentHp: number;
  maxHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  level: number;
  exp: number;
  expToNext: number;
  statusEffects: StatusEffect[];
  isDefending: boolean;
  parryReady: boolean;   // true when player executed a parry (next enemy attack negated)
  parryCooldown: number; // turns remaining until parry is available again
  inventory: ItemInstance[];
  maxInventorySlots: number;
  weapon: WeaponInstance | null;
  // Custom character fields:
  special1Id?: string;  // ID of first special ability (from ALL_SPECIAL_ABILITIES)
  special2Id?: string;  // ID of second special ability
  passiveDescription?: string;
  statGrowth?: { hp: number; atk: number; def: number; spd: number }; // custom growth per level
}

export interface WeaponInstance {
  itemId: string;
  name: string;
  atkBonus: number;
  type: 'melee' | 'ranged';
  special?: string;
  ammoType?: string; // itemId of required ammo (e.g. 'ammo_pistol')
}

// ==========================================
// CUSTOM CHARACTER CREATION
// ==========================================

export interface CustomCharacterConfig {
  name: string;
  biography: string;
  avatarUrl: string; // predefined path or base64
  isCustomAvatar: boolean;
  baseArchetype: Archetype; // 'tank' | 'healer' | 'dps' as base, or 'custom' for fully custom
  customStats?: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
  };
  special1Id: string;
  special2Id: string;
  passiveDescription: string;
}

// ==========================================
// ITEMS
// ==========================================

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  icon: string;
  usable: boolean;
  equippable: boolean;
  effect?: ItemEffect;
}

export interface ItemEffect {
  type: 'heal' | 'heal_full' | 'cure' | 'damage_boost' | 'defense_boost' | 'add_ammo' | 'add_slots' | 'kill_all';
  value: number;
  target: 'self' | 'one_ally' | 'all_allies' | 'all_enemies';
  statusCured?: StatusEffect[];
}

export interface ItemInstance {
  uid: string;
  itemId: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  icon: string;
  usable: boolean;
  equippable: boolean;
  effect?: ItemEffect;
  quantity: number;
  isEquipped?: boolean;
  weaponStats?: WeaponInstance;
}

// ==========================================
// ENEMIES
// ==========================================

export type EnemyType = 'undead' | 'creature' | 'human' | 'boss';

export interface EnemyDefinition {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  icon: string;
  expReward: number;
  lootTable: LootEntry[];
  abilities: EnemyAbility[];
  isBoss: boolean;
  variantGroup?: string;
  enemyType?: EnemyType; // undead = immune to poison/bleed, creature = immune to poison/bleed (B.O.W.), human = fully sensitive, boss = resistant
}

export interface LootEntry {
  itemId: string;
  chance: number; // 0-100
  quantity: number;
}

export interface EnemyAbility {
  name: string;
  description: string;
  power: number;
  chance: number; // 0-100, chance to use this ability
  statusEffect?: {
    type: StatusEffect;
    chance: number;
    duration?: number;
  };
}

export interface BossPhase {
  name: string;
  hpThreshold: number; // % of maxHp (e.g. 0.5 for 50%)
  hpMultiplier: number;
  atkMultiplier: number;
  defMultiplier: number;
  spdMultiplier: number;
  newAbilities?: EnemyAbility[];
  message: string;
}

export interface EnemyInstance {
  id: string;
  definitionId: string;
  name: string;
 currentHp: number;
  maxHp: number;
 atk: number;
 def: number;
  spd: number;
 icon: string;
  statusEffects: StatusEffect[];
  isDefending: boolean;
 abilities: EnemyAbility[];
  isBoss: boolean;
 // #14 Boss multi-fase
  currentPhase: number;
 phaseNames: string[];
 isPhaseTransitioning: boolean;
}

// ==========================================
// LOCATIONS
// ==========================================

export type SubAreaType = 'safe_room' | 'exploration' | 'secret' | 'story';

export interface SubAreaDefinition {
  id: string;
  locationId: string;
  name: string;
  description: string;
  type: SubAreaType;
  icon: string;
  ambientText?: string[];
}

export interface LocationDefinition {
  id: string;
  name: string;
  description: string;
  backgroundImage: string;
  encounterRate: number; // 0-100, chance of combat per exploration
  enemyPool: string[]; // EnemyDefinition ids
  itemPool: LootEntry[]; // Items that can be found
  storyEvent?: StoryEvent;
  nextLocations: string[];
  isBossArea: boolean;
  bossId?: string;
  ambientText: string[];
  lockedLocations?: { locationId: string; requiredItemId: string; lockedMessage: string }[];
  subAreas?: SubAreaDefinition[]; // sub-rooms within this location (e.g. safe rooms)
}

export interface StoryEvent {
  title: string;
  description: string;
  choices: StoryChoice[];
  puzzle?: {
    type: 'combination' | 'sequence' | 'key_required';
    requiredItemId?: string;
    requiredItemIds?: string[];
    successOutcome: EventOutcome;
    failMessage: string;
    combinationCode?: string;  // for 'combination' type: the secret code
    sequencePattern?: string[]; // for 'sequence' type: array of arrow keys ('up','down','left','right')
  };
}

// ==========================================
// PUZZLE STATE
// ==========================================

export interface PuzzleState {
  type: 'combination' | 'sequence' | 'key_required';
  title: string;
  description: string;
  // Combination lock state
  codeLength: number;
  currentInput: string[];
  targetCode: string;
  attemptsLeft: number;
  maxAttempts: number;
  feedback: ('correct' | 'misplaced' | 'wrong')[][];
  // Sequence puzzle state
  sequencePattern: string[];
  playerSequence: string[];
  isShowingPattern: boolean;
  currentPatternIndex: number;
  showPhaseStep: number;
  // Key required state
  requiredItemIds: string[];
 successOutcome: EventOutcome;
  failMessage: string;
  isSolved: boolean;
  isFailed: boolean;
}

export interface StoryChoice {
  text: string;
  outcome: EventOutcome;
}

export interface EventOutcome {
  description: string;
  hpChange?: number;
  receiveItems?: { itemId: string; quantity: number }[];
  triggerCombat?: boolean;
  combatEnemyIds?: string[];
}

// ==========================================
// COMBAT
// ==========================================

export type CombatAction = 'attack' | 'special' | 'special2' | 'use_item' | 'defend' | 'flee';

export interface CombatLogEntry {
  turn: number;
  actorName: string;
  actorType: 'player' | 'enemy';
  action: string;
  targetName?: string;
  targetId?: string;
  damage?: number;
  heal?: number;
  isCritical?: boolean;
  isMiss?: boolean;
  statusEffect?: string;
  message: string;
}

export interface StatusDuration {
  effect: StatusEffect;
  turnsLeft: number;
}

export interface CombatState {
  turn: number;
  playerOrder: string[]; // Character IDs in action order
  enemyOrder: string[]; // Enemy IDs in action order
  fullTurnOrder: { id: string; type: 'player' | 'enemy' }[]; // stable turn order for the whole combat
  currentActorId: string;
  currentActorType: 'player' | 'enemy';
  selectedAction: CombatAction | null;
  selectedTarget: string | null;
  selectedItemUid: string | null;
  isProcessing: boolean;
  log: CombatLogEntry[];
  isVictory: boolean;
  isDefeat: boolean;
  fled: boolean;
  statusDurations: Record<string, StatusDuration[]>; // characterId → active effects with durations
  specialCooldowns: Record<string, number>; // characterId → turns remaining until special is available
  special2Cooldowns: Record<string, number>; // characterId → turns remaining until special2 is available
  tauntTargetId: string | null; // if set, enemies must target this character
}

// ==========================================
// GAME STATS (End-game statistics tracking)
// ==========================================

export interface GameStats {
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealingDone: number;
  enemiesKilled: Record<string, number>;
  itemsUsed: number;
  itemsCrafted: number;
  documentsFound: number;
  secretRoomsFound: number;
  parriesPerformed: number;
  turnsPlayed: number;
  locationsVisited: number;
  npcsEncountered: number;
  bossDefeated: string[];
  startTime: number;
}

// ==========================================
// GAME STATE
// ==========================================

export interface GameNotification {
  id: string;
  type: 'encounter' | 'item_found' | 'bag_expand' | 'victory' | 'defeat' | 'collectible_found';
  message: string;
  icon?: string;
  itemId?: string;
  subMessage?: string;
  characterId?: string;
  // Victory-specific
  lootNames?: string[];
  levelUps?: string[];
  // Multiple items found in a single search
  items?: { name: string; itemId: string; icon?: string }[];
}

// ==========================================
// QTE STATE
// ==========================================

export interface QTESequence {
  direction: 'up' | 'down' | 'left' | 'right' | 'space';
  timeLimit: number; // ms to press
}

export interface QTEState {
  sequences: QTESequence[];
  currentStep: number;
  isProcessing: boolean;
  isComplete: boolean;
  successes: number;
  failures: number;
  timeRemaining: number; // ms
  result: 'pending' | 'success' | 'partial' | 'failure';
  rewardHpSave: number; // HP saved on success
  triggerSource: 'nemesis' | 'event' | 'boss';
  postSuccessMessage: string;
  postFailureMessage: string;
  postSuccessItems?: { itemId: string; quantity: number }[];
  postFailureCombat?: string[]; // enemyIds to spawn on failure
}

export interface GameState {
  phase: GamePhase;
  party: Character[];
  partySize: number; // 1, 2, or 3 — set at game start
  currentLocationId: string;
  combat: CombatState | null;
  enemies: EnemyInstance[];
  activeEvent: StoryEvent | null;
  eventOutcome: EventOutcome | null;
  messageLog: string[];
  turnCount: number;
  difficulty: DifficultyLevel;
  selectedDifficulty: DifficultyLevel | null;
  // Puzzle
  puzzleState: PuzzleState | null;
  puzzleSourceLocationId: string | null;
  // QTE
  qteState: QTEState | null;
  inventoryOpen: boolean;
  selectedCharacterId: string | null;
  notification: GameNotification | null;
  searchCounts: Record<string, number>; // locationId → searches done
  searchMaxes: Record<string, number>; // locationId → max searches allowed (1-3 random)
  autoCombat: boolean; // AI manages player characters in combat
  unlockedPaths: string[]; // paths opened with keys, format: "fromId→toId"
  visitedLocations: string[]; // locations the player has visited
  mapOpen: boolean;
  debugOpen: boolean;
  godMode: boolean;
  completedEvents: string[]; // locationIds whose storyEvent has been resolved
  collectedRibbons: number; // ink ribbons collected this run (max 10)
  persistentRibbons: number; // total ribbons collected across all playthroughs
  isNewGamePlus: boolean; // whether current run is a New Game+
  gameStartTime: number; // timestamp (ms) when the current adventure started
  skipNextEncounter: boolean; // prevent combat on next explore
  achievements: AchievementState;
  achievementsOpen: boolean;
  bestiary: BestiaryEntry[];
  bestiaryOpen: boolean;
  newAchievementNotification: string | null;
  // #16 Documents
  collectedDocuments: string[]; // document IDs
  readDocuments: string[]; // document IDs that have been opened/read by the player
  documentsOpen: boolean;
  // Trunk (shared item box across safe rooms)
  trunkItems: ItemInstance[];
  trunkOpen: boolean;
  // #18 NPCs
  activeNpc: GameNPC | null;
  npcQuestProgress: Record<string, { currentCount: number; completed: boolean }>; // questId → progress
  npcsEncountered: string[]; // NPC IDs met
  npcsOpen: boolean;
  // #20 Dynamic Events
  activeDynamicEvent: DynamicEvent | null;
  dynamicEventTurnsLeft: number;
  dynamicEventChoiceMade: boolean;
  // #21 Story Choices
  storyChoices: StoryChoiceTag[];
  // #22 Secret Rooms
  discoveredSecretRooms: string[];
  // #23 Endings
  endingType: EndingType | null;
  // Mini-map
  exploredSubAreas: Record<string, string[]>; // locationId → sub-area IDs
  // Sub-area navigation
  currentSubAreaId: string | null; // currently entered sub-area within a location
  // #14 Boss multi-fase
  bossPhases: Record<string, BossPhase[]>; // enemyId → phases
  // #27 Nemesis persistente
  nemesisPursuitLevel: number; // 0-5, increases each invasion
  nemesisLastSeenLocation: string | null;
  nemesisLastSeenTurn: number;
  // #42 Umbrella Labs theme
  umbrellaLabsTheme: boolean;
  // #38 End-game statistics
  gameStats: GameStats;
}

// ==========================================
// ACHIEVEMENTS
// ==========================================

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'exploration' | 'collection' | 'story' | 'special';
  condition: string; // identifier used in code to check condition
  hidden: boolean; // true = achievement name/description hidden until unlocked
  reward?: string; // flavor text reward
}

export interface AchievementState {
  unlockedIds: string[];
  unlockTimestamps: Record<string, number>; // id → timestamp
}

// ==========================================
// BESTIARY
// ==========================================

export interface BestiaryEntry {
  enemyId: string;
  encountered: boolean;
  defeated: boolean;
  timesDefeated: number;
  firstDefeatTimestamp?: number;
}

// ==========================================
// NEMESIS INVASION
// ==========================================

export interface NemesisInvasionState {
  invasionCount: number; // how many times Nemesis has invaded this run
  lastInvasionTurn: number; // turnCount when Nemesis last appeared
  invasionDefeated: boolean; // whether the player has defeated Nemesis during an invasion
}

// ==========================================
// #16 - DOCUMENTS / LORE
// ==========================================

export type DocumentType = 'diary' | 'umbrella_file' | 'note' | 'photo' | 'report' | 'email';

export interface GameDocument {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  locationId: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  isSecret: boolean;
  hintRequired?: string; // document id that gives hint to find this
  // Email-specific fields
  emailMeta?: {
    from: string;
    to: string;
    date: string;
    cc?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    attachments?: string[];
  };
}

// ==========================================
// #18 - NPC SURVIVORS
// ==========================================

export interface NPCQuest {
  id: string;
  name: string;
  description: string;
  type: 'fetch' | 'kill' | 'explore';
  targetId: string; // itemId to fetch, enemyId to kill, locationId to explore
  targetCount: number;
  rewardItems: { itemId: string; quantity: number }[];
  rewardExp: number;
  rewardDialogue: string[];
}

export interface NPCTradeItem {
  itemId: string;
  priceItemId: string;
  priceQuantity: number;
}

export interface GameNPC {
  id: string;
  name: string;
  portrait: string; // emoji
  locationId: string;
  greeting: string;
  dialogues: string[];
  quest?: NPCQuest;
  tradeInventory?: NPCTradeItem[];
  questCompletedDialogue?: string[];
  farewell: string;
}

// ==========================================
// #20 - DYNAMIC EVENTS
// ==========================================

export type DynamicEventType = 'blackout' | 'alarm' | 'collapse' | 'lockdown' | 'gas_leak' | 'fire';

export interface DynamicEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: DynamicEventType;
  duration: number; // turns remaining
  effect: {
    encounterRateMod: number;
    enemyStatMult: number;
    searchBonus: boolean;
    damagePerTurn: number;
  };
  triggerChance: number; // per explore
  minTurn: number;
  locationIds: string[]; // empty = any location
  onTriggerMessage: string;
  onEndMessage: string;
  choices: DynamicEventChoice[];
}

export interface DynamicEventChoice {
  text: string;
  outcome: {
    description: string;
    endEvent: boolean;
    receiveItems?: { itemId: string; quantity: number }[];
    hpChange?: number;
  };
}

// ==========================================
// #22 - SECRET ROOMS
// ==========================================

export interface SecretRoom {
  id: string;
  locationId: string;
  name: string;
  description: string;
  discoveryMethod: 'search' | 'document' | 'npc_hint';
  requiredDocumentId?: string;
  requiredNpcQuestId?: string;
  searchChance: number;
  hint: string;
  lootTable: { itemId: string; chance: number; quantity: number }[];
  uniqueItem?: { itemId: string; quantity: number };
}

// ==========================================
// #23 - MULTIPLE ENDINGS
// ==========================================

export type EndingType = 'escape' | 'hero' | 'truth' | 'dark';

export interface EndingDefinition {
  id: EndingType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  requirements: {
    type: 'choice' | 'npc_saved' | 'documents_found' | 'turn_limit' | 'party_alive' | 'item' | 'boss_defeated' | 'secret_rooms';
    value: string | number;
  }[];
  priority: number; // higher = checked first
}

// ==========================================
// #21 - STORY CHOICES TRACKING
// ==========================================

export type StoryChoiceTag = 'help_survivors' | 'ignore_survivors' | 'enter_lab' | 'skip_lab' | 'go_back_sewers' | 'proceed_sewers' | 'hack_computer' | 'skip_computer';
