import {
  Package, Scroll, Zap, FileText, Bell, MapPin, Users, Swords,
  Skull, Trophy, Flag, DoorOpen, Settings, Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from './tabGroups';

// ═══════════════════════════════════════════════════════════════
// Seed Banner Configuration (data-driven, template-aware)
// ═══════════════════════════════════════════════════════════════
export interface SeedBannerConfig {
  icon: LucideIcon;
  label: string;
  description: string;
  /** API endpoint to call for seeding. If seedBody is set, sends POST with JSON body. */
  seedEndpoint: string;
  /** Optional JSON body to send with the seed request. Used for template-aware seeding. */
  seedBody?: Record<string, string>;
}

const SEED_BASE = '/api/admin/seed-template';

export const SEED_BANNERS: Record<TabId, SeedBannerConfig | null> = {
  items:        { icon: Package,   label: 'Oggetti',    description: 'Gestione <span className="text-white/50 font-medium">oggetti</span> — aggiungi, modifica o rimuovi armi, cure, munizioni, chiavi e altro dal gioco', seedEndpoint: SEED_BASE, seedBody: { section: 'items' } },
  quests:       { icon: Scroll,   label: 'Missioni',    description: 'Gestione <span className="text-white/50 font-medium">missioni</span> — configura le quest associate agli NPC con obiettivi e ricompense', seedEndpoint: SEED_BASE, seedBody: { section: 'quest-chains' } },
  events:       { icon: Zap,      label: 'Eventi',      description: 'Gestione <span className="text-white/50 font-medium">eventi dinamici</span> — blackout, allarmi, incendi e altri eventi casuali che colpiscono l\'esplorazione', seedEndpoint: SEED_BASE, seedBody: { section: 'events' } },
  documents:    { icon: FileText, label: 'Documenti',   description: 'Gestione <span className="text-white/50 font-medium">documenti</span> — diari, file classificati, note e foto ritrovabili durante l\'esplorazione', seedEndpoint: SEED_BASE, seedBody: { section: 'documents' } },
  sounds:       null,
  images:       null,
  notifications:{ icon: Bell,     label: 'Notifiche',   description: 'Configurazione <span className="text-white/50 font-medium">notifiche</span> — personalizza colori, label, animazioni e media per ogni tipo di notifica', seedEndpoint: '/api/admin/seed-notifications' },
  locations:    { icon: MapPin,   label: 'Location',    description: 'Gestione <span className="text-white/50 font-medium">location</span> — aggiungi, modifica o rimuovi aree di gioco. Ogni location può avere sfondo, nemici, oggetti e eventi personalizzati.', seedEndpoint: SEED_BASE, seedBody: { section: 'locations' } },
  npcs:         { icon: Users,    label: 'NPC',         description: 'Gestione <span className="text-white/50 font-medium">NPC</span> — aggiungi, modifica o rimuovi personaggi non giocanti. Ogni NPC ha dialoghi, quest e scambi personalizzati.', seedEndpoint: SEED_BASE, seedBody: { section: 'npcs' } },
  archetypes:   { icon: Swords,   label: 'Archetipi',   description: 'Gestione <span className="text-white/50 font-medium">archetipi</span> — template di statistiche, abilità e equipaggiamento iniziale per i personaggi giocabili', seedEndpoint: SEED_BASE, seedBody: { section: 'characters' } },
  characters:   { icon: Swords,   label: 'Personaggi',  description: 'Gestione <span className="text-white/50 font-medium">personaggi</span> — aggiungi, modifica o rimuovi archetipi giocabili. Ogni personaggio ha statistiche, abilità speciali e oggetti iniziali.', seedEndpoint: SEED_BASE, seedBody: { section: 'characters' } },
  specials:     { icon: Zap,      label: 'Abilità',    description: 'Gestione <span className="text-white/50 font-medium">abilità personaggi</span> — configura poteri offensivi, difensivi, di supporto e controllo per i personaggi', seedEndpoint: SEED_BASE, seedBody: { section: 'specials' } },
  enemies:      { icon: Skull,    label: 'Nemici',      description: 'Gestione <span className="text-white/50 font-medium">nemici</span> — aggiungi, modifica o rimuovi creature e boss. Ogni nemico ha statistiche, abilità e tabelle loot.', seedEndpoint: SEED_BASE, seedBody: { section: 'enemies' } },
  'enemy-abilities': { icon: Swords, label: 'Abilità Nemici', description: 'Gestione <span className="text-white/50 font-medium">abilità nemici</span> — configura attacchi, potenza, probabilità d\'uso ed effetti di status per i nemici', seedEndpoint: '/api/admin/seed-enemy-abilities' },
  'boss-phases': { icon: Skull, label: 'Fasi Boss', description: 'Gestione <span className="text-white/50 font-medium">fasi boss</span> — configura transizioni di fase per i boss: soglia HP, moltiplicatori stat e nuove abilità', seedEndpoint: SEED_BASE, seedBody: { section: 'boss-phases' } },
  'achievements': { icon: Trophy, label: 'Traguardi', description: 'Gestione <span className="text-white/50 font-medium">traguardi</span> — configura obiettivi, condizioni di sblocco, ricompense e categorie dei traguardi', seedEndpoint: SEED_BASE, seedBody: { section: 'achievements' } },
  'endings': { icon: Flag, label: 'Finale', description: 'Gestione <span className="text-white/50 font-medium">finali</span> — configura i finali multipli del gioco con requisiti, descrizioni e priorità', seedEndpoint: SEED_BASE, seedBody: { section: 'endings' } },
  'secret-rooms': { icon: DoorOpen, label: 'Stanze Segrete', description: 'Gestione <span className="text-white/50 font-medium">stanze segrete</span> — aggiungi, modifica o rimuovi stanze nascoste scopribili durante l\'esplorazione', seedEndpoint: SEED_BASE, seedBody: { section: 'secret-rooms' } },
  recipes:      { icon: Settings, label: 'Ricette',     description: 'Gestione <span className="text-white/50 font-medium">ricette di crafting</span> — configura materiali, risultati e difficoltà delle ricette', seedEndpoint: SEED_BASE, seedBody: { section: 'recipes' } },
  'quest-chains': { icon: Link2, label: 'Quest Chain', description: 'Gestione <span className="text-white/50 font-medium">quest chain</span> — configura catene di missioni multi-step con branching e ricompense finali', seedEndpoint: SEED_BASE, seedBody: { section: 'quest-chains' } },
  avatars:      null,
  'start-screen': null,
  settings:     null,
};
