'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, RotateCcw, Save, Plus, Sparkles, X, Upload, Clock } from 'lucide-react';

export default function VictoryScreen() {
  const { party, turnCount, collectedRibbons, persistentRibbons, gameStartTime, restartGame, saveGameVictory, startNewGamePlus, loadGame, getSaveInfo } = useGameStore();
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [savedSlot, setSavedSlot] = useState<number | null>(null);
  const [showNGPPanel, setShowNGPPanel] = useState(false);
  const [loadedNGP, setLoadedNGP] = useState(false);

  const totalPersistent = Math.min((persistentRibbons || 0) + (collectedRibbons || 0), 10);

  // Calculate play time
  const playTimeFormatted = useMemo(() => {
    if (!gameStartTime || gameStartTime === 0) return null;
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [gameStartTime]);

  const handleSaveVictory = (slot: number) => {
    const total = saveGameVictory(slot);
    setSavedSlot(slot);
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

        {/* Collectible Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="glass-dark rounded-xl border-purple-700/20 p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎀</span>
              <div className="text-left">
                <p className="text-xs text-white/50">Collezionabili — Questa Run</p>
                <p className="text-sm font-bold text-purple-300">{collectedRibbons}<span className="text-purple-400/60">/10</span> Nastri d&apos;Inchiostro</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <div className="text-right">
                <p className="text-xs text-white/50">Totale Persistente</p>
                <p className="text-sm font-bold text-amber-300">{totalPersistent}<span className="text-amber-400/60">/10</span></p>
              </div>
            </div>
          </div>
          {collectedRibbons === 0 && (
            <p className="text-[10px] text-white/30 mt-2 italic">
              Non hai trovato nastri in questa run. Esplora e cerca meglio nel prossimo tentativo!
            </p>
          )}
          {totalPersistent >= 10 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <p className="text-xs font-bold text-amber-300">
                🏆 Obiettivo Segreto sbloccato! Tutti e 10 i nastri raccolti!
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Party Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="glass-dark rounded-xl border-amber-700/20 p-5 mb-8 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Riepilogo Finale</h3>
            <div className="flex items-center gap-2">
              {playTimeFormatted && (
                <Badge className="bg-gray-800/80 text-gray-300 border-gray-700/30">
                  <Clock className="w-3 h-3 mr-1" /> {playTimeFormatted}
                </Badge>
              )}
              <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30">
                <Star className="w-3 h-3 mr-1" /> Turno {turnCount}
              </Badge>
            </div>
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
                  {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : char.archetype === 'control' ? '🎯' : '⚔️'}
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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          {/* Save Victory — unlocks New Game+ */}
          <Button
            onClick={() => setShowSavePanel(true)}
            size="lg"
            className="px-8 py-4 text-sm tracking-widest uppercase
              bg-purple-900/40 hover:bg-purple-800/50 border-2 border-purple-700/60 hover:border-purple-500
              text-purple-100 hover:text-white transition-all duration-300
              hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <Save className="w-5 h-5 mr-2" />
            Salva per Nuovo Gioco+
          </Button>

          {/* New Game+ — if persistent ribbons exist */}
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
              Nuovo Gioco+
            </Button>
          )}

          {/* Normal Restart */}
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

        {canStartNGP && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            className="text-[10px] text-amber-500/50 mt-4"
          >
            ✨ Nuovo Gioco+: I nastri collezionati vengono mantenuti tra le partite!
          </motion.p>
        )}
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
                  💾 Salva il progresso per iniziare una nuova avventura con i nastri collezionati ({totalPersistent}/10). Le statistiche dei personaggi verranno preservate nel salvataggio.
                </p>
              </div>
              <div className="p-4 space-y-2.5">
                {[1, 2, 3].map(slotNum => {
                  const info = getSaveInfo(slotNum);
                  const isJustSaved = savedSlot === slotNum;
                  return (
                    <div key={slotNum} className={`p-3 rounded-lg border transition-all ${
                      info
                        ? 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                        : 'border-dashed border-white/[0.06] bg-white/[0.02] hover:border-white/[0.08]'
                    }`}>
                      {isJustSaved && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-purple-950/30 rounded-lg flex items-center justify-center z-10"
                        >
                          <span className="text-purple-400 font-bold text-sm">💾 Salvato! 🎀 {totalPersistent}/10</span>
                        </motion.div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          info?.isNewGamePlus
                            ? 'bg-purple-900/40 text-purple-300 border border-purple-800/30'
                            : 'bg-gray-900 text-gray-600 border border-gray-800/50'
                        }`}>
                          {slotNum}
                        </div>
                        <div className="flex-1 min-w-0">
                          {info ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">Slot {slotNum}</span>
                                {info.isNewGamePlus && (
                                  <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                                    🎀 {info.persistentRibbons}/10
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-white/30 truncate">{info.partySummary}</p>
                            </>
                          ) : (
                            <p className="text-xs text-white/30 py-1">Slot vuoto</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSaveVictory(slotNum)}
                          className="h-8 px-3 text-xs border-purple-700/50 text-purple-400 hover:bg-purple-950/30 hover:text-purple-300"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Salva
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
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                <p className="text-xs text-white/40">
                  Seleziona un salvataggio Nuovo Gioco+ per mantenere i nastri collezionati.
                </p>
              </div>
              <div className="p-4 space-y-2.5">
                {ngpSaves.length > 0 ? ngpSaves.map(info => (
                  <div key={info.slot} className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-purple-900/40 text-purple-300 border border-purple-800/30">
                        {info.slot}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">Slot {info.slot}</span>
                          <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                            🎀 {info.persistentRibbons}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-white/30 truncate">{info.partySummary}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleNGP(info.slot)}
                        className="h-8 px-3 text-xs border-amber-700/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Gioca
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
