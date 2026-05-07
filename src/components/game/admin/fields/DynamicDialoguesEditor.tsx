'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface DialogueCondition {
  type: string;
  value: string | number;
  compare?: string;
}

interface DialogueEntry {
  text: string;
  conditions: DialogueCondition[];
  priority: number;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
const CONDITION_TYPES = [
  { value: 'reputation', label: '🤝 Reputation', hint: 'Reputation threshold value' },
  { value: 'questCompleted', label: '📋 Quest Done', hint: 'Quest ID to check' },
  { value: 'hasItem', label: '🎒 Has Item', hint: 'Item ID to check' },
  { value: 'flag', label: '🚩 Flag', hint: 'Flag name to check' },
] as const;

const COMPARE_OPTIONS = [
  { value: 'gte', label: '≥ (gte)' },
  { value: 'lte', label: '≤ (lte)' },
  { value: 'eq', label: '= (eq)' },
  { value: 'neq', label: '≠ (neq)' },
] as const;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function parseDialogues(val: unknown): DialogueEntry[] {
  if (Array.isArray(val)) {
    return val.map((entry: unknown, idx: number) => {
      if (typeof entry === 'object' && entry !== null) {
        const o = entry as Record<string, unknown>;
        return {
          text: String(o.text ?? ''),
          conditions: Array.isArray(o.conditions)
            ? (o.conditions as unknown[]).map((c: unknown) => {
                if (typeof c === 'object' && c !== null) {
                  const cond = c as Record<string, unknown>;
                  return {
                    type: String(cond.type ?? ''),
                    value: cond.value ?? '',
                    compare: String(cond.compare ?? 'gte'),
                  };
                }
                return { type: String(c), value: '', compare: 'gte' };
              })
            : [],
          priority: Number(o.priority ?? idx),
        };
      }
      return { text: String(entry ?? ''), conditions: [], priority: idx };
    });
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parseDialogues(parsed);
    } catch { /* return empty */ }
  }
  return [];
}

function createEmptyDialogue(idx: number): DialogueEntry {
  return {
    text: '',
    conditions: [],
    priority: idx,
  };
}

function createEmptyCondition(): DialogueCondition {
  return { type: 'reputation', value: '', compare: 'gte' };
}

// ═══════════════════════════════════════════════════════════════
// DynamicDialoguesEditor
// ═══════════════════════════════════════════════════════════════
export function DynamicDialoguesEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: DialogueEntry[]) => void;
}) {
  const [dialogues, setDialogues] = useState<DialogueEntry[]>(() => parseDialogues(value));
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(parseDialogues(value), null, 2));
  const [jsonError, setJsonError] = useState('');

  const updateDialogues = useCallback((newDialogues: DialogueEntry[]) => {
    setDialogues(newDialogues);
    setJsonText(JSON.stringify(newDialogues, null, 2));
    onChange(newDialogues);
  }, [onChange]);

  // ── Dialogue entry operations ──────────────────────────────
  const addDialogue = () => {
    updateDialogues([...dialogues, createEmptyDialogue(dialogues.length)]);
  };

  const removeDialogue = (idx: number) => {
    updateDialogues(dialogues.filter((_, i) => i !== idx).map((d, i) => ({ ...d, priority: i })));
  };

  const updateDialogue = (idx: number, field: keyof DialogueEntry, val: unknown) => {
    updateDialogues(dialogues.map((d, i) => (i === idx ? { ...d, [field]: val } : d)));
  };

  const toggleCollapse = (idx: number) => {
    setCollapsed(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ── Condition operations ───────────────────────────────────
  const addCondition = (dialogueIdx: number) => {
    const dialogue = dialogues[dialogueIdx];
    if (!dialogue) return;
    const newConditions = [...dialogue.conditions, createEmptyCondition()];
    updateDialogue(dialogueIdx, 'conditions', newConditions);
  };

  const removeCondition = (dialogueIdx: number, condIdx: number) => {
    const dialogue = dialogues[dialogueIdx];
    if (!dialogue) return;
    const newConditions = dialogue.conditions.filter((_, i) => i !== condIdx);
    updateDialogue(dialogueIdx, 'conditions', newConditions);
  };

  const updateCondition = (dialogueIdx: number, condIdx: number, field: keyof DialogueCondition, val: unknown) => {
    const dialogue = dialogues[dialogueIdx];
    if (!dialogue) return;
    const newConditions = dialogue.conditions.map((c, i) =>
      i === condIdx ? { ...c, [field]: val } : c
    );
    updateDialogue(dialogueIdx, 'conditions', newConditions);
  };

  // ── JSON mode ──────────────────────────────────────────────
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
      setJsonError('');
      setDialogues(parsed);
      onChange(parsed);
    } catch (e) {
      setJsonError(String(e));
    }
  };

  const switchToJsonMode = (checked: boolean) => {
    setJsonMode(checked);
    if (checked) setJsonText(JSON.stringify(dialogues, null, 2));
  };

  const conditionLabel = (type: string) => {
    return CONDITION_TYPES.find(t => t.value === type)?.label ?? type;
  };

  return (
    <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/[0.02] p-3">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[12px] font-semibold text-violet-300/80 uppercase tracking-wider px-1.5 py-0 border-violet-500/20 bg-violet-500/10">
            Dynamic Dialogues
          </Badge>
          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-violet-500/20 text-violet-400/60 bg-violet-500/10">
            {dialogues.length} entr{dialogues.length === 1 ? 'y' : 'ies'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={jsonMode}
              onChange={e => switchToJsonMode(e.target.checked)}
              className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-violet-500"
            />
            <span className="text-[10px] text-white/30">JSON</span>
          </label>
          {!collapsed[undefined!] && !jsonMode && (
            <button
              type="button"
              onClick={addDialogue}
              className="flex items-center gap-1 text-[11px] text-violet-400/60 hover:text-violet-400 transition-colors"
            >
              <Plus className="w-3 h-3" /> Dialogue
            </button>
          )}
        </div>
      </div>

      {/* ── JSON Mode ────────────────────────────────────────── */}
      {jsonMode ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
            rows={14}
            className="w-full text-[11px] bg-black border border-white/[0.08] rounded px-2.5 py-2 text-violet-300/80 font-mono placeholder-white/10 resize-y focus:outline-none focus:border-violet-500/40"
            placeholder="[...]"
          />
          {jsonError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {jsonError}
            </p>
          )}
          <button
            type="button"
            onClick={applyJson}
            className="text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors"
          >
            Apply JSON
          </button>
        </div>
      ) : (
        /* ── Visual Mode ──────────────────────────────────────── */
        <div className="space-y-2 max-h-[500px] overflow-y-auto admin-scrollbar">
          {dialogues.length === 0 && (
            <p className="text-[12px] text-white/15 italic text-center py-3">
              No dialogues — click + to add one
            </p>
          )}

          {dialogues.map((dialogue, idx) => {
            const isCollapsed = collapsed[idx] ?? false;
            return (
              <div
                key={idx}
                className="rounded-md border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {/* ── Dialogue header ──────────────────────────── */}
                <div className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(idx)}
                    className="text-violet-400/70 hover:text-violet-400 transition-colors shrink-0"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="text-[11px] text-white/30 font-mono shrink-0">#{idx}</span>

                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-violet-500/30 text-violet-300 bg-violet-500/10 shrink-0">
                    💬 Dialogue
                  </Badge>

                  {dialogue.conditions.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500/30 text-orange-300 bg-orange-500/10 shrink-0">
                      {dialogue.conditions.length} cond{dialogue.conditions.length !== 1 ? 's' : ''}
                    </Badge>
                  )}

                  <span className="text-[10px] text-white/20 font-mono shrink-0 ml-auto">
                    priority: {dialogue.priority}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeDialogue(idx)}
                    className="text-white/15 hover:text-red-400 transition-colors p-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* ── Dialogue body ────────────────────────────── */}
                {!isCollapsed && (
                  <div className="px-2.5 py-2 space-y-2">
                    {/* Text */}
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Text</label>
                      <textarea
                        value={dialogue.text}
                        onChange={e => updateDialogue(idx, 'text', e.target.value)}
                        placeholder="Dialogue text shown to player..."
                        rows={3}
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white/60 placeholder-white/10 resize-y focus:outline-none focus:border-violet-500/30"
                      />
                    </div>

                    {/* Priority */}
                    <div className="w-32">
                      <label className="text-[10px] text-white/30 mb-0.5 block">Priority</label>
                      <input
                        type="number"
                        value={dialogue.priority}
                        onChange={e => updateDialogue(idx, 'priority', Number(e.target.value))}
                        min={0}
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-violet-500/30"
                      />
                    </div>

                    {/* ── Conditions sub-section ─────────────────── */}
                    <div className="pt-1.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/25 uppercase tracking-wider">Conditions</span>
                        <button
                          type="button"
                          onClick={() => addCondition(idx)}
                          className="flex items-center gap-1 text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" /> condition
                        </button>
                      </div>

                      {dialogue.conditions.length === 0 && (
                        <p className="text-[11px] text-white/10 italic py-1">
                          No conditions — dialogue always shown
                        </p>
                      )}

                      {dialogue.conditions.length > 0 && (
                        <div className="space-y-1.5">
                          {dialogue.conditions.map((cond, ci) => {
                            const typeHint = CONDITION_TYPES.find(t => t.value === cond.type)?.hint ?? 'value...';
                            return (
                              <div
                                key={ci}
                                className="flex items-start gap-1.5 rounded border border-white/[0.06] bg-white/[0.02] p-2"
                              >
                                <span className="shrink-0 text-[10px] text-white/20 font-mono pt-1.5 w-3">{ci + 1}</span>

                                <div className="flex-1 grid grid-cols-3 gap-1.5 min-w-0">
                                  {/* Condition type */}
                                  <div>
                                    <label className="text-[9px] text-white/20 mb-0 block">Type</label>
                                    <select
                                      value={cond.type}
                                      onChange={e => updateCondition(idx, ci, 'type', e.target.value)}
                                      className="w-full text-[11px] bg-black text-white/70 border border-white/[0.08] rounded px-1.5 py-1 focus:outline-none focus:border-violet-500/40 cursor-pointer"
                                    >
                                      {CONDITION_TYPES.map(t => (
                                        <option key={t.value} value={t.value} className="bg-black text-white">{t.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Compare */}
                                  <div>
                                    <label className="text-[9px] text-white/20 mb-0 block">Compare</label>
                                    <select
                                      value={cond.compare ?? 'eq'}
                                      onChange={e => updateCondition(idx, ci, 'compare', e.target.value)}
                                      className="w-full text-[11px] bg-black text-white/70 border border-white/[0.08] rounded px-1.5 py-1 focus:outline-none focus:border-violet-500/40 cursor-pointer"
                                    >
                                      {COMPARE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value} className="bg-black text-white">{o.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Value */}
                                  <div>
                                    <label className="text-[9px] text-white/20 mb-0 block">Value</label>
                                    <input
                                      type="text"
                                      value={String(cond.value)}
                                      onChange={e => {
                                        // Try to parse as number, otherwise keep as string
                                        const raw = e.target.value;
                                        const parsed = Number(raw);
                                        const finalVal = raw.trim() !== '' && !isNaN(parsed) ? parsed : raw;
                                        updateCondition(idx, ci, 'value', finalVal);
                                      }}
                                      placeholder={typeHint}
                                      className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-violet-500/40"
                                    />
                                  </div>
                                </div>

                                {/* Remove condition */}
                                <button
                                  type="button"
                                  onClick={() => removeCondition(idx, ci)}
                                  className="text-white/10 hover:text-red-400 transition-colors shrink-0 pt-2"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
