'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, ChevronDown, Menu, X,
  Plus, Pencil, Trash2, RefreshCw, Loader2, Search, Upload,
  LayoutGrid, List, Copy, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, Link2, Download, CheckSquare, Shield, FileText, Palette, Compass,
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';
import { useGameStore } from '@/game/store';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TabId } from '@/components/game/admin/config/tabGroups';
import { TAB_GROUPS, TABS } from '@/components/game/admin/config/tabGroups';
import { SEED_BANNERS } from '@/components/game/admin/config/seedBanners';
import { FIELD_MAP } from '@/components/game/admin/config/fieldDefinitions';
import { TABLE_COLUMNS } from '@/components/game/admin/config/tableColumns';
import { EntityForm } from '@/components/game/admin/EntityForm';
import { EntityCardGrid } from '@/components/game/admin/EntityCardGrid';
import { FormActions } from '@/components/game/admin/fields/FormActions';
import { NotificationEditDialog } from '@/components/game/admin/NotificationEditDialog';
import { TableSkeleton } from '@/components/game/admin/TableSkeleton';
import { TAB_FILTERS, getFilterValues } from '@/components/game/admin/config/filterConfig';
import { AvatarManager } from '@/components/game/admin/tabs/AvatarManager';
import { StartScreenEditor } from '@/components/game/admin/tabs/StartScreenEditor';
import { GameSettingsEditor } from '@/components/game/admin/tabs/GameSettingsEditor';
import ThemeEditor from '@/components/game/admin/tabs/ThemeEditor';
import MapEditor from '@/components/game/admin/tabs/MapEditor';
import GlobalSearchDialog from '@/components/game/admin/GlobalSearchDialog';
import { KeyboardShortcutsOverlay } from '@/components/game/admin/KeyboardShortcutsOverlay';
import { EntityTemplates } from '@/components/game/admin/EntityTemplates';
import { GameValidator } from '@/components/game/admin/GameValidator';
import { EntityColorConfig, useEntityColors } from '@/components/game/admin/EntityColorConfig';


// Filter out the 'hub' group (games tab) since game management lives on the dashboard
const EDITOR_TAB_GROUPS = TAB_GROUPS.filter(g => g.id !== 'hub');

const TABS_WITH_SORT_ORDER = new Set<TabId>([
  'quests', 'notifications', 'locations', 'npcs', 'archetypes', 'characters',
  'specials', 'enemies', 'enemy-abilities', 'boss-phases', 'achievements',
  'endings', 'secret-rooms', 'recipes', 'quest-chains',
]);

function getNameField(tab: TabId): string {
  if (tab === 'documents' || tab === 'events') return 'title';
  if (tab === 'characters') return 'displayName';
  if (tab === 'notifications') return 'label';
  return 'name';
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Cross-references & broken refs (#4 + #7) ──
  const [crossRefs, setCrossRefs] = useState<Record<string, Record<string, number>>>({});
  const [brokenRefs, setBrokenRefs] = useState<Record<string, Array<{ field: string; targetId: string }>>>({});
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({});

  // ── Bulk selection (#9) ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [importingJson, setImportingJson] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ── Dialog states for new features ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [validatorOpen, setValidatorOpen] = useState(false);
  const [colorConfigOpen, setColorConfigOpen] = useState(false);

  // ── Entity colors (#6) ──
  const entityColors = useEntityColors();

  const tabConfig = TABS.find(t => t.id === activeTab)!;
  const searchInputRef = useRef<HTMLInputElement>(null);
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
    if (!searchQuery.trim()) {
      result = data;
    } else {
      const q = searchQuery.toLowerCase();
      result = data.filter(row => {
        const id = String(row.id ?? '').toLowerCase();
        const name = String(row.name ?? row.title ?? '').toLowerCase();
        const type = String(row.type ?? row.category ?? '').toLowerCase();
        return id.includes(q) || name.includes(q) || type.includes(q);
      });
    }
    // Apply type/category filters
    const filterEntries = Object.entries(activeFilters);
    if (filterEntries.length > 0) {
      result = result.filter(row =>
        filterEntries.every(([key, value]) => String(row[key] ?? '') === value)
      );
    }
    // Sort
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
      setCounts(prev => ({ ...prev, [activeTab]: arr.length }));
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tabConfig.endpoint, activeTab, showStatus]);

  // ── Set activeGameId cookie so API routes use the correct game DB ──
  useEffect(() => {
    document.cookie = `activeGameId=${encodeURIComponent(gameId)}; path=/; SameSite=Lax`;
    return () => {
      document.cookie = 'activeGameId=; path=/; max-age=0';
    };
  }, [gameId]);

  // Fetch cross-references and broken refs from the references API
  const fetchRefs = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/references');
      if (res.ok) {
        const json = await res.json();
        setCrossRefs(json.crossRefs ?? {});
        setBrokenRefs(json.brokenRefs ?? {});
        setTypeLabels(json.typeLabels ?? {});
      }
    } catch {
      // silent — refs are optional enhancement
    }
  }, []);

  // ── Global search result handler (#1) ──
  const handleGlobalSearchSelect = useCallback((tabId: TabId, entityId: string) => {
    setActiveTab(tabId);
    // After tab switch, open edit for the entity
    setTimeout(() => {
      setEditingId(entityId);
      setCreating(false);
    }, 100);
  }, []);

  // ── Template create handler (#7) ──
  const handleTemplateCreate = useCallback(async (tabId: TabId, templateData: Record<string, unknown>) => {
    try {
      const targetTab = TABS.find(t => t.id === tabId);
      if (!targetTab) return;
      const res = await adminFetch(targetTab.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Template creato con successo!', 'success');
      setTemplatesOpen(false);
      setActiveTab(tabId);
      fetchCounts();
    } catch (err) {
      showStatus(`Errore creazione template: ${err}`, 'error');
    }
  }, [showStatus, fetchCounts]);

  // ── Validator navigate handler (#8) ──
  const handleValidatorNavigate = useCallback((tabId: string, entityId?: string) => {
    setActiveTab(tabId as TabId);
    if (entityId) {
      setTimeout(() => {
        setEditingId(entityId);
        setCreating(false);
      }, 100);
    }
  }, []);

  // ── Entity link navigate from forms (#11) ──
  const handleEntityNavigate = useCallback((tabId: string, entityId: string) => {
    handleDialogClose();
    setActiveTab(tabId as TabId);
    setTimeout(() => {
      setEditingId(entityId);
      setCreating(false);
    }, 100);
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    fetchCounts();
    fetchData();
    fetchRefs();
    setCreating(false);
    setEditingId(null);
    setSearchQuery('');
    setActiveFilters({});
    setSortKey(null);
    setSortDir('asc');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab, fetchData, fetchCounts, fetchRefs]);

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
      fetchRefs();
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
      fetchRefs();
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
      fetchRefs();
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
      // For notifications, keep the same type but allow new ID
      const res = await adminFetch(tabConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clone),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Clonato come "${newId.trim()}"!`, 'success');
      fetchData();
      fetchCounts();
      fetchRefs();
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

  // ── #5 Inline rename handler ──
  const handleInlineRename = useCallback(async (id: string, newName: string) => {
    const nameField = getNameField(activeTab);
    try {
      const res = await adminFetch(tabConfig.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [nameField]: newName }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Nome aggiornato!', 'success');
      fetchData();
      fetchRefs();
    } catch (err) {
      showStatus(`Errore rinomina: ${err}`, 'error');
    }
  }, [activeTab, tabConfig.endpoint, showStatus, fetchData, fetchRefs]);

  // ── #6 Import JSON handler ──
  const handleImportJson = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setImportingJson(true);
    try {
      const text = await file.text();
      let entities: Record<string, unknown>[];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          entities = parsed;
        } else {
          entities = [parsed];
        }
      } catch {
        showStatus('File JSON non valido', 'error');
        return;
      }
      if (entities.length === 0) {
        showStatus('File JSON vuoto', 'error');
        return;
      }
      for (const entity of entities) {
        if (!entity.id) {
          showStatus('Ogni entità deve avere un campo "id"', 'error');
          return;
        }
      }
      let imported = 0;
      let skipped = 0;
      for (const entity of entities) {
        const entityId = String(entity.id);
        const exists = data.some(r => String(r.id) === entityId);
        const method = exists ? 'PUT' : 'POST';
        const res = await adminFetch(tabConfig.endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entity),
        });
        if (res.ok) {
          imported++;
        } else {
          skipped++;
        }
      }
      showStatus(`Importati ${imported} entità${skipped > 0 ? `, ${skipped} errori` : ''}!`, 'success');
      fetchData();
      fetchCounts();
      fetchRefs();
    } catch (err) {
      showStatus(`Errore importazione: ${err}`, 'error');
    } finally {
      setImportingJson(false);
    }
  }, [tabConfig.endpoint, data, showStatus, fetchData, fetchCounts, fetchRefs]);

  // ── #9 Bulk delete handler ──
  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Eliminare ${selectedIds.size} entità selezionate?`)) return;
    let deleted = 0;
    let errors = 0;
    for (const id of selectedIds) {
      try {
        const res = await adminFetch(`${tabConfig.endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) deleted++;
        else errors++;
      } catch {
        errors++;
      }
    }
    showStatus(`Eliminate ${deleted} entità${errors > 0 ? `, ${errors} errori` : ''}!`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
    fetchData();
    fetchCounts();
    fetchRefs();
  }, [selectedIds, tabConfig.endpoint, showStatus, fetchData, fetchCounts, fetchRefs]);

  // ── #9 Bulk export handler ──
  const handleBulkExport = useCallback(() => {
    const selected = data.filter(r => selectedIds.has(String(r.id)));
    if (selected.length === 0) return;
    const json = JSON.stringify(selected, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, selectedIds, activeTab]);

  // ── #9 Toggle select handler ──
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── #9 Select all handler ──
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(r => String(r.id))));
    }
  }, [selectedIds.size, filteredData]);

  // ── #8 Reorder handler ──
  const handleReorder = useCallback(async (fromId: string, toId: string) => {
    const fromRow = data.find(r => String(r.id) === fromId);
    const toRow = data.find(r => String(r.id) === toId);
    if (!fromRow || !toRow) return;
    const fromSort = Number(fromRow.sortOrder ?? 0);
    const toSort = Number(toRow.sortOrder ?? 0);
    if (fromSort === toSort) return;
    try {
      const [res1, res2] = await Promise.all([
        adminFetch(tabConfig.endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fromId, sortOrder: toSort }),
        }),
        adminFetch(tabConfig.endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: toId, sortOrder: fromSort }),
        }),
      ]);
      if (!res1.ok || !res2.ok) throw new Error('Errore riordino');
      fetchData();
    } catch (err) {
      showStatus(`Errore riordino: ${err}`, 'error');
    }
  }, [data, tabConfig.endpoint, showStatus, fetchData]);

  const handleOpenCreate = useCallback(() => {
    setCreating(true);
    setEditingId(null);
  }, []);

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  // ── #2 Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      // ? — shortcuts overlay (only when not in input)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
        return;
      }

      // Ctrl+K — global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
        return;
      }

      // Don't fire other shortcuts when in input fields (unless Ctrl)
      if (isInput && !(e.ctrlKey || e.metaKey)) return;

      // Ctrl+N — new entity
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !dialogOpen && !tabConfig.custom) {
        e.preventDefault();
        handleOpenCreate();
        return;
      }

      // Ctrl+F — focus tab search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Ctrl+E — export selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && selectedIds.size > 0) {
        e.preventDefault();
        handleBulkExport();
        return;
      }

      // Ctrl+D — clone first selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.size > 0) {
        e.preventDefault();
        const firstId = Array.from(selectedIds)[0];
        if (firstId) handleClone(firstId);
        return;
      }

      // Delete — delete first selected
      if (e.key === 'Delete' && selectedIds.size > 0) {
        e.preventDefault();
        handleBulkDelete();
        return;
      }

      // Ctrl+Shift+T — table view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setViewMode('table');
        return;
      }

      // Ctrl+Shift+C — card view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setViewMode('card');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogOpen, tabConfig.custom, selectedIds, handleOpenCreate, handleBulkExport, handleBulkDelete, handleClone]);

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

  // ── Shared sidebar content (desktop + mobile drawer) ──
  const renderSidebarContent = () => (
    <>
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
                {group.tabs.map(tab => {
                  const tabColor = entityColors[tab.id];
                  const isActive = activeTab === tab.id;
                  return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-2 pl-3 pr-3 py-2 text-left transition-all ${
                      isActive
                        ? 'border-l-2 -ml-[1px]'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border-l-2 border-transparent -ml-[1px]'
                    }`}
                    style={isActive ? {
                      backgroundColor: tabColor ? `${tabColor}10` : 'rgba(16,185,129,0.1)',
                      color: tabColor || '#6ee7b7',
                      borderColor: tabColor || '#10b981',
                    } : undefined}
                  >
                    <span className="shrink-0">{tab.icon}</span>
                    <span className="text-[13px] font-medium flex-1 truncate">{tab.label}</span>
                    {!tab.custom && (
                      <span className={`text-[12px] min-w-[18px] text-center px-1 py-0.5 rounded-full font-mono ${
                        isActive
                          ? ''
                          : 'bg-white/[0.06] text-white/25'
                      }`}
                      style={isActive ? {
                        backgroundColor: tabColor ? `${tabColor}20` : 'rgba(16,185,129,0.2)',
                        color: tabColor ? `${tabColor}cc` : '#a7f3d0',
                      } : undefined}
                    >
                        {counts[tab.id] ?? 0}
                      </span>
                    )}
                  </button>
                );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* ── Top Bar ── */}
      <div
        className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-3 border-b border-white/[0.06]"
        style={{
          background: 'rgba(8, 8, 14, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 text-[13px] text-white/50 hover:text-white/80 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="hidden sm:block w-px h-4 bg-white/[0.1]" />
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <span className="text-base">⚙️</span>
            <span className="text-sm font-black tracking-wider text-emerald-400 shrink-0">EDITOR</span>
            <span className="text-[11px] sm:text-[12px] text-white/25 bg-white/[0.06] px-2 py-0.5 rounded-md font-mono truncate max-w-[100px] sm:max-w-none">{gameId || '...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* #1 — Global Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
              title="Ricerca globale (Ctrl+K)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Cerca</span>
              <kbd className="hidden lg:inline text-[10px] text-white/25 border border-white/[0.1] rounded px-1 py-px ml-1 font-mono">⌘K</kbd>
            </button>

            {/* #7 — Templates button */}
            <button
              onClick={() => setTemplatesOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
              title="Template predefiniti"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Template</span>
            </button>

            {/* #8 — Validator button */}
            <button
              onClick={() => setValidatorOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
              title="Validatore completezza gioco"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Valida</span>
            </button>

            {/* #6 — Color config button */}
            <button
              onClick={() => setColorConfigOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
              title="Colori per tipologia"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {/* #2 — Shortcuts hint */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="hidden sm:flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-colors"
              title="Scelte rapide (?)"
            >
              <span className="text-[13px] font-mono">?</span>
            </button>

            <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshGameData}
              disabled={refreshing}
              className="text-xs px-2 sm:px-3 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/25 bg-emerald-600/10"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <button
              onClick={() => onPlay(gameId)}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1.5 rounded-md text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/15 border border-emerald-500/25 bg-emerald-600/10 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Play Test</span>
            </button>
          </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* ── Mobile sidebar overlay ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-40 bg-black/60"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] border-r border-white/[0.06] bg-[#0a0a0f] flex flex-col py-2 overflow-y-auto admin-scrollbar"
              >
                {renderSidebarContent()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Desktop Vertical Sidebar with Groups ── */}
        <div className="hidden lg:block w-[200px] shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col py-2 overflow-y-auto admin-scrollbar">
          {renderSidebarContent()}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {dialogOpen && !tabConfig.custom ? (
            <>
              {/* Form header bar */}
              <div className="shrink-0 flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-white/[0.06]">
                <button
                  onClick={handleDialogClose}
                  className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Torna alla lista</span>
                </button>
                <div className="hidden sm:block w-px h-4 bg-white/[0.1]" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-emerald-400">
                    {activeTab === 'notifications'
                      ? (editingId ? `Modifica Notifica: ${editingId}` : 'Nuova Notifica')
                      : (editingId ? `Modifica: ${editingId}` : `Nuovo ${tabConfig.entityLabel}`)
                    }
                  </h2>
                  <p className="text-[12px] text-white/40">
                    {activeTab === 'notifications'
                      ? (editingId
                        ? 'Personalizza i colori, animazioni e media per questa notifica'
                        : 'Configura una nuova notifica per il gioco')
                      : (editingId
                        ? 'Modifica i campi e premi Salva per aggiornare'
                        : `Compila i campi per creare un nuovo ${tabConfig.entityLabel.toLowerCase()}`)}
                  </p>
                </div>
              </div>
              {/* Form body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 admin-scrollbar">
                {activeTab === 'notifications' ? (
                  <NotificationEditDialog
                    key={editingId || '__new__'}
                    initialData={editingData}
                    onSave={handleUpdate}
                    onCancel={handleDialogClose}
                    isEdit={!!editingId}
                  />
                ) : (
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
                    onNavigate={handleEntityNavigate}
                  />
                )}
              </div>
              {/* Sticky footer */}
              <div className="shrink-0 px-4 sm:px-8 py-3 border-t border-white/[0.06]">
                <FormActions
                  submitLabel={editingId ? 'Salva Modifiche' : (activeTab === 'notifications' ? 'Crea Notifica' : `Crea ${tabConfig.entityLabel}`)}
                  onCancel={handleDialogClose}
                  formId={activeTab === 'notifications' ? 'notif-form' : 'entity-form'}
                />
              </div>
            </>
          ) : (
            <>
              {/* Tab title */}
              <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-white/[0.04]">
                <span className="shrink-0">{tabConfig.icon}</span>
                <h2 className="text-sm font-semibold text-white/80">{tabConfig.label}</h2>
                <span className="text-[11px] text-white/25 font-mono ml-auto">{counts[activeTab] ?? 0}</span>
              </div>
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

                  {/* Toolbar: Add + Filters + View Toggle + Search */}
                  <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/[0.04]">
                    <Button
                      size="sm"
                      onClick={handleOpenCreate}
                      className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Aggiungi Nuovo {tabConfig.entityLabel}</span>
                    </Button>

                    {/* #6 — Import JSON button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importingJson}
                      className="text-xs gap-1.5 border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06] shrink-0"
                      title="Importa JSON"
                    >
                      <span className="text-sm">{importingJson ? '⏳' : '📥'}</span>
                      <span className="hidden sm:inline">Importa JSON</span>
                    </Button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportJson}
                    />

                    {/* #9 — Seleziona toggle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (selectionMode) {
                          setSelectionMode(false);
                          setSelectedIds(new Set());
                        } else {
                          setSelectionMode(true);
                        }
                      }}
                      className={`text-xs gap-1.5 border shrink-0 ${
                        selectionMode
                          ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                      }`}
                      title={selectionMode ? 'Esci dalla selezione' : 'Attiva selezione multipla'}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Seleziona</span>
                    </Button>

                    {/* #9 — Select all checkbox when in selection mode */}
                    {selectionMode && filteredData.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="flex items-center gap-1.5 text-[12px] text-white/50 cursor-pointer select-none">
                          <Checkbox
                            checked={selectedIds.size === filteredData.length}
                            onCheckedChange={handleSelectAll}
                            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400"
                          />
                          Seleziona tutto
                        </label>
                      </div>
                    )}

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
                                <option value="" style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.5)' }}>
                                  {f.label}...
                                </option>
                                {options.map(o => (
                                  <option key={o.value} value={o.value} style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.85)' }}>
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

                    {/* View mode toggle */}
                    <div className="flex items-center border border-white/[0.08] rounded-md overflow-hidden shrink-0">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center justify-center w-7 h-7 transition-colors ${
                          viewMode === 'table'
                            ? 'bg-white/[0.08] text-white/70'
                            : 'text-white/30 hover:text-white/50'
                        }`}
                        title="Vista tabella"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('card')}
                        className={`flex items-center justify-center w-7 h-7 transition-colors ${
                          viewMode === 'card'
                            ? 'bg-white/[0.08] text-white/70'
                            : 'text-white/30 hover:text-white/50'
                        }`}
                        title="Vista schede"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative w-36 sm:w-56">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cerca... (Ctrl+K globale)"
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

                  {/* Data content: table or cards */}
                  <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 admin-scrollbar">
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
                    ) : viewMode === 'card' ? (
                      <EntityCardGrid
                        data={filteredData}
                        activeTab={activeTab}
                        onEdit={handleOpenEdit}
                        onDelete={handleDelete}
                        onClone={handleClone}
                        crossRefs={crossRefs}
                        brokenRefs={brokenRefs}
                        typeLabels={typeLabels}
                        onInlineRename={handleInlineRename}
                        reorderable={viewMode === 'card' && TABS_WITH_SORT_ORDER.has(activeTab)}
                        onReorder={handleReorder}
                        selectedIds={selectedIds}
                        selectionMode={selectionMode}
                        onToggleSelect={handleToggleSelect}
                        entityColor={entityColors[activeTab]}
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            {selectionMode && (
                              <TableHead className="w-10 px-2">
                                <Checkbox
                                  checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                                  onCheckedChange={handleSelectAll}
                                  className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400"
                                />
                              </TableHead>
                            )}
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
                            <TableHead className="text-[12px] font-semibold text-white/40 uppercase tracking-wider text-right w-32">
                              Azioni
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((row, idx) => {
                            const rowId = String(row.id ?? '');
                            const rowBroken = brokenRefs[rowId];
                            const rowCross = crossRefs[rowId];
                            const hasBroken = rowBroken && rowBroken.length > 0;
                            const crossTotal = rowCross ? Object.values(rowCross).reduce((s, c) => s + c, 0) : 0;
                            return (
                              <TableRow
                                key={rowId || `row-${idx}`}
                                className={`border-white/[0.04] hover:bg-white/[0.05] transition-colors ${hasBroken ? 'border-l-2 border-l-red-500/60' : ''} ${
                                  selectionMode && selectedIds.has(rowId) ? 'bg-emerald-500/5' : ''
                                }`}
                              >
                                {/* #9 — Selection checkbox column */}
                                {selectionMode && (
                                  <TableCell className="py-2.5 px-2 w-10">
                                    <Checkbox
                                      checked={selectedIds.has(rowId)}
                                      onCheckedChange={() => handleToggleSelect(rowId)}
                                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400"
                                    />
                                  </TableCell>
                                )}
                                {/* Refs indicator column */}
                                <TableCell className="py-2.5 px-1 w-8">
                                  <div className="flex items-center gap-0.5">
                                    {hasBroken && (
                                      <span
                                        className="inline-flex items-center justify-center w-4 h-4 rounded bg-red-500/15 text-red-400"
                                        title={`⚠ ${rowBroken.length} riferimenti rotti:\n${rowBroken.map(r => `• ${r.field}: ${r.targetId}`).join('\n')}`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                    {crossTotal > 0 && (
                                      <span
                                        className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-sky-500/10 text-sky-400 text-[10px] font-mono"
                                        title={`🔗 Usato da ${crossTotal} entità:\n${Object.entries(rowCross).map(([t, c]) => `${c}× ${typeLabels[t] || t}`).join('\n')}`}
                                      >
                                        {crossTotal}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                {columns.map(col => (
                                  <TableCell key={col.key} className={`text-sm text-white/70 py-2.5 px-2 ${col.width ?? ''}`}>
                                    {col.render
                                      ? col.render(row, activeTab)
                                      : String(row[col.key] ?? '—')
                                    }
                                  </TableCell>
                                ))}
                                <TableCell className="text-right py-2.5 px-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleClone(rowId)}
                                      className="h-7 px-2 text-[12px] gap-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                                      title="Duplica"
                                    >
                                      <Copy className="w-3 h-3" />
                                      <span className="hidden sm:inline">Clona</span>
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

                  {/* #9 — Bulk action bar */}
                  {selectedIds.size > 0 && (
                    <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2.5 border-t border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[13px] font-medium text-emerald-300">
                        {selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}
                      </span>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleBulkExport}
                        className="text-xs gap-1.5 border border-white/[0.08] text-white/60 hover:text-white/80 hover:bg-white/[0.06]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Esporta JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleBulkDelete}
                        className="text-xs gap-1.5 border border-red-500/25 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Elimina selezione
                      </Button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-3 sm:px-4 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
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
            </>
          )}
        </div>
      </div>

      {/* ── #1 Global Search Dialog ── */}
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleGlobalSearchSelect}
      />

      {/* ── #2 Keyboard Shortcuts Overlay ── */}
      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      {/* ── #6 Entity Color Config ── */}
      {colorConfigOpen && (
        <EntityColorConfig
          open={colorConfigOpen}
          onOpenChange={setColorConfigOpen}
        />
      )}

      {/* ── #7 Entity Templates ── */}
      <EntityTemplates
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onCreateFromTemplate={handleTemplateCreate}
        activeTab={activeTab}
      />

      {/* ── #8 Game Validator ── */}
      <GameValidator
        open={validatorOpen}
        onOpenChange={setValidatorOpen}
        onNavigateTo={handleValidatorNavigate}
      />
    </div>
  );
}
