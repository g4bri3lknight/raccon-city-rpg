'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import type { ItemInstance, ItemDefinition, SpecialEffect } from '@/game/types';
import { RARITY_LABEL, RARITY_COLORS, TYPE_LABELS } from '@/game/utils/rarity-helpers';
import { getItemEffectDescriptions } from '@/game/utils/item-effects';
import { getEquipStatBonus, getEffectSpecialLabel, getStatusChanceBoost } from '@/game/utils/effect-helpers';

/** Unified data accepted by ItemTooltip (works with both ItemInstance and ItemDefinition) */
export type TooltipItemData = {
  name: string;
  description: string;
  type: string;
  rarity: string;
  icon: string;
  usable: boolean;
  equippable: boolean;
  effects?: SpecialEffect[];
  quantity?: number;
  isEquipped?: boolean;
  weaponType?: string;
  ammoType?: string;
  // ItemInstance-only fields (undefined for ItemDefinition)
  weaponStats?: ItemInstance['weaponStats'];
  equipmentStats?: ItemInstance['equipmentStats'];
  modStats?: ItemInstance['modStats'];
  quality?: string;
};

interface ItemTooltipProps {
  item: ItemInstance | ItemDefinition | null;
  children: ReactNode;
  /** Disable tooltip (e.g. empty slots) */
  disabled?: boolean;
}

/** Rarity → border color class for tooltip container */
const RARITY_BORDER: Record<string, string> = {
  common: 'border-gray-600/50',
  uncommon: 'border-green-600/50',
  rare: 'border-blue-500/50',
  epic: 'border-purple-500/50',
  legendary: 'border-amber-500/50',
};

/** Rarity → glow shadow */
const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[0_0_6px_rgba(34,197,94,0.12)]',
  rare: 'shadow-[0_0_6px_rgba(59,130,246,0.15)]',
  epic: 'shadow-[0_0_8px_rgba(168,85,247,0.15)]',
  legendary: 'shadow-[0_0_8px_rgba(245,158,11,0.2)]',
};

export default function ItemTooltip({ item, children, disabled }: ItemTooltipProps) {
  const [show, setShow] = useState(false);
  const [flipBelow, setFlipBelow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Determine tooltip placement based on available space above
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setFlipBelow(rect.top < 260);
    }
    setShow(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Small delay to prevent flicker when moving between trigger and tooltip
    hideTimer.current = setTimeout(() => setShow(false), 80);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!item || disabled) return <>{children}</>;

  const rarity = (item as any).rarity || 'common';
  const borderColor = RARITY_BORDER[rarity] || RARITY_BORDER.common;
  const glowClass = RARITY_GLOW[rarity] || '';
  const rarityLabel = RARITY_LABEL[rarity] || rarity;
  const typeLabel = TYPE_LABELS[(item as any).type] || (item as any).type;
  const rarityColorClass = RARITY_COLORS[rarity]?.text || 'text-gray-400';

  // ItemInstance-specific data
  const isInstance = 'uid' in item && item.uid;
  const weaponStats = isInstance ? (item as ItemInstance).weaponStats : undefined;
  const equipmentStats = isInstance ? (item as ItemInstance).equipmentStats : undefined;
  const modStats = isInstance ? (item as ItemInstance).modStats : undefined;
  const quality = isInstance ? (item as ItemInstance).quality : undefined;
  const quantity = (item as any).quantity;
  const isEquipped = (item as any).isEquipped;

  // ItemDefinition-specific data
  const itemDefWeaponType = !isInstance ? (item as ItemDefinition).weaponType : undefined;
  const itemDefAmmoType = !isInstance ? (item as ItemDefinition).ammoType : undefined;

  // Compute effect descriptions
  const effectDescs = isInstance
    ? getItemEffectDescriptions(item as ItemInstance)
    : [];

  // Consumable detection
  const isConsumable = (item as any).usable && !(item as any).equippable;

  // Quality label
  const qualityLabel: Record<string, string> = {
    superior: 'Superiore',
    master: 'Maestro',
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Tooltip */}
      {show && (
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 z-50
            ${flipBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}
            w-64 max-w-[16rem]
            bg-black/95 backdrop-blur-md
            rounded-lg border ${borderColor}
            ${glowClass}
            px-3 py-2.5
            text-xs pointer-events-none
            shadow-xl shadow-black/60
            animate-in fade-in-0 zoom-in-95
            duration-100
          `}
        >
          {/* Arrow */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2
              ${flipBelow ? 'top-[-4px]' : 'bottom-[-4px]'}
              w-2.5 h-2.5 rotate-45
              bg-black/95 border
              ${borderColor}
              ${flipBelow ? 'border-b-0 border-r-0' : 'border-t-0 border-l-0'}
            `}
          />

          {/* Name */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`font-bold text-white text-[11px] leading-tight truncate ${rarityColorClass}`}>
              {item.name}
            </span>
            {quantity > 1 && (
              <span className="text-[10px] bg-white/10 text-white/60 rounded px-1 py-px leading-none shrink-0">
                ×{quantity}
              </span>
            )}
            {isEquipped && (
              <span className="text-[9px] bg-amber-900/60 text-amber-300 rounded px-1 py-px leading-none shrink-0">
                E
              </span>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1 mb-1.5">
            <span className={`text-[10px] rounded px-1 py-px leading-none ${RARITY_COLORS[rarity]?.bg || 'bg-gray-800/50'} ${RARITY_COLORS[rarity]?.text || 'text-gray-400'}`}>
              {rarityLabel}
            </span>
            <span className="text-[10px] text-white/50 rounded bg-white/[0.06] px-1 py-px leading-none">
              {typeLabel}
            </span>
            {isConsumable && (
              <span className="text-[10px] text-emerald-400 rounded bg-emerald-900/30 px-1 py-px leading-none">
                Consumabile
              </span>
            )}
            {quality && qualityLabel[quality] && (
              <span className="text-[10px] text-amber-300 rounded bg-amber-900/30 px-1 py-px leading-none">
                {qualityLabel[quality]}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-[10px] text-white/50 leading-relaxed mb-1.5"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.description}
          </p>

          {/* Weapon stats */}
          {weaponStats && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mb-1.5 text-[10px]">
              <span className="text-amber-400/80">⚔️ ATK +{getEquipStatBonus(weaponStats.effects, 'atk')}</span>
              <span className="text-white/35">
                {weaponStats.type === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}
              </span>
              {weaponStats.ammoType && (
                <span className="text-orange-400/60">
                  🔶 {TYPE_LABELS['ammo'] || 'Munizioni'}
                </span>
              )}
              {weaponStats.modSlots && weaponStats.modSlots.length > 0 && (
                <span className="text-cyan-400/60">
                  🔧 {weaponStats.modSlots.length}/2 mod
                </span>
              )}
            </div>
          )}

          {/* ItemDefinition weapon type (no instance data) */}
          {!isInstance && itemDefWeaponType && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mb-1.5 text-[10px]">
              <span className="text-white/35">
                {itemDefWeaponType === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}
              </span>
              {itemDefAmmoType && (
                <span className="text-orange-400/60">
                  🔶 {TYPE_LABELS['ammo'] || 'Munizioni'}
                </span>
              )}
            </div>
          )}

          {/* Equipment stats (armor/accessory) */}
          {equipmentStats && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5 text-[10px]">
              {getEquipStatBonus(equipmentStats.effects, 'def') > 0 && (
                <span className="text-blue-400/80">🛡️ +{getEquipStatBonus(equipmentStats.effects, 'def')} DEF</span>
              )}
              {getEquipStatBonus(equipmentStats.effects, 'hp') > 0 && (
                <span className="text-green-400/80">❤️ +{getEquipStatBonus(equipmentStats.effects, 'hp')} HP</span>
              )}
              {getEquipStatBonus(equipmentStats.effects, 'spd') > 0 && (
                <span className="text-yellow-400/80">💨 +{getEquipStatBonus(equipmentStats.effects, 'spd')} SPD</span>
              )}
              {getEquipStatBonus(equipmentStats.effects, 'atk') > 0 && (
                <span className="text-amber-400/80">⚔️ +{getEquipStatBonus(equipmentStats.effects, 'atk')} ATK</span>
              )}
              {getEquipStatBonus(equipmentStats.effects, 'crit') > 0 && (
                <span className="text-orange-400/80">💥 +{getEquipStatBonus(equipmentStats.effects, 'crit')}% Crit</span>
              )}
              {(() => {
                const lbl = getEffectSpecialLabel(equipmentStats.effects);
                return lbl ? <span className="text-purple-400/80">✨ {lbl}</span> : null;
              })()}
            </div>
          )}

          {/* Mod stats */}
          {modStats && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5 text-[10px]">
              {getEquipStatBonus(modStats.effects, 'atk') > 0 && (
                <span className="text-amber-400/80">⚔️ +{getEquipStatBonus(modStats.effects, 'atk')} ATK</span>
              )}
              {getEquipStatBonus(modStats.effects, 'crit') > 0 && (
                <span className="text-orange-400/80">💥 +{getEquipStatBonus(modStats.effects, 'crit')}% Crit</span>
              )}
              {getStatusChanceBoost(modStats.effects) > 0 && (
                <span className="text-purple-400/80">☠️ +{getStatusChanceBoost(modStats.effects)}% Status</span>
              )}
              {getEquipStatBonus(modStats.effects, 'spd') > 0 && (
                <span className="text-cyan-400/80">💨 +{getEquipStatBonus(modStats.effects, 'spd')}% Dodge</span>
              )}
              <span className="text-white/35">
                {modStats.type === 'any' ? 'Tutte le armi' : modStats.type === 'ranged' ? 'A distanza' : 'Corpo a corpo'}
              </span>
            </div>
          )}

          {/* Effect descriptions (heal, status cure, buff, etc.) */}
          {effectDescs.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
              {effectDescs.map((d, i) => (
                <span key={i} className={d.color}>{d.emoji} {d.text}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
