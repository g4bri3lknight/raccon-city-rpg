import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ItemInstance } from '../../types';
import { ITEMS, LOCATIONS, RECIPES_DATA } from '../../data/loader';
import { getMaxItemBoxSlots, getDefaultItemBoxItems } from '../settings-cache';
import { nextNotifId } from '../helpers';
import { playSearch, playSafeRoomAmbient, stopSafeRoomAmbient } from '../../engine/sounds';

export const createSafeRoomSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  enterSafeRoom: () => {
    const state = get();
    const locId = state.currentLocationId;
    const location = LOCATIONS[locId];
    if (!location || !location.subAreas?.some(sa => sa.id === 'safe_room')) return;
    if (state.currentSubArea === 'safe_room') return;

    // Populate item box with default items from game settings on first visit to any safe room
    let updatedItemBox = [...state.itemBoxItems];
    const defaultDefs = getDefaultItemBoxItems();
    if (defaultDefs.length > 0 && !state.searchedSafeRooms.includes(locId)) {
      // Don't add items already in the box
      const existingIds = new Set(updatedItemBox.map(i => i.itemId));
      const newDefaults: ItemInstance[] = [];
      for (const def of defaultDefs) {
        if (existingIds.has(def.itemId)) continue;
        const itemDef = ITEMS[def.itemId];
        if (!itemDef) continue;
        const newUid = `${def.itemId}_default_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        newDefaults.push({
          uid: newUid,
          itemId: itemDef.id,
          name: itemDef.name,
          description: itemDef.description,
          type: itemDef.type,
          rarity: itemDef.rarity,
          icon: itemDef.icon,
          usable: itemDef.usable,
          equippable: itemDef.equippable,
          quantity: def.quantity || 1,
          effects: itemDef.effects,
        });
        existingIds.add(def.itemId);
      }
      if (newDefaults.length > 0) {
        updatedItemBox = [...updatedItemBox, ...newDefaults];
      }
    }

    set({
      currentSubArea: 'safe_room',
      itemBoxItems: updatedItemBox,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🏠 Entrate nella Safe Room. È un luogo sicuro — nessun nemico può attaccarvi qui.`],
    });
    // Play safe room ambient sound (through AudioEngine — respects volume/mute)
    try { playSafeRoomAmbient(); } catch {}
  },

  exitSafeRoom: () => {
    const state = get();
    if (state.currentSubArea !== 'safe_room') return;
    // Stop safe room ambient
    try { stopSafeRoomAmbient(); } catch {}
    set({
      currentSubArea: null,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🚪 Usciti dalla Safe Room. Fate attenzione...`],
    });
  },

  searchSafeRoom: () => {
    const state = get();
    const locId = state.currentLocationId;
    const location = LOCATIONS[locId];

    // Guard: must be in safe room
    if (state.currentSubArea !== 'safe_room') return;
    // Guard: location must exist and have a safe room
    if (!location || !location.subAreas?.some(sa => sa.id === 'safe_room')) return;
    // Guard: already searched this safe room
    if (state.searchedSafeRooms.includes(locId)) return;

    // Play search sound
    try { playSearch(); } catch {}

    const searcherName = state.party.find(p => p.id === state.selectedCharacterId)?.name || 'Qualcuno';
    const newLog = [...state.messageLog, `[${state.turnCount}] 🔍 ${searcherName} cerca nella Safe Room...`];

    // Roll items from location's item pool (100% chance — safe rooms always have something)
    const itemPool = location.itemPool || [];
    const partyItemIds = new Set(state.party.flatMap(p => p.inventory.map(i => i.itemId)));
    const foundItems: string[] = [];

    for (const entry of itemPool) {
      // Skip key items already owned by the party
      if (getKeyItemIds().has(entry.itemId) && partyItemIds.has(entry.itemId)) continue;
      // Safe room search: 100% chance (guaranteed loot)
      if (Math.random() * 100 < (entry.chance || 100)) {
        foundItems.push(entry.itemId);
      }
    }

    // Mark safe room as searched
    const newSearchedSafeRooms = [...state.searchedSafeRooms, locId];

    if (foundItems.length === 0) {
      const msg = `${searcherName} perquisisce ogni angolo della stanza, ma non trova nulla di utile.`;
      set({
        messageLog: [...newLog, `[${state.turnCount}] ${msg}`],
        searchedSafeRooms: newSearchedSafeRooms,
      });
      return;
    }

    // Add found items to the selected character's inventory
    const targetCharId = state.selectedCharacterId || state.party[0]?.id;
    let updatedParty = [...state.party];
    const foundNames: string[] = [];
    const foundNotifItems: { name: string; icon?: string }[] = [];

    for (const itemId of foundItems) {
      const itemDef = ITEMS[itemId];
      if (!itemDef) continue;

      const poolEntry = itemPool.find(e => e.itemId === itemId);
      const qty = poolEntry?.quantity || 1;
      const newUid = `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newItem: ItemInstance = {
        uid: newUid,
        itemId: itemDef.id,
        name: itemDef.name,
        description: itemDef.description,
        type: itemDef.type,
        rarity: itemDef.rarity,
        icon: itemDef.icon,
        usable: itemDef.usable,
        equippable: itemDef.equippable,
        quantity: qty,
        effects: itemDef.effects,
        isEquipped: false,
      };

      // Add to target character
      const charIdx = updatedParty.findIndex(p => p.id === targetCharId);
      if (charIdx >= 0) {
        const char = updatedParty[charIdx];
        const existingIdx = char.inventory.findIndex(i => i.itemId === itemId && i.type !== 'weapon' && i.type !== 'armor' && i.type !== 'accessory' && i.type !== 'weapon_mod');
        if (existingIdx >= 0 && itemDef.stackable) {
          updatedParty[charIdx] = {
            ...char,
            inventory: char.inventory.map((inv, i) =>
              i === existingIdx ? { ...inv, quantity: inv.quantity + qty } : inv
            ),
          };
        } else {
          updatedParty[charIdx] = {
            ...char,
            inventory: [...char.inventory, newItem],
          };
        }
      }

      foundNames.push(`${itemDef.icon || ''} ${itemDef.name}${qty > 1 ? ` x${qty}` : ''}`);
      foundNotifItems.push({ name: itemDef.name, icon: itemDef.icon });
    }

    const summaryMsg = foundNames.length > 1
      ? `${searcherName} trova: ${foundNames.join(', ')}`
      : `${searcherName} trova: ${foundNames[0]}`;

    set({
      messageLog: [...newLog, `[${state.turnCount}] 🎁 ${summaryMsg}`],
      party: updatedParty,
      searchedSafeRooms: newSearchedSafeRooms,
      notification: {
        id: `notif_sr_${Date.now()}`,
        type: 'item_found',
        message: foundNames.join(', '),
        icon: foundNotifItems[0]?.icon || '🎁',
        subMessage: `Safe Room: ${location.name}`,
      },
    });

    setTimeout(() => get().checkAchievements(), 100);
  },

  depositToItemBox: (charId: string, itemUid: string, quantity: number): boolean => {
    const state = get();
    const char = state.party.find(p => p.id === charId);
    if (!char) return false;

    const itemIdx = char.inventory.findIndex(i => i.uid === itemUid);
    if (itemIdx < 0) return false;

    const item = char.inventory[itemIdx];
    const depositQty = Math.min(quantity, item.quantity);

    if (depositQty <= 0) return false;

    const updatedInventory = [...char.inventory];
    if (depositQty >= item.quantity) {
      updatedInventory.splice(itemIdx, 1);
    } else {
      updatedInventory[itemIdx] = { ...item, quantity: item.quantity - depositQty };
    }

    // Check if same itemId already exists in item box (stack)
    const existingBoxIdx = state.itemBoxItems.findIndex(ib => ib.itemId === item.itemId);
    let updatedBox: ItemInstance[];
    if (existingBoxIdx >= 0) {
      updatedBox = [...state.itemBoxItems];
      updatedBox[existingBoxIdx] = { ...updatedBox[existingBoxIdx], quantity: updatedBox[existingBoxIdx].quantity + depositQty };
    } else {
      updatedBox = [...state.itemBoxItems, { ...item, quantity: depositQty }];
    }

    set({
      party: state.party.map(p => p.id === charId ? { ...p, inventory: updatedInventory } : p),
      itemBoxItems: updatedBox,
      messageLog: [...state.messageLog, `[${state.turnCount}] 📦 ${char.name} ha depositato ${item.icon} ${item.name} x${depositQty} nell'Item Box.`],
    });
    return true;
  },

  withdrawFromItemBox: (charId: string, itemBoxIndex: number, quantity: number): boolean => {
    const state = get();
    const char = state.party.find(p => p.id === charId);
    if (!char) return false;

    const boxItem = state.itemBoxItems[itemBoxIndex];
    if (!boxItem) return false;

    const withdrawQty = Math.min(quantity, boxItem.quantity);
    if (withdrawQty <= 0) return false;

    if (char.inventory.length >= char.maxInventorySlots) return false;

    const updatedBox = [...state.itemBoxItems];
    if (withdrawQty >= boxItem.quantity) {
      updatedBox.splice(itemBoxIndex, 1);
    } else {
      updatedBox[itemBoxIndex] = { ...boxItem, quantity: boxItem.quantity - withdrawQty };
    }

    // Check if same itemId already exists in char inventory (stack)
    const existingInvIdx = char.inventory.findIndex(i => i.itemId === boxItem.itemId);
    let updatedInventory: ItemInstance[];
    if (existingInvIdx >= 0) {
      updatedInventory = [...char.inventory];
      updatedInventory[existingInvIdx] = { ...updatedInventory[existingInvIdx], quantity: updatedInventory[existingInvIdx].quantity + withdrawQty };
    } else {
      updatedInventory = [...char.inventory, { ...boxItem, quantity: withdrawQty }];
    }

    set({
      party: state.party.map(p => p.id === charId ? { ...p, inventory: updatedInventory } : p),
      itemBoxItems: updatedBox,
      messageLog: [...state.messageLog, `[${state.turnCount}] 📦 ${char.name} ha prelevato ${boxItem.icon} ${boxItem.name} x${withdrawQty} dall'Item Box.`],
    });
    return true;
  },

  craftItem: (recipeIndex: number): boolean => {
    const state = get();
    const char = state.party.find(p => p.id === state.selectedCharacterId) || state.party.find(p => p.currentHp > 0);
    if (!char) return false;

    // Crafting recipes from DB
    const recipes = RECIPES_DATA;
    if (recipeIndex < 0 || recipeIndex >= recipes.length) return false;
    const recipe = recipes[recipeIndex];

    // Count available ingredients across all party members
    const ingredientCounts: Record<string, number> = {};
    for (const ing of recipe.ingredients) {
      ingredientCounts[ing.itemId] = 0;
    }
    // Also check item box
    for (const ing of recipe.ingredients) {
      const boxItem = state.itemBoxItems.find(ib => ib.itemId === ing.itemId);
      if (boxItem) ingredientCounts[ing.itemId] += boxItem.quantity;
      for (const p of state.party) {
        const invItem = p.inventory.find(i => i.itemId === ing.itemId);
        if (invItem) ingredientCounts[ing.itemId] += invItem.quantity;
      }
    }

    // Check if all ingredients are available
    for (const ing of recipe.ingredients) {
      if ((ingredientCounts[ing.itemId] || 0) < ing.quantity) return false;
    }

    // Remove ingredients (prefer item box first, then inventory)
    let updatedBox = [...state.itemBoxItems];
    let updatedParty = state.party.map(p => ({ ...p, inventory: [...p.inventory] }));

    for (const ing of recipe.ingredients) {
      let remaining = ing.quantity;

      // Take from item box first
      const boxIdx = updatedBox.findIndex(ib => ib.itemId === ing.itemId);
      if (boxIdx >= 0) {
        const takeFromBox = Math.min(remaining, updatedBox[boxIdx].quantity);
        if (takeFromBox >= updatedBox[boxIdx].quantity) {
          updatedBox.splice(boxIdx, 1);
        } else {
          updatedBox[boxIdx] = { ...updatedBox[boxIdx], quantity: updatedBox[boxIdx].quantity - takeFromBox };
        }
        remaining -= takeFromBox;
      }

      // Take from party inventories
      if (remaining > 0) {
        for (const p of updatedParty) {
          if (remaining <= 0) break;
          const invIdx = p.inventory.findIndex(i => i.itemId === ing.itemId);
          if (invIdx >= 0) {
            const takeFromInv = Math.min(remaining, p.inventory[invIdx].quantity);
            if (takeFromInv >= p.inventory[invIdx].quantity) {
              p.inventory.splice(invIdx, 1);
            } else {
              p.inventory[invIdx] = { ...p.inventory[invIdx], quantity: p.inventory[invIdx].quantity - takeFromInv };
            }
            remaining -= takeFromInv;
          }
        }
      }
    }

    // Add result to selected character
    const resultDef = ITEMS[recipe.result.itemId];
    if (!resultDef) return false;

    const resultItem: ItemInstance = {
      uid: `craft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: recipe.result.itemId,
      name: resultDef.name,
      description: resultDef.description,
      type: resultDef.type,
      rarity: resultDef.rarity,
      icon: resultDef.icon,
      usable: resultDef.usable,
      equippable: resultDef.equippable,
      effects: resultDef.effects,
      quantity: recipe.result.quantity,
    };

    // Stack if possible
    let charInventory = updatedParty.find(p => p.id === char.id)!.inventory;
    const existingResultIdx = charInventory.findIndex(i => i.itemId === recipe.result.itemId);
    if (existingResultIdx >= 0) {
      charInventory = [...charInventory];
      charInventory[existingResultIdx] = { ...charInventory[existingResultIdx], quantity: charInventory[existingResultIdx].quantity + recipe.result.quantity };
    } else {
      charInventory = [...charInventory, resultItem];
    }

    updatedParty = updatedParty.map(p => p.id === char.id ? { ...p, inventory: charInventory } : p);

    set({
      party: updatedParty,
      itemBoxItems: updatedBox,
      messageLog: [...state.messageLog, `[${state.turnCount}] 🔨 ${char.name} ha creato ${resultItem.icon} ${resultItem.name} x${recipe.result.quantity}!`],
    });
    return true;
  },
});
