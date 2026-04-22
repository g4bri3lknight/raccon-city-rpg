'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/game/store';
import { ITEMS, RECIPES_DATA } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer, Check, AlertCircle, Lock, BookOpen } from 'lucide-react';

export default function CraftingPanel() {
  const party = useGameStore(s => s.party);
  const craftItem = useGameStore(s => s.craftItem);
  const discoveredRecipes = useGameStore(s => s.discoveredRecipes);

  const recipes = RECIPES_DATA;

  const totalRecipes = recipes.length;
  const hiddenCount = recipes.filter(r => r.hidden).length;
  const discoveredCount = hiddenCount - recipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;

  // Filter: show non-hidden recipes + discovered hidden recipes
  const visibleRecipes = useMemo(() => {
    return recipes
      .map((recipe, originalIndex) => ({ recipe, originalIndex }))
      .filter(({ recipe }) => !recipe.hidden || discoveredRecipes.includes(recipe.id));
  }, [recipes, discoveredRecipes]);

  const ingredientAvailability = useMemo(() => {
    const counts: Record<string, number> = {};
    const allSources = party.flatMap(p => p.inventory);
    for (const item of allSources) {
      counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
    }

    return visibleRecipes.map(({ recipe, originalIndex }) => {
      const canCraft = recipe.ingredients.every(ing => (counts[ing.itemId] || 0) >= ing.quantity);
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
  }, [party, visibleRecipes]);

  const undiscoveredCount = recipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;

  return (
    <div className="space-y-1.5 sm:space-y-2.5">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2.5">
        <Hammer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        <h3 className="text-sm sm:text-base font-bold text-white/90">Crafting</h3>
        <Badge className="text-xs bg-amber-900/40 text-amber-300 border-amber-700/30 ml-auto">
          {discoveredCount}/{totalRecipes} ricette
        </Badge>
      </div>

      <div className="space-y-1.5 sm:space-y-2 max-h-[48vh] sm:max-h-[55vh] overflow-y-auto inventory-scrollbar pr-1.5">
        {ingredientAvailability.map((entry) => {
          const { recipe, originalIndex, canCraft, ingredientStatus, resultDef } = entry;
          return (
            <div
              key={recipe.id || originalIndex}
              className={`p-2 sm:p-3 rounded-lg border transition-all ${
                canCraft
                  ? 'border-green-500/20 bg-green-950/10 hover:border-green-500/30'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white/90 truncate">
                    {recipe.icon} {recipe.name}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 line-clamp-1">
                    {recipe.description}
                  </p>
                </div>
                {canCraft ? (
                  <Badge className="text-[10px] bg-green-900/50 text-green-300 border-green-700/30 shrink-0">
                    <Check className="w-3 h-3 mr-1" /> Pronto
                  </Badge>
                ) : (
                  <Badge className="text-[10px] bg-white/[0.04] text-white/30 border-white/[0.06] shrink-0">
                    <AlertCircle className="w-3 h-3 mr-1" /> Mancano
                  </Badge>
                )}
              </div>

              {/* Ingredients */}
              <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-1.5 sm:mb-2.5">
                {ingredientStatus.map((ing, ingIdx) => (
                  <span
                    key={ingIdx}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs border ${
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
                className={`w-full min-h-[44px] h-auto sm:h-7 text-xs sm:text-sm font-semibold bg-transparent transition-all ${
                  canCraft
                    ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                    : 'border-white/[0.06] text-white/20 cursor-not-allowed'
                }`}
              >
                <Hammer className="w-3.5 h-3.5 sm:mr-1.5" />
                Craft: {resultDef?.icon} {resultDef?.name} x{recipe.result.quantity}
              </Button>
            </div>
          );
        })}

        {/* Undiscovered recipe placeholders */}
        {undiscoveredCount > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-1 px-1">
              <Lock className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[10px] sm:text-xs text-white/25 font-medium">
                {undiscoveredCount} ricetta{undiscoveredCount > 1 ? 'e' : ''} segreta{undiscoveredCount > 1 ? 'e' : ''} da scoprire
              </span>
            </div>
            {Array.from({ length: undiscoveredCount }).map((_, i) => (
              <div
                key={`hidden_${i}`}
                className="p-2 sm:p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] opacity-40"
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
