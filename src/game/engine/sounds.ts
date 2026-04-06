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

export interface BgmLayers {
  oscillators: OscillatorNode[];
  sources: AudioBufferSourceNode[];
  gains: GainNode[];
  lfos: OscillatorNode[];
}

export class AudioEngine {
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
  public bgmLayers: BgmLayers = { oscillators: [], sources: [], gains: [], lfos: [] };
  public noiseBuffer: AudioBuffer | null = null;
  public _bgmLoaded = false;
  public _pendingBgm: string | null = null;

  public get isInitialized(): boolean { return this._initialized; }

  public ensureContext(): boolean {
    if (this._initialized && this.ctx) return true;
    if (typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
      this.masterGain.connect(this.ctx.destination);

      // BGM chain: bgmGain → masterGain
      this._bgmGain = this.ctx.createGain();
      this._bgmGain.gain.value = this.bgmVolume;
      this._bgmGain.connect(this.masterGain);
      this.bgmGain = this._bgmGain;

      // BGM mixer: bgmMixer → bgmGain (for fade in/out)
      this.bgmMixer = this.ctx.createGain();
      this.bgmMixer.gain.value = 1.0;
      this.bgmMixer.connect(this.bgmGain);

      // Noise buffer for BGM synthesis
      const len = this.ctx.sampleRate * 4;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      this._initialized = true;
      return true;
    } catch { return false; }
  }

  /** Create an LFO oscillator connected to a target AudioParam */
  public createLfo(freq: number, depth: number, target: AudioParam): OscillatorNode {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = depth;
    lfo.connect(gain);
    gain.connect(target);
    lfo.start(ctx.currentTime);
    return lfo;
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

  private async loadSfx(name: string): Promise<AudioBuffer | null> {
    if (this._cache[name]) return this._cache[name];
    if (this._loading.has(name)) return null;

    const path = SFX_FILES[name];
    if (!path) return null;

    this._loading.add(name);
    try {
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

  private async playSfx(name: string, volume = 1.0): Promise<void> {
    if (!this.ensureContext()) return;
    await this.resumePromise();
    let buf = this._cache[name];
    if (!buf) {
      buf = await this.loadSfx(name);
    }
    if (buf) {
      this.playBuffer(buf, volume);
    } else {
      // WAV not found — synthesize a short tone as fallback
      this.playFallbackTone(name, volume);
    }
  }

  /** Blocking resume that actually waits for the context to unlock */
  private async resumePromise(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }
  }

  /** Simple synthesis fallback when no WAV file is available */
  private playFallbackTone(name: string, volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      // Different tones per category
      const freqMap: Record<string, number> = {
        playAttack: 220, playRangedAttack: 330, playSpecial: 440,
        playEnemyHit: 180, playPlayerHit: 150, playMiss: 100,
        playCritical: 500, playHeal: 660, playDefend: 200,
        playZombieMoan: 80, playZombieAttack: 110, playZombieDeath: 60,
        playEncounter: 300, playVictory: 523, playDefeat: 100,
        playItemPickup: 800, playPistolShot: 600, playShotgunBlast: 400,
        playExplosion: 50,
      };
      let freq = 200;
      for (const [key, f] of Object.entries(freqMap)) {
        if (name.startsWith(key)) { freq = f; break; }
      }
      osc.type = name.includes('Death') || name.includes('Defeat') ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  // ======== PUBLIC PLAY METHODS ========
  // These map directly to the function names called from the game store.

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
    // Map enemy names to their specific attack sounds
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
    // Find matching key
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

  // Ambient sounds (longer, loopable)
  private _ambientSource: AudioBufferSourceNode | null = null;
  private _ambientGain: GainNode | null = null;
  private _currentAmbient: string | null = null;

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
    if (key) {
      const fn = this[key as keyof AudioEngine];
      if (typeof fn === 'function') (fn as () => void)();
    }
  }

  /** Preload critical SFX files so they play instantly on first use */
  public preloadCriticalSounds(): void {
    if (!this.ensureContext()) return;
    const critical = ['playAttack', 'playEnemyHit', 'playPlayerHit', 'playEncounter', 'playPistolShot', 'playZombieMoan', 'playVictory', 'playDefeat'];
    for (const name of critical) {
      this.loadSfx(name);
    }
  }
}

export const audioEngine = new AudioEngine();
export { audioEngine as audio };

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
export default audioEngine;

// BGM placeholder exports — monkey-patched by bgm.ts after lazy load
export type BgmType = 'title' | 'city_outskirts' | 'rpd_station' | 'hospital' | 'sewers' | 'laboratory' | 'clock_tower' | 'combat' | 'victory' | 'gameover';
export function playBgm(type: BgmType): void {
  if (!audioEngine._bgmLoaded) {
    audioEngine._pendingBgm = type;
    import('./bgm').catch(() => {});
    return;
  }
  if (typeof (audioEngine as Record<string, unknown>).playBgm === 'function') {
    (audioEngine as { playBgm: (t: BgmType) => void }).playBgm(type);
  }
}
export function stopBgm(): void {
  if (!audioEngine._bgmLoaded) return;
  if (typeof (audioEngine as Record<string, unknown>).stopBgm === 'function') {
    (audioEngine as { stopBgm: () => void }).stopBgm();
  }
}
