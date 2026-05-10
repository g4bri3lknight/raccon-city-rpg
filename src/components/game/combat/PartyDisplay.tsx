'use client';

import { Heart } from 'lucide-react';
import { CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import { getWeaponAmmoType, getEffectiveAtk, getEffectiveDef, getEffectiveSpd } from '@/game/engine/combat';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import EffectIndicators from './EffectIndicators';
import CombatParticles from './CombatParticles';
import type { Character } from '@/game/types';
import type { PartyDisplayProps } from './types';

export default function PartyDisplay({
  party,
  currentActorId,
  isPlayerTurn,
  targetingMode,
  dataVersion,
  onAllyClick,
  getAnimForTarget,
  activeEffects,
  statusDurations,
  floatNumbers,
  healTargetId,
}: PartyDisplayProps) {
  return (
    <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 lg:gap-14 px-3 py-1 min-h-0">
      {party.map((char: Character, idx: number) => {
        const isActive = char.id === currentActorId && isPlayerTurn;
        const anim = getAnimForTarget(char.id, char.name);
        const isHurt = anim?.type === 'damage';
        const isMissAnim = anim?.type === 'miss';
        const isCrit = !!anim?.isCritical;
        const isHealing = anim?.type === 'heal';
        const isDead = char.currentHp <= 0;
        const isTargetable = targetingMode === 'ally' && !isDead;
        const pct = Math.min(100, char.maxHp > 0 ? (char.currentHp / char.maxHp) * 100 : 0);
        const isPoisoned = char.statusEffects?.includes('poison') || false;
        const isBleeding = char.statusEffects?.includes('bleeding') || false;
        const isStunned = char.statusEffects?.includes('stunned') || false;
        const isAdrenaline = char.statusEffects?.includes('adrenaline') || false;
        const animClass = isMissAnim ? 'animate-dodge' : isHurt ? (isCrit ? 'animate-critical-impact' : 'entity-shake') : !isDead ? 'entity-player-idle' : 'entity-dead';
        const isHealed = healTargetId === char.id;
        const borderColor = isTargetable
          ? 'border-green-400 shadow-[0_0_18px_rgba(74,222,128,0.5)] ring-1 ring-green-400/40'
          : isHurt
          ? 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
          : isHealed ? 'border-green-400/50' : isDead ? 'border-gray-700/30' : isActive ? 'border-yellow-400/70 shadow-[0_0_12px_rgba(250,204,21,0.4)]' : 'border-gray-600/40';

        // Compute stat breakdown for tooltip
        const effAtk = char.weapon ? getEffectiveAtk(char) : char.baseAtk;
        const effDef = char.weapon ? getEffectiveDef(char) : char.baseDef;
        const effSpd = char.weapon ? getEffectiveSpd(char) : char.baseSpd;

        return (
          <div
            key={char.id}
            onClick={() => {
              if (isTargetable) {
                onAllyClick(char.id);
              }
            }}
            className={`relative flex flex-col items-center gap-0.5 ${animClass} ${isDead ? 'grayscale opacity-30' : ''} ${isHealed ? 'anim-heal-pulse' : ''} ${isHurt && !isCrit && anim.value && anim.value > 30 ? 'anim-vibrate-light' : ''} ${isHurt && !isCrit && anim.value && anim.value > 60 ? 'anim-vibrate-heavy' : ''} transition-all duration-150 ${
              isTargetable ? 'cursor-crosshair scale-105 hover:scale-110' : ''
            }`}
          >
            {isHurt && !isCrit && <div className="absolute -inset-1 rounded-lg bg-red-500/25 damage-flash pointer-events-none" />}
            {isCrit && isHurt && <div className="absolute -inset-1 rounded-lg bg-orange-500/35 damage-flash pointer-events-none" />}
            {isMissAnim && <div className="absolute -inset-1 rounded-lg bg-yellow-500/15 pointer-events-none animate-dodge" />}
            {isHealing && <div className="absolute -inset-1 rounded-lg bg-green-500/20 heal-effect pointer-events-none" />}
            {isHealed && <div className="absolute -inset-0 rounded-lg animate-player-heal-green pointer-events-none z-30" />}
            {/* Keyboard shortcut badge for ally targeting (alive-only index) */}
            {isTargetable && (() => {
              const aliveIdx = party.filter((c, i) => i <= idx && c.currentHp > 0).length - 1;
              return (
                <span className="absolute -top-2 -left-1 z-30 bg-green-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                  {aliveIdx + 1}
                </span>
              );
            })()}

            {/* Tooltip wrapper for character card */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-56 lg:h-56 rounded-lg overflow-hidden border-2 shrink-0 relative ${borderColor} ${isAdrenaline && !isDead ? 'adrenaline-border' : ''}`}>
                  <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt="" className="w-full h-full object-cover object-[center_15%]" draggable={false} />
                  {/* ── BLEEDING VISUAL: blood drips on left + red pulse ── */}
                  {isBleeding && !isDead && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none bleeding-overlay" />
                      <div className="absolute left-0 top-0 bottom-0 w-[5px] overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/90 to-red-950 blood-streak" />
                      </div>
                      {[
                        { w: 8, h: 14, left: 5, delay: 0, dur: 2.2 },
                        { w: 10, h: 16, left: 12, delay: 0.9, dur: 2.6 },
                        { w: 7, h: 12, left: 8, delay: 1.6, dur: 2.0 },
                      ].map((drop, bi) => (
                        <div
                          key={`bd-${bi}`}
                          className="absolute blood-drip pointer-events-none"
                          style={{
                            left: `${drop.left}%`,
                            width: `${drop.w}px`,
                            height: `${drop.h}px`,
                            animationDelay: `${drop.delay}s`,
                            animationDuration: `${drop.dur}s`,
                          }}
                        >
                          <svg viewBox="0 0 10 16" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <radialGradient id={`bdrop-combat-${bi}`} cx="40%" cy="55%" r="55%">
                                <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.95" />
                                <stop offset="50%" stopColor="#7f1d1d" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#450a0a" stopOpacity="0.65" />
                              </radialGradient>
                              <radialGradient id={`bshine-combat-${bi}`} cx="35%" cy="30%" r="30%">
                                <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            <path
                              d="M5 0.5 C6.8 3.8, 9.2 7.5, 9.2 10.2 C9.2 13, 7.4 15.5, 5 15.5 C2.6 15.5, 0.8 13, 0.8 10.2 C0.8 7.5, 3.2 3.8, 5 0.5 Z"
                              fill={`url(#bdrop-combat-${bi})`}
                            />
                            <ellipse cx="3.5" cy="6.5" rx="1.8" ry="2.2" fill={`url(#bshine-combat-${bi})`} />
                          </svg>
                        </div>
                      ))}
                    </>
                  )}
                  {/* ── POISON VISUAL: strong violet overlay + edge glow ── */}
                  {isPoisoned && !isDead && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none poison-overlay" />
                      <div className="absolute inset-0 rounded-lg pointer-events-none poison-edge-glow" />
                    </>
                  )}
                  {/* ── ADRENALINE OVERLAY: orange/red energy glow ── */}
                  {isAdrenaline && !isDead && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none adrenaline-overlay status-effect-transition" />
                  )}
                  {/* ── STUN VISUAL: enhanced spinning stars + distortion ── */}
                  {isStunned && !isDead && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none stun-overlay status-effect-transition" />
                      {['⭐', '💫', '✦', '✧'].map((star, si) => (
                        <span
                          key={`stun-star-${si}`}
                          className="stun-star"
                          style={{
                            left: '50%',
                            top: '50%',
                            '--orbit-dur': `${1.5 + si * 0.3}s`,
                            '--orbit-r': `${28 + si * 6}px`,
                            animationDelay: `${si * 0.4}s`,
                            fontSize: `${10 + si * 2}px`,
                          } as React.CSSProperties}
                        >
                          {star}
                        </span>
                      ))}
                      <div className="stun-wave" />
                    </>
                  )}
                  {/* ── Advanced Particles ── */}
                  {isHurt && (
                    <CombatParticles
                      triggerKey={anim?.value ? anim.value + (anim.isCritical ? 1000 : 0) + idx : 0}
                      particleType={isCrit ? 'crit-star' : 'impact'}
                      count={isCrit ? 8 : 3}
                    />
                  )}
                  {/* ── Impact ring on heavy hit ── */}
                  {isHurt && anim.value && anim.value > 30 && !isCrit && (
                    <div className="impact-ring" style={{ '--ring-color': 'rgba(239, 68, 68, 0.5)' } as React.CSSProperties} />
                  )}
                  {/* ── Heal pulse particles ── */}
                  {isHealing && anim.value && (
                    <CombatParticles
                      triggerKey={anim.value + 5000 + idx}
                      particleType="neon-cyan"
                      count={4}
                    />
                  )}
                  {/* ── Active effect indicators (buffs, debuffs, shields, etc.) ── */}
                  <EffectIndicators
                    entityId={char.id}
                    activeEffects={activeEffects}
                    statusDurations={statusDurations[char.id] || []}
                    isDead={isDead}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[180px] p-2">
                <p className="font-bold text-[11px] text-white">{char.name}</p>
                <div className="space-y-0.5 mt-1">
                  <p className="text-[9px]">❤️ {char.currentHp}/{char.maxHp} HP</p>
                  <p className="text-[9px]">⚔️ ATT: {char.baseAtk}{effAtk !== char.baseAtk ? ` → ${effAtk}` : ''}</p>
                  <p className="text-[9px]">🛡️ DIF: {char.baseDef}{effDef !== char.baseDef ? ` → ${effDef}` : ''}</p>
                  <p className="text-[9px]">💨 VEL: {char.baseSpd}{effSpd !== char.baseSpd ? ` → ${effSpd}` : ''}</p>
                  {char.weapon && <p className="text-[9px]">🔫 {char.weapon.name}</p>}
                </div>
              </TooltipContent>
            </Tooltip>

            <span className={`text-[10px] sm:text-xs font-bold ${isDead ? 'text-gray-700' : isActive ? 'text-yellow-200' : 'text-gray-300'}`}>
              {char.name}
            </span>
            {/* Mini HP bar */}
            <div className="w-18 sm:w-20 h-2 rounded-full overflow-hidden bg-gray-800/80">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${pct}%`,
                background: isDead ? '#374151' : isPoisoned ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : isBleeding ? 'linear-gradient(90deg, #dc2626, #f87171)' : pct > 60 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : pct > 30 ? 'linear-gradient(90deg, #ca8a04, #eab308)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
                boxShadow: isDead ? 'none' : isPoisoned ? '0 0 6px rgba(168,85,247,0.5)' : isBleeding ? '0 0 6px rgba(248,113,113,0.5)' : `0 0 6px ${pct > 60 ? 'rgba(34,197,94,0.4)' : pct > 30 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.5)'}`,
              }} />
            </div>
            {/* Compact HP text for mobile readability */}
            <span className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none tabular-nums ${isDead ? 'text-gray-700' : pct > 60 ? 'text-green-400' : pct > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
              {char.currentHp}/{char.maxHp}
            </span>
            {/* ── Status effect badges with durations ── */}
            {!isDead && char.statusEffects?.filter(s => s !== 'none').length > 0 && (
              <div className="flex gap-0.5 flex-wrap justify-center">
                {char.statusEffects.filter(s => s !== 'none').map(s => {
                  const dur = (statusDurations[char.id] || []).find(d => d.effect === s);
                  const cls = s === 'poison' ? 'status-badge-poison' : s === 'bleeding' ? 'status-badge-bleeding' : s === 'stunned' ? 'status-badge-stunned' : s === 'adrenaline' ? 'status-badge-adrenaline' : 'status-badge';
                  const icon = s === 'poison' ? '☠️' : s === 'bleeding' ? '🩸' : s === 'stunned' ? '⚡' : s === 'adrenaline' ? '💊' : '❓';
                  return (
                    <span key={s} className={`status-badge ${cls}`} title={`${s}${dur ? ` (${dur.turnsLeft}t)` : ''}`}>
                      {icon}{dur ? <span className="status-duration">{dur.turnsLeft}</span> : null}
                    </span>
                  );
                })}
              </div>
            )}
            {/* Ammo indicator for ranged weapons */}
            {char.weapon?.type === 'ranged' && !isDead && (() => {
              const ammoId = getWeaponAmmoType(char.weapon.itemId);
              if (!ammoId) return null;
              const ammoCount = char.inventory.filter(i => i.itemId === ammoId).reduce((s, i) => s + (i.quantity || 0), 0);
              return (
                <span className={`text-[7px] font-mono font-bold leading-none ${ammoCount === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  🔫 {ammoCount}
                </span>
              );
            })()}
            {isHurt && anim.value && (
              <div className="absolute -top-2 right-0 z-30">
                <div className="damage-number"><span className={`text-xs font-black ${isCrit ? 'text-orange-400' : 'text-red-400'}`}>⚔️{anim.value}</span></div>
              </div>
            )}
            {isHealing && anim.value && (
              <div className="absolute -top-2 right-0 z-30">
                <div className="heal-number"><span className="text-xs font-black text-green-400">+{anim.value}</span></div>
              </div>
            )}
            {isTargetable && (
              <Heart className="absolute inset-0 m-auto w-3 h-3 text-green-400 animate-pulse opacity-60 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
