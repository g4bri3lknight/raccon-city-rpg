'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getMaxItemBoxSlots } from '@/game/store';
import { ItemInstance } from '@/game/types';
import { getItemEffectDescriptions } from '@/game/utils/item-effects';
import { getEquipStatBonus } from '@/game/utils/effect-helpers';
import { getArchetypeEmoji } from '@/game/utils/archetype-helpers';
import ItemIcon from './ItemIcon';
import { CombatHpPanel } from './HpBar';
import { CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package, ArrowDownToLine, ArrowUpFromLine,
  ShieldOff, Minus, Plus, AlertCircle
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

type ToastInfo = { message: string; type: 'deposit' | 'withdraw' | 'error' | 'swap' };

function isStackable(item: ItemInstance): boolean {
  return item.type === 'ammo' || item.type === 'healing' || item.type === 'antidote';
}

export default function ItemBoxPanel() {
  const dataVersion = useGameStore(s => s.dataVersion);
  const party = useGameStore(s => s.party);
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId);
  const itemBoxItems = useGameStore(s => s.itemBoxItems);
  const depositToItemBox = useGameStore(s => s.depositToItemBox);
  const withdrawFromItemBox = useGameStore(s => s.withdrawFromItemBox);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const unequipItem = useGameStore(s => s.unequipItem);
  const unequipArmor = useGameStore(s => s.unequipArmor);
  const unequipAccessory = useGameStore(s => s.unequipAccessory);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [transferQty, setTransferQty] = useState(1);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-and-drop state
  const [dragItem, setDragItem] = useState<{ uid: string; source: 'inventory' | 'itembox'; index: number; item: ItemInstance } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<'inventory' | 'itembox' | null>(null);
  const [dragQtyPicker, setDragQtyPicker] = useState<{
    direction: 'deposit' | 'withdraw' | 'swap-deposit' | 'swap-withdraw';
    targetSlotIndex: number;
    targetItem: ItemInstance | null;
    // Store drag item info so picker works even after onDragEnd clears dragItem
    dragUid: string;
    dragSource: 'inventory' | 'itembox';
    dragIndex: number;
    dragItemData: ItemInstance;
  } | null>(null);
  const [dragTransferQty, setDragTransferQty] = useState(1);

  const showToast = useCallback((message: string, type: 'deposit' | 'withdraw' | 'error' | 'swap') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];
  if (!selectedChar) return null;

  const inventoryItems = selectedChar.inventory.filter(i => i.type !== 'collectible');
  const totalSlots = selectedChar.maxInventorySlots;
  const invSlots = Array.from({ length: totalSlots }, (_, i) => inventoryItems[i] || null);
  const boxSlots = Array.from({ length: getMaxItemBoxSlots() }, (_, i) => itemBoxItems[i] || null);
  const inventoryFull = selectedChar.inventory.length >= selectedChar.maxInventorySlots;
  const itemBoxFull = itemBoxItems.length >= getMaxItemBoxSlots();

  const handleDeposit = (itemUid: string) => {
    const item = selectedChar.inventory.find(i => i.uid === itemUid);
    const qty = Math.min(transferQty, item?.quantity ?? 1);
    depositToItemBox(selectedChar.id, itemUid, qty);
    if (item) {
      showToast(`Depositato: ${item.name} ×${qty}`, 'deposit');
    }
    setSelected(null);
    setTransferQty(1);
  };

  const handleWithdraw = (boxIndex: number) => {
    const item = itemBoxItems[boxIndex];
    const qty = Math.min(transferQty, item?.quantity ?? 1);
    withdrawFromItemBox(selectedChar.id, boxIndex, qty);
    if (item) {
      showToast(`Prelevato: ${item.name} ×${qty}`, 'withdraw');
    }
    setSelected(null);
    setTransferQty(1);
  };

  const handleUnequip = (item: ItemInstance) => {
    if (item.type === 'armor') {
      unequipArmor(selectedChar.id);
    } else if (item.type === 'accessory') {
      unequipAccessory(selectedChar.id);
    } else {
      unequipItem(selectedChar.id, item.uid);
    }
    setSelected(null);
  };

  const maxQty = selected
    ? selected.item.quantity
    : 1;

  // Check if depositing would stack (same itemId already in box)
  const canStackInBox = (item: ItemInstance) =>
    itemBoxItems.some(ib => ib.itemId === item.itemId);

  // Check if withdrawing would stack (same itemId already in inventory)
  const canStackInInventory = (item: ItemInstance) =>
    selectedChar.inventory.some(inv => inv.itemId === item.itemId);

  // Execute the drag & drop transfer (after quantity is confirmed)
  function executeDragDrop(picker: NonNullable<typeof dragQtyPicker>) {
    if (!selectedChar) return;

    const qty = dragTransferQty;
    const dragUid = picker.dragUid;
    const dragIndex = picker.dragIndex;
    const dragItemData = picker.dragItemData;

    if (picker.direction === 'deposit') {
      depositToItemBox(selectedChar.id, dragUid, qty);
      showToast(`Depositato: ${dragItemData.name} ×${qty}`, 'deposit');
    } else if (picker.direction === 'withdraw') {
      const success = withdrawFromItemBox(selectedChar.id, dragIndex, qty);
      if (!success) {
        showToast('Inventario pieno!', 'error');
      } else {
        showToast(`Prelevato: ${dragItemData.name} ×${qty}`, 'withdraw');
      }
    } else if (picker.direction === 'swap-deposit') {
      if (picker.targetItem) {
        const boxIdx = itemBoxItems.findIndex(ib => ib.uid === picker.targetItem!.uid);
        if (boxIdx >= 0) {
          withdrawFromItemBox(selectedChar.id, boxIdx, picker.targetItem.quantity);
        }
        depositToItemBox(selectedChar.id, dragUid, qty);
        showToast(`Scambio: ${dragItemData.name} ↔ ${picker.targetItem.name}`, 'swap');
      }
    } else if (picker.direction === 'swap-withdraw') {
      if (picker.targetItem && !picker.targetItem.isEquipped) {
        depositToItemBox(selectedChar.id, picker.targetItem.uid, picker.targetItem.quantity);
        withdrawFromItemBox(selectedChar.id, dragIndex, qty);
        showToast(`Scambio: ${dragItemData.name} ↔ ${picker.targetItem.name}`, 'swap');
      }
    }

    setDragItem(null);
    setDragOverTarget(null);
    setDragQtyPicker(null);
    setSelected(null);
  }

  // Build picker payload from current dragItem
  function makePickerPayload(direction: 'deposit' | 'withdraw' | 'swap-deposit' | 'swap-withdraw', targetSlotIndex: number, targetItem: ItemInstance | null) {
    if (!dragItem) return;
    setDragQtyPicker({
      direction,
      targetSlotIndex,
      targetItem,
      dragUid: dragItem.uid,
      dragSource: dragItem.source,
      dragIndex: dragItem.index,
      dragItemData: dragItem.item,
    });
  }

  // Handle drop on a column area
  function handleColumnDrop(target: 'inventory' | 'itembox', slotIndex?: number) {
    if (!dragItem || !selectedChar) {
      setDragOverTarget(null);
      return;
    }

    if (dragItem.source === target) {
      setDragOverTarget(null);
      setDragItem(null);
      return;
    }

    const targetItem = target === 'itembox'
      ? (slotIndex !== undefined ? itemBoxItems[slotIndex] : null)
      : (slotIndex !== undefined ? inventoryItems[slotIndex] : null);

    if (target === 'itembox') {
      if (canStackInBox(dragItem.item) || !itemBoxFull) {
        if (isStackable(dragItem.item) && dragItem.item.quantity > 1) {
          setDragTransferQty(1);
          makePickerPayload('deposit', slotIndex ?? -1, targetItem);
        } else {
          depositToItemBox(selectedChar.id, dragItem.uid, dragItem.item.quantity);
          showToast(`Depositato: ${dragItem.item.name} ×${dragItem.item.quantity}`, 'deposit');
          setDragItem(null);
        }
      } else if (itemBoxFull && targetItem) {
        setDragTransferQty(1);
        makePickerPayload('swap-deposit', slotIndex ?? -1, targetItem);
      } else {
        showToast('Item Box pieno!', 'error');
        setDragItem(null);
      }
    } else {
      if (canStackInInventory(dragItem.item) || !inventoryFull) {
        if (isStackable(dragItem.item) && dragItem.item.quantity > 1) {
          setDragTransferQty(1);
          makePickerPayload('withdraw', slotIndex ?? -1, targetItem);
        } else {
          const success = withdrawFromItemBox(selectedChar.id, dragItem.index, dragItem.item.quantity);
          if (!success) {
            showToast('Inventario pieno!', 'error');
          } else {
            showToast(`Prelevato: ${dragItem.item.name} ×${dragItem.item.quantity}`, 'withdraw');
          }
          setDragItem(null);
        }
      } else if (inventoryFull && targetItem && !targetItem.isEquipped) {
        setDragTransferQty(1);
        makePickerPayload('swap-withdraw', slotIndex ?? -1, targetItem);
      } else if (inventoryFull) {
        showToast('Inventario pieno!', 'error');
        setDragItem(null);
      }
    }

    setDragOverTarget(null);
  }

  const renderIconSlot = (item: ItemInstance | null, source: 'inventory' | 'itembox', index: number) => {
    const isSelected = item && selected?.item.uid === item.uid && selected?.source === source;
    const isDragSource = dragItem && dragItem.source === source && dragItem.index === index;
    const isDragOver = dragOverTarget === source && !isDragSource;

    let slotClass = 'aspect-square rounded-lg border-2 flex items-center justify-center text-2xl transition-all duration-200 relative ';
    if (item) {
      slotClass += 'bg-white/[0.04] cursor-pointer cursor-grab active:cursor-grabbing ';
      if (isDragSource) {
        slotClass += 'opacity-30 ';
      } else if (isSelected) {
        slotClass += 'border-cyan-600 bg-cyan-950/30 shadow-[0_0_12px_rgba(8,145,178,0.3)] scale-105';
      } else if (isDragOver) {
        slotClass += 'border-amber-500/60 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.2)] scale-105';
      } else {
        slotClass += 'border-white/[0.08] hover:border-cyan-600/60 hover:bg-white/[0.06] hover:shadow-[0_0_8px_rgba(8,145,178,0.15)] hover:scale-105';
      }
      if (item.isEquipped) {
        slotClass += ' ring-1 ring-amber-500/40';
      }
    } else {
      slotClass += 'border-white/[0.04] bg-white/[0.02] cursor-default';
      if (isDragOver) {
        slotClass += 'border-amber-500/40 bg-amber-950/10';
      }
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
        draggable={!!item}
        onDragStart={(e) => {
          if (!item) return;
          e.dataTransfer.setData('text/plain', item.uid);
          e.dataTransfer.effectAllowed = 'move';
          setDragItem({ uid: item.uid, source, index, item });
        }}
        onDragEnd={() => {
          setDragItem(null);
          setDragOverTarget(null);
        }}
        onDragOver={(e) => {
          if (dragItem && dragItem.source !== source) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverTarget(source);
          }
        }}
        onDragLeave={(e) => {
          // Only clear if leaving the column (not entering a child)
          const related = e.relatedTarget as HTMLElement | null;
          if (!e.currentTarget.contains(related)) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleColumnDrop(source, index);
        }}
        className={slotClass}
      >
        {item ? (
          <span className="relative w-full h-full flex items-center justify-center p-1.5">
            <ItemIcon itemId={item.itemId} rarity={item.rarity} className="!w-full !h-full" />
            {item.quantity > 1 && (
              <span className="absolute -top-2 -right-2 text-sm md:text-base bg-black/70 text-white/90 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-bold border border-white/[0.15] shadow-lg">
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
    <div className="relative h-full flex flex-col">
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
                {getArchetypeEmoji(char.archetype)}
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
            imageSrc={mediaUrl(selectedChar.avatarUrl || CHARACTER_IMAGES[selectedChar.archetype] || '', dataVersion)}
          />
          <div className="flex gap-3 text-xs mt-1.5">
            <span className="text-white/40">⚔️ ATK {selectedChar.baseAtk + getEquipStatBonus(selectedChar.weapon?.effects, 'atk')}</span>
            <span className="text-white/40">🛡️ DEF {selectedChar.baseDef}</span>
            <span className="text-white/40">💨 SPD {selectedChar.baseSpd}</span>
            <span className="text-white/30">Lv.{selectedChar.level}</span>
          </div>
        </div>
      </div>

      {/* ── 2) Two columns — each with its own scrollbar ── */}
      <div className={`flex-1 min-h-0 grid grid-cols-2 gap-px bg-white/[0.06] overflow-hidden transition-all duration-200 ${
        dragOverTarget === 'inventory' ? '[&>*:first-child]:ring-2 [&>*:first-child]:ring-inset [&>*:first-child]:ring-emerald-500/40' :
        dragOverTarget === 'itembox' ? '[&>*:last-child]:ring-2 [&>*:last-child]:ring-inset [&>*:last-child]:ring-emerald-500/40' : ''
      }`}>
        {/* LEFT — Inventario */}
        <div
          className="flex flex-col min-h-0 bg-[var(--color-bg,#0a0a0f)]"
          onDragOver={(e) => {
            if (dragItem && dragItem.source === 'itembox') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverTarget('inventory');
            }
          }}
          onDragLeave={(e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (!e.currentTarget.contains(related)) {
              if (dragOverTarget === 'inventory') setDragOverTarget(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleColumnDrop('inventory');
          }}
        >
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
            <Package className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-cyan-300">Inventario</span>
            <Badge className="text-xs bg-white/10 text-white/60 border-0 ml-auto">
              {inventoryItems.length}/{totalSlots}
            </Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2 inventory-scrollbar">
            <div className="grid grid-cols-6 gap-1.5">
              {invSlots.map((item, i) => renderIconSlot(item, 'inventory', i))}
            </div>
          </div>
        </div>

        {/* RIGHT — Item Box */}
        <div
          className="flex flex-col min-h-0 bg-[var(--color-bg,#0a0a0f)]"
          onDragOver={(e) => {
            if (dragItem && dragItem.source === 'inventory') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverTarget('itembox');
            }
          }}
          onDragLeave={(e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (!e.currentTarget.contains(related)) {
              if (dragOverTarget === 'itembox') setDragOverTarget(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleColumnDrop('itembox');
          }}
        >
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-300">Item Box</span>
            <Badge className="text-xs bg-white/10 text-white/60 border-0 ml-auto">
              {itemBoxItems.length}/{getMaxItemBoxSlots()}
            </Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2 inventory-scrollbar">
            <div className="grid grid-cols-6 gap-1.5">
              {boxSlots.map((item, i) => renderIconSlot(item, 'itembox', i))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transfer toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold shadow-lg shadow-black/40 backdrop-blur-sm ${
              toast.type === 'deposit'
                ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                : toast.type === 'withdraw'
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                  : toast.type === 'swap'
                    ? 'bg-amber-950/80 border-amber-500/30 text-amber-300'
                    : 'bg-red-950/80 border-red-500/30 text-red-300'
            }`}>
              {toast.type === 'deposit' && <ArrowDownToLine className="w-3.5 h-3.5" />}
              {toast.type === 'withdraw' && <ArrowUpFromLine className="w-3.5 h-3.5" />}
              {toast.type === 'swap' && <ArrowDownToLine className="w-3.5 h-3.5" />}
              {toast.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drag & Drop Quantity Picker ── */}
      <AnimatePresence>
        {dragQtyPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setDragQtyPicker(null); setDragItem(null); setDragOverTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs glass-dark rounded-xl overflow-hidden border border-white/[0.08]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  {dragQtyPicker.direction === 'deposit' && <ArrowDownToLine className="w-4 h-4 text-cyan-400" />}
                  {dragQtyPicker.direction === 'withdraw' && <ArrowUpFromLine className="w-4 h-4 text-emerald-400" />}
                  {(dragQtyPicker.direction === 'swap-deposit' || dragQtyPicker.direction === 'swap-withdraw') && <ArrowDownToLine className="w-4 h-4 text-amber-400" />}
                  <h3 className="text-sm font-bold text-white">
                    {dragQtyPicker.direction === 'deposit' && 'Deposita'}
                    {dragQtyPicker.direction === 'withdraw' && 'Preleva'}
                    {(dragQtyPicker.direction === 'swap-deposit' || dragQtyPicker.direction === 'swap-withdraw') && 'Scambia'}
                  </h3>
                </div>
                <p className="text-xs text-white/50">
                  {dragQtyPicker.direction === 'deposit' && 'Quanti oggetti depositare?'}
                  {dragQtyPicker.direction === 'withdraw' && 'Quanti oggetti prelevare?'}
                  {(dragQtyPicker.direction === 'swap-deposit' || dragQtyPicker.direction === 'swap-withdraw') && 'Scambio con ' + (dragQtyPicker.targetItem?.name || 'slot vuoto')}
                </p>
              </div>
              <div className="p-4">
                {(dragQtyPicker.direction !== 'swap-deposit' && dragQtyPicker.direction !== 'swap-withdraw') && (
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <button
                      onClick={() => setDragTransferQty(q => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold text-white min-w-[3ch] text-center tabular-nums">{dragTransferQty}</span>
                    <button
                      onClick={() => setDragTransferQty(q => Math.min(dragQtyPicker.dragItemData.quantity, q + 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  {(dragQtyPicker.direction !== 'swap-deposit' && dragQtyPicker.direction !== 'swap-withdraw') && (
                    <button
                      onClick={() => setDragTransferQty(dragQtyPicker.dragItemData.quantity)}
                      className="flex-1 text-xs text-white/50 hover:text-white/70 py-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                    >Tutto ({dragQtyPicker.dragItemData.quantity})</button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => executeDragDrop(dragQtyPicker)}
                    className="flex-1 bg-cyan-700/40 hover:bg-cyan-700/60 text-white text-xs"
                  >
                    {dragQtyPicker.direction === 'deposit' && 'Deposita'}
                    {dragQtyPicker.direction === 'withdraw' && 'Preleva'}
                    {(dragQtyPicker.direction === 'swap-deposit' || dragQtyPicker.direction === 'swap-withdraw') && 'Conferma Scambio'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <span className="text-amber-400/80">⚔️ ATK +{getEquipStatBonus(selected.item.weaponStats.effects, 'atk')}</span>
                <span className="text-white/40">{selected.item.weaponStats.type === 'melee' ? 'Corpo a Corpo' : 'A Distanza'}</span>
              </div>
            )}
            {(() => {
              const effectDescs = getItemEffectDescriptions(selected.item);
              if (effectDescs.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 mb-2 text-xs text-white/60">
                  {effectDescs.map((d, i) => (
                    <span key={i} className={d.color}>{d.emoji} {d.text}</span>
                  ))}
                </div>
              );
            })()}

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
                      onClick={() => handleUnequip(selected.item)}
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
