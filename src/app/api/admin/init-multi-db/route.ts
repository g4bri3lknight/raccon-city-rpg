import { NextResponse } from 'next/server';
import { copyFileSync, existsSync, mkdirSync, writeFileSync, readFileSync, openSync, closeSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

/**
 * POST /api/admin/init-multi-db
 * 
 * One-time migration: converts single-DB setup to multi-DB
 */
export async function POST() {
  try {
    const gamesDir = join(process.cwd(), 'db', 'games');
    const customDbPath = join(process.cwd(), 'db', 'custom.db');
    const raccoonDbPath = join(gamesDir, 'raccoon-city.db');
    const activeGameFile = join(process.cwd(), 'db', '.active-game');

    // Check if already migrated
    if (existsSync(activeGameFile) && existsSync(raccoonDbPath)) {
      const activeId = existsSync(activeGameFile)
        ? readFileSync(activeGameFile, 'utf-8').trim()
        : null;
      if (activeId === 'raccoon-city') {
        return NextResponse.json({
          success: true,
          message: 'Already migrated',
          activeGame: activeId,
          skipped: true,
        });
      }
    }

    // Step 1: Create games directory
    if (!existsSync(gamesDir)) {
      mkdirSync(gamesDir, { recursive: true });
    }

    // Step 2: Copy custom.db → games/raccoon-city.db
    if (existsSync(customDbPath) && !existsSync(raccoonDbPath)) {
      copyFileSync(customDbPath, raccoonDbPath);
    } else if (!existsSync(customDbPath) && !existsSync(raccoonDbPath)) {
      const fd = openSync(raccoonDbPath, 'w');
      closeSync(fd);
    }

    // Step 3: Push schema to raccoon-city.db
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `file:${raccoonDbPath}`;
    try {
      execSync('npx prisma db push --skip-generate', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 30000,
      });
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }

    // Step 4: Create Game record in raccoon-city.db
    const raccoonClient = new PrismaClient({
      datasources: { db: { url: `file:${raccoonDbPath}` } },
    });

    const existingGame = await raccoonClient.game.findFirst();
    if (!existingGame) {
      await raccoonClient.game.create({
        data: {
          id: 'raccoon-city',
          name: 'Raccoon City',
          description: 'Resident Evil - Raccoon City Escape',
          status: 'active',
        },
      });
    }

    await raccoonClient.$disconnect();

    // Step 5: Set active game
    writeFileSync(activeGameFile, 'raccoon-city', 'utf-8');

    // Step 6: Sync custom.db for CLI compatibility
    copyFileSync(raccoonDbPath, customDbPath);

    return NextResponse.json({
      success: true,
      message: 'Multi-DB migration completed',
      activeGame: 'raccoon-city',
      steps: [
        'Created games/ directory',
        'Copied custom.db → games/raccoon-city.db',
        'Pushed schema to raccoon-city.db',
        'Created Game record',
        'Set raccoon-city as active game',
        'Synced custom.db for CLI compatibility',
      ],
    });
  } catch (error) {
    console.error('[POST /api/admin/init-multi-db]', error);
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      500
    );
  }
}

