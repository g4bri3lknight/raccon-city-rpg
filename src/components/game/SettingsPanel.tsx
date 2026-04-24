'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { audioEngine } from '@/game/engine/sounds';
import { Button } from '@/components/ui/button';
import { X, Volume2, VolumeX, Music, Gamepad2, Settings, Gauge, Bug, ShieldCheck } from 'lucide-react';

const SETTINGS_KEY = 'raccoon_city_settings';

interface PersistedSettings {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  autoCombatDefault: boolean;
  combatSpeed: 1 | 2 | 3;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  masterVolume: 50,
  sfxVolume: 50,
  bgmVolume: 50,
  muted: false,
  autoCombatDefault: false,
  combatSpeed: 1,
};

export const BASE_AUTO_COMBAT_DELAY = 900;

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function applyAudioSettings(s: PersistedSettings): void {
  audioEngine.muted = s.muted;
  audioEngine.volume = s.masterVolume / 100;
  audioEngine.sfxVolume = s.sfxVolume / 100;
  audioEngine.bgmVolume = s.bgmVolume / 100;
}

export default function SettingsPanel() {
  const settingsOpen = useGameStore(s => s.settingsOpen);
  const toggleSettings = useGameStore(s => s.toggleSettings);
  const autoCombat = useGameStore(s => s.autoCombat);
  const setAutoCombatPreference = useGameStore(s => s.setAutoCombatPreference);

  const [savedOnInit] = useState(loadSettings);
  const [masterVolume, setMasterVolume] = useState(savedOnInit.masterVolume);
  const [sfxVolume, setSfxVolume] = useState(savedOnInit.sfxVolume);
  const [bgmVolume, setBgmVolume] = useState(savedOnInit.bgmVolume);
  const [muted, setMuted] = useState(savedOnInit.muted);
  const [combatSpeed, setCombatSpeed] = useState<1 | 2 | 3>(savedOnInit.combatSpeed);
  const mountedRef = useRef(false);

  useEffect(() => {
    applyAudioSettings(savedOnInit);
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    saveSettings({ masterVolume, sfxVolume, bgmVolume, muted, autoCombatDefault: autoCombat, combatSpeed });
  }, [masterVolume, sfxVolume, bgmVolume, muted, autoCombat, combatSpeed]);

  const handleMasterVolume = useCallback((v: number) => {
    setMasterVolume(v);
    audioEngine.volume = v / 100;
  }, []);

  const handleSfxVolume = useCallback((v: number) => {
    setSfxVolume(v);
    audioEngine.sfxVolume = v / 100;
  }, []);

  const handleBgmVolume = useCallback((v: number) => {
    setBgmVolume(v);
    audioEngine.bgmVolume = v / 100;
  }, []);

  const handleMuteToggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    audioEngine.muted = next;
  }, [muted]);

  const handleAutoCombatToggle = useCallback(() => {
    setAutoCombatPreference(!autoCombat);
  }, [autoCombat, setAutoCombatPreference]);

  const handleCombatSpeed = useCallback((speed: 1 | 2 | 3) => {
    setCombatSpeed(speed);
  }, []);

  const handleOpenDebugPanel = useCallback(() => {
    useGameStore.setState({ debugOpen: true });
    toggleSettings();
  }, [toggleSettings]);

  const handleOpenAdminPanel = useCallback(() => {
    toggleSettings();
    // Small delay so settings panel closes first
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
    }, 150);
  }, [toggleSettings]);

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleSettings();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md glass-dark rounded-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03] shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Impostazioni</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">Configura audio e gameplay</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={toggleSettings}
                className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-6">

              {/* ── Audio Section ── */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" />
                  Audio
                </h3>
                <div className="space-y-4">
                  {/* Master Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-white/70 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-white/40" />
                        Volume Master
                      </label>
                      <span className="text-xs font-mono text-amber-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        {masterVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={masterVolume}
                      onChange={(e) => handleMasterVolume(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(245,158,11,0.5)]
                        bg-white/[0.08] [&::-webkit-slider-runnable-track]:rounded-full"
                      style={{
                        background: `linear-gradient(to right, #f59e0b ${masterVolume}%, rgba(255,255,255,0.08) ${masterVolume}%)`,
                      }}
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-white/70 flex items-center gap-2">
                        <Music className="w-4 h-4 text-white/40" />
                        Volume SFX
                      </label>
                      <span className="text-xs font-mono text-emerald-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        {sfxVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={sfxVolume}
                      onChange={(e) => handleSfxVolume(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(16,185,129,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(16,185,129,0.5)]
                        bg-white/[0.08]"
                      style={{
                        background: `linear-gradient(to right, #10b981 ${sfxVolume}%, rgba(255,255,255,0.08) ${sfxVolume}%)`,
                      }}
                    />
                  </div>

                  {/* BGM Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-white/70 flex items-center gap-2">
                        <Music className="w-4 h-4 text-white/40" />
                        Volume BGM
                      </label>
                      <span className="text-xs font-mono text-purple-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        {bgmVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={bgmVolume}
                      onChange={(e) => handleBgmVolume(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-500
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.5)]
                        bg-white/[0.08]"
                      style={{
                        background: `linear-gradient(to right, #a855f7 ${bgmVolume}%, rgba(255,255,255,0.08) ${bgmVolume}%)`,
                      }}
                    />
                  </div>

                  {/* Mute Toggle */}
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <label className="text-sm text-white/70 flex items-center gap-2 cursor-pointer">
                      {muted ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-green-400" />
                      )}
                      {muted ? 'Audio Disattivato' : 'Audio Attivo'}
                    </label>
                    <div className={`relative w-10 h-[22px] rounded-full transition-colors ${muted ? 'bg-white/[0.08]' : 'bg-green-600'}`}>
                      <div
                        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${muted ? 'left-[2px]' : 'left-[20px]'}`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06]" />

              {/* ── Developer Tools Section ── */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Bug className="w-3.5 h-3.5" />
                  Strumenti Sviluppo
                </h3>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleOpenDebugPanel}
                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg bg-white/[0.03] border border-yellow-500/20 hover:bg-yellow-500/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <label className="text-sm text-yellow-300/80 flex items-center gap-2 cursor-pointer">
                        <Bug className="w-4 h-4 text-yellow-400" />
                        Debug Panel
                      </label>
                      <p className="text-[10px] text-white/30 ml-6">
                        Cure, spawn nemici, teletrasporto, god mode
                      </p>
                    </div>
                    <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">F2</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAdminPanel}
                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg bg-white/[0.03] border border-emerald-500/20 hover:bg-emerald-500/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <label className="text-sm text-emerald-300/80 flex items-center gap-2 cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Admin Panel
                      </label>
                      <p className="text-[10px] text-white/30 ml-6">
                        CRUD oggetti, quest, eventi, documenti, suoni
                      </p>
                    </div>
                    <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">F3</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06]" />

              {/* ── Gameplay Section ── */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  Gameplay
                </h3>
                <div className="space-y-3">
                  {/* Combat Speed */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/70 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-purple-400" />
                      Velocità Combattimento
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { value: 1, label: '1×', sub: 'Normale' },
                        { value: 2, label: '2×', sub: 'Veloce' },
                        { value: 3, label: '3×', sub: 'Molto Veloce' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleCombatSpeed(opt.value)}
                          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-xs transition-all cursor-pointer
                            ${combatSpeed === opt.value
                              ? 'bg-purple-600/25 border-purple-500/60 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70'
                            }`}
                        >
                          <span className="text-sm font-bold">{opt.label}</span>
                          <span className="text-[9px] opacity-70">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 ml-6">
                      Modifica la velocità dell'auto-combattimento
                    </p>
                  </div>
                  {/* Auto-Combat Toggle */}
                  <button
                    type="button"
                    onClick={handleAutoCombatToggle}
                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <label className="text-sm text-white/70 flex items-center gap-2 cursor-pointer">
                        <Gamepad2 className="w-4 h-4 text-amber-400" />
                        Auto-Combat
                      </label>
                      <p className="text-[10px] text-white/30 ml-6">
                        Attiva automaticamente il combattimento automatico
                      </p>
                    </div>
                    <div className={`relative w-10 h-[22px] rounded-full transition-colors ${autoCombat ? 'bg-amber-600' : 'bg-white/[0.08]'}`}>
                      <div
                        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${autoCombat ? 'left-[20px]' : 'left-[2px]'}`}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
              <Button
                onClick={toggleSettings}
                className="w-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-sm py-2.5"
              >
                Chiudi
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
