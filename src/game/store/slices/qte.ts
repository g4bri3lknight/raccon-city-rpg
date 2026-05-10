import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { getDifficultyConfig } from '../../data/difficulty';
import { ITEMS, PURSUER_CONFIG } from '../../data/loader';
import { createEnemyInstance, getAutoCombatDefault } from '../helpers';
import { rollVictoryCondition } from '../../data/victory-conditions';

export const createQteSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  startQTE: (triggerSource: 'pursuer' | 'event' | 'boss') => {
    const state = get();
    const difficulty = state.difficulty;
    const diffConfig = getDifficultyConfig(difficulty);
    const statMult = diffConfig.statMult;
    const sequenceCount = statMult <= 0.65 ? 3 : statMult <= 0.9 ? 4 : 5;
    const baseTime = statMult <= 0.65 ? 2500 : statMult <= 0.9 ? 2000 : 1400;

    const directions: Array<'up' | 'down' | 'left' | 'right' | 'space'> = ['up', 'down', 'left', 'right', 'space'];
    const sequences: Array<QTESequence> = [];
    for (let i = 0; i < sequenceCount; i++) {
      sequences.push({
        direction: directions[Math.floor(Math.random() * directions.length)],
        timeLimit: baseTime - (i * 100),
      });
    }

    const hpSave = statMult <= 0.65 ? 30 : statMult <= 0.9 ? 20 : 10;

    let postSuccessMessage = '📊 Riesci a schivare!';
    let postFailureMessage = '💀 Non sei riuscito a schivare!';
    let postSuccessItems: { itemId: string; quantity: number }[] | undefined;
    let postFailureCombat: string[] | undefined;

    if (triggerSource === 'pursuer') {
      postSuccessMessage = `🏃 Sei riuscito a fuggire da ${PURSUER_CONFIG.name}! Trovi un nascondiglio sicuro.`;
      postFailureMessage = `💀 ${PURSUER_CONFIG.name} ti colpisce! Sei ferito ma sei sopravvissuto... per ora.`;
      postSuccessItems = [{ itemId: 'first_aid', quantity: 1 }];
      // Failed escape → trigger pursuer combat
      postFailureCombat = [PURSUER_CONFIG.enemyId];
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

      // Successful escape from pursuer increases pursuit level
      if (qs.triggerSource === 'pursuer' && state.pursuerLevel < PURSUER_CONFIG.maxPursuitLevel) {
        newPursuitLevelOnSuccess = state.pursuerLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 ${PURSUER_CONFIG.name} vi rintraccerà... Livello Inseguimento: ${newPursuitLevelOnSuccess}/${PURSUER_CONFIG.maxPursuitLevel}`);
      }
    } else if (qs.result === 'partial') {
      logMessages.push(`[${state.turnCount}] ⚠️ ${qs.postFailureMessage} (parziale)`);
      // Deal some damage
      const dmg = Math.floor(10 * (statMult >= 1.2 ? 1.5 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // Partial escape still increases pursuer pursuit level
      if (qs.triggerSource === 'pursuer' && state.pursuerLevel < PURSUER_CONFIG.maxPursuitLevel) {
        const newPursuitLevel = state.pursuerLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 ${PURSUER_CONFIG.name} vi rintraccerà... Livello Inseguimento: ${newPursuitLevel}/${PURSUER_CONFIG.maxPursuitLevel}`);
        set({
          phase: 'exploration' as const,
          party: updatedParty,
          qteState: null,
          messageLog: [...state.messageLog, ...logMessages],
          pursuerLevel: newPursuitLevel,
          turnCount: state.turnCount + 1,
        });
        return;
      }
    } else {
      logMessages.push(`[${state.turnCount}] 💀 ${qs.postFailureMessage}`);
      // Deal heavy damage
      const dmg = Math.floor(25 * (statMult >= 1.2 ? 2 : 1));
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(1, p.currentHp - dmg),
      }));
      logMessages.push(`[${state.turnCount}] 💔-${dmg} HP a tutti!`);

      // Failed escape from pursuer also increases pursuit level
      if (qs.triggerSource === 'pursuer' && state.pursuerLevel < PURSUER_CONFIG.maxPursuitLevel) {
        newPursuitLevelOnSuccess = state.pursuerLevel + 1;
        logMessages.push(`[${state.turnCount}] 💀 ${PURSUER_CONFIG.name} vi rintraccerà... Livello Inseguimento: ${newPursuitLevelOnSuccess}/${PURSUER_CONFIG.maxPursuitLevel}`);
      }

      // If pursuer QTE failed, trigger combat
      if (qs.triggerSource === 'pursuer' && qs.postFailureCombat) {
        const diff = getDifficultyConfig(state.difficulty, state.partySize);
        // Scale pursuer strength with pursuit level (same formula as exploration)
        const pursuerStatMult = diff.statMult * (0.8 + 0.1 * state.pursuerLevel);
        const enemies = qs.postFailureCombat.map(id => createEnemyInstance(id, pursuerStatMult));
        const allActors = [
          ...updatedParty.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
          ...enemies.map(e => ({ id: e.id, spd: e.spd, type: 'enemy' as const })),
        ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
        const firstActor = allActors[0];

        // Track bestiary
        const pursuerBestiary = [...state.bestiary];
        const existingPursuer = pursuerBestiary.find(b => b.enemyId === PURSUER_CONFIG.enemyId);
        if (!existingPursuer) {
          pursuerBestiary.push({ enemyId: PURSUER_CONFIG.enemyId, encountered: true, defeated: false, timesDefeated: 0 });
        } else {
          existingPursuer.encountered = true;
        }

        const nemesisVc = rollVictoryCondition(enemies);

        set({
          phase: 'combat',
          party: updatedParty,
          enemies,
          autoCombat: getAutoCombatDefault(),
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
            log: [{ turn: 1, actorName: 'Sistema', actorType: 'player' as const, action: 'QTE Fallito', message: `${PURSUER_CONFIG.name} vi ha raggiunto!` }],
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
          bestiary: pursuerBestiary,
          pursuerLastSeenLocation: state.currentLocationId,
          pursuerLastSeenTurn: state.turnCount,
          messageLog: [...state.messageLog, ...logMessages],
          ...(state.pursuerLevel < PURSUER_CONFIG.maxPursuitLevel ? { pursuerLevel: state.pursuerLevel + 1 } : {}),
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
      ...(newPursuitLevelOnSuccess !== null ? { pursuerLevel: newPursuitLevelOnSuccess } : {}),
    });
  },
});
