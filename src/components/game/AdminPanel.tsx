'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Pencil, Trash2, Save, RotateCcw, ChevronDown, ChevronUp,
  Package, Scroll, Zap, FileText, Volume2, ImageIcon, RefreshCw, Loader2, Upload
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';

// ── Types ──
type TabId = 'items' | 'quests' | 'events' | 'documents' | 'sounds' | 'images';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  endpoint: string;
}

const TABS: TabConfig[] = [
  { id: 'items', label: 'Oggetti', icon: <Package className="w-4 h-4" />, endpoint: '/api/admin/items' },
  { id: 'quests', label: 'Quest', icon: <Scroll className="w-4 h-4" />, endpoint: '/api/admin/quests' },
  { id: 'events', label: 'Eventi', icon: <Zap className="w-4 h-4" />, endpoint: '/api/admin/events' },
  { id: 'documents', label: 'Documenti', icon: <FileText className="w-4 h-4" />, endpoint: '/api/admin/documents' },
  { id: 'sounds', label: 'Suoni', icon: <Volume2 className="w-4 h-4" />, endpoint: '/api/admin/sounds' },
  { id: 'images', label: 'Immagini', icon: <ImageIcon className="w-4 h-4" />, endpoint: '/api/admin/images' },
];

// ── Field definitions per entity ──
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  options?: string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

const FIELD_MAP: Record<TabId, FieldDef[]> = {
  items: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: pistol' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Pistola M1911' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione oggetto' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['weapon', 'healing', 'ammo', 'utility', 'antidote', 'bag', 'collectible', 'key'] },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'] },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🔫' },
    { key: 'usable', label: 'Usabile', type: 'boolean', defaultValue: false },
    { key: 'equippable', label: 'Equipaggiabile', type: 'boolean', defaultValue: false },
    { key: 'stackable', label: 'Impilabile', type: 'boolean', defaultValue: true },
    { key: 'maxStack', label: 'Stack Max', type: 'number', defaultValue: 99 },
    { key: 'weaponType', label: 'Tipo Arma', type: 'select', options: ['melee', 'ranged'] },
    { key: 'atkBonus', label: 'Bonus ATK', type: 'number' },
    { key: 'ammoType', label: 'Tipo Munizione', type: 'text', placeholder: 'es: ammo_pistol' },
    { key: 'effectType', label: 'Tipo Effetto', type: 'select', options: ['heal', 'heal_full', 'cure', 'damage_boost', 'defense_boost', 'add_ammo', 'add_slots', 'kill_all'] },
    { key: 'effectValue', label: 'Valore Effetto', type: 'number' },
    { key: 'effectTarget', label: 'Bersaglio Effetto', type: 'select', options: ['self', 'one_ally', 'all_allies', 'all_enemies'] },
    { key: 'effectStatusCured', label: 'Status Curati (JSON)', type: 'text', placeholder: '["poison","bleeding"]' },
    { key: 'addSlots', label: 'Slot Aggiunti', type: 'number' },
  ],
  quests: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: quest_marco_firstaid' },
    { key: 'npcId', label: 'NPC ID', type: 'text', required: true, placeholder: 'es: npc_marco' },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['fetch', 'kill', 'explore'] },
    { key: 'targetId', label: 'Target ID', type: 'text', required: true, placeholder: 'es: first_aid' },
    { key: 'targetCount', label: 'Target Count', type: 'number', defaultValue: 1 },
    { key: 'rewardItems', label: 'Ricompense (JSON)', type: 'textarea', placeholder: '[{"itemId":"ammo_pistol","quantity":6}]' },
    { key: 'rewardExp', label: 'EXP Ricompensa', type: 'number', defaultValue: 0 },
    { key: 'rewardDialogue', label: 'Dialogo Ricompensa (JSON)', type: 'textarea', placeholder: '["Grazie!"]' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
    { key: 'prerequisiteQuestId', label: 'Prerequisito Quest ID', type: 'text' },
  ],
  events: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: event_blackout' },
    { key: 'title', label: 'Titolo', type: 'text', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea' },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🌑' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['blackout', 'alarm', 'collapse', 'lockdown', 'gas_leak', 'fire'] },
    { key: 'duration', label: 'Durata (turni)', type: 'number', defaultValue: 2 },
    { key: 'encounterRateMod', label: 'Mod. Incontri', type: 'number', defaultValue: 0 },
    { key: 'enemyStatMult', label: 'Molt. Nemici', type: 'number', defaultValue: 1.0 },
    { key: 'searchBonus', label: 'Bonus Ricerca', type: 'boolean', defaultValue: false },
    { key: 'damagePerTurn', label: 'Danni/Turno', type: 'number', defaultValue: 0 },
    { key: 'triggerChance', label: 'Prob. Trigger', type: 'number', defaultValue: 5 },
    { key: 'minTurn', label: 'Turno Minimo', type: 'number', defaultValue: 5 },
    { key: 'locationIds', label: 'Location IDs (JSON)', type: 'textarea', placeholder: '["city_outskirts","rpd_station"]' },
    { key: 'onTriggerMessage', label: 'Msg Trigger', type: 'textarea' },
    { key: 'onEndMessage', label: 'Msg Fine', type: 'textarea' },
    { key: 'choices', label: 'Scelte (JSON)', type: 'textarea', placeholder: '[{"text":"Scelta","outcome":{"description":"...","endEvent":true,"hpChange":0}}]' },
  ],
  documents: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: doc_survivor_note' },
    { key: 'title', label: 'Titolo', type: 'text', required: true },
    { key: 'content', label: 'Contenuto', type: 'textarea', required: true },
    { key: 'type', label: 'Tipo', type: 'select', options: ['diary', 'umbrella_file', 'note', 'photo', 'report', 'email'] },
    { key: 'locationId', label: 'Location ID', type: 'text', required: true },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 📝' },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'], defaultValue: 'common' },
    { key: 'isSecret', label: 'Segreto', type: 'boolean', defaultValue: false },
    { key: 'hintRequired', label: 'Hint Richiesto (Doc ID)', type: 'text' },
  ],
  sounds: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: sfx_attack' },
    { key: 'refKey', label: 'Chiave Interna', type: 'text', placeholder: 'es: playAttack, bgm_title...' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Attacco corpo a corpo' },
    { key: 'category', label: 'Categoria', type: 'select', options: ['combat', 'enemy', 'weapon', 'ui', 'ambient', 'bgm'] },
    { key: 'volume', label: 'Volume', type: 'number', defaultValue: 1.0 },
    { key: 'loopable', label: 'Loop', type: 'boolean', defaultValue: false },
  ],
  images: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: img_city_bg' },
    { key: 'refKey', label: 'Chiave Interna', type: 'text', placeholder: 'es: city_outskirts_bg...' },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'select', options: ['background', 'icon', 'portrait', 'sprite', 'ui'] },
    { key: 'altText', label: 'Alt Text', type: 'text' },
    { key: 'associatedId', label: 'ID Associato', type: 'text', placeholder: 'es: locationId, itemId...' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
  ],
};

// ── Utility ──
function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '✅' : '❌';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ── Form component ──
// ── File Upload Component ──
function FileUploadSection({ tabId, onUploaded }: {
  tabId: 'sounds' | 'images';
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [metaId, setMetaId] = useState('');
  const [metaName, setMetaName] = useState('');
  const [metaRefKey, setMetaRefKey] = useState('');
  const [metaCategory, setMetaCategory] = useState(tabId === 'sounds' ? 'ui' : 'ui');
  const [metaVolume, setMetaVolume] = useState('1.0');
  const [metaLoopable, setMetaLoopable] = useState(false);
  const [metaAltText, setMetaAltText] = useState('');
  const [metaAssocId, setMetaAssocId] = useState('');

  const isSound = tabId === 'sounds';
  const acceptTypes = isSound
    ? '.wav,.mp3,.ogg,.flac,audio/*'
    : '.jpg,.jpeg,.png,.webp,.gif,.svg,image/*';
  const uploadEndpoint = isSound ? '/api/admin/sounds/upload' : '/api/admin/images/upload';

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (metaId) formData.append('id', metaId);
      formData.append('name', metaName || file.name);
      if (metaRefKey) formData.append('refKey', metaRefKey);
      formData.append('category', metaCategory);
      if (isSound) {
        formData.append('volume', metaVolume);
        formData.append('loopable', String(metaLoopable));
      } else {
        formData.append('altText', metaAltText);
        if (metaAssocId) formData.append('associatedId', metaAssocId);
      }

      const res = await fetch(uploadEndpoint, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      setFile(null);
      setMetaId('');
      setMetaName('');
      setMetaRefKey('');
      onUploaded();
    } catch (err) {
      alert(`Errore upload: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const sizeKB = file ? (file.size / 1024).toFixed(1) : '0';

  return (
    <div className="border border-dashed border-cyan-500/20 rounded-xl p-4 bg-cyan-500/[0.02] space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
        <Upload className="w-4 h-4" />
        Upload {isSound ? 'Suono' : 'Immagine'} nel DB
      </div>

      {/* File input */}
      <label className="flex items-center justify-center gap-2 px-4 py-4 rounded-lg border border-white/[0.1] bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors">
        <input
          type="file"
          accept={acceptTypes}
          onChange={e => { setFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setMetaName(e.target.files[0].name.replace(/\.[^.]+$/, '')); }}
          className="hidden"
        />
        {file ? (
          <span className="text-xs text-green-300 truncate">📎 {file.name} ({sizeKB} KB)</span>
        ) : (
          <span className="text-xs text-white/30">📁 Clicca per selezionare un file...</span>
        )}
      </label>

      {/* Metadata fields */}
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={metaId}
          onChange={e => setMetaId(e.target.value)}
          placeholder="ID (opzionale)"
          className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
        />
        <input
          type="text"
          value={metaRefKey}
          onChange={e => setMetaRefKey(e.target.value)}
          placeholder="Chiave interna (refKey)"
          className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
        />
        <input
          type="text"
          value={metaName}
          onChange={e => setMetaName(e.target.value)}
          placeholder="Nome"
          className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={metaCategory}
          onChange={e => setMetaCategory(e.target.value)}
          className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 focus:outline-none focus:border-cyan-500/50"
        >
          {isSound ? (
            <>
              <option value="combat">Combat</option>
              <option value="enemy">Enemy</option>
              <option value="weapon">Weapon</option>
              <option value="ui">UI</option>
              <option value="ambient">Ambient</option>
              <option value="bgm">BGM</option>
            </>
          ) : (
            <>
              <option value="background">Background</option>
              <option value="icon">Icon</option>
              <option value="portrait">Portrait</option>
              <option value="sprite">Sprite</option>
              <option value="ui">UI</option>
            </>
          )}
        </select>
        {isSound && (
          <>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={metaVolume}
              onChange={e => setMetaVolume(e.target.value)}
              placeholder="Volume (0-2)"
              className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
            <label className="flex items-center gap-1.5 text-[10px] text-white/50 px-2 py-1">
              <input type="checkbox" checked={metaLoopable} onChange={e => setMetaLoopable(e.target.checked)} className="w-3 h-3" />
              Loop
            </label>
          </>
        )}
        {!isSound && (
          <>
            <input
              type="text"
              value={metaAltText}
              onChange={e => setMetaAltText(e.target.value)}
              placeholder="Alt Text"
              className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50"
            />
            <input
              type="text"
              value={metaAssocId}
              onChange={e => setMetaAssocId(e.target.value)}
              placeholder="ID associato"
              className="text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Caricamento...' : `Carica ${isSound ? 'Suono' : 'Immagine'} nel DB`}
      </button>
    </div>
  );
}

function EntityForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [data, setData] = useState<Record<string, unknown>>({ ...initialData });

  const handleChange = (key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-white/[0.03] rounded-xl border border-white/[0.08]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {fields.map(f => {
          const val = data[f.key] ?? f.defaultValue ?? '';
          return (
            <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
              <label className="text-[10px] text-white/50 mb-0.5 block font-medium">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-y font-mono"
                />
              ) : f.type === 'select' ? (
                <select
                  value={typeof val === 'string' ? val : ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="">— Nessuno —</option>
                  {f.options?.map(opt => (
                    <option key={opt} value={opt} className="bg-gray-900 text-white">{opt}</option>
                  ))}
                </select>
              ) : f.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={e => handleChange(f.key, e.target.checked)}
                    className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-yellow-500 focus:ring-yellow-500/50"
                  />
                  <span className="text-[10px] text-white/50">{val ? 'Sì' : 'No'}</span>
                </label>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' && typeof f.defaultValue === 'number' && f.defaultValue % 1 !== 0 ? '0.1' : f.type === 'number' ? '1' : undefined}
                  value={val as string | number}
                  onChange={e => {
                    const raw = e.target.value;
                    handleChange(f.key, f.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw);
                  }}
                  placeholder={f.placeholder}
                  className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-xs px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

// ── Main AdminPanel ──
export default function AdminPanel() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('items');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // id being edited
  const [creating, setCreating] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const tabConfig = TABS.find(t => t.id === activeTab)!;
  const fields = FIELD_MAP[activeTab];
  const scrollRef = useRef<HTMLDivElement>(null);

  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(tabConfig.endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tabConfig.endpoint, showStatus]);

  useEffect(() => {
    if (open) {
      fetchData();
      setCreating(false);
      setEditing(null);
      setExpandedRow(null);
    }
  }, [open, activeTab, fetchData]);

  // F3 key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      // Convert number fields properly
      const processed = { ...formData };
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        // Remove empty optional fields
        if (processed[f.key] === '' || processed[f.key] === undefined) {
          delete processed[f.key];
        }
      }
      const res = await fetch(tabConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Creato con successo!', 'success');
      setCreating(false);
      fetchData();
    } catch (err) {
      showStatus(`Errore creazione: ${err}`, 'error');
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    try {
      const processed = { ...formData };
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        if (processed[f.key] === '' || processed[f.key] === undefined) {
          delete processed[f.key];
        }
      }
      const res = await fetch(tabConfig.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Aggiornato con successo!', 'success');
      setEditing(null);
      fetchData();
    } catch (err) {
      showStatus(`Errore aggiornamento: ${err}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Eliminare "${id}"?`)) return;
    try {
      const res = await fetch(`${tabConfig.endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Eliminato con successo!', 'success');
      setExpandedRow(null);
      fetchData();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  const handleRefreshGameData = async () => {
    setRefreshing(true);
    try {
      // Reload in-memory data from DB via API
      await refreshGameData();
      showStatus('Dati di gioco ricaricati!', 'success');
    } catch (err) {
      showStatus(`Errore refresh: ${err}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const editingData = editing ? (data.find(r => (r as Record<string, unknown>).id === editing) as Record<string, unknown> || {}) : {};

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="admin-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[109] bg-black/60"
        onClick={() => setOpen(false)}
      />
      <motion.div
        key="admin-panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-4 z-[110] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8, 8, 14, 0.97)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚙️</span>
            <span className="text-sm font-black tracking-wider text-yellow-400">ADMIN PANEL</span>
            <span className="text-[10px] text-white/20 bg-white/[0.06] px-2 py-0.5 rounded-md font-mono">F3</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshGameData}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-600/15 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-600/25 transition-colors disabled:opacity-50 font-medium"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh Game Data
            </button>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-white/[0.06] shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 shadow-sm shadow-yellow-500/10'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
              {!loading && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-yellow-500/20 text-yellow-200' : 'bg-white/[0.06] text-white/30'
                }`}>
                  {data.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status message */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className={`px-3 py-1.5 text-[10px] font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-green-500/10 text-green-300 border-b border-green-500/20'
                  : 'bg-red-500/10 text-red-300 border-b border-red-500/20'
              }`}>
                {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 admin-scrollbar">
          {/* Create / Edit form */}
          {creating && (
            <EntityForm
              fields={fields}
              initialData={Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? '']))}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
              submitLabel="Crea"
            />
          )}

          {editing && (
            <EntityForm
              fields={fields}
              initialData={editingData}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              submitLabel="Salva"
            />
          )}

          {/* Create button */}
          {!creating && !editing && (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-dashed border-white/[0.12] text-white/40 hover:text-yellow-300 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuovo {tabConfig.label.slice(0, -1)}
            </button>
          )}

          {/* File upload section for sounds and images */}
          {(activeTab === 'sounds' || activeTab === 'images') && !creating && !editing && (
            <FileUploadSection tabId={activeTab as 'sounds' | 'images'} onUploaded={fetchData} />
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              <span className="ml-2 text-xs text-white/40">Caricamento...</span>
            </div>
          )}

          {/* Data list */}
          {!loading && data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xs text-white/20">Nessun dato trovato</p>
            </div>
          )}

          {!loading && data.map((row, idx) => {
            const rowId = String((row as Record<string, unknown>).id ?? idx);
            const isExpanded = expandedRow === rowId;
            const name = String((row as Record<string, unknown>).name ?? (row as Record<string, unknown>).title ?? rowId);

            return (
              <div key={rowId} className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                {/* Row header */}
                <button
                  onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                >
                  <span className="text-sm">{String((row as Record<string, unknown>).icon ?? (tabConfig.id === 'sounds' ? '🔊' : tabConfig.id === 'images' ? '🖼️' : '📄'))}</span>
                  <span className="text-xs font-medium text-white/80 flex-1 truncate">{name}</span>
                  <span className="text-[10px] text-white/25 font-mono truncate max-w-[180px]">{rowId}</span>
                  <span className="text-[9px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-md">
                    {String((row as Record<string, unknown>).type ?? (row as Record<string, unknown>).category ?? '')}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-1.5">
                        <div className="border-t border-white/[0.04] pt-2">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {Object.entries(row as Record<string, unknown>)
                            .filter(([k]) => !['createdAt', 'data'].includes(k))
                            .map(([key, val]) => (
                              <div key={key} className="flex items-start gap-2 text-[11px]">
                                <span className="text-white/30 font-mono min-w-[100px] shrink-0">{key}:</span>
                                <span className="text-white/60 break-all">{formatVal(val)}</span>
                              </div>
                            ))}
                          </div>
                          {/* BLOB info */}
                          {(row as Record<string, unknown>).data && (
                            <div className="flex items-center gap-2 text-[10px] mt-1">
                              <span className="text-white/30 font-mono min-w-[100px] shrink-0">data:</span>
                              <span className="text-green-400">✅ BLOB caricato ({((row as Record<string, unknown>).data as Uint8Array)?.length || 0} bytes)</span>
                            </div>
                          )}
                          {!(row as Record<string, unknown>).data && (
                            <div className="flex items-center gap-2 text-[10px] mt-1">
                              <span className="text-white/30 font-mono min-w-[100px] shrink-0">data:</span>
                              <span className="text-white/20">— Nessun file caricato</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => { setEditing(rowId); setExpandedRow(null); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-300 hover:bg-blue-600/25 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(rowId)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-300 hover:bg-red-600/25 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Elimina
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-white/25">
            {data.length} record · {tabConfig.label}
          </span>
          <button
            onClick={fetchData}
            className="text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Ricarica
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
