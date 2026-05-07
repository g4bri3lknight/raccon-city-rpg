'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import {
  LOCATIONS, ITEMS, ENEMIES, NPCS_DATA, DATA_VERSION,
  getRoomDoors, findRoomLocation,
} from '@/game/data/loader';
import type { RoomDefinition, DoorDefinition, LootEntry } from '@/game/types';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  MapPin, X, ZoomIn, ZoomOut, RotateCw,
  ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import {
  resolvePreset, scaleCorridorPath, getConnectionPoints,
  DOOR_STATE_COLORS, DOOR_STATE_LABELS, DOOR_STATE_ORDER, DOOR_STATE_DESCRIPTIONS,
} from '@/lib/corridor-presets';
import {
  getRoomTypeInfo, getRoomTypeLabel, getRoomTypeBadgeClasses, getRoomTypeCardClasses,
} from '@/components/game/admin/config/roomTypes';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface RoomTooltipData {
  roomId: string;
  roomName: string;
  roomType: string;
  roomIcon: string | null;
  itemPool: Array<{ itemId: string; chance: number; quantity: number }>;
  enemyPool: string[];
  npcIds: string[];
  mouseX: number;
  mouseY: number;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const CANVAS_W = 2500;
const CANVAS_H = 1800;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;
const DEFAULT_ROOM_W = 140;
const DEFAULT_ROOM_H = 100;

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function getRoomDimensions(room: RoomDefinition): { w: number; h: number } {
  if (room.corridorPreset) {
    const variant = resolvePreset(room.corridorPreset);
    if (variant) {
      if ((room.mapWidth ?? 0) > 0 || (room.mapHeight ?? 0) > 0) {
        return {
          w: (room.mapWidth ?? 0) > 0 ? room.mapWidth! : DEFAULT_ROOM_W,
          h: (room.mapHeight ?? 0) > 0 ? room.mapHeight! : DEFAULT_ROOM_H,
        };
      }
      return { w: variant.defaultWidth, h: variant.defaultHeight };
    }
  }
  if ((room.mapWidth ?? 0) > 0 || (room.mapHeight ?? 0) > 0) {
    return {
      w: (room.mapWidth ?? 0) > 0 ? room.mapWidth! : DEFAULT_ROOM_W,
      h: (room.mapHeight ?? 0) > 0 ? room.mapHeight! : DEFAULT_ROOM_H,
    };
  }
  if (room.type === 'corridor') return { w: 180, h: 44 };
  if (room.type === 'boss_room') return { w: 160, h: 110 };
  return { w: DEFAULT_ROOM_H, h: DEFAULT_ROOM_H };
}

/** Get door position on a room's edge, accounting for corridor connection points */
function getDoorPosition(room: RoomDefinition, side: string): { x: number; y: number } | null {
  if (room.mapX == null || room.mapY == null) return null;
  const dim = getRoomDimensions(room);
  if (room.corridorPreset) {
    const pts = getConnectionPoints(room.corridorPreset, dim.w, dim.h);
    if (pts[side]) {
      return { x: room.mapX + pts[side].x, y: room.mapY + pts[side].y };
    }
  }
  switch (side) {
    case 'north': return { x: room.mapX + dim.w / 2, y: room.mapY };
    case 'south': return { x: room.mapX + dim.w / 2, y: room.mapY + dim.h };
    case 'east':  return { x: room.mapX + dim.w, y: room.mapY + dim.h / 2 };
    case 'west':  return { x: room.mapX, y: room.mapY + dim.h / 2 };
    default: return null;
  }
}

/** Look up a room name across all locations */
function findRoomName(roomId: string): string {
  const found = findRoomLocation(roomId);
  return found ? found.room.name : '???';
}

// ═══════════════════════════════════════════════════════════
// Door Connection Line Component
// ═══════════════════════════════════════════════════════════
function DoorConnectionLine({
  x1, y1, x2, y2, doorState, label, isCrossLocation,
}: {
  x1: number; y1: number; x2: number; y2: number;
  doorState: string;
  label: string;
  isCrossLocation?: boolean;
}) {
  const color = DOOR_STATE_COLORS[doorState] ?? DOOR_STATE_COLORS.open;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = Math.atan2(dy, dx);
  const arrowLen = 7;

  const arrowX1 = x2 - arrowLen * Math.cos(angle - 0.35);
  const arrowY1 = y2 - arrowLen * Math.sin(angle - 0.35);
  const arrowX2 = x2 - arrowLen * Math.cos(angle + 0.35);
  const arrowY2 = y2 - arrowLen * Math.sin(angle + 0.35);
  const revAngle = angle + Math.PI;
  const revArrowX1 = x1 - arrowLen * Math.cos(revAngle - 0.35);
  const revArrowY1 = y1 - arrowLen * Math.sin(revAngle - 0.35);
  const revArrowX2 = x1 - arrowLen * Math.cos(revAngle + 0.35);
  const revArrowY2 = y1 - arrowLen * Math.sin(revAngle + 0.35);

  const strokeOpacity = isCrossLocation ? 0.4 : 0.5;
  const dashArray = doorState === 'inaccessible' ? '6 4' : undefined;

  return (
    <g className="group/gconn">
      <path
        d={`M${x1},${y1} L${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeOpacity={strokeOpacity}
        strokeWidth={doorState === 'inaccessible' ? 1 : 1.5}
        strokeDasharray={dashArray}
      />
      <polygon
        points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={color}
        fillOpacity={strokeOpacity + 0.1}
      />
      <polygon
        points={`${x1},${y1} ${revArrowX1},${revArrowY1} ${revArrowX2},${revArrowY2}`}
        fill={color}
        fillOpacity={strokeOpacity + 0.1}
      />
      {/* Label on hover */}
      <circle cx={mx} cy={my} r={28} fill="transparent" className="cursor-pointer" />
      <g className="opacity-0 group-hover/gconn:opacity-100 transition-opacity duration-150 pointer-events-none">
        <rect
          x={mx - 50}
          y={my - 22}
          width={100}
          height={18}
          rx={4}
          fill="rgba(0,0,0,0.9)"
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={0.5}
        />
        <text
          x={mx}
          y={my - 10}
          textAnchor="middle"
          className="fill-white/70"
          style={{ fontSize: '9px', fontFamily: 'system-ui' }}
        >
          {isCrossLocation ? `\u2192 ${label}` : (label.length > 14 ? label.slice(0, 14) + '\u2026' : label)}
        </text>
      </g>
      {/* Door state dot at midpoint */}
      <circle
        cx={mx}
        cy={my}
        r={3}
        fill={color}
        fillOpacity={0.8}
        className="pointer-events-none"
      />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Card Component (view-only, no edit buttons)
// ═══════════════════════════════════════════════════════════
function GameRoomCard({
  room,
  isCurrent,
  isVisited,
  onHover,
  onHoverEnd,
}: {
  room: RoomDefinition;
  isCurrent: boolean;
  isVisited: boolean;
  onHover: (e: React.MouseEvent, roomId: string) => void;
  onHoverEnd: () => void;
}) {
  const typeInfo = getRoomTypeInfo(room.type);
  const dim = getRoomDimensions(room);
  const isCorridor = room.type === 'corridor';
  const corridorVariant = isCorridor && room.corridorPreset ? resolvePreset(room.corridorPreset) : null;
  const borderClasses = getRoomTypeCardClasses(typeInfo.color);

  // Corridor with SVG shape
  if (isCorridor && corridorVariant) {
    const scaledPath = scaleCorridorPath(room.corridorPreset!, dim.w, dim.h);
    return (
      <div
        data-room-card="true"
        className={`absolute select-none z-5 ${!isVisited ? 'opacity-30' : ''} ${isCurrent ? 'opacity-100' : ''}`}
        style={{
          left: room.mapX ?? 0,
          top: room.mapY ?? 0,
          width: dim.w,
          height: dim.h,
        }}
        onMouseEnter={(e) => onHover(e, room.id)}
        onMouseLeave={onHoverEnd}
      >
        {scaledPath && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            preserveAspectRatio="none"
          >
            <path
              d={scaledPath}
              fill={isCurrent ? '#1a1a2e' : '#0d0d14'}
              stroke={isCurrent
                ? '#ef4444'
                : typeInfo.color === 'red' ? 'rgba(239,68,68,0.5)'
                  : typeInfo.color === 'amber' ? 'rgba(245,158,11,0.5)'
                    : typeInfo.color === 'emerald' ? 'rgba(52,211,153,0.5)'
                      : typeInfo.color === 'violet' ? 'rgba(139,92,246,0.5)'
                        : 'rgba(148,163,184,0.45)'}
              strokeWidth={isCurrent ? 2.5 : 1.5}
            />
          </svg>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`font-bold truncate max-w-[90%] text-center leading-tight text-[10px] ${
            isCurrent ? 'text-red-400' : isVisited ? 'text-white/50' : 'text-white/20'
          }`}>
            {room.name}
          </span>
        </div>
        {isCurrent && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 pointer-events-none">
            <MapPin className="w-3 h-3 text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
          </div>
        )}
      </div>
    );
  }

  // Regular room card
  return (
    <div
      data-room-card="true"
      className={`
        absolute select-none border-2 border-solid
        ${borderClasses}
        ${isCurrent
          ? 'ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.35)] z-20'
          : isVisited
            ? 'z-10 hover:shadow-md hover:shadow-black/30'
            : 'z-5 opacity-30 hover:opacity-50 transition-opacity'
        }
      `}
      style={{
        left: room.mapX ?? 0,
        top: room.mapY ?? 0,
        width: dim.w,
        height: dim.h,
        backgroundColor: isCurrent ? '#1a1220' : '#0d0d14',
      }}
      onMouseEnter={(e) => onHover(e, room.id)}
      onMouseLeave={onHoverEnd}
    >
      <div className="relative flex flex-col h-full p-1.5 sm:p-2 gap-0.5">
        {/* Current room indicator */}
        {isCurrent && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-30">
            <MapPin className="w-3.5 h-3.5 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          </div>
        )}

        {/* Icon + Name */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-none shrink-0">{room.icon || typeInfo.icon}</span>
          <span className={`font-bold truncate min-w-0 leading-tight text-[11px] ${
            isCurrent ? 'text-red-300' : isVisited ? 'text-white/80' : 'text-white/40'
          }`}>
            {isVisited ? room.name : '???'}
          </span>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-[8px] px-1 py-px rounded-sm border font-medium ${getRoomTypeBadgeClasses(typeInfo.color)}`}>
            {getRoomTypeLabel(room.type)}
          </span>
          {isVisited && room.enemyPool.length > 0 && (
            <span className="text-[8px] px-1 py-px rounded-sm border border-red-700/30 text-red-400/70 bg-red-900/15 font-medium">
              👾 {room.enemyPool.length}
            </span>
          )}
        </div>

        {/* Visit status badge */}
        {!isVisited && (
          <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-[8px] text-gray-500">
            <EyeOff className="w-2.5 h-2.5" />
            <span>Inesplorata</span>
          </div>
        )}
        {isVisited && !isCurrent && (
          <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-[8px] text-green-500/50">
            <Eye className="w-2.5 h-2.5" />
            <span>Visitata</span>
          </div>
        )}
        {isCurrent && (
          <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-[8px] text-red-400 font-bold">
            <MapPin className="w-2.5 h-2.5" />
            <span>QUI</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function GameMap() {
  const mapOpen = useGameStore(s => s.mapOpen);
  const toggleMap = useGameStore(s => s.toggleMap);
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const currentRoomId = useGameStore(s => s.currentRoomId);
  const exploredRooms = useGameStore(s => s.exploredRooms);
  const dataVersion = useGameStore(s => s.dataVersion);

  // ── Derived from LOCATIONS (reactive via dataVersion + DATA_VERSION) ──
  // Using both store dataVersion and module-level DATA_VERSION as cache-bust dependencies
  const _cacheBust = dataVersion + DATA_VERSION;

  const locations = useMemo(() => {
    void _cacheBust;
    return Object.values(LOCATIONS).map(loc => ({
      id: loc.id,
      name: loc.name,
      shortName: loc.shortName ?? null,
      mapIcon: loc.mapIcon ?? null,
    }));
  }, [_cacheBust]);

  // Compute effective selected location: user selection, or player's current, or first available
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const firstLoc = Object.values(LOCATIONS)[0];
    if (!firstLoc) return '';
    return currentLocationId && LOCATIONS[currentLocationId] ? currentLocationId : firstLoc.id;
  });

  // Rooms for the selected location — derived from LOCATIONS
  const rooms = useMemo((): RoomDefinition[] => {
    void _cacheBust;
    const loc = LOCATIONS[selectedLocationId];
    return loc?.rooms ?? [];
  }, [selectedLocationId, _cacheBust]);

  // ── Lookup maps for tooltips (synchronous from game data) ──
  const itemsLookup = useMemo(() => {
    void _cacheBust;
    const map: Record<string, { name: string; icon: string | null }> = {};
    for (const item of Object.values(ITEMS)) {
      map[item.id] = { name: item.name, icon: item.icon };
    }
    return map;
  }, [_cacheBust]);

  const enemiesLookup = useMemo(() => {
    void _cacheBust;
    const map: Record<string, { name: string; icon: string | null }> = {};
    for (const enemy of Object.values(ENEMIES)) {
      map[enemy.id] = { name: enemy.name, icon: enemy.icon };
    }
    return map;
  }, [_cacheBust]);

  const npcsLookup = useMemo(() => {
    void _cacheBust;
    const map: Record<string, { name: string; icon: string | null }> = {};
    for (const npc of Object.values(NPCS_DATA)) {
      map[npc.id] = { name: npc.name, icon: npc.portrait || null };
    }
    return map;
  }, [_cacheBust]);

  // ── Tooltip ──
  const [tooltipData, setTooltipData] = useState<RoomTooltipData | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Zoom & Pan ──
  const [zoom, setZoom] = useState(0.7);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const panRef = useRef<{ startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derived: placed rooms with positions ──
  const placed = useMemo(
    () => rooms.filter(r => r.mapX != null && r.mapY != null),
    [rooms]
  );

  // ── Build door connection lines ──
  const connectionLines = useMemo(() => {
    const lines: {
      x1: number; y1: number; x2: number; y2: number;
      doorState: string; label: string; key: string; isCrossLocation: boolean;
    }[] = [];
    const seenPairs = new Set<string>();

    // Build a set of room IDs for this location
    const localRoomIds = new Set(rooms.map(r => r.id));

    for (const room of placed) {
      const doors = getRoomDoors(room.id);
      for (const door of doors) {
        const isFrom = door.fromRoomId === room.id;
        const targetId = isFrom ? door.toRoomId : door.fromRoomId;
        const pairKey = [room.id, targetId].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const fromRoom = isFrom ? room : rooms.find(r => r.id === targetId);
        const toRoom = isFrom ? rooms.find(r => r.id === targetId) : room;
        if (!fromRoom) continue;

        const fromSide = isFrom ? door.fromSide : door.toSide;
        const toSide = isFrom ? door.toSide : door.fromSide;

        // Cross-location check: if target room is not in our rooms list
        const isCrossLocation = !localRoomIds.has(targetId);

        const fromPos = getDoorPosition(fromRoom, fromSide);
        const toPos = isCrossLocation
          ? null
          : toRoom ? getDoorPosition(toRoom, toSide) : null;

        if (!fromPos) continue;

        if (isCrossLocation) {
          // Draw a stub line from the door outward to indicate cross-location
          const dim = getRoomDimensions(fromRoom);
          let endX = fromPos.x;
          let endY = fromPos.y;
          const stubLen = 40;
          switch (fromSide) {
            case 'north': endY = fromPos.y - stubLen; break;
            case 'south': endY = fromPos.y + stubLen; break;
            case 'east':  endX = fromPos.x + stubLen; break;
            case 'west':  endX = fromPos.x - stubLen; break;
          }
          const targetName = findRoomName(targetId);
          lines.push({
            x1: fromPos.x, y1: fromPos.y,
            x2: endX, y2: endY,
            doorState: door.state,
            label: targetName || 'Altra zona',
            key: `cross-${room.id}-${door.id}`,
            isCrossLocation: true,
          });
        } else if (toPos) {
          lines.push({
            x1: fromPos.x, y1: fromPos.y,
            x2: toPos.x, y2: toPos.y,
            doorState: door.state,
            label: toRoom!.name,
            key: `${room.id}-${targetId}`,
            isCrossLocation: false,
          });
        }
      }
    }
    return lines;
  }, [placed, rooms]);

  // ── Tooltip handlers ──
  const handleRoomHover = useCallback((e: React.MouseEvent, roomId: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      // Re-read rooms from LOCATIONS at callback time for fresh data
      const roomInfo = findRoomLocation(roomId);
      if (!roomInfo) return;
      const room = roomInfo.room;
      const isVisited = exploredRooms.includes(room.id);
      if (!isVisited) return; // Don't show tooltips for unvisited rooms
      const typeInfo = getRoomTypeInfo(room.type);
      const itemPool: Array<{ itemId: string; chance: number; quantity: number }> = Array.isArray(room.itemPool)
        ? room.itemPool.map((r: LootEntry) => ({
            itemId: r.itemId,
            chance: r.chance ?? 0,
            quantity: r.quantity ?? 1,
          }))
        : [];
      const hasContent = itemPool.length > 0 || room.enemyPool.length > 0 || room.npcIds.length > 0;
      if (!hasContent) return;
      setTooltipData({
        roomId: room.id,
        roomName: room.name,
        roomType: typeInfo.label,
        roomIcon: room.icon,
        itemPool,
        enemyPool: room.enemyPool,
        npcIds: room.npcIds,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    }, 150);
  }, [exploredRooms]);

  const handleRoomHoverEnd = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipData(null);
  }, []);

  // ── Zoom / Pan handlers ──
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((prev + delta) * 100) / 100)));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-room-card]')) return;
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      panRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      };
      setIsPanning(true);
    }
  }, [panX, panY]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startMouseX;
      const dy = e.clientY - panRef.current.startMouseY;
      setPanX(panRef.current.startPanX + dx / zoom);
      setPanY(panRef.current.startPanY + dy / zoom);
    }
  }, [zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomReset = useCallback(() => {
    if (containerRef.current && placed.length > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const room of placed) {
        if (room.mapX == null || room.mapY == null) continue;
        const dim = getRoomDimensions(room);
        minX = Math.min(minX, room.mapX);
        minY = Math.min(minY, room.mapY);
        maxX = Math.max(maxX, room.mapX + dim.w);
        maxY = Math.max(maxY, room.mapY + dim.h);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const newZoom = 0.7;
      setZoom(newZoom);
      setPanX(rect.width / (2 * newZoom) - centerX);
      setPanY(rect.height / (2 * newZoom) - centerY);
    } else {
      setZoom(0.7);
      setPanX(0);
      setPanY(0);
    }
  }, [placed]);

  // ── Auto-scroll to current room ──
  useEffect(() => {
    if (!mapOpen || !currentRoomId || !containerRef.current) return;
    const timer = setTimeout(() => {
      const room = rooms.find(r => r.id === currentRoomId);
      if (!room || room.mapX == null || room.mapY == null) return;
      const dim = getRoomDimensions(room);
      const rect = containerRef.current!.getBoundingClientRect();
      const centerX = room.mapX + dim.w / 2;
      const centerY = room.mapY + dim.h / 2;
      const newZoom = 0.9;
      setZoom(newZoom);
      setPanX(rect.width / (2 * newZoom) - centerX);
      setPanY(rect.height / (2 * newZoom) - centerY);
    }, 400);
    return () => clearTimeout(timer);
  }, [mapOpen, selectedLocationId, rooms, currentRoomId]);

  // ── Current selected location name ──
  const selectedLocationName = useMemo(
    () => locations.find(l => l.id === selectedLocationId)?.name ?? 'Mappa',
    [locations, selectedLocationId]
  );

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
            className="w-full max-w-5xl max-h-[94vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/[0.06] shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                  {selectedLocationName}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Location selector */}
                {locations.length > 0 && (
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className="w-[130px] sm:w-[180px] h-8 text-[10px] sm:text-xs bg-white/[0.04] border-white/[0.1] text-white/70">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/[0.12]">
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="text-xs text-white/80 focus:bg-white/[0.06] focus:text-white">
                          <span className="flex items-center gap-1.5">
                            <span className="shrink-0">{loc.mapIcon || '📍'}</span>
                            <span className="truncate">{loc.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMap}
                  className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ── Legend row ── */}
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 border-b border-white/[0.04] text-[9px] sm:text-[10px] overflow-x-auto inventory-scrollbar shrink-0">
              {/* Room status */}
              <span className="flex items-center gap-1 text-green-400/70 shrink-0">
                <Eye className="w-3 h-3" /> Visitata
              </span>
              <span className="flex items-center gap-1 text-gray-500 shrink-0">
                <EyeOff className="w-3 h-3" /> Inesplorata
              </span>
              <span className="flex items-center gap-1 text-red-400 shrink-0">
                <MapPin className="w-3 h-3" /> Posizione attuale
              </span>

              {/* Separator */}
              <span className="text-white/[0.06]">│</span>

              {/* Door state legend */}
              {DOOR_STATE_ORDER.map(state => (
                <span key={state} className="flex items-center gap-1 shrink-0" title={DOOR_STATE_DESCRIPTIONS[state]}>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/[0.1]"
                    style={{ backgroundColor: DOOR_STATE_COLORS[state] }}
                  />
                  <span className="text-white/40">{DOOR_STATE_LABELS[state]}</span>
                </span>
              ))}

              {/* Separator */}
              <span className="text-white/[0.06]">│</span>

              {/* Cross-location indicator */}
              <span className="flex items-center gap-1 text-amber-400/60 shrink-0">
                <ExternalLink className="w-3 h-3" /> Altra zona
              </span>
            </div>

            {/* ── Canvas area ── */}
            <div className="flex-1 relative min-h-0">
              {placed.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-white/30">Nessuna stanza posizionata per questa zona.</span>
                </div>
              ) : (
                <div
                  ref={containerRef}
                  className="absolute inset-0 overflow-hidden bg-[#0a0a12] inventory-scrollbar"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onWheel={handleWheel}
                  style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                >
                  {/* Transformed canvas layer */}
                  <div
                    className="absolute"
                    style={{
                      width: CANVAS_W,
                      height: CANVAS_H,
                      transform: `translate(${panX * zoom}px, ${panY * zoom}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  >
                    {/* Door connection lines SVG */}
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: CANVAS_W, height: CANVAS_H, zIndex: 6 }}
                    >
                      {connectionLines.map(line => (
                        <DoorConnectionLine
                          key={line.key}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          doorState={line.doorState}
                          label={line.label}
                          isCrossLocation={line.isCrossLocation}
                        />
                      ))}
                    </svg>

                    {/* Room cards */}
                    {placed.map(room => (
                      <GameRoomCard
                        key={room.id}
                        room={room}
                        isCurrent={currentRoomId === room.id}
                        isVisited={exploredRooms.includes(room.id)}
                        onHover={handleRoomHover}
                        onHoverEnd={handleRoomHoverEnd}
                      />
                    ))}
                  </div>

                  {/* Zoom controls — bottom left */}
                  <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-black/70 border border-white/[0.12] text-white/50 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
                      title="Riduci zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-white/30 min-w-[36px] text-center font-mono">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-black/70 border border-white/[0.12] text-white/50 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
                      title="Aumenta zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomReset}
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-black/70 border border-white/[0.12] text-white/50 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
                      title="Centra mappa"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Room Content Tooltip (fixed position) ── */}
          {tooltipData && (
            <div
              className="fixed z-[200] pointer-events-none"
              style={{
                left: Math.min(tooltipData.mouseX + 16, (typeof window !== 'undefined' ? window.innerWidth - 280 : tooltipData.mouseX + 16)),
                top: Math.min(tooltipData.mouseY - 10, (typeof window !== 'undefined' ? window.innerHeight - 300 : tooltipData.mouseY - 10)),
              }}
            >
              <div className="w-64 rounded-lg border border-white/[0.12] bg-[#111118]/95 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
                {/* Header */}
                <div className="px-2.5 py-1.5 border-b border-white/[0.08] bg-white/[0.03]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{tooltipData.roomIcon || '🏠'}</span>
                    <span className="text-[11px] font-bold text-white/80 truncate">{tooltipData.roomName}</span>
                    <span className="text-[9px] text-white/30 ml-auto shrink-0">{tooltipData.roomType}</span>
                  </div>
                </div>
                {/* Content */}
                <div className="p-2 space-y-2 max-h-56 overflow-y-auto inventory-scrollbar">
                  {/* Items */}
                  {tooltipData.itemPool.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider mb-1">
                        📦 Oggetti ({tooltipData.itemPool.length})
                      </div>
                      <div className="space-y-0.5">
                        {tooltipData.itemPool.map((item, i) => {
                          const lookup = itemsLookup[item.itemId];
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[10px]">
                              <span className="shrink-0">{lookup?.icon || '📦'}</span>
                              <span className="text-white/70 truncate flex-1">
                                {lookup?.name || item.itemId || '?'}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-white/30 shrink-0">&times;{item.quantity}</span>
                              )}
                              {item.chance > 0 && (
                                <span className="text-emerald-400/40 shrink-0 text-[9px]">{item.chance}%</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Enemies */}
                  {tooltipData.enemyPool.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider mb-1">
                        👾 Nemici ({tooltipData.enemyPool.length})
                      </div>
                      <div className="space-y-0.5">
                        {tooltipData.enemyPool.map((enemyId, i) => {
                          const lookup = enemiesLookup[enemyId];
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[10px]">
                              <span className="shrink-0">{lookup?.icon || '👾'}</span>
                              <span className="text-white/70 truncate">{lookup?.name || enemyId || '?'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* NPCs */}
                  {tooltipData.npcIds.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-amber-400/60 uppercase tracking-wider mb-1">
                        💬 NPC ({tooltipData.npcIds.length})
                      </div>
                      <div className="space-y-0.5">
                        {tooltipData.npcIds.map((npcId, i) => {
                          const lookup = npcsLookup[npcId];
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[10px]">
                              <span className="shrink-0">{lookup?.icon || '👤'}</span>
                              <span className="text-white/70 truncate">{lookup?.name || npcId || '?'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
