'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Skull, Clock, Swords, ShieldHeart, Heart, Target, Package, BookOpen, Lock, Zap, MapPin, Users, Crown } from 'lucide-react';
import { ENEMIES } from '@/game/data/enemies';

function formatPlayTime(startTime: number): string {
  if (!startTime || startTime === 0) return '00:00';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function GameOverScreen() {
  const { party, turnCount, restartGame, gameStats } = useGameStore();

  const totalKills = useMemo(() => {
    return Object.values(gameStats.enemiesKilled).reduce((s, c) => s + c, 0);
  }, [gameStats.enemiesKilled]);

  const topEnemyKills = useMemo(() => {
    return Object.entries(gameStats.enemiesKilled)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([enemyId, count]) => {
        const def = ENEMIES[enemyId];
        return { name: def?.name || enemyId, icon: def?.icon || '💀', count };
      });
  }, [gameStats.enemiesKilled]);

  const playTime = useMemo(() => formatPlayTime(gameStats.startTime), [gameStats.startTime]);

  const stats = [
    { icon: Swords, label: 'Danni Inflitti', value: gameStats.totalDamageDealt.toLocaleString(), color: 'text-red-400' },
    { icon: ShieldHeart, label: 'Danni Subiti', value: gameStats.totalDamageReceived.toLocaleString(), color: 'text-orange-400' },
    { icon: Heart, label: 'Cure Effettuate', value: gameStats.totalHealingDone.toLocaleString(), color: 'text-green-400' },
    { icon: Target, label: 'Nemici Uccisi', value: totalKills.toString(), color: 'text-purple-400' },
    { icon: Package, label: 'Oggetti Usati', value: gameStats.itemsUsed.toString(), color: 'text-blue-400' },
    { icon: BookOpen, label: 'Documenti', value: gameStats.documentsFound.toString(), color: 'text-amber-400' },
    { icon: Lock, label: 'Stanze Segrete', value: gameStats.secretRoomsFound.toString(), color: 'text-cyan-400' },
    { icon: Zap, label: 'Parry', value: gameStats.parriesPerformed.toString(), color: 'text-yellow-400' },
    { icon: MapPin, label: 'Luoghi Visitati', value: gameStats.locationsVisited.toString(), color: 'text-emerald-400' },
    { icon: Users, label: 'NPC Incontrati', value: gameStats.npcsEncountered.toString(), color: 'text-indigo-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center game-horror relative overflow-hidden">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-red-950/30 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 vignette-overlay-red pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-center px-4 max-w-lg w-full"
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
          className="text-gray-500 text-sm leading-relaxed mb-6 italic"
        >
          Le tenebre di Raccoon City hanno consumato ogni speranza.
          I sopravvissuti sono caduti, e la città resta prigioniera dell&apos;incubo.
          Il virus T ha vinto... stavolta.
        </motion.p>

        {/* Party Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="glass-dark-accent rounded-lg p-4 mb-4 text-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Sopravvissuti Caduti</span>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Clock className="w-3 h-3" />
              {playTime}
            </div>
          </div>
          <div className="space-y-2">
            {party.map(char => (
              <div key={char.id} className="flex items-center gap-2 text-gray-500 text-xs">
                <span className="text-base">
                  {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : char.archetype === 'control' ? '🎯' : '⚔️'}
                </span>
                <span className="flex-1 text-left text-gray-300">{char.name}</span>
                <span className="text-gray-500">Lv.{char.level}</span>
                <span className="text-red-800 font-bold">✕</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.04] flex justify-between text-xs">
            <span className="text-gray-600">Turni sopravvissuti</span>
            <span className="text-gray-400 font-bold">{turnCount}</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="glass-dark-accent rounded-lg p-4 mb-4 max-h-[340px] overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-red-700/60" />
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Statistiche di Gioco</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <stat.icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <span className="text-gray-600 text-[11px] flex-1 text-left">{stat.label}</span>
                <span className={`text-xs font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Boss defeated */}
          {gameStats.bossDefeated.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px]">👑</span>
                <span className="text-gray-600 text-[11px] uppercase tracking-wider font-bold">Boss Sconfitti</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gameStats.bossDefeated.map((bossId) => {
                  const def = ENEMIES[bossId];
                  return (
                    <span key={bossId} className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 border border-red-800/20 text-red-300">
                      {def?.icon || '💀'} {def?.name || bossId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top enemy kills */}
          {topEnemyKills.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px]">💀</span>
                <span className="text-gray-600 text-[11px] uppercase tracking-wider font-bold">Nemici per Tipo</span>
              </div>
              <div className="space-y-1">
                {topEnemyKills.map((ek) => (
                  <div key={ek.name} className="flex items-center gap-2 text-[11px]">
                    <span>{ek.icon}</span>
                    <span className="text-gray-500 flex-1 text-left">{ek.name}</span>
                    <span className="text-gray-400 font-bold">×{ek.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
