'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SaveSlotInfo } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Save, Upload, Trash2, MapPin, Users, Clock, Plus, FolderOpen
} from 'lucide-react';

type Mode = 'closed' | 'save' | 'load';

interface SaveLoadPanelProps {
  mode?: 'both' | 'save' | 'load';
  compact?: boolean;
  renderClosed?: (openPanel: (mode: 'save' | 'load') => void) => React.ReactNode;
}

export default function SaveLoadPanel({ mode = 'both', compact = false, renderClosed }: SaveLoadPanelProps) {
  const { saveGame, loadGame, getSaveInfo, deleteSave, phase, messageLog } = useGameStore();
  const [panelMode, setPanelMode] = useState<Mode>('closed');
  const [slots, setSlots] = useState<(SaveSlotInfo | null)[]>([null, null, null]);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const [justLoaded, setJustLoaded] = useState<number | null>(null);

  const refreshSlots = useCallback(() => {
    setSlots([getSaveInfo(1), getSaveInfo(2), getSaveInfo(3)]);
  }, [getSaveInfo]);

  const openPanel = (m: 'save' | 'load') => {
    setJustSaved(null);
    setJustLoaded(null);
    setSlots([getSaveInfo(1), getSaveInfo(2), getSaveInfo(3)]);
    setPanelMode(m);
  };

  const handleSave = (slot: number) => {
    saveGame(slot);
    refreshSlots();
    setJustSaved(slot);
    setTimeout(() => {
      setJustSaved(null);
      if (!compact) setPanelMode('closed');
    }, 1500);
  };

  const handleLoad = (slot: number) => {
    const success = loadGame(slot);
    if (success) {
      setJustLoaded(slot);
      setTimeout(() => {
        setJustLoaded(null);
        setPanelMode('closed');
      }, 1000);
    }
  };

  const handleDelete = (slot: number) => {
    deleteSave(slot);
    refreshSlots();
  };

  if (panelMode === 'closed') {
    if (renderClosed) {
      return <>{renderClosed(openPanel)}</>;
    }
    return (
      <div className="flex gap-1.5">
        {(mode === 'both' || mode === 'save') && phase !== 'combat' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPanel('save')}
            className="text-xs border-white/10 hover:border-amber-500/30 text-white/40 hover:text-amber-400 bg-white/[0.03] hover:bg-amber-500/[0.06] h-8 px-2.5"
            title="Salva partita"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {compact ? '' : 'Salva'}
          </Button>
        )}
        {(mode === 'both' || mode === 'load') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPanel('load')}
            className="text-xs border-white/10 hover:border-cyan-500/30 text-white/40 hover:text-cyan-400 bg-white/[0.03] hover:bg-cyan-500/[0.06] h-8 px-2.5"
            title="Carica partita"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {compact ? '' : 'Carica'}
          </Button>
        )}
      </div>
    );
  }

  const isSave = panelMode === 'save';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) setPanelMode('closed'); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md glass-dark rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center gap-2.5">
            {isSave ? (
              <Save className="w-5 h-5 text-amber-400" />
            ) : (
              <FolderOpen className="w-5 h-5 text-cyan-400" />
            )}
            <h2 className="text-lg font-bold text-white">
              {isSave ? 'Salva Partita' : 'Carica Partita'}
            </h2>
          </div>
          <Button variant="ghost" onClick={() => setPanelMode('closed')} className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Subtitle */}
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
          <p className="text-xs text-white/40">
            {isSave
              ? 'Salva il tuo progresso in uno degli slot disponibili. Il salvataggio non è possibile durante i combattimenti.'
              : 'Seleziona uno slot per riprendere la partita salvata. I dati attuali saranno sovrascritti.'}
          </p>
        </div>

        {/* Slots */}
        <div className="p-4 space-y-2.5">
          {slots.map((info, index) => {
            const slotNum = index + 1;
            const isJustSaved = justSaved === slotNum;
            const isJustLoaded = justLoaded === slotNum;

            return (
              <motion.div
                key={slotNum}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`relative p-3 rounded-lg border transition-all ${
                  info
                    ? 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                    : 'border-dashed border-white/[0.06] bg-white/[0.02] hover:border-white/[0.08]'
                }`}
              >
                {isJustSaved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-amber-950/30 rounded-lg flex items-center justify-center z-10"
                  >
                    <span className="text-amber-400 font-bold text-sm">💾 Salvato!</span>
                  </motion.div>
                )}
                {isJustLoaded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-cyan-950/30 rounded-lg flex items-center justify-center z-10"
                  >
                    <span className="text-cyan-400 font-bold text-sm">📂 Caricato!</span>
                  </motion.div>
                )}

                <div className="flex items-start gap-3">
                  {/* Slot number */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    info
                      ? isSave
                        ? 'bg-amber-900/40 text-amber-300 border border-amber-800/30'
                        : 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/30'
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
                          <Badge className="text-[10px] bg-white/10 text-white/60 border-0">
                            Turno {info.turnCount}
                          </Badge>
                          {info.isNewGamePlus && (
                            <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                              🎀 {info.persistentRibbons}/10
                            </Badge>
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
                        Slot vuoto
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {isSave && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(slotNum)}
                        disabled={isJustSaved}
                        className={`h-8 px-3 text-xs ${
                          info
                            ? 'border-amber-700/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300'
                            : 'border-gray-700/50 text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                        }`}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {info ? 'Sovrascrivi' : 'Salva'}
                      </Button>
                    )}
                    {!isSave && info && (
                      <Button
                        size="sm"
                        onClick={() => handleLoad(slotNum)}
                        disabled={isJustLoaded}
                        className="h-8 px-3 text-xs border-cyan-700/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Carica
                      </Button>
                    )}
                    {info && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(slotNum)}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-400 hover:bg-red-950/20"
                        title="Elimina salvataggio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-gray-800/30 bg-gray-900/20">
          <p className="text-[10px] text-gray-600 text-center">
            🎞️ I salvataggi sono memorizzati localmente nel browser. La cancellazione della cache del browser eliminerà i salvataggi.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
