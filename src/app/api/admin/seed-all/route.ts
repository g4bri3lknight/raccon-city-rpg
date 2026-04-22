import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_ITEMS } from '@/seed-data/items';
import { SEED_EVENTS } from '@/seed-data/events';
import { SEED_DOCUMENTS } from '@/seed-data/documents';
import { SEED_LOCATIONS } from '@/seed-data/locations';
import { SEED_NPCS } from '@/seed-data/npcs';
import { SEED_CHARACTERS } from '@/seed-data/characters';
import { SEED_SPECIALS } from '@/seed-data/specials';
import { SEED_ENEMIES } from '@/seed-data/enemies';
import { EQUIPMENT_STATS, ALL_EQUIPMENT_IDS, ALL_MOD_ITEM_IDS, WEAPON_MODS } from '@/seed-data/equipment';
import { SEED_SECRET_ROOMS } from '@/seed-data/secret-rooms';

import { safeErrorResponse } from '@/lib/api-utils';
const MAP_LAYOUT: Record<string, { row: number; col: number; icon: string; danger: string }> = {
  city_outskirts: { row: 2, col: 1, icon: '🏚️', danger: 'bassa' },
  rpd_station: { row: 1, col: 2, icon: '🏛️', danger: 'media' },
  hospital_district: { row: 2, col: 3, icon: '🏥', danger: 'alta' },
  sewers: { row: 3, col: 2, icon: '🕳️', danger: 'molto alta' },
  laboratory_entrance: { row: 3, col: 3, icon: '⚗️', danger: 'critica' },
  clock_tower: { row: 4, col: 3, icon: '🕰️', danger: 'FINALE' },
};

type SeedResult = { entity: string; total: number; created: number; updated: number };

async function seedItems(): Promise<SeedResult> {
  const entries = Object.values(SEED_ITEMS);
  let created = 0, updated = 0;
  for (const item of entries) {
    const existing = await db.item.findUnique({ where: { id: item.id } });
    const data = {
      name: item.name, description: item.description, type: item.type, rarity: item.rarity,
      icon: item.icon, usable: item.usable, equippable: item.equippable,
      stackable: item.stackable ?? true, maxStack: item.maxStack ?? 99,
      unico: (item as any).unico ?? false,
      weaponType: (item as any).weaponType ?? null,
      ammoType: (item as any).ammoType ?? null,
      effects: (item as any).effects ? JSON.stringify((item as any).effects) : '[]',
    };
    if (existing) { await db.item.update({ where: { id: item.id }, data }); updated++; }
    else { await db.item.create({ data: { id: item.id, ...data } }); created++; }
  }
  return { entity: 'items', total: entries.length, created, updated };
}

async function seedEvents(): Promise<SeedResult> {
  const entries = Object.values(SEED_EVENTS);
  let created = 0, updated = 0;
  for (const evt of entries) {
    const existing = await db.dynamicEvent.findUnique({ where: { id: evt.id } });
    const data = {
      title: evt.title, description: evt.description, icon: evt.icon, type: evt.type,
      duration: evt.duration,
      encounterRateMod: evt.effect?.encounterRateMod ?? 0,
      enemyStatMult: evt.effect?.enemyStatMult ?? 1.0,
      searchBonus: evt.effect?.searchBonus ?? false,
      damagePerTurn: evt.effect?.damagePerTurn ?? 0,
      triggerChance: evt.triggerChance, minTurn: evt.minTurn,
      locationIds: JSON.stringify(evt.locationIds ?? []),
      onTriggerMessage: evt.onTriggerMessage, onEndMessage: evt.onEndMessage,
      choices: JSON.stringify(evt.choices ?? []),
    };
    if (existing) { await db.dynamicEvent.update({ where: { id: evt.id }, data }); updated++; }
    else { await db.dynamicEvent.create({ data: { id: evt.id, ...data } }); created++; }
  }
  return { entity: 'events', total: entries.length, created, updated };
}

async function seedDocuments(): Promise<SeedResult> {
  const entries = Object.values(SEED_DOCUMENTS);
  let created = 0, updated = 0;
  for (const doc of entries) {
    const existing = await db.document.findUnique({ where: { id: doc.id } });
    const data = {
      title: doc.title, content: doc.content, type: doc.type, locationId: doc.locationId,
      icon: doc.icon || '', rarity: doc.rarity, isSecret: doc.isSecret ?? false,
      hintRequired: (doc as any).hintRequired ?? null,
    };
    if (existing) { await db.document.update({ where: { id: doc.id }, data }); updated++; }
    else { await db.document.create({ data: { id: doc.id, ...data } }); created++; }
  }
  return { entity: 'documents', total: entries.length, created, updated };
}

async function seedLocations(): Promise<SeedResult> {
  const entries = Object.values(SEED_LOCATIONS);
  let created = 0, updated = 0;
  for (const loc of entries) {
    const layout = MAP_LAYOUT[loc.id];
    const existing = await db.gameLocation.findUnique({ where: { id: loc.id } });
    const data = {
      name: loc.name, description: loc.description, encounterRate: loc.encounterRate,
      enemyPool: JSON.stringify(loc.enemyPool), itemPool: JSON.stringify(loc.itemPool),
      storyEvent: loc.storyEvent ? JSON.stringify(loc.storyEvent) : '',
      nextLocations: JSON.stringify(loc.nextLocations),
      isBossArea: loc.isBossArea, bossId: loc.bossId ?? null,
      ambientText: JSON.stringify(loc.ambientText ?? []),
      lockedLocations: JSON.stringify(loc.lockedLocations ?? []),
      subAreas: JSON.stringify(loc.subAreas ?? []),
      mapRow: layout?.row ?? null, mapCol: layout?.col ?? null,
      mapIcon: layout?.icon ?? null, mapDanger: layout?.danger ?? null,
    };
    if (existing) { await db.gameLocation.update({ where: { id: loc.id }, data }); updated++; }
    else { await db.gameLocation.create({ data: { id: loc.id, ...data } }); created++; }
  }
  return { entity: 'locations', total: entries.length, created, updated };
}

async function seedQuests(): Promise<SeedResult> {
  const npcEntries = Object.values(SEED_NPCS);
  let created = 0, updated = 0, total = 0;
  for (const npc of npcEntries) {
    const quest = (npc as any).quest;
    if (!quest) continue;
    total++;
    const existing = await db.sideQuest.findUnique({ where: { id: quest.id } });
    const data = {
      npcId: npc.id, name: quest.name, description: quest.description,
      type: quest.type, targetId: quest.targetId, targetCount: quest.targetCount,
      rewardItems: JSON.stringify(quest.rewardItems ?? []),
      rewardExp: quest.rewardExp ?? 0,
      rewardDialogue: JSON.stringify(quest.rewardDialogue ?? []),
      sortOrder: 0, prerequisiteQuestId: quest.prerequisiteQuestId ?? null,
    };
    if (existing) { await db.sideQuest.update({ where: { id: quest.id }, data }); updated++; }
    else { await db.sideQuest.create({ data: { id: quest.id, ...data } }); created++; }
  }
  return { entity: 'quests', total, created, updated };
}

async function seedNpcs(): Promise<SeedResult> {
  const entries = Object.values(SEED_NPCS);
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const npc = entries[i];
    const existing = await db.gameNPC.findUnique({ where: { id: npc.id } });
    const data = {
      name: npc.name, portrait: npc.portrait, locationId: npc.locationId,
      greeting: npc.greeting, dialogues: JSON.stringify(npc.dialogues),
      farewell: npc.farewell,
      questId: (npc as any).quest?.id ?? null,
      tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
      questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
      sortOrder: i,
    };
    if (existing) { await db.gameNPC.update({ where: { id: npc.id }, data }); updated++; }
    else { await db.gameNPC.create({ data: { id: npc.id, ...data } }); created++; }
  }
  return { entity: 'npcs', total: entries.length, created, updated };
}

async function seedCharacters(): Promise<SeedResult> {
  const entries = SEED_CHARACTERS;
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const arch = entries[i];
    const existing = await db.gameCharacter.findUnique({ where: { id: arch.id } });
    const data = {
      archetype: arch.id, name: arch.name, displayName: arch.displayName,
      description: arch.description, maxHp: arch.maxHp, atk: arch.atk,
      def: arch.def, spd: arch.spd,
      specialName: arch.specialName, specialDescription: arch.specialDescription,
      specialCost: arch.specialCost,
      special2Name: arch.special2Name, special2Description: arch.special2Description,
      special2Cost: arch.special2Cost,
      passiveDescription: arch.passiveDescription, portraitEmoji: arch.portraitEmoji,
      startingItems: JSON.stringify(arch.startingItems), sortOrder: i,
    };
    if (existing) { await db.gameCharacter.update({ where: { id: arch.id }, data }); updated++; }
    else { await db.gameCharacter.create({ data: { id: arch.id, ...data } }); created++; }
  }
  return { entity: 'characters', total: entries.length, created, updated };
}

async function seedSpecials(): Promise<SeedResult> {
  const entries = SEED_SPECIALS;
  let created = 0, updated = 0;
  for (const spec of entries) {
    const existing = await db.gameSpecial.findUnique({ where: { id: spec.id } });
    const data = {
      name: spec.name, description: spec.description, icon: spec.icon,
      targetType: spec.targetType, cooldown: spec.cooldown, category: spec.category,
      effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
    };
    if (existing) { await db.gameSpecial.update({ where: { id: spec.id }, data }); updated++; }
    else { await db.gameSpecial.create({ data: { id: spec.id, ...data } }); created++; }
  }
  return { entity: 'specials', total: entries.length, created, updated };
}

async function seedEnemies(): Promise<SeedResult> {
  const entries = Object.values(SEED_ENEMIES);
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const enemy = entries[i];
    const existing = await db.gameEnemy.findUnique({ where: { id: enemy.id } });
    const data = {
      name: enemy.name, description: enemy.description,
      maxHp: enemy.maxHp, atk: enemy.atk, def: enemy.def, spd: enemy.spd,
      icon: enemy.icon, expReward: enemy.expReward,
      lootTable: JSON.stringify(enemy.lootTable ?? []),
      abilities: JSON.stringify(enemy.abilities ?? []),
      isBoss: enemy.isBoss, variantGroup: enemy.variantGroup ?? '',
      sortOrder: i,
    };
    if (existing) { await db.gameEnemy.update({ where: { id: enemy.id }, data }); updated++; }
    else { await db.gameEnemy.create({ data: { id: enemy.id, ...data } }); created++; }
  }
  return { entity: 'enemies', total: entries.length, created, updated };
}

async function seedEquipment(): Promise<SeedResult> {
  let created = 0, updated = 0, total = 0;
  // Seed armor & accessories
  for (const id of ALL_EQUIPMENT_IDS) {
    const eq = EQUIPMENT_STATS[id];
    if (!eq) continue;
    total++;
    const existing = await db.item.findUnique({ where: { id } });
    const data: Record<string, unknown> = {
      name: eq.name, description: eq.description, type: eq.slot,
      rarity: eq.rarity, icon: eq.icon, usable: false, equippable: true,
      stackable: false, maxStack: 1, unico: true,
      effects: JSON.stringify(eq.effects || []),
    };
    if (existing) { await db.item.update({ where: { id }, data }); updated++; }
    else { await db.item.create({ data: { id, ...data } }); created++; }
  }
  // Seed weapon mods
  for (const modId of ALL_MOD_ITEM_IDS) {
    const mod = WEAPON_MODS[modId];
    if (!mod) continue;
    total++;
    const existing = await db.item.findUnique({ where: { id: modId } });
    const data: Record<string, unknown> = {
      name: mod.name, description: mod.description, type: 'weapon_mod',
      rarity: mod.rarity, icon: mod.icon, usable: false, equippable: false,
      stackable: false, maxStack: 1, unico: true,
      modType: mod.type,
      effects: JSON.stringify(mod.effects || []),
    };
    if (existing) { await db.item.update({ where: { id: modId }, data }); updated++; }
    else { await db.item.create({ data: { id: modId, ...data } }); created++; }
  }
  return { entity: 'equipment', total, created, updated };
}

async function seedSecretRooms(): Promise<SeedResult> {
  const entries = SEED_SECRET_ROOMS;
  let created = 0, updated = 0;
  for (const room of entries) {
    const existing = await db.secretRoom.findUnique({ where: { id: room.id } });
    const data = {
      locationId: room.locationId,
      name: room.name,
      description: room.description,
      discoveryMethod: room.discoveryMethod,
      requiredDocumentId: room.requiredDocumentId,
      requiredNpcQuestId: room.requiredNpcQuestId,
      searchChance: room.searchChance,
      hint: room.hint,
      lootTable: room.lootTable,
      uniqueItemId: room.uniqueItemId,
      uniqueItemQuantity: room.uniqueItemQuantity,
      sortOrder: room.sortOrder,
    };
    if (existing) { await db.secretRoom.update({ where: { id: room.id }, data }); updated++; }
    else { await db.secretRoom.create({ data: { id: room.id, ...data } }); created++; }
  }
  return { entity: 'secret-rooms', total: entries.length, created, updated };
}

/**
 * POST /api/admin/seed-all
 * Master seed endpoint — populates ALL game data from static definitions.
 * Idempotent: uses upsert logic (create if missing, update if exists).
 */
export async function POST() {
  try {
    const results: SeedResult[] = await Promise.all([
      seedItems(),
      seedEquipment(),
      seedEvents(),
      seedDocuments(),
      seedLocations(),
      seedQuests(),
      seedNpcs(),
      seedCharacters(),
      seedSpecials(),
      seedEnemies(),
      seedSecretRooms(),
    ]);

    const adminKey = process.env.ADMIN_KEY || 'raccoon_admin_2024';
    const adminHeaders = { headers: { 'x-admin-key': adminKey } };

    // Seed enemy-abilities after enemies (it also updates enemy ability references)
    const abilitiesRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/seed-enemy-abilities`, { method: 'POST', ...adminHeaders });
    const abilitiesData = await abilitiesRes.json();
    results.push({ entity: 'enemy-abilities', total: abilitiesData.abilitiesCount ?? 0, created: abilitiesData.result?.created ?? 0, updated: abilitiesData.result?.updated ?? 0 });

    // Seed boss phases (after enemy-abilities since they reference ability IDs)
    const bossPhasesRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/seed-boss-phases`, { method: 'POST', ...adminHeaders });
    const bossPhasesData = await bossPhasesRes.json();
    results.push({ entity: 'boss-phases', total: bossPhasesData.result?.total ?? 0, created: bossPhasesData.result?.created ?? 0, updated: bossPhasesData.result?.updated ?? 0 });

    // Seed achievements
    const achievementsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/seed-achievements`, { method: 'POST', ...adminHeaders });
    const achievementsData = await achievementsRes.json();
    results.push({ entity: 'achievements', total: achievementsData.result?.total ?? 0, created: achievementsData.result?.created ?? 0, updated: achievementsData.result?.updated ?? 0 });

    // Seed endings
    const endingsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/seed-endings`, { method: 'POST', ...adminHeaders });
    const endingsData = await endingsRes.json();
    results.push({ entity: 'endings', total: endingsData.result?.total ?? 0, created: endingsData.result?.created ?? 0, updated: endingsData.result?.updated ?? 0 });

    // Seed avatars
    const avatarsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/seed-avatars`, { method: 'POST', ...adminHeaders });
    const avatarsData = await avatarsRes.json();
    results.push({ entity: 'avatars', total: avatarsData.result?.total ?? 9, created: 0, updated: 0 });

    const summary = results.map(r => `${r.entity}: ${r.created} nuovi, ${r.updated} agg. (totale ${r.total})`).join('\n');

    return NextResponse.json({
      success: true,
      message: 'Seed completato per tutte le entità',
      results,
      summary,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed All]');
  }
}
