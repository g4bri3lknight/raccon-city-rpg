import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import {
  EnemyInstance,
  ItemInstance,
  GameNotification,
} from '../../types';
import { getDifficultyConfig } from '../../data/difficulty';
import {
  ITEMS,
  DYNAMIC_EVENTS,
  DOCUMENTS,
  LOCATIONS,
  NPCS,
  SECRET_ROOMS,
  RECIPES_DATA,
  getLocationRooms,
} from '../../data/loader';
import { generateRandomizedData, getEffectiveLocation } from '../../data/randomizer';
import {
  addItemToParty,
  applyAddSlotsToCharacter,
  createEnemyInstance,
  getKeyItemIds,
  isKeyStillNeeded,
  getAutoCombatDefault,
  nextNotifId,
} from '../helpers';
import { getMaxInventorySlots } from '../settings-cache';
import { getAddSlotsAmount } from '../../utils/item-effects';
import { rollVictoryCondition } from '../../data/victory-conditions';
import { playLocationAmbient } from '../../engine/sounds';

export const createExplorationSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  // ── OBSERVE (was "explore") ──
  // Simplified to just show ambient text about the current room/location.
  // No combat, no items, no documents, no NPCs, no dynamic events.
  explore: () => {
    const state = get();
    if (state.isExploring) return;
    set({ isExploring: true });

    const location = LOCATIONS[state.currentLocationId];
    if (!location) {
      set({ isExploring: false });
      return;
    }

    // Schedule auto-save every 5 turns
    if ((state.turnCount + 1) % 5 === 0 && state.phase === 'exploration' && state.party.length > 0) {
      setTimeout(() => { try { get().autoSave(); } catch {} }, 300);
    }

    // Play location ambient sound
    try { playLocationAmbient(state.currentLocationId); } catch {}

    // Get current room's data if in a room-based location
    const currentRoom = (location.rooms && location.rooms.length > 0 && state.currentRoomId)
      ? location.rooms.find(r => r.id === state.currentRoomId)
      : null;

    // Random ambient text (room-aware)
    const ambient = (currentRoom && currentRoom.ambientText?.length > 0)
      ? currentRoom.ambientText[Math.floor(Math.random() * currentRoom.ambientText.length)]
      : location.ambientText?.length > 0
        ? location.ambientText[Math.floor(Math.random() * location.ambientText.length)]
        : `${currentRoom?.name || location.name} è silenziosa...`;

    const newLog = [...state.messageLog, `[${state.turnCount}] ${ambient}`];

    set({
      messageLog: newLog,
      turnCount: state.turnCount + 1,
      isExploring: false,
    });

    // Track run stats: turns survived
    try { get().incrementRunStat('turnsSurvived'); } catch {}
  },

  travelTo: (locationId: string) => {
    const state = get();
    const currentLocation = LOCATIONS[state.currentLocationId];
    if (!currentLocation) return;
    const destination = LOCATIONS[locationId];
    if (!destination) return;

    // #45 Randomizer: validate against randomized connections
    if (state.randomizedLocationData) {
      const effectiveCurrent = getEffectiveLocation(state.currentLocationId, state.randomizedLocationData);
      if (effectiveCurrent && !effectiveCurrent.nextLocations.includes(locationId)) {
        set({ messageLog: [...state.messageLog, `[${state.turnCount}] 🚫 Non puoi viaggiare in quella direzione.`] });
        return;
      }
    }

    try { playLocationAmbient(locationId); } catch {}

    const effectiveCurrentLoc = getEffectiveLocation(state.currentLocationId, state.randomizedLocationData);
    const lockedEntry = effectiveCurrentLoc?.lockedLocations?.find(l => l.locationId === locationId)
      || currentLocation?.lockedLocations?.find(l => l.locationId === locationId);
    let newUnlockedPaths = [...state.unlockedPaths];
    let updatedParty = [...state.party];
    let keyDiscardMsg = '';

    if (lockedEntry) {
      const hasKey = state.party.some(p => p.inventory.some(i => i.itemId === lockedEntry.requiredItemId));
      if (!hasKey) {
        set({
          messageLog: [...state.messageLog, `[${state.turnCount}] ${lockedEntry.lockedMessage}`],
        });
        return;
      }
      const pathKey = `${state.currentLocationId}→${locationId}`;
      if (!newUnlockedPaths.includes(pathKey)) {
        newUnlockedPaths.push(pathKey);
      }

      if (getKeyItemIds().has(lockedEntry.requiredItemId) && !isKeyStillNeeded(lockedEntry.requiredItemId, newUnlockedPaths)) {
        const keyDef = ITEMS[lockedEntry.requiredItemId];
        const keyName = keyDef?.name || lockedEntry.requiredItemId;
        updatedParty = updatedParty.map(p => ({
          ...p,
          inventory: p.inventory.filter(i => i.itemId !== lockedEntry.requiredItemId),
        }));
        keyDiscardMsg = ` 🔑 ${keyName} scartata — non serve più.`;
      }
    }

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

    // Don't trigger location story events if location has rooms (rooms have their own events)
    const destinationHasRooms = !!(destination.rooms && destination.rooms.length > 0);
    const eventAlreadyCompleted = state.completedEvents.includes(locationId);
    const showEvent = destination.storyEvent && !eventAlreadyCompleted && !destinationHasRooms;

    set({
      currentLocationId: locationId,
      messageLog: newLog,
      turnCount: state.turnCount + turnIncrease,
      activeEvent: showEvent ? destination.storyEvent : null,
      eventOutcome: null,
      unlockedPaths: newUnlockedPaths,
      visitedLocations: newVisited,
      party: updatedParty,
      currentSubArea: null,
      currentRoomId: null,
      roomHistory: [],
    });
    // Track run stats: distance traveled
    try { get().incrementRunStat('distanceTraveled', turnIncrease); } catch {}
    setTimeout(() => get().checkAchievements(), 100);
  },

  navigateToRoom: (roomId: string) => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    if (!location || !location.rooms || location.rooms.length === 0) return;

    // Find current room (or null if not in any room)
    const currentRoom = state.currentRoomId
      ? location.rooms.find(r => r.id === state.currentRoomId)
      : null;

    // Find target room
    const targetRoom = location.rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    // Check if target is reachable from current room
    if (currentRoom && !currentRoom.nextRooms.includes(roomId)) {
      // Check locked rooms on current room
      const lockedEntry = currentRoom.lockedRooms?.find(l => l.roomId === roomId);
      if (!lockedEntry) {
        // Also check if target room has this room in its nextRooms (bidirectional)
        if (!targetRoom.nextRooms.includes(currentRoom.id)) {
          set({ messageLog: [...state.messageLog, `[${state.turnCount}] 🚫 Non puoi raggiungere quella stanza da qui.`] });
          return;
        }
      }
    }

    // Check locked rooms
    const lockedEntry = currentRoom?.lockedRooms?.find(l => l.roomId === roomId);

    if (lockedEntry) {
      const hasKey = state.party.some(p => p.inventory.some(i => i.itemId === lockedEntry.requiredItemId));
      if (!hasKey) {
        set({ messageLog: [...state.messageLog, `[${state.turnCount}] 🔒 ${lockedEntry.lockedMessage || 'Questa stanza è chiusa a chiave.'}`] });
        return;
      }
    }

    // Handle safe room type
    if (targetRoom.type === 'safe_room') {
      get().enterSafeRoom();
      set({ currentRoomId: roomId });
      return;
    }

    // Exit safe room if currently in one
    if (state.currentSubArea === 'safe_room') {
      get().exitSafeRoom();
    }

    // Track exploration
    const newExploredRooms = state.exploredRooms.includes(roomId)
      ? state.exploredRooms
      : [...state.exploredRooms, roomId];

    const newLog = [
      ...state.messageLog,
      `[${state.turnCount}] 🚪 Ti sposti in: ${targetRoom.icon} ${targetRoom.name}`,
    ];
    if (targetRoom.description) {
      newLog.push(`[${state.turnCount}] ${targetRoom.description}`);
    }

    // ── Room types that should NOT spawn enemies ──
    const NO_ENEMY_TYPES = ['safe_room', 'shop', 'puzzle', 'corridor'];
    const hasEnemies = !!(targetRoom.enemyPool && targetRoom.enemyPool.length > 0);
    const isCleared = state.clearedRooms.includes(roomId);
    const shouldSpawnEnemies = hasEnemies
      && !isCleared
      && !NO_ENEMY_TYPES.includes(targetRoom.type);

    // Schedule auto-save every 5 turns
    if ((state.turnCount + 1) % 5 === 0 && state.phase === 'exploration' && state.party.length > 0) {
      setTimeout(() => { try { get().autoSave(); } catch {} }, 300);
    }

    // Build room history: push current room to history stack before navigating
    const newRoomHistory = state.currentRoomId
      ? [...state.roomHistory, state.currentRoomId]
      : state.roomHistory;

    // Increment turn for room navigation (minor cost)
    set({
      currentRoomId: roomId,
      roomHistory: newRoomHistory,
      messageLog: newLog,
      turnCount: state.turnCount + 1,
      exploredRooms: newExploredRooms,
      currentSubArea: null,
      // Set combatRoomId so combat victory can mark room as cleared
      ...(shouldSpawnEnemies ? { combatRoomId: roomId } : { combatRoomId: null }),
    });

    // ── Spawn enemies immediately on room entry if applicable ──
    if (shouldSpawnEnemies) {
      const enemyPool = targetRoom.enemyPool!;
      const diff = getDifficultyConfig(state.difficulty, state.partySize);
      const ngMult = state.ngPlusEnemyMultiplier || 1;
      const avgLevel = state.party.length > 0
        ? Math.round(state.party.reduce((s, p) => s + p.level, 0) / state.party.length)
        : 1;
      const numEnemies = diff.minEnemies + Math.floor(Math.random() * (diff.maxEnemies - diff.minEnemies + 1));

      if (enemyPool.length === 0) {
        return;
      }

      const enemies: EnemyInstance[] = [];
      for (let i = 0; i < numEnemies; i++) {
        const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        enemies.push(createEnemyInstance(enemyId, diff.statMult * ngMult, avgLevel));
      }

      const enemyNames = enemies.map(e => e.name).join(', ');

      // Show encounter notification first, then transition to combat
      set(state => ({
        messageLog: [
          ...state.messageLog,
          `[${state.turnCount}] ⚔️ Combattimento iniziato contro ${enemyNames}!`,
        ],
        notification: {
          id: nextNotifId(),
          type: 'encounter',
          message: `Incontro: ${enemyNames}`,
          icon: '⚔️',
          subMessage: 'Preparati al combattimento!',
        },
      }));

      // Delay combat start to show notification
      setTimeout(() => {
        const currentState = get();
        // Determine turn order
        const allActors = [
          ...currentState.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => {
          const jitterA = Math.random() * 4;
          const jitterB = Math.random() * 4;
          return (b.spd + jitterB) - (a.spd + jitterA);
        });
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

        const vc = rollVictoryCondition(enemies);
        set({
          phase: 'combat',
          enemies,
          autoCombat: getAutoCombatDefault(),
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
            activeEffects: [],
            victoryCondition: vc,
            comboCount: 0,
            comboTargetId: null,
            lastOffensiveAction: null,
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

    // ── If room is already cleared, show a safe message ──
    if (isCleared && hasEnemies) {
      newLog.push(`[${state.turnCount}] ✅ Stanza pulita. Nessun nemico qui.`);
      set(state => ({ messageLog: [...state.messageLog, newLog[newLog.length - 1]] }));
    }

    // ── Check for NPCs in room (non-random, first un-encountered) ──
    if (targetRoom.npcIds && targetRoom.npcIds.length > 0) {
      const unEncountered = targetRoom.npcIds.filter(npcId => !state.npcsEncountered.includes(npcId));
      if (unEncountered.length > 0) {
        set(state => ({ isExploring: false }));
        get().encounterNpc(unEncountered[0]);
        return;
      }
    }

    // ── Check room story event ──
    if (targetRoom.storyEvent) {
      const roomEventKey = `room_${roomId}`;
      if (!state.completedEvents.includes(roomEventKey)) {
        set({
          activeEvent: targetRoom.storyEvent,
          eventOutcome: null,
          completedEvents: [...state.completedEvents, roomEventKey],
        });
      }
    }
  },

  searchArea: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    if (!location) return;
    const locId = state.currentLocationId;

    // Room system: get current room's data if in a room-based location
    const currentRoom = (location.rooms && location.rooms.length > 0 && state.currentRoomId)
      ? location.rooms.find(r => r.id === state.currentRoomId)
      : null;

    // Room-aware search key: each room has independent search tracking
    const searchKey = currentRoom ? `${locId}__${currentRoom.id}` : locId;
    const searchCount = state.searchCounts[searchKey] || 0;
    const foundItems = state.foundRoomItems[searchKey] || [];

    // Track run stats: searches performed
    try { get().incrementRunStat('searchesPerformed'); } catch {}

    const newSearchCounts = { ...state.searchCounts, [searchKey]: searchCount + 1 };

    const searcherName = state.party.find(p => p.id === state.selectedCharacterId)?.name || 'Qualcuno';
    const newLog = [...state.messageLog, `[${state.turnCount}] 🔍 ${searcherName} cerca nella zona...`];

    const searchFlavourTexts = [
      `${searcherName} ispeziona gli scaffali...`,
      `${searcherName} rovista tra i detriti...`,
      `${searcherName} controlla dietro ogni angolo...`,
      `${searcherName} fruga in un armadio socchiuso...`,
      `${searcherName} scava tra le macerie...`,
    ];
    const flavourText = searchFlavourTexts[Math.floor(Math.random() * searchFlavourTexts.length)];

    // ── Build the deterministic "findable list" ──
    // 1. Items from room's itemPool (skip key items already in party inventory)
    const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
    const roomItemPool = currentRoom?.itemPool?.length ? currentRoom.itemPool : [];
    const findableItems: string[] = [];
    for (const entry of roomItemPool) {
      if (getKeyItemIds().has(entry.itemId) && partyItemIds.has(entry.itemId)) continue;
      if (!foundItems.includes(entry.itemId)) {
        findableItems.push(entry.itemId);
      }
    }

    // 2. Documents scoped to this room (not yet collected)
    const searchDocs = [
      ...Object.values(DOCUMENTS).filter(d => {
        if (d.locationId !== locId) return false;
        if (state.collectedDocuments.includes(d.id)) return false;
        // Documents WITH roomId only match if player is in that room
        if (d.roomId && currentRoom && d.roomId !== currentRoom.id) return false;
        // Documents WITHOUT roomId match if player is at this location
        if (!d.roomId) return false; // In room system, only room-scoped docs are searchable
        return true;
      }),
    ];
    const findableDocIds = searchDocs.map(d => d.id);

    // Total findable = items + documents not yet found
    const allFindableIds = [...findableItems, ...findableDocIds];
    const allFoundCount = foundItems.length;
    const totalFindable = allFindableIds.length;

    // Check if everything is exhausted
    if (allFoundCount >= totalFindable && totalFindable > 0) {
      const emptyMessages = [
        'Non trovate nulla di interessante.',
        'La zona non ha più segreti da svelare.',
        'Perlustrate ogni angolo, ma non c\'è più nulla.',
        'Avete già controllato tutto a fondo.',
      ];
      const msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
      set({
        messageLog: [...newLog, `[${state.turnCount}] 🔍 ${msg}`],
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
      });
      return;
    }

    // ── Find the NEXT item/doc not yet found ──
    // Priority: documents first, then items
    let nextFindId: string | null = null;
    let isDoc = false;

    for (const doc of searchDocs) {
      if (!foundItems.includes(doc.id)) {
        if (doc.hintRequired && !state.collectedDocuments.includes(doc.hintRequired)) continue;
        nextFindId = doc.id;
        isDoc = true;
        break;
      }
    }
    if (!nextFindId) {
      for (const itemId of findableItems) {
        if (!foundItems.includes(itemId)) {
          nextFindId = itemId;
          break;
        }
      }
    }

    if (!nextFindId) {
      const emptyMessages = [
        'Non trovate nulla di interessante.',
        'La zona non ha più segreti da svelare.',
      ];
      const msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
      set({
        messageLog: [...newLog, `[${state.turnCount}] 🔍 ${msg}`],
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
      });
      return;
    }

    // Track found items
    const newFoundItems = [...foundItems, nextFindId];
    const newFoundRoomItems = { ...state.foundRoomItems, [searchKey]: newFoundItems };

    // ── DOCUMENT FOUND ──
    if (isDoc) {
      const doc = DOCUMENTS[nextFindId];
      if (!doc) return;

      const newDocs = [...state.collectedDocuments, doc.id];
      // Track run stats: documents found
      try { get().incrementRunStat('documentsFound'); } catch {}

      // Some documents reveal hidden recipes
      const RECIPE_HINT_DOCS: Record<string, string[]> = {
        'doc_rpd_diary': ['craft_spray_super', 'craft_mega_bandage'],
        'doc_lab_report': ['craft_pipe_bomb', 'craft_grenade_40mm'],
        'doc_sewers_map': ['craft_machinegun_ammo'],
      };
      let newDiscoveredRecipes: string[] | undefined;
      const hintRecipes = RECIPE_HINT_DOCS[doc.id];
      if (hintRecipes) {
        for (const recipeId of hintRecipes) {
          if (!state.discoveredRecipes.includes(recipeId)) {
            newDiscoveredRecipes = [...(newDiscoveredRecipes || state.discoveredRecipes), recipeId];
            const recipe = RECIPES_DATA.find(r => r.id === recipeId);
            if (recipe) {
              newLog.push(`[${state.turnCount}] 📜 Il documento rivela una ricetta segreta: ${recipe.name}!`);
            }
          }
        }
      }

      set({
        messageLog: [...newLog, `[${state.turnCount}] 📖 ${flavourText} ${searcherName} trova un documento: "${doc.title}"`],
        collectedDocuments: newDocs,
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        foundRoomItems: newFoundRoomItems,
        discoveredRecipes: newDiscoveredRecipes || state.discoveredRecipes,
        notification: {
          id: nextNotifId(),
          type: 'item_found',
          message: doc.title,
          icon: doc.icon,
          subMessage: doc.type === 'umbrella_file' ? '📄 File Umbrella' : `📝 ${doc.type}`,
        },
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    // ── ITEM FOUND ──
    const itemDef = ITEMS[nextFindId];
    if (!itemDef) return;

    // ── Collectible (ink ribbon) ──
    if (itemDef.type === 'collectible') {
      if (state.collectedRibbons >= 10) {
        set({
          messageLog: [...newLog, `[${state.turnCount}] 🔍 ${flavourText} Non trovate nulla di utile qui.`],
          turnCount: state.turnCount + 1,
          searchCounts: newSearchCounts,
          foundRoomItems: newFoundRoomItems,
        });
        return;
      }
      const newCount = state.collectedRibbons + 1;
      set({
        messageLog: [...newLog, `[${state.turnCount}] 🎀 Nastro d'Inchiostro trovato! (${newCount}/10)`],
        turnCount: state.turnCount + 1,
        collectedRibbons: newCount,
        searchCounts: newSearchCounts,
        foundRoomItems: newFoundRoomItems,
        notification: {
          id: nextNotifId(),
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
    const addSlotsAmt = getAddSlotsAmount(itemDef.effects);
    if (itemDef.type === 'bag' && addSlotsAmt !== null) {
      const targetId = state.selectedCharacterId || state.party[0]?.id;
      const targetChar = state.party.find(p => p.id === targetId);
      const isFull = targetChar ? targetChar.inventory.length >= targetChar.maxInventorySlots : false;
      const maxSlots = getMaxInventorySlots();

      if (isFull && targetChar && targetChar.maxInventorySlots < maxSlots) {
        const { updatedChar, expanded, oldSlots, newSlots } = applyAddSlotsToCharacter(targetChar, addSlotsAmt);
        const updatedParty = state.party.map(p =>
          p.id === targetId ? updatedChar : p
        );
        set({
          messageLog: [...newLog,
            expanded
              ? `[${state.turnCount}] 🧳 ${targetChar.name} usa ${itemDef.name}! Inventario espanso: ${oldSlots} → ${newSlots} slot.`
              : `[${state.turnCount}] 🧳 ${itemDef.name} trovato, ma l'inventario è già al massimo (${maxSlots} slot).`,
          ],
          party: updatedParty,
          turnCount: state.turnCount + 1,
          searchCounts: newSearchCounts,
          foundRoomItems: newFoundRoomItems,
          notification: expanded ? {
            id: nextNotifId(),
            type: 'bag_expand',
            message: `Inventario espanso!`,
            icon: '🧳',
            itemId: nextFindId,
            subMessage: `${targetChar.name}: ${oldSlots} → ${newSlots} slot`,
            characterId: targetId,
          } : null,
        });
      } else {
        const bagItem: ItemInstance = {
          uid: `bag_${Date.now()}_${Math.random()}`,
          itemId: nextFindId,
          name: itemDef.name,
          description: itemDef.description,
          type: itemDef.type,
          rarity: itemDef.rarity,
          icon: itemDef.icon,
          usable: itemDef.usable,
          equippable: itemDef.equippable,
          effects: itemDef.effects,
          quantity: 1,
        };
        const updatedParty = state.party.map(p =>
          p.id === targetId ? { ...p, inventory: [...p.inventory, bagItem] } : p
        );
        set({
          messageLog: [...newLog, `[${state.turnCount}] 🧳 ${targetChar?.name || 'Qualcuno'} ha trovato ${itemDef.name}! (Usalo dall'inventario per espandere lo spazio)`],
          party: updatedParty,
          turnCount: state.turnCount + 1,
          searchCounts: newSearchCounts,
          foundRoomItems: newFoundRoomItems,
          notification: {
            id: nextNotifId(),
            type: 'item_found',
            message: itemDef.name,
            icon: itemDef.icon,
            itemId: nextFindId,
            subMessage: `Ricevuto da ${targetChar?.name || 'qualcuno'}`,
            characterId: targetId,
          },
        });
      }
      return;
    }

    // ── KEY ITEM CHECK: prevent duplicate keys ──
    if (getKeyItemIds().has(nextFindId)) {
      const partyAlreadyHasKey = state.party.some(p =>
        p.inventory.some(i => i.itemId === nextFindId)
      );
      if (partyAlreadyHasKey) {
        set({ messageLog: [...newLog, `[${state.turnCount}] 🎒 Avete trovato ${itemDef.name}, ma ne avete già una copia.`], turnCount: state.turnCount + 1, searchCounts: newSearchCounts, foundRoomItems: newFoundRoomItems });
        return;
      }
    }

    // ── NORMAL ITEM: add to inventory ──
    const newItem: ItemInstance = {
      uid: `${nextFindId}_${Date.now()}`,
      itemId: nextFindId,
      name: itemDef.name,
      description: itemDef.description,
      type: itemDef.type,
      rarity: itemDef.rarity,
      icon: itemDef.icon,
      usable: itemDef.usable,
      equippable: itemDef.equippable,
      effects: itemDef.effects,
      quantity: 1,
    };

    const targetId = state.selectedCharacterId || state.party[0]?.id;
    let finder: typeof state.party[0] | null = null;
    const updatedParty = state.party.map(p => {
      if (!finder && p.id === targetId) {
        const existingIdx = p.inventory.findIndex(i => i.itemId === nextFindId);
        if (existingIdx >= 0) {
          finder = p;
          const updatedInv = [...p.inventory];
          updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + 1 };
          return { ...p, inventory: updatedInv };
        }
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
          const existingIdx = p.inventory.findIndex(i => i.itemId === nextFindId);
          if (existingIdx >= 0) {
            finder = p;
            const updatedInv = [...p.inventory];
            updatedInv[existingIdx] = { ...updatedInv[existingIdx], quantity: updatedInv[existingIdx].quantity + 1 };
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
        searchCounts: newSearchCounts,
        foundRoomItems: newFoundRoomItems,
        notification: finder ? {
          id: nextNotifId(),
          type: 'item_found',
          message: itemDef.name,
          icon: itemDef.icon,
          itemId: nextFindId,
          subMessage: `Ricevuto da ${finder.name}`,
          characterId: finder.id,
        } : null,
      });
    } else {
      set({
        messageLog: [...newLog, `[${state.turnCount}] 🎒 ${finder.name} ha trovato: ${itemDef.name}!`],
        party: updatedParty,
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        foundRoomItems: newFoundRoomItems,
        notification: {
          id: nextNotifId(),
          type: 'item_found',
          message: itemDef.name,
          icon: itemDef.icon,
          itemId: nextFindId,
          subMessage: `Ricevuto da ${finder.name}`,
          characterId: finder.id,
        },
      });
    }
  },
});
