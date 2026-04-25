'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/game/store';
import { ITEMS, RECIPES_DATA } from '@/game/data/loader';
import { QUALITY_LABELS, RARITY_POINTS } from '@/game/data/crafting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer, Check, AlertCircle, Lock, BookOpen, Wrench, Coins, Zap } from 'lucide-react';


type CraftingTab = 'craft' | 'breakdown';

export default function CraftingPanel() {
  const party = useGameStore(s => s.party);
  const craftItem = useGameStore(s => s.craftItem);
  const craftItemWithPoints = useGameStore(s => s.craftItemWithPoints);
  const breakdownItem = useGameStore(s => s.breakdownItem);
  const discoveredRecipes = useGameStore(s => s.discoveredRecipes);
  const ngPlusCycle = useGameStore(s => s.ngPlusCycle);
  const craftingPoints = useGameStore(s => s.craftingPoints) || 0;
  const [activeTab, setActiveTab] = useState<CraftingTab>('craft');

  const recipes = RECIPES_DATA;

  // Filter: show non-hidden recipes + discovered hidden recipes
  // NG+ exclusive recipes only show when ngPlusCycle >= 1
  const effectiveRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (r.ngPlusOnly && ngPlusCycle < 1) return false;
      return true;
    });
  }, [recipes, ngPlusCycle]);

  const totalRecipes = effectiveRecipes.length;
  const hiddenCount = effectiveRecipes.filter(r => r.hidden).length;
  const discoveredCount = hiddenCount - effectiveRecipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;

  // Filter: show non-hidden recipes + discovered hidden recipes
  const visibleRecipes = useMemo(() => {
    return effectiveRecipes
      .map((recipe, originalIndex) => ({ recipe, originalIndex }))
      .filter(({ recipe }) => !recipe.hidden || discoveredRecipes.includes(recipe.id));
  }, [effectiveRecipes, discoveredRecipes]);

  const ingredientAvailability = useMemo(() => {
    const counts: Record<string, number> = {};
    const allSources = party.flatMap(p => p.inventory);
    for (const item of allSources) {
      counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
    }

    return visibleRecipes.map(({ recipe, originalIndex }) => {
      const canCraft = !recipe.pointOnly && recipe.ingredients.every(ing => (counts[ing.itemId] || 0) >= ing.quantity);
      const ingredientStatus = recipe.ingredients.map(ing => ({
        itemId: ing.itemId,
        qty: ing.quantity,
        have: counts[ing.itemId] || 0,
        enough: (counts[ing.itemId] || 0) >= ing.quantity,
        itemDef: ITEMS[ing.itemId],
      }));
      const resultDef = ITEMS[recipe.result.itemId];

      // Check if can craft with points
      const canCraftWithPoints = !recipe.pointOnly && (recipe.pointCost || 0) > 0 && craftingPoints >= (recipe.pointCost || 0);
      // Point-only recipes: check if enough points
      const canCraftPointsOnly = recipe.pointOnly && (recipe.pointCost || 0) > 0 && craftingPoints >= (recipe.pointCost || 0);

      return { recipe, originalIndex, canCraft, canCraftWithPoints, canCraftPointsOnly, ingredientStatus, resultDef };
    });
  }, [party, visibleRecipes, craftingPoints]);

  const undiscoveredCount = effectiveRecipes.filter(r => r.hidden && !discoveredRecipes.includes(r.id)).length;

  return (
    <div className="space-y-1.5 sm:space-y-2.5">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2.5">
        <Hammer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        <h3 className="text-sm sm:text-base font-bold text-white/90">Crafting</h3>
        <Badge className="text-xs bg-amber-900/40 text-amber-300 border-amber-700/30 ml-auto">
          {discoveredCount}/{totalRecipes} ricette
        </Badge>
        {ngPlusCycle >= 1 && (
          <Badge className="text-[10px] bg-orange-900/40 text-orange-300 border-orange-700/30">
            ✨ NG+ Ciclo {ngPlusCycle}
          </Badge>
        )}
      </div>

      {/* Crafting Points display */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/20 border border-amber-800/20">
        <Coins className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs text-amber-200 font-medium">Punti Craft:</span>
        <Badge className="text-xs bg-amber-900/50 text-amber-300 border-amber-700/30 ml-auto">
          {craftingPoints}
        </Badge>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-white/[0.06] bg-white/[0.02]">
        <button
          onClick={() => setActiveTab('craft')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
            activeTab === 'craft'
              ? 'border-amber-500/40 text-amber-300 bg-white/[0.06]'
              : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
          }`}
        >
          <Hammer className="w-3.5 h-3.5" /> Craft
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
            activeTab === 'breakdown'
              ? 'border-red-500/40 text-red-300 bg-white/[0.06]'
              : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" /> Smonta
        </button>
      </div>

      {/* Crafting Tab */}
      {activeTab === 'craft' && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[44vh] sm:max-h-[50vh] overflow-y-auto inventory-scrollbar pr-1.5">
          {ingredientAvailability.map((entry) => {
            const { recipe, originalIndex, canCraft, canCraftWithPoints, canCraftPointsOnly, ingredientStatus, resultDef } = entry;
            const isPointOnly = recipe.pointOnly;

            return (
              <div
                key={recipe.id || originalIndex}
                className={`p-2 sm:p-3 rounded-lg border transition-all ${
                  canCraft || canCraftWithPoints || canCraftPointsOnly
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
                  {(canCraft || canCraftWithPoints || canCraftPointsOnly) ? (
                    <Badge className="text-[10px] bg-green-900/50 text-green-300 border-green-700/30 shrink-0">
                      <Check className="w-3 h-3 mr-1" /> Pronto
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-white/[0.04] text-white/30 border-white/[0.06] shrink-0">
                      <AlertCircle className="w-3 h-3 mr-1" /> Mancano
                    </Badge>
                  )}
                </div>

                {/* Ingredients or point-only indicator */}
                <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                  {isPointOnly ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-amber-700/30 bg-amber-950/20 text-amber-300">
                        <Zap className="w-3 h-3" /> Costo: {recipe.pointCost} Punti Craft
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-green-700/30 bg-green-950/20 text-green-300">
                        → {resultDef?.icon} {resultDef?.name} x{recipe.result.quantity}
                      </span>
                    </>
                  ) : (
                    ingredientStatus.map((ing, ingIdx) => (
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
                    ))
                  )}
                </div>

                {/* Craft buttons */}
                <div className="flex gap-1.5">
                  {/* Standard ingredient craft button */}
                  {!isPointOnly && (
                    <Button
                      size="sm"
                      onClick={() => craftItem(originalIndex)}
                      disabled={!canCraft}
                      className={`flex-1 min-h-[44px] h-auto sm:h-7 text-xs sm:text-sm font-semibold bg-transparent transition-all ${
                        canCraft
                          ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                          : 'border-white/[0.06] text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Craft:</span> {resultDef?.icon} {resultDef?.name} x{recipe.result.quantity}
                    </Button>
                  )}

                  {/* Points craft button */}
                  {(recipe.pointCost || 0) > 0 && (
                    <Button
                      size="sm"
                      onClick={() => craftItemWithPoints(originalIndex)}
                      disabled={!canCraftWithPoints && !canCraftPointsOnly}
                      title={`Costa ${recipe.pointCost} punti`}
                      className={`min-h-[44px] h-auto sm:h-7 text-xs sm:text-sm font-semibold bg-transparent transition-all px-3 ${
                        (canCraftWithPoints || canCraftPointsOnly)
                          ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/50'
                          : 'border-white/[0.06] text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden sm:inline">{isPointOnly ? 'Craft con Punti' : 'Punti'}</span>
                      <span className="sm:hidden">{recipe.pointCost}pt → {resultDef?.icon}{recipe.result.quantity}</span>
                    </Button>
                  )}
                </div>
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
      )}

      {/* Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[44vh] sm:max-h-[50vh] overflow-y-auto inventory-scrollbar pr-1.5">
          <div className="text-center px-3 py-2">
            <p className="text-[11px] text-white/30">Smonta oggetti per ottenere Punti Craft usabili nel crafting.</p>
            <p className="text-[10px] text-white/20 mt-0.5">Armi, equipaggiamento e oggetti unici non possono essere smontati.</p>
          </div>
          {party.map((char) => (
            <div key={char.id} className="mb-2">
              <div className="text-[10px] text-white/40 font-medium mb-1 px-0.5">
                {char.name}
              </div>
              <div className="space-y-1">
                {char.inventory
                  .filter(item => {
                    // Can't break down: weapons, armor, accessories, mods, collectibles, bags, equipped, key items
                    if (item.isEquipped) return false;
                    if (['weapon', 'armor', 'accessory', 'weapon_mod', 'collectible', 'bag'].includes(item.type)) return false;
                    if (item.type === 'utility' && item.itemId.startsWith('key_')) return false;
                    return true;
                  })
                  .map((item) => {
                    const points = RARITY_POINTS[item.rarity] || 1;
                    return (
                      <div
                        key={item.uid}
                        className="flex items-center justify-between p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{item.icon}</span>
                          <div className="min-w-0">
                            <span className="text-[11px] sm:text-xs text-white/70 truncate block">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-white/30">x{item.quantity}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="text-[10px] bg-white/[0.04] text-white/40 border-white/[0.06]">
                            +{points}pt
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => breakdownItem(char.id, item.uid)}
                            className="min-w-[44px] min-h-[32px] h-auto px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-red-900/30 transition-all"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                {char.inventory.filter(item => {
                  if (item.isEquipped) return false;
                  if (['weapon', 'armor', 'accessory', 'weapon_mod', 'collectible', 'bag'].includes(item.type)) return false;
                  if (item.type === 'utility' && item.itemId.startsWith('key_')) return false;
                  return true;
                }).length === 0 && (
                  <p className="text-[10px] text-white/20 text-center py-2 px-3">
                    Nessun oggetto smontabile per {char.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
