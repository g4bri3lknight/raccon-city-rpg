'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Save, RefreshCw, Loader2, Plus, Pencil, Trash2,
  ZoomIn, ZoomOut, Link2, Layers, Grid3x3, PanelRightClose, PanelRight,
  ArrowLeft, Eye, Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { ROOM_TYPES, getRoomTypeInfo, getRoomTypeLabel, getRoomTypeBadgeClasses, getRoomTypeCardClasses } from '@/components/game/admin/config/roomTypes';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface RoomEditorPanelProps {
  locationId: string;
  locationName: string;
  onBack?: () => void;
}

interface RoomData {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  mapRow: number | null;
  mapCol: number | null;
  mapX: number | null;
  mapY: number | null;
  mapWidth: number;
  mapHeight: number;
  nextRooms: string[];
  enemyPool: string[];
  itemPool: unknown[];
  searchChance: number | null;
  searchMax: number | null;
  npcIds: string[];
  storyEvent: unknown;
  ambientText: string[];
  sortOrder: number;
  description: string;
  locationId: string;
  orientation: string;
  backgroundImage: string;
}

type FullRoomData = Record<string, unknown>;

interface ConnectionInfo {
  id: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const CANVAS_W = 2500;
const CANVAS_H = 1800;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;
const SNAP_GRID = 20;

const DEFAULT_ROOM_W = 140;
const DEFAULT_ROOM_H = 100;
const DEFAULT_CORRIDOR_H_W = 180;
const DEFAULT_CORRIDOR_H_H = 50;
const DEFAULT_CORRIDOR_V_W = 50;
const DEFAULT_CORRIDOR_V_H = 120;

const ENDPOINT = '/api/admin/rooms';

// Form fields without position/map fields (managed via canvas)
const roomFormFields = FIELD_MAP.rooms.filter(
  f => !['mapCol', 'mapRow', 'sortOrder', 'mapX', 'mapY', 'mapWidth', 'mapHeight'].includes(f.key)
);

const ARRAY_TYPES = new Set([
  'tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs',
  'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices',
  'trade-inventory', 'effects-editor', 'item-box-defaults',
]);

const ROOM_NULLABLE_FIELDS = new Set(['searchChance', 'searchMax']);

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '')
    .replace(/_+/g, '_');
}

/** Get room card dimensions based on type, orientation, and overrides */
function getRoomDimensions(room: RoomData, rooms: RoomData[]): { w: number; h: number } {
  // Use explicit overrides if set
  if (room.mapWidth > 0 || room.mapHeight > 0) {
    return {
      w: room.mapWidth > 0 ? room.mapWidth : DEFAULT_ROOM_W,
      h: room.mapHeight > 0 ? room.mapHeight : DEFAULT_ROOM_H,
    };
  }

  if (room.type === 'corridor') {
    const orientation = resolveCorridorOrientation(room, rooms);
    return orientation === 'vertical'
      ? { w: DEFAULT_CORRIDOR_V_W, h: DEFAULT_CORRIDOR_V_H }
      : { w: DEFAULT_CORRIDOR_H_W, h: DEFAULT_CORRIDOR_H_H };
  }

  if (room.type === 'boss_room') {
    return { w: 160, h: 110 };
  }

  return { w: DEFAULT_ROOM_W, h: DEFAULT_ROOM_H };
}

/** Resolve corridor orientation from connections */
function resolveCorridorOrientation(room: RoomData, rooms: RoomData[]): 'horizontal' | 'vertical' {
  if (room.orientation === 'horizontal' || room.orientation === 'vertical') return room.orientation;

  // Auto-detect from connections using pixel positions
  let h = 0, v = 0;
  for (const nextId of room.nextRooms) {
    const other = rooms.find(r => r.id === nextId);
    if (!other || other.mapX == null || other.mapY == null) continue;
    if (room.mapX == null || room.mapY == null) continue;
    const dx = Math.abs(other.mapX - room.mapX);
    const dy = Math.abs(other.mapY - room.mapY);
    if (dx >= dy) h++;
    else v++;
  }
  // Also check reverse connections
  for (const other of rooms) {
    if (other.id === room.id || !other.nextRooms.includes(room.id)) continue;
    if (other.mapX == null || other.mapY == null || room.mapX == null || room.mapY == null) continue;
    const dx = Math.abs(other.mapX - room.mapX);
    const dy = Math.abs(other.mapY - room.mapY);
    if (dx >= dy) h++;
    else v++;
  }

  return v >= h ? 'vertical' : 'horizontal';
}

/** Get the center point of a room card */
function getRoomCenter(room: RoomData, rooms: RoomData[]): { cx: number; cy: number } {
  const dim = getRoomDimensions(room, rooms);
  return {
    cx: (room.mapX ?? 0) + dim.w / 2,
    cy: (room.mapY ?? 0) + dim.h / 2,
  };
}

// ═══════════════════════════════════════════════════════════
// Connection Line SVG Component
// ═══════════════════════════════════════════════════════════
function RoomConnectionLine({
  x1, y1, x2, y2, label,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const cpx = mx + (dy / dist) * dist * 0.1;
  const cpy = my - (dx / dist) * dist * 0.1;
  const angle = Math.atan2(dy, dx);
  const arrowLen = 8;
  const arrowX1 = x2 - arrowLen * Math.cos(angle - 0.35);
  const arrowY1 = y2 - arrowLen * Math.sin(angle - 0.35);
  const arrowX2 = x2 - arrowLen * Math.cos(angle + 0.35);
  const arrowY2 = y2 - arrowLen * Math.sin(angle + 0.35);
  const safeId = label.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <g className="group/rconn">
      <path
        d={`M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`}
        fill="none"
        stroke={'rgba(52,211,153,0.25)'}
        strokeWidth={1.5}
      />
      <polygon
        points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={'rgba(52,211,153,0.4)'}
      />
      <circle cx={mx} cy={my} r={30} fill="transparent" className="cursor-pointer" />
      <g className="opacity-0 group-hover/rconn:opacity-100 transition-opacity duration-150 pointer-events-none">
        <rect
          x={mx - 40}
          y={my - 20}
          width={80}
          height={16}
          rx={4}
          fill="rgba(0,0,0,0.85)"
          stroke={'rgba(52,211,153,0.3)'}
          strokeWidth={0.5}
        />
        <text
          x={mx}
          y={my - 10}
          textAnchor="middle"
          className="fill-white/70"
          style={{ fontSize: '9px', fontFamily: 'system-ui' }}
        >
          {label.length > 12 ? label.slice(0, 12) + '…' : label}
        </text>
      </g>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Card Component (absolutely positioned on canvas)
// ═══════════════════════════════════════════════════════════
function RoomCard({
  room,
  rooms,
  isSelected,
  isDragging,
  showLabels,
  connCount,
  onMouseDown,
  onSelect,
  onEdit,
  onDelete,
}: {
  room: RoomData;
  rooms: RoomData[];
  isSelected: boolean;
  isDragging: boolean;
  showLabels: boolean;
  connCount: number;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const typeInfo = getRoomTypeInfo(room.type);
  const dim = getRoomDimensions(room, rooms);
  const isCorridor = room.type === 'corridor';
  const isBoss = room.type === 'boss_room';
  const isSafe = room.type === 'safe_room';
  const orientation = isCorridor ? resolveCorridorOrientation(room, rooms) : null;
  const isHorizontal = orientation === 'horizontal';
  const isVertical = orientation === 'vertical';

  const borderClasses = getRoomTypeCardClasses(typeInfo.color);

  return (
    <div
      className={`
        absolute rounded-lg select-none transition-shadow duration-150
        ${isCorridor ? 'border-dashed' : 'border-solid'}
        ${borderClasses}
        ${isSelected
          ? 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/10'
          : 'hover:shadow-md hover:shadow-black/30'
        }
        ${isDragging ? 'z-50 shadow-xl shadow-black/50 scale-105 ring-2 ring-emerald-400/40' : 'z-10'}
        ${isBoss ? 'shadow-red-900/20 shadow-lg' : ''}
        ${isSafe ? 'shadow-emerald-900/20' : ''}
      `}
      style={{
        left: room.mapX ?? 0,
        top: room.mapY ?? 0,
        width: dim.w,
        height: dim.h,
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onMouseDown(e, room.id);
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect(room.id);
      }}
    >
      {/* Background image preview strip */}
      {room.backgroundImage && !isCorridor && (
        <div className="absolute inset-0 rounded-lg overflow-hidden opacity-20">
          <img
            src={room.backgroundImage}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />
        </div>
      )}

      <div className={`relative flex ${isCorridor ? (isHorizontal ? 'flex-row items-center' : 'flex-col items-center justify-center') : 'flex-col'} h-full p-2 gap-0.5`}>
        {/* Icon + Name */}
        <div className={`flex items-center gap-1 min-w-0 ${isCorridor && isHorizontal ? 'flex-1' : ''}`}>
          <span className="text-sm leading-none shrink-0">{room.icon || typeInfo.icon}</span>
          <span className={`font-bold text-white/80 truncate min-w-0 leading-tight ${
            isCorridor ? (isHorizontal ? 'text-[10px] flex-1' : 'text-[10px] text-center') : 'text-[11px]'
          }`}>
            {room.name}
          </span>
        </div>

        {/* Type badge + info badges */}
        {(!isCorridor || isVertical) && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`text-[8px] px-1 py-px rounded-sm border font-medium ${getRoomTypeBadgeClasses(typeInfo.color)}`}>
              {getRoomTypeLabel(room.type)}
            </span>
            {room.enemyPool.length > 0 && (
              <span className="text-[8px] px-1 py-px rounded-sm border border-red-700/30 text-red-400/70 bg-red-900/15 font-medium">
                👾 {room.enemyPool.length}
              </span>
            )}
            {showLabels && connCount > 0 && (
              <span className="text-[8px] px-1 py-px rounded-sm bg-white/[0.05] text-white/35 border border-white/[0.08]">
                🔗 {connCount}
              </span>
            )}
          </div>
        )}

        {/* Horizontal corridor: badge inline */}
        {isCorridor && isHorizontal && (
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[8px] px-1 py-px rounded-sm border font-medium ${getRoomTypeBadgeClasses(typeInfo.color)}`}>
              {getRoomTypeLabel(room.type)}
            </span>
            {room.enemyPool.length > 0 && (
              <span className="text-[7px] px-1 py-px rounded-sm border border-red-700/30 text-red-400/60 bg-red-900/10">
                👾{room.enemyPool.length}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex items-center gap-1 ${isCorridor ? (isHorizontal ? 'shrink-0 ml-auto' : 'mt-auto') : 'mt-auto'} pt-0.5`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(room.id); }}
            className="flex items-center gap-0.5 text-[9px] font-medium text-cyan-400/60 hover:text-cyan-300 bg-black/40 rounded px-1.5 py-0.5 transition-colors border border-cyan-500/10 hover:border-cyan-500/25"
            title="Modifica stanza"
          >
            <Pencil className="w-2.5 h-2.5" />
            {!isCorridor && <span>Modifica</span>}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
            className="flex items-center gap-0.5 text-[9px] font-medium text-red-400/50 hover:text-red-300 bg-black/40 rounded px-1.5 py-0.5 transition-colors border border-red-500/10 hover:border-red-500/25"
            title="Elimina stanza"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component — Room Editor Panel
// ═══════════════════════════════════════════════════════════
export default function RoomEditorPanel({ locationId, locationName, onBack }: RoomEditorPanelProps) {
  // ── State ──
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [fullData, setFullData] = useState<Record<string, FullRoomData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Canvas controls
  const [zoom, setZoom] = useState(0.7);
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);

  // Drag state (mouse-based)
  const dragRef = useRef<{
    roomId: string;
    startMouseX: number;
    startMouseY: number;
    startRoomX: number;
    startRoomY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Pan state
  const panRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const spaceRef = useRef(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Dialog
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const dialogOpen = creating || editingId !== null;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Status message helper ──
  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  // ── Fetch rooms ──
  const fetchRooms = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await adminFetch(`${ENDPOINT}?locationId=${encodeURIComponent(locationId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      const rms: RoomData[] = data.map(d => ({
        id: String(d.id),
        name: String(d.name ?? ''),
        type: String(d.type ?? 'normal'),
        icon: d.icon ? String(d.icon) : null,
        mapRow: d.mapRow != null ? Number(d.mapRow) : null,
        mapCol: d.mapCol != null ? Number(d.mapCol) : null,
        mapX: d.mapX != null ? Number(d.mapX) : null,
        mapY: d.mapY != null ? Number(d.mapY) : null,
        mapWidth: typeof d.mapWidth === 'number' ? d.mapWidth : 0,
        mapHeight: typeof d.mapHeight === 'number' ? d.mapHeight : 0,
        nextRooms: (() => { try { return typeof d.nextRooms === 'string' ? JSON.parse(d.nextRooms) : (d.nextRooms as string[] ?? []); } catch { return []; } })(),
        enemyPool: (() => { try { return typeof d.enemyPool === 'string' ? JSON.parse(d.enemyPool) : (d.enemyPool as string[] ?? []); } catch { return []; } })(),
        itemPool: (() => { try { return typeof d.itemPool === 'string' ? JSON.parse(d.itemPool) : (d.itemPool ?? []); } catch { return []; } })(),
        searchChance: d.searchChance != null && d.searchChance !== '' ? Number(d.searchChance) : null,
        searchMax: d.searchMax != null && d.searchMax !== '' ? Number(d.searchMax) : null,
        npcIds: (() => { try { return typeof d.npcIds === 'string' ? JSON.parse(d.npcIds) : (d.npcIds as string[] ?? []); } catch { return []; } })(),
        storyEvent: (() => { try { return typeof d.storyEvent === 'string' ? JSON.parse(d.storyEvent) : (d.storyEvent ?? null); } catch { return null; } })(),
        ambientText: (() => { try { return typeof d.ambientText === 'string' ? JSON.parse(d.ambientText) : (d.ambientText as string[] ?? []); } catch { return []; } })(),
        sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 0,
        description: String(d.description ?? ''),
        locationId: String(d.locationId ?? ''),
        orientation: String(d.orientation ?? 'auto'),
        backgroundImage: String(d.backgroundImage ?? ''),
      }));
      setRooms(rms);
      const fd: Record<string, FullRoomData> = {};
      for (const d of data) {
        fd[String(d.id)] = { ...d };
      }
      setFullData(fd);
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId, showStatus]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── Derived data ──
  const placed = useMemo(
    () => rooms.filter(r => r.mapX != null && r.mapY != null),
    [rooms]
  );
  const unplaced = useMemo(
    () => rooms.filter(r => r.mapX == null || r.mapY == null),
    [rooms]
  );

  // ── Connections helper ──
  const getConnections = useCallback((room: RoomData): ConnectionInfo[] => {
    const result: ConnectionInfo[] = [];
    const seen = new Set<string>();
    for (const nextId of room.nextRooms) {
      if (seen.has(nextId)) continue;
      seen.add(nextId);
      const nextRoom = rooms.find(r => r.id === nextId);
      if (!nextRoom) continue;
      result.push({ id: nextId, name: nextRoom.name });
    }
    for (const other of rooms) {
      if (other.id === room.id) continue;
      if (other.nextRooms.includes(room.id) && !seen.has(other.id)) {
        seen.add(other.id);
        result.push({ id: other.id, name: other.name });
      }
    }
    return result;
  }, [rooms]);

  // ── Connection count cache ──
  const connCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const room of rooms) {
      map[room.id] = getConnections(room).length;
    }
    return map;
  }, [rooms, getConnections]);

  // ── Build connection lines for SVG ──
  const connectionLines = useMemo(() => {
    if (!showConnections) return [];
    const lines: {
      x1: number; y1: number; x2: number; y2: number;
      label: string; key: string;
    }[] = [];
    const seenPairs = new Set<string>();
    for (const room of placed) {
      const conns = getConnections(room);
      for (const conn of conns) {
        const target = rooms.find(r => r.id === conn.id);
        if (!target || target.mapX == null || target.mapY == null) continue;
        const pairKey = [room.id, target.id].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        const from = getRoomCenter(room, rooms);
        const to = getRoomCenter(target, rooms);
        lines.push({
          x1: from.cx,
          y1: from.cy,
          x2: to.cx,
          y2: to.cy,
          label: conn.name,
          key: pairKey,
        });
      }
    }
    return lines;
  }, [placed, rooms, showConnections, getConnections]);

  // ── Auto-position unplaced rooms in grid pattern ──
  const autoPositionAll = useCallback(() => {
    const cols = 4;
    const startX = 80;
    const startY = 80;
    const spacingX = DEFAULT_ROOM_W + 40;
    const spacingY = DEFAULT_ROOM_H + 40;

    const updates: Record<string, { mapX: number; mapY: number }> = {};
    unplaced.forEach((room, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      updates[room.id] = {
        mapX: startX + col * spacingX,
        mapY: startY + row * spacingY,
      };
    });

    setRooms(prev =>
      prev.map(r => {
        const u = updates[r.id];
        if (!u) return r;
        return { ...r, mapX: u.mapX, mapY: u.mapY };
      })
    );
  }, [unplaced]);

  const autoPositionOne = useCallback((roomId: string) => {
    const existingPositions = placed.map(r => ({ x: r.mapX!, y: r.mapY! }));
    let targetX = 80;
    let targetY = 80;
    const spacingX = DEFAULT_ROOM_W + 40;
    const spacingY = DEFAULT_ROOM_H + 40;
    const cols = 4;

    let slot = 0;
    while (true) {
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const px = 80 + col * spacingX;
      const py = 80 + row * spacingY;
      const occupied = existingPositions.some(p =>
        Math.abs(p.x - px) < 10 && Math.abs(p.y - py) < 10
      );
      if (!occupied) {
        targetX = px;
        targetY = py;
        break;
      }
      slot++;
      if (slot > 200) break;
    }

    setRooms(prev =>
      prev.map(r =>
        r.id === roomId ? { ...r, mapX: targetX, mapY: targetY } : r
      )
    );
  }, [placed]);

  // ── Save positions (batch, debounced after drag) ──
  const savePositions = useCallback(async (roomsToSave: RoomData[]) => {
    const positions = roomsToSave.map(r => ({
      id: r.id,
      mapX: r.mapX,
      mapY: r.mapY,
      mapRow: r.mapRow,
      mapCol: r.mapCol,
      mapWidth: r.mapWidth,
      mapHeight: r.mapHeight,
    }));
    try {
      const res = await adminFetch('/api/admin/rooms/batch-positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Salvate ${positions.length} posizioni!`, 'success');
    } catch (err) {
      showStatus(`Errore salvataggio: ${err}`, 'error');
      console.error('[RoomEditorPanel] Save error:', err);
    }
  }, [showStatus]);

  const debouncedSave = useCallback((roomId: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    saveTimeoutRef.current = setTimeout(() => {
      savePositions([room]);
    }, 600);
  }, [rooms, savePositions]);

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    await savePositions(rooms);
    setSaving(false);
  }, [rooms, savePositions]);

  // ── Mouse drag on canvas ──
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault();
      panRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      };
      return;
    }
    if (e.button === 0 && (e.target as HTMLElement).dataset.canvas === 'true') {
      setSelectedRoomId(null);
    }
  }, [panX, panY]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startMouseX;
      const dy = e.clientY - panRef.current.startMouseY;
      setPanX(panRef.current.startPanX + dx / zoom);
      setPanY(panRef.current.startPanY + dy / zoom);
      return;
    }

    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startMouseX) / zoom;
      const dy = (e.clientY - dragRef.current.startMouseY) / zoom;
      let newX = dragRef.current.startRoomX + dx;
      let newY = dragRef.current.startRoomY + dy;

      if (snapToGrid) {
        newX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
        newY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
      }

      newX = Math.max(0, Math.min(CANVAS_W - DEFAULT_ROOM_W, newX));
      newY = Math.max(0, Math.min(CANVAS_H - DEFAULT_ROOM_H, newY));

      setRooms(prev =>
        prev.map(r =>
          r.id === dragRef.current!.roomId ? { ...r, mapX: newX, mapY: newY } : r
        )
      );
    }
  }, [zoom, snapToGrid]);

  const handleCanvasMouseUp = useCallback(() => {
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    if (dragRef.current) {
      debouncedSave(dragRef.current.roomId);
      setDraggingId(null);
      dragRef.current = null;
    }
  }, [debouncedSave]);

  const handleCardMouseDown = useCallback((e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.mapX == null || room.mapY == null) return;

    dragRef.current = {
      roomId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startRoomX: room.mapX,
      startRoomY: room.mapY,
    };
    setDraggingId(roomId);
    setSelectedRoomId(roomId);
  }, [rooms]);

  // ── Zoom controls ──
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
      setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((prev + delta) * 100) / 100)));
    } else {
      setPanX(prev => prev - e.deltaX / zoom);
      setPanY(prev => prev - e.deltaY / zoom);
    }
  }, [zoom]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100));
  }, []);
  const handleZoomReset = useCallback(() => {
    setZoom(0.7);
    setPanX(50);
    setPanY(50);
  }, []);

  // ── Keyboard (Space for pan) ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        spaceRef.current = true;
      }
    };
    const onUp = () => { spaceRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // ── CRUD ──
  const processFormData = (formData: Record<string, unknown>) => {
    const processed = { ...formData };
    for (const f of roomFormFields) {
      if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
        processed[f.key] = Number(processed[f.key]);
      }
      if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      if (f.type === 'status-apply' && processed[f.key] != null && typeof processed[f.key] === 'object') {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      if (f.type === 'status-cured' && Array.isArray(processed[f.key])) {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      if (processed[f.key] === '' || processed[f.key] === undefined) {
        if (ROOM_NULLABLE_FIELDS.has(f.key)) {
          processed[f.key] = null;
        } else {
          delete processed[f.key];
        }
      }
    }
    return processed;
  };

  const handleCreate = async (formData: Record<string, unknown>) => {
    setDialogSaving(true);
    try {
      const processed = processFormData(formData);
      if (!processed.id || String(processed.id).trim() === '') {
        const name = String(processed.name ?? 'unnamed');
        processed.id = `${locationId}_${slugify(name)}`;
      }
      processed.locationId = locationId;
      const res = await adminFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Stanza creata con successo!', 'success');
      setCreating(false);
      fetchRooms();
    } catch (err) {
      showStatus(`Errore creazione: ${err}`, 'error');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    setDialogSaving(true);
    try {
      const processed = processFormData(formData);
      if (editingId && !processed.id) processed.id = editingId;
      const res = await adminFetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Stanza aggiornata con successo!', 'success');
      setEditingId(null);
      fetchRooms();
    } catch (err) {
      showStatus(`Errore aggiornamento: ${err}`, 'error');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (!confirm(`Eliminare la stanza "${room?.name ?? id}"?`)) return;
    try {
      const res = await adminFetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Stanza eliminata!', 'success');
      if (selectedRoomId === id) setSelectedRoomId(null);
      fetchRooms();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  // ── Dialog data ──
  const editingData = editingId
    ? (() => {
        const raw = { ...(fullData[editingId] ?? {}) };
        for (const key of Object.keys(raw)) {
          if (typeof raw[key] === 'string') {
            try {
              const parsed = JSON.parse(raw[key] as string);
              if (typeof parsed === 'object' && parsed !== null) {
                raw[key] = parsed;
              }
            } catch { /* not JSON */ }
          }
        }
        return raw;
      })()
    : {};

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  // ── Center canvas on load ──
  useEffect(() => {
    if (loading || placed.length === 0) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const room of placed) {
        if (room.mapX == null || room.mapY == null) continue;
        const dim = getRoomDimensions(room, rooms);
        minX = Math.min(minX, room.mapX);
        minY = Math.min(minY, room.mapY);
        maxX = Math.max(maxX, room.mapX + dim.w);
        maxY = Math.max(maxY, room.mapY + dim.h);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setPanX(-(centerX * zoom - rect.width / (2 * zoom)));
      setPanY(-(centerY * zoom - rect.height / (2 * zoom)));
    }
  }, [loading]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
        <span className="ml-2 text-sm text-white/30">Caricamento stanze...</span>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <React.Fragment>
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d14]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Torna alla mappa</span>
                </button>
              )}
              <div>
                <h2 className="text-sm font-bold text-white/90">
                  🏠 Stanze — {locationName}
                </h2>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Trascina per posizionare. Ctrl+scroll per zoom.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Toggle: Connections */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConnections(!showConnections)}
                className={`text-xs gap-1.5 h-7 ${showConnections ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi collegamenti"
              >
                <Link2 className="w-3 h-3" />
                <span className="hidden sm:inline">Collegamenti</span>
              </Button>
              {/* Toggle: Labels */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLabels(!showLabels)}
                className={`text-xs gap-1.5 h-7 ${showLabels ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi etichette"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Etichette</span>
              </Button>
              {/* Toggle: Snap to Grid */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`text-xs gap-1.5 h-7 ${snapToGrid ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Snap alla griglia"
              >
                <Grid3x3 className="w-3 h-3" />
                <span className="hidden sm:inline">Snap</span>
              </Button>

              <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-md border border-white/[0.08] px-0.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 text-white/40 hover:text-white/70 transition-colors"
                  title="Riduci zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-1.5 py-1 text-[10px] text-white/50 hover:text-white/70 transition-colors font-mono min-w-[40px] text-center"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 text-white/40 hover:text-white/70 transition-colors"
                  title="Aumenta zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

              {/* Sidebar toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`text-xs gap-1.5 h-7 ${sidebarOpen ? 'text-purple-300 bg-purple-500/10 border border-purple-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi pannello laterale"
              >
                {sidebarOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRight className="w-3 h-3" />}
              </Button>

              {/* Refresh */}
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchRooms}
                className="text-xs gap-1.5 h-7 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              {/* Add Room */}
              <Button
                size="sm"
                onClick={() => { setCreating(true); setEditingId(null); }}
                className="text-xs gap-1.5 h-7 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Aggiungi Stanza</span>
              </Button>
            </div>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div className={`mt-1.5 px-3 py-1 text-[11px] rounded-md ${
              statusMsg.type === 'success' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
            }`}>
              {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}
        </div>

        {/* ── Content area: Canvas + Sidebar ── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ── Canvas ── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative bg-[#0a0a12] admin-scrollbar"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
            style={{ cursor: spaceRef.current ? 'grab' : 'default' }}
          >
            {/* Dot grid background + transform layer */}
            <div
              data-canvas="true"
              className="absolute origin-top-left"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0',
              }}
            >
              {/* SVG connection lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ zIndex: 1 }}
              >
                {connectionLines.map(line => (
                  <RoomConnectionLine
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    label={line.label}
                  />
                ))}
              </svg>

              {/* Room cards */}
              {placed.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  rooms={rooms}
                  isSelected={selectedRoomId === room.id}
                  isDragging={draggingId === room.id}
                  showLabels={showLabels}
                  connCount={connCountMap[room.id] ?? 0}
                  onMouseDown={handleCardMouseDown}
                  onSelect={setSelectedRoomId}
                  onEdit={(id) => { setEditingId(id); setCreating(false); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Empty state */}
            {rooms.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <span className="text-4xl mb-3">🏚️</span>
                <span className="text-sm">Nessuna stanza trovata</span>
                <span className="text-xs mt-1">Clicca &quot;Aggiungi Stanza&quot; per iniziare</span>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          {sidebarOpen && (
            <div className="shrink-0 w-[260px] border-l border-white/[0.06] bg-[#0c0c16] overflow-y-auto admin-scrollbar hidden sm:flex flex-col">
              {/* Unplaced rooms */}
              <div className="p-3 border-b border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                    Non posizionate ({unplaced.length})
                  </h3>
                  {unplaced.length > 0 && (
                    <button
                      type="button"
                      onClick={autoPositionAll}
                      className="text-[9px] font-medium text-emerald-400/70 hover:text-emerald-300 bg-emerald-600/10 rounded px-2 py-0.5 transition-colors border border-emerald-500/15 hover:border-emerald-500/30"
                      title="Posiziona tutte automaticamente"
                    >
                      Auto-tutte
                    </button>
                  )}
                </div>
                {unplaced.length === 0 ? (
                  <p className="text-[11px] text-white/15 italic py-2">
                    Tutte le stanze sono posizionate
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto admin-scrollbar">
                    {unplaced.map(room => {
                      const typeInfo = getRoomTypeInfo(room.type);
                      return (
                        <div
                          key={room.id}
                          className="group p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                          onDoubleClick={() => autoPositionOne(room.id)}
                          title="Doppio clic per posizionare automaticamente"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm shrink-0">{room.icon || typeInfo.icon}</span>
                            <span className="text-[11px] text-white/70 truncate min-w-0 flex-1 font-medium">
                              {room.name}
                            </span>
                            <span className={`text-[8px] px-1 py-px rounded-sm border font-medium shrink-0 ${getRoomTypeBadgeClasses(typeInfo.color)}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 pl-5">
                            {connCountMap[room.id] > 0 && (
                              <span className="text-[8px] px-1 py-px rounded-sm bg-white/[0.04] text-white/30 border border-white/[0.06]">
                                🔗 {connCountMap[room.id]}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); autoPositionOne(room.id); }}
                              className="text-[8px] text-emerald-400/60 hover:text-emerald-300 ml-auto transition-colors"
                              title="Posiziona sulla mappa"
                            >
                              <Eye className="w-2.5 h-2.5 inline mr-0.5" />
                              Mappa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Room type legend */}
              <div className="p-3 border-b border-white/[0.04]">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  Legenda Tipi
                </h3>
                <div className="space-y-1">
                  {ROOM_TYPES.map(rt => (
                    <div key={rt.value} className="flex items-center gap-2 text-[11px] text-white/30">
                      <span className={`w-4 h-3 rounded-sm border ${getRoomTypeCardClasses(rt.color)}`} />
                      <span className="text-base leading-none">{rt.icon}</span>
                      <span className="flex-1 truncate">{rt.label}</span>
                      {rooms.filter(r => r.type === rt.value).length > 0 && (
                        <span className="text-[9px] text-white/20">
                          {rooms.filter(r => r.type === rt.value).length}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls help */}
              <div className="p-3 mt-auto">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  Controlli
                </h3>
                <div className="text-[10px] text-white/20 space-y-1.5">
                  <p>🖱️ <span className="text-white/30">Trascina</span> — sposta stanza</p>
                  <p>🖐️ <span className="text-white/30">Middle-click</span> — sposta canvas</p>
                  <p>⌨️ <span className="text-white/30">Space+drag</span> — sposta canvas</p>
                  <p>🔍 <span className="text-white/30">Ctrl+scroll</span> — zoom</p>
                  <p>🖱️ <span className="text-white/30">Scroll</span> — sposta canvas</p>
                  <p>📋 <span className="text-white/30">Doppio clic</span> — posiziona stanza</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 px-3 sm:px-4 py-2.5 border-t border-white/[0.06] bg-black/95 backdrop-blur flex items-center justify-between">
          <span className="text-[12px] text-white/25">
            {rooms.length} stanze · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
          </span>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
            title="Salva tutte le posizioni"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salva Posizioni
          </Button>
        </div>
      </div>

      {/* ── CRUD Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="z-[120] max-w-2xl max-h-[85vh] overflow-y-auto admin-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {creating ? '➕ Nuova Stanza' : '✏️ Modifica Stanza'}
            </DialogTitle>
            <DialogDescription>
              {creating
                ? `Crea una nuova stanza per "${locationName}". ID automatico: ${locationId}_{'{nome}'}`
                : `Modifica la stanza "${rooms.find(r => r.id === editingId)?.name ?? editingId}"`
              }
            </DialogDescription>
          </DialogHeader>
          <EntityForm
            fields={roomFormFields}
            initialData={creating ? { locationId, type: 'normal' } : editingData}
            onSubmit={creating ? handleCreate : handleUpdate}
            onCancel={handleDialogClose}
            submitLabel={creating ? 'Crea Stanza' : 'Salva Modifiche'}
            isEdit={!creating}
            activeTab="rooms"
          />
          {/* Submit / Cancel buttons */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDialogClose}
              disabled={dialogSaving}
              className="text-xs gap-1.5 h-8 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              form="entity-form"
              size="sm"
              disabled={dialogSaving}
              className="text-xs gap-1.5 h-8 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
            >
              {dialogSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {creating ? 'Crea Stanza' : 'Salva Modifiche'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
