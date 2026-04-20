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
    {
      key: 'ambient_sfx',
      label: '🔊 Suono Ambientale',
      mediaType: 'sound' as const,
      category: 'ambient',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'ambient_{entityId}',
      nameTemplate: 'Ambient: {entityId}',
      helpText: 'Suono ambientale in loop riprodotto quando il giocatore è in questa location',
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
    {
      key: 'sfx',
      label: '🔊 Suono Abilità',
      mediaType: 'sound' as const,
      category: 'combat',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_special_{entityId}',
      nameTemplate: 'Special SFX: {entityId}',
      helpText: 'Suono riprodotto quando viene usata questa abilità speciale. Se non caricato, viene usato il suono generico basato sulla categoria',
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
    {
      key: 'attack_sfx',
      label: '🔊 Suono Attacco',
      mediaType: 'sound' as const,
      category: 'enemy',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'attack_{entityId}',
      nameTemplate: 'Attack: {entityId}',
      helpText: 'Suono riprodotto quando questo nemico attacca. Se non caricato, viene usato il suono generico basato sul tipo di nemico',
    },
    {
      key: 'death_sfx',
      label: '🔊 Suono Morte',
      mediaType: 'sound' as const,
      category: 'enemy',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'death_{entityId}',
      nameTemplate: 'Death: {entityId}',
      helpText: 'Suono riprodotto quando questo nemico muore. Se non caricato, viene usato il suono generico',
    },
  ],
  'enemy-abilities': [
    {
      key: 'sfx',
      label: '🔊 Suono Abilità',
      mediaType: 'sound' as const,
      category: 'combat',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_eability_{entityId}',
      nameTemplate: 'Ability SFX: {entityId}',
      helpText: 'Suono riprodotto quando il nemico usa questa abilità. Se non caricato, viene usato il suono generico di attacco',
    },
  ],
  'boss-phases': [
    {
      key: 'sfx',
      label: '🔊 Suono Transizione Fase',
      mediaType: 'sound' as const,
      category: 'combat',
      accept: 'audio/wav,audio/mpeg,audio/ogg,audio/mp4',
      idTemplate: 'sfx_boss_phase_{entityId}',
      nameTemplate: 'Phase SFX: {entityId}',
      helpText: 'Suono riprodotto quando si attiva questa fase del boss',
    },
  ],
  'achievements': [],
  'endings': [],
  'secret-rooms': [],
  recipes: [],
  'avatars': [],
  'start-screen': [],
  'settings':     [],
};
