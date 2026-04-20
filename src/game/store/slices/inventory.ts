import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { ItemInstance, WeaponInstance, Character } from '../../types';
import { ITEMS } from '../../data/loader';
import { WEAPON_MODS } from '../../data/weapon-mods';
import { createModItemInstance } from '../../data/equipment';
import { getMaxInventorySlots } from '../settings-cache';
import { mergeInventoryStacks, applyAddSlotsToCharacter } from '../helpers';
import { getAddSlotsAmount } from '../../utils/item-effects';
import { playMenuOpen, playMenuClose } from '../../engine/sounds';

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
                  shouldConsume = false;
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

  combineHerbs: (characterId: string, redHerbUid: string) => {
    let combined = false;
    set(state => {
      const party = state.party.map(p => {
        if (p.id !== characterId) return p;
        const redHerb = p.inventory.find(i => i.uid === redHerbUid && i.itemId === 'herb_red');
        if (!redHerb) return p;

        const greenIdx = p.inventory.findIndex(i => i.itemId === 'herb_green');
        if (greenIdx === -1) return p;

        const mixedDef = ITEMS['herb_mixed'];
        if (!mixedDef) return p;

        const mixedHerb: ItemInstance = {
          uid: `herb_mixed_${Date.now()}_${Math.random()}`,
          itemId: 'herb_mixed',
          name: mixedDef.name,
          description: mixedDef.description,
          type: mixedDef.type,
          rarity: mixedDef.rarity,
          icon: mixedDef.icon,
          usable: mixedDef.usable,
          equippable: mixedDef.equippable,
          effects: mixedDef.effects,
          quantity: 1,
        };

        combined = true;
        return {
          ...p,
          inventory: [
            ...p.inventory.filter((_, idx) => idx !== greenIdx && p.inventory[idx].uid !== redHerbUid),
            mixedHerb,
          ],
        };
      });

      const logMsg = combined
        ? `[Turno ${state.turnCount}] 🌱 Erbe miscelate! Erba Verde + Erba Rossa = Erba Mista (cura 70 HP + rimuove status).`
        : '';

      return {
        party,
        messageLog: combined ? [...state.messageLog, logMsg] : state.messageLog,
      };
    });
    return combined;
  },

  transferItem: (fromCharacterId: string, itemUid: string, toCharacterId: string) => {
    if (fromCharacterId === toCharacterId) return false;

    let transferred = false;
    let logMsg = '';

    set(state => {
      const fromChar = state.party.find(p => p.id === fromCharacterId);
      const toChar = state.party.find(p => p.id === toCharacterId);
      if (!fromChar || !toChar) return state;

      const item = fromChar.inventory.find(i => i.uid === itemUid);
      if (!item) return state;

      let updatedFromChar = { ...fromChar };
      let updatedToChar = { ...toChar };
      let updatedParty = state.party;

      if (item.isEquipped) {
        if (item.weaponStats) {
          updatedFromChar = { ...updatedFromChar, weapon: null };
        } else if (item.type === 'armor') {
          updatedFromChar = { ...updatedFromChar, armor: null };
        } else if (item.type === 'accessory') {
          updatedFromChar = { ...updatedFromChar, accessory: null };
        }
      }

      updatedFromChar = {
        ...updatedFromChar,
        inventory: updatedFromChar.inventory.map(i =>
          i.uid === itemUid ? { ...i, isEquipped: false } : i
        ).filter(i => i.uid !== itemUid),
      };

      const isStackable = item.type === 'ammo' || item.type === 'healing' || item.type === 'antidote';
      const existingTargetIdx = updatedToChar.inventory.findIndex(i => i.itemId === item.itemId);
      if (isStackable && existingTargetIdx >= 0) {
        const updatedInv = [...updatedToChar.inventory];
        updatedInv[existingTargetIdx] = { ...updatedInv[existingTargetIdx], quantity: updatedInv[existingTargetIdx].quantity + item.quantity };
        updatedToChar = { ...updatedToChar, inventory: updatedInv };
      } else if (updatedToChar.inventory.length < updatedToChar.maxInventorySlots || item.type === 'bag') {
        updatedToChar = {
          ...updatedToChar,
          inventory: [...updatedToChar.inventory, { ...item, isEquipped: false }],
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
      logMsg = `[Turno ${state.turnCount}] 🔄 ${fromChar.name} passa ${item.name} a ${toChar.name}.`;

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
});
