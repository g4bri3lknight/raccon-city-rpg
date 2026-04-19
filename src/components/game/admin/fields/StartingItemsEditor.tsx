'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import type { StartingItemEntry } from './types';
import { parseStartingItems } from './helpers';

// ═══════════════════════════════════════════════════════════════
// Starting Items Editor — for character starting items
// ═══════════════════════════════════════════════════════════════
export function StartingItemsEditor({ value, onChange }: { value: unknown; onChange: (v: StartingItemEntry[]) => void }) {
  const [items, setItems] = useState<StartingItemEntry[]>(parseStartingItems(value));
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState<{ id: string; name: string; icon?: string; type?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/items');
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        setAvailableItems(data.map(r => ({
          id: String(r.id),
          name: String(r.name ?? r.id),
          icon: String(r.icon ?? ''),
          type: String(r.type ?? ''),
        })));
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, []);

  const update = (newItems: StartingItemEntry[]) => {
    setItems(newItems);
    onChange(newItems);
  };

  const addItem = (itemId: string) => {
    if (items.find(i => i.itemId === itemId)) return;
    const item = availableItems.find(a => a.id === itemId);
    const isAutoEquip = item?.type === 'weapon';
    update([...items, { itemId, quantity: 1, isEquipped: isAutoEquip }]);
    setSearchQuery('');
  };

  const removeItem = (idx: number) => update(items.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => update(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  const toggleEquip = (idx: number) => update(items.map((it, i) => i === idx ? { ...it, isEquipped: !it.isEquipped } : it));

  const filtered = searchQuery.trim()
    ? availableItems.filter(a => !items.find(i => i.itemId === a.id) && (a.id.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase()))).slice(0, 10)
    : [];

  const getItemName = (itemId: string) => availableItems.find(a => a.id === itemId)?.name ?? itemId;
  const getItemIcon = (itemId: string) => availableItems.find(a => a.id === itemId)?.icon ?? '';
  const getItemType = (itemId: string) => availableItems.find(a => a.id === itemId)?.type ?? '';

  return (
    <div className="space-y-2">
      {/* Current items */}
      <div className="max-h-36 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95 z-10">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1 text-white/40 font-medium w-6">#</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium">Oggetto</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-14">Qtà</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-16">Equip.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry, i) => {
              const type = getItemType(entry.itemId);
              const canEquip = ['weapon', 'armor', 'accessory'].includes(type);
              return (
                <tr key={entry.itemId + '-' + i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                  <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                  <td className="px-2 py-1 text-white/70">
                    <span className="mr-1">{getItemIcon(entry.itemId)}</span>
                    <span className="font-mono text-white/40 mr-1">{entry.itemId}</span>
                    <span className="text-white/60">{getItemName(entry.itemId)}</span>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={1}
                      value={entry.quantity}
                      onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                      className="w-12 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 text-center focus:outline-none focus:border-emerald-500/40"
                    />
                  </td>
                  <td className="px-1 py-1">
                    {canEquip ? (
                      <button type="button" onClick={() => toggleEquip(i)} className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${entry.isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/30 border border-white/[0.08] hover:border-white/20'}`}>
                        {entry.isEquipped ? 'Sì' : 'No'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/15">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-3 text-center text-white/15 italic">Nessun oggetto iniziale</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add item search */}
      {loaded && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca oggetto da aggiungere..."
            className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
          />
          {searchQuery && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-white/[0.12] bg-black/98 shadow-xl admin-scrollbar">
              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="w-full text-left px-2 py-1.5 text-[12px] hover:bg-white/[0.06] transition-colors text-white/70"
                >
                  <span className="mr-1">{item.icon}</span>
                  <span className="font-mono text-white/40 mr-1">{item.id}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
