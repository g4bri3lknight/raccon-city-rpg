import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ALL_SPECIAL_ABILITIES } from '@/game/data/specials';

/**
 * POST /api/admin/seed-specials — seed specials from static data into DB
 * Only inserts if not already present (upsert by id).
 */
export async function POST() {
  try {
    let created = 0;
    let updated = 0;

    for (const spec of ALL_SPECIAL_ABILITIES) {
      const existing = await db.gameSpecial.findUnique({ where: { id: spec.id } });
      if (existing) {
        await db.gameSpecial.update({
          where: { id: spec.id },
          data: {
            name: spec.name,
            description: spec.description,
            icon: spec.icon,
            targetType: spec.targetType,
            cooldown: spec.cooldown,
            category: spec.category,
            effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
          },
        });
        updated++;
      } else {
        await db.gameSpecial.create({
          data: {
            id: spec.id,
            name: spec.name,
            description: spec.description,
            icon: spec.icon,
            targetType: spec.targetType,
            cooldown: spec.cooldown,
            category: spec.category,
            effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      total: ALL_SPECIAL_ABILITIES.length,
      created,
      updated,
    });
  } catch (error) {
    console.error('[seed-specials] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
