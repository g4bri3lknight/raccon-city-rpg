'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { CHARACTER_ARCHETYPES } from '@/game/data/characters';
import { CustomCharacterConfig, Archetype } from '@/game/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Swords, Heart, Zap, ChevronRight, Check, Users, UserPlus, X, User, Crosshair } from 'lucide-react';
import { CHARACTER_IMAGES } from '@/game/data/enemies';
import { getSpecialById } from '@/game/data/specials';
import ItemIcon from './ItemIcon';

const LazyCharacterCreator = lazy(() => import('./CharacterCreator'));

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
          key={`${label}-${value}`}
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function CharacterSelect() {
  const startAdventure = useGameStore(s => s.startAdventure);
  const startAdventureWithCustom = useGameStore(s => s.startAdventureWithCustom);
  const goToCharacterCreator = useGameStore(s => s.goToCharacterCreator);
  const startGame = useGameStore(s => s.startGame);
  
  const [selected, setSelected] = useState<Set<Archetype>>(new Set());
  const [customCharacters, setCustomCharacters] = useState<CustomCharacterConfig[]>([]);
  const [[currentIndex, direction], setCurrentIndex] = useState([0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  const archetypes = CHARACTER_ARCHETYPES;
  const current = archetypes[currentIndex];

  const totalSelected = selected.size + customCharacters.length;
  const maxStat = Math.max(...archetypes.map(a => Math.max(a.maxHp, a.atk * 5, a.def * 5, a.spd * 8)));

  const toggleSelect = useCallback((id: Archetype) => {
    const next = new Set(selected);
    if (next.size + customCharacters.length >= 3) return;
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }, [selected, customCharacters]);

  const goTo = useCallback((idx: number) => {
    if (isAnimating || idx === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex([idx, idx > currentIndex ? 1 : -1]);
    setTimeout(() => setIsAnimating(false), 350);
  }, [currentIndex, isAnimating]);

  const handleStart = () => {
    if (customCharacters.length > 0) {
      startAdventureWithCustom(Array.from(selected), customCharacters);
    } else if (selected.size > 0) {
      startAdventure(Array.from(selected));
    }
  };

  const handleCustomCreated = (config: CustomCharacterConfig) => {
    if (totalSelected >= 3) return;
    setCustomCharacters(prev => [...prev, config]);
    setShowCreator(false);
  };

  const removeCustom = (index: number) => {
    setCustomCharacters(prev => prev.filter((_, i) => i !== index));
  };

  const archetypeIcons: Record<string, typeof Shield> = {
    tank: Shield,
    healer: Heart,
    dps: Swords,
    control: Crosshair,
  };

  const archetypeColors: Record<string, string> = {
    tank: 'border-red-800/50 hover:border-red-600',
    healer: 'border-green-800/50 hover:border-green-600',
    dps: 'border-amber-800/50 hover:border-amber-600',
    control: 'border-purple-800/50 hover:border-purple-600',
  };

  const archetypeLabelColors: Record<string, string> = {
    tank: 'bg-red-900/60 text-red-300',
    healer: 'bg-green-900/60 text-green-300',
    dps: 'bg-amber-900/60 text-amber-300',
    control: 'bg-purple-900/60 text-purple-300',
  };

  const archetypeGlowColors: Record<string, string> = {
    tank: 'shadow-[0_0_30px_rgba(220,38,38,0.2)]',
    healer: 'shadow-[0_0_30px_rgba(34,197,94,0.2)]',
    dps: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    control: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
  };

  // If character creator is active, show it
  if (showCreator) {
    return (
      <Suspense fallback={<div className="min-h-screen game-horror flex items-center justify-center"><div className="text-gray-400 animate-pulse">Caricamento creatore...</div></div>}>
        <LazyCharacterCreator
          onComplete={handleCustomCreated}
          onCancel={() => setShowCreator(false)}
        />
      </Suspense>
    );
  }

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
          Seleziona da 1 a 3 personaggi per il tuo gruppo. Puoi creare personaggi personalizzati!
        </p>
      </div>

      {/* Carousel Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-hidden">
        {/* Carousel Dots + Create Button */}
        <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
          {archetypes.map((arch, idx) => {
            const isActive = idx === currentIndex;
            const isSel = selected.has(arch.id);
            const Icon = archetypeIcons[arch.id];
            return (
              <button
                key={arch.id}
                onClick={() => goTo(idx)}
                className={`relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? `${archetypeColors[arch.id].replace('hover:border-', 'border-')} bg-white/[0.06] text-white shadow-lg scale-105`
                    : isSel
                      ? 'border-white/20 bg-white/5 text-gray-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-white/15 hover:bg-white/[0.04]'
                }`}
              >
                {isSel && !isActive && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? (arch.id === 'tank' ? 'text-red-400' : arch.id === 'healer' ? 'text-green-400' : arch.id === 'control' ? 'text-purple-400' : 'text-amber-400') : 'text-gray-500'}`} />
                <span className="text-sm sm:text-base font-semibold">{arch.displayName}</span>
                {isActive && (
                  <span className="hidden sm:inline text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md ml-1">VISUALIZZAZIONE</span>
                )}
              </button>
            );
          })}
          
          {/* Create Custom Character Button */}
          <button
            onClick={() => totalSelected < 3 && setShowCreator(true)}
            disabled={totalSelected >= 3}
            className={`flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 ${
              totalSelected >= 3
                ? 'border-white/[0.04] bg-white/[0.01] text-gray-600 cursor-not-allowed opacity-50'
                : 'border-purple-700/50 bg-purple-900/20 text-purple-300 hover:border-purple-500 hover:bg-purple-900/30 hover:text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
            }`}
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base font-semibold">Crea Personaggio</span>
          </button>
        </div>

        {/* Custom Characters Created */}
        {customCharacters.length > 0 && (
          <div className="w-full max-w-5xl mx-auto mb-4">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Personaggi Personalizzati</div>
            <div className="flex gap-2 flex-wrap">
              {customCharacters.map((cc, idx) => {
                const sp1 = getSpecialById(cc.special1Id);
                const sp2 = getSpecialById(cc.special2Id);
                return (
                  <motion.div
                    key={`custom-${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-700/40 text-gray-200"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500/50">
                      <img src={cc.avatarUrl} alt={cc.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{cc.name}</div>
                      <div className="text-[10px] text-gray-400">{sp1?.name} · {sp2?.name}</div>
                    </div>
                    <button
                      onClick={() => removeCustom(idx)}
                      className="ml-2 w-5 h-5 rounded-full bg-red-900/50 hover:bg-red-700 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-red-300" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card Slider */}
        <div className="w-full max-w-5xl mx-auto">
          {/* Card Container */}
          <div className="w-full overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-full"
              >
                <Card
                  className={`relative cursor-pointer transition-all duration-300 overflow-hidden flex flex-col lg:flex-row
                    ${archetypeColors[current.id]}
                    ${selected.has(current.id) ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : archetypeGlowColors[current.id]}
                    glass-dark`}
                  onClick={() => toggleSelect(current.id)}
                >
                  {/* Selection indicator */}
                  {selected.has(current.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 lg:top-3 lg:left-3 z-10 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}

                  {/* Portrait Image */}
                  <div className="relative h-44 sm:h-52 lg:h-auto lg:w-[340px] xl:w-[400px] shrink-0 lg:self-stretch overflow-hidden">
                    <img
                      src={CHARACTER_IMAGES[current.id]}
                      alt={current.displayName}
                      className="w-full h-full object-cover object-[center_20%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/40" />
                  </div>

                  {/* Details Panel */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1 lg:min-w-0">
                    {/* Name & Role Header */}
                    <div className="mb-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-100">{current.displayName}</h3>
                      <Badge className={`${archetypeLabelColors[current.id]} border-0 text-[10px] mt-0.5`}>
                        {current.name}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                      {current.description}
                    </p>

                    {/* Starting Items */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Equipaggiamento Iniziale</div>
                      <div className="flex flex-wrap gap-1.5">
                        {current.startingItems.map(item => (
                          <span
                            key={item.uid}
                            className={`text-xs px-2 py-1 rounded ${
                              item.rarity === 'rare' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/30' :
                              item.rarity === 'uncommon' ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/20' :
                              'bg-gray-800 text-gray-300 border border-gray-700/30'
                            }`}
                          >
                            <span className="flex items-center gap-1"><ItemIcon itemId={item.itemId} rarity={item.rarity} size={14} /> {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-4">
                      <StatBar label="HP" value={current.maxHp} maxValue={maxStat} color="red" />
                      <StatBar label="ATK" value={current.atk * 5} maxValue={maxStat} color="amber" />
                      <StatBar label="DEF" value={current.def * 5} maxValue={maxStat} color="green" />
                      <StatBar label="SPD" value={current.spd * 8} maxValue={maxStat} color="purple" />
                    </div>

                    {/* Special Ability */}
                    <div className="glass-dark-inner rounded-lg p-3 mb-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-sm font-semibold text-yellow-400">{current.specialName}</span>
                        <span className="text-xs text-gray-500 ml-auto">CD: 2 turni</span>
                      </div>
                      <p className="text-xs text-gray-400">{current.specialDescription}</p>
                    </div>

                    {/* Second Special Ability */}
                    <div className="glass-dark-inner rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm font-semibold text-orange-400">{current.special2Name}</span>
                        <span className="text-xs text-gray-500 ml-auto">CD: 3 turni</span>
                      </div>
                      <p className="text-xs text-gray-400">{current.special2Description}</p>
                    </div>

                    {/* Passive */}
                    <div className="text-xs text-gray-500 italic">
                      ✦ {current.passiveDescription}
                    </div>

                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Counter hint */}
        <div className="mt-4 text-xs text-gray-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {currentIndex + 1} / {archetypes.length}
          <span className="mx-1">·</span>
          Premi sulla card per selezionare
        </div>
      </div>

      {/* Bottom Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="sticky bottom-0 p-4 sm:p-5 glass-dark-accent border-t border-red-900/30"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-base sm:text-lg text-gray-400 mb-2">
              <span className="text-red-400 font-bold text-lg sm:text-xl">{totalSelected}</span><span className="text-gray-500 text-sm">/3 selezionati</span>
            </div>
            {totalSelected === 0 && (
              <span className="text-gray-600 text-sm">— Seleziona almeno un personaggio o creane uno nuovo</span>
            )}
            {totalSelected > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Array.from(selected).map(id => {
                  const arch = archetypes.find(a => a.id === id);
                  if (!arch) return null;
                  const Icon = archetypeIcons[id];
                  return (
                    <button
                      key={id}
                      onClick={() => goTo(archetypes.indexOf(arch))}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:border-red-600/50 hover:text-white transition-all"
                    >
                      <Icon className="w-4 h-4" />
                      {arch.displayName}
                    </button>
                  );
                })}
                {customCharacters.map((cc, idx) => (
                  <button
                    key={`custom-sel-${idx}`}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-700/40 text-purple-200 hover:border-purple-500 transition-all"
                  >
                    <User className="w-4 h-4" />
                    {cc.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleStart}
            disabled={totalSelected === 0}
            className="horror-btn px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base tracking-wider uppercase
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
