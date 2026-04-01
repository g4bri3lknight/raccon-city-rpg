'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS } from '@/game/data/locations';
import { ITEMS } from '@/game/data/items';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Lock, Unlock, CheckCircle2, Skull, X,
} from 'lucide-react';

// ── Map layout: defines visual position of each location ──
interface MapNode {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  row: number;
  col: number; // 0 = center, -1 = left, 1 = right
  isBoss: boolean;
  dangerLevel: number; // 0-3 for visual color
}

const MAP_NODES: MapNode[] = [
  { id: 'city_outskirts', name: 'Periferia di Raccoon City', shortName: 'Periferia', icon: '🏙️', row: 0, col: 0, isBoss: false, dangerLevel: 0 },
  { id: 'rpd_station', name: 'Stazione di Polizia R.P.D.', shortName: 'R.P.D.', icon: '🏛️', row: 1, col: -1, isBoss: false, dangerLevel: 1 },
  { id: 'hospital_district', name: 'Ospedale di Raccoon City', shortName: 'Ospedale', icon: '🏥', row: 1, col: 1, isBoss: false, dangerLevel: 2 },
  { id: 'sewers', name: 'Fogne Sottostanti', shortName: 'Fogne', icon: '🌀', row: 2, col: -1, isBoss: false, dangerLevel: 2 },
  { id: 'laboratory_entrance', name: 'Laboratorio Umbrella', shortName: 'Lab Umbrella', icon: '⚗️', row: 3, col: 0, isBoss: false, dangerLevel: 3 },
  { id: 'clock_tower', name: "Torre dell'Orologio", shortName: 'Boss Finale', icon: '🗼', row: 4, col: 0, isBoss: true, dangerLevel: 3 },
];

// ── Connections: [fromId, toId, requiredKeyId | null] ──
const CONNECTIONS: { from: string; to: string; keyId: string | null }[] = [
  { from: 'city_outskirts', to: 'rpd_station', keyId: 'key_rpd' },
  { from: 'city_outskirts', to: 'hospital_district', keyId: null },
  { from: 'rpd_station', to: 'hospital_district', keyId: null },
  { from: 'rpd_station', to: 'sewers', keyId: 'key_sewers' },
  { from: 'hospital_district', to: 'laboratory_entrance', keyId: 'key_lab' },
  { from: 'sewers', to: 'laboratory_entrance', keyId: 'key_lab' },
  { from: 'laboratory_entrance', to: 'clock_tower', keyId: null },
];

const dangerColors = [
  'border-gray-600/40 bg-white/[0.04] text-white/70',    // 0 - safe
  'border-yellow-700 bg-yellow-950/30 text-yellow-200', // 1 - moderate
  'border-orange-700 bg-orange-950/30 text-orange-200', // 2 - dangerous
  'border-red-700 bg-red-950/30 text-red-200',         // 3 - very dangerous
];

const dangerGlows = [
  'shadow-none',
  'shadow-yellow-900/20',
  'shadow-orange-900/20',
  'shadow-red-900/30',
];

export default function GameMap() {
  const {
    mapOpen, toggleMap,
    currentLocationId,
    visitedLocations,
    unlockedPaths,
    party,
  } = useGameStore();

  // Check if player has a specific key
  const hasKey = (keyId: string) => party.some(p => p.inventory.some(i => i.itemId === keyId));
  // Check if a locked path has been traversed
  const isPathUnlocked = (fromId: string, toId: string) =>
    unlockedPaths.includes(`${fromId}→${toId}`);

  return (
    <AnimatePresence>
      {mapOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-2xl max-h-[90vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Mappa di Raccoon City</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMap}
                className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Map content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 inventory-scrollbar">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-[10px] sm:text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Visitata
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <MapPin className="w-3 h-3" /> Posizione attuale
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Lock className="w-3 h-3" /> Richiede chiave
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Unlock className="w-3 h-3" /> Aperta
                </span>
              </div>

              {/* Map grid */}
              <div className="relative flex flex-col items-center gap-1">
                {MAP_NODES.map((node, idx) => {
                  const isCurrent = currentLocationId === node.id;
                  const isVisited = visitedLocations.includes(node.id);
                  const nodeStyle = dangerColors[node.dangerLevel];
                  const glowStyle = dangerGlows[node.dangerLevel];

                  return (
                    <div key={node.id}>
                      {/* Draw connections TO this node */}
                      <div className="flex justify-center mb-1">
                        <div className="w-px h-4 sm:h-6" />
                      </div>

                      {/* Connection indicators from other nodes */}
                      {idx > 0 && (
                        <div className="flex justify-center mb-1 flex-wrap gap-1">
                          {CONNECTIONS
                            .filter(c => c.to === node.id)
                            .map((conn, ci) => {
                              const unlocked = conn.keyId
                                ? isPathUnlocked(conn.from, conn.to)
                                : true;
                              const hasRequiredKey = conn.keyId ? hasKey(conn.keyId) : true;
                              const fromNode = MAP_NODES.find(n => n.id === conn.from);
                              const isFromVisited = visitedLocations.includes(conn.from);

                              return (
                                <div
                                  key={ci}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] border ${
                                    unlocked
                                      ? 'border-green-800/50 text-green-400 bg-green-950/20'
                                      : hasRequiredKey
                                        ? 'border-yellow-800/50 text-yellow-400 bg-yellow-950/20'
                                        : 'border-gray-700/50 text-gray-500 bg-gray-900/30'
                                  }`}
                                >
                                  <span className="truncate max-w-[60px] sm:max-w-none">{fromNode?.shortName}</span>
                                  <span>→</span>
                                  {conn.keyId && (
                                    <span>
                                      {unlocked ? <Unlock className="w-2.5 h-2.5 inline" /> : <Lock className="w-2.5 h-2.5 inline" />}
                                      <span className="ml-0.5">{ITEMS[conn.keyId]?.name?.replace('Chiave ', '') || conn.keyId}</span>
                                    </span>
                                  )}
                                  {!conn.keyId && isFromVisited && (
                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                  )}
                                  {!conn.keyId && !isFromVisited && (
                                    <span className="opacity-50">libero</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Location node */}
                      <motion.div
                        className={`
                          relative w-48 sm:w-64 rounded-lg border-2 p-2.5 sm:p-3 transition-all duration-300
                          ${nodeStyle} ${glowStyle}
                          ${isCurrent ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-gray-950 scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}
                          ${isVisited && !isCurrent ? 'opacity-100' : !isVisited ? 'opacity-60' : ''}
                        `}
                        whileHover={{ scale: isCurrent ? 1.05 : 1.02 }}
                      >
                        {/* Current location indicator */}
                        {isCurrent && (
                          <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 shadow-lg shadow-red-900/50">
                            <MapPin className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {/* Visited badge */}
                        {isVisited && !isCurrent && (
                          <div className="absolute -top-1.5 -right-1.5 bg-green-700 rounded-full p-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-green-100" />
                          </div>
                        )}
                        {/* Boss badge */}
                        {node.isBoss && (
                          <div className="absolute -top-1.5 -left-1.5 bg-red-800 rounded-full p-0.5">
                            <Skull className="w-2.5 h-2.5 text-red-100" />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">{node.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold truncate">{node.shortName}</div>
                            <div className="text-[9px] sm:text-[10px] opacity-70 truncate hidden sm:block">{node.name}</div>
                          </div>
                        </div>

                        {/* Danger level bar */}
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex gap-0.5">
                            {[0, 1, 2, 3].map(lvl => (
                              <div
                                key={lvl}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  lvl <= node.dangerLevel
                                    ? lvl <= 1 ? 'bg-yellow-500' : lvl <= 2 ? 'bg-orange-500' : 'bg-red-500'
                                    : 'bg-gray-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[8px] sm:text-[9px] opacity-50">
                            {node.dangerLevel === 0 ? 'Sicura' : node.dangerLevel === 1 ? 'Moderata' : node.dangerLevel === 2 ? 'Pericolosa' : 'Mortale'}
                          </span>
                        </div>

                        {/* Connection indicators FROM this node */}
                        {CONNECTIONS.filter(c => c.from === node.id).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {CONNECTIONS
                              .filter(c => c.from === node.id)
                              .map((conn, ci) => {
                                const unlocked = conn.keyId
                                  ? isPathUnlocked(conn.from, conn.to)
                                  : true;
                                const hasRequiredKey = conn.keyId ? hasKey(conn.keyId) : true;
                                const toNode = MAP_NODES.find(n => n.id === conn.to);
                                const isToVisited = visitedLocations.includes(conn.to);

                                return (
                                  <Badge
                                    key={ci}
                                    variant="outline"
                                    className={`text-[8px] sm:text-[9px] px-1 py-0 ${
                                      unlocked
                                        ? 'border-green-800/50 text-green-400 bg-green-950/20'
                                        : hasRequiredKey
                                          ? 'border-yellow-800/50 text-yellow-400 bg-yellow-950/20'
                                          : 'border-gray-700/50 text-gray-500 bg-gray-900/30'
                                    }`}
                                  >
                                    {toNode?.icon} {toNode?.shortName}
                                    {conn.keyId && !unlocked && <Lock className="w-2.5 h-2.5 ml-0.5" />}
                                    {conn.keyId && unlocked && <Unlock className="w-2.5 h-2.5 ml-0.5" />}
                                  </Badge>
                                );
                              })}
                          </div>
                        )}
                      </motion.div>

                      {/* Down arrow connector */}
                      {idx < MAP_NODES.length - 1 && (
                        <div className="flex justify-center mt-1 mb-1">
                          <div className="w-px h-3 sm:h-5 bg-gradient-to-b from-gray-700 to-gray-800" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Key inventory summary */}
              <div className="mt-4 p-3 rounded-lg glass-dark-inner">
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-2">
                  Chiavi in possesso
                </div>
                <div className="flex flex-wrap gap-2">
                  {['key_rpd', 'key_sewers', 'key_lab'].map(keyId => {
                    const keyDef = ITEMS[keyId];
                    const owned = hasKey(keyId);
                    const paths = CONNECTIONS.filter(c => c.keyId === keyId);
                    const allUnlocked = paths.every(c => isPathUnlocked(c.from, c.to));
                    return (
                      <div
                        key={keyId}
                        className={`flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded border ${
                          allUnlocked
                            ? 'border-white/[0.04] bg-white/[0.02] text-white/30'
                            : owned
                              ? 'border-yellow-800/50 bg-yellow-950/20 text-yellow-300'
                              : 'border-white/[0.06] bg-white/[0.02] text-white/30'
                        }`}
                      >
                        <span>{keyDef?.icon || '🔑'}</span>
                        <span>{keyDef?.name?.replace('Chiave ', '').replace('Tessera ', 'Tessera ') || keyId}</span>
                        {owned && !allUnlocked && (
                          <Badge className="text-[8px] px-1 py-0 bg-yellow-900/50 text-yellow-300 border-yellow-800/50">
                            {paths.filter(c => !isPathUnlocked(c.from, c.to)).length} porte
                          </Badge>
                        )}
                        {allUnlocked && <span className="text-[8px] opacity-50">(usata)</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
