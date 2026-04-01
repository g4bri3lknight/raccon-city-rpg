'use client';

import { motion } from 'framer-motion';
import { StatusEffect } from '@/game/types';

// ── Condition System ──────────────────────────────────────
function getCondition(pct: number, isPoisoned: boolean, isDead: boolean) {
  if (isDead) return { label: 'MORTO', color: '#4b5563', glow: 'none', ecgColor: '#374151' };
  if (isPoisoned) return { label: 'AVVELENATO', color: '#c084fc', glow: '0 0 10px rgba(168,85,247,0.3)', ecgColor: '#a855f7' };
  if (pct > 60) return { label: 'FINE', color: '#4ade80', glow: '0 0 10px rgba(34,197,94,0.25)', ecgColor: '#22c55e' };
  if (pct > 30) return { label: 'CAUTION', color: '#facc15', glow: '0 0 10px rgba(234,179,8,0.25)', ecgColor: '#eab308' };
  return { label: 'DANGER', color: '#f87171', glow: '0 0 12px rgba(239,68,68,0.35)', ecgColor: '#ef4444' };
}

// ── MAIN: Full-height ECG Monitor Panel ───────────────────
export default function HpBar({
  current, max, statusEffects,
}: {
  current: number;
  max: number;
  statusEffects?: StatusEffect[];
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isPoisoned = statusEffects?.includes('poison') || false;
  const isBleeding = statusEffects?.includes('bleeding') || false;
  const isStunned = statusEffects?.includes('stunned') || false;
  const isDead = current <= 0;
  const cond = getCondition(pct, isPoisoned, isDead);
  const ecgSpeed = isDead ? 0 : pct <= 30 ? 1.2 : pct <= 60 ? 1.8 : 2.5;

  return (
    <div
      className="relative w-full h-full rounded overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: cond.glow !== 'none' ? cond.glow : undefined,
        border: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      {/* CRT Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Condition label — top left */}
      <div className="absolute top-1 left-1.5 z-20">
        <span
          className="font-mono font-bold text-[7px] sm:text-[8px] tracking-[0.15em] uppercase"
          style={{ color: cond.color, textShadow: `0 0 6px ${cond.color}` }}
        >
          {cond.label}
        </span>
      </div>

      {/* Status icons — top right */}
      <div className="absolute top-1 right-1.5 z-20">
        {(isPoisoned || isBleeding || isStunned) && !isDead && (
          <span className="flex gap-0.5">
            {isPoisoned && <span className="text-[8px] animate-pulse">☠️</span>}
            {isBleeding && <span className="text-[8px] animate-pulse">🩸</span>}
            {isStunned && <span className="text-[8px] animate-pulse">💫</span>}
          </span>
        )}
      </div>

      {/* ECG Display — fills remaining space */}
      {!isDead ? (
        <div
          className="absolute inset-0 z-[5] overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.4)', marginTop: '16px' }}
        >
          {/* Scrolling ECG pattern — duplicated for seamless loop */}
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: '200%',
              animation: `ecg-scroll ${ecgSpeed}s linear infinite`,
            }}
          >
            <svg
              viewBox="0 0 200 50"
              className="w-full h-full"
              preserveAspectRatio="none"
              style={{ filter: `drop-shadow(0 0 2px ${cond.ecgColor})` }}
            >
              {/* ECG heartbeat path repeated across full width */}
              <path
                d={`
                  M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25
                  L43,25 L47,25 L50,15 L53,35 L56,25 L66,25
                  L76,25 L80,25 L83,15 L86,35 L89,25 L99,25
                  L109,25 L113,25 L116,15 L119,35 L122,25 L132,25
                  L142,25 L146,25 L149,15 L152,35 L155,25 L165,25
                  L175,25 L179,25 L182,15 L185,35 L188,25 L200,25
                `}
                fill="none"
                stroke={cond.ecgColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              {/* Glow layer */}
              <path
                d={`
                  M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25
                  L43,25 L47,25 L50,15 L53,35 L56,25 L66,25
                  L76,25 L80,25 L83,15 L86,35 L89,25 L99,25
                  L109,25 L113,25 L116,15 L119,35 L122,25 L132,25
                  L142,25 L146,25 L149,15 L152,35 L155,25 L165,25
                  L175,25 L179,25 L182,15 L185,35 L188,25 L200,25
                `}
                fill="none"
                stroke={cond.ecgColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.2"
                style={{ filter: 'blur(2px)' }}
              />
            </svg>
          </div>

          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[6]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '10% 25%',
            }}
          />

          {/* Sweeping scan line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] z-[7] pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent, ${cond.ecgColor}44, transparent)`,
              animation: `ecg-scan ${ecgSpeed}s ease-in-out infinite`,
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 z-[5] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', marginTop: '16px' }}
        >
          <div className="text-center">
            <div className="w-16 h-px bg-gray-700 mx-auto" />
            <span className="text-[7px] text-gray-700 font-mono tracking-[0.2em] mt-1 block">FLATLINE</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Combat HP Panel — large readable panel for battle ──────
export function CombatHpPanel({
  current, max, name, statusEffects, isActive, imageSrc,
}: {
  current: number; max: number; name: string;
  statusEffects?: StatusEffect[]; isActive?: boolean; imageSrc?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isPoisoned = statusEffects?.includes('poison') || false;
  const isBleeding = statusEffects?.includes('bleeding') || false;
  const isStunned = statusEffects?.includes('stunned') || false;
  const isDead = current <= 0;
  const cond = getCondition(pct, isPoisoned, isDead);
  const ecgSpeed = isDead ? 0 : pct <= 30 ? 1.2 : pct <= 60 ? 1.8 : 2.5;

  return (
    <div
      className="relative rounded-lg overflow-hidden p-1.5 transition-all"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: isActive ? '0 0 16px rgba(220,38,38,0.3)' : cond.glow !== 'none' ? cond.glow : undefined,
        border: `1.5px solid ${isActive ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 3px)',
      }} />

      <div className="relative z-10">
        {/* Row 1: Portrait + Name + Condition */}
        <div className="flex items-center gap-1.5 mb-1">
          {imageSrc ? (
            <div className={`w-6 h-7 rounded overflow-hidden border shrink-0 ${isActive ? 'border-red-500/60' : 'border-gray-600/40'} ${isDead ? 'grayscale opacity-30' : ''}`}>
              <img src={imageSrc} alt={name} className="w-full h-full object-cover object-[center_15%]" />
            </div>
          ) : (
            <div className={`w-6 h-7 rounded flex items-center justify-center text-xs shrink-0 border ${isDead ? 'grayscale opacity-30 border-gray-800/30' : isActive ? 'border-red-500/60 bg-red-950/30' : 'border-gray-600/40 bg-gray-900/50'}`}>
              ?
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-bold truncate ${isDead ? 'text-gray-600' : isActive ? 'text-red-300' : 'text-gray-200'}`}>
                {name}
              </span>
              {/* Status icons */}
              {(isPoisoned || isBleeding || isStunned) && !isDead && (
                <span className="flex gap-px shrink-0">
                  {isPoisoned && <span className="text-[8px] animate-pulse">☠️</span>}
                  {isBleeding && <span className="text-[8px] animate-pulse">🩸</span>}
                  {isStunned && <span className="text-[8px] animate-pulse">💫</span>}
                </span>
              )}
            </div>
          </div>
          {/* Condition badge */}
          <span className="font-mono font-bold text-[7px] tracking-[0.12em] uppercase shrink-0 px-1 py-0.5 rounded"
            style={{
              color: cond.color,
              textShadow: `0 0 6px ${cond.color}`,
              background: `${cond.color}15`,
              border: `1px solid ${cond.color}33`,
            }}>
            {cond.label}
          </span>
        </div>

        {/* Row 2: HP number + ECG */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-extrabold text-sm tabular-nums leading-none"
            style={{ color: cond.color, textShadow: `0 0 8px ${cond.color}66` }}>
            {current}
          </span>
          <span className="font-mono text-[10px] text-gray-600 leading-none">/</span>
          <span className="font-mono text-[10px] text-gray-500 leading-none">{max}</span>
          <span className="font-mono text-[8px] text-gray-600">HP</span>
          {/* ECG strip — small */}
          {!isDead ? (
            <div className="relative flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="absolute top-0 left-0 h-full" style={{ width: '200%', animation: `ecg-scroll ${ecgSpeed}s linear infinite` }}>
                <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 2px ${cond.ecgColor})` }}>
                  <path d="M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25 L43,25 L47,25 L50,15 L53,35 L56,25 L66,25 L76,25 L80,25 L83,15 L86,35 L89,25 L99,25 L109,25 L113,25 L116,15 L119,35 L122,25 L132,25 L142,25 L146,25 L149,15 L152,35 L155,25 L165,25 L175,25 L179,25 L182,15 L185,35 L188,25 L200,25"
                    fill="none" stroke={cond.ecgColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 h-5 rounded-sm flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <span className="text-[7px] text-gray-700 font-mono tracking-[0.2em]">—</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Enemy HP Panel ─────────────────────────────────────────
export function EnemyHpBar({ current, max, name, icon, isBoss, imageSrc }: {
  current: number; max: number; name: string; icon: string; isBoss?: boolean; imageSrc?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isDead = current <= 0;
  const cond = getCondition(pct, false, isDead);
  const ecgSpeed = isDead ? 0 : pct <= 30 ? 1.2 : 1.8;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative rounded overflow-hidden p-1.5"
      style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: isBoss ? '0 0 12px rgba(239,68,68,0.2)' : cond.glow !== 'none' ? cond.glow : undefined,
        border: `1px solid ${isBoss ? 'rgba(239,68,38,0.2)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div className="relative z-10 flex items-center gap-2">
        {imageSrc ? (
          <div className={`w-10 h-12 rounded overflow-hidden border shrink-0 ${isBoss ? 'border-red-600/40' : 'border-gray-600/30'} ${isDead ? 'grayscale opacity-30' : ''}`}>
            <img src={imageSrc} alt={name} className="w-full h-full object-cover object-[center_15%]" />
          </div>
        ) : (
          <div className={`text-xl w-10 h-12 flex items-center justify-center rounded shrink-0 ${isBoss ? 'bg-red-950/30' : 'bg-gray-900/40'} ${isDead ? 'grayscale opacity-30' : ''}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[10px] font-bold truncate ${isDead ? 'text-gray-600' : isBoss ? 'text-red-300' : 'text-gray-300'}`}>
              {name}
            </span>
            {isBoss && <span className="text-[7px] bg-red-900/50 text-red-300 px-1 py-0.5 rounded font-bold tracking-wider shrink-0">BOSS</span>}
            {!isDead && (
              <span className="text-[7px] font-mono font-bold tracking-[0.1em] uppercase shrink-0 ml-auto"
                style={{ color: cond.color, textShadow: `0 0 4px ${cond.color}` }}>
                {cond.label}
              </span>
            )}
          </div>
          {!isDead ? (
            <div className="relative w-full h-8 rounded-sm overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="absolute top-0 left-0 h-full" style={{ width: '200%', animation: `ecg-scroll ${ecgSpeed}s linear infinite` }}>
                <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 2px ${cond.ecgColor})` }}>
                  <path
                    d="M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25 L43,25 L47,25 L50,15 L53,35 L56,25 L66,25 L76,25 L80,25 L83,15 L86,35 L89,25 L99,25 L109,25 L113,25 L116,15 L119,35 L122,25 L132,25 L142,25 L146,25 L149,15 L152,35 L155,25 L165,25 L175,25 L179,25 L182,15 L185,35 L188,25 L200,25"
                    fill="none" stroke={cond.ecgColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
                  />
                  <path
                    d="M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25 L43,25 L47,25 L50,15 L53,35 L56,25 L66,25 L76,25 L80,25 L83,15 L86,35 L89,25 L99,25 L109,25 L113,25 L116,15 L119,35 L122,25 L132,25 L142,25 L146,25 L149,15 L152,35 L155,25 L165,25 L175,25 L179,25 L182,15 L185,35 L188,25 L200,25"
                    fill="none" stroke={cond.ecgColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" style={{ filter: 'blur(2px)' }}
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div className="w-full h-8 rounded-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="h-px bg-gray-800 mt-4" />
            </div>
          )}
          <div className="text-right mt-0.5">
            <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: cond.color }}>
              {current}/{max}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Compact HP Panel — horizontal layout: condition + HP + ECG ────
export function CompactHpPanel({
  current, max, statusEffects,
}: {
  current: number; max: number; statusEffects?: StatusEffect[];
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isPoisoned = statusEffects?.includes('poison') || false;
  const isBleeding = statusEffects?.includes('bleeding') || false;
  const isStunned = statusEffects?.includes('stunned') || false;
  const isDead = current <= 0;
  const cond = getCondition(pct, isPoisoned, isDead);
  const ecgSpeed = isDead ? 0 : pct <= 30 ? 1.2 : pct <= 60 ? 1.8 : 2.5;

  return (
    <div
      className="relative w-full h-full rounded-md overflow-hidden flex items-stretch"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: cond.glow !== 'none' ? cond.glow : undefined,
        border: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Left: Condition + HP numbers */}
      <div className="relative z-10 shrink-0 flex flex-col justify-center px-2 py-1">
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className="font-mono font-bold text-[6px] sm:text-[7px] tracking-[0.12em] uppercase"
            style={{ color: cond.color, textShadow: `0 0 6px ${cond.color}` }}
          >
            {cond.label}
          </span>
          {(isPoisoned || isBleeding || isStunned) && !isDead && (
            <span className="flex gap-px">
              {isPoisoned && <span className="text-[7px] animate-pulse leading-none">☠️</span>}
              {isBleeding && <span className="text-[7px] animate-pulse leading-none">🩸</span>}
              {isStunned && <span className="text-[7px] animate-pulse leading-none">💫</span>}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-px">
          <span
            className="font-mono font-extrabold text-sm sm:text-base tabular-nums leading-none"
            style={{ color: cond.color, textShadow: `0 0 8px ${cond.color}66` }}
          >
            {current}
          </span>
          <span className="font-mono text-[9px] text-gray-600 leading-none">/</span>
          <span className="font-mono font-bold text-[9px] sm:text-[10px] text-gray-500 leading-none">{max}</span>
        </div>
      </div>

      {/* Right: ECG strip */}
      {!isDead ? (
        <div className="relative flex-1 min-w-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="absolute top-0 left-0 h-full" style={{ width: '200%', animation: `ecg-scroll ${ecgSpeed}s linear infinite` }}>
            <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 2px ${cond.ecgColor})` }}>
              <path d="M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25 L43,25 L47,25 L50,15 L53,35 L56,25 L66,25 L76,25 L80,25 L83,15 L86,35 L89,25 L99,25 L109,25 L113,25 L116,15 L119,35 L122,25 L132,25 L142,25 L146,25 L149,15 L152,35 L155,25 L165,25 L175,25 L179,25 L182,15 L185,35 L188,25 L200,25"
                fill="none" stroke={cond.ecgColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              <path d="M0,25 L10,25 L14,25 L17,15 L20,35 L23,25 L33,25 L43,25 L47,25 L50,15 L53,35 L56,25 L66,25 L76,25 L80,25 L83,15 L86,35 L89,25 L99,25 L109,25 L113,25 L116,15 L119,35 L122,25 L132,25 L142,25 L146,25 L149,15 L152,35 L155,25 L165,25 L175,25 L179,25 L182,15 L185,35 L188,25 L200,25"
                fill="none" stroke={cond.ecgColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" style={{ filter: 'blur(2px)' }} />
            </svg>
          </div>
          {/* Grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '10% 25%',
          }} />
        </div>
      ) : (
        <div className="relative flex-1 min-w-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <span className="text-[6px] text-gray-700 font-mono tracking-[0.2em]">—</span>
        </div>
      )}
    </div>
  );
}
