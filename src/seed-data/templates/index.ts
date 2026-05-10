/**
 * Template Seed Data Registry
 * Maps templateId → seed data for each game entity type.
 * The existing src/seed-data/ files serve as the "survival-horror" template.
 * fantasy-rpg and sci-fi templates are defined in their own files.
 */
import type { ItemDefinition, EnemyDefinition, LocationDefinition, GameNPC, GameDocument, DynamicEvent, CharacterArchetype, SpecialAbilityDefinition } from '@/game/types';
import type { SeedAchievement } from '@/seed-data/achievements';
import type { SeedEnding } from '@/seed-data/endings';

export interface TemplateSeedData {
  items: Record<string, ItemDefinition>;
  enemies: Record<string, EnemyDefinition>;
  locations: Record<string, LocationDefinition>;
  npcs: Record<string, GameNPC>;
  documents: Record<string, GameDocument>;
  events: Record<string, DynamicEvent>;
  characters: CharacterArchetype[];
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
