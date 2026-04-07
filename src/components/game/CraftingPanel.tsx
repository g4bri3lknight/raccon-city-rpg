'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/game/store';
import { ITEMS } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer, Check, AlertCircle } from 'lucide-react';

interface CraftingRecipe {
  name: string;
  description: string;
  ingredients: { itemId: string; qty: number }[];
  result: { itemId: string; qty: number };
}

const RECIPES: CraftingRecipe[] = [
  {
    name: 'Erba Mista',
    description: 'Miscuglio di due erbe verdi per una cura più potente.',
    ingredients: [{ itemId: 'herb_green', qty: 2 }],
    result: { itemId: 'herb_mixed', qty: 1 },
  },
  {
    name: 'Spray Medicale (Mista+Rossa)',
    description: 'Erba Mista + Erba Rossa → Spray potente.',
    ingredients: [{ itemId: 'herb_mixed', qty: 1 }, { itemId: 'herb_red', qty: 1 }],
    result: { itemId: 'spray', qty: 1 },
  },
  {
    name: 'Spray Medicale (Verde+Rossa)',
    description: 'Erba Verde + Erba Rossa → Spray Medicale.',
    ingredients: [{ itemId: 'herb_green', qty: 1 }, { itemId: 'herb_red', qty: 1 }],
    result: { itemId: 'spray', qty: 1 },
  },
  {
    name: 'Cartucce da Fucile',
    description: 'Ricicla 3 munizioni da pistola in 1 cartuccia da fucile.',
    ingredients: [{ itemId: 'ammo_pistol', qty: 3 }],
    result: { itemId: 'ammo_shotgun', qty: 1 },
  },
  {
    name: 'Munizioni .357 Magnum',
    description: '2 cartucce da fucile → 1 munizione magnum devastante.',
    ingredients: [{ itemId: 'ammo_shotgun', qty: 2 }],
    result: { itemId: 'ammo_magnum', qty: 1 },
  },
  {
    name: 'Spray Antidoto',
    description: 'Erba Verde + Antidoto → 2 Antidoti potenziati.',
    ingredients: [{ itemId: 'herb_green', qty: 1 }, { itemId: 'antidote', qty: 1 }],
    result: { itemId: 'antidote', qty: 2 },
  },
  {
    name: 'Kit Pronto Soccorso',
    description: '3 Bende → Kit medico completo con cura totale.',
    ingredients: [{ itemId: 'bandage', qty: 3 }],
    result: { itemId: 'first_aid', qty: 1 },
  },
  {
    name: 'Granate 40mm',
    description: '5 Munizioni Pistola + Erba Verde → 1 Granata esplosiva.',
    ingredients: [{ itemId: 'ammo_pistol', qty: 5 }, { itemId: 'herb_green', qty: 1 }],
    result: { itemId: 'ammo_grenade', qty: 1 },
  },
  {
    name: 'Spray Potenziato',
    description: '2 Erbe Rosse → Spray Medicale con potenziamento ATK.',
    ingredients: [{ itemId: 'herb_red', qty: 2 }],
    result: { itemId: 'spray', qty: 1 },
  },
];

export default function CraftingPanel() {
  const party = useGameStore(s => s.party);
  const itemBoxItems = useGameStore(s => s.itemBoxItems);
  const craftItem = useGameStore(s => s.craftItem);

  const ingredientAvailability = useMemo(() => {
    const counts: Record<string, number> = {};

    // Count from party + item box
    const allSources = [...itemBoxItems, ...party.flatMap(p => p.inventory)];
    for (const item of allSources) {
      counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
    }

    return RECIPES.map(recipe => {
      const canCraft = recipe.ingredients.every(ing => (counts[ing.itemId] || 0) >= ing.qty);
      const ingredientStatus = recipe.ingredients.map(ing => ({
        ...ing,
        have: counts[ing.itemId] || 0,
        enough: (counts[ing.itemId] || 0) >= ing.qty,
        itemDef: ITEMS[ing.itemId],
      }));
      const resultDef = ITEMS[recipe.result.itemId];
      return { recipe, canCraft, ingredientStatus, resultDef };
    });
  }, [party, itemBoxItems]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Hammer className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white/90">Crafting</h3>
        <Badge className="text-[10px] bg-amber-900/40 text-amber-300 border-amber-700/30 ml-auto">
          {RECIPES.length} ricette
        </Badge>
      </div>

      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto inventory-scrollbar pr-1">
        {ingredientAvailability.map((entry, idx) => {
          const { recipe, canCraft, ingredientStatus, resultDef } = entry;
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border transition-all ${
                canCraft
                  ? 'border-green-500/20 bg-green-950/10 hover:border-green-500/30'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white/90 truncate">
                    {resultDef?.icon} {recipe.name}
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
                    {recipe.description}
                  </p>
                </div>
                {canCraft ? (
                  <Badge className="text-[9px] bg-green-900/50 text-green-300 border-green-700/30 shrink-0">
                    <Check className="w-2.5 h-2.5 mr-0.5" /> Pronto
                  </Badge>
                ) : (
                  <Badge className="text-[9px] bg-white/[0.04] text-white/30 border-white/[0.06] shrink-0">
                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Mancano
                  </Badge>
                )}
              </div>

              {/* Ingredients */}
              <div className="flex flex-wrap gap-1 mb-2">
                {ingredientStatus.map((ing, ingIdx) => (
                  <span
                    key={ingIdx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
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
                className={`w-full h-7 text-[11px] font-semibold bg-transparent transition-all ${
                  canCraft
                    ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                    : 'border-white/[0.06] text-white/20 cursor-not-allowed'
                }`}
              >
                <Hammer className="w-3 h-3 mr-1" />
                Craft: {resultDef?.icon} {resultDef?.name} x{recipe.result.qty}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
