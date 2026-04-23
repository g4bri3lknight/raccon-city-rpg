'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS, ITEMS } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Lock, Unlock, CheckCircle2, Skull, X,
} from 'lucide-react';

// ── Grid column mapping: mapCol → CSS grid column ──
const COL_MAP: Record<number, number> = { [-1]: 1, 0: 2, 1: 3 };

// ── Types ──
interface MapNode {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  row: number;
  gridCol: number;
  gridRow: number;
  isBoss: boolean;
  dangerLevel: number;
}

interface ConnDef {
  from: string;
  to: string;
  keyId: string | null;
}

interface ConnLine {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  status: 'free' | 'locked_have_key' | 'locked_no_key' | 'unlocked';
  bidirectional: boolean;
}

// ── Helpers ──

/**
 * Find where the line from (fromCx, fromCy) to (toCx, toCy)
 * exits/enters a DOM rect. Returns the intersection point on the rect border.
 */
function getEdgePoint(
  fromCx: number, fromCy: number,
  toCx: number, toCy: number,
  rect: DOMRect,
  padding = 4,
): { x: number; y: number } {
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  if (dx === 0 && dy === 0) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

  const candidates: { t: number; x: number; y: number }[] = [];
  const rL = rect.left - padding;
  const rR = rect.left + rect.width + padding;
  const rT = rect.top - padding;
  const rB = rect.top + rect.height + padding;

  if (dx !== 0) {
    let t = (rL - fromCx) / dx;
    if (t > 0.001) { const y = fromCy + t * dy; if (y >= rT && y <= rB) candidates.push({ t, x: rL, y }); }
    t = (rR - fromCx) / dx;
    if (t > 0.001) { const y = fromCy + t * dy; if (y >= rT && y <= rB) candidates.push({ t, x: rR, y }); }
  }
  if (dy !== 0) {
    let t = (rT - fromCy) / dy;
    if (t > 0.001) { const x = fromCx + t * dx; if (x >= rL && x <= rR) candidates.push({ t, x, y: rT }); }
    t = (rB - fromCy) / dy;
    if (t > 0.001) { const x = fromCx + t * dx; if (x >= rL && x <= rR) candidates.push({ t, x, y: rB }); }
  }

  candidates.sort((a, b) => a.t - b.t);
  return candidates[0] || { x: toCx, y: toCy };
}

/**
 * Offset a point perpendicular to the line direction by `offset` pixels.
 * Used to draw parallel lines for bidirectional connections.
 */
function offsetPoint(
  fromX: number, fromY: number,
  toX: number, toY: number,
  pt: { x: number; y: number },
  offset: number,
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return pt;
  // Perpendicular unit vector
  const nx = -dy / len;
  const ny = dx / len;
  return { x: pt.x + nx * offset, y: pt.y + ny * offset };
}

// ── Data builders ──
function buildMapNodes(): MapNode[] {
  return Object.values(LOCATIONS)
    .filter(loc => loc.mapRow != null && loc.mapRow >= 0)
    .map(loc => ({
      id: loc.id,
      name: loc.name,
      shortName: loc.shortName || loc.name.split(' ').slice(0, 2).join(' '),
      icon: loc.mapIcon || '📍',
      row: loc.mapRow ?? 0,
      gridCol: COL_MAP[loc.mapCol ?? 0] ?? 2,
      gridRow: (loc.mapRow ?? 0) + 1,
      isBoss: loc.isBossArea || false,
      dangerLevel: loc.mapDanger ?? 0,
    }))
    .sort((a, b) => a.row - b.row || a.gridCol - b.gridCol);
}

/**
 * Build ALL directional connections (A→B and B→A are separate entries).
 * Deduplication is removed so we can draw directional arrows.
 */
function buildConnections(): ConnDef[] {
  const conns: ConnDef[] = [];
  const seen = new Set<string>();
  for (const [locId, loc] of Object.entries(LOCATIONS)) {
    for (const nextId of (loc.nextLocations || [])) {
      const key = `${locId}→${nextId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const locked = (loc.lockedLocations || []).find(l => l.locationId === nextId);
      conns.push({ from: locId, to: nextId, keyId: locked?.requiredItemId || null });
    }
  }
  return conns;
}

// ── Style constants ──
const nodeBorders = [
  'border-gray-600/40',
  'border-yellow-700/80',
  'border-orange-700/80',
  'border-red-700/80',
];
const nodeBgs = [
  'bg-[#13131d] text-white/70',
  'bg-[#1a170a] text-yellow-200',
  'bg-[#1a130a] text-orange-200',
  'bg-[#1a0e0e] text-red-200',
];
const nodeGlows = [
  '',
  'shadow-yellow-900/10',
  'shadow-orange-900/10',
  'shadow-red-900/20',
];
const dangerLabels = ['Sicura', 'Moderata', 'Pericolosa', 'Mortale'];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function GameMap() {
  const mapOpen = useGameStore(s => s.mapOpen);
  const toggleMap = useGameStore(s => s.toggleMap);
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const visitedLocations = useGameStore(s => s.visitedLocations);
  const unlockedPaths = useGameStore(s => s.unlockedPaths);
  const party = useGameStore(s => s.party);
  const dataVersion = useGameStore(s => s.dataVersion);

  const mapNodes = useMemo(() => buildMapNodes(), [dataVersion]);
  const connections = useMemo(() => buildConnections(), [dataVersion]);

  // ── Refs for SVG line calculation ──
  const gridRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement>>({});
  const [lines, setLines] = useState<ConnLine[]>([]);

  // ── Helpers ──
  const hasKey = (keyId: string) =>
    party.some(p => p.inventory.some(i => i.itemId === keyId));
  const isPathUnlocked = (fromId: string, toId: string) =>
    unlockedPaths.includes(`${fromId}→${toId}`);

  // ── Connection status helper ──
  const getConnStatus = (conn: ConnDef): ConnLine['status'] => {
    if (!conn.keyId) return 'free';
    if (isPathUnlocked(conn.from, conn.to)) return 'unlocked';
    if (hasKey(conn.keyId)) return 'locked_have_key';
    return 'locked_no_key';
  };

  // ── Calculate SVG line positions from DOM ──
  // Store latest values in refs so the observer callback stays fresh
  const connectionsRef = useRef(connections);
  const unlockedPathsRef = useRef(unlockedPaths);
  const partyRef = useRef(party);
  useEffect(() => { connectionsRef.current = connections; });
  useEffect(() => { unlockedPathsRef.current = unlockedPaths; });
  useEffect(() => { partyRef.current = party; });

  const recalcLines = () => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    if (gridRect.width === 0 || gridRect.height === 0) return;

    const _conns = connectionsRef.current;
    const _unlocked = unlockedPathsRef.current;
    const _party = partyRef.current;

    const _hasKey = (keyId: string) =>
      _party.some(p => p.inventory.some(i => i.itemId === keyId));
    const _isUnlocked = (from: string, to: string) =>
      _unlocked.includes(`${from}→${to}`);

    const result: ConnLine[] = [];
    // Track which pairs we've already processed (for bidirectional detection)
    const processedPairs = new Set<string>();

    for (const conn of _conns) {
      const fromEl = nodeRefs.current[conn.from];
      const toEl = nodeRefs.current[conn.to];
      if (!fromEl || !toEl) continue;

      const pairKey = [conn.from, conn.to].sort().join('|');
      const reverseExists = _conns.some(c => c.from === conn.to && c.to === conn.from);
      const isBidir = reverseExists;
      const isSecondOfPair = processedPairs.has(pairKey);

      // Skip the second direction of a bidirectional pair — we draw double-headed arrows instead
      if (isBidir && isSecondOfPair) continue;
      processedPairs.add(pairKey);

      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();

      const fromCx = fr.left + fr.width / 2;
      const fromCy = fr.top + fr.height / 2;
      const toCx = tr.left + tr.width / 2;
      const toCy = tr.top + tr.height / 2;

      // Edge-to-edge: exit source rect → enter target rect
      const startPt = getEdgePoint(fromCx, fromCy, toCx, toCy, fr);
      const endPt = getEdgePoint(fromCx, fromCy, toCx, toCy, tr);

      // Determine status (use the forward direction for status)
      let status: ConnLine['status'] = 'free';
      if (conn.keyId) {
        if (_isUnlocked(conn.from, conn.to)) status = 'unlocked';
        else if (_hasKey(conn.keyId)) status = 'locked_have_key';
        else status = 'locked_no_key';
      }
      // If no key on forward but key on reverse, use that status
      if (!conn.keyId && reverseExists) {
        const reverse = _conns.find(c => c.from === conn.to && c.to === conn.from);
        if (reverse?.keyId) {
          if (_isUnlocked(reverse.from, reverse.to)) status = 'unlocked';
          else if (_hasKey(reverse.keyId)) status = 'locked_have_key';
          else status = 'locked_no_key';
        }
      }

      // Convert to percentages
      const toPct = (pt: { x: number; y: number }) => ({
        x: ((pt.x - gridRect.left) / gridRect.width) * 100,
        y: ((pt.y - gridRect.top) / gridRect.height) * 100,
      });

      result.push({
        id: `${conn.from}→${conn.to}`,
        x1: toPct(startPt).x,
        y1: toPct(startPt).y,
        x2: toPct(endPt).x,
        y2: toPct(endPt).y,
        status,
        bidirectional: isBidir,
      });
    }
    setLines(result);
  };

  // Recalculate when relevant state changes
  useEffect(() => {
    const timer = setTimeout(recalcLines, 250);
    return () => clearTimeout(timer);
  }, [mapOpen, dataVersion, unlockedPaths, party]);

  // Recalculate on resize
  useEffect(() => {
    if (!gridRef.current) return;
    const ro = new ResizeObserver(() => recalcLines());
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Get outgoing connections for a node ──
  const getOutgoing = (nodeId: string) =>
    connections.filter(c => c.from === nodeId);

  // ── Arrow colors by status ──
  const getArrowColor = (status: ConnLine['status']) => {
    switch (status) {
      case 'free': return 'rgba(34,197,94,0.5)';
      case 'locked_have_key': return 'rgba(234,179,8,0.8)';
      case 'locked_no_key': return 'rgba(239,68,68,0.8)';
      case 'unlocked': return 'rgba(34,197,94,0.8)';
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <AnimatePresence>
      {mapOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 glass-overlay"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-4xl max-h-[94vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <h3 className="text-sm sm:text-lg font-bold text-white">
                  Mappa di Raccoon City
                </h3>
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

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 inventory-scrollbar">
              {/* Legend */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 text-[9px] sm:text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Visitata
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <MapPin className="w-3 h-3" /> Posizione attuale
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[2px] bg-green-700/50 inline-block rounded" />
                  <span className="text-gray-400">Aperta</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[2px] bg-yellow-500 inline-block rounded" style={{ animation: 're-line-blink-yellow 2.5s ease-in-out infinite' }} />
                  <span className="text-yellow-400">Porta (hai chiave)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[2px] bg-red-500 inline-block rounded" style={{ animation: 're-line-blink-red 2s ease-in-out infinite' }} />
                  <span className="text-red-400">Porta (chiave mancante)</span>
                </span>
              </div>

              {/* ── Map grid with SVG overlay ── */}
              <div ref={gridRef} className="relative pb-2">

                {/* SVG connection lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  <defs>
                    {/* Arrow markers for each status type — orient="auto-start-reverse" reverses on marker-start */}
                    <marker id="arrow-free" viewBox="0 0 10 10" refX="9" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="rgba(34,197,94,0.5)" />
                    </marker>
                    <marker id="arrow-unlocked" viewBox="0 0 10 10" refX="9" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="rgba(34,197,94,0.8)" />
                    </marker>
                    <marker id="arrow-locked-red" viewBox="0 0 10 10" refX="9" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="rgba(239,68,68,0.8)" />
                    </marker>
                    <marker id="arrow-locked-yellow" viewBox="0 0 10 10" refX="9" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="rgba(234,179,8,0.8)" />
                    </marker>

                    {/* Glow filters */}
                    <filter id="lock-glow-red" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="lock-glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {lines.map(line => {
                    const isLockedRed = line.status === 'locked_no_key';
                    const isLockedYellow = line.status === 'locked_have_key';
                    const isLocked = isLockedRed || isLockedYellow;
                    const isUnlocked = line.status === 'unlocked';

                    const strokeColor =
                      line.status === 'free'
                        ? 'rgba(34,197,94,0.3)'
                        : isLockedRed
                          ? 'rgba(239,68,68,0.7)'
                          : isLockedYellow
                            ? 'rgba(234,179,8,0.7)'
                            : 'rgba(34,197,94,0.6)';

                    const dashArray =
                      line.status === 'free'
                        ? '8 5'
                        : isLocked
                          ? '10 4'
                          : undefined;

                    const blinkStyle =
                      isLockedRed
                        ? { animation: 're-line-blink-red 2s ease-in-out infinite' }
                        : isLockedYellow
                          ? { animation: 're-line-blink-yellow 2.5s ease-in-out infinite' }
                          : undefined;

                    const markerId =
                      line.status === 'free' ? 'arrow-free'
                      : isLockedRed ? 'arrow-locked-red'
                      : isLockedYellow ? 'arrow-locked-yellow'
                      : 'arrow-unlocked';

                    return (
                      <g key={line.id}>
                        {/* Glow layer for locked lines */}
                        {isLockedRed && (
                          <line
                            x1={`${line.x1}%`} y1={`${line.y1}%`}
                            x2={`${line.x2}%`} y2={`${line.y2}%`}
                            stroke="rgba(239,68,68,0.25)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            filter="url(#lock-glow-red)"
                            style={{ animation: 're-line-blink-red 2s ease-in-out infinite' }}
                          />
                        )}
                        {isLockedYellow && (
                          <line
                            x1={`${line.x1}%`} y1={`${line.y1}%`}
                            x2={`${line.x2}%`} y2={`${line.y2}%`}
                            stroke="rgba(234,179,8,0.25)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            filter="url(#lock-glow-yellow)"
                            style={{ animation: 're-line-blink-yellow 2.5s ease-in-out infinite' }}
                          />
                        )}

                        {/* Main line — edge-to-edge with arrow markers */}
                        <line
                          x1={`${line.x1}%`} y1={`${line.y1}%`}
                          x2={`${line.x2}%`} y2={`${line.y2}%`}
                          stroke={strokeColor}
                          strokeWidth={isLocked ? 2.5 : isUnlocked ? 2 : 1.5}
                          strokeLinecap="round"
                          strokeDasharray={dashArray}
                          style={blinkStyle}
                          markerEnd={`url(#${markerId})`}
                          markerStart={line.bidirectional ? `url(#${markerId})` : undefined}
                        />

                        {/* Lock icon at midpoint for locked connections */}
                        {isLocked && (
                          <text
                            x={`${(line.x1 + line.x2) / 2}%`}
                            y={`${(line.y1 + line.y2) / 2}%`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="14"
                            style={{
                              animation: isLockedRed
                                ? 're-line-blink-red 2s ease-in-out infinite'
                                : 're-line-blink-yellow 2.5s ease-in-out infinite',
                              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))',
                            }}
                          >
                            🔒
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Grid of location nodes */}
                <div
                  className="grid gap-x-2 sm:gap-x-4 gap-y-5 sm:gap-y-7"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {mapNodes.map(node => {
                    const isCurrent = currentLocationId === node.id;
                    const isVisited = visitedLocations.includes(node.id);
                    const outgoing = getOutgoing(node.id);

                    // Check if node has any locked outgoing connections we can unlock
                    const hasKeyForLocked = outgoing.some(c => {
                      const s = getConnStatus(c);
                      return s === 'locked_have_key';
                    });

                    // Alignment based on column
                    const justifyClass =
                      node.gridCol === 1
                        ? 'justify-self-start'
                        : node.gridCol === 3
                          ? 'justify-self-end'
                          : 'justify-self-center';

                    return (
                      <div
                        key={node.id}
                        ref={el => { if (el) nodeRefs.current[node.id] = el; }}
                        className={`${justifyClass} relative z-10`}
                        style={{ gridColumn: node.gridCol, gridRow: node.gridRow }}
                      >
                        <motion.div
                          className={`
                            relative w-[100px] sm:w-[175px] rounded-lg border-2 p-1.5 sm:p-2.5 transition-all duration-300
                            ${nodeBorders[node.dangerLevel]}
                            ${nodeBgs[node.dangerLevel]}
                            ${nodeGlows[node.dangerLevel]}
                            ${isCurrent
                              ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-gray-950 shadow-[0_0_20px_rgba(239,68,68,0.35)] scale-[1.04]'
                              : ''
                            }
                            ${!isVisited ? 'opacity-90' : ''}
                            ${hasKeyForLocked && !isCurrent ? 'ring-1 ring-yellow-600/40' : ''}
                          `}
                          whileHover={{ scale: isCurrent ? 1.04 : 1.03 }}
                        >
                          {/* Status badge row */}
                          <div className="flex items-center justify-between mb-0.5 min-h-[14px]">
                            {isCurrent ? (
                              <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-red-400 font-bold">
                                <MapPin className="w-2.5 h-2.5" /> QUI
                              </span>
                            ) : isVisited ? (
                              <span className="text-[8px] sm:text-[9px] text-green-400/80">
                                <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />Visitata
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[9px] text-gray-500">Sconosciuta</span>
                            )}
                            {node.isBoss && (
                              <span className="text-[8px] sm:text-[9px] text-red-400 flex items-center gap-0.5">
                                <Skull className="w-3 h-3" /> Boss
                              </span>
                            )}
                          </div>

                          {/* Icon + Name */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span className="text-lg sm:text-2xl leading-none">{node.icon}</span>
                            <div className="min-w-0">
                              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight">
                                {node.shortName}
                              </div>
                              <div className="text-[7px] sm:text-[9px] opacity-50 truncate leading-tight hidden sm:block">
                                {node.name}
                              </div>
                            </div>
                          </div>

                          {/* Danger level bar */}
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex gap-px">
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
                            <span className="text-[7px] sm:text-[8px] opacity-50">
                              {dangerLabels[node.dangerLevel]}
                            </span>
                          </div>

                          {/* Outgoing connections */}
                          {outgoing.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1.5 pt-1.5 border-t border-white/[0.06]">
                              {outgoing.map((conn, ci) => {
                                const toNode = mapNodes.find(n => n.id === conn.to);
                                const status = getConnStatus(conn);
                                const isLocked = status === 'locked_have_key' || status === 'locked_no_key';

                                return (
                                  <div
                                    key={ci}
                                    className={`
                                      flex items-center gap-0.5 text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-sm border
                                      ${status === 'free'
                                        ? 'border-gray-700/40 text-gray-400 bg-white/[0.02]'
                                        : status === 'unlocked'
                                          ? 'border-green-800/40 text-green-400/70 bg-green-950/15'
                                          : status === 'locked_have_key'
                                            ? 'border-yellow-700/60 text-yellow-300 bg-yellow-950/25 re-door-yellow'
                                            : 'border-red-700/50 text-red-300/80 bg-red-950/25 re-door-red'
                                      }
                                    `}
                                  >
                                    <span className="shrink-0">{toNode?.icon || '?'}</span>
                                    <span className="truncate max-w-[35px] sm:max-w-[55px]">
                                      {toNode?.shortName || conn.to}
                                    </span>
                                    {status === 'locked_have_key' && (
                                      <Lock className="w-2 h-2 shrink-0 text-yellow-400" />
                                    )}
                                    {status === 'locked_no_key' && (
                                      <Lock className="w-2 h-2 shrink-0 text-red-400" />
                                    )}
                                    {status === 'unlocked' && (
                                      <Unlock className="w-2 h-2 shrink-0 text-green-500" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Key inventory summary ── */}
              <div className="mt-4 p-2 sm:p-3 rounded-lg glass-dark-inner">
                <div className="text-[9px] sm:text-xs uppercase tracking-wider text-white/40 mb-1.5">
                  Chiavi in possesso
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {connections
                    .filter(c => c.keyId)
                    .map(c => c.keyId!)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map(keyId => {
                      const keyDef = ITEMS[keyId];
                      const owned = hasKey(keyId);
                      const paths = connections.filter(c => c.keyId === keyId);
                      const allUnlocked = paths.every(c => isPathUnlocked(c.from, c.to));
                      return (
                        <div
                          key={keyId}
                          className={`flex items-center gap-1 text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border ${
                            allUnlocked
                              ? 'border-white/[0.04] bg-white/[0.02] text-white/30 line-through'
                              : owned
                                ? 'border-yellow-800/50 bg-yellow-950/20 text-yellow-300 re-door-yellow'
                                : 'border-white/[0.06] bg-white/[0.02] text-white/30'
                          }`}
                        >
                          <span>{keyDef?.icon || '🔑'}</span>
                          <span>
                            {keyDef?.name?.replace('Chiave ', '').replace('Tessera ', 'Tessera ') || keyId}
                          </span>
                          {owned && !allUnlocked && (
                            <Badge className="text-[7px] sm:text-[8px] px-1 py-0 bg-yellow-900/50 text-yellow-300 border-yellow-800/50">
                              {paths.filter(c => !isPathUnlocked(c.from, c.to)).length} porte
                            </Badge>
                          )}
                          {allUnlocked && <span className="text-[7px] sm:text-[8px] opacity-50">(usata)</span>}
                        </div>
                      );
                    })}
                  {connections.filter(c => c.keyId).length === 0 && (
                    <span className="text-[9px] sm:text-xs text-gray-500">
                      Nessuna chiave trovata
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
