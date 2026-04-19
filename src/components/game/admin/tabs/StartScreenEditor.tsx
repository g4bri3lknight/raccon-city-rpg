'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Loader2, Save, ImageIcon, CheckCircle2, CloudUpload, Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingDef, START_SCREEN_FIELDS } from '../config';
import { adminFetch } from '@/lib/admin-fetch';

export function StartScreenEditor() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bgHasFile, setBgHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Check if bg_title image exists
  useEffect(() => {
    adminFetch('/api/admin/images')
      .then(r => r.json())
      .then(rows => {
        const found = Array.isArray(rows) && rows.some((r: { id: string; data: unknown }) => r.id === 'bg_title' && r.data);
        setBgHasFile(found);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await adminFetch('/api/admin/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveMsg({ ok: true, text: '✅ Impostazioni salvate con successo!' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `❌ Errore: ${err}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleBgUpload = async (f: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', f);
    formData.append('id', 'bg_title');
    formData.append('name', 'Sfondo Schermata Iniziale');
    formData.append('category', 'background');
    try {
      const res = await adminFetch('/api/admin/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      setBgHasFile(true);
      setSaveMsg({ ok: true, text: '✅ Sfondo caricato! Fai Refresh Data per vederlo.' });
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err) {
      setSaveMsg({ ok: false, text: `❌ Errore upload: ${err}` });
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleBgRemove = async () => {
    try {
      await adminFetch('/api/admin/upload/image?id=bg_title', { method: 'DELETE' });
      setBgHasFile(false);
      setSaveMsg({ ok: true, text: '✅ Sfondo rimosso.' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch { /* ignore */ }
  };

  // Group fields
  const groups = START_SCREEN_FIELDS.reduce<Record<string, SettingDef[]>>((acc, f) => {
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
        <h3 className="text-sm font-bold text-emerald-400 mb-1">🎮 Schermata Iniziale</h3>
        <p className="text-[13px] text-white/40">Personalizza tutti i testi, colori e lo stile dei pulsanti della schermata del titolo.</p>
      </div>

      {/* Background Image Upload */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-emerald-400/70" />
          <span className="text-[13px] font-semibold text-white/70">Sfondo Schermata (bg_title)</span>
          {bgHasFile && (
            <span className="flex items-center gap-1 text-[11px] text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Presente
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {bgHasFile && (
            <div className="w-20 h-12 rounded-md overflow-hidden border border-white/[0.1] bg-black/30 shrink-0">
              <img src="/api/media/image?ref=bg_title" alt="bg" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <div
              className="border-2 border-dashed border-white/[0.08] rounded-lg px-4 py-4 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-colors"
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleBgUpload(f); }}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400/50" />
              ) : (
                <>
                  <CloudUpload className="w-5 h-5 text-white/25" />
                  <span className="text-[12px] text-white/30">
                    {bgHasFile ? 'Trascina o clicca per sostituire' : 'Trascina o clicca per caricare (PNG/JPG/WebP, 1920×1080+)'}
                  </span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); }} />
            </div>
          </div>
          {bgHasFile && (
            <button onClick={handleBgRemove} className="flex items-center gap-1 text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors shrink-0">
              <Trash className="w-3 h-3" /> Rimuovi
            </button>
          )}
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`mx-6 mt-4 px-4 py-2.5 rounded-lg text-[13px] font-medium ${saveMsg.ok ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Settings Groups */}
      <div className="px-6 py-4 space-y-6">
        {Object.entries(groups).map(([groupKey, fields]) => (
          <div key={groupKey}>
            <h4 className="text-[13px] font-bold text-white/50 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.04]">
              {fields[0].groupLabel}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map(f => {
                const val = settings[f.key] ?? '';
                return (
                  <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="text-[12px] text-white/50 mb-1 block font-medium">{f.label}</label>
                    {f.type === 'color' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={val || '#000000'}
                          onChange={e => handleChange(f.key, e.target.value)}
                          className="w-8 h-8 rounded border border-white/[0.1] bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={e => handleChange(f.key, e.target.value)}
                          placeholder="#ffffff"
                          className="flex-1 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    ) : f.type === 'range' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={f.min ?? 0}
                          max={f.max ?? 1}
                          step={f.step ?? 0.1}
                          value={parseFloat(val) || 0}
                          onChange={e => handleChange(f.key, e.target.value)}
                          className="flex-1 accent-emerald-500"
                        />
                        <span className="text-[12px] text-white/50 font-mono w-8 text-right">{val}</span>
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={val}
                        onChange={e => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={f.rows ?? 3}
                        className="w-full text-[13px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 resize-y font-mono"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={e => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full text-[13px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="px-6 py-4 border-t border-white/[0.06] sticky bottom-0 bg-black/95 backdrop-blur">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 text-xs gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salva Impostazioni Schermata Iniziale
        </Button>
      </div>
    </div>
  );
}
