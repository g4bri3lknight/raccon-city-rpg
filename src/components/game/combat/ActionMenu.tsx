'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Heart, Zap, Footprints, Package, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getSpecialById } from '@/game/data/loader';
import { resolveSpecialId } from '@/game/engine/combat';
import { getItemEffectDescriptions } from '@/game/utils/item-effects';
import type { Character, ItemInstance } from '@/game/types';
import type { ActionMenuProps } from './types';

export default function ActionMenu({
  autoCombat,
  isPlayerTurn,
  isCombatEnd,
  isProcessing,
  isStunned,
  specialCd,
  special2Cd,
  usableItemsCount,
  currentCharacter,
  currentWeaponAmmoCount,
  arch,
  aiPredictedAction,
  combat,
  enemies,
  onMenuAction,
  onToggleAutoCombat,
}: ActionMenuProps) {
  const currentEnemyName = enemies.find(e => e.id === combat.currentActorId)?.name;

  // ── Keyboard shortcuts for combat actions ──
  useEffect(() => {
    if (!isPlayerTurn || isProcessing || autoCombat || isCombatEnd) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      switch (key) {
        case '1':
        case 'a':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onMenuAction('attack');
          }
          break;
        case '2':
        case 's':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onMenuAction('special');
          }
          break;
        case '3':
        case 'i':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onMenuAction('use_item');
          }
          break;
        case '4':
        case 'd':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onMenuAction('defend');
          }
          break;
        case '5':
        case 'f':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onMenuAction('flee');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerTurn, isProcessing, autoCombat, isCombatEnd, onMenuAction]);

  // Resolve special ability definitions for tooltips
  const special1Def = currentCharacter
    ? getSpecialById(resolveSpecialId(currentCharacter, 'special1Id') || '')
    : undefined;
  const special2Def = currentCharacter
    ? getSpecialById(resolveSpecialId(currentCharacter, 'special2Id') || '')
    : undefined;

  // Build ability tooltip content
  const getAbilityTooltip = (def: typeof special1Def | undefined, cd: number, label: string) => {
    if (!def) return label;
    const cdText = cd > 0 ? ` (Cooldown: ${cd} turni)` : ' (Pronta!)';
    const parts = [def.description];
    if (def.cooldown > 0) parts.push(`Cooldown: ${def.cooldown} turni`);
    parts.push(`Categoria: ${def.category}`);
    return parts.join(' | ');
  };

  // Build attack tooltip
  const getAttackTooltip = () => {
    if (!currentCharacter?.weapon) return 'Attacco base';
    const weapon = currentCharacter.weapon;
    const parts = [weapon.name];
    if (weapon.modSlots && weapon.modSlots.length > 0) {
      const modNames = weapon.modSlots.map((id) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { WEAPON_MODS } = require('@/game/data/weapon-mods');
        return WEAPON_MODS[id]?.name || id;
      });
      parts.push(`Mod: ${modNames.join(', ')}`);
    }
    return parts.join(' | ');
  };

  return (
    <>
      {/* ═══ DESKTOP: Floating action menu ═══ */}
      <AnimatePresence>
        {!isCombatEnd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15 }}
            className="hidden lg:block absolute z-40 right-2 sm:right-4 bottom-2 sm:bottom-3 glass-dark rounded-lg"
            style={{ minWidth: '150px' }}
          >
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                {autoCombat ? '🤖 Azioni AI' : 'Azioni'}
              </span>
              {!isPlayerTurn ? (
                <span className="flex items-center gap-1 text-[9px] text-red-400/60">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {currentEnemyName}...
                </span>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggleAutoCombat}
                      disabled={!!isProcessing}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all border ${
                        autoCombat
                          ? 'bg-green-600/30 border-green-500/60 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                          : 'bg-gray-700/50 border-gray-600/30 text-gray-400 hover:bg-gray-600/50 hover:text-gray-200 hover:border-gray-500/40'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Zap className={`w-3 h-3 ${autoCombat ? 'text-green-400' : 'text-gray-500'}`} />
                      Auto
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[200px] text-center">
                    {autoCombat
                      ? 'Disattiva combattimento automatico'
                      : 'Attiva combattimento automatico — l\'AI sceglie le azioni per te'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isPlayerTurn && !autoCombat && (
              <div className="px-2.5 pb-1">
                <span className="text-[8px] text-white/25 tracking-wide">⌨️ 1-5 tasti rapidi</span>
              </div>
            )}
            <div className="p-1.5 space-y-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !autoCombat && isPlayerTurn && onMenuAction('attack')}
                    disabled={isStunned || autoCombat || !isPlayerTurn}
                    aria-label="Attacca"
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                      aiPredictedAction === 'attack'
                        ? 'bg-red-500/20 border border-red-500/40 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
                        : 'text-gray-200 hover:bg-red-950/40 hover:text-red-200 hover:border-red-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 text-red-400" />
                    {currentCharacter?.weapon?.type === 'ranged' ? currentCharacter.weapon.name : 'Attacca'}
                    {currentWeaponAmmoCount !== null && (
                      <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${currentWeaponAmmoCount === 0 ? 'bg-red-900/60 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                        🔫 {currentWeaponAmmoCount}
                      </span>
                    )}
                    {currentCharacter?.weapon?.type === 'melee' && (
                      <span className="ml-auto text-[9px] text-gray-500">∞</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[220px]">
                  <p className="font-semibold text-[11px]">{currentCharacter?.weapon?.type === 'ranged' ? currentCharacter.weapon.name : 'Attacco Base'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{getAttackTooltip()}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !autoCombat && isPlayerTurn && onMenuAction('special')}
                    disabled={specialCd > 0 || autoCombat || !isPlayerTurn}
                    aria-label="Abilità speciale"
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all relative ${
                      aiPredictedAction === 'special'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                        : 'text-gray-200 hover:bg-amber-950/40 hover:text-amber-200 hover:border-amber-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {special1Def?.name || (arch === 'tank' ? 'Barricata' : arch === 'healer' ? 'Cura' : 'Mortale')}
                    {specialCd > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{specialCd} turni</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[220px]">
                  <p className="font-semibold text-[11px]">{special1Def?.name || 'Speciale 1'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{getAbilityTooltip(special1Def, specialCd, 'Speciale')}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !autoCombat && isPlayerTurn && onMenuAction('special2')}
                    disabled={special2Cd > 0 || autoCombat || !isPlayerTurn}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all relative ${
                      aiPredictedAction === 'special2'
                        ? 'bg-orange-500/20 border border-orange-500/40 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.3)] animate-pulse'
                        : 'text-gray-200 hover:bg-orange-950/40 hover:text-orange-200 hover:border-orange-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    {special2Def?.name || (arch === 'tank' ? 'Immolazione' : arch === 'healer' ? 'Cura Gruppo' : 'Raffica')}
                    {special2Cd > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{special2Cd} turni</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[220px]">
                  <p className="font-semibold text-[11px]">{special2Def?.name || 'Speciale 2'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{getAbilityTooltip(special2Def, special2Cd, 'Speciale 2')}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !autoCombat && isPlayerTurn && onMenuAction('use_item')}
                    disabled={usableItemsCount === 0 || autoCombat || !isPlayerTurn}
                    aria-label="Usa oggetto"
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                      aiPredictedAction === 'use_item'
                        ? 'bg-green-500/20 border border-green-500/40 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.3)] animate-pulse'
                        : 'text-gray-200 hover:bg-green-950/40 hover:text-green-200 hover:border-green-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-green-400" />
                    Oggetto
                    <span className="ml-auto text-[9px] text-gray-500">{usableItemsCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300">
                  Usa un oggetto dall'inventario ({usableItemsCount} disponibili)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !autoCombat && isPlayerTurn && onMenuAction('defend')}
                    disabled={autoCombat || !isPlayerTurn}
                    aria-label="Difendi"
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                      aiPredictedAction === 'defend'
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse'
                        : 'text-gray-200 hover:bg-cyan-950/40 hover:text-cyan-200 hover:border-cyan-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Difesa
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300">
                  Difendi — riduci i danni subiti del 50% fino al prossimo turno
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => isPlayerTurn && onMenuAction('flee')}
                    disabled={enemies.some(e => e.isBoss) || !isPlayerTurn}
                    aria-label="Fuggi"
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 hover:border-gray-600 border border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    Fuga
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 border border-white/10 text-gray-300">
                  {enemies.some(e => e.isBoss)
                    ? 'Impossibile fuggire dal BOSS!'
                    : 'Tenta la fuga — non sempre riesce'}
                </TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE: Action bar below arena/log ═══ */}
      <AnimatePresence>
        {!isCombatEnd && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden shrink-0 px-2 pb-1.5"
          >
            <div className="glass-dark rounded-xl">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                  {autoCombat ? '🤖 AI' : '⚔️ Azioni'}
                </span>
                {!isPlayerTurn ? (
                  <span className="flex items-center gap-1 text-[9px] text-red-400/60">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {currentEnemyName}...
                  </span>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onToggleAutoCombat}
                        disabled={!!isProcessing}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border min-h-[44px] min-w-[44px] ${
                          autoCombat
                            ? 'bg-green-600/30 border-green-500/60 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.25)]'
                            : 'bg-gray-700/50 border-gray-600/30 text-gray-500 active:bg-gray-600/50 active:text-gray-300'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        <Zap className={`w-4 h-4 ${autoCombat ? 'text-green-400' : 'text-gray-500'}`} />
                        Auto
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300">
                      {autoCombat ? 'Ferma AI' : 'Attiva AI — combattimento automatico'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !autoCombat && isPlayerTurn && onMenuAction('attack')}
                      disabled={autoCombat || !isPlayerTurn}
                      aria-label="Attacca"
                      className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed ${
                        aiPredictedAction === 'attack'
                          ? 'bg-red-500/20 border border-red-500/40 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
                          : 'text-gray-300 active:bg-red-950/50 active:text-red-200 border border-transparent'
                      }`}
                    >
                      <Swords className="w-5 h-5 text-red-400" />
                      <span className="truncate max-w-full">{currentCharacter?.weapon?.type === 'ranged' ? currentCharacter.weapon.name : 'Attacca'}</span>
                      {currentWeaponAmmoCount !== null && (
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${currentWeaponAmmoCount === 0 ? 'bg-red-900/60 text-red-400' : 'bg-gray-800/80 text-gray-400'}`}>
                          🔫{currentWeaponAmmoCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[180px]">
                    {currentCharacter?.weapon?.name || 'Attacco base'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !autoCombat && isPlayerTurn && onMenuAction('special')}
                      disabled={specialCd > 0 || autoCombat || !isPlayerTurn}
                      aria-label="Abilità speciale"
                      className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed relative ${
                        aiPredictedAction === 'special'
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                          : 'text-gray-300 active:bg-amber-950/50 active:text-amber-200 border border-transparent'
                      }`}
                    >
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span className="truncate max-w-full">{special1Def?.name || (arch === 'tank' ? 'Barricata' : arch === 'healer' ? 'Cura' : 'Mortale')}</span>
                      {specialCd > 0 && (
                        <span className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded">{specialCd}t</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[180px]">
                    <p className="font-semibold text-[10px]">{special1Def?.name || 'Speciale'}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{special1Def?.description || ''}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !autoCombat && isPlayerTurn && onMenuAction('special2')}
                      disabled={special2Cd > 0 || autoCombat || !isPlayerTurn}
                      className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed relative ${
                        aiPredictedAction === 'special2'
                          ? 'bg-orange-500/20 border border-orange-500/40 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)] animate-pulse'
                          : 'text-gray-300 active:bg-orange-950/50 active:text-orange-200 border border-transparent'
                      }`}
                    >
                      <Zap className="w-5 h-5 text-orange-400" />
                      <span className="truncate max-w-full">{special2Def?.name || (arch === 'tank' ? 'Immolazione' : arch === 'healer' ? 'Cura Gruppo' : 'Raffica')}</span>
                      {special2Cd > 0 && (
                        <span className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded">{special2Cd}t</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300 max-w-[180px]">
                    <p className="font-semibold text-[10px]">{special2Def?.name || 'Speciale 2'}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{special2Def?.description || ''}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !autoCombat && isPlayerTurn && onMenuAction('use_item')}
                      disabled={usableItemsCount === 0 || autoCombat || !isPlayerTurn}
                      aria-label="Usa oggetto"
                      className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed ${
                        aiPredictedAction === 'use_item'
                          ? 'bg-green-500/20 border border-green-500/40 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse'
                          : 'text-gray-300 active:bg-green-950/50 active:text-green-200 border border-transparent'
                      }`}
                    >
                      <Package className="w-5 h-5 text-green-400" />
                      <span>Oggetto</span>
                      <span className="text-[8px] text-gray-500">{usableItemsCount}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300">
                    Usa un oggetto ({usableItemsCount})
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !autoCombat && isPlayerTurn && onMenuAction('defend')}
                      disabled={autoCombat || !isPlayerTurn}
                      aria-label="Difendi"
                      className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed ${
                        aiPredictedAction === 'defend'
                          ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse'
                          : 'text-gray-300 active:bg-cyan-950/50 active:text-cyan-200 border border-transparent'
                      }`}
                    >
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <span>Difesa</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300">
                    Riduci danni del 50%
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isPlayerTurn && onMenuAction('flee')}
                      disabled={enemies.some(e => e.isBoss) || !isPlayerTurn}
                      aria-label="Fuggi"
                      className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[11px] font-medium text-gray-500 active:bg-gray-800/60 active:text-gray-200 border border-transparent transition-all min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Footprints className="w-5 h-5" />
                      <span>Fuga</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border border-white/10 text-gray-300">
                    {enemies.some(e => e.isBoss) ? 'Impossibile fuggire!' : 'Tenta la fuga'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
