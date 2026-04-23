'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

// ═══════════════════════════════════════════════════════════════
// Entity Search Input — searchable ID reference fields
// ═══════════════════════════════════════════════════════════════
export function EntitySearchInput({
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
      const res = await adminFetch(endpoint);
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
// Mini Entity Search — compact entity search for table rows
// ═══════════════════════════════════════════════════════════════
export function MiniEntitySearch({ value, onChange, endpoint, labelKey, iconKey }: {
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
        const res = await adminFetch(endpoint);
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

  const filterEntities = (v: string) => {
    const q = v.toLowerCase();
    if (!q) return entities; // show all when empty
    return entities.filter(e =>
      e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q)
    );
  };

  const handleInputChange = (v: string) => {
    setQuery(v);
    onChange(v);
    const filtered = filterEntities(v);
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
          const filtered = filterEntities(query);
          setResults(filtered);
          setShowDropdown(filtered.length > 0);
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
