import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ItemInstance } from '../../types';
import { getDifficultyConfig } from '../../data/difficulty';
import { ITEMS, ENEMIES, DOCUMENTS, LOCATIONS, refreshGameData } from '../../data/loader';
import { addItemToParty, createEnemyInstance, getAutoCombatDefault } from '../helpers';
import { invalidateSettingsCache, fetchGameSettings } from '../settings-cache';

export const createDebugSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  debugHealAll: () => {
    set(state => ({
      party: state.party.map(p => ({ ...p, currentHp: p.maxHp, statusEffects: [] })),
      messageLog: [...state.messageLog, `[DEBUG] ✅ Tutti i personaggi curati al massimo HP. Status rimossi.`],
    }));
  },

  debugGiveAllItems: () => {
    set(state => {
      const itemIds = Object.keys(ITEMS).filter(id => {
        const def = ITEMS[id];
        return def && def.type !== 'weapon' && !id.startsWith('key_');
      });
      const newItems: ItemInstance[] = itemIds.map(id => {
        const def = ITEMS[id];
        return {
          uid: `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          effects: def.effects,
          quantity: 5,
        };
      });
      // Add to first alive character with space, distributing
      let updatedParty = state.party.map(p => ({ ...p }));
      for (const item of newItems) {
        let added = false;
        updatedParty = updatedParty.map(p => {
          if (!added && p.currentHp > 0 && p.inventory.length < p.maxInventorySlots) {
            added = true;
            return { ...p, inventory: [...p.inventory, item] };
          }
          return p;
        });
      }
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🎒 Aggiunti oggetti (qty 5) a tutti i personaggi.`],
      };
    });
  },

  debugGiveAllKeys: () => {
    const keyIds = Object.values(ITEMS).filter(i => i.type === 'utility').map(i => i.id);
    set(state => {
      const newItems: ItemInstance[] = keyIds.map(id => {
        const def = ITEMS[id];
        if (!def) return null;
        return {
          uid: `debug_${id}_${Date.now()}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          effects: def.effects,
          quantity: 1,
        };
      }).filter(Boolean) as ItemInstance[];
      const target = state.party.find(p => p.currentHp > 0);
      if (!target) return state;
      const updatedParty = state.party.map(p => {
        if (p.id !== target.id) return p;
        return { ...p, inventory: [...p.inventory, ...newItems] };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🔑 Tutte le chiavi e strumenti aggiunti a ${target.name}.`],
      };
    });
  },

  debugGiveAmmo: () => {
    const ammoIds = ['ammo_pistol', 'ammo_shotgun', 'ammo_magnum', 'ammo_machinegun', 'ammo_grenade'];
    set(state => {
      const newItems: ItemInstance[] = ammoIds.map(id => {
        const def = ITEMS[id];
        if (!def) return null;
        return {
          uid: `debug_ammo_${id}_${Date.now()}`,
          itemId: id,
          name: def.name,
          description: def.description,
          type: def.type,
          rarity: def.rarity,
          icon: def.icon,
          usable: def.usable,
          equippable: def.equippable,
          quantity: 50,
        };
      }).filter(Boolean) as ItemInstance[];
      const target = state.party.find(p => p.currentHp > 0);
      if (!target) return state;
      const updatedParty = state.party.map(p => {
        if (p.id !== target.id) return p;
        return { ...p, inventory: [...p.inventory, ...newItems] };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] 🔫 50 munizioni per ogni arma aggiunte a ${target.name}.`],
      };
    });
  },

  debugApplyStatus: (characterId: string, status: 'poison' | 'bleeding') => {
    set(state => ({
      party: state.party.map(p => {
        if (p.id !== characterId) return p;
        if (p.statusEffects.includes(status)) return p;
        return { ...p, statusEffects: [...p.statusEffects, status] };
      }),
      messageLog: [...state.messageLog, `[DEBUG] ${status === 'poison' ? '☠️ Veleno' : '🩸 Sanguinamento'} applicato a ${state.party.find(p => p.id === characterId)?.name}.`],
    }));
  },

  debugRemoveStatus: (characterId: string) => {
    set(state => ({
      party: state.party.map(p => {
        if (p.id !== characterId) return p;
        return { ...p, statusEffects: [] };
      }),
      messageLog: [...state.messageLog, `[DEBUG] ✨ Status rimossi da ${state.party.find(p => p.id === characterId)?.name}.`],
    }));
  },

  debugSpawnEnemy: (enemyId: string) => {
    const state = get();
    if (state.phase !== 'exploration') {
      // If already in combat, add enemy to existing combat
      if (state.phase === 'combat' && state.combat) {
        const def = ENEMIES[enemyId];
        if (!def) return;
        const newEnemy = createEnemyInstance(enemyId, 1);
        const allActors = [
          ...state.combat.fullTurnOrder,
          { id: newEnemy.id, type: 'enemy' as const },
        ];
        set({
          enemies: [...state.enemies, newEnemy],
          combat: {
            ...state.combat,
            fullTurnOrder: allActors,
            enemyOrder: [...state.combat.enemyOrder, newEnemy.id],
            log: [...state.combat.log, {
              turn: state.combat.turn,
              actorName: 'DEBUG',
              actorType: 'player' as const,
              action: 'Spawn',
              message: `[DEBUG] 👾 ${def.name} spawnato in combattimento!`,
            }],
          },
        });
        return;
      }
      return;
    }
    const def = ENEMIES[enemyId];
    if (!def) return;
    const diff = getDifficultyConfig(state.difficulty, state.partySize);
    const enemy = createEnemyInstance(enemyId, diff.statMult);
    const allActors = [
      ...state.party.filter(p => p.currentHp > 0).map(p => ({ id: p.id, spd: p.baseSpd, type: 'player' as const })),
      { id: enemy.id, spd: enemy.spd, type: 'enemy' as const },
    ].sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 4);
    const firstActor = allActors[0];
    set({
      phase: 'combat',
      enemies: [enemy],
      autoCombat: getAutoCombatDefault(),
      combat: {
        turn: 1,
        playerOrder: allActors.filter(a => a.type === 'player').map(a => a.id),
        enemyOrder: [enemy.id],
        fullTurnOrder: allActors.map(a => ({ id: a.id, type: a.type })),
        currentActorId: firstActor.id,
        currentActorType: firstActor.type,
        selectedAction: null,
        selectedTarget: null,
        selectedItemUid: null,
        isProcessing: false,
        log: [{ turn: 1, actorName: 'DEBUG', actorType: 'player' as const, action: 'Spawn', message: `[DEBUG] 👾 ${def.name} spawnato!` }],
        isVictory: false,
        isDefeat: false,
        fled: false,
        statusDurations: {},
        specialCooldowns: {},
        special2Cooldowns: {},
        tauntTargetId: null,
        activeEffects: [],
      },
      messageLog: [...state.messageLog, `[DEBUG] 👾 Combattimento iniziato contro ${def.name}!`],
    });
    if (firstActor.type === 'enemy') {
      setTimeout(() => get().advanceToNextActor(), 1400);
    }
  },

  debugSetLevel: (level: number) => {
    set(state => {
      const updatedParty = state.party.map(char => {
        if (char.currentHp <= 0) return char;
        const growth = { tank: { hp: 12, atk: 2, def: 2, spd: 0 }, healer: { hp: 8, atk: 1, def: 1, spd: 1 }, dps: { hp: 9, atk: 3, def: 1, spd: 1 }, control: { hp: 9, atk: 2, def: 1, spd: 2 } }[char.archetype] || { hp: 8, atk: 1, def: 1, spd: 1 };
        let newMaxHp = char.maxHp;
        let newAtk = char.baseAtk;
        let newDef = char.baseDef;
        let newSpd = char.baseSpd;
        const levelsToAdd = Math.max(0, level - char.level);
        for (let i = 0; i < levelsToAdd; i++) {
          newMaxHp += growth.hp;
          newAtk += growth.atk;
          newDef += growth.def;
          newSpd += growth.spd;
        }
        return {
          ...char,
          level,
          maxHp: newMaxHp,
          currentHp: newMaxHp,
          baseAtk: newAtk,
          baseDef: newDef,
          baseSpd: newSpd,
        };
      });
      return {
        party: updatedParty,
        messageLog: [...state.messageLog, `[DEBUG] ⬆️ Tutti i personaggi portati al livello ${level}. HP massimo ripristinato.`],
      };
    });
  },

  debugTeleport: (locationId: string) => {
    const state = get();
    const dest = LOCATIONS[locationId];
    if (!dest) return;
    set({
      phase: 'exploration',
      combat: null,
      enemies: [],
      currentLocationId: locationId,
      visitedLocations: [...new Set([...state.visitedLocations, locationId])],
      activeEvent: null,
      messageLog: [...state.messageLog, `[DEBUG] 📍 Teletrasportato a ${dest.name}.`],
    });
  },

  debugKillAllEnemies: () => {
    const state = get();
    if (!state.combat || state.phase !== 'combat') return;
    const killedEnemies = state.enemies.map(e => ({ ...e, currentHp: 0 }));
    set({
      enemies: killedEnemies,
      messageLog: [...state.messageLog, `[DEBUG] 💀 Tutti i nemici uccisi.`],
    });
    // Trigger victory check
    setTimeout(() => get().executeCombatTurn(), 500);
  },

  debugToggleGodMode: () => {
    set(state => ({
      godMode: !state.godMode,
      messageLog: [...state.messageLog, `[DEBUG] ${!state.godMode ? '🛡️ GOD MODE ON — danni nemici ridotti a 0' : '🔓 GOD MODE OFF — danni normali'}`],
    }));
  },

  debugSpawnCollectible: () => {
    set(state => {
      if (state.collectedRibbons >= 10) {
        return { messageLog: [...state.messageLog, '[DEBUG] 🎀 Hai già trovato tutti e 10 i nastri in questa run!'] };
      }
      const newCount = state.collectedRibbons + 1;
      return {
        collectedRibbons: newCount,
        messageLog: [...state.messageLog, `[DEBUG] 🎀 Nastro d'Inchiostro spawnato! (${newCount}/10)`],
        notification: {
          id: `notif_debug_${Date.now()}`,
          type: 'collectible_found' as const,
          message: "Nastro d'Inchiostro",
          icon: '🎀',
          itemId: 'ink_ribbon',
          subMessage: `Collezionabili: ${newCount}/10`,
        },
      };
    });
  },

  debugGiveAllRibbons: () => {
    set(state => ({
      collectedRibbons: 10,
      persistentRibbons: 10,
      messageLog: [...state.messageLog, '[DEBUG] 🎀 Tutti e 10 i nastri sbloccati (run + persistenti)!'],
    }));
  },

  bumpDataVersion: () => {
    _gameSettingsCache = null; // invalidate settings cache so it reloads
    fetchGameSettings(); // reload in background
    refreshGameData(); // reload all game data from DB
    set(state => ({ dataVersion: state.dataVersion + 1, searchMaxes: {} }));
  },
});
