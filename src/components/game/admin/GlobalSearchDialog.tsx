'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { adminFetch } from '@/lib/admin-fetch';
import { TABS } from '@/components/game/admin/config/tabGroups';
import type { TabId } from '@/components/game/admin/config/tabGroups';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SearchableTab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  endpoint: string;
  nameField: string;
}

interface SearchResult {
  tabId: TabId;
  entityId: string;
  name: string;
  icon: React.ReactNode;
  tabLabel: string;
}

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

/** Tabs that have real list endpoints and should be searchable. */
const SEARCHABLE_TAB_IDS: Set<string> = new Set([
  'items', 'quests', 'events', 'documents', 'notifications', 'locations',
  'npcs', 'archetypes', 'characters', 'specials', 'enemies',
  'enemy-abilities', 'boss-phases', 'achievements', 'endings',
  'secret-rooms', 'recipes', 'quest-chains',
]);

/** Determine the display-name field for a given tab id. */
function getNameField(tabId: TabId): string {
  if (tabId === 'documents' || tabId === 'events') return 'title';
  if (tabId === 'characters') return 'displayName';
  if (tabId === 'notifications') return 'label';
  return 'name';
}

/** Pre-computed list of searchable tab configs (stable reference). */
const SEARCHABLE_TABS: SearchableTab[] = TABS.filter(
  (t) => SEARCHABLE_TAB_IDS.has(t.id),
).map((t) => ({
  id: t.id,
  label: t.label,
  icon: t.icon,
  endpoint: t.endpoint,
  nameField: getNameField(t.id),
}));

// ═══════════════════════════════════════════════════════════════
// Cache (module-level — survives re-renders, cleared on open)
// ═══════════════════════════════════════════════════════════════

const entityCache = new Map<TabId, Record<string, unknown>[]>();

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tabId: TabId, entityId: string) => void;
}

export default function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [fetched, setFetched] = useState(false);
  const [rawActiveIndex, setRawActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Derived loading state — avoids synchronous setState in effect
  const isLoading = open && !fetched;

  // Effective values reset to defaults when closed (avoids setState in effect)
  const effectiveQuery = open ? query : '';
  const effectiveDebouncedQuery = open ? debouncedQuery : '';
  const effectiveRawIndex = open ? rawActiveIndex : -1;

  // ── Focus input when opened ────────────────────────────────
  useEffect(() => {
    if (open) {
      // Small delay so Radix dialog animation settles
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Fetch all entities on first open ───────────────────────
  useEffect(() => {
    if (!open || fetched) return;

    let cancelled = false;

    (async () => {
      const uncached = SEARCHABLE_TABS.filter((t) => !entityCache.has(t.id));

      if (uncached.length === 0) {
        if (!cancelled) setFetched(true);
        return;
      }

      const results = await Promise.allSettled(
        uncached.map(async (t) => {
          const res = await adminFetch(t.endpoint);
          if (!res.ok) throw new Error(`${t.endpoint} returned ${res.status}`);
          const data = await res.json();
          return { tabId: t.id, entities: (Array.isArray(data) ? data : []) as Record<string, unknown>[] };
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && !cancelled) {
          entityCache.set(r.value.tabId, r.value.entities);
        }
      }

      if (!cancelled) {
        setFetched(true);
      }
    })();

    return () => { cancelled = true; };
  }, [open, fetched]);

  // ── Debounce query ─────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Search & group results ─────────────────────────────────
  const grouped = useMemo(() => {
    const q = effectiveDebouncedQuery.trim().toLowerCase();
    if (!q) return [];

    const groups: { tabId: TabId; tabLabel: string; icon: React.ReactNode; results: SearchResult[] }[] = [];

    for (const tab of SEARCHABLE_TABS) {
      const entities = entityCache.get(tab.id);
      if (!entities) continue;

      const matched: SearchResult[] = [];

      for (const entity of entities) {
        const id = String(entity.id ?? '');
        const name = String(entity[tab.nameField] ?? '');
        const description = String(entity.description ?? '');

        if (
          id.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          description.toLowerCase().includes(q)
        ) {
          matched.push({
            tabId: tab.id,
            entityId: id,
            name: name || id,
            icon: tab.icon,
            tabLabel: tab.label,
          });
        }
      }

      if (matched.length > 0) {
        groups.push({ tabId: tab.id, tabLabel: tab.label, icon: tab.icon, results: matched });
      }
    }

    return groups;
  }, [effectiveDebouncedQuery]);

  // ── Flat list for keyboard navigation ──────────────────────
  const flatResults = useMemo(
    () => grouped.flatMap((g) => g.results),
    [grouped],
  );

  // Clamp active index via memo instead of effect
  const activeIndex = useMemo(() => {
    if (effectiveRawIndex >= flatResults.length) {
      return flatResults.length > 0 ? flatResults.length - 1 : -1;
    }
    return effectiveRawIndex;
  }, [effectiveRawIndex, flatResults.length]);

  // ── Build a cumulative index map (group → start offset) ───
  const groupOffsets = useMemo(() => {
    const map = new Map<TabId, number>();
    let offset = 0;
    for (const g of grouped) {
      map.set(g.tabId, offset);
      offset += g.results.length;
    }
    return map;
  }, [grouped]);

  // ── Keyboard handling ──────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setRawActiveIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setRawActiveIndex((prev) =>
            prev > 0 ? prev - 1 : flatResults.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < flatResults.length) {
            const item = flatResults[activeIndex];
            onSelect(item.tabId, item.entityId);
            onOpenChange(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flatResults, activeIndex, onSelect, onOpenChange],
  );

  // ── Click handler ──────────────────────────────────────────
  const handleSelect = useCallback(
    (tabId: TabId, entityId: string) => {
      onSelect(tabId, entityId);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  // ── Scroll active item into view ───────────────────────────
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = document.getElementById(`gs-result-${activeIndex}`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // ── Total result count ─────────────────────────────────────
  const totalCount = flatResults.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="!bg-black/70 backdrop-blur-sm"
        className="!max-w-lg !rounded-xl !border-white/[0.08] !bg-[#111827] !p-0 !shadow-2xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Ricerca globale entità</DialogTitle>
        {/* ── Search input ──────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={effectiveQuery}
            onChange={(e) => {
              setQuery(e.target.value);
              // Also reset active index when typing
              setRawActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
          {effectiveQuery && (
            <button
              onClick={() => {
                setQuery('');
                setRawActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400/60" />
          )}
        </div>

        {/* ── Results ───────────────────────────────────────── */}
        <div className="max-h-[400px] overflow-y-auto overscroll-contain scroll-smooth">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-white/30">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400/40" />
              <span className="text-xs">Caricamento elementi...</span>
            </div>
          ) : !effectiveDebouncedQuery.trim() ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-white/25">
              <Search className="h-5 w-5" />
              <span className="text-xs">Digita per cercare</span>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-white/25">
              <Search className="h-5 w-5" />
              <span className="text-xs">Nessun risultato per &quot;{effectiveDebouncedQuery.trim()}&quot;</span>
            </div>
          ) : (
            <div role="listbox" aria-label="Search results">
              {grouped.map((group) => {
                const offset = groupOffsets.get(group.tabId) ?? 0;
                return (
                  <div key={group.tabId}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2 first:border-t-0">
                      <span className="text-white/30 [&>svg]:h-3 [&>svg]:w-3">
                        {group.icon}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                        {group.tabLabel}
                      </span>
                      <span className="text-[11px] text-white/20">
                        {group.results.length}
                      </span>
                    </div>

                    {/* Results */}
                    {group.results.map((item, i) => {
                      const flatIdx = offset + i;
                      const isActive = flatIdx === activeIndex;
                      return (
                        <button
                          id={`gs-result-${flatIdx}`}
                          key={`${group.tabId}-${item.entityId}`}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelect(item.tabId, item.entityId)}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'text-white/70 hover:bg-white/[0.06] hover:text-white/90'
                          }`}
                        >
                          <span
                            className={`shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5 ${
                              isActive ? 'text-emerald-400' : 'text-white/30'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/30">
                            {item.entityId}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div ref={resultsEndRef} />
            </div>
          )}
        </div>

        {/* ── Footer hint ────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
          <span className="text-[11px] text-white/20">
            {totalCount > 0
              ? `${totalCount} risultato${totalCount !== 1 ? 'i' : ''}`
              : `${SEARCHABLE_TABS.length} categorie`}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-white/20">
            <span>
              <kbd className="rounded border border-white/[0.1] px-1 py-px font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              naviga
            </span>
            <span>
              <kbd className="rounded border border-white/[0.1] px-1 py-px font-mono text-[10px]">
                ↵
              </kbd>{' '}
              apri
            </span>
            <span>
              <kbd className="rounded border border-white/[0.1] px-1 py-px font-mono text-[10px]">
                esc
              </kbd>{' '}
              chiudi
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
