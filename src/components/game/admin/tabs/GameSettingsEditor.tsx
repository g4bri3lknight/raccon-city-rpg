'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyConfigEditor } from './DifficultyConfigEditor';
import { ItemBoxDefaultsEditor } from '../EntityForm';
import type { GameplaySettingDef } from '../config';
import { GAMEPLAY_SETTINGS_FIELDS } from '../config';

export function GameSettingsEditor() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  // Load settings
  useEffect(() => {
    fetch('/api/admin/game-settings')
      .then(r => r.json())
      .then(rows => {
        const map: Record<string, string> = {};
        for (const row of rows) map[row.key] = row.value;
        setSettings(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear JSON error for this key
    if (jsonErrors[key]) {
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    // Validate JSON fields
    const newErrors: Record<string, string> = {};
    for (const field of GAMEPLAY_SETTINGS_FIELDS) {
      if (field.type === 'json' && settings[field.key]) {
        try {
          JSON.parse(settings[field.key]);
        } catch {
          newErrors[field.key] = 'JSON non valido';
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setJsonErrors(newErrors);
      setSaving(false);
      setSaveMsg({ ok: false, text: '❌ Correggi gli errori nei campi JSON' });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }

    try {
      const res = await fetch('/api/admin/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveMsg({ ok: true, text: '✅ Impostazioni di gioco salvate con successo!' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `❌ Errore: ${err}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  // Group fields
  const groups = GAMEPLAY_SETTINGS_FIELDS.reduce<Record<string, GameplaySettingDef[]>>((acc, f) => {
    if (!acc[f.group]) acc[f.group] = [];
    acc[f.group].push(f);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto admin-scrollbar">
      {/* Banner */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-emerald-400 mb-1">⚙️ Impostazioni di Gioco</h3>
        <p className="text-[13px] text-white/40">Configura i parametri generali del gameplay: inventario, item box e altre impostazioni globali.</p>
      </div>

      {/* Save message */}
      <AnimatePresence>
        {saveMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-[13px] font-medium ${
              saveMsg.ok
                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}>
              {saveMsg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Groups */}
      <div className="p-6 space-y-8">
        {Object.entries(groups).map(([groupId, fields]) => {
          const groupDef = fields[0];
          return (
            <div key={groupId} className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">{groupDef.groupLabel}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(field => {
                  const isFull = field.type === 'item-box-defaults' || field.type === 'json' || field.colSpan === 3;
                  return (
                  <div key={field.key} className={`rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2 ${isFull ? 'md:col-span-2' : ''}`}>
                    <label className="text-[13px] font-semibold text-white/60 block">
                      {field.label}
                    </label>
                    {field.type === 'number' ? (
                      <input
                        type="number"
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        className="w-full bg-black/30 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    ) : field.type === 'range' ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <input
                            type="range"
                            value={settings[field.key] || '1'}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            min={field.min}
                            max={field.max}
                            step={field.step || 1}
                            className="flex-1 accent-emerald-500"
                          />
                          <span className="text-[13px] font-mono text-emerald-400 ml-3 min-w-[2.5rem] text-right">{settings[field.key] || '1'}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-white/20">
                          <span>{field.min}</span>
                          <span>{field.max}</span>
                        </div>
                      </div>
                    ) : field.type === 'toggle' ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleChange(field.key, settings[field.key] === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[field.key] === 'true' ? 'bg-emerald-500' : 'bg-white/10'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[field.key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-[12px] text-white/40">{settings[field.key] === 'true' ? 'Attivo' : 'Disattivo'}</span>
                      </div>
                    ) : field.type === 'item-box-defaults' ? (
                      <ItemBoxDefaultsEditor
                        value={settings[field.key] || '[]'}
                        onChange={(v) => handleChange(field.key, JSON.stringify(v))}
                      />
                    ) : field.type === 'json' ? (
                      <div>
                        <textarea
                          value={settings[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-[13px] font-mono text-white/90 focus:outline-none transition-colors resize-y ${
                            jsonErrors[field.key] ? 'border-red-500/50 focus:border-red-400' : 'border-white/[0.1] focus:border-emerald-500/40'
                          }`}
                        />
                        {jsonErrors[field.key] && (
                          <p className="text-[12px] text-red-400 mt-1">{jsonErrors[field.key]}</p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full bg-black/30 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    )}
                    {field.helpText && (
                      <p className="text-[12px] text-white/30">{field.helpText}</p>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          );
        })}

        {/* Difficulty Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎮</span>
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Configurazione Difficoltà</h4>
          </div>
          <p className="text-[12px] text-white/30 -mt-2">Modifica i parametri di bilanciamento per ogni livello di difficoltà. Le modifiche hanno effetto sulle nuove partite.</p>
          <DifficultyConfigEditor
            settings={settings}
            onChange={handleChange}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-white/[0.06]">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs gap-2 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Salvando...' : 'Salva Impostazioni'}
          </Button>
        </div>
      </div>
    </div>
  );
}
