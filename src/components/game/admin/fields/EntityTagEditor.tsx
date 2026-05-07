'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { parseStringArray } from './helpers';
import { adminFetch } from '@/lib/admin-fetch';

// ═══════════════════════════════════════════════════════════════
// Entity-Aware Tag Editor — searchable multi-select for entity pools
// ═══════════════════════════════════════════════════════════════
export function EntityTagEditor({ value, onChange, endpoint, labelKey, iconKey, placeholder }: {
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
          placeholder={selected.length > 0 ? 'Cerca...' : ''}
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
