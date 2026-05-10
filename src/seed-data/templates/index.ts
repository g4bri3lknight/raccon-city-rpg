/**
 * Template Seed Data Registry
 * Maps templateId → seed data for each game entity type.
 * The existing src/seed-data/ files serve as the "survival-horror" template.
 * fantasy-rpg and sci-fi templates are defined in their own files.
 */
import type { ItemDefinition, EnemyDefinition, LocationDefinition, GameNPC, GameDocument, DynamicEvent, CharacterArchetype, SpecialAbilityDefinition } from '@/game/types';
import type { SeedAchievement } from '@/seed-data/achievements';
import type { SeedEnding } from '@/seed-data/endings';

export interface SeedArchetype {
  id: string;
  name: string;
  displayName: string;
  description: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  hpGrowth: number;
  atkGrowth: number;
  defGrowth: number;
  spdGrowth: number;
  specialId: string;
  special2Id: string;
  passiveName: string;
  passiveDescription: string;
  startingItems: string; // JSON array
  portraitEmoji: string;
  sortOrder: number;
}

export interface TemplateSeedData {
  items: Record<string, ItemDefinition>;
  enemies: Record<string, EnemyDefinition>;
  locations: Record<string, LocationDefinition>;
  npcs: Record<string, GameNPC>;
  documents: Record<string, GameDocument>;
  events: Record<string, DynamicEvent>;
  characters: CharacterArchetype[];
  archetypes: SeedArchetype[];
  specials: SpecialAbilityDefinition[];
  recipes: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  achievements: SeedAchievement[];
  endings: SeedEnding[];
  secretRooms: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  bossPhases: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  bossPhaseAbilities: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  questChains: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  avatars: { id: string; name: string; emoji: string; sortOrder: number }[];
  mapLayout?: Record<string, { row: number; col: number; icon: string; danger: string }>;
}

// Lazy-loaded template data — only imported when needed
const templateDataCache = new Map<string, TemplateSeedData>();

async function loadSurvivalHorrorData(): Promise<TemplateSeedData> {
  const [
    { SEED_ITEMS },
    { SEED_ENEMIES },
    { SEED_LOCATIONS },
    { SEED_NPCS },
    { SEED_DOCUMENTS },
    { SEED_EVENTS },
    { SEED_CHARACTERS },
    { SEED_SPECIALS },
    { SEED_RECIPES },
    { SEED_ACHIEVEMENTS },
    { SEED_ENDINGS },
    { SEED_SECRET_ROOMS },
    { SEED_AVATARS },
    bossPhases,
    questChains,
  ] = await Promise.all([
    import('@/seed-data/items'),
    import('@/seed-data/enemies'),
    import('@/seed-data/locations'),
    import('@/seed-data/npcs'),
    import('@/seed-data/documents'),
    import('@/seed-data/events'),
    import('@/seed-data/characters'),
    import('@/seed-data/specials'),
    import('@/seed-data/recipes'),
    import('@/seed-data/achievements'),
    import('@/seed-data/endings'),
    import('@/seed-data/secret-rooms'),
    import('@/seed-data/avatars'),
    import('@/seed-data/boss-phases'),
    import('@/seed-data/quest-chains'),
  ]);

  const { SEED_BOSS_PHASES } = bossPhases;
  const { SEED_QUEST_CHAINS } = questChains;

  // Convert quest chains from record to array
  const questChainArray = Object.values(SEED_QUEST_CHAINS).map((chain: any) => ({
    ...chain,
    steps: chain.steps || [],
  }));

  // Convert boss phases to array with ability extraction
  const bossPhaseArray = SEED_BOSS_PHASES || [];
  const bossPhaseAbilityArray = bossPhaseArray.flatMap((phase: any) =>
    (phase.newAbilities || []).map((abilityId: string) => ({
      id: abilityId,
      ...getBossPhaseAbility(abilityId),
    }))
  );

  return {
    items: SEED_ITEMS,
    enemies: SEED_ENEMIES,
    locations: SEED_LOCATIONS,
    npcs: SEED_NPCS,
    documents: SEED_DOCUMENTS,
    events: SEED_EVENTS,
    characters: SEED_CHARACTERS,
    archetypes: [
      { id: 'sh_tank', name: 'tank', displayName: 'Tank', description: 'Specialista nella difesa e nell\'assorbimento danni. Protegge il gruppo.', maxHp: 150, atk: 10, def: 18, spd: 8, hpGrowth: 1.2, atkGrowth: 0.9, defGrowth: 1.3, spdGrowth: 0.8, specialId: 'shield_bash', special2Id: 'iron_wall', passiveName: 'Pelle di Ferro', passiveDescription: 'Riceve il 15% di danni in meno da tutti gli attacchi.', startingItems: JSON.stringify([{ itemId: 'pistol', quantity: 1 }, { itemId: 'bandage', quantity: 2 }]), portraitEmoji: '🛡️', sortOrder: 1 },
      { id: 'sh_healer', name: 'healer', displayName: 'Guaritore', description: 'Specialista nel supporto e nella cura. Mantiene il gruppo in vita.', maxHp: 90, atk: 8, def: 10, spd: 12, hpGrowth: 1.0, atkGrowth: 0.8, defGrowth: 0.9, spdGrowth: 1.1, specialId: 'heal_party', special2Id: 'purify', passiveName: 'Tocco Curativo', passiveDescription: 'Le cure ripristinano il 10% di HP aggiuntivo.', startingItems: JSON.stringify([{ itemId: 'herb_green', quantity: 3 }, { itemId: 'bandage', quantity: 2 }]), portraitEmoji: '💚', sortOrder: 2 },
      { id: 'sh_dps', name: 'dps', displayName: 'DPS', description: 'Specialista nell\'attacco e nei danni critici. Massima potenza offensiva.', maxHp: 100, atk: 20, def: 8, spd: 14, hpGrowth: 0.9, atkGrowth: 1.3, defGrowth: 0.7, spdGrowth: 1.2, specialId: 'headshot', special2Id: 'rapid_fire', passiveName: 'Punto Debole', passiveDescription: '+10% probabilità critico su tutti gli attacchi.', startingItems: JSON.stringify([{ itemId: 'shotgun', quantity: 1 }, { itemId: 'ammo_shotgun', quantity: 4 }]), portraitEmoji: '⚔️', sortOrder: 3 },
      { id: 'sh_control', name: 'control', displayName: 'Controllo', description: 'Specialista nel debuff e nel controllo dei nemici. Manipola il campo di battaglia.', maxHp: 95, atk: 12, def: 10, spd: 12, hpGrowth: 1.0, atkGrowth: 1.0, defGrowth: 1.0, spdGrowth: 1.0, specialId: 'flashbang', special2Id: 'smoke_screen', passiveName: 'Tattico', passiveDescription: '+20% probabilità di applicare status alterati.', startingItems: JSON.stringify([{ itemId: 'grenade_flash', quantity: 2 }, { itemId: 'knife', quantity: 1 }]), portraitEmoji: '🎯', sortOrder: 4 },
      { id: 'sh_custom', name: 'custom', displayName: 'Personalizzato', description: 'Archetipo personalizzabile. Distribuisci i punti stat liberamente.', maxHp: 100, atk: 12, def: 10, spd: 10, hpGrowth: 1.0, atkGrowth: 1.0, defGrowth: 1.0, spdGrowth: 1.0, specialId: '', special2Id: '', passiveName: '', passiveDescription: '', startingItems: JSON.stringify([{ itemId: 'pipe', quantity: 1 }, { itemId: 'bandage', quantity: 2 }]), portraitEmoji: '🎮', sortOrder: 99 },
    ],
    specials: SEED_SPECIALS,
    recipes: SEED_RECIPES,
    achievements: SEED_ACHIEVEMENTS,
    endings: SEED_ENDINGS,
    secretRooms: SEED_SECRET_ROOMS,
    bossPhases: bossPhaseArray,
    bossPhaseAbilities: bossPhaseAbilityArray,
    questChains: questChainArray,
    avatars: SEED_AVATARS,
    mapLayout: {
      city_outskirts: { row: 2, col: 1, icon: '🏚️', danger: 'bassa' },
      rpd_station: { row: 1, col: 2, icon: '🏛️', danger: 'media' },
      hospital_district: { row: 2, col: 3, icon: '🏥', danger: 'alta' },
      sewers: { row: 3, col: 2, icon: '🕳️', danger: 'molto alta' },
      laboratory_entrance: { row: 3, col: 3, icon: '⚗️', danger: 'critica' },
      clock_tower: { row: 4, col: 3, icon: '🕰️', danger: 'FINALE' },
    },
  };
}

/** Helper to get boss phase ability data from the existing seed */
function getBossPhaseAbility(_abilityId: string): Record<string, unknown> {
  // Abilities are already seeded via seed-enemy-abilities route
  // Boss phases just reference them by ID
  return { name: _abilityId, description: '', power: 1.0, chance: 50, effects: [] };
}

export async function getTemplateSeedData(templateId: string): Promise<TemplateSeedData | null> {
  if (templateDataCache.has(templateId)) {
    return templateDataCache.get(templateId)!;
  }

  let data: TemplateSeedData | null = null;

  switch (templateId) {
    case 'survival-horror':
      data = await loadSurvivalHorrorData();
      break;
    case 'fantasy-rpg': {
      const mod = await import('./fantasy-rpg');
      data = mod.FANTASY_SEED_DATA;
      break;
    }
    case 'sci-fi': {
      const mod = await import('./sci-fi');
      data = mod.SCIFI_SEED_DATA;
      break;
    }
    case 'blank':
    default:
      // Blank template has no seed data
      return null;
  }

  if (data) {
    templateDataCache.set(templateId, data);
  }

  return data;
}

/** Clear the cache (useful for testing) */
export function clearTemplateSeedCache(): void {
  templateDataCache.clear();
}
