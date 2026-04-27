'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Loader2, Volume2, Database, Link2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyConfigEditor } from './DifficultyConfigEditor';
import { adminFetch } from '@/lib/admin-fetch';
import { ItemBoxDefaultsEditor } from '../EntityForm';
import type { GameplaySettingDef } from '../config';
import { GAMEPLAY_SETTINGS_FIELDS } from '../config';
import { MediaUploadBox } from '../MediaUploadBox';
import type { MediaUploadDef } from '../shared';

export function GameSettingsEditor() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const [migrationLoading, setMigrationLoading] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<{ ok: boolean; text: string } | null>(null);

  // BGM upload definitions for combat ambient
  const bgmUploads: MediaUploadDef[] = [
    {
      key: 'bgm_combat',
      label: '🎵 BGM Combattimento',
      mediaType: 'sound',
      category: 'bgm',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'bgm_combat',
      nameTemplate: 'BGM Combattimento',
      helpText: 'Musica di sottofondo riprodotta durante il combattimento. Usa un file audio ripetibile (loop).',
    },
    {
      key: 'bgm_gameover',
      label: '💀 BGM Game Over',
      mediaType: 'sound',
      category: 'bgm',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'bgm_gameover',
      nameTemplate: 'BGM Game Over',
      helpText: 'Musica riprodotta nella schermata di sconfitta.',
    },
    {
      key: 'bgm_victory',
      label: '🏆 BGM Vittoria',
      mediaType: 'sound',
      category: 'bgm',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'bgm_victory',
      nameTemplate: 'BGM Vittoria',
      helpText: 'Musica riprodotta nella schermata di vittoria.',
    },
  ];

  // Load settings
  useEffect(() => {
    adminFetch('/api/admin/game-settings')
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
      const res = await adminFetch('/api/admin/game-settings', {
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Banner — sticky header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06]">
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
            className="overflow-hidden shrink-0"
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto admin-scrollbar">
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

        {/* ── Database Maintenance Section ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-white/30" />
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Manutenzione Database</h4>
            <span className="text-[11px] text-white/15">— strumenti per aggiornare lo schema e i dati</span>
          </div>

          {migrationResult && (
            <div className={`rounded-lg px-4 py-3 text-[13px] font-medium ${
              migrationResult.ok
                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}>
              {migrationResult.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Migrate Schema (active game) */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div>
                <label className="text-[13px] font-semibold text-white/60 block">Aggiorna Schema (gioco attivo)</label>
                <p className="text-[12px] text-white/30 mt-1">Applica le modifiche allo schema Prisma solo al gioco attualmente selezionato.</p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  if (!confirm('Vuoi aggiornare lo schema del database del gioco attivo?')) return;
                  setMigrationLoading('schema');
                  setMigrationResult(null);
                  try {
                    const res = await adminFetch('/api/admin/migrate-schema', { method: 'POST' });
                    const data = await res.json();
                    setMigrationResult({
                      ok: data.success,
                      text: data.success
                        ? `✅ ${data.message}\n${data.output || ''}`
                        : `❌ ${data.error}\n${data.details || ''}`,
                    });
                  } catch (err) {
                    setMigrationResult({ ok: false, text: `❌ Errore: ${err}` });
                  } finally {
                    setMigrationLoading(null);
                  }
                }}
                disabled={migrationLoading !== null}
                className="text-xs gap-2 bg-amber-600/15 border border-amber-500/25 text-amber-300 hover:bg-amber-600/25 hover:text-amber-200 w-full"
              >
                {migrationLoading === 'schema' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {migrationLoading === 'schema' ? 'Aggiornando...' : 'Aggiorna Schema'}
              </Button>
            </div>

            {/* Migrate All Schema */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div>
                <label className="text-[13px] font-semibold text-white/60 block">Aggiorna Schema (tutti i giochi)</label>
                <p className="text-[12px] text-white/30 mt-1">Propaga lo schema Prisma a tutti i database dei giochi esistenti. Utile dopo aver aggiunto tabelle o colonne.</p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  if (!confirm('Vuoi aggiornare lo schema di TUTTI i giochi?\n\nQuesto eseguirà prisma db push su ogni database.')) return;
                  setMigrationLoading('all-schema');
                  setMigrationResult(null);
                  try {
                    const res = await adminFetch('/api/admin/migrate-all-schema', { method: 'POST' });
                    const data = await res.json();
                    const migratedList = (data.migrated || []).map((m: { gameId: string; output: string }) =>
                      `  ✓ ${m.gameId}: ${m.output}`
                    ).join('\n');
                    const failedList = (data.failed || []).map((m: { gameId: string; error?: string }) =>
                      `  ✗ ${m.gameId}: ${m.error || 'errore'}`
                    ).join('\n');
                    setMigrationResult({
                      ok: data.success,
                      text: `${data.message}\n${migratedList ? '\n' + migratedList : ''}${failedList ? '\n\nErrori:\n' + failedList : ''}`,
                    });
                  } catch (err) {
                    setMigrationResult({ ok: false, text: `❌ Errore: ${err}` });
                  } finally {
                    setMigrationLoading(null);
                  }
                }}
                disabled={migrationLoading !== null}
                className="text-xs gap-2 bg-red-600/15 border border-red-500/25 text-red-300 hover:bg-red-600/25 hover:text-red-200 w-full"
              >
                {migrationLoading === 'all-schema' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                {migrationLoading === 'all-schema' ? 'Aggiornando tutti...' : 'Aggiorna Tutti'}
              </Button>
            </div>

            {/* Link Archetypes */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div>
                <label className="text-[13px] font-semibold text-white/60 block">Collega Personaggi → Archetipi</label>
                <p className="text-[12px] text-white/30 mt-1">Collega personaggi agli archetipi (match per ID/nome). Usa Anteprima prima.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setMigrationLoading('link-preview');
                    setMigrationResult(null);
                    try {
                      const res = await adminFetch('/api/admin/link-archetypes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dryRun: true }),
                      });
                      const data = await res.json();
                      const ops = (data.operations || []).map((op: { characterName: string; archetypeName: string; method: string }) =>
                        `  ${op.characterName} → ${op.archetypeName} (${op.method})`
                      ).join('\n');
                      setMigrationResult({
                        ok: true,
                        text: data.message + (ops ? '\n\n' + ops : ''),
                      });
                    } catch (err) {
                      setMigrationResult({ ok: false, text: `❌ Errore: ${err}` });
                    } finally {
                      setMigrationLoading(null);
                    }
                  }}
                  disabled={migrationLoading !== null}
                  className="text-xs gap-1.5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                >
                  {migrationLoading === 'link-preview' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Anteprima
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Vuoi collegare i personaggi agli archetipi?')) return;
                    setMigrationLoading('link-apply');
                    setMigrationResult(null);
                    try {
                      const res = await adminFetch('/api/admin/link-archetypes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      });
                      const data = await res.json();
                      setMigrationResult({
                        ok: data.success,
                        text: data.message,
                      });
                    } catch (err) {
                      setMigrationResult({ ok: false, text: `❌ Errore: ${err}` });
                    } finally {
                      setMigrationLoading(null);
                    }
                  }}
                  disabled={migrationLoading !== null}
                  className="text-xs gap-2 bg-amber-600/15 border border-amber-500/25 text-amber-300 hover:bg-amber-600/25 hover:text-amber-200 flex-1"
                >
                  {migrationLoading === 'link-apply' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  {migrationLoading === 'link-apply' ? 'Collegando...' : 'Collega'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Combat BGM Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-white/30" />
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Audio Combattimento</h4>
            <span className="text-[11px] text-white/15">— BGM e musiche di sottofondo caricate da DB</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bgmUploads.map(mu => (
              <MediaUploadBox key={mu.key} config={mu} entityId="bgm" />
            ))}
          </div>
        </div>

        </div>
      </div>

      {/* Sticky footer with save button */}
      <div className="shrink-0 px-6 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur">
        <div className="flex justify-end">
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
