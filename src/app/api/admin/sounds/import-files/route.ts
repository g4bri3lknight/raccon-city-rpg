import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const AUDIO_DIR = join(process.cwd(), 'public', 'audio');

const MIME_MAP: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
};

// Mapping from filename (without extension) → refKey
// This connects disk filenames to the internal engine sound keys
const FILE_TO_REFKEY: Record<string, string> = {
  // SFX - Combat Player
  attack: 'playAttack',
  ranged_attack: 'playRangedAttack',
  special_attack: 'playSpecial',
  defend: 'playDefend',
  // SFX - Damage
  enemy_hit: 'playEnemyHit',
  player_hit: 'playPlayerHit',
  miss: 'playMiss',
  critical: 'playCritical',
  // SFX - Healing & Status
  heal: 'playHeal',
  poison_tick: 'playPoisonTick',
  bleed_tick: 'playBleedTick',
  explosion: 'playExplosion',
  // SFX - Zombies
  zombie_moan: 'playZombieMoan',
  zombie_attack: 'playZombieAttack',
  zombie_death: 'playZombieDeath',
  // SFX - Enemies
  cerberus_attack: 'playCerberusAttack',
  cerberus_death: 'playCerberusDeath',
  licker_attack: 'playLickerAttack',
  licker_death: 'playLickerDeath',
  hunter_attack: 'playHunterAttack',
  hunter_death: 'playHunterDeath',
  tyrant_attack: 'playTyrantAttack',
  nemesis_attack: 'playNemesisAttack',
  enemy_death: 'playEnemyDeath',
  // SFX - Weapons
  pistol_shot: 'playPistolShot',
  shotgun_blast: 'playShotgunBlast',
  magnum_shot: 'playMagnumShot',
  // SFX - UI & Events
  encounter: 'playEncounter',
  victory: 'playVictory',
  gameover: 'playDefeat',
  item_pickup: 'playItemPickup',
  menu_open: 'playMenuOpen',
  menu_close: 'playMenuClose',
  notification: 'playNotification',
  level_up: 'playLevelUp',
  document_found: 'playDocumentFound',
  npc_encounter: 'playNPCEncounter',
  puzzle_fail: 'playPuzzleFail',
  puzzle_success: 'playPuzzleSuccess',
  achievement: 'playAchievement',
  map_open: 'playMapOpen',
  transfer: 'playTransfer',
  travel: 'playTravel',
  search: 'playSearch',
  taunt: 'playTaunt',
  // Ambient
  ambient_city: 'playAmbientCity',
  ambient_rpd: 'playAmbientRPD',
  ambient_hospital: 'playAmbientHospital',
  ambient_sewers: 'playAmbientSewers',
  ambient_laboratory: 'playAmbientLaboratory',
  ambient_clocktower: 'playAmbientClockTower',
  // BGM (may not exist on disk)
  bgm_title: 'bgm_title',
  bgm_city: 'bgm_city',
  bgm_rpd: 'bgm_rpd',
  bgm_hospital: 'bgm_hospital',
  bgm_sewers: 'bgm_sewers',
  bgm_lab: 'bgm_lab',
  bgm_clocktower: 'bgm_clocktower',
  bgm_combat: 'bgm_combat',
  bgm_gameover: 'bgm_gameover',
  bgm_victory: 'bgm_victory',
};

// Category mapping based on refKey prefix
function getCategory(refKey: string): string {
  if (refKey.startsWith('playAmbient')) return 'ambient';
  if (refKey.startsWith('playZombie') || refKey.startsWith('playCerberus') ||
      refKey.startsWith('playLicker') || refKey.startsWith('playHunter') ||
      refKey.startsWith('playTyrant') || refKey.startsWith('playNemesis') ||
      refKey === 'playEnemyDeath') return 'enemy';
  if (refKey.startsWith('playPistol') || refKey.startsWith('playShotgun') || refKey.startsWith('playMagnum')) return 'weapon';
  if (refKey.startsWith('playAttack') || refKey.startsWith('playRanged') || refKey.startsWith('playSpecial') ||
      refKey.startsWith('playDefend') || refKey.startsWith('playEnemyHit') || refKey.startsWith('playPlayerHit') ||
      refKey.startsWith('playMiss') || refKey.startsWith('playCritical') || refKey.startsWith('playHeal') ||
      refKey.startsWith('playPoison') || refKey.startsWith('playBleed') || refKey.startsWith('playExplosion') ||
      refKey.startsWith('playTaunt')) return 'combat';
  if (refKey.startsWith('bgm_')) return 'bgm';
  return 'ui';
}

function getMime(ext: string): string {
  return MIME_MAP[ext] || 'audio/wav';
}

export async function POST() {
  try {
    const files = await readdir(AUDIO_DIR);
    const audioFiles = files.filter(f => /\.(wav|mp3|ogg|flac)$/i.test(f));

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of audioFiles) {
      const ext = file.split('.').pop()!.toLowerCase();
      const baseName = file.replace(/\.[^.]+$/, '');
      const refKey = FILE_TO_REFKEY[baseName];
      const mimeType = getMime(ext);

      const fileBuffer = await readFile(join(AUDIO_DIR, file));
      const data = Buffer.from(fileBuffer);

      try {
        if (refKey) {
          // Try to find existing record by refKey
          const existing = await db.gameSound.findUnique({ where: { refKey } });
          if (existing) {
            await db.gameSound.update({
              where: { id: existing.id },
              data: { data, mimeType, filePath: `/audio/${file}` },
            });
            updated++;
          } else {
            // Create new record with refKey
            await db.gameSound.create({
              data: {
                id: `audio_${baseName}`,
                name: baseName,
                refKey,
                category: getCategory(refKey),
                volume: 1.0,
                loopable: refKey.startsWith('playAmbient') || refKey.startsWith('bgm_'),
                data,
                mimeType,
                filePath: `/audio/${file}`,
              },
            });
            imported++;
          }
        } else {
          // No refKey mapping — create record without refKey
          const existingByName = await db.gameSound.findFirst({ where: { name: baseName } });
          if (existingByName) {
            await db.gameSound.update({
              where: { id: existingByName.id },
              data: { data, mimeType, filePath: `/audio/${file}` },
            });
            updated++;
          } else {
            await db.gameSound.create({
              data: {
                id: `audio_${baseName}`,
                name: baseName,
                category: getCategory(baseName),
                volume: 1.0,
                loopable: baseName.startsWith('ambient'),
                data,
                mimeType,
                filePath: `/audio/${file}`,
              },
            });
            imported++;
          }
        }
      } catch (err) {
        errors.push(`${file}: ${err}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      filesScanned: audioFiles.length,
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET returns current status
export async function GET() {
  try {
    const all = await db.gameSound.findMany({
      select: { id: true, refKey: true, name: true, category: true, mimeType: true },
      orderBy: { createdAt: 'asc' },
    });

    // Check which have BLOB data (can't select data directly, use a raw query approach)
    const withBlob = await db.gameSound.count({ where: { data: { not: null } } });
    const withoutBlob = await db.gameSound.count({ where: { data: null } });

    return NextResponse.json({
      total: all.length,
      withBlob,
      withoutBlob,
      sounds: all,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
