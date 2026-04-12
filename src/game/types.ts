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
  description: string;
}

export type Archetype = 'tank' | 'healer' | 'dps' | 'control' | 'custom';

export type StatusEffect = 'poison' | 'bleeding' | 'stunned' | 'adrenaline' | 'none';

export type ItemType = 'weapon' | 'healing' | 'ammo' | 'utility' | 'antidote' | 'bag' | 'collectible' | 'armor' | 'accessory' | 'weapon_mod';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ==========================================
// SPECIAL ABILITIES — EFFECT SYSTEM
// ==========================================

export type SpecialCategory = 'offensive' | 'defensive' | 'support' | 'control';

// Target for a single effect within an ability
export type EffectTarget = 'self' | 'enemy' | 'all_enemies' | 'ally' | 'all_allies' | 'lowest_hp_ally' | 'random_enemy';

// When an effect triggers
export type EffectTrigger = 'on_use' | 'on_hit' | 'on_take_hit' | 'on_turn_start' | 'on_critical';

// All atomic effect types
export type SpecialEffectType =
  | 'deal_damage'
  | 'heal'
  | 'apply_status'
  | 'remove_status'
  | 'buff_stat'
  | 'debuff_stat'
  | 'shield'
  | 'taunt'
  | 'lifesteal'
  | 'revive'
  | 'hot'
  | 'reflect'
  | 'add_slots';

// --- Atomic effect interfaces ---

export interface BaseEffect {
  target: EffectTarget;
  /** When this effect triggers (defaults to 'on_use' for specials) */
  trigger?: EffectTrigger;
  /** Chance 0-100 to activate (optional, defaults to 100) */
  chance?: number;
}

export interface DealDamageEffect extends BaseEffect {
  type: 'deal_damage';
  /** ATK multiplier (e.g. 1.6 = 160% of ATK) */
  powerMultiplier: number;
  /** Attack always counts as critical */
  guaranteedCrit?: boolean;
  /** Damage ignores target DEF */
  ignoreDef?: boolean;
  /** Attack cannot miss (100% hit) */
  noMiss?: boolean;
  /** Deal damage based on % of target's max HP instead of ATK */
  basedOnTargetHp?: number;
  /** For splash: exclude the primary target from this effect */
  excludePrimaryTarget?: boolean;
}

export interface HealEffect extends BaseEffect {
  type: 'heal';
  /** HP to restore (flat number) */
  amount: number;
  /** If true, amount is interpreted as % of max HP */
  percent?: boolean;
}

export interface ApplyStatusEffect extends BaseEffect {
  type: 'apply_status';
  /** Status to apply: poison, stunned, bleeding */
  statusType: string;
  /** Chance 0-100 to apply */
  chance: number;
  /** How many turns the status lasts (overrides default) */
  duration?: number;
}

export interface RemoveStatusEffect extends BaseEffect {
  type: 'remove_status';
  /** Array of statuses to remove, or "all" for everything */
  statuses: string[];
}

export interface BuffStatEffect extends BaseEffect {
  type: 'buff_stat';
  /** Which stat to boost */
  stat: 'atk' | 'def' | 'spd';
  /** Percentage increase (e.g. 30 = +30%) */
  amount: number;
  /** How many turns the buff lasts */
  duration: number;
}

export interface DebuffStatEffect extends BaseEffect {
  type: 'debuff_stat';
  stat: 'atk' | 'def' | 'spd';
  amount: number;
  duration: number;
}

export interface ShieldEffect extends BaseEffect {
  type: 'shield';
  /** Absorption HP */
  amount: number;
  /** How many turns the shield lasts */
  duration: number;
  /** For on_take_hit: chance to trigger (0-100) */
  procChance?: number;
}

export interface TauntEffect extends BaseEffect {
  type: 'taunt';
  /** How many turns enemies must attack the caster */
  duration: number;
}

export interface LifestealEffect extends BaseEffect {
  type: 'lifesteal';
  /** % of damage dealt that heals the caster */
  percent: number;
  /** ATK multiplier for the damage portion (defaults to 1.0) */
  power?: number;
}

export interface ReviveEffect extends BaseEffect {
  type: 'revive';
  /** % of max HP to restore on revive */
  hpPercent: number;
}

export interface HotEffect extends BaseEffect {
  type: 'hot';
  /** HP healed per turn */
  amountPerTurn: number;
  /** How many turns the HoT lasts */
  duration: number;
}

export interface ReflectEffect extends BaseEffect {
  type: 'reflect';
  /** % of incoming damage reflected back */
  percent: number;
  /** How many turns reflect lasts */
  duration: number;
}

export interface AddSlotsEffect extends BaseEffect {
  type: 'add_slots';
  /** Number of inventory slots to add */
  amount: number;
}

// Discriminated union of all effects
export type SpecialEffect =
  | DealDamageEffect
  | HealEffect
  | ApplyStatusEffect
  | RemoveStatusEffect
  | BuffStatEffect
  | DebuffStatEffect
  | ShieldEffect
  | TauntEffect
  | LifestealEffect
  | ReviveEffect
  | HotEffect
  | ReflectEffect
  | AddSlotsEffect;

// Active effect tracked during combat (buffs, shields, HoTs, etc.)
export interface ActiveCombatEffect {
  id: string;
  type: 'buff_stat' | 'debuff_stat' | 'shield' | 'taunt' | 'hot' | 'reflect';
  targetId: string;
  sourceId: string;
  sourceType?: 'special' | 'weapon' | 'armor' | 'accessory' | 'item'; // What created this effect
  stat?: 'atk' | 'def' | 'spd';
  amount?: number;
  remainingTurns: number;
  /** Shield remaining HP (only for shield type) */
  shieldHp?: number;
}

export interface SpecialAbilityDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetType?: EffectTarget;
  cooldown: number;
  category: SpecialCategory;
  /** Ordered list of atomic effects that compose this ability */
  effects: SpecialEffect[];
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
  inventory: ItemInstance[];
  maxInventorySlots: number;
  weapon: WeaponInstance | null;
  // #29 Equipment slots
  armor: EquipmentInstance | null;
  accessory: EquipmentInstance | null;
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
  // #3 Weapon mods
  modSlots: string[]; // installed mod IDs (max 2)
}

// ==========================================
// #3 - WEAPON MODS
// ==========================================

export interface WeaponMod {
  modId: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  atkBonus?: number;
  critBonus?: number; // % extra crit chance
  dodgeBonus?: number; // % enemy dodge chance reduction
  statusBonus?: number; // % extra status effect apply chance
  type: 'melee' | 'ranged' | 'any'; // weapon type compatibility
}

// ==========================================
// #29 - EQUIPMENT (ARMOR & ACCESSORIES)
// ==========================================

export type EquipmentSlot = 'armor' | 'accessory';

export interface EquipmentInstance {
  itemId: string;
  name: string;
  slot: EquipmentSlot;
  icon: string;
  rarity: Rarity;
  defBonus?: number;
  hpBonus?: number;
  spdBonus?: number;
  atkBonus?: number;
  critBonus?: number;
  description: string;
  specialEffect?: {
    type: 'poison_resist' | 'bleed_resist' | 'stun_resist' | 'hp_regen' | 'thorns' | 'crit_shield';
    value: number; // percentage or flat value depending on type
  };
  /** Atomic effects array — passive effects that fire on specific triggers during combat */
  effects?: SpecialEffect[];
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
  stackable: boolean;
  maxStack: number;
  unico: boolean;
  /** Atomic effects array (data-driven system — same format as specials) */
  effects?: SpecialEffect[];
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
  /** Atomic effects array (data-driven system) */
  effects?: SpecialEffect[];
  quantity: number;
  isEquipped?: boolean;
  weaponStats?: WeaponInstance;
  // #29 Equipment data carried in inventory items (armor/accessories)
  equipmentStats?: EquipmentInstance;
  // #3 Mod data carried in inventory items (weapon mods)
  modStats?: WeaponMod;
}

// ==========================================
// ENEMIES
// ==========================================

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
  /** Atomic effects array (data-driven system — same format as specials) */
  effects?: SpecialEffect[];
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

export interface SubAreaDefinition {
  id: string;
  name: string;
  description: string;
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
  subAreas?: SubAreaDefinition[];
  // Search configuration (optional, defaults apply if null)
  searchChance?: number; // 0-100 base success chance (default 60)
  docChance?: number;    // 0-100 document find chance (default 35)
  searchMax?: number;    // max searches per location (null=random 1-3, 0=unlimited)
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
  activeEffects: ActiveCombatEffect[]; // tracked buffs, shields, HoTs, reflect, taunts
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
  documentsOpen: boolean;
  // #18 NPCs
  activeNpc: GameNPC | null;
  npcQuestProgress: Record<string, { currentCount: number; completed: boolean }>; // questId → progress
  npcsEncountered: string[]; // NPC IDs met
  npcsOpen: boolean;
  missionsOpen: boolean;
  // #20 Dynamic Events
  activeDynamicEvent: DynamicEvent | null;
  dynamicEventTurnsLeft: number;
  // #21 Story Choices
  storyChoices: StoryChoiceTag[];
  // #22 Secret Rooms
  discoveredSecretRooms: string[];
  // #23 Endings
  endingType: EndingType | null;
  // Mini-map
  exploredSubAreas: Record<string, string[]>; // locationId → sub-area IDs
  // #14 Boss multi-fase
  bossPhases: Record<string, BossPhase[]>; // enemyId → phases
  // #27 Nemesis persistente
  nemesisPursuitLevel: number; // 0-5, increases each invasion
  nemesisLastSeenLocation: string | null;
  nemesisLastSeenTurn: number;
  // #45 Randomizer Mode
  randomizerMode: boolean;
  randomizedLocationData: RandomizedLocationData | null;
  // Safe Room & Item Box
  currentSubArea: string | null;
  itemBoxItems: ItemInstance[];
  searchedSafeRooms: string[]; // location IDs whose safe room has been searched
  // Document read tracking
  readDocuments: string[]; // document IDs that have been opened/read
  // Admin data refresh version (incremented on refreshGameData)
  dataVersion: number;
}

// ==========================================
// #45 - RANDOMIZER
// ==========================================

export interface RandomizedLocationData {
  locations: Record<string, {
    enemyPool: string[];
    itemPool: { itemId: string; chance: number; quantity: number }[];
    nextLocations: string[];
    isBossArea: boolean;
    bossEnemy?: string;
    lockedLocations?: { locationId: string; requiredItemId: string; lockedMessage: string }[];
    encounterRate: number;
  }>;
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
  // DB-backed quest fields (optional, used by quest-helper)
  npcId?: string;
  sortOrder?: number;
  prerequisiteQuestId?: string;
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
