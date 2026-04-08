import { db } from '@/lib/db';
import { STATIC_ITEMS } from '@/game/data/items';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-items
 * Seeds all items from static data into the items table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(STATIC_ITEMS);
    let created = 0;
    let updated = 0;

    for (const item of entries) {
      const existing = await db.item.findUnique({ where: { id: item.id } });
      const data = {
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: item.stackable ?? true,
        maxStack: item.maxStack ?? 99,
        unico: (item as any).unico ?? false,
        weaponType: (item as any).weaponType ?? null,
        atkBonus: (item as any).atkBonus ?? null,
        ammoType: (item as any).ammoType ?? null,
        effectType: item.effect?.type ?? null,
        effectValue: item.effect?.value ?? null,
        effectTarget: item.effect?.target ?? null,
        effectStatusCured: item.effect?.statusCured ? JSON.stringify(item.effect.statusCured) : null,
        addSlots: item.effect?.type === 'add_slots' ? item.effect.value : null,
      };

      if (existing) {
        await db.item.update({ where: { id: item.id }, data });
        updated++;
      } else {
        await db.item.create({ data: { id: item.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({ success: true, total: entries.length, created, updated });
  } catch (error) {
    console.error('[seed-items] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
