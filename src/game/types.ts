// ==========================================
// RACCOON CITY ESCAPE - Game Types
// ==========================================

export type GamePhase = 'title' | 'character-select' | 'character-creator' | 'exploration' | 'combat' | 'event' | 'inventory' | 'game-over' | 'victory';

export type Archetype = 'tank' | 'healer' | 'dps' | 'control' | 'custom';

export type StatusEffect = 'poison' | 'bleeding' | 'stunned' | 'none';

export type ItemType = 'weapon' | 'healing' | 'ammo' | 'utility' | 'antidote' | 'bag' | 'collectible';

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
  type: 'heal' | 'cure' | 'damage_boost' | 'defense_boost' | 'add_ammo' | 'add_slots' | 'kill_all';
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
  statusEffect?: {
    type: StatusEffect;
    chance: number;
    duration?: number;
  };
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
}

// ==========================================
// LOCATIONS
// ==========================================

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
  };
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
// GAME STATE
// ==========================================

export interface GameNotification {
  id: string;
  type: 'encounter' | 'item_found' | 'bag_expand' | 'victory' | 'defeat' | 'collectible_found';
  message: string;
  icon?: string;
  subMessage?: string;
  characterId?: string;
  // Victory-specific
  lootNames?: string[];
  levelUps?: string[];
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
  difficulty: 'normal' | 'hard';
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
}
