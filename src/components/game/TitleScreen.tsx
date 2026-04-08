'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Skull, Upload } from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';

export default function TitleScreen() {
  const goToCharacterSelect = useGameStore(s => s.goToCharacterSelect);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/api/media/image?id=bg_title')" }}
      />
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 flex flex-col items-center gap-6">
        {/* Umbrella Corp logo style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="mb-2"
        >
          <div className="text-red-600 text-xs tracking-[0.5em] uppercase mb-4 font-mono">
            Umbrella Corporation Presenta
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight"
          style={{
            color: '#e5e5e5',
            textShadow: '0 0 40px rgba(220,38,38,0.6), 0 0 80px rgba(220,38,38,0.3), 0 0 120px rgba(220,38,38,0.1), 3px 3px 0 #000',
          }}
        >
          RACCOON CITY
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.8, 1] }}
          transition={{ duration: 2, delay: 1.2 }}
          className="text-lg sm:text-2xl md:text-3xl tracking-[0.3em] text-red-400/80 font-light uppercase"
        >
          Escape from Horror
        </motion.h2>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '200px' }}
          transition={{ duration: 1.5, delay: 1.8 }}
          className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="text-gray-400 text-sm sm:text-base max-w-md leading-relaxed italic"
        >
          Il virus T ha trasformato la città in un incubo. 
          Siete gli ultimi sopravvissuti. Trovate una via d&apos;uscita... 
          prima che sia troppo tardi.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3 }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            onClick={goToCharacterSelect}
            size="lg"
            className="horror-btn group relative px-12 py-6 text-lg tracking-widest uppercase
              bg-red-900/40 hover:bg-red-800/50 border-2 border-red-700/60 hover:border-red-500
              text-red-100 hover:text-white transition-all duration-300
              hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
          >
            <span className="relative z-10 flex items-center gap-3">
              <Skull className="w-5 h-5" />
              Nuova partita
            </span>
          </Button>
          <SaveLoadPanel
            mode="load"
            renderClosed={(openPanel) => (
              <Button
                size="lg"
                onClick={() => openPanel('load')}
                className="horror-btn group relative px-12 py-6 text-lg tracking-widest uppercase
                  bg-red-900/40 hover:bg-red-800/50 border-2 border-red-700/60 hover:border-red-500
                  text-red-100 hover:text-white transition-all duration-300
                  hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Upload className="w-5 h-5" />
                  Carica partita
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
          ⚠ CONTENUTO HORROR — Gioco a turni per 1-3 giocatori
        </motion.p>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 vignette-overlay pointer-events-none" />
    </div>
  );
}
