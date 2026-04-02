'use client';

import { Rarity } from '@/game/types';

// ── Realistic weapon SVGs from game-icons.net (CC-BY 3.0) ──
// Authors: delapouite (lead-pipe), lorc (scalpel, bowie-knife), sbed (shotgun), skoll (glock, desert-eagle)

const WEAPON_SOURCES: Record<string, string> = {
  pipe: '/weapons/pipe.svg',
  scalpel: '/weapons/scalpel.svg',
  pistol: '/weapons/pistol.svg',
  shotgun: '/weapons/shotgun.svg',
  combat_knife: '/weapons/combat_knife.svg',
  magnum: '/weapons/magnum.svg',
};

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#a0a0a0',
  uncommon: '#7cb3d4',
  rare: '#c4956a',
};

interface WeaponIconProps {
  itemId: string;
  rarity?: Rarity;
  size?: number;
  className?: string;
}

export default function WeaponIcon({ itemId, rarity = 'common', size = 32, className = '' }: WeaponIconProps) {
  const src = WEAPON_SOURCES[itemId];
  if (!src) return null;

  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;

  return (
    <img
      src={src}
      alt={itemId}
      width={size}
      height={size}
      className={className}
      style={{ color, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
      draggable={false}
    />
  );
}
