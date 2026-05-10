import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTemplateSeedData, type TemplateSeedData } from '@/seed-data/templates';
import { safeErrorResponse } from '@/lib/api-utils';

type SeedResult = { entity: string; total: number; created: number; updated: number };

/** Valid section names mapped to TemplateSeedData keys */
const SECTION_MAP: Record<string, keyof TemplateSeedData> = {
  items: 'items',
  events: 'events',
  documents: 'documents',
  locations: 'locations',
  npcs: 'npcs',
  characters: 'characters',
  specials: 'specials',
  enemies: 'enemies',
  'secret-rooms': 'secretRooms',
  recipes: 'recipes',
  'boss-phases': 'bossPhases',
  achievements: 'achievements',
  endings: 'endings',
  avatars: 'avatars',
  'quest-chains': 'questChains',
};

/** Sections that are arrays (not Record<string, …>) */
const ARRAY_SECTIONS = new Set(['characters', 'specials', 'secretRooms', 'bossPhases', 'achievements', 'endings', 'avatars', 'questChains']);

/**
 * POST /api/admin/seed-template
 * Seeds game data for the current game's template into its DB.
 *
 * Body params:
 *   - templateId?  — explicit template ID (if omitted, reads from `template.id` setting)
 *   - section?     — seed only one section (e.g. "locations", "items", "enemies")
 *                    if omitted, seeds ALL sections
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { templateId: explicitTemplateId, section } = body as {
      templateId?: string;
      section?: string;
    };

    // 1. Resolve template ID
    let templateId = explicitTemplateId;
    if (!templateId) {
      const setting = await db.gameSetting.findUnique({ where: { key: 'template.id' } });
      templateId = setting?.value ?? null;
    }
    if (!templateId) {
      return NextResponse.json(
        { error: 'Nessun template associato a questo gioco. Imposta un template nelle impostazioni.' },
        { status: 400 },
      );
    }

    // 2. Load template seed data
    const data = await getTemplateSeedData(templateId);
    if (!data) {
      return NextResponse.json(
        { error: `Nessun seed data per il template "${templateId}"` },
        { status: 404 },
      );
    }

    // 3. If section requested, seed only that section
    if (section) {
      const dataKey = SECTION_MAP[section];
      if (!dataKey) {
        return NextResponse.json(
          { error: `Sezione "${section}" non valida. Sezioni: ${Object.keys(SECTION_MAP).join(', ')}` },
          { status: 400 },
        );
      }

      const sectionData = data[dataKey];
      if (!sectionData || (ARRAY_SECTIONS.has(section) && (sectionData as unknown[]).length === 0) || (!ARRAY_SECTIONS.has(section) && Object.keys(sectionData as object).length === 0)) {
        return NextResponse.json(
          { error: `Il template "${templateId}" non ha dati per la sezione "${section}"` },
          { status: 404 },
        );
      }

      const result = await runSectionSeed(dataKey, sectionData, data.mapLayout);
      return NextResponse.json({
        success: true,
        templateId,
        section,
        ...result,
      });
    }

    // 4. No section → seed all sections
    const results: SeedResult[] = [];

    results.push(await seedItems(data.items));
    results.push(await seedEvents(data.events));
    results.push(await seedDocuments(data.documents));
    results.push(await seedLocations(data.locations, data.mapLayout));
    results.push(await seedNpcs(data.npcs));
    results.push(await seedCharacters(data.characters));
    results.push(await seedSpecials(data.specials));
    results.push(await seedEnemies(data.enemies));
    results.push(await seedSecretRooms(data.secretRooms));
    results.push(await seedRecipes(data.recipes));
    if (data.bossPhases.length > 0) {
      results.push(await seedBossPhases(data.bossPhases));
    }
    results.push(await seedAchievements(data.achievements));
    results.push(await seedEndings(data.endings));
    results.push(await seedAvatars(data.avatars));
    if (data.questChains.length > 0) {
      results.push(await seedQuestChains(data.questChains));
    }

    const summary = results.map(r => `${r.entity}: ${r.created} nuovi, ${r.updated} agg. (totale ${r.total})`).join('\n');

    return NextResponse.json({
      success: true,
      templateId,
      message: `Seed completato per template "${templateId}"`,
      results,
      summary,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed Template]');
  }
}

/** Run the correct seed function for a given TemplateSeedData key */
async function runSectionSeed(
  key: keyof TemplateSeedData,
  sectionData: unknown,
  mapLayout?: Record<string, unknown>,
): Promise<SeedResult> {
  switch (key) {
    case 'items': return seedItems(sectionData as Record<string, unknown>);
    case 'events': return seedEvents(sectionData as Record<string, unknown>);
    case 'documents': return seedDocuments(sectionData as Record<string, unknown>);
    case 'locations': return seedLocations(sectionData as Record<string, unknown>, mapLayout as Record<string, unknown>);
    case 'npcs': return seedNpcs(sectionData as Record<string, unknown>);
    case 'characters': return seedCharacters(sectionData as unknown[]);
    case 'specials': return seedSpecials(sectionData as unknown[]);
    case 'enemies': return seedEnemies(sectionData as Record<string, unknown>);
    case 'secretRooms': return seedSecretRooms(sectionData as unknown[]);
    case 'recipes': return seedRecipes(sectionData as unknown[]);
    case 'bossPhases': return seedBossPhases(sectionData as unknown[]);
    case 'achievements': return seedAchievements(sectionData as unknown[]);
    case 'endings': return seedEndings(sectionData as unknown[]);
    case 'avatars': return seedAvatars(sectionData as unknown[]);
    case 'questChains': return seedQuestChains(sectionData as unknown[]);
    case 'mapLayout': return { entity: 'mapLayout', total: 0, created: 0, updated: 0 };
    case 'bossPhaseAbilities': return { entity: 'bossPhaseAbilities', total: 0, created: 0, updated: 0 };
    default: return { entity: String(key), total: 0, created: 0, updated: 0 };
  }
}

// ─── Seed functions (generic upsert logic) ───

async function seedItems(items: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(items);
  let created = 0, updated = 0;
  for (const item of entries) {
    const existing = await db.item.findUnique({ where: { id: item.id } });
    const d = {
      name: item.name, description: item.description, type: item.type, rarity: item.rarity,
      icon: item.icon, usable: item.usable ?? false, equippable: item.equippable ?? false,
      stackable: item.stackable ?? true, maxStack: item.maxStack ?? 99,
      unico: item.unico ?? false,
      weaponType: item.weaponType ?? null,
      ammoType: item.ammoType ?? null,
      modType: item.modType ?? null,
      effects: item.effects ? JSON.stringify(item.effects) : '[]',
    };
    if (existing) { await db.item.update({ where: { id: item.id }, data: d }); updated++; }
    else { await db.item.create({ data: { id: item.id, ...d } }); created++; }
  }
  return { entity: 'items', total: entries.length, created, updated };
}

async function seedEvents(events: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(events);
  let created = 0, updated = 0;
  for (const evt of entries) {
    const existing = await db.dynamicEvent.findUnique({ where: { id: evt.id } });
    const d = {
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
      chainId: evt.chainId ?? '',
      nextEventId: evt.nextEventId ?? '',
    };
    if (existing) { await db.dynamicEvent.update({ where: { id: evt.id }, data: d }); updated++; }
    else { await db.dynamicEvent.create({ data: { id: evt.id, ...d } }); created++; }
  }
  return { entity: 'events', total: entries.length, created, updated };
}

async function seedDocuments(docs: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(docs);
  let created = 0, updated = 0;
  for (const doc of entries) {
    const existing = await db.document.findUnique({ where: { id: doc.id } });
    const d = {
      title: doc.title, content: doc.content, type: doc.type, locationId: doc.locationId,
      icon: doc.icon || '', rarity: doc.rarity, isSecret: doc.isSecret ?? false,
      hintRequired: doc.hintRequired ?? null,
    };
    if (existing) { await db.document.update({ where: { id: doc.id }, data: d }); updated++; }
    else { await db.document.create({ data: { id: doc.id, ...d } }); created++; }
  }
  return { entity: 'documents', total: entries.length, created, updated };
}

async function seedLocations(locations: Record<string, any>, mapLayout?: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(locations);
  let created = 0, updated = 0;
  for (const loc of entries) {
    const layout = mapLayout?.[loc.id];
    const existing = await db.gameLocation.findUnique({ where: { id: loc.id } });
    const d = {
      name: loc.name, description: loc.description, encounterRate: loc.encounterRate,
      enemyPool: JSON.stringify(loc.enemyPool ?? []),
      itemPool: JSON.stringify(loc.itemPool ?? []),
      storyEvent: loc.storyEvent ? JSON.stringify(loc.storyEvent) : '',
      isBossArea: loc.isBossArea ?? false, bossId: loc.bossId ?? null,
      ambientText: JSON.stringify(loc.ambientText ?? []),
      lockedLocations: JSON.stringify(loc.lockedLocations ?? []),
      subAreas: JSON.stringify(loc.subAreas ?? []),
      mapRow: loc.mapRow ?? layout?.row ?? null,
      mapCol: loc.mapCol ?? layout?.col ?? null,
      mapIcon: loc.mapIcon ?? layout?.icon ?? null,
      mapDanger: loc.mapDanger ?? 0,
      mapDangerAuto: loc.mapDangerAuto ?? false,
      shortName: loc.shortName ?? null,
      docChance: loc.docChance ?? null,
      searchChance: loc.searchChance ?? null,
    };
    if (existing) { await db.gameLocation.update({ where: { id: loc.id }, data: d }); updated++; }
    else { await db.gameLocation.create({ data: { id: loc.id, ...d } }); created++; }
  }
  return { entity: 'locations', total: entries.length, created, updated };
}

async function seedNpcs(npcs: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(npcs);
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const npc = entries[i];
    const existing = await db.gameNPC.findUnique({ where: { id: npc.id } });
    const d = {
      name: npc.name, portrait: npc.portrait,
      greeting: npc.greeting, dialogues: JSON.stringify(npc.dialogues ?? []),
      farewell: npc.farewell ?? '',
      tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
      questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
      badgeLabel: npc.badgeLabel ?? '',
      badgeIcon: npc.badgeIcon ?? '',
      badgeColor: npc.badgeColor ?? '',
      dynamicDialogues: JSON.stringify(npc.dynamicDialogues ?? []),
      sortOrder: i,
    };
    if (existing) { await db.gameNPC.update({ where: { id: npc.id }, data: d }); updated++; }
    else { await db.gameNPC.create({ data: { id: npc.id, ...d } }); created++; }
  }
  return { entity: 'npcs', total: entries.length, created, updated };
}

async function seedCharacters(chars: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (let i = 0; i < chars.length; i++) {
    const arch = chars[i];
    const existing = await db.gameCharacter.findUnique({ where: { id: arch.id } });
    const d = {
      name: arch.name, displayName: arch.displayName,
      description: arch.description, maxHp: arch.maxHp, atk: arch.atk,
      def: arch.def, spd: arch.spd,
      specialName: arch.specialName, specialDescription: arch.specialDescription,
      specialCost: arch.specialCost,
      special2Name: arch.special2Name, special2Description: arch.special2Description,
      special2Cost: arch.special2Cost,
      passiveDescription: arch.passiveDescription, portraitEmoji: arch.portraitEmoji,
      startingItems: JSON.stringify(arch.startingItems ?? []), sortOrder: i,
    };
    if (existing) { await db.gameCharacter.update({ where: { id: arch.id }, data: d }); updated++; }
    else { await db.gameCharacter.create({ data: { id: arch.id, ...d } }); created++; }
  }
  return { entity: 'characters', total: chars.length, created, updated };
}

async function seedSpecials(specs: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const spec of specs) {
    const existing = await db.gameSpecial.findUnique({ where: { id: spec.id } });
    const d = {
      name: spec.name, description: spec.description, icon: spec.icon,
      targetType: spec.targetType, cooldown: spec.cooldown, category: spec.category,
      effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
    };
    if (existing) { await db.gameSpecial.update({ where: { id: spec.id }, data: d }); updated++; }
    else { await db.gameSpecial.create({ data: { id: spec.id, ...d } }); created++; }
  }
  return { entity: 'specials', total: specs.length, created, updated };
}

async function seedEnemies(enemies: Record<string, any>): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = Object.values(enemies);
  let created = 0, updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const enemy = entries[i];
    const existing = await db.gameEnemy.findUnique({ where: { id: enemy.id } });
    const d = {
      name: enemy.name, description: enemy.description,
      maxHp: enemy.maxHp, atk: enemy.atk, def: enemy.def, spd: enemy.spd,
      icon: enemy.icon, expReward: enemy.expReward,
      lootTable: JSON.stringify(enemy.lootTable ?? []),
      abilities: JSON.stringify(enemy.abilities ?? []),
      isBoss: enemy.isBoss ?? false, variantGroup: enemy.variantGroup ?? '',
      sortOrder: i,
    };
    if (existing) { await db.gameEnemy.update({ where: { id: enemy.id }, data: d }); updated++; }
    else { await db.gameEnemy.create({ data: { id: enemy.id, ...d } }); created++; }
  }
  return { entity: 'enemies', total: entries.length, created, updated };
}

async function seedSecretRooms(rooms: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const room of rooms) {
    const existing = await db.secretRoom.findUnique({ where: { id: room.id } });
    const d = {
      locationId: room.locationId, name: room.name, description: room.description,
      discoveryMethod: room.discoveryMethod,
      requiredDocumentId: room.requiredDocumentId,
      requiredNpcQuestId: room.requiredNpcQuestId,
      searchChance: room.searchChance, hint: room.hint,
      lootTable: typeof room.lootTable === 'string' ? room.lootTable : JSON.stringify(room.lootTable ?? []),
      uniqueItemId: room.uniqueItemId,
      uniqueItemQuantity: room.uniqueItemQuantity,
      sortOrder: room.sortOrder,
    };
    if (existing) { await db.secretRoom.update({ where: { id: room.id }, data: d }); updated++; }
    else { await db.secretRoom.create({ data: { id: room.id, ...d } }); created++; }
  }
  return { entity: 'secret-rooms', total: rooms.length, created, updated };
}

async function seedRecipes(recipes: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const recipe of recipes) {
    const existing = await db.gameRecipe.findUnique({ where: { id: recipe.id } });
    const d = {
      name: recipe.name, description: recipe.description, icon: recipe.icon,
      category: recipe.category,
      ingredients: typeof recipe.ingredients === 'string' ? recipe.ingredients : JSON.stringify(recipe.ingredients),
      resultItemId: recipe.resultItemId, resultQty: recipe.resultQty ?? 1,
      difficulty: recipe.difficulty ?? 'easy',
      hidden: recipe.hidden ?? false,
      pointCost: recipe.pointCost ?? null,
      pointOnly: recipe.pointOnly ?? false,
      ngPlusOnly: recipe.ngPlusOnly ?? false,
      forceMasterQuality: recipe.forceMasterQuality ?? false,
      sortOrder: recipe.sortOrder ?? 0,
    };
    if (existing) { await db.gameRecipe.update({ where: { id: recipe.id }, data: d }); updated++; }
    else { await db.gameRecipe.create({ data: { id: recipe.id, ...d } }); created++; }
  }
  return { entity: 'recipes', total: recipes.length, created, updated };
}

async function seedBossPhases(phases: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const phase of phases) {
    const existing = await db.gameBossPhase.findUnique({ where: { id: phase.id } });
    const d = {
      enemyId: phase.enemyId, name: phase.name,
      hpThreshold: phase.hpThreshold,
      hpMultiplier: phase.hpMultiplier ?? 1.0,
      atkMultiplier: phase.atkMultiplier ?? 1.0,
      defMultiplier: phase.defMultiplier ?? 1.0,
      spdMultiplier: phase.spdMultiplier ?? 1.0,
      newAbilities: JSON.stringify(phase.newAbilities ?? []),
      message: phase.message ?? '',
      sortOrder: phase.sortOrder ?? 0,
    };
    if (existing) { await db.gameBossPhase.update({ where: { id: phase.id }, data: d }); updated++; }
    else { await db.gameBossPhase.create({ data: { id: phase.id, ...d } }); created++; }
  }
  return { entity: 'boss-phases', total: phases.length, created, updated };
}

async function seedAchievements(achievements: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const ach of achievements) {
    const existing = await db.gameAchievement.findUnique({ where: { id: ach.id } });
    const d = {
      name: ach.name, description: ach.description, icon: ach.icon,
      category: ach.category, condition: ach.condition,
      hidden: ach.hidden ?? false, reward: ach.reward ?? '',
      sortOrder: ach.sortOrder ?? 0,
    };
    if (existing) { await db.gameAchievement.update({ where: { id: ach.id }, data: d }); updated++; }
    else { await db.gameAchievement.create({ data: { id: ach.id, ...d } }); created++; }
  }
  return { entity: 'achievements', total: achievements.length, created, updated };
}

async function seedEndings(endings: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const ending of endings) {
    const existing = await db.gameEnding.findUnique({ where: { id: ending.id } });
    const d = {
      title: ending.title, subtitle: ending.subtitle ?? '',
      description: ending.description, icon: ending.icon, color: ending.color,
      requirements: JSON.stringify(ending.requirements ?? []),
      priority: ending.priority ?? 0, sortOrder: ending.sortOrder ?? 0,
    };
    if (existing) { await db.gameEnding.update({ where: { id: ending.id }, data: d }); updated++; }
    else { await db.gameEnding.create({ data: { id: ending.id, ...d } }); created++; }
  }
  return { entity: 'endings', total: endings.length, created, updated };
}

async function seedAvatars(avatars: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const avatar of avatars) {
    const existing = await db.gameAvatar.findUnique({ where: { id: avatar.id } });
    const d = {
      name: avatar.name, emoji: avatar.emoji, sortOrder: avatar.sortOrder ?? 0,
    };
    if (existing) { await db.gameAvatar.update({ where: { id: avatar.id }, data: d }); updated++; }
    else { await db.gameAvatar.create({ data: { id: avatar.id, ...d } }); created++; }
  }
  return { entity: 'avatars', total: avatars.length, created, updated };
}

async function seedQuestChains(chains: any[]): Promise<SeedResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let created = 0, updated = 0;
  for (const chain of chains) {
    const existing = await db.questChain.findUnique({ where: { id: chain.id } });
    const steps = chain.steps || [];
    const finalReward = chain.finalReward || null;

    if (existing) {
      await db.questChain.update({
        where: { id: chain.id },
        data: {
          name: chain.name, description: chain.description ?? '',
          npcId: chain.npcId ?? chain.id,
          prerequisiteQuestId: chain.prerequisiteQuestId ?? null,
          sortOrder: chain.sortOrder ?? 0,
        },
      });
      await db.questChainStep.deleteMany({ where: { chainId: chain.id } });
      await db.questChainFinalReward.deleteMany({ where: { chainId: chain.id } });
      updated++;
    } else {
      await db.questChain.create({
        data: {
          id: chain.id,
          name: chain.name, description: chain.description ?? '',
          npcId: chain.npcId ?? chain.id,
          prerequisiteQuestId: chain.prerequisiteQuestId ?? null,
          sortOrder: chain.sortOrder ?? 0,
        },
      });
      created++;
    }

    for (const step of steps) {
      await db.questChainStep.upsert({
        where: { id: step.id },
        update: {
          stepIndex: step.stepIndex ?? 0,
          description: step.description, type: step.type,
          targetId: step.targetId ?? '', targetCount: step.targetCount ?? 0,
          nextStepId: step.nextStepId ?? '',
          rewardItems: JSON.stringify(step.rewardItems ?? []),
          rewardExp: step.rewardExp ?? 0,
          rewardDialogue: JSON.stringify(step.rewardDialogue ?? []),
          branchChoice: typeof step.branchChoice === 'string' ? step.branchChoice : JSON.stringify(step.branchChoice ?? ''),
          sortOrder: step.sortOrder ?? 0,
        },
        create: {
          id: step.id,
          chainId: chain.id,
          stepIndex: step.stepIndex ?? 0,
          description: step.description, type: step.type,
          targetId: step.targetId ?? '', targetCount: step.targetCount ?? 0,
          nextStepId: step.nextStepId ?? '',
          rewardItems: JSON.stringify(step.rewardItems ?? []),
          rewardExp: step.rewardExp ?? 0,
          rewardDialogue: JSON.stringify(step.rewardDialogue ?? []),
          branchChoice: typeof step.branchChoice === 'string' ? step.branchChoice : JSON.stringify(step.branchChoice ?? ''),
          sortOrder: step.sortOrder ?? 0,
        },
      });
    }

    if (finalReward) {
      await db.questChainFinalReward.upsert({
        where: { chainId: chain.id },
        update: {
          rewardItems: JSON.stringify(finalReward.rewardItems ?? []),
          rewardExp: finalReward.rewardExp ?? 0,
          dialogue: JSON.stringify(finalReward.dialogue ?? []),
        },
        create: {
          chainId: chain.id,
          rewardItems: JSON.stringify(finalReward.rewardItems ?? []),
          rewardExp: finalReward.rewardExp ?? 0,
          dialogue: JSON.stringify(finalReward.dialogue ?? []),
        },
      });
    }
  }
  return { entity: 'quest-chains', total: chains.length, created, updated };
}
