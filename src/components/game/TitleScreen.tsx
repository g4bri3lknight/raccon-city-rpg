'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { mediaUrl } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Skull, Upload } from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';

// Default values (used until settings load)
const DEFAULTS: Record<string, string> = {
  'titleScreen.umbrellaText':    'Umbrella Corporation Presenta',
  'titleScreen.title':           'RACCOON CITY',
  'titleScreen.subtitle':        'Escape from Horror',
  'titleScreen.description':     'Il virus T ha trasformato la città in un incubo. Siete gli ultimi sopravvissuti. Trovate una via d\'uscita... prima che sia troppo tardi.',
  'titleScreen.newGameBtn':      'Nuova partita',
  'titleScreen.loadGameBtn':     'Carica partita',
  'titleScreen.warningText':     '⚠ CONTENUTO HORROR — Gioco a turni per 1-3 giocatori',
  'titleScreen.umbrellaColor':   '#dc2626',
  'titleScreen.titleColor':      '#e5e5e5',
  'titleScreen.titleGlow':       '0 0 40px rgba(220,38,38,0.6), 0 0 80px rgba(220,38,38,0.3), 0 0 120px rgba(220,38,38,0.1), 3px 3px 0 #000',
  'titleScreen.subtitleColor':   '#f87171',
  'titleScreen.overlayOpacity':  '0.7',
  'titleScreen.btnBg':           '#7f1d1d',
  'titleScreen.btnBorder':       '#b91c1c',
  'titleScreen.btnHoverBg':      '#991b1b',
  'titleScreen.btnHoverBorder':  '#ef4444',
  'titleScreen.btnTextColor':    '#fee2e2',
  'titleScreen.btnGlowHover':    'rgba(220,38,38,0.4)',
};

function s(settings: Record<string, string>, key: string): string {
  return settings[key] || DEFAULTS[key] || '';
}

export default function TitleScreen() {
  const goToCharacterSelect = useGameStore(s => s.goToCharacterSelect);
  const dataVersion = useGameStore(s => s.dataVersion);
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULTS);

  // Load settings from DB
  useEffect(() => {
    fetch('/api/game-settings')
      .then(r => r.json())
      .then(map => {
        if (map && typeof map === 'object') setSettings(map as Record<string, string>);
      })
      .catch(() => {});
  }, [dataVersion]);

  const bgUrl = mediaUrl('/api/media/image?id=bg_title', dataVersion);

  // Style values
  const overlayOpacity = parseFloat(s(settings, 'titleScreen.overlayOpacity')) || 0.7;

  // Button styles
  const btnStyle = {
    '--btn-bg': s(settings, 'titleScreen.btnBg'),
    '--btn-border': s(settings, 'titleScreen.btnBorder'),
    '--btn-hover-bg': s(settings, 'titleScreen.btnHoverBg'),
    '--btn-hover-border': s(settings, 'titleScreen.btnHoverBorder'),
    '--btn-text': s(settings, 'titleScreen.btnTextColor'),
    '--btn-glow': s(settings, 'titleScreen.btnGlowHover'),
  } as React.CSSProperties;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 flex flex-col items-center gap-6">
        {/* Umbrella Corp text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="mb-2"
        >
          <div
            className="text-xs tracking-[0.5em] uppercase mb-4 font-mono"
            style={{ color: s(settings, 'titleScreen.umbrellaColor') }}
          >
            {s(settings, 'titleScreen.umbrellaText')}
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight"
          style={{
            color: s(settings, 'titleScreen.titleColor'),
            textShadow: s(settings, 'titleScreen.titleGlow'),
          }}
        >
          {s(settings, 'titleScreen.title')}
        </motion.h1>

        {/* Subtitle */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.8, 1] }}
          transition={{ duration: 2, delay: 1.2 }}
          className="text-lg sm:text-2xl md:text-3xl tracking-[0.3em] font-light uppercase"
          style={{ color: s(settings, 'titleScreen.subtitleColor') }}
        >
          {s(settings, 'titleScreen.subtitle')}
        </motion.h2>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '200px' }}
          transition={{ duration: 1.5, delay: 1.8 }}
          className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent"
        />

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="text-gray-400 text-sm sm:text-base max-w-md leading-relaxed italic"
        >
          {s(settings, 'titleScreen.description')}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3 }}
          className="flex flex-col items-center gap-3"
          style={btnStyle}
        >
          <Button
            onClick={goToCharacterSelect}
            size="lg"
            className="horror-btn group relative px-12 py-6 text-lg tracking-widest uppercase transition-all duration-300 hover:shadow-[0_0_30px_var(--btn-glow)]"
            style={{
              backgroundColor: 'var(--btn-bg)',
              borderColor: 'var(--btn-border)',
              color: 'var(--btn-text)',
              borderWidth: '2px',
            }}
          >
            <span className="relative z-10 flex items-center gap-3">
              <Skull className="w-5 h-5" />
              {s(settings, 'titleScreen.newGameBtn')}
            </span>
          </Button>
          <SaveLoadPanel
            mode="load"
            renderClosed={(openPanel) => (
              <Button
                size="lg"
                onClick={() => openPanel('load')}
                className="horror-btn group relative px-12 py-6 text-lg tracking-widest uppercase transition-all duration-300 hover:shadow-[0_0_30px_var(--btn-glow)]"
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  borderColor: 'var(--btn-border)',
                  color: 'var(--btn-text)',
                  borderWidth: '2px',
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Upload className="w-5 h-5" />
                  {s(settings, 'titleScreen.loadGameBtn')}
                </span>
              </Button>
            )}
          />
        </motion.div>

        {/* Warning text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.7, 1] }}
          transition={{ duration: 4, delay: 4, repeat: Infinity }}
          className="text-red-300 text-xs sm:text-sm font-mono tracking-wider mt-8"
          style={{ textShadow: '0 0 10px rgba(248,113,113,0.5)' }}
        >
          {s(settings, 'titleScreen.warningText')}
        </motion.p>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 vignette-overlay pointer-events-none" />
    </div>
  );
}
