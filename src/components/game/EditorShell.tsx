'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, ChevronDown,
  Plus, Pencil, Trash2, RefreshCw, Loader2, Search, Upload,
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';
import { useGameStore } from '@/game/store';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { TabId } from '@/components/game/admin/config/tabGroups';
import { TAB_GROUPS, TABS } from '@/components/game/admin/config/tabGroups';
import { SEED_BANNERS } from '@/components/game/admin/config/seedBanners';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { TABLE_COLUMNS } from '@/components/game/admin/config/tableColumns';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { FormActions } from '@/components/game/admin/fields/FormActions';
import { NotificationEditDialog } from '@/components/game/admin/NotificationEditDialog';
import { GalleryBanner } from '@/components/game/admin/GalleryBanner';
import { TableSkeleton } from '@/components/game/admin/TableSkeleton';
import { AvatarManager } from '@/components/game/admin/tabs/AvatarManager';
import { StartScreenEditor } from '@/components/game/admin/tabs/StartScreenEditor';
import { GameSettingsEditor } from '@/components/game/admin/tabs/GameSettingsEditor';
import ThemeEditor from '@/components/game/admin/tabs/ThemeEditor';
import MapEditor from '@/components/game/admin/tabs/MapEditor';
import Footer from '@/components/Footer';

// Filter out the 'hub' group (games tab) since game management lives on the dashboard
const EDITOR_TAB_GROUPS = TAB_GROUPS.filter(g => g.id !== 'hub');

interface EditorShellProps {
  gameId: string;
  onBack: () => void;
  onPlay: (gameId: string) => void;
}

export default function EditorShell({ gameId, onBack, onPlay }: EditorShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>('items');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of EDITOR_TAB_GROUPS) {
      initial[g.id] = g.defaultOpen !== true;
    }
    return initial;
  });
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<TabId, number>>({
    games: 0, items: 0, quests: 0, events: 0, documents: 0, sounds: 0, images: 0, notifications: 0, locations: 0, npcs: 0, archetypes: 0, characters: 0, specials: 0, enemies: 0, 'enemy-abilities': 0, 'boss-phases': 0, achievements: 0, endings: 0, 'secret-rooms': 0, recipes: 0, avatars: 0, 'start-screen': 0, settings: 0, theme: 0, 'quest-chains': 0,
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tabConfig = TABS.find(t => t.id === activeTab)!;
  const fields = FIELD_MAP[activeTab];
  const columns = TABLE_COLUMNS[activeTab];

  // Dialog state
  const dialogOpen = creating || editingId !== null;

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row => {
      const id = String(row.id ?? '').toLowerCase();
      const name = String(row.name ?? row.title ?? '').toLowerCase();
      const type = String(row.type ?? row.category ?? '').toLowerCase();
      return id.includes(q) || name.includes(q) || type.includes(q);
    });
  }, [data, searchQuery]);

  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  // Fetch counts from all endpoints in parallel
  const fetchCounts = useCallback(async () => {
    try {
      const responses = await Promise.allSettled(
        TABS.map(tab => adminFetch(tab.endpoint))
      );
      const newCounts: Record<string, number> = {};
      TABS.forEach((tab, idx) => {
        const result = responses[idx];
        if (result.status === 'fulfilled' && result.value.ok) {
          result.value.json().then(json => {
            const count = Array.isArray(json) ? json.length : 0;
            setCounts(prev => ({ ...prev, [tab.id]: count }));
          });
        }
        newCounts[tab.id] = 0;
      });
    } catch {
      // silent
    }
  }, []);

  // Fetch data for the active tab only
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(tabConfig.endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : [];
      setData(arr);
      setCounts(prev => ({ ...prev, [activeTab]: arr.length }));
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tabConfig.endpoint, activeTab, showStatus]);

  // Fetch data when tab changes
  useEffect(() => {
    fetchCounts();
    fetchData();
    setCreating(false);
    setEditingId(null);
    setSearchQuery('');
  }, [activeTab, fetchData, fetchCounts]);

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      const processed = { ...formData };
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory', 'effects-editor', 'item-box-defaults', 'quest-chain-steps']);
      for (const f of fields) {
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
        if (f.type === 'quest-chain-final-reward' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (f.type === 'dynamic-dialogues' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (f.type === 'permanent-map-effect' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (processed[f.key] === '' || processed[f.key] === undefined) {
          delete processed[f.key];
        }
      }
      const res = await adminFetch(tabConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Creato con successo!', 'success');
      setCreating(false);
      fetchData();
      fetchCounts();
    } catch (err) {
      showStatus(`Errore creazione: ${err}`, 'error');
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    try {
      const processed = { ...formData };
      if (editingId && !processed.id) {
        processed.id = editingId;
      }
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory', 'effects-editor', 'item-box-defaults', 'quest-chain-steps']);
      for (const f of fields) {
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
        if (f.type === 'quest-chain-final-reward' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (f.type === 'dynamic-dialogues' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (f.type === 'permanent-map-effect' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        if (processed[f.key] === '' || processed[f.key] === undefined) {
          delete processed[f.key];
        }
      }
      const res = await adminFetch(tabConfig.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Aggiornato con successo!', 'success');
      setEditingId(null);
      fetchData();
      fetchCounts();
    } catch (err) {
      showStatus(`Errore aggiornamento: ${err}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Eliminare "${id}"?`)) return;
    try {
      const res = await adminFetch(`${tabConfig.endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Eliminato con successo!', 'success');
      fetchData();
      fetchCounts();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  const handleRefreshGameData = async () => {
    setRefreshing(true);
    try {
      await refreshGameData();
      useGameStore.getState().bumpDataVersion();
      showStatus('Dati di gioco ricaricati!', 'success');
    } catch (err) {
      showStatus(`Errore refresh: ${err}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenCreate = () => {
    setCreating(true);
    setEditingId(null);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  const editingData = editingId
    ? (() => {
        const raw = { ...(data.find(r => String(r.id) === editingId) as Record<string, unknown> || {}) };
        if (raw.mapDangerAuto && 'mapDanger' in raw) {
          raw.mapDanger = '-1';
        } else if ('mapDanger' in raw) {
          raw.mapDanger = String(raw.mapDanger);
        }
        delete raw.mapDangerAuto;
        return raw;
      })()
    : {};

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* ── Top Bar ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.06]"
        style={{
          background: 'rgba(8, 8, 14, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <div className="w-px h-4 bg-white/[0.1]" />
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <span className="text-sm font-black tracking-wider text-emerald-400">EDITOR</span>
            <span className="text-[12px] text-white/25 bg-white/[0.06] px-2 py-0.5 rounded-md font-mono">{gameId || '...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshGameData}
            disabled={refreshing}
            className="text-xs px-3 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/25 bg-emerald-600/10"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <button
            onClick={() => onPlay(gameId)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/25 bg-emerald-600/10 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Play Test
          </button>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Vertical Sidebar with Groups ── */}
        <div className="w-[200px] shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col py-2 overflow-y-auto admin-scrollbar">
          {EDITOR_TAB_GROUPS.map(group => {
            const isCollapsed = collapsedGroups[group.id];
            const groupCount = group.tabs.reduce((sum, t) => sum + (counts[t.id] ?? 0), 0);
            const isActiveInGroup = group.tabs.some(t => t.id === activeTab);
            return (
              <div key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all ${
                    isActiveInGroup && !isCollapsed
                      ? 'text-white/60'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span className="text-[12px]">{group.icon}</span>
                  <span className="text-[12px] font-bold uppercase tracking-wider flex-1">{group.label}</span>
                  <span className="text-[11px] font-mono text-white/20">{groupCount}</span>
                </button>
                {/* Group Tabs */}
                {!isCollapsed && (
                  <div className="relative ml-1 border-l border-white/[0.06]">
                    {group.tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSearchQuery('');
                        }}
                        className={`w-full flex items-center gap-2 pl-3 pr-3 py-2 text-left transition-all ${
                          activeTab === tab.id
                            ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500 -ml-[1px]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border-l-2 border-transparent -ml-[1px]'
                        }`}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="text-[13px] font-medium flex-1 truncate">{tab.label}</span>
                        {!tab.custom && (
                          <span className={`text-[12px] min-w-[18px] text-center px-1 py-0.5 rounded-full font-mono ${
                            activeTab === tab.id
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-white/[0.06] text-white/25'
                          }`}>
                            {counts[tab.id] ?? 0}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {tabConfig.custom ? (
            activeTab === 'avatars' ? <AvatarManager /> : activeTab === 'settings' ? <GameSettingsEditor /> : activeTab === 'theme' ? <ThemeEditor /> : activeTab === 'locations' ? <MapEditor /> : <StartScreenEditor />
          ) : (
            <>
              {/* Status message */}
              <AnimatePresence>
                {statusMsg && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="shrink-0 overflow-hidden"
                  >
                    <div className={`px-4 py-1.5 text-[12px] font-medium ${
                      statusMsg.type === 'success'
                        ? 'bg-green-500/10 text-green-300 border-b border-green-500/20'
                        : 'bg-red-500/10 text-red-300 border-b border-red-500/20'
                    }`}>
                      {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toolbar: Add + Search */}
              <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
                {activeTab !== 'sounds' && activeTab !== 'images' && (
                  <Button
                    size="sm"
                    onClick={handleOpenCreate}
                    className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Aggiungi Nuovo {tabConfig.entityLabel}
                  </Button>
                )}

                <div className="flex-1" />
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cerca per ID o nome..."
                    className="w-full text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-white/70 placeholder-white/20 focus:outline-none focus:border-emerald-500/30"
                  />
                </div>
              </div>

              {/* Gallery banner for sounds/images (view-only) */}
              {(activeTab === 'sounds' || activeTab === 'images') && (
                <GalleryBanner type={activeTab as 'sounds' | 'images'} />
              )}

              {/* Data-driven seed banners for all entity tabs */}
              {(() => {
                const banner = SEED_BANNERS[activeTab];
                if (!banner) return null;
                const BannerIcon = banner.icon;
                return (
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <BannerIcon className="w-4 h-4 text-white/25 shrink-0" />
                      <p className="text-[13px] text-white/30" dangerouslySetInnerHTML={{ __html: banner.description }} />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const res = await adminFetch(banner.seedEndpoint, { method: 'POST' });
                          if (!res.ok) throw new Error(await res.text());
                          const result = await res.json();
                          showStatus(result.message, 'success');
                          fetchData();
                          fetchCounts();
                        } catch (err) {
                          showStatus(`Errore seed: ${err}`, 'error');
                        }
                      }}
                      className="text-[12px] gap-1 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/20 bg-emerald-600/10 shrink-0"
                    >
                      <Upload className="w-3 h-3" />
                      Seed Default
                    </Button>
                  </div>
                );
              })()}

              {/* Table content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 admin-scrollbar">
                {loading ? (
                  <TableSkeleton />
                ) : filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm text-white/30 font-medium">
                      {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun dato trovato'}
                    </p>
                    <p className="text-[12px] text-white/15">
                      {searchQuery ? 'Prova con un termine diverso' : `Crea il primo ${tabConfig.entityLabel.toLowerCase()} per iniziare`}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        {columns.map(col => (
                          <TableHead
                            key={col.key}
                            className={`text-[12px] font-semibold text-white/40 uppercase tracking-wider ${col.width ?? ''}`}
                          >
                            {col.label}
                          </TableHead>
                        ))}
                        {activeTab !== 'sounds' && activeTab !== 'images' && (
                          <TableHead className="text-[12px] font-semibold text-white/40 uppercase tracking-wider text-right w-32">
                            Azioni
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row, idx) => {
                        const rowId = String(row.id ?? '');
                        return (
                          <TableRow
                            key={rowId || `row-${idx}`}
                            className="border-white/[0.04] hover:bg-white/[0.03] group"
                          >
                            {columns.map(col => (
                              <TableCell key={col.key} className={`text-[13px] text-white/70 py-2 px-2 ${col.width ?? ''}`}>
                                {col.render
                                  ? col.render(row, activeTab)
                                  : String(row[col.key] ?? '—')
                                }
                              </TableCell>
                            ))}
                            <TableCell className="text-right py-2 px-2">
                              {activeTab !== 'sounds' && activeTab !== 'images' ? (
                                <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(rowId)}
                                    className="h-7 px-2 text-[12px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Modifica
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(rowId)}
                                    className="h-7 px-2 text-[12px] gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Elimina
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[12px] text-white/15">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
                <span className="text-[12px] text-white/25">
                  {data.length} record · {tabConfig.label}
                  {searchQuery && ` · ${filteredData.length} filtrati`}
                </span>
                <button
                  onClick={fetchData}
                  className="text-[12px] text-white/30 hover:text-white/50 flex items-center gap-1.5 transition-colors"
                >
                  ↻ Ricarica
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Create/Edit Dialog ── */}
      {activeTab === 'notifications' ? (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-black border-white/[0.1] text-white sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
            overlayClassName="z-[120]"
          >
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-base">
                {editingId ? `Modifica Notifica: ${editingId}` : 'Nuova Notifica'}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {editingId
                  ? 'Personalizza i colori, animazioni e media per questa notifica'
                  : 'Configura una nuova notifica per il gioco'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
              <NotificationEditDialog
                initialData={editingData}
                onSave={handleUpdate}
                onCancel={handleDialogClose}
                isEdit={!!editingId}
              />
            </div>
            {/* Sticky footer with save/cancel */}
            <div className="shrink-0 px-6 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur">
              <FormActions
                submitLabel={editingId ? 'Salva Modifiche' : 'Crea Notifica'}
                onCancel={handleDialogClose}
                formId="notif-form"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-black border-white/[0.1] text-white sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
            overlayClassName="z-[120]"
          >
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-base">
                {editingId ? `Modifica: ${editingId}` : `Nuovo ${tabConfig.entityLabel}`}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {editingId
                  ? 'Modifica i campi e premi Salva per aggiornare'
                  : `Compila i campi per creare un nuovo ${tabConfig.entityLabel.toLowerCase()}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
              <EntityForm
                fields={fields}
                initialData={
                  editingId
                    ? editingData
                    : Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? '']))
                }
                onSubmit={editingId ? handleUpdate : handleCreate}
                onCancel={handleDialogClose}
                submitLabel={editingId ? 'Salva Modifiche' : 'Crea'}
                isEdit={!!editingId}
                activeTab={activeTab}
              />
            </div>
            {/* Sticky footer with save/cancel */}
            <div className="shrink-0 px-6 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur">
              <FormActions
                submitLabel={editingId ? 'Salva Modifiche' : `Crea ${tabConfig.entityLabel}`}
                onCancel={handleDialogClose}
                formId="entity-form"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Footer />
    </div>
  );
}
