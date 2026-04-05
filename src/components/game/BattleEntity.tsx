'use client';

import { useMemo } from 'react';

type EntityState = 'idle' | 'damage' | 'heal' | 'defend' | 'dead' | 'active';

interface BattleEntityProps {
  imageSrc: string;
  name: string;
  state: EntityState;
  isEnemy?: boolean;
  isBoss?: boolean;
  size?: 'sm' | 'md' | 'lg';
  damageValue?: number;
  healValue?: number;
  statusEffects?: string[];
  isCritical?: boolean;
  isMiss?: boolean;
  isPhaseTransition?: boolean;
}

export default function BattleEntity({
  imageSrc,
  name,
  state,
  isEnemy = false,
  isBoss = false,
  size = 'md',
  damageValue,
  healValue,
  statusEffects = [],
  isCritical = false,
  isMiss = false,
  isPhaseTransition = false,
}: BattleEntityProps) {
  const sizeClasses = {
    sm: 'w-16 h-16 sm:w-20 sm:h-20',
    md: 'w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
    lg: 'w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32',
  };

  const isDead = state === 'dead';
  const isHurt = state === 'damage';
  const isHealing = state === 'heal';
  const isDefending = state === 'defend';
  const isActive = state === 'active';

  // Determine additional animation class for special states
  const specialAnimClass = isPhaseTransition
    ? 'animate-boss-enrage'
    : isCritical && isHurt
      ? 'animate-critical-impact'
      : isMiss
        ? 'animate-dodge'
        : '';

  const hasBleeding = statusEffects.includes('bleeding');
  const hasPoison = statusEffects.includes('poison');

  const borderClass = isDead
    ? 'border-gray-700/30'
    : isHurt
    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
    : isHealing
    ? 'border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
    : isDefending
    ? 'border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
    : isActive
    ? 'border-red-400/70 shadow-[0_0_18px_rgba(248,113,113,0.4)]'
    : isBoss
    ? 'border-red-600/50 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
    : 'border-gray-600/40';

  const idleClass = !isDead && !isHurt
    ? isEnemy
      ? 'entity-enemy-idle'
      : 'entity-player-idle'
    : '';

  const particles = useMemo(() =>
    [...Array(6)].map((_, i) => ({
      id: i,
      left: 10 + Math.random() * 80,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 3,
      size: 2 + Math.random() * 3,
    })), []);

  const burstParticles = useMemo(() =>
    [...Array(5)].map((_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 50,
      ty: -15 - Math.random() * 35,
      delay: i * 0.08,
    })), []);

  const healParticles = useMemo(() =>
    [...Array(4)].map((_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 30,
      ty: -20 - Math.random() * 25,
      delay: i * 0.1,
    })), []);

  // Blood drip particles for bleeding
  const bloodDrips = useMemo(() =>
    [...Array(4)].map((_, i) => ({
      id: i,
      left: 5 + Math.random() * 25,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
      width: 1.5 + Math.random() * 1.5,
    })), []);

  // Poison bubbles
  const poisonBubbles = useMemo(() =>
    [...Array(5)].map((_, i) => ({
      id: i,
      left: 15 + Math.random() * 70,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 2,
      size: 3 + Math.random() * 4,
    })), []);

  return (
    <div className="relative flex flex-col items-center">
      {/* Active turn indicator */}
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
        </div>
      )}

      {/* Boss badge */}
      {isBoss && !isDead && (
        <div className="absolute -top-2.5 -right-1 z-30 text-[7px] bg-red-700 text-white px-1.5 py-0.5 rounded font-bold tracking-wider shadow-lg border border-red-500/50">
          BOSS
        </div>
      )}

      {/* Entity container */}
      <div className="relative">
        {/* Ground shadow */}
        {!isDead && (
          <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 ${isBoss ? 'w-16 h-3' : 'w-12 h-2'} rounded-full ${isEnemy ? 'shadow-enemy' : 'shadow-player'}`} />
        )}

        {/* Ambient floating particles */}
        {!isDead && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {particles.map(p => (
              <div
                key={p.id}
                className={`absolute rounded-full ${isEnemy ? 'ambient-particle-red' : 'ambient-particle-blue'}`}
                style={{
                  left: `${p.left}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Defend shield ring */}
        {isDefending && (
          <div className="absolute -inset-3 z-20 rounded-2xl defend-ring pointer-events-none" />
        )}

        {/* Heal glow overlay */}
        {isHealing && (
          <div className="absolute -inset-2 z-20 heal-effect rounded-2xl pointer-events-none" />
        )}

        {/* Damage flash overlay */}
        {isHurt && (
          <div className="absolute inset-0 z-20 rounded-xl bg-red-500/40 damage-flash pointer-events-none" />
        )}

        {/* Main portrait */}
        <div
          className={`
            relative rounded-xl overflow-hidden border-2 transition-all duration-300
            ${borderClass}
            ${idleClass}
            ${isDead ? 'entity-dead grayscale opacity-30' : ''}
            ${isHurt && !isCritical ? 'entity-shake' : ''}
            ${isDefending ? 'defend-pulse' : ''}
            ${specialAnimClass}
          `}
        >
          <img
            src={imageSrc}
            alt={name}
            className={`w-full h-full object-cover object-[center_15%] ${isDead ? 'grayscale' : ''}`}
            draggable={false}
          />

          {/* Inner vignette for depth */}
          <div className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}
          />

          {/* ── BLEEDING EFFECT: blood drips on left side + red pulse ── */}
          {hasBleeding && !isDead && (
            <>
              {/* Red pulsing overlay */}
              <div className="absolute inset-0 rounded-xl pointer-events-none bleeding-overlay" />
              {/* Blood streak on left side */}
              <div className="absolute left-0 top-0 bottom-0 w-[6px] rounded-l-xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-700/80 to-red-900 blood-streak" />
              </div>
              {/* Blood drip particles */}
              {bloodDrips.map(d => (
                <div
                  key={`blood-${d.id}`}
                  className="absolute blood-drip pointer-events-none rounded-full bg-red-700"
                  style={{
                    left: `${d.left}%`,
                    width: `${d.width}px`,
                    animationDelay: `${d.delay}s`,
                    animationDuration: `${d.duration}s`,
                  }}
                />
              ))}
            </>
          )}

          {/* ── POISON EFFECT: green tint + floating bubbles ── */}
          {hasPoison && !isDead && (
            <>
              {/* Green sickly overlay */}
              <div className="absolute inset-0 rounded-xl pointer-events-none poison-overlay" />
              {/* Poison bubbles */}
              {poisonBubbles.map(b => (
                <div
                  key={`poison-${b.id}`}
                  className="absolute poison-bubble pointer-events-none rounded-full border border-green-400/60 bg-green-500/20"
                  style={{
                    left: `${b.left}%`,
                    width: `${b.size}px`,
                    height: `${b.size}px`,
                    animationDelay: `${b.delay}s`,
                    animationDuration: `${b.duration}s`,
                  }}
                />
              ))}
            </>
          )}

          {/* Subtle breathing highlight */}
          {!isDead && (
            <div className="absolute inset-0 rounded-xl pointer-events-none entity-highlight" />
          )}
        </div>

        {/* Damage number + burst particles */}
        {isHurt && damageValue != null && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
            <div className="damage-number whitespace-nowrap">
              <span className="text-sm sm:text-lg font-black text-red-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                -{damageValue}
              </span>
            </div>
            {burstParticles.map(p => (
              <div
                key={p.id}
                className="burst-particle bg-red-400"
                style={{
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Heal number + particles */}
        {isHealing && healValue != null && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
            <div className="heal-number whitespace-nowrap">
              <span className="text-sm sm:text-lg font-black text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                +{healValue}
              </span>
            </div>
            {healParticles.map(p => (
              <div
                key={p.id}
                className="burst-particle bg-green-400"
                style={{
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Boss menacing aura */}
        {isBoss && !isDead && (
          <div className="absolute -inset-2 rounded-2xl boss-aura pointer-events-none" />
        )}
      </div>

      {/* Name label */}
      <span className={`
        text-[9px] sm:text-[10px] font-bold mt-1.5 text-center leading-tight
        ${isDead ? 'text-gray-700' : isBoss ? 'text-red-300' : isActive ? 'text-red-300' : isEnemy ? 'text-gray-400' : 'text-gray-300'}
      `}>
        {name}
      </span>
    </div>
  );
}
