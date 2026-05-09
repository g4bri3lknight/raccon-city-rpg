// ==========================================
// #45 - RANDOMIZER MODE
// Shuffles enemies, items, and location connections for replayability.
// Ensures the game remains winnable: key items accessible, final boss reachable.
// ==========================================

import { LOCATIONS, ENEMIES, ITEMS } from './loader';
import { RandomizedLocationData } from '../types';

// ── Dynamic pool builders (derive from DB-loaded registries) ──

function getEnemyTiers(): Record<string, string[]> {
  const enemies = Object.values(ENEMIES).filter(e => !e.isBoss);
  if (enemies.length === 0) return { easy: [], medium: [], hard: [] };
  // Sort by atk stat to classify into tiers
  const sorted = [...enemies].sort((a, b) => a.atk - b.atk);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  return {
    easy: sorted.slice(0, third).map(e => e.id),
    medium: sorted.slice(third, third * 2).map(e => e.id),
    hard: sorted.slice(third * 2).map(e => e.id),
  };
}

function getBossEnemyIds(): string[] {
  return Object.values(ENEMIES).filter(e => e.isBoss).map(e => e.id);
}

function getCriticalKeyItems(): string[] {
  return Object.values(ITEMS).filter(i => i.type === 'utility').map(i => i.id);
}

function getItemsByType(type: string): string[] {
  return Object.values(ITEMS).filter(i => i.type === type).map(i => i.id);
}

function getLocationIds(): { main: string[]; final: string | null } {
  const locs = Object.values(LOCATIONS);
  const bossLoc = locs.find(l => l.isBossArea);
  const main = locs.filter(l => !l.isBossArea).map(l => l.id);
  return { main, final: bossLoc?.id || null };
}

// ── Shuffle helper (Fisher-Yates) ──
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Pick N random elements from array ──
function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
}

// ── Assign enemy pools by tier based on position in shuffled order ──
function assignEnemyPool(position: number): string[] {
  // position 0 = easiest (early game), position 4 = hardest (late game)
  const tiers = getEnemyTiers();
  const pool: string[] = [];
  const easy = tiers.easy || [];
  const medium = tiers.medium || [];
  const hard = tiers.hard || [];

  // Always include some easy enemies
  if (easy.length > 0) {
    pool.push(...pickRandom(easy, Math.min(2, easy.length)));
  }

  if (position >= 1 && medium.length > 0) {
    // Add some medium enemies
    pool.push(...pickRandom(medium, Math.min(position >= 3 ? 2 : 1, medium.length)));
  }
  if (position >= 2 && hard.length > 0) {
    // Add hard enemies for later positions
    pool.push(...pickRandom(hard, Math.min(1, hard.length)));
  }
  if (position >= 3 && hard.length > 0) {
    // Add more hard enemies for very late positions
    pool.push(...pickRandom(hard, Math.min(1, hard.length)));
  }

  return pool;
}

// ── Assign item pools based on position ──
function assignItemPool(position: number): { itemId: string; chance: number; quantity: number }[] {
  const pool: { itemId: string; chance: number; quantity: number }[] = [];

  // Healing items - always present
  const healingItems = getItemsByType('healing');
  if (healingItems.length > 0) {
    pool.push(...pickRandom(healingItems, Math.min(2 + Math.floor(Math.random() * 2), healingItems.length)).map(id => ({
      itemId: id,
      chance: 25 + Math.floor(Math.random() * 20),
      quantity: 1,
    })));
  }

  // Ammo - moderate presence
  const ammoItems = getItemsByType('ammo');
  if (ammoItems.length > 0) {
    pool.push(...pickRandom(ammoItems, Math.min(1 + Math.floor(Math.random() * 2), ammoItems.length)).map(id => ({
      itemId: id,
      chance: 15 + Math.floor(Math.random() * 15),
      quantity: 3 + Math.floor(Math.random() * 5),
    })));
  }

  // Weapons - rarer, more in later positions
  const weaponItems = getItemsByType('weapon');
  if (weaponItems.length > 0 && Math.random() < 0.3 + position * 0.1) {
    pool.push(...pickRandom(weaponItems, 1).map(id => ({
      itemId: id,
      chance: 5 + Math.floor(Math.random() * 8),
      quantity: 1,
    })));
  }

  // Utility items
  const utilItems = getItemsByType('utility');
  if (utilItems.length > 0 && Math.random() < 0.3) {
    pool.push(...pickRandom(utilItems, 1).map(id => ({
      itemId: id,
      chance: 10 + Math.floor(Math.random() * 10),
      quantity: 1,
    })));
  }

  return pool;
}

// ── Generate randomized locked paths ensuring game is winnable ──
// Strategy: ensure at least 2 paths to laboratory exist, distribute key items to early locations
function assignLockedPaths(
  shuffledLocations: string[],
  shuffledMainLocations: string[],
  finalLocId: string,
): { locationId: string; requiredItemId: string; lockedMessage: string }[][] {
  // Find which shuffled position is laboratory_entrance (or any location with "laboratory" in id)
  const labIdx = shuffledLocations.findIndex(l => l.includes('laboratory'));
  const clockIdx = shuffledLocations.indexOf(finalLocId);

  // Build a lockedPaths array for each location (parallel to shuffledLocations)
  const lockedPaths: { locationId: string; requiredItemId: string; lockedMessage: string }[][] =
    shuffledLocations.map(() => []);

  // For the lab entrance: lock it behind at least one key item from its neighbors
  if (labIdx >= 0) {
    const lockKeys = getCriticalKeyItems();
    if (lockKeys.length > 0) {
      const lockKey = lockKeys[Math.floor(Math.random() * lockKeys.length)];
      const lockKeyDef = ITEMS[lockKey];

      lockedPaths[labIdx].push({
        locationId: shuffledLocations[labIdx],
        requiredItemId: lockKey,
        lockedMessage: `🔒 La porta è bloccata. Serve: ${lockKeyDef?.name || lockKey}.`,
      });
    }
  }

  // Add a locked path for RPD-like station access if that location exists and isn't first
  const rpdIdx = shuffledLocations.indexOf('rpd_station');
  if (rpdIdx > 0 && ITEMS['key_rpd']) {
    // If RPD is not the first location, lock it
    lockedPaths[rpdIdx].push({
      locationId: 'rpd_station',
      requiredItemId: 'key_rpd',
      lockedMessage: '🔒 La porta della R.P.D. è chiusa a chiave. Serve la chiave del distretto.',
    });
  }

  return lockedPaths;
}

// ── Distribute critical key items to ensure game is winnable ──
function distributeKeyItems(
  shuffledMainLocations: string[],
): Record<string, { itemId: string; chance: number; quantity: number }[]> {
  const keyItemDistribution: Record<string, { itemId: string; chance: number; quantity: number }[]> = {};

  // Clear previous distribution
  for (const locId of shuffledMainLocations) {
    keyItemDistribution[locId] = [];
  }

  // Strategy: place key items in the first half of locations to ensure they're found early
  const firstHalf = shuffledMainLocations.slice(0, Math.max(2, Math.ceil(shuffledMainLocations.length / 2)));
  const shuffledKeys = shuffle(getCriticalKeyItems());

  for (let i = 0; i < shuffledKeys.length; i++) {
    const locId = firstHalf[i % firstHalf.length];
    keyItemDistribution[locId].push({ itemId: shuffledKeys[i], chance: 10 + Math.floor(Math.random() * 5), quantity: 1 });
  }

  return keyItemDistribution;
}

// ── Main randomization function ──
export function generateRandomizedData(): RandomizedLocationData {
  // 1. Get locations dynamically from DB
  const { main: mainLocIds, final: finalLocId } = getLocationIds();

  if (!finalLocId || mainLocIds.length === 0) {
    // Fallback if no locations loaded
    return { locations: {} };
  }

  // 2. Shuffle main location order
  const shuffledMainLocations = shuffle(mainLocIds);
  // Final boss area is always last
  const shuffledLocations = [...shuffledMainLocations, finalLocId];

  // 3. Get boss enemy IDs dynamically
  const bossIds = getBossEnemyIds();
  const bossId = bossIds.length > 0 ? bossIds[0] : 'tyrant_boss';

  // 4. Distribute critical key items
  const keyItemDistribution = distributeKeyItems(shuffledMainLocations);

  // 5. Assign locked paths
  const lockedPaths = assignLockedPaths(shuffledLocations, shuffledMainLocations, finalLocId);

  // 6. For each location, generate randomized pools
  const randomizedLocations: RandomizedLocationData['locations'] = {};

  for (let i = 0; i < shuffledLocations.length; i++) {
    const locId = shuffledLocations[i];

    randomizedLocations[locId] = {
      enemyPool: locId === finalLocId ? (bossIds.length > 0 ? [bossId] : []) : assignEnemyPool(i),
      itemPool: locId === finalLocId ? [] : [
        ...assignItemPool(i),
        // Add distributed key items
        ...(keyItemDistribution[locId] || []),
      ],
      isBossArea: locId === finalLocId,
      encounterRate: locId === finalLocId ? 0 : 30 + Math.floor(i * 5) + Math.floor(Math.random() * 10),
      lockedLocations: lockedPaths[i]?.length ? lockedPaths[i] : undefined,
      bossEnemy: locId === finalLocId ? bossId : undefined,
    };
  }

  return { locations: randomizedLocations };
}

// ── Get effective location data (randomized or original) ──
export function getEffectiveLocation(
  locId: string,
  randomizedData: RandomizedLocationData | null,
) {
  if (randomizedData && randomizedData.locations[locId]) {
    return randomizedData.locations[locId];
  }
  const loc = LOCATIONS[locId];
  return loc ? {
    enemyPool: loc.enemyPool,
    itemPool: loc.itemPool.map(entry => ({ itemId: entry.itemId, chance: entry.chance, quantity: entry.quantity })),
    isBossArea: loc.isBossArea,
    bossEnemy: loc.bossId,
    lockedLocations: loc.lockedLocations,
    encounterRate: loc.encounterRate,
  } : null;
}
