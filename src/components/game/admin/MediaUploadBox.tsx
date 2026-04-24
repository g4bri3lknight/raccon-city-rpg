'use client';

import { useState, useEffect, useRef } from 'react';
import { ImageIcon, Volume2, CheckCircle2, Trash, Loader2, CloudUpload, AlertCircle } from 'lucide-react';
import type { MediaUploadDef } from './shared';
import { SoundPreviewButton } from './SoundPreviewButton';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminTooltip } from './fields/AdminTooltip';

export function MediaUploadBox({
  config,
  entityId,
}: {
  config: MediaUploadDef;
  entityId: string | null;
}) {
  const mediaId = entityId ? config.idTemplate.replace('{entityId}', entityId) : '';
  const mediaName = entityId ? (config.nameTemplate || config.idTemplate).replace('{entityId}', entityId) : '';

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if file already exists for this entity
  useEffect(() => {
    if (!mediaId) {
      setHasExisting(false);
      return;
    }
    setCheckingExisting(true);
    const endpoint = config.mediaType === 'image' ? '/api/admin/images' : '/api/admin/sounds';
    adminFetch(endpoint)
      .then(res => res.json())
      .then(items => {
        const found = Array.isArray(items) && items.some((r: Record<string, unknown>) => r.id === mediaId && r.data);
        setHasExisting(found);
      })
      .catch(() => setHasExisting(false))
      .finally(() => setCheckingExisting(false));
  }, [mediaId, config.mediaType]);

  // Reset when entity changes
  useEffect(() => {
    setFile(null);
    setUploadResult(null);
    setDragOver(false);
  }, [mediaId]);

  const uploadFile = async (f: File) => {
    if (!mediaId) return;
    setUploading(true);
    setUploadResult(null);

    const endpoint = config.mediaType === 'image'
      ? '/api/admin/upload/image'
      : '/api/admin/upload/sound';

    const formData = new FormData();
    formData.append('file', f);
    formData.append('id', mediaId);
    formData.append('name', mediaName);
    formData.append('category', config.category);
    if (entityId) {
      formData.append('associatedId', entityId);
    }

    try {
      const res = await adminFetch(endpoint, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setUploadResult({ success: true, msg: `Caricato: ${(result.size / 1024).toFixed(1)} KB` });
      setFile(null);
      setHasExisting(true);
    } catch (err) {
      setUploadResult({ success: false, msg: `Errore: ${err}` });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!mediaId) return;
    const endpoint = config.mediaType === 'image'
      ? '/api/admin/upload/image'
      : '/api/admin/upload/sound';
    try {
      await adminFetch(`${endpoint}?id=${encodeURIComponent(mediaId)}`, { method: 'DELETE' });
      setHasExisting(false);
      setUploadResult({ success: true, msg: 'File rimosso' });
    } catch {
      setUploadResult({ success: false, msg: 'Errore rimozione' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) uploadFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) uploadFile(selected);
  };

  if (!entityId) {
    return (
      <div className="col-span-3 rounded-lg border border-dashed border-white/[0.06] p-4 flex items-center justify-center">
        <p className="text-[12px] text-white/20 italic">Salva l&apos;entità prima di caricare i media</p>
      </div>
    );
  }

  return (
    <div className="col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {config.mediaType === 'image' ? (
            <ImageIcon className="w-4 h-4 text-emerald-400/70" />
          ) : (
            <Volume2 className="w-4 h-4 text-green-400/70" />
          )}
          <span className="text-[13px] font-semibold text-white/70">{config.label}</span>
          {config.helpText && (
            <AdminTooltip text={config.helpText} showIcon={false} className="ml-1" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {checkingExisting ? (
            <span className="text-[11px] text-white/20">Controllo...</span>
          ) : hasExisting ? (
            <span className="flex items-center gap-1 text-[11px] text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> File presente
            </span>
          ) : null}
          {hasExisting && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2 py-0.5 rounded-full transition-colors"
              title="Rimuovi file"
            >
              <Trash className="w-3 h-3" /> Rimuovi
            </button>
          )}
        </div>
      </div>

      {/* Existing file preview */}
      {hasExisting && config.mediaType === 'image' && (
        <div className="mb-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-md overflow-hidden border border-white/[0.1] bg-black/30 flex items-center justify-center">
            <img
              src={`/api/media/image?ref=${encodeURIComponent(mediaId)}`}
              alt={config.label}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <span className="text-[12px] text-white/30 font-mono">{mediaId}</span>
        </div>
      )}
      {hasExisting && config.mediaType === 'sound' && (
        <div className="mb-3 flex items-center gap-3">
          <SoundPreviewButton soundId={mediaId} hasFile={true} />
          <span className="text-[12px] text-white/30 font-mono">{mediaId}</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-all ${
          dragOver
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : uploading
              ? 'border-white/[0.06] bg-white/[0.01] cursor-wait'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400/70" />
            <span className="text-[13px] text-white/50">Caricamento...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1">
            <CloudUpload className={`w-4 h-4 ${dragOver ? 'text-emerald-400/70' : 'text-white/20'}`} />
            <span className="text-[13px] text-white/40">
              {hasExisting ? 'Trascina per sostituire' : 'Trascina un file o clicca per selezionare'}
            </span>
          </div>
        )}
        {file && (
          <p className="text-[11px] text-white/25 mt-1 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        )}
      </div>

      {/* Upload result message */}
      {uploadResult && (
        <div className={`mt-2 flex items-center gap-1.5 text-[12px] px-2 py-1 rounded ${
          uploadResult.success
            ? 'text-green-400/70 bg-green-500/5'
            : 'text-red-400/70 bg-red-500/5'
        }`}>
          {uploadResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {uploadResult.msg}
        </div>
      )}

      {/* Help text */}
      <p className="mt-2 text-[11px] text-white/15">
        ID media: <span className="font-mono text-white/25">{mediaId}</span>
        {' · '}
        Accettati: {config.accept.split(',').map(t => t.split('/')[1]).join(', ')}
      </p>
    </div>
  );
}
