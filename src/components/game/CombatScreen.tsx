'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { useResizableSplit } from '@/hooks/useResizableSplit';

import {
  CombatHeader, EnemyDisplay, PartyDisplay, CombatLogPanel, ActionMenu, ItemSelector, TargetSelector, BottomBars,
  useCombatAnimations, useCombatAudio, useCombatScroll, useCombatActions,
  getAiPrediction, getWeaponAmmoCount, getUsableItems, getAnimForTarget,
} from './combat';

import type { TurnOrderEntry, CombatLogEntry, EnemyInstance } from '@/game/types';

// ── Floating damage number ──
interface FloatNumber {
  id: number;
  value: number;
  type: 'damage' | 'heal' | 'critical';
  targetId: string;
}

export default function CombatScreen() {
  // ── Store selectors ──
  const dataVersion = useGameStore(s => s.dataVersion);
  const party = useGameStore(s => s.party);
  const combat = useGameStore(s => s.combat);
  const enemies = useGameStore(s => s.enemies);
  const autoCombat = useGameStore(s => s.autoCombat);
  const selectCombatAction = useGameStore(s => s.selectCombatAction);
  const selectCombatTarget = useGameStore(s => s.selectCombatTarget);
  const selectCombatItem = useGameStore(s => s.selectCombatItem);
  const executeCombatTurn = useGameStore(s => s.executeCombatTurn);
  const toggleAutoCombat = useGameStore(s => s.toggleAutoCombat);
  const executeAutoCombatTurn = useGameStore(s => s.executeAutoCombatTurn);

  // ── Derived values ──
  const isPlayerTurn = combat?.currentActorType === 'player' && !combat?.isVictory && !combat?.isDefeat && !combat?.isProcessing;
  const isCombatEnd = combat?.isVictory || combat?.isDefeat;
  const currentCharacter = party.find(p => p.id === combat?.currentActorId);
  const isStunned = currentCharacter?.statusEffects.includes('stunned') ?? false;
  const aliveEnemies = enemies.filter(e => e.currentHp > 0);
  const aliveParty = party.filter(p => p.currentHp > 0);
  const usableItems = getUsableItems(currentCharacter);
  // FIX: Turn-based cooldown — compute turns remaining from expiry turn
  const specialCdExpiry = combat?.specialCooldowns?.[currentCharacter?.id || ''] ?? 0;
  const special2CdExpiry = combat?.special2Cooldowns?.[currentCharacter?.id || ''] ?? 0;
  const currentCombatTurn = combat?.turn ?? 0;
  const specialCd = specialCdExpiry > currentCombatTurn ? specialCdExpiry - currentCombatTurn : 0;
  const special2Cd = special2CdExpiry > currentCombatTurn ? special2CdExpiry - currentCombatTurn : 0;
  const arch = currentCharacter?.archetype;
  const currentWeaponAmmoCount = getWeaponAmmoCount(currentCharacter);
  const currentEnemyName = enemies.find(e => e.id === combat?.currentActorId)?.name;

  // ── Build turn order for display ──
  const turnOrder: TurnOrderEntry[] = (() => {
    if (!combat?.fullTurnOrder) return [];
    return combat.fullTurnOrder.map(a => {
      if (a.type === 'player') {
        const char = party.find(p => p.id === a.id);
        return {
          id: a.id,
          name: char?.name || '?',
          icon: '🧑',
          type: 'player' as const,
          isAlive: char ? char.currentHp > 0 : false,
        };
      }
      const enemy = enemies.find(e => e.id === a.id);
      return {
        id: a.id,
        name: enemy?.name || '?',
        icon: enemy?.icon || '🧟',
        type: 'enemy' as const,
        isAlive: enemy ? enemy.currentHp > 0 : false,
      };
    });
  })();

  // ── Floating damage numbers ──
  const [floatNumbers, setFloatNumbers] = useState<FloatNumber[]>([]);
  const floatIdRef = useRef(0);
  const prevLogLenRef = useRef(0);

  useEffect(() => {
    if (!combat?.log) return;
    const prevLen = prevLogLenRef.current;
    const newEntries = combat.log.slice(prevLen);
    prevLogLenRef.current = combat.log.length;
    if (newEntries.length === 0) return;

    for (const entry of newEntries) {
      const targetId = entry.targetId || entry.targetIds?.[0];
      if (!targetId) continue;

      if (entry.damage && entry.damage > 0 && !entry.isMiss) {
        const id = ++floatIdRef.current;
        setFloatNumbers(prev => [...prev, {
          id,
          value: entry.damage,
          type: entry.isCritical ? 'critical' : 'damage',
          targetId,
        }]);
        // Auto-remove after animation
        setTimeout(() => {
          setFloatNumbers(prev => prev.filter(f => f.id !== id));
        }, 1500);
      }
      if (entry.heal && entry.heal > 0) {
        const id = ++floatIdRef.current;
        setFloatNumbers(prev => [...prev, {
          id,
          value: entry.heal,
          type: 'heal',
          targetId,
        }]);
        setTimeout(() => {
          setFloatNumbers(prev => prev.filter(f => f.id !== id));
        }, 1500);
      }
    }
  }, [combat?.log?.length]);

  // ── AI action prediction ──
  const aiPredictedAction = getAiPrediction(autoCombat, isPlayerTurn, currentCharacter, specialCd, special2Cd, aliveParty, aliveEnemies, usableItems);

  // ── Resizable split layout ──
  const { percent: desktopPercent, containerRef: desktopContainerRef, handleMouseDown: desktopMouseDown, handleTouchStart: desktopTouchStart } = useResizableSplit({ initialPercent: 80, minPercent: 55, maxPercent: 88, direction: 'horizontal' });
  const { percent: mobilePercent, containerRef: mobileContainerRef, handleMouseDown: mobileMouseDown, handleTouchStart: mobileTouchStart } = useResizableSplit({ initialPercent: 50, minPercent: 30, maxPercent: 70, direction: 'vertical' });

  // ── Custom hooks: animations, audio, scrolling ──
  const animState = useCombatAnimations(combat, enemies);
  useCombatAudio(combat, enemies);
  const { desktopLogRef, mobileLogRef } = useCombatScroll(combat, isPlayerTurn);

  // ── Custom hook: action state + callbacks ──
  const actions = useCombatActions({
    selectCombatAction, selectCombatTarget, selectCombatItem, executeCombatTurn,
    toggleAutoCombat, executeAutoCombatTurn,
    combat: combat!, enemies, party, autoCombat, isPlayerTurn, isCombatEnd,
    currentCharacter, aliveEnemies, aliveParty, usableItems,
  });

  // ── Animation helper for entity displays ──
  const lastEntriesRef = useRef(combat?.log?.slice(-3) || []);
  const lastEntries = combat?.log?.slice(-3) || [];
  useEffect(() => {
    if (lastEntries.length > 0) lastEntriesRef.current = lastEntries;
  }); // intentionally no deps: sync ref every render

  const boundGetAnimForTarget = useCallback(
    (id: string, name: string) => getAnimForTarget(lastEntriesRef.current, id, name),
    []
  );

  if (!combat) return null;

  // ── Common props for ActionMenu ──
  const actionMenuProps = {
    autoCombat,
    isPlayerTurn,
    isCombatEnd,
    isProcessing: !!combat?.isProcessing,
    isStunned,
    specialCd,
    special2Cd,
    usableItemsCount: usableItems.length,
    currentCharacter,
    currentWeaponAmmoCount,
    arch,
    aiPredictedAction,
    combat,
    enemies,
    onMenuAction: actions.handleMenuAction,
    onToggleAutoCombat: actions.handleToggleAutoCombat,
  };

  const itemSelectorProps = {
    show: actions.showItemSelect,
    isPlayerTurn,
    usableItems,
    hoveredItem: actions.hoveredItem,
    onItemSelect: actions.handleItemSelect,
    onHoverItem: actions.onHoverItem,
    onCancel: actions.cancelAll,
  };

  const targetSelectorProps = {
    targetingMode: actions.targetingMode,
    isPlayerTurn,
    aliveEnemiesCount: aliveEnemies.length,
    alivePartyCount: aliveParty.length,
    onCancel: actions.cancelAll,
  };

  // ── Floating numbers render helper ──
  const renderFloatNumbers = (entityId: string) => {
    const nums = floatNumbers.filter(f => f.targetId === entityId);
    if (nums.length === 0) return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
        {nums.map(n => (
          <div
            key={n.id}
            className={`combat-float-number ${n.type === 'critical' ? 'critical' : ''} ${
              n.type === 'damage' ? 'text-red-400' : n.type === 'critical' ? 'text-yellow-400' : 'text-green-400'
            }`}
            style={{ left: '50%', top: '30%' }}
          >
            {n.type === 'heal' ? '+' : '-'}{n.value}
            {n.type === 'critical' && ' ✕'}
          </div>
        ))}
      </div>
    );
  };

  // ── Arena: only entities (enemies + party), NO floating menus ──
  const renderArenaEntities = () => (
    <div className={`relative z-10 flex-1 min-h-0 overflow-hidden px-2 sm:px-4 pb-1.5 ${animState.arenaShakeClass}`}>
      <div className="relative mx-2 sm:mx-auto max-w-2xl lg:max-w-none h-full flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(20,10,10,0.35) 0%, rgba(30,15,15,0.5) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(220,38,38,0.06)',
        }}
      >
        {/* ── ENEMIES — top row ── */}
        <EnemyDisplay
          enemies={enemies}
          currentActorId={combat.currentActorId}
          isPlayerTurn={isPlayerTurn}
          targetingMode={actions.targetingMode}
          hitTargetId={animState.hitTargetId}
          hitTargetIds={animState.hitTargetIds}
          hitIsCritical={animState.hitIsCritical}
          deathTargetId={animState.deathTargetId}
          bossPhaseId={animState.bossPhaseId}
          dataVersion={dataVersion}
          onEnemyClick={actions.handleArenaEnemyClick}
          getAnimForTarget={boundGetAnimForTarget}
          activeEffects={combat.activeEffects || []}
          statusDurations={combat.statusDurations || {}}
          floatNumbers={floatNumbers}
        />

        {/* ── VS divider — horizontal center ── */}
        <div className="flex items-center justify-center shrink-0 py-0.5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
          <span
            className="text-sm sm:text-lg font-black tracking-[0.15em] px-2"
            style={{ color: '#dc2626', textShadow: '0 0 14px rgba(220,38,38,0.8), 0 0 28px rgba(220,38,38,0.3)' }}
          >VS</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-red-600/40 to-transparent" />
        </div>

        {/* ── PARTY — bottom row ── */}
        <PartyDisplay
          party={party}
          currentActorId={combat.currentActorId}
          isPlayerTurn={isPlayerTurn}
          targetingMode={actions.targetingMode}
          dataVersion={dataVersion}
          onAllyClick={actions.handleArenaAllyClick}
          getAnimForTarget={boundGetAnimForTarget}
          activeEffects={combat.activeEffects || []}
          statusDurations={combat.statusDurations || {}}
          floatNumbers={floatNumbers}
          healTargetId={animState.healTargetId}
        />
      </div>
    </div>
  );

  // ── Combat header props ──
  const combatHeaderProps = {
    turn: combat.turn,
    isPlayerTurn,
    currentCharacterName: currentCharacter?.name,
    currentEnemyName,
    victoryCondition: combat.victoryCondition,
    comboCount: combat.comboCount,
    turnOrder,
    currentActorId: combat.currentActorId,
  };

  return (
    <div className={`h-dvh sm:h-screen game-horror flex flex-col overflow-hidden relative ${animState.killFlash ? 'animate-kill-flash' : ''}`}>

      {/* ── Combat end overlay: dim arena during victory/defeat ── */}
      {isCombatEnd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            background: combat.isVictory
              ? 'radial-gradient(ellipse at center, rgba(234,179,8,0.08) 0%, rgba(0,0,0,0.6) 100%)'
              : 'radial-gradient(ellipse at center, rgba(127,29,29,0.15) 0%, rgba(0,0,0,0.8) 100%)',
          }}
        />
      )}

      {/* ── Combat Summary Card ── */}
      {combat.isVictory && combat.log.length > 0 && (
        <CombatSummaryCard log={combat.log} turn={combat.turn} enemies={enemies} />
      )}

      {/* ═══════════════════════════════════════════════════════
           DESKTOP: 2-column layout with horizontal splitter
           ═══════════════════════════════════════════════════════ */}
      <div ref={desktopContainerRef} className="hidden lg:flex flex-1 min-h-0">
        {/* LEFT COLUMN: Arena + floating menus (desktop: absolutely positioned, inside arena) */}
        <div className="relative overflow-hidden flex flex-col"
          style={{
            width: `${desktopPercent}%`,
            background: 'linear-gradient(180deg, #0a0808 0%, #111 40%, #1a1010 100%)',
          }}
        >
          {/* Atmospheric overlays */}
          <div className="absolute inset-0 scanline-overlay pointer-events-none z-0 opacity-20" />
          <div className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
            }}
          />
          {/* Arena entities */}
          {renderArenaEntities()}
          {/* Desktop floating menus — absolutely positioned inside arena */}
          <ActionMenu {...actionMenuProps} />
          <ItemSelector {...itemSelectorProps} />
          <TargetSelector {...targetSelectorProps} />
        </div>

        {/* SPLITTER */}
        <div
          className="splitter-handle splitter-handle-horizontal"
          onMouseDown={desktopMouseDown}
          onTouchStart={desktopTouchStart}
        />

        {/* RIGHT COLUMN: Turn indicator + Log + Controls */}
        <div className="flex flex-col min-h-0 overflow-hidden"
          style={{ width: `${100 - desktopPercent}%` }}
        >
          {/* Turn indicator (top of right column) */}
          <CombatHeader {...combatHeaderProps} />
          {/* Combat log fills remaining space */}
          <div className="flex-1 min-h-0 px-3 py-1.5 flex flex-col">
            <CombatLogPanel log={combat.log} party={party} dataVersion={dataVersion} logRef={desktopLogRef} />
          </div>
          {/* Bottom hint bars */}
          <BottomBars
            isCombatEnd={isCombatEnd}
            isPlayerTurn={isPlayerTurn}
            currentEnemyName={currentEnemyName}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
           MOBILE: Vertical layout — Arena | Log | Actions
           ═══════════════════════════════════════════════════════ */}
      <div ref={mobileContainerRef} className="flex lg:hidden flex-1 min-h-0 flex-col">
        {/* ARENA SECTION */}
        <div className="relative overflow-hidden flex flex-col"
          style={{
            height: `${mobilePercent}%`,
            background: 'linear-gradient(180deg, #0a0808 0%, #111 40%, #1a1010 100%)',
          }}
        >
          {/* Atmospheric overlays */}
          <div className="absolute inset-0 scanline-overlay pointer-events-none z-0 opacity-20" />
          <div className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
            }}
          />
          {/* Turn indicator (in arena on mobile) */}
          <CombatHeader {...combatHeaderProps} />
          {/* Arena entities only (no floating menus) */}
          {renderArenaEntities()}
        </div>

        {/* VERTICAL SPLITTER */}
        <div
          className="splitter-handle splitter-handle-vertical"
          onMouseDown={mobileMouseDown}
          onTouchStart={mobileTouchStart}
        />

        {/* LOG + ACTIONS SECTION */}
        <div className="flex flex-col min-h-0 overflow-hidden flex-1">
          {/* Combat log */}
          <div className="flex-1 min-h-0 px-3 sm:px-4 py-1.5 flex flex-col">
            <CombatLogPanel log={combat.log} party={party} dataVersion={dataVersion} logRef={mobileLogRef} />
          </div>
          {/* Mobile action menus — outside the overflow-hidden arena, always visible */}
          <ActionMenu {...actionMenuProps} />
          <ItemSelector {...itemSelectorProps} />
          <TargetSelector {...targetSelectorProps} />
        </div>
      </div>

      {/* ── Bottom bars: only on mobile, below the split ── */}
      <div className="lg:hidden shrink-0">
        <BottomBars
          isCombatEnd={isCombatEnd}
          isPlayerTurn={isPlayerTurn}
          currentEnemyName={currentEnemyName}
        />
      </div>
    </div>
  );
}

/** Post-combat summary card showing key stats computed from the combat log */
function CombatSummaryCard({ log, turn, enemies }: { log: CombatLogEntry[]; turn: number; enemies: EnemyInstance[] }) {
  const stats = useMemo(() => {
    let totalDamageDealt = 0;
    let totalDamageReceived = 0;
    let totalHealing = 0;
    let maxCombo = 0;
    let crits = 0;
    let misses = 0;

    for (const entry of log) {
      if (entry.damage && entry.damage > 0) {
        if (entry.actorType === 'player') {
          totalDamageDealt += entry.damage;
          if (entry.isCritical) crits++;
          if (entry.isMiss) misses++;
        } else if (entry.actorType === 'enemy') {
          totalDamageReceived += entry.damage;
        }
      }
      if (entry.heal && entry.heal > 0) totalHealing += entry.heal;
      if (entry.action === 'Combo' && entry.damage) {
        const comboMatch = entry.message.match(/x(\d+)/);
        if (comboMatch) maxCombo = Math.max(maxCombo, parseInt(comboMatch[1]));
      }
    }
    return { totalDamageDealt, totalDamageReceived, totalHealing, maxCombo, crits, misses, turns: turn };
  }, [log, turn]);

  const defeatedBosses = enemies.filter(e => e.isBoss).length;
  const defeatedEnemies = enemies.filter(e => e.currentHp <= 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
    >
      <div className="bg-black/80 backdrop-blur-sm border border-amber-900/30 rounded-lg px-4 py-2.5 flex gap-4 sm:gap-6 text-center">
        <div>
          <div className="text-xs text-white/40">Turni</div>
          <div className="text-sm font-bold text-white/90">{stats.turns}</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Danni</div>
          <div className="text-sm font-bold text-red-400">{stats.totalDamageDealt}</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Ricevuti</div>
          <div className="text-sm font-bold text-orange-400">{stats.totalDamageReceived}</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Cure</div>
          <div className="text-sm font-bold text-emerald-400">{stats.totalHealing}</div>
        </div>
        {stats.maxCombo > 1 && (
          <div>
            <div className="text-xs text-white/40">Combo Max</div>
            <div className="text-sm font-bold text-yellow-400">🔥×{stats.maxCombo}</div>
          </div>
        )}
        {stats.crits > 0 && (
          <div>
            <div className="text-xs text-white/40">Critici</div>
            <div className="text-sm font-bold text-yellow-300">{stats.crits}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
