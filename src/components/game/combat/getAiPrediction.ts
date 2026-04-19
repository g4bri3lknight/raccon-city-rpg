import type { CombatAction, Character, EnemyInstance, ItemInstance } from '@/game/types';
import { getSpecialById } from '@/game/data/loader';
import { resolveSpecialId } from '@/game/engine/combat';

/**
 * Pure function that predicts which action the auto-combat AI will pick
 * for the current character. Used to highlight the predicted action in
 * the action menu.
 */
export function getAiPrediction(
  autoCombat: boolean,
  isPlayerTurn: boolean,
  currentCharacter: Character | undefined,
  specialCd: number,
  special2Cd: number,
  aliveParty: Character[],
  aliveEnemies: EnemyInstance[],
  usableItems: ItemInstance[],
): CombatAction | null {
  if (!autoCombat || !isPlayerTurn || !currentCharacter) return null;
  const ch = currentCharacter;
  const sCd = specialCd;
  const s2Cd = special2Cd;
  // Resolve special abilities (supports custom characters)
  const s1 = getSpecialById(resolveSpecialId(ch, 'special1Id') || '');
  const s2 = getSpecialById(resolveSpecialId(ch, 'special2Id') || '');

  if (ch.archetype === 'healer' || (s1?.category === 'support' && s1?.targetType === 'ally')) {
    const woundedCount = aliveParty.filter(p => p.currentHp < p.maxHp * 0.6).length;
    if (woundedCount >= 2 && s2Cd === 0 && s2?.category === 'support') return 'special2' as CombatAction;
    if (aliveParty.some(p => p.currentHp < p.maxHp * 0.5) && sCd === 0) return 'special' as CombatAction;
    return 'attack' as CombatAction;
  }
  if (ch.archetype === 'tank' || (s1?.category === 'defensive')) {
    if (s2Cd === 0 && aliveEnemies.length >= 2) return 'special2' as CombatAction;
    if (sCd === 0 && ch.currentHp < ch.maxHp * 0.7) return 'special' as CombatAction;
    if (ch.currentHp < ch.maxHp * 0.3) return 'defend' as CombatAction;
  }
  if (ch.archetype === 'dps' || (s1?.category === 'offensive')) {
    if (s2Cd === 0 && aliveEnemies.length >= 2) return 'special2' as CombatAction;
    if (sCd === 0) return 'special' as CombatAction;
  }
  if (ch.archetype === 'control' || (s1?.category === 'control')) {
    if (s2Cd === 0 && aliveEnemies.length >= 2) return 'special2' as CombatAction;
    if (sCd === 0) return 'special' as CombatAction;
  }
  if (ch.archetype === 'custom') {
    // Custom character AI logic based on first special
    if (s1?.category === 'support' && aliveParty.some(p => p.currentHp < p.maxHp * 0.5) && sCd === 0) return 'special' as CombatAction;
    if (s1?.category === 'defensive' && ch.currentHp < ch.maxHp * 0.5 && sCd === 0) return 'special' as CombatAction;
    if (s1?.category === 'offensive' && sCd === 0) return 'special' as CombatAction;
  }
  // Predict item usage: cure status, heal_full for critical, or regular heal
  const hasStatusCure = aliveParty.some(p => p.statusEffects.includes('poison') || p.statusEffects.includes('bleeding'));
  if (hasStatusCure && usableItems.some(i => i.effects?.some(e => e.type === 'remove_status'))) return 'use_item' as CombatAction;
  const worstAlly = aliveParty.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
  const hasFullHeal = usableItems.some(i => i.effects?.some(e => e.type === 'heal' && (e as any).percent >= 100));
  if (worstAlly.currentHp / worstAlly.maxHp < 0.35 && hasFullHeal) return 'use_item' as CombatAction;
  const hasHeal = usableItems.some(i => i.effects?.some(e => e.type === 'heal'));
  if (worstAlly.currentHp / worstAlly.maxHp < 0.55 && hasHeal) return 'use_item' as CombatAction;
  return 'attack' as CombatAction;
}
