'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Wrench, Package, ChevronDown, ChevronRight, Check, Minus, User } from 'lucide-react';
import { CRAFTING_RECIPES, CRAFTING_CATEGORY_LABELS, CRAFTING_DIFFICULTY_LABELS } from '@/game/data/crafting';
import { ITEMS } from '@/game/data/items';
import { CraftingRecipe, CraftingCategory } from '@/game/data/crafting';
import { ItemInstance } from '@/game/types';
import ItemIcon from '@/components/game/ItemIcon';

export default function CraftingPanel() {
  const {
    craftingOpen, toggleCrafting,
    party, selectedCharacterId, selectCharacter,
    craftItem,
  } = useGameStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<CraftingCategory>>(new Set(['ammo', 'healing', 'booster']));
  const activeChar = party.find(p => p.id === selectedCharacterId) || party[0];

  if (!craftingOpen) return null;

  const charInventory = activeChar?.inventory || [];

  // Group recipes by category
  const recipesByCategory: Record<CraftingCategory, CraftingRecipe[]> = {
    ammo: CRAFTING_RECIPES.filter(r => r.category === 'ammo'),
    healing: CRAFTING_RECIPES.filter(r => r.category === 'healing'),
    booster: CRAFTING_RECIPES.filter(r => r.category === 'booster'),
  };

  // Count available craftable times for a recipe
  function getCraftableCount(recipe: CraftingRecipe): number {
    let maxCraftable = Infinity;
    for (const ing of recipe.ingredients) {
      const owned = charInventory.find(i => i.itemId === ing.itemId);
      const available = owned ? owned.quantity : 0;
      const possible = Math.floor(available / ing.quantity);
      maxCraftable = Math.min(maxCraftable, possible);
    }
    return maxCraftable;
  }

  // Check if character has all ingredients
  function canCraft(recipe: CraftingRecipe): boolean {
    return getCraftableCount(recipe) > 0;
  }

  // Get ingredient ownership status
  function getIngredientStatus(itemId: string, required: number): { owned: number; hasEnough: boolean } {
    const item = charInventory.find(i => i.itemId === itemId);
    const owned = item ? item.quantity : 0;
    return { owned, hasEnough: owned >= required };
  }

  // Get crafting material items from inventory
  const materialItems = charInventory.filter(i => i.type === 'material');

  // Check if inventory would be full after crafting
  function wouldBeFull(recipe: CraftingRecipe): boolean {
    if (!activeChar) return true;
    const resultDef = ITEMS[recipe.result.itemId];
    if (!resultDef) return true;
    const isStackable = resultDef.type === 'ammo' || resultDef.type === 'healing' || resultDef.type === 'antidote' || resultDef.type === 'material';
    const existingStack = isStackable ? charInventory.find(i => i.itemId === recipe.result.itemId) : null;
    if (existingStack) return false; // stacks, so always room
    return activeChar.inventory.length >= activeChar.maxInventorySlots;
  }

  function toggleCategory(cat: CraftingCategory) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const categories: CraftingCategory[] = ['ammo', 'healing', 'booster'];

  return (
    <AnimatePresence>
      {craftingOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) toggleCrafting(); }}
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
                <Wrench className="w-4 h-4 text-orange-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Banco di Lavoro</h3>
                <Badge className="bg-orange-900/50 text-orange-300 border-orange-700/30 text-xs">
                  {CRAFTING_RECIPES.length} ricette
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCrafting}
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
                      ? 'border-orange-500/30 bg-orange-950/20 text-white'
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

            {/* Material inventory summary */}
            {materialItems.length > 0 && (
              <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Materiali disponibili</p>
                <div className="flex flex-wrap gap-1.5">
                  {materialItems.map(item => (
                    <div key={item.uid} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                      <ItemIcon itemId={item.itemId} size={14} />
                      <span className="text-[10px] text-white/60">{item.name}</span>
                      <span className="text-[10px] font-bold text-white/80">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe list */}
            <div className="flex-1 overflow-y-auto p-3 inventory-scrollbar">
              <div className="space-y-3">
                {categories.map(cat => {
                  const catInfo = CRAFTING_CATEGORY_LABELS[cat];
                  const recipes = recipesByCategory[cat];
                  const isExpanded = expandedCategories.has(cat);

                  return (
                    <div key={cat}>
                      {/* Category header */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full flex items-center gap-2 mb-2"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                        )}
                        <span className={`text-xs font-bold uppercase tracking-wider ${catInfo.color}`}>
                          {catInfo.icon} {catInfo.name}
                        </span>
                        <span className="text-[10px] text-white/30">({recipes.length})</span>
                      </button>

                      {/* Recipes */}
                      {isExpanded && (
                        <div className="space-y-2 ml-1">
                          {recipes.map(recipe => {
                            const craftable = canCraft(recipe);
                            const craftableCount = getCraftableCount(recipe);
                            const isFull = wouldBeFull(recipe);
                            const canActuallyCraft = craftable && !isFull;
                            const resultDef = ITEMS[recipe.result.itemId];
                            const diffInfo = CRAFTING_DIFFICULTY_LABELS[recipe.difficulty];

                            return (
                              <motion.div
                                key={recipe.id}
                                whileHover={{ scale: 1.005 }}
                                className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                              >
                                {/* Recipe header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{recipe.icon}</span>
                                    <div>
                                      <p className="text-sm font-bold text-white">{recipe.name}</p>
                                      <p className="text-[10px] text-white/40">{recipe.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-medium ${diffInfo.color}`}>
                                      {diffInfo.name}
                                    </span>
                                    {craftableCount > 0 && (
                                      <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700/30 text-[10px] px-1.5">
                                        ×{craftableCount}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Ingredients */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {recipe.ingredients.map(ing => {
                                    const status = getIngredientStatus(ing.itemId, ing.quantity);
                                    const ingDef = ITEMS[ing.itemId];
                                    return (
                                      <div
                                        key={ing.itemId}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                                          status.hasEnough
                                            ? 'border-emerald-700/30 bg-emerald-950/10 text-emerald-300'
                                            : 'border-red-700/30 bg-red-950/10 text-red-300'
                                        }`}
                                      >
                                        <span>{ingDef?.icon}</span>
                                        <span>{ingDef?.name || ing.itemId}</span>
                                        <span className="font-bold">{status.owned}/{ing.quantity}</span>
                                        {status.hasEnough ? (
                                          <Check className="w-2.5 h-2.5" />
                                        ) : (
                                          <Minus className="w-2.5 h-2.5" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Result + Craft button */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-white/30">Risultato:</span>
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/20 border border-amber-700/20">
                                      <span>{resultDef?.icon}</span>
                                      <span className="text-[10px] text-amber-200">{resultDef?.name}</span>
                                      <span className="text-[10px] font-bold text-amber-300">×{recipe.result.quantity}</span>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => activeChar && craftItem(recipe.id, activeChar.id)}
                                    disabled={!canActuallyCraft}
                                    className={`h-7 px-3 text-[10px] shrink-0 ${
                                      canActuallyCraft
                                        ? 'bg-orange-900/40 border border-orange-700/30 text-orange-300 hover:bg-orange-800/50'
                                        : 'bg-white/[0.03] border border-white/[0.06] text-white/20 cursor-not-allowed'
                                    }`}
                                  >
                                    <Wrench className="w-3 h-3 mr-1" />
                                    Crea
                                  </Button>
                                </div>

                                {isFull && craftable && (
                                  <p className="text-[10px] text-red-400 mt-1.5">
                                    ⚠ Inventario di {activeChar?.name} pieno!
                                  </p>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
