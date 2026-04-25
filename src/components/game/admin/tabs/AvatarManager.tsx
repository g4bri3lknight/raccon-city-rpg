'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Users, Pencil, Upload, Trash2, Save, Loader2,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

export function AvatarManager() {
  const [avatars, setAvatars] = useState<{ id: string; name: string; emoji: string; sortOrder: number }[]>([]);
  const [avatarHasImage, setAvatarHasImage] = useState<Record<string, boolean>>({});
  const [isUploadingId, setIsUploadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<{ id: string; name: string; emoji: string; sortOrder: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Dialog form fields
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('👤');
  const [saving, setSaving] = useState(false);

  // Load avatars from DB
  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/avatars');
        if (res.ok) {
          const data = await res.json();
          setAvatars(data);
        }
      } catch { /* silent */ }
      // Load image status
      try {
        const res = await adminFetch('/api/admin/images');
        if (res.ok) {
          const items: Record<string, unknown>[] = await res.json();
          const status: Record<string, boolean> = {};
          for (const r of items) {
            if (r.id && r.data) status[String(r.id)] = true;
          }
          setAvatarHasImage(status);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const reloadAvatars = async () => {
    try {
      const res = await adminFetch('/api/admin/avatars');
      if (res.ok) setAvatars(await res.json());
    } catch { /* silent */ }
  };

  const reloadImageStatus = async () => {
    try {
      const res = await adminFetch('/api/admin/images');
      if (res.ok) {
        const items: Record<string, unknown>[] = await res.json();
        const status: Record<string, boolean> = {};
        for (const r of items) {
          if (r.id && r.data) status[String(r.id)] = true;
        }
        setAvatarHasImage(status);
      }
    } catch { /* silent */ }
  };

  const handleUpload = async (avatarId: string, file: File) => {
    setIsUploadingId(avatarId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', avatarId);
    formData.append('name', `Avatar: ${avatarId}`);
    formData.append('category', 'avatar');
    try {
      const res = await adminFetch('/api/admin/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      await reloadImageStatus();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploadingId(null);
    }
  };

  const handleDeleteImage = async (avatarId: string) => {
    try { await adminFetch(`/api/admin/upload/image?id=${encodeURIComponent(avatarId)}`, { method: 'DELETE' }); } catch {}
    await reloadImageStatus();
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    if (!confirm(`Eliminare l'avatar "${avatarId}"? L'immagine associata verrà rimossa.`)) return;
    try {
      await adminFetch(`/api/admin/upload/image?id=${encodeURIComponent(avatarId)}`, { method: 'DELETE' });
      const res = await adminFetch(`/api/admin/avatars?id=${encodeURIComponent(avatarId)}`, { method: 'DELETE' });
      if (res.ok) {
        await reloadAvatars();
        await reloadImageStatus();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const openCreateDialog = () => {
    setFormId('');
    setFormName('');
    setFormEmoji('👤');
    setIsCreating(true);
    setEditingAvatar(null);
    setDialogOpen(true);
  };

  const openEditDialog = (avatar: { id: string; name: string; emoji: string; sortOrder: number }) => {
    setFormId(avatar.id);
    setFormName(avatar.name);
    setFormEmoji(avatar.emoji);
    setIsCreating(false);
    setEditingAvatar(avatar);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAvatar(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formId.trim() || !formName.trim()) return;
    setSaving(true);
    try {
      if (isCreating) {
        const res = await adminFetch('/api/admin/avatars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formId.trim(), name: formName.trim(), emoji: formEmoji }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await adminFetch('/api/admin/avatars', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formId.trim(), name: formName.trim(), emoji: formEmoji }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await reloadAvatars();
      handleDialogClose();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-white/30 py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento avatar...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — sticky */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400/60" />
            Avatar Personaggio
          </h3>
          <p className="text-[13px] text-white/30 mt-1">
            Gestisci gli avatar disponibili nella creazione personaggio.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[13px] font-medium hover:bg-emerald-600/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuovo Avatar
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto admin-scrollbar p-6">

      {/* Avatar Grid */}
      <div className="grid grid-cols-3 gap-3">
        {avatars.map(avatar => (
          <div
            key={avatar.id}
            className="relative rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden group hover:border-white/[0.15] transition-colors"
          >
            <div className="relative aspect-square bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center overflow-hidden">
              {avatarHasImage[avatar.id] ? (
                <img
                  src={`/api/media/image?id=${avatar.id}&_t=${Date.now()}`}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.querySelector('.emoji-fallback')!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`emoji-fallback text-5xl ${avatarHasImage[avatar.id] ? 'hidden absolute' : ''}`}>
                {avatar.emoji}
              </span>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditDialog(avatar)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[12px] hover:bg-blue-600/30 transition-colors"
                  title="Modifica"
                >
                  <Pencil className="w-3 h-3" />
                  Modifica
                </button>
                <button
                  type="button"
                  onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleUpload(avatar.id, f); }; input.click(); }}
                  disabled={isUploadingId === avatar.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[12px] hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
                  title="Carica immagine"
                >
                  {isUploadingId === avatar.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {avatarHasImage[avatar.id] ? 'Immagine' : 'Carica'}
                </button>
                {avatarHasImage[avatar.id] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(avatar.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-300 text-[12px] hover:bg-orange-600/30 transition-colors"
                    title="Rimuovi immagine"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="px-3 py-2.5 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] text-white/80 font-medium flex items-center gap-1.5">
                    <span>{avatar.emoji}</span>
                    {avatar.name}
                  </div>
                  <div className="text-[12px] text-white/25 font-mono mt-0.5">{avatar.id}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${avatarHasImage[avatar.id] ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-white/[0.03] border border-white/[0.06] text-white/20'}`}>
                    {avatarHasImage[avatar.id] ? '✓ Img' : '—'}
                  </span>
                  <button
                    onClick={() => handleDeleteAvatar(avatar.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-0.5"
                    title="Elimina avatar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
        <DialogContent
          className="bg-black border-white/[0.1] text-white sm:max-w-md"
          overlayClassName="z-[120]"
        >
          <DialogHeader>
            <DialogTitle className="text-emerald-400 text-base">
              {isCreating ? 'Nuovo Avatar' : `Modifica: ${editingAvatar?.name}`}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              {isCreating
                ? 'Inserisci i dati per creare un nuovo avatar'
                : 'Modifica i campi e premi Salva per aggiornare'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center justify-center py-3">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.08] flex items-center justify-center overflow-hidden">
                {avatarHasImage[formId] && !isCreating ? (
                  <img
                    src={`/api/media/image?id=${formId}&_t=${Date.now()}`}
                    alt={formName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      e.currentTarget.parentElement!.querySelector('.emoji-fallback')!.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`emoji-fallback text-4xl ${avatarHasImage[formId] && !isCreating ? 'hidden absolute' : ''}`}>
                  {formEmoji}
                </span>
              </div>
            </div>

            {/* ID field */}
            <div>
              <label className="text-[12px] text-white/50 mb-1 block font-medium">ID (slug)</label>
              <input
                type="text"
                value={formId}
                onChange={e => setFormId(e.target.value)}
                disabled={!isCreating}
                placeholder="es. avatar_soldato"
                className="w-full px-3 py-2 text-[13px] bg-black/40 border border-white/10 rounded-lg text-white/80 focus:outline-none focus:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] text-white/20 mt-1">Identificatore univoco. Non modificabile dopo la creazione.</p>
            </div>

            {/* Name field */}
            <div>
              <label className="text-[12px] text-white/50 mb-1 block font-medium">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="es. Soldato"
                className="w-full px-3 py-2 text-[13px] bg-black/40 border border-white/10 rounded-lg text-white/80 focus:outline-none focus:border-emerald-500/40"
              />
            </div>

            {/* Emoji field */}
            <div>
              <label className="text-[12px] text-white/50 mb-1 block font-medium">Emoji (fallback se nessuna immagine)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formEmoji}
                  onChange={e => setFormEmoji(e.target.value)}
                  className="w-20 px-3 py-2 text-[20px] bg-black/40 border border-white/10 rounded-lg text-center focus:outline-none focus:border-emerald-500/40"
                />
                <span className="text-3xl">{formEmoji}</span>
              </div>
            </div>

            {/* Image upload (edit only) */}
            {!isCreating && (
              <div>
                <label className="text-[12px] text-white/50 mb-1 block font-medium">Immagine</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleUpload(formId, f); }; input.click(); }}
                    disabled={isUploadingId === formId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 text-[12px] hover:bg-emerald-600/25 transition-colors disabled:opacity-50"
                  >
                    {isUploadingId === formId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {avatarHasImage[formId] ? 'Cambia immagine' : 'Carica immagine'}
                  </button>
                  {avatarHasImage[formId] && (
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(formId)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/15 border border-red-500/25 text-red-300 text-[12px] hover:bg-red-600/25 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Rimuovi
                    </button>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded ml-auto ${avatarHasImage[formId] ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-white/[0.03] border border-white/[0.06] text-white/20'}`}>
                    {avatarHasImage[formId] ? '✓ Caricata' : 'Nessuna'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={handleDialogClose}
              className="px-4 py-2 rounded-lg text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!formId.trim() || !formName.trim() || saving}
              className="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[13px] font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isCreating ? 'Crea Avatar' : 'Salva Modifiche'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
