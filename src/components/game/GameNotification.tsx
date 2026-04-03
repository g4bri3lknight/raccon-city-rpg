'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { audio } from '@/game/engine/sounds';

// ── Theme config per notification type ──
const THEMES = {
  encounter: {
    overlay: 'radial-gradient(ellipse at center, rgba(180,20,20,0.5) 0%, rgba(10,0,0,0.85) 100%)',
    card: 'rgba(60,5,5,0.96)',
    border: 'rgba(200,30,30,0.7)',
    shadow: '0 0 60px rgba(200,30,30,0.5), 0 0 120px rgba(127,29,29,0.2), inset 0 0 30px rgba(200,30,30,0.1)',
    scanline: 'linear-gradient(90deg, transparent, rgba(255,60,60,0.9), transparent)',
    titleColor: '#fca5a5',
    titleGlow: '0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(220,38,38,0.3)',
    label: '⚠ INCONTRO ⚠',
    shake: true,
  },
  victory: {
    overlay: 'radial-gradient(ellipse at center, rgba(60,40,30,0.35) 0%, rgba(5,0,0,0.85) 100%)',
    card: 'rgba(25,12,8,0.96)',
    border: 'rgba(120,80,40,0.5)',
    shadow: '0 0 60px rgba(100,60,20,0.3), 0 0 120px rgba(60,30,10,0.15), inset 0 0 30px rgba(100,60,20,0.08)',
    scanline: 'linear-gradient(90deg, transparent, rgba(180,140,80,0.5), transparent)',
    titleColor: '#c9a06a',
    titleGlow: '0 0 20px rgba(160,120,60,0.5), 0 0 40px rgba(100,60,20,0.2)',
    label: null,
    shake: false,
  },
  defeat: {
    overlay: 'radial-gradient(ellipse at center, rgba(100,10,10,0.6) 0%, rgba(0,0,0,0.92) 100%)',
    card: 'rgba(20,5,5,0.97)',
    border: 'rgba(127,29,29,0.5)',
    shadow: '0 0 60px rgba(127,29,29,0.5), 0 0 120px rgba(80,10,10,0.2), inset 0 0 40px rgba(127,29,29,0.15)',
    scanline: 'linear-gradient(90deg, transparent, rgba(180,20,20,0.7), transparent)',
    titleColor: '#7f1d1d',
    titleGlow: '0 0 30px rgba(220,38,38,0.6), 0 0 60px rgba(127,29,29,0.3)',
    label: null,
    shake: true,
  },
  item_found: {
    overlay: 'radial-gradient(ellipse at center, rgba(30,80,60,0.35) 0%, rgba(0,5,5,0.75) 100%)',
    card: 'rgba(10,40,30,0.96)',
    border: 'rgba(34,197,94,0.5)',
    shadow: '0 0 40px rgba(34,197,94,0.3), 0 0 80px rgba(34,197,94,0.1), inset 0 0 20px rgba(34,197,94,0.08)',
    scanline: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6), transparent)',
    titleColor: '#86efac',
    titleGlow: '0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2)',
    label: 'TROVATO',
    shake: false,
  },
  bag_expand: {
    overlay: 'radial-gradient(ellipse at center, rgba(20,60,80,0.35) 0%, rgba(0,5,10,0.7) 100%)',
    card: 'rgba(10,30,45,0.96)',
    border: 'rgba(34,211,238,0.45)',
    shadow: '0 0 35px rgba(34,211,238,0.3), 0 0 70px rgba(34,211,238,0.1)',
    scanline: 'linear-gradient(90deg, transparent, rgba(103,232,249,0.6), transparent)',
    titleColor: '#67e8f9',
    titleGlow: '0 0 18px rgba(34,211,238,0.5)',
    label: null,
    shake: false,
  },
  collectible_found: {
    overlay: 'radial-gradient(ellipse at center, rgba(100,60,120,0.4) 0%, rgba(5,0,10,0.85) 100%)',
    card: 'rgba(30,15,40,0.96)',
    border: 'rgba(168,85,247,0.5)',
    shadow: '0 0 50px rgba(168,85,247,0.4), 0 0 100px rgba(126,34,206,0.2), inset 0 0 25px rgba(168,85,247,0.1)',
    scanline: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.7), transparent)',
    titleColor: '#d8b4fe',
    titleGlow: '0 0 25px rgba(168,85,247,0.6), 0 0 50px rgba(126,34,206,0.3)',
    label: '🎀 COLLEZIONABILE',
    shake: false,
  },
} as const;

type NotifType = keyof typeof THEMES;
const defaultTheme = THEMES.bag_expand;

function getTheme(type: string) {
  return THEMES[type as NotifType] || defaultTheme;
}

function getDuration(type: string): number {
  switch (type) {
    case 'encounter': return 2200;
    case 'victory': return 3200;
    case 'defeat': return 3200;
    case 'item_found': return 2000;
    case 'collectible_found': return 2500;
    default: return 2500;
  }
}

export default function GameNotification() {
  const notification = useGameStore(s => s.notification);
  const [state, setState] = useState<{ visible: boolean; key: number; clearing: boolean }>({ visible: false, key: 0, clearing: false });

  // Play sound on new notification
  const playSound = useCallback((type: string) => {
    try {
      switch (type) {
        case 'encounter': audio.playEncounter(); break;
        case 'victory': audio.playVictory(); break;
        case 'defeat': audio.playDefeat(); break;
        case 'item_found': audio.playItemPickup(); break;
        case 'bag_expand': audio.playItemPickup(); break;
        case 'collectible_found': audio.playItemPickup(); break;
      }
    } catch { /* audio not available */ }
  }, []);

  // Detect new notification
  if (notification && !state.visible && !state.clearing) {
    const newKey = state.key + 1;
    setState({ visible: true, key: newKey, clearing: false });
    playSound(notification.type);
    const duration = getDuration(notification.type);

    setTimeout(() => setState(prev => ({ ...prev, visible: false })), duration);
    setTimeout(() => {
      setState(prev => ({ ...prev, clearing: false }));
      const current = useGameStore.getState();
      if (current.notification?.id === notification.id) {
        useGameStore.setState({ notification: null });
      }
    }, duration + 400);
  }

  if (!state.visible || !notification) return null;

  const theme = getTheme(notification.type);
  const isVictory = notification.type === 'victory';
  const isDefeat = notification.type === 'defeat';
  const isEncounter = notification.type === 'encounter';
  const isItem = notification.type === 'item_found';

  return (
    <AnimatePresence>
      <motion.div
        key={state.key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
      >
        {/* Background overlay with optional screen shake */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVictory
            ? { opacity: [0, 0.5, 0.3, 0.15] }
            : isDefeat
            ? { opacity: [0, 0.8, 0.5, 0.6] }
            : { opacity: [0, 0.6, 0] }
          }
          transition={{
            duration: isVictory || isDefeat ? 1.5 : 0.8,
            times: isVictory || isDefeat ? [0, 0.05, 0.3, 1] : [0, 0.1, 1],
          }}
          className={`absolute inset-0 ${theme.shake ? (isDefeat ? 'defeat-shake' : 'screen-shake') : ''}`}
          style={{ background: theme.overlay }}
        />

        {/* CRT scan line sweep */}
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: '200%' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-x-0 h-[2px]"
          style={{ background: theme.scanline }}
        />

        {/* Victory: subtle ember particles instead of golden shower */}
        {isVictory && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: '60%', x: `${20 + Math.random() * 60}%`, scale: 0.2 }}
                animate={{
                  opacity: [0, 0.5, 0.3, 0],
                  y: `${20 + Math.random() * 30}%`,
                  x: `${15 + Math.random() * 70}%`,
                  scale: [0.2, 0.4 + Math.random() * 0.3, 0.1],
                }}
                transition={{ duration: 2.5 + Math.random() * 1.5, delay: Math.random() * 0.8, ease: 'easeOut' }}
                className="absolute"
                style={{
                  width: `${3 + Math.random() * 5}px`,
                  height: `${3 + Math.random() * 5}px`,
                  background: i % 3 === 0
                    ? 'radial-gradient(circle, rgba(160,120,60,0.7), transparent)'
                    : i % 3 === 1
                    ? 'radial-gradient(circle, rgba(180,80,40,0.5), transparent)'
                    : 'radial-gradient(circle, rgba(140,100,50,0.4), transparent)',
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>
        )}

        {/* Defeat: blood drip streaks */}
        {isDefeat && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: [0, 0.5, 0.35, 0],
                  height: ['0px', `${30 + Math.random() * 60}px`, `${50 + Math.random() * 90}px`, `${70 + Math.random() * 110}px`],
                }}
                transition={{ duration: 3, delay: Math.random() * 1, ease: 'easeOut' }}
                className="absolute"
                style={{
                  left: `${3 + (i * 10)}%`,
                  top: 0,
                  width: '2px',
                  background: 'linear-gradient(to bottom, rgba(127,29,29,0.8), rgba(180,20,20,0.3), transparent)',
                }}
              />
            ))}
          </div>
        )}

        {/* Encounter: warning flash borders */}
        {isEncounter && (
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              animate={{ opacity: [0, 0.6, 0, 0.4, 0] }}
              transition={{ duration: 1.2, times: [0, 0.1, 0.3, 0.6, 1] }}
              className="absolute inset-0"
              style={{ border: '3px solid rgba(220,38,38,0.5)', borderRadius: '4px' }}
            />
          </div>
        )}

        {/* Defeat: pulsing vignette */}
        {isDefeat && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)' }}
          />
        )}

        {/* Victory: subtle warm rim */}
        {isVictory && (
          <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(100,60,20,0.1) 100%)' }}
          />
        )}

        {/* Item found: sparkle particles */}
        {isItem && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0, 1.2, 0.5],
                  x: `${25 + Math.random() * 50}%`,
                  y: `${25 + Math.random() * 50}%`,
                }}
                transition={{ duration: 1 + Math.random() * 0.5, delay: Math.random() * 0.5 }}
                className="absolute"
                style={{
                  width: `${3 + Math.random() * 5}px`,
                  height: `${3 + Math.random() * 5}px`,
                  background: 'radial-gradient(circle, rgba(74,222,128,0.8), transparent)',
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>
        )}

        {/* ═══ Main notification card ═══ */}
        <motion.div
          initial={isVictory
            ? { scale: 0.3, opacity: 0, rotate: -10 }
            : isDefeat
            ? { scale: 1.3, opacity: 0 }
            : { scale: 0.5, opacity: 0, y: 20 }
          }
          animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
          exit={isDefeat ? { scale: 0.8, opacity: 0, y: 20 } : { scale: 0.8, opacity: 0, y: -10 }}
          transition={isVictory
            ? { type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }
            : isDefeat
            ? { duration: 0.6, ease: 'easeOut' }
            : { type: 'spring', damping: 15, stiffness: 300 }
          }
          className="relative pointer-events-auto"
        >
          <div
            className="px-6 sm:px-10 py-4 sm:py-6 rounded-xl border backdrop-blur-md text-center"
            style={{
              background: theme.card,
              borderColor: theme.border,
              boxShadow: theme.shadow,
              minWidth: isVictory || isDefeat ? '280px' : undefined,
              fontFamily: "'Courier New', monospace",
            }}
          >
            {/* Icon */}
            <motion.div
              initial={isVictory ? { scale: 0, rotate: -360 } : isDefeat ? { scale: 0, y: -30 } : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ delay: 0.15, type: isVictory ? 'spring' : 'tween', damping: isVictory ? 8 : undefined, duration: isVictory ? undefined : 0.5 }}
              className="text-3xl sm:text-5xl mb-1"
            >
              {notification.icon || '✨'}
            </motion.div>

            {/* Category label (e.g. "TROVATO" for items) */}
            {theme.label && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] mb-1"
                style={{ color: theme.titleColor, opacity: 0.7 }}
              >
                {theme.label}
              </motion.div>
            )}

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`font-black tracking-wider uppercase ${isVictory ? 'text-xl sm:text-2xl' : isDefeat ? 'text-lg sm:text-xl' : 'text-sm sm:text-lg'}`}
              style={{
                color: theme.titleColor,
                textShadow: theme.titleGlow,
                fontFamily: isDefeat ? 'serif' : "'Courier New', monospace",
              }}
            >
              {theme.label ? notification.message : notification.message}
            </motion.div>

            {/* Sub message */}
            {notification.subMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className={`text-xs sm:text-sm mt-1.5 ${isDefeat ? 'text-gray-500 italic' : 'text-gray-300'}`}
              >
                {notification.subMessage}
              </motion.div>
            )}

            {/* ── Victory: Loot ── */}
            {isVictory && notification.lootNames && notification.lootNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-2.5 pt-2.5 border-t border-amber-700/30"
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Bottino</div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {notification.lootNames.map((name, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.12, type: 'spring', damping: 12 }}
                      className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/30 text-gray-400"
                    >
                      {name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Victory: Level ups ── */}
            {isVictory && notification.levelUps && notification.levelUps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="mt-1.5"
              >
                {notification.levelUps.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + i * 0.2 }}
                    className="text-[11px] sm:text-xs text-cyan-300 font-semibold"
                  >
                    {msg}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ── Item found: rarity color ── */}
            {isItem && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                className="mt-2 mx-auto w-16 h-px"
                style={{ background: theme.scanline }}
              />
            )}

            {/* ── Defeat: fade line ── */}
            {isDefeat && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
                className="mt-3 mx-auto w-20 h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
