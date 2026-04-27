/**
 * Database client — backward-compatible proxy
 * 
 * This module exports `db` which automatically routes to the
 * correct game database based on the current request context.
 * 
 * Existing code using `import { db } from '@/lib/db'` continues
 * to work without changes.
 * 
 * The active game is determined by:
 * 1. Per-request context (setRequestGame) — for concurrent API requests
 * 2. The .active-game file — persistent default
 * 3. Fallback: 'default'
 */

import { PrismaClient } from '@prisma/client';
import { getGameDb, getCurrentGameId } from './game-db';

/**
 * Proxy handler that delegates all property accesses
 * to the current game's PrismaClient instance.
 */
const proxyHandler: ProxyHandler<object> = {
  get(_target, prop, receiver) {
    // Handle special cases
    if (prop === Symbol.toPrimitive) {
      return () => '[GameDB Proxy]';
    }
    if (prop === 'then' || prop === Symbol.iterator) {
      return undefined;
    }
    
    const client = getGameDb();
    const value = Reflect.get(client, prop as keyof PrismaClient, receiver);
    
    // Bind functions to the correct client instance
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  },
  
  has(_target, prop) {
    return prop in (getGameDb() as object);
  },
  
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getGameDb(), prop);
  },
};

/**
 * The main database export — works exactly like a regular PrismaClient
 * but automatically routes to the active game's database.
 */
export const db = new Proxy({} as PrismaClient, proxyHandler) as PrismaClient;

// Re-export useful utilities
export { getGameDb, setRequestGame, clearRequestGame, getCurrentGameId, getActiveGameId, setActiveGameId } from './game-db';
export type { PrismaClient };
