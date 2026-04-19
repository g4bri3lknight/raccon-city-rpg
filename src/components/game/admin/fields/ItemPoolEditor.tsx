'use client';

import { Plus, Trash2 } from 'lucide-react';
import { MiniEntitySearch } from './EntitySearchInput';

// ═══════════════════════════════════════════════════════════════
// Item Pool Editor — table with itemId, chance%, quantity
// ═══════════════════════════════════════════════════════════════
export function ItemPoolEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; chance: number; quantity: number }[]) => void }) {
  let items: { itemId: string; chance: number; quantity: number }[] = [];
  if (Array.isArray(value)) {
    items = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), chance: Number(o.chance ?? 0), quantity: Number(o.quantity ?? 1) };
      }
      return { itemId: String(r), chance: 0, quantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { items = JSON.parse(value) || []; } catch { items = []; }
  }

  const addItem = () => {
    onChange([...items, { itemId: '', chance: 30, quantity: 1 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: string | number) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: val } : item);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Chance %</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={item.itemId}
                    onChange={v => updateItem(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.chance}
                    onChange={e => updateItem(i, 'chance', Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">
                  Nessun oggetto — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi oggetto
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Item Box Defaults Editor — table with itemId and quantity (no chance)
// ═══════════════════════════════════════════════════════════════
export function ItemBoxDefaultsEditor({ value, onChange }: { value: string; onChange: (v: { itemId: string; quantity: number }[]) => void }) {
  let items: { itemId: string; quantity: number }[] = [];
  try { items = JSON.parse(value) || []; } catch { items = []; }

  const addItem = () => onChange([...items, { itemId: '', quantity: 1 }]);

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, val: string | number) => {
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-24">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={item.itemId}
                    onChange={v => updateItem(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-white/15 italic">
                  Nessun oggetto — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi oggetto
      </button>
    </div>
  );
}
