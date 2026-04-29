'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Copy, Play, Loader2, Pencil,
  Gamepad2, Database, Clock, Check, X,
  Settings, Swords, ImageIcon, Download,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { refreshGameData } from '@/game/data/loader';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import ExportDialog from './ExportDialog';

interface GameManagerProps {
  onOpenEditor: (gameId: string) => void;
  onPlay: (gameId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface GameInfo {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  status: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════
// GameManager — Multi-game CRUD, switcher, launcher
// ═══════════════════════════════════════════════════════════════
export default function GameManager({ onOpenEditor, onPlay }: GameManagerProps) {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create game form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createClone, setCreateClone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit game dialog
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editCoverUploading, setEditCoverUploading] = useState(false);

  // Export dialog
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState<'game' | 'editor'>('game');
  const [exportGameId, setExportGameId] = useState('');
  const [exportGameName, setExportGameName] = useState('');

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const openExportGame = (game: GameInfo) => {
    setExportMode('game');
    setExportGameId(game.id);
    setExportGameName(game.name);
    setShowExport(true);
  };

  const openExportEditor = () => {
    setExportMode('editor');
    setExportGameId('');
    setExportGameName('');
    setShowExport(true);
  };

  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  // Fetch games list
  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/games');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGames(json.games ?? []);
    } catch (err) {
      showStatus(`Errore caricamento giochi: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  // Switch active game
  const handleSwitch = async (gameId: string) => {
    if (switching) return;
    setSwitching(gameId);
    try {
      const res = await adminFetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshGameData();
      useGameStore.getState().bumpDataVersion();
      setGames(prev => prev.map(g => ({ ...g, active: g.id === gameId })));
      showStatus(`Gioco attivo: ${games.find(g => g.id === gameId)?.name ?? gameId}`, 'success');
    } catch (err) {
      showStatus(`Errore cambio gioco: ${err}`, 'error');
    } finally {
      setSwitching(null);
    }
  };

  // Create new game
  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError('Il nome è obbligatorio');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const body: Record<string, string> = { name: createName.trim(), description: createDesc.trim() };
      if (createClone) body.cloneFrom = createClone;
      const res = await adminFetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      showStatus(`Gioco "${createName.trim()}" creato con successo!`, 'success');
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreateClone('');
      fetchGames();
    } catch (err) {
      setCreateError(String(err));
    } finally {
      setCreating(false);
    }
  };

  // Delete game
  const handleDelete = async (gameId: string, gameName: string) => {
    if (!confirm(`Eliminare il gioco "${gameName}"?\n\nQuesta azione è irreversibile e cancellerà tutti i dati del gioco.`)) return;
    setDeleting(gameId);
    try {
      const res = await adminFetch(`/api/games/${gameId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Gioco "${gameName}" eliminato`, 'success');
      fetchGames();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    } finally {
      setDeleting(null);
    }
  };

  // Clone game (creates a new game cloned from this one)
  const handleClone = async (gameId: string) => {
    const source = games.find(g => g.id === gameId);
    if (!source) return;
    const cloneName = prompt(`Nome per il clone di "${source.name}":`, `${source.name} (copia)`);
    if (!cloneName?.trim()) return;
    setCreating(true);
    try {
      const res = await adminFetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cloneName.trim(), description: source.description, cloneFrom: gameId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      showStatus(`Gioco "${cloneName.trim()}" clonato con successo!`, 'success');
      fetchGames();
    } catch (err) {
      showStatus(`Errore clonazione: ${err}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Save edit
  const handleSaveEdit = async (gameId: string) => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, status: editStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, name: editName, description: editDesc, status: editStatus } : g));
      setEditingId(null);
      showStatus('Gioco aggiornato!', 'success');
    } catch (err) {
      showStatus(`Errore aggiornamento: ${err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Start editing a game (opens dialog)
  const startEdit = (game: GameInfo) => {
    setEditingId(game.id);
    setEditName(game.name);
    setEditDesc(game.description);
    setEditStatus(game.status);
    setEditCoverImage(game.coverImage);
    setEditCoverUploading(false);
  };

  // Close edit dialog
  const closeEdit = () => {
    setEditingId(null);
    setEditCoverUploading(false);
  };

  // Upload cover image (from edit dialog)
  const handleEditCoverUpload = async (file: File) => {
    if (!editingId) return;
    setEditCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('gameId', editingId);
      formData.append('file', file);
      const res = await adminFetch('/api/upload-game-cover', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      setEditCoverImage('cover');
      setGames(prev => prev.map(g => g.id === editingId ? { ...g, coverImage: 'cover' } : g));
      showStatus('Cover aggiornata!', 'success');
    } catch (err) {
      showStatus(`Errore upload cover: ${err}`, 'error');
    } finally {
      setEditCoverUploading(false);
    }
  };

  // Remove cover image (from edit dialog)
  const handleEditCoverRemove = async () => {
    if (!editingId) return;
    try {
      const res = await adminFetch(`/api/upload-game-cover?gameId=${encodeURIComponent(editingId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setEditCoverImage('');
      setGames(prev => prev.map(g => g.id === editingId ? { ...g, coverImage: '' } : g));
      showStatus('Cover rimossa', 'success');
    } catch (err) {
      showStatus(`Errore rimozione cover: ${err}`, 'error');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const activeGame = games.find(g => g.active);

  return (
    <div className="flex flex-col h-full">
      {/* Status */}
      {statusMsg && (
        <div className={`shrink-0 px-4 py-2 text-[13px] font-medium ${statusMsg.type === 'success'
            ? 'bg-green-500/10 text-green-300 border-b border-green-500/20'
            : 'bg-red-500/10 text-red-300 border-b border-red-500/20'
          }`}>
          {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 px-8 py-8 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white/90 tracking-tight">RPG Game Engine</h2>
              <p className="text-sm text-white/35 mt-0.5">Crea, modifica e gioca ai tuoi giochi RPG</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={openExportEditor}
              className="text-xs gap-1.5 bg-violet-600/10 border border-violet-500/20 text-violet-300 hover:bg-violet-600/20 hover:text-violet-200"
            >
              <Download className="w-3.5 h-3.5" />
              Esporta Editor
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuovo Gioco
            </Button>
          </div>
        </div>
      </div>

      {/* Games list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 admin-scrollbar">
        {!loading && games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">🎮</div>
            <p className="text-sm text-white/30 font-medium">Nessun gioco trovato</p>
            <p className="text-[12px] text-white/15">Crea il tuo primo gioco RPG per iniziare</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map(game => (
              <div
                key={game.id}
                className={`rounded-xl border transition-all ${game.active
                    ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* Cover image */}
                    <div className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${game.coverImage
                        ? 'border-white/[0.1]'
                        : 'border-dashed border-white/[0.1] bg-white/[0.02]'
                      }`}>
                      {game.coverImage ? (
                        <img
                          src={`/api/game-cover?gameId=${encodeURIComponent(game.id)}&t=${Date.now()}`}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : null}
                      {!game.coverImage && (
                        <ImageIcon className="w-5 h-5 text-white/15" />
                      )}
                    </div>

                    {/* Game info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{game.active ? '🎮' : '📁'}</span>
                        <h3 className={`text-sm font-semibold truncate ${game.active ? 'text-emerald-300' : 'text-white/80'}`}>
                          {game.name}
                        </h3>
                        {game.active && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            Attivo
                          </span>
                        )}
                        {game.status === 'draft' && !game.active && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            Bozza
                          </span>
                        )}
                        {game.status === 'archived' && (
                          <span className="text-[10px] bg-white/10 text-white/30 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            Archiviato
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-7">
                        <span className="text-[12px] text-white/25 font-mono">{game.id}</span>
                        {game.description && (
                          <span className="text-[12px] text-white/40 truncate">{game.description}</span>
                        )}
                        <span className="text-[12px] text-white/15 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(game.updatedAt ?? game.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Primary Actions: Play + Editor */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onPlay(game.id)}
                        className="h-8 px-3 text-[12px] gap-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 shadow-sm shadow-emerald-500/5"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        Play
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onOpenEditor(game.id)}
                        className="h-8 px-3 text-[12px] gap-1.5 bg-cyan-600/15 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-600/25 hover:text-cyan-200"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Editor
                      </Button>
                    </div>
                  </div>

                  {/* Bottom row: secondary actions */}
                  <div className="flex items-center gap-1 mt-2 ml-[76px]">
                    {!game.active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSwitch(game.id)}
                        disabled={!!switching}
                        className="h-7 px-2.5 text-[11px] gap-1 text-white/30 hover:text-emerald-300 hover:bg-emerald-500/10"
                        title="Imposta come gioco attivo"
                      >
                        {switching === game.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Database className="w-3 h-3" />
                        }
                        Attiva
                      </Button>
                    )}
                    {game.active && (
                      <span className="text-[11px] text-white/15 flex items-center gap-1 mr-1">
                        <Database className="w-3 h-3" />
                        Database attivo
                      </span>
                    )}
                    <div className="w-px h-3 bg-white/[0.08] mx-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleClone(game.id)}
                      disabled={creating}
                      className="h-7 px-2 text-[11px] gap-1 text-white/25 hover:text-white/50 hover:bg-white/[0.06]"
                      title="Clona questo gioco"
                    >
                      <Copy className="w-3 h-3" />
                      Clona
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openExportGame(game)}
                      className="h-7 px-2 text-[11px] gap-1 text-violet-400/50 hover:text-violet-300 hover:bg-violet-500/10"
                      title="Esporta come applicazione portatile"
                    >
                      <Download className="w-3 h-3" />
                      Esporta
                    </Button>
                    <div className="w-px h-3 bg-white/[0.08] mx-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(game)}
                      className="h-7 px-2 text-[11px] gap-1 text-white/25 hover:text-white/50 hover:bg-white/[0.06]"
                      title="Modifica gioco"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifica
                    </Button>
                    <div className="w-px h-3 bg-white/[0.08] mx-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(game.id, game.name)}
                      disabled={!!deleting}
                      className="h-7 px-2 text-[11px] gap-1 text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                      title="Elimina gioco"
                    >
                      {deleting === game.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                      Elimina
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="shrink-0 px-5 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur text-[12px] text-white/25 flex items-center justify-between">
        <span>{games.length} gioco{games.length !== 1 ? 'i' : ''}</span>
        <span>Ogni gioco ha il proprio database indipendente</span>
      </div>

      {/* ── Edit Game Dialog ── */}
      {editingId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closeEdit} />
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(12, 12, 20, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/90">Modifica Gioco</h3>
                <p className="text-[12px] text-white/35">Titolo, descrizione, stato e cover image</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 admin-scrollbar space-y-4">
              {/* Cover image upload */}
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-lg overflow-hidden shrink-0 border-2 border-dashed border-white/[0.12] flex items-center justify-center bg-white/[0.02] transition-all ${editCoverImage ? 'border-solid border-white/[0.15]' : ''}`}>
                    {editCoverUploading ? (
                      <Loader2 className="w-6 h-6 text-white/25 animate-spin" />
                    ) : editCoverImage ? (
                      <img
                        src={`/api/game-cover?gameId=${encodeURIComponent(editingId)}&t=${Date.now()}`}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setEditCoverImage(''); }}
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-white/15" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/70 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Carica immagine
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={editCoverUploading}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleEditCoverUpload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {editCoverImage && (
                      <button
                        onClick={handleEditCoverRemove}
                        disabled={editCoverUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-red-500/[0.06] border border-red-500/[0.15] text-red-400/60 hover:bg-red-500/[0.12] hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Rimuovi cover
                      </button>
                    )}
                    <span className="text-[10px] text-white/15">PNG, JPG, WebP — max 2MB</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Name */}
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Nome</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Stato</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 focus:outline-none focus:border-emerald-500/50 [&>option]:bg-[#1a1a2e] [&>option]:text-white/80"
                >
                  <option value="active">Attivo</option>
                  <option value="draft">Bozza</option>
                  <option value="archived">Archiviato</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Descrizione</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  placeholder="Descrivi il tuo gioco..."
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex gap-2 bg-black/80">
              <Button
                onClick={closeEdit}
                className="flex-1 text-xs bg-white/[0.06] border border-white/[0.1] text-white/50 hover:bg-white/[0.1] hover:text-white/70"
              >
                <X className="w-3.5 h-3.5" />
                Annulla
              </Button>
              <Button
                onClick={() => handleSaveEdit(editingId)}
                disabled={saving}
                className="flex-1 text-xs gap-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Game Dialog ── */}
      {showCreate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => { setShowCreate(false); setCreateError(''); }}
          />
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl p-6"
            style={{
              background: 'rgba(12, 12, 20, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/90">Nuovo Gioco</h3>
                <p className="text-[12px] text-white/35">Crea un nuovo database di gioco</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Nome *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => { setCreateName(e.target.value); setCreateError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  placeholder="Es. Il mio GDR Fantasy"
                  autoFocus
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Descrizione</label>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={2}
                  placeholder="Descrivi il tuo gioco..."
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Clona da (opzionale)</label>
                <select
                  value={createClone}
                  onChange={e => setCreateClone(e.target.value)}
                  className="w-full text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-white/80 focus:outline-none focus:border-emerald-500/50 [&>option]:bg-[#1a1a2e] [&>option]:text-white/80"
                >
                  <option value="">— Nuovo gioco vuoto —</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
                  ))}
                </select>
                <p className="text-[11px] text-white/20 mt-1">Clonare copia tutti i dati (oggetti, nemici, location, ecc.) nel nuovo gioco</p>
              </div>

              {createError && (
                <p className="text-[12px] text-red-400">❌ {createError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => { setShowCreate(false); setCreateError(''); }}
                  className="flex-1 text-xs bg-white/[0.06] border border-white/[0.1] text-white/50 hover:bg-white/[0.1] hover:text-white/70"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="flex-1 text-xs gap-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 disabled:opacity-40"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Crea Gioco
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Dialog ── */}
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        mode={exportMode}
        gameId={exportGameId}
        gameName={exportGameName}
      />
    </div>
  );
}
