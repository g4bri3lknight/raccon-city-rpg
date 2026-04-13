// Static enemy data has been moved to src/seed-data/enemies.ts for seed routes.
// At runtime, enemies are loaded from DB via loader.ts → /api/game-data.

// Image URL helpers — private
function getEnemyImageUrl(enemyId: string): string {
  const IMAGE_ALIASES: Record<string, string> = {
    tyrant_boss: 'tyrant',
    nemesis_boss: 'nemesis',
  };
  const imageId = IMAGE_ALIASES[enemyId] || enemyId;
  return `/api/media/image?id=${imageId}`;
}

function getCharacterImageUrl(archetypeId: string): string {
  return `/api/media/image?id=${archetypeId}`;
}

// Dynamic image maps — automatically generate URLs for any enemy/character ID
// No hardcoded ID list — works for any entity in the DB
export const ENEMY_IMAGES: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getEnemyImageUrl(prop);
  },
});

export const CHARACTER_IMAGES: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getCharacterImageUrl(prop);
  },
});
