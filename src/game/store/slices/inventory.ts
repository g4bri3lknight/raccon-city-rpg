import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ItemInstance, WeaponInstance, Character, SpecialEffect } from '../../types';
import { ITEMS, RECIPES_DATA } from '../../data/loader';
import { WEAPON_MODS } from '../../data/weapon-mods';
import { createModItemInstance } from '../../data/equipment';
import { getMaxInventorySlots } from '../settings-cache';
import { mergeInventoryStacks, applyAddSlotsToCharacter } from '../helpers';
import { getAddSlotsAmount } from '../../utils/item-effects';

export const createInventorySlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  equipItem: (characterId: string, itemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || !item.equippable) return p;

        let weaponData: WeaponInstance | null = item.weaponStats || null;
        if (!weaponData) {
          const itemDef = ITEMS[item.itemId];
          if (itemDef) {
            weaponData = {
              itemId: item.itemId,
              name: item.name,
              type: itemDef.weaponType || 'melee',
              ammoType: itemDef.ammoType,
              modSlots: [],
              effects: item.effects,
            };
          }
        }
        if (!weaponData) return p;

        // Only unequip other weapons — preserve armor/accessory equipped state
        let newInventory = p.inventory.map(i =>
          i.weaponStats ? { ...i, isEquipped: false } : i
        );
        newInventory = newInventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: true, weaponStats: weaponData } : i
        );

        return {
          ...p,
          weapon: weaponData,
          inventory: newInventory,
        };
      });
      return { party };
    });
  },

  unequipItem: (characterId: string, itemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || !item.isEquipped) return p;

        const newInventory = p.inventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: false } : i
        );

        return {
          ...p,
          weapon: null,
          inventory: newInventory,
        };
      });
      return { party };
    });
  },

  equipArmor: (characterId: string, itemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || item.type !== 'armor' || !item.equipmentStats) return p;

        // Only unequip other armor items — preserve weapon/accessory equipped state
        let newInventory = p.inventory.map(i =>
          i.type === 'armor' ? { ...i, isEquipped: false } : i
        );

        newInventory = newInventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: true } : i
        );

        return {
          ...p,
          armor: item.equipmentStats,
          inventory: newInventory,
        };
      });
      return { party };
    });
  },

  unequipArmor: (characterId: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        if (!p.armor) return p;

        const newInventory = p.inventory.map(i =>
          i.equipmentStats?.slot === 'armor' ? { ...i, isEquipped: false } : i
        );

        return { ...p, armor: null, inventory: newInventory };
      });
      return { party };
    });
  },

  equipAccessory: (characterId: string, itemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || item.type !== 'accessory' || !item.equipmentStats) return p;

        // Only unequip other accessory items — preserve weapon/armor equipped state
        let newInventory = p.inventory.map(i =>
          i.type === 'accessory' ? { ...i, isEquipped: false } : i
        );

        newInventory = newInventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: true } : i
        );

        return {
          ...p,
          accessory: item.equipmentStats,
          inventory: newInventory,
        };
      });
      return { party };
    });
  },

  unequipAccessory: (characterId: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        if (!p.accessory) return p;

        const newInventory = p.inventory.map(i =>
          i.equipmentStats?.slot === 'accessory' ? { ...i, isEquipped: false } : i
        );

        return { ...p, accessory: null, inventory: newInventory };
      });
      return { party };
    });
  },

  installMod: (characterId: string, modItemUid: string) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        if (!p.weapon) return p;

        const modItem = p.inventory.find(i => i.uid === modItemUid);
        if (!modItem || !modItem.modStats) return p;

        const mod = modItem.modStats;
        if (mod.type !== 'any' && mod.type !== p.weapon.type) return p;
        if (p.weapon.modSlots.length >= 2) return p;
        if (p.weapon.modSlots.includes(mod.modId)) return p;

        const updatedWeapon = {
          ...p.weapon,
          modSlots: [...p.weapon.modSlots, mod.modId],
        };

        const newInventory = p.inventory.filter(i => i.uid !== modItemUid);

        return { ...p, weapon: updatedWeapon, inventory: newInventory };
      });
      return { party };
    });
  },

  removeMod: (characterId: string, modIndex: number) => {
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        if (!p.weapon) return p;
        if (modIndex < 0 || modIndex >= p.weapon.modSlots.length) return p;

        const modId = p.weapon.modSlots[modIndex];
        const mod = WEAPON_MODS[modId];
        if (!mod) return p;

        const updatedModSlots = p.weapon.modSlots.filter((_, i) => i !== modIndex);
        const updatedWeapon = {
          ...p.weapon,
          modSlots: updatedModSlots,
        };

        const modItem = createModItemInstance(modId);

        if (p.inventory.length >= p.maxInventorySlots) return p;

        return { ...p, weapon: updatedWeapon, inventory: [...p.inventory, modItem] };
      });
      return { party };
    });
  },

  consumeItemOutsideCombat: (characterId: string, itemUid: string) => {
    let logMsg = `[Turno ${get().turnCount}] 🎒 Oggetto usato.`;

    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const item = p.inventory.find(i => i.uid === itemUid);
        if (!item || !item.usable) return p;

        let updatedCharacter = { ...p };
        let shouldConsume = false;
        const logParts: string[] = [];
        const turnPrefix = `[Turno ${state.turnCount}]`;

        if (item.effects && item.effects.length > 0) {
          shouldConsume = true;
          let totalHeal = 0;
          let anyStatusCured = false;
          const curedNames: string[] = [];

          for (const effect of item.effects) {
            if (effect.trigger && effect.trigger !== 'on_use') continue;

            switch (effect.type) {
              case 'heal': {
                let healAmount: number;
                if (effect.percent) {
                  healAmount = Math.floor(updatedCharacter.maxHp * (effect.percent / 100));
                } else {
                  healAmount = effect.amount || 0;
                }
                const actualHeal = Math.min(updatedCharacter.maxHp, updatedCharacter.currentHp + healAmount) - updatedCharacter.currentHp;
                updatedCharacter.currentHp = Math.min(updatedCharacter.maxHp, updatedCharacter.currentHp + healAmount);
                totalHeal += actualHeal;
                break;
              }
              case 'remove_status': {
                const statusesToRemove = effect.statuses || [];
                const actuallyCured = statusesToRemove.filter(s => updatedCharacter.statusEffects.includes(s));
                if (actuallyCured.length > 0) {
                  updatedCharacter.statusEffects = updatedCharacter.statusEffects.filter(s => !statusesToRemove.includes(s));
                  anyStatusCured = true;
                  curedNames.push(...actuallyCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s));
                }
                break;
              }
              case 'add_slots': {
                const slotsToAdd = effect.amount;
                const maxSlots = getMaxInventorySlots();
                const currentSlots = updatedCharacter.maxInventorySlots;
                if (currentSlots >= maxSlots) {
                  logParts.push(`Inventario già al massimo (${maxSlots} slot)`);
                  // Don't prevent consumption — other effects (heal, status cure) still applied
                } else {
                  const newSlots = Math.min(maxSlots, currentSlots + slotsToAdd);
                  updatedCharacter.maxInventorySlots = newSlots;
                  logParts.push(`+${newSlots - currentSlots} slot (totale: ${newSlots}/${maxSlots})`);
                }
                break;
              }
            }
          }

          if (logParts.length > 0) {
            const effectSummary = logParts.join(' ');
            logMsg = `${turnPrefix} 🎒 ${p.name} usa ${item.name}. ${effectSummary}`;
          } else {
            logMsg = `${turnPrefix} 🎒 ${p.name} usa ${item.name} — nessun effetto.`;
          }
        } else {
          logMsg = `${turnPrefix} 🎒 ${p.name} usa ${item.name} — nessun effetto.`;
        }

        if (!shouldConsume) return p;
        const newInventory = mergeInventoryStacks(
          p.inventory
            .map(i => {
              if (i.uid !== itemUid) return { ...i };
              const newQty = i.quantity - 1;
              if (newQty <= 0) return null;
              return { ...i, quantity: newQty };
            })
            .filter((i): i is NonNullable<typeof i> => i !== null)
        );

        return { ...updatedCharacter, inventory: newInventory };
      });

      return {
        party,
        messageLog: [...state.messageLog, logMsg],
      };
    });
  },

  combineItems: (characterId: string, recipeId: string) => {
    const recipe = RECIPES_DATA.find(r => r.id === recipeId);
    if (!recipe) return false;

    let combined = false;
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;

        // Check that the character has all required ingredients with sufficient quantity
        const remaining = [...recipe.ingredients];
        const uidsToRemove: string[] = [];

        for (const ing of remaining) {
          let qtyNeeded = ing.quantity;
          for (const invItem of p.inventory) {
            if (invItem.itemId === ing.itemId && qtyNeeded > 0) {
              const take = Math.min(qtyNeeded, invItem.quantity);
              uidsToRemove.push(invItem.uid);
              qtyNeeded -= take;
            }
          }
          if (qtyNeeded > 0) return p; // missing ingredients
        }

        // Create the result item from the ITEMS registry
        const resultDef = ITEMS[recipe.result.itemId];
        if (!resultDef) return p;

        const resultItem: ItemInstance = {
          uid: `${recipe.result.itemId}_${Date.now()}_${Math.random()}`,
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

        combined = true;
        return {
          ...p,
          inventory: [
            ...p.inventory.filter(i => !uidsToRemove.includes(i.uid)),
            resultItem,
          ],
        };
      });

      const logMsg = combined
        ? `[Turno ${state.turnCount}] 🧪 Craftato: ${recipe.name}!`
        : '';

      return {
        party,
        messageLog: combined ? [...state.messageLog, logMsg] : state.messageLog,
        craftingCombineCount: combined ? state.craftingCombineCount + 1 : state.craftingCombineCount,
      };
    });
    if (combined) {
      get().checkAchievements();
    }
    return combined;
  },

  transferItem: (fromCharacterId: string, itemUid: string, toCharacterId: string, quantity?: number) => {
    if (fromCharacterId === toCharacterId) return false;

    let transferred = false;
    let logMsg = '';

    set(state => {
      const fromChar = state.party.find(p => p.id === fromCharacterId);
      const toChar = state.party.find(p => p.id === toCharacterId);
      if (!fromChar || !toChar) return state;

      const item = fromChar.inventory.find(i => i.uid === itemUid);
      if (!item) return state;

      // Determine transfer quantity (default: entire stack)
      const isStackable = item.type === 'ammo' || item.type === 'healing' || item.type === 'antidote';
      const transferQty = (isStackable && quantity !== undefined && quantity > 0)
        ? Math.min(quantity, item.quantity)
        : item.quantity;
      if (transferQty <= 0) return state;

      let updatedFromChar = { ...fromChar };
      let updatedToChar = { ...toChar };
      let updatedParty = state.party;

      if (item.isEquipped && transferQty === item.quantity) {
        if (item.weaponStats) {
          updatedFromChar = { ...updatedFromChar, weapon: null };
        } else if (item.type === 'armor') {
          updatedFromChar = { ...updatedFromChar, armor: null };
        } else if (item.type === 'accessory') {
          updatedFromChar = { ...updatedFromChar, accessory: null };
        }
      }

      // Remove from source (reduce quantity or remove entirely)
      if (transferQty >= item.quantity) {
        updatedFromChar = {
          ...updatedFromChar,
          inventory: updatedFromChar.inventory.map(i =>
            i.uid === itemUid ? { ...i, isEquipped: false } : i
          ).filter(i => i.uid !== itemUid),
        };
      } else {
        updatedFromChar = {
          ...updatedFromChar,
          inventory: updatedFromChar.inventory.map(i =>
            i.uid === itemUid ? { ...i, quantity: i.quantity - transferQty } : i
          ),
        };
      }

      // Add to target
      const existingTargetIdx = updatedToChar.inventory.findIndex(i => i.itemId === item.itemId);
      if (isStackable && existingTargetIdx >= 0) {
        const updatedInv = [...updatedToChar.inventory];
        updatedInv[existingTargetIdx] = { ...updatedInv[existingTargetIdx], quantity: updatedInv[existingTargetIdx].quantity + transferQty };
        updatedToChar = { ...updatedToChar, inventory: updatedInv };
      } else if (updatedToChar.inventory.length < updatedToChar.maxInventorySlots || item.type === 'bag') {
        updatedToChar = {
          ...updatedToChar,
          inventory: [...updatedToChar.inventory, { ...item, isEquipped: false, quantity: transferQty }],
        };
      } else {
        logMsg = `[Turno ${state.turnCount}] 🚫 Inventario di ${toChar.name} pieno!`;
        return {
          party: state.party.map(p => {
            if (p.id === fromCharacterId) return updatedFromChar;
            return p;
          }),
          messageLog: [...state.messageLog, logMsg],
        };
      }

      updatedParty = state.party.map(p => {
        if (p.id === fromCharacterId) return updatedFromChar;
        if (p.id === toCharacterId) return updatedToChar;
        return p;
      });

      transferred = true;
      const qtyLabel = transferQty < item.quantity ? ` x${transferQty}` : '';
      logMsg = `[Turno ${state.turnCount}] 🔄 ${fromChar.name} passa ${item.name}${qtyLabel} a ${toChar.name}.`;

      const transferBagAmt = getAddSlotsAmount(item.effects);
      if (item.type === 'bag' && transferBagAmt !== null) {
        const maxSlots = getMaxInventorySlots();
        const isFull = updatedToChar.inventory.length >= updatedToChar.maxInventorySlots;
        if (isFull && updatedToChar.maxInventorySlots < maxSlots) {
          const { updatedChar, expanded, oldSlots, newSlots } = applyAddSlotsToCharacter(updatedToChar, transferBagAmt);
          updatedToChar = { ...updatedChar, maxInventorySlots: newSlots, inventory: updatedToChar.inventory.filter(i => i.uid !== itemUid) };
          logMsg += ` 🧳 ${toChar.name} usa ${item.name}! Inventario: ${oldSlots} → ${newSlots} slot.`;
          updatedParty = state.party.map(p => {
            if (p.id === fromCharacterId) return updatedFromChar;
            if (p.id === toCharacterId) return updatedToChar;
            return p;
          });
        }
      }

      return {
        party: updatedParty,
        messageLog: [...state.messageLog, logMsg],
      };
    });

    return transferred;
  },

  swapInventoryItems: (characterId: string, uid1: string, uid2: string) => {
    if (uid1 === uid2) return;
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const inv = p.inventory;
        const idx1 = inv.findIndex(i => i.uid === uid1);
        const idx2 = inv.findIndex(i => i.uid === uid2);
        if (idx1 === -1 || idx2 === -1) return p;
        const updated = [...inv];
        const temp = updated[idx1];
        updated[idx1] = updated[idx2];
        updated[idx2] = temp;
        return { ...p, inventory: updated };
      });
      return { party };
    });
  },

  quickHeal: () => {
    const state = get();
    const char = state.party.find(p => p.id === state.selectedCharacterId);
    if (!char || char.currentHp <= 0 || char.currentHp >= char.maxHp) return;

    // Find usable healing items with on_use trigger
    const healingItems = char.inventory.filter(item => {
      if (!item.usable) return false;
      return (item.effects || []).some(e =>
        e.type === 'heal' && (!e.trigger || e.trigger === 'on_use')
      );
    });

    if (healingItems.length === 0) return;

    // Estimate heal amount for each item and sort descending
    const missingHp = char.maxHp - char.currentHp;
    const sorted = healingItems.map(item => {
      const healEffect = (item.effects || []).find(e =>
        e.type === 'heal' && (!e.trigger || e.trigger === 'on_use')
      );
      let estimated = 0;
      if (healEffect && healEffect.type === 'heal') {
        if (healEffect.percent) {
          estimated = Math.floor(char.maxHp * (healEffect.percent / 100));
        } else {
          estimated = healEffect.amount || 0;
        }
        estimated = Math.min(estimated, missingHp);
      }
      return { item, estimated };
    }).sort((a, b) => b.estimated - a.estimated);

    const best = sorted[0];
    if (!best || best.estimated <= 0) return;

    get().consumeItemOutsideCombat(char.id, best.item.uid);
  },
});
