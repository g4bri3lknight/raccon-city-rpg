import { setDifficultyConfigs } from './difficulty';
import { CraftingRecipe } from './crafting';
import { getCustomPassiveDescription as _getCustomPassiveDescription } from './characters';
import { ENEMY_IMAGES, CHARACTER_IMAGES } from './enemies';
import { rebuildWeaponModsFromItems } from './weapon-mods';
import { rebuildEquipmentFromItems } from './equipment';
import type { ItemDefinition, ItemType, Rarity, LocationDefinition, MultiStepQuest } from '../types';
import type { DynamicEvent, DynamicEventType } from '../types';
import type { GameDocument, DocumentType } from '../types';
import type { NPCQuest, GameNPC, NPCTradeItem, CharacterArchetype, ItemInstance, SpecialAbilityDefinition, Archetype } from '../types';
import type { EnemyDefinition, BossPhase, LootEntry, EnemyAbility, SecretRoom, SpecialEffect, DifficultyConfig, AchievementDefinition, EndingDefinition, AvatarDefinition } from '../types';

export let ITEMS: Record<string, ItemDefinition> = {};
export let DYNAMIC_EVENTS: Record<string, DynamicEvent> = {};
export let DOCUMENTS: Record<string, GameDocument> = {};
export let QUESTS: Record<string, NPCQuest> = {};
export let LOCATIONS: Record<string, LocationDefinition> = {};
export let NPCS_DATA: Record<string, GameNPC> = {};
export let CHARACTERS_DATA: CharacterArchetype[] = [];
export let SPECIALS_DATA: SpecialAbilityDefinition[] = [];
export let ENEMIES_DATA: Record<string, EnemyDefinition> = {};
export let ENEMY_ABILITIES_DATA: Record<string, EnemyAbility> = {};
export let SECRET_ROOMS_DATA: Record<string, SecretRoom> = {};
export let RECIPES_DATA: CraftingRecipe[] = [];
export let BOSS_PHASES_DATA: Record<string, BossPhase[]> = {};
export let ACHIEVEMENTS_DATA: Record<string, AchievementDefinition> = {};
export let ENDINGS_DATA: Record<string, EndingDefinition> = {};
export let AVATARS_DATA: AvatarDefinition[] = [];
export let QUEST_CHAINS_DATA: Record<string, MultiStepQuest> = {};
export let NPC_QUEST_CHAIN_MAP: Record<string, string> = {};

// Backward compat aliases
export { NPCS_DATA as NPCS };
export { ENDINGS_DATA as ENDINGS };
export { CHARACTERS_DATA as CHARACTER_ARCHETYPES };
export { SPECIALS_DATA as ALL_SPECIAL_ABILITIES };

// Re-export secret rooms (DB-loaded)
export { SECRET_ROOMS_DATA as SECRET_ROOMS };

// Re-export image maps
export { ENEMY_IMAGES, CHARACTER_IMAGES };

// ── Note: mapDanger is now always stored as resolved 0-3 in the DB.
// The API calculates auto danger on save, so the loader just reads the value.
// The shared formula lives in src/lib/danger-calculator.ts for use by both API and game.

// Boss phases — loaded from DB at runtime
export { BOSS_PHASES_DATA as BOSS_PHASES };

// Achievements — loaded from DB at runtime
export { ACHIEVEMENTS_DATA as ACHIEVEMENTS };

// Avatars — loaded from DB at runtime
export { AVATARS_DATA as PREDEFINED_AVATARS };

// Computed config: rebuilt from loaded character data on each load
export let ARCHETYPE_STAT_POINTS: Record<string, { hp: number; atk: number; def: number; spd: number }> = {};
export let ARCHETYPE_SPECIAL_MAP: Record<string, { special1: string; special2: string }> = {};
export let ARCHETYPE_CATEGORY_MAP: Record<string, string> = {};

// Custom character config — loaded from GameSetting DB
export let CUSTOM_STAT_BUDGET: { totalPoints: number; minPerStat: number; maxPerStat: number; defaults: { hp: number; atk: number; def: number; spd: number } } = {
  totalPoints: 50, minPerStat: 5, maxPerStat: 25, defaults: { hp: 10, atk: 12, def: 10, spd: 8 },
};

// Combat constants — loaded from GameSetting DB
export let COMBAT_CONFIG: Record<string, number> = {
  missChance: 8, baseCritChance: 10, dpsCritChance: 25, critMultiplier: 1.8,
  defenseConstant: 50, defendMultiplier: 1.8, maxDefendReduction: 0.9,
  adrenalineDmgBonus: 1.25, controlStatusBonus: 20,
  healerCritHealChance: 20, healerCritHealMult: 1.5,
  damageVarianceMin: 85, damageVarianceMax: 115,
  noMissDmgVarianceMin: 90, noMissDmgVarianceMax: 110,
  defaultStatusDuration: 3, defaultCooldown: 2,
  speed: 1.0,
  summaryDisplayTime: 3.5,
  enemyScalingPerLevel: 2,
  enemyScalingCap: 40,
  fleeBaseChance: 30,
  fleeSpdWeight: 5,
  fleeMinChance: 10,
  fleeMaxChance: 80,
};

// Game info config — loaded from GameSetting DB
export let GAME_CONFIG: { version: string; versionDate: string; versionChangelog: string } = {
  version: '1.23.0',
  versionDate: '',
  versionChangelog: '',
};

// Combat boolean settings — loaded from GameSetting DB
export let COMBAT_BOOL_CONFIG: Record<string, boolean> = {
  autoUseItems: true,
};

// Reputation config — loaded from GameSetting DB
export let REPUTATION_CONFIG: Record<string, number> = {
  discountThreshold1: 4,   // -1 price discount
  discountThreshold2: 7,   // -2 price discount
  discountAmount1: 1,
  discountAmount2: 2,
  questRepGain: 2,
  suspiciousThreshold: -2,
};

// NG+ config — loaded from GameSetting DB
export let NGPLUS_CONFIG: Record<string, number | string> = {
  cycle1Multiplier: 1.15,
  cycle2Multiplier: 1.30,
  cycle3PlusMultiplier: 1.50,
  carriedCraftPointsPercent: 30,
  bonusItemCycle: 2,        // minimum cycle to get bonus items
  bonusItemId: 'antidote',
  bonusItemQuantity: 2,
};

/** Helper: get combat delay in ms adjusted by speed setting.
 *  Higher speed = shorter delay. Clamped to min 50ms. */
export function getCombatDelay(baseMs: number): number {
  const speed = Math.max(0.1, COMBAT_CONFIG.speed || 1.0);
  return Math.max(50, Math.round(baseMs / speed));
}

let CUSTOM_STARTING_ITEM_IDS: { itemId: string; quantity: number }[] = [
  { itemId: 'pipe', quantity: 1 },
  { itemId: 'bandage', quantity: 2 },
  { itemId: 'herb_green', quantity: 2 },
];

// Create starting item instances from DB-loaded config + ITEMS registry
export function getCustomStartingItems(_baseArchetype?: Archetype): ItemInstance[] {
  return CUSTOM_STARTING_ITEM_IDS.map((entry) => {
    const itemDef = ITEMS[entry.itemId];
    if (!itemDef) return null;
    const uid = `${entry.itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      uid,
      itemId: itemDef.id,
      name: itemDef.name,
      description: itemDef.description,
      type: itemDef.type,
      rarity: itemDef.rarity,
      icon: itemDef.icon,
      usable: itemDef.usable,
      equippable: itemDef.equippable,
      effects: itemDef.effects,
      quantity: entry.quantity,
    } as ItemInstance;
  }).filter(Boolean) as ItemInstance[];
}

// Re-export helper function from characters module
export { _getCustomPassiveDescription as getCustomPassiveDescription };

// Enemies loaded from DB, aliased as ENEMIES for backward compat
export { ENEMIES_DATA as ENEMIES };

// Cache-bust counter: incremented on every refreshGameData() so img src URLs change
export let DATA_VERSION = 0;

let initialized = false;
let loadingPromise: Promise<void> | null = null;

// ── DB row types (mirror Prisma output) ──

interface DbItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  icon: string;
  usable: boolean;
  equippable: boolean;
  stackable: boolean;
  maxStack: number;
  unico: boolean;
  weaponType: string | null;
  ammoType: string | null;
  modType: string | null;
  effects: string | null;
}

interface DbEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  duration: number;
  encounterRateMod: number;
  enemyStatMult: number;
  searchBonus: boolean;
  damagePerTurn: number;
  triggerChance: number;
  minTurn: number;
  locationIds: string;
  onTriggerMessage: string;
  onEndMessage: string;
  choices: string;
  chainId: string;
  nextEventId: string;
  permanentMapEffect: string;
}

interface DbDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  locationId: string;
  icon: string;
  rarity: string;
  isSecret: boolean;
  hintRequired: string | null;
}

interface DbQuest {
  id: string;
  npcId: string;
  name: string;
  description: string;
  type: string;
  targetId: string;
  targetCount: number;
  rewardItems: string;
  rewardExp: number;
  rewardDialogue: string;
  sortOrder: number;
  prerequisiteQuestId: string | null;
}

interface DbLocation {
  id: string;
  name: string;
  description: string;
  encounterRate: number;
  enemyPool: string;
  itemPool: string;
  storyEvent: string;
  nextLocations: string;
  isBossArea: boolean;
  bossId: string | null;
  ambientText: string;
  lockedLocations: string;
  subAreas: string;
  sortOrder: number;
  searchChance: number | null;
  docChance: number | null;
  searchMax: number | null;
  mapRow: number | null;
  mapCol: number | null;
  mapIcon: string | null;
  mapDanger: number;
  mapDangerAuto: boolean;
  shortName: string | null;
}

interface DbNPC {
  id: string;
  name: string;
  portrait: string;
  locationId: string;
  greeting: string;
  dialogues: string;
  farewell: string;
  questId: string | null;
  tradeInventory: string;
  questCompletedDialogue: string;
  badgeLabel: string;
  badgeIcon: string;
  badgeColor: string;
  sortOrder: number;
  createdAt: Date;
  dynamicDialogues: string;
}

interface DbCharacter {
  id: string;
  archetype: string;
  name: string;
  displayName: string;
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
  passiveDescription: string;
  portraitEmoji: string;
  startingItems: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbSpecial {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetType: string;
  cooldown: number;
  category: string;
  effects: string | null;
  sortOrder: number;
  createdAt: Date;
}

interface DbEnemy {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  icon: string;
  expReward: number;
  lootTable: string;
  abilities: string;
  isBoss: boolean;
  variantGroup: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbEnemyAbility {
  id: string;
  name: string;
  description: string;
  power: number;
  chance: number;
  statusType: string;
  statusChance: number;
  statusDuration: number;
  effects: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  ingredients: string;
  resultItemId: string;
  resultQty: number;
  difficulty: string;
  hidden?: boolean;
  sortOrder: number;
  pointCost?: number;
  pointOnly?: boolean;
  ngPlusOnly?: boolean;
  forceMasterQuality?: boolean;
}

interface DbSecretRoom {
  id: string;
  locationId: string;
  name: string;
  description: string;
  discoveryMethod: string;
  requiredDocumentId: string | null;
  requiredNpcQuestId: string | null;
  searchChance: number;
  hint: string;
  lootTable: string;
  uniqueItemId: string | null;
  uniqueItemQuantity: number | null;
  sortOrder: number;
  createdAt: Date;
}

interface DbBossPhase {
  id: string;
  enemyId: string;
  name: string;
  hpThreshold: number;
  hpMultiplier: number;
  atkMultiplier: number;
  defMultiplier: number;
  spdMultiplier: number;
  newAbilities: string;
  message: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  condition: string;
  hidden: boolean;
  reward: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbEnding {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  requirements: string;
  priority: number;
  sortOrder: number;
  createdAt: Date;
}

interface DbAvatar {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
}

interface DbQuestChain {
  id: string;
  npcId: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbQuestChainStep {
  id: string;
  chainId: string;
  stepIndex: number;
  description: string;
  type: string;
  targetId: string;
  targetCount: number;
  nextStepId: string;
  rewardItems: string;
  rewardExp: number;
  rewardDialogue: string;
  branchChoice: string;
  sortOrder: number;
  createdAt: Date;
}

interface DbQuestChainFinalReward {
  chainId: string;
  rewardItems: string;
  rewardExp: number;
  dialogue: string;
  createdAt: Date;
}

// ── Mappers ──

function mapDbItem(item: DbItem): ItemDefinition {
  // Parse atomic effects array (data-driven system)
  let effects: SpecialEffect[] = [];
  if (item.effects) {
    try {
      const parsed = JSON.parse(item.effects);
      if (Array.isArray(parsed) && parsed.length > 0) {
        effects = parsed as SpecialEffect[];
      }
    } catch { /* ignore invalid JSON */ }
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type as ItemType,
    rarity: item.rarity as Rarity,
    icon: item.icon,
    usable: item.usable,
    equippable: item.equippable,
    stackable: item.stackable ?? true,
    maxStack: item.maxStack ?? 99,
    unico: item.unico ?? false,
    weaponType: item.weaponType ?? undefined,
    ammoType: item.ammoType ?? undefined,
    modType: item.modType ?? undefined,
    effects: effects.length > 0 ? effects : undefined,
  };
}

function mapDbEvent(event: DbEvent): DynamicEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    icon: event.icon,
    type: event.type as DynamicEventType,
    duration: event.duration,
    effect: {
      encounterRateMod: event.encounterRateMod,
      enemyStatMult: event.enemyStatMult,
      searchBonus: event.searchBonus,
      damagePerTurn: event.damagePerTurn,
    },
    triggerChance: event.triggerChance,
    minTurn: event.minTurn,
    locationIds: JSON.parse(event.locationIds || '[]'),
    onTriggerMessage: event.onTriggerMessage,
    onEndMessage: event.onEndMessage,
    choices: JSON.parse(event.choices || '[]'),
    // Chain event fields
    ...(event.chainId ? { chainId: event.chainId } : {}),
    ...(event.nextEventId ? { nextEventId: event.nextEventId } : {}),
    ...(event.permanentMapEffect ? {
      permanentMapEffect: (() => {
        try { return JSON.parse(event.permanentMapEffect); } catch { return undefined; }
      })()
    } : {}),
  };
}

function mapDbDocument(doc: DbDocument): GameDocument {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    type: doc.type as DocumentType,
    locationId: doc.locationId,
    icon: doc.icon || '',
    rarity: doc.rarity as GameDocument['rarity'],
    isSecret: doc.isSecret,
    ...(doc.hintRequired ? { hintRequired: doc.hintRequired } : {}),
  };
}

function mapDbQuest(quest: DbQuest): NPCQuest {
  return {
    id: quest.id,
    npcId: quest.npcId,
    name: quest.name,
    description: quest.description,
    type: quest.type as NPCQuest['type'],
    targetId: quest.targetId,
    targetCount: quest.targetCount,
    rewardItems: JSON.parse(quest.rewardItems || '[]'),
    rewardExp: quest.rewardExp,
    rewardDialogue: JSON.parse(quest.rewardDialogue || '[]'),
    sortOrder: quest.sortOrder,
    prerequisiteQuestId: quest.prerequisiteQuestId ?? undefined,
  };
}

function mapDbLocation(loc: DbLocation): LocationDefinition {
  return {
    id: loc.id,
    name: loc.name,
    description: loc.description,
    backgroundImage: `/api/media/image?id=bg_${loc.id}`,
    encounterRate: loc.encounterRate,
    enemyPool: JSON.parse(loc.enemyPool || '[]'),
    itemPool: JSON.parse(loc.itemPool || '[]'),
    storyEvent: loc.storyEvent ? JSON.parse(loc.storyEvent) : undefined,
    nextLocations: JSON.parse(loc.nextLocations || '[]'),
    isBossArea: loc.isBossArea,
    bossId: loc.bossId ?? undefined,
    ambientText: JSON.parse(loc.ambientText || '[]'),
    lockedLocations: JSON.parse(loc.lockedLocations || '[]'),
    subAreas: JSON.parse(loc.subAreas || '[]'),
    ...(loc.searchChance != null ? { searchChance: loc.searchChance } : {}),
    ...(loc.docChance != null ? { docChance: loc.docChance } : {}),
    ...(loc.searchMax != null ? { searchMax: loc.searchMax } : {}),
    // Map layout fields
    ...(loc.shortName ? { shortName: loc.shortName } : {}),
    ...(loc.mapRow != null ? { mapRow: loc.mapRow } : {}),
    ...(loc.mapCol != null ? { mapCol: loc.mapCol } : {}),
    ...(loc.mapIcon ? { mapIcon: loc.mapIcon } : {}),
    mapDanger: loc.mapDanger ?? 0,
  };
}

function mapDbNpc(row: DbNPC): GameNPC {
  const dialogues: string[] = JSON.parse(row.dialogues || '[]');
  const tradeInventory: NPCTradeItem[] = JSON.parse(row.tradeInventory || '[]');
  const questCompletedDialogue: string[] = JSON.parse(row.questCompletedDialogue || '[]');

  return {
    id: row.id,
    name: row.name,
    portrait: row.portrait,
    locationId: row.locationId,
    greeting: row.greeting,
    dialogues,
    farewell: row.farewell,
    quest: Object.values(QUESTS).find(q => q.npcId === row.id) || undefined,
    tradeInventory: tradeInventory.length > 0 ? tradeInventory : undefined,
    questCompletedDialogue: questCompletedDialogue.length > 0 ? questCompletedDialogue : undefined,
    ...(row.badgeLabel ? { badgeLabel: row.badgeLabel } : {}),
    ...(row.badgeIcon ? { badgeIcon: row.badgeIcon } : {}),
    ...(row.badgeColor ? { badgeColor: row.badgeColor } : {}),
    ...(row.dynamicDialogues ? { dynamicDialogues: JSON.parse(row.dynamicDialogues || '[]') } : {}),
  };
}

function mapDbCharacter(row: DbCharacter): CharacterArchetype {
  const rawItems = JSON.parse(row.startingItems || '[]');
  // Support both full ItemInstance[] and simplified {itemId, quantity, isEquipped}[]
  const startingItems: ItemInstance[] = rawItems.map((r: Record<string, unknown>) => {
    // If it has a uid and itemId, treat as full ItemInstance — but enrich from ITEMS dict
    if (r.uid && r.itemId && r.name) {
      const itemDef = ITEMS[String(r.itemId)];
      return {
        ...r,
        effects: itemDef?.effects ?? (r as ItemInstance).effects,
      } as ItemInstance;
    }
    // Simplified format: expand using ITEMS lookup
    const itemId = String(r.itemId ?? r.id ?? '');
    const itemDef = ITEMS[itemId];
    if (!itemDef) return null;
    const qty = typeof r.quantity === 'number' ? r.quantity : 1;
    const isEquipped = !!r.isEquipped;
    return {
      uid: `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemId: itemDef.id,
      name: itemDef.name,
      description: itemDef.description,
      type: itemDef.type,
      rarity: itemDef.rarity,
      icon: itemDef.icon,
      usable: itemDef.usable,
      equippable: itemDef.equippable,
      effects: itemDef.effects,
      quantity: qty,
      isEquipped,
    } as ItemInstance;
  }).filter(Boolean) as ItemInstance[];

  return {
    id: row.id as CharacterArchetype['id'],
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    maxHp: row.maxHp,
    atk: row.atk,
    def: row.def,
    spd: row.spd,
    specialName: row.specialName,
    specialDescription: row.specialDescription,
    specialCost: row.specialCost,
    special2Name: row.special2Name,
    special2Description: row.special2Description,
    special2Cost: row.special2Cost,
    passiveDescription: row.passiveDescription,
    portraitEmoji: row.portraitEmoji,
    startingItems,
  };
}

function mapDbSpecial(row: DbSpecial): SpecialAbilityDefinition {
  // Parse effects JSON array
  let effects: SpecialEffect[] = [];
  try {
    if (row.effects) {
      const parsed = JSON.parse(row.effects);
      if (Array.isArray(parsed)) {
        effects = parsed as SpecialEffect[];
      }
    }
  } catch { /* ignore parse errors, use empty array */ }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    targetType: row.targetType as SpecialAbilityDefinition['targetType'],
    cooldown: row.cooldown,
    category: row.category as SpecialAbilityDefinition['category'],
    effects,
  };
}

function mapDbEnemy(row: DbEnemy): EnemyDefinition {
  let lootTable: LootEntry[] = [];
  try { lootTable = JSON.parse(row.lootTable || '[]'); } catch { lootTable = []; }
  // abilities can be: array of IDs (new format) or array of full objects (old/static format)
  let abilities: EnemyAbility[] = [];
  try {
    const parsed = JSON.parse(row.abilities || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === 'string') {
        // New format: array of ability IDs — resolve from ENEMY_ABILITIES_DATA
        abilities = parsed.map((id: string) => ENEMY_ABILITIES_DATA[id]).filter(Boolean);
      } else {
        // Old format: array of full ability objects (backward compat)
        abilities = parsed;
      }
    }
  } catch { abilities = []; }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    maxHp: row.maxHp,
    atk: row.atk,
    def: row.def,
    spd: row.spd,
    icon: row.icon,
    expReward: row.expReward,
    lootTable,
    abilities,
    isBoss: row.isBoss,
    ...(row.variantGroup ? { variantGroup: row.variantGroup } : {}),
  };
}

function loadEnemyAbilities(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  ENEMY_ABILITIES_DATA = {};
  if (api?.enemyAbilities && api.enemyAbilities.length > 0) {
    for (const row of api.enemyAbilities) {
      const ab = row as DbEnemyAbility;
      const ability: EnemyAbility = {
        id: ab.id,
        name: ab.name,
        description: ab.description,
        power: ab.power,
        chance: ab.chance,
      };
      // Parse atomic effects array
      if (ab.effects) {
        try {
          const parsed = JSON.parse(ab.effects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            ability.effects = parsed as SpecialEffect[];
          }
        } catch { /* ignore invalid JSON */ }
      }
      ENEMY_ABILITIES_DATA[ab.id] = ability;
    }
  }
}

function mapDbSecretRoom(row: DbSecretRoom): SecretRoom {
  let lootTable: SecretRoom['lootTable'] = [];
  try { lootTable = JSON.parse(row.lootTable || '[]'); } catch { lootTable = []; }
  return {
    id: row.id,
    locationId: row.locationId,
    name: row.name,
    description: row.description,
    discoveryMethod: row.discoveryMethod as SecretRoom['discoveryMethod'],
    ...(row.requiredDocumentId ? { requiredDocumentId: row.requiredDocumentId } : {}),
    ...(row.requiredNpcQuestId ? { requiredNpcQuestId: row.requiredNpcQuestId } : {}),
    searchChance: row.searchChance,
    hint: row.hint,
    lootTable,
    ...(row.uniqueItemId ? { uniqueItem: { itemId: row.uniqueItemId, quantity: row.uniqueItemQuantity || 1 } } : {}),
  };
}

function loadRecipes(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  if (api?.recipes && api.recipes.length > 0) {
    RECIPES_DATA = (api.recipes as DbRecipe[]).map(row => {
      let ingredients: CraftingRecipe['ingredients'] = [];
      try { ingredients = JSON.parse(row.ingredients || '[]'); } catch { ingredients = []; }
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category as CraftingRecipe['category'],
        ingredients,
        result: { itemId: row.resultItemId, quantity: row.resultQty },
        difficulty: row.difficulty as CraftingRecipe['difficulty'],
        ...(row.hidden ? { hidden: true } : {}),
        ...(row.pointCost != null ? { pointCost: row.pointCost } : {}),
        ...(row.pointOnly ? { pointOnly: true } : {}),
        ...(row.ngPlusOnly ? { ngPlusOnly: true } : {}),
        ...(row.forceMasterQuality ? { forceMasterQuality: true } : {}),
      };
    });
    // RECIPES_DATA is now the canonical export (no longer writes back to crafting.ts)
  } else {
    RECIPES_DATA = [];
  }
}

function loadSecretRooms(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  SECRET_ROOMS_DATA = {};
  if (api?.secretRooms && api.secretRooms.length > 0) {
    for (const row of api.secretRooms) {
      SECRET_ROOMS_DATA[row.id] = mapDbSecretRoom(row as DbSecretRoom);
    }
  }
}

function loadBossPhases(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  BOSS_PHASES_DATA = {};
  if (api?.bossPhases && api.bossPhases.length > 0) {
    for (const row of api.bossPhases) {
      const phase = row as DbBossPhase;
      // Parse newAbilities JSON — resolve ability IDs to full EnemyAbility objects
      let newAbilities: EnemyAbility[] = [];
      try {
        const abilityIds: string[] = JSON.parse(phase.newAbilities || '[]');
        if (Array.isArray(abilityIds)) {
          newAbilities = abilityIds.map((id: string) => ENEMY_ABILITIES_DATA[id]).filter(Boolean);
        }
      } catch { /* ignore parse errors */ }

      const bossPhase: BossPhase = {
        id: phase.id,
        name: phase.name,
        hpThreshold: phase.hpThreshold,
        hpMultiplier: phase.hpMultiplier,
        atkMultiplier: phase.atkMultiplier,
        defMultiplier: phase.defMultiplier,
        spdMultiplier: phase.spdMultiplier,
        message: phase.message,
        ...(newAbilities.length > 0 ? { newAbilities } : {}),
      };

      if (!BOSS_PHASES_DATA[phase.enemyId]) {
        BOSS_PHASES_DATA[phase.enemyId] = [];
      }
      BOSS_PHASES_DATA[phase.enemyId].push(bossPhase);
    }
  }
}

function loadAchievements(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  ACHIEVEMENTS_DATA = {};
  if (api?.achievements && api.achievements.length > 0) {
    for (const row of api.achievements) {
      const ach = row as DbAchievement;
      ACHIEVEMENTS_DATA[ach.id] = {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category as AchievementDefinition['category'],
        condition: ach.condition,
        hidden: ach.hidden,
        reward: ach.reward || undefined,
      };
    }
  }
}

async function loadEndings(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  ENDINGS_DATA = {};
  if (api?.endings && api.endings.length > 0) {
    for (const row of api.endings) {
      const e = row as DbEnding;
      let requirements: EndingDefinition['requirements'] = [];
      try {
        const parsed = JSON.parse(e.requirements || '[]');
        if (Array.isArray(parsed)) {
          requirements = parsed as EndingDefinition['requirements'];
        }
      } catch { /* ignore parse errors */ }

      ENDINGS_DATA[e.id] = {
        id: e.id as EndingDefinition['id'],
        title: e.title,
        subtitle: e.subtitle,
        description: e.description,
        icon: e.icon,
        color: e.color,
        requirements,
        priority: e.priority,
      };
    }
  }
}

async function loadAvatars(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  AVATARS_DATA = [];
  if (api?.avatars && api.avatars.length > 0) {
    AVATARS_DATA = (api.avatars as DbAvatar[]).map(row => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      sortOrder: row.sortOrder,
    }));
  }
}

function loadQuestChains(api: Awaited<ReturnType<typeof loadFromApi>>): void {
  QUEST_CHAINS_DATA = {};
  NPC_QUEST_CHAIN_MAP = {};
  if (api?.questChains && api.questChains.length > 0) {
    const chains = api.questChains as DbQuestChain[];
    const steps = (api.questChainSteps || []) as DbQuestChainStep[];
    const rewards = (api.questChainFinalRewards || []) as DbQuestChainFinalReward[];

    for (const chain of chains) {
      // Get steps for this chain
      const chainSteps = steps
        .filter(s => s.chainId === chain.id)
        .sort((a, b) => a.stepIndex - b.stepIndex);

      // Get final reward for this chain
      const fr = rewards.find(r => r.chainId === chain.id);
      let finalReward = { items: [], exp: 0, dialogue: [] };
      if (fr) {
        try { finalReward.items = JSON.parse(fr.rewardItems || '[]'); } catch {}
        finalReward.exp = fr.rewardExp || 0;
        try { finalReward.dialogue = JSON.parse(fr.dialogue || '[]'); } catch {}
      }

      // Build MultiStepQuest object
      const multiSteps = chainSteps.map(step => {
        let rewardItems = [];
        try { rewardItems = JSON.parse(step.rewardItems || '[]'); } catch {}
        let rewardDialogue = [];
        try { rewardDialogue = JSON.parse(step.rewardDialogue || '[]'); } catch {}
        let branchChoice = undefined;
        try {
          if (step.branchChoice) branchChoice = JSON.parse(step.branchChoice);
        } catch {}

        return {
          id: step.id,
          description: step.description,
          type: step.type as any,
          targetId: step.targetId,
          targetCount: step.targetCount,
          nextStepId: step.nextStepId,
          reward: {
            items: rewardItems,
            exp: step.rewardExp,
            dialogue: rewardDialogue,
          },
          ...(branchChoice ? { branchChoice } : {}),
        };
      });

      QUEST_CHAINS_DATA[chain.id] = {
        id: chain.id,
        npcId: chain.npcId,
        name: chain.name,
        description: chain.description,
        steps: multiSteps,
        finalReward,
      };

      // Build NPC→chain map
      NPC_QUEST_CHAIN_MAP[chain.npcId] = chain.id;
    }
  }
}

async function loadGameSettings(): Promise<void> {
  try {
    const resp = await fetch('/api/game-settings');
    if (!resp.ok) return;
    const settings: Record<string, string> = await resp.json();

    // Difficulty configs
    const configs: Record<string, DifficultyConfig> = {};
    for (const key of ['sopravvissuto', 'normale', 'incubo']) {
      const raw = settings[`difficulty.${key}`];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.label) {
            configs[key] = parsed as DifficultyConfig;
          }
        } catch { /* skip invalid JSON */ }
      }
    }
    if (Object.keys(configs).length > 0) {
      setDifficultyConfigs(configs);
    }

    // Custom character stat budget
    const budgetRaw = settings['customCharacter.statBudget'];
    if (budgetRaw) {
      try {
        const parsed = JSON.parse(budgetRaw);
        if (parsed && typeof parsed === 'object' && parsed.totalPoints) {
          CUSTOM_STAT_BUDGET = parsed;
        }
      } catch { /* keep default */ }
    }

    // Custom character starting items
    const itemsRaw = settings['customCharacter.startingItems'];
    if (itemsRaw) {
      try {
        const parsed = JSON.parse(itemsRaw);
        if (Array.isArray(parsed)) {
          CUSTOM_STARTING_ITEM_IDS = parsed;
        }
      } catch { /* keep default */ }
    }

    // Game info config
    const rawVersion = settings['game.version'];
    if (rawVersion) GAME_CONFIG.version = rawVersion;
    const rawVersionDate = settings['game.versionDate'];
    if (rawVersionDate) GAME_CONFIG.versionDate = rawVersionDate;
    const rawChangelog = settings['game.versionChangelog'];
    if (rawChangelog) GAME_CONFIG.versionChangelog = rawChangelog;

    // Combat constants
    for (const [key, defaultValue] of Object.entries(COMBAT_CONFIG)) {
      const raw = settings[`combat.${key}`];
      if (raw) {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) COMBAT_CONFIG[key] = parsed;
      }
    }

    // Combat boolean settings
    for (const [key, defaultValue] of Object.entries(COMBAT_BOOL_CONFIG)) {
      const raw = settings[`combat.${key}`];
      if (raw !== undefined) {
        COMBAT_BOOL_CONFIG[key] = raw === 'true';
      }
    }

    // Reputation config
    for (const key of Object.keys(REPUTATION_CONFIG)) {
      const raw = settings[`reputation.${key}`];
      if (raw !== undefined) {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) REPUTATION_CONFIG[key] = parsed;
      }
    }

    // NG+ config
    for (const key of Object.keys(NGPLUS_CONFIG)) {
      const raw = settings[`ngplus.${key}`];
      if (raw !== undefined) {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) NGPLUS_CONFIG[key] = parsed;
      }
    }

    // Apply theme settings as CSS variables on .game-root
    try {
      const { applyThemeSettings } = await import('@/game/store/settings-cache');
      applyThemeSettings(settings);
    } catch { /* theme application is optional */ }
  } catch {
    /* keep defaults */
  }
}

// ── Rebuild computed config from loaded data ──

function rebuildStatPoints(): void {
  const pts: typeof ARCHETYPE_STAT_POINTS = {};
  for (const char of CHARACTERS_DATA) {
    const hp = Math.round(char.maxHp / 10);
    pts[char.id] = { hp, atk: char.atk, def: char.def, spd: char.spd };
  }
  // Default for 'custom' archetype — use DB-loaded budget defaults
  pts.custom = { ...CUSTOM_STAT_BUDGET.defaults };
  ARCHETYPE_STAT_POINTS = pts;
}

function rebuildSpecialMap(): void {
  const spMap: typeof ARCHETYPE_SPECIAL_MAP = {};
  const catMap: typeof ARCHETYPE_CATEGORY_MAP = {};

  // Build from loaded characters + specials data
  // IMPORTANT: This must be called AFTER both loadCharacters and loadSpecials have completed.
  for (const char of CHARACTERS_DATA) {
    // Find special by name to get its ID
    const spec1 = SPECIALS_DATA.find(s => s.name === char.specialName);
    const spec2 = SPECIALS_DATA.find(s => s.name === char.special2Name);
    // Always create entry for the archetype (even if one special is missing)
    spMap[char.id] = {
      special1: spec1?.id ?? '',
      special2: spec2?.id ?? '',
    };
    // Determine category from first special
    if (spec1) {
      catMap[char.id] = spec1.category;
    }
  }

  ARCHETYPE_SPECIAL_MAP = spMap;
  ARCHETYPE_CATEGORY_MAP = catMap;
}

// ── Load from API ──

async function loadFromApi(): Promise<{
  items: DbItem[];
  events: DbEvent[];
  documents: DbDocument[];
  quests: DbQuest[];
  locations: DbLocation[];
  npcs: DbNPC[];
  characters: DbCharacter[];
  specials: DbSpecial[];
  enemies: DbEnemy[];
  enemyAbilities: DbEnemyAbility[];
  secretRooms: DbSecretRoom[];
  recipes: DbRecipe[];
  bossPhases: DbBossPhase[];
  achievements: DbAchievement[];
  endings: DbEnding[];
  avatars: DbAvatar[];
  questChains: DbQuestChain[];
  questChainSteps: DbQuestChainStep[];
  questChainFinalRewards: DbQuestChainFinalReward[];
} | null> {
  try {
    const resp = await fetch('/api/game-data');
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function loadItems(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  ITEMS = {};
  if (api?.items && api.items.length > 0) {
    for (const item of api.items) {
      ITEMS[item.id] = mapDbItem(item);
    }
  }
}

async function loadEvents(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  DYNAMIC_EVENTS = {};
  if (api?.events && api.events.length > 0) {
    for (const event of api.events) {
      DYNAMIC_EVENTS[event.id] = mapDbEvent(event);
    }
  }
}

async function loadDocuments(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  DOCUMENTS = {};
  if (api?.documents && api.documents.length > 0) {
    for (const doc of api.documents) {
      DOCUMENTS[doc.id] = mapDbDocument(doc);
    }
  }
}

async function loadQuests(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  QUESTS = {};
  if (api?.quests && api.quests.length > 0) {
    for (const quest of api.quests) {
      QUESTS[quest.id] = mapDbQuest(quest);
    }
  }
}

async function loadLocations(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  LOCATIONS = {};
  if (api?.locations && api.locations.length > 0) {
    for (const loc of api.locations) {
      LOCATIONS[loc.id] = mapDbLocation(loc);
    }
  }
}

async function loadNpcs(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  NPCS_DATA = {};
  if (api?.npcs && api.npcs.length > 0) {
    for (const row of api.npcs) {
      NPCS_DATA[row.id] = mapDbNpc(row);
    }
  }
}

async function loadCharacters(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  CHARACTERS_DATA = [];
  if (api?.characters && api.characters.length > 0) {
    for (const row of api.characters) {
      CHARACTERS_DATA.push(mapDbCharacter(row));
    }
  }
  // Rebuild stat points (does NOT depend on specials)
  rebuildStatPoints();
  // NOTE: rebuildSpecialMap() is NOT called here because SPECIALS_DATA
  // may not be loaded yet (runs in parallel via Promise.all).
  // It is called after Promise.all resolves in initGameData/refreshGameData.
}

async function loadSpecials(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  SPECIALS_DATA = [];
  if (api?.specials && api.specials.length > 0) {
    for (const row of api.specials) {
      SPECIALS_DATA.push(mapDbSpecial(row));
    }
  }
}

async function loadEnemies(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  ENEMIES_DATA = {};
  if (api?.enemies && api.enemies.length > 0) {
    for (const row of api.enemies) {
      ENEMIES_DATA[row.id] = mapDbEnemy(row);
    }
  }
}

export async function initGameData(): Promise<void> {
  if (initialized) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const api = await loadFromApi();
      // Items MUST load first — mapDbCharacter references ITEMS to build starting items
      await loadItems(api);
      await Promise.all([
        loadEvents(api),
        loadDocuments(api),
        loadQuests(api),
        loadLocations(api),
        loadNpcs(api),
        loadCharacters(api),
        loadSpecials(api),
        loadEnemyAbilities(api),
        loadEnemies(api),
        loadSecretRooms(api),
        loadRecipes(api),
        loadAchievements(api),
        loadEndings(api),
        loadAvatars(api),
        loadQuestChains(api),
        loadGameSettings(),
      ]);
      // Boss phases must load AFTER enemy abilities (resolves ability IDs)
      loadBossPhases(api);
      // Rebuild archetype→special map AFTER both characters AND specials are loaded
      // (previously was called inside loadCharacters before specials were available — race condition!)
      rebuildSpecialMap();
      // Rebuild equipment/mod lookups from loaded ITEMS
      rebuildWeaponModsFromItems();
      rebuildEquipmentFromItems();
      initialized = true;
    } finally {
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

/** Force reload all data from DB (used after admin CRUD operations) */
export async function refreshGameData(): Promise<void> {
  initialized = false;
  const api = await loadFromApi();
  // Items MUST load first — mapDbCharacter references ITEMS to build starting items
  await loadItems(api);
  await Promise.all([
    loadEvents(api),
    loadDocuments(api),
    loadQuests(api),
    loadLocations(api),
    loadNpcs(api),
    loadCharacters(api),
    loadSpecials(api),
    loadEnemyAbilities(api),
    loadEnemies(api),
    loadSecretRooms(api),
    loadRecipes(api),
    loadAchievements(api),
    loadEndings(api),
    loadAvatars(api),
    loadQuestChains(api),
    loadGameSettings(),
  ]);
  // Boss phases must load AFTER enemy abilities (resolves ability IDs)
  loadBossPhases(api);
  // Rebuild archetype→special map AFTER both characters AND specials are loaded
  rebuildSpecialMap();
  // Rebuild equipment/mod lookups from loaded ITEMS
  rebuildWeaponModsFromItems();
  rebuildEquipmentFromItems();
  DATA_VERSION++;
  initialized = true;
}

// ==========================================
// EFFECTS INTEGRITY VALIDATION
// ==========================================

interface EmptyEffectEntry {
  name: string;
  source: string; // "Speciale giocatore" | "Abilità nemico" | "Fase boss"
}

/**
 * Validates that all specials and enemy abilities have non-empty effects[].
 * Call after initGameData() to detect data configuration issues.
 * Returns null if everything is OK, or an array of problematic entries.
 */
export function validateEffectsIntegrity(): EmptyEffectEntry[] | null {
  const problems: EmptyEffectEntry[] = [];

  // 1. Check player specials
  const allSpecials = SPECIALS_DATA;
  for (const spec of allSpecials) {
    if (!spec.effects || spec.effects.length === 0) {
      problems.push({ name: spec.name || spec.id, source: 'Speciale giocatore' });
    }
  }

  // 2. Check enemy abilities (from ENEMY_ABILITIES_DATA)
  for (const [id, ability] of Object.entries(ENEMY_ABILITIES_DATA)) {
    if (!ability.effects || ability.effects.length === 0) {
      problems.push({ name: ability.name || id, source: 'Abilità nemico' });
    }
  }

  // 3. Check enemy abilities embedded in ENEMIES_DATA
  const allEnemies = ENEMIES_DATA;
  for (const [enemyId, enemyDef] of Object.entries(allEnemies)) {
    for (const ab of enemyDef.abilities) {
      if (!ab.effects || ab.effects.length === 0) {
        problems.push({ name: `${ab.name} (${enemyDef.name})`, source: 'Abilità nemico' });
      }
    }
  }

  // 4. Check boss phase abilities
  for (const [bossId, phases] of Object.entries(BOSS_PHASES_DATA)) {
    for (const phase of phases) {
      if (phase.newAbilities) {
        for (const ab of phase.newAbilities) {
          if (!ab.effects || ab.effects.length === 0) {
            problems.push({ name: `${ab.name} (${bossId} - ${phase.name})`, source: 'Fase boss' });
          }
        }
      }
    }
  }

  return problems.length > 0 ? problems : null;
}

/** Get a special ability by ID from loaded data */
export function getSpecialById(id: string): SpecialAbilityDefinition | undefined {
  return SPECIALS_DATA.find(s => s.id === id);
}

/**
 * Append cache-bust query param to a media image URL.
 * Pass the current dataVersion from useGameStore so React re-renders when it changes.
 */
export function mediaUrl(idOrPath: string, version: number): string {
  const sep = idOrPath.includes('?') ? '&' : '?';
  return `${idOrPath}${sep}_v=${version}`;
}
