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
import {
  playLocationAmbient,
  playTravel,
  playSearch,
  playLevelUp,
  playEncounter,
  playDocumentFound,
  playItemPickup,
  playMenuOpen,
  playMenuClose,
} from '../../engine/sounds';

export const createExplorationSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  explore: () => {
    const state = get();
    if (state.isExploring) return;
    set({ isExploring: true });
    const location = LOCATIONS[state.currentLocationId];
    if (!location) {
      set({ isExploring: false });
      return;
    }

    // Schedule auto-save every 5 turns (fires after current explore completes)
    if ((state.turnCount + 1) % 5 === 0 && state.phase === 'exploration' && state.party.length > 0) {
      setTimeout(() => { try { get().autoSave(); } catch {} }, 300);
    }

    // #45 Randomizer: get effective enemy pool and encounter rate
    const effectiveLoc = getEffectiveLocation(state.currentLocationId, state.randomizedLocationData);
    const enemyPool = effectiveLoc?.enemyPool || location.enemyPool;
    const encounterRate = effectiveLoc?.encounterRate ?? location.encounterRate;

    // Play location ambient sound (#33)
    try { playLocationAmbient(state.currentLocationId); } catch {}

    // Random ambient text
    const ambient = location.ambientText?.length > 0
      ? location.ambientText[Math.floor(Math.random() * location.ambientText.length)]
      : `${location.name} è silenziosa...`;
    const newLog = [...state.messageLog, `[${state.turnCount}] ${ambient}`];

    // Check for combat encounter (skip if just resolved an event)
    const shouldSkipEncounter = state.skipNextEncounter;
    if (shouldSkipEncounter) {
      set({ messageLog: newLog, turnCount: state.turnCount + 1, skipNextEncounter: false, isExploring: false });
      return;
    }

    if (Math.random() * 100 < encounterRate) {
      // Play encounter sound (#36)
      try { playEncounter(); } catch {}

      const diff = getDifficultyConfig(state.difficulty, state.partySize);
      // Spawn enemies scaled by party size
      const numEnemies = diff.minEnemies + Math.floor(Math.random() * (diff.maxEnemies - diff.minEnemies + 1));
      const enemies: EnemyInstance[] = [];
      if (enemyPool.length === 0) {
        set({ messageLog: newLog, turnCount: state.turnCount + 1, isExploring: false });
        return;
      }
      for (let i = 0; i < numEnemies; i++) {
        const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        enemies.push(createEnemyInstance(enemyId, diff.statMult));
      }

      const enemyNames = enemies.map(e => e.name).join(', ');

      // ── SECRET BOSS CHECK (proto_tyrant) ──
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
          id: nextNotifId(),
          type: 'encounter',
          message: `Incontro: ${secretEnemyNames}`,
          icon: '⚔️',
          subMessage: 'Preparati al combattimento!',
        },
        isExploring: false,
      });

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
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Combattimento', message: `Incontro con ${secretEnemyNames}!` }],
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

    // ── NEMESIS INVASION CHECK (Persistent Pursuit) ──
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
          id: nextNotifId(),
          type: 'encounter',
          message: `💀 NEMESIS INVASIONE! [Lv.${nemesisPursuitLevel + 1}]`,
          icon: '💀',
          subMessage: `S.T.A.R.S... ${pursuitLabel}!`,
        },
        nemesisLastSeenLocation: state.currentLocationId,
        nemesisLastSeenTurn: state.turnCount,
        isExploring: false,
      });

      setTimeout(() => {
        const currentState = get();
        const allActors = [
          ...currentState.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...[nemesis].map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => {
          const jitterA = Math.random() * 4;
          const jitterB = Math.random() * 4;
          return (b.spd + jitterB) - (a.spd + jitterA);
        });
        const firstActor = allActors[0];

        const nemesisBestiary = [...currentState.bestiary];
        const existingNem = nemesisBestiary.find(b => b.enemyId === 'nemesis_boss');
        if (!existingNem) {
          nemesisBestiary.push({ enemyId: 'nemesis_boss', encountered: true, defeated: false, timesDefeated: 0 });
        } else {
          existingNem.encountered = true;
        }

        const nemesisVc = rollVictoryCondition([nemesis]);
        set({
          phase: 'combat',
          enemies: [nemesis],
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
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player', action: 'Invasione', message: `NEMESIS è apparso! "S.T.A.R.S.!" [Livello ${nemesisPursuitLevel + 1}/5]` }],
            isVictory: false,
            isDefeat: false,
            fled: true,
            statusDurations: {},
            specialCooldowns: {},
            special2Cooldowns: {},
            tauntTargetId: null,
            activeEffects: [],
            victoryCondition: nemesisVc,
            comboCount: 0,
            comboTargetId: null,
            lastOffensiveAction: null,
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
      const allEvents = Object.values(DYNAMIC_EVENTS);
      const eligibleEvents = allEvents.filter(e => {
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
          isExploring: false,
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
          isExploring: false,
        });
      } else {
        set({
          dynamicEventTurnsLeft: newTurnsLeft,
          party: updatedParty,
          messageLog: [...newLog, ...tickLog],
          turnCount: state.turnCount + 1,
          isExploring: false,
        });
      }
      return;
    }

    // ── NPC ENCOUNTER CHECK ──
    const locationNpcs = Object.values(NPCS).filter(n => n.locationId === state.currentLocationId);
    const newNpcs = locationNpcs.filter(n => !state.npcsEncountered.includes(n.id));
    if (newNpcs.length > 0 && Math.random() < 0.15) {
      const npc = newNpcs[Math.floor(Math.random() * newNpcs.length)];
      set({ isExploring: false });
      get().encounterNpc(npc.id);
      return;
    }

    // Check for random item find
    const effectiveItemPool = effectiveLoc?.itemPool || location.itemPool.map(e => ({ itemId: e.itemId, chance: e.chance, quantity: e.quantity }));
    if (Math.random() < 0.3 && effectiveItemPool.length > 0) {
      // Filter out key items already in party inventory BEFORE selection
      const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
      const eligibleItems = effectiveItemPool.filter(entry =>
        !(getKeyItemIds().has(entry.itemId) && partyItemIds.has(entry.itemId))
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
              set({ messageLog: newLog, turnCount: state.turnCount + 1, isExploring: false });
              return;
            }
            const newCount = state.collectedRibbons + 1;
            set({
              messageLog: [...newLog, `[${state.turnCount}] 🎀 Nastro d'Inchiostro trovato! (${newCount}/10)`],
              turnCount: state.turnCount + 1,
              collectedRibbons: newCount,
              notification: {
                id: nextNotifId(),
                type: 'collectible_found' as const,
                message: `Nastro d'Inchiostro`,
                icon: '🎀',
                itemId: 'ink_ribbon',
                subMessage: `Collezionabili: ${newCount}/10`,
              },
              isExploring: false,
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
              // Auto-equip: expand slots immediately
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
                notification: expanded ? {
                  id: nextNotifId(),
                  type: 'bag_expand',
                  message: `Inventario espanso!`,
                  icon: '🧳',
                  itemId: foundEntry.itemId,
                  subMessage: `${targetChar.name}: ${oldSlots} → ${newSlots} slot`,
                  characterId: targetId,
                } : null,
                isExploring: false,
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
                effects: itemDef.effects,
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
                  id: nextNotifId(),
                  type: 'item_found',
                  message: itemDef.name,
                  icon: itemDef.icon,
                  itemId: foundEntry.itemId,
                  subMessage: `Ricevuto da ${targetChar?.name || 'qualcuno'}`,
                  characterId: targetId,
                },
                isExploring: false,
              });
            }
            return;
          }

          // ── KEY ITEM CHECK: prevent duplicate keys ──
          if (getKeyItemIds().has(foundEntry.itemId)) {
            const partyAlreadyHasKey = state.party.some(p =>
              p.inventory.some(i => i.itemId === foundEntry.itemId)
            );
            if (partyAlreadyHasKey) {
              set({ messageLog: [...newLog, `[${state.turnCount}] 🎒 Avete trovato ${itemDef.name}, ma ne avete già una copia.`], turnCount: state.turnCount + 1, isExploring: false });
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
        
            effects: itemDef.effects,
            quantity: foundEntry.quantity,
          };

          const targetId = state.selectedCharacterId || state.party[0]?.id;
          let finder: typeof state.party[0] | null = null;
          const updatedParty = state.party.map(p => {
            if (!finder && p.id === targetId) {
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
                id: nextNotifId(),
                type: 'item_found',
                message: itemDef.name,
                icon: itemDef.icon,
                itemId: foundEntry.itemId,
                subMessage: `Ricevuto da ${finder.name}`,
                characterId: finder.id,
              } : null,
              isExploring: false,
            });
          } else {
            set({
              messageLog: [...newLog, `[${state.turnCount}] 🎒 ${finder.name} ha trovato: ${itemDef.name}!`],
              party: updatedParty,
              turnCount: state.turnCount + 1,
              notification: {
                id: nextNotifId(),
                type: 'item_found',
                message: itemDef.name,
                icon: itemDef.icon,
                itemId: foundEntry.itemId,
                subMessage: `Ricevuto da ${finder.name}`,
                characterId: finder.id,
              },
              isExploring: false,
            });
          }
          return;
        }
      }
    }

    // ── DOCUMENT DISCOVERY IN EXPLORE ──
    const allLocationDocs = [
      ...Object.values(DOCUMENTS).filter(d =>
        d.locationId === state.currentLocationId &&
        !state.collectedDocuments.includes(d.id)
      ),
    ];
    if (allLocationDocs.length > 0 && Math.random() < 0.25) {
      const doc = allLocationDocs[Math.floor(Math.random() * allLocationDocs.length)];
      if (doc.hintRequired && !state.collectedDocuments.includes(doc.hintRequired)) {
        set({ messageLog: newLog, turnCount: state.turnCount + 1, isExploring: false });
        return;
      }
      try { playDocumentFound(); } catch {}
      const newDocs = [...state.collectedDocuments, doc.id];
      set({
        messageLog: [...newLog, `[${state.turnCount}] 📖 Documento trovato: "${doc.title}"`],
        collectedDocuments: newDocs,
        turnCount: state.turnCount + 1,
        notification: {
          id: nextNotifId(),
          type: 'item_found',
          message: doc.title,
          icon: doc.icon,
          subMessage: doc.type === 'umbrella_file' ? '📄 File Umbrella' : `📝 ${doc.type}`,
        },
        isExploring: false,
      });
      return;
    }

    set({ messageLog: newLog, turnCount: state.turnCount + 1, isExploring: false });
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

    try { playTravel(); } catch {}
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
      skipNextEncounter: true,
      currentSubArea: null,
    });
    setTimeout(() => get().checkAchievements(), 100);
  },

  searchArea: () => {
    const state = get();
    const location = LOCATIONS[state.currentLocationId];
    if (!location) return;
    const locId = state.currentLocationId;
    const searchCount = state.searchCounts[locId] || 0;

    const effectiveLoc = getEffectiveLocation(locId, state.randomizedLocationData);
    const effectiveItemPool = effectiveLoc?.itemPool || location.itemPool.map(e => ({ itemId: e.itemId, chance: e.chance, quantity: e.quantity }));

    try { playSearch(); } catch {}

    const baseSearchChance = location.searchChance ?? 60;
    const baseDocChance = location.docChance ?? 35;
    const locSearchMax = location.searchMax;

    const activeEvent = state.activeDynamicEvent || null;
    const hasSearchBonus = activeEvent?.effect?.searchBonus === true;
    const searchBoost = hasSearchBonus ? 20 : 0;

    const effectiveSearchChance = Math.min(100, baseSearchChance + searchBoost);
    const effectiveDocChance = Math.min(100, baseDocChance + searchBoost);

    const maxSearches = state.searchMaxes[locId]
      || (locSearchMax != null
        ? (locSearchMax === 0 ? Infinity : locSearchMax)
        : (Math.floor(Math.random() * 3) + 1));
    const newSearchMaxes = state.searchMaxes[locId]
      ? state.searchMaxes
      : { ...state.searchMaxes, [locId]: maxSearches };

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

    const newSearchCounts = { ...state.searchCounts, [locId]: searchCount + 1 };

    const searchFlavourTexts = [
      `${searcherName} ispeziona gli scaffali...`,
      `${searcherName} rovista tra i detriti...`,
      `${searcherName} controlla dietro ogni angolo...`,
      `${searcherName} fruga in un armadio socchiuso...`,
      `${searcherName} scava tra le macerie...`,
    ];
    const flavourText = searchFlavourTexts[Math.floor(Math.random() * searchFlavourTexts.length)];

    // ── PHASE 1: Miss check ──
    if (Math.random() * 100 >= effectiveSearchChance) {
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

    // ── PHASE 2: Roll items from pool ──
    const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
    const foundItems: string[] = [];
    for (const entry of effectiveItemPool) {
      if (getKeyItemIds().has(entry.itemId) && partyItemIds.has(entry.itemId)) continue;
      if (Math.random() * 100 < entry.chance) {
        foundItems.push(entry.itemId);
      }
    }

    // ── PHASE 3: Document vs Items ──
    const searchDocs = [
      ...Object.values(DOCUMENTS).filter(d =>
        d.locationId === locId &&
        !state.collectedDocuments.includes(d.id) &&
        (!d.hintRequired || state.collectedDocuments.includes(d.hintRequired))
      ),
    ];
    if (searchDocs.length > 0 && Math.random() * 100 < effectiveDocChance) {
      const doc = searchDocs[Math.floor(Math.random() * searchDocs.length)];
      const newDocs = [...state.collectedDocuments, doc.id];
      try { playDocumentFound(); } catch {}
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
      const docLog = newDiscoveredRecipes
        ? [...newLog, `[${state.turnCount}] 📖 ${flavourText} ${searcherName} trova un documento: "${doc.title}"`]
        : [...newLog, `[${state.turnCount}] 📖 ${flavourText} ${searcherName} trova un documento: "${doc.title}"`];
      set({
        messageLog: docLog,
        collectedDocuments: newDocs,
        turnCount: state.turnCount + 1,
        searchCounts: newSearchCounts,
        searchMaxes: newSearchMaxes,
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

    // ── PHASE 4: Award items ──
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

      if (itemDef.type === 'collectible') {
        if (newRibbonCount < 10) {
          newRibbonCount += 1;
          foundNames.push(`🎀 ${itemDef.name} (${newRibbonCount}/10)`);
          lastNotif = {
            id: nextNotifId(),
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

      const searchBagAmt = getAddSlotsAmount(itemDef.effects);
      if (itemDef.type === 'bag' && searchBagAmt !== null) {
        const isFull = targetChar ? targetChar.inventory.length >= targetChar.maxInventorySlots : false;
        const maxSlots = getMaxInventorySlots();
        if (isFull && targetChar && targetChar.maxInventorySlots < maxSlots) {
          const { updatedChar, expanded, oldSlots, newSlots } = applyAddSlotsToCharacter(targetChar, searchBagAmt);
          updatedParty = updatedParty.map(p =>
            p.id === targetId ? updatedChar : p
          );
          foundNames.push(`${itemDef.name} (slot ${oldSlots}→${newSlots})`);
          lastNotif = {
            id: nextNotifId(),
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
            effects: itemDef.effects,
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

      if (getKeyItemIds().has(itemId)) {
        const partyAlreadyHasKey = updatedParty.some(p =>
          p.inventory.some(i => i.itemId === itemId)
        );
        if (partyAlreadyHasKey) {
          continue;
        }
      }

      const finderChar = updatedParty.find(p => p.id === targetId);
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
        
            effects: itemDef.effects,
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

    if (foundNotifItems.length > 0) {
      try { playItemPickup(); } catch {}
    }
    const finderChar = updatedParty.find(p => p.id === targetId);
    if (!lastNotif && foundNotifItems.length > 0) {
      if (foundNotifItems.length === 1) {
        const item = foundNotifItems[0];
        lastNotif = {
          id: nextNotifId(),
          type: 'item_found' as const,
          message: item.name,
          icon: item.icon,
          itemId: item.itemId,
          subMessage: `Ricevuto da ${finderChar?.name || 'qualcuno'}`,
          characterId: targetId,
        };
      } else {
        lastNotif = {
          id: nextNotifId(),
          type: 'item_found' as const,
          message: `${foundNotifItems.length} oggetti trovati!`,
          icon: '🎒',
          subMessage: `Ricevuti da ${finderChar?.name || 'qualcuno'}`,
          characterId: targetId,
          items: foundNotifItems,
        };
      }
    }

    // ── SECRET ROOM DISCOVERY ──
    const locationSecrets = Object.values(SECRET_ROOMS).filter((s: any) =>
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

    // Recipe discovery: 8% chance to discover a hidden recipe during search
    let newDiscoveredRecipes: string[] | undefined;
    if (!state.activeDynamicEvent) {
      const hiddenRecipes = RECIPES_DATA.filter(r => r.hidden && !state.discoveredRecipes.includes(r.id));
      if (hiddenRecipes.length > 0 && Math.random() * 100 < 8) {
        const discoveredRecipe = hiddenRecipes[Math.floor(Math.random() * hiddenRecipes.length)];
        newDiscoveredRecipes = [...state.discoveredRecipes, discoveredRecipe.id];
        newLog.push(`[${state.turnCount}] 📜 Hai trovato un appunto con una ricetta di crafting segreta: ${discoveredRecipe.name}!`);
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
      discoveredRecipes: newDiscoveredRecipes || state.discoveredRecipes,
    });
    setTimeout(() => get().checkAchievements(), 100);
  },

  handleEventChoice: (choiceIndex: number) => {
    const state = get();
    const event = state.activeEvent;
    if (!event) return;

    const choice = event.choices[choiceIndex];
    if (!choice) return;

    // ── PUZZLE CHECK ──
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

    if (outcome.hpChange) {
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
      }));
      logMessages.push(`[${state.turnCount}] ${outcome.hpChange > 0 ? '❤️' : '💔'} ${Math.abs(outcome.hpChange)} HP ${outcome.hpChange > 0 ? 'recuperati' : 'persi'}.`);
    }

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

    if (outcome.triggerCombat && outcome.combatEnemyIds) {
      const eventDiff = getDifficultyConfig(state.difficulty, state.partySize);
      const enemies = outcome.combatEnemyIds.map(id => createEnemyInstance(id, eventDiff.statMult));
      const allActors = [
        ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
        ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
      ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);

      const firstActor = allActors[0];

      const newCompletedCombat = state.completedEvents.includes(state.currentLocationId)
        ? state.completedEvents
        : [...state.completedEvents, state.currentLocationId];

      set({
        phase: 'combat',
        party: updatedParty,
        autoCombat: getAutoCombatDefault(),
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
          activeEffects: [],
          comboCount: 0,
          comboTargetId: null,
          lastOffensiveAction: null,
        },
        messageLog: [...state.messageLog, ...logMessages],
      });

      if (firstActor.type === 'enemy') {
        setTimeout(() => get().advanceToNextActor(), 1200);
      }
      return;
    }

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

    const newCompleted = state.completedEvents.includes(state.currentLocationId)
      ? state.completedEvents
      : [...state.completedEvents, state.currentLocationId];

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
    setTimeout(() => get().checkAchievements(), 100);
  },

  closeEvent: () => {
    set({ activeEvent: null, eventOutcome: null, skipNextEncounter: true });
  },

  toggleInventory: () => {
    try {
      const isOpen = get().inventoryOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ inventoryOpen: !state.inventoryOpen }));
  },

  selectCharacter: (characterId: string) => {
    set({ selectedCharacterId: characterId });
  },
});
