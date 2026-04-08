import { db } from '@/lib/db';
import { STATIC_DYNAMIC_EVENTS } from '@/game/data/dynamic-events';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-events
 * Seeds all dynamic events from static data into the dynamic_events table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(STATIC_DYNAMIC_EVENTS);
    let created = 0;
    let updated = 0;

    for (const evt of entries) {
      const existing = await db.dynamicEvent.findUnique({ where: { id: evt.id } });
      const data = {
        title: evt.title,
        description: evt.description,
        icon: evt.icon,
        type: evt.type,
        duration: evt.duration,
        encounterRateMod: evt.effect?.encounterRateMod ?? 0,
        enemyStatMult: evt.effect?.enemyStatMult ?? 1.0,
        searchBonus: evt.effect?.searchBonus ?? false,
        damagePerTurn: evt.effect?.damagePerTurn ?? 0,
        triggerChance: evt.triggerChance,
        minTurn: evt.minTurn,
        locationIds: JSON.stringify(evt.locationIds ?? []),
        onTriggerMessage: evt.onTriggerMessage,
        onEndMessage: evt.onEndMessage,
        choices: JSON.stringify(evt.choices ?? []),
      };

      if (existing) {
        await db.dynamicEvent.update({ where: { id: evt.id }, data });
        updated++;
      } else {
        await db.dynamicEvent.create({ data: { id: evt.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({ success: true, total: entries.length, created, updated });
  } catch (error) {
    console.error('[seed-events] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
