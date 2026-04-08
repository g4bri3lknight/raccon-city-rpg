'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ItemInstance } from '@/game/types';
import ItemIcon from './ItemIcon';
import { CombatHpPanel } from './HpBar';
import { CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Shield, FlaskConical, Blend, ArrowRightLeft, Backpack } from 'lucide-react';

export default function InventoryPanel() {
  const dataVersion = useGameStore(s => s.dataVersion);
  const state = useGameStore();
  const { party, inventoryOpen, selectedCharacterId, toggleInventory, equipItem, consumeItemOutsideCombat, combineHerbs, selectCharacter, transferItem } = state;
  const [selectedItem, setSelectedItem] = useState<ItemInstance | null>(null);
  const [showTransferPicker, setShowTransferPicker] = useState(false);

  if (!inventoryOpen) return null;

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];

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

  const rarityLabel: Record<string, string> = {
    common: 'Comune',
    uncommon: 'Non Comune',
    rare: 'Raro',
    legendary: 'Leggendario',
  };

  const typeLabels: Record<string, string> = {
    weapon: 'Arma',
    healing: 'Cura',
    ammo: 'Munizioni',
    utility: 'Utilità',
    antidote: 'Antidoto',
    bag: 'Borsa',
  };

  // Build icon grid (always show all slots)
  const totalSlots = selectedChar?.maxInventorySlots || 6;
  const items = selectedChar?.inventory || [];
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
                {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : '⚔️'}
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
              <span className="text-white/40">⚔️ ATK {selectedChar.baseAtk + (selectedChar.weapon?.atkBonus || 0)}</span>
              <span className="text-white/40">🛡️ DEF {selectedChar.baseDef}</span>
              <span className="text-white/40">💨 SPD {selectedChar.baseSpd}</span>
              <span className="text-white/30">Lv.{selectedChar.level} · {selectedChar.archetype.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Icon Grid */}
        <div className="flex-1 min-h-0 p-3 md:p-6">
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
                      {typeLabels[selectedItem.type] || selectedItem.type}
                    </Badge>
                    <Badge className={`${rarityBadge[selectedItem.rarity]} border-0 text-[10px] md:text-xs`}>
                      {rarityLabel[selectedItem.rarity] || selectedItem.rarity}
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
                  <span className="text-amber-400/80">⚔️ ATK +{selectedItem.weaponStats.atkBonus}</span>
                  <span className="text-white/40">{selectedItem.weaponStats.type === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}</span>
                </div>
              )}
              {selectedItem.effect && (
                <div className="flex flex-wrap gap-3 md:gap-4 mb-3 md:mb-4 text-xs md:text-sm text-white/60">
                  {selectedItem.effect.type === 'heal' && (
                    <span className="text-green-400/80">❤️ Cura {selectedItem.effect.value} HP</span>
                  )}
                  {selectedItem.effect.type === 'heal_full' && (
                    <span className="text-green-400/80">❤️ Ripristina tutti gli HP</span>
                  )}
                  {selectedItem.effect.type === 'add_slots' && (
                    <span className="text-amber-400/80">🧳 +{selectedItem.effect.value} slot inventario</span>
                  )}
                  {selectedItem.effect.statusCured && (
                    <span className="text-purple-400/80">
                      ✨ Cura {selectedItem.effect.statusCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s).join(', ')}
                    </span>
                  )}
                  {selectedItem.effect.target === 'one_ally' && (
                    <span className="text-cyan-400/70">🎯 Bersaglio: Alleato</span>
                  )}
                  {selectedItem.effect.target === 'all_allies' && (
                    <span className="text-cyan-400/70">🎯 Bersaglio: Tutti</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 md:gap-3 flex-wrap">
                {selectedItem.equippable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => equipItem(selectedChar.id, selectedItem.uid)}
                    className={`bg-transparent text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 transition-all ${
                      selectedItem.isEquipped
                        ? 'border-amber-500/20 text-amber-400/60 hover:bg-amber-900/20 hover:text-amber-300 hover:border-amber-500/30'
                        : ''
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1.5" />
                    {selectedItem.isEquipped ? 'Equipaggiato' : 'Equipaggia'}
                  </Button>
                )}
                {selectedItem.usable && !selectedItem.equippable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { consumeItemOutsideCombat(selectedChar.id, selectedItem.uid); setSelectedItem(null); }}
                    disabled={selectedItem.type === 'bag' && selectedChar.maxInventorySlots >= 12}
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
                    onClick={() => setShowTransferPicker(true)}
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
                          const success = transferItem(selectedChar!.id, selectedItem.uid, char.id);
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
                          {char.archetype === 'tank' ? '🛡️' : char.archetype === 'healer' ? '💊' : '⚔️'}
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
