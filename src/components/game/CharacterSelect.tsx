'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { CHARACTER_ARCHETYPES } from '@/game/data/characters';
import { Archetype } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Shield, Swords, Heart, Zap, ChevronRight, Check } from 'lucide-react';
import { CHARACTER_IMAGES } from '@/game/data/enemies';

function StatBar({ label, value, maxValue, color = 'red' }: { label: string; value: number; maxValue: number; color?: string }) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const colorMap: Record<string, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-amber-500',
    blue: 'bg-cyan-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-gray-400 font-mono uppercase">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`h-full rounded-full ${colorMap[color] || colorMap.red}`}
        />
      </div>
      <span className="w-6 text-right text-gray-300 font-mono">{value}</span>
    </div>
  );
}

export default function CharacterSelect() {
  const startAdventure = useGameStore(s => s.startAdventure);
  const startGame = useGameStore(s => s.startGame);
  const [selected, setSelected] = useState<Set<Archetype>>(new Set());

  const toggleSelect = (id: Archetype) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < 3) {
      next.add(id);
    }
    setSelected(next);
  };

  const maxStat = Math.max(...CHARACTER_ARCHETYPES.map(a => Math.max(a.maxHp, a.atk * 5, a.def * 5, a.spd * 8)));

  const handleStart = () => {
    if (selected.size > 0) {
      startAdventure(Array.from(selected));
    }
  };

  const archetypeIcons: Record<string, typeof Shield> = {
    tank: Shield,
    healer: Heart,
    dps: Swords,
  };

  const archetypeColors: Record<string, string> = {
    tank: 'border-red-800/50 hover:border-red-600',
    healer: 'border-green-800/50 hover:border-green-600',
    dps: 'border-amber-800/50 hover:border-amber-600',
  };

  const archetypeLabelColors: Record<string, string> = {
    tank: 'bg-red-900/60 text-red-300',
    healer: 'bg-green-900/60 text-green-300',
    dps: 'bg-amber-900/60 text-amber-300',
  };

  return (
    <div className="min-h-screen game-horror flex flex-col">
      {/* Header */}
      <div className="relative p-4 sm:p-6 border-b border-red-900/30">
        <Button variant="ghost" onClick={startGame} className="text-gray-400 hover:text-red-400 mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
        </Button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold horror-text tracking-wide"
        >
          Scegli i Sopravvissuti
        </motion.h1>
        <p className="text-gray-400 text-sm mt-1">
          Seleziona da 1 a 3 personaggi per il tuo gruppo. Ogni archetipo offre abilità uniche.
        </p>
      </div>

      {/* Character Cards */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          <AnimatePresence>
            {CHARACTER_ARCHETYPES.map((arch, index) => {
              const isSelected = selected.has(arch.id);
              const Icon = archetypeIcons[arch.id];
              return (
                <motion.div
                  key={arch.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                >
                  <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden h-full flex flex-col
                      ${archetypeColors[arch.id]}
                      ${isSelected ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : ''}
                      glass-dark`}
                    onClick={() => toggleSelect(arch.id)}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>
                    )}

                    {/* Portrait Image */}
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <img
                        src={CHARACTER_IMAGES[arch.id]}
                        alt={arch.name}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      {/* Name overlay at bottom of image */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-gray-100 drop-shadow-lg">{arch.name}</h3>
                        <Badge className={`${archetypeLabelColors[arch.id]} border-0 text-xs mt-1`}>
                          {arch.id.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                        {arch.description}
                      </p>

                      {/* Stats */}
                      <div className="space-y-2 mb-4">
                        <StatBar label="HP" value={arch.maxHp} maxValue={maxStat} color="red" />
                        <StatBar label="ATK" value={arch.atk * 5} maxValue={maxStat} color="amber" />
                        <StatBar label="DEF" value={arch.def * 5} maxValue={maxStat} color="green" />
                        <StatBar label="SPD" value={arch.spd * 8} maxValue={maxStat} color="purple" />
                      </div>

                      {/* Special Ability */}
                      <div className="glass-dark-inner rounded-lg p-3 mb-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-sm font-semibold text-yellow-400">{arch.specialName}</span>
                          <span className="text-xs text-gray-500 ml-auto">CD: 2 turni</span>
                        </div>
                        <p className="text-xs text-gray-400">{arch.specialDescription}</p>
                      </div>

                      {/* Second Special Ability */}
                      <div className="glass-dark-inner rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-sm font-semibold text-orange-400">{arch.special2Name}</span>
                          <span className="text-xs text-gray-500 ml-auto">CD: 3 turni</span>
                        </div>
                        <p className="text-xs text-gray-400">{arch.special2Description}</p>
                      </div>

                      {/* Passive */}
                      <div className="text-xs text-gray-500 italic">
                        ✦ {arch.passiveDescription}
                      </div>

                      {/* Starting Items */}
                      <div className="pt-3 border-t border-gray-800 mt-auto">
                        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Equipaggiamento Iniziale</div>
                        <div className="flex flex-wrap gap-1.5">
                          {arch.startingItems.map(item => (
                            <span
                              key={item.uid}
                              className={`text-xs px-2 py-1 rounded ${
                                item.rarity === 'rare' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/30' :
                                item.rarity === 'uncommon' ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/20' :
                                'bg-gray-800 text-gray-300 border border-gray-700/30'
                              }`}
                            >
                              {item.icon} {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Bottom Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="sticky bottom-0 p-4 sm:p-6 glass-dark-accent border-t border-red-900/30"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            <span className="text-red-400 font-bold">{selected.size}</span>/3 selezionati
            {selected.size === 0 && (
              <span className="text-gray-600 ml-2">— Seleziona almeno un personaggio</span>
            )}
          </div>
          <Button
            onClick={handleStart}
            disabled={selected.size === 0}
            className="horror-btn px-8 py-3 text-sm tracking-wider uppercase
              bg-red-900/40 hover:bg-red-800/50 border-2 border-red-700/60 hover:border-red-500
              text-red-100 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            Inizia l&apos;Avventura
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
