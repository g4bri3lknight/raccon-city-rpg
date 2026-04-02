'use client';

import { Rarity } from '@/game/types';

// ── Unified item icon — all items use AI-generated realistic PNGs ──
// Icons stored in /public/icons/items/{itemId}.png

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'rgba(160,160,160,0.25)',
  uncommon: 'rgba(124,179,212,0.35)',
  rare: 'rgba(196,149,106,0.4)',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: 'drop-shadow(0 0 2px rgba(160,160,160,0.2))',
  uncommon: 'drop-shadow(0 0 4px rgba(124,179,212,0.3))',
  rare: 'drop-shadow(0 0 6px rgba(196,149,106,0.35))',
};

// Fallback emoji map (only used if PNG is missing)
const FALLBACK_ICONS: Record<string, string> = {
  pipe: '⚒️',
  scalpel: '🔪',
  pistol: '🔫',
  shotgun: '🔫',
  combat_knife: '🗡️',
  magnum: '🔫',
  bandage: '🩹',
  herb_green: '🍃',
  herb_red: '🩸',
  herb_mixed: '🌿',
  first_aid: '✚️',
  spray: '🧴',
  antidote: '💉',
  ammo_pistol: '🔶',
  ammo_shotgun: '🔷',
  ammo_magnum: '🔴',
  bag_small: '👝',
  bag_medium: '🎒',
  flashlight: '🔦',
  lockpick: '🗝️',
  ink_ribbon: '🎀',
  key_rpd: '🔑',
  key_sewers: '🔑',
  key_lab: '💳',
  crank_handle: '⚙️',
  fuse: '🔌',
};

interface ItemIconProps {
  itemId: string;
  rarity?: Rarity;
  size?: number;
  className?: string;
  showBorder?: boolean;
}

export default function ItemIcon({
  itemId,
  rarity = 'common',
  size,
  className = '',
  showBorder = false,
}: ItemIconProps) {
  const src = `/icons/items/${itemId}.png`;
  const border = RARITY_BORDER[rarity];
  const glow = RARITY_GLOW[rarity];
  const fallback = FALLBACK_ICONS[itemId] || '❓';

  // If size is provided, use fixed sizing; otherwise fill parent via CSS
  const sizingStyle = size ? { width: size, height: size } : {};

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded ${className}`}
      style={{
        ...sizingStyle,
        filter: glow,
        ...(showBorder ? { outline: `1px solid ${border}` } : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={itemId}
        width={size}
        height={size}
        className={!size ? 'w-full h-full' : ''}
        style={{ objectFit: 'contain', borderRadius: showBorder ? 'inherit' : 4 }}
        draggable={false}
        onError={(e) => {
          // Fallback to emoji if PNG fails to load
          const target = e.currentTarget;
          if (target.style.display !== 'none') {
            target.style.display = 'none';
            const span = document.createElement('span');
            span.textContent = fallback;
            span.style.fontSize = size ? `${size * 0.65}px` : '60%';
            span.style.lineHeight = '1';
            span.style.filter = 'saturate(0.3) brightness(0.75)';
            target.parentElement?.appendChild(span);
          }
        }}
      />
    </span>
  );
}
