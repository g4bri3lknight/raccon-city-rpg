'use client';

import { Plus, Minus, Trash2 } from 'lucide-react';
import { MiniEntitySearch } from './EntitySearchInput';

// ═══════════════════════════════════════════════════════════════
// Event Choices Editor — table with text + outcome fields for event choices
// ═══════════════════════════════════════════════════════════════
export function EventChoicesEditor({ value, onChange }: {
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
