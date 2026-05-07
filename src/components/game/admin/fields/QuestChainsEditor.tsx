'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, X, AlertTriangle, Info, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MiniEntitySearch } from './EntitySearchInput';
import { AdminTooltip } from './AdminTooltip';

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
// Field visibility per step type (based on game engine logic)
// ═══════════════════════════════════════════════════════════════
// fetch: targetId=item, targetCount=qty needed, nextStepId=where to go
// kill:  targetId=enemy, targetCount=kill count needed, nextStepId=where to go
// explore: targetId=location, targetCount=IGNORED by engine, nextStepId=where to go
// talk:  targetId=npc, targetCount=IGNORED by engine, nextStepId=where to go
// choose: targetId=NOT USED, targetCount=NOT USED, branchChoice instead

const STEP_TYPE_CONFIG: Record<string, {
  needsTargetId: boolean;
  needsTargetCount: boolean;
  targetEndpoint: string;
  targetLabel: string;
  targetPlaceholder: string;
  targetTooltip: string;
}> = {
  fetch: {
    needsTargetId: true,
    needsTargetCount: true,
    targetEndpoint: '/api/admin/items',
    targetLabel: 'Item Target',
    targetPlaceholder: "Cerca l'oggetto da raccogliere...",
    targetTooltip: 'ID dell\'oggetto che il giocatore deve raccogliere (es: ammo_pistol, herb_green). Viene cercato nell\'inventario del party.',
  },
  kill: {
    needsTargetId: true,
    needsTargetCount: true,
    targetEndpoint: '/api/admin/enemies',
    targetLabel: 'Nemico Target',
    targetPlaceholder: 'Cerca il nemico da eliminare...',
    targetTooltip: 'ID del nemico che il giocatore deve sconfiggere (es: zombie, licker). Il conteggio viene preso dal bestiario.',
  },
  explore: {
    needsTargetId: true,
    needsTargetCount: false,
    targetEndpoint: '/api/admin/locations',
    targetLabel: 'Luogo Target',
    targetPlaceholder: 'Cerca la location da esplorare...',
    targetTooltip: 'ID della location da esplorare (es: rpd_station, hospital_district). Il motore controlla solo se è stata visitata.',
  },
  talk: {
    needsTargetId: true,
    needsTargetCount: false,
    targetEndpoint: '/api/admin/npcs',
    targetLabel: 'NPC Target',
    targetPlaceholder: 'Cerca l\'NPC da contattare...',
    targetTooltip: "ID dell'NPC con cui il giocatore deve parlare (es: npc_chen, npc_gravedigger). Il motore controlla solo se è stato incontrato.",
  },
  choose: {
    needsTargetId: false,
    needsTargetCount: false,
    targetEndpoint: '',
    targetLabel: '',
    targetPlaceholder: '',
    targetTooltip: '',
  },
};

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
// FieldLabel — label with optional tooltip
// ═══════════════════════════════════════════════════════════════
function FieldLabel({ label, tooltip, required, className }: {
  label: string;
  tooltip?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`text-[10px] mb-0.5 block font-medium text-white/35 ${className ?? ''}`}>
      {label}
      {required && <span className="text-red-400/70 ml-0.5">*</span>}
      {tooltip && <AdminTooltip text={tooltip.replace(/\\n/g, ' ')} showIcon={false} className="ml-1" />}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════
// StepRewardsEditor — visual rewards editor for a single step
// ═══════════════════════════════════════════════════════════════
function StepRewardsEditor({
  rewardItems,
  rewardExp,
  rewardDialogue,
  onChange,
}: {
  rewardItems: { itemId: string; quantity: number }[];
  rewardExp: number;
  rewardDialogue: string[];
  onChange: (patch: { rewardItems?: { itemId: string; quantity: number }[]; rewardExp?: number; rewardDialogue?: string[] }) => void;
}) {
  const updateItem = (idx: number, field: string, val: string | number) => {
    const newItems = rewardItems.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange({ rewardItems: newItems });
  };

  const addItem = () => onChange({ rewardItems: [...rewardItems, { itemId: '', quantity: 1 }] });
  const removeItem = (idx: number) => onChange({ rewardItems: rewardItems.filter((_, i) => i !== idx) });

  const addDialogueLine = () => onChange({ rewardDialogue: [...rewardDialogue, ''] });
  const removeDialogueLine = (idx: number) => onChange({ rewardDialogue: rewardDialogue.filter((_, i) => i !== idx) });
  const updateDialogueLine = (idx: number, val: string) => {
    const newDialogue = rewardDialogue.map((d, i) => i === idx ? val : d);
    onChange({ rewardDialogue: newDialogue });
  };

  return (
    <div className="space-y-3">
      {/* EXP */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel
            label="EXP Ricompensa"
            tooltip="Punti esperienza dati al party quando questo step viene completato. Distribuiti a tutti i membri vivi."
          />
          <input
            type="number"
            value={rewardExp ?? 0}
            onChange={e => onChange({ rewardExp: Number(e.target.value) })}
            min={0}
            className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <FieldLabel
          label={`Oggetti Ricompensa (${rewardItems.length})`}
          tooltip="Oggetti dati al party quando lo step viene completato. Il primo personaggio con spazio li riceve."
        />
        <div className="max-h-32 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.06]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-black/95">
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-1.5 py-1 text-white/30 font-medium w-5">#</th>
                <th className="text-left px-1.5 py-1 text-white/30 font-medium">Oggetto</th>
                <th className="text-left px-1.5 py-1 text-white/30 font-medium w-16">Qtà</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {rewardItems.map((item, i) => (
                <tr key={i} className="border-b border-white/[0.02] bg-black hover:bg-neutral-900/50">
                  <td className="px-1.5 py-0.5 text-white/15 font-mono">{i + 1}</td>
                  <td className="px-1 py-0.5">
                    <MiniEntitySearch
                      value={item.itemId}
                      onChange={v => updateItem(i, 'itemId', v)}
                      endpoint="/api/admin/items"
                      labelKey="name"
                      iconKey="icon"
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      min={1}
                      className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/70 font-mono focus:outline-none focus:border-emerald-500/40"
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rewardItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-center text-white/10 italic text-[10px]">
                    Nessun oggetto
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-[10px] text-emerald-400/50 hover:text-emerald-400 transition-colors mt-1"
        >
          <Plus className="w-2.5 h-2.5" /> Oggetto
        </button>
      </div>

      {/* Dialogue */}
      <div>
        <FieldLabel
          label={`Dialoghi Ricompensa (${rewardDialogue.length})`}
          tooltip="Messaggi mostrati nel log di gioco quando lo step viene completato. Ogni riga è una riga di dialogo separata."
        />
        <div className="space-y-1 max-h-24 overflow-y-auto admin-scrollbar">
          {rewardDialogue.map((line, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                value={line}
                onChange={e => updateDialogueLine(i, e.target.value)}
                placeholder={`Dialogo ${i + 1}...`}
                className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-0.5 text-white/50 placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
              />
              <button type="button" onClick={() => removeDialogueLine(i)} className="text-white/15 hover:text-red-400 transition-colors shrink-0">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {rewardDialogue.length === 0 && (
            <p className="text-[10px] text-white/10 italic text-center py-1">Nessun dialogo</p>
          )}
        </div>
        <button
          type="button"
          onClick={addDialogueLine}
          className="flex items-center gap-1 text-[10px] text-emerald-400/50 hover:text-emerald-400 transition-colors mt-1"
        >
          <Plus className="w-2.5 h-2.5" /> Dialogo
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// StepIdSelector — dropdown for nextStepId
// ═══════════════════════════════════════════════════════════════
function StepIdSelector({
  steps,
  currentValue,
  onChange,
  label,
  tooltip,
  excludeStepIdx,
  placeholder,
  className,
}: {
  steps: ChainStep[];
  currentValue: string;
  onChange: (val: string) => void;
  label: string;
  tooltip: string;
  excludeStepIdx?: number;
  placeholder?: string;
  className?: string;
}) {
  const availableSteps = steps.filter((_, i) => i !== excludeStepIdx);

  return (
    <div className={className}>
      <FieldLabel label={label} tooltip={tooltip} />
      <select
        value={currentValue}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[12px] bg-black text-white/70 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/30 cursor-pointer font-mono"
      >
        <option value="" className="bg-black text-white">— Fine catena (ricompensa finale) —</option>
        {availableSteps.map((s) => (
          <option key={s.id} value={s.id} className="bg-black text-white">
            {s.id} {s.description ? `— ${s.description.slice(0, 40)}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
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
            <div className="space-y-2 max-h-[600px] overflow-y-auto admin-scrollbar">
              {steps.length === 0 && (
                <p className="text-[12px] text-white/15 italic text-center py-3">Nessuno step — aggiungine almeno uno</p>
              )}
              {steps.map((step, idx) => {
                const config = STEP_TYPE_CONFIG[step.type] ?? STEP_TYPE_CONFIG.fetch;

                return (
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
                        <FieldLabel
                          label="Step ID"
                          tooltip="Identificativo univoco dello step. Usato come riferimento per nextStepId negli altri step e nelle scelte branching."
                        />
                        <input
                          type="text"
                          value={step.id}
                          onChange={e => updateStep(idx, 'id', e.target.value)}
                          placeholder="es: chain_step_1"
                          className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>

                      {/* Type + Target */}
                      <div className={`grid gap-2 ${config.needsTargetId ? 'grid-cols-2' : ''}`}>
                        <div>
                          <FieldLabel
                            label="Tipo Step"
                            tooltip="Determina la condizione di completamento e il tipo di target richiesto.\n• fetch: raccogliere oggetti (targetId = item, targetCount = qty)\n• kill: eliminare nemici (targetId = enemy, targetCount = qty)\n• explore: visitare location (targetId = location)\n• talk: parlare con NPC (targetId = npc)\n• choose: scelta multipla con branching"
                          />
                          <select
                            value={step.type}
                            onChange={e => updateStep(idx, 'type', e.target.value)}
                            className="w-full text-[12px] bg-black text-white/70 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/30 cursor-pointer"
                          >
                            <option value="fetch" className="bg-black text-white">📦 Fetch (Raccogli)</option>
                            <option value="kill" className="bg-black text-white">⚔️ Kill (Elimina)</option>
                            <option value="explore" className="bg-black text-white">🔍 Explore (Esplora)</option>
                            <option value="talk" className="bg-black text-white">💬 Talk (Parla)</option>
                            <option value="choose" className="bg-black text-white">🔀 Choose (Scegli)</option>
                          </select>
                        </div>

                        {/* Target ID — entity search, hidden for 'choose' */}
                        {config.needsTargetId && (
                          <div>
                            <FieldLabel
                              label={config.targetLabel}
                              tooltip={config.targetTooltip}
                            />
                            <MiniEntitySearch
                              value={step.targetId}
                              onChange={v => updateStep(idx, 'targetId', v)}
                              endpoint={config.targetEndpoint}
                              labelKey={step.type === 'kill' ? 'name' : step.type === 'fetch' ? 'name' : 'name'}
                              iconKey={step.type === 'kill' ? 'icon' : step.type === 'fetch' ? 'icon' : undefined}
                            />
                          </div>
                        )}
                      </div>

                      {/* Target Count — only for fetch and kill */}
                      {config.needsTargetCount && (
                        <div>
                          <FieldLabel
                            label="Target Count"
                            tooltip={`Numero di ${step.type === 'fetch' ? 'oggetti da raccogliere' : 'nemici da eliminare'} per completare lo step. Il motore conta quelli totali nel party/bestiario.`}
                          />
                          <input
                            type="number"
                            value={step.targetCount}
                            onChange={e => updateStep(idx, 'targetCount', Number(e.target.value))}
                            min={1}
                            className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
                          />
                        </div>
                      )}

                      {/* Info banners for type-specific behavior */}
                      {step.type === 'explore' && (
                        <div className="flex items-start gap-1.5 rounded border border-emerald-500/15 bg-emerald-500/[0.03] px-2 py-1.5">
                          <Info className="w-3 h-3 text-emerald-400/50 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-emerald-300/40 leading-relaxed">
                            Explore non usa Target Count — verifica solo che la location sia stata visitata.
                          </span>
                        </div>
                      )}
                      {step.type === 'talk' && (
                        <div className="flex items-start gap-1.5 rounded border border-purple-500/15 bg-purple-500/[0.03] px-2 py-1.5">
                          <Info className="w-3 h-3 text-purple-400/50 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-purple-300/40 leading-relaxed">
                            Talk non usa Target Count — verifica solo che l&apos;NPC sia stato incontrato.
                          </span>
                        </div>
                      )}
                      {step.type === 'choose' && (
                        <div className="flex items-start gap-1.5 rounded border border-amber-500/15 bg-amber-500/[0.03] px-2 py-1.5">
                          <Info className="w-3 h-3 text-amber-400/50 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-amber-300/40 leading-relaxed">
                            Choose non usa Target ID / Count — usa la sezione Branching sottostante per definire le opzioni di scelta.
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      <div>
                        <FieldLabel
                          label="Descrizione"
                          tooltip="Testo descrittivo mostrato al giocatore per questo step. Appare nel log quando lo step diventa attivo."
                        />
                        <textarea
                          value={step.description}
                          onChange={e => updateStep(idx, 'description', e.target.value)}
                          placeholder="Descrizione dello step mostrata al giocatore..."
                          rows={2}
                          className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white/60 placeholder-white/10 resize-y focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>

                      {/* Next Step ID — dropdown */}
                      <StepIdSelector
                        steps={steps}
                        currentValue={step.nextStepId}
                        onChange={v => updateStep(idx, 'nextStepId', v)}
                        label="Prossimo Step"
                        tooltip="Step a cui andare dopo il completamento. Lascia vuoto per terminare la catena e assegnare la Ricompensa Finale. Per le scelte branching, questo è usato come fallback."
                        excludeStepIdx={undefined}
                      />

                      {/* Reward section */}
                      <div className="pt-1.5 border-t border-white/[0.04]">
                        <span className="text-[10px] text-white/25 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Ricompensa Step
                        </span>
                        <div className="mt-1.5">
                          <StepRewardsEditor
                            rewardItems={step.rewardItems ?? []}
                            rewardExp={step.rewardExp ?? 0}
                            rewardDialogue={step.rewardDialogue ?? []}
                            onChange={patch => {
                              const newSteps = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
                              updateSteps(newSteps);
                            }}
                          />
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
                            <AdminTooltip text="Attiva le scelte multiple per questo step. Il giocatore potrà scegliere tra diverse opzioni, ognuna con un proprio nextStepId e flag. Compatibile solo con tipo 'choose'." showIcon={false} />
                          </label>
                        </div>

                        {step.branchChoice && (
                          <div className="mt-2 space-y-2 rounded-md border border-amber-500/15 bg-amber-500/[0.02] p-2">
                            <div>
                              <FieldLabel
                                label="Prompt Scelta"
                                tooltip="Testo della domanda mostrata al giocatore quando deve effettuare la scelta multipla."
                              />
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
                                <FieldLabel
                                  label="Opzioni"
                                  tooltip="Ogni opzione che il giocatore può scegliere. Ogni opzione porta a un differente step tramite il nextStepId e può impostare un flag di stato."
                                  className="!mb-0"
                                />
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
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <FieldLabel
                                        label="Testo Scelta"
                                        tooltip="Testo breve del bottone/opzione mostrato al giocatore."
                                      />
                                      <input
                                        type="text"
                                        value={choice.text}
                                        onChange={e => updateBranchChoice(idx, ci, 'text', e.target.value)}
                                        placeholder="Testo scelta..."
                                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                                      />
                                    </div>
                                    <div>
                                      <FieldLabel
                                        label="Flag"
                                        tooltip="Flag di stato impostato nel game state quando viene scelta questa opzione. Usato per innescare eventi condizionali (es: destroyed_samples, spared_reyes)."
                                      />
                                      <input
                                        type="text"
                                        value={choice.flag}
                                        onChange={e => updateBranchChoice(idx, ci, 'flag', e.target.value)}
                                        placeholder="es: destroyed_samples"
                                        className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 font-mono placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <FieldLabel
                                      label="Descrizione"
                                      tooltip="Descrizione più lunga dell'opzione, mostrata sotto il testo della scelta. Spiega le conseguenze della scelta."
                                    />
                                    <textarea
                                      value={choice.description}
                                      onChange={e => updateBranchChoice(idx, ci, 'description', e.target.value)}
                                      placeholder="Descrizione dell'opzione..."
                                      rows={1}
                                      className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/50 placeholder-white/10 resize-y italic focus:outline-none focus:border-amber-500/30"
                                    />
                                  </div>
                                  <StepIdSelector
                                    steps={steps}
                                    currentValue={choice.nextStepId}
                                    onChange={v => updateBranchChoice(idx, ci, 'nextStepId', v)}
                                    label="Prossimo Step (Branch)"
                                    tooltip="Step a cui andare se il giocatore sceglie questa opzione. Lascia vuoto per terminare la catena."
                                    className="!mt-0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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

  // Item management helpers
  const addItem = () => update({ items: [...reward.items, { itemId: '', quantity: 1 }] });
  const removeItem = (idx: number) => update({ items: reward.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, val: string | number) => {
    update({ items: reward.items.map((r, i) => i === idx ? { ...r, [field]: val } : r) });
  };

  // Dialogue management helpers
  const addDialogueLine = () => update({ dialogue: [...reward.dialogue, ''] });
  const removeDialogueLine = (idx: number) => update({ dialogue: reward.dialogue.filter((_, i) => i !== idx) });
  const updateDialogueLine = (idx: number, val: string) => {
    update({ dialogue: reward.dialogue.map((d, i) => i === idx ? val : d) });
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-amber-300/80 uppercase tracking-wider">Ricompensa Finale</span>
          <AdminTooltip text="Ricompensa assegnata quando la catena viene completata (tutti gli step finiti o nextStepId vuoto)." showIcon={false} />
        </div>
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
        <div className="space-y-3">
          {/* EXP */}
          <div>
            <FieldLabel
              label="EXP Finale"
              tooltip="Punti esperienza distribuiti a tutti i membri del party vivi quando la catena viene completata."
            />
            <input
              type="number"
              value={reward.exp}
              onChange={e => update({ exp: Number(e.target.value) })}
              min={0}
              className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 font-mono focus:outline-none focus:border-amber-500/30"
            />
          </div>

          {/* Items — visual table with MiniEntitySearch */}
          <div>
            <FieldLabel
              label={`Oggetti Finali (${reward.items.length})`}
              tooltip="Oggetti dati al party quando tutta la catena è completata. Il primo personaggio con spazio li riceve."
            />
            <div className="max-h-40 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.06]">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-black/95">
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-1.5 py-1 text-white/30 font-medium w-5">#</th>
                    <th className="text-left px-1.5 py-1 text-white/30 font-medium">Oggetto</th>
                    <th className="text-left px-1.5 py-1 text-white/30 font-medium w-16">Qtà</th>
                    <th className="w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {reward.items.map((item, i) => (
                    <tr key={i} className="border-b border-white/[0.02] bg-black hover:bg-neutral-900/50">
                      <td className="px-1.5 py-0.5 text-white/15 font-mono">{i + 1}</td>
                      <td className="px-1 py-0.5">
                        <MiniEntitySearch
                          value={item.itemId}
                          onChange={v => updateItem(i, 'itemId', v)}
                          endpoint="/api/admin/items"
                          labelKey="name"
                          iconKey="icon"
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                          min={1}
                          className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/70 font-mono focus:outline-none focus:border-amber-500/40"
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reward.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-center text-white/10 italic text-[10px]">
                        Nessun oggetto
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-[10px] text-amber-400/50 hover:text-amber-400 transition-colors mt-1"
            >
              <Plus className="w-2.5 h-2.5" /> Oggetto
            </button>
          </div>

          {/* Dialogue — visual one-line-per-entry */}
          <div>
            <FieldLabel
              label={`Dialoghi Finali (${reward.dialogue.length})`}
              tooltip="Messaggi mostrati nel log di gioco quando la catena viene completata. Ogni riga è una riga di dialogo separata."
            />
            <div className="space-y-1 max-h-32 overflow-y-auto admin-scrollbar">
              {reward.dialogue.map((line, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={line}
                    onChange={e => updateDialogueLine(i, e.target.value)}
                    placeholder={`Dialogo finale ${i + 1}...`}
                    className="flex-1 min-w-0 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-amber-500/30"
                  />
                  <button type="button" onClick={() => removeDialogueLine(i)} className="text-white/15 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {reward.dialogue.length === 0 && (
                <p className="text-[10px] text-white/10 italic text-center py-1">Nessun dialogo</p>
              )}
            </div>
            <button
              type="button"
              onClick={addDialogueLine}
              className="flex items-center gap-1 text-[10px] text-amber-400/50 hover:text-amber-400 transition-colors mt-1"
            >
              <Plus className="w-2.5 h-2.5" /> Dialogo
            </button>
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
