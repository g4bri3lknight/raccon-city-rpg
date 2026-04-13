import { ItemDefinition } from '../types';
export type { ItemDefinition } from '../types';

// Static data has been moved to src/seed-data/items.ts for seed routes.
// At runtime, items are loaded from DB via loader.ts → /api/game-data.

/** Create an item instance from the DB-loaded ITEMS map in loader.ts */
export function createItemInstance(
  getItems: () => Record<string, ItemDefinition>,
  itemId: string,
  quantity: number = 1
): ItemDefinition & { uid: string; quantity: number } {
  const items = getItems();
  const def = items[itemId];
  if (!def) throw new Error(`Item ${itemId} not found in loaded items`);
  return {
    ...def,
    uid: `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity,
  };
}
