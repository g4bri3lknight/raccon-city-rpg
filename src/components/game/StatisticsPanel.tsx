'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameStatistics } from '@/game/types';
import { ENEMIES } from '@/game/data/loader';
import { LOCATIONS } from '@/game/data/loader';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, Heart, Pill, Target, Footprints, Skull, MapPin, Backpack, Zap } from 'lucide-react';

interface StatisticsPanelProps {
  statistics: GameStatistics;
  visitedLocations: string[];
  collectedDocuments: string[];
  theme?: 'victory' | 'defeat';
  delay?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}

export default function StatisticsPanel({
  statistics,
  visitedLocations,
  collectedDocuments,
  theme = 'victory',
  delay = 2.0,
}: StatisticsPanelProps) {
  const totalLocations = Object.keys(LOCATIONS).length;

  // Build kill breakdown sorted by count
  const killBreakdown = useMemo(() => {
    return Object.entries(statistics.killsByType)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({
        name: ENEMIES[id]?.name || id,
        icon: ENEMIES[id]?.icon || '👾',
        count,
      }));
  }, [statistics.killsByType]);

  // Calculate efficiency ratio
  const damageEfficiency = statistics.totalDamageReceived > 0
    ? Math.round((statistics.totalDamageDealt / statistics.totalDamageReceived) * 100) / 100
    : statistics.totalDamageDealt > 0 ? Infinity : 0;

  const accentColor = theme === 'victory'
    ? { border: 'border-amber-500/20', text: 'text-amber-300', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/10' }
    : { border: 'border-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10', glow: 'shadow-red-500/10' };

  const sectionTitle = theme === 'victory' ? 'Statistiche Combattimento' : 'Statistiche di Sopravvivenza';
  const sectionIcon = theme === 'victory' ? '⚔️' : '💀';

  const stats = [
    { icon: Sword, label: 'Nemici sconfitti', value: formatNumber(statistics.totalKills), color: 'text-emerald-400' },
    { icon: Skull, label: 'Boss sconfitti', value: formatNumber(statistics.totalBossesDefeated), color: 'text-orange-400' },
    { icon: Sword, label: 'Danni totali inflitti', value: formatNumber(statistics.totalDamageDealt), color: 'text-emerald-300' },
    { icon: Shield, label: 'Danni totali subiti', value: formatNumber(statistics.totalDamageReceived), color: 'text-red-400' },
    { icon: Heart, label: 'Cura totale', value: formatNumber(statistics.totalHealing), color: 'text-green-400' },
    { icon: Pill, label: 'Oggetti usati', value: formatNumber(statistics.totalItemsUsed), color: 'text-cyan-400' },
    { icon: Zap, label: 'Colpi critici', value: formatNumber(statistics.criticalHits), color: 'text-yellow-400' },
    { icon: Footprints, label: 'Fughe', value: formatNumber(statistics.totalFled), color: 'text-gray-400' },
    { icon: Target, label: 'Nemici incontrati', value: formatNumber(statistics.totalEnemiesEncountered), color: 'text-gray-300' },
    { icon: MapPin, label: 'Location visitate', value: `${visitedLocations.length}/${totalLocations}`, color: 'text-purple-400' },
    { icon: Backpack, label: 'Oggetti trovati', value: formatNumber(statistics.totalItemsFound), color: 'text-amber-300' },
  ];

  return (
    <>
      {/* Combat Stats Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="glass-dark rounded-xl border-white/[0.06] p-4 mb-4"
      >
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>{sectionIcon}</span>
          <span>{sectionTitle}</span>
          {damageEfficiency > 0 && damageEfficiency !== Infinity && (
            <Badge className={`ml-auto text-[10px] ${accentColor.bg} ${accentColor.text} border-0`}>
              Efficienza: {formatNumber(damageEfficiency)}x
            </Badge>
          )}
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.05 }}
              className="flex items-center gap-2 text-white/60 p-1.5 rounded-lg bg-white/[0.03]"
            >
              <stat.icon className={`w-3.5 h-3.5 shrink-0 ${stat.color}`} />
              <span className="truncate">
                <span className="text-white/40">{stat.label}:</span>{' '}
                <strong className="text-white">{stat.value}</strong>
              </span>
            </motion.div>
          ))}
        </div>

        {/* Kill Breakdown */}
        {killBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.8 }}
            className="mt-3 pt-3 border-t border-white/[0.06]"
          >
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Nemici per Tipo</p>
            <div className="flex flex-wrap gap-1.5">
              {killBreakdown.map(kb => (
                <Badge
                  key={kb.name}
                  className="text-[10px] bg-white/[0.04] text-white/60 border border-white/[0.06] gap-1"
                >
                  <span>{kb.icon}</span>
                  {kb.name} ×{kb.count}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Status Effects */}
        {(statistics.poisonTurns > 0 || statistics.bleedingTurns > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 1.0 }}
            className="mt-2 flex gap-3 text-[10px] text-white/30"
          >
            {statistics.poisonTurns > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500/60" />
                Turni avvelenato: {statistics.poisonTurns}
              </span>
            )}
            {statistics.bleedingTurns > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500/60" />
                Turni sanguinamento: {statistics.bleedingTurns}
              </span>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Exploration Stats Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.3, duration: 0.5 }}
        className="glass-dark rounded-xl border-white/[0.06] p-4 mb-4"
      >
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
          📍 Statistiche Esplorazione
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-white/60 p-1.5 rounded-lg bg-white/[0.03]">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>
              <span className="text-white/40">Location:</span>{' '}
              <strong className="text-white">{visitedLocations.length}/{totalLocations}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/60 p-1.5 rounded-lg bg-white/[0.03]">
            <Backpack className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              <span className="text-white/40">Oggetti:</span>{' '}
              <strong className="text-white">{formatNumber(statistics.totalItemsFound)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/60 p-1.5 rounded-lg bg-white/[0.03]">
            <span className="text-sm shrink-0">📖</span>
            <span>
              <span className="text-white/40">Documenti:</span>{' '}
              <strong className="text-white">{collectedDocuments.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/60 p-1.5 rounded-lg bg-white/[0.03]">
            <Target className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span>
              <span className="text-white/40">Turni combattimento:</span>{' '}
              <strong className="text-white">{formatNumber(statistics.totalTurnsInCombat)}</strong>
            </span>
          </div>
        </div>

        {/* Location progress bar */}
        {totalLocations > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.6 }}
            className="mt-3 pt-3 border-t border-white/[0.06]"
          >
            <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
              <span>Esplorazione</span>
              <span>{Math.round((visitedLocations.length / totalLocations) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(visitedLocations.length / totalLocations) * 100}%` }}
                transition={{ delay: delay + 0.7, duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${theme === 'victory'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-red-700 to-red-400'
                }`}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
