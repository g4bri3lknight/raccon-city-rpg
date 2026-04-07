// ==========================================
// AI-2.5 — AI Cache & Rate Limiting
// Prevents excessive LLM calls with TTL cache + per-category cooldowns
// ==========================================

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number; // ms
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;

class AICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private lastCallTime: Map<string, number> = new Map();
  private cooldowns: Map<string, number>; // category → min ms between calls

  constructor() {
    this.cooldowns = new Map([
      ['event', 60 * 1000], // 1 min between event generations
      ['document', 45 * 1000], // 45s between document generations
      ['default', 30 * 1000], // 30s default cooldown
    ]);
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      ttl,
    });
  }

  /**
   * Check if a key exists in cache (without fetching)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Check if we can make a call for this category (rate limiting)
   * Returns true if enough time has passed since last call
   */
  canCall(category: string): boolean {
    const cooldown = this.cooldowns.get(category) || this.cooldowns.get('default')!;
    const lastCall = this.lastCallTime.get(category) || 0;
    return Date.now() - lastCall >= cooldown;
  }

  /**
   * Record that a call was made for this category
   */
  recordCall(category: string): void {
    this.lastCallTime.set(category, Date.now());
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.lastCallTime.clear();
  }

  /**
   * Clear cache for a specific key prefix
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; categories: Record<string, { lastCall: number; canCall: boolean }> } {
    const categories: Record<string, { lastCall: number; canCall: boolean }> = {};
    for (const [cat] of this.cooldowns) {
      categories[cat] = {
        lastCall: this.lastCallTime.get(cat) || 0,
        canCall: this.canCall(cat),
      };
    }
    return {
      size: this.cache.size,
      categories,
    };
  }
}

// Singleton instance
export const aiCache = new AICache();

// Helper to build cache keys
export function eventCacheKey(locationId: string): string {
  return `evt:${locationId}`;
}

export function documentCacheKey(locationId: string): string {
  return `doc:${locationId}`;
}
