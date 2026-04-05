'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space } from 'lucide-react';

// ── Types & Constants ──
type FeedbackState = 'idle' | 'success' | 'failure';

const DIRECTION_ICONS: Record<string, React.ReactNode> = {
  up: <ArrowUp className="w-20 h-20 sm:w-28 sm:h-28" />,
  down: <ArrowDown className="w-20 h-20 sm:w-28 sm:h-28" />,
  left: <ArrowLeft className="w-20 h-20 sm:w-28 sm:h-28" />,
  right: <ArrowRight className="w-20 h-20 sm:w-28 sm:h-28" />,
  space: <span className="text-3xl sm:text-4xl font-black tracking-[0.2em]">SPAZIO</span>,
};

const DIRECTION_LABELS: Record<string, string> = {
  up: '↑ SU',
  down: '↓ GIÙ',
  left: '← SINISTRA',
  right: '→ DESTRA',
  space: '⎵ SPAZIO',
};

const DIRECTION_TOUCH_ICONS: Record<string, React.ReactNode> = {
  up: <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7" />,
  down: <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7" />,
  left: <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />,
  right: <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />,
  space: <Space className="w-6 h-6 sm:w-7 sm:h-7" />,
};

// ── Timer bar ──
function TimerBar({ timeRemaining, timeLimit }: { timeRemaining: number; timeLimit: number }) {
  const pct = Math.max(0, (timeRemaining / timeLimit) * 100);
  const isLow = pct < 30;
  const isCritical = pct < 15;

  return (
    <div className="w-64 sm:w-80 h-3 sm:h-4 rounded-full overflow-hidden bg-black/60 border border-white/10 relative">
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,255,255,0.12) 50%, transparent 55%, transparent 100%)',
          animation: 'ecg-scan 2s ease-in-out infinite',
        }}
      />
      <motion.div
        className="h-full rounded-full relative"
        style={{
          background: isCritical
            ? 'linear-gradient(90deg, #7f1d1d, #dc2626)'
            : isLow
              ? 'linear-gradient(90deg, #92400e, #f59e0b)'
              : 'linear-gradient(90deg, #991b1b, #ef4444)',
          boxShadow: isCritical
            ? '0 0 14px rgba(220,38,38,0.8), 0 0 28px rgba(220,38,38,0.3)'
            : isLow
              ? '0 0 10px rgba(245,158,11,0.5)'
              : '0 0 8px rgba(239,68,68,0.4)',
        }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.05, ease: 'linear' }}
      />
    </div>
  );
}

// ── Progress dots ──
function ProgressDots({
  total,
  currentStep,
  successes,
  failures,
  isComplete,
}: {
  total: number;
  currentStep: number;
  successes: number;
  failures: number;
  isComplete: boolean;
}) {
  const completed = successes + failures;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < completed;
        const isCurrent = i === currentStep && !isComplete;
        const isSuccess = i < successes;
        const isFail = i >= successes && i < completed;

        return (
          <div key={i} className="relative">
            <motion.div
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-colors duration-200 ${
                isCompleted && isSuccess
                  ? 'bg-green-500 border-green-400'
                  : isCompleted && isFail
                    ? 'bg-red-500 border-red-400'
                    : isCurrent
                      ? 'border-red-400 bg-red-950'
                      : 'border-white/15 bg-transparent'
              }`}
              animate={
                isCurrent
                  ? {
                      scale: [1, 1.4, 1],
                      boxShadow: [
                        '0 0 4px rgba(239,68,68,0.3)',
                        '0 0 16px rgba(239,68,68,0.7)',
                        '0 0 4px rgba(239,68,68,0.3)',
                      ],
                    }
                  : isCompleted && isSuccess
                    ? { boxShadow: ['0 0 6px rgba(34,197,94,0.5)', '0 0 6px rgba(34,197,94,0.3)'] }
                    : isCompleted && isFail
                      ? { boxShadow: ['0 0 6px rgba(239,68,68,0.5)', '0 0 6px rgba(239,68,68,0.3)'] }
                      : {}
              }
              transition={
                isCurrent
                  ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
            {isCompleted && isSuccess && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-[8px] text-white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                ✓
              </motion.div>
            )}
            {isCompleted && isFail && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-[8px] text-white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                ✗
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──
export default function QTEPanel() {
  const qteState = useGameStore(s => s.qteState);
  const handleQTEInput = useGameStore(s => s.handleQTEInput);

  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [isShaking, setIsShaking] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const feedbackRef = useRef<FeedbackState>('idle');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const localTimeRef = useRef(0);

  // Track the step key to detect transitions
  const prevStepKeyRef = useRef<string>('none');

  // ── Reset local state when QTE step transitions (using prevStepKey pattern) ──
  const stepKey = qteState
    ? `s${qteState.currentStep}-p${qteState.isProcessing ? 1 : 0}-c${qteState.isComplete ? 1 : 0}`
    : 'none';

  // Use a separate effect purely for subscribing to rAF timer updates.
  // All setState calls happen inside async callbacks (rAF, setTimeout) — never synchronously in the effect body.

  // ── Detect step transitions and schedule state resets via queueMicrotask ──
  useEffect(() => {
    if (stepKey === prevStepKeyRef.current) return;
    prevStepKeyRef.current = stepKey;

    if (!qteState) {
      // Component cleanup — schedule async resets
      const id = queueMicrotask(() => {
        setFeedback('idle');
        setDisplayTime(0);
        setShowResult(false);
        setIsShaking(false);
      });
      return () => { /* microtask cannot be cancelled, but it's harmless */ };
    }

    if (qteState.isComplete) {
      queueMicrotask(() => setShowResult(true));
      return;
    }

    if (!qteState.isProcessing) {
      queueMicrotask(() => {
        setFeedback('idle');
        setIsShaking(false);
      });
    }
  }, [stepKey, qteState]);

  // ── Timer: requestAnimationFrame countdown ──
  useEffect(() => {
    if (!qteState || qteState.isComplete || qteState.isProcessing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const currentSeq = qteState.sequences[qteState.currentStep];
    if (!currentSeq) return;

    localTimeRef.current = qteState.timeRemaining;
    lastTimestampRef.current = performance.now();
    const isInitialRef = { value: true };

    const tick = (timestamp: number) => {
      if (isInitialRef.value) {
        // Initialize display on first frame (inside async rAF callback)
        setDisplayTime(localTimeRef.current);
        lastTimestampRef.current = timestamp;
        isInitialRef.value = false;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      const next = localTimeRef.current - delta;
      if (next <= 0) {
        localTimeRef.current = 0;
        setDisplayTime(0);
        handleQTEInput('__timeout__');
        rafRef.current = null;
        return;
      }
      localTimeRef.current = next;
      setDisplayTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [qteState?.currentStep, qteState?.isProcessing, qteState?.isComplete, handleQTEInput]);

  // ── Helper: apply visual feedback then send input to store ──
  const applyFeedback = useCallback(
    (fb: FeedbackState, direction: string) => {
      feedbackRef.current = fb;
      setFeedback(fb);
      if (fb === 'failure') {
        setIsShaking(true);
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        feedbackRef.current = 'idle';
        setFeedback('idle');
        setIsShaking(false);
      }, 400);
      handleQTEInput(direction);
    },
    [handleQTEInput],
  );

  // ── Keyboard handler ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!qteState || qteState.isProcessing || qteState.isComplete) return;

      let direction: string | null = null;
      switch (e.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
        case ' ': direction = 'space'; break;
        default: return;
      }

      e.preventDefault();

      const currentSeq = qteState.sequences[qteState.currentStep];
      const isCorrect = direction === currentSeq?.direction;
      applyFeedback(isCorrect ? 'success' : 'failure', direction);
    },
    [qteState, applyFeedback],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Touch button handler ──
  const handleTouchInput = useCallback(
    (direction: string) => {
      if (!qteState || qteState.isProcessing || qteState.isComplete) return;
      const currentSeq = qteState.sequences[qteState.currentStep];
      const isCorrect = direction === currentSeq?.direction;
      applyFeedback(isCorrect ? 'success' : 'failure', direction);
    },
    [qteState, applyFeedback],
  );

  // ── Don't render if no QTE state ──
  if (!qteState) return null;

  const currentSeq = qteState.sequences[qteState.currentStep];
  const currentDirection = currentSeq?.direction || 'up';
  const totalSteps = qteState.sequences.length;

  // Result display config
  const resultConfig = {
    success: {
      emoji: '🟢',
      text: 'Perfetto!',
      subtext: 'Schivata perfetta!',
      color: '#22c55e',
      glow: '0 0 40px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.2)',
      borderColor: 'border-green-500/50',
    },
    partial: {
      emoji: '🟡',
      text: 'Quasi!',
      subtext: 'Qualche errore ma ce l\'hai fatta',
      color: '#eab308',
      glow: '0 0 40px rgba(234,179,8,0.5), 0 0 80px rgba(234,179,8,0.2)',
      borderColor: 'border-yellow-500/50',
    },
    failure: {
      emoji: '🔴',
      text: 'Fallito!',
      subtext: 'Non sei riuscito a schivare...',
      color: '#ef4444',
      glow: '0 0 40px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.2)',
      borderColor: 'border-red-500/50',
    },
    pending: {
      emoji: '',
      text: '',
      subtext: '',
      color: '#fff',
      glow: '',
      borderColor: '',
    },
  };

  const result = resultConfig[qteState.result];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden ${
          isShaking ? 'screen-shake' : ''
        }`}
      >
        {/* ── Dark overlay with red vignette ── */}
        <div className="absolute inset-0 bg-black/90" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(127,29,29,0.25) 60%, rgba(69,10,10,0.6) 85%, rgba(0,0,0,0.9) 100%)',
          }}
        />
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-30" />

        {/* Blood drip accents */}
        <div className="absolute top-0 left-[10%] w-1 blood-drip pointer-events-none" style={{ animationDelay: '0s', animationDuration: '2.5s' }}>
          <div className="w-full bg-red-800 rounded-b-full" style={{ height: '14px' }} />
        </div>
        <div className="absolute top-0 right-[20%] w-1 blood-drip pointer-events-none" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }}>
          <div className="w-full bg-red-900 rounded-b-full" style={{ height: '10px' }} />
        </div>

        {/* ── TOP: QTE label + progress ── */}
        <div className="relative z-10 flex flex-col items-center gap-3 mt-8 sm:mt-12">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/40"
            style={{
              background: 'rgba(127,29,29,0.3)',
              boxShadow: '0 0 20px rgba(220,38,38,0.2), inset 0 0 15px rgba(220,38,38,0.1)',
            }}
          >
            <span
              className="text-xl sm:text-2xl font-black tracking-[0.25em]"
              style={{
                color: '#dc2626',
                textShadow: '0 0 12px rgba(220,38,38,0.8), 0 0 24px rgba(220,38,38,0.3)',
              }}
            >
              Q.T.E.
            </span>
            {qteState.triggerSource === 'nemesis' && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[10px] sm:text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded"
              >
                NEMESIS
              </motion.span>
            )}
            {qteState.triggerSource === 'boss' && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[10px] sm:text-xs font-bold text-orange-400 bg-orange-900/50 px-2 py-0.5 rounded"
              >
                BOSS
              </motion.span>
            )}
          </motion.div>

          <span className="text-[10px] sm:text-xs text-white/40 font-mono tracking-wider">
            {Math.min(qteState.currentStep + 1, totalSteps)} / {totalSteps}
          </span>

          <ProgressDots
            total={totalSteps}
            currentStep={qteState.currentStep}
            successes={qteState.successes}
            failures={qteState.failures}
            isComplete={qteState.isComplete}
          />
        </div>

        {/* ── CENTER: Arrow display ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8">
          <AnimatePresence mode="wait">
            {!showResult && currentSeq && (
              <motion.div
                key={`arrow-${qteState.currentStep}-${currentDirection}`}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{
                  scale: feedback === 'success' ? 0.7 : feedback === 'failure' ? 1.1 : 1,
                  rotate: feedback === 'failure' ? [0, -8, 8, -5, 5, 0] : 0,
                  opacity: 1,
                }}
                transition={{
                  scale: { type: 'spring', stiffness: 400, damping: 12 },
                  rotate: { duration: feedback === 'failure' ? 0.4 : 0 },
                  opacity: { duration: 0.15 },
                }}
                className="relative flex items-center justify-center"
              >
                {/* Outer glow ring */}
                <motion.div
                  className={`absolute rounded-full border-2 ${
                    feedback === 'success'
                      ? 'border-green-400/60'
                      : feedback === 'failure'
                        ? 'border-red-400/60'
                        : 'border-red-500/30'
                  }`}
                  animate={
                    feedback === 'success'
                      ? { scale: [1, 1.8], opacity: [0.8, 0] }
                      : feedback === 'failure'
                        ? { scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }
                        : { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }
                  }
                  transition={
                    feedback === 'success'
                      ? { duration: 0.4, ease: 'easeOut' }
                      : feedback === 'failure'
                        ? { duration: 0.4, repeat: 1 }
                        : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  }
                  style={{
                    width: feedback === 'success' ? '160px' : '140px',
                    height: feedback === 'success' ? '160px' : '140px',
                  }}
                />

                {/* Second glow ring (idle only) */}
                {feedback === 'idle' && (
                  <motion.div
                    className="absolute rounded-full border border-red-500/15"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.3, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    style={{ width: '180px', height: '180px' }}
                  />
                )}

                {/* Arrow icon container */}
                <motion.div
                  className={`relative flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 rounded-full ${
                    feedback === 'success'
                      ? 'bg-green-500/20'
                      : feedback === 'failure'
                        ? 'bg-red-500/25'
                        : 'bg-red-950/40'
                  }`}
                  animate={
                    feedback === 'idle'
                      ? {
                          boxShadow: [
                            '0 0 20px rgba(220,38,38,0.2), inset 0 0 20px rgba(220,38,38,0.05)',
                            '0 0 40px rgba(220,38,38,0.4), inset 0 0 30px rgba(220,38,38,0.1)',
                            '0 0 20px rgba(220,38,38,0.2), inset 0 0 20px rgba(220,38,38,0.05)',
                          ],
                        }
                      : feedback === 'success'
                        ? {
                            boxShadow: [
                              '0 0 30px rgba(34,197,94,0.5), inset 0 0 20px rgba(34,197,94,0.15)',
                              '0 0 60px rgba(34,197,94,0.3), inset 0 0 30px rgba(34,197,94,0.05)',
                            ],
                          }
                        : feedback === 'failure'
                          ? {
                              boxShadow: [
                                '0 0 30px rgba(239,68,68,0.6), inset 0 0 20px rgba(239,68,68,0.2)',
                                '0 0 50px rgba(239,68,68,0.3), inset 0 0 30px rgba(239,68,68,0.05)',
                              ],
                            }
                          : {}
                  }
                  transition={
                    feedback === 'idle'
                      ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                  style={{
                    border: `2px solid ${
                      feedback === 'success'
                        ? 'rgba(34,197,94,0.5)'
                        : feedback === 'failure'
                          ? 'rgba(239,68,68,0.6)'
                          : 'rgba(220,38,38,0.3)'
                    }`,
                  }}
                >
                  <motion.div
                    animate={
                      feedback === 'idle'
                        ? { scale: [1, 1.08, 1] }
                        : feedback === 'success'
                          ? { scale: [1, 0.85, 1], y: [0, -5, 0] }
                          : feedback === 'failure'
                            ? { scale: [1, 1.15, 1] }
                            : {}
                    }
                    transition={
                      feedback === 'idle'
                        ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.25 }
                    }
                    style={{
                      color:
                        feedback === 'success'
                          ? '#4ade80'
                          : feedback === 'failure'
                            ? '#f87171'
                            : '#ef4444',
                      filter:
                        feedback === 'success'
                          ? 'drop-shadow(0 0 12px rgba(34,197,94,0.7))'
                          : feedback === 'failure'
                            ? 'drop-shadow(0 0 12px rgba(239,68,68,0.7))'
                            : 'drop-shadow(0 0 8px rgba(220,38,38,0.5))',
                    }}
                  >
                    {DIRECTION_ICONS[currentDirection]}
                  </motion.div>
                </motion.div>

                {/* Success expanding ring */}
                <AnimatePresence>
                  {feedback === 'success' && (
                    <motion.div
                      className="absolute rounded-full border-2 border-green-400"
                      initial={{ scale: 0.5, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ width: '120px', height: '120px' }}
                    />
                  )}
                </AnimatePresence>

                {/* Failure red flash */}
                <AnimatePresence>
                  {feedback === 'failure' && (
                    <motion.div
                      className="absolute rounded-full bg-red-500/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ width: '160px', height: '160px' }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direction label */}
          {!showResult && currentSeq && (
            <motion.span
              key={`label-${currentDirection}-${qteState.currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              className="text-xs sm:text-sm font-mono tracking-[0.15em] text-white/50"
            >
              {DIRECTION_LABELS[currentDirection]}
            </motion.span>
          )}

          {/* Timer bar */}
          {!showResult && currentSeq && !qteState.isProcessing && !qteState.isComplete && (
            <TimerBar timeRemaining={displayTime} timeLimit={currentSeq.timeLimit} />
          )}

          {/* Processing indicator */}
          {!showResult && qteState.isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-white/40"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-white/30"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              {feedback === 'success' ? 'Corretto!' : 'Sbagliato!'}
            </motion.div>
          )}
        </div>

        {/* ── RESULT DISPLAY ── */}
        <AnimatePresence>
          {showResult && qteState.result !== 'pending' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative z-10 flex flex-col items-center gap-3 mb-8 sm:mb-12"
            >
              <div
                className={`glass-dark rounded-xl px-8 py-6 sm:px-12 sm:py-8 flex flex-col items-center gap-3 ${result.borderColor}`}
                style={{ boxShadow: result.glow, minWidth: '240px' }}
              >
                <motion.span
                  className="text-4xl sm:text-5xl"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  {result.emoji}
                </motion.span>
                <span
                  className="text-2xl sm:text-3xl font-black tracking-wider"
                  style={{
                    color: result.color,
                    textShadow: `0 0 16px ${result.color}60, 0 0 32px ${result.color}30`,
                  }}
                >
                  {result.text}
                </span>
                <span className="text-xs text-white/50 text-center">{result.subtext}</span>

                <div className="flex items-center gap-4 mt-2 text-xs font-mono">
                  <span className="text-green-400">✓ {qteState.successes}</span>
                  <span className="text-red-400">✗ {qteState.failures}</span>
                  <span className="text-white/30">/ {totalSteps}</span>
                </div>
              </div>

              {/* Auto-dismiss bar */}
              <motion.div
                className="w-32 h-1 rounded-full bg-white/10 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-white/20 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 2, ease: 'linear', delay: 0.5 }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BOTTOM: Mobile touch buttons (d-pad + space) ── */}
        {!showResult && !qteState.isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-6 sm:mb-10 lg:hidden"
          >
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div />
              <button
                onClick={() => handleTouchInput('up')}
                disabled={qteState.isProcessing}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg glass-btn flex items-center justify-center text-white/70 active:text-green-400 active:bg-green-500/20 active:border-green-500/40 transition-all disabled:opacity-30 touch-manipulation"
              >
                {DIRECTION_TOUCH_ICONS.up}
              </button>
              <div />

              <button
                onClick={() => handleTouchInput('left')}
                disabled={qteState.isProcessing}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg glass-btn flex items-center justify-center text-white/70 active:text-green-400 active:bg-green-500/20 active:border-green-500/40 transition-all disabled:opacity-30 touch-manipulation"
              >
                {DIRECTION_TOUCH_ICONS.left}
              </button>
              <div className="w-14 h-14 sm:w-16 sm:h-16" />
              <button
                onClick={() => handleTouchInput('right')}
                disabled={qteState.isProcessing}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg glass-btn flex items-center justify-center text-white/70 active:text-green-400 active:bg-green-500/20 active:border-green-500/40 transition-all disabled:opacity-30 touch-manipulation"
              >
                {DIRECTION_TOUCH_ICONS.right}
              </button>

              <div />
              <button
                onClick={() => handleTouchInput('down')}
                disabled={qteState.isProcessing}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg glass-btn flex items-center justify-center text-white/70 active:text-green-400 active:bg-green-500/20 active:border-green-500/40 transition-all disabled:opacity-30 touch-manipulation"
              >
                {DIRECTION_TOUCH_ICONS.down}
              </button>
              <div />
            </div>

            <button
              onClick={() => handleTouchInput('space')}
              disabled={qteState.isProcessing}
              className="mt-1 w-40 sm:w-48 h-10 sm:h-12 rounded-lg glass-btn flex items-center justify-center gap-2 text-white/70 active:text-green-400 active:bg-green-500/20 active:border-green-500/40 transition-all disabled:opacity-30 touch-manipulation"
            >
              {DIRECTION_TOUCH_ICONS.space}
              <span className="text-[10px] sm:text-xs font-mono tracking-wider">SPAZIO</span>
            </button>

            <span className="text-[9px] text-white/25 mt-1 tracking-wider">
              Premi il tasto mostrato sopra
            </span>
          </motion.div>
        )}

        {/* Desktop keyboard hint */}
        {!showResult && !qteState.isComplete && (
          <div className="relative z-10 hidden lg:flex items-center gap-3 mb-8 text-white/20 text-xs font-mono">
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">↓</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">→</kbd>
            <kbd className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">SPACE</kbd>
            <span className="ml-1">per premere</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
