import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
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

/** Parse a JSON string field and return an array of strings. */
function jsonStrArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parsed = safeJson(raw, [] as unknown);
  return Array.isArray(parsed) ? parsed.map(String) : [];
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
      quests,
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
      documents,
      archetypes,
      characters,
      specials,
      achievements,
      enemyAbilities,
      rooms,
      doors,
    ] = await Promise.all([
      db.sideQuest.findMany(),
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
    const questIds = new Set(quests.map((q) => q.id));
    const locationIds = new Set(locations.map((l) => l.id));
    const enemyIds = new Set(enemies.map((e) => e.id));
    const documentIds = new Set(documents.map((d) => d.id));
    const itemIds = new Set(items.map((i) => i.id));
    const abilityIds = new Set(specials.map((s) => s.id));
    const enemyAbilityIds = new Set(enemyAbilities.map((a) => a.id));
    const questChainIds = new Set(questChains.map((qc) => qc.id));
    const roomIds = new Set(rooms.map((r) => r.id));
    const npcLocationMap = new Map<string, string>(); // npcId → locationId
    for (const npc of npcs) npcLocationMap.set(npc.id, npc.locationId);
    // Location → rooms map
    const locationRoomMap = new Map<string, string[]>();
    for (const room of rooms) {
      const arr = locationRoomMap.get(room.locationId) || [];
      arr.push(room.id);
      locationRoomMap.set(room.locationId, arr);
    }
    // Door connectivity: build adjacency (location → connected locations via cross-location doors)
    const locationDoorConnections = new Map<string, Set<string>>();
    for (const loc of locations) locationDoorConnections.set(loc.id, new Set());
    for (const door of doors) {
      const fromRoom = rooms.find(r => r.id === door.fromRoomId);
      const toRoom = rooms.find(r => r.id === door.toRoomId);
      if (fromRoom && toRoom && fromRoom.locationId !== toRoom.locationId) {
        const from = locationDoorConnections.get(fromRoom.locationId);
        const to = locationDoorConnections.get(toRoom.locationId);
        if (from) from.add(toRoom.locationId);
        if (to) to.add(fromRoom.locationId);
      }
    }

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

    // ── 3. Orphaned Quests: npcId doesn't match any NPC ──
    for (const q of quests) {
      if (!npcIds.has(q.npcId)) {
        warnings.push(
          issue(
            `Quest "${q.name}" (${q.id}) — npcId "${q.npcId}" non trovato`,
            'quests',
            q.id,
            `Correggi l'npcId o crea l'NPC mancante`,
            'quests',
          ),
        );
      }
    }

    // ── 4. Orphaned NPCs: questId doesn't match any quest ──
    for (const npc of npcs) {
      if (npc.questId && !questIds.has(npc.questId)) {
        warnings.push(
          issue(
            `NPC "${npc.name}" (${npc.id}) — questId "${npc.questId}" non trovata`,
            'npcs',
            npc.id,
            `Correggi il questId o crea la quest mancante`,
            'npcs',
          ),
        );
      }
    }

    // ── 5. Empty Locations: no nextLocations (isolated / dead-end) ──
    for (const loc of locations) {
      const nextLocs = jsonStrArray(loc.nextLocations);
      if (nextLocs.length === 0) {
        info.push(
          issue(
            `Locazione "${loc.name}" (${loc.id}) — nessuna uscita (nextLocations vuoto)`,
            'locations',
            loc.id,
            'Aggiungi almeno una locazione collegata in nextLocations',
            'locations',
          ),
        );
      } else {
        // Also check if referenced nextLocations actually exist
        for (const refId of nextLocs) {
          if (!locationIds.has(refId)) {
            warnings.push(
              issue(
                `Locazione "${loc.name}" (${loc.id}) — nextLocations riferisce a "${refId}" inesistente`,
                'locations',
                loc.id,
                `Rimuovi il riferimento o crea la locazione "${refId}"`,
                'locations',
              ),
            );
          }
        }
      }
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
      const loot = safeJson<{ itemId: string }[]>(enemy.lootTable, []);
      if (!loot || loot.length === 0) {
        info.push(
          issue(
            `Nemico "${enemy.name}" (${enemy.id}) — lootTable vuoto`,
            'enemies',
            enemy.id,
            'Aggiungi drop items alla lootTable per ricompense',
            'enemies',
          ),
        );
      } else {
        // Validate referenced item IDs
        for (const entry of loot) {
          if (entry.itemId && !itemIds.has(entry.itemId)) {
            warnings.push(
              issue(
                `Nemico "${enemy.name}" (${enemy.id}) — lootTable riferisce a item "${entry.itemId}" inesistente`,
                'enemies',
                enemy.id,
                `Correggi l'itemId o crea l'item "${entry.itemId}"`,
                'enemies',
              ),
            );
          }
        }
      }
    }

    // ── 8. Quests without Rewards ──
    for (const q of quests) {
      const rewardItems = safeJson<{ itemId: string; quantity: number }[]>(
        q.rewardItems,
        [],
      );
      const hasItems = rewardItems && rewardItems.length > 0;
      const hasExp = q.rewardExp > 0;
      if (!hasItems && !hasExp) {
        warnings.push(
          issue(
            `Quest "${q.name}" (${q.id}) — nessuna ricompensa (rewardItems vuoto, rewardExp=0)`,
            'quests',
            q.id,
            'Aggiungi item ricompensa o esperienza alla quest',
            'quests',
          ),
        );
      }
    }

    // ── 9. Boss without Phases ──
    for (const enemy of enemies) {
      if (enemy.isBoss && (bossPhaseMap.get(enemy.id) || 0) === 0) {
        warnings.push(
          issue(
            `Boss "${enemy.name}" (${enemy.id}) — nessuna fase definita`,
            'enemies',
            enemy.id,
            'Aggiungi fasi boss nella sezione Nemici → Boss Phases',
            'enemies',
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

    // ── 16. NPC locationId references ──
    for (const npc of npcs) {
      if (!locationIds.has(npc.locationId)) {
        warnings.push(
          issue(
            `NPC "${npc.name}" (${npc.id}) — locationId "${npc.locationId}" inesistente`,
            'npcs',
            npc.id,
            `Correggi locationId o crea la locazione "${npc.locationId}"`,
            'npcs',
          ),
        );
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

    // ── 18. Quest prerequisite references ──
    for (const q of quests) {
      if (q.prerequisiteQuestId && !questIds.has(q.prerequisiteQuestId)) {
        warnings.push(
          issue(
            `Quest "${q.name}" (${q.id}) — prerequisiteQuestId "${q.prerequisiteQuestId}" non trovata`,
            'quests',
            q.id,
            `Correggi il prerequisiteQuestId o crea la quest prerequisite`,
            'quests',
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

    // ── 22. Quest reward item references ──
    for (const q of quests) {
      const rewardItems = safeJson<{ itemId: string; quantity: number }[]>(
        q.rewardItems,
        [],
      );
      for (const entry of rewardItems) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Quest "${q.name}" (${q.id}) — rewardItems contiene item "${entry.itemId}" inesistente`,
              'quests',
              q.id,
              `Correggi l'itemId della ricompensa o crea l'item "${entry.itemId}"`,
              'quests',
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

    // ── 26. Room locationId references ──
    for (const room of rooms) {
      if (!locationIds.has(room.locationId)) {
        critical.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — locationId "${room.locationId}" inesistente`,
            'locations',
            room.locationId,
            `Correggi locationId o crea la locazione`,
            'locations',
          ),
        );
      }
    }

    // ── 27. Door room references ──
    for (const door of doors) {
      if (!roomIds.has(door.fromRoomId)) {
        critical.push(
          issue(
            `Porta "${door.id}" — fromRoomId "${door.fromRoomId}" inesistente`,
            'locations',
            door.fromRoomId,
            `Rimuovi la porta o crea la stanza`,
            'locations',
          ),
        );
      }
      if (!roomIds.has(door.toRoomId)) {
        critical.push(
          issue(
            `Porta "${door.id}" — toRoomId "${door.toRoomId}" inesistente`,
            'locations',
            door.toRoomId,
            `Rimuovi la porta o crea la stanza`,
            'locations',
          ),
        );
      }
      // Validate requiredItemId on key_locked doors
      if (door.state === 'key_locked' && door.requiredItemId && !itemIds.has(door.requiredItemId)) {
        warnings.push(
          issue(
            `Porta "${door.id}" — requiredItemId "${door.requiredItemId}" inesistente (stato: key_locked)`,
            'locations',
            door.id,
            `Correggi l'item richiesto o crea l'item`,
            'items',
          ),
        );
      }
    }

    // ── 28. Room enemyPool references ──
    for (const room of rooms) {
      const pool = jsonStrArray(room.enemyPool);
      for (const eId of pool) {
        if (!enemyIds.has(eId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — enemyPool contiene nemico "${eId}" inesistente`,
              'locations',
              room.id,
              `Rimuovi "${eId}" dall'enemyPool o crea il nemico`,
              'enemies',
            ),
          );
        }
      }
    }

    // ── 29. Room itemPool references ──
    for (const room of rooms) {
      const pool = safeJson<{ itemId: string }[]>(room.itemPool, []);
      for (const entry of pool) {
        if (entry.itemId && !itemIds.has(entry.itemId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — itemPool contiene item "${entry.itemId}" inesistente`,
              'locations',
              room.id,
              `Correggi l'itemId o crea l'item`,
              'items',
            ),
          );
        }
      }
    }

    // ── 30. Room npcIds references ──
    for (const room of rooms) {
      const npcIdsArr = jsonStrArray(room.npcIds);
      for (const nId of npcIdsArr) {
        if (!npcIds.has(nId)) {
          warnings.push(
            issue(
              `Stanza "${room.name}" (${room.id}) — npcIds contiene NPC "${nId}" inesistente`,
              'locations',
              room.id,
              `Rimuovi "${nId}" da npcIds o crea l'NPC`,
              'npcs',
            ),
          );
        } else {
          // Check NPC is in the same location as the room
          const npcLocId = npcLocationMap.get(nId);
          if (npcLocId && npcLocId !== room.locationId) {
            info.push(
              issue(
                `Stanza "${room.name}" (${room.id}) — NPC "${nId}" è in un'altra locazione (${npcLocId})`,
                'locations',
                room.id,
                `Sposta l'NPC nella locazione corretta o rimuovi il riferimento`,
                'npcs',
              ),
            );
          }
        }
      }
    }

    // ── 31. Rooms without doors (isolated rooms) ──
    const roomsWithDoors = new Set<string>();
    for (const door of doors) {
      roomsWithDoors.add(door.fromRoomId);
      roomsWithDoors.add(door.toRoomId);
    }
    for (const room of rooms) {
      if (!roomsWithDoors.has(room.id)) {
        info.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — nessuna porta di collegamento`,
            'locations',
            room.id,
            `Aggiungi almeno una porta per collegare la stanza`,
            'locations',
          ),
        );
      }
    }

    // ── 32. Boss rooms without enemy assigned ──
    for (const room of rooms) {
      if (room.type === 'boss_room') {
        const pool = jsonStrArray(room.enemyPool);
        const hasBoss = pool.some(eId => {
          const enemy = enemies.find(e => e.id === eId);
          return enemy && enemy.isBoss;
        });
        if (!hasBoss) {
          warnings.push(
            issue(
              `Stanza boss "${room.name}" (${room.id}) — nessun boss nell'enemyPool`,
              'locations',
              room.id,
              `Aggiungi un nemico boss all'enemyPool della stanza`,
              'enemies',
            ),
          );
        }
      }
    }

    // ── 33. Locations without rooms ──
    for (const loc of locations) {
      const locRooms = locationRoomMap.get(loc.id) || [];
      if (locRooms.length === 0) {
        warnings.push(
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

    // ── 34. Locations not connected by cross-location doors ──
    // Build connectivity graph (excluding single-location games)
    if (locations.length > 1) {
      const visited = new Set<string>();
      const queue = [locations[0].id];
      visited.add(locations[0].id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const connected = locationDoorConnections.get(current) || new Set();
        for (const next of connected) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      for (const loc of locations) {
        if (!visited.has(loc.id)) {
          warnings.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — non raggiungibile tramite porte cross-location`,
              'locations',
              loc.id,
              `Aggiungi una porta cross-location che colleghi questa locazione al resto della mappa`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 35. nextLocations not matching cross-location doors ──
    for (const loc of locations) {
      const nextLocs = jsonStrArray(loc.nextLocations);
      const doorConnected = locationDoorConnections.get(loc.id) || new Set();
      // Check: nextLocations references locations not connected by doors
      for (const refId of nextLocs) {
        if (!doorConnected.has(refId)) {
          info.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — nextLocations contiene "${refId}" ma non c'è una porta cross-location`,
              'locations',
              loc.id,
              `Aggiungi una porta cross-location verso "${refId}" o rimuovi da nextLocations`,
              'locations',
            ),
          );
        }
      }
      // Check: cross-location door targets not in nextLocations
      for (const doorTargetId of doorConnected) {
        if (!nextLocs.includes(doorTargetId)) {
          info.push(
            issue(
              `Locazione "${loc.name}" (${loc.id}) — ha una porta cross-location verso "${doorTargetId}" ma non è in nextLocations`,
              'locations',
              loc.id,
              `Aggiungi "${doorTargetId}" a nextLocations o rimuovi la porta`,
              'locations',
            ),
          );
        }
      }
    }

    // ── 36. Deprecated room fields still in use ──
    for (const room of rooms) {
      const deprecatedNextRooms = jsonStrArray(room.nextRooms);
      if (deprecatedNextRooms.length > 0) {
        info.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — usa nextRooms deprecato (${deprecatedNextRooms.length} refs)`,
            'locations',
            room.id,
            `Migra le connessioni al sistema GameDoor e svuota nextRooms`,
            'locations',
          ),
        );
      }
      const deprecatedLockedRooms = safeJson<{ roomId: string }[]>(room.lockedRooms, []);
      if (deprecatedLockedRooms.length > 0) {
        info.push(
          issue(
            `Stanza "${room.name}" (${room.id}) — usa lockedRooms deprecato (${deprecatedLockedRooms.length} refs)`,
            'locations',
            room.id,
            `Migra le porte bloccate al sistema GameDoor (state=key_locked) e svuota lockedRooms`,
            'locations',
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
