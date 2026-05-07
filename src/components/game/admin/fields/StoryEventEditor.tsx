'use client';

import { useState } from 'react';
import { Plus, Trash2, Play, Pause, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MiniEntitySearch } from './EntitySearchInput';
import type { StoryEventData } from './types';
import { parseStoryEvent } from './helpers';

// ═══════════════════════════════════════════════════════════════
// Sequence Pattern Editor — visual direction buttons for puzzle sequence
// ═══════════════════════════════════════════════════════════════
function SequencePatternEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const directions = ['up', 'down', 'left', 'right'];
  const dirIcons: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const dirColors: Record<string, string> = { up: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200', down: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', left: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', right: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-500' };
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
            className={`flex items-center gap-1 px-2 py-1 rounded border ${dirColors[dir]} hover:opacity-80 transition-opacity text-[12px]`}
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
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {pattern.map((dir, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${dirColors[dir] ?? 'border-white/10 bg-white/[0.04] text-white/60'} text-[12px] group/seq`}
          >
            <span className="text-[10px] text-white/25 font-mono">{i + 1}</span>
            <span className="text-xs">{dirIcons[dir] ?? '·'}</span>
            <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {pattern.length === 0 && (
          <span className="text-[11px] text-white/15 italic py-0.5">Clicca le frecce per creare la sequenza...</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Story Event Editor
// ═══════════════════════════════════════════════════════════════
export function StoryEventEditor({ value, onChange }: { value: unknown; onChange: (v: StoryEventData | null) => void }) {
  const [event, setEvent] = useState<StoryEventData | null>(() => parseStoryEvent(value));
  const [collapsed, setCollapsed] = useState(false);

  const updateEvent = (patch: Partial<StoryEventData>) => {
    const updated = { ...event!, ...patch } as StoryEventData;
    setEvent(updated);
    onChange(updated);
  };

  const addChoice = () => {
    const newChoice = {
      text: '',
      outcome: { description: '' } as StoryEventData['choices'][0]['outcome'],
    };
    updateEvent({ choices: [...(event?.choices ?? []), newChoice] });
  };

  const removeChoice = (idx: number) => {
    updateEvent({ choices: (event?.choices ?? []).filter((_, i) => i !== idx) });
  };

  const updateChoice = (idx: number, field: string, val: unknown) => {
    const choices = [...(event?.choices ?? [])];
    if (field === 'text') {
      choices[idx] = { ...choices[idx], text: val as string };
    } else if (field.startsWith('outcome.')) {
      const outcomeField = field.replace('outcome.', '');
      choices[idx] = { ...choices[idx], outcome: { ...choices[idx].outcome, [outcomeField]: val } };
    }
    updateEvent({ choices });
  };

  const addRewardItem = (choiceIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    choices[choiceIdx] = {
      ...outcome,
      outcome: { ...outcome.outcome, receiveItems: [...(outcome.outcome.receiveItems ?? []), { itemId: '', quantity: 1 }] },
    };
    updateEvent({ choices });
  };

  const removeRewardItem = (choiceIdx: number, itemIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).filter((_, i) => i !== itemIdx);
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const updateRewardItem = (choiceIdx: number, itemIdx: number, field: 'itemId' | 'quantity', val: string | number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).map((item, i) =>
      i === itemIdx ? { ...item, [field]: val } : item
    );
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const togglePuzzle = () => {
    if (event?.puzzle) {
      const { puzzle, ...rest } = event;
      const updated = rest as StoryEventData;
      setEvent(updated);
      onChange(updated);
    } else {
      const updated = {
        ...event!,
        puzzle: {
          type: 'combination' as const,
          successOutcome: { description: '' },
          failMessage: '',
        },
      };
      setEvent(updated);
      onChange(updated);
    }
  };

  const updatePuzzle = (field: string, val: unknown) => {
    if (!event) return;
    const puzzle = { ...event.puzzle!, [field]: val };
    const updated = { ...event, puzzle };
    setEvent(updated);
    onChange(updated);
  };

  const enableEvent = () => {
    const newEvent: StoryEventData = { title: '', description: '', choices: [] };
    setEvent(newEvent);
    onChange(newEvent);
  };

  const disableEvent = () => {
    setEvent(null);
    onChange(null);
  };

  if (!event) {
    return (
      <div className="space-y-1.5">
        <div className="rounded-md border border-dashed border-white/[0.08] p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[12px] text-white/20 italic mb-2">Nessun evento storia configurato</p>
            <button
              type="button"
              onClick={enableEvent}
              className="flex items-center gap-1 text-[12px] text-emerald-400/70 hover:text-emerald-400 transition-colors mx-auto"
            >
              <Plus className="w-3 h-3" /> Crea Evento Storia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
            {collapsed ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <span className="text-[12px] font-semibold text-emerald-300/80 uppercase tracking-wider">Evento Storia</span>
          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/60 bg-emerald-500/10">
            {(event.choices ?? []).length} scelte
          </Badge>
        </div>
        <button type="button" onClick={disableEvent} className="flex items-center gap-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors">
          <Trash2 className="w-3 h-3" /> Rimuovi
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-[11px] text-white/40 mb-0.5 block">Titolo Evento</label>
              <input
                type="text"
                value={event.title ?? ''}
                onChange={e => updateEvent({ title: e.target.value })}
                placeholder="es: Primo Contatto"
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-0.5 block">Descrizione</label>
              <textarea
                value={event.description ?? ''}
                onChange={e => updateEvent({ description: e.target.value })}
                placeholder="Testo narrativo introduttivo dell'evento..."
                rows={3}
                className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y italic focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Choices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Scelte</span>
              <button type="button" onClick={addChoice} className="flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
                <Plus className="w-3 h-3" /> Aggiungi scelta
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto admin-scrollbar space-y-2">
              {(event.choices ?? []).map((choice, ci) => (
                <div key={ci} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/60 bg-emerald-500/10">
                      Scelta {ci + 1}
                    </Badge>
                    <button type="button" onClick={() => removeChoice(ci)} className="text-white/15 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={choice.text ?? ''}
                    onChange={e => updateChoice(ci, 'text', e.target.value)}
                    placeholder="Testo del pulsante scelta..."
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-emerald-500/40"
                  />

                  {/* Outcome */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-white/[0.06]">
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">Risultato</span>
                    <textarea
                      value={choice.outcome?.description ?? ''}
                      onChange={e => updateChoice(ci, 'outcome.description', e.target.value)}
                      placeholder="Descrizione del risultato..."
                      rows={2}
                      className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-emerald-500/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-white/25">HP ±</label>
                        <input
                          type="number"
                          value={choice.outcome?.hpChange ?? 0}
                          onChange={e => updateChoice(ci, 'outcome.hpChange', Number(e.target.value))}
                          className="w-16 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/60 font-mono focus:outline-none focus:border-emerald-500/30"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!choice.outcome?.triggerCombat}
                          onChange={e => updateChoice(ci, 'outcome.triggerCombat', e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-red-500"
                        />
                        <span className="text-[10px] text-white/30">Combattimento</span>
                      </label>
                      {choice.outcome?.triggerCombat && (
                        <div className="flex-1">
                          <MiniEntitySearch
                            value={(choice.outcome?.combatEnemyIds ?? []).join(', ')}
                            onChange={v => updateChoice(ci, 'outcome.combatEnemyIds', v.split(',').map(s => s.trim()).filter(Boolean))}
                            endpoint="/api/admin/enemies"
                            labelKey="name"
                            iconKey="icon"
                          />
                        </div>
                      )}
                    </div>

                    {/* Reward Items */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/20">Ricompense</span>
                        <button type="button" onClick={() => addRewardItem(ci)} className="text-[10px] text-green-400/50 hover:text-green-400 transition-colors">
                          + oggetto
                        </button>
                      </div>
                      {(choice.outcome?.receiveItems ?? []).map((ri, riIdx) => (
                        <div key={riIdx} className="flex items-center gap-1">
                          <MiniEntitySearch
                            value={ri.itemId}
                            onChange={v => updateRewardItem(ci, riIdx, 'itemId', v)}
                            endpoint="/api/admin/items"
                            labelKey="name"
                            iconKey="icon"
                          />
                          <input
                            type="number"
                            value={ri.quantity}
                            onChange={e => updateRewardItem(ci, riIdx, 'quantity', Number(e.target.value))}
                            min={1}
                            className="w-14 text-[11px] bg-black border border-white/[0.06] rounded px-1 py-0.5 text-white/50 font-mono focus:outline-none focus:border-green-500/30"
                          />
                          <button type="button" onClick={() => removeRewardItem(ci, riIdx)} className="text-white/10 hover:text-red-400 transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {(event.choices ?? []).length === 0 && (
                <p className="text-[12px] text-white/15 italic text-center py-2">Nessuna scelta — aggiungine almeno una</p>
              )}
            </div>
          </div>

          {/* Puzzle section */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Puzzle Collegato</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!event.puzzle}
                  onChange={togglePuzzle}
                  className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
                />
                <span className="text-[11px] text-white/30">Abilita Puzzle</span>
              </label>
            </div>
            {event.puzzle && (
              <div className="mt-2 space-y-2 rounded-md border border-emerald-500/15 bg-emerald-500/[0.02] p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 mb-0.5 block">Tipo Puzzle</label>
                    <select
                      value={event.puzzle.type ?? 'combination'}
                      onChange={e => updatePuzzle('type', e.target.value)}
                      className="w-full text-[12px] bg-black text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                    >
                      <option value="combination" className="bg-black text-white">Combinazione (codice)</option>
                      <option value="sequence" className="bg-black text-white">Sequenza (frecce)</option>
                      <option value="key_required" className="bg-black text-white">Chiave richiesta</option>
                    </select>
                  </div>
                  {(event.puzzle.type === 'combination' || event.puzzle.type === 'sequence') && event.puzzle.type === 'combination' && (
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Codice Segreto</label>
                      <input
                        type="text"
                        value={event.puzzle.combinationCode ?? ''}
                        onChange={e => updatePuzzle('combinationCode', e.target.value)}
                        placeholder="1974"
                        className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-emerald-500/40"
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'sequence' && (
                    <div>
                      <label className="text-[10px] text-white/30 mb-0.5 block">Pattern Sequenza</label>
                      <SequencePatternEditor
                        value={event.puzzle.sequencePattern ?? []}
                        onChange={v => updatePuzzle('sequencePattern', v)}
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'key_required' && (
                    <>
                      <div className="col-span-2">
                        <label className="text-[10px] text-white/30 mb-0.5 block">Item Richiesto</label>
                        <MiniEntitySearch
                          value={event.puzzle.requiredItemId ?? ''}
                          onChange={v => updatePuzzle('requiredItemId', v)}
                          endpoint="/api/admin/items"
                          labelKey="name"
                          iconKey="icon"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Messaggio Fallimento</label>
                  <input
                    type="text"
                    value={event.puzzle.failMessage ?? ''}
                    onChange={e => updatePuzzle('failMessage', e.target.value)}
                    placeholder="Codice errato! La serratura non si muove."
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Descrizione Successo</label>
                  <textarea
                    value={event.puzzle?.successOutcome?.description ?? ''}
                    onChange={e => updatePuzzle('successOutcome', { ...(event.puzzle?.successOutcome ?? {}), description: e.target.value })}
                    placeholder="La serratura si apre con un click..."
                    rows={2}
                    className="w-full text-[12px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-emerald-500/30"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
