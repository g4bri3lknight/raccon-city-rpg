'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/game/store';
import { ITEMS, RECIPES_DATA } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer, Check, AlertCircle } from 'lucide-react';

export default function CraftingPanel() {
  const party = useGameStore(s => s.party);
  const itemBoxItems = useGameStore(s => s.itemBoxItems);
  const craftItem = useGameStore(s => s.craftItem);

  const recipes = RECIPES_DATA;

  const ingredientAvailability = useMemo(() => {
    const counts: Record<string, number> = {};
    const allSources = [...itemBoxItems, ...party.flatMap(p => p.inventory)];
    for (const item of allSources) {
      counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
    }

    return recipes.map(recipe => {
      const canCraft = recipe.ingredients.every(ing => (counts[ing.itemId] || 0) >= ing.quantity);
      const ingredientStatus = recipe.ingredients.map(ing => ({
        itemId: ing.itemId,
        qty: ing.quantity,
        have: counts[ing.itemId] || 0,
        enough: (counts[ing.itemId] || 0) >= ing.quantity,
        itemDef: ITEMS[ing.itemId],
      }));
      const resultDef = ITEMS[recipe.result.itemId];
      return { recipe, canCraft, ingredientStatus, resultDef };
    });
  }, [party, itemBoxItems, recipes]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Hammer className="w-5 h-5 text-amber-400" />
        <h3 className="text-base font-bold text-white/90">Crafting</h3>
        <Badge className="text-xs bg-amber-900/40 text-amber-300 border-amber-700/30 ml-auto">
          {recipes.length} ricette
        </Badge>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto inventory-scrollbar pr-1.5">
        {ingredientAvailability.map((entry, idx) => {
          const { recipe, canCraft, ingredientStatus, resultDef } = entry;
          return (
            <div
              key={recipe.id || idx}
              className={`p-3 rounded-lg border transition-all ${
                canCraft
                  ? 'border-green-500/20 bg-green-950/10 hover:border-green-500/30'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white/90 truncate">
                    {recipe.icon} {recipe.name}
                  </div>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">
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
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {ingredientStatus.map((ing, ingIdx) => (
                  <span
                    key={ingIdx}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
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
                onClick={() => craftItem(idx)}
                disabled={!canCraft}
                className={`w-full h-7 text-sm font-semibold bg-transparent transition-all ${
                  canCraft
                    ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                    : 'border-white/[0.06] text-white/20 cursor-not-allowed'
                }`}
              >
                <Hammer className="w-3.5 h-3.5 mr-1.5" />
                Craft: {resultDef?.icon} {resultDef?.name} x{recipe.result.quantity}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
