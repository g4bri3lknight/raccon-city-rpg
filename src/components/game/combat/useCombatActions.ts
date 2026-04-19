'use client';

import { useState, useEffect, useRef } from 'react';
import type { Character, CombatAction, CombatState, EnemyInstance, ItemInstance } from '@/game/types';
import { getSpecialById } from '@/game/data/loader';
import { resolveSpecialId } from '@/game/engine/combat';
import { getCombatSpeed } from './combat-utils';
import { BASE_AUTO_COMBAT_DELAY } from '../SettingsPanel';

export interface UseCombatActionsParams {
  selectCombatAction: (action: CombatAction) => void;
  selectCombatTarget: (targetId: string) => void;
  selectCombatItem: (itemUid: string) => void;
  executeCombatTurn: () => void;
  toggleAutoCombat: () => void;
  executeAutoCombatTurn: () => void;
  combat: CombatState;
  enemies: EnemyInstance[];
  party: Character[];
  autoCombat: boolean;
  isPlayerTurn: boolean;
  isCombatEnd: boolean;
  currentCharacter: Character | undefined;
  aliveEnemies: EnemyInstance[];
  aliveParty: Character[];
  usableItems: ItemInstance[];
}

export interface UseCombatActionsReturn {
  targetingMode: 'enemy' | 'ally' | null;
  pendingAction: CombatAction | null;
  showItemSelect: boolean;
  hoveredItem: ItemInstance | null;
  handleMenuAction: (action: CombatAction) => void;
  handleArenaEnemyClick: (enemyId: string) => void;
  handleArenaAllyClick: (charId: string) => void;
  handleItemSelect: (itemUid: string) => void;
  onHoverItem: (item: ItemInstance | null) => void;
  cancelAll: () => void;
  handleToggleAutoCombat: () => void;
}

/**
 * Manages all combat action UI state and callbacks:
 * - Targeting mode (enemy/ally selection)
 * - Item selection overlay
 * - Action menu → targeting → execute flow
 * - Keyboard shortcuts for targeting
 * - Auto-combat trigger
 * - Menu state reset on turn change
 */
export function useCombatActions(params: UseCombatActionsParams): UseCombatActionsReturn {
  const {
    selectCombatAction,
    selectCombatTarget,
    selectCombatItem,
    executeCombatTurn,
    toggleAutoCombat,
    executeAutoCombatTurn,
    combat,
    enemies,
    party,
    autoCombat,
    isPlayerTurn,
    isCombatEnd,
    currentCharacter,
    aliveEnemies,
    aliveParty,
    usableItems,
  } = params;

  // ── UI state (menu always visible during combat) ──
  const [targetingMode, setTargetingMode] = useState<'enemy' | 'ally' | null>(null);
  const [pendingAction, setPendingAction] = useState<CombatAction | null>(null);
  const [showItemSelect, setShowItemSelect] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ItemInstance | null>(null);

  // Refs for keyboard handler (must be declared before early return)
  const targetingModeRef = useRef<'enemy' | 'ally' | null>(null);
  const showItemSelectRef = useRef(false);
  const aliveEnemiesRef = useRef<typeof enemies>([]);
  const alivePartyRef = useRef<typeof party>([]);

  // Sync refs via effect (not during render)
  useEffect(() => {
    targetingModeRef.current = targetingMode;
    showItemSelectRef.current = showItemSelect;
    aliveEnemiesRef.current = enemies;
    alivePartyRef.current = party;
  }, [targetingMode, showItemSelect, enemies, party]);

  // ── Menu management: reset overlays on turn change (menu stays always open) ──
  useEffect(() => {
    const t = setTimeout(() => {
      setTargetingMode(null);
      setShowItemSelect(false);
      setPendingAction(null);
    }, 100);
    return () => clearTimeout(t);
  }, [combat?.currentActorId]);

  // Keyboard support — reads store methods directly, refs for state
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tm = targetingModeRef.current;
      const doCancel = () => {
        setTargetingMode(null);
        setShowItemSelect(false);
        setPendingAction(null);
      };
      const doTarget = (id: string) => {
        selectCombatTarget(id);
        setTargetingMode(null);
        setPendingAction(null);
        setTimeout(() => executeCombatTurn(), 300);
      };
      if (tm === 'enemy') {
        const num = parseInt(e.key);
        const ae = aliveEnemiesRef.current.filter(x => x.currentHp > 0);
        if (num >= 1 && num <= ae.length) doTarget(ae[num - 1].id);
        else if (e.key === 'Escape') doCancel();
      } else if (tm === 'ally') {
        const num = parseInt(e.key);
        const ap = alivePartyRef.current.filter(x => x.currentHp > 0);
        if (num >= 1 && num <= ap.length) doTarget(ap[num - 1].id);
        else if (e.key === 'Escape') doCancel();
      } else if (showItemSelectRef.current && e.key === 'Escape') {
        doCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectCombatTarget, executeCombatTurn]);

  // ── Auto-combat: trigger AI turn when enabled ──
  useEffect(() => {
    if (autoCombat && isPlayerTurn) {
      const speed = getCombatSpeed();
      const delay = BASE_AUTO_COMBAT_DELAY / speed;
      const timer = setTimeout(() => {
        setTargetingMode(null);
        setShowItemSelect(false);
        setPendingAction(null);
        executeAutoCombatTurn();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [autoCombat, isPlayerTurn, combat?.currentActorId, combat?.turn, executeAutoCombatTurn]);

  // ── Select action from context menu ──
  const handleMenuAction = (action: CombatAction) => {
    selectCombatAction(action);

    if (action === 'attack') {
      setPendingAction('attack');
      setTargetingMode('enemy');
    } else if (action === 'special') {
      const sp1 = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special1Id') || '') : undefined;
      if (!sp1) {
        setPendingAction('special');
        setTargetingMode('enemy');
      } else if (sp1.targetType === 'self') {
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp1.targetType === 'all_allies') {
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp1.targetType === 'lowest_hp_ally') {
        // Auto-target: engine resolves the lowest HP ally automatically
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp1.targetType === 'ally' || sp1.targetType === 'one_ally') {
        setPendingAction('special');
        setTargetingMode('ally');
      } else {
        setPendingAction('special');
        setTargetingMode('enemy');
      }
    } else if (action === 'special2') {
      const sp2 = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special2Id') || '') : undefined;
      if (!sp2) {
        setPendingAction('special2');
        setTargetingMode('enemy');
      } else if (sp2.targetType === 'self') {
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp2.targetType === 'all_allies') {
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp2.targetType === 'lowest_hp_ally') {
        // Auto-target: engine resolves the lowest HP ally automatically
        selectCombatTarget(currentCharacter!.id);
        setTimeout(() => executeCombatTurn(), 300);
      } else if (sp2.targetType === 'ally' || sp2.targetType === 'one_ally') {
        setPendingAction('special2');
        setTargetingMode('ally');
      } else {
        setPendingAction('special2');
        setTargetingMode('enemy');
      }
    } else if (action === 'use_item') {
      if (usableItems.length === 0) return;
      setShowItemSelect(true);
    } else if (action === 'defend') {
      // defend is handled immediately by selectCombatAction in store
    } else if (action === 'flee') {
      if (enemies.some(e => e.isBoss)) return;
      // flee is handled immediately by selectCombatAction in store
    }
  };

  // ── Click enemy in arena during targeting ──
  const handleArenaEnemyClick = (enemyId: string) => {
    if (targetingMode !== 'enemy') return;
    selectCombatTarget(enemyId);
    setTargetingMode(null);
    setPendingAction(null);
    setTimeout(() => executeCombatTurn(), 300);
  };

  // ── Click ally in arena during targeting ──
  const handleArenaAllyClick = (charId: string) => {
    if (targetingMode !== 'ally') return;
    selectCombatTarget(charId);
    setTargetingMode(null);
    setPendingAction(null);
    setTimeout(() => executeCombatTurn(), 300);
  };

  // ── Item selection ──
  const handleItemSelect = (itemUid: string) => {
    const item = currentCharacter?.inventory.find(i => i.uid === itemUid);
    if (!item) return;
    selectCombatItem(itemUid);
    setShowItemSelect(false);

    const firstEffectTarget = item.effects?.find(e => !e.trigger || e.trigger === 'on_use')?.target;
    const isEnemyTarget = firstEffectTarget === 'enemy' || firstEffectTarget === 'all_enemies' || firstEffectTarget === 'random_enemy';
    const isAllyTarget = firstEffectTarget === 'self' || firstEffectTarget === 'one_ally' || firstEffectTarget === 'all_allies' || firstEffectTarget === 'lowest_hp_ally';

    // Determine target mode
    let needsAllySelect = false;
    let needsEnemySelect = false;
    let instantUse = false;

    if (isEnemyTarget) {
      needsEnemySelect = true;
    } else if (isAllyTarget) {
      if (firstEffectTarget === 'all_allies') {
        instantUse = true;
      } else {
        // self / one_ally / lowest_hp_ally → check alive party count
        if (aliveParty.length <= 1) {
          instantUse = true;
        } else {
          needsAllySelect = true;
        }
      }
    } else if (item.type === 'healing' || item.type === 'antidote') {
      // Fallback: healing/antidote items without explicit effects → behave as self-target
      if (aliveParty.length <= 1) {
        instantUse = true;
      } else {
        needsAllySelect = true;
      }
    } else {
      // Unknown: default to ally targeting
      needsAllySelect = true;
    }

    if (instantUse) {
      selectCombatTarget(currentCharacter!.id);
      setTimeout(() => executeCombatTurn(), 300);
    } else if (needsEnemySelect) {
      setPendingAction('use_item');
      setTargetingMode('enemy');
    } else if (needsAllySelect) {
      setPendingAction('use_item');
      setTargetingMode('ally');
    }
  };

  // ── Cancel targeting/item overlays ──
  const cancelAll = () => {
    setTargetingMode(null);
    setShowItemSelect(false);
    setPendingAction(null);
  };

  // ── Auto-combat toggle with immediate first turn ──
  const handleToggleAutoCombat = () => {
    const newVal = !autoCombat;
    toggleAutoCombat();
    if (newVal && isPlayerTurn && !combat?.isProcessing) {
      setTimeout(() => executeAutoCombatTurn(), 100);
    }
  };

  return {
    targetingMode,
    pendingAction,
    showItemSelect,
    hoveredItem,
    handleMenuAction,
    handleArenaEnemyClick,
    handleArenaAllyClick,
    handleItemSelect,
    onHoverItem: setHoveredItem,
    cancelAll,
    handleToggleAutoCombat,
  };
}
