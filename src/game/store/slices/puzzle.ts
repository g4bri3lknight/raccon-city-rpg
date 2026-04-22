import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ITEMS } from '../../data/loader';
import { addItemToParty } from '../helpers';
import { playPuzzleSuccess, playPuzzleFail } from '../../engine/sounds';

export const createPuzzleSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  startPuzzle: (puzzle, title, description) => {
    const state = get();
    const puzzleState: PuzzleState = {
      type: puzzle.type,
      title,
      description,
      codeLength: puzzle.combinationCode?.length || 4,
      currentInput: [],
      targetCode: puzzle.combinationCode || '',
      attemptsLeft: 5,
      maxAttempts: 5,
      feedback: [],
      sequencePattern: puzzle.sequencePattern || [],
      playerSequence: [],
      isShowingPattern: true,
      currentPatternIndex: 0,
      showPhaseStep: 0,
      requiredItemIds: puzzle.requiredItemIds || (puzzle.requiredItemId ? [puzzle.requiredItemId] : []),
      successOutcome: puzzle.successOutcome,
      failMessage: puzzle.failMessage,
      isSolved: false,
      isFailed: false,
    };
    set({
      phase: 'puzzle',
      puzzleState,
      puzzleSourceLocationId: state.currentLocationId,
    });
  },

  submitCombination: (input: string[]) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination') return;

    // Validate: check each position
    const feedback: ('correct' | 'misplaced' | 'wrong')[] = [];
    const targetArr = ps.targetCode.split('');
    const inputArr = [...input];
    const targetUsed = new Set<number>();
    const inputUsed = new Set<number>();

    // First pass: correct positions
    for (let i = 0; i < inputArr.length; i++) {
      if (inputArr[i] === targetArr[i]) {
        feedback.push('correct');
        targetUsed.add(i);
        inputUsed.add(i);
      } else {
        feedback.push('wrong');
      }
    }
    // Second pass: misplaced
    for (let i = 0; i < inputArr.length; i++) {
      if (inputUsed.has(i)) continue;
      for (let j = 0; j < targetArr.length; j++) {
        if (targetUsed.has(j)) continue;
        if (inputArr[i] === targetArr[j]) {
          feedback[i] = 'misplaced';
          targetUsed.add(j);
          break;
        }
      }
    }

    const newFeedback = [...ps.feedback, feedback];
    const isSolved = feedback.every(f => f === 'correct');
    const attemptsLeft = ps.attemptsLeft - 1;
    const isFailed = attemptsLeft <= 0 && !isSolved;

    if (isSolved) {
      // Puzzle solved! Apply success outcome
      const outcome = ps.successOutcome;
      let updatedParty = [...state.party];
      const logMessages: string[] = [
        `[${state.turnCount}] 🧩 Puzzle risolto! ${ps.title}`,
        `[${state.turnCount}] 📖 ${outcome.description}`,
      ];

      if (outcome.hpChange) {
        updatedParty = updatedParty.map(p => ({
          ...p,
          currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
        }));
      }

      if (outcome.receiveItems) {
        for (const itemEntry of outcome.receiveItems) {
          const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
          updatedParty = result.party;
          if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
        }
      }

      const completedEvents = state.completedEvents.includes(state.puzzleSourceLocationId || '')
        ? state.completedEvents
        : [...state.completedEvents, state.puzzleSourceLocationId || ''];

      // Play puzzle success sound (#36)
      try { playPuzzleSuccess(); } catch {}

      set({
        phase: 'exploration',
        puzzleState: { ...ps, isSolved: true, feedback: newFeedback, attemptsLeft },
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        completedEvents,
        activeEvent: null,
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    if (isFailed) {
      // Play puzzle fail sound (#36)
      try { playPuzzleFail(); } catch {}

      set({
        puzzleState: { ...ps, isFailed: true, feedback: newFeedback, attemptsLeft: 0 },
        messageLog: [...state.messageLog, `[${state.turnCount}] 🧩 ${ps.failMessage}`],
      });
      return;
    }

    set({
      puzzleState: { ...ps, feedback: newFeedback, attemptsLeft, currentInput: [] },
    });
  },

  addDigitToCombination: (digit: string) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination' || ps.isSolved || ps.isFailed) return;
    if (ps.currentInput.length >= ps.codeLength) return;
    const newInput = [...ps.currentInput, digit];
    if (newInput.length === ps.codeLength) {
      // Auto-submit when full
      get().submitCombination(newInput);
    } else {
      set({ puzzleState: { ...ps, currentInput: newInput } });
    }
  },

  removeDigitFromCombination: () => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination' || ps.currentInput.length === 0) return;
    set({ puzzleState: { ...ps, currentInput: ps.currentInput.slice(0, -1) } });
  },

  resetCombination: () => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'combination') return;
    set({ puzzleState: { ...ps, currentInput: [] } });
  },

  handleSequenceInput: (direction: string) => {
    const state = get();
    const ps = state.puzzleState;
    if (!ps || ps.type !== 'sequence' || ps.isShowingPattern || ps.isSolved || ps.isFailed) return;

    const newSequence = [...ps.playerSequence, direction];
    const currentIdx = newSequence.length - 1;

    if (direction !== ps.sequencePattern[currentIdx]) {
      // Wrong input — fail
      set({
        puzzleState: { ...ps, playerSequence: newSequence, isFailed: true },
        messageLog: [...state.messageLog, `[${state.turnCount}] 🧩 ${ps.failMessage}`],
      });
      return;
    }

    if (newSequence.length === ps.sequencePattern.length) {
      // All correct! Solve puzzle
      const outcome = ps.successOutcome;
      let updatedParty = [...state.party];
      const logMessages: string[] = [
        `[${state.turnCount}] 🧩 Sequenza corretta! ${ps.title}`,
        `[${state.turnCount}] 📖 ${outcome.description}`,
      ];

      if (outcome.hpChange) {
        updatedParty = updatedParty.map(p => ({
          ...p,
          currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
        }));
      }

      if (outcome.receiveItems) {
        for (const itemEntry of outcome.receiveItems) {
          const result = addItemToParty(updatedParty, itemEntry.itemId, itemEntry.quantity);
          updatedParty = result.party;
          if (result.added) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${ITEMS[itemEntry.itemId]?.name} x${itemEntry.quantity} → ${result.characterName}`);
        }
      }

      const completedEvents = state.completedEvents.includes(state.puzzleSourceLocationId || '')
        ? state.completedEvents
        : [...state.completedEvents, state.puzzleSourceLocationId || ''];

      // Play puzzle success sound for sequence puzzle (#36)
      try { playPuzzleSuccess(); } catch {}

      set({
        phase: 'exploration',
        puzzleState: { ...ps, isSolved: true, playerSequence: newSequence },
        party: updatedParty,
        messageLog: [...state.messageLog, ...logMessages],
        completedEvents,
        activeEvent: null,
      });
      setTimeout(() => get().checkAchievements(), 100);
      return;
    }

    set({ puzzleState: { ...ps, playerSequence: newSequence } });
  },

  closePuzzle: () => {
    const state = get();
    const locId = state.puzzleSourceLocationId;
    const completedEvents = (locId && state.puzzleState?.isSolved)
      ? state.completedEvents.includes(locId)
        ? state.completedEvents
        : [...state.completedEvents, locId]
      : state.completedEvents;
    set({
      phase: 'exploration',
      puzzleState: null,
      puzzleSourceLocationId: null,
      completedEvents,
      activeEvent: null,
      skipNextEncounter: true,
    });
  },
});
