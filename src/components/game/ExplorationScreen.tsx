'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { useShallow } from 'zustand/react/shallow';
import { LOCATIONS, CHARACTER_IMAGES, mediaUrl, NPCS } from '@/game/data/loader';
import LogText from '@/components/game/LogText';
import { ItemInstance, Character } from '@/game/types';
import { CompactHpPanel } from './HpBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Compass, Search, Package, MapPin, ChevronRight,
  Skull, ArrowRightLeft, AlertTriangle, Users, Map, Trophy, BookOpen,
  FileText, Zap, Dices, Home, ScrollText, MessageSquare, Settings
} from 'lucide-react';
import SafeRoomPanel from './SafeRoomPanel';
import MissionsPanel from './MissionsPanel';
import { getEffectiveLocation } from '@/game/data/randomizer';
import { getEquipStatBonus } from '@/game/utils/effect-helpers';
import { getArchetypeEmoji, getArchetypeLabel, MAX_RIBBONS } from '@/game/utils/archetype-helpers';

export default function ExplorationScreen() {
  const state = useGameStore(useShallow(s => ({
    dataVersion: s.dataVersion,
    party: s.party,
    currentLocationId: s.currentLocationId,
    messageLog: s.messageLog,
    turnCount: s.turnCount,
    searchCounts: s.searchCounts,
    searchMaxes: s.searchMaxes,
    partySize: s.partySize,
    activeEvent: s.activeEvent,
    inventoryOpen: s.inventoryOpen,
    selectedCharacterId: s.selectedCharacterId,
    collectedRibbons: s.collectedRibbons,
    persistentRibbons: s.persistentRibbons,
    isNewGamePlus: s.isNewGamePlus,
    difficulty: s.difficulty,
    activeDynamicEvent: s.activeDynamicEvent,
    dynamicEventTurnsLeft: s.dynamicEventTurnsLeft,
    activeNpc: s.activeNpc,
    isExploring: s.isExploring,
    collectedDocuments: s.collectedDocuments,
    npcQuestProgress: s.npcQuestProgress,
    readDocuments: s.readDocuments,
    randomizerMode: s.randomizerMode,
    randomizedLocationData: s.randomizedLocationData,
    currentSubArea: s.currentSubArea,
    npcsEncountered: s.npcsEncountered,
    explore: s.explore,
    travelTo: s.travelTo,
    searchArea: s.searchArea,
    handleEventChoice: s.handleEventChoice,
    closeEvent: s.closeEvent,
    toggleInventory: s.toggleInventory,
    selectCharacter: s.selectCharacter,
    startBossFight: s.startBossFight,
    toggleMap: s.toggleMap,
    toggleAchievements: s.toggleAchievements,
    toggleBestiary: s.toggleBestiary,
    toggleDocuments: s.toggleDocuments,
    toggleMissions: s.toggleMissions,
    toggleSettings: s.toggleSettings,
    handleDynamicEventChoice: s.handleDynamicEventChoice,
    enterSafeRoom: s.enterSafeRoom,
  })));

  const {
    dataVersion, party, currentLocationId, messageLog, turnCount,
    searchCounts, searchMaxes, partySize, activeEvent, inventoryOpen,
    selectedCharacterId, collectedRibbons, persistentRibbons, isNewGamePlus,
    difficulty, activeDynamicEvent, dynamicEventTurnsLeft, activeNpc,
    isExploring,
    collectedDocuments, npcQuestProgress, readDocuments, randomizerMode,
    randomizedLocationData, currentSubArea, npcsEncountered,
    explore, travelTo, searchArea, handleEventChoice, closeEvent,
    toggleInventory, selectCharacter, startBossFight, toggleMap,
    toggleAchievements, toggleBestiary, toggleDocuments, toggleMissions,
    toggleSettings, handleDynamicEventChoice, enterSafeRoom,
  } = state;

  const location = LOCATIONS[currentLocationId];
  const explorationLogRef = useRef<HTMLDivElement>(null);
  const partyAvatarData = useMemo(() => party.map(p => ({
    name: p.name,
    avatarSrc: mediaUrl(p.avatarUrl || CHARACTER_IMAGES[p.archetype] || '', dataVersion)
  })), [party, dataVersion]);

  // Auto-scroll exploration log to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (explorationLogRef.current) {
          explorationLogRef.current.scrollTop = explorationLogRef.current.scrollHeight;
        }
      });
    });
  }, [messageLog.length, activeEvent]);

  if (!location) return null;
  // searchMax: DB config (null=random 1-3, 0=unlimited) → searchMaxes: runtime state
  const effectiveMax = searchMaxes[currentLocationId]
    ?? (location.searchMax != null ? (location.searchMax === 0 ? Infinity : location.searchMax) : 0);
  const searchExhausted = (searchCounts[currentLocationId] || 0) >= effectiveMax && effectiveMax > 0;
  const diffLabel = difficulty === 'sopravvissuto' ? 'Sopravvissuto' : difficulty === 'incubo' ? 'Incubo' : 'Normale';
  const diffStyle = difficulty === 'sopravvissuto'
    ? 'text-green-400 border-green-800/50 bg-green-950/30'
    : difficulty === 'incubo'
      ? 'text-red-400 border-red-800/50 bg-red-950/30'
      : 'text-yellow-400 border-yellow-800/50 bg-yellow-950/30';
  const diffIcon = difficulty === 'sopravvissuto' ? '🏃' : difficulty === 'incubo' ? '💀' : '⚔️';
  const activeMissions = Object.entries(npcQuestProgress)
    .filter(([_, progress]) => !progress.completed).length;
  // NPCs present in this location that have already been encountered
  const localNpcs = Object.values(NPCS).filter(
    n => n.locationId === currentLocationId && npcsEncountered.includes(n.id)
  );

  // If in safe room, show SafeRoomPanel instead of exploration
  if (currentSubArea === 'safe_room') {
    return (
      <AnimatePresence mode="wait">
        <SafeRoomPanel key="safe-room" />
      </AnimatePresence>
    );
  }

  const aliveParty = party.filter(p => p.currentHp > 0);
  const hasSafeRoom = !location.isBossArea && !!location.subAreas?.some(sa => sa.id === 'safe_room');

  

  return (
    <div className="h-dvh sm:h-screen game-horror flex flex-col overflow-hidden">
      {/* Location Header with Background */}
      <div className="relative h-28 sm:h-44 shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${location.backgroundImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        
        {/* Settings + Save/Load + Collectibles — top right */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex items-center gap-2">
          {/* Settings button — always in header */}
          <button
            onClick={toggleSettings}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/25 text-white/60 hover:text-white transition-all duration-200 backdrop-blur-sm"
            title="Impostazioni"
          >
            <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs font-medium">Impostazioni</span>
          </button>
          {isNewGamePlus && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-amber-300">✨ NG+</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 backdrop-blur-sm">
            <img src="/api/media/image?id=icon_ink_ribbon" alt="Ink Ribbon" className="w-5 h-5" />
            <span className="text-xs font-bold text-purple-300">{collectedRibbons}<span className="text-purple-400/60">/{MAX_RIBBONS}</span></span>
            {(persistentRibbons || 0) > 0 && (
              <span className="text-purple-400/40">|</span>
            )}
            {(persistentRibbons || 0) > 0 && (
              <span className="text-[10px] text-purple-400/70">✨{persistentRibbons}</span>
            )}
          </div>
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
              {randomizerMode && (
                <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-xs ml-1 animate-pulse">
                  <Dices className="w-3 h-3 mr-1" /> RANDOMIZER
                </Badge>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white">{location.name}</h2>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Panel: Party Status — scrollable if needed */}
        <div className="lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] lg:overflow-y-auto lg:inventory-scrollbar lg:max-h-none">
          <div className="px-2 py-1.5 sm:p-3">
            <h3 className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Gruppo
            </h3>
            {/* MOBILE: horizontal row — all chars always visible */}
            <div className="flex lg:hidden gap-1.5">
              {party.map(char => {
                const pct = char.maxHp > 0 ? Math.max(0, Math.min(100, (char.currentHp / char.maxHp) * 100)) : 0;
                const hpColor = char.currentHp <= 0 ? '#6b7280' : pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#f87171';
                const hasStatus = char.currentHp > 0 && char.statusEffects?.length > 0;
                return (
                  <motion.div
                    key={char.id}
                    className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-lg border cursor-pointer transition-all ${
                      char.id === selectedCharacterId
                        ? 'border-red-500/30 bg-red-500/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.03]'
                    } ${char.currentHp <= 0 ? 'opacity-40' : ''}`}
                    onClick={() => selectCharacter(char.id)}
                  >
                    {/* Portrait */}
                    {(() => {
                      const hasImg = !!(char.avatarUrl || CHARACTER_IMAGES[char.archetype]);
                      return (
                        <div className={'w-10 h-10 rounded-md overflow-hidden border shrink-0 relative ' + (char.currentHp <= 0 ? 'grayscale opacity-40' : 'border-gray-600/40')}>
                          {hasImg ? (
                            <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt={char.name} className="w-full h-full object-cover object-[center_15%]" onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fb = (e.target as HTMLImageElement).nextElementSibling;
                              if (fb) (fb as HTMLElement).classList.remove('hidden');
                            }} />
                          ) : null}
                          <div className={'absolute inset-0 flex items-center justify-center text-sm bg-white/[0.04] ' + (hasImg ? 'hidden' : '')}>
                            {getArchetypeEmoji(char.archetype)}
                          </div>
                          {char.currentHp > 0 && char.statusEffects?.includes('bleeding') && (
                            <div className="absolute inset-0 rounded-md pointer-events-none bleeding-overlay" />
                          )}
                          {char.currentHp > 0 && char.statusEffects?.includes('poison') && (
                            <div className="absolute inset-0 rounded-md pointer-events-none poison-overlay" />
                          )}
                        </div>
                      );
                    })()}
                    {/* Name */}
                    <span className="text-[10px] font-bold text-white truncate w-full text-center leading-tight">{char.name}</span>
                    {/* Role + Level */}
                    <span className="text-[9px] text-white/50 font-medium leading-tight">
                      {getArchetypeLabel(char.archetype)} · {char.level}
                    </span>
                    {/* HP text */}
                    <span className="font-mono font-bold text-[10px] leading-none" style={{ color: hpColor }}>
                      {char.currentHp}/{char.maxHp}
                      {hasStatus && (
                        <span className="ml-0.5">
                          {char.statusEffects.includes('poison') && <span className="text-[8px]">☠️</span>}
                          {char.statusEffects.includes('bleeding') && <span className="text-[8px]">🩸</span>}
                          {char.statusEffects.includes('stunned') && <span className="text-[8px]">💫</span>}
                        </span>
                      )}
                    </span>
                    {/* Mini HP bar */}
                    <div className="w-full h-1 rounded-full overflow-hidden bg-white/[0.08]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: hpColor, boxShadow: `0 0 4px ${hpColor}66` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {/* DESKTOP: vertical card layout with full HP panels */}
            <div className="hidden lg:block space-y-2">
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
                    {/* Portrait */}
                    <div className={'w-14 h-14 rounded-md overflow-hidden border shrink-0 relative ' + (char.currentHp <= 0 ? 'grayscale opacity-40' : 'border-gray-600/40')}>
                      {(() => {
                        const hasImg = !!(char.avatarUrl || CHARACTER_IMAGES[char.archetype]);
                        return (
                          <>
                            {hasImg ? (
                              <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt={char.name} className="w-full h-full object-cover object-[center_15%]" onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fb = (e.target as HTMLImageElement).nextElementSibling;
                                if (fb) (fb as HTMLElement).classList.remove('hidden');
                              }} />
                            ) : null}
                            <div className={'absolute inset-0 flex items-center justify-center text-lg bg-white/[0.04] ' + (hasImg ? 'hidden' : '')}>
                              {getArchetypeEmoji(char.archetype)}
                            </div>
                          </>
                        );
                      })()}
                      {char.currentHp > 0 && char.statusEffects?.includes('bleeding') && (
                        <div className="absolute inset-0 rounded-md pointer-events-none bleeding-overlay" />
                      )}
                      {char.currentHp > 0 && char.statusEffects?.includes('poison') && (
                        <div className="absolute inset-0 rounded-md pointer-events-none poison-overlay" />
                      )}
                    </div>
                    {/* Name + Role + Level */}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-white truncate leading-tight">{char.name}</div>
                      <div className="text-xs text-white/60 font-medium">
                        {getArchetypeLabel(char.archetype)} · Lv.{char.level}
                      </div>
                    </div>
                    {/* HP panel — full size on desktop */}
                    <div className="w-32 h-12 shrink-0 overflow-hidden rounded">
                      <CompactHpPanel
                        current={char.currentHp}
                        max={char.maxHp}
                        statusEffects={char.statusEffects}
                      />
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex gap-3 text-xs font-semibold text-white/40">
                    <span>ATK {char.baseAtk + getEquipStatBonus(char.weapon?.effects, 'atk')}</span>
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
                    className={`text-sm sm:text-base leading-relaxed ${
                      msg.includes('🚪') ? 'text-purple-400' :
                      msg.includes('👤') ? 'text-green-400' :
                      msg.includes('💬') ? 'text-amber-200' :
                      msg.includes('📋') ? 'text-cyan-300' :
                      msg.includes('🤝') ? 'text-emerald-300' :
                      msg.includes('☢️') || msg.includes('☠️') ? 'text-orange-400' :
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
                    <LogText text={msg} party={partyAvatarData} />
                  </p>
                ))}
                {messageLog.length === 0 && !activeEvent && (
                  <p className="text-gray-600 italic text-base">L&apos;avventura ha inizio...</p>
                )}

                {/* ── Dynamic Event Banner ── */}
                <AnimatePresence>
                  {activeDynamicEvent && (
                    <motion.div
                      key="dynamic-event"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 pt-2 border-t border-amber-900/30"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Evento Dinamico</span>
                        <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/30 text-[10px] ml-auto">
                          {dynamicEventTurnsLeft} turni
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{activeDynamicEvent.icon}</span>
                        <div>
                          <h4 className="text-base font-bold text-white">{activeDynamicEvent.title}</h4>
                          <p className="text-xs text-white/50">{activeDynamicEvent.description}</p>
                        </div>
                      </div>
                      <p className="text-xs text-amber-200/70 italic">{activeDynamicEvent.onTriggerMessage}</p>
                      {activeDynamicEvent.effect.damagePerTurn > 0 && (
                        <p className="text-[10px] text-red-400">
                          💔 {activeDynamicEvent.effect.damagePerTurn} danni per turno
                        </p>
                      )}
                      <div className="space-y-1.5 pt-1">
                        {activeDynamicEvent.choices.map((choice, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.12 }}
                            whileHover={{ scale: 1.01, x: 3 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleDynamicEventChoice(i)}
                            className="w-full text-left p-2 sm:p-2.5 rounded-lg border border-amber-800/20 hover:border-amber-700/40
                              bg-amber-950/10 hover:bg-amber-950/20 text-white/70 hover:text-white
                              transition-all duration-200 text-sm sm:text-base flex items-center gap-2"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                            {choice.text}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Evento con scelta — integrato nel Registro Eventi ── */}
                <AnimatePresence>
                  {activeEvent && (
                    <motion.div
                      key="active-event"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 pt-2 border-t border-red-900/30"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-red-300">Evento</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-white leading-snug">{activeEvent.title}</h4>
                      <p className="text-sm sm:text-base text-white/70 leading-relaxed">{activeEvent.description}</p>
                      <div className="space-y-1.5 pt-1">
                        {activeEvent.choices.map((choice, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.12 }}
                            whileHover={{ scale: 1.01, x: 3 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleEventChoice(i)}
                            className="w-full text-left p-2 sm:p-2.5 rounded-lg border border-white/[0.08] hover:border-white/20
                              bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white
                              transition-all duration-200 text-sm sm:text-base flex items-center gap-2"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
                            {choice.text}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 p-2 sm:p-3 border-t border-white/[0.06] glass-dark-accent max-h-[40vh] sm:max-h-none overflow-y-auto inventory-scrollbar">
            {(() => {
              const isActionBlocked = !!(activeEvent || activeDynamicEvent || activeNpc);
              return (
              <div className={`grid grid-cols-3 sm:grid-cols-3 gap-1 sm:gap-2 ${isActionBlocked ? 'opacity-40 pointer-events-none' : ''}`}>
              <Button
                onClick={explore}
                disabled={aliveParty.length === 0 || isActionBlocked || isExploring}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Esplora
              </Button>
              <Button
                onClick={searchArea}
                disabled={aliveParty.length === 0 || searchExhausted || isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Cerca
              </Button>
              <Button
                onClick={toggleInventory}
                disabled={isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Inventario</span><span className="sm:hidden">Invent.</span>
              </Button>

              <Button
                onClick={toggleMap}
                disabled={isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Mappa
              </Button>
              <Button
                onClick={toggleAchievements}
                disabled={isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Traguardi</span><span className="sm:hidden">Trag.</span>
              </Button>
              <Button
                onClick={toggleBestiary}
                disabled={isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Bestiario
              </Button>
              <Button
                onClick={toggleDocuments}
                disabled={isActionBlocked}
                className="relative bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Documenti</span><span className="sm:hidden">Doc.</span>
                {(() => {
                  const unread = collectedDocuments.filter(id => !readDocuments.includes(id)).length;
                  return unread > 0 ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center border border-black/30">
                      {unread}
                    </span>
                  ) : null;
                })()}
              </Button>
              <Button
                onClick={toggleMissions}
                disabled={isActionBlocked}
                className="relative bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
              >
                <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Missioni
                {activeMissions > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center border border-black/30">
                    {activeMissions}
                  </span>
                )}
              </Button>
              {hasSafeRoom && (
                <Button
                  onClick={enterSafeRoom}
                  disabled={isActionBlocked}
                  className="bg-emerald-500/[0.06] hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80 hover:text-emerald-200 hover:border-emerald-500/30 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
                >
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Safe Room</span><span className="sm:hidden">Safe</span>
                </Button>
              )}
              {location.isBossArea && (
                <Button
                  onClick={startBossFight}
                  disabled={aliveParty.length === 0 || isActionBlocked}
                  className="col-span-3 sm:col-span-1 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-white text-[10px] sm:text-sm py-1.5 sm:py-2.5 font-bold animate-pulse"
                >
                  <Skull className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Affronta il Boss
                </Button>
              )}
            </div>
              );
            })()}

            {/* Travel Options */}
            {/* #45 Randomizer: use randomized nextLocations */}
            {(() => {
              const effectiveLoc = getEffectiveLocation(currentLocationId, randomizedLocationData);
              const travelLocations = (effectiveLoc?.nextLocations || location.nextLocations);
              const lockedLocations = effectiveLoc?.lockedLocations || location.lockedLocations;
              if (travelLocations.length === 0 || location.isBossArea) return null;
              return (
                <div className="mt-2">
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 mb-1.5">Spostati verso:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {travelLocations.map(locId => {
                      const loc = LOCATIONS[locId];
                      if (!loc) return null;
                      const locked = lockedLocations?.find(l => l.locationId === locId);
                      const hasKey = locked ? party.some(p => p.inventory.some(i => i.itemId === locked.requiredItemId)) : true;
                      const isLocked = locked && !hasKey;
                      return (
                        <Button
                          key={locId}
                          variant="outline"
                          onClick={() => travelTo(locId)}
                          disabled={isLocked || !!(activeEvent || activeDynamicEvent || activeNpc)}
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
              );
            })()}
          </div>
        </div>
      </div>

      {/* Missions Dialog */}
      <MissionsPanel />
    </div>
  );
}
