'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ITEMS } from '@/game/data/loader';
import { NPC_PORTRAIT_URLS, NPC_BADGES } from '@/game/data/npc-images';
import ItemIcon from './ItemIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, ScrollText, Handshake, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChatMessage {
  role: 'npc' | 'player' | 'system';
  content: string;
  id: string;
  isFallback?: boolean;
}

export default function NPCDialogPanel() {
  const { activeNpc, npcQuestProgress, party, visitedLocations } = useGameStore();
  const { talkToNpc, acceptNpcQuest, tradeWithNpc, closeNpcDialog } = useGameStore();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastNpcId, setLastNpcId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const npc = activeNpc;
  const quest = npc?.quest;
  const questProgress = quest ? npcQuestProgress[quest.id] : null;
  const questCompleted = questProgress?.completed || false;
  const hasQuest = quest && !questCompleted;

  // NPC portrait image + fallback emoji
  const portraitUrl = npc ? NPC_PORTRAIT_URLS[npc.id] : null;
  const badge = npc ? NPC_BADGES[npc.id] : null;

  // Initialize greeting when NPC changes
  if (npc && lastNpcId !== npc.id) {
    setLastNpcId(npc.id);
    setChatMessages([{
      role: 'npc',
      content: npc.greeting,
      id: `greeting-${npc.id}`,
    }]);
    setError(null);
  }

  const handleTalk = useCallback(() => {
    if (!npc) return;
    const dialogue = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    setChatMessages(prev => [...prev, {
      role: 'npc',
      content: dialogue,
      id: `npc-talk-${Date.now()}`,
      isFallback: true,
    }]);
    setError(null);
    talkToNpc();
  }, [npc, talkToNpc]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const getTalkLabel = () => {
    if (!hasQuest || !questProgress) return '💬 Parla';
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

  const canTrade = (tradeIndex: number) => {
    if (!npc?.tradeInventory) return false;
    const trade = npc.tradeInventory[tradeIndex];
    if (!trade) return false;
    return party.some(p => p.inventory.some(i => i.itemId === trade.priceItemId && i.quantity >= trade.priceQuantity));
  };

  if (!npc) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closeNpcDialog(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg glass-dark rounded-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header — photo + name + badge only */}
        <div className="p-4 sm:p-5 border-b border-amber-900/20 bg-amber-950/10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Portrait — realistic image with emoji fallback */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
              {portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={npc.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="absolute text-3xl sm:text-4xl items-center justify-center"
                style={{ display: portraitUrl ? 'none' : 'flex' }}
              >
                {npc.portrait}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">{npc.name}</h3>
                {badge && (
                  <Badge className={`text-[10px] ${badge.color}`}>
                    {badge.label}
                  </Badge>
                )}
              </div>
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

        {/* Content — Chat + Quest + Trade */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 inventory-scrollbar" ref={chatEndRef as React.RefObject<HTMLDivElement>}>

          {/* Chat Messages — no repeated NPC name */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Conversazione
            </div>
            <div className="glass-dark-inner rounded-lg p-3 space-y-3 min-h-[60px]">
              <AnimatePresence initial={false}>
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start"
                  >
                    <p className="text-sm text-white/80 italic leading-relaxed">
                      &ldquo;{msg.content}&rdquo;
                    </p>
                    {msg.isFallback && (
                      <span className="text-[9px] text-white/20 italic mt-0.5">risposta predefinita</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg border border-red-900/30 bg-red-950/20">
                <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[10px] text-red-400/80">{error}</span>
              </div>
            )}
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

                  {/* Reward items with PNG icons */}
                  {quest.rewardItems && quest.rewardItems.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] text-white/30">Ricompensa:</span>
                      {quest.rewardItems.map((r, i) => {
                        const itemDef = ITEMS[r.itemId];
                        return (
                          <span key={i} className="flex items-center gap-1 text-[10px] text-amber-300/70 bg-amber-950/30 border border-amber-700/20 rounded px-1.5 py-0.5">
                            <ItemIcon itemId={r.itemId} rarity="common" size={14} />
                            {itemDef?.name || r.itemId} x{r.quantity}
                          </span>
                        );
                      })}
                      {quest.rewardExp > 0 && (
                        <span className="text-[10px] text-white/30">+{quest.rewardExp} XP</span>
                      )}
                    </div>
                  )}

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

          {/* Trade Section — enlarged with PNG images */}
          {npc.tradeInventory && npc.tradeInventory.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
                <Handshake className="w-3 h-3" /> Commercio
              </div>
              <div className="space-y-2">
                {npc.tradeInventory.map((trade, idx) => {
                  const canDo = canTrade(idx);
                  const itemDef = ITEMS[trade.itemId];
                  const priceDef = ITEMS[trade.priceItemId];
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border transition-all ${
                        canDo
                          ? 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]'
                          : 'border-white/[0.04] bg-white/[0.01] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Item icon (PNG) */}
                        <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 p-1">
                          <ItemIcon itemId={trade.itemId} rarity="common" size={36} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{itemDef?.name || trade.itemId}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-white/40">Prezzo:</span>
                            <span className="flex items-center gap-1 text-[10px] text-amber-300/70">
                              <ItemIcon itemId={trade.priceItemId} rarity="common" size={12} />
                              {trade.priceQuantity}x {priceDef?.name || trade.priceItemId}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canDo}
                          onClick={() => tradeWithNpc(idx)}
                          className="h-9 px-3 text-xs font-semibold border-amber-700/40 text-amber-300 hover:bg-amber-950/30 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent"
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
        <div className="p-3 sm:p-4 border-t border-white/[0.04] space-y-2 shrink-0">
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
              onClick={handleTalk}
              variant="ghost"
              className={`flex-1 bg-transparent hover:bg-white/[0.08] border text-sm ${
                talkLabel.includes('Consegna') || talkLabel.includes('Rapporto')
                  ? 'border-green-700/30 text-green-300 hover:text-green-200'
                  : 'border-white/[0.06] text-white/60 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              {talkLabel}
            </Button>
            <Button
              onClick={closeNpcDialog}
              variant="ghost"
              className="flex-1 bg-transparent hover:bg-white/[0.08] border border-white/[0.06] text-white/60 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Chiudi
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
