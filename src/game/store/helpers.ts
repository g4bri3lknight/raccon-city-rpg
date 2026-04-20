import {
  Character,
  EnemyInstance,
  ItemInstance,
  Archetype,
  CustomCharacterConfig,
} from '../types';
import { computeGrowthRates } from '../data/characters';
import {
  ITEMS,
  CHARACTER_ARCHETYPES,
  ARCHETYPE_STAT_POINTS,
  ARCHETYPE_SPECIAL_MAP,
  getCustomStartingItems,
  ENEMIES,
  BOSS_PHASES,
  LOCATIONS,
} from '../data/loader';
import { getMaxInventorySlots, getStartingInventorySlots } from './settings-cache';

// ── Module-level counters ──
let notifId = 0;
let charUid = 0;
let enemyUid = 0;

export function newCharId() { return `char_${++charUid}`; }
export function newEnemyId() { return `enemy_${++enemyUid}`; }
export function nextNotifId() { return `notif_${++notifId}`; }

// ── Helper: read persisted auto-combat preference ──
export function getAutoCombatDefault(): boolean {
  try {
    const raw = localStorage.getItem('raccoon_city_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return !!parsed.autoCombatDefault;
    }
  } catch {}
  return false;
}

// ── Helper: apply add_slots effect to a character ──
export function applyAddSlotsToCharacter(char: Character, amount: number): { updatedChar: Character; expanded: boolean; oldSlots: number; newSlots: number } {
  const maxSlots = getMaxInventorySlots();
  const oldSlots = char.maxInventorySlots;
  const newSlots = Math.min(maxSlots, oldSlots + amount);
  const expanded = newSlots > oldSlots;
  return { updatedChar: { ...char, maxInventorySlots: newSlots }, expanded, oldSlots, newSlots };
}

// ── Auto-merge inventory stacks: combines items with the same itemId ──
export function mergeInventoryStacks(inventory: ItemInstance[]): ItemInstance[] {
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
export function addItemToParty(
  party: Character[],
  itemId: string,
  quantity: number,
  preferCharacterId?: string | null,
): { party: Character[]; added: boolean; characterName: string; characterId: string } {
  const itemDef = ITEMS[itemId];
  if (!itemDef) return { party, added: false, characterName: '', characterId: '' };

  // Unique items can only be obtained once per game
  if (itemDef.unico) {
    const alreadyOwned = party.some(c =>
      c.inventory.some(i => i.itemId === itemId) || c.weapon?.itemId === itemId
    );
    if (alreadyOwned) return { party, added: false, characterName: '', characterId: '' };
  }

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

    effects: itemDef.effects,
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

// Dry-run check: can an item be added to any party member's inventory?
export function canAddItemToParty(
  party: Character[],
  itemId: string,
  quantity: number,
): boolean {
  const itemDef = ITEMS[itemId];
  if (!itemDef) return false;
  if (itemDef.unico) {
    const alreadyOwned = party.some(c =>
      c.inventory.some(i => i.itemId === itemId) || c.weapon?.itemId === itemId
    );
    if (alreadyOwned) return false;
  }
  const isStackable = itemDef.type === 'ammo' || itemDef.type === 'healing' || itemDef.type === 'antidote';
  for (const char of party) {
    if (char.currentHp <= 0) continue;
    if (isStackable) {
      if (char.inventory.some(i => i.itemId === itemId)) return true;
    }
    if (char.inventory.length < char.maxInventorySlots) return true;
  }
  return false;
}

// ── Create character from archetype ──
export function createCharacter(archetypeId: Archetype): Character {
  const archetype = CHARACTER_ARCHETYPES.find(a => a.id === archetypeId);
  if (!archetype) throw new Error(`Archetype ${archetypeId} not found`);
  const points = ARCHETYPE_STAT_POINTS[archetype.id] || ARCHETYPE_STAT_POINTS.custom;
  const growth = computeGrowthRates(points);
  const maxHp = points.hp * 10;
  // Resolve special ability IDs from the archetype mapping
  const specialMap = ARCHETYPE_SPECIAL_MAP[archetype.id];
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
    inventory: archetype.startingItems.map(item => ({
      ...item,
      uid: `${item.uid}_${Date.now()}`,
      isEquipped: !!item.weaponStats,
      // Enrich effects from ITEMS dict (DB starting items may have old singular "effect" only)
      effects: item.effects && item.effects.length > 0 ? item.effects : ITEMS[item.itemId]?.effects,
    })),
    maxInventorySlots: getStartingInventorySlots(),
    weapon: archetype.startingItems.find(i => i.weaponStats)?.weaponStats || null,
    armor: null,
    accessory: null,
    special1Id: specialMap?.special1 || undefined,
    special2Id: specialMap?.special2 || undefined,
    statGrowth: growth,
  };
}

// ── Create custom character ──
export function createCustomCharacter(config: CustomCharacterConfig): Character {
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
    inventory: startingItems.map(item => ({
      ...item,
      uid: `${item.uid}_${Date.now()}`,
      isEquipped: !!item.weaponStats,
      // Enrich effects from ITEMS dict
      effects: item.effects && item.effects.length > 0 ? item.effects : ITEMS[item.itemId]?.effects,
    })),
    maxInventorySlots: getStartingInventorySlots(),
    weapon: startingItems.find(i => i.weaponStats)?.weaponStats || null,
    armor: null,
    accessory: null,
    special1Id: config.special1Id,
    special2Id: config.special2Id,
    passiveDescription: config.passiveDescription,
    statGrowth: growth,
  };
}

// ── Create enemy instance ──
export function createEnemyInstance(enemyId: string, statMult: number = 1): EnemyInstance {
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
export function getKeyItemIds(): Set<string> {
  return new Set(Object.values(ITEMS).filter(i => i.type === 'utility' && i.id.startsWith('key_')).map(i => i.id));
}

export function buildKeyPathLookup(): Record<string, { fromId: string; toId: string }[]> {
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

export function isKeyStillNeeded(itemId: string, unlockedPaths: string[]): boolean {
  const paths = buildKeyPathLookup()[itemId];
  if (!paths) return false; // Not a key or no paths defined
  const remaining = paths.filter(
    p => !unlockedPaths.includes(`${p.fromId}→${p.toId}`)
  );
  return remaining.length > 0;
}
