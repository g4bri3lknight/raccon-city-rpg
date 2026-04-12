import { db } from '@/lib/db';
import { STATIC_ITEMS } from '@/game/data/items';
import { EQUIPMENT_ITEM_DEFINITIONS, MOD_ITEM_DEFINITIONS } from '@/game/data/equipment';
import { EQUIPMENT_STATS } from '@/game/data/equipment';
import { WEAPON_MODS } from '@/game/data/weapon-mods';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-items
 * Seeds all items from static data into the items table.
 * Includes base items, equipment (armor/accessories), and weapon mods.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    // Merge all item definitions: base + equipment + weapon mods
    const allItems = {
      ...STATIC_ITEMS,
      ...EQUIPMENT_ITEM_DEFINITIONS,
      ...MOD_ITEM_DEFINITIONS,
    };
    const entries = Object.values(allItems);
    let created = 0;
    let updated = 0;

    for (const item of entries) {
      const existing = await db.item.findUnique({ where: { id: item.id } });

      // Equipment stats from EQUIPMENT_STATS (armor/accessories)
      const eqStats = EQUIPMENT_STATS[item.id];
      // Weapon mod stats from WEAPON_MODS
      const modStats = WEAPON_MODS[item.id];

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
        weaponType: (item as any).weaponType ?? modStats?.type === 'melee' ? 'melee' : modStats?.type === 'ranged' ? 'ranged' : null,
        atkBonus: (item as any).atkBonus ?? eqStats?.atkBonus ?? modStats?.atkBonus ?? null,
        defBonus: eqStats?.defBonus ?? null,
        hpBonus: eqStats?.hpBonus ?? null,
        spdBonus: eqStats?.spdBonus ?? null,
        critBonus: eqStats?.critBonus ?? modStats?.critBonus ?? null,
        dodgeBonus: modStats?.dodgeBonus ?? null,
        statusBonus: modStats?.statusBonus ?? null,
        modType: modStats?.type === 'melee' ? 'melee' : modStats?.type === 'ranged' ? 'ranged' : modStats?.type === 'any' ? 'any' : null,
        specialEffect: eqStats?.specialEffect ? JSON.stringify(eqStats.specialEffect) : null,
        ammoType: (item as any).ammoType ?? null,
        effects: (item as any).effects ?? eqStats?.effects ? JSON.stringify((item as any).effects ?? eqStats?.effects) : '[]',
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
