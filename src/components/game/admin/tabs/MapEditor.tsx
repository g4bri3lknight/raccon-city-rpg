'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Save, RefreshCw, Loader2, Lock, Plus, Pencil, Trash2, Upload, MapPin, DoorOpen,
  ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronLeft, ChevronDown, Layers, Grid3x3,
  Link2, MousePointer2, Navigation, Crosshair, X, PanelLeftClose, PanelLeft, GripVertical, Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { SEED_BANNERS } from '@/components/game/admin/config/seedBanners';
import RoomEditorPanel from '@/components/game/admin/tabs/RoomEditorPanel';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface LocationData {
  id: string;
  name: string;
  mapRow: number | null;
  mapCol: number | null;
  mapX: number | null;
  mapY: number | null;
  mapIcon: string | null;
  mapDanger: number;
  mapDangerAuto: boolean;
  nextLocations: string[];
  lockedLocations: { locationId: string; requiredItemId: string }[];
  isBossArea: boolean;
}

type FullLocationData = Record<string, unknown>;

interface ConnectionInfo {
  id: string;
  name: string;
  locked: boolean;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const CANVAS_W = 3000;
const CANVAS_H = 2000;
const GRID_DOT_SPACING = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;
const CARD_W = 172;
const CARD_H = 84;
const SNAP_GRID = 20;

const ENDPOINT = '/api/admin/locations';
const LOCATION_SEED_ENDPOINT = '/api/admin/seed-locations';

// Form fields without mapCol/mapRow (managed via canvas)
const locationFormFields = FIELD_MAP.locations.filter(
  f => f.key !== 'mapCol' && f.key !== 'mapRow'
);

const dangerBorderColors = [
  'border-gray-600/50',
  'border-yellow-600/60',
  'border-orange-600/60',
  'border-red-600/60',
];

const dangerBgColors = [
  'bg-gray-800/20',
  'bg-yellow-900/10',
  'bg-orange-900/10',
  'bg-red-900/10',
];

const dangerBadgeColors = [
  'border-gray-700/40 text-gray-400 bg-gray-800/40',
  'border-yellow-700/40 text-yellow-400 bg-yellow-900/20',
  'border-orange-700/40 text-orange-400 bg-orange-900/20',
  'border-red-700/40 text-red-400 bg-red-900/20',
];

const dangerLabels = ['Sicura', 'Moderata', 'Pericolosa', 'Mortale'];

const ARRAY_TYPES = new Set([
  'tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs',
  'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices',
  'trade-inventory', 'effects-editor', 'item-box-defaults',
]);

// ═══════════════════════════════════════════════════════════
// Minimap Component
// ═══════════════════════════════════════════════════════════
function Minimap({
  locations,
  zoom,
  panX,
  panY,
  containerW,
  containerH,
  selectedId,
  onGoto,
}: {
  locations: LocationData[];
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
        {/* Location dots */}
        {locations.map(loc => {
          if (loc.mapX == null || loc.mapY == null) return null;
          const x = loc.mapX * scale + (CARD_W / 2) * scale;
          const y = loc.mapY * scale + (CARD_H / 2) * scale;
          const isSelected = loc.id === selectedId;
          return (
            <g key={loc.id}>
              {isSelected && (
                <circle cx={x} cy={y} r={5} fill="rgba(16,185,129,0.3)" />
              )}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 3 : 2}
                fill={isSelected ? '#34d399' : 'rgba(255,255,255,0.5)'}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Connection Line Label (tooltip on hover)
// ═══════════════════════════════════════════════════════════
function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  locked,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  locked: boolean;
  label: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Offset perpendicular for slight curve
  const dist = Math.sqrt(dx * dx + dy * dy);
  const cpx = mx + (dy / dist) * dist * 0.12;
  const cpy = my - (dx / dist) * dist * 0.12;
  // Arrow angle
  const angle = Math.atan2(dy, dx);
  const arrowLen = 10;
  const arrowX1 = x2 - arrowLen * Math.cos(angle - 0.35);
  const arrowY1 = y2 - arrowLen * Math.sin(angle - 0.35);
  const arrowX2 = x2 - arrowLen * Math.cos(angle + 0.35);
  const arrowY2 = y2 - arrowLen * Math.sin(angle + 0.35);

  return (
    <g className="group/conn">
      <defs>
        <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={locked ? 'rgba(245,158,11,0.4)' : 'rgba(52,211,153,0.35)'} />
          <stop offset="100%" stopColor={locked ? 'rgba(245,158,11,0.6)' : 'rgba(52,211,153,0.55)'} />
        </linearGradient>
      </defs>
      {/* Main line */}
      <path
        d={`M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`}
        fill="none"
        stroke={locked ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.25)'}
        strokeWidth={locked ? 2 : 1.5}
        strokeDasharray={locked ? '6,3' : 'none'}
      />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={locked ? 'rgba(245,158,11,0.5)' : 'rgba(52,211,153,0.4)'}
      />
      {/* Hover hotspot for label */}
      <circle cx={mx} cy={my} r={30} fill="transparent" className="cursor-pointer" />
      {/* Label (show on hover) */}
      <g className="opacity-0 group-hover/conn:opacity-100 transition-opacity duration-150 pointer-events-none">
        <rect
          x={mx - 40}
          y={my - 20}
          width={80}
          height={16}
          rx={4}
          fill="rgba(0,0,0,0.85)"
          stroke={locked ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.3)'}
          strokeWidth={0.5}
        />
        <text
          x={mx}
          y={my - 10}
          textAnchor="middle"
          className="fill-white/70"
          style={{ fontSize: '9px', fontFamily: 'system-ui' }}
        >
          {locked ? '🔒 ' : ''}{label.length > 12 ? label.slice(0, 12) + '…' : label}
        </text>
      </g>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
// Location Card (absolutely positioned on canvas)
// ═══════════════════════════════════════════════════════════
function LocationCard({
  loc,
  conns,
  dangerLevel,
  isSelected,
  isDragging,
  showLabels,
  onMouseDown,
  onSelect,
  onOpenRooms,
  onEdit,
  onDelete,
}: {
  loc: LocationData;
  conns: ConnectionInfo[];
  dangerLevel: number;
  isSelected: boolean;
  isDragging: boolean;
  showLabels: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
  onOpenRooms: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`
        absolute rounded-lg border select-none transition-shadow duration-150 flex flex-col overflow-hidden
        ${dangerBorderColors[dangerLevel]} ${dangerBgColors[dangerLevel]}
        ${isSelected
          ? 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/10'
          : 'hover:shadow-md hover:shadow-black/30'
        }
        ${isDragging ? 'z-50 shadow-xl shadow-black/50 scale-105 ring-2 ring-emerald-400/40' : 'z-10'}
      `}
      style={{
        left: loc.mapX ?? 0,
        top: loc.mapY ?? 0,
        width: CARD_W,
        height: CARD_H,
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-drag-handle]')) return;
        onSelect(loc.id);
      }}
    >
      {/* Drag handle strip at top */}
      <div
        data-drag-handle="true"
        className="flex items-center justify-center h-3.5 cursor-grab active:cursor-grabbing rounded-t-lg bg-white/[0.04] hover:bg-white/[0.08] border-b border-white/[0.06] select-none"
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, loc.id); }}
      >
        <GripVertical className="w-2.5 h-2.5 text-white/20" />
      </div>
      {/* Card content */}
      <div className="flex flex-col h-full p-2 gap-0.5 flex-1 min-h-0">
        {/* Top row: icon + name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base leading-none shrink-0">{loc.mapIcon || '📍'}</span>
          <span className="text-[11px] font-bold text-white/80 truncate min-w-0 flex-1 leading-tight">
            {loc.name}
          </span>
          {loc.isBossArea && (
            <span className="text-[8px] text-red-400 font-black shrink-0 bg-red-500/15 px-1 py-0.5 rounded border border-red-500/20">
              BOSS
            </span>
          )}
        </div>

        {/* Danger badge + connection count */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[8px] px-1.5 py-px rounded-sm border font-medium ${dangerBadgeColors[dangerLevel]}`}
            title={loc.mapDangerAuto
              ? `Pericolo: ${dangerLabels[dangerLevel]} (Automatico)`
              : `Pericolo: ${dangerLabels[dangerLevel]}`}
          >
            {loc.mapDangerAuto && <span className="opacity-60">⚙</span>}
            {dangerLabels[dangerLevel]}
          </span>
          {showLabels && conns.length > 0 && (
            <span className="text-[8px] px-1 py-px rounded-sm bg-white/[0.05] text-white/35 border border-white/[0.08]">
              {conns.length} colleg.
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-auto pt-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenRooms(loc.id); }}
            className={`flex items-center gap-0.5 text-[9px] font-medium rounded px-1.5 py-0.5 transition-colors border
              ${isSelected
                ? 'text-emerald-300 border-emerald-500/40 bg-emerald-900/30'
                : 'text-emerald-400/60 hover:text-emerald-300 border-emerald-500/10 hover:border-emerald-500/25 bg-black/40'
              }`}
            title="Gestisci stanze"
          >
            <DoorOpen className="w-2.5 h-2.5" />
            <span>Stanze</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(loc.id); }}
            className="flex items-center gap-0.5 text-[9px] font-medium text-cyan-400/60 hover:text-cyan-300 bg-black/40 rounded px-1.5 py-0.5 transition-colors border border-cyan-500/10 hover:border-cyan-500/25"
            title="Modifica"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(loc.id); }}
            className="flex items-center gap-0.5 text-[9px] font-medium text-red-400/50 hover:text-red-300 bg-black/40 rounded px-1.5 py-0.5 transition-colors border border-red-500/10 hover:border-red-500/25"
            title="Elimina"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function MapEditor() {
  // ── State ──
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [fullData, setFullData] = useState<Record<string, FullLocationData>>({});
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);

  // Canvas controls — restore from localStorage
  const MAP_VIEW_KEY = 'mapEditor-view';
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MAP_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).zoom ?? 0.6; } catch { /* ignore */ } }
    }
    return 0.6;
  });
  const [panX, setPanX] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MAP_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).panX ?? 0; } catch { /* ignore */ } }
    }
    return 0;
  });
  const [panY, setPanY] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MAP_VIEW_KEY);
      if (saved) { try { return JSON.parse(saved).panY ?? 0; } catch { /* ignore */ } }
    }
    return 0;
  });
  const mapViewRestored = useRef(false);

  // Debounced save of map view state to localStorage
  const mapViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMapView = useCallback((z: number, px: number, py: number) => {
    if (mapViewTimeoutRef.current) clearTimeout(mapViewTimeoutRef.current);
    mapViewTimeoutRef.current = setTimeout(() => {
      try { localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ zoom: z, panX: px, panY: py })); } catch { /* ignore */ }
    }, 300);
  }, []);

  // Save view state when pan/zoom changes
  useEffect(() => {
    saveMapView(zoom, panX, panY);
  }, [zoom, panX, panY, saveMapView]);

  // Drag state (mouse-based, NOT HTML drag/drop)
  const dragRef = useRef<{
    locId: string;
    startMouseX: number;
    startMouseY: number;
    startLocX: number;
    startLocY: number;
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
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [unplacedOpen, setUnplacedOpen] = useState(true);
  const [allOpen, setAllOpen] = useState(false);
  const [controlsDialogOpen, setControlsDialogOpen] = useState(false);

  // Dialog
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const dialogOpen = creating || editingId !== null;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  // Track container dimensions for minimap
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

  // ── Fetch locations ──
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      const locs: LocationData[] = data.map(d => ({
        id: String(d.id),
        name: String(d.name ?? ''),
        mapRow: d.mapRow != null ? Number(d.mapRow) : null,
        mapCol: d.mapCol != null ? Number(d.mapCol) : null,
        mapX: d.mapX != null ? Number(d.mapX) : null,
        mapY: d.mapY != null ? Number(d.mapY) : null,
        mapIcon: d.mapIcon ? String(d.mapIcon) : null,
        mapDanger: typeof d.mapDanger === 'number' ? d.mapDanger : 0,
        mapDangerAuto: !!d.mapDangerAuto,
        nextLocations: (() => { try { return typeof d.nextLocations === 'string' ? JSON.parse(d.nextLocations) : (d.nextLocations as string[] ?? []); } catch { return []; } })(),
        lockedLocations: (() => { try { return typeof d.lockedLocations === 'string' ? JSON.parse(d.lockedLocations) : (d.lockedLocations ?? []); } catch { return []; } })(),
        isBossArea: !!d.isBossArea,
      }));
      setLocations(locs);
      const fd: Record<string, FullLocationData> = {};
      for (const d of data) {
        fd[String(d.id)] = { ...d };
      }
      setFullData(fd);
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // ── Derived data ──
  const placed = useMemo(
    () => locations.filter(l => l.mapX != null && l.mapY != null),
    [locations]
  );
  const unplaced = useMemo(
    () => locations.filter(l => l.mapX == null || l.mapY == null),
    [locations]
  );

  // ── Connections helper ──
  const getConnections = useCallback((loc: LocationData): ConnectionInfo[] => {
    const result: ConnectionInfo[] = [];
    const seen = new Set<string>();
    for (const nextId of loc.nextLocations) {
      if (seen.has(nextId)) continue;
      seen.add(nextId);
      const nextLoc = locations.find(l => l.id === nextId);
      if (!nextLoc) continue;
      const lock = loc.lockedLocations.find(ll => ll.locationId === nextId);
      result.push({ id: nextId, name: nextLoc.name, locked: !!lock });
    }
    for (const otherLoc of locations) {
      if (otherLoc.id === loc.id) continue;
      if (otherLoc.nextLocations.includes(loc.id) && !seen.has(otherLoc.id)) {
        seen.add(otherLoc.id);
        const lock = otherLoc.lockedLocations.find(ll => ll.locationId === loc.id);
        result.push({ id: otherLoc.id, name: otherLoc.name, locked: !!lock });
      }
    }
    return result;
  }, [locations]);

  // ── Build connection lines for SVG ──
  const connectionLines = useMemo(() => {
    if (!showConnections) return [];
    const lines: {
      x1: number; y1: number; x2: number; y2: number;
      locked: boolean; label: string; key: string;
    }[] = [];
    const seenPairs = new Set<string>();
    for (const loc of placed) {
      const conns = getConnections(loc);
      for (const conn of conns) {
        const target = locations.find(l => l.id === conn.id);
        if (!target || target.mapX == null || target.mapY == null) continue;
        const pairKey = [loc.id, target.id].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        lines.push({
          x1: (loc.mapX ?? 0) + CARD_W / 2,
          y1: (loc.mapY ?? 0) + CARD_H / 2,
          x2: (target.mapX ?? 0) + CARD_W / 2,
          y2: (target.mapY ?? 0) + CARD_H / 2,
          locked: conn.locked,
          label: conn.name,
          key: pairKey,
        });
      }
    }
    return lines;
  }, [placed, locations, showConnections, getConnections]);

  // ── Save positions (batch, debounced after drag) ──
  const savePositions = useCallback(async (locsToSave: LocationData[]) => {
    const positions = locsToSave.map(loc => ({
      id: loc.id,
      mapX: loc.mapX,
      mapY: loc.mapY,
      mapRow: loc.mapRow,
      mapCol: loc.mapCol,
    }));
    try {
      const res = await adminFetch('/api/admin/locations/batch-positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Salvate ${positions.length} posizioni!`, 'success');
    } catch (err) {
      showStatus(`Errore salvataggio: ${err}`, 'error');
      console.error('[MapEditor] Save error:', err);
    }
  }, [showStatus]);

  // ── Auto-position unplaced locations in grid pattern ──
  const autoPositionAll = useCallback(() => {
    const cols = 5;
    const startX = 100;
    const startY = 100;
    const spacingX = CARD_W + 40;
    const spacingY = CARD_H + 40;

    const updates: Record<string, { mapX: number; mapY: number }> = {};
    unplaced.forEach((loc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      updates[loc.id] = {
        mapX: startX + col * spacingX,
        mapY: startY + row * spacingY,
      };
    });

    // Compute new positioned locations and save them
    const newlyPositioned = unplaced.map((loc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { ...loc, mapX: startX + col * spacingX, mapY: startY + row * spacingY };
    });

    setLocations(prev =>
      prev.map(l => {
        const u = updates[l.id];
        if (!u) return l;
        return { ...l, mapX: u.mapX, mapY: u.mapY };
      })
    );

    // Save positions after state update propagates
    setTimeout(() => {
      savePositions(newlyPositioned);
    }, 100);
  }, [unplaced, savePositions]);

  const autoPositionOne = useCallback((locId: string) => {
    const existingPositions = placed.map(l => ({ x: l.mapX!, y: l.mapY! }));
    let targetX = 100;
    let targetY = 100;
    const spacingX = CARD_W + 40;
    const spacingY = CARD_H + 40;
    const cols = 5;

    // Find first empty slot
    let slot = 0;
    while (true) {
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const px = 100 + col * spacingX;
      const py = 100 + row * spacingY;
      const occupied = existingPositions.some(p =>
        Math.abs(p.x - px) < 10 && Math.abs(p.y - py) < 10
      );
      if (!occupied) {
        targetX = px;
        targetY = py;
        break;
      }
      slot++;
      if (slot > 200) break; // Safety limit
    }

    setLocations(prev =>
      prev.map(l =>
        l.id === locId ? { ...l, mapX: targetX, mapY: targetY } : l
      )
    );
  }, [placed]);

  const debouncedSave = useCallback((locId: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const loc = locations.find(l => l.id === locId);
    if (!loc) return;
    saveTimeoutRef.current = setTimeout(() => {
      savePositions([loc]);
    }, 600);
  }, [locations, savePositions]);

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    await savePositions(locations);
    setSaving(false);
  }, [locations, savePositions]);

  // ── Mouse drag on canvas ──
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Left-click or middle-click on empty canvas → start panning
    if ((e.button === 0 || e.button === 1) && (e.target as HTMLElement).dataset.canvas === 'true') {
      e.preventDefault();
      setSelectedLocationId(null);
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
    // Panning
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startMouseX;
      const dy = e.clientY - panRef.current.startMouseY;
      setPanX(panRef.current.startPanX + dx / zoom);
      setPanY(panRef.current.startPanY + dy / zoom);
      return;
    }

    // Dragging a location
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startMouseX) / zoom;
      const dy = (e.clientY - dragRef.current.startMouseY) / zoom;
      let newX = dragRef.current.startLocX + dx;
      let newY = dragRef.current.startLocY + dy;

      // Snap to grid
      if (snapToGrid) {
        newX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
        newY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
      }

      // Clamp to canvas bounds
      newX = Math.max(0, Math.min(CANVAS_W - CARD_W, newX));
      newY = Math.max(0, Math.min(CANVAS_H - CARD_H, newY));

      const dragId = dragRef.current.locId;
      setLocations(prev =>
        prev.map(l =>
          l.id === dragId ? { ...l, mapX: newX, mapY: newY } : l
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

    // End dragging — auto-save
    if (dragRef.current) {
      debouncedSave(dragRef.current.locId);
      setDraggingId(null);
      dragRef.current = null;
    }
  }, [debouncedSave]);

  const handleCardMouseDown = useCallback((e: React.MouseEvent, locId: string) => {
    e.stopPropagation();
    const loc = locations.find(l => l.id === locId);
    if (!loc || loc.mapX == null || loc.mapY == null) return;

    dragRef.current = {
      locId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startLocX: loc.mapX,
      startLocY: loc.mapY,
    };
    setDraggingId(locId);
  }, [locations]);

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
      for (const loc of placed) {
        if (loc.mapX == null || loc.mapY == null) continue;
        minX = Math.min(minX, loc.mapX);
        minY = Math.min(minY, loc.mapY);
        maxX = Math.max(maxX, loc.mapX + CARD_W);
        maxY = Math.max(maxY, loc.mapY + CARD_H);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const newZoom = 0.6;
      setZoom(newZoom);
      setPanX(rect.width / (2 * newZoom) - centerX);
      setPanY(rect.height / (2 * newZoom) - centerY);
    } else {
      setZoom(0.6);
      setPanX(0);
      setPanY(0);
    }
  }, [placed]);

  // Minimap goto
  const handleMinimapGoto = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;
    setPanX(container.clientWidth / (2 * zoom) - x);
    setPanY(container.clientHeight / (2 * zoom) - y);
  }, [zoom]);



  // ── CRUD ──
  const processFormData = (formData: Record<string, unknown>) => {
    const processed = { ...formData };
    for (const f of locationFormFields) {
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
      const NULLABLE_FIELDS = new Set(['searchMax', 'bossId', 'mapIcon', 'mapRow', 'mapCol']);
      if (processed[f.key] === '' || processed[f.key] === undefined) {
        if (NULLABLE_FIELDS.has(f.key)) {
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
      const res = await adminFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Location creata con successo!', 'success');
      setCreating(false);
      fetchLocations();
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
      showStatus('Location aggiornata con successo!', 'success');
      setEditingId(null);
      fetchLocations();
    } catch (err) {
      showStatus(`Errore aggiornamento: ${err}`, 'error');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Eliminare la location "${locations.find(l => l.id === id)?.name ?? id}"?`)) return;
    try {
      const res = await adminFetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Location eliminata!', 'success');
      if (selectedLocationId === id) setSelectedLocationId(null);
      fetchLocations();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  const handleSeedDefault = async () => {
    setSeeding(true);
    try {
      const res = await adminFetch(LOCATION_SEED_ENDPOINT, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      showStatus(result.message, 'success');
      fetchLocations();
    } catch (err) {
      showStatus(`Errore seed: ${err}`, 'error');
    } finally {
      setSeeding(false);
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
        if (raw.mapDangerAuto && 'mapDanger' in raw) {
          raw.mapDanger = '-1';
        } else if ('mapDanger' in raw) {
          raw.mapDanger = String(raw.mapDanger);
        }
        delete raw.mapDangerAuto;
        return raw;
      })()
    : {};

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  // ── Navigate to a location (center + highlight) ──
  const handleGotoLocation = useCallback((locId: string) => {
    const loc = locations.find(l => l.id === locId);
    if (!loc || loc.mapX == null || loc.mapY == null) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = loc.mapX + CARD_W / 2;
    const cy = loc.mapY + CARD_H / 2;
    setPanX(rect.width / (2 * zoom) - cx);
    setPanY(rect.height / (2 * zoom) - cy);
    setHighlightedLocationId(locId);
  }, [locations, zoom]);

  // ── Center canvas on load (only if no saved view) ──
  useEffect(() => {
    if (loading || placed.length === 0) return;
    // Skip auto-centering if we already restored from localStorage
    if (mapViewRestored.current) return;
    mapViewRestored.current = true;
    // Check if there's a saved view
    try {
      const saved = localStorage.getItem(MAP_VIEW_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.panX !== undefined && parsed.panX !== 0) return; // Already has a saved position
        if (parsed.panY !== undefined && parsed.panY !== 0) return;
      }
    } catch { /* ignore */ }
    // No saved view — center on content
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const loc of placed) {
        if (loc.mapX == null || loc.mapY == null) continue;
        minX = Math.min(minX, loc.mapX);
        minY = Math.min(minY, loc.mapY);
        maxX = Math.max(maxX, loc.mapX + CARD_W);
        maxY = Math.max(maxY, loc.mapY + CARD_H);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setPanX(rect.width / (2 * zoom) - centerX);
      setPanY(rect.height / (2 * zoom) - centerY);
    }
  }, [loading, zoom, placed]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
        <span className="ml-2 text-sm text-white/30">Caricamento mappa...</span>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <React.Fragment>
      {/* ── Rooms view (full-width) ── */}
      {selectedLocationId ? (
        <RoomEditorPanel
          locationId={selectedLocationId}
          locationName={locations.find(l => l.id === selectedLocationId)?.name ?? selectedLocationId}
          onBack={() => setSelectedLocationId(null)}
        />
      ) : (
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d14]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-white/90">🗺️ Location & Mappa</h2>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Trascina per posizionare. Zoom con scroll.
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
                onClick={fetchLocations}
                className="text-xs gap-1.5 h-7 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              {/* Seed Default */}
              <Button
                size="sm"
                variant="ghost"
                disabled={seeding}
                onClick={handleSeedDefault}
                className="text-xs gap-1.5 h-7 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/20 bg-emerald-600/10"
                title="Inserisci i dati di default"
              >
                {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span className="hidden sm:inline">Seed</span>
              </Button>
              {/* Add Location */}
              <Button
                size="sm"
                onClick={() => { setCreating(true); setEditingId(null); }}
                className="text-xs gap-1.5 h-7 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Aggiungi</span>
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

        {/* ── Seed banner ── */}
        <div className="px-4 py-1.5 flex items-center gap-2 border-b border-white/[0.04] bg-[#0d0d14]">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.06]">
            <MapPin className="w-3.5 h-3.5 text-white/20 shrink-0" />
            <p className="text-[11px] text-white/25" dangerouslySetInnerHTML={{ __html: SEED_BANNERS.locations?.description ?? '' }} />
          </div>
        </div>

        {/* ── Main content: Canvas + Sidebar ── */}
        <div className="flex-1 flex overflow-hidden relative bg-[#0a0a12]">
          {/* ── Sidebar Panel ── */}
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
                        Tutte le location sono sulla mappa
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto admin-scrollbar">
                        {unplaced.map(loc => (
                          <div
                            key={loc.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/location-id', loc.id);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-grab"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm shrink-0">{loc.mapIcon || '📍'}</span>
                              <span className="text-[11px] text-white/60 truncate min-w-0 flex-1">{loc.name}</span>
                              {loc.isBossArea && (
                                <span className="text-[8px] text-red-400 font-bold">BOSS</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* All locations navigation */}
                <div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between w-full mb-1.5 cursor-pointer"
                    onClick={() => setAllOpen(!allOpen)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAllOpen(!allOpen); }}
                  >
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      Tutte le Location
                      <span className="ml-1.5 text-[10px] text-white/20">({locations.length})</span>
                    </span>
                    <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${allOpen ? '' : '-rotate-90'}`} />
                  </div>
                  {allOpen && (
                    <div className="space-y-0.5 max-h-[300px] overflow-y-auto admin-scrollbar">
                      {locations.map(loc => {
                        const isPlaced = loc.mapX != null && loc.mapY != null;
                        return (
                          <div
                            key={loc.id}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors group ${
                              highlightedLocationId === loc.id
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70 border border-transparent'
                            }`}
                            onClick={() => handleGotoLocation(loc.id)}
                          >
                            <span className="text-sm shrink-0">{loc.mapIcon || '📍'}</span>
                            <span className="truncate min-w-0 flex-1">{loc.name}</span>
                            {isPlaced && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedLocationId(loc.id); }}
                                className="opacity-0 group-hover:opacity-100 text-[9px] font-medium text-emerald-400/50 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded px-1.5 py-0.5 transition-all border border-emerald-500/10 hover:border-emerald-500/20 shrink-0"
                                title="Apri stanze"
                              >
                                Stanze
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
              </div>
            </div>
          )}

          {/* ── Canvas container ── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative"
            style={{ cursor: isPanning ? 'grabbing' : draggingId ? 'default' : 'grab' }}
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
              const locId = e.dataTransfer.getData('application/location-id');
              if (!locId) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / zoom - panX;
              const y = (e.clientY - rect.top) / zoom - panY;
              let newX = Math.round(x / SNAP_GRID) * SNAP_GRID;
              let newY = Math.round(y / SNAP_GRID) * SNAP_GRID;
              newX = Math.max(0, Math.min(CANVAS_W - CARD_W, newX));
              newY = Math.max(0, Math.min(CANVAS_H - CARD_H, newY));
              setLocations(prev => prev.map(l =>
                l.id === locId ? { ...l, mapX: newX, mapY: newY } : l
              ));
              const loc = locations.find(l => l.id === locId);
              if (loc) {
                savePositions([{ ...loc, mapX: newX, mapY: newY }]);
              }
              showStatus(`"${locations.find(l => l.id === locId)?.name ?? locId}" posizionata!`, 'success');
            }}
          >
            {/* Transform wrapper */}
            <div
              style={{
                transform: `translate(${panX * zoom}px, ${panY * zoom}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: CANVAS_W,
                height: CANVAS_H,
                position: 'relative',
              }}
            >
              {/* Dot grid background */}
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                className="absolute inset-0 pointer-events-none"
              >
                <defs>
                  <pattern
                    id="dotGrid"
                    x="0"
                    y="0"
                    width={GRID_DOT_SPACING}
                    height={GRID_DOT_SPACING}
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotGrid)" />
              </svg>

              {/* Canvas click area (for deselecting) */}
              <div
                data-canvas="true"
                className="absolute inset-0"
              />

              {/* SVG overlay: Connection lines */}
              {showConnections && (
                <svg
                  width={CANVAS_W}
                  height={CANVAS_H}
                  className="absolute inset-0 pointer-events-none z-0"
                >
                  {/* Arrow marker defs */}
                  <defs>
                    <marker
                      id="arrowNormal"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill="rgba(52,211,153,0.4)" />
                    </marker>
                    <marker
                      id="arrowLocked"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill="rgba(245,158,11,0.4)" />
                    </marker>
                  </defs>
                  {connectionLines.map(cl => (
                    <ConnectionLine
                      key={cl.key}
                      x1={cl.x1}
                      y1={cl.y1}
                      x2={cl.x2}
                      y2={cl.y2}
                      locked={cl.locked}
                      label={cl.label}
                    />
                  ))}
                </svg>
              )}

              {/* Location cards */}
              {placed.map(loc => (
                <LocationCard
                  key={loc.id}
                  loc={loc}
                  conns={getConnections(loc)}
                  dangerLevel={loc.mapDanger ?? 0}
                  isSelected={highlightedLocationId === loc.id}
                  isDragging={draggingId === loc.id}
                  showLabels={showLabels}
                  onMouseDown={handleCardMouseDown}
                  onSelect={setHighlightedLocationId}
                  onOpenRooms={setSelectedLocationId}
                  onEdit={(id) => { setEditingId(id); setCreating(false); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* ── Minimap ── */}
            <Minimap
              locations={placed}
              zoom={zoom}
              panX={panX}
              panY={panY}
              containerW={containerSize.w}
              containerH={containerSize.h}
              selectedId={highlightedLocationId}
              onGoto={handleMinimapGoto}
            />

            {/* Canvas info overlay (top-left) */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
              <div className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/[0.08] text-[10px] text-white/30 font-mono">
                {placed.length} posizionat{placed.length === 1 ? 'a' : 'e'} · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
              </div>
              {isPanning && (
                <div className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-[10px] text-emerald-300">
                  🖐️ Pan attivo
                </div>
              )}
            </div>

            {/* Coordinates of selected location */}
            {highlightedLocationId && !selectedLocationId && (() => {
              const sel = locations.find(l => l.id === highlightedLocationId);
              if (!sel || sel.mapX == null || sel.mapY == null) return null;
              return (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="px-3 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/[0.1] text-[11px] text-white/50 font-mono">
                    📍 {sel.name} <span className="text-white/30 ml-2">({sel.mapX}, {sel.mapY})</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 px-3 sm:px-4 py-2 border-t border-white/[0.06] bg-[#0d0d14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/25">
              {locations.length} location{locations.length !== 1 ? 's' : ''} · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
            </span>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-2">
              {dangerLabels.map((label, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] text-white/20">
                  <span className={`w-2.5 h-2.5 rounded-sm border ${dangerBorderColors[i]} ${dangerBgColors[i]}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="text-xs gap-1.5 h-7 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salva Posizioni
          </Button>
        </div>
      </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      {!selectedLocationId && (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-[#0d0d14] border-white/[0.1] text-white max-w-[95vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-base">
                {editingId ? `Modifica: ${editingId}` : 'Nuova Location'}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {editingId
                  ? 'Modifica i campi e premi Salva per aggiornare'
                  : 'Compila i campi per creare una nuova location'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
              <EntityForm
                fields={locationFormFields}
                initialData={
                  editingId
                    ? editingData
                    : Object.fromEntries(locationFormFields.map(f => [f.key, f.defaultValue ?? '']))
                }
                onSubmit={editingId ? handleUpdate : handleCreate}
                onCancel={handleDialogClose}
                submitLabel={dialogSaving ? 'Salvataggio...' : (editingId ? 'Salva Modifiche' : 'Crea Location')}
                isEdit={!!editingId}
                activeTab="locations"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Controls Dialog ── */}
      <Dialog open={controlsDialogOpen} onOpenChange={setControlsDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm text-white/90">🎮 Controlli Mappa</DialogTitle>
            <DialogDescription className="text-[11px] text-white/40">Come usare l'editor della mappa</DialogDescription>
          </DialogHeader>
          <div className="text-[12px] text-white/60 space-y-3 py-2">
            <div className="flex items-start gap-2">
              <span className="text-base">🖱️</span>
              <div><span className="text-white/80 font-medium">Click sinistro</span> — sposta la mappa</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">⬆️</span>
              <div><span className="text-white/80 font-medium">Trascina</span> — sposta una card (usando la maniglia)</div>
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
              <div><span className="text-white/80 font-medium">Clicca nella sidebar "Tutte"</span> — centra sulla location</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
