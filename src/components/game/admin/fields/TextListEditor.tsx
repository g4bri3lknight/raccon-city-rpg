'use client';

import { Plus, Trash2 } from 'lucide-react';
import { parseStringArray } from './helpers';

// ═══════════════════════════════════════════════════════════════
// Text List Editor — for ambient text (array of strings)
// ═══════════════════════════════════════════════════════════════
export function TextListEditor({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
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
