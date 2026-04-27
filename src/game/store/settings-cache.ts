// ── Game Settings Cache ──
// Loaded from /api/game-settings; used for configurable values like max inventory slots
const DEFAULT_GAME_SETTINGS = {
  maxInventorySlots: 12,
  maxItemBoxSlots: 48,
  startingInventorySlots: 6,
  defaultItemBoxItems: [] as { itemId: string; quantity: number }[],
};

let _gameSettingsCache: typeof DEFAULT_GAME_SETTINGS | null = null;
let _gameSettingsLoading = false;
let _gameSettingsResolveQueue: Array<() => void> = [];

/** Fetch and cache game settings from DB. Returns cached values immediately if available. */
export async function fetchGameSettings(): Promise<typeof DEFAULT_GAME_SETTINGS> {
  if (_gameSettingsCache) return _gameSettingsCache;
  if (_gameSettingsLoading) {
    // Wait for in-flight request to complete
    await new Promise<void>(resolve => _gameSettingsResolveQueue.push(resolve));
    return _gameSettingsCache ?? { ...DEFAULT_GAME_SETTINGS };
  }
  _gameSettingsLoading = true;
  try {
    const res = await fetch('/api/game-settings');
    if (res.ok) {
      const data = await res.json();
      _gameSettingsCache = {
        maxInventorySlots: parseInt(data['gameplay.maxInventorySlots']) || DEFAULT_GAME_SETTINGS.maxInventorySlots,
        maxItemBoxSlots: parseInt(data['gameplay.maxItemBoxSlots']) || DEFAULT_GAME_SETTINGS.maxItemBoxSlots,
        startingInventorySlots: parseInt(data['gameplay.startingInventorySlots']) || DEFAULT_GAME_SETTINGS.startingInventorySlots,
        defaultItemBoxItems: (() => {
          try { return JSON.parse(data['gameplay.defaultItemBoxItems'] || '[]'); } catch { return []; }
        })(),
      };
      // Apply theme settings as CSS variables
      applyThemeSettings(data);
    }
  } catch { /* fallback */ }
  finally {
    _gameSettingsLoading = false;
    // Resolve all waiting callers
    const queue = _gameSettingsResolveQueue;
    _gameSettingsResolveQueue = [];
    queue.forEach(resolve => resolve());
  }
  return _gameSettingsCache ?? { ...DEFAULT_GAME_SETTINGS };
}

/** Synchronous getter — uses cached settings, falls back to defaults */
export function getMaxInventorySlots(): number {
  return _gameSettingsCache?.maxInventorySlots ?? DEFAULT_GAME_SETTINGS.maxInventorySlots;
}
export function getMaxItemBoxSlots(): number {
  return _gameSettingsCache?.maxItemBoxSlots ?? DEFAULT_GAME_SETTINGS.maxItemBoxSlots;
}
export function getStartingInventorySlots(): number {
  return _gameSettingsCache?.startingInventorySlots ?? DEFAULT_GAME_SETTINGS.startingInventorySlots;
}
export function getDefaultItemBoxItems(): { itemId: string; quantity: number }[] {
  return _gameSettingsCache?.defaultItemBoxItems ?? DEFAULT_GAME_SETTINGS.defaultItemBoxItems;
}

export { DEFAULT_GAME_SETTINGS, _gameSettingsCache };

/** Invalidate the settings cache (used by bumpDataVersion) */
export function invalidateSettingsCache(): void {
  _gameSettingsCache = null;
}

// ── Theme Settings (CSS Variable Application) ─────────────────────

const THEME_DEFAULTS: Record<string, string> = {
  'theme.primaryColor': '#dc2626',
  'theme.secondaryColor': '#ef4444',
  'theme.accentColor': '#f87171',
  'theme.backgroundColor': '#0a0a0a',
  'theme.fontFamily': 'Courier New',
  'theme.headingWeight': 'bold',
  'theme.fontSizeScale': '1.0',
  'theme.cardStyle': 'glass',
  'theme.cardOpacity': '0.6',
  'theme.borderRadius': '12',
  'theme.borderColor': '#dc262620',
  'theme.buttonStyle': 'rounded',
  'theme.buttonVariant': 'filled',
  'theme.tableStyle': 'clean',
  'theme.hoverHighlight': 'strong',
  'theme.glowEnabled': 'true',
  'theme.glowColor': '#dc2626',
  'theme.glowIntensity': '0.6',
  'theme.scanlineEnabled': 'false',
  'theme.titleColor': '#e5e5e5',
  'theme.titleGlow': '#dc2626',
  'theme.subtitleColor': '#f87171',
};

/** Apply theme settings from a flat key-value map as CSS variables on .game-root */
export function applyThemeSettings(data?: Record<string, string>): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector('.game-root') as HTMLElement | null;
  if (!root) return;

  // If no data provided, try to fetch
  if (!data) {
    fetch('/api/game-settings')
      .then(r => r.ok ? r.json() : {})
      .then(d => applyThemeSettings(d))
      .catch(() => {});
    return;
  }

  const primary = data['theme.primaryColor'] || THEME_DEFAULTS['theme.primaryColor'];
  const secondary = data['theme.secondaryColor'] || THEME_DEFAULTS['theme.secondaryColor'];
  const accent = data['theme.accentColor'] || THEME_DEFAULTS['theme.accentColor'];
  const bg = data['theme.backgroundColor'] || THEME_DEFAULTS['theme.backgroundColor'];
  const fontFamily = data['theme.fontFamily'] || THEME_DEFAULTS['theme.fontFamily'];
  const borderRadius = data['theme.borderRadius'] || THEME_DEFAULTS['theme.borderRadius'];
  const cardOpacity = parseFloat(data['theme.cardOpacity'] || THEME_DEFAULTS['theme.cardOpacity']) || 0.6;
  const glowEnabled = data['theme.glowEnabled'] === 'true';
  const glowColor = data['theme.glowColor'] || THEME_DEFAULTS['theme.glowColor'];
  const glowIntensity = parseFloat(data['theme.glowIntensity'] || THEME_DEFAULTS['theme.glowIntensity']) || 0.3;
  const scanlineEnabled = data['theme.scanlineEnabled'] === 'true';
  const titleColor = data['theme.titleColor'] || THEME_DEFAULTS['theme.titleColor'];
  const titleGlow = data['theme.titleGlow'] || THEME_DEFAULTS['theme.titleGlow'];
  const subtitleColor = data['theme.subtitleColor'] || THEME_DEFAULTS['theme.subtitleColor'];

  root.style.setProperty('--rpg-primary', primary);
  root.style.setProperty('--rpg-secondary', secondary);
  root.style.setProperty('--rpg-accent', accent);
  root.style.setProperty('--rpg-bg', bg);
  root.style.setProperty('--rpg-font', fontFamily);
  root.style.setProperty('--rpg-radius', `${borderRadius}px`);
  root.style.setProperty('--rpg-card-opacity', String(cardOpacity));
  root.style.setProperty('--rpg-glow-color', glowColor);
  root.style.setProperty('--rpg-glow-intensity', String(glowIntensity));
  root.style.setProperty('--rpg-glow-enabled', glowEnabled ? '1' : '0');
  root.style.setProperty('--rpg-scanline-enabled', scanlineEnabled ? '1' : '0');
  root.style.setProperty('--rpg-title-color', titleColor);
  root.style.setProperty('--rpg-title-glow', titleGlow);
  root.style.setProperty('--rpg-subtitle-color', subtitleColor);

  // Apply some direct styles for background and font
  root.style.backgroundColor = bg;
  root.style.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
}
