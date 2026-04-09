import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { EQUIPMENT_STATS, ALL_EQUIPMENT_IDS, ALL_MOD_ITEM_IDS } from '@/game/data/equipment';
import { WEAPON_MODS } from '@/game/data/weapon-mods';

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
        defBonus: eq.defBonus ?? null,
        hpBonus: eq.hpBonus ?? null,
        spdBonus: eq.spdBonus ?? null,
        atkBonus: eq.atkBonus ?? null,
        critBonus: eq.critBonus ?? null,
        specialEffect: eq.specialEffect ? JSON.stringify(eq.specialEffect) : null,
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
        atkBonus: mod.atkBonus ?? null,
        critBonus: mod.critBonus ?? null,
        dodgeBonus: mod.dodgeBonus ?? null,
        statusBonus: mod.statusBonus ?? null,
        modType: mod.type, // 'melee' | 'ranged' | 'any'
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
