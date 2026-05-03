'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, RefreshCw, Loader2, GripVertical, Eye, Link, Lock, ArrowRight, ArrowDown, ArrowUp, ArrowLeft, Plus, Pencil, Trash2, Upload, MapPin, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { SEED_BANNERS } from '@/components/game/admin/config/seedBanners';
import RoomEditorPanel from '@/components/game/admin/tabs/RoomEditorPanel';

// ── Types ──
interface LocationData {
  id: string;
  name: string;
  mapRow: number | null;
  mapCol: number | null;
  mapIcon: string | null;
  mapDanger: number;
  mapDangerAuto: boolean;
  nextLocations: string[];
  lockedLocations: { locationId: string; requiredItemId: string }[];
  isBossArea: boolean;
}

// Full raw data for editing (all DB fields)
type FullLocationData = Record<string, unknown>;

interface GridCell {
  row: number;
  col: number; // -1, 0, 1
  location: LocationData | null;
}

interface ConnectionInfo {
  id: string;
  name: string;
  locked: boolean;
}

// ── Constants ──
const GRID_ROWS = 6;
const GRID_COLS = [-1, 0, 1];
const COL_LABELS: Record<number, string> = { [-1]: 'Sinistra', 0: 'Centro', 1: 'Destra' };
const ENDPOINT = '/api/admin/locations';
const LOCATION_SEED_ENDPOINT = '/api/admin/seed-locations';

// Form fields without mapCol/mapRow (managed via grid)
const locationFormFields = FIELD_MAP.locations.filter(f => f.key !== 'mapCol' && f.key !== 'mapRow');

const dangerColors = [
  'border-gray-600/50 bg-gray-800/30',
  'border-yellow-700/60 bg-yellow-900/20',
  'border-orange-700/60 bg-orange-900/20',
  'border-red-700/60 bg-red-900/20',
];

const dangerLabels = ['Sicura', 'Moderata', 'Pericolosa', 'Mortale'];

const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory', 'effects-editor', 'item-box-defaults']);

// ═══════════════════════════════════════════════════════════
// Component — Unified Location & Map Editor
// ═══════════════════════════════════════════════════════════
export default function MapEditor() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  // Store full raw data for each location (keyed by id)
  const [fullData, setFullData] = useState<Record<string, FullLocationData>>({});
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showConnectionNames, setShowConnectionNames] = useState(true);
  // ── Room management: selected location to show its rooms ──
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
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
        mapIcon: d.mapIcon ? String(d.mapIcon) : null,
        mapDanger: typeof d.mapDanger === 'number' ? d.mapDanger : 0,
        mapDangerAuto: !!d.mapDangerAuto,
        nextLocations: (() => { try { return typeof d.nextLocations === 'string' ? JSON.parse(d.nextLocations) : (d.nextLocations as string[] ?? []); } catch { return []; } })(),
        lockedLocations: (() => { try { return typeof d.lockedLocations === 'string' ? JSON.parse(d.lockedLocations) : (d.lockedLocations ?? []); } catch { return []; } })(),
        isBossArea: !!d.isBossArea,
      }));
      setLocations(locs);
      // Store full raw data for each location (for editing)
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

  // ── Build grid ──
  const grid: GridCell[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (const c of GRID_COLS) {
      const loc = locations.find(l => l.mapRow === r && l.mapCol === c);
      row.push({ row: r, col: c, location: loc || null });
    }
    grid.push(row);
  }

  const unplaced = locations.filter(l => l.mapRow == null || l.mapCol == null);

  // ── Connections helpers ──
  const getConnections = (loc: LocationData): ConnectionInfo[] => {
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
  };

  const getAdjacentConnections = (loc: LocationData): { right: boolean; left: boolean; down: boolean; up: boolean } => {
    const dirs = { right: false, left: false, down: false, up: false };
    if (loc.mapRow == null || loc.mapCol == null) return dirs;
    const connectedIds = new Set<string>();
    for (const nextId of loc.nextLocations) connectedIds.add(nextId);
    for (const otherLoc of locations) {
      if (otherLoc.nextLocations.includes(loc.id)) connectedIds.add(otherLoc.id);
    }
    for (const otherLoc of locations) {
      if (!connectedIds.has(otherLoc.id)) continue;
      if (otherLoc.mapRow == null || otherLoc.mapCol == null) continue;
      const dr = otherLoc.mapRow - loc.mapRow;
      const dc = otherLoc.mapCol - loc.mapCol;
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
  const handleDragStart = (e: React.DragEvent, locId: string) => {
    setDragId(locId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', locId);
  };
  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ row, col });
  };
  const handleDragLeave = () => setDropTarget(null);
  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const locId = e.dataTransfer.getData('text/plain');
    if (!locId) return;
    const existing = locations.find(l => l.mapRow === row && l.mapCol === col);
    if (existing && existing.id !== locId) {
      const dragged = locations.find(l => l.id === locId);
      if (dragged) {
        setLocations(prev => prev.map(l => {
          if (l.id === locId) return { ...l, mapRow: row, mapCol: col };
          if (l.id === existing.id) return { ...l, mapRow: dragged.mapRow, mapCol: dragged.mapCol };
          return l;
        }));
      }
    } else {
      setLocations(prev => prev.map(l =>
        l.id === locId ? { ...l, mapRow: row, mapCol: col } : l
      ));
    }
    setDragId(null);
    setDropTarget(null);
  };
  const handleDragEnd = () => { setDragId(null); setDropTarget(null); };

  const placeAtEmpty = (locId: string) => {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (const c of GRID_COLS) {
        if (!locations.find(l => l.mapRow === r && l.mapCol === c)) {
          setLocations(prev => prev.map(l =>
            l.id === locId ? { ...l, mapRow: r, mapCol: c } : l
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
      const positions = locations.map(loc => ({ id: loc.id, mapRow: loc.mapRow, mapCol: loc.mapCol }));
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
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD: Create / Update / Delete ──
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
      // For known nullable fields, set empty to null instead of deleting
      const NULLABLE_FIELDS = new Set(['searchChance', 'docChance', 'searchMax', 'bossId', 'mapIcon', 'mapRow', 'mapCol']);
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
      fetchLocations();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  // ── Editing data (from full raw data, with mapDanger auto↔form conversion) ──
  const editingData = editingId
    ? (() => {
        const raw = { ...(fullData[editingId] ?? {}) };
        // Parse JSON string fields into actual types for the form
        for (const key of Object.keys(raw)) {
          if (typeof raw[key] === 'string') {
            try {
              const parsed = JSON.parse(raw[key] as string);
              // Only use parsed value if it's an object/array (not a plain string/number)
              if (typeof parsed === 'object' && parsed !== null) {
                raw[key] = parsed;
              }
            } catch {
              // not JSON, keep as-is
            }
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

  // ── Seed Default handler ──
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

  // ── Danger level ──
  const getDangerLevel = (loc: LocationData): number => loc.mapDanger ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
        <span className="ml-2 text-sm text-white/30">Caricamento mappa...</span>
      </div>
    );
  }

  return (
    <React.Fragment>
      {/* ── Full-Width Rooms View ── */}
      {selectedLocationId ? (
        <RoomEditorPanel
          locationId={selectedLocationId}
          locationName={locations.find(l => l.id === selectedLocationId)?.name ?? selectedLocationId}
          onBack={() => setSelectedLocationId(null)}
        />
      ) : (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-white/90">🗺️ Location & Mappa</h2>
              <p className="text-[12px] text-white/35 mt-0.5">
                Gestisci location e posizionale sulla mappa. Trascina per spostare.
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConnectionNames(!showConnectionNames)}
                className={`text-xs gap-1.5 ${showConnectionNames ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi nomi collegamenti"
              >
                <span className="text-[10px]">🏷️</span>
                <span className="hidden sm:inline">Nomi</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConnections(!showConnections)}
                className={`text-xs gap-1.5 ${showConnections ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                title="Mostra/nascondi frecce collegamento"
              >
                <Link className="w-3 h-3" />
                <span className="hidden sm:inline">Freccie</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchLocations}
                className="text-xs gap-1.5 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={seeding}
                onClick={handleSeedDefault}
                className="text-xs gap-1.5 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/20 bg-emerald-600/10"
                title="Inserisci i dati di default per le location"
              >
                {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span className="hidden sm:inline">Seed Default</span>
              </Button>
              <Button
                size="sm"
                onClick={() => { setCreating(true); setEditingId(null); }}
                className="text-xs gap-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Aggiungi Location</span>
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

        {/* Seed banner */}
        <div className="px-5 py-2.5 flex items-center gap-2 border-b border-white/[0.04]">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <MapPin className="w-4 h-4 text-white/25 shrink-0" />
            <p className="text-[13px] text-white/30" dangerouslySetInnerHTML={{ __html: SEED_BANNERS.locations?.description ?? '' }} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 admin-scrollbar">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Grid */}
            <div className="flex-1 min-w-0">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                {GRID_COLS.map(c => (
                  <div key={c} className="text-center text-[11px] text-white/25 font-medium uppercase tracking-wider">
                    {COL_LABELS[c]}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div ref={gridRef} className="space-y-3 relative">
                {grid.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-3">
                    {row.map((cell) => {
                      const isDropTarget = dropTarget?.row === cell.row && dropTarget?.col === cell.col;
                      const isDragged = dragId != null && cell.location?.id === dragId;
                      const conns = cell.location ? getConnections(cell.location) : [];
                      const adjConns = cell.location ? getAdjacentConnections(cell.location) : {};
                      const cellKey = `${cell.row}-${cell.col}`;

                      return (
                        <div
                          key={cellKey}
                          className={`
                            group/cell relative min-h-[100px] sm:min-h-[110px] rounded-lg border-2 border-dashed transition-all duration-200
                            ${cell.location
                              ? 'border-white/[0.06] bg-white/[0.02]'
                              : isDropTarget
                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]'
                            }
                            ${isDragged ? 'opacity-30' : ''}
                            ${cell.location?.id === selectedLocationId ? 'ring-2 ring-emerald-500/40 bg-emerald-500/[0.03]' : ''}
                          `}
                          onDragOver={(e) => handleDragOver(e, cell.row, cell.col)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, cell.row, cell.col)}
                        >
                          {/* Row label */}
                          <span className="absolute -left-1 -top-1 text-[8px] text-white/15 font-mono bg-black px-1 rounded">
                            R{cell.row}
                          </span>

                          {cell.location ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, cell.location!.id)}
                              onDragEnd={handleDragEnd}
                              className={`
                                h-full flex flex-col items-center justify-center p-2 pb-1 sm:p-2 rounded-lg cursor-grab active:cursor-grabbing
                                transition-all hover:scale-[1.02] relative
                                ${dangerColors[getDangerLevel(cell.location)]}
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

                              {/* Location node */}
                              <div className="flex items-center gap-1 sm:gap-1.5 w-full">
                                <GripVertical className="w-3 h-3 text-white/15 shrink-0" />
                                <span className="text-base sm:text-lg leading-none shrink-0">
                                  {cell.location.mapIcon || '📍'}
                                </span>
                                <span className="text-[11px] sm:text-[12px] font-bold text-white/80 truncate min-w-0">
                                  {cell.location.name}
                                </span>
                                {cell.location.isBossArea && (
                                  <span className="text-[9px] text-red-400 font-bold shrink-0">BOSS</span>
                                )}
                              </div>

                              {/* Danger badge */}
                              <div
                                className={`
                                  mt-1 text-[9px] px-1.5 py-0.5 rounded-sm border font-medium flex items-center gap-1
                                  ${(() => {
                                    const level = getDangerLevel(cell.location);
                                    if (level === 0) return 'border-gray-700/40 text-gray-400 bg-gray-800/40';
                                    if (level === 1) return 'border-yellow-700/40 text-yellow-400 bg-yellow-900/20';
                                    if (level === 2) return 'border-orange-700/40 text-orange-400 bg-orange-900/20';
                                    return 'border-red-700/40 text-red-400 bg-red-900/20';
                                  })()}
                                `}
                                title={cell.location.mapDangerAuto
                                  ? `Pericolo: ${dangerLabels[getDangerLevel(cell.location)]} (⚙ Automatico)`
                                  : `Pericolo: ${dangerLabels[getDangerLevel(cell.location)]}`}
                              >
                                {cell.location.mapDangerAuto && <span className="text-[8px] opacity-60">⚙</span>}
                                {dangerLabels[getDangerLevel(cell.location)]}
                              </div>

                              {/* Connection names — hidden on mobile for clarity */}
                              {showConnectionNames && conns.length > 0 && (
                                <div className="mt-1 sm:mt-1.5 hidden sm:flex flex-wrap gap-0.5 justify-center max-w-full">
                                  {conns.slice(0, 4).map(conn => (
                                    <span
                                      key={conn.id}
                                      className={`
                                        text-[8px] px-1 py-px rounded-sm leading-tight truncate max-w-[80px]
                                        ${conn.locked
                                          ? 'bg-amber-900/30 text-amber-300/70 border border-amber-700/20'
                                          : 'bg-white/[0.06] text-white/40 border border-white/[0.08]'
                                        }
                                      `}
                                      title={conn.locked ? `🔒 ${conn.name} (bloccata)` : conn.name}
                                    >
                                      {conn.locked && <Lock className="w-2 h-2 inline -mt-px" />}
                                      {conn.name}
                                    </span>
                                  ))}
                                  {conns.length > 4 && (
                                    <span className="text-[8px] text-white/25 px-1">+{conns.length - 4}</span>
                                  )}
                                </div>
                              )}

                              {/* Action buttons — flow below card content, never overlap */}
                              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-2 w-full">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedLocationId(selectedLocationId === cell.location!.id ? null : cell.location!.id); }}
                                  className={`flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors border ${selectedLocationId === cell.location!.id ? 'text-emerald-300 border-emerald-500/40 bg-emerald-900/30' : 'text-emerald-400/70 hover:text-emerald-300 border-emerald-500/15 hover:border-emerald-500/30 bg-black/50'}`}
                                  title="Gestisci stanze"
                                >
                                  <DoorOpen className="w-3 h-3" />
                                  <span>Stanze</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setEditingId(cell.location!.id); setCreating(false); }}
                                  className="flex items-center gap-1 text-[10px] font-medium text-cyan-400/80 hover:text-cyan-300 bg-black/50 rounded-md px-2 py-1 transition-colors border border-cyan-500/15 hover:border-cyan-500/30"
                                  title="Modifica"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Modifica</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(cell.location!.id); }}
                                  className="flex items-center gap-1 text-[10px] font-medium text-red-400/70 hover:text-red-300 bg-black/50 rounded-md px-2 py-1 transition-colors border border-red-500/15 hover:border-red-500/30"
                                  title="Elimina"
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
                <span className="flex items-center gap-1 text-white/25">
                  <span className="w-3 h-3 rounded-sm border border-gray-600/50 bg-gray-800/30" /> Sicura
                </span>
                <span className="flex items-center gap-1 text-white/25">
                  <span className="w-3 h-3 rounded-sm border border-yellow-700/60 bg-yellow-900/20" /> Moderata
                </span>
                <span className="flex items-center gap-1 text-white/25">
                  <span className="w-3 h-3 rounded-sm border border-orange-700/60 bg-orange-900/20" /> Pericolosa
                </span>
                <span className="flex items-center gap-1 text-white/25">
                  <span className="w-3 h-3 rounded-sm border border-red-700/60 bg-red-900/20" /> Mortale
                </span>
              </div>
              <p className="text-[10px] text-white/15 mt-2">
                ⚙ = calcolato automaticamente | Le frecce e i nomi derivano da &quot;Location Uscite&quot;
              </p>
            </div>

            {/* Sidebar: Unplaced locations */}
            <div className="w-full lg:w-[250px] shrink-0 flex flex-col">
                <>
                  <div className="text-[12px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    <span className="lg:hidden">📋 Non posizionate ({unplaced.length})</span>
                    <span className="hidden lg:inline">Non posizionate ({unplaced.length})</span>
                  </div>
                  {unplaced.length === 0 ? (
                    <div className="text-[11px] text-white/15 italic py-4">
                      Tutte le location sono sulla mappa
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto admin-scrollbar">
                      {unplaced.map(loc => {
                        const locConns = getConnections(loc);
                        return (
                          <div
                            key={loc.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, loc.id)}
                            onDragEnd={handleDragEnd}
                            className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] cursor-grab active:cursor-grabbing hover:bg-white/[0.04] transition-colors"
                          >
                            {/* Name row */}
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3 text-white/15 shrink-0" />
                              <span className="text-sm shrink-0">{loc.mapIcon || '📍'}</span>
                              <span className="text-[11px] text-white/60 truncate min-w-0 flex-1">{loc.name}</span>
                            </div>
                            {/* Action buttons row */}
                            <div className="flex items-center gap-1.5 mt-1.5 pl-5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingId(loc.id); setCreating(false); }}
                                className="flex items-center gap-1 text-[10px] font-medium text-cyan-400/70 hover:text-cyan-300 bg-black/60 rounded-md px-1.5 py-1 transition-colors border border-cyan-500/15 hover:border-cyan-500/30"
                                title="Modifica location"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Modifica</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => placeAtEmpty(loc.id)}
                                className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/60 hover:text-emerald-300 bg-black/60 rounded-md px-1.5 py-1 transition-colors border border-emerald-500/15 hover:border-emerald-500/30"
                                title="Posiziona automaticamente"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Mappa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(loc.id)}
                                className="flex items-center gap-1 text-[10px] font-medium text-red-400/60 hover:text-red-300 bg-black/60 rounded-md px-1.5 py-1 transition-colors border border-red-500/15 hover:border-red-500/30"
                                title="Elimina location"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Elimina</span>
                              </button>
                            </div>
                            {showConnectionNames && locConns.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-0.5 pl-5">
                                {locConns.slice(0, 3).map(conn => (
                                  <span
                                    key={conn.id}
                                    className="text-[7px] px-1 py-px rounded-sm bg-white/[0.04] text-white/25 border border-white/[0.06] truncate max-w-[70px]"
                                  >
                                    {conn.name}
                                  </span>
                                ))}
                                {locConns.length > 3 && (
                                  <span className="text-[7px] text-white/20">+{locConns.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Edit / Info for placed locations */}
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="text-[11px] text-white/30 space-y-2">
                      <p><span className="text-white/50 font-medium">ℹ️ Gestione Unificata</span></p>
                      <p>Trascina per posizionare. Clicca ✏️ per modificare i dettagli.</p>
                      <p>Clicca <span className="text-emerald-400">🚪 Stanze</span> per gestire le stanze di una location.</p>
                      <p>&quot;Salva Posizioni&quot; salva solo riga/colonna. Il dialog salva tutti i dati.</p>
                    </div>
                  </div>
                </>
            </div>
          </div>
        </div>

        {/* Sticky footer with save */}
        <div className="shrink-0 px-3 sm:px-5 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur flex items-center justify-between">
          <span className="text-[12px] text-white/25">
            {locations.length} location{locations.length !== 1 ? 's' : ''} · {unplaced.length} non posizionat{unplaced.length === 1 ? 'a' : 'e'}
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
      )}

      {/* ── Create / Edit Dialog (only shown in map view, not rooms view) ── */}
      {!selectedLocationId && <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
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
      </Dialog>}
    </React.Fragment>
  );
}
