'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import {
  EFFECT_TYPES_CONFIG, EFFECT_CATEGORY_COLORS,
  EFFECT_TARGET_OPTIONS,
  parseEffectsArray, getDefaultEffect, TRIGGER_OPTIONS,
} from '../config/effectTypes';
import { AdminTooltip } from './AdminTooltip';

// ═══════════════════════════════════════════════════════════════
// Effects Array Editor — atomic effects for special abilities / items
// (Types and config imported from ../config/effectTypes)
// ═══════════════════════════════════════════════════════════════
export function EffectsArrayEditor({ value, onChange, showTrigger = false }: { value: unknown; onChange: (v: Record<string, unknown>[]) => void; showTrigger?: boolean }) {
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
                                <AdminTooltip text="Quando si attiva l'effetto in base al tipo di oggetto." showIcon={false} />
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
                              <AdminTooltip text="Chi riceve l'effetto. Sé Stesso = il personaggio che usa l'abilità." showIcon={false} />
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
                                            <AdminTooltip text={field.tooltip} showIcon={false} />
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
                                            <AdminTooltip text={field.tooltip} showIcon={false} />
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
                                          <AdminTooltip text={field.tooltip} showIcon={false} />
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
                                        <AdminTooltip text={field.tooltip} showIcon={false} />
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
