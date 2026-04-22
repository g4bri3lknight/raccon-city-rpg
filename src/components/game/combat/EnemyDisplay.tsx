'use client';

import { Swords, Crosshair } from 'lucide-react';
import { ENEMY_IMAGES, mediaUrl } from '@/game/data/loader';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import EffectIndicators from './EffectIndicators';
import type { EnemyDisplayProps } from './types';

export default function EnemyDisplay({
  enemies,
  currentActorId,
  isPlayerTurn,
  targetingMode,
  hitTargetId,
  hitTargetIds,
  hitIsCritical,
  deathTargetId,
  bossPhaseId,
  dataVersion,
  onEnemyClick,
  getAnimForTarget,
  activeEffects,
  statusDurations,
  floatNumbers,
}: EnemyDisplayProps) {
  return (
    <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 lg:gap-14 px-3 py-1 min-h-0">
      {enemies.map((enemy, idx) => {
        const anim = getAnimForTarget(enemy.id, enemy.name);
        const isHurt = anim?.type === 'damage';
        const isMissAnim = anim?.type === 'miss';
        const isCrit = !!anim?.isCritical;
        const isDead = enemy.currentHp <= 0;
        const isActive = enemy.id === currentActorId && !isPlayerTurn;
        const isTargetable = targetingMode === 'enemy' && !isDead;
        const pct = Math.min(100, enemy.maxHp > 0 ? (enemy.currentHp / enemy.maxHp) * 100 : 0);
        const animClass = isMissAnim ? 'animate-dodge' : isHurt ? (isCrit ? 'animate-critical-impact' : 'entity-shake') : !isDead ? 'entity-enemy-idle' : 'entity-dead';
        // ── #41 animation classes ──
        const isHitTarget = hitTargetId === enemy.id || hitTargetIds.includes(enemy.id);
        const hitAnimClass = isHitTarget ? (hitIsCritical ? 'animate-flash-red' : 'animate-shake') : '';
        const deathAnimClass = deathTargetId === enemy.id ? 'animate-enemy-death' : '';
        const bossPhaseClass = bossPhaseId === enemy.id ? 'animate-boss-phase' : '';
        const bossGlowClass = enemy.isBoss && !isDead ? 'animate-pulse-glow' : '';
        const borderColor = isTargetable
          ? 'border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.6)] ring-1 ring-red-400/40'
          : isHurt
          ? 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
          : isDead ? 'border-gray-700/30' : isActive ? 'border-red-400/60 shadow-[0_0_10px_rgba(248,113,113,0.3)]' : 'border-gray-600/40';

        return (
          <div
            key={enemy.id}
            onClick={() => onEnemyClick(enemy.id)}
            className={`relative flex flex-col items-center gap-0.5 ${animClass} ${hitAnimClass} ${deathAnimClass} ${bossPhaseClass} ${isDead ? 'grayscale opacity-30' : ''} transition-all duration-150 ${isTargetable ? 'cursor-crosshair scale-105 hover:scale-110 hover:shadow-[0_0_24px_rgba(239,68,68,0.7)]' : ''}`}
          >
            {/* Active turn indicator */}
            {isActive && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 text-[8px] text-red-300 font-bold whitespace-nowrap animate-bounce">
                <Swords className="w-3 h-3" /> Attacca
              </span>
            )}
            {isHurt && !isCrit && <div className="absolute -inset-1 rounded-lg bg-red-500/25 damage-flash pointer-events-none" />}
            {isCrit && isHurt && <div className="absolute -inset-1 rounded-lg bg-orange-500/35 damage-flash pointer-events-none" />}
            {isMissAnim && <div className="absolute -inset-1 rounded-lg bg-yellow-500/15 pointer-events-none animate-dodge" />}
            {/* Keyboard shortcut badge (alive-only index) */}
            {isTargetable && (() => {
              const aliveIdx = enemies.filter((e, i) => i <= idx && e.currentHp > 0).length - 1;
              return (
                <span className="absolute -top-2 -left-1 z-30 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                  {aliveIdx + 1}
                </span>
              );
            })()}
            <div className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-56 lg:h-56 rounded-lg overflow-hidden border-2 shrink-0 relative ${borderColor} ${bossGlowClass}`}>
              <img src={mediaUrl(ENEMY_IMAGES[enemy.definitionId] || '', dataVersion)} alt="" className="w-full h-full object-cover object-[center_15%]" draggable={false} onError={(e) => {
                const t = e.currentTarget;
                if (t.style.display !== 'none') {
                  t.style.display = 'none';
                  const fb = document.createElement('div');
                  fb.className = 'w-full h-full flex items-center justify-center bg-gray-900/80';
                  fb.textContent = '';
                  const iconSpan = document.createElement('span');
                  iconSpan.style.fontSize = '2.5rem';
                  iconSpan.textContent = enemy.icon || '🧟';
                  fb.appendChild(iconSpan);
                  t.parentElement?.appendChild(fb);
                }
              }} />
              {/* ── Status effect overlays (poison/bleeding) ── */}
              {enemy.statusEffects?.includes('bleeding') && !isDead && (
                <>
                  <div className="absolute inset-0 rounded-lg pointer-events-none bleeding-overlay" />
                  <div className="absolute left-0 top-0 bottom-0 w-[5px] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/90 to-red-950 blood-streak" />
                  </div>
                </>
              )}
              {enemy.statusEffects?.includes('poison') && !isDead && (
                <>
                  <div className="absolute inset-0 rounded-lg pointer-events-none poison-overlay" />
                  <div className="absolute inset-0 rounded-lg pointer-events-none poison-edge-glow" />
                </>
              )}
              {/* ── Active effect indicators (buffs, debuffs, shields, etc.) ── */}
              <EffectIndicators
                entityId={enemy.id}
                activeEffects={activeEffects}
                statusDurations={statusDurations[enemy.id] || []}
                isDead={isDead}
              />
            </div>
            <span className={`text-[10px] sm:text-xs font-bold ${isDead ? 'text-gray-700' : enemy.isBoss ? 'text-red-300' : 'text-gray-300'}`}>
              {enemy.name}
            </span>
            {/* Mini HP bar */}
            <div className="w-18 sm:w-20 h-2.5 sm:h-2 rounded-full overflow-hidden bg-gray-800/80">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${pct}%`,
                background: isDead ? '#374151' : pct > 60 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : pct > 30 ? 'linear-gradient(90deg, #ca8a04, #eab308)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
                boxShadow: isDead ? 'none' : `0 0 6px ${pct > 60 ? 'rgba(34,197,94,0.4)' : pct > 30 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.5)'}`,
              }} />
            </div>
            {/* Compact HP text for mobile readability */}
            <span className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none tabular-nums ${isDead ? 'text-gray-700' : pct > 60 ? 'text-green-400' : pct > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
              {enemy.currentHp}/{enemy.maxHp}
            </span>
            {enemy.isBoss && !isDead && <span className="absolute -top-1.5 -right-0.5 text-[6px] bg-red-700 text-white px-1 rounded font-bold">BOSS</span>}
            {/* ── #41 Critical slash overlay ── */}
            {hitIsCritical && isHitTarget && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                <div className="animate-critical-slash text-orange-400 text-3xl font-black" style={{ textShadow: '0 0 10px rgba(251,146,60,0.8)' }}>✕</div>
              </div>
            )}
            {/* ── #41 Flash overlay on critical (orange glow) ── */}
            {hitIsCritical && isHitTarget && (
              <div className="absolute inset-0 rounded-lg animate-flash-white pointer-events-none z-30" style={{ backgroundColor: 'rgba(251,146,60,0.15)' }} />
            )}
            {/* ── Status effect badges with durations ── */}
            {!isDead && enemy.statusEffects?.filter(s => s !== 'none').length > 0 && (
              <div className="flex gap-0.5 flex-wrap justify-center">{enemy.statusEffects.filter(s => s !== 'none').map(s => {
                const dur = (statusDurations[enemy.id] || []).find(d => d.effect === s);
                const cls = s === 'poison' ? 'status-badge-poison' : s === 'bleeding' ? 'status-badge-bleeding' : s === 'stunned' ? 'status-badge-stunned' : s === 'adrenaline' ? 'status-badge-adrenaline' : 'status-badge';
                const icon = s === 'poison' ? '☠️' : s === 'bleeding' ? '🩸' : s === 'stunned' ? '⚡' : s === 'adrenaline' ? '💊' : '❓';
                return (
                  <span key={s} className={`status-badge ${cls}`} title={`${s}${dur ? ` (${dur.turnsLeft}t)` : ''}`}>
                    {icon}{dur ? <span className="status-duration">{dur.turnsLeft}</span> : null}
                  </span>
                );
              })}</div>
            )}
            {isHurt && anim.value && (
              <div className="absolute -top-2 right-0 z-30">
                <div className="damage-number"><span className={`text-xs font-black ${isCrit ? 'text-orange-400' : 'text-red-400'}`}>⚔️{anim.value}</span></div>
              </div>
            )}
            {isTargetable && (
              <Crosshair className="absolute inset-0 m-auto w-3 h-3 text-red-400 animate-pulse opacity-60 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
