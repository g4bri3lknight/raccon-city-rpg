// BGM Module — Lazy-loaded cinematic background music for Raccoon City RPG
// Dynamically imported by sounds.ts. Monkey-patches AudioEngine with BGM.

import { audio } from './sounds';
import type { AudioEngine } from './sounds';
export type { BgmType } from './sounds';

type BgmType = 'title' | 'city_outskirts' | 'rpd_station' | 'hospital' | 'sewers' | 'laboratory' | 'clock_tower' | 'combat' | 'victory' | 'gameover';

const periodicTimers: ReturnType<typeof setInterval>[] = [];
let _reverbConvolver: ConvolverNode | null = null;
let _reverbGain: GainNode | null = null;

function bgmDest(a: AudioEngine): AudioNode { return a.bgmMixer!; }

function bgmReverbSend(a: AudioEngine): AudioNode {
  if (!_reverbConvolver || !_reverbGain) {
    const ctx = a.ctx!;
    const len = Math.floor(ctx.sampleRate * 3.0);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.0);
    }
    _reverbConvolver = ctx.createConvolver();
    _reverbConvolver.buffer = buf;
    _reverbGain = ctx.createGain();
    _reverbGain.gain.value = 0.3;
    _reverbConvolver.connect(_reverbGain);
    _reverbGain.connect(a.bgmGain!);
  }
  return _reverbConvolver;
}

function stopAllBgmNodes(a: AudioEngine): void {
  const L = a.bgmLayers;
  for (const o of L.oscillators) { try { o.stop(); o.disconnect(); } catch {} }
  for (const s of L.sources) { try { s.stop(); s.disconnect(); } catch {} }
  for (const g of L.gains) { try { g.disconnect(); } catch {} }
  for (const l of L.lfos) { try { l.stop(); l.disconnect(); } catch {} }
  for (const tid of periodicTimers) clearInterval(tid);
  periodicTimers.length = 0;
  a.bgmLayers = { oscillators: [], sources: [], gains: [], lfos: [] };
}

// -- Compact BGM helpers --

function bgmOsc(a: AudioEngine, type: OscillatorType, freq: number, vol: number, reverb = false): void {
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  osc.connect(g); g.connect(bgmDest(a));
  if (reverb) g.connect(bgmReverbSend(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g);
}

function bgmTremolo(a: AudioEngine, freq: number, vol: number, lfoF: number, lfoD: number, reverb = false): void {
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = 0.001;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = lfoF;
  const lg = ctx.createGain(); lg.gain.value = lfoD;
  lfo.connect(lg); lg.connect(g.gain); lfo.start(ctx.currentTime);
  osc.connect(g); g.connect(bgmDest(a));
  if (reverb) g.connect(bgmReverbSend(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g); a.bgmLayers.lfos.push(lfo);
}

function bgmNoise(a: AudioEngine, ft: BiquadFilterType, ff: number, fq: number, vol: number, reverb = false): void {
  const ctx = a.ctx!;
  const src = ctx.createBufferSource(); src.buffer = a.noiseBuffer; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = ft; f.frequency.value = ff; f.Q.value = fq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(bgmDest(a));
  if (reverb) g.connect(bgmReverbSend(a));
  src.start(ctx.currentTime);
  a.bgmLayers.sources.push(src); a.bgmLayers.gains.push(g);
}

function bgmNoiseLfo(a: AudioEngine, ft: BiquadFilterType, baseF: number, lfoF: number, lfoD: number, vol: number): void {
  const ctx = a.ctx!;
  const src = ctx.createBufferSource(); src.buffer = a.noiseBuffer; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = ft; f.frequency.value = baseF; f.Q.value = 2;
  const g = ctx.createGain(); g.gain.value = vol;
  const lfo = a.createLfo(lfoF, lfoD, f.frequency);
  src.connect(f); f.connect(g); g.connect(bgmDest(a));
  src.start(ctx.currentTime);
  a.bgmLayers.sources.push(src); a.bgmLayers.gains.push(g); a.bgmLayers.lfos.push(lfo);
}

function bgmDrone(a: AudioEngine, wave: OscillatorType, freq: number, vol: number, lfoF?: number, lfoD?: number): void {
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = wave; osc.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  osc.connect(g); g.connect(bgmDest(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g);
  if (lfoF !== undefined && lfoD !== undefined) a.bgmLayers.lfos.push(a.createLfo(lfoF, lfoD, osc.frequency));
}

function bgmHarmonic(a: AudioEngine, base: number, harmonics: number[], vol: number, lfoF?: number, lfoD?: number): void {
  const ctx = a.ctx!;
  for (const h of harmonics) {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = base * h;
    const v = vol * (1 / (h * h));
    const g = ctx.createGain(); g.gain.value = v;
    osc.connect(g); g.connect(bgmDest(a)); osc.start(ctx.currentTime);
    a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g);
    if (lfoF !== undefined && lfoD !== undefined)
      a.bgmLayers.lfos.push(a.createLfo(lfoF, lfoD / h, osc.frequency));
  }
}

function bgmPulse(a: AudioEngine, freq: number, bpm: number, vol: number, filtF?: number): void {
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = bpm / 60;
  const lg = ctx.createGain(); lg.gain.value = vol * 0.8;
  lfo.connect(lg); lg.connect(g.gain); lfo.start(ctx.currentTime);
  if (filtF !== undefined) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtF; f.Q.value = 1;
    osc.connect(f); f.connect(g);
  } else { osc.connect(g); }
  g.connect(bgmDest(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g); a.bgmLayers.lfos.push(lfo);
}

function bgmBlip(a: AudioEngine, freq: number, interval: number, vol: number, filtF?: number): void {
  const tid = setInterval(() => {
    try {
      if (!a.ctx || !a.isInitialized) return;
      const ctx = a.ctx, osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(vol, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      if (filtF !== undefined) {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtF; f.Q.value = 1;
        osc.connect(f); f.connect(env); env.connect(bgmDest(a));
      } else { osc.connect(env); env.connect(bgmDest(a)); }
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, interval);
  periodicTimers.push(tid);
}

function bgmRhythm(a: AudioEngine, filtF: number, fq: number, bpm: number, vol: number): void {
  const ctx = a.ctx!;
  const src = ctx.createBufferSource(); src.buffer = a.noiseBuffer; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filtF; f.Q.value = fq;
  const g = ctx.createGain(); g.gain.value = 0.001;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = bpm / 60;
  const lg = ctx.createGain(); lg.gain.value = vol;
  lfo.connect(lg); lg.connect(g.gain); lfo.start(ctx.currentTime);
  src.connect(f); f.connect(g); g.connect(bgmDest(a));
  src.start(ctx.currentTime);
  a.bgmLayers.sources.push(src); a.bgmLayers.gains.push(g); a.bgmLayers.lfos.push(lfo);
}

function bgmStereoPad(a: AudioEngine, baseF: number, vol: number, voices: number, detune: number): void {
  const ctx = a.ctx!;
  for (let i = 0; i < voices; i++) {
    const offset = ((i / (voices - 1)) - 0.5) * detune;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = baseF; osc.detune.value = offset;
    const g = ctx.createGain(); g.gain.value = vol / voices;
    const pan = ctx.createStereoPanner(); pan.pan.value = (i / (voices - 1) - 0.5) * 1.0;
    osc.connect(g); g.connect(pan); pan.connect(bgmDest(a)); osc.start(ctx.currentTime);
    a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g);
  }
}

// -- Track builders --

function buildTitleBgm(a: AudioEngine): void {
  bgmOsc(a, 'sine', 30, 0.18, true);
  bgmOsc(a, 'sine', 50, 0.12, true);
  bgmNoiseLfo(a, 'bandpass', 400, 0.08, 200, 0.05);
  bgmTremolo(a, 65, 0.001, 0.05, 0.06, true); // very slow thunder swell
  bgmPulse(a, 50, 40, 0.06, 200);
}

function buildCityOutskirtsBgm(a: AudioEngine): void {
  bgmNoiseLfo(a, 'bandpass', 550, 0.12, 250, 0.06);
  bgmNoiseLfo(a, 'bandpass', 700, 0.3, 200, 0.02);
  bgmNoise(a, 'lowpass', 60, 2.0, 0.03);
  bgmDrone(a, 'sine', 92, 0.04, 0.06, 4);
  bgmDrone(a, 'sine', 94, 0.035, 0.05, 3);
}

function buildRpdStationBgm(a: AudioEngine): void {
  bgmHarmonic(a, 60, [1, 2, 3], 0.06, 0.02, 2);
  bgmNoise(a, 'lowpass', 400, 1.0, 0.03, true);
  bgmTremolo(a, 150, 0.001, 0.06, 0.015, true);
  bgmDrone(a, 'sine', 233, 0.02, 0.04, 3);
  bgmRhythm(a, 800, 3.0, 42, 0.015);
}

function buildHospitalBgm(a: AudioEngine): void {
  bgmBlip(a, 1040, 850, 0.04, 3000);
  bgmBlip(a, 3000, 2200, 0.02, 4000);
  bgmDrone(a, 'triangle', 130, 0.04, 0.03, 2);
  bgmOsc(a, 'sine', 330, 0.02, true);
  bgmOsc(a, 'sine', 347, 0.015, true);
}

function buildSewersBgm(a: AudioEngine): void {
  bgmNoiseLfo(a, 'bandpass', 500, 0.1, 150, 0.05);
  bgmBlip(a, 3000, 1800, 0.025);
  bgmBlip(a, 2800, 2700, 0.02);
  bgmOsc(a, 'sine', 25, 0.15, true);
  bgmNoiseLfo(a, 'lowpass', 250, 0.07, 80, 0.04);
  bgmDrone(a, 'sine', 37, 0.06, 0.02, 1);
}

function buildLaboratoryBgm(a: AudioEngine): void {
  bgmHarmonic(a, 60, [1, 2, 3, 4], 0.05, 0.02, 1);
  bgmNoiseLfo(a, 'bandpass', 1500, 0.15, 300, 0.015);
  bgmBlip(a, 2000, 400, 0.01, 3000);
  bgmBlip(a, 1800, 600, 0.008, 2800);
  bgmDrone(a, 'sine', 110, 0.04, 0.01, 1);
  bgmBlip(a, 880, 4000, 0.02, 2000);
}

function buildClockTowerBgm(a: AudioEngine): void {
  bgmNoiseLfo(a, 'bandpass', 600, 0.06, 400, 0.04);
  bgmBlip(a, 2000, 1000, 0.03, 4000);
  bgmTremolo(a, 65, 0.001, 0.25, 0.06, true);
  bgmOsc(a, 'sine', 30, 0.1, true);
  // Epic tension chord: sawtooth through lowpass with reverb
  const ctx = a.ctx!;
  const dg = ctx.createGain(); dg.gain.value = 0.03;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 300; dlp.Q.value = 1;
  dg.connect(dlp); dlp.connect(bgmDest(a)); dlp.connect(bgmReverbSend(a));
  for (const f of [110, 155, 165]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(dg); o.start(ctx.currentTime); a.bgmLayers.oscillators.push(o);
  }
  a.bgmLayers.gains.push(dg);
}

function buildCombatBgm(a: AudioEngine): void {
  bgmPulse(a, 55, 140, 0.12, 250);
  // Menacing sawtooth drone through lowpass with LFO
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
  const mf = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 200; mf.Q.value = 2;
  const mg = ctx.createGain(); mg.gain.value = 0.05;
  const mlfo = a.createLfo(0.15, 80, mf.frequency);
  osc.connect(mf); mf.connect(mg); mg.connect(bgmDest(a)); mg.connect(bgmReverbSend(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(mg); a.bgmLayers.lfos.push(mlfo);
  bgmNoiseLfo(a, 'bandpass', 450, 0.4, 150, 0.04);
  // Tritone tension chord
  const clp = ctx.createBiquadFilter(); clp.type = 'lowpass'; clp.frequency.value = 300; clp.Q.value = 1;
  clp.connect(bgmDest(a)); clp.connect(bgmReverbSend(a));
  for (const f of [70, 105]) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = 0.025;
    o.connect(g); g.connect(clp); o.start(ctx.currentTime);
    a.bgmLayers.oscillators.push(o); a.bgmLayers.gains.push(g);
  }
}

function buildVictoryBgm(a: AudioEngine): void {
  bgmOsc(a, 'sine', 65, 0.08, true);
  bgmOsc(a, 'sine', 98, 0.05, true);
  bgmStereoPad(a, 220, 0.035, 5, 15);
  bgmStereoPad(a, 262, 0.025, 5, 12);
  bgmStereoPad(a, 330, 0.02, 5, 10);
  bgmNoise(a, 'lowpass', 200, 0.5, 0.02);
  bgmTremolo(a, 880, 0.001, 0.08, 0.008, true);
}

function buildGameOverBgm(a: AudioEngine): void {
  bgmOsc(a, 'sine', 20, 0.12, true);
  bgmOsc(a, 'sine', 28, 0.08, true);
  bgmPulse(a, 55, 25, 0.08, 180);
  // Fading tension drone
  const ctx = a.ctx!;
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 165;
  const g = ctx.createGain(); g.gain.value = 0.02;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.02;
  const lg = ctx.createGain(); lg.gain.value = 0.015;
  lfo.connect(lg); lg.connect(g.gain); lfo.start(ctx.currentTime);
  osc.connect(g); g.connect(bgmDest(a)); g.connect(bgmReverbSend(a));
  osc.start(ctx.currentTime);
  a.bgmLayers.oscillators.push(osc); a.bgmLayers.gains.push(g); a.bgmLayers.lfos.push(lfo);
  bgmNoise(a, 'lowpass', 100, 0.5, 0.01, true);
}

function startBgmTrack(a: AudioEngine, type: BgmType): void {
  switch (type) {
    case 'title': buildTitleBgm(a); break;
    case 'city_outskirts': buildCityOutskirtsBgm(a); break;
    case 'rpd_station': buildRpdStationBgm(a); break;
    case 'hospital': buildHospitalBgm(a); break;
    case 'sewers': buildSewersBgm(a); break;
    case 'laboratory': buildLaboratoryBgm(a); break;
    case 'clock_tower': buildClockTowerBgm(a); break;
    case 'combat': buildCombatBgm(a); break;
    case 'victory': buildVictoryBgm(a); break;
    case 'gameover': buildGameOverBgm(a); break;
  }
}

// -- Install: Monkey-patch the AudioEngine singleton --

function installBgm(engine: AudioEngine): void {
  const e = engine as Record<string, unknown>;
  const pending = e._pendingBgm as BgmType | null;
  e._pendingBgm = null;
  e._bgmLoaded = true;

  (engine as Record<string, unknown>).playBgm = function(type: BgmType): void {
    try {
      if (!engine.ensureContext() || !engine.resume()) return;
      if (engine.bgmTimeoutId !== null) { clearTimeout(engine.bgmTimeoutId); engine.bgmTimeoutId = null; }
      const ctx = engine.ctx!;
      if (engine.currentBgm === type) return;
      if (engine.currentBgm !== null && engine.bgmMixer) {
        const t = ctx.currentTime;
        engine.bgmMixer.gain.setValueAtTime(engine.bgmMixer.gain.value, t);
        engine.bgmMixer.gain.linearRampToValueAtTime(0.001, t + 1.0);
        engine.bgmTimeoutId = setTimeout(() => {
          stopAllBgmNodes(engine);
          startBgmTrack(engine, type);
          if (engine.bgmMixer) {
            const now = ctx.currentTime;
            engine.bgmMixer.gain.setValueAtTime(0.001, now);
            engine.bgmMixer.gain.linearRampToValueAtTime(1.0, now + 1.0);
          }
        }, 1050);
        engine.currentBgm = type;
        return;
      }
      engine.currentBgm = type;
      startBgmTrack(engine, type);
    } catch {}
  };

  (engine as Record<string, unknown>).stopBgm = function(): void {
    try {
      if (!engine.ctx || !engine.bgmMixer) return;
      if (engine.bgmTimeoutId !== null) { clearTimeout(engine.bgmTimeoutId); engine.bgmTimeoutId = null; }
      const t = engine.ctx.currentTime;
      engine.bgmMixer.gain.setValueAtTime(engine.bgmMixer.gain.value, t);
      engine.bgmMixer.gain.linearRampToValueAtTime(0.001, t + 1.0);
      engine.bgmTimeoutId = setTimeout(() => {
        stopAllBgmNodes(engine);
        engine.currentBgm = null;
        if (engine.bgmMixer) engine.bgmMixer.gain.value = 1.0;
      }, 1050);
    } catch {}
  };

  (engine as Record<string, unknown>).pauseBgm = function(): void {
    try {
      if (!engine.ctx || !engine.bgmMixer) return;
      engine.bgmMixer.gain.setValueAtTime(0.001, engine.ctx.currentTime);
    } catch {}
  };

  (engine as Record<string, unknown>).resumeBgm = function(): void {
    try {
      if (!engine.ctx || !engine.bgmMixer) return;
      const t = engine.ctx.currentTime;
      engine.bgmMixer.gain.setValueAtTime(0.001, t);
      engine.bgmMixer.gain.linearRampToValueAtTime(1.0, t + 0.5);
    } catch {}
  };

  if (pending) {
    (engine as { playBgm: (type: BgmType) => void }).playBgm(pending);
  }
}

installBgm(audio);
