'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ENEMIES, ENEMY_IMAGES } from '@/game/data/enemies';
import { ITEMS } from '@/game/data/items';
import { EnemyDefinition } from '@/game/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  BookOpen,
  Lock,
  Skull,
  Swords,
  Shield,
  Zap,
  Heart,
  Star,
  Crown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
} from 'lucide-react';

const ALL_ENEMY_IDS = Object.keys(ENEMIES);

const VARIANT_GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  zombie: { label: 'Zombie', icon: '🧟' },
  cerberus: { label: 'Cerberi', icon: '🐕' },
  licker: { label: 'Licker', icon: '👅' },
  hunter: { label: 'Hunter', icon: '🦎' },
  tyrant: { label: 'Tyrant', icon: '👹' },
  nemesis: { label: 'Nemesis', icon: '💀' },
};

const VARIANT_GROUP_ORDER = ['zombie', 'cerberus', 'licker', 'hunter', 'tyrant', 'nemesis'];

const MAX_STAT = 500; // reference max for stat bar width

const STAT_CONFIG = [
  { key: 'maxHp' as const, label: 'HP', icon: Heart, color: 'from-red-600 to-red-400' },
  { key: 'atk' as const, label: 'ATK', icon: Swords, color: 'from-orange-600 to-orange-400' },
  { key: 'def' as const, label: 'DEF', icon: Shield, color: 'from-cyan-600 to-cyan-400' },
  { key: 'spd' as const, label: 'SPD', icon: Zap, color: 'from-yellow-600 to-yellow-400' },
];

function getStatBarWidth(value: number): number {
  return Math.min((value / MAX_STAT) * 100, 100);
}

function getRarityColor(chance: number): string {
  if (chance >= 50) return 'text-white/30';
  if (chance >= 30) return 'text-green-400/60';
  if (chance >= 15) return 'text-blue-400/70';
  if (chance >= 8) return 'text-purple-400/70';
  return 'text-amber-400/80';
}

function StatBar({ value, config }: { value: number; config: (typeof STAT_CONFIG)[number] }) {
  const Icon = config.icon;
  const pct = getStatBarWidth(value);
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-2.5 h-2.5 text-white/25 shrink-0" />
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${config.color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-mono text-white/35 w-5 text-right">{value}</span>
    </div>
  );
}

function LootEntryRow({ itemId, chance, quantity }: { itemId: string; chance: number; quantity: number }) {
  const item = ITEMS[itemId];
  const name = item?.name ?? itemId;
  const icon = item?.icon ?? '?';
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-white/50">
        {icon} {name} x{quantity}
      </span>
      <span className={`text-[10px] font-mono ${getRarityColor(chance)}`}>
        {chance}%
      </span>
    </div>
  );
}

function AbilitiesList({ abilities }: { abilities: EnemyDefinition['abilities'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors w-full"
      >
        <Swords className="w-2.5 h-2.5" />
        <span>Abilità ({abilities.length})</span>
        {open ? <ChevronUp className="w-2.5 h-2.5 ml-auto" /> : <ChevronDown className="w-2.5 h-2.5 ml-auto" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l border-white/[0.06] mt-1 space-y-0.5">
              {abilities.map((ab) => (
                <div key={ab.name}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50 font-medium">{ab.name}</span>
                    <span className="text-[9px] text-white/20">×{ab.power}</span>
                  </div>
                  <p className="text-[9px] text-white/25 leading-relaxed">{ab.description}</p>
                  {ab.statusEffect && (
                    <span className="text-[8px] text-red-400/40">
                      +{ab.statusEffect.chance}% {ab.statusEffect.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LootTable({ lootTable }: { lootTable: EnemyDefinition['lootTable'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors w-full"
      >
        <Sparkles className="w-2.5 h-2.5" />
        <span>Bottino ({lootTable.length})</span>
        {open ? <ChevronUp className="w-2.5 h-2.5 ml-auto" /> : <ChevronDown className="w-2.5 h-2.5 ml-auto" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l border-white/[0.06] mt-1 space-y-0.5">
              {lootTable.map((entry) => (
                <LootEntryRow
                  key={entry.itemId}
                  itemId={entry.itemId}
                  chance={entry.chance}
                  quantity={entry.quantity}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiscoveredCard({
  enemy,
  isDefeated,
  timesDefeated,
}: {
  enemy: EnemyDefinition;
  isDefeated: boolean;
  timesDefeated: number;
}) {
  const imgSrc = ENEMY_IMAGES[enemy.id];
  const groupInfo = VARIANT_GROUP_LABELS[enemy.variantGroup ?? ''];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative p-3 rounded-lg border overflow-hidden ${
        enemy.isBoss
          ? 'border-red-500/25 bg-red-950/[0.08] shadow-[0_0_16px_rgba(239,68,68,0.06)]'
          : isDefeated
            ? 'border-emerald-500/15 bg-emerald-950/[0.06] shadow-[0_0_12px_rgba(16,185,129,0.04)]'
            : 'border-white/[0.06] bg-white/[0.025]'
      }`}
    >
      {/* Boss aura */}
      {enemy.isBoss && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
      )}

      {/* Image row */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/[0.08] bg-black/40 shrink-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={enemy.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center text-2xl bg-white/[0.03] ${imgSrc ? 'hidden' : ''}`}>
            {enemy.icon}
          </div>
          {enemy.isBoss && (
            <div className="absolute -top-1 -right-1">
              <Crown className="w-4 h-4 text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-white truncate">{enemy.name}</h3>
            {enemy.isBoss && (
              <Badge className="text-[9px] bg-red-500/15 text-red-400 border-red-500/25 border px-1.5 py-0 h-4">
                BOSS
              </Badge>
            )}
          </div>
          {groupInfo && (
            <p className="text-[10px] text-white/30 mt-0.5">
              {groupInfo.icon} {groupInfo.label}
            </p>
          )}
          <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">
            {enemy.description}
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-2">
        {isDefeated ? (
          <Badge className="text-[10px] bg-emerald-500/12 text-emerald-400 border-emerald-500/20 border px-1.5 py-0 h-4">
            <Skull className="w-2.5 h-2.5 mr-1" />
            Sconfitto {timesDefeated}x
          </Badge>
        ) : (
          <Badge className="text-[10px] bg-amber-500/12 text-amber-400 border-amber-500/20 border px-1.5 py-0 h-4">
            <Eye className="w-2.5 h-2.5 mr-1" />
            Incontrato
          </Badge>
        )}
        <Badge className="text-[10px] bg-white/[0.05] text-white/50 border-0 px-1.5 py-0 h-4">
          <Star className="w-2.5 h-2.5 mr-1" />
          {enemy.expReward} EXP
        </Badge>
      </div>

      {/* Stats bars */}
      <div className="space-y-1 mb-1">
        {STAT_CONFIG.map((cfg) => (
          <StatBar key={cfg.key} value={enemy[cfg.key]} config={cfg} />
        ))}
      </div>

      {/* Expandable sections */}
      <AbilitiesList abilities={enemy.abilities} />
      <LootTable lootTable={enemy.lootTable} />
    </motion.div>
  );
}

function UndiscoveredCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative p-3 rounded-lg border border-red-500/[0.06] bg-white/[0.015]"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-14 h-14 rounded-lg border border-white/[0.04] bg-white/[0.02] flex items-center justify-center shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
            <Lock className="w-4 h-4 text-white/10" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white/15">???</h3>
          <p className="text-[10px] text-white/10 mt-0.5">Nemico sconosciuto</p>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1 bg-white/[0.04] rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1 bg-white/[0.04] rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1 bg-white/[0.04] rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1 bg-white/[0.04] rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function BestiaryPanel() {
  const { bestiary, bestiaryOpen, toggleBestiary } = useGameStore();

  const discoveredCount = bestiary.filter((e) => e.encountered).length;
  const defeatedCount = bestiary.filter((e) => e.defeated).length;
  const totalCount = ALL_ENEMY_IDS.length;
  const progressPct = totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0;

  const bestiaryMap = useMemo(
    () => new Map(bestiary.map((e) => [e.enemyId, e])),
    [bestiary],
  );

  const groupedEnemies = useMemo(() => {
    const groups: { group: string; enemies: { id: string; entry?: (typeof bestiary)[number]; def?: EnemyDefinition }[] }[] = [];
    for (const vg of VARIANT_GROUP_ORDER) {
      const enemies = ALL_ENEMY_IDS.filter((id) => ENEMIES[id]?.variantGroup === vg);
      if (enemies.length > 0) {
        groups.push({
          group: vg,
          enemies: enemies.map((id) => ({
            id,
            entry: bestiaryMap.get(id),
            def: ENEMIES[id],
          })),
        });
      }
    }
    // Catch any enemies not in known groups
    const knownIds = new Set(VARIANT_GROUP_ORDER.flatMap((vg) => ALL_ENEMY_IDS.filter((id) => ENEMIES[id]?.variantGroup === vg)));
    const ungrouped = ALL_ENEMY_IDS.filter((id) => !knownIds.has(id));
    if (ungrouped.length > 0) {
      groups.push({
        group: 'other',
        enemies: ungrouped.map((id) => ({
          id,
          entry: bestiaryMap.get(id),
          def: ENEMIES[id],
        })),
      });
    }
    return groups;
  }, [bestiaryMap]);

  return (
    <AnimatePresence>
      {bestiaryOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleBestiary();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg sm:max-w-2xl glass-dark rounded-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.03] shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-red-400" />
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    📖 Bestiario
                  </h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {discoveredCount}/{totalCount} Scoperti · {defeatedCount} Sconfitti
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={toggleBestiary}
                className="text-white/40 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ── Progress Bar ── */}
            <div className="px-4 pt-3 pb-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/40">Catalogazione Nemici</span>
                <span className="text-[11px] font-mono text-red-400/80">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
                />
              </div>
            </div>

            {/* ── Enemy List (grouped) ── */}
            <div className="flex-1 overflow-y-auto glass-scrollbar p-3 space-y-4">
              {groupedEnemies.map(({ group, enemies }) => {
                const groupInfo = VARIANT_GROUP_LABELS[group];
                if (!groupInfo) return null;

                const groupDiscovered = enemies.filter((e) => e.entry?.encountered).length;
                const groupTotal = enemies.length;

                return (
                  <div key={group}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{groupInfo.icon}</span>
                      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                        {groupInfo.label}
                      </h3>
                      <span className="text-[10px] text-white/25 ml-auto">
                        {groupDiscovered}/{groupTotal}
                      </span>
                      <div className="flex-1 max-w-16 h-px bg-white/[0.06] ml-1" />
                    </div>

                    {/* Enemy cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {enemies.map(({ id, entry, def }) => {
                        if (entry?.encountered && def) {
                          return (
                            <DiscoveredCard
                              key={id}
                              enemy={def}
                              isDefeated={entry.defeated}
                              timesDefeated={entry.timesDefeated}
                            />
                          );
                        }
                        return <UndiscoveredCard key={id} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
              <p className="text-[10px] text-white/20 text-center">
                📖 Sconfiggi i nemici per sbloccare le loro informazioni nel bestiario.
                I boss sono segnati con la corona 👑.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
