import { STATIC_ITEMS } from './items';
import { EQUIPMENT_ITEM_DEFINITIONS, MOD_ITEM_DEFINITIONS } from './equipment';
import { STATIC_DYNAMIC_EVENTS } from './dynamic-events';
import { STATIC_DOCUMENTS } from './documents';
import { STATIC_LOCATIONS } from './locations';
import { NPCS as STATIC_NPCS } from './npcs';
import { CHARACTER_ARCHETYPES as STATIC_CHARACTERS, ARCHETYPE_STAT_POINTS as STATIC_STAT_POINTS, getCustomStartingItems as _getCustomStartingItems, getCustomPassiveDescription as _getCustomPassiveDescription } from './characters';
import { ALL_SPECIAL_ABILITIES as STATIC_SPECIALS, ARCHETYPE_SPECIAL_MAP as STATIC_SPECIAL_MAP, ARCHETYPE_CATEGORY_MAP as STATIC_CATEGORY_MAP } from './specials';
import { ENEMIES as STATIC_ENEMIES, ENEMY_IMAGES, CHARACTER_IMAGES, BOSS_PHASES } from './enemies';
import type { ItemDefinition, ItemType, Rarity, ItemEffect, LocationDefinition } from '../types';
import type { DynamicEvent, DynamicEventType } from '../types';
import type { GameDocument, DocumentType } from '../types';
import type { NPCQuest, GameNPC, NPCTradeItem, CharacterArchetype, ItemInstance, SpecialAbilityDefinition } from '../types';
import type { EnemyDefinition, BossPhase, LootEntry, EnemyAbility, StatusEffect } from '../types';

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

// Backward compat aliases
export { NPCS_DATA as NPCS };
export { CHARACTERS_DATA as CHARACTER_ARCHETYPES };
export { SPECIALS_DATA as ALL_SPECIAL_ABILITIES };

// Re-export image maps (these are URL templates, no DB storage)
export { ENEMY_IMAGES, CHARACTER_IMAGES, BOSS_PHASES };

// Computed config: rebuilt from loaded character data on each load
export let ARCHETYPE_STAT_POINTS = { ...STATIC_STAT_POINTS };
export let ARCHETYPE_SPECIAL_MAP = { ...STATIC_SPECIAL_MAP };
export let ARCHETYPE_CATEGORY_MAP = { ...STATIC_CATEGORY_MAP };

// Re-export helper functions from characters module
export { _getCustomStartingItems as getCustomStartingItems, _getCustomPassiveDescription as getCustomPassiveDescription };

// Enemies loaded from DB, aliased as ENEMIES for backward compat
export { ENEMIES_DATA as ENEMIES };

// Cache-bust counter: incremented on every refreshGameData() so img src URLs change
export let DATA_VERSION = 0;

let initialized = false;

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
  effectType: string | null;
  effectValue: number | null;
  effectTarget: string | null;
  effectStatusCured: string | null;
  // … other fields we don't need for the in-memory map
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
  mapRow: number | null;
  mapCol: number | null;
  mapIcon: string | null;
  mapDanger: string | null;
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
  sortOrder: number;
  createdAt: Date;
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
  executionType: string;
  powerMultiplier: number | null;
  healAmount: number | null;
  statusToApply: Record<string, unknown> | null;
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
  sortOrder: number;
  createdAt: Date;
}

// ── Mappers ──

function mapDbItem(item: DbItem): ItemDefinition {
  let effect: ItemEffect | undefined = undefined;
  if (item.effectType) {
    effect = {
      type: item.effectType as ItemEffect['type'],
      value: item.effectValue || 0,
      target: item.effectTarget as ItemEffect['target'],
      statusCured: item.effectStatusCured ? JSON.parse(item.effectStatusCured) : undefined,
    };
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
    effect,
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
    tradeInventory: tradeInventory.length > 0 ? tradeInventory : undefined,
    questCompletedDialogue: questCompletedDialogue.length > 0 ? questCompletedDialogue : undefined,
  };
}

function mapDbCharacter(row: DbCharacter): CharacterArchetype {
  const startingItems: ItemInstance[] = JSON.parse(row.startingItems || '[]');

  return {
    id: row.archetype as CharacterArchetype['id'],
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
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    targetType: row.targetType as SpecialAbilityDefinition['targetType'],
    cooldown: row.cooldown,
    category: row.category as SpecialAbilityDefinition['category'],
    executionType: row.executionType,
    ...(row.powerMultiplier != null ? { powerMultiplier: row.powerMultiplier } : {}),
    ...(row.healAmount != null ? { healAmount: row.healAmount } : {}),
    ...(row.statusToApply ? { statusToApply: row.statusToApply as SpecialAbilityDefinition['statusToApply'] } : {}),
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
        name: ab.name,
        description: ab.description,
        power: ab.power,
        chance: ab.chance,
      };
      if (ab.statusType) {
        ability.statusEffect = {
          type: ab.statusType as StatusEffect,
          chance: ab.statusChance,
        };
        if (ab.statusDuration) {
          ability.statusEffect.duration = ab.statusDuration;
        }
      }
      ENEMY_ABILITIES_DATA[ab.id] = ability;
    }
  }
}

// ── Rebuild computed config from loaded data ──

function rebuildStatPoints(): void {
  const pts: typeof ARCHETYPE_STAT_POINTS = {};
  for (const char of CHARACTERS_DATA) {
    const hp = Math.round(char.maxHp / 10);
    pts[char.id] = { hp, atk: char.atk, def: char.def, spd: char.spd };
  }
  // Keep 'custom' fallback from static
  pts.custom = STATIC_STAT_POINTS.custom;
  ARCHETYPE_STAT_POINTS = pts;
}

function rebuildSpecialMap(): void {
  // Build from loaded specials + character archetype mapping
  const spMap: typeof ARCHETYPE_SPECIAL_MAP = { ...STATIC_SPECIAL_MAP };
  ARCHETYPE_SPECIAL_MAP = spMap;

  const catMap: typeof ARCHETYPE_CATEGORY_MAP = { ...STATIC_CATEGORY_MAP };
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
  if (api?.items && api.items.length > 0) {
    ITEMS = {};
    for (const item of api.items) {
      ITEMS[item.id] = mapDbItem(item);
    }
  } else {
    ITEMS = { ...STATIC_ITEMS, ...EQUIPMENT_ITEM_DEFINITIONS, ...MOD_ITEM_DEFINITIONS };
  }
}

async function loadEvents(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.events && api.events.length > 0) {
    DYNAMIC_EVENTS = {};
    for (const event of api.events) {
      DYNAMIC_EVENTS[event.id] = mapDbEvent(event);
    }
  } else {
    DYNAMIC_EVENTS = { ...STATIC_DYNAMIC_EVENTS };
  }
}

async function loadDocuments(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.documents && api.documents.length > 0) {
    DOCUMENTS = {};
    for (const doc of api.documents) {
      DOCUMENTS[doc.id] = mapDbDocument(doc);
    }
  } else {
    DOCUMENTS = { ...STATIC_DOCUMENTS };
  }
}

async function loadQuests(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.quests && api.quests.length > 0) {
    QUESTS = {};
    for (const quest of api.quests) {
      QUESTS[quest.id] = mapDbQuest(quest);
    }
  }
}

async function loadLocations(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.locations && api.locations.length > 0) {
    LOCATIONS = {};
    for (const loc of api.locations) {
      LOCATIONS[loc.id] = mapDbLocation(loc);
    }
  } else {
    LOCATIONS = { ...STATIC_LOCATIONS };
  }
}

async function loadNpcs(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.npcs && api.npcs.length > 0) {
    NPCS_DATA = {};
    for (const row of api.npcs) {
      NPCS_DATA[row.id] = mapDbNpc(row);
    }
  } else {
    NPCS_DATA = { ...STATIC_NPCS };
  }
}

async function loadCharacters(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.characters && api.characters.length > 0) {
    CHARACTERS_DATA = [];
    for (const row of api.characters) {
      CHARACTERS_DATA.push(mapDbCharacter(row));
    }
  } else {
    CHARACTERS_DATA = STATIC_CHARACTERS.map(c => ({ ...c, startingItems: c.startingItems.map(i => ({ ...i })) }));
  }
  // Rebuild stat points from loaded data
  rebuildStatPoints();
}

async function loadSpecials(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.specials && api.specials.length > 0) {
    SPECIALS_DATA = [];
    for (const row of api.specials) {
      SPECIALS_DATA.push(mapDbSpecial(row));
    }
  } else {
    SPECIALS_DATA = [...STATIC_SPECIALS];
  }
}

async function loadEnemies(api: Awaited<ReturnType<typeof loadFromApi>>): Promise<void> {
  if (api?.enemies && api.enemies.length > 0) {
    ENEMIES_DATA = {};
    for (const row of api.enemies) {
      ENEMIES_DATA[row.id] = mapDbEnemy(row);
    }
  } else {
    ENEMIES_DATA = { ...STATIC_ENEMIES };
  }
}

export async function initGameData(): Promise<void> {
  if (initialized) return;
  try {
    const api = await loadFromApi();
    await Promise.all([
      loadItems(api),
      loadEvents(api),
      loadDocuments(api),
      loadQuests(api),
      loadLocations(api),
      loadNpcs(api),
      loadCharacters(api),
      loadSpecials(api),
      loadEnemyAbilities(api),
      loadEnemies(api),
    ]);
    initialized = true;
  } catch (err) {
    console.warn('[DataLoader] API load failed, using static fallback:', err);
    ITEMS = { ...STATIC_ITEMS, ...EQUIPMENT_ITEM_DEFINITIONS, ...MOD_ITEM_DEFINITIONS };
    DYNAMIC_EVENTS = { ...STATIC_DYNAMIC_EVENTS };
    DOCUMENTS = { ...STATIC_DOCUMENTS };
    LOCATIONS = { ...STATIC_LOCATIONS };
    NPCS_DATA = { ...STATIC_NPCS };
    CHARACTERS_DATA = STATIC_CHARACTERS.map(c => ({ ...c, startingItems: c.startingItems.map(i => ({ ...i })) }));
    SPECIALS_DATA = [...STATIC_SPECIALS];
    ENEMIES_DATA = { ...STATIC_ENEMIES };
    initialized = true;
  }
}

/** Force reload all data from DB (used after admin CRUD operations) */
export async function refreshGameData(): Promise<void> {
  try {
    const api = await loadFromApi();
    await Promise.all([
      loadItems(api),
      loadEvents(api),
      loadDocuments(api),
      loadQuests(api),
      loadLocations(api),
      loadNpcs(api),
      loadCharacters(api),
      loadSpecials(api),
      loadEnemyAbilities(api),
      loadEnemies(api),
    ]);
    DATA_VERSION++;
    initialized = true;
  } catch (err) {
    console.warn('[DataLoader] API refresh failed:', err);
  }
}

export function isGameDataLoaded(): boolean {
  return initialized;
}

/** Get a special ability by ID from loaded data (prefers DB data, falls back to static) */
export function getSpecialById(id: string): SpecialAbilityDefinition | undefined {
  if (SPECIALS_DATA.length > 0) {
    return SPECIALS_DATA.find(s => s.id === id);
  }
  return STATIC_SPECIALS.find(s => s.id === id);
}

/**
 * Append cache-bust query param to a media image URL.
 * Pass the current dataVersion from useGameStore so React re-renders when it changes.
 */
export function mediaUrl(idOrPath: string, version: number): string {
  const sep = idOrPath.includes('?') ? '&' : '?';
  return `${idOrPath}${sep}_v=${version}`;
}
