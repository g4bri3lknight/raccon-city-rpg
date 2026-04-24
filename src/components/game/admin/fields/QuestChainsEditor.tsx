'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface ChainStep {
  id: string;
  stepIndex: number;
  description: string;
  type: 'fetch' | 'kill' | 'explore' | 'talk' | 'choose';
  targetId: string;
  targetCount: number;
  nextStepId: string;
  rewardItems?: { itemId: string; quantity: number }[];
  rewardExp?: number;
  rewardDialogue?: string[];
  branchChoice?: {
    prompt: string;
    choices: {
      text: string;
      description: string;
      nextStepId: string;
      flag: string;
    }[];
  };
  sortOrder?: number;
}

interface ChainFinalReward {
  items: { itemId: string; quantity: number }[];
  exp: number;
  dialogue: string[];
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
const TYPE_COLORS: Record<string, string> = {
  fetch: 'border-blue-400/30 text-blue-300 bg-blue-400/10',
  kill: 'border-red-400/30 text-red-300 bg-red-400/10',
  explore: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
  talk: 'border-purple-400/30 text-purple-300 bg-purple-400/10',
  choose: 'border-amber-400/30 text-amber-300 bg-amber-400/10',
};

const TYPE_ICONS: Record<string, string> = {
  fetch: '📦',
  kill: '⚔️',
  explore: '🔍',
  talk: '💬',
  choose: '🔀',
};

function parseSteps(val: unknown): ChainStep[] {
  if (Array.isArray(val)) return val as ChainStep[];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function parseFinalReward(val: unknown): ChainFinalReward {
  if (val && typeof val === 'object') {
    const r = val as Record<string, unknown>;
    return {
      items: (Array.isArray(r.items) ? r.items : Array.isArray(r.rewardItems) ? r.rewardItems : []) as { itemId: string; quantity: number }[],
      exp: Number(r.exp ?? r.rewardExp ?? 0),
      dialogue: Array.isArray(r.dialogue) ? r.dialogue : [],
    };
  }
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return { items: [], exp: 0, dialogue: [] }; }
  }
  return { items: [], exp: 0, dialogue: [] };
}

// ═══════════════════════════════════════════════════════════════
// QuestChainsEditor
// ═══════════════════════════════════════════════════════════════
export function QuestChainsEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: ChainStep[]) => void;
}) {
  const [steps, setSteps] = useState<ChainStep[]>(() => parseSteps(value));
  const [collapsed, setCollapsed] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(parseSteps(value), null, 2));
  const [jsonError, setJsonError] = useState('');

  const updateSteps = useCallback((newSteps: ChainStep[]) => {
    setSteps(newSteps);
    setJsonText(JSON.stringify(newSteps, null, 2));
    onChange(newSteps);
  }, [onChange]);

  const addStep = () => {
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      stepIndex: steps.length,
      description: '',
      type: 'fetch',
      targetId: '',
      targetCount: 1,
      nextStepId: '',
      rewardItems: [],
      rewardExp: 0,
      rewardDialogue: [],
    };
    updateSteps([...steps, newStep]);
  };

  const removeStep = (idx: number) => {
    const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepIndex: i }));
    updateSteps(newSteps);
  };

  const updateStep = (idx: number, field: keyof ChainStep, val: unknown) => {
    const newSteps = steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    updateSteps(newSteps);
  };

  const addBranchChoice = (stepIdx: number) => {
    const step = steps[stepIdx];
    if (!step) return;
    const branchChoice = step.branchChoice || { prompt: '', choices: [] };
    branchChoice.choices.push({ text: '', description: '', nextStepId: '', flag: '' });
    const newSteps = steps.map((s, i) => (i === stepIdx ? { ...s, branchChoice } : s));
    updateSteps(newSteps);
  };

  const removeBranchChoice = (stepIdx: number, choiceIdx: number) => {
    const step = steps[stepIdx];
    if (!step?.branchChoice) return;
    const branchChoice = { ...step.branchChoice, choices: step.branchChoice.choices.filter((_, i) => i !== choiceIdx) };
    const newSteps = steps.map((s, i) => (i === stepIdx ? { ...s, branchChoice } : s));
    updateSteps(newSteps);
  };

  const updateBranchChoice = (stepIdx: number, choiceIdx: number, field: string, val: string) => {
    const step = steps[stepIdx];
    if (!step?.branchChoice) return;
    const choices = step.branchChoice.choices.map((c, i) => (i === choiceIdx ? { ...c, [field]: val } : c));
    const newSteps = steps.map((s, i) => (i === stepIdx ? { ...s, branchChoice: { ...s.branchChoice!, choices } } : s));
    updateSteps(newSteps);
  };

  const updateBranchPrompt = (stepIdx: number, val: string) => {
    const step = steps[stepIdx];
    if (!step?.branchChoice) return;
    const newSteps = steps.map((s, i) => (i === stepIdx ? { ...s, branchChoice: { ...s.branchChoice!, prompt: val } } : s));
    updateSteps(newSteps);
  };

  const toggleBranchChoice = (stepIdx: number) => {
    const step = steps[stepIdx];
    if (step?.branchChoice) {
      updateStep(stepIdx, 'branchChoice', undefined);
    } else {
      updateStep(stepIdx, 'branchChoice', { prompt: '', choices: [] });
    }
  };

  const moveStepUp = (idx: number) => {
    if (idx === 0) return;
    const newSteps = [...steps];
    [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
    updateSteps(newSteps.map((s, i) => ({ ...s, stepIndex: i })));
  };

  const moveStepDown = (idx: number) => {
    if (idx >= steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[idx], newSteps[idx + 1]] = [newSteps[idx + 1], newSteps[idx]];
    updateSteps(newSteps.map((s, i) => ({ ...s, stepIndex: i })));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
      setJsonError('');
      setSteps(parsed);
      onChange(parsed);
    } catch (e) {
      setJsonError(String(e));
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[12px] font-semibold text-emerald-300/80 uppercase tracking-wider">Steps Quest Chain</span>
          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/60 bg-emerald-500/10">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={jsonMode}
              onChange={e => {
                setJsonMode(e.target.checked);
                if (e.target.checked) setJsonText(JSON.stringify(steps, null, 2));
              }}
              className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
            />
            <span className="text-[10px] text-white/30">JSON</span>
          </label>
          {!collapsed && (
            <button type="button" onClick={addStep} className="flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
              <Plus className="w-3 h-3" /> Step
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {jsonMode ? (
            <div className="space-y-2">
              <textarea
                value={jsonText}
                onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
                rows={12}
                className="w-full text-[11px] bg-black border border-white/[0.08] rounded px-2.5 py-2 text-emerald-300/80 font-mono placeholder-white/10 resize-y focus:outline-none focus:border-emerald-500/40"
                placeholder="[]"
              />
              {jsonError && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {jsonError}
                </p>
              )}
              <button
                type="button"
                onClick={applyJson}
                className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
              >
                Applica JSON
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto admin-scrollbar">
              {steps.length === 0 && (
                <p className="text-[12px] text-white/15 italic text-center py-3">Nessuno step — aggiungine almeno uno</p>
              )}
              {steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  {/* Step header */}
                  <div className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                    <Badge variant="outline" className={`text-[11px] px-1.5 py-0 shrink-0 ${TYPE_COLORS[step.type] ?? 'border-white/10 text-white/50 bg-white/[0.04]'}`}>
                      {TYPE_ICONS[step.type] ?? '•'} {step.type}
                    </Badge>
                    <span className="text-[11px] text-white/30 font-mono">#{step.stepIndex}</span>
                    <span className="text-[12px] text-white/60 flex-1 truncate">
                      {step.description || '<nessuna descrizione>'}
                    </span>
                    {step.branchChoice && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-300 bg-amber-500/10 shrink-0">
                        🔀 {step.branchChoice.choices.length} opzioni
                      </Badge>
                    )}
                    {step.nextStepId && (
                      <span className="text-[10px] text-white/20 font-mono shrink-0">→ {step.nextStepId}</span>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => moveStepUp(idx)} className="text-white/15 hover:text-white/40 transition-colors p-0.5" disabled={idx === 0}>
                        ▲
                      </button>
                      <button type="button" onClick={() => moveStepDown(idx)} className="text-white/15 hover:text-white/40 transition-colors p-0.5" disabled={idx >= steps.length - 1}>
                        ▼
                      </button>
                      <button type="button" onClick={() => removeStep(idx)} className="text-white/15 hover:text-red-400 transition-colors p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Step body */}
                  <div className="px-2.5 py-2 space-y-2">
                    {/* ID */}
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Step ID</label>
                      <input
                        type="text"
                        value={step.id}
                        onChange={e => updateStep(idx, 'id', e.target.value)}
                        placeholder="es: chain_step_1"
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
                      />
                    </div>

                    {/* Type + Target */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Tipo</label>
                        <select
                          value={step.type}
                          onChange={e => updateStep(idx, 'type', e.target.value)}
                          className="w-full text-[12px] bg-black text-white/70 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/30 cursor-pointer"
                        >
                          <option value="fetch">📦 Fetch</option>
                          <option value="kill">⚔️ Kill</option>
                          <option value="explore">🔍 Explore</option>
                          <option value="talk">💬 Talk</option>
                          <option value="choose">🔀 Choose</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Target ID</label>
                        <input
                          type="text"
                          value={step.targetId}
                          onChange={e => updateStep(idx, 'targetId', e.target.value)}
                          placeholder="itemId, npcId, locationId..."
                          className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Target Count</label>
                        <input
                          type="number"
                          value={step.targetCount}
                          onChange={e => updateStep(idx, 'targetCount', Number(e.target.value))}
                          min={0}
                          className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Descrizione</label>
                      <textarea
                        value={step.description}
                        onChange={e => updateStep(idx, 'description', e.target.value)}
                        placeholder="Descrizione dello step..."
                        rows={2}
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white/60 placeholder-white/10 resize-y focus:outline-none focus:border-emerald-500/30"
                      />
                    </div>

                    {/* Next Step ID */}
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Prossimo Step ID</label>
                      <input
                        type="text"
                        value={step.nextStepId}
                        onChange={e => updateStep(idx, 'nextStepId', e.target.value)}
                        placeholder="chain_step_2"
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
                      />
                    </div>

                    {/* Reward */}
                    <div className="pt-1.5 border-t border-white/[0.04]">
                      <span className="text-[10px] text-white/25 uppercase tracking-wider">Reward</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <label className="text-[10px] text-white/30 mb-0.5 block">EXP</label>
                          <input
                            type="number"
                            value={step.rewardExp ?? 0}
                            onChange={e => updateStep(idx, 'rewardExp', Number(e.target.value))}
                            min={0}
                            className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30 mb-0.5 block">Items (JSON)</label>
                          <input
                            type="text"
                            value={Array.isArray(step.rewardItems) ? JSON.stringify(step.rewardItems) : (step.rewardItems ?? '[]')}
                            onChange={e => {
                              try { updateStep(idx, 'rewardItems', JSON.parse(e.target.value)); } catch { /* ignore */ }
                            }}
                            placeholder='[{"itemId":"herb","quantity":1}]'
                            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Branch Choice toggle */}
                    <div className="pt-1.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/25 uppercase tracking-wider">Branching</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!step.branchChoice}
                            onChange={() => toggleBranchChoice(idx)}
                            className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-amber-500"
                          />
                          <span className="text-[10px] text-white/30">Scelta multipla</span>
                        </label>
                      </div>

                      {step.branchChoice && (
                        <div className="mt-2 space-y-2 rounded-md border border-amber-500/15 bg-amber-500/[0.02] p-2">
                          <div>
                            <label className="text-[10px] text-white/30 mb-0.5 block">Prompt</label>
                            <input
                              type="text"
                              value={step.branchChoice.prompt}
                              onChange={e => updateBranchPrompt(idx, e.target.value)}
                              placeholder="Cosa vuoi fare?"
                              className="w-full text-[12px] bg-black border border-white/[0.06] rounded px-2 py-1 text-amber-200/60 placeholder-white/10 focus:outline-none focus:border-amber-500/40"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/20">Opzioni</span>
                              <button type="button" onClick={() => addBranchChoice(idx)} className="text-[10px] text-amber-400/50 hover:text-amber-400 transition-colors">
                                + opzione
                              </button>
                            </div>
                            {step.branchChoice.choices.map((choice, ci) => (
                              <div key={ci} className="rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-amber-300/50 font-mono">Opzione {ci + 1}</span>
                                  <button type="button" onClick={() => removeBranchChoice(idx, ci)} className="text-white/10 hover:text-red-400 transition-colors">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={choice.text}
                                  onChange={e => updateBranchChoice(idx, ci, 'text', e.target.value)}
                                  placeholder="Testo scelta..."
                                  className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                                />
                                <textarea
                                  value={choice.description}
                                  onChange={e => updateBranchChoice(idx, ci, 'description', e.target.value)}
                                  placeholder="Descrizione..."
                                  rows={1}
                                  className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 placeholder-white/10 resize-y italic focus:outline-none focus:border-amber-500/30"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={choice.nextStepId}
                                    onChange={e => updateBranchChoice(idx, ci, 'nextStepId', e.target.value)}
                                    placeholder="nextStepId"
                                    className="text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 font-mono placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                                  />
                                  <input
                                    type="text"
                                    value={choice.flag}
                                    onChange={e => updateBranchChoice(idx, ci, 'flag', e.target.value)}
                                    placeholder="flag (es: destroyed_samples)"
                                    className="text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 font-mono placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QuestChainFinalRewardEditor
// ═══════════════════════════════════════════════════════════════
export function QuestChainFinalRewardEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: ChainFinalReward) => void;
}) {
  const [reward, setReward] = useState<ChainFinalReward>(() => parseFinalReward(value));
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(parseFinalReward(value), null, 2));
  const [jsonError, setJsonError] = useState('');

  const update = (patch: Partial<ChainFinalReward>) => {
    const updated = { ...reward, ...patch };
    setReward(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    onChange(updated);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError('');
      setReward(parsed);
      onChange(parsed);
    } catch (e) {
      setJsonError(String(e));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-amber-300/80 uppercase tracking-wider">Ricompensa Finale</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={jsonMode}
            onChange={e => { setJsonMode(e.target.checked); if (e.target.checked) setJsonText(JSON.stringify(reward, null, 2)); }}
            className="w-3 h-3 rounded bg-white/[0.04] border-white/[0.2] accent-amber-500"
          />
          <span className="text-[10px] text-white/30">JSON</span>
        </label>
      </div>

      {jsonMode ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
            rows={8}
            className="w-full text-[11px] bg-black border border-white/[0.08] rounded px-2.5 py-2 text-amber-300/80 font-mono placeholder-white/10 resize-y focus:outline-none focus:border-amber-500/40"
            placeholder="{}"
          />
          {jsonError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {jsonError}
            </p>
          )}
          <button type="button" onClick={applyJson} className="text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors">
            Applica JSON
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/30 mb-0.5 block">EXP</label>
              <input
                type="number"
                value={reward.exp}
                onChange={e => update({ exp: Number(e.target.value) })}
                min={0}
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-amber-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-0.5 block">Items (JSON)</label>
              <input
                type="text"
                value={Array.isArray(reward.items) ? JSON.stringify(reward.items) : (reward.items ?? '[]')}
                onChange={e => {
                  try { update({ items: JSON.parse(e.target.value) }); } catch { /* ignore */ }
                }}
                placeholder='[{"itemId":"herb","quantity":1}]'
                className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 font-mono placeholder-white/10 focus:outline-none focus:border-amber-500/30"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/30 mb-0.5 block">Dialoghi (JSON array)</label>
            <textarea
              value={Array.isArray(reward.dialogue) ? reward.dialogue.map(d => `"${d}"`).join('\n') : ''}
              onChange={e => {
                const lines = e.target.value.split('\n').map(l => l.trim().replace(/^"|"$/g, '')).filter(Boolean);
                update({ dialogue: lines });
              }}
              rows={3}
              placeholder={`"Riga 1"\n"Riga 2"`}
              className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white/60 placeholder-white/10 resize-y focus:outline-none focus:border-amber-500/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JsonEditor — generic JSON textarea for any json-type field
// ═══════════════════════════════════════════════════════════════
export function JsonEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(() => {
    if (typeof value === 'string') return value;
    return value ? JSON.stringify(value, null, 2) : '';
  });
  const [error, setError] = useState('');

  const apply = () => {
    if (!text.trim()) { onChange(''); setError(''); return; }
    try {
      JSON.parse(text);
      setError('');
      onChange(text);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-1.5">
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        rows={4}
        className="w-full text-[11px] bg-black border border-white/[0.08] rounded px-2.5 py-2 text-emerald-300/80 font-mono placeholder-white/10 resize-y focus:outline-none focus:border-emerald-500/40"
        placeholder="{}"
        onBlur={apply}
      />
      {error && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
