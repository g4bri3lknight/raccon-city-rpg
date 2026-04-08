'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Pencil, Trash2, Save, RotateCcw,
  Package, Scroll, Zap, FileText, Volume2, ImageIcon, RefreshCw, Loader2, Upload, Search
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';
import ItemIcon from '@/components/game/ItemIcon';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Rarity } from '@/game/types';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
type TabId = 'items' | 'quests' | 'events' | 'documents' | 'sounds' | 'images';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  endpoint: string;
  entityLabel: string; // singular label for "Aggiungi Nuovo ..."
}

const TABS: TabConfig[] = [
  { id: 'items', label: 'Oggetti', icon: <Package className="w-4 h-4" />, endpoint: '/api/admin/items', entityLabel: 'Oggetto' },
  { id: 'quests', label: 'Missioni', icon: <Scroll className="w-4 h-4" />, endpoint: '/api/admin/quests', entityLabel: 'Missione' },
  { id: 'events', label: 'Eventi', icon: <Zap className="w-4 h-4" />, endpoint: '/api/admin/events', entityLabel: 'Evento' },
  { id: 'documents', label: 'Documenti', icon: <FileText className="w-4 h-4" />, endpoint: '/api/admin/documents', entityLabel: 'Documento' },
  { id: 'sounds', label: 'Suoni', icon: <Volume2 className="w-4 h-4" />, endpoint: '/api/admin/sounds', entityLabel: 'Suono' },
  { id: 'images', label: 'Immagini', icon: <ImageIcon className="w-4 h-4" />, endpoint: '/api/admin/images', entityLabel: 'Immagine' },
];

// ═══════════════════════════════════════════════════════════════
// Enum Italian Translations
// ═══════════════════════════════════════════════════════════════
const ENUM_LABELS: Record<string, Record<string, { it: string; hint?: string }>> = {
  itemType: {
    weapon:      { it: 'Arma' },
    healing:     { it: 'Cura' },
    ammo:        { it: 'Munizioni' },
    utility:     { it: 'Utilità' },
    antidote:    { it: 'Antidoto' },
    bag:         { it: 'Zaino' },
    collectible: { it: 'Collezionabile' },
    key:         { it: 'Chiave' },
  },
  rarity: {
    common:    { it: 'Comune' },
    uncommon:  { it: 'Non Comune' },
    rare:      { it: 'Raro' },
    legendary: { it: 'Leggendario' },
  },
  questType: {
    fetch:   { it: 'Recupera', hint: 'portare un oggetto all\'NPC' },
    kill:    { it: 'Uccidi', hint: 'eliminare un nemico' },
    explore: { it: 'Esplora', hint: 'visitare una location' },
  },
  eventType: {
    blackout:  { it: 'Blackout', hint: 'buio totale' },
    alarm:     { it: 'Allarme', hint: 'aumenta incontri' },
    collapse:  { it: 'Crollo', hint: 'danni per turno' },
    lockdown:  { it: 'Isolamento', hint: 'aree chiuse' },
    gas_leak:  { it: 'Fuga di Gas', hint: 'danni cumulativi' },
    fire:      { it: 'Incendio', hint: 'danni gravi' },
  },
  documentType: {
    diary:          { it: 'Diario' },
    umbrella_file:  { it: 'Documento Umbrella' },
    note:           { it: 'Nota' },
    photo:          { it: 'Foto' },
    report:         { it: 'Rapporto' },
    email:          { it: 'Email' },
  },
  soundCategory: {
    combat:  { it: 'Combattimento' },
    enemy:   { it: 'Nemico' },
    weapon:  { it: 'Arma' },
    ui:      { it: 'Interfaccia' },
    ambient: { it: 'Ambientazione' },
    bgm:     { it: 'Musica' },
  },
  imageCategory: {
    background: { it: 'Sfondo' },
    icon:       { it: 'Icona' },
    portrait:   { it: 'Ritratto' },
    sprite:     { it: 'Sprite' },
    ui:         { it: 'Interfaccia' },
  },
  weaponType: {
    melee:  { it: 'Corpo a Corpo' },
    ranged: { it: 'A Distanza' },
  },
  effectType: {
    heal:          { it: 'Cura', hint: 'ripristina HP' },
    heal_full:     { it: 'Cura Totale', hint: 'HP massimo' },
    cure:          { it: 'Disintossica', hint: 'rimuove status' },
    damage_boost:  { it: 'Boost Danni' },
    defense_boost: { it: 'Boost Difesa' },
    add_ammo:      { it: 'Aggiungi Munizioni' },
    add_slots:     { it: 'Aggiungi Slot' },
    kill_all:      { it: 'Elimina Tutti' },
  },
  effectTarget: {
    self:         { it: 'Sé Stesso' },
    one_ally:     { it: 'Un Alleato' },
    all_allies:   { it: 'Tutti gli Alleati' },
    all_enemies:  { it: 'Tutti i Nemici' },
  },
};

// Helper: get Italian label for an enum value
function getEnumLabel(enumGroup: string, value: string): string {
  return ENUM_LABELS[enumGroup]?.[value]?.it ?? value;
}

// Helper: get hint for an enum value
function getEnumHint(enumGroup: string, value: string): string | undefined {
  return ENUM_LABELS[enumGroup]?.[value]?.hint;
}

// ═══════════════════════════════════════════════════════════════
// Field Definitions
// ═══════════════════════════════════════════════════════════════
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'entity-search';
  options?: string[];
  enumGroup?: string; // key into ENUM_LABELS for Italian translations
  entitySearchEndpoint?: string; // for entity-search type
  entitySearchLabelKey?: string; // which field to show as label
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  colSpan?: number; // 1 or 2 for grid layout
}

const FIELD_MAP: Record<TabId, FieldDef[]> = {
  items: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: pistol' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Pistola M1911' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione oggetto', colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['weapon', 'healing', 'ammo', 'utility', 'antidote', 'bag', 'collectible', 'key'], enumGroup: 'itemType' },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'], enumGroup: 'rarity' },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🔫' },
    { key: 'usable', label: 'Usabile', type: 'boolean', defaultValue: false },
    { key: 'equippable', label: 'Equipaggiabile', type: 'boolean', defaultValue: false },
    { key: 'stackable', label: 'Impilabile', type: 'boolean', defaultValue: true },
    { key: 'unico', label: 'Unico', type: 'boolean', defaultValue: false },
    { key: 'maxStack', label: 'Stack Max', type: 'number', defaultValue: 99 },
    { key: 'weaponType', label: 'Tipo Arma', type: 'select', options: ['melee', 'ranged'], enumGroup: 'weaponType' },
    { key: 'atkBonus', label: 'Bonus ATK', type: 'number' },
    { key: 'ammoType', label: 'Tipo Munizione', type: 'text', placeholder: 'es: ammo_pistol' },
    { key: 'effectType', label: 'Tipo Effetto', type: 'select', options: ['heal', 'heal_full', 'cure', 'damage_boost', 'defense_boost', 'add_ammo', 'add_slots', 'kill_all'], enumGroup: 'effectType' },
    { key: 'effectValue', label: 'Valore Effetto', type: 'number' },
    { key: 'effectTarget', label: 'Bersaglio Effetto', type: 'select', options: ['self', 'one_ally', 'all_allies', 'all_enemies'], enumGroup: 'effectTarget' },
    { key: 'effectStatusCured', label: 'Status Curati (JSON)', type: 'text', placeholder: '["poison","bleeding"]', colSpan: 3 },
    { key: 'addSlots', label: 'Slot Aggiunti', type: 'number' },
  ],
  quests: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: quest_marco_firstaid' },
    { key: 'npcId', label: 'NPC ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/items', entitySearchLabelKey: 'name', placeholder: 'es: npc_marco', required: true, colSpan: 2 },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea', colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['fetch', 'kill', 'explore'], enumGroup: 'questType' },
    { key: 'targetId', label: 'Target ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/items', entitySearchLabelKey: 'name', placeholder: 'es: first_aid', required: true, colSpan: 2 },
    { key: 'targetCount', label: 'Target Count', type: 'number', defaultValue: 1 },
    { key: 'rewardItems', label: 'Ricompense (JSON)', type: 'textarea', placeholder: '[{"itemId":"ammo_pistol","quantity":6}]', colSpan: 3 },
    { key: 'rewardExp', label: 'EXP Ricompensa', type: 'number', defaultValue: 0 },
    { key: 'rewardDialogue', label: 'Dialogo Ricompensa (JSON)', type: 'textarea', placeholder: '["Grazie!"]', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
    { key: 'prerequisiteQuestId', label: 'Prerequisito Quest ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/quests', entitySearchLabelKey: 'name', placeholder: 'es: quest_prev', colSpan: 2 },
  ],
  events: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: event_blackout' },
    { key: 'title', label: 'Titolo', type: 'text', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea', colSpan: 3 },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🌑' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['blackout', 'alarm', 'collapse', 'lockdown', 'gas_leak', 'fire'], enumGroup: 'eventType' },
    { key: 'duration', label: 'Durata (turni)', type: 'number', defaultValue: 2 },
    { key: 'encounterRateMod', label: 'Mod. Incontri', type: 'number', defaultValue: 0 },
    { key: 'enemyStatMult', label: 'Molt. Nemici', type: 'number', defaultValue: 1.0 },
    { key: 'searchBonus', label: 'Bonus Ricerca', type: 'boolean', defaultValue: false },
    { key: 'damagePerTurn', label: 'Danni/Turno', type: 'number', defaultValue: 0 },
    { key: 'triggerChance', label: 'Prob. Trigger', type: 'number', defaultValue: 5 },
    { key: 'minTurn', label: 'Turno Minimo', type: 'number', defaultValue: 5 },
    { key: 'locationIds', label: 'Location IDs (JSON)', type: 'textarea', placeholder: '["city_outskirts","rpd_station"]', colSpan: 3 },
    { key: 'onTriggerMessage', label: 'Msg Trigger', type: 'textarea', colSpan: 3 },
    { key: 'onEndMessage', label: 'Msg Fine', type: 'textarea', colSpan: 3 },
    { key: 'choices', label: 'Scelte (JSON)', type: 'textarea', placeholder: '[{"text":"Scelta","outcome":{"description":"...","endEvent":true,"hpChange":0}}]', colSpan: 3 },
  ],
  documents: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: doc_survivor_note' },
    { key: 'title', label: 'Titolo', type: 'text', required: true },
    { key: 'content', label: 'Contenuto', type: 'textarea', required: true, colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['diary', 'umbrella_file', 'note', 'photo', 'report', 'email'], enumGroup: 'documentType' },
    { key: 'locationId', label: 'Location ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/events', entitySearchLabelKey: 'title', required: true, colSpan: 2 },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 📝' },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'], enumGroup: 'rarity', defaultValue: 'common' },
    { key: 'isSecret', label: 'Segreto', type: 'boolean', defaultValue: false },
    { key: 'hintRequired', label: 'Hint Richiesto (Doc ID)', type: 'text' },
  ],
  sounds: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: sfx_attack' },
    { key: 'refKey', label: 'Chiave Interna', type: 'text', placeholder: 'es: playAttack, bgm_title...' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Attacco corpo a corpo' },
    { key: 'category', label: 'Categoria', type: 'select', options: ['combat', 'enemy', 'weapon', 'ui', 'ambient', 'bgm'], enumGroup: 'soundCategory' },
    { key: 'volume', label: 'Volume', type: 'number', defaultValue: 1.0 },
    { key: 'loopable', label: 'Loop', type: 'boolean', defaultValue: false },
  ],
  images: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: img_city_bg' },
    { key: 'refKey', label: 'Chiave Interna', type: 'text', placeholder: 'es: city_outskirts_bg...' },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'select', options: ['background', 'icon', 'portrait', 'sprite', 'ui'], enumGroup: 'imageCategory' },
    { key: 'altText', label: 'Alt Text', type: 'text' },
    { key: 'associatedId', label: 'ID Associato', type: 'entity-search', entitySearchEndpoint: '/api/admin/items', entitySearchLabelKey: 'name', placeholder: 'es: locationId, itemId...', colSpan: 2 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Table Column Definitions
// ═══════════════════════════════════════════════════════════════
interface ColumnDef {
  key: string;
  label: string;
  width?: string; // CSS width class
  render?: (row: Record<string, unknown>, tabId: TabId) => React.ReactNode;
}

const TABLE_COLUMNS: Record<TabId, ColumnDef[]> = {
  items: [
    {
      key: '_icon',
      label: '',
      width: 'w-10',
      render: (row) => (
        <ItemIcon
          itemId={String(row.id)}
          rarity={(String(row.rarity) as Rarity) || 'common'}
          size={32}
        />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-36' },
    { key: 'name', label: 'Nome' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('itemType', String(row.type))}
        </Badge>
      ),
    },
    {
      key: 'rarity',
      label: 'Rarità',
      width: 'w-32',
      render: (row) => {
        const r = String(row.rarity);
        const rarityColor: Record<string, string> = {
          common: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
          uncommon: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
          rare: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          legendary: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
        };
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rarityColor[r] ?? ''}`}>
            {getEnumLabel('rarity', r)}
          </Badge>
        );
      },
    },
    {
      key: '_unico',
      label: 'Unico',
      width: 'w-16',
      render: (row) => (
        <span className={row.unico ? 'text-yellow-400' : 'text-white/20'}>
          {row.unico ? '★' : '—'}
        </span>
      ),
    },
  ],
  quests: [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome' },
    { key: 'npcId', label: 'NPC ID', width: 'w-32' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('questType', String(row.type))}
        </Badge>
      ),
    },
  ],
  events: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'title', label: 'Titolo' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('eventType', String(row.type))}
        </Badge>
      ),
    },
    {
      key: 'duration',
      label: 'Durata',
      width: 'w-20',
      render: (row) => <span className="text-white/50">{row.duration} turni</span>,
    },
  ],
  documents: [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'title', label: 'Titolo' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-36',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('documentType', String(row.type))}
        </Badge>
      ),
    },
    { key: 'locationId', label: 'Luogo', width: 'w-32' },
  ],
  sounds: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-36',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('soundCategory', String(row.category))}
        </Badge>
      ),
    },
    {
      key: 'data',
      label: 'File',
      width: 'w-24',
      render: (row) => (
        <span className={`text-[10px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
  images: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('imageCategory', String(row.category))}
        </Badge>
      ),
    },
    {
      key: 'data',
      label: 'File',
      width: 'w-24',
      render: (row) => (
        <span className={`text-[10px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Entity Search Input (searchable ID reference fields)
// ═══════════════════════════════════════════════════════════════
function EntitySearchInput({
  value,
  onChange,
  endpoint,
  labelKey,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  labelKey: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data: Record<string, unknown>[] = await res.json();
      const lower = q.toLowerCase();
      const filtered = data
        .filter(r => {
          const id = String(r.id).toLowerCase();
          const label = String(r[labelKey] ?? '').toLowerCase();
          return id.includes(lower) || label.includes(lower);
        })
        .slice(0, 10)
        .map(r => ({ id: String(r.id), label: String(r[labelKey] ?? r.id) }));
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    } catch {
      // silent fail
    } finally {
      setSearching(false);
    }
  }, [endpoint, labelKey]);

  const handleInputChange = (v: string) => {
    setQuery(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSelect = (id: string) => {
    setQuery(id);
    onChange(id);
    setShowDropdown(false);
  };

  const handleSearchClick = () => {
    doSearch(query);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={placeholder ?? 'Cerca...'}
          disabled={disabled}
          className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={disabled || searching}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded bg-white/[0.06] border border-white/[0.1] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors disabled:opacity-40"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/[0.12] bg-gray-900 shadow-xl admin-scrollbar">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0"
            >
              <span className="text-white/90 font-mono">{r.id}</span>
              <span className="text-white/30 ml-2 truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Entity Form (for create/edit dialog)
// ═══════════════════════════════════════════════════════════════
function EntityForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isEdit,
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
        {fields.map(f => {
          const val = data[f.key] ?? f.defaultValue ?? '';
          const isFullWidth = f.type === 'textarea' || (f.colSpan === 3);
          const isDoubleWidth = f.colSpan === 2 && !isFullWidth;

          if (isEdit && f.key === 'id') {
            // ID is read-only in edit mode
            return (
              <div key={f.key} className={isFullWidth ? 'col-span-3' : isDoubleWidth ? 'col-span-2' : ''}>
                <label className="text-[10px] text-white/50 mb-0.5 block font-medium">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={String(val)}
                  disabled
                  className="w-full text-[11px] bg-white/[0.02] border border-white/[0.06] rounded px-2 py-1.5 text-white/30 font-mono cursor-not-allowed"
                />
              </div>
            );
          }

          return (
            <div key={f.key} className={isFullWidth ? 'col-span-3' : isDoubleWidth ? 'col-span-2' : ''}>
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
                  className="w-full text-[11px] bg-gray-900 text-white border border-white/[0.1] rounded px-2 py-1.5 focus:outline-none focus:border-yellow-500/50 cursor-pointer"
                >
                  <option value="" className="bg-gray-900 text-white">— Nessuno —</option>
                  {f.options?.map(opt => {
                    const label = f.enumGroup ? getEnumLabel(f.enumGroup, opt) : opt;
                    const hint = f.enumGroup ? getEnumHint(f.enumGroup, opt) : undefined;
                    return (
                      <option key={opt} value={opt} className="bg-gray-900 text-white" title={hint}>
                        {label} ({opt})
                      </option>
                    );
                  })}
                </select>
              ) : f.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={e => handleChange(f.key, e.target.checked)}
                    className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-yellow-500 focus:ring-yellow-500/50 accent-yellow-500"
                  />
                  <span className="text-[10px] text-white/50">{val ? 'Sì' : 'No'}</span>
                </label>
              ) : f.type === 'entity-search' ? (
                <EntitySearchInput
                  value={String(val)}
                  onChange={v => handleChange(f.key, v)}
                  endpoint={f.entitySearchEndpoint ?? ''}
                  labelKey={f.entitySearchLabelKey ?? 'name'}
                  placeholder={f.placeholder}
                />
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
      <div className="flex gap-3 pt-3">
        <Button
          type="submit"
          className="flex-1 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30 hover:text-yellow-200"
        >
          <Save className="w-3.5 h-3.5" />
          {submitLabel}
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

// ═══════════════════════════════════════════════════════════════
// File Upload Section (for sounds/images)
// ═══════════════════════════════════════════════════════════════
function FileUploadSection({ tabId, onUploaded }: {
  tabId: 'sounds' | 'images';
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [metaId, setMetaId] = useState('');
  const [metaName, setMetaName] = useState('');
  const [metaRefKey, setMetaRefKey] = useState('');
  const [metaCategory, setMetaCategory] = useState('ui');
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

  const soundCategories = ['combat', 'enemy', 'weapon', 'ui', 'ambient', 'bgm'];
  const imageCategories = ['background', 'icon', 'portrait', 'sprite', 'ui'];

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
          onChange={e => {
            setFile(e.target.files?.[0] || null);
            if (e.target.files?.[0]) setMetaName(e.target.files[0].name.replace(/\.[^.]+$/, ''));
          }}
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
          className="text-[10px] bg-gray-900 text-white border border-white/[0.1] rounded px-2 py-1 focus:outline-none focus:border-cyan-500/50"
        >
          {(isSound ? soundCategories : imageCategories).map(c => (
            <option key={c} value={c} className="bg-gray-900 text-white">
              {getEnumLabel(isSound ? 'soundCategory' : 'imageCategory', c)} ({c})
            </option>
          ))}
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
              <input type="checkbox" checked={metaLoopable} onChange={e => setMetaLoopable(e.target.checked)} className="w-3 h-3 accent-yellow-500" />
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
      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 hover:text-cyan-200"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Caricamento...' : `Carica ${isSound ? 'Suono' : 'Immagine'} nel DB`}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════
function TableSkeleton() {
  return (
    <div className="space-y-2 px-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center px-3 py-2">
          <Skeleton className="h-4 w-10 rounded" />
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main AdminPanel
// ═══════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('items');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<TabId, number>>({
    items: 0, quests: 0, events: 0, documents: 0, sounds: 0, images: 0,
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const tabConfig = TABS.find(t => t.id === activeTab)!;
  const fields = FIELD_MAP[activeTab];
  const columns = TABLE_COLUMNS[activeTab];

  // Dialog state
  const dialogOpen = creating || editingId !== null;

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row => {
      const id = String(row.id ?? '').toLowerCase();
      const name = String(row.name ?? row.title ?? '').toLowerCase();
      const type = String(row.type ?? row.category ?? '').toLowerCase();
      return id.includes(q) || name.includes(q) || type.includes(q);
    });
  }, [data, searchQuery]);

  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  // Fetch counts from all endpoints in parallel
  const fetchCounts = useCallback(async () => {
    try {
      const responses = await Promise.allSettled(
        TABS.map(tab => fetch(tab.endpoint))
      );
      const newCounts: Record<string, number> = {};
      TABS.forEach((tab, idx) => {
        const result = responses[idx];
        if (result.status === 'fulfilled' && result.value.ok) {
          result.value.json().then(json => {
            const count = Array.isArray(json) ? json.length : 0;
            setCounts(prev => ({ ...prev, [tab.id]: count }));
          });
        }
        newCounts[tab.id] = 0;
      });
    } catch {
      // silent
    }
  }, []);

  // Fetch data for the active tab only
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(tabConfig.endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : [];
      setData(arr);
      // Update count for this tab too
      setCounts(prev => ({ ...prev, [activeTab]: arr.length }));
    } catch (err) {
      showStatus(`Errore caricamento: ${err}`, 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tabConfig.endpoint, activeTab, showStatus]);

  // When panel opens, fetch all counts + active tab data
  useEffect(() => {
    if (open) {
      fetchCounts();
      fetchData();
      setCreating(false);
      setEditingId(null);
      setSearchQuery('');
      setShowUpload(false);
    }
  }, [open, activeTab, fetchData, fetchCounts]);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus('Creato con successo!', 'success');
      setCreating(false);
      fetchData();
      fetchCounts();
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
      setEditingId(null);
      fetchData();
      fetchCounts();
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
      fetchData();
      fetchCounts();
    } catch (err) {
      showStatus(`Errore eliminazione: ${err}`, 'error');
    }
  };

  const handleRefreshGameData = async () => {
    setRefreshing(true);
    try {
      await refreshGameData();
      showStatus('Dati di gioco ricaricati!', 'success');
    } catch (err) {
      showStatus(`Errore refresh: ${err}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenCreate = () => {
    setCreating(true);
    setEditingId(null);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };

  const handleDialogClose = () => {
    setCreating(false);
    setEditingId(null);
  };

  const editingData = editingId
    ? (data.find(r => String(r.id) === editingId) as Record<string, unknown> || {})
    : {};

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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshGameData}
              disabled={refreshing}
              className="text-xs px-3 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-600/15 border border-cyan-500/25 bg-cyan-600/10"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh Game Data
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Vertical Sidebar ── */}
          <div className="w-[200px] shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setShowUpload(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/10 text-yellow-300 border-l-2 border-yellow-500'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border-l-2 border-transparent'
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="text-xs font-semibold flex-1 truncate">{tab.label}</span>
                <span className={`text-[10px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/20 text-yellow-200'
                    : 'bg-white/[0.06] text-white/30'
                }`}>
                  {counts[tab.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* ── Content Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Status message */}
            <AnimatePresence>
              {statusMsg && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className={`px-4 py-1.5 text-[10px] font-medium ${
                    statusMsg.type === 'success'
                      ? 'bg-green-500/10 text-green-300 border-b border-green-500/20'
                      : 'bg-red-500/10 text-red-300 border-b border-red-500/20'
                  }`}>
                    {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toolbar: Add + Search */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="text-xs gap-1.5 bg-yellow-600/15 border border-yellow-500/25 text-yellow-300 hover:bg-yellow-600/25 hover:text-yellow-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi Nuovo {tabConfig.entityLabel}
              </Button>

              {(activeTab === 'sounds' || activeTab === 'images') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpload(prev => !prev)}
                  className="text-xs gap-1.5 border-white/10 text-white/50 hover:text-white/70 hover:bg-white/[0.04] bg-white/[0.02]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </Button>
              )}

              <div className="flex-1" />
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cerca per ID o nome..."
                  className="w-full text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-white/70 placeholder-white/20 focus:outline-none focus:border-yellow-500/30"
                />
              </div>
            </div>

            {/* File Upload Section (expandable) */}
            <AnimatePresence>
              {(activeTab === 'sounds' || activeTab === 'images') && showUpload && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/[0.04]">
                    <FileUploadSection
                      tabId={activeTab as 'sounds' | 'images'}
                      onUploaded={() => { fetchData(); fetchCounts(); }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 admin-scrollbar">
              {loading ? (
                <TableSkeleton />
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-white/30 font-medium">
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun dato trovato'}
                  </p>
                  <p className="text-[10px] text-white/15">
                    {searchQuery ? 'Prova con un termine diverso' : `Crea il primo ${tabConfig.entityLabel.toLowerCase()} per iniziare`}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      {columns.map(col => (
                        <TableHead
                          key={col.key}
                          className={`text-[10px] font-semibold text-white/40 uppercase tracking-wider ${col.width ?? ''}`}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right w-32">
                        Azioni
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => {
                      const rowId = String(row.id ?? '');
                      return (
                        <TableRow
                          key={rowId}
                          className="border-white/[0.04] hover:bg-white/[0.03] group"
                        >
                          {columns.map(col => (
                            <TableCell key={col.key} className={`text-[11px] text-white/70 py-2 px-2 ${col.width ?? ''}`}>
                              {col.render
                                ? col.render(row, activeTab)
                                : String(row[col.key] ?? '—')
                              }
                            </TableCell>
                          ))}
                          <TableCell className="text-right py-2 px-2">
                            <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(rowId)}
                                className="h-7 px-2 text-[10px] gap-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                              >
                                <Pencil className="w-3 h-3" />
                                Modifica
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(rowId)}
                                className="h-7 px-2 text-[10px] gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3 h-3" />
                                Elimina
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-white/25">
                {data.length} record · {tabConfig.label}
                {searchQuery && ` · ${filteredData.length} filtrati`}
              </span>
              <button
                onClick={fetchData}
                className="text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ricarica
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
        <DialogContent
          className="bg-gray-900 border-white/[0.1] text-white max-w-5xl max-h-[85vh] overflow-hidden flex flex-col z-[120]"
          overlayClassName="z-[120]"
        >
          <DialogHeader>
            <DialogTitle className="text-yellow-400 text-base">
              {editingId ? `Modifica: ${editingId}` : `Nuovo ${tabConfig.entityLabel}`}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              {editingId
                ? 'Modifica i campi e premi Salva per aggiornare'
                : `Compila i campi per creare un nuovo ${tabConfig.entityLabel.toLowerCase()}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
            <EntityForm
              fields={fields}
              initialData={
                editingId
                  ? editingData
                  : Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? '']))
              }
              onSubmit={editingId ? handleUpdate : handleCreate}
              onCancel={handleDialogClose}
              submitLabel={editingId ? 'Salva Modifiche' : 'Crea'}
              isEdit={!!editingId}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
