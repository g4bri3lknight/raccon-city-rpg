'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ITEMS } from '@/game/data/items';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, ScrollText, Handshake, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function NPCDialogPanel() {
  const { activeNpc, npcQuestProgress, party, visitedLocations, messageLog } = useGameStore();
  const { talkToNpc, acceptNpcQuest, tradeWithNpc, closeNpcDialog } = useGameStore();
  const [npcReply, setNpcReply] = useState<string | null>(null);

  if (!activeNpc) return null;

  const npc = activeNpc;
  const quest = npc.quest;
  const questProgress = quest ? npcQuestProgress[quest.id] : null;
  const questCompleted = questProgress?.completed || false;
  const hasQuest = quest && !questCompleted;

  // Determine what "Parla" will do based on quest type
  const getTalkLabel = () => {
    if (!hasQuest || !questProgress) return 'Parla';
    if (quest!.type === 'fetch') {
      let itemCount = 0;
      for (const p of party) {
        for (const inv of p.inventory) {
          if (inv.itemId === quest!.targetId) itemCount += inv.quantity;
        }
      }
      if (itemCount >= quest!.targetCount) return '📦 Consegna';
      if (itemCount > 0) return `📦 Consegna (${itemCount}/${quest!.targetCount})`;
      return '💬 Parla';
    }
    if (quest!.type === 'explore') {
      if (visitedLocations?.includes(quest!.targetId)) return '🗺️ Rapporto';
      return '💬 Parla';
    }
    if (quest!.type === 'kill') {
      const remaining = quest!.targetCount - questProgress.currentCount;
      return `⚔️ Stato (${remaining})`;
    }
    return '💬 Parla';
  };
  const talkLabel = getTalkLabel();

  // Find the last NPC reply from the message log (for visible feedback in dialog)
  const lastNpcLine = npcReply || messageLog.filter(m => m.includes('💬')).slice(-1)[0] || null;

  // Check if player can trade (has required items)
  const canTrade = (tradeIndex: number) => {
    if (!npc.tradeInventory) return false;
    const trade = npc.tradeInventory[tradeIndex];
    if (!trade) return false;
    return party.some(p => p.inventory.some(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity));
  };

  // Dialogue
  const displayDialogues = questCompleted && npc.questCompletedDialogue
    ? npc.questCompletedDialogue
    : npc.dialogues;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
    >
      {/* Background blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg glass-dark rounded-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-900/20 bg-amber-950/10 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-3xl sm:text-4xl shrink-0">
              {npc.portrait}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">{npc.name}</h3>
                <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/30 text-[10px]">
                  👤 Sopravvissuto
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-white/50 mt-0.5">{npc.greeting}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeNpcDialog}
              className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 inventory-scrollbar">
          {/* Dialogue */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Dialogo
            </div>
            <div className="glass-dark-inner rounded-lg p-3">
              {displayDialogues.map((line, i) => (
                <p key={i} className="text-sm text-white/70 italic leading-relaxed">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          </div>

          {/* Quest Section */}
          {quest && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
                <ScrollText className="w-3 h-3" /> Missione
              </div>
              {questCompleted ? (
                <div className="p-3 rounded-lg border border-green-800/30 bg-green-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-300">Completata!</span>
                  </div>
                  <p className="text-xs text-green-400/70 mt-1">{quest.name}</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-amber-800/30 bg-amber-950/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-300">{quest.name}</span>
                    {questProgress && (
                      <Badge className="text-[9px] bg-white/[0.06] text-white/40">
                        {questProgress.currentCount}/{quest.targetCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/60">{quest.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {quest.type === 'fetch' && (
                      <span className="text-[10px] text-white/40">
                        Oggetto: {ITEMS[quest.targetId]?.name || quest.targetId}
                      </span>
                    )}
                    {quest.type === 'kill' && (
                      <span className="text-[10px] text-white/40">
                        Uccidi: {quest.targetId.replace(/_/g, ' ')} (x{quest.targetCount})
                      </span>
                    )}
                    {quest.type === 'explore' && (
                      <span className="text-[10px] text-white/40">
                        Esplora: {quest.targetId.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trade Section */}
          {npc.tradeInventory && npc.tradeInventory.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
                <Handshake className="w-3 h-3" /> Commercio
              </div>
              <div className="space-y-1.5">
                {npc.tradeInventory.map((trade, idx) => {
                  const canDo = canTrade(idx);
                  const itemDef = ITEMS[trade.itemId];
                  const priceDef = ITEMS[trade.priceItemId];
                  return (
                    <div key={idx} className={`p-2.5 rounded-lg border transition-all ${canDo ? 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]' : 'border-white/[0.04] bg-white/[0.01] opacity-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{itemDef?.icon || '📦'}</span>
                          <div>
                            <p className="text-xs font-semibold text-white">{itemDef?.name}</p>
                            <p className="text-[10px] text-white/40">
                              Prezzo: {trade.priceQuantity}x {priceDef?.icon} {priceDef?.name}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canDo}
                          onClick={() => tradeWithNpc(idx)}
                          className="h-7 px-2 text-[10px] border-amber-700/40 bg-transparent text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Scambia
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 sm:p-4 border-t border-white/[0.06] space-y-2 shrink-0">
          {hasQuest && !questProgress && (
            <Button
              onClick={acceptNpcQuest}
              className="w-full bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/30 hover:border-amber-500/50 text-amber-200 text-sm"
            >
              <ScrollText className="w-4 h-4 mr-2" />
              Accetta Missione
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setNpcReply(null);
                talkToNpc();
                // After a tick, check the message log for NPC response
                setTimeout(() => {
                  const log = useGameStore.getState().messageLog;
                  const last = log.filter(m => m.includes('💬')).slice(-1)[0];
                  if (last) {
                    setNpcReply(last);
                    // If quest was completed, auto-close after 2s
                    if (last.includes('Missione completata') || last.includes('Grazie')) {
                      setTimeout(() => closeNpcDialog(), 2000);
                    }
                  }
                }, 100);
              }}
              variant="ghost"
              className={`flex-1 bg-white/[0.04] hover:bg-white/[0.08] border text-sm ${
                talkLabel.includes('Consegna') || talkLabel.includes('Rapporto')
                  ? 'border-green-700/30 text-green-300 hover:text-green-200'
                  : 'border-white/[0.06] text-white/60 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              {talkLabel}
            </Button>
          </div>
          {lastNpcLine && (
            <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-sm text-white/70 italic animate-in fade-in slide-in-from-bottom-2">
              {lastNpcLine.replace(/^\[\d+\] /, '')}
            </div>
          )}
          <Button
            onClick={closeNpcDialog}
            variant="ghost"
            className="w-full text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-xs"
          >
            <ArrowLeft className="w-3 h-3 mr-1" /> Continua l&apos;esplorazione
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
