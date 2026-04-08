'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { NPCS } from '@/game/data/npcs';
import { QUESTS } from '@/game/data/loader';
import { ITEMS } from '@/game/data/loader';
import { NPC_PORTRAIT_URLS } from '@/game/data/npc-images';
import ItemIcon from './ItemIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollText, X, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { NPCQuest } from '@/game/types';

const QUEST_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  fetch: {
    label: 'Recupera',
    icon: '📦',
    color: 'text-blue-300 border-blue-700/30 bg-blue-950/20',
  },
  kill: {
    label: 'Uccidi',
    icon: '⚔️',
    color: 'text-red-300 border-red-700/30 bg-red-950/20',
  },
  explore: {
    label: 'Esplora',
    icon: '🗺️',
    color: 'text-emerald-300 border-emerald-700/30 bg-emerald-950/20',
  },
};

function getQuestDetails(questId: string): { npcName: string; npcPortrait: string; npcPortraitUrl?: string; quest: NPCQuest } | null {
  for (const npc of Object.values(NPCS)) {
    if (npc.quest && npc.quest.id === questId) {
      return {
        npcName: npc.name,
        npcPortrait: npc.portrait,
        npcPortraitUrl: NPC_PORTRAIT_URLS[npc.id],
        quest: npc.quest,
      };
    }
  }
  const dbQuest = QUESTS[questId];
  if (dbQuest) {
    let npcName = 'NPC';
    let npcPortrait = '👤';
    let npcPortraitUrl: string | undefined;
    if (dbQuest.npcId) {
      const npc = NPCS[dbQuest.npcId];
      if (npc) {
        npcName = npc.name;
        npcPortrait = npc.portrait;
        npcPortraitUrl = NPC_PORTRAIT_URLS[npc.id];
      }
    }
    return { npcName, npcPortrait, npcPortraitUrl, quest: dbQuest };
  }
  return null;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const isReady = current >= target;
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${isReady ? 'bg-green-500' : 'bg-amber-500/80'}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

function NpcPortrait({ npcId, portrait, size = 'sm' }: { npcId: string; portrait: string; size?: 'sm' | 'lg' }) {
  const portraitUrl = NPC_PORTRAIT_URLS[npcId];
  const dim = size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';

  return (
    <div className={`${dim} rounded-lg overflow-hidden bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0`}>
      {portraitUrl ? (
        <img
          src={portraitUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'flex';
          }}
        />
      ) : null}
      <span
        className={`items-center justify-center ${size === 'lg' ? 'text-xl' : 'text-sm'}`}
        style={{ display: portraitUrl ? 'none' : 'flex' }}
      >
        {portrait}
      </span>
    </div>
  );
}

export default function MissionsPanel() {
  const { missionsOpen, toggleMissions, npcQuestProgress } = useGameStore();
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const questEntries = Object.entries(npcQuestProgress);
  const activeQuests = questEntries.filter(([, progress]) => !progress.completed);
  const completedQuests = questEntries.filter(([, progress]) => progress.completed);
  const totalCount = questEntries.length;

  return (
    <AnimatePresence>
      {missionsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleMissions();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-lg max-h-[90vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Missioni</h3>
                <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-xs">
                  {activeQuests.length}/{totalCount}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMissions}
                className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 inventory-scrollbar">
              {totalCount === 0 ? (
                <div className="text-center py-12">
                  <ScrollText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nessuna missione attiva.</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Parla con gli NPC per ricevere nuove missioni.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Missions */}
                  {activeQuests.length > 0 && (
                    <div>
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Missioni Attive ({activeQuests.length})
                      </div>
                      <div className="space-y-2">
                        {activeQuests.map(([questId, progress]) => {
                          const details = getQuestDetails(questId);
                          if (!details) return null;

                          const { npcName, npcPortrait, npcPortraitUrl, quest } = details;
                          const typeInfo = QUEST_TYPE_LABELS[quest.type] || QUEST_TYPE_LABELS.fetch;
                          const isReady = progress.currentCount >= quest.targetCount;

                          // Find NPC id for portrait
                          const npcId = Object.keys(NPCS).find(id => NPCS[id].quest?.id === questId) || '';

                          return (
                            <motion.div
                              key={questId}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-lg border p-3 transition-all ${
                                isReady
                                  ? 'border-green-600/40 bg-green-950/15 shadow-[0_0_12px_rgba(34,197,94,0.08)]'
                                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* NPC portrait — realistic image */}
                                <NpcPortrait npcId={npcId} portrait={npcPortrait} size="lg" />

                                {/* Quest info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-white truncate">
                                      {quest.name}
                                    </h4>
                                    <Badge className={`text-[9px] shrink-0 ${typeInfo.color}`}>
                                      {typeInfo.icon} {typeInfo.label}
                                    </Badge>
                                    {isReady && (
                                      <Badge className="text-[9px] bg-green-900/50 text-green-300 border-green-700/30 shrink-0 animate-pulse">
                                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                        Pronto ✓
                                      </Badge>
                                    )}
                                  </div>

                                  <p className="text-xs text-white/50 mt-1 line-clamp-2">
                                    {quest.description}
                                  </p>

                                  {/* Progress */}
                                  <div className="mt-2 space-y-1">
                                    <ProgressBar
                                      current={progress.currentCount}
                                      target={quest.targetCount}
                                    />
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-white/40">
                                        {progress.currentCount}/{quest.targetCount}
                                      </span>
                                      {!isReady && (
                                        <span className="text-[10px] text-white/30">
                                          {npcName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reward items with PNG icons */}
                                  {quest.rewardItems && quest.rewardItems.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                      <span className="text-[9px] text-white/25">Ricompensa:</span>
                                      {quest.rewardItems.map((r, i) => {
                                        const itemDef = ITEMS[r.itemId];
                                        return (
                                          <span key={i} className="flex items-center gap-0.5 text-[9px] text-amber-300/60">
                                            <ItemIcon itemId={r.itemId} rarity="common" size={11} />
                                            {itemDef?.name || r.itemId}{r.quantity > 1 ? ` x${r.quantity}` : ''}
                                          </span>
                                        );
                                      })}
                                      {quest.rewardExp > 0 && (
                                        <span className="text-[9px] text-white/25">+{quest.rewardExp} XP</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Ready hint */}
                                  {isReady && (
                                    <div className="mt-2 px-2 py-1 rounded bg-green-500/10 border border-green-600/20">
                                      <p className="text-[10px] text-green-300 font-medium">
                                        💬 Parla con <span className="font-bold">{npcName}</span> per
                                        completare
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed Missions */}
                  {completedQuests.length > 0 && (
                    <div>
                      <button
                        onClick={() => setCompletedExpanded(!completedExpanded)}
                        className="w-full text-left text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5 hover:text-white/60 transition-colors"
                      >
                        {completedExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        Missioni Completate ({completedQuests.length})
                      </button>

                      <AnimatePresence>
                        {completedExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1">
                              {completedQuests.map(([questId]) => {
                                const details = getQuestDetails(questId);
                                if (!details) return null;
                                const npcId = Object.keys(NPCS).find(id => NPCS[id].quest?.id === questId) || '';

                                return (
                                  <motion.div
                                    key={questId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-white/[0.04] bg-white/[0.01] opacity-60"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-green-500/60 shrink-0" />
                                    <NpcPortrait npcId={npcId} portrait={details.npcPortrait} />
                                    <span className="text-xs text-white/50 truncate">
                                      {details.quest.name}
                                    </span>
                                    <span className="text-[10px] text-white/20 ml-auto shrink-0">
                                      {details.npcName}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
