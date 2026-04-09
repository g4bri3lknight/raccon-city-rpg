import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES as STATIC_ENEMIES } from '@/game/data/enemies';

type SeedResult = { entity: string; total: number; created: number; updated: number };

async function seedEnemies(): Promise<SeedResult> {
  const entries = Object.values(STATIC_ENEMIES);
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const enemy = entries[i];
    const existing = await db.gameEnemy.findUnique({ where: { id: enemy.id } });
    const data = {
      name: enemy.name,
      description: enemy.description,
      maxHp: enemy.maxHp,
      atk: enemy.atk,
      def: enemy.def,
      spd: enemy.spd,
      icon: enemy.icon,
      expReward: enemy.expReward,
      lootTable: JSON.stringify(enemy.lootTable ?? []),
      abilities: JSON.stringify(enemy.abilities ?? []),
      isBoss: enemy.isBoss,
      variantGroup: enemy.variantGroup ?? '',
      sortOrder: i,
    };
    if (existing) { await db.gameEnemy.update({ where: { id: enemy.id }, data }); updated++; }
    else { await db.gameEnemy.create({ data: { id: enemy.id, ...data } }); created++; }
  }
  return { entity: 'enemies', total: entries.length, created, updated };
}

/**
 * POST /api/admin/seed-enemies
 * Seeds all enemy data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    const result = await seedEnemies();
    return NextResponse.json({
      success: true,
      message: 'Seed nemici completato',
      ...result,
    });
  } catch (error) {
    console.error('[seed-enemies] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
