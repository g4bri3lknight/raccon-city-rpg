import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { SaveSlotInfo } from '../types';
import { LOCATIONS } from '../../data/loader';

export const createSaveSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
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
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: state.collectedRibbons || 0,
      persistentRibbons: state.persistentRibbons || 0,
      isNewGamePlus: state.isNewGamePlus || false,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
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
      isNewGamePlus: state.isNewGamePlus || false,
      persistentRibbons: state.persistentRibbons || 0,
      collectedRibbons: state.collectedRibbons || 0,
    };

    try {
      if (typeof window !== 'undefined') {
        const json = JSON.stringify(saveData);
        if (json.length > 4_000_000) {
          // localStorage ~5MB limit; warn and trim randomizedLocationData
          console.warn(`[saveGame] Save data is ${(json.length / 1024).toFixed(0)}KB, trimming randomizedLocationData`);
          saveData.randomizedLocationData = null;
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }
  },

  autoSave: () => {
    const state = get();

    // Don't auto-save during combat, game-over, or title screen
    if (state.phase === 'combat' || state.phase === 'game-over' || state.phase === 'title' || state.phase === 'victory') return;
    // Don't auto-save if party is empty (not in adventure)
    if (!state.party || state.party.length === 0) return;

    const saveData = {
      version: 1,
      isAutoSave: true,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: state.collectedRibbons || 0,
      persistentRibbons: state.persistentRibbons || 0,
      isNewGamePlus: state.isNewGamePlus || false,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
      lastAutoSaveTurn: state.turnCount,
    };

    const saveKey = 'raccoon_city_autosave';
    const saveMetaKey = 'raccoon_city_autosave_meta';

    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot: -1,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Sconosciuto',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: state.phase,
      isNewGamePlus: state.isNewGamePlus || false,
      persistentRibbons: state.persistentRibbons || 0,
      collectedRibbons: state.collectedRibbons || 0,
    };

    try {
      if (typeof window !== 'undefined') {
        const json = JSON.stringify(saveData);
        if (json.length > 4_000_000) {
          saveData.randomizedLocationData = null;
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }

    set({ lastAutoSaveTurn: state.turnCount });
  },

  loadGame: (slot: number) => {
    const saveKey = `raccoon_city_save_${slot}`;

    try {
      if (typeof window === 'undefined') return false;

      const raw = localStorage.getItem(saveKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

      // Basic structural validation of saved data
      if (
        !Array.isArray(data.party) ||
        typeof data.phase !== 'string' ||
        typeof data.turnCount !== 'number'
      ) {
        console.warn('[loadGame] Save data missing required top-level fields (party, phase, turnCount). Aborting load.');
        return false;
      }
      for (const member of data.party) {
        if (
          !member.id ||
          !member.name ||
          typeof member.currentHp !== 'number' ||
          typeof member.maxHp !== 'number' ||
          !Array.isArray(member.inventory)
        ) {
          console.warn(`[loadGame] Party member missing required fields: ${member?.id ?? '(no id)'}. Aborting load.`);
          return false;
        }
      }

      // Check if this is a New Game+ save (saved after victory)
      const isNGP = data.isNewGamePlus || false;
      const persistentRibs = data.persistentRibbons || 0;

      set({
        phase: isNGP && data.phase === 'victory' ? 'victory' : 'exploration',
        party: data.party,
        currentLocationId: data.currentLocationId,
        combat: data.combat,
        enemies: data.enemies || [],
        activeEvent: data.activeEvent,
        eventOutcome: data.eventOutcome,
        messageLog: [
          ...data.messageLog,
          `[Turno ${data.turnCount}] 💾 Partita caricata dallo Slot ${slot}.${isNGP ? ' 🎀 Nastri persistenti: ' + persistentRibs + '/10' : ''}`,
        ],
        turnCount: data.turnCount,
        difficulty: data.difficulty || 'normale',
        selectedDifficulty: data.selectedDifficulty || 'normale',
        inventoryOpen: false,
        selectedCharacterId: data.selectedCharacterId || data.party[0]?.id || null,
        searchCounts: data.searchCounts || {},
        searchMaxes: data.searchMaxes || {},
        partySize: data.partySize || 2,
        unlockedPaths: data.unlockedPaths || [],
        visitedLocations: data.visitedLocations || [],
        completedEvents: data.completedEvents || [],
        mapOpen: false,
        collectedRibbons: data.collectedRibbons || 0,
        persistentRibbons: persistentRibs,
        isNewGamePlus: isNGP,
        gameStartTime: data.gameStartTime || Date.now(),
        collectedDocuments: data.collectedDocuments || [],
        activeNpc: null,
        npcQuestProgress: data.npcQuestProgress || {},
        npcsEncountered: data.npcsEncountered || [],
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        storyChoices: data.storyChoices || [],
        discoveredSecretRooms: data.discoveredSecretRooms || [],
        endingType: data.endingType || null,
        exploredSubAreas: data.exploredSubAreas || {},
        documentsOpen: false,
        missionsOpen: false,
        npcsOpen: false,
        randomizerMode: data.randomizerMode || false,
        randomizedLocationData: data.randomizedLocationData || null,
        currentSubArea: data.currentSubArea || null,
        itemBoxItems: data.itemBoxItems || [],
        readDocuments: data.readDocuments || [],
        nemesisPursuitLevel: data.nemesisPursuitLevel || 0,
        nemesisLastSeenLocation: data.nemesisLastSeenLocation || null,
        nemesisLastSeenTurn: data.nemesisLastSeenTurn || 0,
        bossPhases: data.bossPhases || {},
        lastAutoSaveTurn: data.lastAutoSaveTurn || 0,
      });
      // Auto-save after loading
      setTimeout(() => { try { get().autoSave(); } catch {} }, 200);
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

  // Save at victory (New Game+ save): merges run ribbons into persistent, flags as NG+
  saveGameVictory: (slot: number) => {
    const state = get();
    const totalPersistent = Math.min((state.persistentRibbons || 0) + (state.collectedRibbons || 0), 10);

    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: 0, // reset for next run
      persistentRibbons: totalPersistent,
      isNewGamePlus: true,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      endingType: state.endingType,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
    };

    const saveKey = `raccoon_city_save_${slot}`;
    const saveMetaKey = `raccoon_city_save_meta_${slot}`;
    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Vittoria',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: 'victory',
      isNewGamePlus: true,
      persistentRibbons: totalPersistent,
      collectedRibbons: 0,
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // silently fail
    }

    return totalPersistent;
  },

  // Start a New Game+ from a victory save
  startNewGamePlus: (persistentRibbons: number) => {
    set({
      phase: 'character-select',
      party: [],
      messageLog: ['🎀 Nuovo Gioco+ attivato! Nastri persistenti: ' + persistentRibbons + '/10', '\nScegli i tuoi personaggi per la nuova avventura...'],
      turnCount: 0,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: Math.min(persistentRibbons, 10),
      isNewGamePlus: true,
      gameStartTime: 0,
      inventoryOpen: false,
      selectedCharacterId: null,
      enemies: [],
      combat: null,
      activeEvent: null,
      eventOutcome: null,
      difficulty: 'normale',
      selectedDifficulty: 'normale',
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      collectedDocuments: [],
      documentsOpen: false,
      missionsOpen: false,
      activeNpc: null,
      npcQuestProgress: {},
      npcsEncountered: [],
      npcsOpen: false,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: [],
      discoveredSecretRooms: [],
      endingType: null,
      exploredSubAreas: {},
      currentSubArea: null,
      itemBoxItems: [],
      searchedSafeRooms: [],
      readDocuments: [],
    });
  },

  // ==========================================
  // NPC METHODS
  // ==========================================

  encounterNpc: (npcId: string, specificQuestId?: string) => {
    const npc = NPCS[npcId];
    if (!npc) return;

    const state = get();
    const alreadyEncountered = state.npcsEncountered.includes(npcId);

    // Play NPC encounter sound only on first encounter
    if (!alreadyEncountered) {
      try { playNPCEncounter(); } catch {}
    }

    // If a specific quest ID is provided (e.g. from MissionsPanel completed quest click),
    // show that exact quest even if completed
    let npcWithQuest = npc;
    if (specificQuestId && QUESTS[specificQuestId]) {
      npcWithQuest = { ...npc, quest: QUESTS[specificQuestId] };
    } else {
      // Normal flow: check for next available quest
      const completedQuestIds = Object.keys(state.npcQuestProgress).filter(id => state.npcQuestProgress[id]?.completed);
      const inProgressQuestIds = Object.keys(state.npcQuestProgress).filter(id => !state.npcQuestProgress[id]?.completed);
      const dbQuest = getFirstAvailableQuest(npcId, [...completedQuestIds, ...inProgressQuestIds]);
      npcWithQuest = dbQuest ? { ...npc, quest: dbQuest } : npc;
    }

    set({
      activeNpc: npcWithQuest,
      npcsEncountered: alreadyEncountered ? state.npcsEncountered : [...state.npcsEncountered, npcId],
      ...(alreadyEncountered ? {} : {
        messageLog: [...state.messageLog, `[${state.turnCount}] 👤 Incontrate ${npc.name}! "${npc.greeting}"`],
        notification: {
          id: `notif_${++notifId}`,
          type: 'item_found',
          message: npc.name,
          icon: npc.portrait,
          subMessage: 'Sopravvissuto trovato!',
        },
      }),
    });
  },

  talkToNpc: () => {
    const state = get();
    if (!state.activeNpc) return;
    const npc = state.activeNpc;

    // ── Check for fetch quest completion ──
    if (npc.quest && npc.quest.type === 'fetch' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        // Count how many of the required items the party has
        let partyItemCount = 0;
        for (const p of state.party) {
          for (const inv of p.inventory) {
            if (inv.itemId === npc.quest.targetId) {
              partyItemCount += inv.quantity;
            }
          }
        }

        if (partyItemCount >= npc.quest.targetCount) {
          // Player has enough items → complete the quest
          // Remove required items from party inventory
          let updatedParty = [...state.party];
          let toRemove = npc.quest.targetCount;
          for (const p of updatedParty) {
            if (toRemove <= 0) break;
            for (let i = p.inventory.length - 1; i >= 0; i--) {
              if (p.inventory[i].itemId === npc.quest.targetId && toRemove > 0) {
                const avail = p.inventory[i].quantity;
                if (avail <= toRemove) {
                  toRemove -= avail;
                  updatedParty = updatedParty.map(pp =>
                    pp.id === p.id ? { ...pp, inventory: pp.inventory.filter((_, idx) => idx !== i) } : pp
                  );
                } else {
                  p.inventory[i].quantity -= toRemove;
                  toRemove = 0;
                  updatedParty = [...updatedParty];
                }
              }
            }
          }

          // Award rewards
          const logMsgs: string[] = [`[${state.turnCount}] 💬 ${npc.name}: "Grazie! Hai portato esattamente quello che mi serviva!"`];
          logMsgs.push(`[${state.turnCount}] 📋 Missione completata: "${npc.quest.name}"!`);
          if (npc.quest.rewardItems) {
            for (const reward of npc.quest.rewardItems) {
              const rewardDef = ITEMS[reward.itemId];
              if (!rewardDef) continue;
              const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
              updatedParty = result.party;
              if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
            }
          }
          if (npc.quest.rewardExp > 0) {
            logMsgs.push(`[${state.turnCount}] ⬆️ +${npc.quest.rewardExp} EXP (missione completata)`);
            // Grant EXP to alive party members
            updatedParty = updatedParty.map(p => {
              if (p.currentHp <= 0) return p;
              return { ...p, exp: p.exp + npc.quest.rewardExp };
            });
          }

          set({
            party: updatedParty,
            npcQuestProgress: {
              ...state.npcQuestProgress,
              [npc.quest.id]: { currentCount: npc.quest.targetCount, completed: true },
            },
            messageLog: [...state.messageLog, ...logMsgs],
          });
          return;
        } else if (partyItemCount > 0) {
          // Has some but not enough
          set(state => ({
            messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Vedo che hai ${partyItemCount}/${npc.quest.targetCount} di quello che ti ho chiesto... portami il resto!"`],
          }));
          return;
        }
      }
    }

    // ── Check for explore quest completion ──
    if (npc.quest && npc.quest.type === 'explore' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress && state.visitedLocations?.includes(npc.quest.targetId)) {
        // Player has visited the target location → complete the quest
        const logMsgs: string[] = [`[${state.turnCount}] 💬 ${npc.name}: "${npc.quest.rewardDialogue?.[0] || 'Hai fatto un ottimo lavoro esplorando!'}"`];
        logMsgs.push(`[${state.turnCount}] 📋 Missione completata: "${npc.quest.name}"!`);

        let updatedParty = [...state.party];
        if (npc.quest.rewardItems) {
          for (const reward of npc.quest.rewardItems) {
            const rewardDef = ITEMS[reward.itemId];
            if (!rewardDef) continue;
            const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
            updatedParty = result.party;
            if (result.added) logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
          }
        }
        if (npc.quest.rewardExp > 0) {
          logMsgs.push(`[${state.turnCount}] ⬆️ +${npc.quest.rewardExp} EXP (missione completata)`);
          updatedParty = updatedParty.map(p => {
            if (p.currentHp <= 0) return p;
            return { ...p, exp: p.exp + npc.quest.rewardExp };
          });
        }

        set({
          party: updatedParty,
          npcQuestProgress: {
            ...state.npcQuestProgress,
            [npc.quest.id]: { currentCount: 1, completed: true },
          },
          messageLog: [...state.messageLog, ...logMsgs],
        });
        return;
      } else if (questProgress) {
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Non hai ancora esplorato ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a cercare!"`],
        }));
        return;
      }
    }

    // ── Check for kill quest status ──
    if (npc.quest && npc.quest.type === 'kill' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        const remaining = npc.quest.targetCount - questProgress.currentCount;
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "Devi ancora eliminare ${remaining} ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a combattere!"`],
        }));
        return;
      }
    }

    // ── Default: random dialogue ──
    const dialogue = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    set(state => ({
      messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${dialogue}"`],
    }));
  },

  acceptNpcQuest: () => {
    const state = get();
    if (!state.activeNpc?.quest) return;
    const quest = state.activeNpc.quest;
    if (state.npcQuestProgress[quest.id]?.completed) return;
    set(state => ({
      npcQuestProgress: {
        ...state.npcQuestProgress,
        [quest.id]: state.npcQuestProgress[quest.id] || { currentCount: 0, completed: false },
      },
      messageLog: [...state.messageLog, `[${state.turnCount}] 📋 Missione accettata: "${quest.name}" — ${quest.description}`],
    }));
  },

  tradeWithNpc: (tradeIndex: number) => {
    const state = get();
    if (!state.activeNpc?.tradeInventory) return { success: false, reason: 'Nessuno scambio disponibile' };
    const trade = state.activeNpc.tradeInventory[tradeIndex];
    if (!trade) return { success: false, reason: 'Scambio non trovato' };
    const hasPriceItem = state.party.some(p =>
      p.inventory.some(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity)
    );
    if (!hasPriceItem) {
      set(state => ({
        messageLog: [...state.messageLog, `[${state.turnCount}] ❌ Non avete gli oggetti necessari per lo scambio.`],
      }));
      return { success: false, reason: 'Oggetti insufficienti' };
    }
    const tradeQty = trade.quantity || 1;
    // Pre-check: can the item fit in any party member's inventory?
    if (!canAddItemToParty(state.party, trade.itemId, tradeQty)) {
      return { success: false, reason: 'inventario_pieno' };
    }
    let updatedParty = [...state.party];
    let priceRemoved = false;
    for (const p of updatedParty) {
      if (priceRemoved) break;
      const idx = p.inventory.findIndex(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity);
      if (idx >= 0) {
        const item = p.inventory[idx];
        if (item.quantity > trade.priceQuantity) {
          updatedParty = updatedParty.map(pp =>
            pp.id === p.id ? {
              ...pp,
              inventory: pp.inventory.map((ii, iiIdx) =>
                iiIdx === idx ? { ...ii, quantity: ii.quantity - trade.priceQuantity } : ii
              ),
            } : pp
          );
        } else {
          updatedParty = updatedParty.map(pp =>
            pp.id === p.id ? { ...pp, inventory: pp.inventory.filter((_, iiIdx) => iiIdx !== idx) } : pp
          );
        }
        priceRemoved = true;
      }
    }
    const tradedDef = ITEMS[trade.itemId];
    if (!tradedDef) return { success: false, reason: 'Oggetto non trovato' };
    const result = addItemToParty(updatedParty, trade.itemId, tradeQty);
    updatedParty = result.party;
    set(state => ({
      party: updatedParty,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🤝 Scambio completato! Ricevuto: ${tradedDef.name}${tradeQty > 1 ? ` x${tradeQty}` : ''}${result.added ? ` → ${result.characterName}` : ' (inventario pieno!)'}`],
    }));
    // Auto-save after successful trade
    setTimeout(() => { try { get().autoSave(); } catch {} }, 100);
    return { success: true };
  },

  loadGame: (slot: number) => {
    const saveKey = `raccoon_city_save_${slot}`;

    try {
      if (typeof window === 'undefined') return false;

      const raw = localStorage.getItem(saveKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

      // Basic structural validation of saved data
      if (
        !Array.isArray(data.party) ||
        typeof data.phase !== 'string' ||
        typeof data.turnCount !== 'number'
      ) {
        console.warn('[loadGame] Save data missing required top-level fields (party, phase, turnCount). Aborting load.');
        return false;
      }
      for (const member of data.party) {
        if (
          !member.id ||
          !member.name ||
          typeof member.currentHp !== 'number' ||
          typeof member.maxHp !== 'number' ||
          !Array.isArray(member.inventory)
        ) {
          console.warn(`[loadGame] Party member missing required fields: ${member?.id ?? '(no id)'}. Aborting load.`);
          return false;
        }
      }

      // Check if this is a New Game+ save (saved after victory)
      const isNGP = data.isNewGamePlus || false;
      const persistentRibs = data.persistentRibbons || 0;

      set({
        phase: isNGP && data.phase === 'victory' ? 'victory' : 'exploration',
        party: data.party,
        currentLocationId: data.currentLocationId,
        combat: data.combat,
        enemies: data.enemies || [],
        activeEvent: data.activeEvent,
        eventOutcome: data.eventOutcome,
        messageLog: [
          ...data.messageLog,
          `[Turno ${data.turnCount}] 💾 Partita caricata dallo Slot ${slot}.${isNGP ? ' 🎀 Nastri persistenti: ' + persistentRibs + '/10' : ''}`,
        ],
        turnCount: data.turnCount,
        difficulty: data.difficulty || 'normale',
        selectedDifficulty: data.selectedDifficulty || 'normale',
        inventoryOpen: false,
        selectedCharacterId: data.selectedCharacterId || data.party[0]?.id || null,
        searchCounts: data.searchCounts || {},
        searchMaxes: data.searchMaxes || {},
        partySize: data.partySize || 2,
        unlockedPaths: data.unlockedPaths || [],
        visitedLocations: data.visitedLocations || [],
        completedEvents: data.completedEvents || [],
        mapOpen: false,
        collectedRibbons: data.collectedRibbons || 0,
        persistentRibbons: persistentRibs,
        isNewGamePlus: isNGP,
        gameStartTime: data.gameStartTime || Date.now(),
        collectedDocuments: data.collectedDocuments || [],
        activeNpc: null,
        npcQuestProgress: data.npcQuestProgress || {},
        npcsEncountered: data.npcsEncountered || [],
        activeDynamicEvent: null,
        dynamicEventTurnsLeft: 0,
        storyChoices: data.storyChoices || [],
        discoveredSecretRooms: data.discoveredSecretRooms || [],
        endingType: data.endingType || null,
        exploredSubAreas: data.exploredSubAreas || {},
        documentsOpen: false,
        missionsOpen: false,
        npcsOpen: false,
        randomizerMode: data.randomizerMode || false,
        randomizedLocationData: data.randomizedLocationData || null,
        currentSubArea: data.currentSubArea || null,
        itemBoxItems: data.itemBoxItems || [],
        readDocuments: data.readDocuments || [],
        nemesisPursuitLevel: data.nemesisPursuitLevel || 0,
        nemesisLastSeenLocation: data.nemesisLastSeenLocation || null,
        nemesisLastSeenTurn: data.nemesisLastSeenTurn || 0,
        bossPhases: data.bossPhases || {},
        lastAutoSaveTurn: data.lastAutoSaveTurn || 0,
      });
      // Auto-save after loading
      setTimeout(() => { try { get().autoSave(); } catch {} }, 200);
      return true;
    } catch {
      return false;
    }
  },

  autoSave: () => {
    const state = get();

    // Don't auto-save during combat, game-over, or title screen
    if (state.phase === 'combat' || state.phase === 'game-over' || state.phase === 'title' || state.phase === 'victory') return;
    // Don't auto-save if party is empty (not in adventure)
    if (!state.party || state.party.length === 0) return;

    const saveData = {
      version: 1,
      isAutoSave: true,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: state.collectedRibbons || 0,
      persistentRibbons: state.persistentRibbons || 0,
      isNewGamePlus: state.isNewGamePlus || false,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      endingType: null,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
      nemesisPursuitLevel: state.nemesisPursuitLevel,
      nemesisLastSeenLocation: state.nemesisLastSeenLocation,
      nemesisLastSeenTurn: state.nemesisLastSeenTurn,
      bossPhases: state.bossPhases,
      lastAutoSaveTurn: state.turnCount,
    };

    const saveKey = 'raccoon_city_autosave';
    const saveMetaKey = 'raccoon_city_autosave_meta';

    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot: -1,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Sconosciuto',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: state.phase,
      isNewGamePlus: state.isNewGamePlus || false,
      persistentRibbons: state.persistentRibbons || 0,
      collectedRibbons: state.collectedRibbons || 0,
    };

    try {
      if (typeof window !== 'undefined') {
        const json = JSON.stringify(saveData);
        if (json.length > 4_000_000) {
          saveData.randomizedLocationData = null;
        }
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // Storage full or not available - silently fail
    }

    set({ lastAutoSaveTurn: state.turnCount });
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

  saveGameVictory: (slot: number) => {
    const state = get();
    const totalPersistent = Math.min((state.persistentRibbons || 0) + (state.collectedRibbons || 0), 10);

    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      party: state.party,
      currentLocationId: state.currentLocationId,
      combat: null,
      enemies: [],
      activeEvent: null,
      eventOutcome: null,
      messageLog: state.messageLog.slice(-50),
      turnCount: state.turnCount,
      difficulty: state.difficulty,
      selectedDifficulty: state.selectedDifficulty,
      selectedCharacterId: state.selectedCharacterId,
      searchCounts: state.searchCounts,
      searchMaxes: state.searchMaxes,
      partySize: state.partySize,
      unlockedPaths: state.unlockedPaths,
      visitedLocations: state.visitedLocations,
      completedEvents: state.completedEvents || [],
      collectedRibbons: 0, // reset for next run
      persistentRibbons: totalPersistent,
      isNewGamePlus: true,
      gameStartTime: state.gameStartTime || Date.now(),
      collectedDocuments: state.collectedDocuments,
      activeNpc: null,
      npcQuestProgress: state.npcQuestProgress,
      npcsEncountered: state.npcsEncountered,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: state.storyChoices,
      discoveredSecretRooms: state.discoveredSecretRooms,
      endingType: state.endingType,
      exploredSubAreas: state.exploredSubAreas,
      randomizerMode: state.randomizerMode,
      randomizedLocationData: state.randomizedLocationData,
      currentSubArea: state.currentSubArea,
      itemBoxItems: state.itemBoxItems,
      readDocuments: state.readDocuments,
    };

    const saveKey = `raccoon_city_save_${slot}`;
    const saveMetaKey = `raccoon_city_save_meta_${slot}`;
    const location = LOCATIONS[state.currentLocationId];

    const meta: SaveSlotInfo = {
      slot,
      timestamp: saveData.timestamp,
      turnCount: state.turnCount,
      locationName: location?.name || 'Vittoria',
      partySummary: state.party.map(p => `${p.name} (Lv.${p.level})`).join(', '),
      phase: 'victory',
      isNewGamePlus: true,
      persistentRibbons: totalPersistent,
      collectedRibbons: 0,
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        localStorage.setItem(saveMetaKey, JSON.stringify(meta));
      }
    } catch {
      // silently fail
    }

    return totalPersistent;
  },

  startNewGamePlus: (persistentRibbons: number) => {
    set({
      phase: 'character-select',
      party: [],
      messageLog: ['🎀 Nuovo Gioco+ attivato! Nastri persistenti: ' + persistentRibbons + '/10', '\nScegli i tuoi personaggi per la nuova avventura...'],
      turnCount: 0,
      searchCounts: {},
      searchMaxes: {},
      partySize: 2,
      unlockedPaths: [],
      visitedLocations: [],
      mapOpen: false,
      completedEvents: [],
      collectedRibbons: 0,
      persistentRibbons: Math.min(persistentRibbons, 10),
      isNewGamePlus: true,
      gameStartTime: 0,
      inventoryOpen: false,
      selectedCharacterId: null,
      enemies: [],
      combat: null,
      activeEvent: null,
      eventOutcome: null,
      difficulty: 'normale',
      selectedDifficulty: 'normale',
      puzzleState: null,
      puzzleSourceLocationId: null,
      qteState: null,
      collectedDocuments: [],
      documentsOpen: false,
      missionsOpen: false,
      activeNpc: null,
      npcQuestProgress: {},
      npcsEncountered: [],
      npcsOpen: false,
      activeDynamicEvent: null,
      dynamicEventTurnsLeft: 0,
      storyChoices: [],
      discoveredSecretRooms: [],
      endingType: null,
      exploredSubAreas: {},
      currentSubArea: null,
      itemBoxItems: [],
      searchedSafeRooms: [],
      readDocuments: [],
    });
  },
});
