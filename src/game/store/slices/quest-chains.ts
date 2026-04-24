import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import type { QuestChainProgress } from '@/game/types';
import { QUEST_CHAINS_DATA, NPC_QUEST_CHAIN_MAP, ITEMS } from '../../data/loader';
import { addItemToParty, nextNotifId } from '../helpers';

export const createQuestChainsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => {
  // ── Internal helper: finish a quest chain (award final reward, mark complete) ──
  function finishChain(
    chainId: string,
    progress: QuestChainProgress,
    currentParty: GameStore['party'],
    logMsgs: string[],
  ): { completed: boolean; message: string } {
    const chain = QUEST_CHAINS_DATA[chainId];
    if (!chain) return { completed: false, message: 'Catena non trovata.' };

    const state = get();
    const turn = state.turnCount;
    let updatedParty = [...currentParty];

    // Award final reward items
    if (chain.finalReward.items) {
      for (const reward of chain.finalReward.items) {
        const rewardDef = ITEMS[reward.itemId];
        if (!rewardDef) continue;
        const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
        updatedParty = result.party;
        if (result.added) {
          logMsgs.push(`[${turn}] 🎁 Ricompensa finale: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
        }
      }
    }

    // Award final EXP
    if (chain.finalReward.exp > 0) {
      logMsgs.push(`[${turn}] ⬆️ +${chain.finalReward.exp} EXP (ricompensa finale)`);
      updatedParty = updatedParty.map(p => {
        if (p.currentHp <= 0) return p;
        return { ...p, exp: p.exp + chain.finalReward.exp };
      });
    }

    // Final dialogue
    if (chain.finalReward.dialogue?.length) {
      for (const line of chain.finalReward.dialogue) {
        logMsgs.push(`[${turn}] 💬 ${line}`);
      }
    }

    const completionMsg = `Catena "${chain.name}" completata!`;
    logMsgs.push(`[${turn}] 🏆 ${completionMsg}`);

    set({
      party: updatedParty,
      questChainProgress: {
        ...state.questChainProgress,
        [chainId]: { ...progress, completed: true },
      },
      completedChains: [...state.completedChains, chainId],
      messageLog: [...state.messageLog, ...logMsgs],
      notification: {
        id: nextNotifId(),
        type: 'victory',
        message: chain.name,
        icon: '📜',
        subMessage: 'Catena di missioni completata!',
      },
    });

    // Increment run stat
    try { get().incrementRunStat('questChainsCompleted'); } catch {}

    return { completed: true, message: completionMsg };
  }

  return {
    // ─────────────────────────────────────────────
    // acceptQuestChain(chainId)
    // ─────────────────────────────────────────────
    acceptQuestChain: (chainId: string) => {
      const chain = QUEST_CHAINS_DATA[chainId];
      if (!chain) return;

      const state = get();

      // Already in progress or completed — ignore
      if (state.questChainProgress[chainId]) return;
      if (state.completedChains.includes(chainId)) return;

      // Verify NPC mapping exists (chain must be associated with an NPC)
      const mappedNpcId = Object.entries(NPC_QUEST_CHAIN_MAP).find(
        ([, cid]) => cid === chainId,
      )?.[0];
      if (!mappedNpcId) return;

      set({
        questChainProgress: {
          ...state.questChainProgress,
          [chainId]: {
            currentStepIndex: 0,
            completed: false,
            chosenFlags: [],
          },
        },
        messageLog: [
          ...state.messageLog,
          `[${state.turnCount}] 📜 Catena di missioni accettata: "${chain.name}"`,
          `[${state.turnCount}] 📜 ${chain.description}`,
        ],
      });
    },

    // ─────────────────────────────────────────────
    // advanceQuestChainStep(chainId)
    // ─────────────────────────────────────────────
    advanceQuestChainStep: (chainId: string): { completed: boolean; message: string } => {
      const chain = QUEST_CHAINS_DATA[chainId];
      if (!chain) return { completed: false, message: 'Catena di missioni non trovata.' };

      const state = get();
      const progress = state.questChainProgress[chainId];
      if (!progress || progress.completed) {
        return { completed: false, message: 'Questa catena di missioni non è attiva.' };
      }

      const step = chain.steps[progress.currentStepIndex];
      if (!step) return { completed: false, message: 'Passo non trovato.' };

      // 'choose' steps must use handleChainBranchChoice
      if (step.type === 'choose') {
        return { completed: false, message: 'Devi fare una scelta prima di procedere.' };
      }

      // ── Check completion condition ──
      let isCompletable = false;

      switch (step.type) {
        case 'fetch': {
          let totalItems = 0;
          for (const char of state.party) {
            for (const item of char.inventory) {
              if (item.itemId === step.targetId) {
                totalItems += item.quantity;
              }
            }
          }
          isCompletable = totalItems >= step.targetCount;
          if (!isCompletable) {
            const itemDef = ITEMS[step.targetId];
            return {
              completed: false,
              message: `Ti servono ancora ${step.targetCount - totalItems} ${itemDef?.name || step.targetId}.`,
            };
          }
          break;
        }
        case 'kill': {
          // Use bestiary to count total kills of the target enemy
          const bestiaryEntry = state.bestiary.find(e => e.enemyId === step.targetId);
          const killCount = bestiaryEntry?.timesDefeated || 0;
          isCompletable = killCount >= step.targetCount;
          if (!isCompletable) {
            const enemyName = step.targetId?.replace(/_/g, ' ');
            return {
              completed: false,
              message: `Devi ancora eliminare ${step.targetCount - killCount} ${enemyName}. Continua a combattere!`,
            };
          }
          break;
        }
        case 'explore': {
          isCompletable = state.visitedLocations.includes(step.targetId || '');
          if (!isCompletable) {
            return {
              completed: false,
              message: 'Non hai ancora esplorato questa zona. Continua a esplorare!',
            };
          }
          break;
        }
        case 'talk': {
          isCompletable = state.npcsEncountered.includes(step.targetId || '');
          if (!isCompletable) {
            return {
              completed: false,
              message: 'Non hai ancora parlato con questa persona. Continua a esplorare!',
            };
          }
          break;
        }
      }

      if (!isCompletable) {
        return { completed: false, message: 'Condizioni non soddisfatte.' };
      }

      // ── Step completable — award step rewards ──
      const logMsgs: string[] = [];
      let updatedParty = [...state.party];

      if (step.reward.items) {
        for (const reward of step.reward.items) {
          const rewardDef = ITEMS[reward.itemId];
          if (!rewardDef) continue;
          const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
          updatedParty = result.party;
          if (result.added) {
            logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
          }
        }
      }

      if (step.reward.exp > 0) {
        logMsgs.push(`[${state.turnCount}] ⬆️ +${step.reward.exp} EXP (passo completato)`);
        updatedParty = updatedParty.map(p => {
          if (p.currentHp <= 0) return p;
          return { ...p, exp: p.exp + step.reward.exp };
        });
      }

      if (step.reward.dialogue?.length) {
        for (const line of step.reward.dialogue) {
          logMsgs.push(`[${state.turnCount}] 💬 ${line}`);
        }
      }

      // ── Determine next step ──
      const nextStepId = step.nextStepId;

      if (!nextStepId) {
        return finishChain(chainId, progress, updatedParty, logMsgs);
      }

      const nextStepIndex = chain.steps.findIndex(s => s.id === nextStepId);
      if (nextStepIndex === -1) {
        return finishChain(chainId, progress, updatedParty, logMsgs);
      }

      const nextStep = chain.steps[nextStepIndex];
      logMsgs.push(`[${state.turnCount}] 📜 Prossimo passo: "${nextStep.description}"`);

      set({
        party: updatedParty,
        questChainProgress: {
          ...state.questChainProgress,
          [chainId]: { ...progress, currentStepIndex: nextStepIndex },
        },
        messageLog: [...state.messageLog, ...logMsgs],
      });

      return { completed: false, message: `Passo completato! Prossimo: ${nextStep.description}` };
    },

    // ─────────────────────────────────────────────
    // handleChainBranchChoice(chainId, choiceIndex)
    // ─────────────────────────────────────────────
    handleChainBranchChoice: (chainId: string, choiceIndex: number): { message: string } => {
      const chain = QUEST_CHAINS_DATA[chainId];
      if (!chain) return { message: 'Catena di missioni non trovata.' };

      const state = get();
      const progress = state.questChainProgress[chainId];
      if (!progress || progress.completed) {
        return { message: 'Questa catena di missioni non è attiva.' };
      }

      const step = chain.steps[progress.currentStepIndex];
      if (!step || step.type !== 'choose') {
        return { message: 'Questo passo non richiede una scelta.' };
      }

      if (!step.branchChoice) {
        return { message: 'Nessuna scelta disponibile.' };
      }

      const choice = step.branchChoice.choices[choiceIndex];
      if (!choice) {
        return { message: 'Scelta non valida.' };
      }

      // Record the chosen flag
      const newFlags = [...progress.chosenFlags, choice.flag];

      // ── Award step rewards ──
      const logMsgs: string[] = [];
      let updatedParty = [...state.party];

      if (step.reward.items) {
        for (const reward of step.reward.items) {
          const rewardDef = ITEMS[reward.itemId];
          if (!rewardDef) continue;
          const result = addItemToParty(updatedParty, reward.itemId, reward.quantity);
          updatedParty = result.party;
          if (result.added) {
            logMsgs.push(`[${state.turnCount}] 🎁 Ricompensa: ${rewardDef.name} x${reward.quantity} → ${result.characterName}`);
          }
        }
      }

      if (step.reward.exp > 0) {
        logMsgs.push(`[${state.turnCount}] ⬆️ +${step.reward.exp} EXP (scelta effettuata)`);
        updatedParty = updatedParty.map(p => {
          if (p.currentHp <= 0) return p;
          return { ...p, exp: p.exp + step.reward.exp };
        });
      }

      if (step.reward.dialogue?.length) {
        for (const line of step.reward.dialogue) {
          logMsgs.push(`[${state.turnCount}] 💬 ${line}`);
        }
      }

      logMsgs.push(`[${state.turnCount}] 🔀 Hai scelto: "${choice.text}" — ${choice.description}`);

      // ── Determine next step from branch choice ──
      const nextStepId = choice.nextStepId;

      if (!nextStepId) {
        return finishChain(chainId, { ...progress, chosenFlags: newFlags }, updatedParty, logMsgs);
      }

      const nextStepIndex = chain.steps.findIndex(s => s.id === nextStepId);
      if (nextStepIndex === -1) {
        return finishChain(chainId, { ...progress, chosenFlags: newFlags }, updatedParty, logMsgs);
      }

      const nextStep = chain.steps[nextStepIndex];
      logMsgs.push(`[${state.turnCount}] 📜 Prossimo passo: "${nextStep.description}"`);

      set({
        party: updatedParty,
        questChainProgress: {
          ...state.questChainProgress,
          [chainId]: {
            ...progress,
            currentStepIndex: nextStepIndex,
            chosenFlags: newFlags,
          },
        },
        messageLog: [...state.messageLog, ...logMsgs],
      });

      return { message: `Hai scelto: "${choice.text}" — ${choice.description}` };
    },

    // ─────────────────────────────────────────────
    // getActiveChainForNpc(npcId)
    // ─────────────────────────────────────────────
    getActiveChainForNpc: (npcId: string) => {
      const chainId = NPC_QUEST_CHAIN_MAP[npcId];
      if (!chainId) return null;

      const state = get();
      const progress = state.questChainProgress[chainId];
      if (!progress || progress.completed) return null;
      if (state.completedChains.includes(chainId)) return null;

      const chain = QUEST_CHAINS_DATA[chainId];
      if (!chain) return null;

      return chain.steps[progress.currentStepIndex] || null;
    },
  };
};
