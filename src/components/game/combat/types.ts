import type { ActiveCombatEffect, Character, CombatAction, CombatLogEntry, CombatState, EnemyInstance, ItemInstance, StatusDuration } from '@/game/types';

/** Animation info derived from combat log for an entity */
export type AnimResult =
  | { type: 'miss'; isMiss: true; isCritical: false }
  | { type: 'damage'; value: number; isCritical: boolean; isMiss: false }
  | { type: 'heal'; value: number; isCritical: false; isMiss: false }
  | { type: 'defend'; isCritical: false; isMiss: false };

/* ── CombatHeader ── */
export interface CombatHeaderProps {
  turn: number;
  isPlayerTurn: boolean;
  currentCharacterName: string | undefined;
  currentEnemyName: string | undefined;
}

/* ── EnemyDisplay ── */
export interface EnemyDisplayProps {
  enemies: EnemyInstance[];
  currentActorId: string;
  isPlayerTurn: boolean;
  targetingMode: 'enemy' | 'ally' | null;
  hitTargetId: string | null;
  hitTargetIds: string[];
  hitIsCritical: boolean;
  deathTargetId: string | null;
  bossPhaseId: string | null;
  dataVersion: number;
  onEnemyClick: (enemyId: string) => void;
  getAnimForTarget: (id: string, name: string) => AnimResult | null;
  activeEffects: ActiveCombatEffect[];
  statusDurations: Record<string, StatusDuration[]>;
}

/* ── PartyDisplay ── */
export interface PartyDisplayProps {
  party: Character[];
  currentActorId: string;
  isPlayerTurn: boolean;
  targetingMode: 'enemy' | 'ally' | null;
  dataVersion: number;
  onAllyClick: (charId: string) => void;
  getAnimForTarget: (id: string, name: string) => AnimResult | null;
  activeEffects: ActiveCombatEffect[];
  statusDurations: Record<string, StatusDuration[]>;
}

/* ── CombatLogPanel ── */
export interface CombatLogPanelProps {
  log: CombatLogEntry[];
  party: Character[];
  dataVersion: number;
  logRef: React.RefObject<HTMLDivElement | null>;
}

/* ── ActionMenu ── */
export interface ActionMenuProps {
  autoCombat: boolean;
  isPlayerTurn: boolean;
  isCombatEnd: boolean;
  isProcessing: boolean;
  isStunned: boolean;
  specialCd: number;
  special2Cd: number;
  usableItemsCount: number;
  currentCharacter: Character | undefined;
  currentWeaponAmmoCount: number | null;
  arch: string | undefined;
  aiPredictedAction: CombatAction | null;
  combat: CombatState;
  enemies: EnemyInstance[];
  onMenuAction: (action: CombatAction) => void;
  onToggleAutoCombat: () => void;
}

/* ── ItemSelector ── */
export interface ItemSelectorProps {
  show: boolean;
  isPlayerTurn: boolean;
  usableItems: ItemInstance[];
  hoveredItem: ItemInstance | null;
  onItemSelect: (itemUid: string) => void;
  onHoverItem: (item: ItemInstance | null) => void;
  onCancel: () => void;
}

/* ── TargetSelector ── */
export interface TargetSelectorProps {
  targetingMode: 'enemy' | 'ally' | null;
  isPlayerTurn: boolean;
  aliveEnemiesCount: number;
  alivePartyCount: number;
  onCancel: () => void;
}

/* ── BottomBars ── */
export interface BottomBarsProps {
  isCombatEnd: boolean;
  isPlayerTurn: boolean;
  currentEnemyName: string | undefined;
}
