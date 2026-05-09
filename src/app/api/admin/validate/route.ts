import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

// ── Types ──

interface ValidationIssue {
  message: string;
  entityType: string;
  entityId: string | null;
  fix: string;
  tabId?: string;
}

interface ValidationCategory {
  id: string;
  label: string;
  icon: string;
  issues: ValidationIssue[];
}

interface ValidationReport {
  score: number;
  totalIssues: number;
  categories: ValidationCategory[];
}

// ── Helpers ──

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

/** Parse a JSON string field and return an array of strings.
 *  Handles both plain string arrays ["a","b"] and object arrays [{itemId:"a"},...]. */
function jsonStrArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parsed = safeJson(raw, [] as unknown);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item: unknown) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'itemId' in item) return String((item as { itemId: string }).itemId);
    return String(item);
  });
}

function issue(
  message: string,
  entityType: string,
  entityId: string | null,
  fix: string,
  tabId?: string,
): ValidationIssue {
  return { message, entityType, entityId, fix, tabId };
}

// ── GET /api/admin/validate ──

export async function GET() {
  try {
    const critical: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    // ── Fetch ALL entities ──

    const [
      npcs,
      locations,
      endings,
      enemies,
      bossPhases,
      events,
      secretRooms,
      recipes,
      items,
      questChains,
      questChainSteps,
      questChainFinalRewards,
      documents,
      archetypes,
      characters,
      specials,
      achievements,
      enemyAbilities,
      rooms,
      doors,
    ] = await Promise.all([
      db.gameNPC.findMany(),
      db.gameLocation.findMany(),
      db.gameEnding.findMany(),
      db.gameEnemy.findMany(),
      db.gameBossPhase.findMany(),
      db.dynamicEvent.findMany(),
      db.secretRoom.findMany(),
      db.gameRecipe.findMany(),
      db.item.findMany(),
      db.questChain.findMany(),
      db.questChainStep.findMany(),
      db.questChainFinalReward.findMany(),
      db.document.findMany(),
      db.gameArchetype.findMany(),
      db.gameCharacter.findMany(),
      db.gameSpecial.findMany(),
      db.gameAchievement.findMany(),
      db.gameEnemyAbility.findMany(),
      db.gameRoom.findMany(),
      db.gameDoor.findMany(),
    ]);

    // Build index sets for fast lookups
    const npcIds = new Set(npcs.map((n) => n.id));
    const questIds = new Set(questChains.map((qc) => qc.id));
    const locationIds = new Set(locations.map((l) => l.id));
    const enemyIds = new Set(enemies.map((e) => e.id));
    const documentIds = new Set(documents.map((d) => d.id));
    const itemIds = new Set(items.map((i) => i.id));
    const abilityIds = new Set(specials.map((s) => s.id));
    const enemyAbilityIds = new Set(enemyAbilities.map((a) => a.id));
    const questChainIds = new Set(questChains.map((qc) => qc.id));

    // Boss enemies index: enemyId → phases
    const bossPhaseMap = new Map<string, number>();
    for (const phase of bossPhases) {
      bossPhaseMap.set(phase.enemyId, (bossPhaseMap.get(phase.enemyId) || 0) + 1);
    }

    // ── 1. Missing Endings (critical) ──
    if (endings.length === 0) {
      critical.push(
        issue(
          'Nessun finale definito',
          'endings',
          null,
          'Aggiungi almeno un finale nella sezione Progressione',
          'endings',
        ),
      );
    }

    // ── 2. No Start Location (critical) ──
    const startLocations = locations.filter((l) => l.mapRow === 0);
    if (startLocations.length === 0) {
      critical.push(
        issue(
          'Nessuna locazione iniziale (mapRow=0)',
          'locations',
          null,
          'Imposta mapRow=0 per almeno una locazione nella Mappa',
          'locations',
        ),
      );
    }

    // ── 6. Empty Enemy Pools: encounterRate > 0 but empty enemyPool ──
    for (const loc of locations) {
      if (loc.encounterRate > 0) {
        const pool = jsonStrArray(loc.enemyPool);
        if (pool.length === 0) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — encounterRate=${loc.encounterRate}% ma enemyPool vuoto`,
              'locations',
              loc.id,
              'Aggiungi nemici all\'enemyPool o imposta encounterRate a 0',
              'locations',
            ),
          );
        } else {
          // Check if enemy IDs in the pool actually exist
          for (const eId of pool) {
            if (!enemyIds.has(eId)) {
              critical.push(
                issue(
                  `Locazione "${loc.name}" (${loc.id}) — enemyPool contiene nemico "${eId}" inesistente`,
                  'locations',
                  loc.id,
                  `Rimuovi "${eId}" dall'enemyPool o crea il nemico`,
                  'locations',
                ),
              );
            }
          }
        }
      }
    }

    // ── 7. Missing Loot Tables: Enemies with empty lootTable ──
    for (const enemy of enemies) {
      if (enemy.isBoss && (bossPhaseMap.get(enemy.id) || 0) === 0) {
        warnings.push(
          issue(
            `Boss "${enemy.name}" (${enemy.id}) — nessuna fase definita`,
            'enemies',
            enemy.id,
            'Aggiungi fasi boss nella sezione Nemici → Boss Phases',
            'boss-phases',
          ),
        );
      }
    }

    // ── 10. Unconnected Event Chains ──
    for (const ev of events) {
      if (ev.chainId) {
        // Check if other events share the same chainId
        const chainEvents = events.filter((e) => e.chainId === ev.chainId);
        if (chainEvents.length <= 1) {
          info.push(
            issue(
              `Evento "${ev.title}" (${ev.id}) — chainId "${ev.chainId}" isolato (nessun altro evento nella catena)`,
              'locations',
              ev.id,
              'Aggiungi altri eventi alla catena o rimuovi il chainId',
              'locations',
            ),
          );
        }

        // Validate nextEventId reference
        if (ev.nextEventId && !events.some((e) => e.id === ev.nextEventId)) {
          warnings.push(
            issue(
              `Evento "${ev.title}" (${ev.id}) — nextEventId "${ev.nextEventId}" non trovato`,
              'locations',
              ev.id,
              `Correggi nextEventId o crea l'evento "${ev.nextEventId}"`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 11. Secret Rooms with Missing Prerequisites ──
    for (const sr of secretRooms) {
      if (sr.requiredDocumentId && !documentIds.has(sr.requiredDocumentId)) {
        warnings.push(
          issue(
            `Secret Room "${sr.name}" (${sr.id}) — requiredDocumentId "${sr.requiredDocumentId}" inesistente`,
            'locations',
            sr.id,
            `Correggi il documento richiesto o crea "${sr.requiredDocumentId}"`,
            'locations',
          ),
        );
      }
      if (sr.requiredNpcQuestId && !questIds.has(sr.requiredNpcQuestId)) {
        warnings.push(
          issue(
            `Secret Room "${sr.name}" (${sr.id}) — requiredNpcQuestId "${sr.requiredNpcQuestId}" inesistente`,
            'locations',
            sr.id,
            `Correggi la quest richiesta o crea "${sr.requiredNpcQuestId}"`,
            'locations',
          ),
        );
      }
      // Check location exists
      if (!locationIds.has(sr.locationId)) {
        critical.push(
          issue(
            `Secret Room "${sr.name}" (${sr.id}) — locationId "${sr.locationId}" inesistente`,
            'locations',
            sr.id,
            `Correggi locationId o crea la locazione "${sr.locationId}"`,
            'locations',
          ),
        );
      }

      // Validate lootTable item refs
      const srLoot = safeJson<{ itemId: string }[]>(sr.lootTable, []);
      for (const entry of srLoot) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Secret Room "${sr.name}" (${sr.id}) — lootTable riferisce a item "${entry.itemId}" inesistente`,
              'locations',
              sr.id,
              `Correggi l'itemId o crea l'item "${entry.itemId}"`,
              'locations',
            ),
          );
        }
      }

      // Validate uniqueItemId ref
      if (sr.uniqueItemId && !itemIds.has(sr.uniqueItemId)) {
        warnings.push(
          issue(
            `Secret Room "${sr.name}" (${sr.id}) — uniqueItemId "${sr.uniqueItemId}" inesistente`,
            'locations',
            sr.id,
            `Correggi uniqueItemId o crea l'item "${sr.uniqueItemId}"`,
            'locations',
          ),
        );
      }
    }

    // ── 12. Recipes with Missing Ingredients ──
    for (const recipe of recipes) {
      const ingredients = safeJson<{ itemId: string; quantity: number }[]>(
        recipe.ingredients,
        [],
      );
      for (const ing of ingredients) {
        if (ing.itemId && !itemIds.has(ing.itemId)) {
          warnings.push(
            issue(
              `Ricetta "${recipe.name}" (${recipe.id}) — ingrediente "${ing.itemId}" inesistente`,
              'recipes',
              recipe.id,
              `Correggi l'ingrediente o crea l'item "${ing.itemId}"`,
              'recipes',
            ),
          );
        }
      }
      // Check resultItemId
      if (!itemIds.has(recipe.resultItemId)) {
        critical.push(
          issue(
            `Ricetta "${recipe.name}" (${recipe.id}) — resultItemId "${recipe.resultItemId}" inesistente`,
            'recipes',
            recipe.id,
            `Correggi resultItemId o crea l'item "${recipe.resultItemId}"`,
            'recipes',
          ),
        );
      }
    }

    // ── 13. Empty Description Fields ──
    for (const item of items) {
      if (!item.description || item.description.trim() === '') {
        info.push(
          issue(
            `Item "${item.name}" (${item.id}) — descrizione vuota`,
            'items',
            item.id,
            'Aggiungi una descrizione per questo item',
            'items',
          ),
        );
      }
    }
    for (const enemy of enemies) {
      if (!enemy.description || enemy.description.trim() === '') {
        info.push(
          issue(
            `Nemico "${enemy.name}" (${enemy.id}) — descrizione vuota`,
            'enemies',
            enemy.id,
            'Aggiungi una descrizione per questo nemico',
            'enemies',
          ),
        );
      }
    }
    for (const loc of locations) {
      if (!loc.description || loc.description.trim() === '') {
        info.push(
          issue(
            `Locazione "${loc.name}" (${loc.id}) — descrizione vuota`,
            'locations',
            loc.id,
            'Aggiungi una descrizione per questa locazione',
            'locations',
          ),
        );
      }
    }

    // ── 14. Enemy ability references ──
    for (const enemy of enemies) {
      const abIds = jsonStrArray(enemy.abilities);
      for (const abId of abIds) {
        if (!enemyAbilityIds.has(abId)) {
          warnings.push(
            issue(
              `Nemico "${enemy.name}" (${enemy.id}) — ability "${abId}" non trovata`,
              'enemies',
              enemy.id,
              `Rimuovi "${abId}" dalle abilità o crea l'ability`,
              'enemies',
            ),
          );
        }
      }
    }

    // ── 15. Location itemPool references ──
    for (const loc of locations) {
      const itemPool = safeJson<{ itemId: string }[]>(loc.itemPool, []);
      for (const entry of itemPool) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — itemPool riferisce a item "${entry.itemId}" inesistente`,
              'locations',
              loc.id,
              `Correggi l'itemId o crea l'item "${entry.itemId}"`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 17. QuestChain npcId references ──
    for (const qc of questChains) {
      if (!npcIds.has(qc.npcId)) {
        warnings.push(
          issue(
            `Catena di quest "${qc.name}" (${qc.id}) — npcId "${qc.npcId}" non trovato`,
            'quest-chains',
            qc.id,
            `Correggi l'npcId o crea l'NPC mancante`,
            'quest-chains',
          ),
        );
      }
    }

    // ── 18. QuestChain prerequisite references ──
    for (const qc of questChains) {
      if (qc.prerequisiteQuestId && !questIds.has(qc.prerequisiteQuestId)) {
        warnings.push(
          issue(
            `Catena di quest "${qc.name}" (${qc.id}) — prerequisiteQuestId "${qc.prerequisiteQuestId}" non trovata`,
            'quest-chains',
            qc.id,
            `Correggi il prerequisiteQuestId o crea la catena prerequisite`,
            'quest-chains',
          ),
        );
      }
    }

    // ── 18b. QuestChain with no steps ──
    const stepsByChain = new Map<string, number>();
    for (const step of questChainSteps) {
      stepsByChain.set(step.chainId, (stepsByChain.get(step.chainId) || 0) + 1);
    }
    for (const qc of questChains) {
      const stepCount = stepsByChain.get(qc.id) || 0;
      if (stepCount === 0) {
        warnings.push(
          issue(
            `Catena di quest "${qc.name}" (${qc.id}) — nessuno step definito. L'NPC non potrà assegnare questa missione.`,
            'quest-chains',
            qc.id,
            `Aggiungi almeno uno step alla catena nel campo Steps`,
            'quest-chains',
          ),
        );
      }
    }

    // ── 19. Location bossId references ──
    for (const loc of locations) {
      if (loc.bossId && !enemyIds.has(loc.bossId)) {
        warnings.push(
          issue(
            `Locazione "${loc.name}" (${loc.id}) — bossId "${loc.bossId}" inesistente`,
            'locations',
            loc.id,
            `Correggi bossId o crea il nemico boss "${loc.bossId}"`,
            'locations',
          ),
        );
      }
    }

    // ── 20. Archetype startingItems & specials references ──
    for (const arch of archetypes) {
      const startingItems = jsonStrArray(arch.startingItems);
      for (const itemId of startingItems) {
        if (!itemIds.has(itemId)) {
          warnings.push(
            issue(
              `Archetipo "${arch.name}" (${arch.id}) — startingItems contiene "${itemId}" inesistente`,
              'archetypes',
              arch.id,
              `Correggi startingItems o crea l'item "${itemId}"`,
              'archetypes',
            ),
          );
        }
      }
      if (arch.specialId && !abilityIds.has(arch.specialId)) {
        warnings.push(
          issue(
            `Archetipo "${arch.name}" (${arch.id}) — specialId "${arch.specialId}" non trovato`,
            'archetypes',
            arch.id,
            `Correggi specialId o crea la special "${arch.specialId}"`,
            'archetypes',
          ),
        );
      }
      if (arch.special2Id && !abilityIds.has(arch.special2Id)) {
        warnings.push(
          issue(
            `Archetipo "${arch.name}" (${arch.id}) — special2Id "${arch.special2Id}" non trovato`,
            'archetypes',
            arch.id,
            `Correggi special2Id o crea la special "${arch.special2Id}"`,
            'archetypes',
          ),
        );
      }
    }

    // ── 21. Locked locations item references ──
    for (const loc of locations) {
      const locked = safeJson<{ locationId: string; requiredItemId: string }[]>(
        loc.lockedLocations,
        [],
      );
      for (const lock of locked) {
        if (lock.requiredItemId && !itemIds.has(lock.requiredItemId)) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — lockedLocations richiede item "${lock.requiredItemId}" inesistente`,
              'locations',
              loc.id,
              `Correggi requiredItemId o crea l'item "${lock.requiredItemId}"`,
              'locations',
            ),
          );
        }
        if (lock.locationId && !locationIds.has(lock.locationId)) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — lockedLocations riferisce a "${lock.locationId}" inesistente`,
              'locations',
              loc.id,
              `Correggi locationId o crea la locazione "${lock.locationId}"`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 22. QuestChain final reward item references ──
    for (const fr of questChainFinalRewards) {
      const rewardItems = safeJson<{ itemId: string; quantity: number }[]>(
        fr.rewardItems,
        [],
      );
      for (const entry of rewardItems) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Ricompensa finale catena (${fr.chainId}) — rewardItems contiene item "${entry.itemId}" inesistente`,
              'quest-chains',
              fr.chainId,
              `Correggi l'itemId della ricompensa o crea l'item "${entry.itemId}"`,
              'quest-chains',
            ),
          );
        }
      }
    }

    // ── 23. QuestChain step reward item references ──
    for (const step of questChainSteps) {
      const rewardItems = safeJson<{ itemId: string; quantity: number }[]>(
        step.rewardItems,
        [],
      );
      for (const entry of rewardItems) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Step catena "${step.id}" — rewardItems contiene item "${entry.itemId}" inesistente`,
              'quest-chains',
              step.id,
              `Correggi l'itemId della ricompensa o crea l'item "${entry.itemId}"`,
              'quest-chains',
            ),
          );
        }
      }
    }

    // ── 24. Document locationId references ──
    for (const doc of documents) {
      if (!locationIds.has(doc.locationId)) {
        warnings.push(
          issue(
            `Documento "${doc.title}" (${doc.id}) — locationId "${doc.locationId}" inesistente`,
            'documents',
            doc.id,
            `Correggi locationId o crea la locazione "${doc.locationId}"`,
            'documents',
          ),
        );
      }
    }

    // ── 25. Quest chain step chainId references ──
    for (const step of questChainSteps) {
      if (!questChainIds.has(step.chainId)) {
        warnings.push(
          issue(
            `Step catena "${step.id}" — chainId "${step.chainId}" non trovato`,
            'quest-chains',
            step.id,
            `Correggi chainId o crea la catena di quest "${step.chainId}"`,
            'quest-chains',
          ),
        );
      }
    }

    // ── 26. Room with invalid locationId ──
    const roomIds = new Set(rooms.map((r) => r.id));
    const roomsByLocation = new Map<string, typeof rooms>();
    for (const room of rooms) {
      const arr = roomsByLocation.get(room.locationId) ?? [];
      arr.push(room);
      roomsByLocation.set(room.locationId, arr);
    }
    for (const room of rooms) {
      if (!locationIds.has(room.locationId)) {
        critical.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — locationId "${room.locationId}" inesistente`,
            'rooms',
            room.id,
            `Correggi locationId o crea la locazione "${room.locationId}"`,
            'rooms',
          ),
        );
      }
    }

    // ── 27. Door with invalid from/to rooms ──
    for (const door of doors) {
      if (!roomIds.has(door.fromRoomId)) {
        critical.push(
          issue(
            `Porta "${door.id}" — fromRoomId "${door.fromRoomId}" inesistente`,
            'doors',
            door.id,
            `Correggi fromRoomId o crea la stanza`,
            'rooms',
          ),
        );
      }
      if (!roomIds.has(door.toRoomId)) {
        critical.push(
          issue(
            `Porta "${door.id}" — toRoomId "${door.toRoomId}" inesistente`,
            'doors',
            door.id,
            `Correggi toRoomId o crea la stanza`,
            'rooms',
          ),
        );
      }
    }

    // ── 28. Key-locked door with invalid requiredItemId ──
    for (const door of doors) {
      if (door.state === 'key_locked' && door.requiredItemId && !itemIds.has(door.requiredItemId)) {
        warnings.push(
          issue(
            `Porta "${door.id}" — requiredItemId "${door.requiredItemId}" inesistente`,
            'doors',
            door.id,
            `Correggi requiredItemId o crea l'item "${door.requiredItemId}"`,
            'rooms',
          ),
        );
      }
    }

    // ── 29. Room with invalid enemy/item/NPC references ──
    for (const room of rooms) {
      // enemyPool
      const pool = jsonStrArray(room.enemyPool);
      for (const eId of pool) {
        if (!enemyIds.has(eId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — enemyPool contiene nemico "${eId}" inesistente`,
              'rooms',
              room.id,
              `Rimuovi "${eId}" dall'enemyPool o crea il nemico`,
              'rooms',
            ),
          );
        }
      }
      // itemPool
      const roomItems = safeJson<{ itemId: string }[]>(room.itemPool, []);
      for (const entry of roomItems) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — itemPool contiene item "${entry.itemId}" inesistente`,
              'rooms',
              room.id,
              `Correggi l'itemId o crea l'item "${entry.itemId}"`,
              'rooms',
            ),
          );
        }
      }
      // npcIds
      const roomNpcIds = jsonStrArray(room.npcIds);
      for (const npcId of roomNpcIds) {
        if (!npcIds.has(npcId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — npcIds contiene NPC "${npcId}" inesistente`,
              'rooms',
              room.id,
              `Rimuovi "${npcId}" dagli npcIds o crea l'NPC`,
              'rooms',
            ),
          );
        }
      }
    }

    // ── 31. Isolated rooms (no doors) ──
    const roomsWithDoors = new Set<string>();
    for (const door of doors) {
      roomsWithDoors.add(door.fromRoomId);
      roomsWithDoors.add(door.toRoomId);
    }
    for (const room of rooms) {
      if (!roomsWithDoors.has(room.id)) {
        // Also check deprecated nextRooms
        const nextRooms = jsonStrArray(room.nextRooms);
        if (nextRooms.length === 0) {
          info.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — isolata (nessuna porta collegata)`,
              'rooms',
              room.id,
              `Aggiungi porte per collegare la stanza`,
              'rooms',
            ),
          );
        }
      }
    }

    // ── 32. Boss room without boss enemy ──
    for (const room of rooms) {
      if (room.type === 'boss_room') {
        const pool = jsonStrArray(room.enemyPool);
        const hasBoss = pool.some((eId) => {
          const enemy = enemies.find((e) => e.id === eId);
          return enemy && enemy.isBoss;
        });
        if (!hasBoss) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — boss_room ma nessun boss nell'enemyPool`,
              'rooms',
              room.id,
              `Aggiungi un nemico boss (isBoss=true) all'enemyPool`,
              'rooms',
            ),
          );
        }
      }
    }

    // ── 33. Location without rooms ──
    for (const loc of locations) {
      const locRooms = roomsByLocation.get(loc.id);
      if (!locRooms || locRooms.length === 0) {
        info.push(
          issue(
            `Locazione "${loc.name}" (${loc.id}) — nessuna stanza definita`,
            'locations',
            loc.id,
            `Aggiungi almeno una stanza alla locazione`,
            'locations',
          ),
        );
      }
    }

    // ── 34. Unreachable locations (BFS on cross-location doors) ──
    if (locations.length > 1) {
      const startLocs = locations.filter((l) => l.mapRow === 0);
      const startLocIds = new Set(startLocs.map((l) => l.id));
      // Build adjacency from cross-location doors
      const adj = new Map<string, Set<string>>();
      for (const loc of locations) adj.set(loc.id, new Set());
      for (const door of doors) {
        const fromRoom = rooms.find((r) => r.id === door.fromRoomId);
        const toRoom = rooms.find((r) => r.id === door.toRoomId);
        if (fromRoom && toRoom && fromRoom.locationId !== toRoom.locationId) {
          adj.get(fromRoom.locationId)?.add(toRoom.locationId);
          adj.get(toRoom.locationId)?.add(fromRoom.locationId);
        }
      }
      // BFS from start locations
      const visited = new Set<string>();
      const queue: string[] = [];
      for (const startId of startLocIds) {
        visited.add(startId);
        queue.push(startId);
      }
      if (queue.length > 0) {
        while (queue.length > 0) {
          const current = queue.shift()!;
          for (const neighbor of adj.get(current) ?? []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
      }
      for (const loc of locations) {
        if (!visited.has(loc.id) && startLocIds.size > 0) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — non raggiungibile dalla locazione iniziale (nessuna porta cross-location connessa)`,
              'locations',
              loc.id,
              `Aggiungi porte cross-location per collegare questa locazione al grafo raggiungibile`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 36. Deprecated nextRooms/lockedRooms fields still used ──
    for (const room of rooms) {
      const nextRooms = jsonStrArray(room.nextRooms);
      if (nextRooms.length > 0) {
        info.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — usa nextRooms deprecato (${nextRooms.length} riferimenti). Usa GameDoor invece`,
            'rooms',
            room.id,
            `Migra i collegamenti a GameDoor e svuota nextRooms`,
            'rooms',
          ),
        );
      }
      const lockedRooms = safeJson<{ roomId: string; requiredItemId: string }[]>(room.lockedRooms, []);
      if (lockedRooms.length > 0) {
        info.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — usa lockedRooms deprecato (${lockedRooms.length} riferimenti). Usa GameDoor con state="key_locked" invece`,
            'rooms',
            room.id,
            `Migra i collegamenti a GameDoor e svuota lockedRooms`,
            'rooms',
          ),
        );
      }
    }

    // ── Build categories ──

    const categories: ValidationCategory[] = [];

    if (critical.length > 0) {
      categories.push({ id: 'critical', label: 'Critici', icon: '🔴', issues: critical });
    }
    if (warnings.length > 0) {
      categories.push({ id: 'warnings', label: 'Avvisi', icon: '🟡', issues: warnings });
    }
    if (info.length > 0) {
      categories.push({ id: 'info', label: 'Suggerimenti', icon: '🔵', issues: info });
    }

    // ── Calculate completeness score ──

    // Each critical issue costs 10 points, warning 3 points, info 1 point
    // Score starts at 100, clamped to 0-100
    const score = Math.max(
      0,
      Math.min(100, 100 - critical.length * 10 - warnings.length * 3 - info.length * 1),
    );

    const totalIssues = critical.length + warnings.length + info.length;

    const report: ValidationReport = {
      score,
      totalIssues,
      categories,
    };

    return NextResponse.json(report);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Validate]');
  }
}

// ── POST /api/admin/validate/fix — auto-fix common issues ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fixType: string = body.fixType || '';

    const fixes: string[] = [];

    if (!fixType || fixType === 'secretroom-questid') {
      // Fix 2: Clear stale requiredNpcQuestId from SecretRooms
      const questChains = await db.questChain.findMany({ select: { id: true } });
      const chainIds = new Set(questChains.map(qc => qc.id));
      const secretRooms = await db.secretRoom.findMany({ where: { requiredNpcQuestId: { not: null } } });
      for (const sr of secretRooms) {
        if (sr.requiredNpcQuestId && !chainIds.has(sr.requiredNpcQuestId)) {
          await db.secretRoom.update({ where: { id: sr.id }, data: { requiredNpcQuestId: null } });
          fixes.push(`Pulito requiredNpcQuestId "${sr.requiredNpcQuestId}" da Secret Room "${sr.name}" (${sr.id})`);
        }
      }
    }

    return NextResponse.json({ fixed: fixes.length, fixes });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Validate Fix]');
  }
}
