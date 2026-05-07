// ═══════════════════════════════════════════════════════════════
// Room Type Definitions
// ═══════════════════════════════════════════════════════════════

export interface RoomTypeInfo {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export const ROOM_TYPES: RoomTypeInfo[] = [
  { value: 'normal',    label: 'Normale',        icon: '🚪', color: 'gray' },
  { value: 'safe_room', label: 'Stanza Salvatica', icon: '🏠', color: 'emerald' },
  { value: 'boss_room', label: 'Stanza Boss',     icon: '💀', color: 'red' },
  { value: 'secret',    label: 'Stanza Segreta',  icon: '🔮', color: 'violet' },
  { value: 'shop',      label: 'Negozio',         icon: '🏪', color: 'amber' },
  { value: 'puzzle',    label: 'Stanza Puzzle',   icon: '🧩', color: 'cyan' },
  { value: 'corridor',  label: 'Corridoio',       icon: '🚶', color: 'slate' },
];

/** Get the display label for a room type value */
export function getRoomTypeLabel(type: string): string {
  return ROOM_TYPES.find(t => t.value === type)?.label ?? type;
}

/** Get the full RoomTypeInfo for a room type value */
export function getRoomTypeInfo(type: string): RoomTypeInfo {
  return ROOM_TYPES.find(t => t.value === type) ?? { value: type, label: type, icon: '🚪', color: 'gray' };
}

// Color → badge classes mapping (small inline badges)
const BADGE_CLASS_MAP: Record<string, string> = {
  gray:    'border-white/[0.08] text-white/40 bg-white/[0.04]',
  emerald: 'border-emerald-500/25 text-emerald-300/80 bg-emerald-500/10',
  red:     'border-red-500/25 text-red-300/80 bg-red-500/10',
  violet:  'border-violet-500/25 text-violet-300/80 bg-violet-500/10',
  amber:   'border-amber-500/25 text-amber-300/80 bg-amber-500/10',
  cyan:    'border-cyan-500/25 text-cyan-300/80 bg-cyan-500/10',
  slate:   'border-slate-500/25 text-slate-300/80 bg-slate-500/10',
};

/** Get Tailwind classes for a room-type badge */
export function getRoomTypeBadgeClasses(color: string): string {
  return BADGE_CLASS_MAP[color] ?? BADGE_CLASS_MAP.gray;
}

// Color → card border classes mapping (room card containers)
const CARD_CLASS_MAP: Record<string, string> = {
  gray:    'border-gray-500/40',
  emerald: 'border-emerald-500/40',
  red:     'border-red-500/40',
  violet:  'border-violet-500/40',
  amber:   'border-amber-500/40',
  cyan:    'border-cyan-500/40',
  slate:   'border-slate-500/40',
};

/** Get Tailwind classes for a room-type card container */
export function getRoomTypeCardClasses(color: string): string {
  return CARD_CLASS_MAP[color] ?? CARD_CLASS_MAP.gray;
}
