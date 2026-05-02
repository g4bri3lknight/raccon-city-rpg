'use client';

import { useState, useEffect, useCallback } from 'react';
import { Palette, X } from 'lucide-react';
import type { TabId } from '@/components/game/admin/config/tabGroups';
import { TABS } from '@/components/game/admin/config/tabGroups';

// ── Preset Colors (emerald-focused palette) ──
const PRESET_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Slate', value: '#64748b' },
];

const STORAGE_KEY = 'rpg-editor-entity-colors';

// ── Types ──
export interface EntityColorMap {
  [tabId: string]: string;
}

interface EntityColorConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helper: safely read colors from localStorage ──
function readColorsFromStorage(): EntityColorMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

// ── Hook to read entity colors ──
export function useEntityColors(): EntityColorMap {
  const [colors, setColors] = useState<EntityColorMap>(readColorsFromStorage);

  useEffect(() => {
    const handler = () => setColors(readColorsFromStorage());
    window.addEventListener('entity-colors-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('entity-colors-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return colors;
}

// ── Get the color for a tab, returns empty string if none set ──
export function getEntityColor(tabId: string, colorMap: EntityColorMap): string {
  return colorMap[tabId] ?? '';
}

// ── Component ──
export function EntityColorConfig({ open, onOpenChange }: EntityColorConfigProps) {
  const [colorMap, setColorMap] = useState<EntityColorMap>(readColorsFromStorage);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [prevOpen, setPrevOpen] = useState(open);

  // Synchronize state when dialog opens — React-approved setState-during-render pattern
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setColorMap(readColorsFromStorage());
    }
  }

  const saveColors = useCallback((newMap: EntityColorMap) => {
    setColorMap(newMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    // Dispatch a custom event so other components can react
    window.dispatchEvent(new CustomEvent('entity-colors-changed', { detail: newMap }));
  }, []);

  const setColor = (tabId: string, color: string) => {
    saveColors({ ...colorMap, [tabId]: color });
    setCustomInputs(prev => ({ ...prev, [tabId]: '' }));
  };

  const removeColor = (tabId: string) => {
    const next = { ...colorMap };
    delete next[tabId];
    saveColors(next);
    setCustomInputs(prev => ({ ...prev, [tabId]: '' }));
  };

  const handleCustomInput = (tabId: string, value: string) => {
    setCustomInputs(prev => ({ ...prev, [tabId]: value }));
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setColor(tabId, value);
    }
  };

  // Filter to non-custom tabs only
  const colorableTabs = TABS.filter(t => !t.custom);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-[#111827] border border-white/[0.08] rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-400" />
            <h2 className="text-[15px] font-semibold text-white/90">
              Colori per Tipologia
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 admin-scrollbar">
          {colorableTabs.map(tab => (
            <div key={tab.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0">{tab.icon}</span>
                <span className="text-[13px] font-medium text-white/70">{tab.label}</span>
                {colorMap[tab.id] && (
                  <div
                    className="w-3 h-3 rounded-full ml-auto"
                    style={{ backgroundColor: colorMap[tab.id] }}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(tab.id, c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                      colorMap[tab.id] === c.value
                        ? 'border-white shadow-lg shadow-white/20 scale-110'
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                {/* Custom hex input */}
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="text"
                    value={customInputs[tab.id] ?? ''}
                    onChange={(e) => handleCustomInput(tab.id, e.target.value)}
                    placeholder="#ff0000"
                    className="w-[70px] text-[11px] font-mono bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/60 placeholder-white/20 focus:outline-none focus:border-emerald-500/30"
                  />
                  {colorMap[tab.id] && (
                    <button
                      onClick={() => removeColor(tab.id)}
                      className="text-[11px] text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/30 text-center">
            I colori verranno applicati ai badge e bordi delle card nella vista editor
          </p>
        </div>
      </div>
    </div>
  );
}
