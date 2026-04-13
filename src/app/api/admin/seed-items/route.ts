import { db } from '@/lib/db';
import { SEED_ITEMS } from '@/seed-data/items';
import { EQUIPMENT_ITEM_DEFINITIONS, MOD_ITEM_DEFINITIONS, EQUIPMENT_STATS, WEAPON_MODS } from '@/seed-data/equipment';
import { NextResponse } from 'next/server';

// Weapon → weaponType / ammoType mapping for base weapons in SEED_ITEMS
const WEAPON_TYPE_MAP: Record<string, { weaponType: string; ammoType?: string }> = {
  pipe:              { weaponType: 'melee' },
  scalpel:           { weaponType: 'melee' },
  combat_knife:      { weaponType: 'melee' },
  pistol:            { weaponType: 'ranged', ammoType: 'ammo_pistol' },
  shotgun:           { weaponType: 'ranged', ammoType: 'ammo_shotgun' },
  magnum:            { weaponType: 'ranged', ammoType: 'ammo_magnum' },
  machinegun:        { weaponType: 'ranged', ammoType: 'ammo_machinegun' },
  grenade_launcher:  { weaponType: 'ranged', ammoType: 'ammo_grenade' },
};

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
      ...SEED_ITEMS,
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
      // Weapon type from lookup map (for base weapons)
      const weaponMap = WEAPON_TYPE_MAP[item.id];

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
        weaponType: (item as any).weaponType ?? weaponMap?.weaponType ?? (modStats?.type === 'melee' ? 'melee' : modStats?.type === 'ranged' ? 'ranged' : null),
        ammoType: (item as any).ammoType ?? weaponMap?.ammoType ?? null,
        modType: modStats?.type === 'melee' ? 'melee' : modStats?.type === 'ranged' ? 'ranged' : modStats?.type === 'any' ? 'any' : null,
        effects: JSON.stringify((item as any).effects || eqStats?.effects || modStats?.effects || []),
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
