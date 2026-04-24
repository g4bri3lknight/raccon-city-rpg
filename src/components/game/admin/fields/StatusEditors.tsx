'use client';

import { useState, useEffect } from 'react';
import { AdminTooltip } from './AdminTooltip';

// ═══════════════════════════════════════════════════════════════
// Status Apply Editor — for special ability status effects {type, chance}
// ═══════════════════════════════════════════════════════════════
export function StatusApplyEditor({ value, onChange }: { value: unknown; onChange: (v: { type: string; chance: number } | null) => void }) {
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

// ═══════════════════════════════════════════════════════════════
// Status Cured Editor — for item effect status curing ["poison","bleeding"]
// ═══════════════════════════════════════════════════════════════
export function StatusCuredEditor({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
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

// ═══════════════════════════════════════════════════════════════
// Special Effect Editor — for equipment passive effects {type, value}
// ═══════════════════════════════════════════════════════════════
export function SpecialEffectEditor({ value, onChange }: { value: unknown; onChange: (v: { type: string; value: number } | null) => void }) {
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
                <AdminTooltip text={currentTooltip} showIcon={false} />
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
