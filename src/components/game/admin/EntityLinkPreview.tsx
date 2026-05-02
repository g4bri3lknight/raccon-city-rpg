'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

// ═══════════════════════════════════════════════════════════════
// Module-level cache — avoids refetching the same entity
// ═══════════════════════════════════════════════════════════════
const entityCache = new Map<string, Record<string, unknown> | null>();

// ═══════════════════════════════════════════════════════════════
// EntityLinkPreview — mini preview popup on hover
// ═══════════════════════════════════════════════════════════════
export function EntityLinkPreview({
  value,
  endpoint,
  labelKey,
  iconKey,
  tabId,
  onNavigate,
}: {
  value: string;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
  tabId: string;
  onNavigate: (tabId: string, entityId: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [entity, setEntity] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cacheKey = `${endpoint}:${value}`;

  const fetchEntity = useCallback(async () => {
    if (entityCache.has(cacheKey)) {
      setEntity(entityCache.get(cacheKey));
      return;
    }

    setLoading(true);
    try {
      const res = await adminFetch(endpoint);
      if (!res.ok) {
        entityCache.set(cacheKey, null);
        setEntity(null);
        return;
      }
      const data: Record<string, unknown>[] = await res.json();
      const found = data.find(r => String(r.id) === value) ?? null;
      entityCache.set(cacheKey, found);
      setEntity(found);
    } catch {
      entityCache.set(cacheKey, null);
      setEntity(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, value, cacheKey]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      setVisible(true);
      fetchEntity();
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    popoverTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 200);
  };

  const handlePopoverEnter = () => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
  };

  const handlePopoverLeave = () => {
    popoverTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 200);
  };

  if (!value) return null;

  const displayName = entity ? String(entity[labelKey] ?? value) : '';
  const displayIcon = entity && iconKey ? String(entity[iconKey] ?? '') : '';

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible trigger area — spans the value text */}
      <span className="cursor-default" />

      {/* Popover */}
      {visible && (
        <div
          className="absolute z-50 bg-[#1a1f2e] border border-white/[0.1] rounded-lg shadow-xl p-3 min-w-[200px] top-full left-1/2 -translate-x-1/2 mt-1"
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        >
          {loading && (
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Caricamento...</span>
            </div>
          )}

          {!loading && entity && (
            <div>
              <div className="flex items-center gap-2">
                {(displayIcon || tabId) && (
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center text-sm">
                    {displayIcon || null}
                  </span>
                )}
                <span className="text-sm font-medium text-white/80 truncate">
                  {displayName || value}
                </span>
              </div>
              <p className="text-[11px] font-mono text-white/30 mt-0.5">
                {value}
              </p>
              <button
                type="button"
                onClick={() => onNavigate(tabId, value)}
                className="text-[12px] text-emerald-400 hover:text-emerald-300 mt-2 flex items-center gap-1 cursor-pointer transition-colors"
              >
                Apri
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {!loading && entity === null && (
            <p className="text-xs text-white/30">Entità non trovata</p>
          )}
        </div>
      )}
    </div>
  );
}
