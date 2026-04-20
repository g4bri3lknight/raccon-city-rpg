'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { useResizableSplit } from '@/hooks/useResizableSplit';

import {
  CombatHeader, EnemyDisplay, PartyDisplay, CombatLogPanel, ActionMenu, ItemSelector, TargetSelector, BottomBars,
  useCombatAnimations, useCombatAudio, useCombatScroll, useCombatActions,
  getAiPrediction, getWeaponAmmoCount, getUsableItems, getAnimForTarget,
} from './combat';

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

  // ── AI action prediction ──
  const aiPredictedAction = getAiPrediction(autoCombat, isPlayerTurn, currentCharacter, specialCd, special2Cd, aliveParty, aliveEnemies, usableItems);

  // ── Resizable split layout ──
  const { percent: desktopPercent, containerRef: desktopContainerRef, handleMouseDown: desktopMouseDown, handleTouchStart: desktopTouchStart } = useResizableSplit({ initialPercent: 80, minPercent: 55, maxPercent: 88, direction: 'horizontal' });
  const { percent: mobilePercent, containerRef: mobileContainerRef, handleMouseDown: mobileMouseDown, handleTouchStart: mobileTouchStart } = useResizableSplit({ initialPercent: 65, minPercent: 40, maxPercent: 80, direction: 'vertical' });

  // ── Custom hooks: animations, audio, scrolling ──
  const animState = useCombatAnimations(combat, enemies);
  useCombatAudio(combat, enemies);
  const logRef = useCombatScroll(combat, isPlayerTurn);

  // ── Custom hook: action state + callbacks ──
  const actions = useCombatActions({
    selectCombatAction, selectCombatTarget, selectCombatItem, executeCombatTurn,
    toggleAutoCombat, executeAutoCombatTurn,
    combat: combat!, enemies, party, autoCombat, isPlayerTurn, isCombatEnd,
    currentCharacter, aliveEnemies, aliveParty, usableItems,
  });

  // ── Animation helper for entity displays ──
  const lastEntries = combat?.log?.slice(-3) || [];
  const boundGetAnimForTarget = useCallback((id: string, name: string) => getAnimForTarget(lastEntries, id, name), [lastEntries]);

  if (!combat) return null;

  // ── Arena: composes EnemyDisplay + PartyDisplay + floating menus ──
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
        />
      </div>

      {/* ── Floating sub-components rendered inside arena ── */}
      <ActionMenu
        autoCombat={autoCombat}
        isPlayerTurn={isPlayerTurn}
        isCombatEnd={isCombatEnd}
        isProcessing={!!combat?.isProcessing}
        isStunned={isStunned}
        specialCd={specialCd}
        special2Cd={special2Cd}
        usableItemsCount={usableItems.length}
        currentCharacter={currentCharacter}
        currentWeaponAmmoCount={currentWeaponAmmoCount}
        arch={arch}
        aiPredictedAction={aiPredictedAction}
        combat={combat}
        enemies={enemies}
        onMenuAction={actions.handleMenuAction}
        onToggleAutoCombat={actions.handleToggleAutoCombat}
      />
      <ItemSelector
        show={actions.showItemSelect}
        isPlayerTurn={isPlayerTurn}
        usableItems={usableItems}
        hoveredItem={actions.hoveredItem}
        onItemSelect={actions.handleItemSelect}
        onHoverItem={actions.onHoverItem}
        onCancel={actions.cancelAll}
      />
      <TargetSelector
        targetingMode={actions.targetingMode}
        isPlayerTurn={isPlayerTurn}
        aliveEnemiesCount={aliveEnemies.length}
        alivePartyCount={aliveParty.length}
        onCancel={actions.cancelAll}
      />
    </div>
  );

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

      {/* ═══════════════════════════════════════════════════════
           DESKTOP: 2-column layout with horizontal splitter
           ═══════════════════════════════════════════════════════ */}
      <div ref={desktopContainerRef} className="hidden lg:flex flex-1 min-h-0">
        {/* LEFT COLUMN: Arena + floating menus */}
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
          {/* Arena entities + floating menus */}
          {renderArenaEntities()}
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
          <CombatHeader
            turn={combat.turn}
            isPlayerTurn={isPlayerTurn}
            currentCharacterName={currentCharacter?.name}
            currentEnemyName={currentEnemyName}
          />
          {/* Combat log fills remaining space */}
          <div className="flex-1 min-h-0 px-3 py-1.5 flex flex-col">
            <CombatLogPanel log={combat.log} party={party} dataVersion={dataVersion} logRef={logRef} />
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
           MOBILE: Vertical layout with vertical splitter
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
          <CombatHeader
            turn={combat.turn}
            isPlayerTurn={isPlayerTurn}
            currentCharacterName={currentCharacter?.name}
            currentEnemyName={currentEnemyName}
          />
          {/* Arena entities + floating menus */}
          {renderArenaEntities()}
        </div>

        {/* VERTICAL SPLITTER */}
        <div
          className="splitter-handle splitter-handle-vertical"
          onMouseDown={mobileMouseDown}
          onTouchStart={mobileTouchStart}
        />

        {/* LOG SECTION */}
        <div className="flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${100 - mobilePercent}%` }}
        >
          <div className="flex-1 min-h-0 px-3 sm:px-4 py-1.5 flex flex-col">
            <CombatLogPanel log={combat.log} party={party} dataVersion={dataVersion} logRef={logRef} />
          </div>
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
