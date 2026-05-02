import React from 'react';
import {
  MapPin, Users, Scroll, Zap, FileText, DoorOpen,
  Swords, Sparkles, Skull, Flame, Crown,
  Package, Wrench, Trophy, Flag, Bell,
  Monitor, Settings, Link2, Gamepad2, Palette,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
export type TabId = 'games' | 'items' | 'quests' | 'events' | 'documents' | 'notifications' | 'locations' | 'npcs' | 'archetypes' | 'characters' | 'specials' | 'enemies' | 'enemy-abilities' | 'boss-phases' | 'achievements' | 'endings' | 'secret-rooms' | 'avatars' | 'start-screen' | 'settings' | 'theme' | 'recipes' | 'quest-chains';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  endpoint: string;
  entityLabel: string; // singular label for "Aggiungi Nuovo ..."
  custom?: boolean; // if true, renders a custom panel instead of CRUD table
  group?: string; // group key for collapsible sections
}

export interface TabGroupDef {
  id: string;
  label: string;
  icon: string;
  defaultOpen?: boolean;
  tabs: TabConfig[];
}

export const TAB_GROUPS: TabGroupDef[] = [
  { id: 'hub', label: 'Giochi', icon: '🎮', defaultOpen: true, tabs: [
    { id: 'games', label: 'Gestione Giochi', icon: <Gamepad2 className="w-4 h-4" />, endpoint: '/api/games', entityLabel: 'Gioco', custom: true, group: 'hub' },
  ]},
  { id: 'world', label: 'Mondo', icon: '🌍', defaultOpen: true, tabs: [
    { id: 'locations', label: 'Location & Mappa', icon: <MapPin className="w-4 h-4" />, endpoint: '/api/admin/locations', entityLabel: 'Location', custom: true, group: 'world' },
    { id: 'npcs', label: 'NPC', icon: <Users className="w-4 h-4" />, endpoint: '/api/admin/npcs', entityLabel: 'NPC', group: 'world' },
    { id: 'quests', label: 'Missioni', icon: <Scroll className="w-4 h-4" />, endpoint: '/api/admin/quests', entityLabel: 'Missione', group: 'world' },
    { id: 'quest-chains', label: 'Quest Chain', icon: <Link2 className="w-4 h-4" />, endpoint: '/api/admin/quest-chains', entityLabel: 'Quest Chain', group: 'world' },
    { id: 'events', label: 'Eventi', icon: <Zap className="w-4 h-4" />, endpoint: '/api/admin/events', entityLabel: 'Evento', group: 'world' },
    { id: 'documents', label: 'Documenti', icon: <FileText className="w-4 h-4" />, endpoint: '/api/admin/documents', entityLabel: 'Documento', group: 'world' },
    { id: 'secret-rooms', label: 'Stanze Segrete', icon: <DoorOpen className="w-4 h-4" />, endpoint: '/api/admin/secret-rooms', entityLabel: 'Stanza Segreta', group: 'world' },
  ]},
  { id: 'combat', label: 'Combattimento', icon: '⚔️', defaultOpen: true, tabs: [
    { id: 'archetypes', label: 'Archetipi', icon: <Swords className="w-4 h-4" />, endpoint: '/api/admin/archetypes', entityLabel: 'Archetipo', group: 'combat' },
    { id: 'characters', label: 'Personaggi', icon: <Swords className="w-4 h-4" />, endpoint: '/api/admin/characters', entityLabel: 'Personaggio', group: 'combat' },
    { id: 'specials', label: 'Abilità', icon: <Sparkles className="w-4 h-4" />, endpoint: '/api/admin/specials', entityLabel: 'Abilità', group: 'combat' },
    { id: 'enemies', label: 'Nemici', icon: <Skull className="w-4 h-4" />, endpoint: '/api/admin/enemies', entityLabel: 'Nemico', group: 'combat' },
    { id: 'enemy-abilities', label: 'Abilità Nemici', icon: <Flame className="w-4 h-4" />, endpoint: '/api/admin/enemy-abilities', entityLabel: 'Abilità Nemica', group: 'combat' },
    { id: 'boss-phases', label: 'Fasi Boss', icon: <Crown className="w-4 h-4" />, endpoint: '/api/admin/boss-phases', entityLabel: 'Fase Boss', group: 'combat' },
  ]},
  { id: 'items', label: 'Oggetti', icon: '📦', defaultOpen: true, tabs: [
    { id: 'items', label: 'Oggetti', icon: <Package className="w-4 h-4" />, endpoint: '/api/admin/items', entityLabel: 'Oggetto', group: 'items' },
    { id: 'recipes', label: 'Ricette', icon: <Wrench className="w-4 h-4" />, endpoint: '/api/admin/recipes', entityLabel: 'Ricetta', group: 'items' },
  ]},
  { id: 'progress', label: 'Progressione', icon: '🏆', tabs: [
    { id: 'achievements', label: 'Traguardi', icon: <Trophy className="w-4 h-4" />, endpoint: '/api/admin/achievements', entityLabel: 'Traguardo', group: 'progress' },
    { id: 'endings', label: 'Finale', icon: <Flag className="w-4 h-4" />, endpoint: '/api/admin/endings', entityLabel: 'Finale', group: 'progress' },
  ]},
  { id: 'config', label: 'IMPOSTAZIONI', icon: '⚙️', tabs: [
    { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-4 h-4" />, endpoint: '/api/admin/notifications', entityLabel: 'Notifica', group: 'config' },
    { id: 'avatars', label: 'Avatar', icon: <Users className="w-4 h-4" />, endpoint: '/api/admin/images', entityLabel: 'Avatar', custom: true, group: 'config' },
    { id: 'start-screen', label: 'Schermata Iniziale', icon: <Monitor className="w-4 h-4" />, endpoint: '/api/admin/game-settings', entityLabel: 'Impostazione', custom: true, group: 'config' },
    { id: 'theme', label: 'Tema', icon: <Palette className="w-4 h-4" />, endpoint: '/api/admin/game-settings', entityLabel: 'Impostazione', custom: true, group: 'config' },
    { id: 'settings', label: 'Varie', icon: <Settings className="w-4 h-4" />, endpoint: '/api/admin/game-settings', entityLabel: 'Impostazione', custom: true, group: 'config' },
  ]},
];

// Flat TABS array (backward compatible for lookups)
export const TABS: TabConfig[] = TAB_GROUPS.flatMap(g => g.tabs);
