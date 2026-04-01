// Raccoon City RPG — Dark Horror Audio Engine (Web Audio API)
// BGM lazy-loaded from bgm.ts via dynamic import

type BgmType = 'title' | 'city_outskirts' | 'rpd_station' | 'hospital' | 'sewers' | 'laboratory' | 'clock_tower' | 'combat' | 'victory' | 'gameover';

interface BgmLayer {
  oscillators: OscillatorNode[];
  sources: AudioBufferSourceNode[];
  gains: GainNode[];
  lfos: OscillatorNode[];
}

class AudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  private _masterVolume = 0.5;
  private _muted = false;
  public noiseBuffer: AudioBuffer | null = null;
  private _initialized = false;
  public bgmGain: GainNode | null = null;
  public bgmMixer: GainNode | null = null;
  public bgmVolume = 0.15;
  public currentBgm: BgmType | null = null;
  public bgmLayers: BgmLayer = { oscillators: [], sources: [], gains: [], lfos: [] };
  public bgmTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _bgmLoaded = false;
  private _pendingBgm: BgmType | null = null;

  public ensureContext(): boolean {
    if (this._initialized && this.ctx) return true;
    if (typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this.bgmMixer = this.ctx.createGain();
      this.bgmMixer.gain.value = 1.0;
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmMixer.connect(this.bgmGain);
      this.bgmGain.connect(this.masterGain);
      this.noiseBuffer = this.makeNoise(10);
      this._initialized = true;
      return true;
    } catch { return false; }
  }

  public resume(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private env(peak: number, atk: number, dec: number, t: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    return g;
  }

  private envASR(peak: number, sus: number, atk: number, susEnd: number, rel: number, t: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.setValueAtTime(Math.max(0.001, sus), t + susEnd);
    g.gain.exponentialRampToValueAtTime(0.001, t + rel);
    return g;
  }

  private flt(type: BiquadFilterType, freq: number, q?: number): BiquadFilterNode {
    const f = this.ctx!.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  private nz(ft: BiquadFilterType, ff: number, fq: number, dur: number, vol: number, t: number, dest: AudioNode): void {
    const ctx = this.ctx!, src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.flt(ft, ff, fq), e = this.env(vol, dur * 0.02, dur, t);
    src.connect(f); f.connect(e); e.connect(dest);
    src.start(t); src.stop(t + dur + 0.05);
  }

  public createLfo(freq: number, depth: number, param: AudioParam): OscillatorNode {
    const ctx = this.ctx!, lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = depth;
    lfo.connect(g); g.connect(param);
    lfo.start(ctx.currentTime);
    return lfo;
  }

  private now(): number { return this.ctx!.currentTime; }
  public master(): AudioNode { return this.masterGain!; }

  private init(): { ctx: AudioContext; t: number; d: AudioNode } | null {
    if (!this.ensureContext() || !this.resume()) return null;
    return { ctx: this.ctx!, t: this.now(), d: this.master() };
  }

  // -- Horror SFX --

  playAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 1200, 2.5, 0.12, 0.28, t, d);
      this.nz('bandpass', 400, 1.8, 0.10, 0.22, t, d);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(25, t + 0.15);
      const e = this.env(0.35, 0.008, 0.14, t);
      o.connect(e); e.connect(d); o.start(t); o.stop(t + 0.18);
    } catch {}
  }

  playRangedAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const cr = ctx.createBufferSource(); cr.buffer = this.noiseBuffer;
      const hp = this.flt('highpass', 3500, 1.2), ce = this.env(0.35, 0.003, 0.06, t);
      cr.connect(hp); hp.connect(ce); ce.connect(d);
      cr.start(t); cr.stop(t + 0.08);
      this.nz('bandpass', 2000, 0.8, 0.15, 0.08, t + 0.04, d);
      const rn = ctx.createOscillator(); rn.type = 'triangle';
      rn.frequency.setValueAtTime(1800, t);
      rn.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      const rb = this.flt('bandpass', 1200, 8), re = this.env(0.06, 0.005, 0.18, t + 0.02);
      rn.connect(rb); rb.connect(re); re.connect(d);
      rn.start(t + 0.02); rn.stop(t + 0.22);
    } catch {}
  }

  playEnemyHit(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 900, 1.5, 0.10, 0.22, t, d);
      this.nz('lowpass', 500, 2.0, 0.14, 0.12, t + 0.02, d);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(65, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.14);
      const e = this.env(0.2, 0.01, 0.14, t);
      o.connect(e); e.connect(d); o.start(t); o.stop(t + 0.18);
    } catch {}
  }

  playPlayerHit(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 600, 1.2, 0.12, 0.25, t, d);
      const th = ctx.createOscillator(); th.type = 'sine';
      th.frequency.setValueAtTime(80, t);
      th.frequency.exponentialRampToValueAtTime(35, t + 0.18);
      const te = this.env(0.3, 0.005, 0.2, t);
      th.connect(te); te.connect(d); th.start(t); th.stop(t + 0.22);
      const ds = ctx.createOscillator(); ds.type = 'triangle';
      ds.frequency.setValueAtTime(185, t + 0.03);
      ds.frequency.exponentialRampToValueAtTime(155, t + 0.18);
      const de = this.env(0.08, 0.01, 0.16, t + 0.03);
      ds.connect(de); de.connect(d); ds.start(t + 0.03); ds.stop(t + 0.2);
    } catch {}
  }

  playHeal(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const a = ctx.createOscillator(); a.type = 'sine';
      a.frequency.setValueAtTime(280, t);
      a.frequency.exponentialRampToValueAtTime(520, t + 0.35);
      const ae = this.env(0.12, 0.03, 0.38, t);
      a.connect(ae); ae.connect(d); a.start(t); a.stop(t + 0.4);
      const b = ctx.createOscillator(); b.type = 'sine';
      b.frequency.setValueAtTime(295, t);
      b.frequency.exponentialRampToValueAtTime(555, t + 0.35);
      const be = this.env(0.06, 0.03, 0.36, t);
      b.connect(be); be.connect(d); b.start(t); b.stop(t + 0.4);
      const sh = ctx.createOscillator(); sh.type = 'triangle';
      sh.frequency.setValueAtTime(1400, t + 0.05);
      sh.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
      const shp = this.flt('highpass', 1200, 0.5), she = this.env(0.035, 0.04, 0.25, t + 0.05);
      sh.connect(shp); shp.connect(she); she.connect(d);
      sh.start(t + 0.05); sh.stop(t + 0.35);
    } catch {}
  }

  playSpecial(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const dr = ctx.createOscillator(); dr.type = 'sawtooth';
      dr.frequency.setValueAtTime(60, t);
      dr.frequency.exponentialRampToValueAtTime(200, t + 0.35);
      const dlp = this.flt('lowpass', 400, 3), de = this.env(0.15, 0.04, 0.45, t);
      dr.connect(dlp); dlp.connect(de); de.connect(d);
      dr.start(t); dr.stop(t + 0.5);
      const ch = ctx.createOscillator(); ch.type = 'square';
      ch.frequency.setValueAtTime(95, t + 0.05);
      ch.frequency.exponentialRampToValueAtTime(140, t + 0.3);
      const clp = this.flt('lowpass', 350, 2), ce = this.env(0.07, 0.05, 0.35, t + 0.05);
      ch.connect(clp); clp.connect(ce); ce.connect(d);
      ch.start(t + 0.05); ch.stop(t + 0.42);
      this.nz('bandpass', 500, 1.5, 0.3, 0.12, t + 0.05, d);
      this.nz('lowpass', 250, 0.8, 0.18, 0.06, t + 0.3, d);
    } catch {}
  }

  playEncounter(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const rm = ctx.createOscillator(); rm.type = 'sine';
      rm.frequency.setValueAtTime(40, t);
      rm.frequency.exponentialRampToValueAtTime(25, t + 0.7);
      const re = this.envASR(0.4, 0.15, 0.05, 0.4, 0.8, t);
      rm.connect(re); re.connect(d); rm.start(t); rm.stop(t + 0.85);
      const freqs = [110, 117, 155, 165];
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.001, t + 0.05);
      cg.gain.exponentialRampToValueAtTime(0.2, t + 0.08);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      const clp = this.flt('lowpass', 1200, 2);
      cg.connect(clp); clp.connect(d);
      for (const freq of freqs) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, t + 0.05);
        o.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.3);
        o.connect(cg); o.start(t + 0.05); o.stop(t + 0.65);
      }
      this.nz('bandpass', 1500, 1.0, 0.2, 0.25, t + 0.05, d);
      this.nz('lowpass', 200, 1.0, 0.35, 0.06, t + 0.3, d);
    } catch {}
  }

  playVictory(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const notes = [220, 261, 329, 440], det = [0, -3, -2, 0], dur = [0.14, 0.14, 0.16, 0.3];
      let off = 0;
      for (let i = 0; i < notes.length; i++) {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(notes[i] + det[i], t + off); o.detune.value = -5;
        const e = this.env(0.12, 0.01, dur[i], t + off);
        o.connect(e); e.connect(d); o.start(t + off); o.stop(t + off + dur[i] + 0.05);
        off += dur[i] * 0.8;
      }
      const sh = ctx.createOscillator(); sh.type = 'sine';
      sh.frequency.setValueAtTime(466, t + off);
      sh.frequency.exponentialRampToValueAtTime(440, t + off + 0.4);
      const she = this.env(0.05, 0.05, 0.4, t + off);
      sh.connect(she); she.connect(d); sh.start(t + off); sh.stop(t + off + 0.45);
    } catch {}
  }

  playDefeat(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const dr = ctx.createOscillator(); dr.type = 'sawtooth';
      dr.frequency.setValueAtTime(200, t);
      dr.frequency.exponentialRampToValueAtTime(30, t + 1.0);
      const dlp = this.flt('lowpass', 500, 2), de = this.envASR(0.15, 0.04, 0.15, 0.6, 1.2, t);
      dr.connect(dlp); dlp.connect(de); de.connect(d);
      dr.start(t); dr.stop(t + 1.25);
      const bt = [t + 0.1, t + 0.45, t + 0.85], bf = [70, 55, 35];
      for (let i = 0; i < 3; i++) {
        const b = ctx.createOscillator(); b.type = 'sine';
        b.frequency.setValueAtTime(bf[i], bt[i]);
        b.frequency.exponentialRampToValueAtTime(bf[i] * 0.7, bt[i] + 0.15);
        const be = this.env(0.2 - i * 0.05, 0.01, 0.15, bt[i]);
        b.connect(be); be.connect(d); b.start(bt[i]); b.stop(bt[i] + 0.18);
      }
      this.nz('lowpass', 150, 1.0, 0.9, 0.08, t, d);
    } catch {}
  }

  playItemPickup(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const ch = ctx.createOscillator(); ch.type = 'sine';
      ch.frequency.setValueAtTime(520, t);
      ch.frequency.exponentialRampToValueAtTime(580, t + 0.08);
      ch.frequency.exponentialRampToValueAtTime(480, t + 0.2);
      const ce = this.env(0.15, 0.008, 0.2, t);
      ch.connect(ce); ce.connect(d); ch.start(t); ch.stop(t + 0.22);
      const un = ctx.createOscillator(); un.type = 'triangle';
      un.frequency.setValueAtTime(130, t);
      un.frequency.exponentialRampToValueAtTime(100, t + 0.2);
      const ue = this.env(0.06, 0.01, 0.18, t);
      un.connect(ue); ue.connect(d); un.start(t); un.stop(t + 0.2);
    } catch {}
  }

  playMenuOpen(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 2500, 2.0, 0.04, 0.1, t, d);
      const bl = ctx.createOscillator(); bl.type = 'triangle';
      bl.frequency.setValueAtTime(1200, t);
      bl.frequency.exponentialRampToValueAtTime(800, t + 0.04);
      const be = this.env(0.06, 0.003, 0.05, t);
      bl.connect(be); be.connect(d); bl.start(t); bl.stop(t + 0.06);
    } catch {}
  }

  playMenuClose(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 1800, 1.5, 0.04, 0.06, t, d);
      const bl = ctx.createOscillator(); bl.type = 'sine';
      bl.frequency.setValueAtTime(600, t);
      bl.frequency.exponentialRampToValueAtTime(450, t + 0.035);
      const be = this.env(0.04, 0.003, 0.04, t);
      bl.connect(be); be.connect(d); bl.start(t); bl.stop(t + 0.05);
    } catch {}
  }

  playMiss(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer;
      const bp = this.flt('bandpass', 2000, 0.5);
      bp.frequency.setValueAtTime(3000, t);
      bp.frequency.exponentialRampToValueAtTime(300, t + 0.2);
      const e = this.env(0.1, 0.01, 0.2, t);
      src.connect(bp); bp.connect(e); e.connect(d);
      src.start(t); src.stop(t + 0.25);
      const er = ctx.createOscillator(); er.type = 'sine';
      er.frequency.setValueAtTime(380, t + 0.05); er.detune.value = -15;
      const ee = this.env(0.03, 0.04, 0.15, t + 0.05);
      er.connect(ee); ee.connect(d); er.start(t + 0.05); er.stop(t + 0.22);
    } catch {}
  }

  playCritical(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 1500, 1.0, 0.15, 0.32, t, d);
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(55, t);
      sub.frequency.exponentialRampToValueAtTime(20, t + 0.25);
      const se = this.env(0.4, 0.005, 0.28, t);
      sub.connect(se); se.connect(d); sub.start(t); sub.stop(t + 0.3);
      const bz = ctx.createOscillator(); bz.type = 'square';
      bz.frequency.setValueAtTime(250, t);
      bz.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      const blp = this.flt('lowpass', 500, 1), be = this.env(0.08, 0.003, 0.12, t);
      bz.connect(blp); blp.connect(be); be.connect(d);
      bz.start(t); bz.stop(t + 0.15);
      this.nz('lowpass', 350, 1.5, 0.2, 0.1, t + 0.1, d);
    } catch {}
  }

  playDefend(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const cl = ctx.createOscillator(); cl.type = 'square';
      cl.frequency.setValueAtTime(600, t);
      cl.frequency.exponentialRampToValueAtTime(150, t + 0.12);
      const cbp = this.flt('bandpass', 1200, 6), ce = this.env(0.22, 0.003, 0.18, t);
      cl.connect(cbp); cbp.connect(ce); ce.connect(d);
      cl.start(t); cl.stop(t + 0.2);
      this.nz('bandpass', 2000, 1.5, 0.04, 0.12, t, d);
      const rn = ctx.createOscillator(); rn.type = 'triangle';
      rn.frequency.setValueAtTime(800, t + 0.02);
      rn.frequency.exponentialRampToValueAtTime(600, t + 0.22);
      const rbp = this.flt('bandpass', 900, 8), re = this.env(0.1, 0.01, 0.22, t + 0.02);
      rn.connect(rbp); rbp.connect(re); re.connect(d);
      rn.start(t + 0.02); rn.stop(t + 0.25);
    } catch {}
  }

  playPoisonTick(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const gu = ctx.createOscillator(); gu.type = 'sine';
      gu.frequency.setValueAtTime(100, t);
      gu.frequency.exponentialRampToValueAtTime(130, t + 0.06);
      gu.frequency.exponentialRampToValueAtTime(85, t + 0.15);
      const ge = this.envASR(0.12, 0.05, 0.04, 0.15, 0.28, t);
      gu.connect(ge); ge.connect(d); gu.start(t); gu.stop(t + 0.3);
      this.nz('bandpass', 500, 3.0, 0.18, 0.1, t + 0.03, d);
    } catch {}
  }

  playBleedTick(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const a = ctx.createOscillator(); a.type = 'sine';
      a.frequency.setValueAtTime(65, t);
      a.frequency.exponentialRampToValueAtTime(35, t + 0.08);
      const ae = this.env(0.25, 0.005, 0.08, t);
      a.connect(ae); ae.connect(d); a.start(t); a.stop(t + 0.1);
      const b = ctx.createOscillator(); b.type = 'sine';
      b.frequency.setValueAtTime(55, t + 0.08);
      b.frequency.exponentialRampToValueAtTime(30, t + 0.16);
      const be = this.env(0.18, 0.005, 0.08, t + 0.08);
      b.connect(be); be.connect(d); b.start(t + 0.08); b.stop(t + 0.18);
      this.nz('lowpass', 400, 1.2, 0.16, 0.08, t, d);
    } catch {}
  }

  playExplosion(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      this.nz('bandpass', 2000, 0.6, 0.08, 0.35, t, d);
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(70, t);
      sub.frequency.exponentialRampToValueAtTime(18, t + 0.4);
      const se = this.envASR(0.4, 0.08, 0.04, 0.15, 0.45, t);
      sub.connect(se); se.connect(d); sub.start(t); sub.stop(t + 0.5);
      this.nz('lowpass', 500, 1.0, 0.35, 0.2, t, d);
      this.nz('bandpass', 1800, 0.4, 0.25, 0.08, t + 0.1, d);
    } catch {}
  }

  playTaunt(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      const hr = ctx.createOscillator(); hr.type = 'sawtooth';
      hr.frequency.setValueAtTime(75, t);
      hr.frequency.exponentialRampToValueAtTime(130, t + 0.15);
      hr.frequency.exponentialRampToValueAtTime(100, t + 0.45);
      const hlp = this.flt('lowpass', 600, 2.5), he = this.envASR(0.2, 0.1, 0.06, 0.25, 0.48, t);
      hr.connect(hlp); hlp.connect(he); he.connect(d);
      hr.start(t); hr.stop(t + 0.5);
      const h2 = ctx.createOscillator(); h2.type = 'square';
      h2.frequency.setValueAtTime(150, t);
      h2.frequency.exponentialRampToValueAtTime(260, t + 0.15);
      h2.frequency.exponentialRampToValueAtTime(200, t + 0.45);
      const h2lp = this.flt('lowpass', 450, 2), h2e = this.envASR(0.08, 0.04, 0.06, 0.25, 0.45, t + 0.01);
      h2.connect(h2lp); h2lp.connect(h2e); h2e.connect(d);
      h2.start(t + 0.01); h2.stop(t + 0.5);
      this.nz('lowpass', 450, 2.5, 0.35, 0.08, t + 0.03, d);
    } catch {}
  }

  // -- BGM stubs (lazy-loaded from bgm.ts) --

  playBgm(type: BgmType): void {
    if (typeof window === 'undefined') return;
    if (!this._bgmLoaded) {
      this._bgmLoaded = true;
      this._pendingBgm = type;
      import('./bgm').catch(() => { this._bgmLoaded = false; this._pendingBgm = null; });
    }
  }
  stopBgm(): void {}
  pauseBgm(): void {}
  resumeBgm(): void {}
  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
  }

  // -- Volume & muting --

  get masterVolume(): number { return this._masterVolume; }
  get muted(): boolean { return this._muted; }

  setVolume(vol: number): void {
    this._masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this._muted) this.masterGain.gain.setValueAtTime(this._masterVolume, this.ctx!.currentTime);
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setValueAtTime(this._muted ? 0 : this._masterVolume, this.ctx.currentTime);
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setValueAtTime(this._muted ? 0 : this._masterVolume, this.ctx.currentTime);
  }

  get isInitialized(): boolean { return this._initialized && this.ctx !== null; }
}

export const audio: AudioEngine = new AudioEngine();
export type { AudioEngine };
export type { BgmType };

export const playAttack = (): void => audio.playAttack();
export const playRangedAttack = (): void => audio.playRangedAttack();
export const playEnemyHit = (): void => audio.playEnemyHit();
export const playPlayerHit = (): void => audio.playPlayerHit();
export const playHeal = (): void => audio.playHeal();
export const playSpecial = (): void => audio.playSpecial();
export const playEncounter = (): void => audio.playEncounter();
export const playVictory = (): void => audio.playVictory();
export const playDefeat = (): void => audio.playDefeat();
export const playItemPickup = (): void => audio.playItemPickup();
export const playMenuOpen = (): void => audio.playMenuOpen();
export const playMenuClose = (): void => audio.playMenuClose();
export const playMiss = (): void => audio.playMiss();
export const playCritical = (): void => audio.playCritical();
export const playDefend = (): void => audio.playDefend();
export const playPoisonTick = (): void => audio.playPoisonTick();
export const playBleedTick = (): void => audio.playBleedTick();
export const playExplosion = (): void => audio.playExplosion();
export const playTaunt = (): void => audio.playTaunt();

export const playBgm = (type: BgmType): void => audio.playBgm(type);
export const stopBgm = (): void => audio.stopBgm();
export const pauseBgm = (): void => audio.pauseBgm();
export const resumeBgm = (): void => audio.resumeBgm();
export const setBgmVolume = (vol: number): void => audio.setBgmVolume(vol);

export function setMasterVolume(vol: number): void { audio.setVolume(vol); }
