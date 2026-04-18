'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Minus, Trash2, Save, Search, Loader2,
  Play, Pause, CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TabId } from './config/tabGroups';
import type { FieldDef } from './config/fieldDefinitions';
import {
  EFFECT_TYPES_CONFIG, EFFECT_CATEGORY_COLORS,
  EFFECT_TARGET_OPTIONS, EFFECT_STATUS_LIST, EFFECT_STAT_LIST,
  parseEffectsArray, getDefaultEffect, TRIGGER_OPTIONS,
} from './config/effectTypes';
import { getEnumLabel, getEnumHint } from './config/enumLabels';
import { MEDIA_UPLOADS } from './shared';
import { MediaUploadBox } from './MediaUploadBox';

// ═══════════════════════════════════════════════════════════════
// Entity Search Input (searchable ID reference fields)
// ═══════════════════════════════════════════════════════════════
function EntitySearchInput({
  value,
  onChange,
  endpoint,
  labelKey,
  iconKey,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data: Record<string, unknown>[] = await res.json();
      const lower = q.toLowerCase();
      const filtered = data
        .filter(r => {
          const id = String(r.id).toLowerCase();
          const label = String(r[labelKey] ?? '').toLowerCase();
          return id.includes(lower) || label.includes(lower);
        })
        .slice(0, 10)
        .map(r => ({ id: String(r.id), label: String(r[labelKey] ?? r.id), icon: iconKey ? String(r[iconKey] ?? '') : undefined }));
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    } catch {
      // silent fail
    } finally {
      setSearching(false);
    }
  }, [endpoint, labelKey, iconKey]);

  const handleInputChange = (v: string) => {
    setQuery(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSelect = (id: string) => {
    setQuery(id);
    onChange(id);
    setShowDropdown(false);
  };

  const handleSearchClick = () => {
    doSearch(query);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={placeholder ?? 'Cerca...'}
          disabled={disabled}
          className="flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={disabled || searching}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded bg-white/[0.06] border border-white/[0.1] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors disabled:opacity-40"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/[0.12] bg-black shadow-xl admin-scrollbar">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-2"
            >
              {r.icon && <span className="shrink-0 w-5 text-center">{r.icon}</span>}
              <span className="text-white/90 font-mono">{r.id}</span>
              <span className="text-white/30 ml-2 truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Entity-Aware Tag Editor — searchable multi-select for entity pools
// ═══════════════════════════════════════════════════════════════
function EntityTagEditor({ value, onChange, endpoint, labelKey, iconKey, placeholder }: {
  value: unknown;
  onChange: (v: string[]) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
  placeholder?: string;
}) {
  const tags = useMemo(() => parseStringArray(value), [value]);
  const [entities, setEntities] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load entities from endpoint on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        const mapped = data.map(r => ({
          id: String(r.id),
          label: String(r[labelKey] ?? r.id),
          icon: iconKey ? String(r[iconKey] ?? '') : undefined,
        }));
        setEntities(mapped);
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, [endpoint, labelKey, iconKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build a lookup map: id → entity
  const entityMap = useMemo(() => {
    const m = new Map<string, { id: string; label: string; icon?: string }>();
    entities.forEach(e => m.set(e.id, e));
    return m;
  }, [entities]);

  const selected = tags.map(id => entityMap.get(id)).filter(Boolean) as { id: string; label: string; icon?: string }[];

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return entities.filter(e => !tags.includes(e.id));
    const q = query.toLowerCase();
    return entities.filter(e =>
      !tags.includes(e.id) &&
      (e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [entities, tags, query]);

  const handleSelect = (id: string) => {
    if (!tags.includes(id)) {
      onChange([...tags, id]);
    }
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md bg-white/[0.04] border border-white/[0.1]">
        {selected.length === 0 && !query && (
          <span className="text-[12px] text-white/20 italic">{placeholder ?? 'Cerca e seleziona...'}</span>
        )}
        {selected.map((entity, i) => (
          <span key={entity.id + '-' + i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300 group/tag">
            {entity.icon && <span className="mr-0.5">{entity.icon}</span>}
            <span className="font-mono text-emerald-400/60">{entity.id}</span>
            <span className="text-white/50">{entity.label}</span>
            <button type="button" onClick={() => removeTag(i)} className="text-emerald-500/40 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setShowDropdown(false); e.stopPropagation(); }
          }}
          placeholder={selected.length === 0 ? placeholder : 'Cerca...'}
          className="flex-1 min-w-[100px] text-[12px] bg-transparent border-none outline-none text-white/70 placeholder-white/20"
        />
      </div>
      {/* Dropdown */}
      {showDropdown && filteredOptions.length > 0 && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 max-h-52 overflow-y-auto rounded-lg border border-white/[0.12] bg-black/98 shadow-xl admin-scrollbar">
            {filteredOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-2"
              >
                {opt.icon && <span className="shrink-0 w-5 text-center">{opt.icon}</span>}
                <span className="font-mono text-emerald-300/80 shrink-0">{opt.id}</span>
                <span className="text-white/50 truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!loaded && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/20">
          <Loader2 className="w-3 h-3 animate-spin" /> Caricamento entità...
        </div>
      )}
      <p className="text-[11px] text-white/15">
        Seleziona dalla lista · {tags.length} selezionati · {entities.length - tags.length} disponibili
      </p>
    </div>
  );
}

/** Mini entity search input — used inside ItemPoolEditor rows */
function MiniEntitySearch({ value, onChange, endpoint, labelKey, iconKey }: {
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
}) {
  const [entities, setEntities] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        const mapped = data.map(r => ({
          id: String(r.id),
          label: String(r[labelKey] ?? r.id),
          icon: iconKey ? String(r[iconKey] ?? '') : undefined,
        }));
        setEntities(mapped);
      } catch { /* silent */ }
    })();
  }, [endpoint, labelKey, iconKey]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Find current entity name
  const currentEntity = entities.find(e => e.id === value);

  const handleInputChange = (v: string) => {
    setQuery(v);
    onChange(v);
    const q = v.toLowerCase();
    const filtered = entities.filter(e =>
      e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q)
    ).slice(0, 10);
    setResults(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelect = (id: string) => {
    setQuery(id);
    onChange(id);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => {
          if (query.length > 0) handleInputChange(query);
        }}
        placeholder="Cerca..."
        className="w-full text-[12px] bg-black border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-emerald-500/40"
      />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 max-h-40 overflow-y-auto rounded-md border border-white/[0.12] bg-black shadow-xl admin-scrollbar">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-2 py-1.5 text-[12px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-1.5"
            >
              {r.icon && <span className="shrink-0 w-4 text-center text-xs">{r.icon}</span>}
              <span className="font-mono text-emerald-300/70 shrink-0">{r.id}</span>
              <span className="text-white/40 truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
      {currentEntity && !showDropdown && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/20 truncate max-w-[100px] pointer-events-none">
          {currentEntity.label}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Visual Pool Editors
// ═══════════════════════════════════════════════════════════════

/** Helper: parse a value that could be string JSON, string[], or unknown into string[] */
function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    if (val.trim() === '' || val.trim() === '[]') return [];
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
}

/** Tag Editor — for simple string arrays (enemyPool, nextLocations) */
function TagEditor({ value, onChange, placeholder }: { value: unknown; onChange: (v: string[]) => void; placeholder?: string }) {
  const tags = parseStringArray(value);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const v = inputVal.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
      setInputVal('');
      inputRef.current?.focus();
    }
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md bg-white/[0.04] border border-white/[0.1]">
        {tags.length === 0 && !inputVal && (
          <span className="text-[12px] text-white/20 italic">{placeholder ?? 'Premi Invio per aggiungere...'}</span>
        )}
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300 font-mono group/tag">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-emerald-500/40 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={tags.length === 0 ? placeholder : 'Aggiungi...'}
          className="flex-1 min-w-[80px] text-[12px] bg-transparent border-none outline-none text-white/70 placeholder-white/20 font-mono"
        />
      </div>
      <p className="text-[11px] text-white/15">Premi <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/25 font-mono">Invio</kbd> per aggiungere</p>
    </div>
  );
}

/** Item Pool Editor — table with itemId, chance%, quantity */
function ItemPoolEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; chance: number; quantity: number }[]) => void }) {
  let items: { itemId: string; chance: number; quantity: number }[] = [];
  if (Array.isArray(value)) {
    items = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), chance: Number(o.chance ?? 0), quantity: Number(o.quantity ?? 1) };
      }
      return { itemId: String(r), chance: 0, quantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { items = JSON.parse(value) || []; } catch { items = []; }
  }

  const addItem = () => {
    onChange([...items, { itemId: '', chance: 30, quantity: 1 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: string | number) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: val } : item);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Chance %</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={item.itemId}
                    onChange={v => updateItem(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.chance}
                    onChange={e => updateItem(i, 'chance', Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">
                  Nessun oggetto — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi oggetto
      </button>
    </div>
  );
}

/** Item Box Defaults Editor — table with itemId and quantity (no chance) */
export function ItemBoxDefaultsEditor({ value, onChange }: { value: string; onChange: (v: { itemId: string; quantity: number }[]) => void }) {
  let items: { itemId: string; quantity: number }[] = [];
  try { items = JSON.parse(value) || []; } catch { items = []; }

  const addItem = () => onChange([...items, { itemId: '', quantity: 1 }]);

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, val: string | number) => {
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-24">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={item.itemId}
                    onChange={v => updateItem(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-white/15 italic">
                  Nessun oggetto — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi oggetto
      </button>
    </div>
  );
}

/** Text List Editor — for ambient text (array of strings) */
function TextListEditor({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
  const texts = parseStringArray(value);

  const addText = () => onChange([...texts, '']);
  const removeText = (idx: number) => onChange(texts.filter((_, i) => i !== idx));
  const updateText = (idx: number, val: string) => {
    const updated = texts.map((t, i) => i === idx ? val : t);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <div className="space-y-1 max-h-48 overflow-y-auto admin-scrollbar">
        {texts.map((text, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="shrink-0 w-5 text-[11px] text-white/20 font-mono pt-1.5">{i + 1}.</span>
            <textarea
              value={text}
              onChange={e => updateText(i, e.target.value)}
              placeholder={`Testo ambientale ${i + 1}...`}
              rows={2}
              className="flex-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y focus:outline-none focus:border-emerald-500/40 italic"
            />
            <button type="button" onClick={() => removeText(i)} className="shrink-0 mt-1.5 text-white/15 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {texts.length === 0 && (
          <p className="text-[12px] text-white/15 italic text-center py-2">Nessun testo — clicca + per aggiungere</p>
        )}
      </div>
      <button
        type="button"
        onClick={addText}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi testo
      </button>
    </div>
  );
}

/** Requirements Editor — visual editor for ending requirements */
const REQUIREMENT_TYPES = [
  { value: 'boss_defeated', label: 'Boss Sconfitto', icon: '💀', hint: 'ID del boss (es: tyrant_boss)' },
  { value: 'npc_saved', label: 'NPC Salvato', icon: '👤', hint: 'ID dell\'NPC (es: npc_marco)' },
  { value: 'documents_found', label: 'Documenti Trovati', icon: '📄', hint: 'Numero minimo di documenti' },
  { value: 'turn_limit', label: 'Limite Turni', icon: '⏱️', hint: 'Turni massimi per il completamento' },
  { value: 'party_alive', label: 'Gruppo Intero', icon: '👥', hint: 'Tutti i PG sopravvivono (valore: true)' },
  { value: 'secret_rooms', label: 'Stanze Segrete', icon: '🚪', hint: 'Numero minimo di stanze segrete' },
];

function RequirementsEditor({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
  let reqs: { type: string; value: string }[] = [];
  if (Array.isArray(value)) {
    reqs = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { type: String(o.type ?? 'boss_defeated'), value: String(o.value ?? '') };
      }
      return { type: String(r), value: '' };
    });
  } else if (typeof value === 'string') {
    try { reqs = JSON.parse(value) || []; } catch { reqs = []; }
  }

  const add = () => onChange(JSON.stringify([...reqs, { type: 'boss_defeated', value: '' }]));
  const remove = (idx: number) => onChange(JSON.stringify(reqs.filter((_, i) => i !== idx)));
  const update = (idx: number, field: string, val: string) => {
    const updated = reqs.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-1.5">
      <div className="space-y-1.5 max-h-52 overflow-y-auto admin-scrollbar">
        {reqs.map((req, i) => {
          const typeDef = REQUIREMENT_TYPES.find(t => t.value === req.type);
          return (
            <div key={i} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5">
              <span className="shrink-0 w-5 text-[11px] text-white/20 font-mono">{i + 1}.</span>
              <select
                value={req.type}
                onChange={e => update(i, 'type', e.target.value)}
                className="shrink-0 text-[12px] bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none focus:border-emerald-500/40"
              >
                {REQUIREMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              <input
                value={req.value}
                onChange={e => update(i, 'value', e.target.value)}
                placeholder={typeDef?.hint ?? 'valore...'}
                className="flex-1 min-w-0 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
              />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {reqs.length === 0 && (
          <p className="text-[12px] text-white/15 italic text-center py-2">Nessun requisito — clicca + per aggiungere</p>
        )}
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi requisito
      </button>
    </div>
  );
}

/** Quest Rewards Editor — table with itemId + quantity for quest rewards */
function QuestRewardsEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; quantity: number }[]) => void }) {
  let rewards: { itemId: string; quantity: number }[] = [];
  if (Array.isArray(value)) {
    rewards = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), quantity: Number(o.quantity ?? 1) };
      }
      return { itemId: String(r), quantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { rewards = JSON.parse(value) || []; } catch { rewards = []; }
  }

  const add = () => onChange([...rewards, { itemId: '', quantity: 1 }]);
  const remove = (idx: number) => onChange(rewards.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string | number) => {
    onChange(rewards.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Oggetto</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-24">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={reward.itemId}
                    onChange={v => update(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={reward.quantity}
                    onChange={e => update(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-white/15 italic">
                  Nessuna ricompensa — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi ricompensa
      </button>
    </div>
  );
}

/** Event Choices Editor — table with text + outcome fields for event choices */
function EventChoicesEditor({ value, onChange }: {
  value: unknown;
  onChange: (v: { text: string; outcome: { description: string; endEvent: boolean; hpChange: number; receiveItems?: { itemId: string; quantity: number }[] } }[]) => void;
}) {
  interface EventChoice {
    text: string;
    outcome: {
      description: string;
      endEvent: boolean;
      hpChange: number;
      receiveItems?: { itemId: string; quantity: number }[];
    };
  }

  let choices: EventChoice[] = [];
  if (Array.isArray(value)) {
    choices = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        const outcome = typeof o.outcome === 'object' && o.outcome !== null
          ? o.outcome as Record<string, unknown>
          : {};
        return {
          text: String(o.text ?? ''),
          outcome: {
            description: String(outcome.description ?? ''),
            endEvent: Boolean(outcome.endEvent),
            hpChange: Number(outcome.hpChange ?? 0),
            ...(Array.isArray(outcome.receiveItems) ? { receiveItems: outcome.receiveItems as { itemId: string; quantity: number }[] } : {}),
          },
        };
      }
      return { text: String(r), outcome: { description: '', endEvent: false, hpChange: 0 } };
    });
  } else if (typeof value === 'string') {
    try { choices = JSON.parse(value) || []; } catch { choices = []; }
  }

  const add = () => onChange([...choices, { text: '', outcome: { description: '', endEvent: false, hpChange: 0, receiveItems: [] } }]);
  const remove = (idx: number) => onChange(choices.filter((_, i) => i !== idx));
  const updateText = (idx: number, val: string) => {
    const updated = choices.map((c, i) => i === idx ? { ...c, text: val } : c);
    onChange(updated);
  };
  const updateOutcome = (idx: number, field: string, val: unknown) => {
    const updated = choices.map((c, i) =>
      i === idx ? { ...c, outcome: { ...c.outcome, [field]: val } } : c
    );
    onChange(updated);
  };
  const updateRewardItem = (choiceIdx: number, itemIdx: number, field: 'itemId' | 'quantity', val: string | number) => {
    const items = [...(choices[choiceIdx].outcome.receiveItems || [])];
    if (field === 'itemId') {
      items[itemIdx] = { ...items[itemIdx], itemId: val as string };
    } else {
      items[itemIdx] = { ...items[itemIdx], quantity: Math.max(1, val as number) };
    }
    updateOutcome(choiceIdx, 'receiveItems', items);
  };
  const addRewardItem = (choiceIdx: number) => {
    const items = [...(choices[choiceIdx].outcome.receiveItems || []), { itemId: '', quantity: 1 }];
    updateOutcome(choiceIdx, 'receiveItems', items);
  };
  const removeRewardItem = (choiceIdx: number, itemIdx: number) => {
    const items = (choices[choiceIdx].outcome.receiveItems || []).filter((_, i) => i !== itemIdx);
    updateOutcome(choiceIdx, 'receiveItems', items.length > 0 ? items : []);
  };

  return (
    <div className="space-y-1.5">
      <div className="space-y-2 max-h-72 overflow-y-auto admin-scrollbar">
        {choices.map((choice, i) => (
          <div key={i} className="rounded-md border border-white/[0.08] overflow-hidden">
            {/* Choice header */}
            <div className="flex items-center gap-2 bg-white/[0.03] px-2 py-1.5 border-b border-white/[0.06]">
              <span className="shrink-0 text-[11px] text-white/25 font-mono w-4">{i + 1}.</span>
              <input
                type="text"
                value={choice.text}
                onChange={e => updateText(i, e.target.value)}
                placeholder="Testo della scelta (es: 'Esplorare l'edificio')..."
                className="flex-1 text-[13px] bg-transparent border-none outline-none text-emerald-300/80 placeholder-white/15 font-medium"
              />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Outcome fields */}
            <div className="p-2 space-y-1.5">
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Descrizione Risultato</label>
                <textarea
                  value={choice.outcome.description}
                  onChange={e => updateOutcome(i, 'description', e.target.value)}
                  placeholder="Cosa succede quando il giocatore fa questa scelta..."
                  rows={2}
                  className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y focus:outline-none focus:border-emerald-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/30 mb-0.5 block">Cambio HP</label>
                  <input
                    type="number"
                    value={choice.outcome.hpChange}
                    onChange={e => updateOutcome(i, 'hpChange', Number(e.target.value))}
                    placeholder="0"
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={choice.outcome.endEvent}
                      onChange={e => updateOutcome(i, 'endEvent', e.target.checked)}
                      className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-emerald-500 focus:ring-emerald-500/50 accent-emerald-500"
                    />
                    <span className="text-[12px] text-white/50">Termina Evento</span>
                  </label>
                </div>
              </div>
              {/* Receive Items sub-section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-white/30">Oggetti Ricevuti (Ricompensa)</label>
                  <button
                    type="button"
                    onClick={() => addRewardItem(i)}
                    className="text-[11px] text-emerald-400/60 hover:text-emerald-400 flex items-center gap-0.5 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" /> Agg.
                  </button>
                </div>
                {(choice.outcome.receiveItems || []).length > 0 && (
                  <div className="space-y-1">
                    {(choice.outcome.receiveItems || []).map((item, ri) => (
                      <div key={ri} className="flex items-center gap-1 bg-white/[0.02] rounded px-1.5 py-1 border border-white/[0.04]">
                        <input
                          type="text"
                          value={item.itemId}
                          onChange={e => updateRewardItem(i, ri, 'itemId', e.target.value)}
                          placeholder="itemId (es: ammo_pistol)"
                          className="flex-1 text-[11px] bg-transparent border-none outline-none text-emerald-300/80 placeholder-white/10 font-mono min-w-0"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateRewardItem(i, ri, 'quantity', Number(e.target.value))}
                          min={1}
                          className="w-10 text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-1 py-0.5 text-white/60 text-center font-mono focus:outline-none focus:border-emerald-500/40"
                        />
                        <button type="button" onClick={() => removeRewardItem(i, ri)} className="text-white/15 hover:text-red-400 transition-colors shrink-0">
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(choice.outcome.receiveItems || []).length === 0 && (
                  <p className="text-[11px] text-white/10 italic">Nessun oggetto</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {choices.length === 0 && (
          <p className="text-[12px] text-white/15 italic text-center py-3">Nessuna scelta — clicca + per aggiungere</p>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi scelta
      </button>
    </div>
  );
}

/** Convert plain text to safe HTML for contentEditable */
function plainTextToHtml(text: string): string {
  if (!text) return '';
  // If value already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*?>/i.test(text)) return text;
  // Escape HTML entities, then convert newlines
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

/** Rich Text Editor — contentEditable-based editor with formatting toolbar */
function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const isFirstMount = useRef(true);

  // Sync external value into contentEditable div
  useEffect(() => {
    if (editorRef.current) {
      // Always set on first mount, then only when value changes externally
      if (isFirstMount.current || !isInternalChange.current) {
        editorRef.current.innerHTML = plainTextToHtml(value);
      }
    }
    isFirstMount.current = false;
    isInternalChange.current = false;
  }, [value]);

  // Save/restore selection so toolbar buttons don't lose the user's text selection
  const saveSelection = (): Range | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
    return null;
  };
  const restoreSelection = (range: Range | null) => {
    if (!range) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  };

  const execCmd = (cmd: string, val?: string) => {
    const saved = saveSelection();
    if (editorRef.current) editorRef.current.focus();
    if (saved) restoreSelection(saved);
    document.execCommand(cmd, false, val);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const newHtml = editorRef.current.innerHTML;
      onChange(newHtml);
      // Reset flag after a tick so the effect doesn't overwrite
      setTimeout(() => { isInternalChange.current = false; }, 0);
    }
  };

  const handleColor = (color: string) => {
    execCmd('foreColor', color);
  };

  const handleHighlight = (color: string) => {
    execCmd('hiliteColor', color);
  };

  const clearFormatting = () => {
    execCmd('removeFormat');
  };

  // Toggle bullet list manually — document.execCommand('insertUnorderedList') is unreliable
  const toggleUnorderedList = () => {
    const saved = saveSelection();
    if (!editorRef.current || !saved) return;
    editorRef.current.focus();
    restoreSelection(saved);

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const content = range.extractContents();

    // Build list items from extracted content
    const fragment = document.createDocumentFragment();
    const items: Node[] = [];

    const collectBlockNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        text.split(/\n/).forEach((line, i) => {
          if (line.trim() || i === 0) {
            const li = document.createElement('li');
            li.textContent = line;
            items.push(li);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'li') {
          items.push(el);
        } else if (tag === 'br') {
          // br → new list item on next text
          const li = document.createElement('li');
          items.push(li);
        } else {
          // Wrap other block/inline elements in <li>
          const li = document.createElement('li');
          li.appendChild(el.cloneNode(true));
          items.push(li);
        }
      }
    };

    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      content.childNodes.forEach(collectBlockNodes);
    } else {
      collectBlockNodes(content);
    }

    // If no items extracted, use the selected text as a single item
    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = sel.toString();
      items.push(li);
    }

    const ul = document.createElement('ul');
    items.forEach(li => ul.appendChild(li));

    range.insertNode(ul);
    sel.removeAllRanges();
    sel.addRange(range);
    syncContent();
  };

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 rounded-t-md bg-white/[0.06] border border-white/[0.08] border-b-0">
        <ToolbarBtn onClick={() => execCmd('bold')} title="Grassetto"><b className="text-[13px]">B</b></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('italic')} title="Corsivo"><i className="text-[13px]">I</i></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('underline')} title="Sottolineato"><u className="text-[13px]">S</u></ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<h3>')} title="Titolo 3" className="font-bold text-[12px]">H3</ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<p>')} title="Paragrafo" className="text-[12px]">¶</ToolbarBtn>
        <ToolbarBtn onClick={toggleUnorderedList} title="Lista" className="text-[12px]">•≡</ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        {/* Color picker */}
        <PickerDropdown
          trigger={<><span className="text-[13px]">A</span><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 block" /></>}
          title="Colore testo"
        >
          {['#22c55e', '#ef4444', '#10b981', '#06b6d4', '#a855f7', '#ec4899', '#f59e0b', '#ffffff', '#94a3b8'].map(c => (
            <button key={c} type="button" onMouseDown={e => { e.preventDefault(); handleColor(c); }}
              className="w-5 h-5 rounded-sm border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </PickerDropdown>
        {/* Highlight picker */}
        <PickerDropdown
          trigger={<span className="text-[13px]">🖌</span>}
          title="Evidenzia"
        >
          {[
            { c: 'rgba(34,197,94,0.3)', l: 'Verde' },
            { c: 'rgba(251,191,36,0.3)', l: 'Giallo' },
            { c: 'rgba(239,68,68,0.3)', l: 'Rosso' },
            { c: 'rgba(59,130,246,0.3)', l: 'Blu' },
            { c: 'rgba(168,85,247,0.3)', l: 'Viola' },
            { c: 'transparent', l: 'Rimuovi' },
          ].map(h => (
            <button key={h.l} type="button" onMouseDown={e => { e.preventDefault(); handleHighlight(h.c); }}
              className="px-1.5 py-0.5 text-[11px] rounded border border-white/10 hover:bg-white/10 transition-colors"
              style={h.c !== 'transparent' ? { backgroundColor: h.c } : {}}
              title={h.l}
            >
              {h.l}
            </button>
          ))}
        </PickerDropdown>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={clearFormatting} title="Rimuovi formattazione" className="text-[12px]">✕</ToolbarBtn>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={e => {
          // Allow paste but strip external styles, keep basic formatting
          e.preventDefault();
          const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, text);
          syncContent();
        }}
        data-placeholder={placeholder ?? 'Scrivi il contenuto del documento...'}
        className="min-h-[120px] max-h-[240px] overflow-y-auto admin-scrollbar text-[13px] bg-white/[0.04] border border-white/[0.1] rounded-b-md px-3 py-2.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 prose prose-invert prose-sm prose-p:text-white/80 prose-h3:text-emerald-300/80 prose-strong:text-white/90 prose-em:text-white/70 prose-li:text-white/70 [&_*]:text-[13px] [&_h3]:text-[15px] [&_li]:text-[12px]"
        style={{ lineHeight: '1.7' }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.2);
          pointer-events: none;
          font-style: italic;
        }
        [contenteditable][data-placeholder]:focus::before {
          content: none;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
          margin-left: 1.2em !important;
          padding-left: 0.5em !important;
        }
        [contenteditable] ul li {
          display: list-item !important;
          margin-left: 0.3em;
          padding-left: 0.2em;
        }
        [contenteditable] ul li::marker {
          color: rgba(255,255,255,0.6);
        }
      `}</style>
    </div>
  );
}

/** Click-toggle dropdown for toolbar pickers */
function PickerDropdown({ children, trigger, title }: { children: React.ReactNode; trigger: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        title={title}
        className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${open ? 'text-white/80 bg-white/[0.12]' : ''}`}
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-1.5 rounded-md bg-black border border-white/[0.12] shadow-xl flex flex-wrap gap-1 z-[9999]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Toolbar Button for RichTextEditor */
function ToolbarBtn({ children, onClick, title, className }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick?.(); }}
      title={title}
      className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

/** Trade Inventory Editor — table with itemId, quantity, priceItemId, priceQuantity for NPC trades */
function TradeInventoryEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; quantity: number; priceItemId: string; priceQuantity: number }[]) => void }) {
  let trades: { itemId: string; quantity: number; priceItemId: string; priceQuantity: number }[] = [];
  if (Array.isArray(value)) {
    trades = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), quantity: Number(o.quantity ?? 1), priceItemId: String(o.priceItemId ?? ''), priceQuantity: Number(o.priceQuantity ?? 1) };
      }
      return { itemId: String(r), quantity: 1, priceItemId: '', priceQuantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { trades = JSON.parse(value) || []; } catch { trades = []; }
  }

  const add = () => onChange([...trades, { itemId: '', quantity: 1, priceItemId: '', priceQuantity: 1 }]);
  const remove = (idx: number) => onChange(trades.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string | number) => {
    onChange(trades.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Oggetto in Vendita</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-14">Qtà</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Prezzo (Oggetto)</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Qtà (prezzo)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.itemId}
                    onChange={v => update(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={trade.quantity}
                    onChange={e => update(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-black border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.priceItemId}
                    onChange={v => update(i, 'priceItemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={trade.priceQuantity}
                    onChange={e => update(i, 'priceQuantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-black border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-white/15 italic">
                  Nessuno scambio — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi scambio
      </button>
    </div>
  );
}

/** Sequence Pattern Editor — visual direction buttons for puzzle sequence */
function SequencePatternEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const directions = ['up', 'down', 'left', 'right'];
  const dirIcons: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const dirColors: Record<string, string> = { up: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200', down: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', left: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', right: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-500' };
  const pattern = Array.isArray(value) ? value : [];

  const add = (dir: string) => onChange([...pattern, dir]);
  const remove = (idx: number) => onChange(pattern.filter((_, i) => i !== idx));
  const clear = () => onChange([]);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 mb-1">
        {directions.map(dir => (
          <button
            key={dir}
            type="button"
            onClick={() => add(dir)}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${dirColors[dir]} hover:opacity-80 transition-opacity text-[12px]`}
          >
            <span className="text-xs">{dirIcons[dir]}</span>
            <span className="uppercase">{dir}</span>
          </button>
        ))}
        {pattern.length > 0 && (
          <button type="button" onClick={clear} className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-3 h-3 inline mr-0.5" />Cancella
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {pattern.map((dir, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${dirColors[dir] ?? 'border-white/10 bg-white/[0.04] text-white/60'} text-[12px] group/seq`}
          >
            <span className="text-[10px] text-white/25 font-mono">{i + 1}</span>
            <span className="text-xs">{dirIcons[dir] ?? '·'}</span>
            <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {pattern.length === 0 && (
          <span className="text-[11px] text-white/15 italic py-0.5">Clicca le frecce per creare la sequenza...</span>
        )}
      </div>
    </div>
  );
}

/** Locked Locations Editor — table with locationId (entity search), requiredItemId (entity search), lockedMessage */
function LockedLocsEditor({ value, onChange }: { value: unknown; onChange: (v: { locationId: string; requiredItemId: string; lockedMessage: string }[]) => void }) {
  let locs: { locationId: string; requiredItemId: string; lockedMessage: string }[] = [];
  if (Array.isArray(value)) {
    locs = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { locationId: String(o.locationId ?? ''), requiredItemId: String(o.requiredItemId ?? ''), lockedMessage: String(o.lockedMessage ?? '') };
      }
      return { locationId: String(r), requiredItemId: '', lockedMessage: '' };
    });
  } else if (typeof value === 'string') {
    try { locs = JSON.parse(value) || []; } catch { locs = []; }
  }

  const add = () => onChange([...locs, { locationId: '', requiredItemId: '', lockedMessage: '' }]);
  const remove = (idx: number) => onChange(locs.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(locs.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Location ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item Richiesto</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Msg Blocco</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {locs.map((loc, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.locationId} onChange={v => update(i, 'locationId', v)} endpoint="/api/admin/locations" labelKey="name" />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.requiredItemId} onChange={v => update(i, 'requiredItemId', v)} endpoint="/api/admin/items" labelKey="name" iconKey="icon" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={loc.lockedMessage} onChange={e => update(i, 'lockedMessage', e.target.value)} placeholder="La porta è chiusa a chiave..." className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {locs.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">Nessuna location bloccata</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi blocco
      </button>
    </div>
  );
}

/** Sub Areas Editor — table with id, name, description */
function SubAreasEditor({ value, onChange }: { value: unknown; onChange: (v: { id: string; name: string; description: string }[]) => void }) {
  let areas: { id: string; name: string; description: string }[] = [];
  if (Array.isArray(value)) {
    areas = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { id: String(o.id ?? ''), name: String(o.name ?? ''), description: String(o.description ?? '') };
      }
      return { id: String(r), name: '', description: '' };
    });
  } else if (typeof value === 'string') {
    try { areas = JSON.parse(value) || []; } catch { areas = []; }
  }

  const add = () => onChange([...areas, { id: '', name: '', description: '' }]);
  const remove = (idx: number) => onChange(areas.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(areas.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[28rem] overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        {areas.map((area, i) => (
          <div key={i} className="border-b border-white/[0.06] bg-black last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="shrink-0 text-[11px] text-white/20 font-mono">{i + 1}.</span>
              <input type="text" value={area.id} onChange={e => update(i, 'id', e.target.value)} placeholder="safe_room" className="w-28 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={area.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Safe Room" className="w-32 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={area.description} onChange={e => update(i, 'description', e.target.value)} placeholder="Un rifugio sicuro..." className="flex-1 min-w-0 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {areas.length === 0 && (
          <div className="px-2 py-4 text-center text-white/15 italic text-[12px]">Nessuna sotto-area</div>
        )}
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi sotto-area
      </button>
    </div>
  );
}

/** Status Apply Editor — for special ability status effects {type, chance} */
function StatusApplyEditor({ value, onChange }: { value: unknown; onChange: (v: { type: string; chance: number } | null) => void }) {
  let current: { type: string; chance: number } | null = null;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    current = { type: String(o.type ?? ''), chance: Number(o.chance ?? 0) };
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && trimmed !== '{}' && trimmed !== '[]') {
      try { const parsed = JSON.parse(trimmed); if (parsed?.type) current = { type: String(parsed.type), chance: Number(parsed.chance ?? 0) }; } catch { /* empty */ }
    }
  }

  const [enabled, setEnabled] = useState(!!current);
  const [statusType, setStatusType] = useState(current?.type ?? '');
  const [chance, setChance] = useState(current?.chance ?? 50);

  useEffect(() => {
    if (current) {
      setEnabled(true);
      setStatusType(current.type);
      setChance(current.chance);
    }
  }, [current]);

  const toggleEnabled = () => {
    if (enabled) {
      setEnabled(false);
      onChange(null);
    } else {
      setEnabled(true);
      const newVal = { type: statusType || 'poison', chance };
      onChange(newVal);
    }
  };

  const handleTypeChange = (t: string) => {
    setStatusType(t);
    onChange({ type: t, chance });
  };

  const handleChanceChange = (c: number) => {
    setChance(c);
    onChange({ type: statusType, chance: c });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggleEnabled}
            className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
          />
          <span className="text-[11px] text-white/40">Applica status negativo al bersaglio</span>
        </label>
      </div>
      {enabled && (
        <div className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.02] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/30 mb-0.5 block">Tipo Status</label>
              <select
                value={statusType}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
              >
                <option value="poison">Avvelenamento</option>
                <option value="bleeding">Sanguinamento</option>
                <option value="stunned">Stordimento</option>
                <option value="adrenaline">Adrenalina</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-0.5 block">Probabilità %</label>
              <input
                type="number"
                value={chance}
                onChange={e => handleChanceChange(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Status Cured Editor — for item effect status curing ["poison","bleeding"] */
function StatusCuredEditor({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
  const STATUS_OPTIONS = [
    { key: 'poison', label: '🧪 Veleno', tooltip: 'Avvelenamento: il bersaglio subisce danni ogni turno per la durata dell\'effetto' },
    { key: 'bleeding', label: '🩸 Sanguinamento', tooltip: 'Sanguinamento: il bersaglio perde HP progressivamente, più forte del veleno' },
    { key: 'stunned', label: '💫 Stordimento', tooltip: 'Stordimento: il bersaglio salta il suo prossimo turno in combattimento' },
    { key: 'adrenaline', label: '⚡ Adrenalina', tooltip: 'Adrenalina: aumenta temporaneamente ATK e SPD del bersaglio' },
  ] as const;

  let current: string[] = [];
  if (Array.isArray(value)) {
    current = value.map(String);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && trimmed !== '{}' && trimmed !== '[]') {
      try { const parsed = JSON.parse(trimmed); if (Array.isArray(parsed)) current = parsed.map(String); } catch { /* empty */ }
    }
  }

  const selected = current;

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter(s => s !== key)
      : [...selected, key];
    onChange(next);
  };

  const anyEnabled = selected.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40">{anyEnabled ? `${selected.length} status selezionati` : 'Nessuno status selezionato'}</span>
      </div>
      <div className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.02] p-2.5">
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(opt => {
            const checked = selected.includes(opt.key);
            return (
              <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.key)}
                  className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
                />
                <span className={`text-[12px] ${checked ? 'text-white/90' : 'text-white/50'} transition-colors`}>{opt.label}</span>
                <span
                  className="text-[11px] text-white/20 group-hover:text-white/40 transition-colors cursor-help"
                  title={opt.tooltip}
                >(?)</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Special Effect Editor — for equipment passive effects {type, value} */
function SpecialEffectEditor({ value, onChange }: { value: unknown; onChange: (v: { type: string; value: number } | null) => void }) {
  const EFFECT_OPTIONS = [
    { key: 'poison_resist', label: 'Resistenza Veleno', tooltip: 'Riduce la probabilità di essere avvelenati. Il valore indica la % di riduzione.' },
    { key: 'bleed_resist', label: 'Resistenza Sanguinamento', tooltip: 'Riduce la probabilità di sanguinamento. Il valore indica la % di riduzione.' },
    { key: 'stun_resist', label: 'Resistenza Stordimento', tooltip: 'Riduce la probabilità di essere storditi. Il valore indica la % di riduzione.' },
    { key: 'hp_regen', label: 'Rigenerazione HP', tooltip: 'Recupera HP ogni turno. Il valore indica gli HP recuperati per turno.' },
    { key: 'thorns', label: 'Spine Dannose', tooltip: 'Riflette una % dei danni subiti all\'attaccante. Il valore indica la % riflessa.' },
    { key: 'crit_shield', label: 'Scudo Critico', tooltip: 'Riduce il danno dei colpi critici ricevuti. Il valore indica la % di riduzione.' },
  ] as const;

  let current: { type: string; value: number } | null = null;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    current = { type: String(o.type ?? ''), value: Number(o.value ?? 0) };
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && trimmed !== '{}' && trimmed !== '[]') {
      try { const parsed = JSON.parse(trimmed); if (parsed?.type) current = { type: String(parsed.type), value: Number(parsed.value ?? 0) }; } catch { /* empty */ }
    }
  }

  const [enabled, setEnabled] = useState(!!current);
  const [effectType, setEffectType] = useState(current?.type ?? '');
  const [effectValue, setEffectValue] = useState(current?.value ?? 50);

  useEffect(() => {
    if (current) {
      setEnabled(true);
      setEffectType(current.type);
      setEffectValue(current.value);
    }
  }, [current]);

  const toggleEnabled = () => {
    if (enabled) {
      setEnabled(false);
      onChange(null);
    } else {
      setEnabled(true);
      const newVal = { type: effectType || 'poison_resist', value: effectValue };
      onChange(newVal);
    }
  };

  const handleTypeChange = (t: string) => {
    setEffectType(t);
    onChange({ type: t, value: effectValue });
  };

  const handleValueChange = (v: number) => {
    setEffectValue(v);
    onChange({ type: effectType, value: v });
  };

  const currentLabel = EFFECT_OPTIONS.find(o => o.key === effectType)?.label ?? effectType;
  const currentTooltip = EFFECT_OPTIONS.find(o => o.key === effectType)?.tooltip ?? '';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggleEnabled}
            className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
          />
          <span className="text-[11px] text-white/40">Abilita effetto passivo</span>
        </label>
      </div>
      {enabled && (
        <div className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.02] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/30 mb-0.5 block">Tipo Effetto</label>
              <select
                value={effectType}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
              >
                {EFFECT_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key} title={opt.tooltip}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <label className="text-[10px] text-white/30 mb-0.5 block">Valore</label>
                <span className="text-[10px] text-white/20 cursor-help" title={currentTooltip}>(?)</span>
              </div>
              <input
                type="number"
                value={effectValue}
                onChange={e => handleValueChange(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>
          <div className="mt-1.5 text-[11px] text-emerald-300/40">
            {currentLabel}: <span className="text-white/30">{currentTooltip}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Effects Array Editor — atomic effects for special abilities
// (Types and config imported from ../config/effectTypes)
// ═══════════════════════════════════════════════════════════════

// Effect types config imported from '../config/effectTypes':
// EFFECT_TYPES_CONFIG, EFFECT_CATEGORY_COLORS, EFFECT_TARGET_OPTIONS,
// EFFECT_STATUS_LIST, EFFECT_STAT_LIST, parseEffectsArray,
// getDefaultEffect, TRIGGER_OPTIONS

function EffectsArrayEditor({ value, onChange, showTrigger = false }: { value: unknown; onChange: (v: Record<string, unknown>[]) => void; showTrigger?: boolean }) {
  const [effects, setEffects] = useState<Record<string, unknown>[]>(() => parseEffectsArray(value));
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [addType, setAddType] = useState('');

  const emitChange = (newEffects: Record<string, unknown>[]) => {
    setEffects(newEffects);
    onChange(newEffects);
  };

  const updateField = (idx: number, field: string, val: unknown) => {
    emitChange(effects.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  };

  const toggleStatusInArray = (idx: number, statusKey: string) => {
    const current: string[] = Array.isArray(effects[idx]?.statuses) ? effects[idx].statuses as string[] : [];
    const updated = current.includes(statusKey) ? current.filter(s => s !== statusKey) : [...current, statusKey];
    updateField(idx, 'statuses', updated);
  };

  const addEffect = () => {
    if (!addType) return;
    const newEffect = getDefaultEffect(addType);
    const newEffects = [...effects, newEffect];
    emitChange(newEffects);
    setExpandedIdx(newEffects.length - 1);
    setAddType('');
  };

  const removeEffect = (idx: number) => {
    const newEffects = effects.filter((_, i) => i !== idx);
    emitChange(newEffects);
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
  };

  const getTargetLabel = (t: string) => EFFECT_TARGET_OPTIONS.find(o => o.key === t)?.label ?? t;

  return (
    <div className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.03] p-3 space-y-2">
      {effects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <span className="text-[12px] text-white/30">Nessun effetto configurato</span>
          <div className="flex items-center gap-2">
            <select
              value={addType}
              onChange={e => setAddType(e.target.value)}
              className="text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
            >
              <option value="">Tipo effetto...</option>
              {EFFECT_TYPES_CONFIG.map(et => (
                <option key={et.key} value={et.key}>{et.emoji} {et.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addEffect}
              disabled={!addType}
              className="text-[12px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ➕ Aggiungi
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {effects.map((effect, idx) => {
              const typeKey = String(effect.type ?? '');
              const typeConfig = EFFECT_TYPES_CONFIG.find(t => t.key === typeKey);
              const isExpanded = expandedIdx === idx;
              const targetStr = String(effect.target ?? '');
              const catColor = typeConfig ? EFFECT_CATEGORY_COLORS[typeConfig.category] : 'text-white/50 border-white/10 bg-white/5';
              const boolFields = typeConfig?.fields.filter(f => f.type === 'boolean') ?? [];
              const otherFields = typeConfig?.fields.filter(f => f.type !== 'boolean') ?? [];

              return (
                <div key={idx} className="rounded border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded border ${catColor}`}>
                        {typeConfig?.emoji ?? '❓'} {typeConfig?.label ?? typeKey}
                      </span>
                      <span className="text-[11px] text-white/25 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                        {showTrigger && effect.trigger ? `${TRIGGER_OPTIONS.find(t => t.value === effect.trigger)?.emoji ?? '⚡'} ${TRIGGER_OPTIONS.find(t => t.value === effect.trigger)?.label ?? String(effect.trigger)} · ` : ''}
                        {getTargetLabel(targetStr)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/15">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeEffect(idx); }}
                        className="text-white/30 hover:text-red-400 transition-colors p-0.5"
                        title="Rimuovi effetto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-white/20 ml-0.5">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-white/[0.05] space-y-2">
                          {/* Trigger field — only for items */}
                          {showTrigger && (
                            <div>
                              <div className="flex items-center gap-1">
                                <label className="text-[10px] text-white/30">Trigger</label>
                                <span className="text-[10px] text-white/20 cursor-help" title="Quando si attiva l'effetto in base al tipo di oggetto.">(?)</span>
                              </div>
                              <select
                                value={String(effect.trigger ?? '')}
                                onChange={e => updateField(idx, 'trigger', e.target.value)}
                                className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer mt-0.5"
                              >
                                <option value="">— Nessun trigger —</option>
                                {TRIGGER_OPTIONS.map(t => (
                                  <option key={t.value} value={t.value} title={t.tooltip}>{t.emoji} {t.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {/* Target field — always first */}
                          <div>
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] text-white/30">Bersaglio</label>
                              <span className="text-[10px] text-white/20 cursor-help" title="Chi riceve l'effetto. Sé Stesso = il personaggio che usa l'abilità.">(?)</span>
                            </div>
                            <select
                              value={targetStr}
                              onChange={e => updateField(idx, 'target', e.target.value)}
                              className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer mt-0.5"
                            >
                              {EFFECT_TARGET_OPTIONS.map(t => (
                                <option key={t.key} value={t.key}>{t.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Type-specific fields */}
                          {typeConfig && (
                            <>
                              {/* Non-boolean fields in 2-col grid */}
                              {otherFields.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {otherFields.map(field => {
                                    if (field.type === 'multi-select') {
                                      return (
                                        <div key={field.key} className="col-span-2">
                                          <div className="flex items-center gap-1">
                                            <label className="text-[10px] text-white/30">{field.label}</label>
                                            <span className="text-[10px] text-white/20 cursor-help" title={field.tooltip}>(?)</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-0.5">
                                            {(field.options ?? []).map(opt => {
                                              const checked = (Array.isArray(effect[field.key]) ? effect[field.key] as string[] : []).includes(opt.key);
                                              return (
                                                <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer group">
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleStatusInArray(idx, opt.key)}
                                                    className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
                                                  />
                                                  <span className={`text-[12px] ${checked ? 'text-white/80' : 'text-white/40'} transition-colors`}>{opt.label}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (field.type === 'select') {
                                      return (
                                        <div key={field.key}>
                                          <div className="flex items-center gap-1">
                                            <label className="text-[10px] text-white/30">{field.label}</label>
                                            <span className="text-[10px] text-white/20 cursor-help" title={field.tooltip}>(?)</span>
                                          </div>
                                          <select
                                            value={String(effect[field.key] ?? field.defaultValue)}
                                            onChange={e => updateField(idx, field.key, e.target.value)}
                                            className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer mt-0.5"
                                          >
                                            {(field.options ?? []).map(opt => (
                                              <option key={opt.key} value={opt.key}>{opt.label}</option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    }

                                    // number field
                                    return (
                                      <div key={field.key}>
                                        <div className="flex items-center gap-1">
                                          <label className="text-[10px] text-white/30">{field.label}</label>
                                          <span className="text-[10px] text-white/20 cursor-help" title={field.tooltip}>(?)</span>
                                        </div>
                                        <input
                                          type="number"
                                          value={Number(effect[field.key] ?? field.defaultValue ?? 0)}
                                          onChange={e => updateField(idx, field.key, e.target.value === '' ? 0 : Number(e.target.value))}
                                          placeholder={String(field.defaultValue)}
                                          min={field.min}
                                          max={field.max}
                                          step={field.step}
                                          className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40 mt-0.5"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Boolean fields in a flex row */}
                              {boolFields.length > 0 && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {boolFields.map(field => {
                                    const checked = Boolean(effect[field.key]);
                                    return (
                                      <label key={field.key} className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={e => updateField(idx, field.key, e.target.checked)}
                                          className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
                                        />
                                        <span className={`text-[12px] ${checked ? 'text-white/80' : 'text-white/40'} transition-colors`}>{field.label}</span>
                                        <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors cursor-help" title={field.tooltip}>(?)</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Effect tooltip hint */}
                              <div className="text-[11px] text-white/20 italic">
                                {typeConfig.tooltip}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Add new effect row */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
            <select
              value={addType}
              onChange={e => setAddType(e.target.value)}
              className="flex-1 text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
            >
              <option value="">➕ Aggiungi effetto...</option>
              {EFFECT_TYPES_CONFIG.map(et => (
                <option key={et.key} value={et.key}>{et.emoji} {et.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addEffect}
              disabled={!addType}
              className="text-[12px] px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              Aggiungi
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Story Event Editor
// ═══════════════════════════════════════════════════════════════

interface StoryEventData {
  title: string;
  description: string;
  choices: {
    text: string;
    outcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
      triggerCombat?: boolean;
      combatEnemyIds?: string[];
    };
  }[];
  puzzle?: {
    type: 'combination' | 'sequence' | 'key_required';
    requiredItemId?: string;
    requiredItemIds?: string[];
    successOutcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
    };
    failMessage: string;
    combinationCode?: string;
    sequencePattern?: string[];
  };
}

function parseStoryEvent(val: unknown): StoryEventData | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as StoryEventData;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return null;
    try { return JSON.parse(trimmed) as StoryEventData; } catch { return null; }
  }
  return null;
}

function StoryEventEditor({ value, onChange }: { value: unknown; onChange: (v: StoryEventData | null) => void }) {
  const [event, setEvent] = useState<StoryEventData | null>(() => parseStoryEvent(value));
  const [collapsed, setCollapsed] = useState(false);

  const updateEvent = (patch: Partial<StoryEventData>) => {
    const updated = { ...event!, ...patch } as StoryEventData;
    setEvent(updated);
    onChange(updated);
  };

  const addChoice = () => {
    const newChoice = {
      text: '',
      outcome: { description: '' } as StoryEventData['choices'][0]['outcome'],
    };
    updateEvent({ choices: [...(event?.choices ?? []), newChoice] });
  };

  const removeChoice = (idx: number) => {
    updateEvent({ choices: (event?.choices ?? []).filter((_, i) => i !== idx) });
  };

  const updateChoice = (idx: number, field: string, val: unknown) => {
    const choices = [...(event?.choices ?? [])];
    if (field === 'text') {
      choices[idx] = { ...choices[idx], text: val as string };
    } else if (field.startsWith('outcome.')) {
      const outcomeField = field.replace('outcome.', '');
      choices[idx] = { ...choices[idx], outcome: { ...choices[idx].outcome, [outcomeField]: val } };
    }
    updateEvent({ choices });
  };

  const addRewardItem = (choiceIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    choices[choiceIdx] = {
      ...outcome,
      outcome: { ...outcome.outcome, receiveItems: [...(outcome.outcome.receiveItems ?? []), { itemId: '', quantity: 1 }] },
    };
    updateEvent({ choices });
  };

  const removeRewardItem = (choiceIdx: number, itemIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).filter((_, i) => i !== itemIdx);
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const updateRewardItem = (choiceIdx: number, itemIdx: number, field: 'itemId' | 'quantity', val: string | number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).map((item, i) =>
      i === itemIdx ? { ...item, [field]: val } : item
    );
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const togglePuzzle = () => {
    if (event?.puzzle) {
      const { puzzle, ...rest } = event;
      const updated = rest as StoryEventData;
      setEvent(updated);
      onChange(updated);
    } else {
      const updated = {
        ...event!,
        puzzle: {
          type: 'combination' as const,
          successOutcome: { description: '' },
          failMessage: '',
        },
      };
      setEvent(updated);
      onChange(updated);
    }
  };

  const updatePuzzle = (field: string, val: unknown) => {
    if (!event) return;
    const puzzle = { ...event.puzzle!, [field]: val };
    const updated = { ...event, puzzle };
    setEvent(updated);
    onChange(updated);
  };

  const enableEvent = () => {
    const newEvent: StoryEventData = { title: '', description: '', choices: [] };
    setEvent(newEvent);
    onChange(newEvent);
  };

  const disableEvent = () => {
    setEvent(null);
    onChange(null);
  };

  if (!event) {
    return (
      <div className="space-y-1.5">
        <div className="rounded-md border border-dashed border-white/[0.08] p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[12px] text-white/20 italic mb-2">Nessun evento storia configurato</p>
            <button
              type="button"
              onClick={enableEvent}
              className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors mx-auto"
            >
              <Plus className="w-3 h-3" /> Crea Evento Storia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
            {collapsed ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <span className="text-[12px] font-semibold text-emerald-300/80 uppercase tracking-wider">Evento Storia</span>
          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/60 bg-emerald-500/10">
            {(event.choices ?? []).length} scelte
          </Badge>
        </div>
        <button type="button" onClick={disableEvent} className="flex items-center gap-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors">
          <Trash2 className="w-3 h-3" /> Rimuovi
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-[11px] text-white/40 mb-0.5 block">Titolo Evento</label>
              <input
                type="text"
                value={event.title ?? ''}
                onChange={e => updateEvent({ title: e.target.value })}
                placeholder="es: Primo Contatto"
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-0.5 block">Descrizione</label>
              <textarea
                value={event.description ?? ''}
                onChange={e => updateEvent({ description: e.target.value })}
                placeholder="Testo narrativo introduttivo dell'evento..."
                rows={3}
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y italic focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Choices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Scelte</span>
              <button type="button" onClick={addChoice} className="flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
                <Plus className="w-3 h-3" /> Aggiungi scelta
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto admin-scrollbar space-y-2">
              {(event.choices ?? []).map((choice, ci) => (
                <div key={ci} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/60 bg-emerald-500/10">
                      Scelta {ci + 1}
                    </Badge>
                    <button type="button" onClick={() => removeChoice(ci)} className="text-white/15 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={choice.text ?? ''}
                    onChange={e => updateChoice(ci, 'text', e.target.value)}
                    placeholder="Testo del pulsante scelta..."
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
                  />

                  {/* Outcome */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-white/[0.06]">
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">Risultato</span>
                    <textarea
                      value={choice.outcome?.description ?? ''}
                      onChange={e => updateChoice(ci, 'outcome.description', e.target.value)}
                      placeholder="Descrizione del risultato..."
                      rows={2}
                      className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-emerald-500/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-white/25">HP ±</label>
                        <input
                          type="number"
                          value={choice.outcome?.hpChange ?? 0}
                          onChange={e => updateChoice(ci, 'outcome.hpChange', Number(e.target.value))}
                          className="w-16 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!choice.outcome?.triggerCombat}
                          onChange={e => updateChoice(ci, 'outcome.triggerCombat', e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-red-500"
                        />
                        <span className="text-[10px] text-white/30">Combattimento</span>
                      </label>
                      {choice.outcome?.triggerCombat && (
                        <div className="flex-1">
                          <MiniEntitySearch
                            value={(choice.outcome?.combatEnemyIds ?? []).join(', ')}
                            onChange={v => updateChoice(ci, 'outcome.combatEnemyIds', v.split(',').map(s => s.trim()).filter(Boolean))}
                            endpoint="/api/admin/enemies"
                            labelKey="name"
                            iconKey="icon"
                          />
                        </div>
                      )}
                    </div>

                    {/* Reward Items */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/20">Ricompense</span>
                        <button type="button" onClick={() => addRewardItem(ci)} className="text-[10px] text-green-400/50 hover:text-green-400 transition-colors">
                          + oggetto
                        </button>
                      </div>
                      {(choice.outcome?.receiveItems ?? []).map((ri, riIdx) => (
                        <div key={riIdx} className="flex items-center gap-1">
                          <MiniEntitySearch
                            value={ri.itemId}
                            onChange={v => updateRewardItem(ci, riIdx, 'itemId', v)}
                            endpoint="/api/admin/items"
                            labelKey="name"
                            iconKey="icon"
                          />
                          <input
                            type="number"
                            value={ri.quantity}
                            onChange={e => updateRewardItem(ci, riIdx, 'quantity', Number(e.target.value))}
                            min={1}
                            className="w-14 text-[11px] bg-black border border-white/[0.06] rounded px-1 py-0.5 text-white/50 font-mono focus:outline-none focus:border-green-500/30"
                          />
                          <button type="button" onClick={() => removeRewardItem(ci, riIdx)} className="text-white/10 hover:text-red-400 transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {(event.choices ?? []).length === 0 && (
                <p className="text-[12px] text-white/15 italic text-center py-2">Nessuna scelta — aggiungine almeno una</p>
              )}
            </div>
          </div>

          {/* Puzzle section */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Puzzle Collegato</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!event.puzzle}
                  onChange={togglePuzzle}
                  className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
                />
                <span className="text-[11px] text-white/30">Abilita Puzzle</span>
              </label>
            </div>
            {event.puzzle && (
              <div className="mt-2 space-y-2 rounded-md border border-emerald-500/15 bg-emerald-500/[0.02] p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 mb-0.5 block">Tipo Puzzle</label>
                    <select
                      value={event.puzzle.type ?? 'combination'}
                      onChange={e => updatePuzzle('type', e.target.value)}
                      className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                    >
                      <option value="combination">Combinazione (codice)</option>
                      <option value="sequence">Sequenza (frecce)</option>
                      <option value="key_required">Chiave richiesta</option>
                    </select>
                  </div>
                  {(event.puzzle.type === 'combination' || event.puzzle.type === 'sequence') && event.puzzle.type === 'combination' && (
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Codice Segreto</label>
                      <input
                        type="text"
                        value={event.puzzle.combinationCode ?? ''}
                        onChange={e => updatePuzzle('combinationCode', e.target.value)}
                        placeholder="1974"
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/40"
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'sequence' && (
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Pattern Sequenza</label>
                      <SequencePatternEditor
                        value={event.puzzle.sequencePattern ?? []}
                        onChange={v => updatePuzzle('sequencePattern', v)}
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'key_required' && (
                    <>
                      <div className="col-span-2">
                        <label className="text-[10px] text-white/30 mb-0.5 block">Item Richiesto</label>
                        <MiniEntitySearch
                          value={event.puzzle.requiredItemId ?? ''}
                          onChange={v => updatePuzzle('requiredItemId', v)}
                          endpoint="/api/admin/items"
                          labelKey="name"
                          iconKey="icon"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Messaggio Fallimento</label>
                  <input
                    type="text"
                    value={event.puzzle.failMessage ?? ''}
                    onChange={e => updatePuzzle('failMessage', e.target.value)}
                    placeholder="Codice errato! La serratura non si muove."
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Descrizione Successo</label>
                  <textarea
                    value={event.puzzle?.successOutcome?.description ?? ''}
                    onChange={e => updatePuzzle('successOutcome', { ...(event.puzzle?.successOutcome ?? {}), description: e.target.value })}
                    placeholder="La serratura si apre con un click..."
                    rows={2}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-emerald-500/30"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Starting Items Editor — for character starting items
// ═══════════════════════════════════════════════════════════════

interface StartingItemEntry {
  itemId: string;
  quantity: number;
  isEquipped?: boolean;
}

function StartingItemsEditor({ value, onChange }: { value: unknown; onChange: (v: StartingItemEntry[]) => void }) {
  const [items, setItems] = useState<StartingItemEntry[]>(parseStartingItems(value));
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState<{ id: string; name: string; icon?: string; type?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/items');
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        setAvailableItems(data.map(r => ({
          id: String(r.id),
          name: String(r.name ?? r.id),
          icon: String(r.icon ?? ''),
          type: String(r.type ?? ''),
        })));
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, []);

  const update = (newItems: StartingItemEntry[]) => {
    setItems(newItems);
    onChange(newItems);
  };

  const addItem = (itemId: string) => {
    if (items.find(i => i.itemId === itemId)) return;
    const item = availableItems.find(a => a.id === itemId);
    const isAutoEquip = item?.type === 'weapon';
    update([...items, { itemId, quantity: 1, isEquipped: isAutoEquip }]);
    setSearchQuery('');
  };

  const removeItem = (idx: number) => update(items.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => update(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  const toggleEquip = (idx: number) => update(items.map((it, i) => i === idx ? { ...it, isEquipped: !it.isEquipped } : it));

  const filtered = searchQuery.trim()
    ? availableItems.filter(a => !items.find(i => i.itemId === a.id) && (a.id.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase()))).slice(0, 10)
    : [];

  const getItemName = (itemId: string) => availableItems.find(a => a.id === itemId)?.name ?? itemId;
  const getItemIcon = (itemId: string) => availableItems.find(a => a.id === itemId)?.icon ?? '';
  const getItemType = (itemId: string) => availableItems.find(a => a.id === itemId)?.type ?? '';

  return (
    <div className="space-y-2">
      {/* Current items */}
      <div className="max-h-36 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95 z-10">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1 text-white/40 font-medium w-6">#</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium">Oggetto</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-14">Qtà</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-16">Equip.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry, i) => {
              const type = getItemType(entry.itemId);
              const canEquip = ['weapon', 'armor', 'accessory'].includes(type);
              return (
                <tr key={entry.itemId + '-' + i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                  <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                  <td className="px-2 py-1 text-white/70">
                    <span className="mr-1">{getItemIcon(entry.itemId)}</span>
                    <span className="font-mono text-white/40 mr-1">{entry.itemId}</span>
                    <span className="text-white/60">{getItemName(entry.itemId)}</span>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={1}
                      value={entry.quantity}
                      onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                      className="w-12 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 text-center focus:outline-none focus:border-emerald-500/40"
                    />
                  </td>
                  <td className="px-1 py-1">
                    {canEquip ? (
                      <button type="button" onClick={() => toggleEquip(i)} className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${entry.isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/30 border border-white/[0.08] hover:border-white/20'}`}>
                        {entry.isEquipped ? 'Sì' : 'No'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/15">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-3 text-center text-white/15 italic">Nessun oggetto iniziale</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add item search */}
      {loaded && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca oggetto da aggiungere..."
            className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
          />
          {searchQuery && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-white/[0.12] bg-black/98 shadow-xl admin-scrollbar">
              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="w-full text-left px-2 py-1.5 text-[12px] hover:bg-white/[0.06] transition-colors text-white/70"
                >
                  <span className="mr-1">{item.icon}</span>
                  <span className="font-mono text-white/40 mr-1">{item.id}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseStartingItems(value: unknown): StartingItemEntry[] {
  if (Array.isArray(value)) {
    return value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return {
          itemId: String(o.itemId ?? o.id ?? ''),
          quantity: typeof o.quantity === 'number' ? o.quantity : 1,
          isEquipped: !!o.isEquipped,
        };
      }
      return { itemId: String(r), quantity: 1 };
    }).filter(e => e.itemId);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseStartingItems(parsed);
    } catch { /* ignore */ }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// Entity Form (for create/edit dialog)
// ═══════════════════════════════════════════════════════════════
export function EntityForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isEdit,
  activeTab,
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
  activeTab: TabId;
}) {
  const [data, setData] = useState<Record<string, unknown>>({ ...initialData });
  const mediaUploads = MEDIA_UPLOADS[activeTab];

  const handleChange = (key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
        {fields.map(f => {
          const val = data[f.key] ?? f.defaultValue ?? '';
          const isFullWidth = f.type === 'textarea' || f.type === 'tag-editor' || f.type === 'entity-tag-editor' || f.type === 'item-pool' || f.type === 'text-list' || f.type === 'locked-locs' || f.type === 'sub-areas' || f.type === 'story-event' || f.type === 'status-apply' || f.type === 'status-cured' || f.type === 'quest-rewards' || f.type === 'event-choices' || f.type === 'rich-text-editor' || f.type === 'trade-inventory' || f.type === 'starting-items' || f.type === 'effects-editor' || f.type === 'item-box-defaults' || f.type === 'requirements-editor' || (f.colSpan === 3);
          const isDoubleWidth = f.colSpan === 2 && !isFullWidth;

          if (isEdit && f.key === 'id') {
            // ID is read-only in edit mode
            return (
              <div key={f.key} className={isFullWidth ? 'col-span-3' : isDoubleWidth ? 'col-span-2' : ''}>
                <label className="text-[12px] text-white/50 mb-0.5 block font-medium">
                  {f.label}
                  {f.helpText && <span className="text-[11px] text-white/25 ml-1" title={f.helpText}>(?)</span>}
                </label>
                <input
                  type="text"
                  value={String(val)}
                  disabled
                  className="w-full text-[13px] bg-white/[0.02] border border-white/[0.06] rounded px-2 py-1.5 text-white/30 font-mono cursor-not-allowed"
                />
              </div>
            );
          }

          return (
            <div key={f.key} className={isFullWidth ? 'col-span-3' : isDoubleWidth ? 'col-span-2' : ''}>
              <label className="text-[12px] text-white/50 mb-0.5 block font-medium">
                {f.label} {f.required && <span className="text-red-400">*</span>}
                {f.helpText && <span className="text-[11px] text-white/25 ml-1" title={f.helpText}>(?)</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 resize-y font-mono"
                />
              ) : f.type === 'select' ? (
                <select
                  value={typeof val === 'string' ? val : ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-full text-[13px] bg-black text-white border border-white/[0.1] rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="" className="bg-black text-white">— Nessuno —</option>
                  {f.options?.map(opt => {
                    const label = f.enumGroup ? getEnumLabel(f.enumGroup, opt) : opt;
                    const hint = f.enumGroup ? getEnumHint(f.enumGroup, opt) : undefined;
                    return (
                      <option key={opt} value={opt} className="bg-black text-white" title={hint}>
                        {label} ({opt})
                      </option>
                    );
                  })}
                </select>
              ) : f.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={e => handleChange(f.key, e.target.checked)}
                    className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-emerald-500 focus:ring-emerald-500/50 accent-emerald-500"
                  />
                  <span className="text-[12px] text-white/50">{val ? 'Sì' : 'No'}</span>
                </label>
              ) : f.type === 'entity-search' ? (
                <EntitySearchInput
                  value={String(val)}
                  onChange={v => handleChange(f.key, v)}
                  endpoint={f.entitySearchEndpoint ?? ''}
                  labelKey={f.entitySearchLabelKey ?? 'name'}
                  iconKey={f.entityIconKey}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'tag-editor' ? (
                <TagEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'entity-tag-editor' ? (
                <EntityTagEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  endpoint={f.entitySearchEndpoint ?? ''}
                  labelKey={f.entitySearchLabelKey ?? 'name'}
                  iconKey={f.entityIconKey}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'item-pool' ? (
                <ItemPoolEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'text-list' ? (
                <TextListEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'locked-locs' ? (
                <LockedLocsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'sub-areas' ? (
                <SubAreasEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'story-event' ? (
                <StoryEventEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'status-apply' ? (
                <StatusApplyEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'status-cured' ? (
                <StatusCuredEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'effects-editor' ? (
                <EffectsArrayEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  showTrigger={activeTab === 'items'}
                />
              ) : f.type === 'quest-rewards' ? (
                <QuestRewardsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'event-choices' ? (
                <EventChoicesEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'rich-text-editor' ? (
                <RichTextEditor
                  value={typeof val === 'string' ? val : ''}
                  onChange={v => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'trade-inventory' ? (
                <TradeInventoryEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'starting-items' ? (
                <StartingItemsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'item-box-defaults' ? (
                <ItemBoxDefaultsEditor
                  value={typeof val === 'string' ? val : JSON.stringify(val)}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'requirements-editor' ? (
                <RequirementsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' && typeof f.defaultValue === 'number' && f.defaultValue % 1 !== 0 ? '0.1' : f.type === 'number' ? '1' : undefined}
                  value={val as string | number}
                  onChange={e => {
                    const raw = e.target.value;
                    handleChange(f.key, f.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw);
                  }}
                  placeholder={f.placeholder}
                  className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Media Uploads Section ═══ */}
      {mediaUploads.length > 0 && (
        <div className="mt-2 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <CloudUpload className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Media Upload</span>
            <span className="text-[11px] text-white/15">— immagini e suoni associati a questa entità</span>
          </div>
          <div className="space-y-3">
            {mediaUploads.map(mu => (
              <MediaUploadBox
                key={mu.key}
                config={mu}
                entityId={typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <Button
          type="submit"
          className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
        >
          <Save className="w-3.5 h-3.5" />
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="flex-1 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
