/**
 * Shared template seeding utility.
 * Used by: POST /api/games (auto-seed on game creation), POST /api/admin/seed-template (manual seed).
 */
import type { PrismaClient } from '@prisma/client';
import type { TemplateSeedData } from '@/seed-data/templates';

// ─── Minimal seed types (same shapes as Prisma models) ───

interface SeedItem {
  id: string; name: string; description: string; type: string; rarity: string;
  icon: string; usable: boolean; equippable: boolean; stackable: boolean; maxStack: number;
  weaponType?: string | null; ammoType?: string | null; modType?: string | null;
  unico?: boolean; effects: string;
}

interface SeedEvent {
  id: string; title: string; description: string; icon: string; type: string; duration: number;
  encounterRateMod: number; enemyStatMult: number; searchBonus: boolean; damagePerTurn: number;
  triggerChance: number; minTurn: number; locationIds: string;
  onTriggerMessage: string; onEndMessage: string; choices: string;
  chainId: string; nextEventId: string;
}

interface SeedDoc {
  id: string; title: string; content: string; type: string; locationId: string;
  icon: string; rarity: string; isSecret: boolean; hintRequired: string | null;
}

interface SeedLocation {
  id: string; name: string; description: string; encounterRate: number;
  enemyPool: string; itemPool: string; storyEvent: string;
  isBossArea: boolean; bossId: string | null;
  ambientText: string; lockedLocations: string; subAreas: string;
  mapRow: number | null; mapCol: number | null; mapIcon: string | null;
  mapDanger: number; mapDangerAuto: boolean; shortName: string | null;
  docChance: number | null; searchChance: number | null;
}

interface SeedNPC {
  id: string; name: string; portrait: string; greeting: string; dialogues: string;
  farewell: string; tradeInventory: string; questCompletedDialogue: string;
  badgeLabel: string; badgeIcon: string; badgeColor: string;
  dynamicDialogues: string; sortOrder: number;
}

interface SeedCharacter {
  id: string; name: string; displayName: string; description: string;
  maxHp: number; atk: number; def: number; spd: number;
  specialName: string; specialDescription: string; specialCost: number;
  special2Name: string; special2Description: string; special2Cost: number;
  passiveDescription: string; portraitEmoji: string; startingItems: string; sortOrder: number;
}

interface SeedSpecial {
  id: string; name: string; description: string; icon: string;
  targetType: string; cooldown: number; category: string; effects: string;
}

interface SeedEnemy {
  id: string; name: string; description: string;
  maxHp: number; atk: number; def: number; spd: number;
  icon: string; expReward: number; lootTable: string; abilities: string;
  isBoss: boolean; variantGroup: string; sortOrder: number;
}

interface SeedRecipe {
  id: string; name: string; description: string; icon: string; category: string;
  ingredients: string; resultItemId: string; resultQty: number; difficulty: string;
  hidden: boolean; pointCost: number | null; pointOnly: boolean;
  ngPlusOnly: boolean; forceMasterQuality: boolean; sortOrder: number;
}

interface SeedAchievement {
  id: string; name: string; description: string; icon: string;
  category: string; condition: string; hidden: boolean; reward: string; sortOrder: number;
}

interface SeedEnding {
  id: string; title: string; subtitle: string; description: string;
  icon: string; color: string; requirements: string; priority: number; sortOrder: number;
}

interface SeedSecretRoom {
  id: string; locationId: string; name: string; description: string;
  discoveryMethod: string; requiredDocumentId: string | null;
  requiredNpcQuestId: string | null; searchChance: number;
  hint: string; lootTable: string; uniqueItemId: string | null; uniqueItemQuantity: number | null;
  sortOrder: number;
}

interface SeedBossPhase {
  id: string; enemyId: string; name: string; hpThreshold: number;
  hpMultiplier: number; atkMultiplier: number; defMultiplier: number;
  spdMultiplier: number; newAbilities: string; message: string; sortOrder: number;
}

interface SeedAvatar {
  id: string; name: string; emoji: string; sortOrder: number;
}

interface SeedQuestChain {
  id: string; name: string; description: string; npcId: string;
  prerequisiteQuestId: string | null; sortOrder: number;
  steps: { id: string; chainId: string; stepIndex: number; description: string;
    type: string; targetId: string; targetCount: number; nextStepId: string;
    rewardItems: string; rewardExp: number; rewardDialogue: string;
    branchChoice: string; sortOrder: number;
  }[];
  finalReward?: { rewardItems: string; rewardExp: number; dialogue: string };
}

export async function seedGameDataForGame(db: PrismaClient, data: TemplateSeedData): Promise<void> {
  // 1. Items
  for (const item of Object.values(data.items)) {
    await db.item.upsert({
      where: { id: item.id },
      update: {
        name: item.name, description: item.description, type: item.type, rarity: item.rarity,
        icon: item.icon, usable: item.usable ?? false, equippable: item.equippable ?? false,
        stackable: item.stackable ?? true, maxStack: item.maxStack ?? 99,
        weaponType: item.weaponType ?? null, ammoType: item.ammoType ?? null,
        modType: item.modType ?? null,
        unico: item.unico ?? false,
        effects: item.effects ? JSON.stringify(item.effects) : '[]',
      },
      create: {
        id: item.id,
        name: item.name, description: item.description, type: item.type, rarity: item.rarity,
        icon: item.icon, usable: item.usable ?? false, equippable: item.equippable ?? false,
        stackable: item.stackable ?? true, maxStack: item.maxStack ?? 99,
        weaponType: item.weaponType ?? null, ammoType: item.ammoType ?? null,
        modType: item.modType ?? null,
        unico: item.unico ?? false,
        effects: item.effects ? JSON.stringify(item.effects) : '[]',
      },
    });
  }

  // 2. Events
  for (const evt of Object.values(data.events)) {
    await db.dynamicEvent.upsert({
      where: { id: evt.id },
      update: {
        title: evt.title, description: evt.description, icon: evt.icon, type: evt.type, duration: evt.duration,
        encounterRateMod: evt.effect?.encounterRateMod ?? 0,
        enemyStatMult: evt.effect?.enemyStatMult ?? 1.0,
        searchBonus: evt.effect?.searchBonus ?? false,
        damagePerTurn: evt.effect?.damagePerTurn ?? 0,
        triggerChance: evt.triggerChance, minTurn: evt.minTurn,
        locationIds: JSON.stringify(evt.locationIds ?? []),
        onTriggerMessage: evt.onTriggerMessage, onEndMessage: evt.onEndMessage,
        choices: JSON.stringify(evt.choices ?? []),
        chainId: evt.chainId ?? '', nextEventId: evt.nextEventId ?? '',
      },
      create: {
        id: evt.id,
        title: evt.title, description: evt.description, icon: evt.icon, type: evt.type, duration: evt.duration,
        encounterRateMod: evt.effect?.encounterRateMod ?? 0,
        enemyStatMult: evt.effect?.enemyStatMult ?? 1.0,
        searchBonus: evt.effect?.searchBonus ?? false,
        damagePerTurn: evt.effect?.damagePerTurn ?? 0,
        triggerChance: evt.triggerChance, minTurn: evt.minTurn,
        locationIds: JSON.stringify(evt.locationIds ?? []),
        onTriggerMessage: evt.onTriggerMessage, onEndMessage: evt.onEndMessage,
        choices: JSON.stringify(evt.choices ?? []),
        chainId: evt.chainId ?? '', nextEventId: evt.nextEventId ?? '',
      },
    });
  }

  // 3. Documents
  for (const doc of Object.values(data.documents)) {
    await db.document.upsert({
      where: { id: doc.id },
      update: {
        title: doc.title, content: doc.content, type: doc.type, locationId: doc.locationId,
        icon: doc.icon || '', rarity: doc.rarity, isSecret: doc.isSecret ?? false,
        hintRequired: doc.hintRequired ?? null,
      },
      create: {
        id: doc.id,
        title: doc.title, content: doc.content, type: doc.type, locationId: doc.locationId,
        icon: doc.icon || '', rarity: doc.rarity, isSecret: doc.isSecret ?? false,
        hintRequired: doc.hintRequired ?? null,
      },
    });
  }

  // 4. Locations
  for (const loc of Object.values(data.locations)) {
    const layout = data.mapLayout?.[loc.id];
    await db.gameLocation.upsert({
      where: { id: loc.id },
      update: {
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
      },
      create: {
        id: loc.id,
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
      },
    });
  }

  // 5. NPCs
  const npcEntries = Object.values(data.npcs);
  for (let i = 0; i < npcEntries.length; i++) {
    const npc = npcEntries[i];
    await db.gameNPC.upsert({
      where: { id: npc.id },
      update: {
        name: npc.name, portrait: npc.portrait,
        greeting: npc.greeting, dialogues: JSON.stringify(npc.dialogues ?? []),
        farewell: npc.farewell ?? '',
        tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
        questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
        badgeLabel: npc.badgeLabel ?? '', badgeIcon: npc.badgeIcon ?? '',
        badgeColor: npc.badgeColor ?? '',
        dynamicDialogues: JSON.stringify(npc.dynamicDialogues ?? []),
        sortOrder: i,
      },
      create: {
        id: npc.id,
        name: npc.name, portrait: npc.portrait,
        greeting: npc.greeting, dialogues: JSON.stringify(npc.dialogues ?? []),
        farewell: npc.farewell ?? '',
        tradeInventory: JSON.stringify(npc.tradeInventory ?? []),
        questCompletedDialogue: JSON.stringify(npc.questCompletedDialogue ?? []),
        badgeLabel: npc.badgeLabel ?? '', badgeIcon: npc.badgeIcon ?? '',
        badgeColor: npc.badgeColor ?? '',
        dynamicDialogues: JSON.stringify(npc.dynamicDialogues ?? []),
        sortOrder: i,
      },
    });
  }

  // 6. Characters
  for (let i = 0; i < data.characters.length; i++) {
    const arch = data.characters[i];
    await db.gameCharacter.upsert({
      where: { id: arch.id },
      update: {
        name: arch.name, displayName: arch.displayName,
        description: arch.description, maxHp: arch.maxHp, atk: arch.atk,
        def: arch.def, spd: arch.spd,
        specialName: arch.specialName, specialDescription: arch.specialDescription, specialCost: arch.specialCost,
        special2Name: arch.special2Name, special2Description: arch.special2Description, special2Cost: arch.special2Cost,
        passiveDescription: arch.passiveDescription, portraitEmoji: arch.portraitEmoji,
        startingItems: JSON.stringify(arch.startingItems ?? []), sortOrder: i,
      },
      create: {
        id: arch.id,
        name: arch.name, displayName: arch.displayName,
        description: arch.description, maxHp: arch.maxHp, atk: arch.atk,
        def: arch.def, spd: arch.spd,
        specialName: arch.specialName, specialDescription: arch.specialDescription, specialCost: arch.specialCost,
        special2Name: arch.special2Name, special2Description: arch.special2Description, special2Cost: arch.special2Cost,
        passiveDescription: arch.passiveDescription, portraitEmoji: arch.portraitEmoji,
        startingItems: JSON.stringify(arch.startingItems ?? []), sortOrder: i,
      },
    });
  }

  // 7. Specials
  for (const spec of data.specials) {
    await db.gameSpecial.upsert({
      where: { id: spec.id },
      update: {
        name: spec.name, description: spec.description, icon: spec.icon,
        targetType: spec.targetType, cooldown: spec.cooldown, category: spec.category,
        effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
      },
      create: {
        id: spec.id,
        name: spec.name, description: spec.description, icon: spec.icon,
        targetType: spec.targetType, cooldown: spec.cooldown, category: spec.category,
        effects: spec.effects ? JSON.stringify(spec.effects) : '[]',
      },
    });
  }

  // 8. Enemies
  const enemyEntries = Object.values(data.enemies);
  for (let i = 0; i < enemyEntries.length; i++) {
    const enemy = enemyEntries[i];
    await db.gameEnemy.upsert({
      where: { id: enemy.id },
      update: {
        name: enemy.name, description: enemy.description,
        maxHp: enemy.maxHp, atk: enemy.atk, def: enemy.def, spd: enemy.spd,
        icon: enemy.icon, expReward: enemy.expReward,
        lootTable: JSON.stringify(enemy.lootTable ?? []),
        abilities: JSON.stringify(enemy.abilities ?? []),
        isBoss: enemy.isBoss ?? false, variantGroup: enemy.variantGroup ?? '',
        sortOrder: i,
      },
      create: {
        id: enemy.id,
        name: enemy.name, description: enemy.description,
        maxHp: enemy.maxHp, atk: enemy.atk, def: enemy.def, spd: enemy.spd,
        icon: enemy.icon, expReward: enemy.expReward,
        lootTable: JSON.stringify(enemy.lootTable ?? []),
        abilities: JSON.stringify(enemy.abilities ?? []),
        isBoss: enemy.isBoss ?? false, variantGroup: enemy.variantGroup ?? '',
        sortOrder: i,
      },
    });
  }

  // 9. Secret rooms
  for (const room of data.secretRooms) {
    await db.secretRoom.upsert({
      where: { id: room.id },
      update: {
        locationId: room.locationId, name: room.name, description: room.description,
        discoveryMethod: room.discoveryMethod,
        requiredDocumentId: room.requiredDocumentId,
        requiredNpcQuestId: room.requiredNpcQuestId,
        searchChance: room.searchChance, hint: room.hint,
        lootTable: typeof room.lootTable === 'string' ? room.lootTable : JSON.stringify(room.lootTable ?? []),
        uniqueItemId: room.uniqueItemId,
        uniqueItemQuantity: room.uniqueItemQuantity,
        sortOrder: room.sortOrder,
      },
      create: {
        id: room.id,
        locationId: room.locationId, name: room.name, description: room.description,
        discoveryMethod: room.discoveryMethod,
        requiredDocumentId: room.requiredDocumentId,
        requiredNpcQuestId: room.requiredNpcQuestId,
        searchChance: room.searchChance, hint: room.hint,
        lootTable: typeof room.lootTable === 'string' ? room.lootTable : JSON.stringify(room.lootTable ?? []),
        uniqueItemId: room.uniqueItemId,
        uniqueItemQuantity: room.uniqueItemQuantity,
        sortOrder: room.sortOrder,
      },
    });
  }

  // 10. Recipes
  for (const recipe of data.recipes) {
    await db.gameRecipe.upsert({
      where: { id: recipe.id },
      update: {
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
      },
      create: {
        id: recipe.id,
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
      },
    });
  }

  // 11. Boss phases
  for (const phase of data.bossPhases) {
    await db.gameBossPhase.upsert({
      where: { id: phase.id },
      update: {
        enemyId: phase.enemyId, name: phase.name, hpThreshold: phase.hpThreshold,
        hpMultiplier: phase.hpMultiplier ?? 1.0, atkMultiplier: phase.atkMultiplier ?? 1.0,
        defMultiplier: phase.defMultiplier ?? 1.0, spdMultiplier: phase.spdMultiplier ?? 1.0,
        newAbilities: JSON.stringify(phase.newAbilities ?? []),
        message: phase.message ?? '', sortOrder: phase.sortOrder ?? 0,
      },
      create: {
        id: phase.id,
        enemyId: phase.enemyId, name: phase.name, hpThreshold: phase.hpThreshold,
        hpMultiplier: phase.hpMultiplier ?? 1.0, atkMultiplier: phase.atkMultiplier ?? 1.0,
        defMultiplier: phase.defMultiplier ?? 1.0, spdMultiplier: phase.spdMultiplier ?? 1.0,
        newAbilities: JSON.stringify(phase.newAbilities ?? []),
        message: phase.message ?? '', sortOrder: phase.sortOrder ?? 0,
      },
    });
  }

  // 12. Achievements
  for (const ach of data.achievements) {
    await db.gameAchievement.upsert({
      where: { id: ach.id },
      update: {
        name: ach.name, description: ach.description, icon: ach.icon,
        category: ach.category, condition: ach.condition,
        hidden: ach.hidden ?? false, reward: ach.reward ?? '',
        sortOrder: ach.sortOrder ?? 0,
      },
      create: {
        id: ach.id,
        name: ach.name, description: ach.description, icon: ach.icon,
        category: ach.category, condition: ach.condition,
        hidden: ach.hidden ?? false, reward: ach.reward ?? '',
        sortOrder: ach.sortOrder ?? 0,
      },
    });
  }

  // 13. Endings
  for (const ending of data.endings) {
    await db.gameEnding.upsert({
      where: { id: ending.id },
      update: {
        title: ending.title, subtitle: ending.subtitle ?? '',
        description: ending.description, icon: ending.icon, color: ending.color,
        requirements: JSON.stringify(ending.requirements ?? []),
        priority: ending.priority ?? 0, sortOrder: ending.sortOrder ?? 0,
      },
      create: {
        id: ending.id,
        title: ending.title, subtitle: ending.subtitle ?? '',
        description: ending.description, icon: ending.icon, color: ending.color,
        requirements: JSON.stringify(ending.requirements ?? []),
        priority: ending.priority ?? 0, sortOrder: ending.sortOrder ?? 0,
      },
    });
  }

  // 14. Avatars
  for (const avatar of data.avatars) {
    await db.gameAvatar.upsert({
      where: { id: avatar.id },
      update: { name: avatar.name, emoji: avatar.emoji, sortOrder: avatar.sortOrder ?? 0 },
      create: { id: avatar.id, name: avatar.name, emoji: avatar.emoji, sortOrder: avatar.sortOrder ?? 0 },
    });
  }

  // 15. Quest chains
  for (const chain of data.questChains) {
    const steps = chain.steps || [];

    // Upsert chain
    await db.questChain.upsert({
      where: { id: chain.id },
      update: {
        name: chain.name, description: chain.description ?? '',
        npcId: chain.npcId ?? chain.id,
        prerequisiteQuestId: chain.prerequisiteQuestId ?? null,
        sortOrder: chain.sortOrder ?? 0,
      },
      create: {
        id: chain.id,
        name: chain.name, description: chain.description ?? '',
        npcId: chain.npcId ?? chain.id,
        prerequisiteQuestId: chain.prerequisiteQuestId ?? null,
        sortOrder: chain.sortOrder ?? 0,
      },
    });

    // Delete existing steps and recreate
    await db.questChainStep.deleteMany({ where: { chainId: chain.id } });
    await db.questChainFinalReward.deleteMany({ where: { chainId: chain.id } });

    // Seed steps
    for (const step of steps) {
      await db.questChainStep.create({
        data: {
          id: step.id, chainId: chain.id,
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

    // Seed final reward
    if (chain.finalReward) {
      await db.questChainFinalReward.upsert({
        where: { chainId: chain.id },
        update: {
          rewardItems: JSON.stringify(chain.finalReward.rewardItems ?? []),
          rewardExp: chain.finalReward.rewardExp ?? 0,
          dialogue: JSON.stringify(chain.finalReward.dialogue ?? []),
        },
        create: {
          chainId: chain.id,
          rewardItems: JSON.stringify(chain.finalReward.rewardItems ?? []),
          rewardExp: chain.finalReward.rewardExp ?? 0,
          dialogue: JSON.stringify(chain.finalReward.dialogue ?? []),
        },
      });
    }
  }
}
