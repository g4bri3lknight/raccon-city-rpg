'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, RefreshCw, Loader2, GripVertical, Eye, Link,
  ArrowRight, ArrowDown, ArrowUp, ArrowLeft, Plus, Pencil, Trash2, MapPin,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { ROOM_TYPES, getRoomTypeInfo, getRoomTypeLabel } from '@/components/game/admin/config/roomTypes';

// ── Types ──
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
  nextRooms: string[];
  lockedRooms: { roomId: string; requiredItemId: string }[];
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
}

// Full raw data for editing (all DB fields)
type FullRoomData = Record<string, unknown>;

interface GridCell {
  row: number;
  col: number; // -1, 0, 1, 2
  room: RoomData | null;
}

// ── Constants ──
const GRID_ROWS = 5;
const ROOM_GRID_COLS = [-1, 0, 1, 2];
const COL_LABELS: Record<number, string> = { [-1]: 'A', 0: 'B', 1: 'C', 2: 'D' };
const ENDPOINT = '/api/admin/rooms';

// Form fields without mapCol/mapRow/sortOrder (managed via grid)
const roomFormFields = FIELD_MAP.rooms.filter(
  f => f.key !== 'mapCol' && f.key !== 'mapRow' && f.key !== 'sortOrder'
);

const ARRAY_TYPES = new Set([
  'tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs',
  'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices',
  'trade-inventory', 'effects-editor', 'item-box-defaults',
]);

const ROOM_NULLABLE_FIELDS = new Set(['searchChance', 'searchMax']);

// ── Helpers ──
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '')
    .replace(/_+/g, '_');
}

/** Tailwind classes for room type badges */
function getRoomTypeBadgeClasses(color: string): string {
  const map: Record<string, string> = {
    gray:    'border-gray-700/40 text-gray-400 bg-gray-800/40',
    emerald: 'border-emerald-700/40 text-emerald-400 bg-emerald-900/20',
    red:     'border-red-700/40 text-red-400 bg-red-900/20',
    violet:  'border-violet-700/40 text-violet-400 bg-violet-900/20',
    amber:   'border-amber-700/40 text-amber-400 bg-amber-900/20',
    cyan:    'border-cyan-700/40 text-cyan-400 bg-cyan-900/20',
    slate:   'border-slate-700/40 text-slate-400 bg-slate-800/40',
  };
  return map[color] ?? map.gray;
}

/** Tailwind classes for room type card border */
function getRoomTypeCardClasses(color: string): string {
  const map: Record<string, string> = {
    gray:    'border-gray-600/50 bg-gray-800/30',
    emerald: 'border-emerald-600/50 bg-emerald-900/20',
    red:     'border-red-600/50 bg-red-900/20',
    violet:  'border-violet-600/50 bg-violet-900/20',
    amber:   'border-amber-600/50 bg-amber-900/20',
    cyan:    'border-cyan-600/50 bg-cyan-900/20',
    slate:   'border-slate-600/50 bg-slate-800/30',
  };
  return map[color] ?? map.gray;
}

// ═══════════════════════════════════════════════════════════
// Component — Room Editor Panel
// ═══════════════════════════════════════════════════════════
export default function RoomEditorPanel({ locationId, locationName, onBack }: RoomEditorPanelProps) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [fullData, setFullData] = useState<Record<string, FullRoomData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [showUnplaced, setShowUnplaced] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Dialog state (create / edit) ──
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const dialogOpen = creating || editingId !== null;

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
        nextRooms: (() => { try { return typeof d.nextRooms === 'string' ? JSON.parse(d.nextRooms) : (d.nextRooms as string[] ?? []); } catch { return []; } })(),
        lockedRooms: (() => { try { return typeof d.lockedRooms === 'string' ? JSON.parse(d.lockedRooms) : (d.lockedRooms ?? []); } catch { return []; } })(),
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
      }));
      setRooms(rms);
      // Store full raw data for editing
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

  // ── Build grid ──
  const grid: GridCell[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (const c of ROOM_GRID_COLS) {
      const room = rooms.find(rm => rm.mapRow === r && rm.mapCol === c);
      row.push({ row: r, col: c, room: room || null });
    }
    grid.push(row);
  }

  const unplaced = rooms.filter(rm => rm.mapRow == null || rm.mapCol == null);

  // ── Connection helpers ──
  const getConnectedRoomIds = (room: RoomData): Set<string> => {
    const ids = new Set<string>();
    for (const nextId of room.nextRooms) ids.add(nextId);
    for (const other of rooms) {
      if (other.id === room.id) continue;
      if (other.nextRooms.includes(room.id)) ids.add(other.id);
    }
    return ids;
  };

  const getConnectionCount = (room: RoomData): number => {
    return getConnectedRoomIds(room).size;
  };

  const getAdjacentConnections = (room: RoomData): { right: boolean; left: boolean; down: boolean; up: boolean } => {
    const dirs = { right: false, left: false, down: false, up: false };
    if (room.mapRow == null || room.mapCol == null) return dirs;
    const connectedIds = getConnectedRoomIds(room);
    for (const other of rooms) {
      if (!connectedIds.has(other.id)) continue;
      if (other.mapRow == null || other.mapCol == null) continue;
      const dr = other.mapRow - room.mapRow;
      const dc = other.mapCol - room.mapCol;
      if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) {
        if (dc === 1) dirs.right = true;
        if (dc === -1) dirs.left = true;
        if (dr === 1) dirs.down = true;
        if (dr === -1) dirs.up = true;
      }
    }
    return dirs;
  };

  // ── Drag & Drop ──
  const handleDragStart = (e: React.DragEvent, roomId: string) => {
    setDragId(roomId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', roomId);
  };
  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ row, col });
  };
  const handleDragLeave = () => setDropTarget(null);
  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const roomId = e.dataTransfer.getData('text/plain');
    if (!roomId) return;
    const existing = rooms.find(rm => rm.mapRow === row && rm.mapCol === col);
    if (existing && existing.id !== roomId) {
      const dragged = rooms.find(rm => rm.id === roomId);
      if (dragged) {
        setRooms(prev => prev.map(rm => {
          if (rm.id === roomId) return { ...rm, mapRow: row, mapCol: col };
          if (rm.id === existing.id) return { ...rm, mapRow: dragged.mapRow, mapCol: dragged.mapCol };
          return rm;
        }));
      }
    } else {
      setRooms(prev => prev.map(rm =>
        rm.id === roomId ? { ...rm, mapRow: row, mapCol: col } : rm
      ));
    }
    setDragId(null);
    setDropTarget(null);
  };
  const handleDragEnd = () => { setDragId(null); setDropTarget(null); };

  const placeAtEmpty = (roomId: string) => {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (const c of ROOM_GRID_COLS) {
        if (!rooms.find(rm => rm.mapRow === r && rm.mapCol === c)) {
          setRooms(prev => prev.map(rm =>
            rm.id === roomId ? { ...rm, mapRow: r, mapCol: c } : rm
          ));
          return;
        }
      }
    }
  };

  // ── Save positions (batch) ──
  const handleSavePositions = async () => {
    setSaving(true);
    try {
      const positions = rooms.map(rm => ({ id: rm.id, mapRow: rm.mapRow, mapCol: rm.mapCol }));
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
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD: Create / Update / Delete ──
  const processFormData = (formData: Record<string, unknown>) => {
    const processed = { ...formData };
    for (const f of roomFormFields) {
      // Convert number fields
      if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
        processed[f.key] = Number(processed[f.key]);
      }
      // Serialize array types to JSON
      if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      // Serialize storyEvent as JSON
      if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
        processed[f.key] = JSON.stringify(processed[f.key]);
      }
      // Nullable fields
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
      // Auto-generate ID if empty: {locationId}_{name_slug}
      if (!processed.id || String(processed.id).trim() === '') {
        const name = String(processed.name ?? 'unnamed');
        processed.id = `${locationId}_${slugify(name)}`;
      }
      // Ensure locationId is set
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
    const room = rooms.find(rm => rm.id === id);
    if (!confirm(`Eliminare la stanza "${room?.name ?? id}"?`)) return;
    try {
      const res = await adminFetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Stanza eliminata!', 'success');
      fetchRooms();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  // ── Editing data (from full raw data) ──
  const editingData = editingId
    ? (() => {
        const raw = { ...(fullData[editingId] ?? {}) };
        // Parse JSON string fields into actual types for the form
        for (const key of Object.keys(raw)) {
          if (typeof raw[key] === 'string') {
            try {
              const parsed = JSON.parse(raw[key] as string);
              if (typeof parsed === 'object' && parsed !== null) {
                raw[key] = parsed;
              }
            } catch {
              // not JSON, keep as-is
            }
          }
        }
        return raw;
      })()
    : {};

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
        <span className="ml-2 text-sm text-white/30">Caricamento stanze...</span>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white/80 transition-colors"
                >
                  ← Torna alla mappa
                </button>
              )}
              <div>
                <h2 className="text-sm font-bold text-white/90">
                  🏠 Stanze — {locationName}
                </h2>
                <p className="text-[12px] text-white/35 mt-0.5">
                  Gestisci le stanze della location. Trascina per riposizionare.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConnections(!showConnections)}
                className={`text-xs gap-1.5 ${showConnections ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi frecce collegamento"
              >
                <Link className="w-3 h-3" />
                Collegamenti
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchRooms}
                className="text-xs gap-1.5 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={() => { setCreating(true); setEditingId(null); }}
                className="text-xs gap-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi Stanza
              </Button>
            </div>
          </div>

          {/* Status */}
          {statusMsg && (
            <div className={`mt-2 px-3 py-1.5 text-[12px] rounded-lg ${
              statusMsg.type === 'success' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
            }`}>
              {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}
        </div>

        {/* Content — Full Width */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 admin-scrollbar">
          {/* Column headers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2">
            {ROOM_GRID_COLS.map(c => (
              <div key={c} className="text-center text-[11px] text-white/25 font-medium uppercase tracking-wider">
                {COL_LABELS[c]}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div ref={gridRef} className="space-y-2 sm:space-y-3 relative">
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {row.map((cell) => {
                  const isDropTarget = dropTarget?.row === cell.row && dropTarget?.col === cell.col;
                  const isDragged = dragId != null && cell.room?.id === dragId;
                  const adjConns = cell.room ? getAdjacentConnections(cell.room) : {};
                  const cellKey = `${cell.row}-${cell.col}`;

                  return (
                    <div
                      key={cellKey}
                      className={`
                        group/cell relative min-h-[120px] sm:min-h-[140px] rounded-lg border-2 border-dashed transition-all duration-200
                        ${cell.room
                          ? 'border-white/[0.06] bg-white/[0.02]'
                          : isDropTarget
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]'
                        }
                        ${isDragged ? 'opacity-30' : ''}
                      `}
                      onDragOver={(e) => handleDragOver(e, cell.row, cell.col)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, cell.row, cell.col)}
                    >
                      {/* Row label */}
                      <span className="absolute -left-1 -top-1 text-[8px] text-white/15 font-mono bg-black px-1 rounded z-20">
                        R{cell.row}
                      </span>

                      {cell.room ? (
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, cell.room!.id)}
                          onDragEnd={handleDragEnd}
                          className={`
                            h-full flex flex-col p-2.5 sm:p-3 rounded-lg cursor-grab active:cursor-grabbing
                            transition-all hover:scale-[1.01] relative
                            ${getRoomTypeCardClasses(getRoomTypeInfo(cell.room.type).color)}
                          `}
                        >
                          {/* Adjacent connection arrows */}
                          {showConnections && (
                            <>
                              {adjConns.right && (
                                <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 z-10 text-emerald-400/60">
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {adjConns.left && (
                                <div className="absolute left-[-14px] top-1/2 -translate-y-1/2 z-10 text-emerald-400/60">
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {adjConns.down && (
                                <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 z-10 text-emerald-400/60">
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {adjConns.up && (
                                <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 z-10 text-emerald-400/60">
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </>
                          )}

                          {/* Room icon + name */}
                          <div className="flex items-center gap-1.5 w-full">
                            <GripVertical className="w-3 h-3 text-white/15 shrink-0" />
                            <span className="text-lg sm:text-xl leading-none shrink-0">
                              {cell.room.icon || getRoomTypeInfo(cell.room.type).icon}
                            </span>
                            <span className="text-[11px] sm:text-[12px] font-bold text-white/80 truncate min-w-0">
                              {cell.room.name}
                            </span>
                          </div>

                          {/* Room type badge + info badges */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`
                              text-[9px] px-1.5 py-0.5 rounded-sm border font-medium
                              ${getRoomTypeBadgeClasses(getRoomTypeInfo(cell.room.type).color)}
                            `}>
                              {getRoomTypeLabel(cell.room.type)}
                            </span>
                            {cell.room.enemyPool.length > 0 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm border border-red-700/30 text-red-400/70 bg-red-900/15 font-medium">
                                👾 {cell.room.enemyPool.length}
                              </span>
                            )}
                            {getConnectionCount(cell.room) > 0 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm border border-cyan-700/30 text-cyan-400/70 bg-cyan-900/15 font-medium" title={`${getConnectionCount(cell.room)} collegamenti`}>
                                🔗 {getConnectionCount(cell.room)}
                              </span>
                            )}
                          </div>

                          {/* Action buttons — flow below content, always visible, wrap on narrow cards */}
                          <div className="flex items-center gap-1.5 mt-auto pt-2 flex-wrap w-full">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingId(cell.room!.id); setCreating(false); }}
                              className="flex items-center gap-1 text-[10px] font-medium text-cyan-400/80 hover:text-cyan-300 bg-black/50 rounded-md px-2 py-1 transition-colors border border-cyan-500/15 hover:border-cyan-500/30"
                              title="Modifica stanza"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Modifica</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(cell.room!.id); }}
                              className="flex items-center gap-1 text-[10px] font-medium text-red-400/70 hover:text-red-300 bg-black/50 rounded-md px-2 py-1 transition-colors border border-red-500/15 hover:border-red-500/30"
                              title="Elimina stanza"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Elimina</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-[11px] text-white/10">
                            {isDropTarget ? '↓ Rilascia qui' : 'Vuoto'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-[10px]">
            {ROOM_TYPES.map(rt => (
              <span key={rt.value} className="flex items-center gap-1 text-white/25">
                <span className={`w-3 h-3 rounded-sm border ${getRoomTypeCardClasses(rt.color)}`} />
                {rt.label}
              </span>
            ))}
          </div>

          {/* Unplaced rooms — collapsible section below grid */}
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => setShowUnplaced(!showUnplaced)}
              className="w-full flex items-center gap-2 text-left hover:bg-white/[0.02] rounded-lg px-3 py-2 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${!showUnplaced ? '-rotate-90' : ''}`} />
              <span className="text-[12px] font-bold text-white/40 uppercase tracking-wider">
                Non posizionate ({unplaced.length})
              </span>
            </button>
            {showUnplaced && (
              <div className="mt-2">
                {unplaced.length === 0 ? (
                  <div className="text-[11px] text-white/15 italic py-4 px-3">
                    Tutte le stanze sono sulla griglia
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {unplaced.map(rm => {
                      const typeInfo = getRoomTypeInfo(rm.type);
                      const connCount = getConnectionCount(rm);
                      return (
                        <div
                          key={rm.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, rm.id)}
                          onDragEnd={handleDragEnd}
                          className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] cursor-grab active:cursor-grabbing hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Name row */}
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-3 h-3 text-white/15 shrink-0" />
                            <span className="text-base shrink-0">{rm.icon || typeInfo.icon}</span>
                            <span className="text-[12px] text-white/70 truncate min-w-0 flex-1 font-medium">{rm.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-medium shrink-0 ${getRoomTypeBadgeClasses(typeInfo.color)}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          {/* Badges */}
                          <div className="mt-1.5 flex items-center gap-1.5 pl-5">
                            {rm.enemyPool.length > 0 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm border border-red-700/30 text-red-400/60 bg-red-900/10">
                                👾 {rm.enemyPool.length}
                              </span>
                            )}
                            {connCount > 0 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm border border-cyan-700/30 text-cyan-400/60 bg-cyan-900/10">
                                🔗 {connCount}
                              </span>
                            )}
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 mt-2 pl-5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingId(rm.id); setCreating(false); }}
                              className="flex items-center gap-1 text-[10px] font-medium text-cyan-400/70 hover:text-cyan-300 bg-black/60 rounded-md px-2 py-1 transition-colors border border-cyan-500/15 hover:border-cyan-500/30"
                              title="Modifica stanza"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Modifica</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => placeAtEmpty(rm.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/60 hover:text-emerald-300 bg-black/60 rounded-md px-2 py-1 transition-colors border border-emerald-500/15 hover:border-emerald-500/30"
                              title="Posiziona automaticamente"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Mappa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rm.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-red-400/60 hover:text-red-300 bg-black/60 rounded-md px-2 py-1 transition-colors border border-red-500/15 hover:border-red-500/30"
                              title="Elimina stanza"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Elimina</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <div className="text-[11px] text-white/30 space-y-2">
              <p><span className="text-white/50 font-medium">ℹ️ Editor Stanze</span></p>
              <p>Trascina per posizionare. Clicca ✏️ per modificare.</p>
              <p>&quot;Salva Posizioni&quot; salva solo riga/colonna.</p>
              <p>ID automatico: <span className="text-emerald-400/50 font-mono text-[10px]">{locationId}_{'{nome}'}</span></p>
            </div>
          </div>
        </div>

        {/* Sticky footer with save */}
        <div className="shrink-0 px-3 sm:px-5 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur flex items-center justify-between">
          <span className="text-[12px] text-white/25">
            {rooms.length} stanze · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
          </span>
          <Button
            size="sm"
            onClick={handleSavePositions}
            disabled={saving}
            className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
            title="Salva solo le posizioni sulla griglia"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salva Posizioni
          </Button>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
        <DialogContent
          className="bg-[#0d0d14] border-white/[0.1] text-white max-w-[95vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-emerald-400 text-base">
              {editingId ? `Modifica: ${rooms.find(rm => rm.id === editingId)?.name ?? editingId}` : 'Nuova Stanza'}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              {editingId
                ? 'Modifica i campi e premi Salva per aggiornare'
                : 'Compila i campi per creare una nuova stanza'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
            <EntityForm
              fields={roomFormFields}
              initialData={
                editingId
                  ? editingData
                  : Object.fromEntries(
                      roomFormFields.map(f => [
                        f.key,
                        f.key === 'locationId' ? locationId : (f.defaultValue ?? ''),
                      ])
                    )
              }
              onSubmit={editingId ? handleUpdate : handleCreate}
              onCancel={handleDialogClose}
              submitLabel={dialogSaving ? 'Salvataggio...' : (editingId ? 'Salva Modifiche' : 'Crea Stanza')}
              isEdit={!!editingId}
              activeTab="rooms"
            />
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
