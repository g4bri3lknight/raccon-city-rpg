/**
 * Database client — delegates to the active game DB.
 *
 * All admin routes and API routes use `import { db } from '@/lib/db'`.
 * This now resolves to the active game DB (e.g. raccoon-city.db)
 * instead of the tiny custom.db which only has empty registry tables.
 *
 * For the game registry (Game / SaveGame), use `getRegistryDb()`.
 */

import { getGameDb } from '@/lib/game-db'
import { PrismaClient } from '@prisma/client'

// ── Active game DB (used by 99% of routes) ──
export const db = getGameDb()

// ── Registry DB (custom.db — Game / SaveGame only) ──
const globalForPrisma = globalThis as unknown as {
  registryDb: PrismaClient | undefined
}

export const registryDb =
  globalForPrisma.registryDb ??
  new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.registryDb = registryDb
