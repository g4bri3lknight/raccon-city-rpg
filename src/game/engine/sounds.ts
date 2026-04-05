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

  // -- Enemy-specific monster sounds (RE-inspired) --

  /**
   * Zombie ambient moan — the iconic RE "Uuuunnnnhhh..."
   * Layered formant synthesis: vocal fundamental + throat resonance + breath noise + sub-rumble
   * Call this for idle ambient groaning during combat
   */
  playZombieMoan(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // ── Layer 1: Vocal fundamental (slow, wavering pitch) ──
      const fund = ctx.createOscillator(); fund.type = 'sawtooth';
      const baseFreq = 75 + Math.random() * 25; // variation: 75–100 Hz
      fund.frequency.setValueAtTime(baseFreq, t);
      fund.frequency.linearRampToValueAtTime(baseFreq + 18, t + 0.25);
      fund.frequency.linearRampToValueAtTime(baseFreq + 8, t + 0.55);
      fund.frequency.linearRampToValueAtTime(baseFreq - 12, t + 0.85);
      fund.frequency.linearRampToValueAtTime(baseFreq - 20, t + 1.1);
      // LFO vibrato on fundamental (slow, irregular)
      const vibLfo = ctx.createOscillator(); vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(4 + Math.random() * 2, t); // 4-6 Hz wobble
      const vibGain = ctx.createGain(); vibGain.gain.value = 5 + Math.random() * 4;
      vibLfo.connect(vibGain); vibGain.connect(fund.frequency);
      vibLfo.start(t); vibLfo.stop(t + 1.15);
      // Formant filter 1: throat resonance (~350 Hz)
      const f1 = this.flt('bandpass', 350, 6);
      f1.frequency.setValueAtTime(340, t);
      f1.frequency.linearRampToValueAtTime(380, t + 0.4);
      f1.frequency.linearRampToValueAtTime(300, t + 1.0);
      const f1g = ctx.createGain(); f1g.gain.value = 0.6;
      fund.connect(f1); f1.connect(f1g);
      // Formant filter 2: mouth/nasal (~800 Hz)
      const f2 = this.flt('bandpass', 800, 4);
      f2.frequency.setValueAtTime(780, t);
      f2.frequency.linearRampToValueAtTime(900, t + 0.5);
      f2.frequency.linearRampToValueAtTime(650, t + 1.0);
      const f2g = ctx.createGain(); f2g.gain.value = 0.25;
      fund.connect(f2); f2.connect(f2g);
      // Formant filter 3: deep chest (~180 Hz)
      const f3 = this.flt('bandpass', 180, 8);
      f3.frequency.setValueAtTime(175, t);
      f3.frequency.linearRampToValueAtTime(210, t + 0.35);
      f3.frequency.linearRampToValueAtTime(150, t + 1.0);
      const f3g = ctx.createGain(); f3g.gain.value = 0.5;
      fund.connect(f3); f3.connect(f3g);
      // Master envelope for all formants
      const masterEnv = ctx.createGain();
      masterEnv.gain.setValueAtTime(0.001, t);
      masterEnv.gain.exponentialRampToValueAtTime(0.2, t + 0.12);
      masterEnv.gain.setValueAtTime(0.18, t + 0.5);
      masterEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      f1g.connect(masterEnv); f2g.connect(masterEnv); f3g.connect(masterEnv);
      masterEnv.connect(d);
      fund.start(t); fund.stop(t + 1.15);

      // ── Layer 2: Second harmonic (octave above, quieter) ──
      const harm2 = ctx.createOscillator(); harm2.type = 'sawtooth';
      harm2.frequency.setValueAtTime(baseFreq * 2, t);
      harm2.frequency.linearRampToValueAtTime(baseFreq * 2 + 30, t + 0.3);
      harm2.frequency.linearRampToValueAtTime(baseFreq * 2 - 20, t + 0.9);
      const h2lp = this.flt('lowpass', 900, 2);
      const h2e = this.env(0.06, 0.1, 0.9, t);
      harm2.connect(h2lp); h2lp.connect(h2e); h2e.connect(d);
      harm2.start(t); harm2.stop(t + 1.05);

      // ── Layer 3: Breathy noise (wet respiratory quality) ──
      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.001, t);
      breathGain.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
      breathGain.gain.setValueAtTime(0.1, t + 0.6);
      breathGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
      const breathF = this.flt('bandpass', 500, 1.5);
      breathF.frequency.setValueAtTime(450, t);
      breathF.frequency.linearRampToValueAtTime(550, t + 0.5);
      breathF.frequency.linearRampToValueAtTime(400, t + 1.0);
      const breathSrc = ctx.createBufferSource(); breathSrc.buffer = this.noiseBuffer;
      breathSrc.connect(breathF); breathF.connect(breathGain); breathGain.connect(d);
      breathSrc.start(t); breathSrc.stop(t + 1.1);

      // ── Layer 4: Sub-bass body resonance ──
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(38, t);
      sub.frequency.linearRampToValueAtTime(42, t + 0.3);
      sub.frequency.exponentialRampToValueAtTime(22, t + 1.0);
      const subE = this.env(0.18, 0.08, 0.95, t);
      sub.connect(subE); subE.connect(d);
      sub.start(t); sub.stop(t + 1.05);

      // ── Layer 5: Wet click at end (mouth closing) ──
      this.nz('bandpass', 2500, 3.0, 0.02, 0.06, t + 0.85 + Math.random() * 0.15, d);
    } catch {}
  }

  /**
   * Zombie attack moan — characteristic RE groan + bite impact
   * The zombie lets out its iconic moan AS it lunges to bite
   */
  playZombieAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // ── The iconic moan (shorter attack version) ──
      const fund = ctx.createOscillator(); fund.type = 'sawtooth';
      const baseFreq = 80 + Math.random() * 20;
      fund.frequency.setValueAtTime(baseFreq, t);
      fund.frequency.linearRampToValueAtTime(baseFreq + 22, t + 0.1);
      fund.frequency.linearRampToValueAtTime(baseFreq + 10, t + 0.25);
      fund.frequency.linearRampToValueAtTime(baseFreq - 15, t + 0.5);
      fund.frequency.linearRampToValueAtTime(baseFreq - 25, t + 0.7);
      // Vibrato LFO
      const vibLfo = ctx.createOscillator(); vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(5 + Math.random() * 3, t);
      const vibGain = ctx.createGain(); vibGain.gain.value = 6 + Math.random() * 3;
      vibLfo.connect(vibGain); vibGain.connect(fund.frequency);
      vibLfo.start(t); vibLfo.stop(t + 0.75);
      // Formant 1: throat ~350 Hz
      const f1 = this.flt('bandpass', 350, 6);
      f1.frequency.setValueAtTime(340, t);
      f1.frequency.linearRampToValueAtTime(400, t + 0.2);
      f1.frequency.linearRampToValueAtTime(280, t + 0.65);
      const f1g = ctx.createGain(); f1g.gain.value = 0.55;
      fund.connect(f1); f1.connect(f1g);
      // Formant 2: nasal ~850 Hz
      const f2 = this.flt('bandpass', 850, 4);
      f2.frequency.setValueAtTime(820, t);
      f2.frequency.linearRampToValueAtTime(950, t + 0.25);
      f2.frequency.linearRampToValueAtTime(700, t + 0.6);
      const f2g = ctx.createGain(); f2g.gain.value = 0.2;
      fund.connect(f2); f2.connect(f2g);
      // Formant 3: chest ~180 Hz
      const f3 = this.flt('bandpass', 180, 8);
      f3.frequency.setValueAtTime(175, t);
      f3.frequency.linearRampToValueAtTime(220, t + 0.2);
      f3.frequency.linearRampToValueAtTime(140, t + 0.6);
      const f3g = ctx.createGain(); f3g.gain.value = 0.45;
      fund.connect(f3); f3.connect(f3g);
      // Master envelope
      const masterEnv = ctx.createGain();
      masterEnv.gain.setValueAtTime(0.001, t);
      masterEnv.gain.exponentialRampToValueAtTime(0.25, t + 0.06);
      masterEnv.gain.setValueAtTime(0.22, t + 0.3);
      masterEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
      f1g.connect(masterEnv); f2g.connect(masterEnv); f3g.connect(masterEnv);
      masterEnv.connect(d);
      fund.start(t); fund.stop(t + 0.78);

      // Second harmonic
      const harm2 = ctx.createOscillator(); harm2.type = 'sawtooth';
      harm2.frequency.setValueAtTime(baseFreq * 2, t);
      harm2.frequency.linearRampToValueAtTime(baseFreq * 2 + 35, t + 0.15);
      harm2.frequency.linearRampToValueAtTime(baseFreq * 2 - 25, t + 0.55);
      const h2lp = this.flt('lowpass', 1000, 2);
      const h2e = this.env(0.07, 0.05, 0.55, t);
      harm2.connect(h2lp); h2lp.connect(h2e); h2e.connect(d);
      harm2.start(t); harm2.stop(t + 0.6);

      // Breath noise
      const breathF = this.flt('bandpass', 500, 1.5);
      const breathE = this.env(0.1, 0.04, 0.55, t);
      const breathSrc = ctx.createBufferSource(); breathSrc.buffer = this.noiseBuffer;
      breathSrc.connect(breathF); breathF.connect(breathE); breathE.connect(d);
      breathSrc.start(t); breathSrc.stop(t + 0.6);

      // Sub-bass rumble
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(42, t);
      sub.frequency.linearRampToValueAtTime(48, t + 0.15);
      sub.frequency.exponentialRampToValueAtTime(20, t + 0.6);
      const subE = this.env(0.2, 0.04, 0.58, t);
      sub.connect(subE); subE.connect(d);
      sub.start(t); sub.stop(t + 0.65);

      // ── Bite impact: wet flesh slapping sound ──
      const biteTime = t + 0.15 + Math.random() * 0.05;
      // Primary slap: low-mid noise burst
      this.nz('bandpass', 600, 3.5, 0.06, 0.22, biteTime, d);
      // Wet squelch
      this.nz('lowpass', 400, 2.5, 0.08, 0.12, biteTime + 0.02, d);
      // Bone/jaw snap
      this.nz('highpass', 2800, 1.5, 0.015, 0.08, biteTime + 0.04, d);
      // Impact thud
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(120, biteTime);
      thud.frequency.exponentialRampToValueAtTime(40, biteTime + 0.12);
      const thudE = this.env(0.15, 0.005, 0.12, biteTime);
      thud.connect(thudE); thudE.connect(d);
      thud.start(biteTime); thud.stop(biteTime + 0.15);
    } catch {}
  }

  /** Cerberus (RE zombie dogs): rapid aggressive bark + snarling */
  playCerberusAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Aggressive bark: rapid noise burst with high-pass
      this.nz('highpass', 1800, 1.5, 0.06, 0.3, t, d);
      this.nz('bandpass', 1200, 4.0, 0.04, 0.22, t + 0.02, d);
      // Second bark (double-tap)
      this.nz('highpass', 2200, 1.2, 0.05, 0.25, t + 0.12, d);
      this.nz('bandpass', 1500, 3.0, 0.03, 0.18, t + 0.14, d);
      // Snarl: low sawtooth with LFO wobble
      const snarl = ctx.createOscillator(); snarl.type = 'sawtooth';
      snarl.frequency.setValueAtTime(150, t + 0.05);
      snarl.frequency.linearRampToValueAtTime(200, t + 0.15);
      snarl.frequency.linearRampToValueAtTime(130, t + 0.3);
      const slp = this.flt('lowpass', 600, 3), se = this.env(0.18, 0.01, 0.28, t + 0.05);
      snarl.connect(slp); slp.connect(se); se.connect(d);
      snarl.start(t + 0.05); snarl.stop(t + 0.35);
      // Jaw snap
      this.nz('bandpass', 3000, 2.0, 0.02, 0.15, t + 0.08, d);
    } catch {}
  }

  /** Licker: eerie screech + tongue-lash whip */
  playLickerAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Eerie screech: high sine with vibrato
      const screech = ctx.createOscillator(); screech.type = 'sawtooth';
      screech.frequency.setValueAtTime(600, t);
      screech.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      screech.frequency.linearRampToValueAtTime(900, t + 0.25);
      const slp = this.flt('bandpass', 1000, 5), se = this.env(0.12, 0.01, 0.28, t);
      screech.connect(slp); slp.connect(se); se.connect(d);
      screech.start(t); screech.stop(t + 0.3);
      // Vibrato overtone
      const vib = ctx.createOscillator(); vib.type = 'sine';
      vib.frequency.setValueAtTime(1800, t);
      vib.frequency.linearRampToValueAtTime(2400, t + 0.1);
      vib.frequency.linearRampToValueAtTime(1600, t + 0.25);
      const vhp = this.flt('highpass', 1400, 1), ve = this.env(0.06, 0.02, 0.24, t);
      vib.connect(vhp); vhp.connect(ve); ve.connect(d);
      vib.start(t); vib.stop(t + 0.28);
      // Tongue whip: rapid descending sweep
      this.nz('bandpass', 2500, 1.0, 0.04, 0.2, t + 0.06, d);
      const whip = ctx.createOscillator(); whip.type = 'triangle';
      whip.frequency.setValueAtTime(800, t + 0.04);
      whip.frequency.exponentialRampToValueAtTime(200, t + 0.15);
      const we = this.env(0.15, 0.005, 0.14, t + 0.04);
      whip.connect(we); we.connect(d); whip.start(t + 0.04); whip.stop(t + 0.2);
      // Wet clicking
      this.nz('bandpass', 4000, 3.0, 0.015, 0.12, t + 0.1, d);
      this.nz('bandpass', 3500, 4.0, 0.01, 0.08, t + 0.16, d);
    } catch {}
  }

  /** Hunter (RE): deep roar + heavy claw slash */
  playHunterAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Deep roar: very low sawtooth with sub
      const roar = ctx.createOscillator(); roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(55, t);
      roar.frequency.linearRampToValueAtTime(90, t + 0.12);
      roar.frequency.linearRampToValueAtTime(65, t + 0.4);
      const rlp = this.flt('lowpass', 350, 3), re = this.env(0.28, 0.04, 0.42, t);
      roar.connect(rlp); rlp.connect(re); re.connect(d);
      roar.start(t); roar.stop(t + 0.48);
      // Sub rumble
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(30, t);
      sub.frequency.exponentialRampToValueAtTime(18, t + 0.35);
      const se = this.env(0.35, 0.02, 0.38, t);
      sub.connect(se); se.connect(d); sub.start(t); sub.stop(t + 0.42);
      // Heavy claw slash: sharp noise + high sine sweep
      this.nz('highpass', 2500, 1.5, 0.06, 0.2, t + 0.08, d);
      this.nz('bandpass', 1800, 2.0, 0.05, 0.15, t + 0.1, d);
      const slash = ctx.createOscillator(); slash.type = 'sine';
      slash.frequency.setValueAtTime(1500, t + 0.08);
      slash.frequency.exponentialRampToValueAtTime(400, t + 0.2);
      const sle = this.env(0.1, 0.005, 0.15, t + 0.08);
      slash.connect(sle); sle.connect(d); slash.start(t + 0.08); slash.stop(t + 0.22);
    } catch {}
  }

  /** Tyrant (T-103): massive ground punch + shockwave */
  playTyrantAttack(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Massive impact: layered noise + sub explosion
      this.nz('bandpass', 800, 1.0, 0.12, 0.4, t, d);
      this.nz('lowpass', 200, 1.5, 0.3, 0.3, t, d);
      // Ground tremor sub
      const boom = ctx.createOscillator(); boom.type = 'sine';
      boom.frequency.setValueAtTime(60, t);
      boom.frequency.exponentialRampToValueAtTime(15, t + 0.5);
      const be = this.envASR(0.5, 0.12, 0.03, 0.2, 0.55, t);
      boom.connect(be); be.connect(d); boom.start(t); boom.stop(t + 0.6);
      // Shockwave: bandpass sweep
      this.nz('bandpass', 1500, 0.5, 0.2, 0.12, t + 0.05, d);
      this.nz('bandpass', 600, 0.8, 0.25, 0.08, t + 0.1, d);
      // Metal/impact ring
      const ring = ctx.createOscillator(); ring.type = 'triangle';
      ring.frequency.setValueAtTime(120, t + 0.02);
      ring.frequency.exponentialRampToValueAtTime(50, t + 0.4);
      const rl = this.flt('lowpass', 300, 2), re = this.env(0.2, 0.01, 0.4, t + 0.02);
      ring.connect(rl); rl.connect(re); re.connect(d);
      ring.start(t + 0.02); ring.stop(t + 0.45);
    } catch {}
  }

  /** Nemesis: varies by action - rocket, punch, tentacle, STARS scream */
  playNemesisAttack(action?: string): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;

      if (action === 'Razzo' || action === 'Devastazione') {
        // Rocket/Devastation: explosion + rocket trail
        // Rocket trail: ascending whine
        const trail = ctx.createOscillator(); trail.type = 'sawtooth';
        trail.frequency.setValueAtTime(300, t);
        trail.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
        const tlp = this.flt('bandpass', 800, 2), te = this.env(0.12, 0.02, 0.2, t);
        trail.connect(tlp); tlp.connect(te); te.connect(d);
        trail.start(t); trail.stop(t + 0.22);
        // Explosion
        this.nz('bandpass', 1500, 0.5, 0.1, 0.4, t + 0.15, d);
        this.nz('lowpass', 250, 1.2, 0.35, 0.25, t + 0.15, d);
        const boom = ctx.createOscillator(); boom.type = 'sine';
        boom.frequency.setValueAtTime(80, t + 0.15);
        boom.frequency.exponentialRampToValueAtTime(15, t + 0.55);
        const be = this.envASR(0.45, 0.1, 0.04, 0.2, 0.5, t + 0.15);
        boom.connect(be); be.connect(d); boom.start(t + 0.15); boom.stop(t + 0.55);
      } else if (action === 'S.T.A.R.S.!') {
        // Nemesis scream: iconic booming roar
        const scream = ctx.createOscillator(); scream.type = 'sawtooth';
        scream.frequency.setValueAtTime(70, t);
        scream.frequency.linearRampToValueAtTime(120, t + 0.1);
        scream.frequency.linearRampToValueAtTime(100, t + 0.5);
        scream.frequency.linearRampToValueAtTime(80, t + 0.7);
        const slp = this.flt('lowpass', 450, 4), se = this.env(0.3, 0.05, 0.72, t);
        scream.connect(slp); slp.connect(se); se.connect(d);
        scream.start(t); scream.stop(t + 0.78);
        // Distorted overtone
        const ov = ctx.createOscillator(); ov.type = 'square';
        ov.frequency.setValueAtTime(140, t);
        ov.frequency.linearRampToValueAtTime(240, t + 0.1);
        ov.frequency.linearRampToValueAtTime(200, t + 0.5);
        const olp = this.flt('lowpass', 350, 2), oe = this.env(0.1, 0.04, 0.65, t);
        ov.connect(olp); olp.connect(oe); oe.connect(d);
        ov.start(t); ov.stop(t + 0.7);
        // Sub rumble
        const sub = ctx.createOscillator(); sub.type = 'sine';
        sub.frequency.setValueAtTime(35, t);
        sub.frequency.exponentialRampToValueAtTime(18, t + 0.6);
        const sube = this.env(0.3, 0.02, 0.6, t);
        sub.connect(sube); sube.connect(d); sub.start(t); sub.stop(t + 0.65);
      } else if (action === 'Pugno Tentacolo') {
        // Tentacle: wet slither + impact
        this.nz('bandpass', 600, 3.0, 0.08, 0.25, t, d);
        this.nz('lowpass', 300, 2.0, 0.15, 0.15, t + 0.05, d);
        // Wet slither
        const slither = ctx.createOscillator(); slither.type = 'sawtooth';
        slither.frequency.setValueAtTime(200, t);
        slither.frequency.linearRampToValueAtTime(350, t + 0.08);
        slither.frequency.linearRampToValueAtTime(150, t + 0.25);
        const slp = this.flt('bandpass', 400, 5), se = this.env(0.18, 0.02, 0.28, t);
        slither.connect(slp); slp.connect(se); se.connect(d);
        slither.start(t); slither.stop(t + 0.3);
        // Impact
        const imp = ctx.createOscillator(); imp.type = 'sine';
        imp.frequency.setValueAtTime(100, t + 0.08);
        imp.frequency.exponentialRampToValueAtTime(25, t + 0.3);
        const ie = this.env(0.3, 0.01, 0.25, t + 0.08);
        imp.connect(ie); ie.connect(d); imp.start(t + 0.08); imp.stop(t + 0.35);
      } else {
        // Default Nemesis attack (Artiglio Multipli, other): heavy punch + roar
        this.playTyrantAttack();
        // Add Nemesis-specific distorted overtone
        const ov = ctx.createOscillator(); ov.type = 'square';
        ov.frequency.setValueAtTime(100, t);
        ov.frequency.linearRampToValueAtTime(160, t + 0.12);
        ov.frequency.linearRampToValueAtTime(120, t + 0.3);
        const olp = this.flt('lowpass', 400, 3), oe = this.env(0.08, 0.02, 0.28, t);
        ov.connect(olp); olp.connect(oe); oe.connect(d);
        ov.start(t); ov.stop(t + 0.32);
      }
    } catch {}
  }

  /** Enemy death: dramatic thud + fade */
  playEnemyDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Heavy thud
      this.nz('lowpass', 300, 1.5, 0.15, 0.25, t, d);
      this.nz('bandpass', 800, 2.0, 0.08, 0.18, t + 0.02, d);
      // Low impact
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(80, t);
      thud.frequency.exponentialRampToValueAtTime(20, t + 0.4);
      const te = this.env(0.3, 0.01, 0.4, t);
      thud.connect(te); te.connect(d); thud.start(t); thud.stop(t + 0.45);
      // Dissonant fade
      const fade = ctx.createOscillator(); fade.type = 'triangle';
      fade.frequency.setValueAtTime(200, t + 0.1);
      fade.frequency.exponentialRampToValueAtTime(80, t + 0.6);
      const flp = this.flt('lowpass', 500, 1), fe = this.env(0.08, 0.1, 0.45, t + 0.1);
      fade.connect(flp); flp.connect(fe); fe.connect(d);
      fade.start(t + 0.1); fade.stop(t + 0.55);
    } catch {}
  }

  /** Dispatch enemy attack sound by monster type name */
  playEnemyAttack(enemyName: string, action?: string): void {
    const name = (enemyName || '').toLowerCase();
    if (name.includes('nemesis')) this.playNemesisAttack(action);
    else if (name.includes('tyrant') || name.includes('t-103') || name.includes('t103')) this.playTyrantAttack();
    else if (name.includes('hunter')) this.playHunterAttack();
    else if (name.includes('licker')) this.playLickerAttack();
    else if (name.includes('cerberus')) this.playCerberusAttack();
    else this.playZombieAttack(); // Default: zombie-type
  }

  // -- Location ambient sounds (#33) --

  /** City outskirts: distant sirens, wind, occasional car alarm — subtle 2-4s */
  playAmbientCity(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Distant siren doppler sweep
      const siren = ctx.createOscillator(); siren.type = 'sine';
      siren.frequency.setValueAtTime(380, t);
      siren.frequency.linearRampToValueAtTime(520, t + 0.8);
      siren.frequency.linearRampToValueAtTime(380, t + 1.6);
      const sirenLP = this.flt('lowpass', 600, 2);
      const sirenE = this.env(0.04, 0.3, 1.4, t);
      siren.connect(sirenLP); sirenLP.connect(sirenE); sirenE.connect(d);
      siren.start(t); siren.stop(t + 1.8);
      // Layer 2: Wind — filtered noise
      this.nz('bandpass', 400, 0.8, 3.0, 0.06, t, d);
      // Layer 3: Car alarm — rapid triangle bursts mid-way
      const alarm1 = ctx.createOscillator(); alarm1.type = 'triangle';
      alarm1.frequency.setValueAtTime(680, t + 1.2);
      alarm1.frequency.setValueAtTime(850, t + 1.35);
      alarm1.frequency.setValueAtTime(680, t + 1.5);
      alarm1.frequency.setValueAtTime(850, t + 1.65);
      const alarmE = this.env(0.025, 0.05, 0.55, t + 1.2);
      alarm1.connect(alarmE); alarmE.connect(d);
      alarm1.start(t + 1.2); alarm1.stop(t + 1.85);
      // Layer 4: Sub city rumble
      const rumble = ctx.createOscillator(); rumble.type = 'sine';
      rumble.frequency.setValueAtTime(35, t);
      rumble.frequency.linearRampToValueAtTime(40, t + 2.5);
      rumble.frequency.exponentialRampToValueAtTime(20, t + 3.5);
      const rumE = this.env(0.08, 0.3, 3.0, t);
      rumble.connect(rumE); rumE.connect(d);
      rumble.start(t); rumble.stop(t + 3.5);
    } catch {}
  }

  /** RPD Station: creaking doors, echoing footsteps, fluorescent buzzing — subtle 2-4s */
  playAmbientRPD(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Fluorescent buzzing — high-pitched filtered noise
      this.nz('highpass', 3000, 3.0, 3.0, 0.03, t, d);
      // Layer 2: Electrical hum — 120 Hz double tone
      const hum = ctx.createOscillator(); hum.type = 'sawtooth';
      hum.frequency.setValueAtTime(120, t);
      const humLP = this.flt('lowpass', 300, 5);
      const humE = this.env(0.04, 0.2, 2.8, t);
      hum.connect(humLP); humLP.connect(humE); humE.connect(d);
      hum.start(t); hum.stop(t + 3.0);
      const hum2 = ctx.createOscillator(); hum2.type = 'sine';
      hum2.frequency.setValueAtTime(240, t);
      hum2.frequency.linearRampToValueAtTime(245, t + 2.0);
      const hum2E = this.env(0.015, 0.15, 2.6, t);
      hum2.connect(hum2E); hum2E.connect(d);
      hum2.start(t); hum2.stop(t + 2.8);
      // Layer 3: Echoing footsteps (two steps)
      this.nz('bandpass', 200, 2.0, 0.08, 0.08, t + 0.8, d);
      this.nz('bandpass', 180, 2.0, 0.08, 0.06, t + 1.6, d);
      // Layer 4: Door creak — modulated bandpass noise
      const creak = ctx.createBufferSource(); creak.buffer = this.noiseBuffer;
      const creakBP = this.flt('bandpass', 600, 5);
      creakBP.frequency.setValueAtTime(500, t + 2.0);
      creakBP.frequency.linearRampToValueAtTime(700, t + 2.3);
      creakBP.frequency.linearRampToValueAtTime(450, t + 2.6);
      const creakE = this.env(0.06, 0.08, 0.65, t + 2.0);
      creak.connect(creakBP); creakBP.connect(creakE); creakE.connect(d);
      creak.start(t + 2.0); creak.stop(t + 2.75);
    } catch {}
  }

  /** Hospital: heart monitors beeping, dripping water, moaning — subtle 2-4s */
  playAmbientHospital(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Heart monitor beeps (3 beeps at irregular intervals)
      const beepTimes = [t + 0.1, t + 1.1, t + 2.4];
      for (const bt of beepTimes) {
        const beep = ctx.createOscillator(); beep.type = 'sine';
        beep.frequency.setValueAtTime(880, bt);
        beep.frequency.setValueAtTime(660, bt + 0.04);
        const bE = this.env(0.05, 0.005, 0.08, bt);
        beep.connect(bE); bE.connect(d);
        beep.start(bt); beep.stop(bt + 0.1);
      }
      // Layer 2: Dripping water (4 drops)
      const drops = [t + 0.3, t + 0.9, t + 1.7, t + 2.8];
      for (const dt of drops) {
        const drop = ctx.createOscillator(); drop.type = 'sine';
        drop.frequency.setValueAtTime(2200, dt);
        drop.frequency.exponentialRampToValueAtTime(800, dt + 0.04);
        const dE = this.env(0.04, 0.003, 0.06, dt);
        drop.connect(dE); dE.connect(d);
        drop.start(dt); drop.stop(dt + 0.08);
        // Splash tail
        this.nz('bandpass', 1500, 2.0, 0.03, 0.02, dt + 0.04, d);
      }
      // Layer 3: Faint moan — low formant
      const moan = ctx.createOscillator(); moan.type = 'sawtooth';
      moan.frequency.setValueAtTime(95, t + 0.5);
      moan.frequency.linearRampToValueAtTime(110, t + 1.2);
      moan.frequency.linearRampToValueAtTime(80, t + 2.0);
      const moanBP = this.flt('bandpass', 250, 4);
      const moanE = this.env(0.04, 0.2, 1.5, t + 0.5);
      moan.connect(moanBP); moanBP.connect(moanE); moanE.connect(d);
      moan.start(t + 0.5); moan.stop(t + 2.1);
      // Layer 4: Background electrical hum
      this.nz('lowpass', 200, 1.0, 3.0, 0.025, t, d);
    } catch {}
  }

  /** Sewers: dripping water, echoing splashes, rats squeaking — subtle 2-4s */
  playAmbientSewers(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Constant water drip — pitched resonant drops
      const dripTimes = [t, t + 0.4, t + 0.7, t + 1.1, t + 1.8, t + 2.2, t + 2.9, t + 3.2];
      for (const dt of dripTimes) {
        const drip = ctx.createOscillator(); drip.type = 'sine';
        drip.frequency.setValueAtTime(1800 + Math.random() * 400, dt);
        drip.frequency.exponentialRampToValueAtTime(600, dt + 0.03);
        const dE = this.env(0.05 + Math.random() * 0.02, 0.003, 0.05, dt);
        drip.connect(dE); dE.connect(d);
        drip.start(dt); drip.stop(dt + 0.07);
      }
      // Layer 2: Echoing splash (distant)
      this.nz('lowpass', 500, 1.5, 0.2, 0.04, t + 1.4, d);
      this.nz('lowpass', 400, 1.0, 0.3, 0.02, t + 1.6, d);
      // Layer 3: Rat squeaks (2-3 high-pitched bursts)
      const sqTimes = [t + 0.2, t + 0.25, t + 2.5, t + 2.55, t + 2.62];
      for (const sq of sqTimes) {
        const rat = ctx.createOscillator(); rat.type = 'sine';
        rat.frequency.setValueAtTime(2800 + Math.random() * 600, sq);
        rat.frequency.exponentialRampToValueAtTime(3500, sq + 0.02);
        const rE = this.env(0.03, 0.005, 0.03, sq);
        rat.connect(rE); rE.connect(d);
        rat.start(sq); rat.stop(sq + 0.05);
      }
      // Layer 4: Deep sewer ambiance — low rumble + flowing water noise
      const flow = ctx.createOscillator(); flow.type = 'sine';
      flow.frequency.setValueAtTime(45, t);
      flow.frequency.linearRampToValueAtTime(50, t + 2.5);
      const flowE = this.env(0.06, 0.5, 2.5, t);
      flow.connect(flowE); flowE.connect(d);
      flow.start(t); flow.stop(t + 3.5);
      this.nz('lowpass', 350, 0.8, 3.5, 0.04, t, d);
    } catch {}
  }

  /** Laboratory: mechanical humming, electrical buzz, liquid bubbling — subtle 2-4s */
  playAmbientLaboratory(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Mechanical humming — layered sine tones
      const mech1 = ctx.createOscillator(); mech1.type = 'sine';
      mech1.frequency.setValueAtTime(60, t);
      const m1E = this.env(0.05, 0.4, 2.8, t);
      mech1.connect(m1E); m1E.connect(d);
      mech1.start(t); mech1.stop(t + 3.0);
      const mech2 = ctx.createOscillator(); mech2.type = 'sine';
      mech2.frequency.setValueAtTime(120, t);
      mech2.frequency.linearRampToValueAtTime(125, t + 2.5);
      const m2E = this.env(0.03, 0.3, 2.6, t);
      mech2.connect(m2E); m2E.connect(d);
      mech2.start(t); mech2.stop(t + 3.0);
      // Layer 2: Electrical buzz — crackling noise bursts
      this.nz('highpass', 2500, 1.5, 0.06, 0.025, t + 0.5, d);
      this.nz('bandpass', 4000, 2.0, 0.04, 0.03, t + 1.2, d);
      this.nz('highpass', 3000, 1.0, 0.05, 0.02, t + 2.3, d);
      // Layer 3: Liquid bubbling — modulated noise with pitch wobble
      for (let i = 0; i < 4; i++) {
        const bt = t + 0.8 + i * 0.6;
        const bubble = ctx.createBufferSource(); bubble.buffer = this.noiseBuffer;
        const bF = this.flt('bandpass', 500 + i * 150, 3);
        bF.frequency.setValueAtTime(400 + i * 120, bt);
        bF.frequency.linearRampToValueAtTime(600 + i * 120, bt + 0.08);
        const bE = this.env(0.03, 0.02, 0.12, bt);
        bubble.connect(bF); bF.connect(bE); bE.connect(d);
        bubble.start(bt); bubble.stop(bt + 0.18);
      }
      // Layer 4: Sub pressure hum
      this.nz('lowpass', 150, 2.0, 3.5, 0.03, t, d);
    } catch {}
  }

  /** Clock Tower: clock ticking, metallic gears, wind through broken glass — subtle 2-4s */
  playAmbientClockTower(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Clock ticking (mechanical click — 8 ticks)
      for (let i = 0; i < 8; i++) {
        const tickT = t + i * 0.4;
        const tick = ctx.createOscillator(); tick.type = 'triangle';
        tick.frequency.setValueAtTime(2200, tickT);
        tick.frequency.exponentialRampToValueAtTime(1200, tickT + 0.015);
        const tE = this.env(0.06, 0.002, 0.025, tickT);
        tick.connect(tE); tE.connect(d);
        tick.start(tickT); tick.stop(tickT + 0.04);
        // Secondary mechanical click
        this.nz('bandpass', 3500, 3.0, 0.008, 0.02, tickT + 0.02, d);
      }
      // Layer 2: Metallic gears grinding — modulated noise
      const gears = ctx.createBufferSource(); gears.buffer = this.noiseBuffer;
      const gF = this.flt('bandpass', 800, 2);
      gF.frequency.setValueAtTime(600, t);
      gF.frequency.linearRampToValueAtTime(900, t + 1.0);
      gF.frequency.linearRampToValueAtTime(700, t + 2.0);
      const gE = this.env(0.035, 0.3, 2.0, t);
      gears.connect(gF); gF.connect(gE); gE.connect(d);
      gears.start(t); gears.stop(t + 2.5);
      // Layer 3: Wind through broken glass — high filtered noise
      const wind = ctx.createBufferSource(); wind.buffer = this.noiseBuffer;
      const wF = this.flt('highpass', 2000, 0.8);
      const wLP = this.flt('lowpass', 5000, 1);
      const wE = this.envASR(0.04, 0.03, 0.5, 2.0, 3.2, t);
      wind.connect(wF); wF.connect(wLP); wLP.connect(wE); wE.connect(d);
      wind.start(t); wind.stop(t + 3.3);
      // Layer 4: Low bell/gong resonance
      const bell = ctx.createOscillator(); bell.type = 'sine';
      bell.frequency.setValueAtTime(180, t + 2.8);
      bell.frequency.exponentialRampToValueAtTime(160, t + 3.8);
      const bellE = this.env(0.04, 0.1, 1.0, t + 2.8);
      bell.connect(bellE); bellE.connect(d);
      bell.start(t + 2.8); bell.stop(t + 3.9);
    } catch {}
  }

  /** Dispatcher: play ambient sound by location ID */
  playLocationAmbient(locationId: string): void {
    const id = (locationId || '').toLowerCase();
    if (id.includes('city') || id.includes('outskirts')) this.playAmbientCity();
    else if (id.includes('rpd') || id.includes('station') || id.includes('polizia')) this.playAmbientRPD();
    else if (id.includes('hospital') || id.includes('ospedale')) this.playAmbientHospital();
    else if (id.includes('sewer') || id.includes('fogna')) this.playAmbientSewers();
    else if (id.includes('laboratory') || id.includes('lab') || id.includes('laboratorio')) this.playAmbientLaboratory();
    else if (id.includes('clock') || id.includes('tower') || id.includes('torre')) this.playAmbientClockTower();
  }

  // -- UI sounds (#36) --

  /** Travel transition: door/gate opening sound */
  playTravel(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Heavy door creak — modulated noise sweep
      const creak = ctx.createBufferSource(); creak.buffer = this.noiseBuffer;
      const cF = this.flt('bandpass', 500, 4);
      cF.frequency.setValueAtTime(300, t);
      cF.frequency.linearRampToValueAtTime(700, t + 0.15);
      cF.frequency.linearRampToValueAtTime(400, t + 0.35);
      const cE = this.env(0.12, 0.03, 0.35, t);
      creak.connect(cF); cF.connect(cE); cE.connect(d);
      creak.start(t); creak.stop(t + 0.4);
      // Gate metal scrape
      this.nz('bandpass', 2000, 2.0, 0.15, 0.06, t + 0.05, d);
      this.nz('highpass', 3000, 1.5, 0.1, 0.04, t + 0.1, d);
      // Impact close
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(100, t + 0.3);
      thud.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      const tE = this.env(0.15, 0.01, 0.15, t + 0.3);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.3); thud.stop(t + 0.5);
    } catch {}
  }

  /** Search: rummaging through items */
  playSearch(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Multiple small rustling sounds
      this.nz('highpass', 2500, 2.0, 0.04, 0.06, t, d);
      this.nz('bandpass', 1800, 3.0, 0.03, 0.05, t + 0.08, d);
      this.nz('highpass', 3000, 1.5, 0.03, 0.04, t + 0.15, d);
      this.nz('bandpass', 2200, 2.5, 0.04, 0.06, t + 0.2, d);
      this.nz('highpass', 2000, 2.0, 0.03, 0.05, t + 0.28, d);
      // Object movement thuds
      const thud1 = ctx.createOscillator(); thud1.type = 'triangle';
      thud1.frequency.setValueAtTime(300, t + 0.06);
      thud1.frequency.exponentialRampToValueAtTime(150, t + 0.1);
      const t1E = this.env(0.06, 0.005, 0.06, t + 0.06);
      thud1.connect(t1E); t1E.connect(d);
      thud1.start(t + 0.06); thud1.stop(t + 0.14);
      const thud2 = ctx.createOscillator(); thud2.type = 'triangle';
      thud2.frequency.setValueAtTime(250, t + 0.22);
      thud2.frequency.exponentialRampToValueAtTime(120, t + 0.26);
      const t2E = this.env(0.05, 0.005, 0.06, t + 0.22);
      thud2.connect(t2E); t2E.connect(d);
      thud2.start(t + 0.22); thud2.stop(t + 0.3);
    } catch {}
  }

  /** Notification: subtle alert/chime */
  playNotification(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Two-tone chime
      const ch1 = ctx.createOscillator(); ch1.type = 'sine';
      ch1.frequency.setValueAtTime(660, t);
      const c1E = this.env(0.08, 0.01, 0.15, t);
      ch1.connect(c1E); c1E.connect(d);
      ch1.start(t); ch1.stop(t + 0.18);
      const ch2 = ctx.createOscillator(); ch2.type = 'sine';
      ch2.frequency.setValueAtTime(880, t + 0.12);
      const c2E = this.env(0.07, 0.01, 0.18, t + 0.12);
      ch2.connect(c2E); c2E.connect(d);
      ch2.start(t + 0.12); ch2.stop(t + 0.32);
      // Soft shimmer
      const shim = ctx.createOscillator(); shim.type = 'triangle';
      shim.frequency.setValueAtTime(1320, t + 0.12);
      shim.frequency.exponentialRampToValueAtTime(1500, t + 0.3);
      const sE = this.env(0.02, 0.02, 0.18, t + 0.12);
      shim.connect(sE); sE.connect(d);
      shim.start(t + 0.12); shim.stop(t + 0.32);
    } catch {}
  }

  /** Level up: triumphant ascending arpeggio */
  playLevelUp(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Ascending arpeggio: C5-E5-G5-C6
      const notes = [523, 659, 784, 1047];
      const dur = 0.12;
      let off = 0;
      for (let i = 0; i < notes.length; i++) {
        const n = ctx.createOscillator(); n.type = 'triangle';
        n.frequency.setValueAtTime(notes[i], t + off);
        const e = this.env(0.12 - i * 0.015, 0.01, dur + 0.05, t + off);
        n.connect(e); e.connect(d);
        n.start(t + off); n.stop(t + off + dur + 0.08);
        // Octave shimmer on top
        const sh = ctx.createOscillator(); sh.type = 'sine';
        sh.frequency.setValueAtTime(notes[i] * 2, t + off);
        const se = this.env(0.03, 0.01, dur, t + off);
        sh.connect(se); se.connect(d);
        sh.start(t + off); sh.stop(t + off + dur + 0.05);
        off += dur * 0.65;
      }
      // Final chord sustain
      const chord = ctx.createOscillator(); chord.type = 'sine';
      chord.frequency.setValueAtTime(1047, t + off);
      const cE = this.env(0.1, 0.05, 0.4, t + off);
      chord.connect(cE); cE.connect(d);
      chord.start(t + off); chord.stop(t + off + 0.5);
    } catch {}
  }

  /** Document found: paper rustling + mysterious chime */
  playDocumentFound(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Paper rustle — multiple noise bursts
      this.nz('highpass', 3000, 1.5, 0.06, 0.05, t, d);
      this.nz('bandpass', 2500, 2.0, 0.05, 0.04, t + 0.06, d);
      this.nz('highpass', 3500, 1.0, 0.04, 0.03, t + 0.12, d);
      this.nz('bandpass', 2000, 2.5, 0.05, 0.04, t + 0.18, d);
      // Mysterious chime — low dissonant tones
      const ch1 = ctx.createOscillator(); ch1.type = 'sine';
      ch1.frequency.setValueAtTime(330, t + 0.25);
      const c1E = this.env(0.08, 0.03, 0.35, t + 0.25);
      ch1.connect(c1E); c1E.connect(d);
      ch1.start(t + 0.25); ch1.stop(t + 0.65);
      const ch2 = ctx.createOscillator(); ch2.type = 'triangle';
      ch2.frequency.setValueAtTime(440, t + 0.3);
      ch2.detune.value = -10;
      const c2E = this.env(0.05, 0.03, 0.3, t + 0.3);
      ch2.connect(c2E); c2E.connect(d);
      ch2.start(t + 0.3); ch2.stop(t + 0.65);
      // Eerie overtone
      const ov = ctx.createOscillator(); ov.type = 'sine';
      ov.frequency.setValueAtTime(660, t + 0.35);
      ov.frequency.exponentialRampToValueAtTime(630, t + 0.6);
      const oE = this.env(0.03, 0.04, 0.25, t + 0.35);
      ov.connect(oE); oE.connect(d);
      ov.start(t + 0.35); ov.stop(t + 0.65);
    } catch {}
  }

  /** NPC encounter: muffled radio static + voice */
  playNPCEncounter(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Radio static — filtered noise burst
      this.nz('bandpass', 2000, 1.0, 0.25, 0.06, t, d);
      this.nz('highpass', 3500, 1.5, 0.15, 0.04, t + 0.1, d);
      // Muffled voice formant — low mid bandpass
      const voice = ctx.createOscillator(); voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(120, t + 0.15);
      voice.frequency.linearRampToValueAtTime(145, t + 0.25);
      voice.frequency.linearRampToValueAtTime(130, t + 0.4);
      voice.frequency.linearRampToValueAtTime(110, t + 0.55);
      const vBP = this.flt('bandpass', 450, 3);
      const vLP = this.flt('lowpass', 800, 1);
      const vE = this.envASR(0.06, 0.03, 0.06, 0.35, 0.55, t + 0.15);
      voice.connect(vBP); vBP.connect(vLP); vLP.connect(vE); vE.connect(d);
      voice.start(t + 0.15); voice.stop(t + 0.7);
      // Radio click off
      this.nz('bandpass', 1500, 3.0, 0.02, 0.05, t + 0.6, d);
    } catch {}
  }

  /** Puzzle fail: buzzer/wrong answer */
  playPuzzleFail(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Harsh buzzer — square wave
      const buzz = ctx.createOscillator(); buzz.type = 'square';
      buzz.frequency.setValueAtTime(150, t);
      buzz.frequency.setValueAtTime(130, t + 0.15);
      buzz.frequency.setValueAtTime(150, t + 0.3);
      const bLP = this.flt('lowpass', 500, 1);
      const bE = this.env(0.12, 0.01, 0.4, t);
      buzz.connect(bLP); bLP.connect(bE); bE.connect(d);
      buzz.start(t); buzz.stop(t + 0.45);
      // Dissonant tone
      const dis = ctx.createOscillator(); dis.type = 'sawtooth';
      dis.frequency.setValueAtTime(185, t + 0.05);
      const dLP = this.flt('lowpass', 400, 2);
      const dE = this.env(0.06, 0.02, 0.35, t + 0.05);
      dis.connect(dLP); dLP.connect(dE); dE.connect(d);
      dis.start(t + 0.05); dis.stop(t + 0.42);
    } catch {}
  }

  /** Puzzle success: satisfying click/unlock */
  playPuzzleSuccess(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Mechanical click — sharp noise
      this.nz('bandpass', 2500, 3.0, 0.02, 0.1, t, d);
      this.nz('highpass', 4000, 2.0, 0.015, 0.06, t + 0.01, d);
      // Metallic unlock sound — resonant sine
      const click = ctx.createOscillator(); click.type = 'sine';
      click.frequency.setValueAtTime(1200, t + 0.05);
      click.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      const cE = this.env(0.1, 0.005, 0.18, t + 0.05);
      click.connect(cE); cE.connect(d);
      click.start(t + 0.05); click.stop(t + 0.25);
      // Success chime — two ascending tones
      const ch1 = ctx.createOscillator(); ch1.type = 'triangle';
      ch1.frequency.setValueAtTime(523, t + 0.15);
      const c1E = this.env(0.08, 0.01, 0.15, t + 0.15);
      ch1.connect(c1E); c1E.connect(d);
      ch1.start(t + 0.15); ch1.stop(t + 0.32);
      const ch2 = ctx.createOscillator(); ch2.type = 'triangle';
      ch2.frequency.setValueAtTime(784, t + 0.25);
      const c2E = this.env(0.08, 0.01, 0.2, t + 0.25);
      ch2.connect(c2E); c2E.connect(d);
      ch2.start(t + 0.25); ch2.stop(t + 0.48);
    } catch {}
  }

  /** Achievement: celebratory chime — ascending triple tone */
  playAchievement(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Triple ascending chime
      const notes = [523, 659, 784];
      for (let i = 0; i < notes.length; i++) {
        const nt = t + i * 0.12;
        const n = ctx.createOscillator(); n.type = 'triangle';
        n.frequency.setValueAtTime(notes[i], nt);
        const e = this.env(0.1, 0.01, 0.2, nt);
        n.connect(e); e.connect(d);
        n.start(nt); n.stop(nt + 0.25);
        // Shimmer overtone
        const sh = ctx.createOscillator(); sh.type = 'sine';
        sh.frequency.setValueAtTime(notes[i] * 2, nt);
        const sE = this.env(0.03, 0.01, 0.15, nt);
        sh.connect(sE); sE.connect(d);
        sh.start(nt); sh.stop(nt + 0.2);
      }
      // Final sustained tone
      const fin = ctx.createOscillator(); fin.type = 'sine';
      fin.frequency.setValueAtTime(1047, t + 0.36);
      const fE = this.env(0.08, 0.05, 0.35, t + 0.36);
      fin.connect(fE); fE.connect(d);
      fin.start(t + 0.36); fin.stop(t + 0.75);
    } catch {}
  }

  /** Map open: paper unfolding sound */
  playMapOpen(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Paper unfolding — multiple noise swells
      this.nz('highpass', 2500, 1.5, 0.08, 0.06, t, d);
      this.nz('bandpass', 3000, 1.0, 0.1, 0.05, t + 0.06, d);
      this.nz('highpass', 2000, 2.0, 0.06, 0.04, t + 0.12, d);
      this.nz('bandpass', 3500, 1.5, 0.08, 0.05, t + 0.18, d);
      // Paper crinkle texture
      const crinkle = ctx.createBufferSource(); crinkle.buffer = this.noiseBuffer;
      const cF = this.flt('bandpass', 4000, 1);
      const cLP = this.flt('lowpass', 6000, 0.5);
      const cE = this.envASR(0.04, 0.02, 0.06, 0.2, 0.35, t + 0.02);
      crinkle.connect(cF); cF.connect(cLP); cLP.connect(cE); cE.connect(d);
      crinkle.start(t + 0.02); crinkle.stop(t + 0.4);
      // Flat placement thud
      const thud = ctx.createOscillator(); thud.type = 'triangle';
      thud.frequency.setValueAtTime(200, t + 0.25);
      thud.frequency.exponentialRampToValueAtTime(120, t + 0.32);
      const tE = this.env(0.06, 0.005, 0.08, t + 0.25);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.25); thud.stop(t + 0.35);
    } catch {}
  }

  /** Transfer: item shuffling sound */
  playTransfer(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Item pickup click
      this.nz('bandpass', 2500, 2.5, 0.02, 0.08, t, d);
      // Movement rustle
      this.nz('bandpass', 1800, 2.0, 0.04, 0.05, t + 0.08, d);
      this.nz('highpass', 3000, 1.5, 0.03, 0.04, t + 0.14, d);
      // Item placement
      this.nz('bandpass', 2000, 3.0, 0.015, 0.06, t + 0.2, d);
      // Settle thud
      const thud = ctx.createOscillator(); thud.type = 'triangle';
      thud.frequency.setValueAtTime(250, t + 0.22);
      thud.frequency.exponentialRampToValueAtTime(150, t + 0.28);
      const tE = this.env(0.06, 0.005, 0.07, t + 0.22);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.22); thud.stop(t + 0.3);
    } catch {}
  }

  // -- Enemy death screams by type (#37) --

  /** Zombie death: gurgling death rattle, fading groan, wet collapse thud */
  playZombieDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Gurgling death rattle — wet formant synthesis
      const fund = ctx.createOscillator(); fund.type = 'sawtooth';
      const baseFreq = 65 + Math.random() * 15;
      fund.frequency.setValueAtTime(baseFreq + 10, t);
      fund.frequency.linearRampToValueAtTime(baseFreq - 8, t + 0.3);
      fund.frequency.linearRampToValueAtTime(baseFreq - 25, t + 0.6);
      fund.frequency.exponentialRampToValueAtTime(30, t + 1.0);
      // Vibrato (weakening)
      const vibLfo = ctx.createOscillator(); vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(8, t);
      vibLfo.frequency.linearRampToValueAtTime(2, t + 0.8);
      const vibG = ctx.createGain(); vibG.gain.value = 8;
      vibLfo.connect(vibG); vibG.connect(fund.frequency);
      vibLfo.start(t); vibLfo.stop(t + 0.85);
      // Throat formant
      const f1 = this.flt('bandpass', 350, 5);
      const f1g = ctx.createGain(); f1g.gain.value = 0.5;
      fund.connect(f1); f1.connect(f1g);
      // Chest formant
      const f2 = this.flt('bandpass', 180, 7);
      const f2g = ctx.createGain(); f2g.gain.value = 0.4;
      fund.connect(f2); f2.connect(f2g);
      // Wet gurgle noise
      const gurgleN = ctx.createBufferSource(); gurgleN.buffer = this.noiseBuffer;
      const gF = this.flt('bandpass', 450, 3);
      const gE = this.env(0.08, 0.1, 0.5, t);
      gurgleN.connect(gF); gF.connect(gE); gE.connect(d);
      gurgleN.start(t); gurgleN.stop(t + 0.65);
      // Master envelope for vocal
      const masterEnv = ctx.createGain();
      masterEnv.gain.setValueAtTime(0.001, t);
      masterEnv.gain.exponentialRampToValueAtTime(0.18, t + 0.08);
      masterEnv.gain.exponentialRampToValueAtTime(0.08, t + 0.5);
      masterEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      f1g.connect(masterEnv); f2g.connect(masterEnv); masterEnv.connect(d);
      fund.start(t); fund.stop(t + 0.95);
      // Layer 2: Wet collapse thud
      this.nz('lowpass', 350, 2.0, 0.15, 0.2, t + 0.55, d);
      this.nz('bandpass', 600, 3.0, 0.08, 0.12, t + 0.57, d);
      // Body impact
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(90, t + 0.55);
      thud.frequency.exponentialRampToValueAtTime(25, t + 0.8);
      const tE = this.env(0.25, 0.01, 0.3, t + 0.55);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.55); thud.stop(t + 0.88);
      // Fading groan after collapse
      const groan = ctx.createOscillator(); groan.type = 'sawtooth';
      groan.frequency.setValueAtTime(55, t + 0.7);
      groan.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      const grLP = this.flt('lowpass', 300, 3);
      const grE = this.env(0.08, 0.1, 0.4, t + 0.7);
      groan.connect(grLP); grLP.connect(grE); grE.connect(d);
      groan.start(t + 0.7); groan.stop(t + 1.15);
    } catch {}
  }

  /** Cerberus death: whimpering yelp, rapid breathing, final gasp */
  playCerberusDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Whimpering yelp — descending sine
      const yelp = ctx.createOscillator(); yelp.type = 'sine';
      yelp.frequency.setValueAtTime(800, t);
      yelp.frequency.exponentialRampToValueAtTime(350, t + 0.25);
      yelp.frequency.linearRampToValueAtTime(300, t + 0.4);
      yelp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
      const yE = this.envASR(0.12, 0.04, 0.06, 0.3, 0.65, t);
      yelp.connect(yE); yE.connect(d);
      yelp.start(t); yelp.stop(t + 0.7);
      // Noise component of yelp
      this.nz('highpass', 1500, 1.5, 0.1, 0.06, t, d);
      // Layer 2: Rapid breathing — quick noise bursts
      for (let i = 0; i < 4; i++) {
        const bt = t + 0.5 + i * 0.12;
        this.nz('bandpass', 800, 2.0, 0.04, 0.04, bt, d);
      }
      // Layer 3: Final gasp
      const gasp = ctx.createOscillator(); gasp.type = 'sawtooth';
      gasp.frequency.setValueAtTime(250, t + 0.9);
      gasp.frequency.exponentialRampToValueAtTime(100, t + 1.1);
      const gLP = this.flt('lowpass', 500, 3);
      const gE = this.env(0.08, 0.03, 0.2, t + 0.9);
      gasp.connect(gLP); gLP.connect(gE); gE.connect(d);
      gasp.start(t + 0.9); gasp.stop(t + 1.15);
      // Body collapse
      this.nz('lowpass', 300, 1.5, 0.1, 0.1, t + 1.0, d);
    } catch {}
  }

  /** Licker death: high-pitched screech fading to wet gurgle */
  playLickerDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: High-pitched screech — sawtooth sweep down
      const screech = ctx.createOscillator(); screech.type = 'sawtooth';
      screech.frequency.setValueAtTime(1200, t);
      screech.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      screech.frequency.linearRampToValueAtTime(400, t + 0.4);
      const sLP = this.flt('bandpass', 900, 4);
      const sE = this.env(0.12, 0.02, 0.45, t);
      screech.connect(sLP); sLP.connect(sE); sE.connect(d);
      screech.start(t); screech.stop(t + 0.5);
      // Vibrato overtone
      const vib = ctx.createOscillator(); vib.type = 'sine';
      vib.frequency.setValueAtTime(2400, t);
      vib.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
      const vHP = this.flt('highpass', 1500, 1);
      const vE = this.env(0.06, 0.02, 0.3, t);
      vib.connect(vHP); vHP.connect(vE); vE.connect(d);
      vib.start(t); vib.stop(t + 0.35);
      // Layer 2: Wet gurgle transition
      const gurgle = ctx.createOscillator(); gurgle.type = 'sawtooth';
      gurgle.frequency.setValueAtTime(200, t + 0.3);
      gurgle.frequency.linearRampToValueAtTime(150, t + 0.5);
      gurgle.frequency.exponentialRampToValueAtTime(60, t + 0.8);
      const gBP = this.flt('bandpass', 350, 4);
      const gE = this.env(0.1, 0.08, 0.4, t + 0.3);
      gurgle.connect(gBP); gBP.connect(gE); gE.connect(d);
      gurgle.start(t + 0.3); gurgle.stop(t + 0.8);
      // Wet noise gurgle
      this.nz('bandpass', 500, 2.5, 0.2, 0.06, t + 0.35, d);
      this.nz('lowpass', 300, 2.0, 0.15, 0.05, t + 0.5, d);
      // Layer 3: Body thud
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(100, t + 0.7);
      thud.frequency.exponentialRampToValueAtTime(30, t + 0.9);
      const tE = this.env(0.2, 0.01, 0.25, t + 0.7);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.7); thud.stop(t + 0.95);
    } catch {}
  }

  /** Hunter death: deep roar cut short, heavy thud, scraping fade */
  playHunterDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Deep roar — cut short abruptly
      const roar = ctx.createOscillator(); roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(80, t);
      roar.frequency.linearRampToValueAtTime(110, t + 0.15);
      const rLP = this.flt('lowpass', 400, 3);
      const rE = this.envASR(0.25, 0.12, 0.04, 0.15, 0.22, t);
      roar.connect(rLP); rLP.connect(rE); rE.connect(d);
      roar.start(t); roar.stop(t + 0.25);
      // Sub behind roar
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(40, t);
      const subE = this.env(0.2, 0.02, 0.2, t);
      sub.connect(subE); subE.connect(d);
      sub.start(t); sub.stop(t + 0.25);
      // Layer 2: Heavy thud (abrupt cut)
      this.nz('lowpass', 250, 2.0, 0.15, 0.3, t + 0.18, d);
      this.nz('bandpass', 600, 2.5, 0.1, 0.15, t + 0.19, d);
      const thud = ctx.createOscillator(); thud.type = 'sine';
      thud.frequency.setValueAtTime(70, t + 0.18);
      thud.frequency.exponentialRampToValueAtTime(20, t + 0.5);
      const tE = this.env(0.35, 0.008, 0.35, t + 0.18);
      thud.connect(tE); tE.connect(d);
      thud.start(t + 0.18); thud.stop(t + 0.55);
      // Layer 3: Scraping fade — metallic drag
      const scrape = ctx.createBufferSource(); scrape.buffer = this.noiseBuffer;
      const scF = this.flt('bandpass', 1200, 2);
      scF.frequency.setValueAtTime(1500, t + 0.4);
      scF.frequency.linearRampToValueAtTime(600, t + 0.8);
      const scE = this.env(0.05, 0.1, 0.4, t + 0.4);
      scrape.connect(scF); scF.connect(scE); scE.connect(d);
      scrape.start(t + 0.4); scrape.stop(t + 0.85);
    } catch {}
  }

  /** Tyrant death: massive crash, metallic groan, ground-shaking rumble */
  playTyrantDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Massive crash — layered impact
      this.nz('bandpass', 800, 0.8, 0.15, 0.35, t, d);
      this.nz('lowpass', 200, 1.5, 0.3, 0.25, t, d);
      this.nz('bandpass', 1500, 0.5, 0.1, 0.15, t + 0.03, d);
      // Impact boom
      const boom = ctx.createOscillator(); boom.type = 'sine';
      boom.frequency.setValueAtTime(60, t);
      boom.frequency.exponentialRampToValueAtTime(12, t + 0.6);
      const bE = this.envASR(0.5, 0.15, 0.03, 0.2, 0.65, t);
      boom.connect(bE); bE.connect(d);
      boom.start(t); boom.stop(t + 0.7);
      // Layer 2: Metallic groan — low sawtooth
      const groan = ctx.createOscillator(); groan.type = 'sawtooth';
      groan.frequency.setValueAtTime(50, t + 0.2);
      groan.frequency.linearRampToValueAtTime(65, t + 0.5);
      groan.frequency.linearRampToValueAtTime(40, t + 1.0);
      groan.frequency.exponentialRampToValueAtTime(20, t + 1.5);
      const gLP = this.flt('lowpass', 300, 3);
      const gE = this.env(0.2, 0.15, 1.2, t + 0.2);
      groan.connect(gLP); gLP.connect(gE); gE.connect(d);
      groan.start(t + 0.2); groan.stop(t + 1.45);
      // Metal ring
      const ring = ctx.createOscillator(); ring.type = 'triangle';
      ring.frequency.setValueAtTime(150, t + 0.05);
      ring.frequency.exponentialRampToValueAtTime(60, t + 0.8);
      const rLP = this.flt('lowpass', 400, 2);
      const rE = this.env(0.15, 0.02, 0.75, t + 0.05);
      ring.connect(rLP); rLP.connect(rE); rE.connect(d);
      ring.start(t + 0.05); ring.stop(t + 0.85);
      // Layer 3: Ground-shaking rumble
      this.nz('lowpass', 120, 1.0, 1.2, 0.12, t + 0.15, d);
      const rumble = ctx.createOscillator(); rumble.type = 'sine';
      rumble.frequency.setValueAtTime(25, t + 0.2);
      rumble.frequency.linearRampToValueAtTime(30, t + 1.0);
      rumble.frequency.exponentialRampToValueAtTime(15, t + 1.8);
      const rumE = this.env(0.15, 0.3, 1.4, t + 0.2);
      rumble.connect(rumE); rumE.connect(d);
      rumble.start(t + 0.2); rumble.stop(t + 1.7);
    } catch {}
  }

  /** Nemesis death: explosive roar + rocket detonation + building collapse */
  playNemesisDeath(): void {
    try {
      const s = this.init(); if (!s) return;
      const { ctx, t, d } = s;
      // Layer 1: Explosive roar — massive sawtooth
      const roar = ctx.createOscillator(); roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(60, t);
      roar.frequency.linearRampToValueAtTime(100, t + 0.15);
      roar.frequency.linearRampToValueAtTime(80, t + 0.4);
      roar.frequency.exponentialRampToValueAtTime(30, t + 0.8);
      const rLP = this.flt('lowpass', 500, 3);
      const rE = this.envASR(0.35, 0.1, 0.04, 0.3, 0.85, t);
      roar.connect(rLP); rLP.connect(rE); rE.connect(d);
      roar.start(t); roar.stop(t + 0.9);
      // Distorted overtone
      const ov = ctx.createOscillator(); ov.type = 'square';
      ov.frequency.setValueAtTime(120, t);
      ov.frequency.linearRampToValueAtTime(200, t + 0.15);
      ov.frequency.exponentialRampToValueAtTime(60, t + 0.6);
      const oLP = this.flt('lowpass', 400, 2);
      const oE = this.env(0.12, 0.04, 0.55, t);
      ov.connect(oLP); oLP.connect(oE); oE.connect(d);
      ov.start(t); ov.stop(t + 0.6);
      // Layer 2: Rocket detonation — explosive noise
      this.nz('bandpass', 1200, 0.5, 0.2, 0.35, t + 0.3, d);
      this.nz('lowpass', 200, 1.5, 0.4, 0.25, t + 0.3, d);
      this.nz('bandpass', 2000, 0.4, 0.15, 0.12, t + 0.35, d);
      // Detonation boom
      const det = ctx.createOscillator(); det.type = 'sine';
      det.frequency.setValueAtTime(50, t + 0.3);
      det.frequency.exponentialRampToValueAtTime(10, t + 1.0);
      const dE = this.envASR(0.5, 0.1, 0.05, 0.3, 1.0, t + 0.3);
      det.connect(dE); dE.connect(d);
      det.start(t + 0.3); det.stop(t + 1.05);
      // Layer 3: Building collapse — rumbling debris
      this.nz('lowpass', 150, 0.8, 1.5, 0.15, t + 0.5, d);
      this.nz('bandpass', 400, 1.0, 1.0, 0.08, t + 0.6, d);
      // Crumbling noise
      for (let i = 0; i < 5; i++) {
        const dt = t + 0.8 + i * 0.25;
        this.nz('bandpass', 600 + i * 200, 1.5, 0.08, 0.06, dt, d);
        this.nz('lowpass', 250, 2.0, 0.06, 0.04, dt + 0.1, d);
      }
      // Final ground rumble
      const finalRumble = ctx.createOscillator(); finalRumble.type = 'sine';
      finalRumble.frequency.setValueAtTime(20, t + 0.8);
      finalRumble.frequency.linearRampToValueAtTime(25, t + 1.5);
      finalRumble.frequency.exponentialRampToValueAtTime(12, t + 2.2);
      const frE = this.env(0.12, 0.3, 1.2, t + 0.8);
      finalRumble.connect(frE); frE.connect(d);
      finalRumble.start(t + 0.8); finalRumble.stop(t + 2.2);
    } catch {}
  }

  /** Dispatch enemy death sound by monster type name */
  playEnemyDeathByType(enemyName: string): void {
    const name = (enemyName || '').toLowerCase();
    if (name.includes('nemesis')) this.playNemesisDeath();
    else if (name.includes('tyrant') || name.includes('t-103') || name.includes('t103')) this.playTyrantDeath();
    else if (name.includes('hunter')) this.playHunterDeath();
    else if (name.includes('licker')) this.playLickerDeath();
    else if (name.includes('cerberus')) this.playCerberusDeath();
    else this.playZombieDeath(); // Default: zombie-type
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
export const playEnemyAttack = (name?: string, action?: string): void => audio.playEnemyAttack(name || '', action);
export const playEnemyDeath = (): void => audio.playEnemyDeath();
export const playZombieMoan = (): void => audio.playZombieMoan();

// -- Ambient sound exports (#33) --
export const playLocationAmbient = (locationId: string): void => audio.playLocationAmbient(locationId);
export const playAmbientCity = (): void => audio.playAmbientCity();
export const playAmbientRPD = (): void => audio.playAmbientRPD();
export const playAmbientHospital = (): void => audio.playAmbientHospital();
export const playAmbientSewers = (): void => audio.playAmbientSewers();
export const playAmbientLaboratory = (): void => audio.playAmbientLaboratory();
export const playAmbientClockTower = (): void => audio.playAmbientClockTower();

// -- UI sound exports (#36) --
export const playTravel = (): void => audio.playTravel();
export const playSearch = (): void => audio.playSearch();
export const playNotification = (): void => audio.playNotification();
export const playLevelUp = (): void => audio.playLevelUp();
export const playDocumentFound = (): void => audio.playDocumentFound();
export const playNPCEncounter = (): void => audio.playNPCEncounter();
export const playPuzzleFail = (): void => audio.playPuzzleFail();
export const playPuzzleSuccess = (): void => audio.playPuzzleSuccess();
export const playAchievement = (): void => audio.playAchievement();
export const playMapOpen = (): void => audio.playMapOpen();
export const playTransfer = (): void => audio.playTransfer();

// -- Enemy death scream exports (#37) --
export const playEnemyDeathByType = (enemyName: string): void => audio.playEnemyDeathByType(enemyName);
export const playZombieDeath = (): void => audio.playZombieDeath();
export const playCerberusDeath = (): void => audio.playCerberusDeath();
export const playLickerDeath = (): void => audio.playLickerDeath();
export const playHunterDeath = (): void => audio.playHunterDeath();
export const playTyrantDeath = (): void => audio.playTyrantDeath();
export const playNemesisDeath = (): void => audio.playNemesisDeath();

export const playBgm = (type: BgmType): void => audio.playBgm(type);
export const stopBgm = (): void => audio.stopBgm();
export const pauseBgm = (): void => audio.pauseBgm();
export const resumeBgm = (): void => audio.resumeBgm();
export const setBgmVolume = (vol: number): void => audio.setBgmVolume(vol);

export function setMasterVolume(vol: number): void { audio.setVolume(vol); }
