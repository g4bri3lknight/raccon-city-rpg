'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, ArrowDownToLine, ArrowUpFromLine, User } from 'lucide-react';
import ItemIcon from '@/components/game/ItemIcon';

export default function TrunkPanel() {
  const {
    trunkOpen, toggleTrunk,
    party, selectedCharacterId, selectCharacter,
    trunkItems,
    depositToTrunk, withdrawFromTrunk,
  } = useGameStore();

  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const activeChar = party.find(p => p.id === selectedCharacterId) || party[0];

  if (!trunkOpen) return null;

  const charInventory = activeChar?.inventory || [];
  const isFull = activeChar ? charInventory.length >= activeChar.maxInventorySlots : true;

  return (
    <AnimatePresence>
      {trunkOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) toggleTrunk(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-lg max-h-[85vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Baule</h3>
                <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-xs">
                  {trunkItems.length} oggetti
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTrunk}
                className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Character selector */}
            <div className="flex gap-2 p-2 border-b border-white/[0.06] shrink-0">
              {party.filter(p => p.currentHp > 0).map(char => (
                <button
                  key={char.id}
                  onClick={() => selectCharacter(char.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                    char.id === (activeChar?.id)
                      ? 'border-amber-500/30 bg-amber-950/20 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.05]'
                  }`}
                >
                  {char.avatarUrl ? (
                    <img src={char.avatarUrl} alt="" className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px]">
                      {char.name[0]}
                    </div>
                  )}
                  <span className="font-medium truncate max-w-[60px]">{char.name}</span>
                  <span className="text-[10px] text-white/30">{char.inventory.length}/{char.maxInventorySlots}</span>
                </button>
              ))}
            </div>

            {/* Tab selector */}
            <div className="flex border-b border-white/[0.06] shrink-0">
              <button
                onClick={() => setTab('deposit')}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'deposit'
                    ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-950/10'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Deposita
              </button>
              <button
                onClick={() => setTab('withdraw')}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'withdraw'
                    ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/10'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" /> Preleva
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 inventory-scrollbar">
              {tab === 'deposit' ? (
                /* Deposit: show character inventory */
                charInventory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Inventario vuoto.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {charInventory.map(item => (
                      <motion.div
                        key={item.uid}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ItemIcon itemId={item.itemId} size={28} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate font-medium">
                              {item.name}
                              {item.quantity > 1 && <span className="text-white/40 ml-1">×{item.quantity}</span>}
                            </p>
                            <p className="text-[10px] text-white/30">
                              {item.type === 'weapon' && item.isEquipped ? '⚡ Equipaggiato' : item.type}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => activeChar && depositToTrunk(activeChar.id, item.uid)}
                          className="h-7 px-2 text-[10px] bg-amber-900/30 border border-amber-700/30 text-amber-300 hover:bg-amber-800/40 shrink-0"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                /* Withdraw: show trunk items */
                trunkItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Il baule è vuoto.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {trunkItems.map(item => (
                      <motion.div
                        key={item.uid}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ItemIcon itemId={item.itemId} size={28} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate font-medium">
                              {item.name}
                              {item.quantity > 1 && <span className="text-white/40 ml-1">×{item.quantity}</span>}
                            </p>
                            <p className="text-[10px] text-white/30">{item.type}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => activeChar && withdrawFromTrunk(activeChar.id, item.uid)}
                          disabled={isFull}
                          className="h-7 px-2 text-[10px] bg-cyan-900/30 border border-cyan-700/30 text-cyan-300 hover:bg-cyan-800/40 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowUpFromLine className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    ))}
                    {isFull && (
                      <p className="text-[10px] text-red-400 text-center mt-2">
                        ⚠ Inventario di {activeChar?.name} pieno!
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
