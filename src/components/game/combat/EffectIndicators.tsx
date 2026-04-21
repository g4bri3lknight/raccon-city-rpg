'use client';

import type { ActiveCombatEffect, StatusDuration } from '@/game/types';
import { mediaUrl } from '@/game/data/loader';
import { useGameStore } from '@/game/store';

/**
 * Renders visual indicators for active combat effects on a character/enemy image.
 * Shows ability images (or stat icons as fallback) with values for buffs/debuffs,
 * shield, stun, adrenaline, etc.
 * Effects disappear automatically when their duration expires.
 */

// Map of stat names to icons and colors
const STAT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  atk: { icon: '⚔️', color: 'text-red-400', label: 'ATT' },
  def: { icon: '🛡️', color: 'text-blue-400', label: 'DIF' },
  spd: { icon: '💨', color: 'text-yellow-400', label: 'VEL' },
  crit: { icon: '💥', color: 'text-orange-400', label: 'CRT' },
};

// Map of status effects to icons and colors
const STATUS_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  stunned: { icon: '💫', color: 'text-yellow-300', bgColor: 'bg-yellow-900/40' },
  adrenaline: { icon: '💉', color: 'text-orange-300', bgColor: 'bg-orange-900/40' },
  poison: { icon: '☠️', color: 'text-purple-400', bgColor: 'bg-purple-900/40' },
  bleeding: { icon: '🩸', color: 'text-red-400', bgColor: 'bg-red-900/40' },
};

interface EffectIndicatorsProps {
  entityId: string;
  activeEffects: ActiveCombatEffect[];
  statusDurations: StatusDuration[];
  isDead: boolean;
  /** Compact mode for mobile - fewer details */
  compact?: boolean;
}

/**
 * Renders the source icon for an effect:
 * - If sourceAbilityId exists → show ability image from media system
 *   (with hidden fallback emoji that becomes visible on image load error)
 * - If no sourceAbilityId → show the fallback emoji icon directly
 * This eliminates the duplication where both sourceIcon (ability emoji) and
 * the stat icon were shown side by side.
 */
function EffectSourceIcon({
  sourceAbilityId,
  fallbackIcon,
  dataVersion,
}: {
  sourceAbilityId?: string;
  fallbackIcon: string;
  dataVersion: number;
}) {
  if (sourceAbilityId) {
    return (
      <>
        <img
          src={mediaUrl(`/api/media/image?id=special_${sourceAbilityId}`, dataVersion)}
          alt=""
          className="w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] object-contain shrink-0"
          onError={(e) => {
            // Image not found — hide image and show fallback emoji
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = parent.querySelector<HTMLElement>('.img-fallback');
              if (fallback) fallback.style.display = '';
            }
          }}
        />
        <span className="img-fallback text-[8px] sm:text-[9px]" style={{ display: 'none' }}>{fallbackIcon}</span>
      </>
    );
  }
  // No ability image — show the stat/type icon directly
  return <span className="text-[8px] sm:text-[9px]">{fallbackIcon}</span>;
}

export default function EffectIndicators({
  entityId,
  activeEffects,
  statusDurations,
  isDead,
  compact = false,
}: EffectIndicatorsProps) {
  const dataVersion = useGameStore(s => s.dataVersion);

  if (isDead) return null;

  // Collect all relevant effects for this entity
  const entityBuffDebuffs = activeEffects.filter(
    ae => ae.targetId === entityId && ae.remainingTurns > 0
  );

  // Separate by type
  const buffs = entityBuffDebuffs.filter(ae => ae.type === 'buff_stat');
  const debuffs = entityBuffDebuffs.filter(ae => ae.type === 'debuff_stat');
  const shields = entityBuffDebuffs.filter(ae => ae.type === 'shield');
  const hots = entityBuffDebuffs.filter(ae => ae.type === 'hot');
  const reflects = entityBuffDebuffs.filter(ae => ae.type === 'reflect');
  const taunts = entityBuffDebuffs.filter(ae => ae.type === 'taunt');

  // Get non-bleed/poison status effects (those already have visuals)
  // We show stun and adrenaline here as indicators
  const otherStatuses = statusDurations.filter(sd =>
    sd.turnsLeft > 0 && (sd.effect === 'stunned' || sd.effect === 'adrenaline')
  );

  // If nothing to show, return null
  if (
    buffs.length === 0 &&
    debuffs.length === 0 &&
    shields.length === 0 &&
    hots.length === 0 &&
    reflects.length === 0 &&
    taunts.length === 0 &&
    otherStatuses.length === 0
  ) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-[3px] justify-center pointer-events-none z-20 p-[4px]">
      {/* Buff indicators */}
      {buffs.map(buff => {
        const config = STAT_CONFIG[buff.stat || ''];
        if (!config) return null;
        return (
          <span
            key={buff.id}
            className={`effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-green-900/60 border border-green-600/40 ${config.color}`}
            title={`${buff.sourceIcon || ''} +${buff.amount}% ${config.label} (${buff.remainingTurns}t)`}
          >
            <EffectSourceIcon sourceAbilityId={buff.sourceAbilityId} fallbackIcon={config.icon} dataVersion={dataVersion} />
            {!compact && <span>+{buff.amount}%</span>}
          </span>
        );
      })}

      {/* Debuff indicators */}
      {debuffs.map(debuff => {
        const config = STAT_CONFIG[debuff.stat || ''];
        if (!config) return null;
        return (
          <span
            key={debuff.id}
            className={`effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-red-900/60 border border-red-600/40 text-red-300`}
            title={`${debuff.sourceIcon || ''} -${Math.abs(debuff.amount || 0)}% ${config.label} (${debuff.remainingTurns}t)`}
          >
            <EffectSourceIcon sourceAbilityId={debuff.sourceAbilityId} fallbackIcon={config.icon} dataVersion={dataVersion} />
            {!compact && <span>-{Math.abs(debuff.amount || 0)}%</span>}
          </span>
        );
      })}

      {/* Shield indicator */}
      {shields.map(shield => (
        <span
          key={shield.id}
          className="effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-cyan-900/60 border border-cyan-600/40 text-cyan-300"
          title={`Scudo ${shield.shieldHp}HP (${shield.remainingTurns}t)`}
        >
          <EffectSourceIcon sourceAbilityId={shield.sourceAbilityId} fallbackIcon="🔮" dataVersion={dataVersion} />
          {!compact && <span>{shield.shieldHp}HP</span>}
        </span>
      ))}

      {/* Hot indicator */}
      {hots.map(hot => (
        <span
          key={hot.id}
          className="effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-emerald-900/60 border border-emerald-600/40 text-emerald-300"
          title={`Cura +${hot.amount}HP/turno (${hot.remainingTurns}t)`}
        >
          <EffectSourceIcon sourceAbilityId={hot.sourceAbilityId} fallbackIcon="💚" dataVersion={dataVersion} />
          {!compact && <span>+{hot.amount}</span>}
        </span>
      ))}

      {/* Reflect indicator */}
      {reflects.map(ref => (
        <span
          key={ref.id}
          className="effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-violet-900/60 border border-violet-600/40 text-violet-300"
          title={`Riflette ${ref.amount}% (${ref.remainingTurns}t)`}
        >
          <EffectSourceIcon sourceAbilityId={ref.sourceAbilityId} fallbackIcon="🔄" dataVersion={dataVersion} />
          {!compact && <span>{ref.amount}%</span>}
        </span>
      ))}

      {/* Taunt indicator */}
      {taunts.map(taunt => (
        <span
          key={taunt.id}
          className="effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none bg-amber-900/60 border border-amber-600/40 text-amber-300"
          title={`Provoca (${taunt.remainingTurns}t)`}
        >
          <EffectSourceIcon sourceAbilityId={taunt.sourceAbilityId} fallbackIcon="🎯" dataVersion={dataVersion} />
        </span>
      ))}

      {/* Other status effects (stun, adrenaline) */}
      {otherStatuses.map(sd => {
        const config = STATUS_CONFIG[sd.effect];
        if (!config) return null;
        return (
          <span
            key={sd.effect}
            className={`effect-badge-pulse inline-flex items-center gap-[2px] px-[4px] py-[2px] rounded text-[8px] sm:text-[9px] font-bold leading-none ${config.bgColor} border border-white/15 ${config.color}`}
            title={`${sd.effect} (${sd.turnsLeft}t)`}
          >
            {config.icon}
            {!compact && <span>{sd.turnsLeft}t</span>}
          </span>
        );
      })}
    </div>
  );
}
