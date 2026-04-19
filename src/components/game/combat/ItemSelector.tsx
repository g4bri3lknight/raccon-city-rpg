'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ItemIcon from '@/components/game/ItemIcon';
import { getItemEffectDescriptions } from '@/game/utils/item-effects';
import type { ItemSelectorProps } from './types';

export default function ItemSelector({
  show,
  isPlayerTurn,
  usableItems,
  hoveredItem,
  onItemSelect,
  onHoverItem,
  onCancel,
}: ItemSelectorProps) {
  return (
    <>
      {/* ═══ DESKTOP: Floating item select ═══ */}
      <AnimatePresence>
        {show && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.12 }}
            className="hidden lg:flex flex-col absolute z-40 right-44 sm:right-52 bottom-2 sm:bottom-3 glass-dark rounded-lg overflow-hidden"
            style={{ width: '370px', height: '240px' }}
          >
            {/* Header — spans full width */}
            <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-white/[0.06]">
              <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">🎒 Oggetti</span>
              <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body: grid + details */}
            <div className="flex flex-1 min-h-0">
              {/* Col 1: item grid */}
              <div className="shrink-0 border-r border-white/[0.06] flex flex-col" style={{ width: '196px' }}>
                {usableItems.length === 0 ? (
                  <p className="text-gray-500 text-[10px] px-2.5 py-3">Nessun oggetto.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 px-2.5 py-2 flex-1 overflow-y-auto inventory-scrollbar content-start">
                    {usableItems.map(item => {
                      const isHov = hoveredItem?.uid === item.uid;
                      return (
                        <button
                          key={item.uid}
                          onClick={() => onItemSelect(item.uid)}
                          onMouseEnter={() => onHoverItem(item)}
                          onMouseLeave={() => onHoverItem(null)}
                          style={{ width: '52px', height: '52px' }}
                          className={`rounded-md border-2 flex items-center justify-center p-1 transition-colors duration-100 relative shrink-0 ${
                            isHov
                              ? 'border-amber-700 bg-amber-950/30'
                              : 'border-white/[0.08] bg-white/[0.04] hover:border-amber-700/60 hover:bg-white/[0.06]'
                          }`}
                        >
                          <ItemIcon itemId={item.itemId} rarity={item.rarity} className="!w-full !h-full" />
                          {item.quantity > 1 && (
                            <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-black/80 text-white/90 rounded-full w-6 h-6 flex items-center justify-center font-bold border border-white/[0.15]">
                              {item.quantity}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Col 2: detail panel — fixed width, always rendered */}
              <div className="flex-1 min-w-0 max-w-[174px] bg-white/[0.02] p-2.5 overflow-hidden">
                {hoveredItem ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="font-bold text-white text-sm truncate leading-tight">{hoveredItem.name}</span>
                      {hoveredItem.quantity > 1 && (
                        <span className="text-[11px] bg-white/10 text-white/60 rounded px-1.5 py-0.5 leading-none shrink-0">x{hoveredItem.quantity}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-white/50 leading-relaxed mb-1.5" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hoveredItem.description}</p>
                    {(() => {
                      const descs = getItemEffectDescriptions(hoveredItem);
                      if (descs.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 text-xs">
                          {descs.map((d, i) => (
                            <span key={i} className={d.color}>{d.emoji}{d.text}</span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-xs text-white/20 italic text-center leading-snug">Passa sopra un<br/>oggetto</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE: Item select ═══ */}
      <AnimatePresence>
        {show && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="lg:hidden shrink-0 px-2 pb-1.5"
          >
            <div className="glass-dark rounded-xl flex flex-col overflow-hidden mx-auto" style={{ maxWidth: '400px', height: '170px' }}>
              {/* Header — spans full width */}
              <div className="flex items-center justify-between px-2.5 py-1.5 shrink-0 border-b border-white/[0.06]">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">🎒 Oggetti</span>
                <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Body: grid + details */}
              <div className="flex flex-1 min-h-0">
                {/* Col 1: item grid */}
                <div className="shrink-0 border-r border-white/[0.06] flex flex-col" style={{ width: '170px' }}>
                  {usableItems.length === 0 ? (
                    <p className="text-gray-500 text-[9px] px-2 py-2">Nessun oggetto.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 px-2 py-1.5 flex-1 overflow-y-auto inventory-scrollbar content-start">
                      {usableItems.map(item => {
                        const isHov = hoveredItem?.uid === item.uid;
                        return (
                          <button
                            key={item.uid}
                            onClick={() => onItemSelect(item.uid)}
                            onMouseEnter={() => onHoverItem(item)}
                            onMouseLeave={() => onHoverItem(null)}
                            style={{ width: '48px', height: '48px' }}
                            className={`rounded border-2 flex items-center justify-center p-1 transition-colors duration-100 relative shrink-0 ${
                              isHov
                                ? 'border-amber-700 bg-amber-950/30'
                                : 'border-white/[0.08] bg-white/[0.04] active:bg-white/[0.06] hover:border-amber-700/60'
                            }`}
                          >
                            <ItemIcon itemId={item.itemId} rarity={item.rarity} className="!w-full !h-full" />
                            {item.quantity > 1 && (
                            <span className="absolute -top-1 -right-1 text-[9px] bg-black/80 text-white/90 rounded-full w-5 h-5 flex items-center justify-center font-bold border border-white/[0.15]">
                                {item.quantity}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Col 2: detail panel — fixed width */}
                <div className="flex-1 min-w-0 max-w-[220px] bg-white/[0.02] p-2 overflow-hidden">
                  {hoveredItem ? (
                    <div className="flex flex-col h-full">
                      <span className="font-bold text-white text-[13px] truncate leading-tight mb-1">{hoveredItem.name}</span>
                      <p className="text-xs text-white/45 leading-relaxed mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hoveredItem.description}</p>
                      {(() => {
                        const descs = getItemEffectDescriptions(hoveredItem);
                        if (descs.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {descs.map((d, i) => (
                              <span key={i} className={d.color}>{d.emoji}{d.text}</span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[8px] text-white/20 italic text-center">Tocca un oggetto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
