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
} from './types';
import { CHARACTER_ARCHETYPES, getCharacterStats } from './data/characters';
import { ENEMIES } from './data/enemies';
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
};

// ── Difficulty scaling based on party size ──
interface DifficultyConfig {
  label: string;
  color: string;
  icon: string;
  statMult: number;     // enemy HP/ATK/DEF/SPD multiplier
  lootMult: number;     // loot chance multiplier
  maxEnemies: number;   // max enemies per encounter
  minEnemies: number;
  expMult: number;      // EXP reward multiplier
}
function getDifficultyConfig(partySize: number): DifficultyConfig {
  switch (partySize) {
    case 1: return { label: 'Sopravvivenza', color: '#22c55e', icon: '🏃', statMult: 0.7, lootMult: 1.4, minEnemies: 1, maxEnemies: 2, expMult: 1.3 };
    case 2: return { label: 'Normale', color: '#eab308', icon: '⚔️', statMult: 1.0, lootMult: 1.0, minEnemies: 1, maxEnemies: 3, expMult: 1.0 };
    case 3: return { label: 'Sfida', color: '#ef4444', icon: '💀', statMult: 1.3, lootMult: 0.7, minEnemies: 2, maxEnemies: 3, expMult: 0.9 };
    default: return getDifficultyConfig(2);
  }
}

function createCharacter(archetypeId: Archetype): Character {
  const archetype = CHARACTER_ARCHETYPES.find(a => a.id === archetypeId)!;
  const stats = getCharacterStats(archetype, 1);
  return {
    id: newCharId(),
    archetype: archetype.id,
    name: archetype.name,
    currentHp: stats.maxHp,
    maxHp: stats.maxHp,
    baseAtk: stats.atk,
    baseDef: stats.def,
    baseSpd: stats.spd,
    level: 1,
    exp: 0,
    expToNext: 50,
    statusEffects: [],
    isDefending: false,
    inventory: archetype.startingItems.map(item => ({ ...item, uid: `${item.uid}_${Date.now()}` })),
    maxInventorySlots: 6,
    weapon: archetype.startingItems.find(i => i.weaponStats)?.weaponStats || null,
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
  startAdventure: (selectedArchetypes: Archetype[]) => void;
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
  difficulty: 'normal',
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

  // ==========================================
  // PHASE TRANSITIONS
  // ==========================================
  startGame: () => {
    set({ phase: 'title' });
  },

  goToCharacterSelect: () => {
    set({ phase: 'character-select', party: [], messageLog: [], turnCount: 0, searchCounts: {}, searchMaxes: {}, partySize: 2, unlockedPaths: [], visitedLocations: [], mapOpen: false });
  },

  startAdventure: (selectedArchetypes: Archetype[]) => {
    const party = selectedArchetypes.map(id => createCharacter(id));
    const startLocation = LOCATIONS['city_outskirts'];
    set({
      phase: 'exploration',
      party,
      currentLocationId: 'city_outskirts',
      enemies: [],
      combat: null,
      activeEvent: startLocation.storyEvent || null,
      eventOutcome: null,
      messageLog: ['Iniziate il vostro viaggio attraverso le strade desolate di Raccoon City...', `\n🎮 Difficoltà: ${selectedArchetypes.length === 1 ? 'Sopravvivenza (1 giocatore — nemici più deboli, più bottino)' : selectedArchetypes.length === 2 ? 'Normale (2 giocatori — bilanciato)' : 'Sfida (3 giocatori — nemici più forti, meno bottino)'}`],
      turnCount: 0,
      inventoryOpen: false,
      selectedCharacterId: party[0]?.id || null,
      searchCounts: {},
      searchMaxes: {},
      partySize: selectedArchetypes.length,
      unlockedPaths: [],
      visitedLocations: ['city_outskirts'],
      mapOpen: false,
    });
  },

  gameOver: () => {
    set({ phase: 'game-over' });
  },

  victory: () => {
    set({ phase: 'victory' });
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
    });
  },

  // ==========================================
  // EXPLORATION
  // ==========================================
  explore: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    
    // Random ambient text
    const ambient = location.ambientText[Math.floor(Math.random() * location.ambientText.length)];
    const newLog = [...state.messageLog, `[${state.turnCount}] ${ambient}`];

    // Check for combat encounter
    if (Math.random() * 100 < location.encounterRate) {
      const diff = getDifficultyConfig(state.partySize);
      // Spawn enemies scaled by party size
      const numEnemies = diff.minEnemies + Math.floor(Math.random() * (diff.maxEnemies - diff.minEnemies + 1));
      const enemies: EnemyInstance[] = [];
      for (let i = 0; i < numEnemies; i++) {
        const enemyId = location.enemyPool[Math.floor(Math.random() * location.enemyPool.length)];
        enemies.push(createEnemyInstance(enemyId, diff.statMult));
      }

      const enemyNames = enemies.map(e => e.name).join(', ');

      // Show encounter notification first, then transition to combat
      set({
        messageLog: [...newLog, `[${state.turnCount}] ⚔️ Combattimento iniziato contro ${enemyNames}!`],
        notification: {
          id: `notif_${++notifId}`,
          type: 'encounter',
          message: `Incontro: ${enemyNames}`,
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
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Combattimento', message: `Incontro con ${enemyNames}!` }],
            isVictory: false,
            isDefeat: false,
            fled: false,
            statusDurations: {},
            specialCooldowns: {},
            special2Cooldowns: {},
            tauntTargetId: null,
          },
          notification: null,
        });

        // If enemy goes first, trigger their action after a short delay
        if (firstActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 1400);
        }
      }, 1200);
      return;
    }

    // Check for random item find
    if (Math.random() < 0.3 && location.itemPool.length > 0) {
      const availableItems = location.itemPool.filter(() => Math.random() * 100 < 50);
      if (availableItems.length > 0) {
        const foundEntry = availableItems[Math.floor(Math.random() * availableItems.length)];
        const itemDef = ITEMS[foundEntry.itemId];
        if (itemDef) {
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
                  subMessage: `Ricevuto da ${targetChar?.name || 'qualcuno'}`,
                  characterId: targetId,
                },
              });
            }
            return;
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
                subMessage: `Ricevuto da ${finder.name}`,
                characterId: finder.id,
              },
            });
          }
          return;
        }
      }
    }

    set({ messageLog: newLog, turnCount: state.turnCount + 1 });
  },

  travelTo: (locationId: string) => {
    const state = get();
    const currentLocation = LOCATIONS[state.currentLocationId];
    const destination = LOCATIONS[locationId];
    if (!destination) return;

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

    set({
      currentLocationId: locationId,
      messageLog: newLog,
      turnCount: state.turnCount + turnIncrease,
      activeEvent: destination.storyEvent || null,
      eventOutcome: null,
      unlockedPaths: newUnlockedPaths,
      visitedLocations: newVisited,
      party: updatedParty,
    });
  },

  toggleMap: () => {
    set(state => ({ mapOpen: !state.mapOpen }));
  },

  searchArea: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    const locId = state.currentLocationId;
    const searchCount = state.searchCounts[locId] || 0;

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

    // Find items from pool
    const foundItems: string[] = [];
    for (const entry of location.itemPool) {
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
    let lastNotif: GameNotification | null = null;

    for (const itemId of foundItems) {
      const itemDef = ITEMS[itemId];
      if (!itemDef) continue;

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
          lastNotif = {
            id: `notif_${++notifId}`,
            type: 'item_found' as const,
            message: itemDef.name,
            icon: itemDef.icon,
            subMessage: `Ricevuto da ${targetChar?.name || 'qualcuno'}`,
            characterId: targetId,
          };
        }
        continue;
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
        lastNotif = {
          id: `notif_${++notifId}`,
          type: 'item_found' as const,
          message: itemDef.name,
          icon: itemDef.icon,
          subMessage: `Ricevuto da ${finderChar?.name || 'qualcuno'}`,
          characterId: targetId,
        };
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
          lastNotif = {
            id: `notif_${++notifId}`,
            type: 'item_found' as const,
            message: itemDef.name,
            icon: itemDef.icon,
            subMessage: `Ricevuto da ${finderChar?.name || 'qualcuno'}`,
            characterId: targetId,
          };
        } else {
          foundNames.push(`${itemDef.name} (inventario pieno!)`);
        }
      }
    }

    set({
      messageLog: [...newLog, `[${state.turnCount}] 🎒 ${flavourText} Trovati: ${foundNames.join(', ')}.`],
      party: updatedParty,
      turnCount: state.turnCount + 1,
      searchCounts: newSearchCounts,
      searchMaxes: newSearchMaxes,
      notification: lastNotif,
    });
  },

  handleEventChoice: (choiceIndex: number) => {
    const state = get();
    const event = state.activeEvent;
    if (!event) return;

    const choice = event.choices[choiceIndex];
    if (!choice) return;

    const outcome = choice.outcome;
    let updatedParty = [...state.party];
    const logMessages: string[] = [
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

    // Receive items
    if (outcome.receiveItems) {
      for (const itemEntry of outcome.receiveItems) {
        const itemDef = ITEMS[itemEntry.itemId];
        if (!itemDef) continue;
        const newItem: ItemInstance = {
          uid: `${itemEntry.itemId}_${Date.now()}_${Math.random()}`,
          itemId: itemEntry.itemId,
          name: itemDef.name,
          description: itemDef.description,
          type: itemDef.type,
          rarity: itemDef.rarity,
          icon: itemDef.icon,
          usable: itemDef.usable,
          equippable: itemDef.equippable,
          effect: itemDef.effect,
          quantity: itemEntry.quantity,
        };
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (!added && p.inventory.length < p.maxInventorySlots) {
            added = true;
            logMessages.push(`[${state.turnCount}] 🎒 ${p.name} riceve: ${itemDef.name} x${itemEntry.quantity}`);
            return { ...p, inventory: [...p.inventory, newItem] };
          }
          return p;
        });
      }
    }

    // Trigger combat
    if (outcome.triggerCombat && outcome.combatEnemyIds) {
      const eventDiff = getDifficultyConfig(state.partySize);
      const enemies = outcome.combatEnemyIds.map(id => createEnemyInstance(id, eventDiff.statMult));
      const allActors = [
        ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
        ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
      ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);

      const firstActor = allActors[0];

      set({
        phase: 'combat',
        party: updatedParty,
        autoCombat: false,
        enemies,
        activeEvent: null,
        eventOutcome: outcome,
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
      set({
        phase: 'game-over',
        party: updatedParty,
        activeEvent: null,
        eventOutcome: outcome,
        messageLog: [...state.messageLog, ...logMessages],
      });
      return;
    }

    set({
      activeEvent: null,
      eventOutcome: outcome,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMessages],
      turnCount: state.turnCount + 1,
    });
  },

  closeEvent: () => {
    set({ activeEvent: null, eventOutcome: null });
  },

  toggleInventory: () => {
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
            // Also cure status if the item supports it
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

      // Check if target has space (skip check for bags — they consume themselves)
      if (toChar.inventory.length >= toChar.maxInventorySlots && item.type !== 'bag') {
        logMsg = `[Turno ${state.turnCount}] 🚫 Inventario di ${toChar.name} pieno!`;
        return state;
      }

      // If transferring an equipped weapon, unequip it first
      let updatedFromChar = { ...fromChar };
      let updatedToChar = { ...toChar };
      let updatedParty = state.party;

      if (item.isEquipped && item.weaponStats) {
        updatedFromChar = { ...updatedFromChar, weapon: null };
      }

      // Move item
      updatedFromChar = {
        ...updatedFromChar,
        inventory: updatedFromChar.inventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: false } : i
        ).filter(i => i.uid !== itemUid),
      };
      updatedToChar = {
        ...updatedToChar,
        inventory: [...updatedToChar.inventory, { ...item, isEquipped: false }],
      };

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

    const diff = getDifficultyConfig(state.partySize);
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
        const result = executePlayerSpecial(character, target, state.combat.turn, updatedParty);
        newLog.push(result.log);
        if (result.updatedEnemy) {
          updatedEnemies = updatedEnemies.map(e => e.id === result.updatedEnemy!.id ? result.updatedEnemy! : e);
        }
        if (result.updatedCharacter) {
          updatedParty = updatedParty.map(p => p.id === result.updatedCharacter!.id ? result.updatedCharacter! : p);
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
        // Set 3-turn cooldown for special2
        updatedCooldowns2[character.id] = 3;
        break;
      }
      case 'use_item': {
        if (!state.combat.selectedItemUid || !state.combat.selectedTarget) return;
        const item = character.inventory.find(i => i.uid === state.combat!.selectedItemUid);
        if (!item) return;
        
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
        break;
      }
    }

    // Check if all enemies are dead
    if (updatedEnemies.every(e => e.currentHp <= 0)) {
      newPhase = 'exploration';
      
      // Get difficulty config for loot/EXP multipliers
      const lootDiff = getDifficultyConfig(state.partySize);

      // Generate loot (with difficulty multiplier)
      const allLoot: string[] = [];
      for (const enemy of updatedEnemies) {
        allLoot.push(...generateLoot(enemy.definitionId, lootDiff.lootMult));
      }

      // Distribute loot (auto-merge stacks of same item)
      const lostLoot: string[] = [];
      for (const itemId of allLoot) {
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
            levelUpMessages.push(`⬆️ ${result.updated.name} sale al livello ${result.updated.level}!`);
          }
        }
      }

      const lootNames = allLoot.map(id => ITEMS[id]?.name).filter(Boolean);
      let victoryMsg = `🎉 Vittoria! +${totalExp} EXP. Trovati: ${lootNames.join(', ') || 'niente'}.`;
      if (lostLoot.length > 0) {
        victoryMsg += ` ⚠️ Inventario pieno! Persi: ${lostLoot.join(', ')}`;
      }

      newLog.push({
        turn: state.combat.turn,
        actorName: 'Sistema',
        actorType: 'player',
        action: 'Vittoria',
        message: victoryMsg,
      });

      // Check if this was a boss fight (victory condition)
      if (updatedEnemies.some(e => e.isBoss)) {
        set({
          notification: {
            id: `notif_${++notifId}`,
            type: 'victory',
            message: 'VITTORIA FINALE!',
            icon: '👑',
            subMessage: `+${totalExp} EXP · Boss sconfitto!`,
            lootNames: allLoot.map(id => ITEMS[id]?.name).filter(Boolean),
            levelUps: levelUpMessages,
          },
          combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
          party: updatedParty,
          enemies: updatedEnemies,
          messageLog: [...state.messageLog, `[${state.turnCount}] 🎉 Nemico sconfitto!`, ...levelUpMessages],
        });
        setTimeout(() => {
          set({ phase: 'victory', combat: null, enemies: [], notification: null });
        }, 3500);
        return;
      }

      set({
        notification: {
          id: `notif_${++notifId}`,
          type: 'victory',
          message: 'VITTORIA!',
          icon: '🏆',
          subMessage: `+${totalExp} EXP`,
          lootNames: allLoot.map(id => ITEMS[id]?.name).filter(Boolean),
          levelUps: levelUpMessages,
        },
        combat: { ...state.combat, log: newLog, isVictory: true, isProcessing: true },
        party: updatedParty,
        enemies: updatedEnemies,
        messageLog: [...state.messageLog, `[${state.turnCount}] 🎉 Nemico sconfitto! +${totalExp} EXP`, ...levelUpMessages],
      });
      setTimeout(() => {
        set({ phase: 'exploration', combat: null, enemies: [], notification: null });
      }, 3500);
      return;
    }

    // Check if all party members are dead
    if (updatedParty.every(p => p.currentHp <= 0)) {
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

    // 3. DPS: use Raffica (special2) if multiple enemies alive + available
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
          // Decrement turns; keep only effects that still have turns left
          const newTurnsLeft = sd.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingDurations.push({ effect: sd.effect, turnsLeft: newTurnsLeft });
          } else {
            // Effect expired — remove from character's statusEffects
            statusLogEntries.push({
              turn: newTurn,
              actorName: 'Sistema',
              actorType: 'player',
              action: 'Recupero',
              message: `✨ ${p.name} si è ripreso da ${sd.effect === 'poison' ? "avvelenamento" : sd.effect === 'bleeding' ? "sanguinamento" : sd.effect}!`,
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

    const newLog = isNewTurn
      ? [
          ...combat.log,
          { turn: newTurn, actorName: 'Sistema', actorType: 'player' as const, action: 'Turno', message: `--- Turno ${newTurn} ---` },
          ...statusLogEntries,
        ]
      : combat.log;

    // If next actor is enemy, execute AI
    if (nextActor.type === 'enemy') {
      const enemy = enemies.find(e => e.id === nextActor.id)!;
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
        set({
          phase: 'game-over',
          party: afterEnemyAttack,
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
        enemies,
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
      enemies,
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
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
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

      set({
        phase: 'exploration',
        party: data.party,
        currentLocationId: data.currentLocationId,
        combat: data.combat,
        enemies: data.enemies || [],
        activeEvent: data.activeEvent,
        eventOutcome: data.eventOutcome,
        messageLog: [
          ...data.messageLog,
          `[Turno ${data.turnCount}] 💾 Partita caricata dallo Slot ${slot}.`,
        ],
        turnCount: data.turnCount,
        difficulty: data.difficulty,
        inventoryOpen: false,
        selectedCharacterId: data.selectedCharacterId || data.party[0]?.id || null,
        searchCounts: data.searchCounts || {},
        searchMaxes: data.searchMaxes || {},
        partySize: data.partySize || 2,
        unlockedPaths: data.unlockedPaths || [],
        visitedLocations: data.visitedLocations || [],
        mapOpen: false,
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
    const ammoIds = ['ammo_pistol', 'ammo_shotgun', 'ammo_magnum'];
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
    const diff = getDifficultyConfig(state.partySize);
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
        const growth = { tank: { hp: 12, atk: 2, def: 2, spd: 0 }, healer: { hp: 8, atk: 1, def: 1, spd: 1 }, dps: { hp: 9, atk: 3, def: 1, spd: 1 } }[char.archetype] || { hp: 8, atk: 1, def: 1, spd: 1 };
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
}));
