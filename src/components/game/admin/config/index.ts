// Barrel file for admin config modules
export type { TabId, TabConfig, TabGroupDef } from './tabGroups';
export { TAB_GROUPS, TABS } from './tabGroups';

export type { SeedBannerConfig } from './seedBanners';
export { SEED_BANNERS } from './seedBanners';

export { ENUM_LABELS, getEnumLabel, getEnumHint } from './enumLabels';

export type { FieldDef } from './fieldDefinitions';
export { FIELD_MAP } from './fieldDefinitions';

export type { EffectFieldDef, EffectTypeDef, EffectCategory } from './effectTypes';
export {
  EFFECT_TYPES_CONFIG, EFFECT_TARGET_OPTIONS, EFFECT_STATUS_LIST, EFFECT_STAT_LIST,
  EFFECT_CATEGORY_COLORS, parseEffectsArray, getDefaultEffect, TRIGGER_OPTIONS,
} from './effectTypes';

export type { MediaUploadDef as ConfigMediaUploadDef } from './mediaUploads';
export { MEDIA_UPLOADS as CONFIG_MEDIA_UPLOADS } from './mediaUploads';

export type { ColumnDef } from './tableColumns';
export { TABLE_COLUMNS } from './tableColumns';

// Settings types shared between StartScreenEditor and GameSettingsEditor
export interface SettingDef {
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

export const START_SCREEN_FIELDS: SettingDef[] = [
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

// Difficulty types shared between DifficultyConfigEditor and GameSettingsEditor
export const DIFFICULTY_LEVELS = ['sopravvissuto', 'normale', 'incubo'] as const;
export type DiffLevel = typeof DIFFICULTY_LEVELS[number];

export interface DiffConfig {
  label: string;
  color: string;
  icon: string;
  statMult: number;
  lootMult: number;
  minEnemies: number;
  maxEnemies: number;
  expMult: number;
  enemyCritChance: number;
  description: string;
}

export const DIFFICULTY_DEFAULTS: Record<DiffLevel, DiffConfig> = {
  sopravvissuto: { label: 'Sopravvissuto', color: '#22c55e', icon: '🏃', statMult: 0.6, lootMult: 1.5, minEnemies: 1, maxEnemies: 2, expMult: 1.4, enemyCritChance: 5, description: 'Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia.' },
  normale: { label: 'Normale', color: '#eab308', icon: '⚔️', statMult: 0.85, lootMult: 1.1, minEnemies: 1, maxEnemies: 3, expMult: 1.0, enemyCritChance: 10, description: 'Bilanciato. La vera esperienza di Raccoon City.' },
  incubo: { label: 'Incubo', color: '#ef4444', icon: '💀', statMult: 1.4, lootMult: 0.6, minEnemies: 2, maxEnemies: 4, expMult: 0.8, enemyCritChance: 20, description: 'Nemici potenti, poco bottino. Solo per i più coraggiosi.' },
};

// Gameplay settings types for GameSettingsEditor
export interface GameplaySettingDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'json' | 'item-box-defaults' | 'range' | 'toggle';
  group: string;
  groupLabel: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
  colSpan?: number;
}

export const GAMEPLAY_SETTINGS_FIELDS: GameplaySettingDef[] = [
  // Inventory
  { key: 'gameplay.startingInventorySlots', label: 'Slot Iniziali', type: 'number', group: 'inventory', groupLabel: '📦 Inventario', min: 2, max: 20, helpText: 'Numero di slot quando il personaggio viene creato' },
  { key: 'gameplay.maxInventorySlots', label: 'Slot Massimi', type: 'number', group: 'inventory', groupLabel: '📦 Inventario', min: 6, max: 30, helpText: 'Limite massimo di slot espandibili con le borse' },
  // Item Box
  { key: 'gameplay.maxItemBoxSlots', label: 'Slot Massimi', type: 'number', group: 'itembox', groupLabel: '🗃️ Item Box', min: 10, max: 200, helpText: 'Numero massimo di slot nella cassa degli oggetti (safe room)' },
  { key: 'gameplay.defaultItemBoxItems', label: 'Oggetti Default', type: 'item-box-defaults', group: 'itembox', groupLabel: '🗃️ Item Box', colSpan: 3, helpText: 'Oggetti presenti nella Item Box al primo accesso a una safe room' },
  // ── Combat ──
  { key: 'combat.missChance', label: '% Mancata Base', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 50, step: 1, helpText: 'Probabilità base che un attacco manchi il bersaglio' },
  { key: 'combat.baseCritChance', label: '% Critico Base', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 100, step: 1, helpText: 'Probabilità base di colpo critico' },
  { key: 'combat.dpsCritChance', label: '% Critico DPS', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 100, step: 1, helpText: 'Probabilità critico per l\'archetipo DPS' },
  { key: 'combat.critMultiplier', label: 'Moltiplicatore Critico', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 5, step: 0.1, helpText: 'Moltiplicatore danni su colpo critico (es. 1.8 = +80%)' },
  { key: 'combat.defenseConstant', label: 'Costante Difesa', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 200, step: 1, helpText: 'Costante nella formula di riduzione danni: DEF / (DEF + N)' },
  { key: 'combat.defendMultiplier', label: 'Molt. Difesa Attiva', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 5, step: 0.1, helpText: 'Moltiplicatore difesa quando il personaggio si difende' },
  { key: 'combat.maxDefendReduction', label: 'Riduzione Max Difesa', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 0.99, step: 0.01, helpText: 'Cap massimo alla riduzione danni in difesa (0.9 = max 90%)' },
  { key: 'combat.adrenalineDmgBonus', label: 'Bonus Danno Adrenalina', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 3, step: 0.05, helpText: 'Moltiplicatore danni con status adrenalina (es. 1.25 = +25%)' },
  { key: 'combat.controlStatusBonus', label: '% Bonus Status Control', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 100, step: 1, helpText: 'Bonus percentuale applicazione status per archetipo Control' },
  { key: 'combat.healerCritHealChance', label: '% Crit Heal Healer', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0, max: 100, step: 1, helpText: 'Probabilità di cure critiche (x1.5) per l\'archetipo Healer' },
  { key: 'combat.healerCritHealMult', label: 'Molt. Crit Heal', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 5, step: 0.1, helpText: 'Moltiplicatore cura su crit heal' },
  { key: 'combat.damageVarianceMin', label: '% Varianza Danno Min', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 50, max: 100, step: 1, helpText: 'Percentuale minima della varianza danno (es. 85 = -15%)' },
  { key: 'combat.damageVarianceMax', label: '% Varianza Danno Max', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 100, max: 200, step: 1, helpText: 'Percentuale massima della varianza danno (es. 115 = +15%)' },
  { key: 'combat.noMissDmgVarianceMin', label: '% Varianza No-Miss Min', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 50, max: 100, step: 1, helpText: 'Varianza min per attacchi garantiti (Sparo Mirato)' },
  { key: 'combat.noMissDmgVarianceMax', label: '% Varianza No-Miss Max', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 100, max: 200, step: 1, helpText: 'Varianza max per attacchi garantiti (Sparo Mirato)' },
  { key: 'combat.defaultStatusDuration', label: 'Durata Status Default', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 10, step: 1, helpText: 'Durata in turni degli status inflitti in combattimento (se non specificata)' },
  { key: 'combat.defaultCooldown', label: 'Cooldown Speciale Default', type: 'number', group: 'combat', groupLabel: '⚔️ Combattimento', min: 1, max: 10, step: 1, helpText: 'Cooldown in turni delle abilità speciali (se non specificato)' },
  { key: 'combat.speed', label: 'Velocità Combattimento', type: 'range', group: 'combat', groupLabel: '⚔️ Combattimento', min: 0.5, max: 3.0, step: 0.1, helpText: 'Velocità delle animazioni di combattimento. 0.5 = lento, 1.0 = normale, 3.0 = veloce' },
  { key: 'combat.autoUseItems', label: 'AI usa oggetti', type: 'toggle', group: 'combat', groupLabel: '⚔️ Combattimento', helpText: 'Se attivo, il combattimento automatico usa pozze e oggetti di cura quando necessario' },
];
