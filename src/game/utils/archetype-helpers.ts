import { Archetype } from '../types';

export const ARCHETYPE_STYLES: Record<Archetype, { emoji: string; color: string; borderColor: string; labelColor: string; glow: string; icon: string }> = {
  tank: { emoji: '🛡️', color: 'from-blue-600 to-blue-800', borderColor: 'border-blue-500', labelColor: 'text-blue-400', glow: 'shadow-blue-500/30', icon: '🛡️' },
  healer: { emoji: '💊', color: 'from-green-600 to-green-800', borderColor: 'border-green-500', labelColor: 'text-green-400', glow: 'shadow-green-500/30', icon: '💊' },
  dps: { emoji: '⚔️', color: 'from-red-600 to-red-800', borderColor: 'border-red-500', labelColor: 'text-red-400', glow: 'shadow-red-500/30', icon: '⚔️' },
  control: { emoji: '🎯', color: 'from-purple-600 to-purple-800', borderColor: 'border-purple-500', labelColor: 'text-purple-400', glow: 'shadow-purple-500/30', icon: '🎯' },
  custom: { emoji: '⭐', color: 'from-amber-600 to-amber-800', borderColor: 'border-amber-500', labelColor: 'text-amber-400', glow: 'shadow-amber-500/30', icon: '⭐' },
};

export function getArchetypeEmoji(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.emoji ?? '⚔️';
}

export function getArchetypeColor(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.color ?? 'from-purple-600 to-purple-800';
}

export function getArchetypeBorderColor(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.borderColor ?? 'border-purple-500';
}

export function getArchetypeLabelColor(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.labelColor ?? 'text-purple-400';
}

export function getArchetypeGlow(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.glow ?? 'shadow-purple-500/30';
}

export function getArchetypeIcon(archetype: Archetype | string): string {
  return ARCHETYPE_STYLES[archetype as Archetype]?.icon ?? '⚔️';
}

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  tank: 'Tank',
  healer: 'Healer',
  dps: 'DPS',
  control: 'Control',
  custom: 'Custom',
};

export function getArchetypeLabel(archetype: Archetype | string): string {
  return ARCHETYPE_LABELS[archetype as Archetype] ?? 'DPS';
}

export const MAX_RIBBONS = 10;
