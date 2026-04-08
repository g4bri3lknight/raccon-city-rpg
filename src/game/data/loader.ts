import { STATIC_ITEMS } from './items';
import { STATIC_DYNAMIC_EVENTS } from './dynamic-events';
import { STATIC_DOCUMENTS } from './documents';
import type { ItemDefinition, ItemType, Rarity, ItemEffect } from '../types';
import type { DynamicEvent, DynamicEventType } from '../types';
import type { GameDocument, DocumentType } from '../types';
import type { NPCQuest } from '../types';

export let ITEMS: Record<string, ItemDefinition> = {};
export let DYNAMIC_EVENTS: Record<string, DynamicEvent> = {};
export let DOCUMENTS: Record<string, GameDocument> = {};
export let QUESTS: Record<string, NPCQuest> = {};

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

// ── Load from API ──

async function loadFromApi(): Promise<{
  items: DbItem[];
  events: DbEvent[];
  documents: DbDocument[];
  quests: DbQuest[];
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
    ITEMS = { ...STATIC_ITEMS };
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

export async function initGameData(): Promise<void> {
  if (initialized) return;
  try {
    const api = await loadFromApi();
    await Promise.all([loadItems(api), loadEvents(api), loadDocuments(api), loadQuests(api)]);
    initialized = true;
  } catch (err) {
    console.warn('[DataLoader] API load failed, using static fallback:', err);
    ITEMS = { ...STATIC_ITEMS };
    DYNAMIC_EVENTS = { ...STATIC_DYNAMIC_EVENTS };
    DOCUMENTS = { ...STATIC_DOCUMENTS };
    initialized = true;
  }
}

/** Force reload all data from DB (used after admin CRUD operations) */
export async function refreshGameData(): Promise<void> {
  try {
    const api = await loadFromApi();
    await Promise.all([loadItems(api), loadEvents(api), loadDocuments(api), loadQuests(api)]);
    initialized = true;
  } catch (err) {
    console.warn('[DataLoader] API refresh failed:', err);
  }
}

export function isGameDataLoaded(): boolean {
  return initialized;
}
