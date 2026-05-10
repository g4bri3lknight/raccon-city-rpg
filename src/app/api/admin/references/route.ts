import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Extract string IDs from a JSON field. Handles both flat arrays and object arrays. */
function parseJsonIds(val: unknown): string[] {
  if (!val || typeof val !== 'string' || val.trim() === '' || val === '[]' || val === '{}') return [];
  try {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: Record<string, unknown> | string) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          // Common field names used in JSON arrays
          return (
            String(item.itemId ?? '') ||
            String(item.id ?? '') ||
            String(item.locationId ?? '') ||
            String(item.targetId ?? '') ||
            String(item.stepId ?? '') ||
            ''
          ) || null;
        }
        return null;
      })
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function buildIdSet(entities: { id: string }[]): Set<string> {
  return new Set(entities.map(e => e.id));
}

/** Italian labels for entity types — used in cross-ref badges */
export const TYPE_LABELS: Record<string, string> = {
  items: 'oggetti',
  enemies: 'nemici',
  npcs: 'NPC',
  locations: 'luoghi',
  quests: 'missioni',
  events: 'eventi',
  documents: 'documenti',
  specials: 'speciali',
  'enemy-abilities': 'abilità',
  archetypes: 'archetipi',
  characters: 'personaggi',
  recipes: 'ricette',
  'secret-rooms': 'stanze segrete',
  'boss-phases': 'fasi boss',
  'quest-chains': 'catene quest',
};

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/references
//
// Scans ALL entities in the database and builds:
//   - crossRefs: entityId → { sourceType: count, ... }
//     (who references this entity from other tables)
//   - brokenRefs: entityId → [{ field, targetId }, ...]
//     (fields that point to non-existent IDs)
// ═══════════════════════════════════════════════════════════════
export async function GET() {
  try {
    // ── Load ALL entities in parallel ──
    const [
      items, quests, events, documents, locations, npcs, enemies,
      enemyAbilities, archetypes, characters, specials, recipes,
      secretRooms, bossPhases, questChains, questChainSteps,
    ] = await Promise.all([
      db.item.findMany(),
      db.sideQuest.findMany(),
      db.dynamicEvent.findMany(),
      db.document.findMany(),
      db.gameLocation.findMany(),
      db.gameNPC.findMany(),
      db.gameEnemy.findMany(),
      db.gameEnemyAbility.findMany(),
      db.gameArchetype.findMany(),
      db.gameCharacter.findMany(),
      db.gameSpecial.findMany(),
      db.gameRecipe.findMany(),
      db.secretRoom.findMany(),
      db.gameBossPhase.findMany(),
      db.questChain.findMany(),
      db.questChainStep.findMany(),
    ]);

    // ── Build ID lookup sets ──
    const itemIds = buildIdSet(items);
    const questIds = buildIdSet(quests);
    const eventIds = buildIdSet(events);
    const documentIds = buildIdSet(documents);
    const locationIds = buildIdSet(locations);
    const npcIds = buildIdSet(npcs);
    const enemyIds = buildIdSet(enemies);
    const abilityIds = buildIdSet(enemyAbilities);
    const archetypeIds = buildIdSet(archetypes);
    const specialIds = buildIdSet(specials);
    const stepIds = buildIdSet(questChainSteps);

    // ── Result maps ──
    const crossRefs: Record<string, Record<string, number>> = {};
    const brokenRefs: Record<string, Array<{ field: string; targetId: string }>> = {};

    function addCrossRef(targetId: string, sourceType: string) {
      if (!targetId) return;
      if (!crossRefs[targetId]) crossRefs[targetId] = {};
      crossRefs[targetId][sourceType] = (crossRefs[targetId][sourceType] || 0) + 1;
    }

    function addBroken(entityId: string, field: string, targetId: string) {
      if (!entityId || !targetId) return;
      if (!brokenRefs[entityId]) brokenRefs[entityId] = [];
      // Avoid duplicates
      if (!brokenRefs[entityId].some(r => r.field === field && r.targetId === targetId)) {
        brokenRefs[entityId].push({ field, targetId });
      }
    }

    function checkRef(entityId: string, field: string, targetId: string, validIds: Set<string>) {
      if (!targetId || !entityId) return;
      if (!validIds.has(targetId)) addBroken(entityId, field, targetId);
    }

    function checkJsonRefs(entityId: string, field: string, ids: string[], validIds: Set<string>) {
      for (const id of ids) checkRef(entityId, field, id, validIds);
    }

    // ════════════════════════════════════════════════════════════
    // SCAN — for each entity table, find cross-refs and broken refs
    // ════════════════════════════════════════════════════════════

    // ─── SideQuests ───
    for (const q of quests) {
      addCrossRef(q.npcId, 'npcs');
      checkRef(q.id, 'npcId', q.npcId, npcIds);

      // targetId — could reference items, enemies, locations, or abilities
      checkRef(q.id, 'targetId', q.targetId, itemIds);
      // Only mark broken if not found in ANY known table
      if (q.targetId && !itemIds.has(q.targetId) && !enemyIds.has(q.targetId) && !locationIds.has(q.targetId) && !abilityIds.has(q.targetId)) {
        addBroken(q.id, 'targetId', q.targetId);
      } else {
        // Remove the false positive from the itemIds check above
        if (q.targetId && (enemyIds.has(q.targetId) || locationIds.has(q.targetId) || abilityIds.has(q.targetId))) {
          brokenRefs[q.id] = (brokenRefs[q.id] || []).filter(r => !(r.field === 'targetId'));
        }
      }

      if (q.prerequisiteQuestId) {
        addCrossRef(q.prerequisiteQuestId, 'quests');
        checkRef(q.id, 'prerequisiteQuestId', q.prerequisiteQuestId, questIds);
      }

      const rewardItemIds = parseJsonIds(q.rewardItems);
      for (const itemId of rewardItemIds) addCrossRef(itemId, 'quests');
      checkJsonRefs(q.id, 'rewardItems', rewardItemIds, itemIds);
    }

    // ─── NPCs ───
    for (const npc of npcs) {
      addCrossRef(npc.locationId, 'npcs');
      checkRef(npc.id, 'locationId', npc.locationId, locationIds);

      if (npc.questId) {
        addCrossRef(npc.questId, 'npcs');
        checkRef(npc.id, 'questId', npc.questId, questIds);
      }

      const tradeItemIds = parseJsonIds(npc.tradeInventory);
      for (const itemId of tradeItemIds) addCrossRef(itemId, 'npcs');
      // tradeInventory also references priceItemId
      checkJsonRefs(npc.id, 'tradeInventory.items', tradeItemIds, itemIds);
      // Check priceItemId references
      if (npc.tradeInventory) {
        try {
          const trades = JSON.parse(npc.tradeInventory);
          if (Array.isArray(trades)) {
            for (const t of trades) {
              if (t?.priceItemId) {
                addCrossRef(t.priceItemId, 'npcs');
                checkRef(npc.id, 'tradeInventory.priceItemId', t.priceItemId, itemIds);
              }
            }
          }
        } catch { /* ignore */ }
      }
    }

    // ─── Locations ───
    for (const loc of locations) {
      if (loc.bossId) {
        addCrossRef(loc.bossId, 'locations');
        checkRef(loc.id, 'bossId', loc.bossId, enemyIds);
      }

      const nextLocIds = parseJsonIds(loc.nextLocations);
      for (const nLocId of nextLocIds) addCrossRef(nLocId, 'locations');
      checkJsonRefs(loc.id, 'nextLocations', nextLocIds, locationIds);

      const enemyPoolIds = parseJsonIds(loc.enemyPool);
      for (const eId of enemyPoolIds) addCrossRef(eId, 'locations');
      checkJsonRefs(loc.id, 'enemyPool', enemyPoolIds, enemyIds);

      const itemPoolIds = parseJsonIds(loc.itemPool);
      for (const iId of itemPoolIds) addCrossRef(iId, 'locations');
      checkJsonRefs(loc.id, 'itemPool', itemPoolIds, itemIds);

      const lockedLocIds = parseJsonIds(loc.lockedLocations);
      for (const lId of lockedLocIds) addCrossRef(lId, 'locations');
      checkJsonRefs(loc.id, 'lockedLocations', lockedLocIds, locationIds);
    }

    // ─── Enemies ───
    for (const enemy of enemies) {
      const abilityIdList = parseJsonIds(enemy.abilities);
      for (const aId of abilityIdList) addCrossRef(aId, 'enemies');
      checkJsonRefs(enemy.id, 'abilities', abilityIdList, abilityIds);

      const lootIds = parseJsonIds(enemy.lootTable);
      for (const iId of lootIds) addCrossRef(iId, 'enemies');
      checkJsonRefs(enemy.id, 'lootTable', lootIds, itemIds);
    }

    // ─── Documents ───
    for (const doc of documents) {
      addCrossRef(doc.locationId, 'documents');
      checkRef(doc.id, 'locationId', doc.locationId, locationIds);
    }

    // ─── SecretRooms ───
    for (const sr of secretRooms) {
      addCrossRef(sr.locationId, 'secret-rooms');
      checkRef(sr.id, 'locationId', sr.locationId, locationIds);

      if (sr.requiredDocumentId) {
        addCrossRef(sr.requiredDocumentId, 'secret-rooms');
        checkRef(sr.id, 'requiredDocumentId', sr.requiredDocumentId, documentIds);
      }

      if (sr.requiredNpcQuestId) {
        addCrossRef(sr.requiredNpcQuestId, 'secret-rooms');
        checkRef(sr.id, 'requiredNpcQuestId', sr.requiredNpcQuestId, questIds);
      }

      if (sr.uniqueItemId) {
        addCrossRef(sr.uniqueItemId, 'secret-rooms');
        checkRef(sr.id, 'uniqueItemId', sr.uniqueItemId, itemIds);
      }

      const lootIds = parseJsonIds(sr.lootTable);
      for (const iId of lootIds) addCrossRef(iId, 'secret-rooms');
      checkJsonRefs(sr.id, 'lootTable', lootIds, itemIds);
    }

    // ─── Recipes ───
    for (const recipe of recipes) {
      const ingredientIds = parseJsonIds(recipe.ingredients);
      for (const iId of ingredientIds) addCrossRef(iId, 'recipes');
      checkJsonRefs(recipe.id, 'ingredients', ingredientIds, itemIds);

      if (recipe.resultItemId) {
        addCrossRef(recipe.resultItemId, 'recipes');
        checkRef(recipe.id, 'resultItemId', recipe.resultItemId, itemIds);
      }
    }

    // ─── BossPhases ───
    for (const bp of bossPhases) {
      addCrossRef(bp.enemyId, 'boss-phases');
      checkRef(bp.id, 'enemyId', bp.enemyId, enemyIds);

      const newAbIds = parseJsonIds(bp.newAbilities);
      for (const aId of newAbIds) addCrossRef(aId, 'boss-phases');
      checkJsonRefs(bp.id, 'newAbilities', newAbIds, abilityIds);
    }

    // ─── Characters ───
    for (const char of characters) {
      if (char.archetypeId) {
        addCrossRef(char.archetypeId, 'characters');
        checkRef(char.id, 'archetypeId', char.archetypeId, archetypeIds);
      }
    }

    // ─── Archetypes ───
    for (const arch of archetypes) {
      if (arch.specialId) {
        addCrossRef(arch.specialId, 'archetypes');
        checkRef(arch.id, 'specialId', arch.specialId, specialIds);
      }
      if (arch.special2Id) {
        addCrossRef(arch.special2Id, 'archetypes');
        checkRef(arch.id, 'special2Id', arch.special2Id, specialIds);
      }
    }

    // ─── QuestChains ───
    for (const qc of questChains) {
      addCrossRef(qc.npcId, 'quest-chains');
      checkRef(qc.id, 'npcId', qc.npcId, npcIds);
    }

    // ─── QuestChainSteps ───
    for (const step of questChainSteps) {
      if (step.targetId) {
        // targetId could be item, enemy, location, ability
        if (!itemIds.has(step.targetId) && !enemyIds.has(step.targetId) && !locationIds.has(step.targetId) && !abilityIds.has(step.targetId)) {
          addBroken(step.id, 'targetId', step.targetId);
        }
      }
      if (step.nextStepId) {
        checkRef(step.id, 'nextStepId', step.nextStepId, stepIds);
      }
      const rewardIds = parseJsonIds(step.rewardItems);
      for (const iId of rewardIds) addCrossRef(iId, 'quest-chains');
      checkJsonRefs(step.id, 'rewardItems', rewardIds, itemIds);
    }

    // ─── Events ───
    for (const ev of events) {
      if (ev.chainId) {
        addCrossRef(ev.chainId, 'events');
        checkRef(ev.id, 'chainId', ev.chainId, eventIds);
      }
      if (ev.nextEventId) {
        addCrossRef(ev.nextEventId, 'events');
        checkRef(ev.id, 'nextEventId', ev.nextEventId, eventIds);
      }

      const locIds = parseJsonIds(ev.locationIds);
      for (const lId of locIds) addCrossRef(lId, 'events');
      checkJsonRefs(ev.id, 'locationIds', locIds, locationIds);
    }

    // ─── Item self-references (ammoType) ───
    for (const item of items) {
      if (item.ammoType) {
        addCrossRef(item.ammoType, 'items');
        checkRef(item.id, 'ammoType', item.ammoType, itemIds);
      }
    }

    // ── Clean up empty entries ──
    for (const key of Object.keys(brokenRefs)) {
      if (brokenRefs[key].length === 0) delete brokenRefs[key];
    }

    return NextResponse.json({ crossRefs, brokenRefs, typeLabels: TYPE_LABELS });
  } catch (error) {
    return safeErrorResponse(error, '[Admin References]');
  }
}
