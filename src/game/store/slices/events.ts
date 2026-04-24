import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { StoryChoiceTag } from '../../types';
import { ITEMS, DYNAMIC_EVENTS, SECRET_ROOMS } from '../../data/loader';
import { ENDINGS } from '../../data/endings';
import { addItemToParty, nextNotifId } from '../helpers';

export const createEventsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  triggerDynamicEvent: (eventId: string) => {
    const event = DYNAMIC_EVENTS[eventId];
    if (!event) return;
    set(state => ({
      activeDynamicEvent: event,
      dynamicEventTurnsLeft: event.duration,
      messageLog: [...state.messageLog, `[${state.turnCount}] ${event.icon} ${event.onTriggerMessage}`],
      notification: {
        id: nextNotifId(),
        type: 'encounter',
        message: `${event.icon} ${event.title}`,
        icon: event.icon,
        subMessage: event.description,
      },
    }));
  },

  handleDynamicEventChoice: (choiceIndex: number) => {
    const state = get();
    if (!state.activeDynamicEvent) return;
    const choice = state.activeDynamicEvent.choices[choiceIndex];
    if (!choice) return;
    const outcome = choice.outcome;
    let updatedParty = [...state.party];
    const logMessages = [`[${state.turnCount}] ${outcome.description}`];
    if (outcome.hpChange) {
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp + outcome.hpChange),
      }));
    }
    if (outcome.receiveItems) {
      for (const itemEntry of outcome.receiveItems) {
        const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
        updatedParty = result.party;
        if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ricevuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
      }
    }
    if (outcome.endEvent) {
      logMessages.push(`[${state.turnCount}] ${state.activeDynamicEvent.onEndMessage}`);
      const completedEventId = state.activeDynamicEvent.id;
      set({
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        turnCount: state.turnCount + 1,
      });
      get().checkEventChain(completedEventId);
    } else {
      set({
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        turnCount: state.turnCount + 1,
      });
    }
  },

  tickDynamicEvent: () => {
    const state = get();
    if (!state.activeDynamicEvent) return;
    const newTurnsLeft = state.dynamicEventTurnsLeft - 1;
    const logMsgs: string[] = [];
    let updatedParty = [...state.party];
    if (state.activeDynamicEvent.effect.damagePerTurn > 0) {
      const dmg = state.activeDynamicEvent.effect.damagePerTurn;
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMsgs.push(`[${state.turnCount}] 💔 ${state.activeDynamicEvent.icon} ${dmg} danni a tutti (${newTurnsLeft} turni rimasti)`);
    }
    if (newTurnsLeft <= 0) {
      logMsgs.push(`[${state.turnCount}] ✅ ${state.activeDynamicEvent.onEndMessage}`);
      const completedEventId = state.activeDynamicEvent.id;
      set({
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMsgs],
      });
      get().checkEventChain(completedEventId);
    } else {
      set({
        dynamicEventTurnsLeft: newTurnsLeft,
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMsgs],
      });
    }
  },

  discoverSecretRoom: (roomId: string) => {
    const state = get();
    const secret = SECRET_ROOMS[roomId];
    if (!secret || state.discoveredSecretRooms.includes(roomId)) return;
    // Track run stats: secret rooms discovered
    get().incrementRunStat('secretRoomsDiscovered');
    const newDiscovered = [...state.discoveredSecretRooms, roomId];
    const logMsgs = [
      `[${state.turnCount}] 🚪 Stanza segreta trovata: ${secret.name}!`,
      `[${state.turnCount}] ${secret.description}`,
    ];
    let updatedParty = [...state.party];
    if (secret.uniqueItem) {
      const itemDef = ITEMS[secret.uniqueItem.itemId];
      if (itemDef) {
        const result = addItemToParty(updatedParty, secret.uniqueItem.itemId, secret.uniqueItem.quantity);
        updatedParty = result.party;
        if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Trovato: ${itemDef.name}! → ${result.characterName}`);
      }
    }
    for (const entry of secret.lootTable) {
      if (Math.random() * 100 < entry.chance) {
        const itemDef = ITEMS[entry.itemId];
        if (itemDef) {
          const result = addItemToParty(updatedParty, entry.itemId, entry.quantity);
          updatedParty = result.party;
          if (result.added) logMsgs.push(`[${state.turnCount}] 🎒 Trovato: ${itemDef.name} x${entry.quantity} → ${result.characterName}`);
        }
      }
    }
    set({
      discoveredSecretRooms: newDiscovered,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMsgs],
      turnCount: state.turnCount + 1,
      notification: {
        id: nextNotifId(),
        type: 'item_found',
        message: `🚪 ${secret.name}`,
        icon: '🚪',
        subMessage: 'Stanza segreta scoperta!',
      },
    });
    setTimeout(() => get().checkAchievements(), 100);
  },

  discoverRecipe: (recipeId: string) => {
    const state = get();
    if (state.discoveredRecipes.includes(recipeId)) return;
    // Track run stats: recipes discovered
    get().incrementRunStat('recipesDiscovered');
    set({
      discoveredRecipes: [...state.discoveredRecipes, recipeId],
      messageLog: [...state.messageLog, `[${state.turnCount}] 📜 Ricetta scoperta! Nuova ricetta di crafting disponibile.`],
    });
  },

  determineEnding: () => {
    const state = get();
    const endings = Object.values(ENDINGS).sort((a, b) => b.priority - a.priority);
    for (const ending of endings) {
      const met = ending.requirements.every(req => {
        switch (req.type) {
          case 'boss_defeated':
            return state.bestiary.some(b => b.enemyId === req.value && b.defeated);
          case 'npc_saved':
            return Object.values(state.npcQuestProgress).filter(p => p.completed).length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'documents_found':
            return state.collectedDocuments.length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'turn_limit':
            return state.turnCount <= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'party_alive':
            return state.party.filter(p => p.currentHp > 0).length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          case 'choice':
            return state.storyChoices.includes(String(req.value) as StoryChoiceTag);
          case 'secret_rooms':
            return state.discoveredSecretRooms.length >= (typeof req.value === 'number' ? req.value : parseInt(String(req.value)));
          default: return true;
        }
      });
      if (met) return ending;
    }
    const fallback = ENDINGS['ending_escape'];
    if (!fallback) {
      return { id: 'ending_unknown', name: 'Fine', description: 'Il tuo viaggio è terminato.', requirements: [], priority: -1 };
    }
    return fallback;
  },

  checkEventChain: (completedEventId: string) => {
    const state = get();
    const completedEvent = DYNAMIC_EVENTS[completedEventId];
    if (!completedEvent?.nextEventId) return;

    // Check if next event exists and hasn't been permanently completed
    const nextEvent = DYNAMIC_EVENTS[completedEvent.nextEventId];
    if (!nextEvent || state.completedPermanentEvents.includes(nextEvent.id)) return;

    // Check minTurn requirement
    if (state.turnCount < (nextEvent.minTurn || 0)) {
      // Schedule for later
      set(state => ({
        pendingChainEvent: { eventId: nextEvent.id, triggerTurn: nextEvent.minTurn || state.turnCount + 5 },
        completedChains: [...state.completedChains, completedEvent.chainId || completedEventId],
      }));
      return;
    }

    // Trigger immediately
    get().triggerDynamicEvent(nextEvent.id);
    set(state => ({
      completedChains: [...state.completedChains, completedEvent.chainId || completedEventId],
      messageLog: [...state.messageLog, `[${state.turnCount}] ⛓️ Evento a catena! ${nextEvent.icon} ${nextEvent.title} si attiva!`],
    }));
  },

  toggleMap: () => {
    set(state => ({ mapOpen: !state.mapOpen }));
  },

  exploreSubArea: (subAreaId: string) => {
    const state = get();
    const locId = state.currentLocationId;
    const currentSubAreas = state.exploredSubAreas[locId] || [];
    if (currentSubAreas.includes(subAreaId)) return;
    set(state => ({
      exploredSubAreas: {
        ...state.exploredSubAreas,
        [locId]: [...currentSubAreas, subAreaId],
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] 🗺️ Nuova area esplorata: ${subAreaId}`],
    }));
  },
});
