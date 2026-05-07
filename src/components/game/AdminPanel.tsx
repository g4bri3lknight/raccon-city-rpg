'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Pencil, Trash2, RefreshCw, Loader2, Search,
  Upload, ChevronDown, Copy, Filter, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';
import { useGameStore } from '@/game/store';
import { adminFetch, setAdminKey, testAdminKey, getAdminKey } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { TabId } from './admin/config/tabGroups';
import { TAB_GROUPS, TABS } from './admin/config/tabGroups';
import type { SeedBannerConfig } from './admin/config/seedBanners';
import { SEED_BANNERS } from './admin/config/seedBanners';
import { FIELD_MAP } from './admin/config/fieldDefinitions';
import { TABLE_COLUMNS } from './admin/config/tableColumns';
import { EntityForm } from './admin/EntityForm';
import { NotificationEditDialog } from './admin/NotificationEditDialog';
import { TableSkeleton } from './admin/TableSkeleton';
import { TAB_FILTERS, getFilterValues } from './admin/config/filterConfig';
import { AvatarManager } from './admin/tabs/AvatarManager';
import { StartScreenEditor } from './admin/tabs/StartScreenEditor';
import { GameSettingsEditor } from './admin/tabs/GameSettingsEditor';
import ThemeEditor from './admin/tabs/ThemeEditor';
import GameManager from './admin/tabs/GameManager';
import MapEditor from './admin/tabs/MapEditor';


// ═══════════════════════════════════════════════════════════════
// Main AdminPanel
// ═══════════════════════════════════════════════════════════════
export default function AdminPanel({ isStandalone = false }: { isStandalone?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('items');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of TAB_GROUPS) {
      initial[g.id] = g.defaultOpen !== true;
    }
    return initial;
  });
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<TabId, number>>({
    games: 0, items: 0, quests: 0, events: 0, documents: 0, sounds: 0, images: 0, notifications: 0, locations: 0, npcs: 0, characters: 0, specials: 0, enemies: 0, 'enemy-abilities': 0, 'boss-phases': 0, achievements: 0, endings: 0, 'secret-rooms': 0, recipes: 0, avatars: 0, 'start-screen': 0, settings: 0, 'quest-chains': 0,
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showLogin, setShowLogin] = useState(false);
  const [loginKey, setLoginKey] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const tabConfig = TABS.find(t => t.id === activeTab)!;
  const fields = FIELD_MAP[activeTab];
  const columns = TABLE_COLUMNS[activeTab];

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey, sortDir]);

  // Dialog state
  const dialogOpen = creating || editingId !== null;

  // Filter data by search + filters, then sort
  const filteredData = useMemo(() => {
    let result = data;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = data.filter(row => {
        const id = String(row.id ?? '').toLowerCase();
        const name = String(row.name ?? row.title ?? '').toLowerCase();
        const type = String(row.type ?? row.category ?? '').toLowerCase();
        return id.includes(q) || name.includes(q) || type.includes(q);
      });
    }
    const filterEntries = Object.entries(activeFilters);
    if (filterEntries.length > 0) {
      result = result.filter(row =>
        filterEntries.every(([key, value]) => String(row[key] ?? '') === value)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return result;
  }, [data, searchQuery, activeFilters, sortKey, sortDir]);

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
      // Update count for this tab too
      setCounts(prev => ({ ...prev, [activeTab]: arr.length }));
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tabConfig.endpoint, activeTab, showStatus]);

  // When panel opens, fetch all counts + active tab data
  useEffect(() => {
    if (open) {
      fetchCounts();
      fetchData();
      setCreating(false);
      setEditingId(null);
      setSearchQuery('');
      setActiveFilters({});
      setSortKey(null);
      setSortDir('asc');
    }
  }, [open, activeTab, fetchData, fetchCounts]);

  // Try default key first — if it works, skip login entirely
  const tryOpenAdmin = useCallback(async () => {
    // Test if the current key (default or previously set) works
    const currentKey = getAdminKey();
    setLoginLoading(true);
    const works = await testAdminKey(currentKey);
    setLoginLoading(false);
    if (works) {
      setOpen(true);
      return;
    }
    // Default key failed — show login dialog
    setShowLogin(true);
  }, []);

  const handleLogin = useCallback(async () => {
    setLoginLoading(true);
    setLoginError('');
    const keyToTest = loginKey.trim();
    if (!keyToTest) {
      setLoginError('Inserisci una chiave');
      setLoginLoading(false);
      return;
    }
    const works = await testAdminKey(keyToTest);
    setLoginLoading(false);
    if (works) {
      setAdminKey(keyToTest);
      setShowLogin(false);
      setLoginKey('');
      setLoginError('');
      setOpen(true);
    } else {
      setLoginError('Chiave non valida. Riprova.');
    }
  }, [loginKey]);

  // F3 key — opens admin panel (editor mode only — not in standalone)
  useEffect(() => {
    if (isStandalone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        if (!open && !showLogin) {
          tryOpenAdmin();
        } else if (open) {
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, showLogin, tryOpenAdmin]);

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      const processed = { ...formData };
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory', 'effects-editor', 'item-box-defaults', 'quest-chain-steps']);
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        // Serialize array values to JSON strings for DB storage
        if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // story-event is an object, not array — serialize it
        if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-apply is an object {type, chance} — serialize it
        if (f.type === 'status-apply' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-cured is a string[] — serialize it
        if (f.type === 'status-cured' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // quest-chain-final-reward is an object — serialize it
        if (f.type === 'quest-chain-final-reward' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // dynamic-dialogues is an array — serialize it
        if (f.type === 'dynamic-dialogues' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // permanent-map-effect is an object — serialize it
        if (f.type === 'permanent-map-effect' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // json and requirements-editor — already string from editor, skip
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
      // Ensure id is always included in the update body
      if (editingId && !processed.id) {
        processed.id = editingId;
      }
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory', 'effects-editor', 'item-box-defaults', 'quest-chain-steps']);
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        // Serialize array values to JSON strings for DB storage
        if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // story-event is an object, not array — serialize it
        if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-apply is an object {type, chance} — serialize it
        if (f.type === 'status-apply' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-cured is a string[] — serialize it
        if (f.type === 'status-cured' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // quest-chain-final-reward is an object — serialize it
        if (f.type === 'quest-chain-final-reward' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // dynamic-dialogues is an array — serialize it
        if (f.type === 'dynamic-dialogues' && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // permanent-map-effect is an object — serialize it
        if (f.type === 'permanent-map-effect' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // json and requirements-editor — already string from editor, skip
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

  const handleClone = async (id: string) => {
    const row = data.find(r => String(r.id) === id);
    if (!row) return;
    const newId = prompt(`Nuovo ID per la copia di "${id}":`, `${id}_copia`);
    if (!newId || !newId.trim()) return;
    try {
      const clone = { ...row, id: newId.trim() };
      const res = await adminFetch(tabConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clone),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Clonato come "${newId.trim()}"!`, 'success');
      fetchData();
      fetchCounts();
    } catch (err) {
      showStatus(`Errore clonazione: ${err}`, 'error');
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
        // Map mapDanger: if auto mode, convert to '-1' for the form select
        if (raw.mapDangerAuto && 'mapDanger' in raw) {
          raw.mapDanger = '-1';
        } else if ('mapDanger' in raw) {
          raw.mapDanger = String(raw.mapDanger);
        }
        // Remove mapDangerAuto from form data (API derives it from mapDanger value)
        delete raw.mapDangerAuto;
        return raw;
      })()
    : {};

  // ── Login Dialog ──
  if (showLogin && !open) {
    return (
      <AnimatePresence>
        <motion.div
          key="login-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[109] bg-black/70"
          onClick={() => { setShowLogin(false); setLoginError(''); setLoginKey(''); }}
        />
        <motion.div
          key="login-dialog"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[110] flex items-center justify-center"
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl p-6"
            style={{
              background: 'rgba(12, 12, 20, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔐</div>
              <h2 className="text-base font-bold text-white/90">Accesso Amministrativo</h2>
              <p className="text-[13px] text-white/40 mt-1">Inserisci la chiave per accedere al pannello admin</p>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  type="password"
                  value={loginKey}
                  onChange={e => { setLoginKey(e.target.value); setLoginError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="Chiave amministrativa"
                  autoFocus
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-4 py-2.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {loginError && (
                <p className="text-[12px] text-red-400 text-center">❌ {loginError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => { setShowLogin(false); setLoginError(''); setLoginKey(''); }}
                  className="flex-1 text-xs bg-white/[0.06] border border-white/[0.1] text-white/50 hover:bg-white/[0.1] hover:text-white/70"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleLogin}
                  disabled={loginLoading || !loginKey.trim()}
                  className="flex-1 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 disabled:opacity-40"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Accedi'}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-white/15 text-center mt-4">
              Premi F3 per aprire il pannello · La chiave è configurata nel server
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="admin-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[109] bg-black/60"
        onClick={() => setOpen(false)}
      />
      <motion.div
        key="admin-panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-4 z-[110] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8, 8, 14, 0.97)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚙️</span>
            <span className="text-sm font-black tracking-wider text-emerald-400">ADMIN PANEL</span>
            <span className="text-[12px] text-white/20 bg-white/[0.06] px-2 py-0.5 rounded-md font-mono">F3</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshGameData}
              disabled={refreshing}
              className="text-xs px-3 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/25 bg-emerald-600/10"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh Game Data
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Vertical Sidebar with Groups ── */}
          <div className="w-[200px] shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col py-2 overflow-y-auto admin-scrollbar">
            {TAB_GROUPS.map(group => {
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
              activeTab === 'games' ? <GameManager /> : activeTab === 'avatars' ? <AvatarManager /> : activeTab === 'settings' ? <GameSettingsEditor /> : activeTab === 'theme' ? <ThemeEditor /> : activeTab === 'locations' ? <MapEditor /> : <StartScreenEditor />
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

            {/* Toolbar: Add + Filters + Search */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi Nuovo {tabConfig.entityLabel}
              </Button>

              {/* Filter dropdowns */}
              {(() => {
                const filters = TAB_FILTERS[activeTab];
                if (!filters || filters.length === 0) return null;
                return (
                  <>
                    {filters.map(f => {
                      const options = getFilterValues(data, f as any);
                      if (options.length <= 1) return null;
                      return (
                        <select
                          key={f.key}
                          value={activeFilters[f.key] ?? ''}
                          onChange={e => setActiveFilters(prev => {
                            const next = { ...prev };
                            if (e.target.value) next[f.key] = e.target.value;
                            else delete next[f.key];
                            return next;
                          })}
                          className="text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1.5 text-white/60 focus:outline-none focus:border-emerald-500/30 cursor-pointer shrink-0 max-w-[130px]"
                          style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.6)' }}
                        >
                          <option value="" className="bg-black text-white" style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.5)' }}>
                            {f.label}...
                          </option>
                          {options.map(o => (
                            <option key={o.value} value={o.value} className="bg-black text-white" style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.85)' }}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      );
                    })}
                  </>
                );
              })()}

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
                          {col.render ? (
                            col.label
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSort(col.key)}
                              className="flex items-center gap-1 hover:text-white/60 transition-colors"
                            >
                              {col.label}
                              {sortKey === col.key ? (
                                sortDir === 'asc'
                                  ? <ArrowUp className="w-3 h-3 text-emerald-400" />
                                  : <ArrowDown className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-white/15" />
                              )}
                            </button>
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="text-[12px] font-semibold text-white/40 uppercase tracking-wider text-right w-40">
                        Azioni
                      </TableHead>
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
                            <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClone(rowId)}
                                className="h-7 px-2 text-[12px] gap-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                                title="Duplica"
                              >
                                <Copy className="w-3 h-3" />
                                Clona
                              </Button>
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
      </motion.div>

      {/* ── Create/Edit Dialog ── */}
      {activeTab === 'notifications' ? (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-[#0d0d14] border-white/[0.1] text-white sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
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
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6 py-2">
              <NotificationEditDialog
                key={editingId || '__new__'}
                initialData={editingData}
                onSave={handleUpdate}
                onCancel={handleDialogClose}
                isEdit={!!editingId}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-[#0d0d14] border-white/[0.1] text-white sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
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
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6 py-2">
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
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
