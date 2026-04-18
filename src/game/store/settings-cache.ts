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
