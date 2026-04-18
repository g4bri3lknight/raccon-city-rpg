// ═══════════════════════════════════════════════════════════════
// Shared types and data for admin sub-components
// ═══════════════════════════════════════════════════════════════

export interface MediaUploadDef {
  key: string;          // unique key for this upload slot
  label: string;        // display label
  mediaType: 'image' | 'sound';
  category: string;     // game_images.category or game_sounds.category
  accept: string;       // MIME types for file input
  idTemplate: string;   // template: {entityId} gets replaced
  nameTemplate?: string;// display name template
  helpText?: string;    // optional tooltip
}

// Tab IDs that have media uploads — subset of the full TabId union
type MediaTabId = 'items' | 'quests' | 'events' | 'documents' | 'sounds' | 'images' | 'notifications' | 'locations' | 'npcs' | 'characters' | 'specials' | 'enemies' | 'enemy-abilities' | 'boss-phases' | 'achievements' | 'endings' | 'secret-rooms' | 'recipes' | 'avatars' | 'start-screen' | 'settings';

export const MEDIA_UPLOADS: Record<MediaTabId, MediaUploadDef[]> = {
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
  'boss-phases': [],
  'achievements': [],
  'endings': [],
  'secret-rooms': [],
  recipes: [],
  'avatars': [],
  'start-screen': [],
  'settings':     [],
};
