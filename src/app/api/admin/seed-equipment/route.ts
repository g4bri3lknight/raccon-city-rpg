import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { EQUIPMENT_STATS, ALL_EQUIPMENT_IDS, ALL_MOD_ITEM_IDS, WEAPON_MODS } from '@/seed-data/equipment';

import { safeErrorResponse } from '@/lib/api-utils';
export async function POST() {
  try {
    let created = 0;
    let updated = 0;

    // Seed armor & accessory items
    for (const id of ALL_EQUIPMENT_IDS) {
      const eq = EQUIPMENT_STATS[id];
      if (!eq) continue;
      const existing = await db.item.findUnique({ where: { id } });
      const data: Record<string, unknown> = {
        name: eq.name,
        description: eq.description,
        type: eq.slot, // 'armor' or 'accessory'
        rarity: eq.rarity,
        icon: eq.icon,
        usable: false,
        equippable: true,
        stackable: false,
        maxStack: 1,
        unico: true,
        effects: JSON.stringify(eq.effects || []),
      };
      if (existing) {
        await db.item.update({ where: { id }, data });
        updated++;
      } else {
        await db.item.create({ data: { id, ...data } });
        created++;
      }
    }

    // Seed weapon mod items
    for (const modId of ALL_MOD_ITEM_IDS) {
      const mod = WEAPON_MODS[modId];
      if (!mod) continue;
      const existing = await db.item.findUnique({ where: { id: modId } });
      const data: Record<string, unknown> = {
        name: mod.name,
        description: mod.description,
        type: 'weapon_mod',
        rarity: mod.rarity,
        icon: mod.icon,
        usable: false,
        equippable: false,
        stackable: false,
        maxStack: 1,
        unico: true,
        modType: mod.type, // 'melee' | 'ranged' | 'any'
        effects: JSON.stringify(mod.effects || []),
      };
      if (existing) {
        await db.item.update({ where: { id: modId }, data });
        updated++;
      } else {
        await db.item.create({ data: { id: modId, ...data } });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      message: `Seeded ${created} new + ${updated} updated equipment items (6 armors, 8 accessori, 8 weapon mods)`,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Equipment]');
  }
}
