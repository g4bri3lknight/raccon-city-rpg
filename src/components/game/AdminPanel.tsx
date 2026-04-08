'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Pencil, Trash2, Save, RotateCcw,
  Package, Scroll, Zap, FileText, Volume2, ImageIcon, RefreshCw, Loader2, Search, Play, Pause, Eye,
  Upload, CloudUpload, Music, Trash, CheckCircle2, AlertCircle, VolumeX, Bell, MapPin, Users, Swords, Database
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
type TabId = 'items' | 'quests' | 'events' | 'documents' | 'sounds' | 'images' | 'notifications' | 'locations' | 'npcs' | 'characters' | 'specials';

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
  { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-4 h-4" />, endpoint: '/api/admin/notifications', entityLabel: 'Notifica' },
  { id: 'locations', label: 'Location', icon: <MapPin className="w-4 h-4" />, endpoint: '/api/admin/locations', entityLabel: 'Location' },
  { id: 'npcs', label: 'NPC', icon: <Users className="w-4 h-4" />, endpoint: '/api/admin/npcs', entityLabel: 'NPC' },
  { id: 'characters', label: 'Personaggi', icon: <Swords className="w-4 h-4" />, endpoint: '/api/admin/characters', entityLabel: 'Personaggio' },
  { id: 'specials', label: 'Speciali', icon: <Zap className="w-4 h-4" />, endpoint: '/api/admin/specials', entityLabel: 'Abilità Speciale' },
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
  archetype: {
    tank:    { it: 'Tank' },
    healer:  { it: 'Medico' },
    dps:     { it: 'DPS' },
    control: { it: 'Controllo' },
    custom:  { it: 'Personalizzato' },
  },
  specialCategory: {
    offensive: { it: 'Offensivo' },
    defensive: { it: 'Difensivo' },
    support:   { it: 'Supporto' },
    control:   { it: 'Controllo' },
  },
  specialTargetType: {
    self:       { it: 'Sé Stesso' },
    enemy:      { it: 'Nemico' },
    ally:       { it: 'Alleato' },
    all_allies: { it: 'Tutti gli Alleati' },
  },
  statusEffect: {
    poison:   { it: 'Avvelenamento' },
    bleeding: { it: 'Sanguinamento' },
    stunned:  { it: 'Stordimento' },
    adrenaline: { it: 'Adrenalina' },
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
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'entity-search' | 'tag-editor' | 'item-pool' | 'text-list' | 'locked-locs' | 'sub-areas' | 'story-event' | 'status-apply';
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
  sounds: [],
  images: [],
  notifications: [],
  npcs: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: npc_marco' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Marco' },
    { key: 'portrait', label: 'Emoji Ritratto', type: 'text', placeholder: 'es: 🔧' },
    { key: 'locationId', label: 'Location ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/locations', entitySearchLabelKey: 'name', placeholder: 'es: city_outskirts', required: true, colSpan: 2 },
    { key: 'greeting', label: 'Saluto', type: 'textarea', placeholder: 'Primo messaggio quando il giocatore incontra l\'NPC...', colSpan: 3 },
    { key: 'dialogues', label: 'Dialoghi', type: 'text-list', colSpan: 3 },
    { key: 'farewell', label: 'Saluto Finale', type: 'textarea', placeholder: 'Messaggio quando il giocatore chiude la conversazione...', colSpan: 3 },
    { key: 'questId', label: 'Quest ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/quests', entitySearchLabelKey: 'name', placeholder: 'es: quest_marco_firstaid', colSpan: 2 },
    { key: 'tradeInventory', label: 'Inventario Scambi', type: 'textarea', placeholder: '[{"itemId":"ammo_pistol","priceItemId":"bandage","priceQuantity":3}]', colSpan: 3 },
    { key: 'questCompletedDialogue', label: 'Dialogo Post-Quest', type: 'text-list', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
  ],
  characters: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: tank, healer, dps, control' },
    { key: 'archetype', label: 'Archetipo', type: 'select', options: ['tank', 'healer', 'dps', 'control', 'custom'], enumGroup: 'archetype' },
    { key: 'name', label: 'Nome Ruolo', type: 'text', required: true, placeholder: 'es: Tank, Medico, DPS, Controllo' },
    { key: 'displayName', label: 'Nome Personaggio', type: 'text', required: true, placeholder: 'es: Viktor Stahl, Maren Voss' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione del personaggio...', colSpan: 3 },
    { key: 'maxHp', label: 'HP Massimo', type: 'number', defaultValue: 100 },
    { key: 'atk', label: 'ATK', type: 'number', defaultValue: 10 },
    { key: 'def', label: 'DEF', type: 'number', defaultValue: 10 },
    { key: 'spd', label: 'SPD', type: 'number', defaultValue: 10 },
    { key: 'specialName', label: 'Nome Speciale 1', type: 'text', placeholder: 'es: Barricata' },
    { key: 'specialDescription', label: 'Desc. Speciale 1', type: 'textarea', placeholder: 'Descrizione abilità speciale...', colSpan: 3 },
    { key: 'specialCost', label: 'Costo Speciale 1', type: 'number', defaultValue: 15 },
    { key: 'special2Name', label: 'Nome Speciale 2', type: 'text', placeholder: 'es: Immolazione' },
    { key: 'special2Description', label: 'Desc. Speciale 2', type: 'textarea', placeholder: 'Descrizione abilità speciale 2...', colSpan: 3 },
    { key: 'special2Cost', label: 'Costo Speciale 2', type: 'number', defaultValue: 15 },
    { key: 'passiveDescription', label: 'Passiva', type: 'textarea', placeholder: 'Descrizione abilità passiva...', colSpan: 3 },
    { key: 'portraitEmoji', label: 'Emoji Ritratto', type: 'text', placeholder: 'es: 🛡️' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
  ],
  locations: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: city_outskirts' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Periferia della Città' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione della location', colSpan: 3 },
    { key: 'encounterRate', label: 'Prob. Incontri %', type: 'number', defaultValue: 0 },
    { key: 'isBossArea', label: 'Area Boss', type: 'boolean', defaultValue: false },
    { key: 'bossId', label: 'Boss ID', type: 'text', placeholder: 'es: nemesis, tyrant' },
    { key: 'enemyPool', label: 'Pool Nemici', type: 'tag-editor', placeholder: 'es: zombie, zombie_dog, crow', colSpan: 3 },
    { key: 'itemPool', label: 'Pool Oggetti', type: 'item-pool', colSpan: 3 },
    { key: 'nextLocations', label: 'Location Uscite', type: 'tag-editor', placeholder: 'es: rpd_station, hospital_district', colSpan: 3 },
    { key: 'storyEvent', label: 'Evento Storia', type: 'story-event', colSpan: 3 },
    { key: 'ambientText', label: 'Testi Ambientali', type: 'text-list', colSpan: 3 },
    { key: 'lockedLocations', label: 'Location Bloccate', type: 'locked-locs', colSpan: 3 },
    { key: 'subAreas', label: 'Sotto-Aree', type: 'sub-areas', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
    { key: 'mapRow', label: 'Mappa Riga', type: 'number', placeholder: '0-3' },
    { key: 'mapCol', label: 'Mappa Colonna', type: 'number', placeholder: '0-3' },
    { key: 'mapIcon', label: 'Icona Mappa', type: 'text', placeholder: 'es: 🏙️' },
    { key: 'mapDanger', label: 'Pericolo Mappa', type: 'text', placeholder: 'es: basso, medio, alto, critico' },
  ],
  specials: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: colpo_mortale' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Colpo Mortale' },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 💀', colSpan: 2 },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione dell\'abilità...', colSpan: 3 },
    { key: 'category', label: 'Categoria', type: 'select', options: ['offensive', 'defensive', 'support', 'control'], enumGroup: 'specialCategory' },
    { key: 'targetType', label: 'Bersaglio', type: 'select', options: ['self', 'enemy', 'ally', 'all_allies'], enumGroup: 'specialTargetType' },
    { key: 'cooldown', label: 'Cooldown (turni)', type: 'number', defaultValue: 2 },
    { key: 'executionType', label: 'Tipo Esecuzione', type: 'text', placeholder: 'es: colpo_mortale (stesso dell\'ID)', colSpan: 2 },
    { key: 'powerMultiplier', label: 'Moltiplicatore Potere', type: 'number', placeholder: 'es: 1.6 (solo offensive)' },
    { key: 'healAmount', label: 'Quantità Cura', type: 'number', placeholder: 'es: 50 (solo healing/support)' },
    { key: 'statusToApply', label: 'Status Applicato', type: 'status-apply', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Media Upload Configurations per Entity
// ═══════════════════════════════════════════════════════════════
interface MediaUploadDef {
  key: string;          // unique key for this upload slot
  label: string;        // display label
  mediaType: 'image' | 'sound';
  category: string;     // game_images.category or game_sounds.category
  accept: string;       // MIME types for file input
  idTemplate: string;   // template: {entityId} gets replaced
  nameTemplate?: string;// display name template
  helpText?: string;    // optional tooltip
}

const MEDIA_UPLOADS: Record<TabId, MediaUploadDef[]> = {
  items: [
    {
      key: 'icon',
      label: 'Icona Oggetto',
      mediaType: 'image',
      category: 'icon',
      accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
      idTemplate: 'icon_{entityId}',
      nameTemplate: 'Icona: {entityId}',
      helpText: 'Immagine PNG/JPG 64×64 usata come icona nell\'inventario',
    },
    {
      key: 'sfx',
      label: 'Suono Pickup/uso',
      mediaType: 'sound',
      category: 'ui',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_{entityId}',
      nameTemplate: 'SFX: {entityId}',
      helpText: 'Suono riprodotto quando il giocatore raccoglie o usa l\'oggetto',
    },
  ],
  quests: [
    {
      key: 'complete',
      label: 'Suono Completamento',
      mediaType: 'sound',
      category: 'ui',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_quest_{entityId}',
      nameTemplate: 'Quest Done: {entityId}',
      helpText: 'Suono riprodotto quando la missione viene completata',
    },
  ],
  events: [
    {
      key: 'trigger',
      label: 'Suono Trigger Evento',
      mediaType: 'sound',
      category: 'ambient',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_event_{entityId}',
      nameTemplate: 'Event: {entityId}',
      helpText: 'Suono riprodotto quando l\'evento viene attivato',
    },
    {
      key: 'bg',
      label: 'Immagine Evento',
      mediaType: 'image',
      category: 'ui',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'img_event_{entityId}',
      nameTemplate: 'Event Img: {entityId}',
      helpText: 'Immagine di sfondo o illustrazione per l\'evento',
    },
  ],
  documents: [
    {
      key: 'photo',
      label: 'Foto/Immagine Documento',
      mediaType: 'image',
      category: 'portrait',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'doc_img_{entityId}',
      nameTemplate: 'Doc: {entityId}',
      helpText: 'Foto o immagine associata al documento',
    },
  ],
  sounds: [],
  images: [],
  notifications: [
    {
      key: 'img',
      label: 'Immagine',
      mediaType: 'image' as const,
      category: 'ui',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'notif_img_{entityId}',
      nameTemplate: 'Notif Img: {entityId}',
      helpText: 'Immagine personalizzata per questa notifica',
    },
    {
      key: 'sfx',
      label: 'Suono Notifica',
      mediaType: 'sound' as const,
      category: 'ui',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'notif_sfx_{entityId}',
      nameTemplate: 'Notif SFX: {entityId}',
      helpText: 'Suono personalizzato per questa notifica',
    },
  ],
  locations: [
    {
      key: 'bg',
      label: 'Sfondo Location',
      mediaType: 'image' as const,
      category: 'background',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'bg_{entityId}',
      nameTemplate: 'BG: {entityId}',
      helpText: 'Immagine di sfondo mostrata nell\'header della schermata di esplorazione (1920×600 consigliato)',
    },
  ],
  npcs: [
    {
      key: 'portrait',
      label: 'Ritratto NPC',
      mediaType: 'image' as const,
      category: 'portrait',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'portrait_{entityId}',
      nameTemplate: 'Ritratto: {entityId}',
      helpText: 'Immagine ritratto dell\'NPC mostrata nel dialogo (256×256 consigliato)',
    },
  ],
  characters: [
    {
      key: 'portrait',
      label: 'Ritratto Personaggio',
      mediaType: 'image' as const,
      category: 'portrait',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'char_{entityId}',
      nameTemplate: 'Char: {entityId}',
      helpText: 'Immagine ritratto del personaggio mostrata nella selezione (256×256 consigliato)',
    },
  ],
  specials: [
    {
      key: 'icon',
      label: 'Icona Abilità',
      mediaType: 'image' as const,
      category: 'icon',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: 'special_{entityId}',
      nameTemplate: 'Special: {entityId}',
      helpText: 'Immagine icona dell\'abilità speciale (64×64 consigliato)',
    },
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
    {
      key: '_preview',
      label: '',
      width: 'w-12',
      render: (row) => (
        <SoundPreviewButton soundId={String(row.id)} hasFile={typeof row.data === 'string'} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    { key: 'refKey', label: 'refKey', width: 'w-44' },
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
      width: 'w-20',
      render: (row) => (
        <span className={`text-[10px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
  images: [
    {
      key: '_preview',
      label: '',
      width: 'w-14',
      render: (row) => (
        <ImagePreviewThumbnail imageId={String(row.id)} hasFile={typeof row.data === 'string'} altText={String(row.altText ?? row.name ?? '')} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    { key: 'refKey', label: 'refKey', width: 'w-44' },
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
      width: 'w-20',
      render: (row) => (
        <span className={`text-[10px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
  notifications: [
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-36',
      render: (row) => {
        const t = String(row.type ?? '');
        const labels: Record<string, string> = {
          encounter: '⚔️ Incontro',
          victory: '🏆 Vittoria',
          defeat: '💀 Sconfitta',
          item_found: '📦 Oggetto',
          bag_expand: '🎒 Zaino',
          collectible_found: '💎 Collezionabile',
        };
        return <span className="text-[11px] text-white/70">{labels[t] || t}</span>;
      },
    },
    { key: 'label', label: 'Etichetta', width: 'w-36' },
    { key: 'icon', label: 'Icona', width: 'w-16' },
    {
      key: 'cardBg',
      label: 'Sfondo',
      width: 'w-12',
      render: (row) => (
        <div
          className="w-3 h-3 rounded-sm border border-white/10"
          style={{ backgroundColor: String(row.cardBg ?? '#1a1a2e') }}
          title={String(row.cardBg ?? '')}
        />
      ),
    },
    {
      key: 'titleColor',
      label: 'Titolo',
      width: 'w-12',
      render: (row) => (
        <div
          className="w-3 h-3 rounded-sm border border-white/10"
          style={{ backgroundColor: String(row.titleColor ?? '#ffffff') }}
          title={String(row.titleColor ?? '')}
        />
      ),
    },
    {
      key: 'shake',
      label: 'Shake',
      width: 'w-16',
      render: (row) => (
        <span className={row.shake ? 'text-orange-400 text-[10px]' : 'text-white/15 text-[10px]'}>
          {row.shake ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Durata',
      width: 'w-20',
      render: (row) => <span className="text-white/50 text-[11px]">{row.duration}ms</span>,
    },
    {
      key: 'media',
      label: 'Media',
      width: 'w-20',
      render: (row) => {
        const hasImg = !!row.imageRef;
        const hasSnd = !!row.soundRef;
        return (
          <div className="flex items-center gap-1">
            {hasImg ? <ImageIcon className="w-3 h-3 text-cyan-400/70" /> : <ImageIcon className="w-3 h-3 text-white/10" />}
            {hasSnd ? <Volume2 className="w-3 h-3 text-green-400/70" /> : <Volume2 className="w-3 h-3 text-white/10" />}
          </div>
        );
      },
    },
  ],
  locations: [
    {
      key: '_preview',
      label: '',
      width: 'w-20',
      render: (row) => (
        <LocationBgThumbnail locationId={String(row.id)} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-48' },
    {
      key: 'encounterRate',
      label: 'Incontri',
      width: 'w-20',
      render: (row) => {
        const rate = Number(row.encounterRate ?? 0);
        if (rate === 0) return <span className="text-[10px] text-white/20">—</span>;
        const color = rate >= 50 ? 'text-red-400' : rate >= 35 ? 'text-amber-400' : 'text-green-400';
        return <span className={`text-[11px] font-mono ${color}`}>{rate}%</span>;
      },
    },
    {
      key: 'isBossArea',
      label: 'Boss',
      width: 'w-16',
      render: (row) => (
        <span className={row.isBossArea ? 'text-red-400 text-[10px] font-bold' : 'text-white/15 text-[10px]'}>
          {row.isBossArea ? 'BOSS' : '—'}
        </span>
      ),
    },
    {
      key: 'nextLocations',
      label: 'Uscite',
      width: 'w-24',
      render: (row) => {
        let exits: string[] = [];
        try { exits = typeof row.nextLocations === 'string' ? JSON.parse(row.nextLocations) : (row.nextLocations as string[] ?? []); } catch { /* empty */ }
        return <span className="text-[10px] text-white/40 font-mono">{exits.length}</span>;
      },
    },
    {
      key: 'hasStoryEvent',
      label: 'Evento',
      width: 'w-16',
      render: (row) => {
        const hasEvent = !!row.storyEvent && String(row.storyEvent).trim() !== '' && String(row.storyEvent) !== '{}';
        return (
          <span className={hasEvent ? 'text-cyan-400 text-[10px]' : 'text-white/15 text-[10px]'}>
            {hasEvent ? '✓' : '—'}
          </span>
        );
      },
    },
  ],
  npcs: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome', width: 'w-36' },
    {
      key: 'portrait',
      label: 'Ritratto',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.portrait ?? '❓')}</span>,
    },
    {
      key: 'locationId',
      label: 'Location',
      width: 'w-40',
      render: (row) => <span className="text-[10px] text-white/50 font-mono">{String(row.locationId ?? '')}</span>,
    },
    {
      key: 'questId',
      label: 'Quest',
      width: 'w-16',
      render: (row) => (
        <span className={row.questId ? 'text-cyan-400 text-[10px]' : 'text-white/15 text-[10px]'}>
          {row.questId ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'dialogues',
      label: 'Dialoghi',
      width: 'w-16',
      render: (row) => {
        let count = 0;
        try { count = typeof row.dialogues === 'string' ? JSON.parse(row.dialogues).length : Array.isArray(row.dialogues) ? row.dialogues.length : 0; } catch { count = 0; }
        return <span className="text-[10px] text-white/40 font-mono">{count}</span>;
      },
    },
  ],
  characters: [
    { key: 'id', label: 'ID', width: 'w-28' },
    { key: 'displayName', label: 'Nome', width: 'w-36' },
    {
      key: 'archetype',
      label: 'Ruolo',
      width: 'w-28',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('archetype', String(row.archetype))}
        </Badge>
      ),
    },
    {
      key: 'portraitEmoji',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.portraitEmoji ?? '🎮')}</span>,
    },
    { key: 'name', label: 'Classe', width: 'w-28' },
    {
      key: 'maxHp',
      label: 'HP',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-green-400/70 font-mono">{row.maxHp}</span>,
    },
    {
      key: 'atk',
      label: 'ATK',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-red-400/70 font-mono">{row.atk}</span>,
    },
    {
      key: 'def',
      label: 'DEF',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-amber-400/70 font-mono">{row.def}</span>,
    },
    {
      key: 'spd',
      label: 'SPD',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-cyan-400/70 font-mono">{row.spd}</span>,
    },
  ],
  specials: [
    {
      key: '_icon',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.icon ?? '⚡')}</span>,
    },
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-28',
      render: (row) => {
        const cat = String(row.category ?? '');
        const catColors: Record<string, string> = {
          offensive: 'border-red-500/30 text-red-400 bg-red-500/10',
          defensive: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          support: 'border-green-500/30 text-green-400 bg-green-500/10',
          control: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
        };
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catColors[cat] ?? ''}`}>
            {getEnumLabel('specialCategory', cat)}
          </Badge>
        );
      },
    },
    {
      key: 'targetType',
      label: 'Bersaglio',
      width: 'w-28',
      render: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('specialTargetType', String(row.targetType))}
        </Badge>
      ),
    },
    {
      key: 'cooldown',
      label: 'CD',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-white/40 font-mono">{row.cooldown}t</span>,
    },
    {
      key: 'powerMultiplier',
      label: 'Potere',
      width: 'w-14',
      render: (row) => {
        const pm = row.powerMultiplier;
        if (pm == null) return <span className="text-[10px] text-white/10">—</span>;
        return <span className="text-[10px] text-red-400/70 font-mono">×{Number(pm).toFixed(1)}</span>;
      },
    },
    {
      key: 'healAmount',
      label: 'Cura',
      width: 'w-14',
      render: (row) => {
        const ha = row.healAmount;
        if (ha == null) return <span className="text-[10px] text-white/10">—</span>;
        return <span className="text-[10px] text-green-400/70 font-mono">+{ha}</span>;
      },
    },
    {
      key: 'hasStatus',
      label: 'Status',
      width: 'w-16',
      render: (row) => {
        const st = row.statusToApply;
        const hasStatus = st && typeof st === 'object' && st !== null && 'type' in st && (st as Record<string, unknown>).type;
        return (
          <span className={hasStatus ? 'text-orange-400 text-[10px]' : 'text-white/15 text-[10px]'}>
            {hasStatus ? '✓' : '—'}
          </span>
        );
      },
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
// Visual Pool Editors
// ═══════════════════════════════════════════════════════════════

/** Helper: parse a value that could be string JSON, string[], or unknown into string[] */
function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    if (val.trim() === '' || val.trim() === '[]') return [];
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
}

/** Tag Editor — for simple string arrays (enemyPool, nextLocations) */
function TagEditor({ value, onChange, placeholder }: { value: unknown; onChange: (v: string[]) => void; placeholder?: string }) {
  const tags = parseStringArray(value);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const v = inputVal.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
      setInputVal('');
      inputRef.current?.focus();
    }
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md bg-white/[0.04] border border-white/[0.1]">
        {tags.length === 0 && !inputVal && (
          <span className="text-[10px] text-white/20 italic">{placeholder ?? 'Premi Invio per aggiungere...'}</span>
        )}
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-300 font-mono group/tag">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-yellow-500/40 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={tags.length === 0 ? placeholder : 'Aggiungi...'}
          className="flex-1 min-w-[80px] text-[10px] bg-transparent border-none outline-none text-white/70 placeholder-white/20 font-mono"
        />
      </div>
      <p className="text-[9px] text-white/15">Premi <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/25 font-mono">Invio</kbd> per aggiungere</p>
    </div>
  );
}

/** Item Pool Editor — table with itemId, chance%, quantity */
function ItemPoolEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; chance: number; quantity: number }[]) => void }) {
  let items: { itemId: string; chance: number; quantity: number }[] = [];
  if (Array.isArray(value)) {
    items = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), chance: Number(o.chance ?? 0), quantity: Number(o.quantity ?? 1) };
      }
      return { itemId: String(r), chance: 0, quantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { items = JSON.parse(value) || []; } catch { items = []; }
  }

  const addItem = () => {
    onChange([...items, { itemId: '', chance: 30, quantity: 1 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: string | number) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: val } : item);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Chance %</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.itemId}
                    onChange={e => updateItem(i, 'itemId', e.target.value)}
                    placeholder="ammo_pistol"
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.chance}
                    onChange={e => updateItem(i, 'chance', Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">
                  Nessun oggetto — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi oggetto
      </button>
    </div>
  );
}

/** Text List Editor — for ambient text (array of strings) */
function TextListEditor({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
  const texts = parseStringArray(value);

  const addText = () => onChange([...texts, '']);
  const removeText = (idx: number) => onChange(texts.filter((_, i) => i !== idx));
  const updateText = (idx: number, val: string) => {
    const updated = texts.map((t, i) => i === idx ? val : t);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <div className="space-y-1 max-h-48 overflow-y-auto admin-scrollbar">
        {texts.map((text, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="shrink-0 w-5 text-[9px] text-white/20 font-mono pt-1.5">{i + 1}.</span>
            <textarea
              value={text}
              onChange={e => updateText(i, e.target.value)}
              placeholder={`Testo ambientale ${i + 1}...`}
              rows={2}
              className="flex-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y focus:outline-none focus:border-yellow-500/40 italic"
            />
            <button type="button" onClick={() => removeText(i)} className="shrink-0 mt-1.5 text-white/15 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {texts.length === 0 && (
          <p className="text-[10px] text-white/15 italic text-center py-2">Nessun testo — clicca + per aggiungere</p>
        )}
      </div>
      <button
        type="button"
        onClick={addText}
        className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi testo
      </button>
    </div>
  );
}

/** Locked Locations Editor — table with locationId, requiredItemId, lockedMessage */
function LockedLocsEditor({ value, onChange }: { value: unknown; onChange: (v: { locationId: string; requiredItemId: string; lockedMessage: string }[]) => void }) {
  let locs: { locationId: string; requiredItemId: string; lockedMessage: string }[] = [];
  if (Array.isArray(value)) {
    locs = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { locationId: String(o.locationId ?? ''), requiredItemId: String(o.requiredItemId ?? ''), lockedMessage: String(o.lockedMessage ?? '') };
      }
      return { locationId: String(r), requiredItemId: '', lockedMessage: '' };
    });
  } else if (typeof value === 'string') {
    try { locs = JSON.parse(value) || []; } catch { locs = []; }
  }

  const add = () => onChange([...locs, { locationId: '', requiredItemId: '', lockedMessage: '' }]);
  const remove = (idx: number) => onChange(locs.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(locs.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Location ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Item Richiesto</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Msg Blocco</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {locs.map((loc, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <input type="text" value={loc.locationId} onChange={e => update(i, 'locationId', e.target.value)} placeholder="lab" className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={loc.requiredItemId} onChange={e => update(i, 'requiredItemId', e.target.value)} placeholder="key_lab" className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={loc.lockedMessage} onChange={e => update(i, 'lockedMessage', e.target.value)} placeholder="La porta è chiusa a chiave..." className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {locs.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">Nessuna location bloccata</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi blocco
      </button>
    </div>
  );
}

/** Sub Areas Editor — table with id, name, description */
function SubAreasEditor({ value, onChange }: { value: unknown; onChange: (v: { id: string; name: string; description: string }[]) => void }) {
  let areas: { id: string; name: string; description: string }[] = [];
  if (Array.isArray(value)) {
    areas = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { id: String(o.id ?? ''), name: String(o.name ?? ''), description: String(o.description ?? '') };
      }
      return { id: String(r), name: '', description: '' };
    });
  } else if (typeof value === 'string') {
    try { areas = JSON.parse(value) || []; } catch { areas = []; }
  }

  const add = () => onChange([...areas, { id: '', name: '', description: '' }]);
  const remove = (idx: number) => onChange(areas.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string) => {
    onChange(areas.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">ID</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Nome</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Descrizione</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <input type="text" value={area.id} onChange={e => update(i, 'id', e.target.value)} placeholder="safe_room" className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={area.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Safe Room" className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <input type="text" value={area.description} onChange={e => update(i, 'description', e.target.value)} placeholder="Un rifugio sicuro..." className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40" />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {areas.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">Nessuna sotto-area</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors">
        <Plus className="w-3 h-3" /> Aggiungi sotto-area
      </button>
    </div>
  );
}

/** Status Apply Editor — for special ability status effects {type, chance} */
function StatusApplyEditor({ value, onChange }: { value: unknown; onChange: (v: { type: string; chance: number } | null) => void }) {
  let current: { type: string; chance: number } | null = null;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    current = { type: String(o.type ?? ''), chance: Number(o.chance ?? 0) };
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && trimmed !== '{}' && trimmed !== '[]') {
      try { const parsed = JSON.parse(trimmed); if (parsed?.type) current = { type: String(parsed.type), chance: Number(parsed.chance ?? 0) }; } catch { /* empty */ }
    }
  }

  const [enabled, setEnabled] = useState(!!current);
  const [statusType, setStatusType] = useState(current?.type ?? '');
  const [chance, setChance] = useState(current?.chance ?? 50);

  useEffect(() => {
    if (current) {
      setEnabled(true);
      setStatusType(current.type);
      setChance(current.chance);
    }
  }, [current]);

  const toggleEnabled = () => {
    if (enabled) {
      setEnabled(false);
      onChange(null);
    } else {
      setEnabled(true);
      const newVal = { type: statusType || 'poison', chance };
      onChange(newVal);
    }
  };

  const handleTypeChange = (t: string) => {
    setStatusType(t);
    onChange({ type: t, chance });
  };

  const handleChanceChange = (c: number) => {
    setChance(c);
    onChange({ type: statusType, chance: c });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggleEnabled}
            className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-orange-500"
          />
          <span className="text-[9px] text-white/40">Applica status negativo al bersaglio</span>
        </label>
      </div>
      {enabled && (
        <div className="rounded-md border border-orange-500/15 bg-orange-500/[0.02] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] text-white/30 mb-0.5 block">Tipo Status</label>
              <select
                value={statusType}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full text-[10px] bg-gray-900 text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-orange-500/40 cursor-pointer"
              >
                <option value="poison">Avvelenamento</option>
                <option value="bleeding">Sanguinamento</option>
                <option value="stunned">Stordimento</option>
                <option value="adrenaline">Adrenalina</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] text-white/30 mb-0.5 block">Probabilità %</label>
              <input
                type="number"
                value={chance}
                onChange={e => handleChanceChange(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-orange-500/40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Story Event Editor
// ═══════════════════════════════════════════════════════════════

interface StoryEventData {
  title: string;
  description: string;
  choices: {
    text: string;
    outcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
      triggerCombat?: boolean;
      combatEnemyIds?: string[];
    };
  }[];
  puzzle?: {
    type: 'combination' | 'sequence' | 'key_required';
    requiredItemId?: string;
    requiredItemIds?: string[];
    successOutcome: {
      description: string;
      hpChange?: number;
      receiveItems?: { itemId: string; quantity: number }[];
    };
    failMessage: string;
    combinationCode?: string;
    sequencePattern?: string[];
  };
}

function parseStoryEvent(val: unknown): StoryEventData | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as StoryEventData;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return null;
    try { return JSON.parse(trimmed) as StoryEventData; } catch { return null; }
  }
  return null;
}

function StoryEventEditor({ value, onChange }: { value: unknown; onChange: (v: StoryEventData | null) => void }) {
  const [event, setEvent] = useState<StoryEventData | null>(() => parseStoryEvent(value));
  const [collapsed, setCollapsed] = useState(false);

  const updateEvent = (patch: Partial<StoryEventData>) => {
    const updated = { ...event!, ...patch } as StoryEventData;
    setEvent(updated);
    onChange(updated);
  };

  const addChoice = () => {
    const newChoice = {
      text: '',
      outcome: { description: '' } as StoryEventData['choices'][0]['outcome'],
    };
    updateEvent({ choices: [...(event?.choices ?? []), newChoice] });
  };

  const removeChoice = (idx: number) => {
    updateEvent({ choices: (event?.choices ?? []).filter((_, i) => i !== idx) });
  };

  const updateChoice = (idx: number, field: string, val: unknown) => {
    const choices = [...(event?.choices ?? [])];
    if (field === 'text') {
      choices[idx] = { ...choices[idx], text: val as string };
    } else if (field.startsWith('outcome.')) {
      const outcomeField = field.replace('outcome.', '');
      choices[idx] = { ...choices[idx], outcome: { ...choices[idx].outcome, [outcomeField]: val } };
    }
    updateEvent({ choices });
  };

  const addRewardItem = (choiceIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    choices[choiceIdx] = {
      ...outcome,
      outcome: { ...outcome.outcome, receiveItems: [...(outcome.outcome.receiveItems ?? []), { itemId: '', quantity: 1 }] },
    };
    updateEvent({ choices });
  };

  const removeRewardItem = (choiceIdx: number, itemIdx: number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).filter((_, i) => i !== itemIdx);
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const updateRewardItem = (choiceIdx: number, itemIdx: number, field: 'itemId' | 'quantity', val: string | number) => {
    const choices = [...(event?.choices ?? [])];
    const outcome = choices[choiceIdx];
    if (!outcome) return;
    const items = (outcome.outcome.receiveItems ?? []).map((item, i) =>
      i === itemIdx ? { ...item, [field]: val } : item
    );
    choices[choiceIdx] = { ...outcome, outcome: { ...outcome.outcome, receiveItems: items } };
    updateEvent({ choices });
  };

  const togglePuzzle = () => {
    if (event?.puzzle) {
      const { puzzle, ...rest } = event;
      const updated = rest as StoryEventData;
      setEvent(updated);
      onChange(updated);
    } else {
      const updated = {
        ...event!,
        puzzle: {
          type: 'combination' as const,
          successOutcome: { description: '' },
          failMessage: '',
        },
      };
      setEvent(updated);
      onChange(updated);
    }
  };

  const updatePuzzle = (field: string, val: unknown) => {
    if (!event) return;
    const puzzle = { ...event.puzzle!, [field]: val };
    const updated = { ...event, puzzle };
    setEvent(updated);
    onChange(updated);
  };

  const enableEvent = () => {
    const newEvent: StoryEventData = { title: '', description: '', choices: [] };
    setEvent(newEvent);
    onChange(newEvent);
  };

  const disableEvent = () => {
    setEvent(null);
    onChange(null);
  };

  if (!event) {
    return (
      <div className="space-y-1.5">
        <div className="rounded-md border border-dashed border-white/[0.08] p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] text-white/20 italic mb-2">Nessun evento storia configurato</p>
            <button
              type="button"
              onClick={enableEvent}
              className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors mx-auto"
            >
              <Plus className="w-3 h-3" /> Crea Evento Storia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.02] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-cyan-400/70 hover:text-cyan-400 transition-colors">
            {collapsed ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <span className="text-[10px] font-semibold text-cyan-300/80 uppercase tracking-wider">Evento Storia</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/20 text-cyan-400/60 bg-cyan-500/10">
            {(event.choices ?? []).length} scelte
          </Badge>
        </div>
        <button type="button" onClick={disableEvent} className="flex items-center gap-1 text-[9px] text-red-400/50 hover:text-red-400 transition-colors">
          <Trash2 className="w-3 h-3" /> Rimuovi
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-[9px] text-white/40 mb-0.5 block">Titolo Evento</label>
              <input
                type="text"
                value={event.title ?? ''}
                onChange={e => updateEvent({ title: e.target.value })}
                placeholder="es: Primo Contatto"
                className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/15 focus:outline-none focus:border-cyan-500/40"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/40 mb-0.5 block">Descrizione</label>
              <textarea
                value={event.description ?? ''}
                onChange={e => updateEvent({ description: e.target.value })}
                placeholder="Testo narrativo introduttivo dell'evento..."
                rows={3}
                className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y italic focus:outline-none focus:border-cyan-500/40"
              />
            </div>
          </div>

          {/* Choices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">Scelte</span>
              <button type="button" onClick={addChoice} className="flex items-center gap-1 text-[9px] text-cyan-400/60 hover:text-cyan-400 transition-colors">
                <Plus className="w-3 h-3" /> Aggiungi scelta
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto admin-scrollbar space-y-2">
              {(event.choices ?? []).map((choice, ci) => (
                <div key={ci} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-yellow-500/20 text-yellow-400/60 bg-yellow-500/10">
                      Scelta {ci + 1}
                    </Badge>
                    <button type="button" onClick={() => removeChoice(ci)} className="text-white/15 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={choice.text ?? ''}
                    onChange={e => updateChoice(ci, 'text', e.target.value)}
                    placeholder="Testo del pulsante scelta..."
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40"
                  />

                  {/* Outcome */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-white/[0.06]">
                    <span className="text-[8px] text-white/25 uppercase tracking-wider">Risultato</span>
                    <textarea
                      value={choice.outcome?.description ?? ''}
                      onChange={e => updateChoice(ci, 'outcome.description', e.target.value)}
                      placeholder="Descrizione del risultato..."
                      rows={2}
                      className="w-full text-[10px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-yellow-500/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[8px] text-white/25">HP ±</label>
                        <input
                          type="number"
                          value={choice.outcome?.hpChange ?? 0}
                          onChange={e => updateChoice(ci, 'outcome.hpChange', Number(e.target.value))}
                          className="w-16 text-[10px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/60 font-mono focus:outline-none focus:border-yellow-500/30"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!choice.outcome?.triggerCombat}
                          onChange={e => updateChoice(ci, 'outcome.triggerCombat', e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-red-500"
                        />
                        <span className="text-[8px] text-white/30">Combattimento</span>
                      </label>
                      {choice.outcome?.triggerCombat && (
                        <input
                          type="text"
                          value={(choice.outcome?.combatEnemyIds ?? []).join(', ')}
                          onChange={e => updateChoice(ci, 'outcome.combatEnemyIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="nemico1, nemico2"
                          className="flex-1 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder-white/10 font-mono focus:outline-none focus:border-yellow-500/30"
                        />
                      )}
                    </div>

                    {/* Reward Items */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/20">Ricompense</span>
                        <button type="button" onClick={() => addRewardItem(ci)} className="text-[8px] text-green-400/50 hover:text-green-400 transition-colors">
                          + oggetto
                        </button>
                      </div>
                      {(choice.outcome?.receiveItems ?? []).map((ri, riIdx) => (
                        <div key={riIdx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={ri.itemId}
                            onChange={e => updateRewardItem(ci, riIdx, 'itemId', e.target.value)}
                            placeholder="itemId"
                            className="flex-1 text-[9px] bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 text-white/50 placeholder-white/10 font-mono focus:outline-none focus:border-green-500/30"
                          />
                          <input
                            type="number"
                            value={ri.quantity}
                            onChange={e => updateRewardItem(ci, riIdx, 'quantity', Number(e.target.value))}
                            min={1}
                            className="w-14 text-[9px] bg-white/[0.03] border border-white/[0.06] rounded px-1 py-0.5 text-white/50 font-mono focus:outline-none focus:border-green-500/30"
                          />
                          <button type="button" onClick={() => removeRewardItem(ci, riIdx)} className="text-white/10 hover:text-red-400 transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {(event.choices ?? []).length === 0 && (
                <p className="text-[10px] text-white/15 italic text-center py-2">Nessuna scelta — aggiungine almeno una</p>
              )}
            </div>
          </div>

          {/* Puzzle section */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">Puzzle Collegato</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!event.puzzle}
                  onChange={togglePuzzle}
                  className="w-3.5 h-3.5 rounded bg-white/[0.04] border-white/[0.2] accent-purple-500"
                />
                <span className="text-[9px] text-white/30">Abilita Puzzle</span>
              </label>
            </div>
            {event.puzzle && (
              <div className="mt-2 space-y-2 rounded-md border border-purple-500/15 bg-purple-500/[0.02] p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-white/30 mb-0.5 block">Tipo Puzzle</label>
                    <select
                      value={event.puzzle.type ?? 'combination'}
                      onChange={e => updatePuzzle('type', e.target.value)}
                      className="w-full text-[10px] bg-gray-900 text-white border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-purple-500/40 cursor-pointer"
                    >
                      <option value="combination">Combinazione (codice)</option>
                      <option value="sequence">Sequenza (frecce)</option>
                      <option value="key_required">Chiave richiesta</option>
                    </select>
                  </div>
                  {(event.puzzle.type === 'combination' || event.puzzle.type === 'sequence') && event.puzzle.type === 'combination' && (
                    <div>
                      <label className="text-[8px] text-white/30 mb-0.5 block">Codice Segreto</label>
                      <input
                        type="text"
                        value={event.puzzle.combinationCode ?? ''}
                        onChange={e => updatePuzzle('combinationCode', e.target.value)}
                        placeholder="1974"
                        className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-purple-500/40"
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'sequence' && (
                    <div>
                      <label className="text-[8px] text-white/30 mb-0.5 block">Pattern Sequenza (JSON)</label>
                      <input
                        type="text"
                        value={JSON.stringify(event.puzzle.sequencePattern ?? [])}
                        onChange={e => {
                          try {
                            const arr = JSON.parse(e.target.value);
                            if (Array.isArray(arr)) updatePuzzle('sequencePattern', arr);
                          } catch { /* ignore */ }
                        }}
                        placeholder='["up","down","left","right"]'
                        className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-purple-500/40"
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'key_required' && (
                    <>
                      <div className="col-span-1">
                        <label className="text-[8px] text-white/30 mb-0.5 block">Item Richiesto</label>
                        <input
                          type="text"
                          value={event.puzzle.requiredItemId ?? ''}
                          onChange={e => updatePuzzle('requiredItemId', e.target.value)}
                          placeholder="key_lab"
                          className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-purple-500/40"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[8px] text-white/30 mb-0.5 block">Oppure Items Multipli (JSON)</label>
                        <input
                          type="text"
                          value={JSON.stringify(event.puzzle.requiredItemIds ?? [])}
                          onChange={e => {
                            try {
                              const arr = JSON.parse(e.target.value);
                              if (Array.isArray(arr)) updatePuzzle('requiredItemIds', arr);
                            } catch { /* ignore */ }
                          }}
                          placeholder='["key_lab","key_red"]'
                          className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 font-mono placeholder-white/10 focus:outline-none focus:border-purple-500/40"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-[8px] text-white/30 mb-0.5 block">Messaggio Fallimento</label>
                  <input
                    type="text"
                    value={event.puzzle.failMessage ?? ''}
                    onChange={e => updatePuzzle('failMessage', e.target.value)}
                    placeholder="Codice errato! La serratura non si muove."
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/60 placeholder-white/10 focus:outline-none focus:border-purple-500/40"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-white/30 mb-0.5 block">Descrizione Successo</label>
                  <textarea
                    value={event.puzzle?.successOutcome?.description ?? ''}
                    onChange={e => updatePuzzle('successOutcome', { ...(event.puzzle?.successOutcome ?? {}), description: e.target.value })}
                    placeholder="La serratura si apre con un click..."
                    rows={2}
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/60 placeholder-white/10 resize-y italic focus:outline-none focus:border-purple-500/30"
                  />
                </div>
              </div>
            )}
          </div>
        </>
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
  activeTab,
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
  activeTab: TabId;
}) {
  const [data, setData] = useState<Record<string, unknown>>({ ...initialData });
  const mediaUploads = MEDIA_UPLOADS[activeTab];

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
          const isFullWidth = f.type === 'textarea' || f.type === 'tag-editor' || f.type === 'item-pool' || f.type === 'text-list' || f.type === 'locked-locs' || f.type === 'sub-areas' || f.type === 'story-event' || f.type === 'status-apply' || (f.colSpan === 3);
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
              ) : f.type === 'tag-editor' ? (
                <TagEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'item-pool' ? (
                <ItemPoolEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'text-list' ? (
                <TextListEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'locked-locs' ? (
                <LockedLocsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'sub-areas' ? (
                <SubAreasEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'story-event' ? (
                <StoryEventEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'status-apply' ? (
                <StatusApplyEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
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

      {/* ═══ Media Uploads Section ═══ */}
      {mediaUploads.length > 0 && (
        <div className="mt-2 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <CloudUpload className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Media Upload</span>
            <span className="text-[9px] text-white/15">— immagini e suoni associati a questa entità</span>
          </div>
          <div className="space-y-3">
            {mediaUploads.map(mu => (
              <MediaUploadBox
                key={mu.key}
                config={mu}
                entityId={typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null}
              />
            ))}
          </div>
        </div>
      )}

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
// Media Upload Box Component
// ═══════════════════════════════════════════════════════════════
function MediaUploadBox({
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
    fetch(endpoint)
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

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
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
      await fetch(`${endpoint}?id=${encodeURIComponent(mediaId)}`, { method: 'DELETE' });
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
        <p className="text-[10px] text-white/20 italic">Salva l\'entità prima di caricare i media</p>
      </div>
    );
  }

  return (
    <div className="col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {config.mediaType === 'image' ? (
            <ImageIcon className="w-4 h-4 text-cyan-400/70" />
          ) : (
            <Volume2 className="w-4 h-4 text-green-400/70" />
          )}
          <span className="text-[11px] font-semibold text-white/70">{config.label}</span>
          {config.helpText && (
            <span className="text-[9px] text-white/25 ml-1" title={config.helpText}>(?)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {checkingExisting ? (
            <span className="text-[9px] text-white/20">Controllo...</span>
          ) : hasExisting ? (
            <span className="flex items-center gap-1 text-[9px] text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> File presente
            </span>
          ) : null}
          {hasExisting && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[9px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2 py-0.5 rounded-full transition-colors"
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
          <span className="text-[10px] text-white/30 font-mono">{mediaId}</span>
        </div>
      )}
      {hasExisting && config.mediaType === 'sound' && (
        <div className="mb-3 flex items-center gap-3">
          <SoundPreviewButton soundId={mediaId} hasFile={true} />
          <span className="text-[10px] text-white/30 font-mono">{mediaId}</span>
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
            ? 'border-yellow-500/40 bg-yellow-500/5'
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
            <Loader2 className="w-4 h-4 animate-spin text-yellow-400/70" />
            <span className="text-[11px] text-white/50">Caricamento...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1">
            <CloudUpload className={`w-4 h-4 ${dragOver ? 'text-yellow-400/70' : 'text-white/20'}`} />
            <span className="text-[11px] text-white/40">
              {hasExisting ? 'Trascina per sostituire' : 'Trascina un file o clicca per selezionare'}
            </span>
          </div>
        )}
        {file && (
          <p className="text-[9px] text-white/25 mt-1 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        )}
      </div>

      {/* Upload result message */}
      {uploadResult && (
        <div className={`mt-2 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${
          uploadResult.success
            ? 'text-green-400/70 bg-green-500/5'
            : 'text-red-400/70 bg-red-500/5'
        }`}>
          {uploadResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {uploadResult.msg}
        </div>
      )}

      {/* Help text */}
      <p className="mt-2 text-[9px] text-white/15">
        ID media: <span className="font-mono text-white/25">{mediaId}</span>
        {' · '}
        Accettati: {config.accept.split(',').map(t => t.split('/')[1]).join(', ')}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sound Preview Button
// ═══════════════════════════════════════════════════════════════
function SoundPreviewButton({ soundId, hasFile }: { soundId: string; hasFile: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!hasFile) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    } else {
      const audio = new Audio(`/api/media/sound?ref=${encodeURIComponent(soundId)}`);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={togglePlay}
      disabled={!hasFile}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        hasFile
          ? playing
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            : 'bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] border border-white/[0.08]'
          : 'bg-white/[0.02] text-white/10 cursor-not-allowed border border-white/[0.04]'
      }`}
      title={hasFile ? (playing ? 'Ferma' : 'Riproduci') : 'Nessun file'}
    >
      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Image Preview Thumbnail
// ═══════════════════════════════════════════════════════════════
function ImagePreviewThumbnail({ imageId, hasFile, altText }: { imageId: string; hasFile: boolean; altText: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!hasFile) {
    return (
      <div className="w-10 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLightbox(true)}
        className="w-10 h-10 rounded-md overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors"
        title={altText || 'Visualizza immagine'}
      >
        {!imgError ? (
          <img
            src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
            alt={altText || imageId}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-white/20" />
          </div>
        )}
      </button>
      {showLightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
              alt={altText || imageId}
              className="max-w-full max-h-[75vh] rounded-lg border border-white/[0.1] shadow-2xl"
            />
            <p className="text-xs text-white/40 text-center mt-2 font-mono">{imageId}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Notification Preview Card (static, no animations)
// ═══════════════════════════════════════════════════════════════
function NotificationPreviewCard({ config }: { config: Record<string, unknown> }) {
  const cardBg = String(config.cardBg ?? '#1a1a2e');
  const borderColor = String(config.borderColor ?? '#333333');
  const titleColor = String(config.titleColor ?? '#ffffff');
  const titleGlow = String(config.titleGlow ?? 'none');
  const scanlineColor = String(config.scanlineColor ?? 'rgba(255,255,255,0.3)');
  const label = String(config.label ?? '');
  const icon = String(config.icon ?? '✨');
  const overlayBg = String(config.overlayBg ?? 'rgba(0,0,0,0.8)');
  const notifType = String(config.type ?? 'item_found');
  const notifId = String(config.id ?? 'notif_preview');

  // Type-specific sample text
  const SAMPLE_TEXTS: Record<string, { title: string; sub: string }> = {
    encounter: { title: 'Nemico Avvistato!', sub: 'Un mostro blocca la strada...' },
    victory: { title: 'Vittoria!', sub: 'Nemico sconfitto · Bottino ottenuto' },
    defeat: { title: 'Sconfitta...', sub: '"S.T.A.R.S...."' },
    item_found: { title: 'Oggetto Trovato', sub: 'Aggiunto all\'inventario' },
    bag_expand: { title: 'Zaino Espanso!', sub: 'Slot aggiunti: +4' },
    collectible_found: { title: 'Collezionabile!', sub: 'Pezzo raro trovato' },
  };
  const sample = SAMPLE_TEXTS[notifType] || { title: 'Messaggio di esempio', sub: 'Testo secondario opzionale' };

  // Image from DB if uploaded
  const imageRef = String(config.imageRef ?? '');
  const hasImage = imageRef.length > 0;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: overlayBg }}>
      {/* Scanline */}
      <div
        className="absolute inset-x-0 top-1/2 h-[1px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${scanlineColor}, transparent)` }}
      />
      {/* Card */}
      <div
        className="relative mx-6 my-6 px-8 py-4 rounded-xl border text-center"
        style={{
          background: cardBg,
          borderColor: borderColor,
          boxShadow: `0 0 30px ${borderColor}40`,
        }}
      >
        {/* Icon or uploaded image */}
        {hasImage ? (
          <div className="flex justify-center mb-1">
            <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-black/30">
              <img
                src={`/api/media/image?ref=${encodeURIComponent(imageRef)}`}
                alt="Notifica"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        ) : (
          <div className="text-2xl mb-1">{icon || '✨'}</div>
        )}
        {/* Label */}
        {label && (
          <div
            className="text-[8px] uppercase tracking-[0.2em] mb-0.5 opacity-70"
            style={{ color: titleColor }}
          >
            {label}
          </div>
        )}
        {/* Title */}
        <div
          className="font-black tracking-wider uppercase text-sm"
          style={{
            color: titleColor,
            textShadow: titleGlow === 'none' ? undefined : titleGlow,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {sample.title}
        </div>
        {/* Sub message */}
        <div className="text-[10px] mt-1 text-gray-400">{sample.sub}</div>
        {/* Type badge */}
        <div className="mt-2">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/25 font-mono">
            {notifType}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Location Background Thumbnail
// ═══════════════════════════════════════════════════════════════
function LocationBgThumbnail({ locationId }: { locationId: string }) {
  const [hasBg, setHasBg] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageId = `bg_${locationId}`;

  useEffect(() => {
    // Check if image exists in DB
    fetch('/api/admin/images')
      .then(res => res.json())
      .then(items => {
        const found = Array.isArray(items) && items.some((r: Record<string, unknown>) => r.id === imageId && r.data);
        setHasBg(found);
      })
      .catch(() => setHasBg(false));
  }, [imageId]);

  if (!hasBg) {
    return (
      <div className="w-16 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <div
      className="w-16 h-10 rounded-md overflow-hidden border border-white/[0.08]"
      style={{ backgroundImage: `url('/api/media/image?id=${encodeURIComponent(imageId)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      onError={() => setImgError(true)}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Notification Edit Dialog
// ═══════════════════════════════════════════════════════════════
function NotificationEditDialog({
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
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">ID</label>
          <input
            type="text"
            value={String(form.id ?? '')}
            disabled={isEdit}
            onChange={e => handleChange('id', e.target.value)}
            placeholder="es: notif_encounter"
            className={isEdit
              ? 'w-full text-[11px] bg-white/[0.02] border border-white/[0.06] rounded px-2 py-1.5 text-white/30 font-mono cursor-not-allowed'
              : 'w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono'
            }
          />
        </div>
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Tipo <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={String(form.type ?? '')}
            onChange={e => handleChange('type', e.target.value)}
            placeholder="es: encounter"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>

        {/* Row 2: Label + Icon */}
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Etichetta</label>
          <input
            type="text"
            value={String(form.label ?? '')}
            onChange={e => handleChange('label', e.target.value)}
            placeholder='es: ⚠ INCONTRO ⚠'
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Icona</label>
          <input
            type="text"
            value={String(form.icon ?? '')}
            onChange={e => handleChange('icon', e.target.value)}
            placeholder="es: 🔥"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        {/* Row 2.5: imageRef + soundRef */}
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Ref Immagine</label>
          <input
            type="text"
            value={String(form.imageRef ?? '')}
            onChange={e => handleChange('imageRef', e.target.value)}
            placeholder="ID immagine (es: notif_img_notif_encounter)"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Ref Suono</label>
          <input
            type="text"
            value={String(form.soundRef ?? '')}
            onChange={e => handleChange('soundRef', e.target.value)}
            placeholder="ID suono (es: notif_sfx_notif_encounter)"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>

        {/* Row 3: Color pickers - cardBg + borderColor */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Sfondo Scheda</label>
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
                className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
              />
            </div>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Colore Bordo</label>
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
                className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Row 4: titleColor + scanlineColor */}
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Colore Titolo</label>
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
              className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Colore Scanline</label>
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
              className="flex-1 min-w-0 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
            />
          </div>
        </div>

        {/* Row 5: titleGlow (text) + overlayBg (text) */}
        <div className="col-span-2">
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Title Glow (CSS text-shadow)</label>
          <input
            type="text"
            value={String(form.titleGlow ?? 'none')}
            onChange={e => handleChange('titleGlow', e.target.value)}
            placeholder="0 0 30px rgba(239,68,68,0.7)"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Overlay Background (CSS)</label>
          <input
            type="text"
            value={String(form.overlayBg ?? 'rgba(0,0,0,0.8)')}
            onChange={e => handleChange('overlayBg', e.target.value)}
            placeholder="rgba(0,0,0,0.8)"
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>

        {/* Row 6: Shake toggle + Duration slider */}
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Screen Shake</label>
          <label className="flex items-center gap-2 cursor-pointer py-1.5">
            <input
              type="checkbox"
              checked={!!form.shake}
              onChange={e => handleChange('shake', e.target.checked)}
              className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-yellow-500 focus:ring-yellow-500/50 accent-yellow-500"
            />
            <span className="text-[10px] text-white/50">{form.shake ? 'Sì' : 'No'}</span>
          </label>
        </div>
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">
            Durata: <span className="text-white/70">{String(form.duration ?? 2500)}ms</span>
          </label>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={Number(form.duration ?? 2500)}
            onChange={e => handleChange('duration', Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/[0.08] accent-yellow-500"
          />
          <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
            <span>500ms</span>
            <span>5000ms</span>
          </div>
        </div>

        {/* Row 7: sortOrder */}
        <div>
          <label className="text-[10px] text-white/50 mb-0.5 block font-medium">Ordine</label>
          <input
            type="number"
            value={Number(form.sortOrder ?? 0)}
            onChange={e => handleChange('sortOrder', Number(e.target.value))}
            className="w-full text-[11px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 font-mono"
          />
        </div>
      </div>

      {/* ═══ Media Uploads Section ═══ */}
      {mediaUploads.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <CloudUpload className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Media Upload</span>
            <span className="text-[9px] text-white/15">— immagine e suono personalizzati per questa notifica</span>
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
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Anteprima Live</span>
          <span className="text-[9px] text-white/15">— come apparirà la notifica nel gioco</span>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-black/30 p-1">
          <NotificationPreviewCard config={form} />
        </div>
      </div>

      {/* ═══ Save / Cancel ═══ */}
      <div className="flex gap-3 pt-3">
        <Button
          type="submit"
          className="flex-1 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30 hover:text-yellow-200"
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

// ═══════════════════════════════════════════════════════════════
// View-Only Gallery Banner
// ═══════════════════════════════════════════════════════════════
function GalleryBanner({ type }: { type: 'sounds' | 'images' }) {
  return (
    <div className="mb-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
      <Eye className="w-4 h-4 text-white/25 shrink-0" />
      <p className="text-[11px] text-white/30">
        Galleria in <span className="text-white/50 font-medium">sola visualizzazione</span> — il caricamento dei file avviene direttamente nei dialog delle entità ({type === 'sounds' ? 'oggetti, nemici, location...' : 'oggetti, NPC, location...'})
      </p>
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
    items: 0, quests: 0, events: 0, documents: 0, sounds: 0, images: 0, notifications: 0, locations: 0, npcs: 0, characters: 0, specials: 0,
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const ARRAY_TYPES = new Set(['tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply']);
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        // Serialize array values to JSON strings for DB storage
        if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // story-event is an object, not array — serialize it
        if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-apply is an object {type, chance} — serialize it
        if (f.type === 'status-apply' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
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
      // Ensure id is always included in the update body
      if (editingId && !processed.id) {
        processed.id = editingId;
      }
      const ARRAY_TYPES = new Set(['tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply']);
      for (const f of fields) {
        if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
          processed[f.key] = Number(processed[f.key]);
        }
        // Serialize array values to JSON strings for DB storage
        if (ARRAY_TYPES.has(f.type) && Array.isArray(processed[f.key])) {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // story-event is an object, not array — serialize it
        if (f.type === 'story-event' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
        }
        // status-apply is an object {type, chance} — serialize it
        if (f.type === 'status-apply' && processed[f.key] != null && typeof processed[f.key] === 'object') {
          processed[f.key] = JSON.stringify(processed[f.key]);
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
              {activeTab !== 'sounds' && activeTab !== 'images' && (
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="text-xs gap-1.5 bg-yellow-600/15 border border-yellow-500/25 text-yellow-300 hover:bg-yellow-600/25 hover:text-yellow-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aggiungi Nuovo {tabConfig.entityLabel}
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

            {/* Gallery banner for sounds/images (view-only) */}
            {(activeTab === 'sounds' || activeTab === 'images') && (
              <GalleryBanner type={activeTab as 'sounds' | 'images'} />
            )}

            {/* Notifications seed banner */}
            {activeTab === 'notifications' && (
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <Bell className="w-4 h-4 text-white/25 shrink-0" />
                  <p className="text-[11px] text-white/30">
                    Configurazione <span className="text-white/50 font-medium">notifiche</span> — personalizza colori, label, animazioni e media per ogni tipo di notifica
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/seed-notifications', { method: 'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      const result = await res.json();
                      showStatus(result.message, 'success');
                      fetchData();
                      fetchCounts();
                    } catch (err) {
                      showStatus(`Errore seed: ${err}`, 'error');
                    }
                  }}
                  className="text-[10px] gap-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-600/15 border border-cyan-500/20 bg-cyan-600/10 shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  Seed Default
                </Button>
              </div>
            )}

            {/* Locations info banner */}
            {activeTab === 'locations' && (
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <MapPin className="w-4 h-4 text-white/25 shrink-0" />
                  <p className="text-[11px] text-white/30">
                    Gestione <span className="text-white/50 font-medium">location</span> — aggiungi, modifica o rimuovi aree di gioco. Ogni location può avere sfondo, nemici, oggetti e eventi personalizzati.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/seed-locations', { method: 'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      const result = await res.json();
                      showStatus(result.message, 'success');
                      fetchData();
                      fetchCounts();
                    } catch (err) {
                      showStatus(`Errore seed: ${err}`, 'error');
                    }
                  }}
                  className="text-[10px] gap-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-600/15 border border-cyan-500/20 bg-cyan-600/10 shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  Seed Default
                </Button>
              </div>
            )}

            {/* NPCs banner */}
            {activeTab === 'npcs' && (
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <Users className="w-4 h-4 text-white/25 shrink-0" />
                  <p className="text-[11px] text-white/30">
                    Gestione <span className="text-white/50 font-medium">NPC</span> — aggiungi, modifica o rimuovi personaggi non giocanti. Ogni NPC ha dialoghi, quest e scambi personalizzati.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/seed-npcs', { method: 'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      const result = await res.json();
                      showStatus(result.message, 'success');
                      fetchData();
                      fetchCounts();
                    } catch (err) {
                      showStatus(`Errore seed: ${err}`, 'error');
                    }
                  }}
                  className="text-[10px] gap-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-600/15 border border-cyan-500/20 bg-cyan-600/10 shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  Seed Default
                </Button>
              </div>
            )}

            {/* Characters banner */}
            {activeTab === 'characters' && (
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <Swords className="w-4 h-4 text-white/25 shrink-0" />
                  <p className="text-[11px] text-white/30">
                    Gestione <span className="text-white/50 font-medium">personaggi</span> — aggiungi, modifica o rimuovi archetipi giocabili. Ogni personaggio ha statistiche, abilità speciali e oggetti iniziali.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/seed-characters', { method: 'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      const result = await res.json();
                      showStatus(result.message, 'success');
                      fetchData();
                      fetchCounts();
                    } catch (err) {
                      showStatus(`Errore seed: ${err}`, 'error');
                    }
                  }}
                  className="text-[10px] gap-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-600/15 border border-cyan-500/20 bg-cyan-600/10 shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  Seed Default
                </Button>
              </div>
            )}

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
                      {activeTab !== 'sounds' && activeTab !== 'images' && (
                        <TableHead className="text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right w-32">
                          Azioni
                        </TableHead>
                      )}
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
                            {activeTab !== 'sounds' && activeTab !== 'images' ? (
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
                            ) : (
                              <span className="text-[10px] text-white/15">—</span>
                            )}
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
      {activeTab === 'notifications' ? (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-gray-900 border-white/[0.1] text-white max-w-4xl max-h-[85vh] overflow-hidden flex flex-col z-[120]"
            overlayClassName="z-[120]"
          >
            <DialogHeader>
              <DialogTitle className="text-yellow-400 text-base">
                {editingId ? `Modifica Notifica: ${editingId}` : 'Nuova Notifica'}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {editingId
                  ? 'Personalizza i colori, animazioni e media per questa notifica'
                  : 'Configura una nuova notifica per il gioco'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto admin-scrollbar -mx-6 px-6">
              <NotificationEditDialog
                initialData={editingData}
                onSave={handleUpdate}
                onCancel={handleDialogClose}
                isEdit={!!editingId}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
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
                activeTab={activeTab}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
