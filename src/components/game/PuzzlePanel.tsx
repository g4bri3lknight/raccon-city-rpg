'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { ITEMS } from '@/game/data/items';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Delete, Check, X, Key, Lock, Sparkles,
} from 'lucide-react';

// ============================================
// Arrow direction config for sequence puzzle
// ============================================
const DIRECTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; arrow: string }> = {
  up:    { icon: <ArrowUp className="w-10 h-10 sm:w-14 sm:h-14" />, label: 'SU', arrow: '↑' },
  down:  { icon: <ArrowDown className="w-10 h-10 sm:w-14 sm:h-14" />, label: 'GIÙ', arrow: '↓' },
  left:  { icon: <ArrowLeft className="w-10 h-10 sm:w-14 sm:h-14" />, label: 'SINISTRA', arrow: '←' },
  right: { icon: <ArrowRight className="w-10 h-10 sm:w-14 sm:h-14" />, label: 'DESTRA', arrow: '→' },
  space: { icon: <span className="text-2xl sm:text-4xl font-bold select-none">⎵</span>, label: 'SPAZIO', arrow: '⎵' },
};

// ============================================
// Main PuzzlePanel Component
// ============================================
export default function PuzzlePanel() {
  const puzzleState = useGameStore(s => s.puzzleState);
  const party = useGameStore(s => s.party);

  if (!puzzleState) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-red-950/20 to-black pointer-events-none" />

      <AnimatePresence mode="wait">
        {puzzleState.type === 'combination' && (
          <CombinationPuzzle key="combination" />
        )}
        {puzzleState.type === 'sequence' && (
          <SequencePuzzle key="sequence" />
        )}
        {puzzleState.type === 'key_required' && (
          <KeyRequiredPuzzle key="key_required" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// Combination Lock Puzzle
// ============================================
function CombinationPuzzle() {
  const puzzleState = useGameStore(s => s.puzzleState)!;
  const addDigitToCombination = useGameStore(s => s.addDigitToCombination);
  const removeDigitFromCombination = useGameStore(s => s.removeDigitFromCombination);
  const closePuzzle = useGameStore(s => s.closePuzzle);

  // Use feedback length as animation trigger key
  const submitAnimKey = puzzleState.feedback.length;

  const isComplete = puzzleState.isSolved || puzzleState.isFailed;
  const currentInput = puzzleState.currentInput;
  const codeLength = puzzleState.codeLength;
  const attemptsLeft = puzzleState.attemptsLeft;
  const maxAttempts = puzzleState.maxAttempts;
  const feedback = puzzleState.feedback;

  // Numpad grid: rows of 3 buttons + bottom row with 0, delete, (empty)
  const numpadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative z-10 w-full max-w-md glass-dark rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-red-400" />
          <h2 className="text-base sm:text-lg font-bold text-white horror-text">
            {puzzleState.title}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          {puzzleState.description}
        </p>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Attempts indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-gray-500">Tentativi</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i < attemptsLeft
                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current input digits */}
        <div className="flex justify-center gap-3 sm:gap-4">
          {Array.from({ length: codeLength }).map((_, i) => (
            <motion.div
              key={`${submitAnimKey}-${i}`}
              initial={{ scale: submitAnimKey > 0 ? 1.2 : 1, y: submitAnimKey > 0 ? -4 : 0 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className={`w-12 h-14 sm:w-16 sm:h-18 rounded-lg border-2 flex items-center justify-center text-xl sm:text-2xl font-bold font-mono transition-all duration-200 ${
                i === currentInput.length
                  ? 'border-red-500/60 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : i < currentInput.length
                    ? 'border-gray-500/50 bg-gray-800/80 text-white'
                    : 'border-gray-700/50 bg-black/40 text-gray-600'
              }`}
            >
              {i < currentInput.length ? currentInput[i] : ''}
              {i === currentInput.length && !isComplete && (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                  className="absolute w-1 h-6 bg-red-400"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Feedback from previous attempts */}
        {feedback.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 mb-1.5">
              Tentativi precedenti
            </div>
            <div className="max-h-36 overflow-y-auto inventory-scrollbar space-y-1.5">
              {feedback.map((fb, rowIdx) => (
                <motion.div
                  key={rowIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIdx * 0.05 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                >
                  {/* Show the attempted digits */}
                  <span className="text-xs text-gray-500 font-mono min-w-[48px]">
                    #{rowIdx + 1}
                  </span>
                  {/* Feedback dots */}
                  <div className="flex items-center gap-1.5">
                    {fb.map((result, dotIdx) => (
                      <motion.div
                        key={dotIdx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: dotIdx * 0.08, type: 'spring', stiffness: 400 }}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border"
                        style={{
                          backgroundColor:
                            result === 'correct'
                              ? '#22c55e'
                              : result === 'misplaced'
                                ? '#eab308'
                                : '#dc2626',
                          borderColor:
                            result === 'correct'
                              ? '#16a34a'
                              : result === 'misplaced'
                                ? '#ca8a04'
                                : '#b91c1c',
                          boxShadow:
                            result === 'correct'
                              ? '0 0 8px rgba(34,197,94,0.5)'
                              : result === 'misplaced'
                                ? '0 0 8px rgba(234,179,8,0.4)'
                                : '0 0 8px rgba(220,38,38,0.3)',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
            <span>Corretto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.4)]" />
            <span>Sbagliato</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.4)]" />
            <span>Assente</span>
          </div>
        </div>

        {/* Numpad */}
        {!isComplete && (
          <div className="space-y-2">
            {numpadRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-3 gap-2">
                {row.map(digit => (
                  <motion.button
                    key={digit}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addDigitToCombination(digit)}
                    className="h-12 sm:h-14 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white font-bold text-lg font-mono
                      hover:bg-white/10 hover:border-white/15 active:bg-white/[0.15] transition-colors duration-150
                      min-w-[44px] min-h-[44px] select-none"
                  >
                    {digit}
                  </motion.button>
                ))}
              </div>
            ))}
            {/* Bottom row: Delete, 0, (empty or Enter visual) */}
            <div className="grid grid-cols-3 gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={removeDigitFromCombination}
                disabled={currentInput.length === 0}
                className="h-12 sm:h-14 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400
                  hover:bg-red-500/20 hover:border-red-500/30 active:bg-red-500/25
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150
                  flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <Delete className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addDigitToCombination('0')}
                className="h-12 sm:h-14 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white font-bold text-lg font-mono
                  hover:bg-white/10 hover:border-white/15 active:bg-white/[0.15] transition-colors duration-150
                  min-w-[44px] min-h-[44px] select-none"
              >
                0
              </motion.button>
              {/* Placeholder or info */}
              <div className="h-12 sm:h-14 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-[10px] text-gray-600 min-w-[44px] min-h-[44px]">
                {currentInput.length}/{codeLength}
              </div>
            </div>
          </div>
        )}

        {/* Solved state */}
        <AnimatePresence>
          {puzzleState.isSolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/25">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <Check className="w-6 h-6 text-green-400" />
                </motion.div>
                <span className="text-green-300 font-bold text-sm sm:text-base">
                  Codice corretto! Serratura aperta.
                </span>
              </div>
              <Button
                onClick={closePuzzle}
                className="w-full horror-btn h-12 bg-green-900/30 hover:bg-green-800/40 border border-green-600/40 hover:border-green-500/60
                  text-green-200 hover:text-white transition-all duration-300"
              >
                Continua
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed state */}
        <AnimatePresence>
          {puzzleState.isFailed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/25">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.4, repeat: 3 }}
                >
                  <X className="w-6 h-6 text-red-400" />
                </motion.div>
                <div className="text-left">
                  <p className="text-red-300 font-bold text-sm sm:text-base">Tentativi esauriti!</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{puzzleState.failMessage}</p>
                </div>
              </div>
              <Button
                onClick={closePuzzle}
                className="w-full horror-btn h-12 bg-red-900/30 hover:bg-red-800/40 border border-red-600/40 hover:border-red-500/60
                  text-red-200 hover:text-white transition-all duration-300"
              >
                Chiudi
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// Sequence Puzzle (Simon-Says arrows)
// ============================================
function SequencePuzzle() {
  const puzzleState = useGameStore(s => s.puzzleState)!;
  const handleSequenceInput = useGameStore(s => s.handleSequenceInput);
  const closePuzzle = useGameStore(s => s.closePuzzle);

  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [lastInputResult, setLastInputResult] = useState<'correct' | 'wrong' | null>(null);
  const [patternShown, setPatternShown] = useState(false);

  const {
    sequencePattern,
    playerSequence,
    isShowingPattern,
    currentPatternIndex,
    isSolved,
    isFailed,
    title,
    description,
  } = puzzleState;

  // Pattern display animation
  useEffect(() => {
    if (!isShowingPattern) {
      setPatternShown(true);
      return;
    }

    setPatternShown(false);
    setActiveDirection(null);

    if (currentPatternIndex < sequencePattern.length) {
      const dir = sequencePattern[currentPatternIndex];

      // Show current arrow with glow
      const showTimer = setTimeout(() => {
        setActiveDirection(dir);
      }, 100);

      // Hide after 600ms
      const hideTimer = setTimeout(() => {
        setActiveDirection(null);
      }, 700);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isShowingPattern, currentPatternIndex, sequencePattern]);

  const onDirectionPress = useCallback(
    (direction: string) => {
      if (isShowingPattern || isSolved || isFailed) return;

      const currentIdx = playerSequence.length;

      // Check if correct
      const isCorrect = direction === sequencePattern[currentIdx];

      // Flash feedback
      setActiveDirection(direction);
      setLastInputResult(isCorrect ? 'correct' : 'wrong');

      setTimeout(() => {
        setActiveDirection(null);
        setLastInputResult(null);
      }, 300);

      // Dispatch to store (handles success/fail logic)
      handleSequenceInput(direction);
    },
    [isShowingPattern, isSolved, isFailed, playerSequence.length, sequencePattern, handleSequenceInput],
  );

  // Keyboard controls
  useEffect(() => {
    if (isShowingPattern || isSolved || isFailed || !patternShown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':    e.preventDefault(); onDirectionPress('up'); break;
        case 'ArrowDown':  e.preventDefault(); onDirectionPress('down'); break;
        case 'ArrowLeft':  e.preventDefault(); onDirectionPress('left'); break;
        case 'ArrowRight': e.preventDefault(); onDirectionPress('right'); break;
        case ' ':          e.preventDefault(); onDirectionPress('space'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShowingPattern, isSolved, isFailed, patternShown, onDirectionPress]);

  // Progress through pattern
  const showProgress = isShowingPattern
    ? ((currentPatternIndex + 1) / sequencePattern.length) * 100
    : patternShown && !isSolved && !isFailed
      ? (playerSequence.length / sequencePattern.length) * 100
      : isSolved
        ? 100
        : 0;

  const directions = ['up', 'left', 'down', 'right', 'space'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative z-10 w-full max-w-lg glass-dark rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-bold text-white horror-text">{title}</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-black/60">
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 to-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${showProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Status message */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            {isShowingPattern && (
              <motion.p
                key="showing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-amber-400/80 font-medium"
              >
                Osserva la sequenza... ({currentPatternIndex + 1}/{sequencePattern.length})
              </motion.p>
            )}
            {!isShowingPattern && !isSolved && !isFailed && patternShown && (
              <motion.p
                key="repeat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-green-400/90 font-bold"
              >
                Ripeti la sequenza! ({playerSequence.length}/{sequencePattern.length})
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Arrow display area */}
        <div className="relative h-32 sm:h-40 flex items-center justify-center rounded-xl bg-black/50 border border-white/[0.04] overflow-hidden">
          {/* Background grid lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/2 w-px h-full bg-gray-500" />
            <div className="absolute left-0 top-1/2 w-full h-px bg-gray-500" />
          </div>

          <AnimatePresence mode="wait">
            {activeDirection && DIRECTION_CONFIG[activeDirection] && (
              <motion.div
                key={`arrow-${activeDirection}-${Date.now()}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.15 }}
                className={`flex items-center justify-center ${
                  lastInputResult === 'correct'
                    ? 'text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.7)]'
                    : lastInputResult === 'wrong'
                      ? 'text-red-400 drop-shadow-[0_0_20px_rgba(220,38,38,0.7)]'
                      : 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                }`}
              >
                {DIRECTION_CONFIG[activeDirection].icon}
              </motion.div>
            )}
            {!activeDirection && !isShowingPattern && !isSolved && !isFailed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-700 text-sm"
              >
                Premi una freccia...
              </motion.div>
            )}
            {!activeDirection && isShowingPattern && (
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-amber-700/40 text-sm"
              >
                <Lock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player input arrows */}
        {!isSolved && !isFailed && patternShown && !isShowingPattern && (
          <div className="flex justify-center gap-2 sm:gap-3">
            {directions.map(dir => (
              <motion.button
                key={dir}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDirectionPress(dir)}
                disabled={isShowingPattern || isSolved || isFailed}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border flex items-center justify-center
                  transition-all duration-150 min-w-[44px] min-h-[44px] select-none
                  ${
                    activeDirection === dir
                      ? lastInputResult === 'correct'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : lastInputResult === 'wrong'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white'
                  }
                `}
              >
                {DIRECTION_CONFIG[dir]?.icon || <span className="text-sm">{dir}</span>}
              </motion.button>
            ))}
          </div>
        )}

        {/* Completed arrow dots — show progress for player input */}
        {patternShown && !isShowingPattern && playerSequence.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {sequencePattern.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  idx < playerSequence.length
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Solved state */}
        <AnimatePresence>
          {isSolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/25">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <Check className="w-6 h-6 text-green-400" />
                </motion.div>
                <span className="text-green-300 font-bold text-sm sm:text-base">
                  Sequenza corretta! Passaggio sbloccato.
                </span>
              </div>
              <Button
                onClick={closePuzzle}
                className="w-full horror-btn h-12 bg-green-900/30 hover:bg-green-800/40 border border-green-600/40 hover:border-green-500/60
                  text-green-200 hover:text-white transition-all duration-300"
              >
                Continua
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed state */}
        <AnimatePresence>
          {isFailed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/25">
                <motion.div
                  animate={{ x: [-4, 4, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <X className="w-6 h-6 text-red-400" />
                </motion.div>
                <div className="text-left">
                  <p className="text-red-300 font-bold text-sm sm:text-base">Sequenza errata!</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{puzzleState.failMessage}</p>
                </div>
              </div>
              <Button
                onClick={closePuzzle}
                className="w-full horror-btn h-12 bg-red-900/30 hover:bg-red-800/40 border border-red-600/40 hover:border-red-500/60
                  text-red-200 hover:text-white transition-all duration-300"
              >
                Chiudi
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// Key Required Puzzle
// ============================================
function KeyRequiredPuzzle() {
  const puzzleState = useGameStore(s => s.puzzleState)!;
  const party = useGameStore(s => s.party);
  const closePuzzle = useGameStore(s => s.closePuzzle);

  // Check if the party has all required items
  const requiredItems = puzzleState.requiredItemIds
    .map(id => ({ id, def: ITEMS[id as keyof typeof ITEMS] }))
    .filter(item => item.def);

  const hasAllItems = requiredItems.every(req =>
    party.some(p => p.inventory.some(inv => inv.itemId === req.id)),
  );

  const missingItems = requiredItems.filter(
    req => !party.some(p => p.inventory.some(inv => inv.itemId === req.id)),
  );

  const handleUseItem = () => {
    // Mark as solved — the store's closePuzzle handles event completion
    useGameStore.setState({
      puzzleState: { ...puzzleState, isSolved: true },
    });
    // Apply success outcome
    const outcome = puzzleState.successOutcome;
    const state = useGameStore.getState();
    let updatedParty = [...state.party];

    if (outcome.hpChange) {
      updatedParty = updatedParty.map(p => ({
        ...p,
        currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + outcome.hpChange)),
      }));
    }

    if (outcome.receiveItems) {
      for (const itemEntry of outcome.receiveItems) {
        const itemDef = ITEMS[itemEntry.itemId as keyof typeof ITEMS];
        if (!itemDef) continue;
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (!added && p.inventory.length < p.maxInventorySlots) {
            added = true;
            return {
              ...p,
              inventory: [
                ...p.inventory,
                {
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
                },
              ],
            };
          }
          return p;
        });
      }
    }

    const logMessages: string[] = [
      `[${state.turnCount}] 🧩 ${puzzleState.title} completato!`,
      `[${state.turnCount}] 📖 ${outcome.description}`,
    ];

    if (outcome.receiveItems) {
      for (const itemEntry of outcome.receiveItems) {
        const itemDef = ITEMS[itemEntry.itemId as keyof typeof ITEMS];
        if (itemDef) logMessages.push(`[${state.turnCount}] 🎒 Ottenuto: ${itemDef.name} x${itemEntry.quantity}`);
      }
    }

    useGameStore.setState({
      party: updatedParty,
      messageLog: [...state.messageLog, ...logMessages],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative z-10 w-full max-w-md glass-dark rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-bold text-white horror-text">{puzzleState.title}</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{puzzleState.description}</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Required items display */}
        <div className="glass-dark-inner rounded-lg p-3 sm:p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Oggetti necessari
          </div>
          {requiredItems.map(item => {
            const hasItem = party.some(p => p.inventory.some(inv => inv.itemId === item.id));
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  hasItem
                    ? 'border-green-500/25 bg-green-500/[0.06]'
                    : 'border-red-500/20 bg-red-500/[0.06]'
                }`}
              >
                <div className="w-10 h-10 rounded-md bg-black/40 border border-white/[0.06] flex items-center justify-center text-lg shrink-0">
                  {item.def.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${hasItem ? 'text-green-300' : 'text-red-300'}`}>
                    {item.def.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{item.def.description}</p>
                </div>
                {hasItem ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="w-5 h-5 text-green-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <X className="w-5 h-5 text-red-400/60" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action */}
        {hasAllItems ? (
          <AnimatePresence>
            {!puzzleState.isSolved && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="text-center text-xs text-green-400/70">
                  Hai tutti gli oggetti necessari.
                </div>
                <Button
                  onClick={handleUseItem}
                  className="w-full horror-btn h-12 bg-green-900/30 hover:bg-green-800/40 border border-green-600/40 hover:border-green-500/60
                    text-green-200 hover:text-white transition-all duration-300 font-bold"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Usa {requiredItems.map(r => r.def.name).join(' + ')}
                </Button>
              </motion.div>
            )}
            {puzzleState.isSolved && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/25">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <Check className="w-6 h-6 text-green-400" />
                  </motion.div>
                  <span className="text-green-300 font-bold text-sm sm:text-base">
                    {puzzleState.successOutcome.description}
                  </span>
                </div>
                <Button
                  onClick={closePuzzle}
                  className="w-full horror-btn h-12 bg-green-900/30 hover:bg-green-800/40 border border-green-600/40 hover:border-green-500/60
                    text-green-200 hover:text-white transition-all duration-300"
                >
                  Continua
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-xs text-red-400/80 leading-relaxed">
              Ti manca{missingItems.length > 1 ? 'no' : ''}{' '}
              <span className="text-red-300 font-semibold">
                {missingItems.map(m => m.def.name).join(' e ')}
              </span>
              . Esplora le aree circostanti per trovar{missingItems.length > 1 ? 'li' : 'lo'}.
            </div>
            <Button
              onClick={closePuzzle}
              className="w-full horror-btn h-12 bg-red-900/30 hover:bg-red-800/40 border border-red-600/40 hover:border-red-500/60
                text-red-200 hover:text-white transition-all duration-300"
            >
              Chiudi
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
