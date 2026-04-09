'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Minus, Pencil, Trash2, Save, RotateCcw,
  Package, Scroll, Zap, FileText, Volume2, ImageIcon, RefreshCw, Loader2, Search, Play, Pause, Eye,
  Upload, CloudUpload, Music, Trash, CheckCircle2, AlertCircle, VolumeX, Bell, MapPin, Users, Swords, Database, Monitor, Skull, DoorOpen,
  type LucideIcon,
} from 'lucide-react';
import { refreshGameData } from '@/game/data/loader';
import { useGameStore } from '@/game/store';
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
type TabId = 'items' | 'quests' | 'events' | 'documents' | 'sounds' | 'images' | 'notifications' | 'locations' | 'npcs' | 'characters' | 'specials' | 'enemies' | 'enemy-abilities' | 'secret-rooms' | 'avatars' | 'start-screen';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  endpoint: string;
  entityLabel: string; // singular label for "Aggiungi Nuovo ..."
  custom?: boolean; // if true, renders a custom panel instead of CRUD table
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
  { id: 'enemies', label: 'Nemici', icon: <Skull className="w-4 h-4" />, endpoint: '/api/admin/enemies', entityLabel: 'Nemico' },
  { id: 'enemy-abilities', label: 'Abilità Nemici', icon: <Swords className="w-4 h-4" />, endpoint: '/api/admin/enemy-abilities', entityLabel: 'Abilità Nemica' },
  { id: 'secret-rooms', label: 'Stanze Segrete', icon: <DoorOpen className="w-4 h-4" />, endpoint: '/api/admin/secret-rooms', entityLabel: 'Stanza Segreta' },
  { id: 'avatars', label: 'Avatar', icon: <Users className="w-4 h-4" />, endpoint: '/api/admin/images', entityLabel: 'Avatar', custom: true },
  { id: 'start-screen', label: 'Schermata Iniziale', icon: <Monitor className="w-4 h-4" />, endpoint: '/api/admin/game-settings', entityLabel: 'Impostazione', custom: true },
];

// ═══════════════════════════════════════════════════════════════
// Seed Banner Configuration (data-driven)
// ═══════════════════════════════════════════════════════════════
interface SeedBannerConfig {
  icon: LucideIcon;
  label: string;
  description: string;
  seedEndpoint: string;
}

const SEED_BANNERS: Record<TabId, SeedBannerConfig | null> = {
  items:        { icon: Package,   label: 'Oggetti',    description: 'Gestione <span className="text-white/50 font-medium">oggetti</span> — aggiungi, modifica o rimuovi armi, cure, munizioni, chiavi e altro dal gioco', seedEndpoint: '/api/admin/seed-items' },
  quests:       { icon: Scroll,   label: 'Missioni',    description: 'Gestione <span className="text-white/50 font-medium">missioni</span> — configura le quest associate agli NPC con obiettivi e ricompense', seedEndpoint: '/api/admin/seed-quests' },
  events:       { icon: Zap,      label: 'Eventi',      description: 'Gestione <span className="text-white/50 font-medium">eventi dinamici</span> — blackout, allarmi, incendi e altri eventi casuali che colpiscono l\'esplorazione', seedEndpoint: '/api/admin/seed-events' },
  documents:    { icon: FileText, label: 'Documenti',   description: 'Gestione <span className="text-white/50 font-medium">documenti</span> — diari, file Umbrella, note e foto ritrovabili durante l\'esplorazione', seedEndpoint: '/api/admin/seed-documents' },
  sounds:       null,
  images:       null,
  notifications:{ icon: Bell,     label: 'Notifiche',   description: 'Configurazione <span className="text-white/50 font-medium">notifiche</span> — personalizza colori, label, animazioni e media per ogni tipo di notifica', seedEndpoint: '/api/admin/seed-notifications' },
  locations:    { icon: MapPin,   label: 'Location',    description: 'Gestione <span className="text-white/50 font-medium">location</span> — aggiungi, modifica o rimuovi aree di gioco. Ogni location può avere sfondo, nemici, oggetti e eventi personalizzati.', seedEndpoint: '/api/admin/seed-locations' },
  npcs:         { icon: Users,    label: 'NPC',         description: 'Gestione <span className="text-white/50 font-medium">NPC</span> — aggiungi, modifica o rimuovi personaggi non giocanti. Ogni NPC ha dialoghi, quest e scambi personalizzati.', seedEndpoint: '/api/admin/seed-npcs' },
  characters:   { icon: Swords,   label: 'Personaggi',  description: 'Gestione <span className="text-white/50 font-medium">personaggi</span> — aggiungi, modifica o rimuovi archetipi giocabili. Ogni personaggio ha statistiche, abilità speciali e oggetti iniziali.', seedEndpoint: '/api/admin/seed-characters' },
  specials:     { icon: Zap,      label: 'Speciali',    description: 'Gestione <span className="text-white/50 font-medium">abilità speciali</span> — configura poteri offensivi, difensivi, di supporto e controllo per i personaggi', seedEndpoint: '/api/admin/seed-specials' },
  enemies:      { icon: Skull,    label: 'Nemici',      description: 'Gestione <span className="text-white/50 font-medium">nemici</span> — aggiungi, modifica o rimuovi creature e boss. Ogni nemico ha statistiche, abilità e tabelle loot.', seedEndpoint: '/api/admin/seed-enemies' },
  'enemy-abilities': { icon: Swords, label: 'Abilità Nemici', description: 'Gestione <span className="text-white/50 font-medium">abilità nemici</span> — configura attacchi, potenza, probabilità d\'uso ed effetti di status per i nemici', seedEndpoint: '/api/admin/seed-enemy-abilities' },
  'secret-rooms': { icon: DoorOpen, label: 'Stanze Segrete', description: 'Gestione <span className="text-white/50 font-medium">stanze segrete</span> — aggiungi, modifica o rimuovi stanze nascoste scopribili durante l\'esplorazione', seedEndpoint: '/api/admin/seed-secret-rooms' },
  avatars:      null,
  'start-screen': null,
};

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
    armor:       { it: 'Armatura', hint: 'Equipaggiabile: DEF, HP, effetto speciale' },
    accessory:   { it: 'Accessorio', hint: 'Equipaggiabile: ATK, DEF, HP, SPD, crit, effetto speciale' },
    weapon_mod:  { it: 'Mod Arma', hint: 'Da installare nell\'arma: ATK, crit, status' },
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
  discoveryMethod: {
    search:     { it: 'Ricerca', hint: 'scopribile tramite il pulsante Cerca' },
    document:   { it: 'Documento', hint: 'richiede un documento specifico' },
    npc_hint:   { it: 'Suggerimento NPC', hint: 'richiede una quest NPC completata' },
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
    self:        { it: 'Sé Stesso' },
    enemy:       { it: 'Nemico Singolo' },
    all_enemies: { it: 'Tutti i Nemici', hint: 'Colpisce tutti i nemici in combattimento' },
    ally:        { it: 'Alleato' },
    all_allies:  { it: 'Tutti gli Alleati' },
  },
  statusEffect: {
    poison:   { it: 'Avvelenamento' },
    bleeding: { it: 'Sanguinamento' },
    stunned:  { it: 'Stordimento' },
    adrenaline: { it: 'Adrenalina' },
  },
  modType: {
    melee:  { it: 'Corpo a Corpo', hint: 'Solo per armi melee' },
    ranged: { it: 'A Distanza', hint: 'Solo per armi a distanza' },
    any:    { it: 'Universale', hint: 'Compatibile con tutti i tipi di arma' },
  },
  mapDangerLevel: {
    basso:    { it: 'Basso', hint: 'poche minacce, area sicura' },
    medio:    { it: 'Medio', hint: 'minacce moderate, attenzione' },
    alto:     { it: 'Alto', hint: 'pericoloso, preparati al combattimento' },
    critico:  { it: 'Critico', hint: 'molto pericoloso, rischio morte' },
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
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'entity-search' | 'tag-editor' | 'entity-tag-editor' | 'item-pool' | 'text-list' | 'locked-locs' | 'sub-areas' | 'story-event' | 'status-apply' | 'quest-rewards' | 'event-choices' | 'rich-text-editor' | 'trade-inventory' | 'starting-items';
  options?: string[];
  enumGroup?: string; // key into ENUM_LABELS for Italian translations
  entitySearchEndpoint?: string; // for entity-search type
  entitySearchLabelKey?: string; // which field to show as label
  entityIconKey?: string; // optional icon field to show alongside labels
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  colSpan?: number; // 1 or 2 for grid layout
  helpText?: string; // optional tooltip
}

const FIELD_MAP: Record<TabId, FieldDef[]> = {
  items: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: pistol' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Pistola M1911' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione oggetto', colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['weapon', 'healing', 'ammo', 'utility', 'antidote', 'bag', 'collectible', 'key', 'armor', 'accessory', 'weapon_mod'], enumGroup: 'itemType' },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'], enumGroup: 'rarity' },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🔫' },
    { key: 'usable', label: 'Usabile', type: 'boolean', defaultValue: false },
    { key: 'equippable', label: 'Equipaggiabile', type: 'boolean', defaultValue: false },
    { key: 'stackable', label: 'Impilabile', type: 'boolean', defaultValue: true },
    { key: 'unico', label: 'Unico', type: 'boolean', defaultValue: false },
    { key: 'maxStack', label: 'Stack Max', type: 'number', defaultValue: 99 },
    // Weapon fields
    { key: 'weaponType', label: 'Tipo Arma', type: 'select', options: ['melee', 'ranged'], enumGroup: 'weaponType' },
    { key: 'atkBonus', label: 'Bonus ATK', type: 'number', helpText: 'Arma, Accessorio, Weapon Mod' },
    { key: 'ammoType', label: 'Tipo Munizione', type: 'text', placeholder: 'es: ammo_pistol' },
    // Effect fields (usable items)
    { key: 'effectType', label: 'Tipo Effetto', type: 'select', options: ['heal', 'heal_full', 'cure', 'damage_boost', 'defense_boost', 'add_ammo', 'add_slots', 'kill_all'], enumGroup: 'effectType' },
    { key: 'effectValue', label: 'Valore Effetto', type: 'number' },
    { key: 'effectTarget', label: 'Bersaglio Effetto', type: 'select', options: ['self', 'one_ally', 'all_allies', 'all_enemies'], enumGroup: 'effectTarget' },
    { key: 'effectStatusCured', label: 'Status Curati (JSON)', type: 'text', placeholder: '["poison","bleeding"]', colSpan: 3 },
    { key: 'addSlots', label: 'Slot Aggiunti', type: 'number' },
    // Equipment fields (armor/accessory/weapon_mod)
    { key: 'defBonus', label: 'Bonus DEF', type: 'number', helpText: 'Armatura, Accessorio' },
    { key: 'hpBonus', label: 'Bonus HP', type: 'number', helpText: 'Armatura, Accessorio' },
    { key: 'spdBonus', label: 'Bonus SPD', type: 'number', helpText: 'Accessorio' },
    { key: 'critBonus', label: 'Bonus Crit %', type: 'number', helpText: 'Accessorio, Weapon Mod: % probabilità critico extra' },
    { key: 'dodgeBonus', label: 'Bonus Dodge %', type: 'number', helpText: 'Weapon Mod: % riduzione dodge nemico' },
    { key: 'statusBonus', label: 'Bonus Status %', type: 'number', helpText: 'Weapon Mod: % probabilità status extra' },
    { key: 'modType', label: 'Compatibilità Mod', type: 'select', options: ['melee', 'ranged', 'any'], enumGroup: 'modType', helpText: 'Weapon Mod: tipo arma compatibile' },
    { key: 'specialEffect', label: 'Effetto Speciale', type: 'text', placeholder: '{"type":"poison_resist","value":50}', helpText: 'JSON con tipo e valore. Tipi: poison_resist, bleed_resist, stun_resist, hp_regen, thorns, crit_shield', colSpan: 3 },
  ],
  quests: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: quest_marco_firstaid' },
    { key: 'npcId', label: 'NPC ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/npcs', entitySearchLabelKey: 'name', placeholder: 'es: npc_marco', required: true, colSpan: 2 },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'description', label: 'Descrizione', type: 'textarea', colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['fetch', 'kill', 'explore'], enumGroup: 'questType' },
    { key: 'targetId', label: 'Target ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/items', entitySearchLabelKey: 'name', placeholder: 'es: first_aid', required: true, colSpan: 2 },
    { key: 'targetCount', label: 'Target Count', type: 'number', defaultValue: 1 },
    { key: 'rewardItems', label: 'Ricompense', type: 'quest-rewards', colSpan: 3 },
    { key: 'rewardExp', label: 'EXP Ricompensa', type: 'number', defaultValue: 0 },
    { key: 'rewardDialogue', label: 'Dialogo Ricompensa', type: 'text-list', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella lista missioni (non usato dal motore di gioco)' },
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
    { key: 'locationIds', label: 'Location IDs', type: 'entity-tag-editor', entitySearchEndpoint: '/api/admin/locations', entitySearchLabelKey: 'name', placeholder: 'Cerca e seleziona location...', colSpan: 3 },
    { key: 'onTriggerMessage', label: 'Msg Trigger', type: 'textarea', colSpan: 3 },
    { key: 'onEndMessage', label: 'Msg Fine', type: 'textarea', colSpan: 3 },
    { key: 'choices', label: 'Scelte', type: 'event-choices', colSpan: 3 },
  ],
  documents: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: doc_survivor_note' },
    { key: 'title', label: 'Titolo', type: 'text', required: true },
    { key: 'content', label: 'Contenuto', type: 'rich-text-editor', required: true, colSpan: 3 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['diary', 'umbrella_file', 'note', 'photo', 'report', 'email'], enumGroup: 'documentType' },
    { key: 'locationId', label: 'Location ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/locations', entitySearchLabelKey: 'name', placeholder: 'es: city_outskirts', required: true, colSpan: 2 },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 📝' },
    { key: 'rarity', label: 'Rarità', type: 'select', options: ['common', 'uncommon', 'rare', 'legendary'], enumGroup: 'rarity', defaultValue: 'common' },
    { key: 'isSecret', label: 'Segreto', type: 'boolean', defaultValue: false },
    { key: 'hintRequired', label: 'Hint Richiesto', type: 'entity-search', entitySearchEndpoint: '/api/admin/documents', entitySearchLabelKey: 'title', placeholder: 'es: doc_chief_diary', helpText: 'Il giocatore deve aver trovato questo documento prima di poter trovare quello corrente', colSpan: 2 },
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
    { key: 'questId', label: 'Quest ID', type: 'entity-search', entitySearchEndpoint: '/api/admin/quests', entitySearchLabelKey: 'name', placeholder: 'es: quest_marco_firstaid', helpText: 'La missione che questo NPC assegna al giocatore', colSpan: 2 },
    { key: 'tradeInventory', label: 'Inventario Scambi', type: 'trade-inventory', colSpan: 3 },
    { key: 'questCompletedDialogue', label: 'Dialogo Post-Quest', type: 'text-list', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella mappa e nella lista NPC (non usato dal motore di gioco)' },
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
    { key: 'specialName', label: 'Abilità Speciale 1', type: 'entity-search', entitySearchEndpoint: '/api/admin/specials', entitySearchLabelKey: 'name', entityIconKey: 'icon', placeholder: 'es: Barricata', colSpan: 2 },
    { key: 'special2Name', label: 'Abilità Speciale 2', type: 'entity-search', entitySearchEndpoint: '/api/admin/specials', entitySearchLabelKey: 'name', entityIconKey: 'icon', placeholder: 'es: Immolazione', colSpan: 2 },
    { key: 'passiveDescription', label: 'Passiva', type: 'textarea', placeholder: 'Descrizione abilità passiva...', colSpan: 3 },
    { key: 'portraitEmoji', label: 'Emoji Ritratto', type: 'text', placeholder: 'es: 🛡️' },
    { key: 'startingItems', label: 'Oggetti Iniziali', type: 'starting-items', colSpan: 3, helpText: 'Oggetti che il personaggio ha all\'inizio del gioco. Ogni entry è un oggetto con itemId, quantity e opzionalmente isEquipped (per armi/armature/accessori).' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella schermata selezione personaggi (non usato dal motore di gioco)' },
  ],
  locations: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: city_outskirts' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Periferia della Città' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione della location', colSpan: 3 },
    { key: 'encounterRate', label: 'Prob. Incontri %', type: 'number', defaultValue: 0, helpText: 'Probabilità (0-100) di incontro nemico per azione' },
    { key: 'searchChance', label: 'Prob. Ricerca %', type: 'number', placeholder: '60 (default)', helpText: 'Probabilità base (0-100) di trovare qualcosa. Default: 60% se vuoto.' },
    { key: 'docChance', label: 'Prob. Documento %', type: 'number', placeholder: '35 (default)', helpText: 'Probabilità (0-100) di trovare un documento quando la ricerca ha successo. Default: 35% se vuoto. Documento e oggetti sono mutualmente esclusivi.' },
    { key: 'searchMax', label: 'Max Ricerche', type: 'number', placeholder: 'Random 1-3', helpText: 'Max ricerche per location. Vuoto = random 1-3, 0 = illimitate, N = max N ricerche.' },
    { key: 'isBossArea', label: 'Area Boss', type: 'boolean', defaultValue: false },
    { key: 'bossId', label: 'Boss', type: 'entity-search', entitySearchEndpoint: '/api/admin/enemies', entitySearchLabelKey: 'name', entityIconKey: 'icon', placeholder: 'es: nemesis, tyrant', colSpan: 2 },
    { key: 'enemyPool', label: 'Pool Nemici', type: 'entity-tag-editor', entitySearchEndpoint: '/api/admin/enemies', entitySearchLabelKey: 'name', entityIconKey: 'icon', placeholder: 'Cerca e seleziona nemici...', colSpan: 3 },
    { key: 'itemPool', label: 'Pool Oggetti', type: 'item-pool', colSpan: 3 },
    { key: 'nextLocations', label: 'Location Uscite', type: 'entity-tag-editor', entitySearchEndpoint: '/api/admin/locations', entitySearchLabelKey: 'name', placeholder: 'Cerca e seleziona location...', colSpan: 3 },
    { key: 'storyEvent', label: 'Evento Storia', type: 'story-event', colSpan: 3 },
    { key: 'ambientText', label: 'Testi Ambientali', type: 'text-list', colSpan: 3 },
    { key: 'lockedLocations', label: 'Location Bloccate', type: 'locked-locs', colSpan: 3 },
    { key: 'subAreas', label: 'Sotto-Aree', type: 'sub-areas', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella mappa e nella lista location (non usato dal motore di gioco)' },
    { key: 'mapRow', label: 'Mappa Riga', type: 'number', placeholder: '0-3', helpText: 'Posizione verticale della location sulla mappa di gioco (0 = in alto, 3 = in basso)' },
    { key: 'mapCol', label: 'Mappa Colonna', type: 'number', placeholder: '0-3', helpText: 'Posizione orizzontale della location sulla mappa di gioco (0 = sinistra, 3 = destra)' },
    { key: 'mapIcon', label: 'Icona Mappa', type: 'text', placeholder: 'es: 🏙️' },
    { key: 'mapDanger', label: 'Pericolo Mappa', type: 'select', options: ['basso', 'medio', 'alto', 'critico'], enumGroup: 'mapDangerLevel' },
  ],
  specials: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: colpo_mortale' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Colpo Mortale' },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 💀', colSpan: 2 },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione dell\'abilità...', colSpan: 3 },
    { key: 'category', label: 'Categoria', type: 'select', options: ['offensive', 'defensive', 'support', 'control'], enumGroup: 'specialCategory' },
    { key: 'targetType', label: 'Bersaglio', type: 'select', options: ['self', 'enemy', 'all_enemies', 'ally', 'all_allies'], enumGroup: 'specialTargetType' },
    { key: 'cooldown', label: 'Cooldown (turni)', type: 'number', defaultValue: 2, helpText: 'Turni di attesa prima di poter riutilizzare l\'abilità' },
    { key: 'powerMultiplier', label: 'Moltiplicatore Potere', type: 'number', placeholder: 'es: 1.6 (solo offensive)', helpText: 'Moltiplica l\'ATK del personaggio per questo valore' },
    { key: 'healAmount', label: 'Quantità Cura', type: 'number', placeholder: 'es: 50 (solo healing/support)', helpText: 'HP curati immediatamente (solo abilità di supporto/cura)' },
    { key: 'duration', label: 'Durata (turni)', type: 'number', placeholder: 'es: 3', helpText: 'Quanti turni dura l\'effetto (DoT/HoT/buff/debuff)' },
    { key: 'tickAmount', label: 'Danno/Cura per Turno', type: 'number', placeholder: 'es: 10', helpText: 'Danno o cura applicata ad ogni turno per effetti a durata' },
    { key: 'statusToApply', label: 'Status Applicato', type: 'status-apply', colSpan: 3 },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella lista abilità (non usato dal motore di gioco)' },
  ],
  enemies: [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: zombie, zombie_dog' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Zombie' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione del nemico...', colSpan: 3 },
    { key: 'maxHp', label: 'HP Massimo', type: 'number', defaultValue: 60 },
    { key: 'atk', label: 'ATK', type: 'number', defaultValue: 10 },
    { key: 'def', label: 'DEF', type: 'number', defaultValue: 5 },
    { key: 'spd', label: 'SPD', type: 'number', defaultValue: 5 },
    { key: 'icon', label: 'Icona', type: 'text', placeholder: 'es: 🧟' },
    { key: 'expReward', label: 'EXP Ricompensa', type: 'number', defaultValue: 15 },
    { key: 'lootTable', label: 'Tabella Loot', type: 'item-pool', colSpan: 3 },
    { key: 'abilities', label: 'Abilità', type: 'entity-tag-editor', entitySearchEndpoint: '/api/admin/enemy-abilities', entitySearchLabelKey: 'name', placeholder: 'Cerca e seleziona abilità nemiche...', colSpan: 3 },
    { key: 'isBoss', label: 'Boss', type: 'boolean', defaultValue: false },
    { key: 'variantGroup', label: 'Gruppo Variante', type: 'text', placeholder: 'es: zombie, licker, cerberus, hunter, tyrant, nemesis' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella lista nemici. Valori più alti = nemici mostrati dopo (progressione)' },
  ],
  'enemy-abilities': [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: morso, artigliata, carica_brutale' },
    { key: 'name', label: 'Nome Abilità', type: 'text', required: true, placeholder: 'es: Morso, Artigliata, Carica Brutale' },
    { key: 'description', label: 'Descrizione', type: 'textarea', placeholder: 'Descrizione dell\'attacco...', colSpan: 3 },
    { key: 'power', label: 'Potenza', type: 'number', defaultValue: 1.0, helpText: 'Moltiplicatore del danno (1.0 = normale, 2.0 = doppio)' },
    { key: 'chance', label: 'Prob. Uso %', type: 'number', defaultValue: 50, helpText: 'Probabilità che il nemico usi questa abilità (0-100)' },
    { key: 'statusType', label: 'Status Effect', type: 'select', options: ['', 'poison', 'bleeding', 'stunned', 'adrenaline'], enumGroup: 'statusEffect', helpText: 'Effetto di status applicato dal colpo (vuoto = nessuno)' },
    { key: 'statusChance', label: 'Prob. Status %', type: 'number', defaultValue: 0, helpText: 'Probabilità di applicare lo status (0-100)' },
    { key: 'statusDuration', label: 'Durata Status', type: 'number', defaultValue: 0, helpText: 'Turni di durata dello status (0 = 3 turni default dal motore)' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella lista abilità nemiche' },
  ],
  'secret-rooms': [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'es: secret_rpd_evidence_room' },
    { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'es: Stanza Prove Nascosta' },
    { key: 'description', label: 'Descrizione', type: 'textarea', colSpan: 3, placeholder: 'Descrizione narrativa della stanza segreta...' },
    { key: 'locationId', label: 'Location', type: 'entity-search', entitySearchEndpoint: '/api/admin/locations', entitySearchLabelKey: 'name', placeholder: 'es: rpd_station', required: true, colSpan: 2 },
    { key: 'discoveryMethod', label: 'Metodo Scoperta', type: 'select', options: ['search', 'document', 'npc_hint'], enumGroup: 'discoveryMethod' },
    { key: 'searchChance', label: 'Prob. Scoperta %', type: 'number', defaultValue: 15, helpText: 'Probabilità (0-100) di scoprire la stanza. Usato per "search" e "npc_hint". Per "document" è 50% fisso se il documento è posseduto.' },
    { key: 'requiredDocumentId', label: 'Documento Richiesto', type: 'entity-search', entitySearchEndpoint: '/api/admin/documents', entitySearchLabelKey: 'title', placeholder: 'es: doc_patient_record', helpText: 'Solo per metodo "document": documento necessario per scoprire la stanza', colSpan: 2 },
    { key: 'requiredNpcQuestId', label: 'Quest NPC Richiesta', type: 'entity-search', entitySearchEndpoint: '/api/admin/quests', entitySearchLabelKey: 'name', placeholder: 'es: quest_hannah_sewers', helpText: 'Solo per metodo "npc_hint": quest ID (non NPC ID) necessaria', colSpan: 2 },
    { key: 'hint', label: 'Suggerimento', type: 'textarea', placeholder: 'Testo del suggerimento mostrato al giocatore...', helpText: 'Mostrato come indizio nel log di gioco quando i requisiti sono quasi soddisfatti', colSpan: 3 },
    { key: 'lootTable', label: 'Loot Garantito', type: 'item-pool', colSpan: 3, helpText: 'Oggetti garantiti (usa chance 100 per essere sicuro). Tiro individuale per ogni entry.' },
    { key: 'uniqueItemId', label: 'Oggetto Unico', type: 'entity-search', entitySearchEndpoint: '/api/admin/items', entitySearchLabelKey: 'name', entityIconKey: 'icon', placeholder: 'es: lockpick, magnum, rocket_launcher', helpText: 'Oggetto unico garantito aggiunto al loot (opzionale)', colSpan: 2 },
    { key: 'uniqueItemQuantity', label: 'Quantità Unico', type: 'number', defaultValue: 1, helpText: 'Quantità dell\'oggetto unico' },
    { key: 'sortOrder', label: 'Ordine', type: 'number', defaultValue: 0, helpText: 'Ordine di visualizzazione nella lista stanze segrete' },
  ],
  'avatars': [],
  'start-screen': [],
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
      idTemplate: '{entityId}',
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
  enemies: [
    {
      key: 'portrait',
      label: 'Immagine Nemico',
      mediaType: 'image' as const,
      category: 'sprite',
      accept: 'image/png,image/jpeg,image/webp',
      idTemplate: '{entityId}',
      nameTemplate: 'Enemy: {entityId}',
      helpText: 'Immagine sprite del nemico mostrata in combattimento (256×256 consigliato)',
    },
  ],
  'enemy-abilities': [],
  'secret-rooms': [],
  'avatars': [],
  'start-screen': [],
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
    {
      key: '_stats',
      label: 'Stats',
      width: 'w-48',
      render: (row) => {
        const type = String(row.type);
        const parts: string[] = [];
        if (row.atkBonus) parts.push(`⚔️${row.atkBonus}`);
        if (row.defBonus) parts.push(`🛡️${row.defBonus}`);
        if (row.hpBonus) parts.push(`❤️${row.hpBonus}`);
        if (row.spdBonus) parts.push(`💨${row.spdBonus}`);
        if (row.critBonus) parts.push(`💥${row.critBonus}%`);
        if (row.effectValue) parts.push(`✨${row.effectValue}`);
        if (parts.length === 0) return <span className="text-white/15 text-[10px]">—</span>;
        return <span className="text-[10px] text-white/50 flex flex-wrap gap-x-2">{parts.map(p => <span key={p}>{p}</span>)}</span>;
      },
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
  enemies: [
    {
      key: '_icon',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.icon ?? '🧟')}</span>,
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome', width: 'w-36' },
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
    {
      key: 'expReward',
      label: 'EXP',
      width: 'w-14',
      render: (row) => <span className="text-[10px] text-yellow-400/70 font-mono">{row.expReward}</span>,
    },
    {
      key: 'isBoss',
      label: 'Boss',
      width: 'w-16',
      render: (row) => (
        <span className={row.isBoss ? 'text-red-400 text-[10px] font-bold' : 'text-white/15 text-[10px]'}>
          {row.isBoss ? 'BOSS' : '—'}
        </span>
      ),
    },
    {
      key: 'variantGroup',
      label: 'Variante',
      width: 'w-24',
      render: (row) => {
        const vg = String(row.variantGroup ?? '');
        if (!vg) return <span className="text-white/15 text-[10px]">—</span>;
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">{vg}</Badge>;
      },
    },
    {
      key: 'abilities',
      label: 'Abilità',
      width: 'w-16',
      render: (row) => {
        let count = 0;
        try { count = typeof row.abilities === 'string' ? JSON.parse(row.abilities).length : Array.isArray(row.abilities) ? row.abilities.length : 0; } catch { count = 0; }
        return <span className="text-[10px] text-white/40 font-mono">{count}</span>;
      },
    },
  ],
  'enemy-abilities': [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    {
      key: 'power',
      label: 'Potenza',
      width: 'w-20',
      render: (row) => {
        const p = Number(row.power);
        const color = p >= 2.0 ? 'text-red-400' : p >= 1.5 ? 'text-amber-400' : p >= 1.0 ? 'text-white/70' : 'text-green-400/70';
        return <span className={`text-[11px] font-mono ${color}`}>{p.toFixed(1)}x</span>;
      },
    },
    {
      key: 'chance',
      label: 'Prob. %',
      width: 'w-18',
      render: (row) => <span className="text-[10px] text-white/50 font-mono">{row.chance}%</span>,
    },
    {
      key: 'statusType',
      label: 'Status',
      width: 'w-28',
      render: (row) => {
        const st = String(row.statusType ?? '');
        if (!st) return <span className="text-white/15 text-[10px]">—</span>;
        const statusColors: Record<string, string> = {
          poison: 'border-green-500/30 text-green-400 bg-green-500/10',
          bleeding: 'border-red-500/30 text-red-400 bg-red-500/10',
          stunned: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          adrenaline: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
        };
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[st] ?? ''}`}>
            {getEnumLabel('statusEffect', st)} {row.statusChance ? `(${row.statusChance}%)` : ''}
          </Badge>
        );
      },
    },
  ],
  'secret-rooms': [
    { key: 'id', label: 'ID', width: 'w-52' },
    { key: 'name', label: 'Nome', width: 'w-44' },
    { key: 'locationId', label: 'Location', width: 'w-36' },
    {
      key: 'discoveryMethod',
      label: 'Scoperta',
      width: 'w-28',
      render: (row) => {
        const m = String(row.discoveryMethod ?? 'search');
        const colors: Record<string, string> = {
          search: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          document: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
          npc_hint: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
        };
        return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[m] ?? ''}`}>{getEnumLabel('discoveryMethod', m)}</Badge>;
      },
    },
    {
      key: 'searchChance',
      label: 'Prob %',
      width: 'w-18',
      render: (row) => <span className="text-[10px] text-white/50 font-mono">{row.searchChance}%</span>,
    },
  ],
  'avatars': [],
  'start-screen': [],
};
// ═══════════════════════════════════════════════════════════════
// Entity Search Input (searchable ID reference fields)
// ═══════════════════════════════════════════════════════════════
function EntitySearchInput({
  value,
  onChange,
  endpoint,
  labelKey,
  iconKey,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: string; label: string; icon?: string }[]>([]);
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
        .map(r => ({ id: String(r.id), label: String(r[labelKey] ?? r.id), icon: iconKey ? String(r[iconKey] ?? '') : undefined }));
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    } catch {
      // silent fail
    } finally {
      setSearching(false);
    }
  }, [endpoint, labelKey, iconKey]);

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
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-2"
            >
              {r.icon && <span className="shrink-0 w-5 text-center">{r.icon}</span>}
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
// Entity-Aware Tag Editor — searchable multi-select for entity pools
// ═══════════════════════════════════════════════════════════════
function EntityTagEditor({ value, onChange, endpoint, labelKey, iconKey, placeholder }: {
  value: unknown;
  onChange: (v: string[]) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
  placeholder?: string;
}) {
  const tags = useMemo(() => parseStringArray(value), [value]);
  const [entities, setEntities] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load entities from endpoint on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        const mapped = data.map(r => ({
          id: String(r.id),
          label: String(r[labelKey] ?? r.id),
          icon: iconKey ? String(r[iconKey] ?? '') : undefined,
        }));
        setEntities(mapped);
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, [endpoint, labelKey, iconKey]);

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

  // Build a lookup map: id → entity
  const entityMap = useMemo(() => {
    const m = new Map<string, { id: string; label: string; icon?: string }>();
    entities.forEach(e => m.set(e.id, e));
    return m;
  }, [entities]);

  const selected = tags.map(id => entityMap.get(id)).filter(Boolean) as { id: string; label: string; icon?: string }[];

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return entities.filter(e => !tags.includes(e.id));
    const q = query.toLowerCase();
    return entities.filter(e =>
      !tags.includes(e.id) &&
      (e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [entities, tags, query]);

  const handleSelect = (id: string) => {
    if (!tags.includes(id)) {
      onChange([...tags, id]);
    }
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md bg-white/[0.04] border border-white/[0.1]">
        {selected.length === 0 && !query && (
          <span className="text-[10px] text-white/20 italic">{placeholder ?? 'Cerca e seleziona...'}</span>
        )}
        {selected.map((entity, i) => (
          <span key={entity.id + '-' + i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-300 group/tag">
            {entity.icon && <span className="mr-0.5">{entity.icon}</span>}
            <span className="font-mono text-yellow-400/60">{entity.id}</span>
            <span className="text-white/50">{entity.label}</span>
            <button type="button" onClick={() => removeTag(i)} className="text-yellow-500/40 hover:text-red-400 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setShowDropdown(false); e.stopPropagation(); }
          }}
          placeholder={selected.length === 0 ? placeholder : 'Cerca...'}
          className="flex-1 min-w-[100px] text-[10px] bg-transparent border-none outline-none text-white/70 placeholder-white/20"
        />
      </div>
      {/* Dropdown */}
      {showDropdown && filteredOptions.length > 0 && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 max-h-52 overflow-y-auto rounded-lg border border-white/[0.12] bg-gray-900/98 shadow-xl admin-scrollbar">
            {filteredOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-2"
              >
                {opt.icon && <span className="shrink-0 w-5 text-center">{opt.icon}</span>}
                <span className="font-mono text-cyan-300/80 shrink-0">{opt.id}</span>
                <span className="text-white/50 truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!loaded && (
        <div className="flex items-center gap-1.5 text-[9px] text-white/20">
          <Loader2 className="w-3 h-3 animate-spin" /> Caricamento entità...
        </div>
      )}
      <p className="text-[9px] text-white/15">
        Seleziona dalla lista · {tags.length} selezionati · {entities.length - tags.length} disponibili
      </p>
    </div>
  );
}

/** Mini entity search input — used inside ItemPoolEditor rows */
function MiniEntitySearch({ value, onChange, endpoint, labelKey, iconKey }: {
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  labelKey: string;
  iconKey?: string;
}) {
  const [entities, setEntities] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: string; label: string; icon?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        const mapped = data.map(r => ({
          id: String(r.id),
          label: String(r[labelKey] ?? r.id),
          icon: iconKey ? String(r[iconKey] ?? '') : undefined,
        }));
        setEntities(mapped);
      } catch { /* silent */ }
    })();
  }, [endpoint, labelKey, iconKey]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Find current entity name
  const currentEntity = entities.find(e => e.id === value);

  const handleInputChange = (v: string) => {
    setQuery(v);
    onChange(v);
    const q = v.toLowerCase();
    const filtered = entities.filter(e =>
      e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q)
    ).slice(0, 10);
    setResults(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelect = (id: string) => {
    setQuery(id);
    onChange(id);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => {
          if (query.length > 0) handleInputChange(query);
        }}
        placeholder="Cerca..."
        className="w-full text-[10px] bg-gray-900 border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40"
      />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 max-h-40 overflow-y-auto rounded-md border border-white/[0.12] bg-gray-950 shadow-xl admin-scrollbar">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-b-0 flex items-center gap-1.5"
            >
              {r.icon && <span className="shrink-0 w-4 text-center text-xs">{r.icon}</span>}
              <span className="font-mono text-cyan-300/70 shrink-0">{r.id}</span>
              <span className="text-white/40 truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
      {currentEntity && !showDropdown && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-white/20 truncate max-w-[100px] pointer-events-none">
          {currentEntity.label}
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
              <tr key={i} className="border-b border-white/[0.03] bg-gray-900 hover:bg-gray-800">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={item.itemId}
                    onChange={v => updateItem(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
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

/** Quest Rewards Editor — table with itemId + quantity for quest rewards */
function QuestRewardsEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; quantity: number }[]) => void }) {
  let rewards: { itemId: string; quantity: number }[] = [];
  if (Array.isArray(value)) {
    rewards = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), quantity: Number(o.quantity ?? 1) };
      }
      return { itemId: String(r), quantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { rewards = JSON.parse(value) || []; } catch { rewards = []; }
  }

  const add = () => onChange([...rewards, { itemId: '', quantity: 1 }]);
  const remove = (idx: number) => onChange(rewards.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string | number) => {
    onChange(rewards.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Oggetto</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-24">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-gray-900 hover:bg-gray-800">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={reward.itemId}
                    onChange={v => update(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={reward.quantity}
                    onChange={e => update(i, 'quantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-white/15 italic">
                  Nessuna ricompensa — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi ricompensa
      </button>
    </div>
  );
}

/** Event Choices Editor — table with text + outcome fields for event choices */
function EventChoicesEditor({ value, onChange }: {
  value: unknown;
  onChange: (v: { text: string; outcome: { description: string; endEvent: boolean; hpChange: number; receiveItems?: { itemId: string; quantity: number }[] } }[]) => void;
}) {
  interface EventChoice {
    text: string;
    outcome: {
      description: string;
      endEvent: boolean;
      hpChange: number;
      receiveItems?: { itemId: string; quantity: number }[];
    };
  }

  let choices: EventChoice[] = [];
  if (Array.isArray(value)) {
    choices = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        const outcome = typeof o.outcome === 'object' && o.outcome !== null
          ? o.outcome as Record<string, unknown>
          : {};
        return {
          text: String(o.text ?? ''),
          outcome: {
            description: String(outcome.description ?? ''),
            endEvent: Boolean(outcome.endEvent),
            hpChange: Number(outcome.hpChange ?? 0),
            ...(Array.isArray(outcome.receiveItems) ? { receiveItems: outcome.receiveItems as { itemId: string; quantity: number }[] } : {}),
          },
        };
      }
      return { text: String(r), outcome: { description: '', endEvent: false, hpChange: 0 } };
    });
  } else if (typeof value === 'string') {
    try { choices = JSON.parse(value) || []; } catch { choices = []; }
  }

  const add = () => onChange([...choices, { text: '', outcome: { description: '', endEvent: false, hpChange: 0, receiveItems: [] } }]);
  const remove = (idx: number) => onChange(choices.filter((_, i) => i !== idx));
  const updateText = (idx: number, val: string) => {
    const updated = choices.map((c, i) => i === idx ? { ...c, text: val } : c);
    onChange(updated);
  };
  const updateOutcome = (idx: number, field: string, val: unknown) => {
    const updated = choices.map((c, i) =>
      i === idx ? { ...c, outcome: { ...c.outcome, [field]: val } } : c
    );
    onChange(updated);
  };
  const updateRewardItem = (choiceIdx: number, itemIdx: number, field: 'itemId' | 'quantity', val: string | number) => {
    const items = [...(choices[choiceIdx].outcome.receiveItems || [])];
    if (field === 'itemId') {
      items[itemIdx] = { ...items[itemIdx], itemId: val as string };
    } else {
      items[itemIdx] = { ...items[itemIdx], quantity: Math.max(1, val as number) };
    }
    updateOutcome(choiceIdx, 'receiveItems', items);
  };
  const addRewardItem = (choiceIdx: number) => {
    const items = [...(choices[choiceIdx].outcome.receiveItems || []), { itemId: '', quantity: 1 }];
    updateOutcome(choiceIdx, 'receiveItems', items);
  };
  const removeRewardItem = (choiceIdx: number, itemIdx: number) => {
    const items = (choices[choiceIdx].outcome.receiveItems || []).filter((_, i) => i !== itemIdx);
    updateOutcome(choiceIdx, 'receiveItems', items.length > 0 ? items : []);
  };

  return (
    <div className="space-y-1.5">
      <div className="space-y-2 max-h-72 overflow-y-auto admin-scrollbar">
        {choices.map((choice, i) => (
          <div key={i} className="rounded-md border border-white/[0.08] overflow-hidden">
            {/* Choice header */}
            <div className="flex items-center gap-2 bg-white/[0.03] px-2 py-1.5 border-b border-white/[0.06]">
              <span className="shrink-0 text-[9px] text-white/25 font-mono w-4">{i + 1}.</span>
              <input
                type="text"
                value={choice.text}
                onChange={e => updateText(i, e.target.value)}
                placeholder="Testo della scelta (es: 'Esplorare l'edificio')..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-yellow-300/80 placeholder-white/15 font-medium"
              />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Outcome fields */}
            <div className="p-2 space-y-1.5">
              <div>
                <label className="text-[9px] text-white/30 mb-0.5 block">Descrizione Risultato</label>
                <textarea
                  value={choice.outcome.description}
                  onChange={e => updateOutcome(i, 'description', e.target.value)}
                  placeholder="Cosa succede quando il giocatore fa questa scelta..."
                  rows={2}
                  className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 resize-y focus:outline-none focus:border-yellow-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-white/30 mb-0.5 block">Cambio HP</label>
                  <input
                    type="number"
                    value={choice.outcome.hpChange}
                    onChange={e => updateOutcome(i, 'hpChange', Number(e.target.value))}
                    placeholder="0"
                    className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={choice.outcome.endEvent}
                      onChange={e => updateOutcome(i, 'endEvent', e.target.checked)}
                      className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-yellow-500 focus:ring-yellow-500/50 accent-yellow-500"
                    />
                    <span className="text-[10px] text-white/50">Termina Evento</span>
                  </label>
                </div>
              </div>
              {/* Receive Items sub-section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] text-white/30">Oggetti Ricevuti (Ricompensa)</label>
                  <button
                    type="button"
                    onClick={() => addRewardItem(i)}
                    className="text-[9px] text-emerald-400/60 hover:text-emerald-400 flex items-center gap-0.5 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" /> Agg.
                  </button>
                </div>
                {(choice.outcome.receiveItems || []).length > 0 && (
                  <div className="space-y-1">
                    {(choice.outcome.receiveItems || []).map((item, ri) => (
                      <div key={ri} className="flex items-center gap-1 bg-white/[0.02] rounded px-1.5 py-1 border border-white/[0.04]">
                        <input
                          type="text"
                          value={item.itemId}
                          onChange={e => updateRewardItem(i, ri, 'itemId', e.target.value)}
                          placeholder="itemId (es: ammo_pistol)"
                          className="flex-1 text-[9px] bg-transparent border-none outline-none text-emerald-300/80 placeholder-white/10 font-mono min-w-0"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateRewardItem(i, ri, 'quantity', Number(e.target.value))}
                          min={1}
                          className="w-10 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded px-1 py-0.5 text-white/60 text-center font-mono focus:outline-none focus:border-emerald-500/40"
                        />
                        <button type="button" onClick={() => removeRewardItem(i, ri)} className="text-white/15 hover:text-red-400 transition-colors shrink-0">
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(choice.outcome.receiveItems || []).length === 0 && (
                  <p className="text-[9px] text-white/10 italic">Nessun oggetto</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {choices.length === 0 && (
          <p className="text-[10px] text-white/15 italic text-center py-3">Nessuna scelta — clicca + per aggiungere</p>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi scelta
      </button>
    </div>
  );
}

/** Convert plain text to safe HTML for contentEditable */
function plainTextToHtml(text: string): string {
  if (!text) return '';
  // If value already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*?>/i.test(text)) return text;
  // Escape HTML entities, then convert newlines
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

/** Rich Text Editor — contentEditable-based editor with formatting toolbar */
function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const isFirstMount = useRef(true);

  // Sync external value into contentEditable div
  useEffect(() => {
    if (editorRef.current) {
      // Always set on first mount, then only when value changes externally
      if (isFirstMount.current || !isInternalChange.current) {
        editorRef.current.innerHTML = plainTextToHtml(value);
      }
    }
    isFirstMount.current = false;
    isInternalChange.current = false;
  }, [value]);

  // Save/restore selection so toolbar buttons don't lose the user's text selection
  const saveSelection = (): Range | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
    return null;
  };
  const restoreSelection = (range: Range | null) => {
    if (!range) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  };

  const execCmd = (cmd: string, val?: string) => {
    const saved = saveSelection();
    if (editorRef.current) editorRef.current.focus();
    if (saved) restoreSelection(saved);
    document.execCommand(cmd, false, val);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const newHtml = editorRef.current.innerHTML;
      onChange(newHtml);
      // Reset flag after a tick so the effect doesn't overwrite
      setTimeout(() => { isInternalChange.current = false; }, 0);
    }
  };

  const handleColor = (color: string) => {
    execCmd('foreColor', color);
  };

  const handleHighlight = (color: string) => {
    execCmd('hiliteColor', color);
  };

  const clearFormatting = () => {
    execCmd('removeFormat');
  };

  // Toggle bullet list manually — document.execCommand('insertUnorderedList') is unreliable
  const toggleUnorderedList = () => {
    const saved = saveSelection();
    if (!editorRef.current || !saved) return;
    editorRef.current.focus();
    restoreSelection(saved);

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const content = range.extractContents();

    // Build list items from extracted content
    const fragment = document.createDocumentFragment();
    const items: Node[] = [];

    const collectBlockNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        text.split(/\n/).forEach((line, i) => {
          if (line.trim() || i === 0) {
            const li = document.createElement('li');
            li.textContent = line;
            items.push(li);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'li') {
          items.push(el);
        } else if (tag === 'br') {
          // br → new list item on next text
          const li = document.createElement('li');
          items.push(li);
        } else {
          // Wrap other block/inline elements in <li>
          const li = document.createElement('li');
          li.appendChild(el.cloneNode(true));
          items.push(li);
        }
      }
    };

    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      content.childNodes.forEach(collectBlockNodes);
    } else {
      collectBlockNodes(content);
    }

    // If no items extracted, use the selected text as a single item
    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = sel.toString();
      items.push(li);
    }

    const ul = document.createElement('ul');
    items.forEach(li => ul.appendChild(li));

    range.insertNode(ul);
    sel.removeAllRanges();
    sel.addRange(range);
    syncContent();
  };

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 rounded-t-md bg-white/[0.06] border border-white/[0.08] border-b-0">
        <ToolbarBtn onClick={() => execCmd('bold')} title="Grassetto"><b className="text-[11px]">B</b></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('italic')} title="Corsivo"><i className="text-[11px]">I</i></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('underline')} title="Sottolineato"><u className="text-[11px]">S</u></ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<h3>')} title="Titolo 3" className="font-bold text-[10px]">H3</ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<p>')} title="Paragrafo" className="text-[10px]">¶</ToolbarBtn>
        <ToolbarBtn onClick={toggleUnorderedList} title="Lista" className="text-[10px]">•≡</ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        {/* Color picker */}
        <PickerDropdown
          trigger={<><span className="text-[11px]">A</span><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 block" /></>}
          title="Colore testo"
        >
          {['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#ffffff', '#94a3b8'].map(c => (
            <button key={c} type="button" onMouseDown={e => { e.preventDefault(); handleColor(c); }}
              className="w-5 h-5 rounded-sm border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </PickerDropdown>
        {/* Highlight picker */}
        <PickerDropdown
          trigger={<span className="text-[11px]">🖌</span>}
          title="Evidenzia"
        >
          {[
            { c: 'rgba(34,197,94,0.3)', l: 'Verde' },
            { c: 'rgba(251,191,36,0.3)', l: 'Giallo' },
            { c: 'rgba(239,68,68,0.3)', l: 'Rosso' },
            { c: 'rgba(59,130,246,0.3)', l: 'Blu' },
            { c: 'rgba(168,85,247,0.3)', l: 'Viola' },
            { c: 'transparent', l: 'Rimuovi' },
          ].map(h => (
            <button key={h.l} type="button" onMouseDown={e => { e.preventDefault(); handleHighlight(h.c); }}
              className="px-1.5 py-0.5 text-[9px] rounded border border-white/10 hover:bg-white/10 transition-colors"
              style={h.c !== 'transparent' ? { backgroundColor: h.c } : {}}
              title={h.l}
            >
              {h.l}
            </button>
          ))}
        </PickerDropdown>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={clearFormatting} title="Rimuovi formattazione" className="text-[10px]">✕</ToolbarBtn>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={e => {
          // Allow paste but strip external styles, keep basic formatting
          e.preventDefault();
          const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, text);
          syncContent();
        }}
        data-placeholder={placeholder ?? 'Scrivi il contenuto del documento...'}
        className="min-h-[120px] max-h-[240px] overflow-y-auto admin-scrollbar text-[11px] bg-white/[0.04] border border-white/[0.1] rounded-b-md px-3 py-2.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 prose prose-invert prose-sm prose-p:text-white/80 prose-h3:text-yellow-300/80 prose-strong:text-white/90 prose-em:text-white/70 prose-li:text-white/70 [&_*]:text-[11px] [&_h3]:text-[13px] [&_li]:text-[10px]"
        style={{ lineHeight: '1.7' }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.2);
          pointer-events: none;
          font-style: italic;
        }
        [contenteditable][data-placeholder]:focus::before {
          content: none;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
          margin-left: 1.2em !important;
          padding-left: 0.5em !important;
        }
        [contenteditable] ul li {
          display: list-item !important;
          margin-left: 0.3em;
          padding-left: 0.2em;
        }
        [contenteditable] ul li::marker {
          color: rgba(255,255,255,0.6);
        }
      `}</style>
    </div>
  );
}

/** Click-toggle dropdown for toolbar pickers */
function PickerDropdown({ children, trigger, title }: { children: React.ReactNode; trigger: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        title={title}
        className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${open ? 'text-white/80 bg-white/[0.12]' : ''}`}
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-1.5 rounded-md bg-gray-900 border border-white/[0.12] shadow-xl flex flex-wrap gap-1 z-[9999]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Toolbar Button for RichTextEditor */
function ToolbarBtn({ children, onClick, title, className }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick?.(); }}
      title={title}
      className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

/** Trade Inventory Editor — table with itemId, priceItemId, priceQuantity for NPC trades */
function TradeInventoryEditor({ value, onChange }: { value: unknown; onChange: (v: { itemId: string; priceItemId: string; priceQuantity: number }[]) => void }) {
  let trades: { itemId: string; priceItemId: string; priceQuantity: number }[] = [];
  if (Array.isArray(value)) {
    trades = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { itemId: String(o.itemId ?? ''), priceItemId: String(o.priceItemId ?? ''), priceQuantity: Number(o.priceQuantity ?? 1) };
      }
      return { itemId: String(r), priceItemId: '', priceQuantity: 1 };
    });
  } else if (typeof value === 'string') {
    try { trades = JSON.parse(value) || []; } catch { trades = []; }
  }

  const add = () => onChange([...trades, { itemId: '', priceItemId: '', priceQuantity: 1 }]);
  const remove = (idx: number) => onChange(trades.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: string | number) => {
    onChange(trades.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Oggetto in Vendita</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium">Prezzo (Oggetto)</th>
              <th className="text-left px-2 py-1.5 text-white/40 font-medium w-20">Quantità</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr key={i} className="border-b border-white/[0.03] bg-gray-900 hover:bg-gray-800">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.itemId}
                    onChange={v => update(i, 'itemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch
                    value={trade.priceItemId}
                    onChange={v => update(i, 'priceItemId', v)}
                    endpoint="/api/admin/items"
                    labelKey="name"
                    iconKey="icon"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={trade.priceQuantity}
                    onChange={e => update(i, 'priceQuantity', Number(e.target.value))}
                    min={1}
                    className="w-full text-[10px] bg-gray-900 border border-white/[0.08] rounded px-1.5 py-1 text-white/70 font-mono focus:outline-none focus:border-yellow-500/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => remove(i)} className="text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-white/15 italic">
                  Nessuno scambio — clicca + per aggiungere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3 h-3" /> Aggiungi scambio
      </button>
    </div>
  );
}

/** Sequence Pattern Editor — visual direction buttons for puzzle sequence */
function SequencePatternEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const directions = ['up', 'down', 'left', 'right'];
  const dirIcons: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const dirColors: Record<string, string> = { up: 'border-purple-500/30 bg-purple-500/10 text-purple-300', down: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300', left: 'border-amber-500/30 bg-amber-500/10 text-amber-300', right: 'border-green-500/30 bg-green-500/10 text-green-300' };
  const pattern = Array.isArray(value) ? value : [];

  const add = (dir: string) => onChange([...pattern, dir]);
  const remove = (idx: number) => onChange(pattern.filter((_, i) => i !== idx));
  const clear = () => onChange([]);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 mb-1">
        {directions.map(dir => (
          <button
            key={dir}
            type="button"
            onClick={() => add(dir)}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${dirColors[dir]} hover:opacity-80 transition-opacity text-[10px]`}
          >
            <span className="text-xs">{dirIcons[dir]}</span>
            <span className="uppercase">{dir}</span>
          </button>
        ))}
        {pattern.length > 0 && (
          <button type="button" onClick={clear} className="text-[9px] text-red-400/50 hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-3 h-3 inline mr-0.5" />Cancella
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {pattern.map((dir, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${dirColors[dir] ?? 'border-white/10 bg-white/[0.04] text-white/60'} text-[10px] group/seq`}
          >
            <span className="text-[8px] text-white/25 font-mono">{i + 1}</span>
            <span className="text-xs">{dirIcons[dir] ?? '·'}</span>
            <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {pattern.length === 0 && (
          <span className="text-[9px] text-white/15 italic py-0.5">Clicca le frecce per creare la sequenza...</span>
        )}
      </div>
    </div>
  );
}

/** Locked Locations Editor — table with locationId (entity search), requiredItemId (entity search), lockedMessage */
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
              <tr key={i} className="border-b border-white/[0.03] bg-gray-900 hover:bg-gray-800">
                <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.locationId} onChange={v => update(i, 'locationId', v)} endpoint="/api/admin/locations" labelKey="name" />
                </td>
                <td className="px-1 py-1">
                  <MiniEntitySearch value={loc.requiredItemId} onChange={v => update(i, 'requiredItemId', v)} endpoint="/api/admin/items" labelKey="name" iconKey="icon" />
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
function SubAreasEditor({ value, onChange }: { value: unknown; onChange: (v: { id: string; name: string; description: string; defaultItems?: { itemId: string; quantity: number }[] }[]) => void }) {
  let areas: { id: string; name: string; description: string; defaultItems?: { itemId: string; quantity: number }[] }[] = [];
  if (Array.isArray(value)) {
    areas = value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return { id: String(o.id ?? ''), name: String(o.name ?? ''), description: String(o.description ?? ''), defaultItems: Array.isArray(o.defaultItems) ? (o.defaultItems as { itemId: string; quantity: number }[]) : undefined };
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
  const updateDefaultItem = (areaIdx: number, itemIdx: number, field: string, val: string | number) => {
    const di = areas[areaIdx].defaultItems ?? [];
    const updated = di.map((item, j) => j === itemIdx ? { ...item, [field]: val } : item);
    onChange(areas.map((a, i) => i === areaIdx ? { ...a, defaultItems: updated } : a));
  };

  const addDefaultItem = (areaIdx: number) => {
    const di = areas[areaIdx].defaultItems ?? [];
    onChange(areas.map((a, i) => i === areaIdx ? { ...a, defaultItems: [...di, { itemId: '', quantity: 1 }] } : a));
  };

  const removeDefaultItem = (areaIdx: number, itemIdx: number) => {
    const di = areas[areaIdx].defaultItems ?? [];
    onChange(areas.map((a, i) => i === areaIdx ? { ...a, defaultItems: di.filter((_, j) => j !== itemIdx) } : a));
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[28rem] overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        {areas.map((area, i) => (
          <div key={i} className="border-b border-white/[0.06] bg-gray-900 last:border-b-0">
            {/* Subarea header row */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="shrink-0 text-[9px] text-white/20 font-mono">{i + 1}.</span>
              <input type="text" value={area.id} onChange={e => update(i, 'id', e.target.value)} placeholder="safe_room" className="w-28 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 font-mono focus:outline-none focus:border-yellow-500/40" />
              <input type="text" value={area.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Safe Room" className="w-32 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40" />
              <input type="text" value={area.description} onChange={e => update(i, 'description', e.target.value)} placeholder="Un rifugio sicuro..." className="flex-1 min-w-0 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            {/* Default Items pool */}
            <div className="px-3 pb-2 pl-10">
              <div className="text-[9px] text-white/30 mb-1 flex items-center gap-1">
                <Package className="w-2.5 h-2.5" /> Oggetti Default
              </div>
              {(area.defaultItems && area.defaultItems.length > 0) ? (
                <div className="space-y-0.5">
                  {area.defaultItems.map((di, j) => (
                    <div key={j} className="flex items-center gap-1.5">
                      <MiniEntitySearch
                        value={di.itemId}
                        onChange={v => updateDefaultItem(i, j, 'itemId', v)}
                        endpoint="/api/admin/items"
                        labelKey="name"
                        iconKey="icon"
                      />
                      <input
                        type="number"
                        value={di.quantity}
                        onChange={e => updateDefaultItem(i, j, 'quantity', Number(e.target.value))}
                        min={1}
                        className="w-14 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 font-mono focus:outline-none focus:border-yellow-500/40"
                        title="Quantità"
                      />
                      <button type="button" onClick={() => removeDefaultItem(i, j)} className="text-white/15 hover:text-red-400 transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[9px] text-white/10 italic">Nessun oggetto</div>
              )}
              <button type="button" onClick={() => addDefaultItem(i)} className="flex items-center gap-0.5 text-[9px] text-cyan-400/60 hover:text-cyan-400 transition-colors mt-1">
                <Plus className="w-2.5 h-2.5" /> Aggiungi oggetto
              </button>
            </div>
          </div>
        ))}
        {areas.length === 0 && (
          <div className="px-2 py-4 text-center text-white/15 italic text-[10px]">Nessuna sotto-area</div>
        )}
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
                        <div className="flex-1">
                          <MiniEntitySearch
                            value={(choice.outcome?.combatEnemyIds ?? []).join(', ')}
                            onChange={v => updateChoice(ci, 'outcome.combatEnemyIds', v.split(',').map(s => s.trim()).filter(Boolean))}
                            endpoint="/api/admin/enemies"
                            labelKey="name"
                            iconKey="icon"
                          />
                        </div>
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
                          <MiniEntitySearch
                            value={ri.itemId}
                            onChange={v => updateRewardItem(ci, riIdx, 'itemId', v)}
                            endpoint="/api/admin/items"
                            labelKey="name"
                            iconKey="icon"
                          />
                          <input
                            type="number"
                            value={ri.quantity}
                            onChange={e => updateRewardItem(ci, riIdx, 'quantity', Number(e.target.value))}
                            min={1}
                            className="w-14 text-[9px] bg-gray-900 border border-white/[0.06] rounded px-1 py-0.5 text-white/50 font-mono focus:outline-none focus:border-green-500/30"
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
                      <label className="text-[8px] text-white/30 mb-0.5 block">Pattern Sequenza</label>
                      <SequencePatternEditor
                        value={event.puzzle.sequencePattern ?? []}
                        onChange={v => updatePuzzle('sequencePattern', v)}
                      />
                    </div>
                  )}
                  {event.puzzle.type === 'key_required' && (
                    <>
                      <div className="col-span-2">
                        <label className="text-[8px] text-white/30 mb-0.5 block">Item Richiesto</label>
                        <MiniEntitySearch
                          value={event.puzzle.requiredItemId ?? ''}
                          onChange={v => updatePuzzle('requiredItemId', v)}
                          endpoint="/api/admin/items"
                          labelKey="name"
                          iconKey="icon"
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
// Starting Items Editor — for character starting items
// ═══════════════════════════════════════════════════════════════

interface StartingItemEntry {
  itemId: string;
  quantity: number;
  isEquipped?: boolean;
}

function StartingItemsEditor({ value, onChange }: { value: unknown; onChange: (v: StartingItemEntry[]) => void }) {
  const [items, setItems] = useState<StartingItemEntry[]>(parseStartingItems(value));
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState<{ id: string; name: string; icon?: string; type?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/items');
        if (!res.ok) return;
        const data: Record<string, unknown>[] = await res.json();
        setAvailableItems(data.map(r => ({
          id: String(r.id),
          name: String(r.name ?? r.id),
          icon: String(r.icon ?? ''),
          type: String(r.type ?? ''),
        })));
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, []);

  const update = (newItems: StartingItemEntry[]) => {
    setItems(newItems);
    onChange(newItems);
  };

  const addItem = (itemId: string) => {
    if (items.find(i => i.itemId === itemId)) return;
    const item = availableItems.find(a => a.id === itemId);
    const isAutoEquip = item?.type === 'weapon';
    update([...items, { itemId, quantity: 1, isEquipped: isAutoEquip }]);
    setSearchQuery('');
  };

  const removeItem = (idx: number) => update(items.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => update(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  const toggleEquip = (idx: number) => update(items.map((it, i) => i === idx ? { ...it, isEquipped: !it.isEquipped } : it));

  const filtered = searchQuery.trim()
    ? availableItems.filter(a => !items.find(i => i.itemId === a.id) && (a.id.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase()))).slice(0, 10)
    : [];

  const getItemName = (itemId: string) => availableItems.find(a => a.id === itemId)?.name ?? itemId;
  const getItemIcon = (itemId: string) => availableItems.find(a => a.id === itemId)?.icon ?? '';
  const getItemType = (itemId: string) => availableItems.find(a => a.id === itemId)?.type ?? '';

  return (
    <div className="space-y-2">
      {/* Current items */}
      <div className="max-h-36 overflow-y-auto admin-scrollbar rounded-md border border-white/[0.08]">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-gray-900/95 z-10">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1 text-white/40 font-medium w-6">#</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium">Oggetto</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-14">Qtà</th>
              <th className="text-left px-2 py-1 text-white/40 font-medium w-16">Equip.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry, i) => {
              const type = getItemType(entry.itemId);
              const canEquip = ['weapon', 'armor', 'accessory'].includes(type);
              return (
                <tr key={entry.itemId + '-' + i} className="border-b border-white/[0.03] bg-gray-900 hover:bg-gray-800">
                  <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                  <td className="px-2 py-1 text-white/70">
                    <span className="mr-1">{getItemIcon(entry.itemId)}</span>
                    <span className="font-mono text-white/40 mr-1">{entry.itemId}</span>
                    <span className="text-white/60">{getItemName(entry.itemId)}</span>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={1}
                      value={entry.quantity}
                      onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                      className="w-12 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 text-center focus:outline-none focus:border-yellow-500/40"
                    />
                  </td>
                  <td className="px-1 py-1">
                    {canEquip ? (
                      <button type="button" onClick={() => toggleEquip(i)} className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${entry.isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/30 border border-white/[0.08] hover:border-white/20'}`}>
                        {entry.isEquipped ? 'Sì' : 'No'}
                      </button>
                    ) : (
                      <span className="text-[9px] text-white/15">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeItem(i)} className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-3 text-center text-white/15 italic">Nessun oggetto iniziale</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add item search */}
      {loaded && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca oggetto da aggiungere..."
            className="w-full text-[10px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/70 placeholder-white/15 focus:outline-none focus:border-yellow-500/40"
          />
          {searchQuery && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-white/[0.12] bg-gray-900/98 shadow-xl admin-scrollbar">
              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-white/[0.06] transition-colors text-white/70"
                >
                  <span className="mr-1">{item.icon}</span>
                  <span className="font-mono text-white/40 mr-1">{item.id}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseStartingItems(value: unknown): StartingItemEntry[] {
  if (Array.isArray(value)) {
    return value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return {
          itemId: String(o.itemId ?? o.id ?? ''),
          quantity: typeof o.quantity === 'number' ? o.quantity : 1,
          isEquipped: !!o.isEquipped,
        };
      }
      return { itemId: String(r), quantity: 1 };
    }).filter(e => e.itemId);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseStartingItems(parsed);
    } catch { /* ignore */ }
  }
  return [];
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
          const isFullWidth = f.type === 'textarea' || f.type === 'tag-editor' || f.type === 'entity-tag-editor' || f.type === 'item-pool' || f.type === 'text-list' || f.type === 'locked-locs' || f.type === 'sub-areas' || f.type === 'story-event' || f.type === 'status-apply' || f.type === 'quest-rewards' || f.type === 'event-choices' || f.type === 'rich-text-editor' || f.type === 'trade-inventory' || f.type === 'starting-items' || (f.colSpan === 3);
          const isDoubleWidth = f.colSpan === 2 && !isFullWidth;

          if (isEdit && f.key === 'id') {
            // ID is read-only in edit mode
            return (
              <div key={f.key} className={isFullWidth ? 'col-span-3' : isDoubleWidth ? 'col-span-2' : ''}>
                <label className="text-[10px] text-white/50 mb-0.5 block font-medium">
                  {f.label}
                  {f.helpText && <span className="text-[9px] text-white/25 ml-1" title={f.helpText}>(?)</span>}
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
                {f.helpText && <span className="text-[9px] text-white/25 ml-1" title={f.helpText}>(?)</span>}
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
                  iconKey={f.entityIconKey}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'tag-editor' ? (
                <TagEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'entity-tag-editor' ? (
                <EntityTagEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                  endpoint={f.entitySearchEndpoint ?? ''}
                  labelKey={f.entitySearchLabelKey ?? 'name'}
                  iconKey={f.entityIconKey}
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
              ) : f.type === 'quest-rewards' ? (
                <QuestRewardsEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'event-choices' ? (
                <EventChoicesEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'rich-text-editor' ? (
                <RichTextEditor
                  value={typeof val === 'string' ? val : ''}
                  onChange={v => handleChange(f.key, v)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'trade-inventory' ? (
                <TradeInventoryEditor
                  value={val}
                  onChange={v => handleChange(f.key, v)}
                />
              ) : f.type === 'starting-items' ? (
                <StartingItemsEditor
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
// Start Screen Editor — Custom tab for title screen configuration
// ═══════════════════════════════════════════════════════════════

interface SettingDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'range';
  group: string;
  groupLabel: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

const START_SCREEN_FIELDS: SettingDef[] = [
  // Texts
  { key: 'titleScreen.umbrellaText',  label: 'Testo Umbrella Corp',     type: 'text',     group: 'texts',  groupLabel: '📝 Testi',         placeholder: 'Umbrella Corporation Presenta' },
  { key: 'titleScreen.title',         label: 'Titolo Principale',        type: 'text',     group: 'texts',  groupLabel: '📝 Testi',         placeholder: 'RACCOON CITY' },
  { key: 'titleScreen.subtitle',      label: 'Sottotitolo',              type: 'text',     group: 'texts',  groupLabel: '📝 Testi',         placeholder: 'Escape from Horror' },
  { key: 'titleScreen.description',   label: 'Descrizione',              type: 'textarea', group: 'texts',  groupLabel: '📝 Testi',         placeholder: 'Testo descrittivo...', rows: 3 },
  { key: 'titleScreen.warningText',   label: 'Testo Avvertenza',         type: 'text',     group: 'texts',  groupLabel: '📝 Testi',         placeholder: '⚠ CONTENUTO HORROR...' },
  // Buttons
  { key: 'titleScreen.newGameBtn',    label: 'Tasto "Nuova Partita"',    type: 'text',     group: 'buttons', groupLabel: '🎮 Tasti',        placeholder: 'Nuova partita' },
  { key: 'titleScreen.loadGameBtn',   label: 'Tasto "Carica Partita"',   type: 'text',     group: 'buttons', groupLabel: '🎮 Tasti',        placeholder: 'Carica partita' },
  // Style — Colors
  { key: 'titleScreen.umbrellaColor', label: 'Colore Umbrella',          type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.titleColor',    label: 'Colore Titolo',            type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.subtitleColor', label: 'Colore Sottotitolo',       type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.btnTextColor',  label: 'Testo Pulsanti',           type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.btnBg',         label: 'Sfondo Pulsanti',          type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.btnBorder',     label: 'Bordo Pulsanti',           type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.btnHoverBg',    label: 'Sfondo Pulsanti Hover',    type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  { key: 'titleScreen.btnHoverBorder',label: 'Bordo Pulsanti Hover',     type: 'color',    group: 'colors', groupLabel: '🎨 Colori' },
  // Style — Effects
  { key: 'titleScreen.titleGlow',     label: 'Ombra Titolo (text-shadow)', type: 'text',   group: 'effects', groupLabel: '✨ Effetti',      placeholder: '0 0 40px rgba(220,38,38,0.6)...' },
  { key: 'titleScreen.btnGlowHover',  label: 'Glow Hover Pulsanti (rgba)', type: 'text',   group: 'effects', groupLabel: '✨ Effetti',      placeholder: 'rgba(220,38,38,0.4)' },
  { key: 'titleScreen.overlayOpacity',label: 'Opacità Overlay Sfondo',   type: 'range',    group: 'effects', groupLabel: '✨ Effetti',      min: 0, max: 1, step: 0.05 },
];

// ═══════════════════════════════════════════════════════════════
// Avatar Manager — manage avatar images for character creation
// ═══════════════════════════════════════════════════════════════

const PREDEFINED_AVATARS = [
  { id: 'avatar_soldier',   name: 'Avatar 1', emoji: '🪖' },
  { id: 'avatar_medic',     name: 'Avatar 2', emoji: '🩺' },
  { id: 'avatar_agent',     name: 'Avatar 3', emoji: '🕵️' },
  { id: 'avatar_cop',       name: 'Avatar 4', emoji: '👮' },
  { id: 'avatar_scientist', name: 'Avatar 5', emoji: '🔬' },
  { id: 'avatar_civilian',  name: 'Avatar 6', emoji: '👤' },
  { id: 'avatar_jax',       name: 'Avatar 7', emoji: '⚔️' },
  { id: 'avatar_elena',     name: 'Avatar 8', emoji: '🩺' },
  { id: 'avatar_marco',     name: 'Avatar 9', emoji: '✈️' },
];

function AvatarCard({ avatar, hasImage, isUploading, onUpload, onDelete }: {
  avatar: { id: string; name: string; emoji: string };
  hasImage: boolean;
  isUploading: boolean;
  onUpload: (id: string, file: File) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden group hover:border-white/[0.15] transition-colors"
    >
      {/* Image Area */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center overflow-hidden">
        {hasImage ? (
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
        <span className={`emoji-fallback text-5xl ${hasImage ? 'hidden absolute' : ''}`}>
          {avatar.emoji}
        </span>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-[11px] hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {hasImage ? 'Cambia' : 'Carica'}
          </button>
          {hasImage && (
            <button
              type="button"
              onClick={() => onDelete(avatar.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-[11px] hover:bg-red-600/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Rimuovi
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onUpload(avatar.id, file);
          }}
        />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-white/80 font-medium flex items-center gap-1.5">
              <span>{avatar.emoji}</span>
              {avatar.name}
            </div>
            <div className="text-[10px] text-white/25 font-mono mt-0.5">{avatar.id}</div>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasImage ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-white/[0.03] border border-white/[0.06] text-white/20'}`}>
            {hasImage ? '✓ Immagine' : '— Nessuna'}
          </span>
        </div>
      </div>
    </div>
  );
}

function AvatarManager() {
  const [avatarStatus, setAvatarStatus] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Check which avatars have images
  useEffect(() => {
    (async () => {
      setChecking(true);
      try {
        const res = await fetch('/api/admin/images');
        if (!res.ok) return;
        const items: Record<string, unknown>[] = await res.json();
        const status: Record<string, boolean> = {};
        PREDEFINED_AVATARS.forEach(a => {
          status[a.id] = items.some(r => r.id === a.id && r.data);
        });
        setAvatarStatus(status);
      } catch {
        // silent
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleUpload = async (avatarId: string, file: File) => {
    setUploadingId(avatarId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', avatarId);
    formData.append('name', `Avatar: ${avatarId}`);
    formData.append('category', 'avatar');

    try {
      const res = await fetch('/api/admin/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      setAvatarStatus(prev => ({ ...prev, [avatarId]: true }));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (avatarId: string) => {
    try {
      await fetch(`/api/admin/upload/image?id=${encodeURIComponent(avatarId)}`, { method: 'DELETE' });
      setAvatarStatus(prev => ({ ...prev, [avatarId]: false }));
    } catch {
      console.error('Delete error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto admin-scrollbar p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400/60" />
          Avatar Personaggio
        </h3>
        <p className="text-[11px] text-white/30 mt-1">
          Gestisci le immagini avatar utilizzate nella schermata di creazione personaggio. Ogni avatar ha un ID univoco (&quot;avatar_*&quot;) che viene usato dal gioco per caricare l&apos;immagine.
        </p>
      </div>

      {/* Loading */}
      {checking && (
        <div className="flex items-center gap-2 text-[11px] text-white/30 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento stato avatar...
        </div>
      )}

      {/* Avatar Grid */}
      {!checking && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_AVATARS.map(avatar => (
            <AvatarCard
              key={avatar.id}
              avatar={avatar}
              hasImage={avatarStatus[avatar.id]}
              isUploading={uploadingId === avatar.id}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="mt-6 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <p className="text-[10px] text-white/30">
          💡 <span className="text-white/40 font-medium">Consiglio:</span> Utilizza immagini quadrate (256×256 o 512×512) per risultati ottimali nella griglia di selezione personaggio. Formati supportati: PNG, JPG, WebP.
        </p>
        <p className="text-[10px] text-white/20 mt-1">
          Le immagini vengono caricate nella tabella <span className="font-mono text-white/30">game_images</span> con categoria &quot;avatar&quot; e ID corrispondente. Il CharacterCreator le carica tramite <span className="font-mono text-white/30">/api/media/image?id=avatar_*</span>
        </p>
      </div>
    </div>
  );
}

function StartScreenEditor() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bgHasFile, setBgHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load settings
  useEffect(() => {
    fetch('/api/admin/game-settings')
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
    fetch('/api/admin/images')
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
      const res = await fetch('/api/admin/game-settings', {
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
      const res = await fetch('/api/admin/upload/image', { method: 'POST', body: formData });
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
      await fetch('/api/admin/upload/image?id=bg_title', { method: 'DELETE' });
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
        <Loader2 className="w-6 h-6 animate-spin text-yellow-400/50" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto admin-scrollbar">
      {/* Banner */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-yellow-400 mb-1">🎮 Schermata Iniziale</h3>
        <p className="text-[11px] text-white/40">Personalizza tutti i testi, colori e lo stile dei pulsanti della schermata del titolo.</p>
      </div>

      {/* Background Image Upload */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-cyan-400/70" />
          <span className="text-[11px] font-semibold text-white/70">Sfondo Schermata (bg_title)</span>
          {bgHasFile && (
            <span className="flex items-center gap-1 text-[9px] text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded-full">
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
              className="border-2 border-dashed border-white/[0.08] rounded-lg px-4 py-4 flex flex-col items-center gap-2 cursor-pointer hover:border-yellow-500/30 hover:bg-yellow-500/[0.03] transition-colors"
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleBgUpload(f); }}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-yellow-400/50" />
              ) : (
                <>
                  <CloudUpload className="w-5 h-5 text-white/25" />
                  <span className="text-[10px] text-white/30">
                    {bgHasFile ? 'Trascina o clicca per sostituire' : 'Trascina o clicca per caricare (PNG/JPG/WebP, 1920×1080+)'}
                  </span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); }} />
            </div>
          </div>
          {bgHasFile && (
            <button onClick={handleBgRemove} className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors shrink-0">
              <Trash className="w-3 h-3" /> Rimuovi
            </button>
          )}
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`mx-6 mt-4 px-4 py-2.5 rounded-lg text-[11px] font-medium ${saveMsg.ok ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Settings Groups */}
      <div className="px-6 py-4 space-y-6">
        {Object.entries(groups).map(([groupKey, fields]) => (
          <div key={groupKey}>
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.04]">
              {fields[0].groupLabel}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map(f => {
                const val = settings[f.key] ?? '';
                return (
                  <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="text-[10px] text-white/50 mb-1 block font-medium">{f.label}</label>
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
                          className="flex-1 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 font-mono placeholder-white/20 focus:outline-none focus:border-yellow-500/50"
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
                          className="flex-1 accent-yellow-500"
                        />
                        <span className="text-[10px] text-white/50 font-mono w-8 text-right">{val}</span>
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={val}
                        onChange={e => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={f.rows ?? 3}
                        className="w-full text-[11px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-y font-mono"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={e => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full text-[11px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-yellow-500/50"
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
      <div className="px-6 py-4 border-t border-white/[0.06] sticky bottom-0 bg-gray-900/95 backdrop-blur">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30 hover:text-yellow-200 text-xs gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salva Impostazioni Schermata Iniziale
        </Button>
      </div>
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
    items: 0, quests: 0, events: 0, documents: 0, sounds: 0, images: 0, notifications: 0, locations: 0, npcs: 0, characters: 0, specials: 0, enemies: 0, 'enemy-abilities': 0, 'secret-rooms': 0, avatars: 0, 'start-screen': 0,
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
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory']);
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
      // Auto-set executionType from id for specials
      if (activeTab === 'specials' && processed.id) {
        processed.executionType = processed.id;
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
      const ARRAY_TYPES = new Set(['tag-editor', 'entity-tag-editor', 'item-pool', 'text-list', 'locked-locs', 'sub-areas', 'story-event', 'status-apply', 'quest-rewards', 'event-choices', 'trade-inventory']);
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
      // Auto-set executionType from id for specials
      if (activeTab === 'specials' && processed.id) {
        processed.executionType = processed.id;
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
      useGameStore.getState().bumpDataVersion();
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
                {!tab.custom && (
                <span className={`text-[10px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/20 text-yellow-200'
                    : 'bg-white/[0.06] text-white/30'
                }`}>
                  {counts[tab.id] ?? 0}
                </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Content Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {tabConfig.custom ? (
              activeTab === 'avatars' ? <AvatarManager /> : <StartScreenEditor />
            ) : (
            <>
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

            {/* Data-driven seed banners for all entity tabs */}
            {(() => {
              const banner = SEED_BANNERS[activeTab];
              if (!banner) return null;
              const BannerIcon = banner.icon;
              return (
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <BannerIcon className="w-4 h-4 text-white/25 shrink-0" />
                    <p className="text-[11px] text-white/30" dangerouslySetInnerHTML={{ __html: banner.description }} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const res = await fetch(banner.seedEndpoint, { method: 'POST' });
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
              );
            })()}

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
                    {filteredData.map((row, idx) => {
                      const rowId = String(row.id ?? '');
                      return (
                        <TableRow
                          key={rowId || `row-${idx}`}
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
          </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Create/Edit Dialog ── */}
      {activeTab === 'notifications' ? (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleDialogClose(); }}>
          <DialogContent
            className="bg-gray-900 border-white/[0.1] text-white sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
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
            className="bg-gray-900 border-white/[0.1] text-white sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[120]"
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
