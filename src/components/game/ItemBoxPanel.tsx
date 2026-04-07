'use client';

import { useState } from 'react';
import { useGameStore } from '@/game/store';
import { Badge } from '@/components/ui/badge';
import {
  Package, ArrowDownToLine, ArrowUpFromLine,
  Briefcase, Archive, ShieldOff
} from 'lucide-react';

export default function ItemBoxPanel() {
  const party = useGameStore(s => s.party);
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId);
  const itemBoxItems = useGameStore(s => s.itemBoxItems);
  const depositToItemBox = useGameStore(s => s.depositToItemBox);
  const withdrawFromItemBox = useGameStore(s => s.withdrawFromItemBox);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const unequipItem = useGameStore(s => s.unequipItem);
  const [depositQty, setDepositQty] = useState<Record<string, number>>({});
  const [withdrawQty, setWithdrawQty] = useState<Record<number, number>>({});

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];
  if (!selectedChar) return null;

  const handleDeposit = (itemUid: string, maxQty: number) => {
    const qty = depositQty[itemUid] || maxQty;
    depositToItemBox(selectedChar.id, itemUid, qty);
    setDepositQty(prev => {
      const next = { ...prev };
      delete next[itemUid];
      return next;
    });
  };

  const handleWithdraw = (boxIndex: number, maxQty: number) => {
    const qty = withdrawQty[boxIndex] || maxQty;
    withdrawFromItemBox(selectedChar.id, boxIndex, qty);
    setWithdrawQty(prev => {
      const next = { ...prev };
      delete next[boxIndex];
      return next;
    });
  };

  // All items in inventory (equipped shown as greyed out)
  const allItems = selectedChar.inventory.filter(i => i.type !== 'collectible');
  const depositableItems = allItems.filter(i => !i.isEquipped);
  const equippedItems = allItems.filter(i => i.isEquipped);

  const inventoryFull = selectedChar.inventory.length >= selectedChar.maxInventorySlots;

  return (
    <div className="space-y-3">
      {/* Character selector */}
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white/90">Item Box</h3>
        <Badge className="text-[10px] bg-cyan-900/40 text-cyan-300 border-cyan-700/30 ml-auto">
          {itemBoxItems.length} oggetti
        </Badge>
      </div>

      {/* Character tabs */}
      <div className="flex gap-1 flex-wrap">
        {party.filter(p => p.currentHp > 0).map(p => (
          <button
            key={p.id}
            onClick={() => selectCharacter(p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-all font-medium ${
              p.id === selectedCharacterId
                ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200'
                : 'border-white/[0.06] bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* LEFT COLUMN — Character Inventory (Deposit) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-300">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Deposita</span>
            <Badge className="text-[9px] bg-white/[0.06] text-white/40 border-white/[0.08] ml-auto">
              {selectedChar.inventory.length}/{selectedChar.maxInventorySlots}
            </Badge>
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto inventory-scrollbar pr-1">
            {allItems.length === 0 ? (
              <p className="text-xs text-white/20 italic text-center py-4">Inventario vuoto</p>
            ) : (
              <>
                {/* Equipped items (shown but not depositable) */}
                {equippedItems.map(item => (
                  <div
                    key={item.uid}
                    className="flex items-center gap-2 p-2 rounded-lg border border-amber-700/20 bg-amber-950/10 opacity-70"
                  >
                    <span className="text-base shrink-0 w-6 text-center">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-amber-200/80 truncate flex items-center gap-1">
                        {item.name}
                        <span className="text-[9px] text-amber-400/50 font-normal">EQUIPAGGIATA</span>
                      </div>
                      <div className="text-[10px] text-white/30">x{item.quantity}</div>
                    </div>
                    <button
                      onClick={() => unequipItem(selectedChar.id, item.uid)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-950/30 border border-amber-700/30 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500/50 transition-all active:scale-95"
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Rimuovi</span>
                    </button>
                  </div>
                ))}
                {/* Depositable items */}
                {depositableItems.length > 0 && equippedItems.length > 0 && (
                  <div className="text-[9px] text-white/20 uppercase tracking-wider pt-1 pb-0.5 px-1">Altri oggetti</div>
                )}
                {depositableItems.map(item => {
                  const qtyVal = depositQty[item.uid] || item.quantity;
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                    >
                      <span className="text-base shrink-0 w-6 text-center">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white/80 truncate">{item.name}</div>
                        <div className="text-[10px] text-white/30">x{item.quantity}</div>
                      </div>
                      {item.quantity > 1 && (
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={qtyVal}
                          onChange={e => setDepositQty(prev => ({ ...prev, [item.uid]: Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)) }))}
                          className="w-11 h-7 text-xs text-center bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 focus:outline-none focus:border-cyan-500/30"
                        />
                      )}
                      <button
                        onClick={() => handleDeposit(item.uid, item.quantity)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-cyan-950/30 border border-cyan-700/30 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-500/50 transition-all active:scale-95"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Deposita</span>
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Item Box (Withdraw) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-300">
            <Archive className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Preleva</span>
            <Badge className="text-[9px] bg-white/[0.06] text-white/40 border-white/[0.08] ml-auto">
              {itemBoxItems.length} oggetti
            </Badge>
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto inventory-scrollbar pr-1">
            {itemBoxItems.length === 0 ? (
              <p className="text-xs text-white/20 italic text-center py-4">Item Box vuoto</p>
            ) : (
              itemBoxItems.map((item, idx) => {
                const qtyVal = withdrawQty[idx] || item.quantity;
                return (
                  <div
                    key={`${item.uid}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg border bg-white/[0.02] hover:bg-white/[0.04] transition-colors group ${
                      inventoryFull ? 'border-white/[0.04] opacity-50' : 'border-white/[0.06]'
                    }`}
                  >
                    <span className="text-base shrink-0 w-6 text-center">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white/80 truncate">{item.name}</div>
                      <div className="text-[10px] text-white/30">x{item.quantity}</div>
                    </div>
                    {item.quantity > 1 && (
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={qtyVal}
                        onChange={e => setWithdrawQty(prev => ({ ...prev, [idx]: Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)) }))}
                        disabled={inventoryFull}
                        className="w-11 h-7 text-xs text-center bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 focus:outline-none focus:border-emerald-500/30 disabled:opacity-40"
                      />
                    )}
                    <button
                      onClick={() => handleWithdraw(idx, item.quantity)}
                      disabled={inventoryFull}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all active:scale-95 ${
                        inventoryFull
                          ? 'bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed'
                          : 'bg-emerald-950/30 border-emerald-700/30 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/50'
                      }`}
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Preleva</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
