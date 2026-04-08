import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { STATIC_ITEMS } from '@/game/data/items';
import { STATIC_DYNAMIC_EVENTS } from '@/game/data/dynamic-events';
import { STATIC_DOCUMENTS } from '@/game/data/documents';
import { STATIC_LOCATIONS } from '@/game/data/locations';
import { NPCS } from '@/game/data/npcs';
import { CHARACTER_ARCHETYPES } from '@/game/data/characters';
import { ALL_SPECIAL_ABILITIES } from '@/game/data/specials';

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
  const entries = Object.values(STATIC_ITEMS);
  let created = 0, updated = 0;
  for (const item of entries) {
    const existing = await db.item.findUnique({ where: { id: item.id } });
    const data = {
      name: item.name, description: item.description, type: item.type, rarity: item.rarity,
      icon: item.icon, usable: item.usable, equippable: item.equippable,
      stackable: item.stackable ?? true, maxStack: item.maxStack ?? 99,
      unico: (item as any).unico ?? false,
      weaponType: (item as any).weaponType ?? null, atkBonus: (item as any).atkBonus ?? null,
      ammoType: (item as any).ammoType ?? null,
      effectType: item.effect?.type ?? null, effectValue: item.effect?.value ?? null,
      effectTarget: item.effect?.target ?? null,
      effectStatusCured: item.effect?.statusCured ? JSON.stringify(item.effect.statusCured) : null,
      addSlots: item.effect?.type === 'add_slots' ? item.effect.value : null,
    };
    if (existing) { await db.item.update({ where: { id: item.id }, data }); updated++; }
    else { await db.item.create({ data: { id: item.id, ...data } }); created++; }
  }
  return { entity: 'items', total: entries.length, created, updated };
}

async function seedEvents(): Promise<SeedResult> {
  const entries = Object.values(STATIC_DYNAMIC_EVENTS);
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
  const entries = Object.values(STATIC_DOCUMENTS);
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
  const entries = Object.values(STATIC_LOCATIONS);
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
  const npcEntries = Object.values(NPCS);
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
  const entries = Object.values(NPCS);
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
  const entries = CHARACTER_ARCHETYPES;
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
  const entries = ALL_SPECIAL_ABILITIES;
  let created = 0, updated = 0;
  for (const spec of entries) {
    const existing = await db.gameSpecial.findUnique({ where: { id: spec.id } });
    const data = {
      name: spec.name, description: spec.description, icon: spec.icon,
      targetType: spec.targetType, cooldown: spec.cooldown, category: spec.category,
      executionType: spec.executionType,
      powerMultiplier: spec.powerMultiplier ?? null,
      healAmount: spec.healAmount ?? null,
      statusToApply: spec.statusToApply ? JSON.stringify(spec.statusToApply) : '',
    };
    if (existing) { await db.gameSpecial.update({ where: { id: spec.id }, data }); updated++; }
    else { await db.gameSpecial.create({ data: { id: spec.id, ...data } }); created++; }
  }
  return { entity: 'specials', total: entries.length, created, updated };
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
      seedEvents(),
      seedDocuments(),
      seedLocations(),
      seedQuests(),
      seedNpcs(),
      seedCharacters(),
      seedSpecials(),
    ]);

    const summary = results.map(r => `${r.entity}: ${r.created} nuovi, ${r.updated} agg. (totale ${r.total})`).join('\n');

    return NextResponse.json({
      success: true,
      message: 'Seed completato per tutte le entità',
      results,
      summary,
    });
  } catch (error) {
    console.error('[seed-all] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
