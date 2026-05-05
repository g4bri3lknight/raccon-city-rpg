// ═══════════════════════════════════════════════════════════════
// Corridor Presets — 4 base types with rotation support
// ═══════════════════════════════════════════════════════════════
//
// Preset key format: "baseType:rotation" (e.g. "straight:0", "L:90")
// Rotation is clockwise in degrees: 0, 90, 180, 270
//
// Base types:
//   straight — 2 rotations (0°, 90°)
//   L        — 4 rotations (0°, 90°, 180°, 270°)
//   T        — 4 rotations (0°, 90°, 180°, 270°)
//   cross    — 1 rotation  (0° — symmetric, rotation is no-op)
//

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface CorridorVariant {
  /** connections: compass sides that have openings */
  connections: string[];
  defaultWidth: number;
  defaultHeight: number;
  /** SVG path data (relative to 0,0) */
  path: string;
}

export interface CorridorBaseType {
  id: string;
  label: string;
  icon: string;
  description: string;
  /** Available rotation angles (degrees clockwise) */
  rotations: number[];
}

// ───────────────────────────────────────────────────────────────
// 4 Base Types
// ───────────────────────────────────────────────────────────────

export const CORRIDOR_BASE_TYPES: CorridorBaseType[] = [
  {
    id: 'straight',
    label: 'Corridoio Dritto',
    icon: '━',
    description: 'Corridoio dritto che collega due stanze',
    rotations: [0, 90],
  },
  {
    id: 'L',
    label: 'Curva a L',
    icon: '┗',
    description: 'Curva a 90° per angoli',
    rotations: [0, 90, 180, 270],
  },
  {
    id: 'T',
    label: 'A T',
    icon: '┻',
    description: 'Biforcazione a T con 3 uscite',
    rotations: [0, 90, 180, 270],
  },
  {
    id: 'cross',
    label: 'A Croce',
    icon: '╋',
    description: 'Incrocio con 4 uscite',
    rotations: [0],
  },
];

// ───────────────────────────────────────────────────────────────
// Variant definitions: "baseType:rotation" → variant spec
// ───────────────────────────────────────────────────────────────

const VARIANTS: Record<string, CorridorVariant> = {
  // ── Straight corridors ──────────────────────────────────────
  'straight:0': {
    connections: ['east', 'west'],
    defaultWidth: 180,
    defaultHeight: 44,
    path: 'M 0,0 L 180,0 L 180,44 L 0,44 Z',
  },
  'straight:90': {
    connections: ['north', 'south'],
    defaultWidth: 44,
    defaultHeight: 180,
    path: 'M 0,0 L 44,0 L 44,180 L 0,180 Z',
  },

  // ── L-shaped corridors (clockwise rotation from 0°=SE) ─────
  // 0°   = ┏ SE corner (south + east exits)
  // 90°  = ┓ SW corner (south + west exits)
  // 180° = ┛ NW corner (north + west exits)
  // 270° = ┗ NE corner (north + east exits)
  'L:0': {
    connections: ['south', 'east'],
    defaultWidth: 110,
    defaultHeight: 110,
    path: 'M 0,0 L 110,0 L 110,44 L 44,44 L 44,110 L 0,110 Z',
  },
  'L:90': {
    connections: ['south', 'west'],
    defaultWidth: 110,
    defaultHeight: 110,
    path: 'M 0,0 L 110,0 L 110,110 L 44,110 L 44,44 L 0,44 Z',
  },
  'L:180': {
    connections: ['north', 'west'],
    defaultWidth: 110,
    defaultHeight: 110,
    path: 'M 66,0 L 110,0 L 110,110 L 0,110 L 0,66 L 66,66 Z',
  },
  'L:270': {
    connections: ['north', 'east'],
    defaultWidth: 110,
    defaultHeight: 110,
    path: 'M 0,0 L 44,0 L 44,66 L 110,66 L 110,110 L 0,110 Z',
  },

  // ── T-shaped corridors (clockwise rotation from 0°=S) ──────
  // 0°   = ┳ T-south  (south + east + west exits)
  // 90°  = ┫ T-west   (west + north + south exits)
  // 180° = ┻ T-north  (north + east + west exits)
  // 270° = ┣ T-east   (east + north + south exits)
  'T:0': {
    connections: ['south', 'east', 'west'],
    defaultWidth: 180,
    defaultHeight: 110,
    path: 'M 0,0 L 180,0 L 180,44 L 112,44 L 112,88 L 68,88 L 68,44 L 0,44 Z',
  },
  'T:90': {
    connections: ['west', 'north', 'south'],
    defaultWidth: 110,
    defaultHeight: 180,
    path: 'M 66,0 L 110,0 L 110,180 L 66,180 L 66,112 L 0,112 L 0,68 L 66,68 Z',
  },
  'T:180': {
    connections: ['north', 'east', 'west'],
    defaultWidth: 180,
    defaultHeight: 110,
    path: 'M 68,0 L 112,0 L 112,44 L 180,44 L 180,88 L 0,88 L 0,44 L 68,44 Z',
  },
  'T:270': {
    connections: ['east', 'north', 'south'],
    defaultWidth: 110,
    defaultHeight: 180,
    path: 'M 0,0 L 44,0 L 44,68 L 110,68 L 110,112 L 44,112 L 44,180 L 0,180 Z',
  },

  // ── Cross corridor (symmetric) ──────────────────────────────
  'cross:0': {
    connections: ['north', 'south', 'east', 'west'],
    defaultWidth: 180,
    defaultHeight: 180,
    path: 'M 68,0 L 112,0 L 112,68 L 180,68 L 180,112 L 112,112 L 112,180 L 68,180 L 68,112 L 0,112 L 0,68 L 68,68 Z',
  },
};

// ───────────────────────────────────────────────────────────────
// Legacy ID mapping (old format → new format)
// ───────────────────────────────────────────────────────────────

const LEGACY_MAP: Record<string, string> = {
  straight_h: 'straight:0',
  straight_v: 'straight:90',
  L_se:       'L:0',
  L_sw:       'L:90',
  L_nw:       'L:180',
  L_ne:       'L:270',
  T_s:        'T:0',
  T_w:        'T:90',
  T_n:        'T:180',
  T_e:        'T:270',
  cross:      'cross:0',
};

// ───────────────────────────────────────────────────────────────
// Helper functions
// ───────────────────────────────────────────────────────────────

/** Parse a preset key into { baseType, rotation }. Handles both old and new formats. */
export function parsePresetKey(key: string): { baseType: string; rotation: number } | null {
  // Try new format "baseType:rotation"
  const colonIdx = key.indexOf(':');
  if (colonIdx !== -1) {
    const baseType = key.substring(0, colonIdx);
    const rotation = parseInt(key.substring(colonIdx + 1), 10);
    if (baseType && !isNaN(rotation)) {
      return { baseType, rotation };
    }
  }
  // Try legacy format
  const mapped = LEGACY_MAP[key];
  if (mapped) {
    return parsePresetKey(mapped);
  }
  return null;
}

/** Build a preset key from baseType + rotation */
export function buildPresetKey(baseType: string, rotation: number): string {
  return `${baseType}:${rotation}`;
}

/** Resolve a preset key (old or new format) to its variant spec */
export function resolvePreset(key: string): CorridorVariant | null {
  const parsed = parsePresetKey(key);
  if (!parsed) return null;
  const variantKey = buildPresetKey(parsed.baseType, parsed.rotation);
  return VARIANTS[variantKey] ?? null;
}

/** Get base type info */
export function getBaseTypeInfo(baseType: string): CorridorBaseType | undefined {
  return CORRIDOR_BASE_TYPES.find(bt => bt.id === baseType);
}

/** Get available rotations for a base type */
export function getAvailableRotations(baseType: string): number[] {
  const info = getBaseTypeInfo(baseType);
  return info?.rotations ?? [];
}

/** Rotate a preset key by a delta (in 90° steps). Returns the new key or null. */
export function rotatePreset(key: string, delta: number): string | null {
  const parsed = parsePresetKey(key);
  if (!parsed) return null;
  const info = getBaseTypeInfo(parsed.baseType);
  if (!info) return null;
  const currentIdx = info.rotations.indexOf(parsed.rotation);
  if (currentIdx === -1) return null;
  const newIdx = (currentIdx + delta + info.rotations.length) % info.rotations.length;
  const newRotation = info.rotations[newIdx];
  return buildPresetKey(parsed.baseType, newRotation);
}

/** Get the default (first) rotation for a base type */
export function getDefaultRotation(baseType: string): number {
  const info = getBaseTypeInfo(baseType);
  return info?.rotations[0] ?? 0;
}

/** Get connection positions (center point on the edge) for given dimensions */
export function getConnectionPoints(
  key: string,
  width: number,
  height: number,
): Record<string, { x: number; y: number }> {
  const variant = resolvePreset(key);
  if (!variant) return {};

  const points: Record<string, { x: number; y: number }> = {};
  for (const side of variant.connections) {
    switch (side) {
      case 'north': points.north = { x: width / 2, y: 0 }; break;
      case 'south': points.south = { x: width / 2, y: height }; break;
      case 'east': points.east = { x: width, y: height / 2 }; break;
      case 'west': points.west = { x: 0, y: height / 2 }; break;
    }
  }
  return points;
}

/** Opposite side mapping */
export const OPPOSITE_SIDE: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** Door state colors (map visualization) */
export const DOOR_STATE_COLORS: Record<string, string> = {
  open: '#22c55e',           // green
  key_locked: '#eab308',     // yellow
  locked: '#ef4444',         // red
  inaccessible: '#6b7280',   // gray
};

/** Ordered door states for UI */
export const DOOR_STATE_ORDER = ['open', 'key_locked', 'locked', 'inaccessible'] as const;

/** Door state labels (Italian) */
export const DOOR_STATE_LABELS: Record<string, string> = {
  open: 'Sbloccata',
  key_locked: 'Chiave',
  locked: 'Bloccata',
  inaccessible: 'Inaccessibile',
};

/** Door state descriptions (Italian) — explains behavior in-game */
export const DOOR_STATE_DESCRIPTIONS: Record<string, string> = {
  open: 'Il giocatore passa direttamente alla stanza successiva senza interazioni.',
  key_locked: 'Richiede un oggetto specifico nell\'inventario. Se il giocatore non ce l\'ha, viene mostrato un messaggio.',
  locked: 'Impossibile aprire con mezzi normali. Collega un puzzle per farla risolvere al giocatore, oppure verrà sbloccata da un evento.',
  inaccessible: 'Completamente impraticabile (muro crollato, porta sigillata). Visibile sulla mappa ma inattraversabile.',
};

/** Full help text for each door state — used in the help dialog */
export const DOOR_STATE_HELP: Record<string, { title: string; description: string; icon: string }> = {
  open: {
    title: 'Sbloccata',
    icon: '🟢',
    description: 'Passaggio libero. Il giocatore attraversa la porta senza alcuna interazione.',
  },
  key_locked: {
    title: 'Chiave',
    icon: '🟡',
    description: 'La porta è chiusa a chiave. Il giocatore deve possedere un oggetto specifico (es. una chiave, una tessera) nell\'inventario per aprirla. Se non ha l\'oggetto, viene mostrato un messaggio personalizzabile.',
  },
  locked: {
    title: 'Bloccata',
    icon: '🔴',
    description: 'La porta non si apre in alcun modo normale. Può essere collegata a un puzzle che il giocatore deve risolvere (es. un codice numerico, una sequenza di frecce) per sbloccarla. Se non ha un puzzle, rimane inattraversabile finché un evento non la apre.',
  },
  inaccessible: {
    title: 'Inaccessibile',
    icon: '⬜',
    description: 'La porta è completamente impraticabile (muro crollato, porta sigillata, passaggio distrutto). È visibile sulla mappa ma il giocatore non può attraversarla in nessun caso.',
  },
};

// ───────────────────────────────────────────────────────────────
// Backward-compatible exports
// ───────────────────────────────────────────────────────────────

/**
 * @deprecated Use resolvePreset() instead
 * Legacy flat lookup: old ID → variant spec
 */
export const CORRIDOR_PRESETS: Record<string, CorridorVariant> = {};

// Populate legacy lookup
for (const [legacyId, newKey] of Object.entries(LEGACY_MAP)) {
  const variant = VARIANTS[newKey];
  if (variant) {
    CORRIDOR_PRESETS[legacyId] = {
      ...variant,
      id: legacyId,
      label: getBaseTypeInfo(parsePresetKey(newKey)?.baseType ?? '')?.label ?? '',
      description: '',
    } as any;
  }
}

/** @deprecated Use CORRIDOR_BASE_TYPES instead */
export const CORRIDOR_PRESET_LIST = Object.keys(CORRIDOR_PRESETS);

// ───────────────────────────────────────────────────────────────
// SVG helpers
// ───────────────────────────────────────────────────────────────

/** Scale SVG path from preset's default dimensions to actual room dimensions */
export function scaleCorridorPath(presetKey: string, targetW: number, targetH: number): string | null {
  const variant = resolvePreset(presetKey);
  if (!variant) return null;
  const sx = targetW / variant.defaultWidth;
  const sy = targetH / variant.defaultHeight;
  return variant.path.replace(/([\d.]+),([\d.]+)/g, (_match, x, y) => {
    return `${Math.round(Number(x) * sx)},${Math.round(Number(y) * sy)}`;
  });
}

/** Generate a mini SVG path for preview (fixed square size, centered) */
export function getPreviewPath(presetKey: string, size: number): string | null {
  const variant = resolvePreset(presetKey);
  if (!variant) return null;
  const aspectRatio = variant.defaultWidth / variant.defaultHeight;
  let drawW: number, drawH: number;
  if (aspectRatio >= 1) {
    drawW = size;
    drawH = Math.round(size / aspectRatio);
  } else {
    drawH = size;
    drawW = Math.round(size * aspectRatio);
  }
  const offsetX = Math.round((size - drawW) / 2);
  const offsetY = Math.round((size - drawH) / 2);
  const scaledPath = scaleCorridorPath(presetKey, drawW, drawH);
  if (!scaledPath) return null;
  // Translate all coordinates by the offset to center within square
  return scaledPath.replace(/([\d.]+),([\d.]+)/g, (_match, x, y) => {
    return `${Math.round(Number(x) + offsetX)},${Math.round(Number(y) + offsetY)}`;
  });
}
