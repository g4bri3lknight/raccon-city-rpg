// ==========================================
// #45 - RANDOMIZER MODE
// Shuffles enemies, items, and location connections for replayability.
// Ensures the game remains winnable: key items accessible, final boss reachable.
// ==========================================

import { LOCATIONS } from './loader';
import { ENEMIES } from './enemies';
import { ITEMS } from './loader';
import { RandomizedLocationData } from '../types';

// ── Enemy tier definitions for balanced randomization ──
// easy: first locations, medium: mid-game, hard: late-game, boss: boss areas
const ENEMY_TIERS: Record<string, string[]> = {
  easy: ['zombie', 'zombie_female', 'zombie_doctor', 'zombie_dog'],
  medium: ['zombie_soldier', 'cerberus_alpha', 'licker', 'licker_crawler'],
  hard: ['hunter', 'licker_smasher'],
};

// Regular enemies (non-boss) organized by tier
const BOSS_ENEMIES = ['tyrant_boss', 'nemesis_boss', 'proto_tyrant'];

// Key items that MUST remain accessible for game progression
const CRITICAL_KEY_ITEMS = ['key_rpd', 'key_sewers', 'key_lab', 'crank_handle', 'fuse'];

// All non-boss, non-key item IDs for pool randomization
const UTILITY_ITEM_IDS = [
  'bandage', 'herb_green', 'herb_red', 'antidote', 'first_aid', 'spray',
  'ammo_pistol', 'ammo_shotgun', 'ammo_magnum', 'ammo_machinegun', 'ammo_grenade',
  'bag_small', 'bag_medium',
  'flashlight', 'lockpick', 'ink_ribbon',
  'pipe', 'scalpel', 'pistol', 'shotgun', 'combat_knife', 'magnum', 'machinegun', 'grenade_launcher', 'rocket_launcher',
];

// Location IDs (excluding clock_tower which is the final boss area)
const MAIN_LOCATION_IDS = [
  'city_outskirts',
  'rpd_station',
  'hospital_district',
  'sewers',
  'laboratory_entrance',
];
const FINAL_LOCATION_ID = 'clock_tower';
const ALL_LOCATION_IDS = [...MAIN_LOCATION_IDS, FINAL_LOCATION_ID];

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
  const pool: string[] = [];

  // Always include some easy enemies
  pool.push(...pickRandom(ENEMY_TIERS.easy, 2));

  if (position >= 1) {
    // Add some medium enemies
    pool.push(...pickRandom(ENEMY_TIERS.medium, position >= 3 ? 2 : 1));
  }
  if (position >= 2) {
    // Add hard enemies for later positions
    pool.push(...pickRandom(ENEMY_TIERS.hard, 1));
  }
  if (position >= 3) {
    // Add more hard enemies for very late positions
    pool.push(...pickRandom(ENEMY_TIERS.hard, 1));
  }

  return pool;
}

// ── Assign item pools based on position ──
function assignItemPool(position: number): { itemId: string; chance: number; quantity: number }[] {
  const pool: { itemId: string; chance: number; quantity: number }[] = [];

  // Healing items - always present
  const healingItems = ['bandage', 'herb_green', 'first_aid', 'spray', 'antidote'];
  pool.push(...pickRandom(healingItems, 2 + Math.floor(Math.random() * 2)).map(id => ({
    itemId: id,
    chance: 25 + Math.floor(Math.random() * 20),
    quantity: 1,
  })));

  // Ammo - moderate presence
  const ammoItems = ['ammo_pistol', 'ammo_shotgun', 'ammo_magnum', 'ammo_machinegun', 'ammo_grenade'];
  pool.push(...pickRandom(ammoItems, 1 + Math.floor(Math.random() * 2)).map(id => ({
    itemId: id,
    chance: 15 + Math.floor(Math.random() * 15),
    quantity: 3 + Math.floor(Math.random() * 5),
  })));

  // Weapons - rarer, more in later positions
  const weaponItems = ['pistol', 'shotgun', 'combat_knife', 'magnum', 'machinegun', 'grenade_launcher'];
  if (Math.random() < 0.3 + position * 0.1) {
    pool.push(...pickRandom(weaponItems, 1).map(id => ({
      itemId: id,
      chance: 5 + Math.floor(Math.random() * 8),
      quantity: 1,
    })));
  }

  // Utility items
  const utilItems = ['bag_small', 'bag_medium', 'flashlight', 'lockpick'];
  if (Math.random() < 0.3) {
    pool.push(...pickRandom(utilItems, 1).map(id => ({
      itemId: id,
      chance: 10 + Math.floor(Math.random() * 10),
      quantity: 1,
    })));
  }

  // Ink ribbon - always a small chance
  pool.push({ itemId: 'ink_ribbon', chance: 15 + Math.floor(Math.random() * 10), quantity: 1 });

  // Rocket launcher - very rare, only in late positions
  if (position >= 3 && Math.random() < 0.15) {
    pool.push({ itemId: 'rocket_launcher', chance: 5, quantity: 1 });
  }

  // Herb red - moderate chance
  if (Math.random() < 0.4 + position * 0.1) {
    pool.push({ itemId: 'herb_red', chance: 15 + Math.floor(Math.random() * 10), quantity: 1 });
  }

  return pool;
}

// ── Generate randomized locked paths ensuring game is winnable ──
// Strategy: ensure at least 2 paths to laboratory exist, distribute key items to early locations
function assignLockedPaths(
  shuffledLocations: string[],
  shuffledMainLocations: string[],
): { locationId: string; requiredItemId: string; lockedMessage: string }[][] {
  // Find which shuffled position is laboratory_entrance
  const labIdx = shuffledLocations.indexOf('laboratory_entrance');
  const clockIdx = shuffledLocations.indexOf(FINAL_LOCATION_ID);

  // Build a lockedPaths array for each location (parallel to shuffledLocations)
  const lockedPaths: { locationId: string; requiredItemId: string; lockedMessage: string }[][] =
    shuffledLocations.map(() => []);

  // The final location (clock_tower) has no locked paths
  // For the lab entrance: lock it behind at least one key item from its neighbors
  if (labIdx >= 0) {
    // Pick a key item to lock the lab
    const lockKeys = ['key_lab', 'crank_handle', 'fuse'];
    const lockKey = lockKeys[Math.floor(Math.random() * lockKeys.length)];
    const lockKeyDef = ITEMS[lockKey];

    lockedPaths[labIdx].push({
      locationId: shuffledLocations[labIdx],
      requiredItemId: lockKey,
      lockedMessage: `🔒 La porta è bloccata. Serve: ${lockKeyDef?.name || lockKey}.`,
    });
  }

  // Add a locked path for RPD access (key_rpd)
  const rpdIdx = shuffledLocations.indexOf('rpd_station');
  if (rpdIdx > 0) {
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

  // Place key_rpd in the first 2 locations (or RPD itself if accessible)
  // Place key_sewers somewhere accessible
  // Place key_lab, crank_handle, fuse in locations BEFORE the lab

  // Strategy: place key items in the first half of locations to ensure they're found early
  const firstHalf = shuffledMainLocations.slice(0, Math.max(2, Math.ceil(shuffledMainLocations.length / 2)));
  const shuffledKeys = shuffle(CRITICAL_KEY_ITEMS);

  for (let i = 0; i < shuffledKeys.length; i++) {
    const locId = firstHalf[i % firstHalf.length];
    keyItemDistribution[locId].push({ itemId: shuffledKeys[i], chance: 10 + Math.floor(Math.random() * 5), quantity: 1 });
  }

  return keyItemDistribution;
}

// ── Build connections between shuffled locations ensuring the graph is connected ──
function buildConnections(
  shuffledLocations: string[],
): Record<string, string[]> {
  const connections: Record<string, string[]> = {};

  // Strategy: create a linear path (chain) plus some cross-connections for variety
  // This guarantees reachability from start to end
  for (let i = 0; i < shuffledLocations.length; i++) {
    connections[shuffledLocations[i]] = [];

    // Forward connection (to next location in chain)
    if (i + 1 < shuffledLocations.length) {
      connections[shuffledLocations[i]].push(shuffledLocations[i + 1]);
    }

    // Backward connection (from previous location)
    if (i - 1 >= 0) {
      // Only add backward connection if not already added by the previous location's forward
      if (!connections[shuffledLocations[i]].includes(shuffledLocations[i - 1])) {
        connections[shuffledLocations[i]].push(shuffledLocations[i - 1]);
      }
    }
  }

  // Add some extra cross-connections for exploration variety (skip connections)
  for (let i = 0; i < shuffledLocations.length - 2; i++) {
    if (Math.random() < 0.4) {
      const targetIdx = i + 2;
      if (targetIdx < shuffledLocations.length) {
        if (!connections[shuffledLocations[i]].includes(shuffledLocations[targetIdx])) {
          connections[shuffledLocations[i]].push(shuffledLocations[targetIdx]);
          connections[shuffledLocations[targetIdx]].push(shuffledLocations[i]);
        }
      }
    }
  }

  // Final boss area has no outgoing connections
  connections[FINAL_LOCATION_ID] = [];

  return connections;
}

// ── Main randomization function ──
export function generateRandomizedData(): RandomizedLocationData {
  // 1. Shuffle main location order
  const shuffledMainLocations = shuffle(MAIN_LOCATION_IDS);
  // Clock tower is always last (final boss area)
  const shuffledLocations = [...shuffledMainLocations, FINAL_LOCATION_ID];

  // 2. Build connections (ensuring connected graph)
  const connections = buildConnections(shuffledLocations);

  // 3. Distribute critical key items
  const keyItemDistribution = distributeKeyItems(shuffledMainLocations);

  // 4. Assign locked paths
  const lockedPaths = assignLockedPaths(shuffledLocations, shuffledMainLocations);

  // 5. For each location, generate randomized pools
  const randomizedLocations: RandomizedLocationData['locations'] = {};

  for (let i = 0; i < shuffledLocations.length; i++) {
    const locId = shuffledLocations[i];
    const originalLoc = LOCATIONS[locId];

    randomizedLocations[locId] = {
      enemyPool: locId === FINAL_LOCATION_ID ? ['tyrant_boss'] : assignEnemyPool(i),
      itemPool: locId === FINAL_LOCATION_ID ? [] : [
        ...assignItemPool(i),
        // Add distributed key items
        ...(keyItemDistribution[locId] || []),
      ],
      nextLocations: connections[locId] || [],
      isBossArea: locId === FINAL_LOCATION_ID,
      encounterRate: locId === FINAL_LOCATION_ID ? 0 : 30 + Math.floor(i * 5) + Math.floor(Math.random() * 10),
      lockedLocations: lockedPaths[i]?.length ? lockedPaths[i] : undefined,
      bossEnemy: locId === FINAL_LOCATION_ID ? 'tyrant_boss' : undefined,
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
    nextLocations: loc.nextLocations,
    isBossArea: loc.isBossArea,
    bossEnemy: loc.bossId,
    lockedLocations: loc.lockedLocations,
    encounterRate: loc.encounterRate,
  } : null;
}
