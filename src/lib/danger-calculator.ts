// ── Shared danger level calculator ──
// Used by both API (server-side) and loader (client-side)

export interface EnemyStats {
  maxHp: number;
  atk: number;
  def: number;
  abilities: unknown[];
  isBoss: boolean;
}

/**
 * Calculates a danger level (0-3) for a location based on its enemy pool.
 *
 * Formula:
 *   - If pool is empty → 0 (Sicura)
 *   - If any boss is present → 3 (Mortale)
 *   - Otherwise: compute a threat score per unique enemy:
 *       score = atk * 2 + def + maxHp / 15 + max(0, abilities.length - 1) * 5
 *   - Take the max score across all unique enemies
 *   - Map: < 45 → 0, < 60 → 1, < 78 → 2, else → 3
 *
 * Thresholds are calibrated to the current enemy roster:
 *   - Zombies (~atk 8-12) → score ~30-45 → 0-1
 *   - Cerberus/Licker (~atk 18-22) → score ~55-68 → 1-2
 *   - Hunter/Ivy (~atk 25-30) → score ~70-85 → 2-3
 *   - Bosses → 3 (forced)
 */
export function calculateDangerLevel(
  enemyPool: string[],
  enemies: Record<string, EnemyStats>,
): number {
  if (!enemyPool || enemyPool.length === 0) return 0;

  const uniqueIds = [...new Set(enemyPool)];
  let maxScore = 0;
  let hasBoss = false;

  for (const id of uniqueIds) {
    const enemy = enemies[id];
    if (!enemy) continue;
    if (enemy.isBoss) {
      hasBoss = true;
      break;
    }
    const abilitiesLen = Array.isArray(enemy.abilities) ? enemy.abilities.length : 0;
    const score =
      enemy.atk * 2 +
      enemy.def +
      enemy.maxHp / 15 +
      Math.max(0, abilitiesLen - 1) * 5;
    if (score > maxScore) maxScore = score;
  }

  if (hasBoss) return 3;
  if (maxScore < 45) return 0;
  if (maxScore < 60) return 1;
  if (maxScore < 78) return 2;
  return 3;
}
