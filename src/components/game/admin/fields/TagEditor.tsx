'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { parseStringArray } from './helpers';

// ═══════════════════════════════════════════════════════════════
// Tag Editor — for simple string arrays (enemyPool)
// ═══════════════════════════════════════════════════════════════
export function TagEditor({ value, onChange, placeholder }: { value: unknown; onChange: (v: string[]) => void; placeholder?: string }) {
  const tags = parseStringArray(value);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const v = inputVal.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
      setInputVal('');
      inputRef.current?.focus();
    }
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md bg-white/[0.04] border border-white/[0.1]">
        {tags.length === 0 && !inputVal && (
          <span className="text-[12px] text-white/20 italic">{placeholder ?? 'Premi Invio per aggiungere...'}</span>
        )}
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300 font-mono group/tag">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-emerald-500/40 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={tags.length === 0 ? placeholder : 'Aggiungi...'}
          className="flex-1 min-w-[80px] text-[12px] bg-transparent border-none outline-none text-white/70 placeholder-white/20 font-mono"
        />
      </div>
      <p className="text-[11px] text-white/15">Premi <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/25 font-mono">Invio</kbd> per aggiungere</p>
    </div>
  );
}
