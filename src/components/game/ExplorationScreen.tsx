'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { useShallow } from 'zustand/react/shallow';
import { LOCATIONS, CHARACTER_IMAGES, mediaUrl, NPCS, QUESTS, DOCUMENTS as DOCUMENTS_DATA, COLLECTIBLE_CONFIG } from '@/game/data/loader';
import LogText from '@/components/game/LogText';
import { ItemInstance, Character } from '@/game/types';
import { CompactHpPanel } from './HpBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getKeyItemIds } from '@/game/store/helpers';
import {
  Search, Package, MapPin, ChevronRight,
  Skull, ArrowRightLeft, AlertTriangle, Users, Map, Trophy, BookOpen,
  FileText, Zap, Dices, Home, ScrollText, MessageSquare, Settings, Pill, ChevronDown, HelpCircle,
  DoorOpen, Menu,
} from 'lucide-react';
import SafeRoomPanel from './SafeRoomPanel';
import MissionsPanel from './MissionsPanel';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
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
    currentSubArea: s.currentSubArea,
    npcsEncountered: s.npcsEncountered,
    clearedRooms: s.clearedRooms,
    foundRoomItems: s.foundRoomItems,
    explore: s.explore,
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
    toggleHelp: s.toggleHelp,
    handleDynamicEventChoice: s.handleDynamicEventChoice,
    enterSafeRoom: s.enterSafeRoom,
    quickHeal: s.quickHeal,
    currentRoomId: s.currentRoomId,
    exploredRooms: s.exploredRooms,
    navigateToRoom: s.navigateToRoom,
    encounterNpc: s.encounterNpc,
  })));

  const {
    dataVersion, party, currentLocationId, messageLog, turnCount,
    searchCounts, searchMaxes, partySize, activeEvent, inventoryOpen,
    selectedCharacterId, collectedRibbons, persistentRibbons, isNewGamePlus,
    difficulty, activeDynamicEvent, dynamicEventTurnsLeft, activeNpc,
    isExploring,
    collectedDocuments, npcQuestProgress, readDocuments, randomizerMode,
    currentSubArea, npcsEncountered,
    clearedRooms, foundRoomItems, explore, searchArea, handleEventChoice, closeEvent,
    toggleInventory, selectCharacter, startBossFight, toggleMap,
    toggleAchievements, toggleBestiary, toggleDocuments, toggleMissions,
    toggleSettings, toggleHelp, handleDynamicEventChoice, enterSafeRoom, quickHeal,
    currentRoomId, exploredRooms, navigateToRoom, encounterNpc,
  } = state;

  const location = LOCATIONS[currentLocationId];
  const explorationLogRef = useRef<HTMLDivElement>(null);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
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

  const [questTrackerOpen, setQuestTrackerOpen] = useState(false);

  // Quest tracker data (before early returns — hooks must be unconditional)
  const activeQuests = useMemo(() => {
    return Object.entries(npcQuestProgress)
      .filter(([_, progress]) => !progress.completed)
      .slice(0, 3)
      .map(([questId, progress]) => {
        const quest = QUESTS[questId];
        const typeLabel = quest?.type === 'kill' ? 'uccisi' : quest?.type === 'fetch' ? 'trovati' : 'esplorati';
        return { questId, quest, progress, typeLabel };
      });
  }, [npcQuestProgress]);

  // Quick-heal availability (before early returns — hooks must be unconditional)
  const selectedChar = party.find(p => p.id === selectedCharacterId);
  const canQuickHeal = useMemo(() => {
    if (!selectedChar || selectedChar.currentHp <= 0 || selectedChar.currentHp >= selectedChar.maxHp) return false;
    return (selectedChar.inventory || []).some(item =>
      item.usable && (item.effects || []).some(e =>
        e.type === 'heal' && (!e.trigger || e.trigger === 'on_use')
      )
    );
  }, [selectedChar]);

  if (!location) return null;

  // Room system: get current room data (must be before search counter calculation)
  const currentRoom = (location.rooms && location.rooms.length > 0 && currentRoomId)
    ? location.rooms.find(r => r.id === currentRoomId)
    : null;
  const locationHasRooms = !!location.rooms && location.rooms.length > 0;

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
  // NPCs present in the current room
  const roomNpcs = currentRoom?.npcIds
    ? currentRoom.npcIds
        .map(npcId => NPCS[npcId])
        .filter(Boolean)
    : [];

  // Search counter display — room-aware: use searchKey based on room
  const roomSearchKey = currentRoom ? `${currentLocationId}__${currentRoom.id}` : currentLocationId;
  const searchCount = searchCounts[roomSearchKey] || 0;
  const foundItemsArr = foundRoomItems[roomSearchKey] || [];
  // Calculate total findable items = items in pool (excluding keys already owned) + uncollected docs in room
  const roomDocs = Object.values(DOCUMENTS_DATA).filter((d: any) => {
    if (d.locationId !== currentLocationId) return false;
    if (collectedDocuments.includes(d.id)) return false;
    if (d.roomId && currentRoom && d.roomId !== currentRoom.id) return false;
    if (!d.roomId) return false;
    return true;
  });
  const partyItemIds = new Set(party.flatMap(p => p.inventory.map(i => i.itemId)));
  const roomItemPool = currentRoom?.itemPool || [];
  const findableItemCount = roomItemPool.filter((e: any) => !(getKeyItemIds().has(e.itemId) && partyItemIds.has(e.itemId))).length;
  const totalFindable = findableItemCount + roomDocs.length;
  const searchExhaustedRoom = foundItemsArr.length >= totalFindable && totalFindable > 0;
  // Location-level search exhausted check (legacy, for non-room locations)
  const locationSearchExhausted = !currentRoom && (searchCounts[currentLocationId] || 0) >= effectiveMax && effectiveMax > 0;
  const searchDisabled = searchExhaustedRoom || locationSearchExhausted;
  const searchBadge = totalFindable === 0
    ? (effectiveMax === Infinity ? '∞' : `${searchCount}/${effectiveMax}`)
    : foundItemsArr.length >= totalFindable
      ? '✓'
      : `${foundItemsArr.length}/${totalFindable}`;

  // If in safe room, show SafeRoomPanel instead of exploration
  if (currentSubArea === 'safe_room') {
    return (
      <AnimatePresence mode="wait">
        <SafeRoomPanel key="safe-room" />
      </AnimatePresence>
    );
  }

  const aliveParty = party.filter(p => p.currentHp > 0);
  const hasRoomSafeRoom = !location.isBossArea && !!location.rooms?.some(r => r.type === 'safe_room');
  const hasLegacySafeRoom = !location.isBossArea && !!location.subAreas?.some(sa => sa.id === 'safe_room');
  const hasSafeRoom = hasRoomSafeRoom || hasLegacySafeRoom;

  return (
    <div className="h-dvh sm:h-screen game-horror flex flex-col overflow-hidden" role="main" aria-label="Schermata esplorazione">
      {/* Location Header with Background */}
      <div className="relative h-28 sm:h-44 shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${currentRoom?.backgroundImage ? `/api/media/image?id=${encodeURIComponent(currentRoom.backgroundImage)}` : location.backgroundImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        
        {/* Menu + Save/Load + Collectibles — top right */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex items-center gap-2">
          {/* Dropdown menu: Traguardi, Scorciatoie, Impostazioni */}
          <Popover open={topMenuOpen} onOpenChange={setTopMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/25 text-white/60 hover:text-white transition-all duration-200 backdrop-blur-sm"
                title="Menu"
                aria-label="Menu"
              >
                <Menu className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs font-medium">Menu</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1.5 bg-zinc-900/95 border-white/[0.12] backdrop-blur-md z-[60]" side="bottom" align="end">
              <button
                onClick={() => { toggleAchievements(); setTopMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <Trophy className="w-4 h-4" /> Traguardi
              </button>
              <button
                onClick={() => { toggleHelp(); setTopMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <HelpCircle className="w-4 h-4" /> Scorciatoie
              </button>
              <button
                onClick={() => { toggleSettings(); setTopMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" /> Impostazioni
              </button>
            </PopoverContent>
          </Popover>
          {isNewGamePlus && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-amber-300">✨ NG+</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 backdrop-blur-sm">
            <img src={`/api/media/image?id=icon_${COLLECTIBLE_CONFIG.itemId}`} alt={COLLECTIBLE_CONFIG.label} className="w-5 h-5" />
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
            <h2 className="text-lg sm:text-2xl font-bold text-white">
              {location.name}
              {currentRoom && (
                <span className="text-base sm:text-lg text-white/70 font-normal ml-2">
                  — {currentRoom.icon} {currentRoom.name}
                </span>
              )}
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Panel: Party Status — scrollable if needed */}
        <div className="lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] lg:overflow-y-auto lg:inventory-scrollbar lg:max-h-none">
          <div className="px-2 py-1.5 sm:p-3">
            <h3 className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2" aria-label="Salute gruppo">
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
                        : 'border-white/[0.06] bg-white/[0.06]'
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
                      : 'border-white/[0.06] bg-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
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
                        {activeDynamicEvent.chainId && (
                          <span className="text-xs text-purple-400" title="Evento a catena">⛓️</span>
                        )}
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

          {/* Room Navigation — when location has rooms, show PROMINENTLY before action buttons */}
          {locationHasRooms && !location.isBossArea && currentRoom && (
            <div className="shrink-0 px-2 sm:px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1.5">
                <DoorOpen className="w-3 h-3" /> Navigazione
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  // Only show current room + directly reachable rooms via doors
                  const reachableRoomIds = new Set<string>([currentRoom.id]);
                  if (currentRoom.doors) {
                    for (const door of currentRoom.doors) {
                      if (door.state === 'inaccessible') continue;
                      const otherRoomId = door.fromRoomId === currentRoom.id ? door.toRoomId : door.fromRoomId;
                      reachableRoomIds.add(otherRoomId);
                    }
                  }
                  const visibleRooms = location.rooms!.filter(r => reachableRoomIds.has(r.id));

                  return visibleRooms.map(room => {
                    const isCurrent = room.id === currentRoomId;
                    const isExplored = exploredRooms.includes(room.id);

                    // Determine door-based connectivity
                    let doorState: string | null = null;
                    let doorLockedMissingKey = false;
                    if (currentRoom && currentRoom.id !== room.id) {
                      const doorConns = currentRoom.doors?.filter(d =>
                        (d.fromRoomId === currentRoom.id && d.toRoomId === room.id) ||
                        (d.toRoomId === currentRoom.id && d.fromRoomId === room.id)
                      );
                      if (doorConns && doorConns.length > 0) {
                        const activeDoor = doorConns[0];
                        if (activeDoor.state === 'open') {
                          doorState = 'open';
                        } else if (activeDoor.state === 'key_locked') {
                          doorState = 'key_locked';
                          doorLockedMissingKey = !party.some(p => p.inventory.some(i =>
                            i.itemId === activeDoor.requiredItemId
                          ));
                        } else if (activeDoor.state === 'locked') {
                          doorState = 'locked';
                        } else if (activeDoor.state === 'inaccessible') {
                          doorState = 'inaccessible';
                        }
                      }
                    }

                    // Fallback to legacy lockedRooms check
                    const isLockedLegacy = currentRoom?.lockedRooms?.some(l => l.roomId === room.id);
                    const hasKeyLegacy = isLockedLegacy
                      ? party.some(p => p.inventory.some(i =>
                          i.itemId === currentRoom!.lockedRooms!.find(l => l.roomId === room.id)!.requiredItemId
                        ))
                      : true;

                    const isLocked = doorState === 'key_locked' && doorLockedMissingKey
                      || doorState === 'locked'
                      || doorState === 'inaccessible'
                      || isLockedLegacy && !hasKeyLegacy;
                    const canNavigate = !isCurrent && !isLocked;
                    
                    // Room type colors
                    const roomTypeColors: Record<string, string> = {
                      safe_room: 'border-emerald-500/30 text-emerald-300',
                      boss_room: 'border-red-500/30 text-red-300',
                      secret: 'border-purple-500/30 text-purple-300',
                      shop: 'border-amber-500/30 text-amber-300',
                      puzzle: 'border-cyan-500/30 text-cyan-300',
                      corridor: 'border-white/10 text-white/50',
                      normal: 'border-white/[0.08] text-white/60',
                    };
                    const roomColors = roomTypeColors[room.type] || roomTypeColors.normal;

                    // Door state icons
                    const doorIcon = doorState === 'key_locked'
                      ? (doorLockedMissingKey ? '🔑' : '🔓')
                      : doorState === 'locked' ? '🔒'
                      : doorState === 'inaccessible' ? '🚫'
                      : null;

                    return (
                      <Button
                        key={room.id}
                        variant="outline"
                        size="lg"
                        onClick={() => canNavigate && navigateToRoom(room.id)}
                        disabled={!canNavigate || !!(activeEvent || activeDynamicEvent || activeNpc)}
                        className={`text-[11px] sm:text-sm border px-3 sm:px-4 py-2 sm:py-2.5 ${
                          isCurrent
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30 font-bold'
                            : isLocked
                              ? 'border-white/[0.04] bg-white/[0.02] text-white/30 cursor-not-allowed opacity-50'
                              : `${roomColors} hover:bg-white/[0.06]`
                        }`}
                      >
                        {doorIcon || (isLocked ? '🔒' : room.icon)}
                        <span className="ml-1.5">{room.name}</span>
                        {clearedRooms.includes(room.id) && <span className="ml-1 text-[8px] text-emerald-400">✅</span>}
                        {room.enemyPool?.length > 0 && !clearedRooms.includes(room.id) && <span className="ml-1 text-[8px] text-red-400">💀</span>}
                        {isExplored && !isCurrent && !clearedRooms.includes(room.id) && <span className="ml-1 text-[8px] opacity-40">✓</span>}
                        {isCurrent && <span className="ml-1 text-[8px]">● Qui</span>}
                      </Button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Cross-location doors — rooms in other locations reachable from current room */}
          {(() => {
            if (!currentRoom || !currentRoom.doors || currentRoom.doors.length === 0) return null;
            const crossLocDoors = currentRoom.doors.filter(d => {
              if (d.state === 'inaccessible' || d.state === 'locked') return false;
              // Find the room on the other side of this door
              const otherRoomId = d.fromRoomId === currentRoom.id ? d.toRoomId : d.fromRoomId;
              const otherRoomInfo = LOCATIONS[currentLocationId]?.rooms?.find(r => r.id === otherRoomId);
              // Only show if the other room is in a DIFFERENT location (not found in current)
              if (otherRoomInfo) return false;
              // Check that the room exists somewhere
              let foundInOtherLoc = false;
              for (const loc of Object.values(LOCATIONS)) {
                if (loc.id === currentLocationId) continue;
                if (loc.rooms?.some(r => r.id === otherRoomId)) {
                  foundInOtherLoc = true;
                  break;
                }
              }
              return foundInOtherLoc;
            });
            if (crossLocDoors.length === 0) return null;

            // Get unique target rooms with location info
            const crossLocTargets: { roomId: string; door: typeof crossLocDoors[0]; locationName: string; roomName: string; roomIcon: string }[] = [];
            for (const door of crossLocDoors) {
              const otherRoomId = door.fromRoomId === currentRoom.id ? door.toRoomId : door.fromRoomId;
              // Avoid duplicates
              if (crossLocTargets.some(t => t.roomId === otherRoomId)) continue;
              for (const loc of Object.values(LOCATIONS)) {
                if (loc.id === currentLocationId) continue;
                const room = loc.rooms?.find(r => r.id === otherRoomId);
                if (room) {
                  const isLocked = door.state === 'key_locked' && !party.some(p => p.inventory.some(i => i.itemId === door.requiredItemId));
                  crossLocTargets.push({
                    roomId: otherRoomId,
                    door,
                    locationName: loc.name,
                    roomName: room.name,
                    roomIcon: room.icon,
                  });
                  break;
                }
              }
            }

            if (crossLocTargets.length === 0) return null;

            return (
              <div className="shrink-0 px-2 sm:px-3 py-2 border-t border-white/[0.06] bg-amber-500/[0.02]">
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-400/50 mb-1.5 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3 h-3" />
                  Altre zone
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {crossLocTargets.map(target => {
                    const { roomId, door, locationName, roomName, roomIcon } = target;
                    const isLocked = door.state === 'key_locked' && !party.some(p => p.inventory.some(i => i.itemId === door.requiredItemId));
                    const canNavigate = !isLocked && !activeEvent && !activeDynamicEvent && !activeNpc;
                    return (
                      <Button
                        key={roomId}
                        variant="outline"
                        size="lg"
                        onClick={() => canNavigate && navigateToRoom(roomId)}
                        disabled={!canNavigate}
                        className={`text-[11px] sm:text-sm border px-3 sm:px-4 py-2 sm:py-2.5 ${
                          isLocked
                            ? 'border-white/[0.04] bg-white/[0.02] text-white/30 cursor-not-allowed opacity-50'
                            : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/[0.06]'
                        }`}
                      >
                        {isLocked ? '🔑' : <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />}
                        {roomName}
                        <span className="ml-1.5 text-[9px] opacity-50">({locationName})</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="shrink-0 p-2 sm:p-3 border-t border-white/[0.06] glass-dark-accent max-h-[40vh] sm:max-h-none overflow-y-auto inventory-scrollbar">
            {(() => {
              const isActionBlocked = !!(activeEvent || activeDynamicEvent || activeNpc);
              return (
              <div className={`grid grid-cols-3 sm:grid-cols-3 gap-1 sm:gap-2 ${isActionBlocked ? 'opacity-40 pointer-events-none' : ''}`}>
              <Button
                onClick={searchArea}
                disabled={aliveParty.length === 0 || searchDisabled || isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Cerca oggetti"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> Cerca
              </Button>
              <Button
                onClick={toggleInventory}
                disabled={isActionBlocked}
                className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
                aria-label="Apri inventario"
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
              {hasSafeRoom && !locationHasRooms && (
                <Button
                  onClick={enterSafeRoom}
                  disabled={isActionBlocked}
                  className="bg-emerald-500/[0.06] hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80 hover:text-emerald-200 hover:border-emerald-500/30 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
                >
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Safe Room</span><span className="sm:hidden">Safe</span>
                </Button>
              )}

              {/* Parla button: talk to NPCs in current room */}
              {roomNpcs.length > 0 && (
                <Button
                  onClick={() => encounterNpc(roomNpcs[0].id)}
                  disabled={isActionBlocked}
                  className="bg-amber-500/[0.06] hover:bg-amber-500/10 border border-amber-500/20 text-amber-300/80 hover:text-amber-200 hover:border-amber-500/30 text-[10px] sm:text-sm py-1.5 sm:py-2.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Parla con {roomNpcs.length === 1 ? roomNpcs[0].name : 'NPC'}</span><span className="sm:hidden">Parla</span>
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

            {/* Quest Tracker — collapsible */}
            {activeMissions > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setQuestTrackerOpen(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] sm:text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${questTrackerOpen ? 'rotate-180' : ''}`} />
                  📋 {activeMissions} mission{activeMissions === 1 ? 'e' : 'i'} attiv{activeMissions === 1 ? 'a' : 'e'}
                </button>
                <AnimatePresence>
                  {questTrackerOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1.5 space-y-1">
                        {activeQuests.map(({ questId, quest, progress, typeLabel }) => {
                          if (!quest) return null;
                          const pct = quest.targetCount > 0 ? Math.min(100, (progress.currentCount / quest.targetCount) * 100) : 0;
                          return (
                            <div key={questId} className="glass-dark rounded-md px-2.5 py-1.5 border border-white/[0.06]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] sm:text-xs text-white/70 font-medium truncate">{quest.name}</span>
                                <span className="text-[9px] sm:text-[10px] font-mono text-cyan-300/70 shrink-0">
                                  {progress.currentCount}/{quest.targetCount} {typeLabel}
                                </span>
                              </div>
                              <div className="mt-1 w-full h-1 rounded-full overflow-hidden bg-white/[0.08]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', boxShadow: '0 0 4px rgba(6,182,212,0.4)' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Missions Dialog */}
      <MissionsPanel />
    </div>
  );
}
