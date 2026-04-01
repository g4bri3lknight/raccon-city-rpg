'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, RotateCcw } from 'lucide-react';

export default function VictoryScreen() {
  const { party, turnCount, restartGame } = useGameStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center game-horror relative overflow-hidden">
      {/* Golden vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-amber-950/20 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
      }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-center px-4 max-w-lg"
      >
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mb-6"
        >
          <Trophy className="w-24 h-24 text-amber-500 mx-auto" style={{
            filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.5))',
          }} />
        </motion.div>

        {/* Victory Text */}
        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="text-6xl sm:text-8xl font-black text-amber-400 mb-2"
          style={{
            textShadow: '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2), 3px 3px 0 #000',
          }}
        >
          VITTORIA!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-amber-600/80 text-sm tracking-[0.3em] uppercase mb-6"
        >
          Siete sopravvissuti
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '200px' }}
          transition={{ delay: 1, duration: 1 }}
          className="h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-6"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-gray-300 text-sm leading-relaxed mb-8 max-w-md mx-auto"
        >
          Contro ogni probabilità, avete affrontato gli orrori di Raccoon City e siete sopravvissuti.
          Il Tyrant è stato sconfitto. L&apos;elicottero vi aspetta sulla torre dell&apos;orologio.
          L&apos;incubo sta per finire... o forse è solo l&apos;inizio.
        </motion.p>

        {/* Party Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="glass-dark rounded-xl border-amber-700/20 p-5 mb-8 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Riepilogo Finale</h3>
            <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30">
              <Star className="w-3 h-3 mr-1" /> Turno {turnCount}
            </Badge>
          </div>
          <div className="space-y-3">
            {party.map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 + i * 0.2 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40"
              >
                <span className="text-2xl">
                  {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : '⚔️'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-200">{char.name}</span>
                    <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                      {char.archetype.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                    <span>Lv.{char.level}</span>
                    <span>HP: {char.currentHp}/{char.maxHp}</span>
                    <span>ATK: {char.baseAtk + (char.weapon?.atkBonus || 0)}</span>
                    <span>DEF: {char.baseDef}</span>
                  </div>
                </div>
                <div className="text-amber-500 text-lg">
                  <Star className="w-5 h-5" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Replay Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
        >
          <Button
            onClick={restartGame}
            size="lg"
            className="px-10 py-5 text-base tracking-widest uppercase
              bg-amber-900/40 hover:bg-amber-800/50 border-2 border-amber-700/60 hover:border-amber-500
              text-amber-100 hover:text-white transition-all duration-300
              hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Gioca Ancora
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
