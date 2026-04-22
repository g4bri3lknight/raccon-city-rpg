import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { getDifficultyConfig } from '../../data/difficulty';
import { ITEMS } from '../../data/loader';
import { createEnemyInstance } from '../helpers';

export const createQteSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  startQTE: (triggerSource: 'nemesis' | 'event' | 'boss') => {
    const state = get();
    const difficulty = state.difficulty;
    const sequenceCount = difficulty === 'sopravvissuto' ? 3 : difficulty === 'normale' ? 4 : 5;
    const baseTime = difficulty === 'sopravvissuto' ? 2500 : difficulty === 'normale' ? 2000 : 1400;

    const directions: Array<'up' | 'down' | 'left' | 'right' | 'space'> = ['up', 'down', 'left', 'right', 'space'];
    const sequences: Array<QTESequence> = [];
    for (let i = 0; i < sequenceCount; i++) {
      sequences.push({
        direction: directions[Math.floor(Math.random() * directions.length)],
        timeLimit: baseTime - (i * 100),
      });
    }

    const hpSave = difficulty === 'sopravvissuto' ? 30 : difficulty === 'normale' ? 20 : 10;

    let postSuccessMessage = '📊 Riesci a schivare!';
    let postFailureMessage = '💀 Non sei riuscito a schivare!';
    let postSuccessItems: { itemId: string; quantity: number }[] | undefined;
    let postFailureCombat: string[] | undefined;

    if (triggerSource === 'nemesis') {
      postSuccessMessage = '🏃 Sei riuscito a fuggire da NEMESIS! Trovi un nascondiglio sicuro.';
      postFailureMessage = '💀 NEMESIS ti colpisce! Sei ferito ma sei sopravvissuto... per ora.';
      postSuccessItems = [{ itemId: 'first_aid', quantity: 1 }];
    } else if (triggerSource === 'event') {
      postSuccessMessage = '🏃 Sei scappato appena in tempo!';
      postFailureMessage = '💥 Sei caduto e ti sei ferito!';
    }

    set({
      phase: 'qte',
      qteState: {
        sequences,
        currentStep: 0,
        isProcessing: false,
        isComplete: false,
        successes: 0,
        failures: 0,
        timeRemaining: sequences[0]?.timeLimit || 2000,
        result: 'pending',
        rewardHpSave: hpSave,
        triggerSource,
        postSuccessMessage,
        postFailureMessage,
        postSuccessItems,
        postFailureCombat,
      },
    });
  },

  handleQTEInput: (direction: string) => {
    const state = get();
    const qs = state.qteState;
    if (!qs || qs.isProcessing || qs.isComplete) return;

    const current = qs.sequences[qs.currentStep];
    if (!current) return;

    const updatedQs = { ...qs, isProcessing: true };
    set({ qteState: updatedQs });

    if (direction === current.direction) {
      // Success!
      const newSuccesses = updatedQs.successes + 1;
      const nextStep = updatedQs.currentStep + 1;

      if (nextStep >= updatedQs.sequences.length) {
        // All sequences done — determine result
        const ratio = newSuccesses / updatedQs.sequences.length;
        const result = ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'partial' : 'failure';

        setTimeout(() => {
          get().completeQTE();
        }, 500);

        set({
          qteState: { ...updatedQs, successes: newSuccesses, currentStep: nextStep, isProcessing: true, isComplete: true, result },
        });
      } else {
        setTimeout(() => {
          set(state => ({
            qteState: state.qteState ? {
              ...state.qteState,
              currentStep: nextStep,
              isProcessing: false,
              timeRemaining: state.qteState.sequences[nextStep]?.timeLimit || 2000,
            } : null,
          }));
        }, 400);

        set({ qteState: { ...updatedQs, successes: newSuccesses, currentStep: nextStep, isProcessing: true } });
      }
    } else {
      // Failure!
      const newFailures = updatedQs.failures + 1;
      const nextStep = updatedQs.currentStep + 1;

      if (nextStep >= updatedQs.sequences.length) {
        const ratio = updatedQs.successes / updatedQs.sequences.length;
        const result = ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'partial' : 'failure';

        setTimeout(() => {
          get().completeQTE();
        }, 500);

        set({
          qteState: { ...updatedQs, failures: newFailures, currentStep: nextStep, isProcessing: true, isComplete: true, result },
        });
      } else {
        setTimeout(() => {
          set(state => ({
            qteState: state.qteState ? {
              ...state.qteState,
              currentStep: nextStep,
              isProcessing: false,
              timeRemaining: state.qteState.sequences[nextStep]?.timeLimit || 2000,
            } : null,
          }));
        }, 400);

        set({ qteState: { ...updatedQs, failures: newFailures, currentStep: nextStep, isProcessing: true } });
      }
    }
  },

  completeQTE: () => {
    const state = get();
    const qs = state.qteState;
    if (!qs) return;

    let updatedParty = [...state.party];
    const logMessages: string[] = [];
    let newPursuitLevelOnSuccess: number | null = null;

    if (qs.result === 'success') {
      logMessages.push(`[${state.turnCount}] ✅ ${qs.postSuccessMessage}`);
      // Heal party by rewardHpSave
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.min(p.maxHp, p.currentHp + qs.rewardHpSave),
      }));
      logMessages.push(`[${state.turnCount}] ❤️ +${qs.rewardHpSave} HP a tutto il gruppo!`);

      // Give items if any
      if (qs.postSuccessItems) {
        for (const itemEntry of qs.postSuccessItems) {
          const itemDef = ITEMS[itemEntry.itemId];
          if (!itemDef) continue;
          let added = false;
          updatedParty = updatedParty.map(p => {
            if (!added && p.inventory.length < p.maxInventorySlots) {
              added = true;
              return { ...p, inventory: [...p.inventory, { uid: `${itemEntry.itemId}_${Date.now()}_${Math.random()}`, itemId: itemEntry.itemId, name: itemDef.name, description: itemDef.description, type: itemDef.type, rarity: itemDef.rarity, icon: itemDef.icon, usable: itemDef.usable, equippable: itemDef.equippable, effects: itemDef.effects, quantity: itemEntry.quantity }] };
            }
            return p;
          });
          if (added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${itemDef.name} x${itemEntry.quantity}`);
        }
      }

      // Successful escape from Nemesis increases pursuit level
      if (qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5) {
        newPursuitLevelOnSuccess = state.nemesisPursuitLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 NEMESIS vi rintraccerà... Livello Inseguimento: ${newPursuitLevelOnSuccess}/5`);
      }
    } else if (qs.result === 'partial') {
      logMessages.push(`[${state.turnCount}] ⚠️ ${qs.postFailureMessage} (parziale)`);
      // Deal some damage
      const dmg = Math.floor(10 * (state.difficulty === 'incubo' ? 1.5 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // Partial escape still increases Nemesis pursuit level
      if (qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5) {
        const newPursuitLevel = state.nemesisPursuitLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 NEMESIS vi rintraccerà... Livello Inseguimento: ${newPursuitLevel}/5`);
        set({
          phase: 'exploration' as const,
          party: updatedParty,
          qteState: null,
          messageLog: [...state.messageLog, ...logMessages],
          nemesisPursuitLevel: newPursuitLevel,
          turnCount: state.turnCount + 1,
        });
        return;
      }
    } else {
      logMessages.push(`[${state.turnCount}] 💀 ${qs.postFailureMessage}`);
      // Deal heavy damage
      const dmg = Math.floor(25 * (state.difficulty === 'incubo' ? 2 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // Failed escape from Nemesis also increases pursuit level
      if (qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5) {
        newPursuitLevelOnSuccess = state.nemesisPursuitLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 NEMESIS vi rintraccerà... Livello Inseguimento: ${newPursuitLevelOnSuccess}/5`);
      }

      // If nemesis QTE failed, trigger combat
      if (qs.triggerSource === 'nemesis' && qs.postFailureCombat) {
        const diff = getDifficultyConfig(state.difficulty, state.partySize);
        const enemies = qs.postFailureCombat.map(id => createEnemyInstance(id, diff.statMult));
        const allActors = [
          ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
        const firstActor = allActors[0];

        set({
          phase: 'combat',
          party: updatedParty,
          enemies,
          qteState: null,
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
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player' as const, action: 'QTE Fallito', message: `NEMESIS vi ha raggiunto!` }],
            isVictory: false,
            isDefeat: false,
            fled: true,
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
          ...(qs.triggerSource === 'nemesis' && state.nemesisPursuitLevel < 5 ? { nemesisPursuitLevel: state.nemesisPursuitLevel + 1 } : {}),
        });
        if (firstActor.type === 'enemy') {
          setTimeout(() => get().advanceToNextActor(), 1400);
        }
        return;
      }
    }

    set({
      phase: 'exploration',
      qteState: null,
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMessages],
      skipNextEncounter: true,
      ...(newPursuitLevelOnSuccess !== null ? { nemesisPursuitLevel: newPursuitLevelOnSuccess } : {}),
    });
  },
});
