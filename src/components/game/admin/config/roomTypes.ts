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
  { value: 'normal',    label: 'Normale',          icon: '🚪', color: 'gray' },
  { value: 'safe_room', label: 'Safe Room',        icon: '🏠', color: 'emerald' },
  { value: 'boss_room', label: 'Boss Room',        icon: '💀', color: 'red' },
  { value: 'secret',    label: 'Stanza Segreta',   icon: '🔮', color: 'violet' },
  { value: 'shop',      label: 'Negozio',          icon: '🏪', color: 'amber' },
  { value: 'puzzle',    label: 'Stanza Puzzle',    icon: '🧩', color: 'cyan' },
  { value: 'corridor',  label: 'Corridoio',        icon: '🚶', color: 'slate' },
];

/** Get the display label for a room type value */
export function getRoomTypeLabel(type: string): string {
  return ROOM_TYPES.find(t => t.value === type)?.label ?? type;
}

/** Get the full RoomTypeInfo for a room type value */
export function getRoomTypeInfo(type: string): RoomTypeInfo {
  return ROOM_TYPES.find(t => t.value === type) ?? { value: type, label: type, icon: '🚪', color: 'gray' };
}
