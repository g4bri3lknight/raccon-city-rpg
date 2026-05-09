import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ITEMS, NPCS, QUESTS, REPUTATION_CONFIG } from '../../data/loader';
import { getFirstAvailableQuest } from '../../data/quest-helper';
import { addItemToParty, canAddItemToParty, nextNotifId } from '../helpers';

export const createNpcSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({

  modifyNpcReputation: (npcId: string, amount: number) => {
    set(state => ({
      npcReputation: {
        ...state.npcReputation,
        [npcId]: (state.npcReputation[npcId] || 0) + amount,
      },
    }));
  },
  encounterNpc: (npcId: string, specificQuestId?: string) => {
    const npc = NPCS[npcId];
    if (!npc) {
      console.warn('[NPC] encounterNpc: NPC not found in registry', npcId);
      return;
    }

    const state = get();
    const alreadyEncountered = state.npcsEncountered.includes(npcId);

    // If a specific quest ID is provided (e.g. from MissionsPanel completed quest click),
    // show that exact quest even if completed
    let npcWithQuest = npc;
    if (specificQuestId && QUESTS[specificQuestId]) {
      npcWithQuest = { ...npc, quest: QUESTS[specificQuestId] };
    } else {
      // Normal flow: check for next available quest
      const completedQuestIds = Object.keys(state.npcQuestProgress).filter(id => state.npcQuestProgress[id]?.completed);
      // Also check if this NPC has an in-progress quest and reattach it
      const dbQuest = getFirstAvailableQuest(npcId, completedQuestIds);
      // Debug: log quest lookup result
      const allQuestsForNpc = Object.values(QUESTS).filter(q => q.npcId === npcId);
      console.log('[NPC] encounterNpc:', {
        npcId,
        npcName: npc.name,
        alreadyEncountered,
        completedQuestIds,
        allQuestsForNpc: allQuestsForNpc.map(q => ({ id: q.id, name: q.name, type: q.type, prereq: q.prerequisiteQuestId })),
        foundQuest: dbQuest ? { id: dbQuest.id, name: dbQuest.name } : null,
        npcBaseQuest: npc.quest ? { id: npc.quest.id, name: npc.quest.name } : null,
        totalQUESTS: Object.keys(QUESTS).length,
      });
      if (dbQuest) {
        npcWithQuest = { ...npc, quest: dbQuest };
      } else {
        // No new quest available — check if this NPC has an in-progress quest
        const inProgressQuest = Object.values(QUESTS).find(q =>
          q.npcId === npcId && state.npcQuestProgress[q.id] && !state.npcQuestProgress[q.id].completed
        );
        npcWithQuest = inProgressQuest ? { ...npc, quest: inProgressQuest } : npc;
      }
    }

    set({
      activeNpc: npcWithQuest,
      npcsEncountered: alreadyEncountered ? state.npcsEncountered : [...state.npcsEncountered, npcId],
      ...(alreadyEncountered ? {} : {
        messageLog: [...state.messageLog, `[${state.turnCount}] 👤 Incontrate ${npc.name}! "${npc.greeting}"`],
        notification: {
          id: nextNotifId(),
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
    if (!state.activeNpc) return { handled: false };
    const npc = state.activeNpc;
    const noOp = { handled: false };

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

          for (let pi = 0; pi < updatedParty.length && toRemove > 0; pi++) {
            const member = updatedParty[pi];
            for (let i = member.inventory.length - 1; i >= 0 && toRemove > 0; i--) {
              if (member.inventory[i].itemId === npc.quest.targetId && toRemove > 0) {
                const avail = member.inventory[i].quantity;
                if (avail <= toRemove) {
                  toRemove -= avail;
                  // Remove item entirely — create new member with filtered inventory
                  updatedParty = updatedParty.map((pp, idx) =>
                    idx === pi ? { ...pp, inventory: pp.inventory.filter((_, iiIdx) => iiIdx !== i) } : pp
                  );
                } else {
                  // Reduce quantity — create new member with updated inventory item
                  updatedParty = updatedParty.map((pp, idx) =>
                    idx === pi ? {
                      ...pp,
                      inventory: pp.inventory.map((ii, iiIdx) =>
                        iiIdx === i ? { ...ii, quantity: ii.quantity - toRemove } : ii
                      ),
                    } : pp
                  );
                  toRemove = 0;
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
          // Track run stats: quest completed
          get().incrementRunStat('questsCompleted');
          // +2 reputation for completing a quest
          get().modifyNpcReputation(npc.id, REPUTATION_CONFIG.questRepGain);
          return { handled: true, chatMessage: `Grazie! Hai portato esattamente quello che mi serviva! Missione "${npc.quest.name}" completata!` };
        } else if (partyItemCount > 0) {
          // Has some but not enough
          const msg = `Vedo che hai ${partyItemCount}/${npc.quest.targetCount} di quello che ti ho chiesto... portami il resto!`;
          set(state => ({
            messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${msg}"`],
          }));
          return { handled: true, chatMessage: msg };
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
        // Track run stats: quest completed (explore)
        get().incrementRunStat('questsCompleted');
        // +2 reputation for completing a quest
        get().modifyNpcReputation(npc.id, REPUTATION_CONFIG.questRepGain);
        return { handled: true, chatMessage: `${npc.quest.rewardDialogue?.[0] || 'Hai fatto un ottimo lavoro esplorando!'} Missione "${npc.quest.name}" completata!` };
      } else if (questProgress) {
        const msg = `Non hai ancora esplorato ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a cercare!`;
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${msg}"`],
        }));
        return { handled: true, chatMessage: msg };
      }
    }

    // ── Check for kill quest status ──
    if (npc.quest && npc.quest.type === 'kill' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        const remaining = npc.quest.targetCount - questProgress.currentCount;
        const msg = `Devi ancora eliminare ${remaining} ${npc.quest.targetId.replace(/_/g, ' ')}. Continua a combattere!`;
        set(state => ({
          messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${msg}"`],
        }));
        return { handled: true, chatMessage: msg };
      }
    }

    // ── Check for talk quest completion ──
    if (npc.quest && npc.quest.type === 'talk' && !state.npcQuestProgress[npc.quest.id]?.completed) {
      const questProgress = state.npcQuestProgress[npc.quest.id];
      if (questProgress) {
        const targetNpcEncountered = state.npcsEncountered.includes(npc.quest.targetId);
        if (targetNpcEncountered) {
          // Player has encountered the target NPC → complete the quest
          const logMsgs: string[] = [`[${state.turnCount}] 💬 ${npc.name}: "${npc.quest.rewardDialogue?.[0] || 'Hai parlato con la persona giusta!'}"`];
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
          get().incrementRunStat('questsCompleted');
          get().modifyNpcReputation(npc.id, REPUTATION_CONFIG.questRepGain);
          return { handled: true, chatMessage: `${npc.quest.rewardDialogue?.[0] || 'Hai parlato con la persona giusta!'} Missione "${npc.quest.name}" completata!` };
        } else {
          const msg = `Non hai ancora parlato con ${npc.quest.targetId.replace(/_/g, ' ')}. Trova questa persona e torna da me!`;
          set(state => ({
            messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${msg}"`],
          }));
          return { handled: true, chatMessage: msg };
        }
      }
    }

    // ── Default: random dialogue ──
    if (!npc.dialogues || npc.dialogues.length === 0) return noOp;
    const dialogue = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    set(state => ({
      messageLog: [...state.messageLog, `[${state.turnCount}] 💬 ${npc.name}: "${dialogue}"`],
    }));
    return { handled: false, chatMessage: dialogue };
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
    // Reputation discount on trade prices
    const rep = state.npcReputation[state.activeNpc.id] || 0;
    const discount = rep >= REPUTATION_CONFIG.discountThreshold2 ? REPUTATION_CONFIG.discountAmount2 : rep >= REPUTATION_CONFIG.discountThreshold1 ? REPUTATION_CONFIG.discountAmount1 : 0;
    const effectivePrice = Math.max(1, trade.priceQuantity - discount);
    const hasPriceItem = state.party.some(p =>
      p.inventory.some(i => i.itemId === trade.priceItemId && i.quantity >= effectivePrice)
    );
    if (!hasPriceItem) {
      const priceDef = ITEMS[trade.priceItemId];
      const priceLabel = discount > 0
        ? `${effectivePrice}x ${priceDef?.name || trade.priceItemId} (sconto reputazione: -${discount})`
        : `${effectivePrice}x ${priceDef?.name || trade.priceItemId}`;
      set(state => ({
        messageLog: [...state.messageLog, `[${state.turnCount}] ❌ Non avete gli oggetti necessari per lo scambio. Serve: ${priceLabel}`],
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
      const idx = p.inventory.findIndex(i => i.itemId === trade.priceItemId && i.quantity >= effectivePrice);
      if (idx >= 0) {
        const item = p.inventory[idx];
        if (item.quantity > effectivePrice) {
          updatedParty = updatedParty.map(pp =>
            pp.id === p.id ? {
              ...pp,
              inventory: pp.inventory.map((ii, iiIdx) =>
                iiIdx === idx ? { ...ii, quantity: ii.quantity - effectivePrice } : ii
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
    const discountMsg = discount > 0 ? ' 🏷️ Sconto reputazione!' : '';
    set(state => ({
      party: updatedParty,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🤝 Scambio completato! Ricevuto: ${tradedDef.name}${tradeQty > 1 ? ` x${tradeQty}` : ''}${result.added ? ` → ${result.characterName}` : ' (inventario pieno!)'}${discountMsg}`],
    }));
    // Auto-save after successful trade
    setTimeout(() => { try { get().autoSave(); } catch {} }, 100);
    return { success: true };
  },

  closeNpcDialog: () => {
    set({ activeNpc: null });
  },

  toggleMissions: () => {
    set(state => ({ missionsOpen: !state.missionsOpen }));
  },
});
