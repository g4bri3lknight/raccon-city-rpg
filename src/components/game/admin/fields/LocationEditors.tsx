'use client';

import { Plus, Trash2 } from 'lucide-react';
import { MiniEntitySearch } from './EntitySearchInput';

// ═══════════════════════════════════════════════════════════════
// Locked Locations Editor — table with locationId, requiredItemId, lockedMessage
// ═══════════════════════════════════════════════════════════════
export function LockedLocsEditor({ value, onChange }: { value: unknown; onChange: (v: { locationId: string; requiredItemId: string; lockedMessage: string }[]) => void }) {
  let locs: { locationId: string; requiredItemId: string; lockedMessage: string }[] = [];
  if (Array.isArray(value)) {
    locs = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { locationId: String(o.locationId ?? ''), requiredItemId: String(o.requiredItemId ?? ''), lockedMessage: String(o.lockedMessage ?? '') };
      }
      return { locationId: String(r), requiredItemId: '', lockedMessage: '' };
    });
  } else if (typeof value === 'string') {
    try { locs = JSON.parse(value) || []; } catch { locs = []; }
  }

  const add = () => onChange([...locs, { locationId: '', requiredItemId: '', lockedMessage: '' }]);
  const remove = (idx: number) => onChange(locs.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(locs.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Location ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item Richiesto</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Msg Blocco</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {locs.map((loc, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-black hover:bg-neutral-900">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.locationId} onChange={v => update(i, 'locationId', v)} endpoint="/api/admin/locations" labelKey="name" />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.requiredItemId} onChange={v => update(i, 'requiredItemId', v)} endpoint="/api/admin/items" labelKey="name" iconKey="icon" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={loc.lockedMessage} onChange={e => update(i, 'lockedMessage', e.target.value)} placeholder="La porta è chiusa a chiave..." className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {locs.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">Nessuna location bloccata</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi blocco
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub Areas Editor — table with id, name, description
// ═══════════════════════════════════════════════════════════════
export function SubAreasEditor({ value, onChange }: { value: unknown; onChange: (v: { id: string; name: string; description: string }[]) => void }) {
  let areas: { id: string; name: string; description: string }[] = [];
  if (Array.isArray(value)) {
    areas = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { id: String(o.id ?? ''), name: String(o.name ?? ''), description: String(o.description ?? '') };
      }
      return { id: String(r), name: '', description: '' };
    });
  } else if (typeof value === 'string') {
    try { areas = JSON.parse(value) || []; } catch { areas = []; }
  }

  const add = () => onChange([...areas, { id: '', name: '', description: '' }]);
  const remove = (idx: number) => onChange(areas.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(areas.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[28rem] overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        {areas.map((area, i) => (
          <div key={i} className="border-b border-white/[0.06] bg-black last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="shrink-0 text-[11px] text-white/20 font-mono">{i + 1}.</span>
              <input type="text" value={area.id} onChange={e => update(i, 'id', e.target.value)} placeholder="safe_room" className="w-28 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={area.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Safe Room" className="w-32 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={area.description} onChange={e => update(i, 'description', e.target.value)} placeholder="Un rifugio sicuro..." className="flex-1 min-w-0 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {areas.length === 0 && (
          <div className="px-2 py-4 text-center text-white/15 italic text-[12px]">Nessuna sotto-area</div>
        )}
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi sotto-area
      </button>
    </div>
  );
}
