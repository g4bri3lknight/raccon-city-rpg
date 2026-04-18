'use client';

import { useState } from 'react';
import { CloudUpload, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MEDIA_UPLOADS } from './shared';
import { MediaUploadBox } from './MediaUploadBox';
import { NotificationPreviewCard } from './NotificationPreviewCard';

export function NotificationEditDialog({
  initialData,
  onSave,
  onCancel,
  isEdit,
}: {
  initialData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...initialData });

  const handleChange = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const mediaUploads = MEDIA_UPLOADS.notifications;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {/* Row 1: ID (read-only) + Type */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">ID</label>
          <input
            type="text"
            value={String(form.id ?? '')}
            disabled={isEdit}
            onChange={e => handleChange('id', e.target.value)}
            placeholder="es: notif_encounter"
            className={isEdit
              ? 'w-full text-[13px] bg-white/[0.02] border border-white/[0.06] rounded px-2 py-1.5 text-white/30 font-mono cursor-not-allowed'
              : 'w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono'
            }
          />
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Tipo <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={String(form.type ?? '')}
            onChange={e => handleChange('type', e.target.value)}
            placeholder="es: encounter"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        {/* Row 2: Label + Icon */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Etichetta</label>
          <input
            type="text"
            value={String(form.label ?? '')}
            onChange={e => handleChange('label', e.target.value)}
            placeholder='es: ⚠ INCONTRO ⚠'
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Icona</label>
          <input
            type="text"
            value={String(form.icon ?? '')}
            onChange={e => handleChange('icon', e.target.value)}
            placeholder="es: 🔥"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Row 2.5: imageRef + soundRef */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Ref Immagine</label>
          <input
            type="text"
            value={String(form.imageRef ?? '')}
            onChange={e => handleChange('imageRef', e.target.value)}
            placeholder="ID immagine (es: notif_img_notif_encounter)"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Ref Suono</label>
          <input
            type="text"
            value={String(form.soundRef ?? '')}
            onChange={e => handleChange('soundRef', e.target.value)}
            placeholder="ID suono (es: notif_sfx_notif_encounter)"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        {/* Row 3: Color pickers - cardBg + borderColor */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Sfondo Scheda</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(form.cardBg ?? '#1a1a2e')}
                onChange={e => handleChange('cardBg', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
              />
              <input
                type="text"
                value={String(form.cardBg ?? '#1a1a2e')}
                onChange={e => handleChange('cardBg', e.target.value)}
                className="flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Bordo</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(form.borderColor ?? '#333333')}
                onChange={e => handleChange('borderColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
              />
              <input
                type="text"
                value={String(form.borderColor ?? '#333333')}
                onChange={e => handleChange('borderColor', e.target.value)}
                className="flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Row 4: titleColor + scanlineColor */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Titolo</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(form.titleColor ?? '#ffffff')}
              onChange={e => handleChange('titleColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
            />
            <input
              type="text"
              value={String(form.titleColor ?? '#ffffff')}
              onChange={e => handleChange('titleColor', e.target.value)}
              className="flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Scanline</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(form.scanlineColor ?? 'rgba(255,255,255,0.3)')}
              onChange={e => handleChange('scanlineColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
            />
            <input
              type="text"
              value={String(form.scanlineColor ?? 'rgba(255,255,255,0.3)')}
              onChange={e => handleChange('scanlineColor', e.target.value)}
              placeholder="rgba(255,255,255,0.3)"
              className="flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>
        </div>

        {/* Row 5: titleGlow (text) + overlayBg (text) */}
        <div className="col-span-2">
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Title Glow (CSS text-shadow)</label>
          <input
            type="text"
            value={String(form.titleGlow ?? 'none')}
            onChange={e => handleChange('titleGlow', e.target.value)}
            placeholder="0 0 30px rgba(239,68,68,0.7)"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Overlay Background (CSS)</label>
          <input
            type="text"
            value={String(form.overlayBg ?? 'rgba(0,0,0,0.8)')}
            onChange={e => handleChange('overlayBg', e.target.value)}
            placeholder="rgba(0,0,0,0.8)"
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        {/* Row 6: Shake toggle + Duration slider */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Screen Shake</label>
          <label className="flex items-center gap-2 cursor-pointer py-1.5">
            <input
              type="checkbox"
              checked={!!form.shake}
              onChange={e => handleChange('shake', e.target.checked)}
              className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-emerald-500 focus:ring-emerald-500/50 accent-emerald-500"
            />
            <span className="text-[12px] text-white/50">{form.shake ? 'Sì' : 'No'}</span>
          </label>
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">
            Durata: <span className="text-white/70">{String(form.duration ?? 2500)}ms</span>
          </label>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={Number(form.duration ?? 2500)}
            onChange={e => handleChange('duration', Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500"
          />
          <div className="flex justify-between text-[11px] text-white/20 mt-0.5">
            <span>500ms</span>
            <span>5000ms</span>
          </div>
        </div>

        {/* Row 7: sortOrder */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Ordine</label>
          <input
            type="number"
            value={Number(form.sortOrder ?? 0)}
            onChange={e => handleChange('sortOrder', Number(e.target.value))}
            className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>
      </div>

      {/* ═══ Media Uploads Section ═══ */}
      {mediaUploads.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <CloudUpload className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Media Upload</span>
            <span className="text-[11px] text-white/15">— immagine e suono personalizzati per questa notifica</span>
          </div>
          <div className="space-y-3">
            {mediaUploads.map(mu => (
              <MediaUploadBox
                key={mu.key}
                config={mu}
                entityId={typeof form.id === 'string' && form.id.trim() ? form.id.trim() : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Live Preview Section ═══ */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Anteprima Live</span>
          <span className="text-[11px] text-white/15">— come apparirà la notifica nel gioco</span>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-black/30 p-1">
          <NotificationPreviewCard config={form} />
        </div>
      </div>

      {/* ═══ Save / Cancel ═══ */}
      <div className="flex gap-3 pt-3">
        <Button
          type="submit"
          className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
        >
          <Save className="w-3.5 h-3.5" />
          {isEdit ? 'Salva Modifiche' : 'Crea Notifica'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="flex-1 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
