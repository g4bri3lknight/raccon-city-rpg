/**
 * Editor DB — PrismaClient for the main editor database (custom.db).
 *
 * This is the ONLY client that should be used for editor-level operations:
 * - Game registry (list/create/update/delete games metadata)
 * - Cover images for game cards
 *
 * Game data (items, enemies, locations, etc.) uses the per-game DB via game-db.ts.
 */

import { PrismaClient } from '@prisma/client';

const EDITOR_DB_URL = process.env.DATABASE_URL || 'file:./db/custom.db';

let _editorClient: PrismaClient | null = null;

/**
 * Get the editor database client (custom.db).
 * Reuses a singleton instance across all requests.
 */
export function getEditorDb(): PrismaClient {
  if (!_editorClient) {
    _editorClient = new PrismaClient({
      datasources: {
        db: { url: EDITOR_DB_URL },
      },
      log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : [],
    });
  }
  return _editorClient;
}

/**
 * Reset the editor DB client singleton.
 * Call this when a query fails due to a stale/broken connection.
 * The next call to getEditorDb() will create a fresh client.
 */
export function resetEditorDb(): void {
  if (_editorClient) {
    _editorClient.$disconnect().catch(() => {
      // ignore — connection may already be dead
    });
    _editorClient = null;
  }
}
