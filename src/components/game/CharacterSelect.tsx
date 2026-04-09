'use client';

import { useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { CHARACTER_ARCHETYPES, getCustomPassiveDescription, getCustomStartingItems, ARCHETYPE_STAT_POINTS, CHARACTER_IMAGES, getSpecialById, mediaUrl } from '@/game/data/loader';
import { CustomCharacterConfig, Archetype } from '@/game/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Swords, Heart, Zap, ChevronRight, Check, Users, UserPlus, X, User, Crosshair, Settings2, Sparkles, Trash2, Dices } from 'lucide-react';
// CHARACTER_IMAGES and getSpecialById now imported from loader above
import ItemIcon from './ItemIcon';

const LazyCharacterCreator = lazy(() => import('./CharacterCreator'));

// ── Unified carousel item that can be either a preset archetype or a custom character ──
interface CarouselItem {
  id: string;          // unique key: archetype id or 'custom-0', 'custom-1', etc.
  kind: 'preset' | 'custom';
  displayName: string;
  roleName: string;    // archetype label (e.g. "Tank", "Custom")
  description: string;
  avatarUrl: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  special1Name: string;
  special1Desc: string;
  special1Cd: number;
  special2Name: string;
  special2Desc: string;
  special2Cd: number;
  passiveDescription: string;
  startingItems: { uid: string; itemId: string; name: string; rarity: string; icon?: string; quantity: number }[];
  archetypeId?: Archetype;  // for preset, the archetype id; for custom, undefined
  config?: CustomCharacterConfig; // for custom, the full config
}

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

// ── Get color config based on archetype id ──
function getArchetypeColor(id: string | undefined) {
  const map: Record<string, string> = {
    tank: 'border-red-800/50 hover:border-red-600',
    healer: 'border-green-800/50 hover:border-green-600',
    dps: 'border-amber-800/50 hover:border-amber-600',
    control: 'border-purple-800/50 hover:border-purple-600',
  };
  return map[id || ''] || 'border-purple-800/50 hover:border-purple-600';
}

function getArchetypeBorderColor(id: string | undefined) {
  const map: Record<string, string> = {
    tank: 'border-red-600',
    healer: 'border-green-600',
    dps: 'border-amber-600',
    control: 'border-purple-600',
  };
  return map[id || ''] || 'border-purple-600';
}

function getArchetypeLabelColor(id: string | undefined) {
  const map: Record<string, string> = {
    tank: 'bg-red-900/60 text-red-300',
    healer: 'bg-green-900/60 text-green-300',
    dps: 'bg-amber-900/60 text-amber-300',
    control: 'bg-purple-900/60 text-purple-300',
  };
  return map[id || ''] || 'bg-purple-900/60 text-purple-300';
}

function getArchetypeGlow(id: string | undefined) {
  const map: Record<string, string> = {
    tank: 'shadow-[0_0_30px_rgba(220,38,38,0.2)]',
    healer: 'shadow-[0_0_30px_rgba(34,197,94,0.2)]',
    dps: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    control: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
  };
  return map[id || ''] || 'shadow-[0_0_30px_rgba(168,85,247,0.2)]';
}

function getArchetypeIcon(id: string | undefined) {
  const map: Record<string, typeof Shield> = {
    tank: Shield,
    healer: Heart,
    dps: Swords,
    control: Crosshair,
  };
  return map[id || ''] || Settings2;
}

function getArchetypeIconColor(id: string | undefined) {
  const map: Record<string, string> = {
    tank: 'text-red-400',
    healer: 'text-green-400',
    dps: 'text-amber-400',
    control: 'text-purple-400',
  };
  return map[id || ''] || 'text-purple-400';
}

// ── Build a CarouselItem from a preset archetype ──
function presetToCarouselItem(arch: typeof CHARACTER_ARCHETYPES[number], dataVersion: number): CarouselItem {
  const points = ARCHETYPE_STAT_POINTS[arch.id] || ARCHETYPE_STAT_POINTS.custom;
  return {
    id: arch.id,
    kind: 'preset',
    displayName: arch.displayName,
    roleName: arch.name,
    description: arch.description,
    avatarUrl: mediaUrl(CHARACTER_IMAGES[arch.id] || '/api/media/image?id=avatar_civilian', dataVersion),
    maxHp: points.hp * 10,
    atk: points.atk,
    def: points.def,
    spd: points.spd,
    special1Name: arch.specialName,
    special1Desc: arch.specialDescription,
    special1Cd: 2,
    special2Name: arch.special2Name,
    special2Desc: arch.special2Description,
    special2Cd: 3,
    passiveDescription: arch.passiveDescription,
    startingItems: arch.startingItems,
    archetypeId: arch.id,
  };
}

// ── Build a CarouselItem from a CustomCharacterConfig ──
function customToCarouselItem(config: CustomCharacterConfig, index: number): CarouselItem {
  const sp1 = getSpecialById(config.special1Id);
  const sp2 = getSpecialById(config.special2Id);
  const basePoints = config.baseArchetype && config.baseArchetype !== 'custom'
    ? ARCHETYPE_STAT_POINTS[config.baseArchetype]
    : null;
  const statPoints = config.customStats || basePoints || ARCHETYPE_STAT_POINTS.custom;
  const hp = statPoints.hp * 10;
  const atk = statPoints.atk;
  const def = statPoints.def;
  const spd = statPoints.spd;
  const passive = config.passiveDescription || getCustomPassiveDescription(statPoints);
  const baseArch = config.baseArchetype && config.baseArchetype !== 'custom' ? config.baseArchetype : undefined;
  const startingItems = getCustomStartingItems(baseArch);

  return {
    id: `custom-${index}`,
    kind: 'custom',
    displayName: config.name,
    roleName: config.baseArchetype === 'custom' ? 'Custom' : config.baseArchetype.charAt(0).toUpperCase() + config.baseArchetype.slice(1),
    description: config.biography || 'Un sopravvissuto dai tratti unici.',
    avatarUrl: config.avatarUrl || '/api/media/image?id=avatar_civilian',
    maxHp: hp,
    atk,
    def,
    spd,
    special1Name: sp1?.name || 'Speciale 1',
    special1Desc: sp1?.description || '',
    special1Cd: sp1?.cooldown || 2,
    special2Name: sp2?.name || 'Speciale 2',
    special2Desc: sp2?.description || '',
    special2Cd: sp2?.cooldown || 3,
    passiveDescription: passive,
    startingItems,
    archetypeId: config.baseArchetype,
    config,
  };
}



export default function CharacterSelect() {
  const dataVersion = useGameStore(s => s.dataVersion);
  const startAdventure = useGameStore(s => s.startAdventure);
  const startAdventureWithCustom = useGameStore(s => s.startAdventureWithCustom);
  const goToCharacterCreator = useGameStore(s => s.goToCharacterCreator);
  const startGame = useGameStore(s => s.startGame);
  const selectedDifficulty = useGameStore(s => s.selectedDifficulty);
  const selectDifficulty = useGameStore(s => s.selectDifficulty);
  const randomizerMode = useGameStore(s => s.randomizerMode);
  const toggleRandomizerMode = useGameStore(s => s.toggleRandomizerMode);
  
  const [selected, setSelected] = useState<Set<string>>(new Set()); // set of carousel item ids
  const [customCharacters, setCustomCharacters] = useState<CustomCharacterConfig[]>([]);
  const [[currentIndex, direction], setCurrentIndex] = useState([0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  // ── Build unified carousel items list: presets first, then customs ──
  const allItems = useMemo(() => {
    const presets = CHARACTER_ARCHETYPES.map(a => presetToCarouselItem(a, dataVersion));
    const customs = customCharacters.map((cc, i) => customToCarouselItem(cc, i));
    return [...presets, ...customs];
  }, [customCharacters, dataVersion]);

  const current = allItems[currentIndex] || allItems[0];
  const totalSelected = selected.size;
  const maxStat = Math.max(
    ...allItems.map(item => Math.max(item.maxHp, item.atk * 5, item.def * 5, item.spd * 8))
  );

  // ── Toggle selection/deselection ──
  const toggleSelect = useCallback((itemId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        if (next.size >= 3) return prev; // full, can't add
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const goTo = useCallback((idx: number) => {
    if (isAnimating || idx === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex([idx, idx > currentIndex ? 1 : -1]);
    setTimeout(() => setIsAnimating(false), 350);
  }, [currentIndex, isAnimating]);

  const handleStart = () => {
    // Separate selected presets and selected customs
    const selectedPresetArchetypes: Archetype[] = [];
    const selectedCustomConfigs: CustomCharacterConfig[] = [];

    for (const itemId of selected) {
      const item = allItems.find(it => it.id === itemId);
      if (!item) continue;
      if (item.kind === 'preset' && item.archetypeId) {
        selectedPresetArchetypes.push(item.archetypeId);
      } else if (item.kind === 'custom' && item.config) {
        selectedCustomConfigs.push(item.config);
      }
    }

    if (selectedCustomConfigs.length > 0) {
      startAdventureWithCustom(selectedPresetArchetypes, selectedCustomConfigs);
    } else if (selectedPresetArchetypes.length > 0) {
      startAdventure(selectedPresetArchetypes);
    }
  };

  const handleCustomCreated = (config: CustomCharacterConfig) => {
    setCustomCharacters(prev => [...prev, config]);
    setShowCreator(false);
    // Auto-select the new custom character
    const newId = `custom-${customCharacters.length}`;
    setSelected(prev => {
      if (prev.size >= 3) return prev;
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
    // Navigate to the new custom character
    setTimeout(() => {
      const newIdx = CHARACTER_ARCHETYPES.length + customCharacters.length; // index after all presets
      goTo(newIdx);
    }, 100);
  };

  const removeCustom = (index: number) => {
    const itemId = `custom-${index}`;
    setCustomCharacters(prev => prev.filter((_, i) => i !== index));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    setShowDeleteConfirm(false);
    // Adjust current index if needed
    if (currentIndex >= allItems.length - 1) {
      goTo(Math.max(0, allItems.length - 2));
    }
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

  const isItemSelected = selected.has(current.id);

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
          Seleziona da 1 a 3 personaggi per il tuo gruppo. Clicca sulla card per selezionare o deselezionare.
        </p>
      </div>

      {/* Carousel Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-hidden">
        {/* Carousel Tabs + Create Button */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap justify-center">
          {allItems.map((item, idx) => {
            const isActive = idx === currentIndex;
            const isSel = selected.has(item.id);
            const Icon = item.kind === 'preset' ? getArchetypeIcon(item.archetypeId) : User;
            return (
              <button
                key={item.id}
                onClick={() => goTo(idx)}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? `${getArchetypeBorderColor(item.archetypeId)} bg-white/[0.06] text-white shadow-lg scale-105`
                    : isSel
                      ? 'border-white/20 bg-white/5 text-gray-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-white/15 hover:bg-white/[0.04]'
                }`}
              >
                {isSel && !isActive && (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                )}
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? (item.kind === 'preset' ? getArchetypeIconColor(item.archetypeId) : 'text-purple-400') : 'text-gray-500'}`} />
                <span className="text-xs sm:text-sm font-semibold">{item.displayName}</span>
                {isActive && (
                  <span className="hidden sm:inline text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-md ml-1">VISUALIZZAZIONE</span>
                )}
              </button>
            );
          })}
          
          {/* Create Custom Character Button */}
          <button
            onClick={() => totalSelected < 3 && setShowCreator(true)}
            disabled={totalSelected >= 3}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 ${
              totalSelected >= 3
                ? 'border-white/[0.04] bg-white/[0.01] text-gray-600 cursor-not-allowed opacity-50'
                : 'border-purple-700/50 bg-purple-900/20 text-purple-300 hover:border-purple-500 hover:bg-purple-900/30 hover:text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
            }`}
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-semibold">Crea</span>
          </button>
        </div>

        {/* Card Slider */}
        <div className="w-full max-w-5xl mx-auto">
          {/* Card Container */}
          <div className="w-full overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
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
                    ${getArchetypeColor(current.archetypeId)}
                    ${isItemSelected ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : getArchetypeGlow(current.archetypeId)}
                    glass-dark`}
                  onClick={() => toggleSelect(current.id)}
                >
                  {/* Selection indicator — top-right (same position for all characters) */}
                  {isItemSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-lg pointer-events-none"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}

                  {/* Delete button for custom characters */}
                  {current.kind === 'custom' && (
                    <>
                      {/* Mobile: X icon bottom-right */}
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const customIdx = customCharacters.findIndex(cc => cc === current.config);
                          if (customIdx >= 0) {
                            setPendingDeleteIdx(customIdx);
                            setShowDeleteConfirm(true);
                          }
                        }}
                        className="absolute bottom-3 right-3 lg:hidden z-10 w-8 h-8 rounded-full bg-red-900/60 hover:bg-red-700 flex items-center justify-center transition-colors border border-red-700/40"
                      >
                        <X className="w-4 h-4 text-red-300" />
                      </motion.button>
                      {/* Desktop: full "Elimina personaggio" button */}
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const customIdx = customCharacters.findIndex(cc => cc === current.config);
                          if (customIdx >= 0) {
                            setPendingDeleteIdx(customIdx);
                            setShowDeleteConfirm(true);
                          }
                        }}
                        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-xs font-medium transition-colors border border-red-900/40 self-start"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Elimina personaggio
                      </motion.button>
                    </>
                  )}

                  {/* Delete confirmation dialog */}
                  <AnimatePresence>
                    {showDeleteConfirm && pendingDeleteIdx !== null && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-2xl"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); setPendingDeleteIdx(null); }}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="glass-dark rounded-xl p-5 max-w-xs w-full border border-red-900/40 shadow-[0_0_24px_rgba(127,29,29,0.2)]"
                        >
                          <p className="text-white text-sm mb-4 leading-relaxed">
                            Sei sicuro di voler eliminare <span className="text-red-400 font-semibold">{customCharacters[pendingDeleteIdx]?.name || 'questo personaggio'}</span>? L&apos;azione non pu&ograve; essere annullata.
                          </p>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setShowDeleteConfirm(false); setPendingDeleteIdx(null); }}
                              className="bg-transparent text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.1] text-xs px-3 py-1.5 rounded-lg"
                            >
                              Annulla
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (pendingDeleteIdx !== null) removeCustom(pendingDeleteIdx); }}
                              className="bg-transparent text-red-400 hover:text-red-300 hover:bg-red-900/30 border border-red-800/40 text-xs px-3 py-1.5 rounded-lg"
                            >
                              Elimina
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Portrait Image */}
                  <div className="relative h-44 sm:h-52 lg:h-auto lg:w-[340px] xl:w-[400px] shrink-0 lg:self-stretch overflow-hidden">
                    <img
                      src={current.avatarUrl}
                      alt={current.displayName}
                      className="w-full h-full object-cover object-[center_20%]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.style.display !== 'none') {
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'w-full h-full flex items-center justify-center bg-gray-900/80';
                          fallback.innerHTML = `<span style="font-size:4rem;filter:saturate(0.3) brightness(0.75)">${current.kind === 'preset' ? getArchetypeIcon(current.archetypeId).toString().replace('Icon', '🎮') : '🎮'}</span>`;
                          target.parentElement?.appendChild(fallback);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/40" />
                    {/* Custom badge overlay */}
                    {current.kind === 'custom' && (
                      <div className="absolute bottom-3 left-3 lg:bottom-3 lg:left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-900/70 border border-purple-500/30 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-purple-300" />
                        <span className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">Custom</span>
                      </div>
                    )}
                  </div>

                  {/* Details Panel */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1 lg:min-w-0">
                    {/* Name & Role Header */}
                    <div className="mb-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-100">{current.displayName}</h3>
                      <Badge className={`${getArchetypeLabelColor(current.archetypeId)} border-0 text-[10px] mt-0.5`}>
                        {current.roleName}
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

                    {/* Special Ability 1 */}
                    <div className="glass-dark-inner rounded-lg p-3 mb-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-sm font-semibold text-yellow-400">{current.special1Name}</span>
                        <span className="text-xs text-gray-500 ml-auto">CD: {current.special1Cd} turni</span>
                      </div>
                      <p className="text-xs text-gray-400">{current.special1Desc}</p>
                    </div>

                    {/* Special Ability 2 */}
                    <div className="glass-dark-inner rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm font-semibold text-orange-400">{current.special2Name}</span>
                        <span className="text-xs text-gray-500 ml-auto">CD: {current.special2Cd} turni</span>
                      </div>
                      <p className="text-xs text-gray-400">{current.special2Desc}</p>
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
          {currentIndex + 1} / {allItems.length}
          <span className="mx-1">·</span>
          {isItemSelected ? 'Clicca per deselezionare' : 'Clicca sulla card per selezionare'}
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
                {Array.from(selected).map(itemId => {
                  const item = allItems.find(it => it.id === itemId);
                  if (!item) return null;
                  const Icon = item.kind === 'preset' ? getArchetypeIcon(item.archetypeId) : User;
                  return (
                    <button
                      key={itemId}
                      onClick={() => {
                        // Navigate to this item in carousel
                        const idx = allItems.findIndex(it => it.id === itemId);
                        if (idx >= 0) goTo(idx);
                      }}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        item.kind === 'custom'
                          ? 'bg-purple-900/30 border-purple-700/40 text-purple-200 hover:border-purple-500'
                          : 'bg-white/5 border-white/10 text-gray-200 hover:border-red-600/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.displayName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Difficulty Selection */}
            <div className="mt-2">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 mb-1.5">{'Difficolt\u00E0'}</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => selectDifficulty('sopravvissuto')}
                  className={"flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all " + (selectedDifficulty === 'sopravvissuto' ? 'border-green-500 bg-green-900/40 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.2)]' : 'border-green-700/50 bg-green-950/30 text-green-400 opacity-50 hover:opacity-80')}
                >
                  <span>{'\u{1F3C3}'}</span>
                  <span className="hidden sm:inline">Sopravvissuto</span>
                  <span className="sm:hidden text-[10px]">Sopr</span>
                </button>
                <button
                  onClick={() => selectDifficulty('normale')}
                  className={"flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all " + (selectedDifficulty === 'normale' ? 'border-yellow-500 bg-yellow-900/40 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.2)]' : 'border-yellow-700/50 bg-yellow-950/30 text-yellow-400 opacity-50 hover:opacity-80')}
                >
                  <span>{'\u2694\uFE0F'}</span>
                  <span className="hidden sm:inline">Normale</span>
                  <span className="sm:hidden text-[10px]">Norm</span>
                </button>
                <button
                  onClick={() => selectDifficulty('incubo')}
                  className={"flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all " + (selectedDifficulty === 'incubo' ? 'border-red-500 bg-red-900/40 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.2)]' : 'border-red-700/50 bg-red-950/30 text-red-400 opacity-50 hover:opacity-80')}
                >
                  <span>{'\u{1F480}'}</span>
                  <span className="hidden sm:inline">Incubo</span>
                  <span className="sm:hidden text-[10px]">Incu</span>
                </button>
              </div>
            </div>

            {/* Randomizer Toggle */}
            <div className="mt-2">
              <button
                onClick={toggleRandomizerMode}
                className={"flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all w-full " + (randomizerMode
                  ? 'border-purple-500 bg-purple-900/40 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.25)]'
                  : 'border-purple-700/50 bg-purple-950/30 text-purple-400 opacity-50 hover:opacity-80'
                )}
              >
                <Dices className="w-4 h-4" />
                <span className="hidden sm:inline">🎲 Modalità Randomizer</span>
                <span className="sm:hidden">🎲 Randomizer</span>
                {randomizerMode && <Check className="w-3.5 h-3.5 ml-auto text-purple-300" />}
              </button>
              {randomizerMode && (
                <p className="text-[10px] text-purple-300/60 mt-1 leading-relaxed">
                  ⚠️ Nemici, oggetti e percorsi saranno casuali! Il gioco rimane completable.
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleStart}
            disabled={totalSelected === 0 || !selectedDifficulty}
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
