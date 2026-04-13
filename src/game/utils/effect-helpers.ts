/**
 * Helper functions to extract stat bonuses and special effects from
 * atomic effects arrays (SpecialEffect[]).
 *
 * Used by UI components to display equipment/mod/weapon stats without
 * referencing legacy bonus fields.
 */

import type { SpecialEffect } from '@/game/types';

/**
 * Get a flat stat bonus from on_equip buff_stat effects.
 */
export function getEquipStatBonus(
  effects: SpecialEffect[] | undefined,
  stat: 'atk' | 'def' | 'hp' | 'spd' | 'crit',
): number {
  if (!effects) return 0;
  return effects
    .filter(
      (e) =>
        e.type === 'buff_stat' &&
        e.stat === stat &&
        e.trigger === 'on_equip' &&
        (e as any).flat,
    )
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Get a status resistance label from on_equip status_resist effects.
 * Returns a display-ready string like "🧪 Veleno 50%" or null.
 */
export function getStatusResistLabel(
  effects: SpecialEffect[] | undefined,
): string | null {
  if (!effects) return null;
  const resist = effects.find(
    (e) => e.type === 'status_resist' && e.trigger === 'on_equip',
  );
  if (!resist) return null;
  const labels: Record<string, string> = {
    poison: '🧪 Veleno',
    bleeding: '🩸 Sangui',
    stunned: '⚡ Stord',
    all: '✨ Tutti',
  };
  return `${labels[(resist as any).statusType] || (resist as any).statusType} ${(resist as any).value}%`;
}

/**
 * Get HoT (Heal-over-Time) value from on_turn_start hot effects.
 */
export function getHotValue(
  effects: SpecialEffect[] | undefined,
): number | null {
  if (!effects) return null;
  const hot = effects.find(
    (e) =>
      e.type === 'hot' && (e.trigger === 'on_turn_start' || !e.trigger),
  );
  return hot ? (hot as any).amountPerTurn ?? (hot as any).amount ?? null : null;
}

/**
 * Get reflect damage percent from on_take_hit reflect effects.
 */
export function getReflectValue(
  effects: SpecialEffect[] | undefined,
): number | null {
  if (!effects) return null;
  const refl = effects.find(
    (e) =>
      e.type === 'reflect' && (e.trigger === 'on_take_hit' || !e.trigger),
  );
  return refl ? (refl as any).percent ?? null : null;
}

/**
 * Get status chance boost from on_equip status_chance_boost effects.
 */
export function getStatusChanceBoost(
  effects: SpecialEffect[] | undefined,
): number {
  if (!effects) return 0;
  return effects
    .filter(
      (e) =>
        e.type === 'status_chance_boost' &&
        (e.trigger === 'on_equip' || !e.trigger),
    )
    .reduce((sum, e) => sum + (e as any).amount, 0);
}

/**
 * Build a full special-effect description string from on_equip/on_turn_start/on_take_hit effects
 * (status_resist, hot, reflect) — useful as a drop-in for the old formatSpecialEffect().
 */
export function getEffectSpecialLabel(
  effects: SpecialEffect[] | undefined,
): string | null {
  if (!effects) return null;
  const parts: string[] = [];

  const resist = getStatusResistLabel(effects);
  if (resist) parts.push(resist);

  const hot = getHotValue(effects);
  if (hot) parts.push(`💚 ${hot} HP/turno`);

  const refl = getReflectValue(effects);
  if (refl) parts.push(`🔥 ${refl}% rifletti`);

  return parts.length > 0 ? parts.join(' · ') : null;
}
