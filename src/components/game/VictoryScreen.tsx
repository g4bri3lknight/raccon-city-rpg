'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ENDINGS } from '@/game/data/endings';
import { ACHIEVEMENTS, COLLECTIBLE_CONFIG } from '@/game/data/loader';
import { getEquipStatBonus } from '@/game/utils/effect-helpers';
import { getArchetypeEmoji, MAX_RIBBONS } from '@/game/utils/archetype-helpers';
import {
  Star, RotateCcw, Save, Plus, Sparkles, X, Clock,
  Swords, Map, FlaskConical, Timer, Trophy, Target, Heart,
  Zap, Shield, Footprints, Search, Scroll, DoorOpen,
  ChefHat, Users, Activity, TrendingUp, Lock, Eye,
} from 'lucide-react';
import {
  LeaderboardEntry, calculateScore, getLeaderboard, addLeaderboardEntry,
  formatPlayTime, getEndingLabel, getEndingColor,
} from '@/game/utils/leaderboard';
import { RunStats } from '@/game/types';

type VictoryTab = 'stats' | 'leaderboard' | 'achievements';
type AchievementCategory = 'all' | 'combat' | 'exploration' | 'collection' | 'story' | 'special';

export default function VictoryScreen() {
  const party = useGameStore(s => s.party);
  const turnCount = useGameStore(s => s.turnCount);
  const collectedRibbons = useGameStore(s => s.collectedRibbons);
  const persistentRibbons = useGameStore(s => s.persistentRibbons);
  const gameStartTime = useGameStore(s => s.gameStartTime);
  const endingType = useGameStore(s => s.endingType);
  const ngPlusCycle = useGameStore(s => s.ngPlusCycle);
  const storyChoices = useGameStore(s => s.storyChoices);
  const npcsEncountered = useGameStore(s => s.npcsEncountered);
  const collectedDocuments = useGameStore(s => s.collectedDocuments);
  const discoveredSecretRooms = useGameStore(s => s.discoveredSecretRooms);
  const discoveredRecipes = useGameStore(s => s.discoveredRecipes);
  const achievements = useGameStore(s => s.achievements);
  const bestiary = useGameStore(s => s.bestiary);
  const runStats = useGameStore(s => s.runStats);
  const restartGame = useGameStore(s => s.restartGame);
  const saveGameVictory = useGameStore(s => s.saveGameVictory);
  const startNewGamePlus = useGameStore(s => s.startNewGamePlus);
  const loadGame = useGameStore(s => s.loadGame);
  const getSaveInfo = useGameStore(s => s.getSaveInfo);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [savedSlot, setSavedSlot] = useState<number | null>(null);
  const [showNGPPanel, setShowNGPPanel] = useState(false);
  const [loadedNGP, setLoadedNGP] = useState(false);
  const [activeTab, setActiveTab] = useState<VictoryTab>('stats');
  const [achCategory, setAchCategory] = useState<AchievementCategory>('all');

  const totalPersistent = Math.min((persistentRibbons || 0) + (collectedRibbons || 0), MAX_RIBBONS);
  const ending = endingType ? ENDINGS[endingType] : ENDINGS['ending_escape'];

  const totalBestiary = bestiary.filter(b => b.defeated).length;
  const totalAchievements = achievements.unlockedIds.length;

  // Calculate play time
  const playTimeFormatted = useMemo(() => {
    const seconds = runStats?.playTimeSeconds || (gameStartTime && gameStartTime > 0 ? Math.floor((Date.now() - gameStartTime) / 1000) : 0);
    return formatPlayTime(seconds);
  }, [gameStartTime, runStats?.playTimeSeconds]);

  // Leaderboard logic
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const currentScore = useMemo(() => calculateScore(runStats || {} as RunStats, totalAchievements), [runStats, totalAchievements]);

  // Load leaderboard on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLeaderboard(getLeaderboard());
    }
  }, []);

  const handleSaveVictory = (slot: number) => {
    const total = saveGameVictory(slot);
    setSavedSlot(slot);
    // Add to leaderboard
    if (party.length > 0) {
      const entry: LeaderboardEntry = {
        date: new Date().toISOString(),
        characterName: party[0].name,
        archetype: party[0].archetype,
        endingType: endingType || 'escape',
        ngPlusCycle: ngPlusCycle || 0,
        turnsSurvived: turnCount,
        enemiesDefeated: runStats?.enemiesDefeated || 0,
        bossesDefeated: runStats?.bossesDefeated || 0,
        finalLevel: Math.max(...party.map(p => p.level)),
        playTimeSeconds: runStats?.playTimeSeconds || 0,
        score: currentScore,
        runStats: runStats || {},
      };
      setLeaderboard(addLeaderboardEntry(entry));
    }
    setTimeout(() => {
      setSavedSlot(null);
      setShowSavePanel(false);
    }, 1500);
    return total;
  };

  const handleNGP = (slot: number) => {
    const info = getSaveInfo(slot);
    if (info?.isNewGamePlus && info.persistentRibbons) {
      startNewGamePlus(info.persistentRibbons);
      setLoadedNGP(true);
    }
  };

  const ngpSaves = [1, 2, 3].map(s => getSaveInfo(s)).filter((info): info is NonNullable<typeof info> => info?.isNewGamePlus && (info.persistentRibbons || 0) > 0);
  const canStartNGP = ngpSaves.length > 0 || totalPersistent > 0;

  // Tabs
  const tabs: { id: VictoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stats', label: 'Statistiche', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'leaderboard', label: 'Classifica', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: 'achievements', label: 'Traguardi', icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center game-horror relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-amber-950/20 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
      }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-center px-4 max-w-2xl w-full"
      >
        {/* Ending Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mb-4"
        >
          <span className="text-7xl sm:text-8xl block" style={{ filter: `drop-shadow(0 0 30px ${ending.color}80)` }}>
            {ending.icon}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="text-5xl sm:text-7xl font-black mb-2"
          style={{
            color: ending.color,
            textShadow: `0 0 40px ${ending.color}80, 0 0 80px ${ending.color}40, 3px 3px 0 #000`,
          }}
        >
          {ending.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm tracking-[0.3em] uppercase mb-4"
          style={{ color: `${ending.color}cc` }}
        >
          {ending.subtitle}
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '200px' }}
          transition={{ delay: 1, duration: 1 }}
          className="h-px mx-auto mb-4"
          style={{ background: `linear-gradient(to right, transparent, ${ending.color}60, transparent)` }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-gray-300 text-sm leading-relaxed mb-4 max-w-md mx-auto"
        >
          {ending.description}
        </motion.p>

        {/* Score Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-sm px-3 py-1">
            🏆 Punteggio: {currentScore.toLocaleString()}
          </Badge>
          <Badge className="bg-gray-800/80 text-gray-300 border-gray-700/30">
            <Clock className="w-3 h-3 mr-1" /> {playTimeFormatted}
          </Badge>
          <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30">
            <Star className="w-3 h-3 mr-1" /> Turno {turnCount}
          </Badge>
          {ngPlusCycle > 0 && (
            <Badge className="bg-orange-900/50 text-orange-300 border-orange-700/30">
              ✨ Ciclo NG+ {ngPlusCycle}
            </Badge>
          )}
        </motion.div>

        {/* ═══ TAB NAVIGATION ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="flex gap-1 justify-center mb-4"
        >
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs tracking-wider uppercase transition-all
                ${activeTab === tab.id
                  ? 'bg-white/10 text-white border-b-2 border-amber-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
            >
              {tab.icon}
              <span className="ml-1.5">{tab.label}</span>
            </Button>
          ))}
        </motion.div>

        {/* ═══ TAB CONTENT ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="glass-dark rounded-xl border-white/[0.06] p-4 mb-4 max-h-[50vh] overflow-y-auto custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                <StatsPanel runStats={runStats} turnCount={turnCount} totalBestiary={totalBestiary} discoveredRecipes={discoveredRecipes} />
              </motion.div>
            )}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                <LeaderboardPanel entries={leaderboard} currentScore={currentScore} />
              </motion.div>
            )}
            {activeTab === 'achievements' && (
              <motion.div key="achievements" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                <AchievementsTracker
                  achievements={achievements}
                  category={achCategory}
                  onCategoryChange={setAchCategory}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ PARTY SUMMARY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="glass-dark rounded-xl border-white/[0.06] p-4 mb-4 text-left"
        >
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Riepilogo Squadra</h3>
          <div className="space-y-2">
            {party.map((char, i) => (
              <div key={char.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40">
                <span className="text-2xl">{getArchetypeEmoji(char.archetype)}</span>
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
                    <span>ATK: {char.baseAtk + getEquipStatBonus(char.weapon?.effects, 'atk')}</span>
                    <span>DEF: {char.baseDef}</span>
                  </div>
                </div>
                <div className="text-amber-500 text-lg"><Star className="w-5 h-5" /></div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ COLLECTIBLE SUMMARY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1 }}
          className="glass-dark rounded-xl border-white/[0.06] p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={`/api/media/image?id=icon_${COLLECTIBLE_CONFIG.itemId}`} alt={COLLECTIBLE_CONFIG.label} className="w-6 h-6" />
              <div className="text-left">
                <p className="text-xs text-white/50">Collezionabili — Questa Run</p>
                <p className="text-sm font-bold text-purple-300">{collectedRibbons}<span className="text-purple-400/60">/{MAX_RIBBONS}</span> {COLLECTIBLE_CONFIG.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <div className="text-right">
                <p className="text-xs text-white/50">Totale Persistente</p>
                <p className="text-sm font-bold text-amber-300">{totalPersistent}<span className="text-amber-400/60">/{MAX_RIBBONS}</span></p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ ACTION BUTTONS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.7 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          <Button
            onClick={() => setShowSavePanel(true)}
            size="lg"
            className="px-8 py-4 text-sm tracking-widest uppercase
              bg-purple-900/40 hover:bg-purple-800/50 border-2 border-purple-700/60 hover:border-purple-500
              text-purple-100 hover:text-white transition-all duration-300
              hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <Save className="w-5 h-5 mr-2" />
            Salva per Nuovo Gioco+{ngPlusCycle > 0 ? ` (Ciclo ${ngPlusCycle + 1})` : ''}
          </Button>

          {canStartNGP && (
            <Button
              onClick={() => {
                if (totalPersistent > 0) {
                  startNewGamePlus(totalPersistent);
                } else {
                  setShowNGPPanel(true);
                }
              }}
              size="lg"
              className="px-8 py-4 text-sm tracking-widest uppercase
                bg-amber-900/40 hover:bg-amber-800/50 border-2 border-amber-700/60 hover:border-amber-500
                text-amber-100 hover:text-white transition-all duration-300
                hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Nuovo Gioco+{ngPlusCycle > 0 ? ` (Ciclo ${ngPlusCycle + 1})` : ''}
            </Button>
          )}

          <Button
            onClick={restartGame}
            size="lg"
            variant="ghost"
            className="px-6 py-4 text-xs tracking-wider uppercase
              text-white/40 hover:text-white/70 transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nuova Partita
          </Button>
        </motion.div>
      </motion.div>

      {/* ═══ Save Victory Panel ═══ */}
      <AnimatePresence>
        {showSavePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSavePanel(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-dark rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Save className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Salva per Nuovo Gioco+</h2>
                </div>
                <Button variant="ghost" onClick={() => setShowSavePanel(false)} className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                <p className="text-xs text-white/40">
                  💾 Salva il progresso per iniziare una nuova avventura con i nastri collezionati ({totalPersistent}/{MAX_RIBBONS}).
                </p>
              </div>
              <div className="p-4 space-y-2.5">
                {[1, 2, 3].map(slotNum => {
                  const info = getSaveInfo(slotNum);
                  const isJustSaved = savedSlot === slotNum;
                  return (
                    <div key={slotNum} className={`p-3 rounded-lg border transition-all relative ${
                      info
                        ? 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                        : 'border-dashed border-white/[0.06] bg-white/[0.02] hover:border-white/[0.08]'
                    }`}>
                      {isJustSaved && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-purple-950/30 rounded-lg flex items-center justify-center z-10">
                          <span className="text-purple-400 font-bold text-sm">💾 Salvato! 🎀 {totalPersistent}/{MAX_RIBBONS}</span>
                        </motion.div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          info?.isNewGamePlus ? 'bg-purple-900/40 text-purple-300 border border-purple-800/30' : 'bg-gray-900 text-gray-600 border border-gray-800/50'
                        }`}>{slotNum}</div>
                        <div className="flex-1 min-w-0">
                          {info ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">Slot {slotNum}</span>
                                {info.isNewGamePlus && <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">🎀 {info.persistentRibbons}/{MAX_RIBBONS}</Badge>}
                              </div>
                              <p className="text-xs text-white/30 truncate">{info.partySummary}</p>
                            </>
                          ) : (
                            <p className="text-xs text-white/30 py-1">Slot vuoto</p>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleSaveVictory(slotNum)} className="h-8 px-3 text-xs border-purple-700/50 text-purple-400 hover:bg-purple-950/30 hover:text-purple-300">
                          <Save className="w-3 h-3 mr-1" /> Salva
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ New Game+ Load Panel ═══ */}
      <AnimatePresence>
        {showNGPPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNGPPanel(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-dark rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Carica Nuovo Gioco+</h2>
                </div>
                <Button variant="ghost" onClick={() => setShowNGPPanel(false)} className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-2.5">
                {ngpSaves.length > 0 ? ngpSaves.map(info => (
                  <div key={info.slot} className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-purple-900/40 text-purple-300 border border-purple-800/30">{info.slot}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">Slot {info.slot}</span>
                          <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">🎀 {info.persistentRibbons}/{MAX_RIBBONS}</Badge>
                        </div>
                        <p className="text-xs text-white/30 truncate">{info.partySummary}</p>
                      </div>
                      <Button size="sm" onClick={() => handleNGP(info.slot)} className="h-8 px-3 text-xs border-amber-700/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300">
                        <Plus className="w-3 h-3 mr-1" /> Gioca
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-white/30 text-center py-4">Nessun salvataggio Nuovo Gioco+ trovato.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// STATS PANEL
// ═══════════════════════════════════════════════

function StatsPanel({ runStats, turnCount, totalBestiary, discoveredRecipes }: {
  runStats: RunStats | null;
  turnCount: number;
  totalBestiary: number;
  discoveredRecipes: string[];
}) {
  const s = runStats;
  if (!s) return <p className="text-white/30 text-xs">Statistiche non disponibili.</p>;

  return (
    <div className="space-y-4">
      {/* Combat Stats */}
      <StatSection title="⚔️ Riepilogo Combattimento" icon={<Swords className="w-3.5 h-3.5" />}>
        <StatRow icon="⚔️" label="Danni totali inflitti" value={s.totalDamageDealt.toLocaleString()} />
        <StatRow icon="🛡️" label="Danni totali ricevuti" value={s.totalDamageReceived.toLocaleString()} />
        <StatRow icon="💀" label="Nemici sconfitti" value={`${totalBestiary}/17`} />
        <StatRow icon="👹" label="Boss sconfitti" value={String(s.bossesDefeated)} />
        <StatRow icon="🔄" label="Turni di combattimento" value={String(s.combatTurnsTotal)} />
        <StatRow icon="✨" label="Combattimenti perfetti" value={String(s.perfectCombats)} />
        <StatRow icon="🔥" label="Combo più lunga" value={String(s.longestCombo)} />
      </StatSection>

      {/* Exploration Stats */}
      <StatSection title="🗺️ Esplorazione" icon={<Map className="w-3.5 h-3.5" />}>
        <StatRow icon="🚶" label="Distanza percorsa" value={`${s.distanceTraveled} viaggi`} />
        <StatRow icon="🔍" label="Ricerche effettuate" value={String(s.searchesPerformed)} />
        <StatRow icon="📖" label="Documenti trovati" value={String(s.documentsFound)} />
        <StatRow icon="🚪" label="Stanze segrete" value={String(s.secretRoomsDiscovered)} />
        <StatRow icon="⏱️" label="Turni sopravvissuti" value={String(s.turnsSurvived)} />
        <StatRow icon="⚡" label="Eventi dinamici sopravvissuti" value={String(s.dynamicEventsSurvived)} />
      </StatSection>

      {/* Crafting & Collection Stats */}
      <StatSection title="🧪 Crafting & Raccolta" icon={<FlaskConical className="w-3.5 h-3.5" />}>
        <StatRow icon="🔨" label="Oggetti craftati" value={String(s.itemsCrafted)} />
        <StatRow icon="📜" label="Ricette scoperte" value={`${discoveredRecipes.length}/15`} />
        <StatRow icon="📋" label="Missioni completate" value={String(s.questsCompleted)} />
        <StatRow icon="⛓️" label="Catene completate" value={String(s.questChainsCompleted)} />
      </StatSection>

      {/* Time & Progression */}
      <StatSection title="⏰ Tempo & Progressione" icon={<Timer className="w-3.5 h-3.5" />}>
        <StatRow icon="⏱️" label="Tempo di gioco" value={formatPlayTime(s.playTimeSeconds)} />
        <StatRow icon="✨" label="Ciclo NG+" value={s.ngPlusCycle > 0 ? String(s.ngPlusCycle) : 'Prima run'} />
        <StatRow icon="👥" label="Archetipi usati" value={(s.characterArchetypes || []).join(', ') || '-'} />
        <StatRow icon="🏁" label="Finale ottenuto" value={getEndingLabel(s.endingType)} highlight={true} />
      </StatSection>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LEADERBOARD PANEL
// ═══════════════════════════════════════════════

function LeaderboardPanel({ entries, currentScore }: { entries: LeaderboardEntry[]; currentScore: number }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm mb-1">Classifica vuota</p>
        <p className="text-white/20 text-xs">Salva la tua run per registrare il tuo punteggio!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40">🏆 Top 10 Classifica</p>
        <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/30 text-[10px]">
          {entries.length} run registrate
        </Badge>
      </div>
      {entries.slice(0, 10).map((entry, idx) => (
        <div
          key={`${entry.date}-${idx}`}
          className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
            entry.score === currentScore && idx === entries.findIndex(e => e.score === currentScore)
              ? 'bg-amber-900/20 border border-amber-700/30'
              : 'bg-white/[0.02] border border-white/[0.04]'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            idx === 0 ? 'bg-amber-500/30 text-amber-300' :
            idx === 1 ? 'bg-gray-400/20 text-gray-300' :
            idx === 2 ? 'bg-orange-600/20 text-orange-300' :
            'bg-gray-800 text-gray-500'
          }`}>
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white truncate">{entry.characterName}</span>
              <Badge variant="outline" className="text-[9px] border-gray-700 text-gray-400 shrink-0">
                {entry.archetype}
              </Badge>
            </div>
            <div className="flex gap-2 mt-0.5 text-[10px] text-white/30">
              <span>{getEndingLabel(entry.endingType)}</span>
              <span>Lv.{entry.finalLevel}</span>
              <span>💀{entry.enemiesDefeated}</span>
              {entry.ngPlusCycle > 0 && <span>NG+{entry.ngPlusCycle}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-amber-300">{entry.score.toLocaleString()}</p>
            <p className="text-[10px] text-white/25">{formatPlayTime(entry.playTimeSeconds)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ACHIEVEMENTS TRACKER
// ═══════════════════════════════════════════════

function AchievementsTracker({ achievements, category, onCategoryChange }: {
  achievements: { unlockedIds: string[]; unlockTimestamps: Record<string, number> };
  category: AchievementCategory;
  onCategoryChange: (cat: AchievementCategory) => void;
}) {
  const allAchievements = Object.values(ACHIEVEMENTS);
  const totalUnlocked = achievements.unlockedIds.length;
  const totalAchievements = allAchievements.length;

  const categories: { id: AchievementCategory; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'combat', label: '⚔️ Combattimento' },
    { id: 'exploration', label: '🗺️ Esplorazione' },
    { id: 'collection', label: '📦 Raccolta' },
    { id: 'story', label: '📖 Storia' },
    { id: 'special', label: '⭐ Speciale' },
  ];

  const filtered = category === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.category === category);

  return (
    <div>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-white/40">Traguardi Sbloccati</p>
          <p className="text-lg font-bold text-white">{totalUnlocked}<span className="text-white/30">/{totalAchievements}</span></p>
        </div>
        <div className="text-right">
          <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
              style={{ width: `${totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">{totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0}%</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1 flex-wrap mb-3">
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(cat.id)}
            className={`px-2 py-0.5 text-[10px] tracking-wide rounded-md transition-all ${
              category === cat.id
                ? 'bg-white/10 text-white'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
        {filtered.map(ach => {
          const isUnlocked = achievements.unlockedIds.includes(ach.id);
          const isHidden = ach.hidden && !isUnlocked;

          return (
            <div
              key={ach.id}
              className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                isUnlocked
                  ? 'bg-amber-900/10 border-amber-800/20'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-50'
              }`}
            >
              <span className="text-lg mt-0.5 shrink-0">
                {isHidden ? '🔒' : isUnlocked ? ach.icon : ach.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                  {isHidden ? '???' : ach.name}
                </p>
                <p className={`text-[10px] ${isUnlocked ? 'text-white/50' : 'text-white/20'}`}>
                  {isHidden ? 'Traguardo segreto' : ach.description}
                </p>
                {isUnlocked && ach.reward && (
                  <p className="text-[9px] text-amber-400/60 mt-0.5">{ach.reward}</p>
                )}
              </div>
              {isUnlocked && (
                <Badge className="text-[8px] bg-green-900/30 text-green-400 border-green-700/20 shrink-0 mt-0.5">
                  ✓
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════

function StatSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/30">{icon}</span>
        <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

function StatRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-white/40 shrink-0 w-5 text-center">{icon}</span>
      <span className="text-[11px] text-white/50 truncate">{label}</span>
      <span className={`text-[11px] font-semibold ml-auto shrink-0 ${highlight ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
