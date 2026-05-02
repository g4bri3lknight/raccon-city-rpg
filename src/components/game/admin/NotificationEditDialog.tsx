'use client';

import { useState, useCallback } from 'react';
import { CloudUpload, Eye } from 'lucide-react';
import { MEDIA_UPLOADS } from './shared';
import { MediaUploadBox } from './MediaUploadBox';
import { NotificationPreviewCard } from './NotificationPreviewCard';

// Notification type options (Italian labels)
const NOTIFICATION_TYPES = [
  { value: 'encounter', label: '⚔️ Incontro' },
  { value: 'victory', label: '🏆 Vittoria' },
  { value: 'defeat', label: '💀 Sconfitta' },
  { value: 'item_found', label: '📦 Oggetto trovato' },
  { value: 'bag_expand', label: '🎒 Espansione zaino' },
  { value: 'collectible_found', label: '💎 Collezionabile' },
] as const;

// ── Color helpers ──
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return m ? m.map(c => parseInt(c, 16)) : [0, 0, 0];
}

// ── Glow state type ──
interface GlowState {
  enabled: boolean;
  color1: string;
  blur1: number;
  opacity1: number;
  color2: string;
  blur2: number;
  opacity2: number;
}

const DEFAULT_GLOW: GlowState = {
  enabled: false,
  color1: '#ffffff',
  blur1: 20,
  opacity1: 50,
  color2: '#ffffff',
  blur2: 40,
  opacity2: 20,
};

interface OverlayState {
  color: string;
  opacity: number;
}

const DEFAULT_OVERLAY: OverlayState = { color: '#000000', opacity: 80 };

// ── Parse helpers (only used for initial load) ──
function parseGlowCSS(css: string): GlowState {
  if (!css || css === 'none') return { ...DEFAULT_GLOW, enabled: false };
  const parts = css.split(/\s*,\s*/);
  const matchShadow = (s: string) => s?.match(/(\d+)\s+(\d+)\s+([\d.]+)px\s+rgba?\(([^)]+)\)/);
  const p1 = matchShadow(parts[0]);
  const p2 = matchShadow(parts[1]);
  if (!p1) return { ...DEFAULT_GLOW, enabled: true };
  const rgb1 = p1[4].split(',').map(s => Number(s.trim()));
  const c1 = rgbToHex(rgb1[0], rgb1[1], rgb1[2]);
  const o1 = Math.round((rgb1[3] ?? 1) * 100);
  let c2 = c1, o2 = Math.round(o1 * 0.5), b2 = Number(p1[3]) * 2;
  if (p2) {
    const rgb2 = p2[4].split(',').map(s => Number(s.trim()));
    c2 = rgbToHex(rgb2[0], rgb2[1], rgb2[2]);
    o2 = Math.round((rgb2[3] ?? 1) * 100);
    b2 = Number(p2[3]);
  }
  return {
    enabled: true,
    blur1: Number(p1[3]),
    color1: c1,
    opacity1: Math.min(100, Math.max(0, o1)),
    blur2: b2,
    color2: c2,
    opacity2: Math.min(100, Math.max(0, o2)),
  };
}

function buildGlowCSS(g: GlowState): string {
  if (!g.enabled) return 'none';
  const r1 = hexToRgb(g.color1);
  const r2 = hexToRgb(g.color2);
  return `0 0 ${g.blur1}px rgba(${r1[0]},${r1[1]},${r1[2]},${(g.opacity1 / 100).toFixed(2)}), 0 0 ${g.blur2}px rgba(${r2[0]},${r2[1]},${r2[2]},${(g.opacity2 / 100).toFixed(2)})`;
}

function parseOverlayCSS(css: string): OverlayState {
  const m = css?.match(/rgba?\(([^)]+)\)/);
  if (!m) return { ...DEFAULT_OVERLAY };
  const p = m[1].split(',').map(s => Number(s.trim()));
  return { color: rgbToHex(p[0], p[1], p[2]), opacity: Math.min(100, Math.max(0, Math.round((p[3] ?? 1) * 100))) };
}

function buildOverlayCSS(o: OverlayState): string {
  const rgb = hexToRgb(o.color);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(o.opacity / 100).toFixed(2)})`;
}

// ── Shared input classes ──
const colorPickerCls = "w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10";
const colorTextCls = "flex-1 min-w-0 text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono";
const optionStyle = { backgroundColor: '#111827', color: 'rgba(255,255,255,0.9)' };

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
  // ── Main form state ──
  const [form, setForm] = useState<Record<string, unknown>>({ ...initialData });

  // ── Glow state (dedicated useState) ──
  const [glow, setGlow] = useState<GlowState>(() => parseGlowCSS(String(initialData.titleGlow ?? 'none')));

  // ── Overlay state (dedicated useState) ──
  const [overlay, setOverlay] = useState<OverlayState>(() => parseOverlayCSS(String(initialData.overlayBg ?? 'rgba(0,0,0,0.8)')));

  const handleChange = useCallback((key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateGlow = useCallback((patch: Partial<GlowState>) => {
    setGlow(prev => ({ ...prev, ...patch }));
  }, []);

  const updateOverlay = useCallback((patch: Partial<OverlayState>) => {
    setOverlay(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Sync glow & overlay into form before saving
    onSave({
      ...form,
      titleGlow: buildGlowCSS(glow),
      overlayBg: buildOverlayCSS(overlay),
    });
  }, [form, glow, overlay, onSave]);

  const mediaUploads = MEDIA_UPLOADS.notifications;
  const currentType = String(form.type ?? '');
  const titleColor = String(form.titleColor ?? '#ffffff');

  // Build live preview form (with glow/overlay synced)
  const previewForm = {
    ...form,
    titleGlow: buildGlowCSS(glow),
    overlayBg: buildOverlayCSS(overlay),
  };

  return (
    <form id="notif-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {/* Row 1: ID (read-only) + Type (select) */}
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
          <select
            value={currentType}
            onChange={e => handleChange('type', e.target.value)}
            className="w-full text-[13px] bg-[#111827] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            style={{ backgroundColor: '#111827', color: 'rgba(255,255,255,0.8)' }}
          >
            {!NOTIFICATION_TYPES.some(t => t.value === currentType) && currentType && (
              <option value={currentType} style={optionStyle}>{currentType}</option>
            )}
            {NOTIFICATION_TYPES.map(t => (
              <option key={t.value} value={t.value} style={optionStyle}>{t.label}</option>
            ))}
          </select>
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

        {/* Row 3: Color pickers - cardBg + borderColor */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Sfondo Scheda</label>
          <div className="flex items-center gap-2">
            <input type="color" value={String(form.cardBg ?? '#1a1a2e')} onChange={e => handleChange('cardBg', e.target.value)} className={colorPickerCls} />
            <input type="text" value={String(form.cardBg ?? '#1a1a2e')} onChange={e => handleChange('cardBg', e.target.value)} className={colorTextCls} />
          </div>
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Bordo</label>
          <div className="flex items-center gap-2">
            <input type="color" value={String(form.borderColor ?? '#333333')} onChange={e => handleChange('borderColor', e.target.value)} className={colorPickerCls} />
            <input type="text" value={String(form.borderColor ?? '#333333')} onChange={e => handleChange('borderColor', e.target.value)} className={colorTextCls} />
          </div>
        </div>

        {/* Row 4: titleColor + scanlineColor */}
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Titolo</label>
          <div className="flex items-center gap-2">
            <input type="color" value={titleColor} onChange={e => handleChange('titleColor', e.target.value)} className={colorPickerCls} />
            <input type="text" value={titleColor} onChange={e => handleChange('titleColor', e.target.value)} className={colorTextCls} />
          </div>
        </div>
        <div>
          <label className="text-[12px] text-white/50 mb-0.5 block font-medium">Colore Scanline</label>
          <div className="flex items-center gap-2">
            <input type="color" value={String(form.scanlineColor ?? 'rgba(255,255,255,0.3)')} onChange={e => handleChange('scanlineColor', e.target.value)} className={colorPickerCls} />
            <input type="text" value={String(form.scanlineColor ?? 'rgba(255,255,255,0.3)')} onChange={e => handleChange('scanlineColor', e.target.value)} placeholder="rgba(255,255,255,0.3)" className={colorTextCls} />
          </div>
        </div>

        {/* Row 5: Title Glow — visual controls */}
        <div className="col-span-2">
          <label className="text-[12px] text-white/50 mb-1 block font-medium">
            Luminosità Titolo
            <label className="ml-2 flex items-center gap-1.5 text-white/40 font-normal cursor-pointer">
              <input
                type="checkbox"
                checked={glow.enabled}
                onChange={e => updateGlow({ enabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-emerald-500"
              />
              Attiva
            </label>
          </label>
          {glow.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Glow color 1 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Colore primario</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={glow.color1} onChange={e => updateGlow({ color1: e.target.value })} className={colorPickerCls} />
                  <input type="text" value={glow.color1} onChange={e => {
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateGlow({ color1: e.target.value });
                  }} className={colorTextCls} />
                </div>
              </div>
              {/* Glow blur 1 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Estensione: {glow.blur1}px</label>
                <input type="range" min={5} max={80} value={glow.blur1} onChange={e => updateGlow({ blur1: Number(e.target.value) })} className="w-full h-1.5 rounded appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500" />
              </div>
              {/* Glow opacity 1 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Intensità: {glow.opacity1}%</label>
                <input type="range" min={0} max={100} value={glow.opacity1} onChange={e => updateGlow({ opacity1: Number(e.target.value) })} className="w-full h-1.5 rounded appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500" />
              </div>
              {/* Glow color 2 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Colore secondario</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={glow.color2} onChange={e => updateGlow({ color2: e.target.value })} className={colorPickerCls} />
                  <input type="text" value={glow.color2} onChange={e => {
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateGlow({ color2: e.target.value });
                  }} className={colorTextCls} />
                </div>
              </div>
              {/* Glow blur 2 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Estensione: {glow.blur2}px</label>
                <input type="range" min={5} max={120} value={glow.blur2} onChange={e => updateGlow({ blur2: Number(e.target.value) })} className="w-full h-1.5 rounded appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500" />
              </div>
              {/* Glow opacity 2 */}
              <div>
                <label className="text-[11px] text-white/30 mb-0.5 block">Intensità: {glow.opacity2}%</label>
                <input type="range" min={0} max={100} value={glow.opacity2} onChange={e => updateGlow({ opacity2: Number(e.target.value) })} className="w-full h-1.5 rounded appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500" />
              </div>
            </div>
          )}
          {/* Live preview */}
          <div className="mt-2 px-4 py-3 rounded-lg border border-white/[0.06] bg-black/40 flex items-center justify-center">
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{
                color: titleColor,
                textShadow: glow.enabled ? buildGlowCSS(glow) : undefined,
              }}
            >
              Anteprima Titolo
            </span>
          </div>
        </div>

        {/* Row 6: Overlay Background — visual controls */}
        <div className="col-span-2">
          <label className="text-[12px] text-white/50 mb-1 block font-medium">Sfondo Overlay (dietro la notifica)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/30 mb-0.5 block">Colore</label>
              <div className="flex items-center gap-2">
                <input type="color" value={overlay.color} onChange={e => updateOverlay({ color: e.target.value })} className={colorPickerCls} />
                <input type="text" value={overlay.color} onChange={e => {
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateOverlay({ color: e.target.value });
                }} className={colorTextCls} />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/30 mb-0.5 block">Opacità: {overlay.opacity}%</label>
              <input type="range" min={0} max={100} value={overlay.opacity} onChange={e => updateOverlay({ opacity: Number(e.target.value) })} className="w-full h-1.5 rounded appearance-none cursor-pointer bg-white/[0.08] accent-emerald-500" />
            </div>
          </div>
          {/* Preview swatch */}
          <div className="mt-2 h-10 rounded-lg border border-white/[0.06] relative overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0' }} />
            <div className="absolute inset-0" style={{ background: `rgba(${hexToRgb(overlay.color).join(',')},${(overlay.opacity / 100).toFixed(2)})` }} />
          </div>
        </div>

        {/* Row 7: Shake toggle + Duration slider */}
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

        {/* Row 8: sortOrder */}
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
          <NotificationPreviewCard config={previewForm} />
        </div>
      </div>

    </form>
  );
}
