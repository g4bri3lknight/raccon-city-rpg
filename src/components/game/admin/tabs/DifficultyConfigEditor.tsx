'use client';

import { useMemo } from 'react';
import {
  DIFFICULTY_DEFAULTS,
  DiffLevel,
  DiffConfig,
  getDifficultyLevelsFromSettings,
} from '../config';

export function DifficultyConfigEditor({
  settings,
  onChange,
}: {
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  // Parse difficulty levels and configs from settings (dynamic, template-driven)
  const diffLevels = useMemo<string[]>(() => getDifficultyLevelsFromSettings(settings), [settings]);

  const diffConfigs = useMemo<Record<string, DiffConfig>>(() => {
    const parsed: Record<string, DiffConfig> = { ...DIFFICULTY_DEFAULTS };
    for (const lvl of diffLevels) {
      const key = `difficulty.${lvl}`;
      if (settings[key]) {
        try {
          parsed[lvl] = JSON.parse(settings[key]);
        } catch { /* keep default */ }
      }
    }
    return parsed;
  }, [settings, diffLevels]);

  const updateDiff = (level: DiffLevel, field: keyof DiffConfig, value: string | number) => {
    const updated = { ...diffConfigs[level], [field]: value };
    onChange(`difficulty.${level}`, JSON.stringify(updated));
  };

  const getDiffMeta = (lvl: string): { badge: string; borderColor: string; bgGlow: string } => {
    const idx = diffLevels.indexOf(lvl);
    if (idx === 0) return { badge: 'FACILE', borderColor: 'border-green-500/30', bgGlow: 'bg-green-500/5' };
    if (idx === diffLevels.length - 1) return { badge: 'DIFFICILE', borderColor: 'border-red-500/30', bgGlow: 'bg-red-500/5' };
    return { badge: 'NORMALE', borderColor: 'border-emerald-500/30', bgGlow: 'bg-emerald-500/5' };
  };

  return (
    <div className="space-y-4">
      {diffLevels.map(lvl => {
        const cfg = diffConfigs[lvl];
        if (!cfg) return null;
        const meta = getDiffMeta(lvl);
        return (
          <div key={lvl} className={`rounded-xl border ${meta.borderColor} ${meta.bgGlow} p-4 space-y-3`}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="text-xl">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cfg.label}
                    onChange={e => updateDiff(lvl, 'label', e.target.value)}
                    className="text-sm font-bold text-white/90 bg-transparent border-b border-transparent hover:border-white/20 focus:border-white/40 focus:outline-none transition-colors px-0 py-0 w-auto"
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                    {meta.badge}
                  </span>
                </div>
              </div>
              {/* Icon + Color pickers */}
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-white/40">Icona</label>
                <input
                  type="text"
                  value={cfg.icon}
                  onChange={e => updateDiff(lvl, 'icon', e.target.value)}
                  className="w-10 text-center text-sm bg-black/20 border border-white/[0.08] rounded px-1 py-0.5 text-white/90 focus:outline-none focus:border-white/30"
                />
                <label className="text-[12px] text-white/40">Colore</label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={cfg.color}
                    onChange={e => updateDiff(lvl, 'color', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={cfg.color}
                    onChange={e => updateDiff(lvl, 'color', e.target.value)}
                    className="w-16 text-[12px] font-mono bg-black/20 border border-white/[0.08] rounded px-1.5 py-0.5 text-white/70 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <input
              type="text"
              value={cfg.description}
              onChange={e => updateDiff(lvl, 'description', e.target.value)}
              placeholder="Descrizione difficoltà..."
              className="w-full bg-black/20 border border-white/[0.06] rounded-lg px-3 py-1.5 text-[13px] text-white/60 italic focus:outline-none focus:border-white/20 transition-colors"
            />

            {/* Numeric fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                ['statMult', 'Moltiplicatore Stat Nemici', 0.1, 3.0, 0.05],
                ['lootMult', 'Moltiplicatore Bottino', 0.1, 3.0, 0.05],
                ['expMult', 'Moltiplicatore EXP', 0.1, 3.0, 0.05],
                ['enemyCritChance', 'Critico Nemico (%)', 0, 100, 1],
                ['minEnemies', 'Min Nemici', 1, 8, 1],
                ['maxEnemies', 'Max Nemici', 1, 10, 1],
              ] as const).map(([field, label, min, max, step]) => (
                <div key={field} className="space-y-0.5">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wide">{label}</label>
                  <input
                    type="number"
                    value={cfg[field as keyof DiffConfig] as number}
                    onChange={e => updateDiff(lvl, field as keyof DiffConfig, parseFloat(e.target.value) || 0)}
                    min={min}
                    max={max}
                    step={step}
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/90 focus:outline-none focus:border-white/30 transition-colors tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
