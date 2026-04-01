'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Skull } from 'lucide-react';

export default function GameOverScreen() {
  const { party, turnCount, restartGame } = useGameStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center game-horror relative overflow-hidden">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-red-950/30 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 vignette-overlay-red pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-center px-4 max-w-lg"
      >
        {/* Skull Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mb-6"
        >
          <Skull className="w-20 h-20 text-red-700 mx-auto" />
        </motion.div>

        {/* Game Over Text */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-6xl sm:text-7xl font-black text-red-700 mb-4"
          style={{
            textShadow: '0 0 40px rgba(220,38,38,0.6), 0 0 80px rgba(220,38,38,0.3), 3px 3px 0 #000',
          }}
        >
          GAME OVER
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '180px' }}
          transition={{ delay: 0.8, duration: 1 }}
          className="h-px bg-red-800 mx-auto mb-6"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-gray-500 text-sm leading-relaxed mb-8 italic"
        >
          Le tenebre di Raccoon City hanno consumato ogni speranza.
          I sopravvissuti sono caduti, e la città resta prigioniera dell&apos;incubo.
          Il virus T ha vinto... stavolta.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="glass-dark-accent rounded-lg p-4 mb-8 text-sm"
        >
          <div className="grid grid-cols-2 gap-3 text-gray-400">
            <div>
              <span className="text-gray-600">Turni sopravvissuti</span>
              <div className="text-2xl font-bold text-gray-200">{turnCount}</div>
            </div>
            <div>
              <span className="text-gray-600">Sopravvissuti</span>
              <div className="text-2xl font-bold text-gray-200">{party.length}</div>
            </div>
            {party.map(char => (
              <div key={char.id} className="col-span-2 flex items-center gap-2 text-gray-500 text-xs">
                <span>
                  {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : '⚔️'}
                </span>
                {char.name} — Lv.{char.level}
                <span className="text-red-800">✕</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Restart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <Button
            onClick={restartGame}
            size="lg"
            className="horror-btn px-10 py-5 text-base tracking-widest uppercase
              bg-red-900/40 hover:bg-red-800/50 border-2 border-red-700/60 hover:border-red-500
              text-red-100 hover:text-white transition-all duration-300
              hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
          >
            <Skull className="w-5 h-5 mr-2" />
            Riprova
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
