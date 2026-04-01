'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS } from '@/game/data/locations';
import { ItemInstance, Character } from '@/game/types';
import { CompactHpPanel } from './HpBar';
import { CHARACTER_IMAGES } from '@/game/data/enemies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Compass, Search, Package, MapPin, ChevronRight,
  Skull, Flashlight, Shield, Swords, Heart,
  ArrowRightLeft, AlertTriangle, CheckCircle2, Users, Map
} from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';

export default function ExplorationScreen() {
  const state = useGameStore();
  const {
    party, currentLocationId, messageLog, turnCount, searchCounts, searchMaxes, partySize,
    activeEvent, inventoryOpen, selectedCharacterId,
    explore, travelTo, searchArea, handleEventChoice, closeEvent,
    toggleInventory, selectCharacter, startBossFight, toggleMap,
  } = state;

  const location = LOCATIONS[currentLocationId];
  const searchExhausted = (searchCounts[currentLocationId] || 0) >= (searchMaxes[currentLocationId] || 0) && (searchMaxes[currentLocationId] || 0) > 0;
  const diffLabel = partySize === 1 ? 'Sopravvivenza' : partySize === 2 ? 'Normale' : 'Sfida';
  const diffStyle = partySize === 1
    ? 'text-green-400 border-green-800/50 bg-green-950/30'
    : partySize === 2
      ? 'text-yellow-400 border-yellow-800/50 bg-yellow-950/30'
      : 'text-red-400 border-red-800/50 bg-red-950/30';
  const diffIcon = partySize === 1 ? '🏃' : partySize === 2 ? '⚔️' : '💀';
  const [showEventChoice, setShowEventChoice] = useState(false);
  const explorationLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll exploration log to bottom
  useEffect(() => {
    if (explorationLogRef.current) {
      explorationLogRef.current.scrollTo({ top: explorationLogRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messageLog.length]);

  if (!location) return null;

  const aliveParty = party.filter(p => p.currentHp > 0);

  return (
    <div className="h-screen game-horror flex flex-col overflow-hidden">
      {/* Location Header with Background */}
      <div className="relative h-32 sm:h-44 shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${location.backgroundImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        
        {/* Save/Load — top right */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
          <SaveLoadPanel mode="both" compact />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
          <motion.div
            key={currentLocationId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-red-400" />
              <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs bg-red-500/10">
                {location.isBossArea ? '⚠ ZONA FINALE' : `Turno ${turnCount}`}
              </Badge>
              <Badge variant="outline" className={`${diffStyle} text-xs ml-1`}>
                {diffIcon} {diffLabel}
              </Badge>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white">{location.name}</h2>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Panel: Party Status — scrollable if needed */}
        <div className="lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-y-auto inventory-scrollbar max-h-[30vh] lg:max-h-none">
          <div className="p-3">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Gruppo
            </h3>
            <div className="space-y-2">
              {party.map(char => (
                <motion.div
                  key={char.id}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                    char.id === selectedCharacterId
                      ? 'border-red-500/30 bg-red-500/[0.06]'
                      : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]'
                  } ${char.currentHp <= 0 ? 'opacity-40' : ''}`}
                  onClick={() => selectCharacter(char.id)}
                >
                  {/* Top row: Portrait + Name/Role */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Portrait — small, fixed size */}
                    <div className={`w-10 h-12 sm:w-12 sm:h-14 rounded-md overflow-hidden border shrink-0 relative ${char.currentHp <= 0 ? 'grayscale opacity-40' : 'border-gray-600/40'}`}>
                      {CHARACTER_IMAGES[char.archetype] ? (
                        <img src={CHARACTER_IMAGES[char.archetype]} alt={char.name} className="w-full h-full object-cover object-[center_15%]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg bg-white/[0.04]">
                          {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : '⚔️'}
                        </div>
                      )}
                      {/* ── BLEEDING VISUAL ── */}
                      {char.currentHp > 0 && char.statusEffects?.includes('bleeding') && (
                        <>
                          <div className="absolute inset-0 rounded-md pointer-events-none bleeding-overlay" />
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] overflow-hidden pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/90 to-red-950 blood-streak" />
                          </div>
                          {[
                            { w: 6, h: 10, left: 6, delay: 0, dur: 2.2 },
                            { w: 7, h: 12, left: 14, delay: 1.0, dur: 2.5 },
                          ].map((drop, bi) => (
                            <div
                              key={`bd-${bi}`}
                              className="absolute blood-drip pointer-events-none"
                              style={{
                                left: `${drop.left}%`,
                                width: `${drop.w}px`,
                                height: `${drop.h}px`,
                                animationDelay: `${drop.delay}s`,
                                animationDuration: `${drop.dur}s`,
                              }}
                            >
                              <svg viewBox="0 0 10 16" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                  <radialGradient id={`bdrop-expl-${char.id}-${bi}`} cx="40%" cy="55%" r="55%">
                                    <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.9" />
                                    <stop offset="50%" stopColor="#7f1d1d" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#450a0a" stopOpacity="0.6" />
                                  </radialGradient>
                                  <radialGradient id={`bshine-expl-${char.id}-${bi}`} cx="35%" cy="30%" r="30%">
                                    <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
                                  </radialGradient>
                                </defs>
                                <path
                                  d="M5 0.5 C6.8 3.8, 9.2 7.5, 9.2 10.2 C9.2 13, 7.4 15.5, 5 15.5 C2.6 15.5, 0.8 13, 0.8 10.2 C0.8 7.5, 3.2 3.8, 5 0.5 Z"
                                  fill={`url(#bdrop-expl-${char.id}-${bi})`}
                                />
                                <ellipse cx="3.5" cy="6.5" rx="1.8" ry="2.2" fill={`url(#bshine-expl-${char.id}-${bi})`} />
                              </svg>
                            </div>
                          ))}
                        </>
                      )}
                      {/* ── POISON VISUAL: strong violet overlay + edge glow ── */}
                      {char.currentHp > 0 && char.statusEffects?.includes('poison') && (
                        <>
                          <div className="absolute inset-0 rounded-md pointer-events-none poison-overlay" />
                          <div className="absolute inset-0 rounded-md pointer-events-none poison-edge-glow" />
                        </>
                      )}
                    </div>
                    {/* Name + Role + Level */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white truncate leading-tight">{char.name}</div>
                      <div className="text-[11px] sm:text-xs text-white/60 font-medium">
                        {char.archetype === 'tank' ? 'Tank' : char.archetype === 'healer' ? 'Healer' : 'DPS'} · Lv.{char.level}
                      </div>
                    </div>
                    {/* HP panel — compact, right-aligned */}
                    <div className="w-24 sm:w-32 h-10 sm:h-12 shrink-0 overflow-hidden rounded">
                      <CompactHpPanel
                        current={char.currentHp}
                        max={char.maxHp}
                        statusEffects={char.statusEffects}
                      />
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold text-white/40">
                    <span>ATK {char.baseAtk + (char.weapon?.atkBonus || 0)}</span>
                    <span>DEF {char.baseDef}</span>
                    <span>SPD {char.baseSpd}</span>
                    <span>INV {char.inventory.length}/{char.maxInventorySlots}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Message Log + Actions */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Message Log */}
          <div className="flex-1 min-h-0 p-3 overflow-hidden flex flex-col">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" /> Registro Eventi
            </h3>
            <div ref={explorationLogRef} className="flex-1 min-h-0 overflow-y-auto glass-dark-inner rounded-lg p-2.5 sm:p-3 inventory-scrollbar">
              <div className="space-y-1.5">
                {messageLog.map((msg, i) => (
                  <p
                    key={i}
                    className={`text-xs sm:text-sm leading-relaxed ${
                      msg.includes('⚔️') || msg.includes('💀') ? 'text-red-400' :
                      msg.includes('🎒') ? 'text-amber-400' :
                      msg.includes('❤️') || msg.includes('🎉') ? 'text-green-400' :
                      msg.includes('⬆️') ? 'text-cyan-400' :
                      msg.includes('📍') ? 'text-blue-400' :
                      msg.includes('🔍') ? 'text-yellow-400' :
                      msg.includes('📖') ? 'text-purple-300' :
                      msg.includes('⭐') ? 'text-red-300 font-bold' :
                      'text-gray-400'
                    }`}
                  >
                    {msg}
                  </p>
                ))}
                {messageLog.length === 0 && (
                  <p className="text-gray-600 italic text-sm">L&apos;avventura ha inizio...</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 p-3 border-t border-white/[0.06] glass-dark-accent">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              <Button
                onClick={explore}
                disabled={aliveParty.length === 0}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs sm:text-sm py-2.5"
              >
                <Compass className="w-4 h-4 mr-1.5" /> Esplora
              </Button>
              <Button
                onClick={searchArea}
                disabled={aliveParty.length === 0 || searchExhausted}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs sm:text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-1.5" /> Cerca
              </Button>
              <Button
                onClick={toggleInventory}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs sm:text-sm py-2.5"
              >
                <Package className="w-4 h-4 mr-1.5" /> Inventario
              </Button>

              <Button
                onClick={toggleMap}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs sm:text-sm py-2.5"
              >
                <Map className="w-4 h-4 mr-1.5" /> Mappa
              </Button>
              {location.isBossArea && (
                <Button
                  onClick={startBossFight}
                  disabled={aliveParty.length === 0}
                  className="col-span-2 sm:col-span-1 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-white text-xs sm:text-sm py-2.5 font-bold animate-pulse"
                >
                  <Skull className="w-4 h-4 mr-1.5" /> Affronta il Boss
                </Button>
              )}
            </div>

            {/* Travel Options */}
            {location.nextLocations.length > 0 && !location.isBossArea && (
              <div className="mt-2">
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 mb-1.5">Spostati verso:</div>
                <div className="flex flex-wrap gap-1.5">
                  {location.nextLocations.map(locId => {
                    const loc = LOCATIONS[locId];
                    if (!loc) return null;
                    const locked = location.lockedLocations?.find(l => l.locationId === locId);
                    const hasKey = locked ? party.some(p => p.inventory.some(i => i.itemId === locked.requiredItemId)) : true;
                    const isLocked = locked && !hasKey;
                    return (
                      <Button
                        key={locId}
                        variant="outline"
                        onClick={() => travelTo(locId)}
                        disabled={isLocked}
                        className={`text-[10px] sm:text-xs border ${
                          isLocked
                            ? 'border-white/[0.04] bg-white/[0.02] text-white/30 cursor-not-allowed opacity-50'
                            : 'border-white/[0.08] hover:border-red-500/30 bg-white/[0.03] hover:bg-red-500/[0.06] text-white/60 hover:text-red-300'
                        }`}
                      >
                        {isLocked ? '🔒' : <ArrowRightLeft className="w-3 h-3 mr-1" />}
                        {loc.name}
                        {!isLocked && <ChevronRight className="w-3 h-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story Event Modal */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg glass-dark rounded-xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <Badge className="bg-red-500/10 text-red-300 border-0 text-xs">
                  Evento
                </Badge>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 horror-text">{activeEvent.title}</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-5">{activeEvent.description}</p>
              
              <div className="space-y-2">
                {activeEvent.choices.map((choice, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEventChoice(i)}
                    className="w-full text-left p-3 rounded-lg border border-white/[0.08] hover:border-white/20 
                      bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white
                      transition-all duration-200 text-sm flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 text-red-400/60 shrink-0" />
                    {choice.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
