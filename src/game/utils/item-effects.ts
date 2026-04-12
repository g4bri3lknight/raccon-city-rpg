/**
 * Shared helpers for reading item effect info from the atomic effects[] system.
 */

import type { ItemInstance, SpecialEffect } from '../types';

/** Get the first on_use heal effect info from an item */
export function getItemHealInfo(item: ItemInstance): { amount: number; percent: boolean; isFullHeal: boolean } | null {
  const healEffect = item.effects?.find(e => e.type === 'heal' && (!e.trigger || e.trigger === 'on_use'));
  if (healEffect && healEffect.type === 'heal') {
    const isPercent = 'percent' in healEffect && (healEffect as any).percent !== undefined;
    const amount = isPercent ? (healEffect as any).percent : (healEffect as any).amount || 0;
    return { amount, percent: isPercent, isFullHeal: isPercent && amount >= 100 };
  }
  return null;
}

/** Check if an item can cure status effects */
export function getItemHasStatusCure(item: ItemInstance): boolean {
  return !!(item.effects?.some(e => e.type === 'remove_status' && (!e.trigger || e.trigger === 'on_use')));
}

/** Get the target of the first on_use effect */
export function getItemEffectTarget(item: ItemInstance): string | undefined {
  const firstOnUse = item.effects?.find(e => !e.trigger || e.trigger === 'on_use');
  return firstOnUse?.target;
}

/** Get the add_slots amount from an item's effects array */
export function getAddSlotsAmount(effects: SpecialEffect[] | undefined): number | null {
  if (!effects || effects.length === 0) return null;
  const slotEffect = effects.find(e => e.type === 'add_slots' && (!e.trigger || e.trigger === 'on_use'));
  if (!slotEffect || slotEffect.type !== 'add_slots') return null;
  return slotEffect.amount || 0;
}

/** Get a human-readable list of effect descriptions for UI display */
export function getItemEffectDescriptions(item: ItemInstance): { emoji: string; text: string; color: string }[] {
  const descriptions: { emoji: string; text: string; color: string }[] = [];

  if (item.effects && item.effects.length > 0) {
    for (const e of item.effects) {
      if (e.trigger && e.trigger !== 'on_use') continue;
      switch (e.type) {
        case 'heal': {
          const isPercent = 'percent' in e && (e as any).percent !== undefined;
          if (isPercent && (e as any).percent >= 100) {
            descriptions.push({ emoji: '❤️', text: 'Ripristina tutti gli HP', color: 'text-green-400/80' });
          } else if (isPercent) {
            descriptions.push({ emoji: '❤️', text: `Cura ${(e as any).percent}% HP`, color: 'text-green-400/80' });
          } else {
            descriptions.push({ emoji: '❤️', text: `Cura ${(e as any).amount} HP`, color: 'text-green-400/80' });
          }
          break;
        }
        case 'remove_status': {
          const statusNames = ((e as any).statuses || []).map((s: string) =>
            s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s
          );
          if (statusNames.length > 0) {
            descriptions.push({ emoji: '✨', text: `Cura ${statusNames.join(', ')}`, color: 'text-purple-400/80' });
          }
          break;
        }
        case 'add_slots': {
          descriptions.push({ emoji: '🧳', text: `+${(e as any).amount || 0} slot inventario`, color: 'text-amber-400/80' });
          break;
        }
        case 'buff_stat': {
          const statName = (e as any).stat === 'atk' ? 'ATK' : (e as any).stat === 'def' ? 'DEF' : (e as any).stat === 'spd' ? 'SPD' : (e as any).stat || '';
          descriptions.push({ emoji: '⬆️', text: `+${(e as any).amount || 0} ${statName}`, color: 'text-blue-400/80' });
          break;
        }
        case 'shield': {
          descriptions.push({ emoji: '🛡️', text: `Scudo ${(e as any).amount || 0} HP`, color: 'text-cyan-400/80' });
          break;
        }
      }
    }
    // Target info
    const firstTarget = item.effects.find(e => !e.trigger || e.trigger === 'on_use')?.target;
    if (firstTarget === 'one_ally') descriptions.push({ emoji: '🎯', text: 'Bersaglio: Alleato', color: 'text-cyan-400/70' });
    else if (firstTarget === 'all_allies') descriptions.push({ emoji: '🎯', text: 'Bersaglio: Tutti', color: 'text-cyan-400/70' });
    else if (firstTarget === 'all_enemies') descriptions.push({ emoji: '🎯', text: 'Bersaglio: Tutti i Nemici', color: 'text-cyan-400/70' });
  }

  return descriptions;
}
