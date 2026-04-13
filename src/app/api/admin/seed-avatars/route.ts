import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_AVATARS } from '@/seed-data/avatars';

/**
 * POST /api/admin/seed-avatars
 * Seeds all avatar data from static definitions.
 * Idempotent: uses upsert logic.
 */
export async function POST() {
  try {
    let created = 0, updated = 0;

    for (const avatar of SEED_AVATARS) {
      const existing = await db.gameAvatar.findUnique({ where: { id: avatar.id } });
      const data = {
        name: avatar.name,
        emoji: avatar.emoji ?? '👤',
        sortOrder: avatar.sortOrder ?? 0,
      };
      if (existing) {
        await db.gameAvatar.update({ where: { id: avatar.id }, data });
        updated++;
      } else {
        await db.gameAvatar.create({ data: { id: avatar.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seed avatar completato: ${SEED_AVATARS.length} avatar (${created} nuove, ${updated} agg.)`,
    });
  } catch (error) {
    console.error('[seed-avatars] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
