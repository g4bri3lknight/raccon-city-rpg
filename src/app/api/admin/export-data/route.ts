import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function POST() {
  try {
    const [
      items,
      events,
      documents,
      quests,
      locations,
      npcs,
      characters,
      specials,
      enemies,
      enemyAbilities,
      secretRooms,
      recipes,
      settings,
      sounds,
      images,
      notifications,
    ] = await Promise.all([
      db.item.findMany({ orderBy: { createdAt: 'asc' } }),
      db.dynamicEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      db.document.findMany({ orderBy: { createdAt: 'asc' } }),
      db.sideQuest.findMany({ orderBy: { createdAt: 'asc' } }),
      db.gameLocation.findMany({ orderBy: { createdAt: 'asc' } }),
      db.gameNPC.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameCharacter.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameSpecial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameEnemy.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.gameEnemyAbility.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.secretRoom.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameRecipe.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      db.gameSetting.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.gameSound.findMany({ orderBy: { createdAt: 'asc' } }),
      db.gameImage.findMany({ orderBy: { createdAt: 'asc' } }),
      db.notificationConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    // Build game-data object, stripping BLOBs from sounds/images
    const gameData = {
      _meta: {
        version: 2,
        exportedAt: new Date().toISOString(),
        totalEntities:
          items.length +
          events.length +
          documents.length +
          quests.length +
          locations.length +
          npcs.length +
          characters.length +
          specials.length +
          enemies.length +
          enemyAbilities.length +
          secretRooms.length +
          recipes.length +
          settings.length +
          sounds.length +
          images.length +
          notifications.length,
      },
      items,
      events,
      documents,
      quests,
      locations,
      npcs,
      characters,
      specials,
      enemies,
      enemyAbilities,
      secretRooms,
      recipes,
      settings,
      notifications,
      sounds: sounds.map((s) => ({
        id: s.id,
        name: s.name,
        refKey: s.refKey,
        category: s.category,
        volume: s.volume,
        loopable: s.loopable,
        mimeType: s.mimeType,
        associatedId: s.associatedId,
        createdAt: s.createdAt,
        hasData: !!s.data,
        dataSize: s.data ? s.data.length : 0,
      })),
      images: images.map((img) => ({
        id: img.id,
        name: img.name,
        refKey: img.refKey,
        category: img.category,
        mimeType: img.mimeType,
        altText: img.altText,
        associatedId: img.associatedId,
        sortOrder: img.sortOrder,
        createdAt: img.createdAt,
        hasData: !!img.data,
        dataSize: img.data ? img.data.length : 0,
      })),
    };

    const jsonStr = JSON.stringify(gameData, null, 2);

    // Create ZIP file in public/
    const publicDir = path.join(process.cwd(), 'public');
    const zipPath = path.join(publicDir, 'raccoon-city-rpg-data.zip');

    // Remove old zip if exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.append(jsonStr, { name: 'game-data.json' });
      archive.finalize();
    });

    const stats = fs.statSync(zipPath);

    return NextResponse.json({
      success: true,
      message: 'Pacchetto generato con successo',
      file: 'public/raccoon-city-rpg-data.zip',
      sizeBytes: stats.size,
      sizeKB: Math.round((stats.size / 1024) * 100) / 100,
      entities: gameData._meta.totalEntities,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nella generazione del pacchetto' },
      { status: 500 }
    );
  }
}
