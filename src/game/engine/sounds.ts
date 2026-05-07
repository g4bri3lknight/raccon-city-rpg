// RPG Game Engine — Audio Engine (DB-only)
// Plays audio files loaded exclusively from the database.
// If no audio is found in the DB, no sound is played (no fallback, no synthesized audio).
//
// Entity-specific sounds (auto-matched by ID, uploaded in their respective admin sections):
//   - Enemy deaths:     death_{definitionId}       → uploaded in Enemies tab
//   - Special abilities: sfx_special_{specialId}   → uploaded in Specials tab
//   - Enemy abilities:  sfx_eability_{abilityId}   → uploaded in Enemy Abilities tab
//   - Boss phases:      sfx_boss_phase_{phaseId}   → uploaded in Boss Phases tab
//   - Location ambient: ambient_{locationId}       → uploaded in Locations tab
//   - Item SFX:         sfx_{itemId}               → uploaded in Items tab
//   - Quest complete:   sfx_quest_{questId}        → uploaded in Quests tab
//   - Event trigger:    sfx_event_{eventId}         → uploaded in Events tab
//   - Notification SFX: notif_sfx_{notifId}        → uploaded in Notifications tab
//   - Item pickup/uso:  sfx_{itemId}               → uploaded in Items tab
//
// Global BGM (uploaded in Impostazioni tab):
//   - bgm_title     → uploaded in Schermata Iniziale
//   - bgm_combat    → uploaded in Impostazioni → Audio Combattimento
//   - bgm_gameover  → uploaded in Impostazioni → Audio Combattimento
//   - bgm_victory   → uploaded in Impostazioni → Audio Combattimento
//
// Generic SFX method playSfx(refKey): plays any DB-loaded sound by refKey.
// Used internally for entity-specific sounds and notification audio.
//
// Cache invalidation: admin uploads dispatch a 'sound-updated' window event
// with { refKey } detail. The engine invalidates the corresponding cache entry
// so the next play fetches the fresh audio from the DB.

/**
 * Simple LRU (Least Recently Used) cache.
 */
class LruCache<V> {
  private _map: Map<string, V>;
  private readonly _maxSize: number;

  constructor(maxSize: number) {
    this._map = new Map();
    this._maxSize = maxSize;
  }

  get(key: string): V | undefined {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key)!;
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._maxSize) {
      const oldestKey = this._map.keys().next().value;
      if (oldestKey !== undefined) {
        this._map.delete(oldestKey);
      }
    }
    this._map.set(key, value);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  delete(key: string): boolean {
    return this._map.delete(key);
  }
}

// BGM ref-key mapping: game state → database sound reference
// Location ambient sounds are handled by playLocationAmbient() — NOT by playBgm().
// playBgm() is only used for non-location game states (title, combat, gameover, victory).
const BGM_REF_KEYS: Record<string, string> = {
  title: 'bgm_title',
  combat: 'bgm_combat',
  gameover: 'bgm_gameover',
  victory: 'bgm_victory',
};

class AudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  private _masterVolume = 0.5;
  private _muted = false;
  private _initialized = false;
  // LRU cache for decoded SFX buffers — max 50 entries
  private _cache: LruCache<AudioBuffer> = new LruCache<AudioBuffer>(50);
  private _loading: Set<string> = new Set();
  // SFX gain node — independent from master, controlled by sfxVolume slider
  private _sfxGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  private _sfxVolume = 0.5;
  // BGM gain node — independent from master and SFX, controlled by bgmVolume slider
  private _bgmGain: GainNode | null = null;
  public bgmGain: GainNode | null = null;
  private _bgmVolumeVal = 0.5;
  public currentBgm: string | null = null;
  public bgmTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Ambient sound tracking (stopable source)
  private _ambientSource: AudioBufferSourceNode | null = null;
  private _ambientGainNode: GainNode | null = null;
  private _currentAmbientRef: string | null = null;
  private _ambientSuspended = false;

  constructor() {
    // Listen for admin sound uploads — invalidate cache so fresh audio is fetched
    if (typeof window !== 'undefined') {
      window.addEventListener('sound-updated', ((e: CustomEvent) => {
        const refKey = e.detail?.refKey;
        if (refKey) this.invalidateSound(refKey);
      }) as EventListener);
    }
  }

  public ensureContext(): boolean {
    if (this._initialized && this.ctx) return true;
    if (typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this._sfxGain = this.ctx.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this.masterGain);
      this.sfxGain = this._sfxGain;
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

  public get sfxVolume(): number { return this._sfxVolume; }

  public set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this._sfxGain) this._sfxGain.gain.value = this._muted ? 0 : this._sfxVolume;
  }

  public get volume(): number { return this._masterVolume; }

  public set volume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && !this._muted) this.masterGain.gain.value = this._masterVolume;
  }

  public set bgmVolume(v: number) {
    this._bgmVolumeVal = Math.max(0, Math.min(1, v));
    if (this._bgmGain) this._bgmGain.gain.value = this._muted ? 0 : this._bgmVolumeVal;
  }

  public get bgmVolume(): number { return this._bgmVolumeVal; }

  // ======== ASYNC SFX LOADING ========

  private async loadSfx(name: string): Promise<AudioBuffer | null> {
    const cached = this._cache.get(name);
    if (cached) return cached;
    if (this._loading.has(name)) return null;

    this._loading.add(name);
    try {
      const dbResp = await fetch(`/api/media/sound?ref=${encodeURIComponent(name)}`, { cache: 'no-store' });
      if (dbResp.ok) {
        const arrayBuf = await dbResp.arrayBuffer();
        const audioBuf = await this.ctx!.decodeAudioData(arrayBuf);
        this._cache.set(name, audioBuf);
        return audioBuf;
      }
      return null;
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
      gain.connect(this._sfxGain!);
      source.start(0);
    } catch {}
  }

  // ======== GENERIC SFX ========
  // Plays a generic sound effect by refKey. Fetches from DB; if not found, silently does nothing.

  /** Play a generic SFX by refKey — e.g. sfx_encounter, sfx_victory, sfx_heal */
  playSfx(refKey: string, volume = 0.5): void {
    if (!this.ensureContext()) return;
    this.resume();

    if (this._cache.has(refKey)) {
      this.playBuffer(this._cache.get(refKey)!, volume);
      return;
    }

    this.loadSfx(refKey).then(audioBuf => {
      if (audioBuf) this.playBuffer(audioBuf, volume);
    });
  }

  // ======== ENTITY-SPECIFIC PLAY METHODS ========
  // These look up dynamic refKeys based on entity IDs uploaded via admin.

  /** Play entity-specific enemy death sound — refKey: death_{enemyId} */
  playEntityEnemyDeath(enemyId: string): void {
    const entityRefKey = `death_${enemyId}`;
    if (!this.ensureContext()) return;
    this.resume();

    if (this._cache.has(entityRefKey)) {
      this.playBuffer(this._cache.get(entityRefKey)!, 0.6);
      return;
    }
    this.loadSfx(entityRefKey).then(audioBuf => {
      if (audioBuf) this.playBuffer(audioBuf, 0.6);
    });
  }

  /** Play entity-specific special ability sound — refKey: sfx_special_{specialId} */
  playEntitySpecial(specialId: string, _category: string): void {
    const entityRefKey = `sfx_special_${specialId}`;
    if (!this.ensureContext()) return;
    this.resume();

    if (this._cache.has(entityRefKey)) {
      this.playBuffer(this._cache.get(entityRefKey)!, 0.8);
      return;
    }
    this.loadSfx(entityRefKey).then(audioBuf => {
      if (audioBuf) this.playBuffer(audioBuf, 0.8);
    });
  }

  /** Play entity-specific enemy ability sound — refKey: sfx_eability_{abilityId} */
  playEntityEnemyAbility(abilityId: string): void {
    const entityRefKey = `sfx_eability_${abilityId}`;
    if (!this.ensureContext()) return;
    this.resume();

    if (this._cache.has(entityRefKey)) {
      this.playBuffer(this._cache.get(entityRefKey)!, 0.7);
      return;
    }
    this.loadSfx(entityRefKey).then(audioBuf => {
      if (audioBuf) this.playBuffer(audioBuf, 0.7);
    });
  }

  /** Play entity-specific boss phase transition sound — refKey: sfx_boss_phase_{phaseId} */
  playEntityBossPhase(phaseId: string): void {
    const entityRefKey = `sfx_boss_phase_${phaseId}`;
    if (!this.ensureContext()) return;
    this.resume();

    if (this._cache.has(entityRefKey)) {
      this.playBuffer(this._cache.get(entityRefKey)!, 0.9);
      return;
    }
    this.loadSfx(entityRefKey).then(audioBuf => {
      if (audioBuf) this.playBuffer(audioBuf, 0.9);
    });
  }

  // ======== AMBIENT SOUND SYSTEM ========

  /** Play entity-specific location ambient — refKey: ambient_{locationId} */
  playLocationAmbient(locationId: string): void {
    const entityRefKey = `ambient_${locationId}`;

    if (this._currentAmbientRef === entityRefKey && this._ambientSource) {
      if (this._ambientSuspended && this._ambientGainNode) {
        this._ambientSuspended = false;
        this._ambientGainNode.gain.value = 0.25;
      }
      return;
    }

    this._stopAmbientSource();

    this._currentAmbientRef = entityRefKey;
    this._ambientSuspended = false;

    if (!this.ensureContext()) return;
    this.resume();

    this.loadSfx(entityRefKey).then(audioBuf => {
      if (!audioBuf || !this.ctx || this._currentAmbientRef !== entityRefKey) return;

      this.stopBgm();

      try {
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuf;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.25;
        source.connect(gain);
        this._ensureBgmGain();
        gain.connect(this._bgmGain!);
        source.start(0);

        this._ambientSource = source;
        this._ambientGainNode = gain;

        source.onended = () => {
          if (this._ambientSource === source) {
            this._ambientSource = null;
          }
        };
      } catch {}
    });
  }

  /** Play safe room ambient — refKey: ambient_{locationId}_safe (per-location customizable) */
  playSafeRoomAmbient(locationId: string): void {
    const safeRef = `ambient_${locationId}_safe`;

    if (this._currentAmbientRef === safeRef && this._ambientSource) {
      if (this._ambientSuspended && this._ambientGainNode) {
        this._ambientSuspended = false;
        this._ambientGainNode.gain.value = 0.25;
      }
      return;
    }

    this._stopAmbientSource();

    this._currentAmbientRef = safeRef;
    this._ambientSuspended = false;

    if (!this.ensureContext()) return;
    this.resume();

    this.loadSfx(safeRef).then(audioBuf => {
      if (!audioBuf || !this.ctx || this._currentAmbientRef !== safeRef) return;

      this.stopBgm();

      try {
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuf;
        source.loop = true;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.25;
        source.connect(gain);
        this._ensureBgmGain();
        gain.connect(this._bgmGain!);
        source.start(0);
        this._ambientSource = source;
        this._ambientGainNode = gain;
        source.onended = () => {
          if (this._ambientSource === source) this._ambientSource = null;
        };
      } catch {}
    });
  }

  stopSafeRoomAmbient(): void {
    this._stopAmbientSource();
  }

  private _suspendAmbient(): void {
    if (this._ambientGainNode && this._ambientSource) {
      try {
        const t = this.ctx!.currentTime;
        this._ambientGainNode.gain.setValueAtTime(this._ambientGainNode.gain.value, t);
        this._ambientGainNode.gain.linearRampToValueAtTime(0, t + 0.3);
      } catch {}
      this._ambientSuspended = true;
    }
  }

  /** Resume ambient after combat — called externally when leaving combat phase */
  public resumeAmbient(): void {
    this._resumeAmbient();
  }

  private _resumeAmbient(): void {
    if (this._ambientSuspended && this._ambientGainNode && this._ambientSource) {
      try {
        const t = this.ctx!.currentTime;
        this._ambientGainNode.gain.setValueAtTime(this._ambientGainNode.gain.value, t);
        this._ambientGainNode.gain.linearRampToValueAtTime(0.25, t + 0.5);
      } catch {}
      this._ambientSuspended = false;
    }
  }

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

  private _ensureBgmGain(): void {
    if (!this._bgmGain && this.ctx) {
      this._bgmGain = this.ctx.createGain();
      this._bgmGain.gain.value = this.bgmVolume;
      this._bgmGain.connect(this.masterGain!);
      this.bgmGain = this._bgmGain;
    }
  }

  private _bgmCache: LruCache<AudioBuffer> = new LruCache<AudioBuffer>(10);

  playBgm(type: string): void {
    if (!this.ensureContext()) return;
    this.resume();

    if (this.currentBgm === type && this._bgmSource) return;

    this.stopBgm();

    // Suspend location ambient during combat and gameover
    if (type === 'combat' || type === 'gameover') {
      this._suspendAmbient();
    }

    const refKey = BGM_REF_KEYS[type];
    if (!refKey) return;

    this.currentBgm = type;

    this._ensureBgmGain();
    this._bgmGain!.gain.value = this.bgmVolume;

    const cachedBgm = this._bgmCache.get(type);
    if (cachedBgm) {
      this._bgmAudioBuffer = cachedBgm;
      this._playBgmLoop();
      return;
    }

    const loadBgm = async (): Promise<AudioBuffer | null> => {
      try {
        const dbResp = await fetch(`/api/media/sound?ref=${encodeURIComponent(refKey)}`, { cache: 'no-store' });
        if (dbResp.ok) {
          const arrayBuf = await dbResp.arrayBuffer();
          return await this.ctx!.decodeAudioData(arrayBuf);
        }
      } catch {}
      return null;
    };

    loadBgm().then(audioBuf => {
      if (!audioBuf) return;
      if (this.currentBgm !== type) return;
      this._bgmAudioBuffer = audioBuf;
      this._bgmCache.set(type, audioBuf);
      this._playBgmLoop();
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

  // ======== CACHE INVALIDATION ========

  invalidateSound(refKey: string): void {
    this._cache.delete(refKey);
    this._loading.delete(refKey);
    for (const [bgmType, bgmRefKey] of Object.entries(BGM_REF_KEYS)) {
      if (bgmRefKey === refKey) {
        this._bgmCache.delete(bgmType);
        if (this.currentBgm === bgmType) {
          this.stopBgm();
          this.playBgm(bgmType);
        }
        break;
      }
    }
    if (this._currentAmbientRef === refKey) {
      const savedRef = this._currentAmbientRef;
      this._stopAmbientSource();
      // Handle both ambient_{locationId} and ambient_{locationId}_safe patterns
      const isSafeRoom = savedRef.endsWith('_safe');
      const locationId = isSafeRoom
        ? savedRef.replace(/^ambient_/, '').replace(/_safe$/, '')
        : savedRef.replace(/^ambient_/, '');
      if (locationId) {
        if (isSafeRoom) {
          this.playSafeRoomAmbient(locationId);
        } else {
          this.playLocationAmbient(locationId);
        }
      }
    }
  }

  invalidateAllSounds(): void {
    this._cache = new LruCache<AudioBuffer>(50);
    this._bgmCache = new LruCache<AudioBuffer>(10);
    this._loading.clear();
  }

  /** Stop ALL audio — BGM, ambient, any playing sources. Used when exiting the game. */
  stopAll(): void {
    this.stopBgm();
    this._stopAmbientSource();
    // Also stop any playing SFX by closing and recreating the audio context
    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch {}
      this._initialized = false;
      this.ctx = null;
      this.masterGain = null;
      this._bgmGain = null;
      this._sfxGain = null;
      this.sfxGain = null;
    }
  }
}

export const audio = new AudioEngine();
export const audioEngine = audio;

// ── Standalone exports (only entity-specific + BGM + ambient) ──

export function playLocationAmbient(locationId: string): void { audioEngine.playLocationAmbient(locationId); }
export function playSafeRoomAmbient(locationId: string): void { audioEngine.playSafeRoomAmbient(locationId); }
export function stopSafeRoomAmbient(): void { audioEngine.stopSafeRoomAmbient(); }
export function playEntityEnemyDeath(enemyId: string): void { audioEngine.playEntityEnemyDeath(enemyId); }
export function playEntitySpecial(specialId: string, category: string): void { audioEngine.playEntitySpecial(specialId, category); }
export function playEntityEnemyAbility(abilityId: string): void { audioEngine.playEntityEnemyAbility(abilityId); }
export function playEntityBossPhase(phaseId: string): void { audioEngine.playEntityBossPhase(phaseId); }

// ── Generic SFX (notification sounds, UI sounds, etc.) ──

/** Play a generic SFX by refKey — e.g. playSfx('sfx_encounter'), playSfx('sfx_victory') */
export function playSfx(refKey: string, volume?: number): void { audioEngine.playSfx(refKey, volume); }

export type BgmType = 'title' | 'combat' | 'gameover' | 'victory';

export function playBgm(type: BgmType | string): void { audio.playBgm(type); }
export function stopBgm(): void { audio.stopBgm(); }
export function stopAllSounds(): void { audio.stopAll(); }
export function resumeAmbient(): void { audio.resumeAmbient(); }

/** Dispatch a sound-updated event to invalidate engine caches. Call after admin upload. */
export function notifySoundUpdated(refKey: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sound-updated', { detail: { refKey } }));
  }
}

export default audioEngine;
