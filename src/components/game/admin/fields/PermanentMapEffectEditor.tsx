'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface PermanentMapEffect {
  type: string;
  locationId: string;
  value: string | number | boolean;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
const EFFECT_TYPE_OPTIONS = [
  { value: 'lock_location', label: '🔒 Lock Location', hint: 'Prevents access to location' },
  { value: 'unlock_location', label: '🔓 Unlock Location', hint: 'Opens access to location' },
  { value: 'change_danger', label: '⚠️ Change Danger', hint: 'Danger level value (number)' },
  { value: 'change_encounter_rate', label: '🔄 Encounter Rate', hint: 'Encounter rate value (number)' },
  { value: 'add_enemy_pool', label: '👾 Add Enemy Pool', hint: 'Enemy pool ID to add' },
] as const;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function parseMapEffect(val: unknown): PermanentMapEffect {
  const empty: PermanentMapEffect = { type: 'lock_location', locationId: '', value: '' };

  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>;
    return {
      type: String(o.type ?? 'lock_location'),
      locationId: String(o.locationId ?? ''),
      value: o.value ?? '',
    };
  }

  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object' && parsed !== null) {
        const o = parsed as Record<string, unknown>;
        return {
          type: String(o.type ?? 'lock_location'),
          locationId: String(o.locationId ?? ''),
          value: o.value ?? '',
        };
      }
    } catch { /* fall through to empty */ }
  }

  return empty;
}

// ═══════════════════════════════════════════════════════════════
// PermanentMapEffectEditor
// ═══════════════════════════════════════════════════════════════
export function PermanentMapEffectEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: PermanentMapEffect) => void;
}) {
  const [effect, setEffect] = useState<PermanentMapEffect>(() => parseMapEffect(value));
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(parseMapEffect(value), null, 2));
  const [jsonError, setJsonError] = useState('');

  const update = useCallback((patch: Partial<PermanentMapEffect>) => {
    const updated = { ...effect, ...patch };
    setEffect(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    onChange(updated);
  }, [effect, onChange]);

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Must be an object');
      setJsonError('');
      setEffect(parsed);
      onChange(parsed);
    } catch (e) {
      setJsonError(String(e));
    }
  };

  const switchToJsonMode = (checked: boolean) => {
    setJsonMode(checked);
    if (checked) setJsonText(JSON.stringify(effect, null, 2));
  };

  const selectedTypeHint = EFFECT_TYPE_OPTIONS.find(t => t.value === effect.type)?.hint ?? '';

  return (
    <div className="space-y-3 rounded-lg border border-orange-500/20 bg-orange-500/[0.02] p-3">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[12px] font-semibold text-orange-300/80 uppercase tracking-wider px-1.5 py-0 border-orange-500/20 bg-orange-500/10">
          Permanent Map Effect
        </Badge>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={jsonMode}
            onChange={e => switchToJsonMode(e.target.checked)}
            className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-orange-500"
          />
          <span className="text-[10px] text-white/30">JSON</span>
        </label>
      </div>

      {/* ── JSON Mode ────────────────────────────────────────── */}
      {jsonMode ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
            rows={8}
            className="w-full text-[11px] bg-black border border-white/[0.08] rounded px-2.5 py-2 text-orange-300/80 font-mono placeholder-white/10 resize-y focus:outline-none focus:border-orange-500/40"
            placeholder="{...}"
          />
          {jsonError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {jsonError}
            </p>
          )}
          <button
            type="button"
            onClick={applyJson}
            className="text-[11px] text-orange-400/70 hover:text-orange-400 transition-colors"
          >
            Apply JSON
          </button>
        </div>
      ) : (
        /* ── Visual Mode ──────────────────────────────────────── */
        <div className="space-y-2">
          {/* Effect Type */}
          <div>
            <label className="text-[10px] text-white/30 mb-0.5 block">Effect Type</label>
            <select
              value={effect.type}
              onChange={e => update({ type: e.target.value })}
              className="w-full text-[12px] bg-black text-white/70 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-orange-500/40 cursor-pointer"
            >
              {EFFECT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {selectedTypeHint && (
              <p className="text-[10px] text-white/20 italic mt-0.5">{selectedTypeHint}</p>
            )}
          </div>

          {/* Location ID */}
          <div>
            <label className="text-[10px] text-white/30 mb-0.5 block">Location ID</label>
            <input
              type="text"
              value={effect.locationId}
              onChange={e => update({ locationId: e.target.value })}
              placeholder="e.g. abandoned_hospital, forest_path..."
              className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-orange-500/30"
            />
          </div>

          {/* Value */}
          <div>
            <label className="text-[10px] text-white/30 mb-0.5 block">Value</label>
            <input
              type="text"
              value={String(effect.value)}
              onChange={e => {
                const raw = e.target.value;
                // Attempt to detect boolean
                if (raw === 'true') { update({ value: true }); return; }
                if (raw === 'false') { update({ value: false }); return; }
                // Attempt to detect number
                const parsed = Number(raw);
                if (raw.trim() !== '' && !isNaN(parsed)) {
                  update({ value: parsed });
                } else {
                  update({ value: raw });
                }
              }}
              placeholder="string, number, or boolean (true/false)..."
              className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-orange-500/30"
            />
            <p className="text-[10px] text-white/15 mt-0.5">
              Current type: {typeof effect.value === 'boolean' ? 'boolean' : typeof effect.value === 'number' ? 'number' : 'string'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
