'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SaveSlotInfo } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Skull, Upload, MapPin, Clock, Users, ChevronLeft } from 'lucide-react';
import { getArchetypeEmoji, MAX_RIBBONS } from '@/game/utils/archetype-helpers';

export default function GameOverScreen() {
  const party = useGameStore(s => s.party);
  const turnCount = useGameStore(s => s.turnCount);
  const restartGame = useGameStore(s => s.restartGame);
  const loadGame = useGameStore(s => s.loadGame);
  const getSaveInfo = useGameStore(s => s.getSaveInfo);
  const refreshSaveSlots = useGameStore(s => s.refreshSaveSlots);

  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [slots, setSlots] = useState<(SaveSlotInfo | null)[]>([null, null, null]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const refreshSlots = useCallback(() => {
    setSlots([getSaveInfo(1), getSaveInfo(2), getSaveInfo(3)]);
  }, [getSaveInfo]);

  const openLoadMenu = async () => {
    setLoadingSlots(true);
    await refreshSaveSlots();
    setSlots([getSaveInfo(1), getSaveInfo(2), getSaveInfo(3)]);
    setLoadingSlots(false);
    setShowLoadMenu(true);
  };

  const handleLoad = async (slot: number) => {
    setLoadingSlot(slot);
    const success = await loadGame(slot);
    if (!success) {
      setLoadingSlot(null);
      refreshSlots();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center game-horror relative overflow-hidden">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-red-950/30 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 vignette-overlay-red pointer-events-none" />

      <AnimatePresence mode="wait">
        {!showLoadMenu ? (
          <motion.div
            key="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 text-center px-4 max-w-lg"
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
              className="text-gray-500 text-sm leading-relaxed mb-8 italic"
            >
              Le tenebre di Raccoon City hanno consumato ogni speranza.
              I sopravvissuti sono caduti, e la città resta prigioniera dell&apos;incubo.
              Il virus T ha vinto... stavolta.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="glass-dark-accent rounded-lg p-4 mb-8 text-sm"
            >
              <div className="grid grid-cols-2 gap-3 text-gray-400">
                <div>
                  <span className="text-gray-600">Turni sopravvissuti</span>
                  <div className="text-2xl font-bold text-gray-200">{turnCount}</div>
                </div>
                <div>
                  <span className="text-gray-600">Sopravvissuti</span>
                  <div className="text-2xl font-bold text-gray-200">{party.length}</div>
                </div>
                {party.map(char => (
                  <div key={char.id} className="col-span-2 flex items-center gap-2 text-gray-500 text-xs">
                    <span>
                      {getArchetypeEmoji(char.archetype)}
                    </span>
                    {char.name} — Lv.{char.level}
                    <span className="text-red-800">✕</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
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
              <Button
                onClick={openLoadMenu}
                size="lg"
                className="px-10 py-5 text-base tracking-widest uppercase
                  bg-gray-900/60 hover:bg-gray-800/70 border-2 border-gray-600/40 hover:border-gray-400/60
                  text-gray-300 hover:text-white transition-all duration-300
                  hover:shadow-[0_0_20px_rgba(156,163,175,0.2)]"
              >
                <Upload className="w-5 h-5 mr-2" />
                Carica Salvataggio
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          /* Load Save Menu */
          <motion.div
            key="load-menu"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="glass-dark rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Carica Salvataggio</h2>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowLoadMenu(false)}
                  className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              {/* Subtitle */}
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                <p className="text-xs text-white/40">
                  Seleziona uno slot per riprendere da un punto precedente. Il progresso attuale sarà perso.
                </p>
              </div>

              {/* Slots */}
              <div className="p-4 space-y-2.5">
                {slots.map((info, index) => {
                  const slotNum = index + 1;

                  return (
                    <motion.div
                      key={slotNum}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className={`relative p-3 rounded-lg border transition-all ${
                        info
                          ? 'border-white/[0.08] bg-white/[0.03] hover:border-cyan-500/20'
                          : 'border-dashed border-white/[0.06] bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Slot number */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          info
                            ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/30'
                            : 'bg-gray-900 text-gray-600 border border-gray-800/50'
                        }`}>
                          {slotNum}
                        </div>

                        {/* Slot info */}
                        <div className="flex-1 min-w-0">
                          {info ? (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white truncate">
                                  Slot {slotNum}
                                </span>
                                <span className="text-[10px] text-white/50 bg-white/10 rounded px-1.5 py-0.5">
                                  Turno {info.turnCount}
                                </span>
                                {info.isNewGamePlus && (
                                  <span className="text-[9px] text-purple-300 bg-purple-500/20 rounded px-1.5 py-0.5">
                                    🎀 {info.persistentRibbons}/{MAX_RIBBONS}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/40 mb-1.5">
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {info.locationName}
                                </span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  {new Date(info.timestamp).toLocaleString('it-IT', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="text-xs text-white/30 truncate">
                                <Users className="w-3 h-3 inline mr-1" />
                                {info.partySummary}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-white/30 py-1">
                              Vuoto
                            </div>
                          )}
                        </div>

                        {/* Load action */}
                        {info && (
                          <Button
                            size="sm"
                            onClick={() => handleLoad(slotNum)}
                            disabled={loadingSlot === slotNum}
                            className="h-8 px-3 text-xs bg-transparent border-cyan-700/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 shrink-0"
                          >
                            {loadingSlot === slotNum ? (
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="inline-block w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
                              />
                            ) : (
                              <>
                                <Upload className="w-3 h-3 mr-1" />
                                Carica
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Back button */}
              <div className="px-4 py-3 border-t border-gray-800/30">
                <Button
                  variant="ghost"
                  onClick={() => setShowLoadMenu(false)}
                  className="w-full text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] text-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Indietro
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
