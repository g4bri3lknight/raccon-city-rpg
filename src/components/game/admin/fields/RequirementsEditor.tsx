'use client';

import { Plus, Trash2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Requirements Editor — visual editor for ending requirements
// ═══════════════════════════════════════════════════════════════
const REQUIREMENT_TYPES = [
  { value: 'boss_defeated', label: 'Boss Sconfitto', icon: '💀', hint: 'ID del boss (es: tyrant_boss)' },
  { value: 'npc_saved', label: 'NPC Salvato', icon: '👤', hint: 'ID dell\'NPC (es: npc_marco)' },
  { value: 'documents_found', label: 'Documenti Trovati', icon: '📄', hint: 'Numero minimo di documenti' },
  { value: 'turn_limit', label: 'Limite Turni', icon: '⏱️', hint: 'Turni massimi per il completamento' },
  { value: 'party_alive', label: 'Gruppo Intero', icon: '👥', hint: 'Tutti i PG sopravvivono (valore: true)' },
  { value: 'secret_rooms', label: 'Stanze Segrete', icon: '🚪', hint: 'Numero minimo di stanze segrete' },
];

export function RequirementsEditor({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
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
                  <option key={t.value} value={t.value} className="bg-black text-white">{t.icon} {t.label}</option>
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
