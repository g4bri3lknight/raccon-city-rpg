'use client';

import { useState, useMemo } from 'react';
import { Trash2, X, Puzzle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Puzzle types for doors
// ═══════════════════════════════════════════════════════════════
export interface DoorPuzzleData {
  type: 'combination' | 'sequence';
  combinationCode?: string;
  sequencePattern?: string[];
  failMessage: string;
  successOutcome: {
    description: string;
  };
}

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  combination: 'Combinazione (codice)',
  sequence: 'Sequenza (frecce)',
};

function parseDoorPuzzle(val: unknown): DoorPuzzleData | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as DoorPuzzleData;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return null;
    try { return JSON.parse(trimmed) as DoorPuzzleData; } catch { return null; }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Sequence Pattern Editor — visual direction buttons
// ═══════════════════════════════════════════════════════════════
function SequencePatternEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const directions = ['up', 'down', 'left', 'right'];
  const dirIcons: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const dirColors: Record<string, string> = {
    up: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    down: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    left: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    right: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-500',
  };
  const pattern = Array.isArray(value) ? value : [];

  const add = (dir: string) => onChange([...pattern, dir]);
  const remove = (idx: number) => onChange(pattern.filter((_, i) => i !== idx));
  const clear = () => onChange([]);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 mb-1">
        {directions.map(dir => (
          <button
            key={dir}
            type="button"
            onClick={() => add(dir)}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${dirColors[dir]} hover:opacity-80 transition-opacity text-[11px]`}
          >
            <span className="text-xs">{dirIcons[dir]}</span>
            <span className="uppercase">{dir}</span>
          </button>
        ))}
        {pattern.length > 0 && (
          <button type="button" onClick={clear} className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-3 h-3 inline mr-0.5" />Cancella
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {pattern.map((dir, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${dirColors[dir] ?? 'border-white/10 bg-white/[0.04] text-white/60'} text-[11px]`}
          >
            <span className="text-[9px] text-white/25 font-mono">{i + 1}</span>
            <span className="text-xs">{dirIcons[dir] ?? '·'}</span>
            <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {pattern.length === 0 && (
          <span className="text-[10px] text-white/15 italic py-0.5">Clicca le frecce per creare la sequenza...</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Door Puzzle Editor — used in DoorCard for "Bloccata" state
// ═══════════════════════════════════════════════════════════════
interface DoorPuzzleEditorProps {
  value: unknown;          // puzzle data from door (can be string JSON, object, or null)
  onChange: (puzzle: DoorPuzzleData | null) => void;
}

export function DoorPuzzleEditor({ value, onChange }: DoorPuzzleEditorProps) {
  // Derive puzzle from value prop — parent re-renders with new value on data refresh
  const puzzle = useMemo(() => parseDoorPuzzle(value), [value]);
  const [localPuzzle, setLocalPuzzle] = useState<DoorPuzzleData | null>(puzzle);
  const [collapsed, setCollapsed] = useState(false);

  // Reset local state when external puzzle changes
  if (puzzle !== localPuzzle) {
    setLocalPuzzle(puzzle);
  }

  const updatePuzzle = (patch: Partial<DoorPuzzleData>) => {
    const updated = { ...localPuzzle!, ...patch } as DoorPuzzleData;
    setLocalPuzzle(updated);
    onChange(updated);
  };

  const enablePuzzle = () => {
    const newPuzzle: DoorPuzzleData = {
      type: 'combination',
      failMessage: '',
      successOutcome: { description: '' },
    };
    setLocalPuzzle(newPuzzle);
    onChange(newPuzzle);
  };

  const disablePuzzle = () => {
    setLocalPuzzle(null);
    onChange(null);
  };

  const hasPuzzle = !!localPuzzle;

  if (!hasPuzzle) {
    return (
      <div className="mt-1.5 rounded border border-dashed border-red-500/15 p-2 flex items-center justify-center">
        <button
          type="button"
          onClick={enablePuzzle}
          className="flex items-center gap-1.5 text-[10px] text-red-400/50 hover:text-red-400/80 transition-colors"
        >
          <Puzzle className="w-3 h-3" />
          Collega un Puzzle
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-red-500/15 bg-red-500/[0.02] p-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-red-400/60 hover:text-red-400 transition-colors"
          >
            {collapsed
              ? <span className="text-[10px]">▶</span>
              : <span className="text-[10px]">▼</span>
            }
          </button>
          <Puzzle className="w-3 h-3 text-red-400/60" />
          <span className="text-[10px] font-semibold text-red-300/70 uppercase tracking-wider">Puzzle</span>
        </div>
        <button
          type="button"
          onClick={disablePuzzle}
          className="flex items-center gap-1 text-[9px] text-red-400/40 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-2.5 h-2.5" /> Rimuovi
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Puzzle type */}
          <div className="grid grid-cols-1 gap-1.5">
            <div>
              <label className="text-[9px] text-white/25 mb-0.5 block">Tipo Puzzle</label>
              <select
                value={localPuzzle.type ?? 'combination'}
                onChange={e => updatePuzzle({ type: e.target.value as DoorPuzzleData['type'] })}
                className="w-full text-[10px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/60 focus:outline-none focus:border-red-500/30"
              >
                <option value="combination">Combinazione (codice)</option>
                <option value="sequence">Sequenza (frecce)</option>
              </select>
            </div>

            {/* Combination code */}
            {localPuzzle.type === 'combination' && (
              <div>
                <label className="text-[9px] text-white/25 mb-0.5 block">Codice Segreto</label>
                <input
                  type="text"
                  value={localPuzzle.combinationCode ?? ''}
                  onChange={e => updatePuzzle({ combinationCode: e.target.value })}
                  placeholder="es: 1974"
                  className="w-full text-[10px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/60 font-mono placeholder:text-white/10 focus:outline-none focus:border-red-500/30"
                />
              </div>
            )}

            {/* Sequence pattern */}
            {localPuzzle.type === 'sequence' && (
              <div>
                <label className="text-[9px] text-white/25 mb-0.5 block">Pattern Sequenza</label>
                <SequencePatternEditor
                  value={localPuzzle.sequencePattern ?? []}
                  onChange={v => updatePuzzle({ sequencePattern: v })}
                />
              </div>
            )}

            {/* Fail message */}
            <div>
              <label className="text-[9px] text-white/25 mb-0.5 block">Messaggio Fallimento</label>
              <input
                type="text"
                value={localPuzzle.failMessage ?? ''}
                onChange={e => updatePuzzle({ failMessage: e.target.value })}
                placeholder="es: Codice errato! La serratura non si muove."
                className="w-full text-[10px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder:text-white/10 focus:outline-none focus:border-red-500/30"
              />
            </div>

            {/* Success description */}
            <div>
              <label className="text-[9px] text-white/25 mb-0.5 block">Descrizione Successo</label>
              <textarea
                value={localPuzzle.successOutcome?.description ?? ''}
                onChange={e => updatePuzzle({ successOutcome: { ...(localPuzzle.successOutcome ?? {}), description: e.target.value } })}
                placeholder="es: La serratura si apre con un click..."
                rows={2}
                className="w-full text-[10px] bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder:text-white/10 resize-y italic focus:outline-none focus:border-red-500/30"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
