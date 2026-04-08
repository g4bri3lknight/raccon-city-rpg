'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ItemInstance } from '@/game/types';
import ItemIcon from './ItemIcon';
import { CombatHpPanel } from './HpBar';
import { CHARACTER_IMAGES } from '@/game/data/enemies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package, ArrowDownToLine, ArrowUpFromLine,
  ShieldOff, Minus, Plus
} from 'lucide-react';

type SelectedItem = { item: ItemInstance; source: 'inventory' | 'itembox'; index: number };

const RARITY_DOT: Record<string, string> = {
  common: 'bg-gray-400',
  uncommon: 'bg-cyan-400',
  rare: 'bg-purple-400',
  legendary: 'bg-amber-400',
};

const RARITY_BADGE: Record<string, string> = {
  common: 'bg-white/10 text-white/70 border-0',
  uncommon: 'bg-white/10 text-cyan-300/80 border-0',
  rare: 'bg-white/10 text-purple-300/80 border-0',
  legendary: 'bg-white/10 text-amber-300/80 border-0',
};

const RARITY_LABEL: Record<string, string> = {
  common: 'Comune',
  uncommon: 'Non Comune',
  rare: 'Raro',
  legendary: 'Leggendario',
};

const TYPE_LABELS: Record<string, string> = {
  weapon: 'Arma',
  healing: 'Cura',
  ammo: 'Munizioni',
  utility: 'Utilità',
  antidote: 'Antidoto',
  bag: 'Borsa',
};

const ITEM_BOX_MAX_SLOTS = 48;

export default function ItemBoxPanel() {
  const party = useGameStore(s => s.party);
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId);
  const itemBoxItems = useGameStore(s => s.itemBoxItems);
  const depositToItemBox = useGameStore(s => s.depositToItemBox);
  const withdrawFromItemBox = useGameStore(s => s.withdrawFromItemBox);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const unequipItem = useGameStore(s => s.unequipItem);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [transferQty, setTransferQty] = useState(1);

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];
  if (!selectedChar) return null;

  const inventoryItems = selectedChar.inventory.filter(i => i.type !== 'collectible');
  const totalSlots = selectedChar.maxInventorySlots;
  const invSlots = Array.from({ length: totalSlots }, (_, i) => inventoryItems[i] || null);
  const boxSlots = Array.from({ length: ITEM_BOX_MAX_SLOTS }, (_, i) => itemBoxItems[i] || null);
  const inventoryFull = selectedChar.inventory.length >= selectedChar.maxInventorySlots;

  const handleDeposit = (itemUid: string) => {
    depositToItemBox(selectedChar.id, itemUid, transferQty);
    setSelected(null);
    setTransferQty(1);
  };

  const handleWithdraw = (boxIndex: number) => {
    withdrawFromItemBox(selectedChar.id, boxIndex, transferQty);
    setSelected(null);
    setTransferQty(1);
  };

  const handleUnequip = (itemUid: string) => {
    unequipItem(selectedChar.id, itemUid);
    setSelected(null);
  };

  const maxQty = selected
    ? selected.source === 'inventory'
      ? selected.item.quantity
      : selected.item.quantity
    : 1;

  const renderIconSlot = (item: ItemInstance | null, source: 'inventory' | 'itembox', index: number) => {
    const isSelected = item && selected?.item.uid === item.uid && selected?.source === source;

    let slotClass = 'aspect-square rounded-lg border-2 flex items-center justify-center text-2xl transition-all duration-200 relative ';
    if (item) {
      slotClass += 'bg-white/[0.04] cursor-pointer ';
      if (isSelected) {
        slotClass += 'border-cyan-600 bg-cyan-950/30 shadow-[0_0_12px_rgba(8,145,178,0.3)] scale-105';
      } else {
        slotClass += 'border-white/[0.08] hover:border-cyan-600/60 hover:bg-white/[0.06] hover:shadow-[0_0_8px_rgba(8,145,178,0.15)] hover:scale-105';
      }
      if (item.isEquipped) {
        slotClass += ' ring-1 ring-amber-500/40';
      }
    } else {
      slotClass += 'border-white/[0.04] bg-white/[0.02] cursor-default';
    }

    return (
      <motion.button
        key={item?.uid || `empty_${source}_${index}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.015 }}
        onClick={() => {
          if (item) {
            setSelected(isSelected ? null : { item, source, index });
            setTransferQty(1);
          }
        }}
        className={slotClass}
      >
        {item ? (
          <span className="relative w-full h-full flex items-center justify-center p-1.5">
            <ItemIcon itemId={item.itemId} rarity={item.rarity} className="!w-full !h-full" />
            {item.quantity > 1 && (
              <span className="absolute -top-2 -right-2 text-xs bg-black/70 text-white/90 rounded-full w-5 h-5 flex items-center justify-center font-bold border border-white/[0.15] shadow-lg">
                {item.quantity}
              </span>
            )}
            <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${RARITY_DOT[item.rarity] || 'bg-gray-400'} opacity-80 shadow-sm`} />
            {item.isEquipped && (
              <span className="absolute -top-1 -left-1 text-[10px] bg-amber-600/90 text-white rounded px-1 py-0.5 font-bold leading-none">E</span>
            )}
          </span>
        ) : (
          <span className="text-white/10 text-lg">+</span>
        )}
      </motion.button>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── 1) Character tabs + HP — fixed top ── */}
      <div className="shrink-0 border-b border-white/[0.06]">
        <div className="flex border-b border-white/[0.06] bg-white/[0.03]">
          {party.filter(p => p.currentHp > 0).map(char => (
            <button
              key={char.id}
              onClick={() => { selectCharacter(char.id); setSelected(null); setTransferQty(1); }}
              className={`flex-1 px-3 py-2.5 text-sm transition-all border-b-2 ${
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
        <div className="px-3 py-2 bg-white/[0.03]">
          <CombatHpPanel
            current={selectedChar.currentHp}
            max={selectedChar.maxHp}
            name={selectedChar.name}
            statusEffects={selectedChar.statusEffects}
            imageSrc={selectedChar.avatarUrl || CHARACTER_IMAGES[selectedChar.archetype]}
          />
          <div className="flex gap-3 text-xs mt-1.5">
            <span className="text-white/40">⚔️ ATK {selectedChar.baseAtk + (selectedChar.weapon?.atkBonus || 0)}</span>
            <span className="text-white/40">🛡️ DEF {selectedChar.baseDef}</span>
            <span className="text-white/40">💨 SPD {selectedChar.baseSpd}</span>
            <span className="text-white/30">Lv.{selectedChar.level}</span>
          </div>
        </div>
      </div>

      {/* ── 2) Two columns — each with its own scrollbar ── */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-px bg-white/[0.06] overflow-hidden">
        {/* LEFT — Inventario (own scrollbar) */}
        <div className="flex flex-col min-h-0 bg-[var(--color-bg,#0a0a0f)]">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
            <Package className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-cyan-300">Inventario</span>
            <Badge className="text-xs bg-white/10 text-white/60 border-0 ml-auto">
              {inventoryItems.length}/{totalSlots}
            </Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 inventory-scrollbar">
            <div className="grid grid-cols-6 gap-1.5">
              {invSlots.map((item, i) => renderIconSlot(item, 'inventory', i))}
            </div>
          </div>
        </div>

        {/* RIGHT — Item Box (own scrollbar) */}
        <div className="flex flex-col min-h-0 bg-[var(--color-bg,#0a0a0f)]">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-300">Item Box</span>
            <Badge className="text-xs bg-white/10 text-white/60 border-0 ml-auto">
              {itemBoxItems.length}/{ITEM_BOX_MAX_SLOTS}
            </Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 inventory-scrollbar">
            <div className="grid grid-cols-6 gap-1.5">
              {boxSlots.map((item, i) => renderIconSlot(item, 'itembox', i))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3) Detail panel — fixed bottom, always visible ── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.03]">
        {selected ? (
          <div className="p-3">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 p-1.5">
                <ItemIcon itemId={selected.item.itemId} rarity={selected.item.rarity} className="!w-full !h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white text-sm truncate">{selected.item.name}</span>
                  {selected.item.quantity > 1 && (
                    <Badge className={`${RARITY_BADGE[selected.item.rarity]} border-0 text-xs`}>x{selected.item.quantity}</Badge>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Badge className={`${RARITY_BADGE[selected.item.rarity]} border-0 text-xs`}>
                    {TYPE_LABELS[selected.item.type] || selected.item.type}
                  </Badge>
                  <Badge className={`${RARITY_BADGE[selected.item.rarity]} border-0 text-xs`}>
                    {RARITY_LABEL[selected.item.rarity] || selected.item.rarity}
                  </Badge>
                  {selected.item.isEquipped && (
                    <Badge className="bg-amber-900/50 text-amber-300 border-0 text-xs">Equipaggiato</Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-white/60 mb-2 line-clamp-2">{selected.item.description}</p>

            {selected.item.weaponStats && (
              <div className="flex gap-3 mb-2 text-xs">
                <span className="text-amber-400/80">⚔️ ATK +{selected.item.weaponStats.atkBonus}</span>
                <span className="text-white/40">{selected.item.weaponStats.type === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}</span>
              </div>
            )}
            {selected.item.effect && (
              <div className="flex flex-wrap gap-2 mb-2 text-xs text-white/60">
                {selected.item.effect.type === 'heal' && (
                  <span className="text-green-400/80">❤️ Cura {selected.item.effect.value} HP</span>
                )}
                {selected.item.effect.type === 'heal_full' && (
                  <span className="text-green-400/80">❤️ Ripristina tutti gli HP</span>
                )}
                {selected.item.effect.type === 'add_slots' && (
                  <span className="text-amber-400/80">🧳 +{selected.item.effect.value} slot</span>
                )}
              </div>
            )}

            {/* Quantity selector + Actions */}
            <div className="flex items-center gap-2">
              {(selected.source === 'inventory' && !selected.item.isEquipped && maxQty > 1) ||
              (selected.source === 'itembox' && maxQty > 1) ? (
                <>
                  <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-1">
                    <button
                      onClick={() => setTransferQty(q => Math.max(1, q - 1))}
                      disabled={transferQty <= 1}
                      className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[2ch] text-center tabular-nums">{transferQty}</span>
                    <button
                      onClick={() => setTransferQty(q => Math.min(maxQty, q + 1))}
                      disabled={transferQty >= maxQty}
                      className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTransferQty(maxQty)}
                      className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <span className="text-[10px] text-white/30">/ {maxQty}</span>
                </>
              ) : null}

              {selected.source === 'inventory' && (
                <>
                  {selected.item.isEquipped ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnequip(selected.item.uid)}
                      className="bg-transparent text-xs px-3 py-1.5 rounded-lg text-amber-400/60 hover:text-amber-300 hover:bg-amber-900/20 border border-amber-500/20 transition-all"
                    >
                      <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                      Rimuovi
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeposit(selected.item.uid)}
                      className="bg-transparent text-xs px-3 py-1.5 rounded-lg text-cyan-300 hover:text-cyan-200 hover:bg-cyan-900/20 border border-cyan-700/30 transition-all"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                      Deposita
                    </Button>
                  )}
                </>
              )}
              {selected.source === 'itembox' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleWithdraw(selected.index)}
                  disabled={inventoryFull}
                  className={`bg-transparent text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    inventoryFull
                      ? 'text-white/20 border-white/[0.04] cursor-not-allowed'
                      : 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/20 border-emerald-700/30'
                  }`}
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" />
                  Preleva
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 px-3 flex items-center gap-2 text-white/40 text-sm">
            <Package className="w-4 h-4" />
            Seleziona un oggetto per i dettagli
          </div>
        )}
      </div>
    </div>
  );
}
