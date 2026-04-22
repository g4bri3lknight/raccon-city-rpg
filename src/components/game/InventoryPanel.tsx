'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getMaxInventorySlots } from '@/game/store';
import { ItemInstance, Character } from '@/game/types';
import { getItemEffectDescriptions } from '@/game/utils/item-effects';
import { getEquipStatBonus, getEffectSpecialLabel, getStatusChanceBoost } from '@/game/utils/effect-helpers';
import ItemIcon from './ItemIcon';
import { CombatHpPanel } from './HpBar';
import { CHARACTER_IMAGES, ITEMS, RECIPES_DATA, mediaUrl } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Shield, FlaskConical, Blend, ArrowRightLeft, Backpack, ArrowDownAZ, Layers, Star, Hammer, Lock, BookOpen } from 'lucide-react';
import { getCharacterAtk, getCharacterDef, getCharacterSpd, getCharacterMaxHp } from '@/game/engine/combat';
import { getArchetypeEmoji } from '@/game/utils/archetype-helpers';
import { RARITY_LABEL, TYPE_LABELS } from '@/game/utils/rarity-helpers';

export default function InventoryPanel() {
  const dataVersion = useGameStore(s => s.dataVersion);
  const party = useGameStore(s => s.party);
  const inventoryOpen = useGameStore(s => s.inventoryOpen);
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId);
  const toggleInventory = useGameStore(s => s.toggleInventory);
  const equipItem = useGameStore(s => s.equipItem);
  const unequipItem = useGameStore(s => s.unequipItem);
  const equipArmor = useGameStore(s => s.equipArmor);
  const unequipArmor = useGameStore(s => s.unequipArmor);
  const equipAccessory = useGameStore(s => s.equipAccessory);
  const unequipAccessory = useGameStore(s => s.unequipAccessory);
  const consumeItemOutsideCombat = useGameStore(s => s.consumeItemOutsideCombat);
  const combineHerbs = useGameStore(s => s.combineHerbs);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const transferItem = useGameStore(s => s.transferItem);
  const [selectedItem, setSelectedItem] = useState<ItemInstance | null>(null);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [transferQty, setTransferQty] = useState(1);
  const [sortMode, setSortMode] = useState<'name' | 'type' | 'rarity'>('name');
  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes'>('inventory');
  const craftItem = useGameStore(s => s.craftItem);
  const combat = useGameStore(s => s.combat);
  const inCombat = !!combat;
  const discoveredRecipes = useGameStore(s => s.discoveredRecipes);

  if (!inventoryOpen) return null;

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];
  if (!selectedChar) return null;

  const rarityDotColor: Record<string, string> = {
    common: 'bg-gray-400',
    uncommon: 'bg-cyan-400',
    rare: 'bg-purple-400',
    legendary: 'bg-amber-400',
  };

  const rarityBadge: Record<string, string> = {
    common: 'bg-white/10 text-white/70 border-0',
    uncommon: 'bg-white/10 text-cyan-300/80 border-0',
    rare: 'bg-white/10 text-purple-300/80 border-0',
    legendary: 'bg-white/10 text-amber-300/80 border-0',
  };

  // rarityLabel and typeLabels now imported from shared rarity-helpers

  // Sort items based on current sort mode
  const rarityOrder: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  const typeOrder: Record<string, number> = { weapon: 0, armor: 1, accessory: 2, weapon_mod: 3, healing: 4, antidote: 5, ammo: 6, utility: 7, bag: 8, collectible: 9 };

  const sortedItems = [...(selectedChar?.inventory || [])].sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    if (sortMode === 'type') {
      const diff = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    }
    if (sortMode === 'rarity') {
      const diff = (rarityOrder[a.rarity] ?? 0) - (rarityOrder[b.rarity] ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Build icon grid (always show all slots)
  const totalSlots = selectedChar?.maxInventorySlots || 6;
  const items = sortedItems;
  const slots = Array.from({ length: totalSlots }, (_, i) => items[i] || null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) { toggleInventory(); setSelectedItem(null); } }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-lg md:max-w-3xl max-h-[90vh] md:max-h-[95vh] glass-dark rounded-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-2xl font-bold text-white">Inventario</h2>
            <Badge className="bg-white/10 text-white/60 border-0 text-xs md:text-sm">
              {items.length}/{totalSlots} (max 12)
            </Badge>
          </div>
          <Button variant="ghost" onClick={() => { toggleInventory(); setSelectedItem(null); }} className="text-white/60 hover:text-white hover:bg-white/[0.05]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Character Tabs */}
        <div className="flex border-b border-white/[0.06] bg-white/[0.03]">
          {party.map(char => (
            <button
              key={char.id}
              onClick={() => { selectCharacter(char.id); setSelectedItem(null); }}
              className={`flex-1 px-3 md:px-5 py-2.5 md:py-3.5 text-sm md:text-base transition-all border-b-2 ${
                char.id === selectedChar?.id
                  ? 'border-white/20 text-white bg-white/[0.08]'
                  : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
              }`}
            >
              <span className="mr-1.5">
                {getArchetypeEmoji(char.archetype)}
              </span>
              {char.name}
            </button>
          ))}
        </div>

        {/* Character Stats — full HP panel */}
        {selectedChar && (
          <div className="shrink-0 px-2 md:px-4 py-2 md:py-3 border-b border-white/[0.06] bg-white/[0.03]">
            <CombatHpPanel
              current={selectedChar.currentHp}
              max={selectedChar.maxHp}
              name={selectedChar.name}
              statusEffects={selectedChar.statusEffects}
              imageSrc={mediaUrl(selectedChar.avatarUrl || CHARACTER_IMAGES[selectedChar.archetype] || '', dataVersion)}
            />
            <div className="flex gap-2.5 md:gap-4 text-[10px] md:text-xs mt-1.5 md:mt-2">
              <span className="text-white/40">⚔️ ATK {getCharacterAtk(selectedChar)}</span>
              <span className="text-white/40">🛡️ DEF {getCharacterDef(selectedChar)}</span>
              <span className="text-white/40">💨 SPD {getCharacterSpd(selectedChar)}</span>
              <span className="text-white/30">HP {getCharacterMaxHp(selectedChar)}</span>
              <span className="text-white/30">Lv.{selectedChar.level} · {selectedChar.archetype.toUpperCase()}</span>
            </div>
            {/* Equipment summary */}
            <div className="flex gap-2 mt-1 text-[10px] text-white/30">
              {selectedChar.armor && <span>🦺 {selectedChar.armor.name}</span>}
              {selectedChar.accessory && <span>📿 {selectedChar.accessory.name}</span>}
              {selectedChar.weapon?.modSlots && selectedChar.weapon.modSlots.length > 0 && (
                <span>🔧 {selectedChar.weapon.modSlots.length}/2 mod</span>
              )}
            </div>
          </div>
        )}

        {/* Inventory / Recipes Tab Switcher */}
        <div className="shrink-0 flex border-b border-white/[0.06] bg-white/[0.02]">
          <button
            onClick={() => { setActiveTab('inventory'); setSelectedItem(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium transition-all border-b-2 ${
              activeTab === 'inventory'
                ? 'border-white/20 text-white bg-white/[0.06]'
                : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
          >
            <Backpack className="w-3.5 h-3.5" /> Inventario
          </button>
          <button
            onClick={() => { setActiveTab('recipes'); setSelectedItem(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium transition-all border-b-2 ${
              activeTab === 'recipes'
                ? 'border-amber-500/40 text-amber-300 bg-white/[0.06]'
                : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" /> Ricette
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <>
            {/* Sort Controls */}
            <div className="shrink-0 px-3 md:px-6 pt-3 md:pt-4 pb-1 flex items-center gap-1">
              <span className="text-[10px] md:text-xs text-white/30 mr-1">Ordina:</span>
              {([
                { key: 'name' as const, label: 'Nome', Icon: ArrowDownAZ },
                { key: 'type' as const, label: 'Tipo', Icon: Layers },
                { key: 'rarity' as const, label: 'Rarità', Icon: Star },
              ]).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setSortMode(key)}
                  title={label}
                  className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[10px] md:text-xs transition-all border ${
                    sortMode === key
                      ? 'bg-red-900/40 border-red-800/60 text-red-300 shadow-[0_0_8px_rgba(153,27,27,0.2)]'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Icon Grid */}
            <div className="flex-1 min-h-0 px-3 md:px-6 pb-3 md:pb-6">
              <div className="grid grid-cols-6 gap-2 md:gap-3">
                {slots.map((item, index) => {
                  const isSelected = item && selectedItem?.uid === item.uid;
                  let slotClass = 'aspect-square rounded-lg md:rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-200 relative ';
                  if (item) {
                    slotClass += 'bg-white/[0.04] cursor-pointer ';
                    if (isSelected) {
                      slotClass += 'border-red-800 bg-red-950/30 shadow-[0_0_12px_rgba(153,27,27,0.3)] scale-105';
                    } else {
                      slotClass += 'border-white/[0.08] hover:border-red-800 hover:bg-white/[0.06] hover:shadow-[0_0_8px_rgba(153,27,27,0.15)] hover:scale-105';
                    }
                    if (item.isEquipped) {
                      slotClass += ' ring-1 ring-amber-500/40';
                    }
                  } else {
                    slotClass += 'border-white/[0.04] bg-white/[0.02] cursor-default';
                  }
                  return (
                    <motion.button
                      key={item?.uid || `empty_${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedItem(item ? (isSelected ? null : item) : null)}
                      className={slotClass}
                    >
                      {item ? (
                        <span className="relative w-full h-full flex items-center justify-center p-1.5 md:p-2">
                          <ItemIcon itemId={item.itemId} rarity={item.rarity} className="!w-full !h-full" />
                          {item.quantity > 1 && (
                            <span className="absolute -top-2 -right-2 md:-top-2.5 md:-right-2.5 text-xs md:text-sm bg-black/70 text-white/90 rounded-full w-5 h-5 md:w-7 md:h-7 flex items-center justify-center font-bold border border-white/[0.15] shadow-lg">
                              {item.quantity}
                            </span>
                          )}
                          <span className={`absolute bottom-1 right-1 md:bottom-1.5 md:right-1.5 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${rarityDotColor[item.rarity] || 'bg-gray-400'} opacity-80 shadow-sm`} />
                        </span>
                      ) : (
                        <span className="text-white/10 text-lg md:text-2xl">+</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <InventoryRecipesTab
            party={party}
            selectedChar={selectedChar}
            craftItem={craftItem}
            inCombat={inCombat}
            discoveredRecipes={discoveredRecipes}
          />
        )}

        {/* Detail Panel - always visible, no animation */}
        <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.03]">
          {selectedItem ? (
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 p-1.5 md:p-2">
                  <ItemIcon itemId={selectedItem.itemId} rarity={selectedItem.rarity} className="!w-full !h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-white text-sm md:text-lg truncate">{selectedItem.name}</span>
                    {selectedItem.quantity > 1 && (
                      <Badge className={`${rarityBadge[selectedItem.rarity]} border-0 text-[10px] md:text-xs`}>x{selectedItem.quantity}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1.5 md:gap-2">
                    <Badge className={`${rarityBadge[selectedItem.rarity]} border-0 text-[10px] md:text-xs`}>
                      {TYPE_LABELS[selectedItem.type] || selectedItem.type}
                    </Badge>
                    <Badge className={`${rarityBadge[selectedItem.rarity]} border-0 text-[10px] md:text-xs`}>
                      {RARITY_LABEL[selectedItem.rarity] || selectedItem.rarity}
                    </Badge>
                    {selectedItem.isEquipped && (
                      <Badge className="bg-amber-900/50 text-amber-300 border-0 text-[10px] md:text-xs">Equipaggiato</Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs md:text-sm text-white/60 mb-3 md:mb-4 leading-relaxed">{selectedItem.description}</p>

              {/* Item stats */}
              {selectedItem.weaponStats && (
                <div className="flex gap-3 md:gap-4 mb-3 md:mb-4 text-xs md:text-sm">
                  <span className="text-amber-400/80">⚔️ ATK +{getEquipStatBonus(selectedItem.weaponStats.effects, 'atk')}</span>
                  <span className="text-white/40">{selectedItem.weaponStats.type === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}</span>
                  {selectedItem.weaponStats.modSlots && selectedItem.weaponStats.modSlots.length > 0 && (
                    <span className="text-cyan-400/60">🔧 {selectedItem.weaponStats.modSlots.length}/2 mod</span>
                  )}
                </div>
              )}
              {/* #29 Equipment stats */}
              {selectedItem.equipmentStats && (
                <div className="flex flex-wrap gap-2 md:gap-3 mb-3 md:mb-4 text-xs md:text-sm">
                  {getEquipStatBonus(selectedItem.equipmentStats.effects, 'def') && <span className="text-blue-400/80">🛡️ +{getEquipStatBonus(selectedItem.equipmentStats.effects, 'def')} DEF</span>}
                  {getEquipStatBonus(selectedItem.equipmentStats.effects, 'hp') && <span className="text-green-400/80">❤️ +{getEquipStatBonus(selectedItem.equipmentStats.effects, 'hp')} HP</span>}
                  {getEquipStatBonus(selectedItem.equipmentStats.effects, 'spd') && <span className="text-yellow-400/80">💨 +{getEquipStatBonus(selectedItem.equipmentStats.effects, 'spd')} SPD</span>}
                  {getEquipStatBonus(selectedItem.equipmentStats.effects, 'atk') && <span className="text-amber-400/80">⚔️ +{getEquipStatBonus(selectedItem.equipmentStats.effects, 'atk')} ATK</span>}
                  {getEquipStatBonus(selectedItem.equipmentStats.effects, 'crit') && <span className="text-orange-400/80">💥 +{getEquipStatBonus(selectedItem.equipmentStats.effects, 'crit')}% Crit</span>}
                  {(() => { const lbl = getEffectSpecialLabel(selectedItem.equipmentStats.effects); return lbl ? (
                    <span className="text-purple-400/80">✨ {lbl}</span>
                  ) : null; })()}
                </div>
              )}
              {/* #3 Mod stats */}
              {selectedItem.modStats && (
                <div className="flex flex-wrap gap-2 md:gap-3 mb-3 md:mb-4 text-xs md:text-sm">
                  {getEquipStatBonus(selectedItem.modStats.effects, 'atk') && <span className="text-amber-400/80">⚔️ +{getEquipStatBonus(selectedItem.modStats.effects, 'atk')} ATK</span>}
                  {getEquipStatBonus(selectedItem.modStats.effects, 'crit') && <span className="text-orange-400/80">💥 +{getEquipStatBonus(selectedItem.modStats.effects, 'crit')}% Crit</span>}
                  {getStatusChanceBoost(selectedItem.modStats.effects) && <span className="text-purple-400/80">☠️ +{getStatusChanceBoost(selectedItem.modStats.effects)}% Status</span>}
                  {getEquipStatBonus(selectedItem.modStats.effects, 'spd') && <span className="text-cyan-400/80">💨 +{getEquipStatBonus(selectedItem.modStats.effects, 'spd')}% Dodge</span>}
                  <span className="text-white/40">{selectedItem.modStats.type === 'any' ? 'Tutte le armi' : selectedItem.modStats.type === 'ranged' ? 'A distanza' : 'Corpo a corpo'}</span>
                </div>
              )}
              {(() => {
                const effectDescs = getItemEffectDescriptions(selectedItem);
                if (effectDescs.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-3 md:gap-4 mb-3 md:mb-4 text-xs md:text-sm text-white/60">
                    {effectDescs.map((d, i) => (
                      <span key={i} className={d.color}>{d.emoji} {d.text}</span>
                    ))}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-2 md:gap-3 flex-wrap">
                {selectedItem.equippable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (selectedItem.isEquipped) {
                        // Unequip based on item type
                        if (selectedItem.type === 'armor') {
                          unequipArmor(selectedChar.id);
                        } else if (selectedItem.type === 'accessory') {
                          unequipAccessory(selectedChar.id);
                        } else {
                          unequipItem(selectedChar.id, selectedItem.uid);
                        }
                      } else {
                        // Equip based on item type
                        if (selectedItem.type === 'armor') {
                          equipArmor(selectedChar.id, selectedItem.uid);
                        } else if (selectedItem.type === 'accessory') {
                          equipAccessory(selectedChar.id, selectedItem.uid);
                        } else {
                          equipItem(selectedChar.id, selectedItem.uid);
                        }
                      }
                    }}
                    className={`bg-transparent text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 transition-all ${
                      selectedItem.isEquipped
                        ? 'border-amber-500/20 text-amber-400/60 hover:bg-amber-900/20 hover:text-amber-300 hover:border-amber-500/30'
                        : ''
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1.5" />
                    {selectedItem.isEquipped ? 'Disequipaggia' : 'Equipaggia'}
                  </Button>
                )}
                {selectedItem.usable && !selectedItem.equippable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { consumeItemOutsideCombat(selectedChar.id, selectedItem.uid); setSelectedItem(null); }}
                    disabled={selectedItem.type === 'bag' && selectedChar.maxInventorySlots >= getMaxInventorySlots()}
                    className="bg-transparent text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 transition-all disabled:opacity-30"
                  >
                    <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> {selectedItem.type === 'bag' ? 'Equipaggia' : 'Usa'}
                  </Button>
                )}
                {selectedItem.itemId === 'herb_red' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { combineHerbs(selectedChar.id, selectedItem.uid); setSelectedItem(null); }}
                    disabled={!selectedChar.inventory.some(i => i.itemId === 'herb_green')}
                    className={`bg-transparent text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 transition-all ${
                      selectedChar.inventory.some(i => i.itemId === 'herb_green')
                        ? ''
                        : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Blend className="w-3.5 h-3.5 mr-1.5" /> Combina con Erba Verde
                  </Button>
                )}
                {/* Transfer item to another character */}
                {party.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setTransferQty(selectedItem?.quantity || 1); setShowTransferPicker(true); }}
                    className="bg-transparent text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Dai a...
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3 md:py-4 px-4 md:px-6 flex items-center gap-2 text-white/40 text-xs md:text-sm">
              <Backpack className="w-3.5 h-3.5 md:w-5 md:h-5" />
              Seleziona un oggetto per visualizzarne i dettagli
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.04] text-center">
          <Button variant="ghost" size="sm" onClick={() => { toggleInventory(); setSelectedItem(null); }} className="text-white/40 hover:text-white hover:bg-white/[0.05] text-xs md:text-sm">
            Chiudi Inventario
          </Button>
        </div>
      </motion.div>

      {/* Transfer Picker Overlay */}
      <AnimatePresence>
        {showTransferPicker && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center p-4 glass-overlay"
            onClick={() => setShowTransferPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-dark rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    <ItemIcon itemId={selectedItem.itemId} rarity={selectedItem.rarity} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white">Dai a...</h3>
                    <p className="text-xs text-white/60 truncate">Scegli a chi passare <span className="text-cyan-400">{selectedItem.name}</span></p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowTransferPicker(false)} className="text-white/60 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {/* Quantity selector for stackable items */}
                {(selectedItem.type === 'ammo' || selectedItem.type === 'healing' || selectedItem.type === 'antidote') && selectedItem.quantity > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-white/40">Quantità:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTransferQty(q => Math.max(1, q - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white text-sm transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        max={selectedItem.quantity}
                        value={transferQty}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 1;
                          setTransferQty(Math.min(selectedItem.quantity, Math.max(1, v)));
                        }}
                        className="w-12 h-7 text-center text-sm bg-white/[0.06] border border-white/[0.08] rounded text-white"
                      />
                      <button
                        onClick={() => setTransferQty(q => Math.min(selectedItem.quantity, q + 1))}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white text-sm transition-colors"
                      >+</button>
                    </div>
                    <button
                      onClick={() => setTransferQty(selectedItem.quantity)}
                      className="text-[10px] text-white/40 hover:text-white/70 transition-colors ml-1"
                    >Tutto</button>
                    <span className="text-[10px] text-white/30">/ {selectedItem.quantity}</span>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                {party
                  .filter(c => c.id !== selectedChar?.id)
                  .map(char => {
                    const hasSpace = char.inventory.length < char.maxInventorySlots || selectedItem.type === 'bag';
                    return (
                      <motion.button
                        key={char.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const isStackable = selectedItem.type === 'ammo' || selectedItem.type === 'healing' || selectedItem.type === 'antidote';
                          const qty = isStackable ? transferQty : undefined;
                          const success = transferItem(selectedChar!.id, selectedItem.uid, char.id, qty);
                          if (success) {
                            setSelectedItem(null);
                            setShowTransferPicker(false);
                          }
                        }}
                        disabled={!hasSpace}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          hasSpace
                            ? 'border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08]'
                            : 'border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-xl">
                          {getArchetypeEmoji(char.archetype)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white">{char.name}</span>
                          <div className="text-xs text-white/40">
                            {char.inventory.length}/{char.maxInventorySlots} slot
                          </div>
                        </div>
                        {!hasSpace && (
                          <Badge className="bg-red-500/10 text-red-400 border-0 text-[10px] shrink-0">
                            Pieno
                          </Badge>
                        )}
                        <ArrowRightLeft className="w-4 h-4 text-white/30 shrink-0" />
                      </motion.button>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


/** Recipes tab embedded in the inventory panel. Always available except during combat. */
function InventoryRecipesTab({
  party,
  selectedChar,
  craftItem,
  inCombat,
  discoveredRecipes,
}: {
  party: Character[];
  selectedChar: Character;
  craftItem: (recipeIndex: number) => boolean;
  inCombat: boolean;
  discoveredRecipes: string[];
}) {
  const recipes = RECIPES_DATA;

  const totalRecipes = recipes.length;
  const hiddenCount = recipes.filter(r => r.hidden).length;
  const discoveredCount = hiddenCount - recipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;
  const undiscoveredCount = recipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;

  // Filter: show non-hidden recipes + discovered hidden recipes
  const visibleRecipes = useMemo(() => {
    return recipes
      .map((recipe, originalIndex) => ({ recipe, originalIndex }))
      .filter(({ recipe }) => !recipe.hidden || discoveredRecipes.includes(recipe.id));
  }, [recipes, discoveredRecipes]);

  const ingredientAvailability = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count items from all party inventories ONLY (not item box)
    // The player must take items from the item box into their inventory first
    const allSources = party.flatMap(p => p.inventory);
    for (const item of allSources) {
      counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
    }

    return visibleRecipes.map(({ recipe, originalIndex }) => {
      const canCraft = !inCombat && recipe.ingredients.every(ing => (counts[ing.itemId] || 0) >= ing.quantity);
      const ingredientStatus = recipe.ingredients.map(ing => ({
        itemId: ing.itemId,
        qty: ing.quantity,
        have: counts[ing.itemId] || 0,
        enough: (counts[ing.itemId] || 0) >= ing.quantity,
        itemDef: ITEMS[ing.itemId],
      }));
      const resultDef = ITEMS[recipe.result.itemId];
      return { recipe, originalIndex, canCraft, ingredientStatus, resultDef };
    });
  }, [party, visibleRecipes, inCombat]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 inventory-scrollbar">
      {inCombat && (
        <div className="mb-3 p-2 rounded-lg bg-red-950/30 border border-red-800/30 text-red-300 text-xs text-center">
          ⚔️ Crafting non disponibile durante il combattimento
        </div>
      )}

      {/* Recipe count badge */}
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-amber-400/60" />
        <Badge className="text-[10px] md:text-xs bg-amber-900/40 text-amber-300 border-amber-700/30">
          {discoveredCount}/{totalRecipes} ricette scoperte
        </Badge>
      </div>

      <div className="space-y-2">
        {ingredientAvailability.map(({ recipe, originalIndex, canCraft, ingredientStatus, resultDef }) => (
          <div
            key={recipe.id || originalIndex}
            className={`p-2.5 md:p-3 rounded-lg border transition-all ${
              canCraft
                ? 'border-green-500/20 bg-green-950/10 hover:border-green-500/30'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-xs md:text-sm font-bold text-white/90 truncate">
                  {recipe.icon} {recipe.name}
                </div>
                <p className="text-[10px] md:text-xs text-white/40 mt-0.5 line-clamp-1">
                  {recipe.description}
                </p>
              </div>
              <Badge className={`text-[9px] md:text-[10px] shrink-0 border-0 ${
                canCraft
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-white/[0.04] text-white/30'
              }`}>
                {canCraft ? '✓ Pronto' : '✗ Mancano'}
              </Badge>
            </div>

            {/* Ingredients */}
            <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2">
              {ingredientStatus.map((ing, ingIdx) => (
                <span
                  key={ingIdx}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] md:text-xs border ${
                    ing.enough
                      ? 'border-green-700/30 bg-green-950/20 text-green-300'
                      : 'border-red-700/30 bg-red-950/20 text-red-300'
                  }`}
                >
                  {ing.itemDef?.icon} {ing.itemDef?.name} {ing.have}/{ing.qty}
                </span>
              ))}
            </div>

            {/* Craft button */}
            <Button
              size="sm"
              onClick={() => craftItem(originalIndex)}
              disabled={!canCraft}
              className={`w-full min-h-[40px] h-auto md:h-7 text-xs md:text-sm font-semibold bg-transparent transition-all ${
                canCraft
                  ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                  : 'border-white/[0.06] text-white/20 cursor-not-allowed'
              }`}
            >
              <Hammer className="w-3.5 h-3.5 mr-1" />
              Crea: {resultDef?.icon} {resultDef?.name} x{recipe.result.quantity}
            </Button>
          </div>
        ))}

        {/* Undiscovered recipe placeholders */}
        {undiscoveredCount > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-1 px-1">
              <Lock className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[10px] md:text-xs text-white/25 font-medium">
                {undiscoveredCount} ricetta{undiscoveredCount > 1 ? 'e' : ''} segreta{undiscoveredCount > 1 ? 'e' : ''} da scoprire
              </span>
            </div>
            {Array.from({ length: undiscoveredCount }).map((_, i) => (
              <div
                key={`hidden_${i}`}
                className="p-2.5 md:p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] opacity-40"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-white/[0.06] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/20" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/20">???</div>
                    <div className="text-[10px] text-white/10">Cerca nei documenti o esplora per scoprire...</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
