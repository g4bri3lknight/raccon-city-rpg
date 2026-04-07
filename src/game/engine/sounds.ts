// Raccoon City RPG — Audio Engine (WAV-based)
// Plays pre-generated realistic WAV files instead of real-time synthesis.
// Falls back to simple tone if WAV fails to load.

interface SfxCache {
  [key: string]: AudioBuffer | null;
}

const SFX_FILES: Record<string, string> = {
  // Combat - Player
  playAttack: '/audio/attack.wav',
  playRangedAttack: '/audio/ranged_attack.wav',
  playSpecial: '/audio/special_attack.wav',
  playDefend: '/audio/defend.wav',
  // Combat - Damage
  playEnemyHit: '/audio/enemy_hit.wav',
  playPlayerHit: '/audio/player_hit.wav',
  playMiss: '/audio/miss.wav',
  playCritical: '/audio/critical.wav',
  playHeal: '/audio/heal.wav',
  playPoisonTick: '/audio/poison_tick.wav',
  playBleedTick: '/audio/bleed_tick.wav',
  playExplosion: '/audio/explosion.wav',
  playTaunt: '/audio/taunt.wav',
  // Zombies
  playZombieMoan: '/audio/zombie_moan.wav',
  playZombieAttack: '/audio/zombie_attack.wav',
  playZombieDeath: '/audio/zombie_death.wav',
  // Enemies
  playCerberusAttack: '/audio/cerberus_attack.wav',
  playCerberusDeath: '/audio/cerberus_death.wav',
  playLickerAttack: '/audio/licker_attack.wav',
  playLickerDeath: '/audio/licker_death.wav',
  playHunterAttack: '/audio/hunter_attack.wav',
  playHunterDeath: '/audio/hunter_death.wav',
  playTyrantAttack: '/audio/tyrant_attack.wav',
  playNemesisAttack: '/audio/nemesis_attack.wav',
  playEnemyDeath: '/audio/enemy_death.wav',
  // Weapons
  playPistolShot: '/audio/pistol_shot.wav',
  playShotgunBlast: '/audio/shotgun_blast.wav',
  playMagnumShot: '/audio/magnum_shot.wav',
  // UI & Events
  playEncounter: '/audio/encounter.wav',
  playVictory: '/audio/victory.wav',
  playDefeat: '/audio/gameover.wav',
  playItemPickup: '/audio/item_pickup.wav',
  playMenuOpen: '/audio/menu_open.wav',
  playMenuClose: '/audio/menu_close.wav',
  playNotification: '/audio/notification.wav',
  playLevelUp: '/audio/level_up.wav',
  playDocumentFound: '/audio/document_found.wav',
  playNPCEncounter: '/audio/npc_encounter.wav',
  playPuzzleFail: '/audio/puzzle_fail.wav',
  playPuzzleSuccess: '/audio/puzzle_success.wav',
  playAchievement: '/audio/achievement.wav',
  playMapOpen: '/audio/map_open.wav',
  playTransfer: '/audio/transfer.wav',
  playTravel: '/audio/travel.wav',
  playSearch: '/audio/search.wav',
  // Ambient
  playAmbientCity: '/audio/ambient_city.wav',
  playAmbientRPD: '/audio/ambient_rpd.wav',
  playAmbientHospital: '/audio/ambient_hospital.wav',
  playAmbientSewers: '/audio/ambient_sewers.wav',
  playAmbientLaboratory: '/audio/ambient_laboratory.wav',
  playAmbientClockTower: '/audio/ambient_clocktower.wav',
};

// Sounds that are preloaded on first user interaction (most critical)
const PRELOAD_KEYS = [
  'playAttack', 'playEnemyHit', 'playPlayerHit', 'playMiss',
  'playEncounter', 'playVictory', 'playDefeat', 'playPistolShot',
  'playShotgunBlast', 'playZombieAttack', 'playZombieDeath',
  'playItemPickup', 'playMenuOpen', 'playMenuClose',
];

class AudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  private _masterVolume = 0.5;
  private _muted = false;
  private _initialized = false;
  private _cache: SfxCache = {};
  private _loading: Set<string> = new Set();
  private _bgmGain: GainNode | null = null;
  public bgmGain: GainNode | null = null;
  public bgmVolume = 0.15;
  public bgmMixer: GainNode | null = null;
  public currentBgm: string | null = null;
  public bgmTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Ambient sound tracking (stopable source)
  private _ambientSource: AudioBufferSourceNode | null = null;
  private _ambientGainNode: GainNode | null = null;
  private _currentAmbientRef: string | null = null;
  private _ambientSuspended = false;

  // Preload state
  private _preloaded = false;

  public ensureContext(): boolean {
    if (this._initialized && this.ctx) return true;
    if (typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
      return true;
    } catch { return false; }
  }

  public resume(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  public get muted(): boolean { return this._muted; }

  public set muted(v: boolean) {
    this._muted = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._masterVolume;
  }

  public get volume(): number { return this._masterVolume; }

  public set volume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && !this._muted) this.masterGain.gain.value = this._masterVolume;
  }

  // ======== ASYNC SFX LOADING (plays immediately after load) ========

  private async loadSfx(name: string): Promise<AudioBuffer | null> {
    if (this._cache[name]) return this._cache[name];
    if (this._loading.has(name)) return null;

    this._loading.add(name);
    try {
      // 1) Try DB BLOB first (uploaded via Admin Panel)
      try {
        const dbResp = await fetch(`/api/media/sound?ref=${encodeURIComponent(name)}`);
        if (dbResp.ok) {
          const arrayBuf = await dbResp.arrayBuffer();
          const audioBuf = await this.ctx!.decodeAudioData(arrayBuf);
          this._cache[name] = audioBuf;
          return audioBuf;
        }
      } catch {}

      // 2) Fallback to file on disk
      const path = SFX_FILES[name];
      if (!path) return null;

      const resp = await fetch(path);
      if (!resp.ok) return null;
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this.ctx!.decodeAudioData(arrayBuf);
      this._cache[name] = audioBuf;
      return audioBuf;
    } catch {
      return null;
    } finally {
      this._loading.delete(name);
    }
  }

  private playBuffer(audioBuf: AudioBuffer, volume = 1.0): void {
    if (!this.ctx) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuf;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.masterGain!);
      source.start(0);
    } catch {}
  }

  /**
   * Play an SFX — loads asynchronously if not cached, then plays immediately.
   * This fixes the bug where first-time sounds were silent.
   */
  private playSfx(name: string, volume = 1.0): void {
    if (!this.ensureContext()) return;
    this.resume();

    const cached = this._cache[name];
    if (cached) {
      // Already cached — play immediately
      this.playBuffer(cached, volume);
    } else {
      // Not cached — load then play
      this.loadSfx(name).then(audioBuf => {
        if (audioBuf) this.playBuffer(audioBuf, volume);
      });
    }
  }

  // ======== PRELOADING ========

  /**
   * Preload critical sounds in the background so they're ready instantly.
   * Call this once on first user interaction.
   */
  public preloadCriticalSounds(): void {
    if (this._preloaded || !this.ensureContext()) return;
    this._preloaded = true;
    this.resume();

    for (const key of PRELOAD_KEYS) {
      this.loadSfx(key); // fire-and-forget, will cache for later use
    }
  }

  // ======== PUBLIC PLAY METHODS ========

  playAttack(): void { this.playSfx('playAttack', 0.7); }
  playRangedAttack(): void { this.playSfx('playRangedAttack', 0.7); }
  playSpecial(): void { this.playSfx('playSpecial', 0.8); }

  playPistolShot(): void { this.playSfx('playPistolShot', 0.8); }
  playShotgunBlast(): void { this.playSfx('playShotgunBlast', 0.9); }
  playMagnumShot(): void { this.playSfx('playMagnumShot', 0.9); }

  playEnemyHit(): void { this.playSfx('playEnemyHit', 0.7); }
  playPlayerHit(): void { this.playSfx('playPlayerHit', 0.7); }
  playMiss(): void { this.playSfx('playMiss', 0.4); }
  playCritical(): void { this.playSfx('playCritical', 0.8); }
  playDefend(): void { this.playSfx('playDefend', 0.6); }
  playHeal(): void { this.playSfx('playHeal', 0.7); }
  playPoisonTick(): void { this.playSfx('playPoisonTick', 0.4); }
  playBleedTick(): void { this.playSfx('playBleedTick', 0.3); }
  playExplosion(): void { this.playSfx('playExplosion', 0.9); }
  playTaunt(): void { this.playSfx('playTaunt', 0.5); }

  playZombieMoan(): void { this.playSfx('playZombieMoan', 0.5); }
  playZombieAttack(): void { this.playSfx('playZombieAttack', 0.6); }
  playZombieDeath(): void { this.playSfx('playZombieDeath', 0.6); }

  playCerberusAttack(): void { this.playSfx('playCerberusAttack', 0.6); }
  playCerberusDeath(): void { this.playSfx('playCerberusDeath', 0.5); }
  playLickerAttack(): void { this.playSfx('playLickerAttack', 0.6); }
  playLickerDeath(): void { this.playSfx('playLickerDeath', 0.5); }
  playHunterAttack(): void { this.playSfx('playHunterAttack', 0.7); }
  playHunterDeath(): void { this.playSfx('playHunterDeath', 0.6); }
  playTyrantAttack(): void { this.playSfx('playTyrantAttack', 0.8); }
  playNemesisAttack(action?: string): void { this.playSfx('playNemesisAttack', 0.8); }
  playEnemyDeath(): void { this.playSfx('playEnemyDeath', 0.6); }

  playEnemyAttack(enemyName: string, action?: string): void {
    const map: Record<string, string> = {
      'zombie': 'playZombieAttack',
      'zombie_soldier': 'playZombieAttack',
      'cerberus': 'playCerberusAttack',
      'licker': 'playLickerAttack',
      'hunter': 'playHunterAttack',
      'tyrant_boss': 'playTyrantAttack',
      'proto_tyrant': 'playTyrantAttack',
      'nemesis_boss': 'playNemesisAttack',
    };
    const key = Object.entries(map).find(([k]) => enemyName.includes(k));
    if (key) {
      const fn = this[key[1] as keyof AudioEngine];
      if (typeof fn === 'function') (fn as () => void)();
    } else {
      this.playAttack();
    }
  }

  playEncounter(): void { this.playSfx('playEncounter', 0.7); }
  playVictory(): void { this.playSfx('playVictory', 0.8); }
  playDefeat(): void { this.playSfx('playDefeat', 0.8); }
  playItemPickup(): void { this.playSfx('playItemPickup', 0.6); }
  playMenuOpen(): void { this.playSfx('playMenuOpen', 0.4); }
  playMenuClose(): void { this.playSfx('playMenuClose', 0.3); }
  playNotification(): void { this.playSfx('playNotification', 0.5); }
  playLevelUp(): void { this.playSfx('playLevelUp', 0.7); }
  playDocumentFound(): void { this.playSfx('playDocumentFound', 0.6); }
  playNPCEncounter(): void { this.playSfx('playNPCEncounter', 0.5); }
  playPuzzleFail(): void { this.playSfx('playPuzzleFail', 0.5); }
  playPuzzleSuccess(): void { this.playSfx('playPuzzleSuccess', 0.7); }
  playAchievement(): void { this.playSfx('playAchievement', 0.7); }
  playMapOpen(): void { this.playSfx('playMapOpen', 0.5); }
  playTransfer(): void { this.playSfx('playTransfer', 0.5); }
  playTravel(): void { this.playSfx('playTravel', 0.5); }
  playSearch(): void { this.playSfx('playSearch', 0.5); }

  // ======== AMBIENT SOUND SYSTEM ========
  // Ambient sounds use a dedicated stopable source with a gain node.
  // They are automatically suspended during combat and resumed after.

  playLocationAmbient(locationId: string): void {
    const map: Record<string, string> = {
      'city_outskirts': 'playAmbientCity',
      'rpd_station': 'playAmbientRPD',
      'hospital_district': 'playAmbientHospital',
      'sewers': 'playAmbientSewers',
      'laboratory_entrance': 'playAmbientLaboratory',
      'clock_tower': 'playAmbientClockTower',
    };
    const key = map[locationId];
    if (!key) return;

    // Don't restart if same ambient is playing (or suspended)
    if (this._currentAmbientRef === key && this._ambientSource) {
      // If ambient was suspended (combat ended), resume it
      if (this._ambientSuspended && this._ambientGainNode) {
        this._ambientSuspended = false;
        this._ambientGainNode.gain.value = 0.25;
      }
      return;
    }

    // Stop any previous ambient
    this._stopAmbientSource();

    this._currentAmbientRef = key;
    this._ambientSuspended = false;

    if (!this.ensureContext()) return;
    this.resume();

    // Load ambient asynchronously then play with looping
    this.loadSfx(key).then(audioBuf => {
      if (!audioBuf || !this.ctx || this._currentAmbientRef !== key) return;

      try {
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuf;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.25; // ambient volume (lower than SFX)
        source.connect(gain);
        gain.connect(this.masterGain!);
        source.start(0);

        this._ambientSource = source;
        this._ambientGainNode = gain;

        // Clean up reference when source ends unexpectedly
        source.onended = () => {
          if (this._ambientSource === source) {
            this._ambientSource = null;
          }
        };
      } catch {}
    });
  }

  /** Suspend ambient sound (called when combat starts) */
  private _suspendAmbient(): void {
    if (this._ambientGainNode && this._ambientSource) {
      // Fade out over 300ms then suspend
      try {
        this._ambientGainNode.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
      } catch {}
      this._ambientSuspended = true;
    }
  }

  /** Resume ambient sound (called when combat ends) */
  private _resumeAmbient(): void {
    if (this._ambientSuspended && this._ambientGainNode && this._ambientSource) {
      try {
        this._ambientGainNode.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + 0.5);
      } catch {}
      this._ambientSuspended = false;
    }
  }

  /** Stop ambient sound completely */
  private _stopAmbientSource(): void {
    try {
      if (this._ambientSource) {
        this._ambientSource.stop();
        this._ambientSource.disconnect();
        this._ambientSource = null;
      }
    } catch {}
    if (this._ambientGainNode) {
      this._ambientGainNode.disconnect();
      this._ambientGainNode = null;
    }
    this._currentAmbientRef = null;
    this._ambientSuspended = false;
  }

  // ======== BGM SYSTEM ========
  private _bgmSource: AudioBufferSourceNode | null = null;
  private _bgmAudioBuffer: AudioBuffer | null = null;

  // BGM cache (tracks loaded via DB/file, reused across play calls)
  private _bgmCache: Record<string, AudioBuffer> = {};

  playBgm(type: string): void {
    if (!this.ensureContext()) return;
    this.resume();

    // Don't restart if same BGM is already playing
    if (this.currentBgm === type && this._bgmSource) return;

    // Stop current BGM
    this.stopBgm();

    // Suspend/resume ambient based on BGM type
    if (type === 'combat' || type === 'gameover') {
      this._suspendAmbient();
    } else {
      this._resumeAmbient();
    }

    // BGM file mapping (fallback if DB BLOB is not available)
    const bgmFiles: Record<string, string> = {
      title: '/audio/bgm_title.wav',
      city_outskirts: '/audio/bgm_city.wav',
      rpd_station: '/audio/bgm_rpd.wav',
      hospital: '/audio/bgm_hospital.wav',
      sewers: '/audio/bgm_sewers.wav',
      laboratory: '/audio/bgm_lab.wav',
      clock_tower: '/audio/bgm_clocktower.wav',
      combat: '/audio/bgm_combat.wav',
      gameover: '/audio/bgm_gameover.wav',
      victory: '/audio/bgm_victory.wav',
    };

    // BGM refKey mapping (used for DB lookup)
    const bgmRefKeys: Record<string, string> = {
      title: 'bgm_title',
      city_outskirts: 'bgm_city',
      rpd_station: 'bgm_rpd',
      hospital: 'bgm_hospital',
      sewers: 'bgm_sewers',
      laboratory: 'bgm_lab',
      clock_tower: 'bgm_clocktower',
      combat: 'bgm_combat',
      gameover: 'bgm_gameover',
      victory: 'bgm_victory',
    };

    const file = bgmFiles[type];
    const refKey = bgmRefKeys[type];
    if (!file && !refKey) return;

    this.currentBgm = type;

    // Create gain node for BGM
    if (!this._bgmGain) {
      this._bgmGain = this.ctx!.createGain();
      this._bgmGain.gain.value = this.bgmVolume;
      this._bgmGain.connect(this.masterGain!);
      this.bgmGain = this._bgmGain;
    }
    this._bgmGain.gain.value = this.bgmVolume;

    // Check BGM cache first
    if (this._bgmCache[type]) {
      this._bgmAudioBuffer = this._bgmCache[type];
      this._playBgmLoop();
      return;
    }

    // Load BGM async (DB first, then file fallback)
    const loadBgm = async (): Promise<AudioBuffer> => {
      // 1) Try DB
      if (refKey) {
        try {
          const dbResp = await fetch(`/api/media/sound?ref=${encodeURIComponent(refKey)}`);
          if (dbResp.ok) {
            const arrayBuf = await dbResp.arrayBuffer();
            return await this.ctx!.decodeAudioData(arrayBuf);
          }
        } catch {}
      }
      // 2) Fallback to file
      if (file) {
        const resp = await fetch(file);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          return await this.ctx!.decodeAudioData(arrayBuf);
        }
      }
      throw new Error('BGM not available');
    };

    loadBgm()
      .then(audioBuf => {
        if (this.currentBgm !== type) return; // BGM changed while loading
        this._bgmAudioBuffer = audioBuf;
        this._bgmCache[type] = audioBuf; // cache for next time
        this._playBgmLoop();
      })
      .catch(() => {
        // BGM not available — silent fallback
      });
  }

  private _playBgmLoop(): void {
    if (!this.ctx || !this._bgmAudioBuffer || !this._bgmGain) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this._bgmAudioBuffer;
      source.loop = true;
      source.connect(this._bgmGain);
      source.start(0);
      this._bgmSource = source;
    } catch {}
  }

  stopBgm(): void {
    try {
      if (this._bgmSource) {
        this._bgmSource.stop();
        this._bgmSource.disconnect();
        this._bgmSource = null;
      }
    } catch {}
    if (this.bgmTimeoutId) {
      clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
    this.currentBgm = null;
    this._bgmAudioBuffer = null;
  }
}

export const audio = new AudioEngine();
export const audioEngine = audio;

// Backward-compatible standalone exports for the game store
export function playLocationAmbient(locationId: string): void { audioEngine.playLocationAmbient(locationId); }
export function playTravel(): void { audioEngine.playTravel(); }
export function playSearch(): void { audioEngine.playSearch(); }
export function playLevelUp(): void { audioEngine.playLevelUp(); }
export function playEncounter(): void { audioEngine.playEncounter(); }
export function playVictory(): void { audioEngine.playVictory(); }
export function playDefeat(): void { audioEngine.playDefeat(); }
export function playDocumentFound(): void { audioEngine.playDocumentFound(); }
export function playNPCEncounter(): void { audioEngine.playNPCEncounter(); }
export function playPuzzleFail(): void { audioEngine.playPuzzleFail(); }
export function playPuzzleSuccess(): void { audioEngine.playPuzzleSuccess(); }
export function playAchievement(): void { audioEngine.playAchievement(); }
export function playItemPickup(): void { audioEngine.playItemPickup(); }
export function playMenuOpen(): void { audioEngine.playMenuOpen(); }
export function playMenuClose(): void { audioEngine.playMenuClose(); }
export function playEnemyAttack(enemyName: string, action?: string): void { audioEngine.playEnemyAttack(enemyName, action); }
export function playEnemyDeath(): void { audioEngine.playEnemyDeath(); }
export function playZombieMoan(): void { audioEngine.playZombieMoan(); }
export type BgmType = 'title' | 'city_outskirts' | 'rpd_station' | 'hospital' | 'sewers' | 'laboratory' | 'clock_tower' | 'combat' | 'gameover' | 'victory';

export function playBgm(type: BgmType | string): void { audio.playBgm(type); }
export function stopBgm(): void { audio.stopBgm(); }
export function preloadCriticalSounds(): void { audio.preloadCriticalSounds(); }

export default audioEngine;
