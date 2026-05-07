'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Save, RefreshCw, Loader2, Plus, Pencil, Trash2, RotateCw,
  ZoomIn, ZoomOut, Link2, Layers, Grid3x3, PanelLeftClose, PanelLeft,
  ArrowLeft, ChevronDown, ChevronRight, Keyboard,
  CircleHelp, Search, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { ROOM_TYPES, getRoomTypeInfo, getRoomTypeLabel, getRoomTypeBadgeClasses, getRoomTypeCardClasses } from '@/components/game/admin/config/roomTypes';
import {
  CORRIDOR_BASE_TYPES, resolvePreset, parsePresetKey, buildPresetKey,
  rotatePreset, getBaseTypeInfo, getDefaultRotation,
  scaleCorridorPath, getPreviewPath, getConnectionPoints, OPPOSITE_SIDE,
  DOOR_STATE_COLORS, DOOR_STATE_LABELS, DOOR_STATE_DESCRIPTIONS, DOOR_STATE_ORDER, DOOR_STATE_HELP,
} from '@/lib/corridor-presets';
import { getEnumLabel } from '@/components/game/admin/config/enumLabels';
import { DoorPuzzleEditor } from '@/components/game/admin/fields/DoorPuzzleEditor';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface RoomEditorPanelProps {
  locationId: string;
  locationName: string;
  onBack?: () => void;
}

interface DoorData {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  fromSide: string;
  toSide: string;
  state: string;
  requiredItemId: string | null;
  lockedMessage: string;
  puzzle: {
    type: string;
    combinationCode?: string;
    sequencePattern?: string[];
    failMessage: string;
    successOutcome: { description: string };
  } | null;
  otherRoomName: string;
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
  corridorPreset: string | null;
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
  travelCost: number;
  _doors: DoorData[];
}

interface ItemLookup {
  id: string;
  name: string;
  icon: string | null;
}

interface EnemyLookup {
  id: string;
  name: string;
  icon: string | null;
}

interface NpcLookup {
  id: string;
  name: string;
  icon: string | null;
}

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

interface ConnectionInfo {
  id: string;
  name: string;
  doorSide: string;
  doorId: string;
}

type FullRoomData = Record<string, unknown>;

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

const ENDPOINT = '/api/admin/rooms';

// Form fields without position/map fields (managed via canvas), exclude 'corridor' from type options
const roomFormFields = FIELD_MAP.rooms
  .filter(f => !['mapCol', 'mapRow', 'sortOrder', 'mapX', 'mapY', 'mapWidth', 'mapHeight', 'nextRooms', 'lockedRooms', 'corridorPreset'].includes(f.key))
  .map(f => f.key === 'type'
    ? { ...f, options: f.options?.filter(o => o !== 'corridor') }
    : f
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
function getRoomDimensions(room: RoomData, _rooms: RoomData[]): { w: number; h: number } {
  if (room.corridorPreset) {
    const variant = resolvePreset(room.corridorPreset);
    if (variant) {
      if (room.mapWidth > 0 || room.mapHeight > 0) {
        return {
          w: room.mapWidth > 0 ? room.mapWidth : DEFAULT_ROOM_W,
          h: room.mapHeight > 0 ? room.mapHeight : DEFAULT_ROOM_H,
        };
      }
      return { w: variant.defaultWidth, h: variant.defaultHeight };
    }
  }
  if (room.mapWidth > 0 || room.mapHeight > 0) {
    return {
      w: room.mapWidth > 0 ? room.mapWidth : DEFAULT_ROOM_W,
      h: room.mapHeight > 0 ? room.mapHeight : DEFAULT_ROOM_H,
    };
  }
  if (room.type === 'corridor') {
    return { w: 180, h: 44 };
  }
  if (room.type === 'boss_room') {
    return { w: 160, h: 110 };
  }
  return { w: DEFAULT_ROOM_W, h: DEFAULT_ROOM_H };
}

/** Get the center point of a room card */
function getRoomCenter(room: RoomData, rooms: RoomData[]): { cx: number; cy: number } {
  const dim = getRoomDimensions(room, rooms);
  return {
    cx: (room.mapX ?? 0) + dim.w / 2,
    cy: (room.mapY ?? 0) + dim.h / 2,
  };
}

/** Get door position (midpoint of edge) for a room */
function getDoorPosition(room: RoomData, side: string, allRooms: RoomData[]): { x: number; y: number } | null {
  if (room.mapX == null || room.mapY == null) return null;
  const dim = getRoomDimensions(room, allRooms);
  // For corridors with presets, use actual shape connection points
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

/** Detect side between two rooms based on relative positions */
function detectSide(fromRoom: RoomData, toRoom: RoomData, allRooms: RoomData[]): { fromSide: string; toSide: string } | null {
  if (fromRoom.mapX == null || fromRoom.mapY == null || toRoom.mapX == null || toRoom.mapY == null) return null;
  const fromDim = getRoomDimensions(fromRoom, allRooms);
  const toDim = getRoomDimensions(toRoom, allRooms);
  const fromCX = fromRoom.mapX + fromDim.w / 2;
  const fromCY = fromRoom.mapY + fromDim.h / 2;
  const toCX = toRoom.mapX + toDim.w / 2;
  const toCY = toRoom.mapY + toDim.h / 2;
  const dx = toCX - fromCX;
  const dy = toCY - fromCY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal: east or west
    return dx > 0
      ? { fromSide: 'east', toSide: 'west' }
      : { fromSide: 'west', toSide: 'east' };
  } else {
    // Vertical: north or south
    return dy > 0
      ? { fromSide: 'south', toSide: 'north' }
      : { fromSide: 'north', toSide: 'south' };
  }
}


// ═══════════════════════════════════════════════════════════
// Connection Line SVG Component
// ═══════════════════════════════════════════════════════════
function RoomConnectionLine({
  x1, y1, x2, y2, label, isCrossLocation,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string;
  isCrossLocation?: boolean;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = Math.atan2(dy, dx);
  const arrowLen = isCrossLocation ? 6 : 8;
  const strokeColor = isCrossLocation ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.25)';
  const fillColor = isCrossLocation ? 'rgba(245,158,11,0.5)' : 'rgba(52,211,153,0.4)';
  const strokeHover = isCrossLocation ? 'rgba(245,158,11,0.4)' : 'rgba(52,211,153,0.3)';
  const dashArray = isCrossLocation ? '6 4' : undefined;
  // Arrow at (x2, y2) — forward
  const arrowX1 = x2 - arrowLen * Math.cos(angle - 0.35);
  const arrowY1 = y2 - arrowLen * Math.sin(angle - 0.35);
  const arrowX2 = x2 - arrowLen * Math.cos(angle + 0.35);
  const arrowY2 = y2 - arrowLen * Math.sin(angle + 0.35);
  // Arrow at (x1, y1) — backward (bidirectional)
  const revAngle = angle + Math.PI;
  const revArrowX1 = x1 - arrowLen * Math.cos(revAngle - 0.35);
  const revArrowY1 = y1 - arrowLen * Math.sin(revAngle - 0.35);
  const revArrowX2 = x1 - arrowLen * Math.cos(revAngle + 0.35);
  const revArrowY2 = y1 - arrowLen * Math.sin(revAngle + 0.35);
  return (
    <g className="group/rconn">
      <path
        d={`M${x1},${y1} L${x2},${y2}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isCrossLocation ? 1.2 : 1.5}
        strokeDasharray={dashArray}
      />
      {/* Bidirectional arrows */}
      <polygon
        points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={fillColor}
      />
      <polygon
        points={`${x1},${y1} ${revArrowX1},${revArrowY1} ${revArrowX2},${revArrowY2}`}
        fill={fillColor}
      />
      <circle cx={mx} cy={my} r={30} fill="transparent" className="cursor-pointer" />
      <g className="opacity-0 group-hover/rconn:opacity-100 transition-opacity duration-150 pointer-events-none">
        <rect
          x={mx - (isCrossLocation ? 50 : 40)}
          y={my - 20}
          width={isCrossLocation ? 100 : 80}
          height={16}
          rx={4}
          fill="rgba(0,0,0,0.85)"
          stroke={strokeHover}
          strokeWidth={0.5}
        />
        <text
          x={mx}
          y={my - 10}
          textAnchor="middle"
          className={isCrossLocation ? 'fill-amber-300/80' : 'fill-white/70'}
          style={{ fontSize: '9px', fontFamily: 'system-ui' }}
        >
          {label.length > (isCrossLocation ? 16 : 12) ? label.slice(0, isCrossLocation ? 16 : 12) + '…' : label}
        </text>
      </g>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Minimap Component
// ═══════════════════════════════════════════════════════════
function RoomMinimap({
  rooms,
  zoom,
  panX,
  panY,
  containerW,
  containerH,
  selectedId,
  onGoto,
}: {
  rooms: RoomData[];
  zoom: number;
  panX: number;
  panY: number;
  containerW: number;
  containerH: number;
  selectedId: string | null;
  onGoto: (x: number, y: number) => void;
}) {
  const mmW = 180;
  const mmH = Math.round((CANVAS_H / CANVAS_W) * mmW);
  const scale = mmW / CANVAS_W;

  const viewX = Math.max(0, -panX * scale);
  const viewY = Math.max(0, -panY * scale);
  const viewW = Math.min(mmW, containerW * scale * zoom);
  const viewH = Math.min(mmH, containerH * scale * zoom);

  return (
    <div className="absolute bottom-3 right-3 z-30 rounded-lg border border-white/[0.12] bg-black/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/40">
      <div className="px-2 py-1 text-[9px] text-white/30 font-medium border-b border-white/[0.06] uppercase tracking-wider">
        Mappa
      </div>
      <svg
        width={mmW}
        height={mmH}
        className="block cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const cx = (e.clientX - rect.left) / scale;
          const cy = (e.clientY - rect.top) / scale;
          onGoto(cx, cy);
        }}
      >
        {/* Viewport rectangle */}
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="rgba(16,185,129,0.06)"
          stroke="rgba(16,185,129,0.3)"
          strokeWidth={1}
          rx={2}
        />
        {/* Room dots */}
        {rooms.map(room => {
          if (room.mapX == null || room.mapY == null) return null;
          const dim = getRoomDimensions(room, rooms);
          const x = room.mapX * scale + (dim.w / 2) * scale;
          const y = room.mapY * scale + (dim.h / 2) * scale;
          const isSelected = room.id === selectedId;
          // Color by room type
          const typeInfo = getRoomTypeInfo(room.type);
          const dotColor = isSelected ? '#34d399' : typeInfo.color;
          return (
            <g key={room.id}>
              {isSelected && (
                <circle cx={x} cy={y} r={5} fill="rgba(16,185,129,0.3)" />
              )}
              <rect
                x={room.mapX * scale}
                y={room.mapY * scale}
                width={dim.w * scale}
                height={dim.h * scale}
                rx={1}
                fill={isSelected ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}
                stroke={isSelected ? '#34d399' : dotColor}
                strokeWidth={isSelected ? 1 : 0.5}
              />
            </g>
          );
        })}
      </svg>
    </div>
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
  onHover,
  onHoverEnd,
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
  onHover: (e: React.MouseEvent, id: string) => void;
  onHoverEnd: () => void;
}) {
  const typeInfo = getRoomTypeInfo(room.type);
  const dim = getRoomDimensions(room, rooms);
  const isCorridor = room.type === 'corridor';
  const isBoss = room.type === 'boss_room';
  const isSafe = room.type === 'safe_room';
  const corridorVariant = isCorridor && room.corridorPreset ? resolvePreset(room.corridorPreset) : null;

  const borderClasses = getRoomTypeCardClasses(typeInfo.color);

  // For corridors with SVG shape: invisible container, visible SVG shape with solid fill
  if (isCorridor && corridorVariant) {
    const scaledPath = scaleCorridorPath(room.corridorPreset!, dim.w, dim.h);
    return (
      <div
        className={`absolute select-none ${isDragging ? 'z-50' : 'z-5'}`}
        style={{
          left: room.mapX ?? 0,
          top: room.mapY ?? 0,
          width: dim.w,
          height: dim.h,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, room.id); }}
        onMouseEnter={(e) => onHover(e, room.id)}
        onMouseLeave={onHoverEnd}
        onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; onSelect(room.id); }}
      >
        {/* Corridor SVG shape — solid fill, type-colored stroke */}
        {scaledPath && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            preserveAspectRatio="none"
          >
            <path
              d={scaledPath}
              fill="#0d0d14"
              stroke={isSelected
                ? 'rgba(52,211,153,0.7)'
                : typeInfo.color === 'red' ? 'rgba(239,68,68,0.5)'
                  : typeInfo.color === 'amber' ? 'rgba(245,158,11,0.5)'
                    : typeInfo.color === 'emerald' ? 'rgba(52,211,153,0.5)'
                      : typeInfo.color === 'purple' ? 'rgba(168,85,247,0.5)'
                        : 'rgba(148,163,184,0.45)'}
              strokeWidth={isSelected ? 2 : 1.5}
            />
          </svg>
        )}
        {/* Corridor name label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-bold text-white/50 truncate max-w-[90%] text-center leading-tight text-[10px]">
            {room.name}
          </span>
        </div>
        {/* Edit/Delete buttons — bottom right for corridors */}
        <div className="flex items-center gap-0.5" style={{ position: 'absolute', bottom: 2, right: 2 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(room.id); }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black/70 border border-cyan-500/30 text-cyan-400/70 hover:text-cyan-300 hover:bg-black/90 transition-colors"
            title="Modifica corridoio"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black/70 border border-red-500/30 text-red-400/70 hover:text-red-300 hover:bg-black/90 transition-colors"
            title="Elimina corridoio"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        absolute select-none transition-shadow duration-150
        border-2 border-solid bg-[#0d0d14]
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
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, room.id); }}
      onMouseEnter={(e) => onHover(e, room.id)}
      onMouseLeave={onHoverEnd}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect(room.id);
      }}
    >
      <div className="relative flex flex-col h-full p-2 gap-0.5">
        {/* Icon + Name */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-none shrink-0">{room.icon || typeInfo.icon}</span>
          <span className="font-bold text-white/80 truncate min-w-0 leading-tight text-[11px]">
            {room.name}
          </span>
        </div>

        {/* Type badge + info badges */}
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

        {/* Action buttons — bottom right, always visible */}
        <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(room.id); }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black/70 border border-cyan-500/30 text-cyan-400/70 hover:text-cyan-300 hover:bg-black/90 transition-colors"
            title="Modifica stanza"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black/70 border border-red-500/30 text-red-400/70 hover:text-red-300 hover:bg-black/90 transition-colors"
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
// Pending Door Key Picker — lightweight version for pending doors
// ═══════════════════════════════════════════════════════════
function PendingDoorKeyPicker({
  requiredItemId,
  onChange,
}: {
  requiredItemId: string | null;
  onChange: (itemId: string | null) => void;
}) {
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; type?: string; icon?: string }>>([]);
  const [itemsFetched, setItemsFetched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (itemsFetched) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await adminFetch('/api/admin/items?type=key');
        const data = await r.json();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setItemsFetched(true);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setItemsFetched(true);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [itemsFetched]);

  useEffect(() => {
    if (itemSearchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [itemSearchOpen]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const selectedItem = useMemo(() => {
    if (!requiredItemId) return null;
    return items.find(i => i.id === requiredItemId);
  }, [requiredItemId, items]);

  return (
    <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-1.5 text-[9px] bg-black/40 border border-yellow-500/20 rounded px-1.5 py-0.5 text-left hover:border-yellow-500/40 transition-colors"
        >
          {selectedItem ? (
            <>
              <span className="text-yellow-400/80">{selectedItem.icon || '🔑'}</span>
              <span className="text-yellow-400/80 truncate flex-1">{selectedItem.name}</span>
              <X
                className="w-2.5 h-2.5 text-yellow-500/40 hover:text-yellow-400 shrink-0"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
              />
            </>
          ) : (
            <span className="text-yellow-500/30">🔑 Cerca oggetto chiave...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-1.5 bg-zinc-900 border-white/[0.1] shadow-xl z-[130]"
        side="bottom"
        align="start"
      >
        <div className="flex items-center gap-1.5 px-1.5 py-1 mb-1">
          <Search className="w-3 h-3 text-white/30 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Cerca oggetto..."
            className="flex-1 bg-transparent text-[10px] text-white/80 placeholder:text-white/25 focus:outline-none min-w-0"
          />
        </div>
        <div className="max-h-32 overflow-y-auto admin-scrollbar">
          {!itemsFetched ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-[9px] text-white/25 italic text-center py-2">
              {itemSearch ? 'Nessun risultato' : 'Nessun oggetto creato'}
            </p>
          ) : (
            filteredItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="w-full flex items-center gap-1.5 px-1.5 py-1 text-left rounded hover:bg-white/[0.06] transition-colors"
                onClick={() => {
                  onChange(item.id);
                  setItemSearchOpen(false);
                  setItemSearch('');
                }}
              >
                <span className="text-[10px]">{item.icon || '📦'}</span>
                <span className="text-[10px] text-white/70 truncate flex-1">{item.name}</span>
                {requiredItemId === item.id && (
                  <span className="text-[8px] text-emerald-400/60 shrink-0">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════
// Door Card Sub-component with searchable item picker + editable sides
// ═══════════════════════════════════════════════════════════
const SIDE_OPTIONS = [
  { value: 'north', label: 'Nord' },
  { value: 'south', label: 'Sud' },
  { value: 'east', label: 'Est' },
  { value: 'west', label: 'Ovest' },
];

function DoorCard({
  door,
  editRoomId,
  onUpdate,
  onDelete,
}: {
  door: DoorData;
  editRoomId: string;
  onUpdate: (doorId: string, updates: Record<string, unknown>) => void;
  onDelete: (doorId: string) => void;
}) {
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; type?: string; icon?: string }>>([]);
  const [itemsFetched, setItemsFetched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const itemsLoading = !itemsFetched;

  // Fetch items on mount so selectedItem resolves even when popover is closed
  useEffect(() => {
    if (itemsFetched) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await adminFetch('/api/admin/items?type=key');
        const data = await r.json();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setItemsFetched(true);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setItemsFetched(true);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [itemsFetched]);

  // Focus search input when popover opens
  useEffect(() => {
    if (itemSearchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [itemSearchOpen]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const selectedItem = useMemo(() => {
    if (!door.requiredItemId) return null;
    return items.find(i => i.id === door.requiredItemId);
  }, [door.requiredItemId, items]);

  const color = DOOR_STATE_COLORS[door.state] ?? DOOR_STATE_COLORS.open;
  const isFrom = door.fromRoomId === editRoomId;

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      {/* Door state indicator */}
      <div
        className="w-3 h-3 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Row 1: Room name + state badge + side selects */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-white/70 font-medium truncate">
            {door.otherRoomName}
          </span>
          <span
            className="text-[8px] px-1.5 py-px rounded-full border font-medium"
            style={{
              borderColor: color,
              color: color,
              backgroundColor: `${color}15`,
            }}
          >
            {getEnumLabel('doorState', door.state)}
          </span>
          {/* Editable side selects */}
          <select
            value={door.fromSide || ''}
            onChange={(e) => onUpdate(door.id, { fromSide: e.target.value })}
            className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1 py-px text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            title="Lato da cui esce"
          >
            {SIDE_OPTIONS.map(s => (
              <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>
            ))}
          </select>
          <span className="text-[8px] text-white/15">→</span>
          <select
            value={door.toSide || ''}
            onChange={(e) => onUpdate(door.id, { toSide: e.target.value })}
            className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1 py-px text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            title="Lato in cui entra"
          >
            {SIDE_OPTIONS.map(s => (
              <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>
            ))}
          </select>
        </div>

        {/* Key item search — only for key_locked state */}
        {door.state === 'key_locked' && (
          <div>
            <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 text-[9px] bg-black/40 border border-yellow-500/20 rounded px-1.5 py-0.5 text-left hover:border-yellow-500/40 transition-colors"
                >
                  {selectedItem ? (
                    <>
                      <span className="text-yellow-400/80">{selectedItem.icon || '🔑'}</span>
                      <span className="text-yellow-400/80 truncate flex-1">{selectedItem.name}</span>
                      <X
                        className="w-2.5 h-2.5 text-yellow-500/40 hover:text-yellow-400 shrink-0"
                        onClick={(e) => { e.stopPropagation(); onUpdate(door.id, { requiredItemId: null }); }}
                      />
                    </>
                  ) : (
                    <span className="text-yellow-500/30">🔑 Cerca oggetto chiave...</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-1.5 bg-zinc-900 border-white/[0.1] shadow-xl z-[130]"
                side="bottom"
                align="start"
              >
                <div className="flex items-center gap-1.5 px-1.5 py-1 mb-1">
                  <Search className="w-3 h-3 text-white/30 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Cerca oggetto..."
                    className="flex-1 bg-transparent text-[10px] text-white/80 placeholder:text-white/25 focus:outline-none min-w-0"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto admin-scrollbar">
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-[9px] text-white/25 italic text-center py-2">
                      {itemSearch ? 'Nessun risultato' : 'Nessun oggetto creato'}
                    </p>
                  ) : (
                    filteredItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full flex items-center gap-1.5 px-1.5 py-1 text-left rounded hover:bg-white/[0.06] transition-colors"
                        onClick={() => {
                          onUpdate(door.id, { requiredItemId: item.id });
                          setItemSearchOpen(false);
                          setItemSearch('');
                        }}
                      >
                        <span className="text-[10px]">{item.icon || '📦'}</span>
                        <span className="text-[10px] text-white/70 truncate flex-1">{item.name}</span>
                        {door.requiredItemId === item.id && (
                          <span className="text-[8px] text-emerald-400/60 shrink-0">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Locked message — for key_locked, locked, inaccessible */}
        {(door.state === 'key_locked' || door.state === 'locked' || door.state === 'inaccessible') && (
          <input
            type="text"
            placeholder={door.state === 'key_locked'
              ? '💬 Messaggio se il giocatore non ha la chiave...'
              : '💬 Messaggio quando bloccata...'
            }
            defaultValue={door.lockedMessage ?? ''}
            onBlur={(e) => onUpdate(door.id, { lockedMessage: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-full text-[9px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] italic"
          />
        )}

        {/* Puzzle editor — only for locked state */}
        {door.state === 'locked' && (
          <DoorPuzzleEditor
            value={door.puzzle}
            onChange={(puzzle) => onUpdate(door.id, {
              puzzle: puzzle ? JSON.stringify(puzzle) : '',
            })}
          />
        )}

        {/* State description */}
        <span className="text-[8px] text-white/20 block">{DOOR_STATE_DESCRIPTIONS[door.state] ?? ''}</span>
      </div>

      {/* Door state selector */}
      <select
        value={door.state}
        onChange={(e) => onUpdate(door.id, { state: e.target.value })}
        className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1.5 py-0.5 text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 shrink-0 cursor-pointer"
      >
        {DOOR_STATE_ORDER.map(s => (
          <option key={s} value={s} className="bg-black text-white">{DOOR_STATE_LABELS[s] ?? s}</option>
        ))}
      </select>

      {/* Delete door */}
      <button
        type="button"
        onClick={() => onDelete(door.id)}
        className="p-1 text-red-400/40 hover:text-red-300 transition-colors shrink-0"
        title="Elimina porta"
      >
        <Trash2 className="w-3 h-3" />
      </button>
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
  const [highlightedRoomId, setHighlightedRoomId] = useState<string | null>(null);

  // ── Room hover tooltip ──
  const [tooltipData, setTooltipData] = useState<RoomTooltipData | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [itemsLookup, setItemsLookup] = useState<Record<string, ItemLookup>>({});
  const [enemiesLookup, setEnemiesLookup] = useState<Record<string, EnemyLookup>>({});
  const [npcsLookup, setNpcsLookup] = useState<Record<string, NpcLookup>>({});
  const lookupsFetched = useRef(false);

  // Fetch lookups once (items, enemies, NPCs) for tooltip resolution
  const fetchLookups = useCallback(async () => {
    if (lookupsFetched.current) return;
    lookupsFetched.current = true;
    try {
      const [itemsRes, enemiesRes, npcsRes] = await Promise.all([
        adminFetch('/api/admin/items'),
        adminFetch('/api/admin/enemies'),
        adminFetch('/api/admin/npcs'),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        const map: Record<string, ItemLookup> = {};
        for (const i of Array.isArray(data) ? data : []) {
          map[String(i.id)] = { id: String(i.id), name: String(i.name ?? ''), icon: i.icon ? String(i.icon) : null };
        }
        setItemsLookup(map);
      }
      if (enemiesRes.ok) {
        const data = await enemiesRes.json();
        const map: Record<string, EnemyLookup> = {};
        for (const e of Array.isArray(data) ? data : []) {
          map[String(e.id)] = { id: String(e.id), name: String(e.name ?? ''), icon: e.icon ? String(e.icon) : null };
        }
        setEnemiesLookup(map);
      }
      if (npcsRes.ok) {
        const data = await npcsRes.json();
        const map: Record<string, NpcLookup> = {};
        for (const n of Array.isArray(data) ? data : []) {
          map[String(n.id)] = { id: String(n.id), name: String(n.name ?? ''), icon: n.icon ? String(n.icon) : null };
        }
        setNpcsLookup(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  const handleRoomHover = useCallback((e: React.MouseEvent, roomId: string) => {
    // Small delay to avoid flicker when moving between cards/buttons
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const typeInfo = getRoomTypeInfo(room.type);
      // Parse itemPool from unknown[]
      const itemPool: Array<{ itemId: string; chance: number; quantity: number }> = Array.isArray(room.itemPool)
        ? room.itemPool.map((r: unknown) => {
            if (typeof r === 'object' && r !== null) {
              const o = r as Record<string, unknown>;
              return { itemId: String(o.itemId ?? ''), chance: Number(o.chance ?? 0), quantity: Number(o.quantity ?? 1) };
            }
            return { itemId: String(r), chance: 0, quantity: 1 };
          })
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
  }, [rooms]);

  const handleRoomHoverEnd = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipData(null);
  }, []);

  // Canvas controls — restore from localStorage per location
  const ROOM_VIEW_KEY = `roomEditor-view-${locationId}`;
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ROOM_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).zoom ?? 0.7; } catch { /* ignore */ } }
    }
    return 0.7;
  });
  const [panX, setPanX] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ROOM_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).panX ?? 0; } catch { /* ignore */ } }
    }
    return 0;
  });
  const [panY, setPanY] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ROOM_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).panY ?? 0; } catch { /* ignore */ } }
    }
    return 0;
  });
  const mapViewRestored = useRef(false);

  // Debounced save of room map view state to localStorage
  const mapViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMapView = useCallback((z: number, px: number, py: number) => {
    if (mapViewTimeoutRef.current) clearTimeout(mapViewTimeoutRef.current);
    mapViewTimeoutRef.current = setTimeout(() => {
      try { localStorage.setItem(ROOM_VIEW_KEY, JSON.stringify({ zoom: z, panX: px, panY: py })); } catch { /* ignore */ }
    }, 300);
  }, [ROOM_VIEW_KEY]);

  // Save view state when pan/zoom changes
  useEffect(() => {
    saveMapView(zoom, panX, panY);
  }, [zoom, panX, panY, saveMapView]);

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
  const [isPanning, setIsPanning] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [unplacedOpen, setUnplacedOpen] = useState(true);
  const [allOpen, setAllOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [controlsDialogOpen, setControlsDialogOpen] = useState(false);

  // Dialog
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const dialogOpen = creating || editingId !== null;

  // Corridor presets
  const [presetsOpen, setPresetsOpen] = useState(true);
  const corridorCountRef = useRef(0);

  // Corridor presets — track selected rotation per base type
  const [presetRotations, setPresetRotations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const bt of CORRIDOR_BASE_TYPES) {
      initial[bt.id] = getDefaultRotation(bt.id);
    }
    return initial;
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track container dimensions for minimap
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        corridorPreset: d.corridorPreset ? String(d.corridorPreset) : null,
        travelCost: typeof d.travelCost === 'number' ? d.travelCost : 1,
        _doors: Array.isArray(d._doors) ? d._doors as DoorData[] : [],
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
    if (!room._doors) return result;
    for (const door of room._doors) {
      const otherId = door.fromRoomId === room.id ? door.toRoomId : door.fromRoomId;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const doorSide = door.fromRoomId === room.id ? door.fromSide : door.toSide;
      result.push({ id: otherId, name: door.otherRoomName, doorSide, doorId: door.id });
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
      fromSide: string; toSide: string;
      isCrossLocation?: boolean;
    }[] = [];
    const seenPairs = new Set<string>();
    for (const room of placed) {
      const conns = getConnections(room);
      for (const conn of conns) {
        const pairKey = [room.id, conn.id].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        // Use door positions instead of room centers
        const fromPos = getDoorPosition(room, conn.doorSide, rooms);
        if (!fromPos) continue;

        const target = rooms.find(r => r.id === conn.id);

        if (!target || target.mapX == null || target.mapY == null) {
          // Cross-location connection: draw a stub line outward from the door
          const stubLen = 50;
          let endX = fromPos.x;
          let endY = fromPos.y;
          switch (conn.doorSide) {
            case 'north': endY = fromPos.y - stubLen; break;
            case 'south': endY = fromPos.y + stubLen; break;
            case 'east':  endX = fromPos.x + stubLen; break;
            case 'west':  endX = fromPos.x - stubLen; break;
          }
          lines.push({
            x1: fromPos.x,
            y1: fromPos.y,
            x2: endX,
            y2: endY,
            label: `→ ${conn.name}`,
            key: `cross-${pairKey}`,
            fromSide: conn.doorSide,
            toSide: '',
            isCrossLocation: true,
          });
          continue;
        }

        // Find the reverse door on the target to get its side
        const targetConns = getConnections(target);
        const reverseConn = targetConns.find(tc => tc.id === room.id);
        const toPos = reverseConn
          ? getDoorPosition(target, reverseConn.doorSide, rooms)
          : (() => { const c = getRoomCenter(target, rooms); return { x: c.cx, y: c.cy }; })();

        lines.push({
          x1: fromPos.x,
          y1: fromPos.y,
          x2: toPos ? toPos.x : fromPos.x,
          y2: toPos ? toPos.y : fromPos.y,
          label: conn.name,
          key: pairKey,
          fromSide: conn.doorSide,
          toSide: reverseConn?.doorSide ?? '',
        });
      }
    }
    return lines;
  }, [placed, rooms, showConnections, getConnections]);

  // ── Door positions for map rendering ──
  const doorPositions = useMemo(() => {
    const positions: { x: number; y: number; color: string; state: string; doorId: string; roomName: string; otherRoomName: string; side: string }[] = [];
    const seenDoors = new Set<string>();
    for (const room of placed) {
      if (!room._doors) continue;
      for (const door of room._doors) {
        if (seenDoors.has(door.id)) continue;
        seenDoors.add(door.id);
        // Determine which side this door is on for THIS room
        const isFrom = door.fromRoomId === room.id;
        const side = isFrom ? door.fromSide : door.toSide;
        const pos = getDoorPosition(room, side, rooms);
        if (!pos) continue;
        positions.push({
          x: pos.x,
          y: pos.y,
          color: DOOR_STATE_COLORS[door.state] ?? DOOR_STATE_COLORS.open,
          state: door.state,
          doorId: door.id,
          roomName: room.name,
          otherRoomName: door.otherRoomName,
          side,
        });
      }
    }
    return positions;
  }, [placed, rooms]);

  // ── Corridor shape paths for SVG rendering ──
  const corridorShapes = useMemo(() => {
    const shapes: { path: string; x: number; y: number; w: number; h: number; presetId: string; name: string; roomId: string; typeInfo: ReturnType<typeof getRoomTypeInfo> }[] = [];
    for (const room of placed) {
      if (!room.corridorPreset || room.mapX == null || room.mapY == null) continue;
      const dim = getRoomDimensions(room, rooms);
      const scaledPath = scaleCorridorPath(room.corridorPreset, dim.w, dim.h);
      if (scaledPath) {
        shapes.push({
          path: scaledPath,
          x: room.mapX,
          y: room.mapY,
          w: dim.w,
          h: dim.h,
          presetId: room.corridorPreset,
          name: room.name,
          roomId: room.id,
          typeInfo: getRoomTypeInfo(room.type),
        });
      }
    }
    return shapes;
  }, [placed, rooms]);

  // ── Cross-location rooms for door connections ──
  const [allLocations, setAllLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [roomsByLocation, setRoomsByLocation] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationId);
  const [connectLoading, setConnectLoading] = useState(false);

  const loadLocationsAndRooms = useCallback(async () => {
    setConnectLoading(true);
    try {
      const [locRes, roomRes] = await Promise.all([
        adminFetch('/api/admin/locations'),
        adminFetch('/api/admin/rooms'),
      ]);
      const locs: Array<{ id: string; name: string }> = locRes.ok ? await locRes.json() : [];
      const allRooms: Array<Record<string, unknown>> = roomRes.ok ? await roomRes.json() : [];
      setAllLocations(locs);
      const byLoc: Record<string, Array<{ id: string; name: string }>> = {};
      for (const r of allRooms) {
        const lid = String(r.locationId ?? '');
        if (!byLoc[lid]) byLoc[lid] = [];
        byLoc[lid].push({ id: String(r.id), name: String(r.name ?? '') });
      }
      setRoomsByLocation(byLoc);
    } catch {
      setAllLocations([]);
      setRoomsByLocation({});
    } finally {
      setConnectLoading(false);
    }
  }, []);

  // Load locations/rooms when dialog opens in edit mode
  useEffect(() => {
    if (editingId) {
      setSelectedLocationId(locationId);
      loadLocationsAndRooms();
    }
  }, [editingId]);

  // ── Pending doors state (created on connect, persisted on save) ──
  const [pendingDoors, setPendingDoors] = useState<Array<{ fromRoomId: string; toRoomId: string; fromSide: string; toSide: string; state: string; requiredItemId: string | null; lockedMessage: string }>>([]);

  // ── Door creation helper (auto-detect sides if not provided) ──
  const createDoor = useCallback((fromRoomId: string, toRoomId: string, fromSide?: string, toSide?: string) => {
    // Try auto-detect if sides not provided
    let finalFromSide = fromSide;
    let finalToSide = toSide;
    if (!finalFromSide || !finalToSide) {
      const fromRoom = rooms.find(r => r.id === fromRoomId);
      const toRoom = rooms.find(r => r.id === toRoomId);
      if (fromRoom && toRoom) {
        const sides = detectSide(fromRoom, toRoom, rooms);
        if (sides) {
          finalFromSide = finalFromSide || sides.fromSide;
          finalToSide = finalToSide || sides.toSide;
        }
      }
    }
    if (!finalFromSide || !finalToSide) return;
    // Add to pending state instead of creating immediately
    setPendingDoors(prev => [...prev, {
      fromRoomId,
      toRoomId,
      fromSide: finalFromSide,
      toSide: finalToSide,
      state: 'open',
      requiredItemId: null,
      lockedMessage: '',
    }]);
  }, [rooms]);

  // ── Door update helper — LOCAL only, no API call, no fetchRooms() ──
  // Also queues the update for persistence on save
  const doorUpdateQueueRef = useRef<Array<{ doorId: string; updates: Record<string, unknown> }>>([]);
  const doorDeleteQueueRef = useRef<Array<string>>([]);

  const updateDoor = useCallback((doorId: string, updates: Record<string, unknown>) => {
    // Queue for API persistence on save
    const existing = doorUpdateQueueRef.current.find(q => q.doorId === doorId);
    if (existing) {
      Object.assign(existing.updates, updates);
    } else {
      doorUpdateQueueRef.current.push({ doorId, updates });
    }
    // Update locally in fullData
    setFullData(prev => {
      const next = { ...prev };
      for (const [roomId, data] of Object.entries(next)) {
        const doors: DoorData[] = (data as Record<string, unknown>)._doors as DoorData[] ?? [];
        if (doors.some(d => d.id === doorId)) {
          next[roomId] = {
            ...(data as Record<string, unknown>),
            _doors: doors.map(d => d.id === doorId ? { ...d, ...updates } : d),
          };
          break;
        }
      }
      return next;
    });
    // Also update rooms state so the dialog and canvas update immediately
    setRooms(prev => prev.map(room => {
      if (!room._doors || !room._doors.some(d => d.id === doorId)) return room;
      return { ...room, _doors: room._doors.map(d => d.id === doorId ? { ...d, ...updates } : d) };
    }));
  }, []);

  // ── Door delete helper — LOCAL only, removes from fullData AND rooms state ──
  const deleteDoor = useCallback((doorId: string) => {
    // Queue for API persistence on save (unless it was a pending door being removed)
    doorDeleteQueueRef.current.push(doorId);
    // Remove locally from fullData
    setFullData(prev => {
      const next = { ...prev };
      for (const [roomId, data] of Object.entries(next)) {
        const doors: DoorData[] = (data as Record<string, unknown>)._doors as DoorData[] ?? [];
        if (doors.some(d => d.id === doorId)) {
          next[roomId] = {
            ...(data as Record<string, unknown>),
            _doors: doors.filter(d => d.id !== doorId),
          };
          break;
        }
      }
      return next;
    });
    // Also remove from rooms state so the dialog and canvas update immediately
    setRooms(prev => prev.map(room => {
      if (!room._doors || !room._doors.some(d => d.id === doorId)) return room;
      return { ...room, _doors: room._doors.filter(d => d.id !== doorId) };
    }));
  }, []);

  // ── Door field update for pending doors ──
  const updatePendingDoor = useCallback((idx: number, updates: Record<string, unknown>) => {
    setPendingDoors(prev => prev.map((pd, i) => i === idx ? { ...pd, ...updates } : pd));
  }, []);

  // ── Persist pending doors on save ──
  const persistPendingDoors = useCallback(async (pDoors: Array<{ fromRoomId: string; toRoomId: string; fromSide: string; toSide: string; state: string; requiredItemId: string | null; lockedMessage: string }>) => {
    for (const pd of pDoors) {
      try {
        await adminFetch('/api/admin/doors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pd),
        });
      } catch { /* ignore individual failures */ }
    }
  }, []);


  // ── Corridor preset drop handler ──
  const handleCorridorDrop = useCallback(async (presetKey: string, mapX: number, mapY: number) => {
    const variant = resolvePreset(presetKey);
    if (!variant) return;
    const parsed = parsePresetKey(presetKey);
    corridorCountRef.current++;
    const count = corridorCountRef.current;
    const newId = `corridor_${Date.now()}`;
    const baseInfo = parsed ? getBaseTypeInfo(parsed.baseType) : null;
    const newName = `${baseInfo?.label ?? 'Corridoio'} #${count}`;
    try {
      const res = await adminFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          locationId,
          name: newName,
          type: 'corridor',
          icon: '🚪',
          corridorPreset: presetKey,
          mapX,
          mapY,
          mapWidth: variant.defaultWidth,
          mapHeight: variant.defaultHeight,
          sortOrder: rooms.length,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`${baseInfo?.label ?? 'Corridoio'} (${parsed?.rotation ?? 0}°) creato!`, 'success');
      fetchRooms();
    } catch (err) {
      showStatus(`Errore creazione corridoio: ${err}`, 'error');
    }
  }, [locationId, rooms.length, fetchRooms, showStatus]);

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

    // Compute new positioned rooms and save them
    const newlyPositioned = unplaced.map((room, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { ...room, mapX: startX + col * spacingX, mapY: startY + row * spacingY };
    });

    setRooms(prev =>
      prev.map(r => {
        const u = updates[r.id];
        if (!u) return r;
        return { ...r, mapX: u.mapX, mapY: u.mapY };
      })
    );

    // Save positions after state update propagates
    setTimeout(() => {
      savePositions(newlyPositioned);
    }, 100);
  }, [unplaced, savePositions]);

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

    // Save position after state update propagates
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setTimeout(() => {
        savePositions([{ ...room, mapX: targetX, mapY: targetY }]);
      }, 100);
    }
  }, [placed, rooms, savePositions]);

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
    // Left-click or middle-click on canvas container (not on a room/corridor card or button) → start panning
    const target = e.target as HTMLElement;
    if (e.button === 0 || e.button === 1) {
      // Allow panning when clicking on empty canvas area, grid background, or SVG layers
      // Block panning on buttons, room cards, and interactive elements
      if (target.closest('button') || target.closest('[data-room-card]')) return;

      e.preventDefault();
      setSelectedRoomId(null);
      panRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      };
      setIsPanning(true);
      return;
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

      const dragId = dragRef.current.roomId;
      setRooms(prev =>
        prev.map(r =>
          r.id === dragId ? { ...r, mapX: newX, mapY: newY } : r
        )
      );
    }
  }, [zoom, snapToGrid]);

  const handleCanvasMouseUp = useCallback(() => {
    // End panning
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
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
    // Always zoom on wheel, no modifier needed
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((prev + delta) * 100) / 100)));
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
        const dim = getRoomDimensions(room, rooms);
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
  }, [placed, rooms]);

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
      // Persist pending door creations
      if (pendingDoors.length > 0) {
        await persistPendingDoors(pendingDoors);
      }
      // Persist door updates (queued locally)
      for (const q of doorUpdateQueueRef.current) {
        try {
          await adminFetch('/api/admin/doors', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: q.doorId, ...q.updates }),
          });
        } catch { /* ignore individual failures */ }
      }
      // Persist door deletes (queued locally)
      for (const doorId of doorDeleteQueueRef.current) {
        try {
          await adminFetch(`/api/admin/doors?id=${encodeURIComponent(doorId)}`, { method: 'DELETE' });
        } catch { /* ignore individual failures */ }
      }
      // Clear queues
      setPendingDoors([]);
      doorUpdateQueueRef.current = [];
      doorDeleteQueueRef.current = [];
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
    // Clear any pending debounced save to prevent stale position updates
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
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
    setPendingDoors([]);
    doorUpdateQueueRef.current = [];
    doorDeleteQueueRef.current = [];
    // Revert local door changes by refetching
    fetchRooms();
  };

  // ── Navigate to a room (center + select) ──
  const handleGotoRoom = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.mapX == null || room.mapY == null) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dim = getRoomDimensions(room, rooms);
    const cx = room.mapX + dim.w / 2;
    const cy = room.mapY + dim.h / 2;
    setPanX(rect.width / (2 * zoom) - cx);
    setPanY(rect.height / (2 * zoom) - cy);
    setHighlightedRoomId(roomId);
  }, [rooms, zoom]);

  // ── Center canvas on load (only if no saved view) ──
  // ── Minimap goto ──
  const handleMinimapGoto = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;
    setPanX(container.clientWidth / (2 * zoom) - x);
    setPanY(container.clientHeight / (2 * zoom) - y);
  }, [zoom]);

  // ── Center canvas on load (only if no saved view) ──
  useEffect(() => {
    if (loading || placed.length === 0) return;
    // Skip auto-centering if we already restored from localStorage
    if (mapViewRestored.current) return;
    mapViewRestored.current = true;
    // Check if there's a saved view
    try {
      const saved = localStorage.getItem(ROOM_VIEW_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.panX !== undefined && parsed.panX !== 0) return;
        if (parsed.panY !== undefined && parsed.panY !== 0) return;
      }
    } catch { /* ignore */ }
    // No saved view — center on content
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
      // Center: matches MapEditor transform pattern
      // Transform: translate(panX*zoom, panY*zoom) scale(zoom)
      // screen_x = (panX + canvasX) * zoom → panX = containerW / (2*zoom) - centerX
      setPanX(rect.width / (2 * zoom) - centerX);
      setPanY(rect.height / (2 * zoom) - centerY);
    }
  }, [loading, zoom, placed]);

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
                  Trascina per posizionare. Scroll per zoom.
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
                {sidebarOpen ? <PanelLeftClose className="w-3 h-3" /> : <PanelLeft className="w-3 h-3" />}
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

        {/* ── Content area: Sidebar + Canvas ── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ── Sidebar ── */}
          {sidebarOpen && (
            <div className="w-[260px] shrink-0 border-r border-white/[0.06] bg-[#0d0d14] flex flex-col overflow-hidden">
              {/* Controls button */}
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setControlsDialogOpen(true)}
                  className="flex items-center gap-1.5 w-full text-[10px] text-white/30 hover:text-white/50 transition-colors"
                >
                  <Keyboard className="w-3 h-3" />
                  <span>Controlli</span>
                </button>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-3 admin-scrollbar">
                {/* Preset Corridoi section */}
                <div className="mb-3">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full mb-1.5"
                    onClick={() => setPresetsOpen(!presetsOpen)}
                  >
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      Preset Corridoi
                    </span>
                    {presetsOpen
                      ? <ChevronDown className="w-3 h-3 text-white/30" />
                      : <ChevronRight className="w-3 h-3 text-white/30" />
                    }
                  </button>
                  {presetsOpen && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto admin-scrollbar">
                      {CORRIDOR_BASE_TYPES.map(baseType => {
                        const rotation = presetRotations[baseType.id] ?? 0;
                        const presetKey = buildPresetKey(baseType.id, rotation);
                        const previewW = 44;
                        const previewPath = getPreviewPath(presetKey, previewW);
                        const hasMultipleRotations = baseType.rotations.length > 1;
                        return (
                          <div
                            key={baseType.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/corridor-preset', presetKey);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            className="group flex items-center gap-2 p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-grab"
                            title={`${baseType.label} — trascina sulla mappa`}
                          >
                            <svg
                              width={previewW}
                              height={previewW}
                              viewBox={`0 0 ${previewW} ${previewW}`}
                              className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                              {previewPath && (
                                <path
                                  d={previewPath}
                                  fill="rgba(139,92,246,0.2)"
                                  stroke="rgba(139,92,246,0.5)"
                                  strokeWidth={1}
                                />
                              )}
                            </svg>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] text-white/50 font-medium leading-tight block truncate">
                                <span className="mr-1">{baseType.icon}</span>
                                {baseType.label}
                              </span>
                              <span className="text-[8px] text-white/25 block truncate">
                                {baseType.description} · {rotation}°
                              </span>
                            </div>
                            {hasMultipleRotations && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPresetRotations(prev => {
                                    const currentIdx = baseType.rotations.indexOf(rotation);
                                    const nextIdx = (currentIdx + 1) % baseType.rotations.length;
                                    return { ...prev, [baseType.id]: baseType.rotations[nextIdx] };
                                  });
                                }}
                                className="shrink-0 p-1 rounded text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                                title="Ruota preset"
                              >
                                <RotateCw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Non posizionate section */}
                <div className="mb-3">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between w-full mb-1.5 cursor-pointer"
                    onClick={() => setUnplacedOpen(!unplacedOpen)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUnplacedOpen(!unplacedOpen); }}
                  >
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      Non posizionate
                      <span className="ml-1.5 text-[10px] text-white/20">({unplaced.length})</span>
                    </span>
                    {unplaced.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); autoPositionAll(); }}
                        className="text-[9px] text-emerald-400/60 hover:text-emerald-300 transition-colors border border-emerald-500/15 rounded px-1.5 py-0.5"
                        title="Posiziona tutte automaticamente"
                      >
                        Auto tutte
                      </button>
                    )}
                    <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${unplacedOpen ? '' : '-rotate-90'}`} />
                  </div>
                  {unplacedOpen && (
                    unplaced.length === 0 ? (
                      <div className="text-[11px] text-white/15 italic py-2">
                        Tutte le stanze sono posizionate
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto admin-scrollbar">
                        {unplaced.map(room => {
                          const typeInfo = getRoomTypeInfo(room.type);
                          return (
                            <div
                              key={room.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/room-id', room.id);
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              className="group p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-grab"
                              title="Trascina sulla mappa per posizionare"
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                {/* All rooms navigation */}
                <div className="mb-3">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between w-full mb-1.5 cursor-pointer"
                    onClick={() => setAllOpen(!allOpen)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAllOpen(!allOpen); }}
                  >
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      Tutte le Stanze
                      <span className="ml-1.5 text-[10px] text-white/20">({rooms.length})</span>
                    </span>
                    <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${allOpen ? '' : '-rotate-90'}`} />
                  </div>
                  {allOpen && (
                    <div className="space-y-0.5 max-h-[300px] overflow-y-auto admin-scrollbar">
                      {rooms.map(room => {
                        const isPlaced = room.mapX != null && room.mapY != null;
                        const typeInfo = getRoomTypeInfo(room.type);
                        return (
                          <div
                            key={room.id}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors group ${
                              highlightedRoomId === room.id
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70 border border-transparent'
                            }`}
                            onClick={() => handleGotoRoom(room.id)}
                          >
                            <span className="text-sm shrink-0">{room.icon || typeInfo.icon}</span>
                            <span className="truncate min-w-0 flex-1">{room.name}</span>
                            {isPlaced && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingId(room.id); setCreating(false); }}
                                className="opacity-0 group-hover:opacity-100 text-[9px] font-medium text-cyan-400/50 hover:text-cyan-300 bg-cyan-500/5 hover:bg-cyan-500/10 rounded px-1.5 py-0.5 transition-all border border-cyan-500/10 hover:border-cyan-500/20 shrink-0"
                                title="Modifica stanza"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {!isPlaced && (
                              <span className="text-[8px] text-amber-400/50 shrink-0">OFF</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Room type legend — collapsed by default */}
                <div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between w-full mb-1.5 cursor-pointer"
                    onClick={() => setLegendOpen(!legendOpen)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLegendOpen(!legendOpen); }}
                  >
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      Legenda Tipi
                    </span>
                    <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${legendOpen ? '' : '-rotate-90'}`} />
                  </div>
                  {legendOpen && (
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
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Canvas ── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative bg-[#0a0a12] admin-scrollbar"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              // Check for corridor preset drop first
              const presetId = e.dataTransfer.getData('application/corridor-preset');
              if (presetId) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / zoom - panX;
                const y = (e.clientY - rect.top) / zoom - panY;
                let newX = Math.round(x / SNAP_GRID) * SNAP_GRID;
                let newY = Math.round(y / SNAP_GRID) * SNAP_GRID;
                const variant = resolvePreset(presetId);
                const clampW = variant?.defaultWidth ?? 180;
                const clampH = variant?.defaultHeight ?? 110;
                newX = Math.max(0, Math.min(CANVAS_W - clampW, newX));
                newY = Math.max(0, Math.min(CANVAS_H - clampH, newY));
                handleCorridorDrop(presetId, newX, newY);
                return;
              }
              // Room drop
              const roomId = e.dataTransfer.getData('application/room-id');
              if (!roomId) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / zoom - panX;
              const y = (e.clientY - rect.top) / zoom - panY;
              let newX = Math.round(x / SNAP_GRID) * SNAP_GRID;
              let newY = Math.round(y / SNAP_GRID) * SNAP_GRID;
              newX = Math.max(0, Math.min(CANVAS_W - DEFAULT_ROOM_W, newX));
              newY = Math.max(0, Math.min(CANVAS_H - DEFAULT_ROOM_H, newY));
              setRooms(prev => prev.map(r =>
                r.id === roomId ? { ...r, mapX: newX, mapY: newY } : r
              ));
              const room = rooms.find(r => r.id === roomId);
              if (room) {
                savePositions([{ ...room, mapX: newX, mapY: newY }]);
              }
              showStatus(`"${rooms.find(r => r.id === roomId)?.name ?? roomId}" posizionata!`, 'success');
            }}
            style={{ cursor: isPanning ? 'grabbing' : draggingId ? 'default' : 'grab' }}
          >
            {/* Dot grid background + transform layer */}
            <div
              data-canvas="true"
              className="absolute"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `translate(${panX * zoom}px, ${panY * zoom}px) scale(${zoom})`,
                transformOrigin: '0 0',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0',
              }}
            >
              {/* Room cards */}
              {placed.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  rooms={rooms}
                  isSelected={highlightedRoomId === room.id}
                  isDragging={draggingId === room.id}
                  showLabels={showLabels}
                  connCount={connCountMap[room.id] ?? 0}
                  onMouseDown={handleCardMouseDown}
                  onSelect={setHighlightedRoomId}
                  onEdit={(id) => { setEditingId(id); setCreating(false); }}
                  onDelete={handleDelete}
                  onHover={handleRoomHover}
                  onHoverEnd={handleRoomHoverEnd}
                />
              ))}

              {/* SVG layer 2 (above cards): connection lines + door indicators */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ zIndex: 20 }}
              >
                {connectionLines.map(line => (
                  <RoomConnectionLine
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    label={line.label}
                    isCrossLocation={line.isCrossLocation}
                  />
                ))}
                {/* Door indicators */}
                {doorPositions.map(dp => {
                  const isHorizontal = dp.side === 'north' || dp.side === 'south';
                  const rw = isHorizontal ? 10 : 6;
                  const rh = isHorizontal ? 6 : 10;
                  return (
                    <g key={`door-${dp.doorId}`}>
                      <rect
                        x={dp.x - rw / 2}
                        y={dp.y - rh / 2}
                        width={rw}
                        height={rh}
                        rx={1}
                        fill={dp.color}
                        stroke="rgba(0,0,0,0.6)"
                        strokeWidth={1.5}
                        className="pointer-events-auto cursor-pointer"
                      />
                      <rect
                        x={dp.x - rw / 2 - 4}
                        y={dp.y - rh / 2 - 4}
                        width={rw + 8}
                        height={rh + 8}
                        fill="transparent"
                        className="pointer-events-auto cursor-pointer"
                      />
                      <g className="opacity-0 hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                        <rect
                          x={dp.x - 28}
                          y={dp.y - 22}
                          width={56}
                          height={14}
                          rx={3}
                          fill="rgba(0,0,0,0.9)"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth={0.5}
                        />
                        <text
                          x={dp.x}
                          y={dp.y - 12}
                          textAnchor="middle"
                          className="fill-white/70"
                          style={{ fontSize: '8px', fontFamily: 'system-ui' }}
                        >
                          {DOOR_STATE_LABELS[dp.state] ?? dp.state}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* ── Minimap ── */}
            <RoomMinimap
              rooms={placed}
              zoom={zoom}
              panX={panX}
              panY={panY}
              containerW={containerSize.w}
              containerH={containerSize.h}
              selectedId={highlightedRoomId}
              onGoto={handleMinimapGoto}
            />

            {/* Empty state */}
            {rooms.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <span className="text-4xl mb-3">🏚️</span>
                <span className="text-sm">Nessuna stanza trovata</span>
                <span className="text-xs mt-1">Clicca &quot;Aggiungi Stanza&quot; per iniziare</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 px-3 sm:px-4 py-2.5 border-t border-white/[0.06] bg-black/95 backdrop-blur flex items-center">
          <span className="text-[12px] text-white/25">
            {rooms.length} stanze · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
          </span>
        </div>
      </div>

      {/* ── Room Content Tooltip (fixed position, outside canvas transform) ── */}
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
            <div className="p-2 space-y-2 max-h-56 overflow-y-auto admin-scrollbar">
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
                            <span className="text-white/30 shrink-0">×{item.quantity}</span>
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
                          <span className="text-white/70 truncate">{lookup?.name || enemyId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* NPCs */}
              {tooltipData.npcIds.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-wider mb-1">
                    🗣️ NPC ({tooltipData.npcIds.length})
                  </div>
                  <div className="space-y-0.5">
                    {tooltipData.npcIds.map((npcId, i) => {
                      const lookup = npcsLookup[npcId];
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                          <span className="shrink-0">{lookup?.icon || '🧑'}</span>
                          <span className="text-white/70 truncate">{lookup?.name || npcId}</span>
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

      {/* ── CRUD Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="z-[120] max-w-[95vw] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-y-auto admin-scrollbar">
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
            fields={
              !creating && editingId && rooms.find(r => r.id === editingId)?.type === 'corridor'
                ? roomFormFields.map(f => f.key === 'type'
                    ? { ...f, options: ['corridor'], disabled: true, helpText: 'I corridoi hanno tipo fisso' }
                    : f
                  )
                : roomFormFields
            }
            initialData={creating ? { locationId, type: 'normal', searchChance: 70, searchMax: 100 } : editingData}
            onSubmit={creating ? handleCreate : handleUpdate}
            onCancel={handleDialogClose}
            submitLabel={creating ? 'Crea Stanza' : 'Salva Modifiche'}
            isEdit={!creating}
            activeTab="rooms"
          />
          {/* Porte section — only in edit mode */}
          {!creating && editingId && (() => {
            const editRoom = rooms.find(r => r.id === editingId);
            if (!editRoom) return null;
            const hasDoors = editRoom._doors && editRoom._doors.length > 0;
            return (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    🚪 Porte {hasDoors ? `(${editRoom._doors.length})` : ''}
                  </h4>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.1] transition-colors"
                        >
                          <CircleHelp className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="start"
                        className="z-[130] max-w-xs p-3 bg-zinc-900 border border-white/[0.1] text-white"
                      >
                        <p className="text-[11px] font-semibold text-white/80 mb-2">Stati delle porte</p>
                        <div className="space-y-2">
                          {DOOR_STATE_ORDER.map(stateKey => {
                            const info = DOOR_STATE_HELP[stateKey];
                            if (!info) return null;
                            const color = DOOR_STATE_COLORS[stateKey] ?? '#666';
                            return (
                              <div key={stateKey} className="flex gap-2">
                                <span className="text-sm shrink-0">{info.icon}</span>
                                <div>
                                  <span className="text-[10px] font-semibold" style={{ color }}>{info.title}</span>
                                  <p className="text-[9px] text-white/50 leading-relaxed">{info.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {/* Connection UI: Location + Room selects + Side selects */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <select
                    className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 rounded px-2 py-1 text-emerald-300/70 min-w-[120px] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {allLocations.map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-black text-white">{loc.id === locationId ? `📍 ${loc.name}` : `🌐 ${loc.name}`}</option>
                    ))}
                  </select>
                  <select
                    className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 rounded px-2 py-1 text-emerald-300/70 flex-1 min-w-[120px] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    id="new-door-target"
                    defaultValue=""
                  >
                    <option value="" className="bg-black text-white">— Seleziona stanza —</option>
                    {(roomsByLocation[selectedLocationId] ?? [])
                      .filter(r => r.id !== editingId && !editRoom._doors?.some(d => d.fromRoomId === r.id || d.toRoomId === r.id))
                      .map(r => (
                        <option key={r.id} value={r.id} className="bg-black text-white">{r.name}</option>
                      ))
                    }
                  </select>
                  <select
                    className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1.5 py-1 text-emerald-300/70 min-w-[70px] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    id="new-door-from-side"
                    defaultValue=""
                  >
                    <option value="" className="bg-black text-white">Da</option>
                    <option value="north" className="bg-black text-white">Nord</option>
                    <option value="south" className="bg-black text-white">Sud</option>
                    <option value="east" className="bg-black text-white">Est</option>
                    <option value="west" className="bg-black text-white">Ovest</option>
                  </select>
                  <select
                    className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1.5 py-1 text-emerald-300/70 min-w-[70px] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    id="new-door-to-side"
                    defaultValue=""
                  >
                    <option value="" className="bg-black text-white">A</option>
                    <option value="north" className="bg-black text-white">Nord</option>
                    <option value="south" className="bg-black text-white">Sud</option>
                    <option value="east" className="bg-black text-white">Est</option>
                    <option value="west" className="bg-black text-white">Ovest</option>
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[10px] gap-1 h-6 bg-emerald-600/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-40"
                    disabled={connectLoading}
                    onClick={() => {
                      const targetSel = document.getElementById('new-door-target') as HTMLSelectElement;
                      const fromSideSel = document.getElementById('new-door-from-side') as HTMLSelectElement;
                      const toSideSel = document.getElementById('new-door-to-side') as HTMLSelectElement;
                      if (!targetSel || !targetSel.value || !editingId) return;
                      const toRoomId = targetSel.value;
                      const fromSide = fromSideSel?.value || undefined;
                      const toSide = toSideSel?.value || undefined;
                      createDoor(editingId, toRoomId, fromSide, toSide);
                      // Reset selects
                      targetSel.value = '';
                      if (fromSideSel) fromSideSel.value = '';
                      if (toSideSel) toSideSel.value = '';
                    }}
                  >
                    {connectLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                    Connetti
                  </Button>
                </div>
                {/* Pending doors — fully editable */}
                {pendingDoors.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    <span className="text-[9px] text-amber-400/50 uppercase tracking-wider font-bold">In attesa ({pendingDoors.length})</span>
                    {pendingDoors.map((pd, idx) => {
                      const toRoom = rooms.find(r => r.id === pd.toRoomId);
                      const pdColor = DOOR_STATE_COLORS[pd.state] ?? DOOR_STATE_COLORS.open;
                      return (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                          <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: pdColor }} />
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Row 1: Room name + state badge + side selects */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-amber-200/80 font-medium truncate">
                                → {toRoom?.name ?? pd.toRoomId}
                              </span>
                              <select
                                value={pd.state}
                                onChange={(e) => updatePendingDoor(idx, { state: e.target.value })}
                                className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1 py-px text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                              >
                                {DOOR_STATE_ORDER.map(s => (
                                  <option key={s} value={s} className="bg-black text-white">{DOOR_STATE_LABELS[s] ?? s}</option>
                                ))}
                              </select>
                              <select
                                value={pd.fromSide || ''}
                                onChange={(e) => updatePendingDoor(idx, { fromSide: e.target.value })}
                                className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1 py-px text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                              >
                                {SIDE_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>
                                ))}
                              </select>
                              <span className="text-[8px] text-white/15">→</span>
                              <select
                                value={pd.toSide || ''}
                                onChange={(e) => updatePendingDoor(idx, { toSide: e.target.value })}
                                className="text-[9px] bg-emerald-950/40 border border-emerald-500/20 rounded px-1 py-px text-emerald-300/70 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                              >
                                {SIDE_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>
                                ))}
                              </select>
                            </div>
                            {/* Key item picker — only for key_locked state */}
                            {pd.state === 'key_locked' && (
                              <PendingDoorKeyPicker
                                requiredItemId={pd.requiredItemId}
                                onChange={(itemId) => updatePendingDoor(idx, { requiredItemId: itemId })}
                              />
                            )}
                            {/* Locked message for locked states */}
                            {(pd.state === 'key_locked' || pd.state === 'locked' || pd.state === 'inaccessible') && (
                              <input
                                type="text"
                                placeholder={pd.state === 'key_locked'
                                  ? '💬 Messaggio se il giocatore non ha la chiave...'
                                  : '💬 Messaggio quando bloccata...'}
                                value={pd.lockedMessage || ''}
                                onChange={(e) => updatePendingDoor(idx, { lockedMessage: e.target.value })}
                                className="w-full text-[9px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] italic"
                              />
                            )}
                            {/* State description */}
                            <span className="text-[8px] text-white/20 block">{DOOR_STATE_DESCRIPTIONS[pd.state] ?? ''}</span>
                          </div>
                          {/* Delete pending door */}
                          <button
                            type="button"
                            onClick={() => setPendingDoors(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-amber-400/30 hover:text-red-300 transition-colors shrink-0"
                            title="Rimuovi"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!(hasDoors || pendingDoors.length > 0) && (
                  <p className="text-[10px] text-white/20 italic px-1">Nessuna porta collegata. Usa il selettore sopra per collegare questa stanza.</p>
                )}
                {(hasDoors || pendingDoors.length > 0) && (
                <div className="space-y-1.5 max-h-64 overflow-y-auto admin-scrollbar">
                  {editRoom._doors.map(door => (
                    <DoorCard
                      key={door.id}
                      door={door}
                      editRoomId={editRoom.id}
                      onUpdate={updateDoor}
                      onDelete={deleteDoor}
                    />
                  ))}
                </div>
                )}
              </div>
            );
          })()}
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
      {/* ── Controls Dialog ── */}
      <Dialog open={controlsDialogOpen} onOpenChange={setControlsDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm text-white/90">🎮 Controlli Mappa Stanze</DialogTitle>
            <DialogDescription className="text-[11px] text-white/40">Come usare l'editor delle stanze</DialogDescription>
          </DialogHeader>
          <div className="text-[12px] text-white/60 space-y-3 py-2">
            <div className="flex items-start gap-2">
              <span className="text-base">🖱️</span>
              <div><span className="text-white/80 font-medium">Click sinistro</span> — sposta la mappa</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">⬆️</span>
              <div><span className="text-white/80 font-medium">Trascina</span> — sposta una stanza (usando la maniglia)</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">🔍</span>
              <div><span className="text-white/80 font-medium">Scroll</span> — zoom</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">📋</span>
              <div><span className="text-white/80 font-medium">Trascina dalla sidebar</span> — posiziona sulla mappa</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">📍</span>
              <div><span className="text-white/80 font-medium">Clicca nella sidebar "Tutte"</span> — centra sulla stanza</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
