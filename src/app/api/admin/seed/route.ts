import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SOUND_SEEDS = [
  // Combat SFX
  { id: 'sfx_attack', name: 'Attacco corpo a corpo', refKey: 'playAttack', filePath: '/audio/attack.wav', category: 'combat', volume: 0.7, loopable: false },
  { id: 'sfx_ranged_attack', name: 'Attacco a distanza', refKey: 'playRangedAttack', filePath: '/audio/ranged_attack.wav', category: 'combat', volume: 0.7, loopable: false },
  { id: 'sfx_special_attack', name: 'Attacco speciale', refKey: 'playSpecial', filePath: '/audio/special_attack.wav', category: 'combat', volume: 0.8, loopable: false },
  { id: 'sfx_defend', name: 'Difesa', refKey: 'playDefend', filePath: '/audio/defend.wav', category: 'combat', volume: 0.6, loopable: false },
  { id: 'sfx_enemy_hit', name: 'Colpo nemico', refKey: 'playEnemyHit', filePath: '/audio/enemy_hit.wav', category: 'combat', volume: 0.7, loopable: false },
  { id: 'sfx_player_hit', name: 'Colpo giocatore', refKey: 'playPlayerHit', filePath: '/audio/player_hit.wav', category: 'combat', volume: 0.7, loopable: false },
  { id: 'sfx_miss', name: 'Mancato', refKey: 'playMiss', filePath: '/audio/miss.wav', category: 'combat', volume: 0.4, loopable: false },
  { id: 'sfx_critical', name: 'Critico', refKey: 'playCritical', filePath: '/audio/critical.wav', category: 'combat', volume: 0.8, loopable: false },
  { id: 'sfx_heal', name: 'Cura', refKey: 'playHeal', filePath: '/audio/heal.wav', category: 'combat', volume: 0.7, loopable: false },
  { id: 'sfx_poison_tick', name: 'Danno veleno', refKey: 'playPoisonTick', filePath: '/audio/poison_tick.wav', category: 'combat', volume: 0.4, loopable: false },
  { id: 'sfx_bleed_tick', name: 'Sanguinamento', refKey: 'playBleedTick', filePath: '/audio/bleed_tick.wav', category: 'combat', volume: 0.3, loopable: false },
  { id: 'sfx_explosion', name: 'Esplosione', refKey: 'playExplosion', filePath: '/audio/explosion.wav', category: 'combat', volume: 0.9, loopable: false },
  { id: 'sfx_taunt', name: 'Provocazione', refKey: 'playTaunt', filePath: '/audio/taunt.wav', category: 'combat', volume: 0.5, loopable: false },
  // Enemy SFX
  { id: 'sfx_zombie_moan', name: 'Lamento zombie', refKey: 'playZombieMoan', filePath: '/audio/zombie_moan.wav', category: 'enemy', volume: 0.5, loopable: false },
  { id: 'sfx_zombie_attack', name: 'Attacco zombie', refKey: 'playZombieAttack', filePath: '/audio/zombie_attack.wav', category: 'enemy', volume: 0.6, loopable: false },
  { id: 'sfx_zombie_death', name: 'Morte zombie', refKey: 'playZombieDeath', filePath: '/audio/zombie_death.wav', category: 'enemy', volume: 0.6, loopable: false },
  { id: 'sfx_cerberus_attack', name: 'Attacco Cerbero', refKey: 'playCerberusAttack', filePath: '/audio/cerberus_attack.wav', category: 'enemy', volume: 0.6, loopable: false },
  { id: 'sfx_cerberus_death', name: 'Morte Cerbero', refKey: 'playCerberusDeath', filePath: '/audio/cerberus_death.wav', category: 'enemy', volume: 0.5, loopable: false },
  { id: 'sfx_licker_attack', name: 'Attacco Licker', refKey: 'playLickerAttack', filePath: '/audio/licker_attack.wav', category: 'enemy', volume: 0.6, loopable: false },
  { id: 'sfx_licker_death', name: 'Morte Licker', refKey: 'playLickerDeath', filePath: '/audio/licker_death.wav', category: 'enemy', volume: 0.5, loopable: false },
  { id: 'sfx_hunter_attack', name: 'Attacco Hunter', refKey: 'playHunterAttack', filePath: '/audio/hunter_attack.wav', category: 'enemy', volume: 0.7, loopable: false },
  { id: 'sfx_hunter_death', name: 'Morte Hunter', refKey: 'playHunterDeath', filePath: '/audio/hunter_death.wav', category: 'enemy', volume: 0.6, loopable: false },
  { id: 'sfx_tyrant_attack', name: 'Attacco Tyrant', refKey: 'playTyrantAttack', filePath: '/audio/tyrant_attack.wav', category: 'enemy', volume: 0.8, loopable: false },
  { id: 'sfx_nemesis_attack', name: 'Attacco Nemesis', refKey: 'playNemesisAttack', filePath: '/audio/nemesis_attack.wav', category: 'enemy', volume: 0.8, loopable: false },
  { id: 'sfx_enemy_death', name: 'Morte nemico generico', refKey: 'playEnemyDeath', filePath: '/audio/enemy_death.wav', category: 'enemy', volume: 0.6, loopable: false },
  // Weapon SFX
  { id: 'sfx_pistol_shot', name: 'Colpo pistola', refKey: 'playPistolShot', filePath: '/audio/pistol_shot.wav', category: 'weapon', volume: 0.8, loopable: false },
  { id: 'sfx_shotgun_blast', name: 'Colpo fucile', refKey: 'playShotgunBlast', filePath: '/audio/shotgun_blast.wav', category: 'weapon', volume: 0.9, loopable: false },
  { id: 'sfx_magnum_shot', name: 'Colpo magnum', refKey: 'playMagnumShot', filePath: '/audio/magnum_shot.wav', category: 'weapon', volume: 0.9, loopable: false },
  // UI SFX
  { id: 'sfx_encounter', name: 'Incontro', refKey: 'playEncounter', filePath: '/audio/encounter.wav', category: 'ui', volume: 0.7, loopable: false },
  { id: 'sfx_victory', name: 'Vittoria', refKey: 'playVictory', filePath: '/audio/victory.wav', category: 'ui', volume: 0.8, loopable: false },
  { id: 'sfx_gameover', name: 'Game Over', refKey: 'playDefeat', filePath: '/audio/gameover.wav', category: 'ui', volume: 0.8, loopable: false },
  { id: 'sfx_item_pickup', name: 'Raccolta oggetto', refKey: 'playItemPickup', filePath: '/audio/item_pickup.wav', category: 'ui', volume: 0.6, loopable: false },
  { id: 'sfx_menu_open', name: 'Apri menu', refKey: 'playMenuOpen', filePath: '/audio/menu_open.wav', category: 'ui', volume: 0.4, loopable: false },
  { id: 'sfx_menu_close', name: 'Chiudi menu', refKey: 'playMenuClose', filePath: '/audio/menu_close.wav', category: 'ui', volume: 0.3, loopable: false },
  { id: 'sfx_notification', name: 'Notifica', refKey: 'playNotification', filePath: '/audio/notification.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_level_up', name: 'Level Up', refKey: 'playLevelUp', filePath: '/audio/level_up.wav', category: 'ui', volume: 0.7, loopable: false },
  { id: 'sfx_document_found', name: 'Documento trovato', refKey: 'playDocumentFound', filePath: '/audio/document_found.wav', category: 'ui', volume: 0.6, loopable: false },
  { id: 'sfx_npc_encounter', name: 'Incontro NPC', refKey: 'playNPCEncounter', filePath: '/audio/npc_encounter.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_puzzle_fail', name: 'Puzzle fallito', refKey: 'playPuzzleFail', filePath: '/audio/puzzle_fail.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_puzzle_success', name: 'Puzzle risolto', refKey: 'playPuzzleSuccess', filePath: '/audio/puzzle_success.wav', category: 'ui', volume: 0.7, loopable: false },
  { id: 'sfx_achievement', name: 'Achievement', refKey: 'playAchievement', filePath: '/audio/achievement.wav', category: 'ui', volume: 0.7, loopable: false },
  { id: 'sfx_map_open', name: 'Apri mappa', refKey: 'playMapOpen', filePath: '/audio/map_open.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_transfer', name: 'Trasferimento', refKey: 'playTransfer', filePath: '/audio/transfer.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_travel', name: 'Viaggio', refKey: 'playTravel', filePath: '/audio/travel.wav', category: 'ui', volume: 0.5, loopable: false },
  { id: 'sfx_search', name: 'Ricerca', refKey: 'playSearch', filePath: '/audio/search.wav', category: 'ui', volume: 0.5, loopable: false },
  // Ambient
  { id: 'ambient_city', name: 'Ambiente Città', refKey: 'ambient_city', filePath: '/audio/ambient_city.wav', category: 'ambient', volume: 0.5, loopable: false },
  { id: 'ambient_rpd', name: 'Ambiente RPD', refKey: 'ambient_rpd', filePath: '/audio/ambient_rpd.wav', category: 'ambient', volume: 0.5, loopable: false },
  { id: 'ambient_hospital', name: 'Ambiente Ospedale', refKey: 'ambient_hospital', filePath: '/audio/ambient_hospital.wav', category: 'ambient', volume: 0.5, loopable: false },
  { id: 'ambient_sewers', name: 'Ambiente Fogne', refKey: 'ambient_sewers', filePath: '/audio/ambient_sewers.wav', category: 'ambient', volume: 0.5, loopable: false },
  { id: 'ambient_laboratory', name: 'Ambiente Lab', refKey: 'ambient_laboratory', filePath: '/audio/ambient_laboratory.wav', category: 'ambient', volume: 0.5, loopable: false },
  { id: 'ambient_clocktower', name: 'Ambiente Torre', refKey: 'ambient_clocktower', filePath: '/audio/ambient_clocktower.wav', category: 'ambient', volume: 0.5, loopable: false },
  // BGM
  { id: 'bgm_title', name: 'BGM Titolo', refKey: 'bgm_title', filePath: '/audio/bgm_title.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_city', name: 'BGM Città', refKey: 'bgm_city', filePath: '/audio/bgm_city.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_rpd', name: 'BGM RPD', refKey: 'bgm_rpd', filePath: '/audio/bgm_rpd.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_hospital', name: 'BGM Ospedale', refKey: 'bgm_hospital', filePath: '/audio/bgm_hospital.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_sewers', name: 'BGM Fogne', refKey: 'bgm_sewers', filePath: '/audio/bgm_sewers.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_lab', name: 'BGM Laboratorio', refKey: 'bgm_lab', filePath: '/audio/bgm_lab.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_clocktower', name: 'BGM Torre', refKey: 'bgm_clocktower', filePath: '/audio/bgm_clocktower.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_combat', name: 'BGM Combattimento', refKey: 'bgm_combat', filePath: '/audio/bgm_combat.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_gameover', name: 'BGM Game Over', refKey: 'bgm_gameover', filePath: '/audio/bgm_gameover.mp3', category: 'bgm', volume: 0.15, loopable: true },
  { id: 'bgm_victory', name: 'BGM Vittoria', refKey: 'bgm_victory', filePath: '/audio/bgm_victory.mp3', category: 'bgm', volume: 0.15, loopable: true },
];

export async function POST() {
  try {
    // Drop and re-seed
    await db.gameSound.deleteMany();
    let created = 0;
    for (const sound of SOUND_SEEDS) {
      await db.gameSound.create({ data: sound });
      created++;
    }
    return NextResponse.json({ success: true, created, total: SOUND_SEEDS.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
