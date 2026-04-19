'use client';

import { Plus, Trash2 } from 'lucide-react';
import { MiniEntitySearch } from './EntitySearchInput';

// ═══════════════════════════════════════════════════════════════
// Trade Inventory Editor — table with itemId, quantity, priceItemId, priceQuantity
// ═══════════════════════════════════════════════════════════════
export function TradeInventoryEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; quantity: number; priceItemId: string; priceQuantity: number }[]) => void }) {
  let trades: { itemId: string; quantity: number; priceItemId: string; priceQuantity: number }[] = [];
  if (Array.isArray(value)) {
    trades = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), quantity: Number(o.quantity ?? 1), priceItemId: String(o.priceItemId ?? ''), priceQuantity: Number(o.priceQuantity ?? 1) };
      }
      return { itemId: String(r), quantity: 1, priceItemId: '', priceQuantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { trades = JSON.parse(value) || []; } catch { trades = []; }
  }

  const add = () => onChange([...trades, { itemId: '', quantity: 1, priceItemId: '', priceQuantity: 1 }]);
  const remove = (idx: number) => onChange(trades.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string | number) => {
    onChange(trades.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Oggetto in Vendita</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-14">Qtà</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Prezzo (Oggetto)</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Qtà (prezzo)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.itemId}
                    onChange={v => update(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={trade.quantity}
                    onChange={e => update(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-black border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.priceItemId}
                    onChange={v => update(i, 'priceItemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={trade.priceQuantity}
                    onChange={e => update(i, 'priceQuantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[12px] bg-black border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-white/15 italic">
                  Nessuno scambio — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi scambio
      </button>
    </div>
  );
}
