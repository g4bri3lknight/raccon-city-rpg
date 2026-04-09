'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { CombatAction } from '@/game/types';
import LogText from '@/components/game/LogText';
import { ENEMY_IMAGES, CHARACTER_IMAGES, getSpecialById, ARCHETYPE_SPECIAL_MAP, mediaUrl } from '@/game/data/loader';
import ItemIcon from './ItemIcon';
import { WEAPON_AMMO, resolveSpecialId } from '@/game/engine/combat';
import { audio } from '@/game/engine/sounds';
import { playEnemyAttack, playEnemyDeath, playZombieMoan } from '@/game/engine/sounds';
import { useResizableSplit } from '@/hooks/useResizableSplit';

import { Badge } from '@/components/ui/badge';
import {
  Swords, Shield, Heart, Zap, Footprints, Package,
  Crosshair, Loader2, ArrowLeft, Hand, X
} from 'lucide-react';

export default function CombatScreen() {
  const dataVersion = useGameStore(s => s.dataVersion);
  const state = useGameStore();
  const { party, combat, enemies, autoCombat,
    selectCombatAction, selectCombatTarget, selectCombatItem, executeCombatTurn,
    toggleAutoCombat, executeAutoCombatTurn } = state;

  // ── UI state ──
  const [showMenu, setShowMenu] = useState(false);
  const [targetingMode, setTargetingMode] = useState<'enemy' | 'ally' | null>(null);
  const [pendingAction, setPendingAction] = useState<CombatAction | null>(null);
  const [showItemSelect, setShowItemSelect] = useState(false);
  const [screenShake, setScreenShake] = useState<string | null>(null);
  const [killFlash, setKillFlash] = useState(false);
  // ── #41 Animation state ──
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [hitIsCritical, setHitIsCritical] = useState(false);
  const [deathTargetId, setDeathTargetId] = useState<string | null>(null);
  const [bossPhaseId, setBossPhaseId] = useState<string | null>(null);

  const { percent: desktopPercent, containerRef: desktopContainerRef, handleMouseDown: desktopMouseDown, handleTouchStart: desktopTouchStart } = useResizableSplit({ initialPercent: 80, minPercent: 55, maxPercent: 88, direction: 'horizontal' });
  const { percent: mobilePercent, containerRef: mobileContainerRef, handleMouseDown: mobileMouseDown, handleTouchStart: mobileTouchStart } = useResizableSplit({ initialPercent: 65, minPercent: 40, maxPercent: 80, direction: 'vertical' });

  const logRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Refs for keyboard handler (must be declared before early return)
  const targetingModeRef = useRef<'enemy' | 'ally' | null>(null);
  const showItemSelectRef = useRef(false);
  const aliveEnemiesRef = useRef<typeof enemies>([]);
  const alivePartyRef = useRef<typeof party>([]);

  const isPlayerTurn = combat?.currentActorType === 'player' && !combat.isVictory && !combat.isDefeat;
  const isCombatEnd = combat?.isVictory || combat?.isDefeat;

  // Sync refs via effect (not during render)
  useEffect(() => {
    targetingModeRef.current = targetingMode;
    showItemSelectRef.current = showItemSelect;
    aliveEnemiesRef.current = enemies;
    alivePartyRef.current = party;
  });

  // ── Enemy death detection: play death sound + trigger screen shake & kill flash + #41 death anim ──
  const prevEnemyHpRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!combat) return;
    const newDeaths: string[] = [];
    const deathIds: string[] = [];
    for (const enemy of enemies) {
      const prevHp = prevEnemyHpRef.current[enemy.id] ?? enemy.currentHp;
      if (prevHp > 0 && enemy.currentHp <= 0) {
        newDeaths.push(enemy.name);
        deathIds.push(enemy.id);
      }
    }
    // Update HP ref
    const hpMap: Record<string, number> = {};
    for (const enemy of enemies) hpMap[enemy.id] = enemy.currentHp;
    prevEnemyHpRef.current = hpMap;
    // Play death sound + screen shake + kill flash for each newly dead enemy
    if (newDeaths.length > 0 && !combat.isVictory) {
      try { playEnemyDeath(); } catch {}
      // Heavy screen shake on enemy death
      queueMicrotask(() => {
        setScreenShake('heavy');
        setTimeout(() => setScreenShake(null), 800);
      });
      // Kill flash
      queueMicrotask(() => {
        setKillFlash(true);
        setTimeout(() => setKillFlash(false), 800);
      });
      // #41: Trigger death animation on each dead enemy
      queueMicrotask(() => {
        for (const did of deathIds) {
          setDeathTargetId(did);
          setTimeout(() => setDeathTargetId(null), 800);
        }
      });
    }
  }, [enemies, combat?.isVictory]);

  // ── Ambient zombie moan: periodic groan when zombie-type enemies are alive ──
  useEffect(() => {
    if (!combat || combat.isVictory || combat.isDefeat) return;
    // Check if any alive enemy is a zombie type
    const hasZombie = enemies.some(e => {
      if (e.currentHp <= 0) return false;
      const name = (e.name || '').toLowerCase();
      return name.includes('zombie') || name.includes('zombi') || name.includes('cadavere');
    });
    if (!hasZombie) return;
    // Play a random zombie moan every 4-8 seconds
    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 4000; // 4–8 seconds
      return setTimeout(() => {
        try { playZombieMoan(); } catch {}
      }, delay);
    };
    const timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [combat?.isVictory, combat?.isDefeat, enemies]);

  // ── Derived data ──
  const lastEntries = combat?.log?.slice(-3) || [];
  const getAnimForTarget = (id: string, name: string) => {
    for (const entry of lastEntries) {
      // Use targetId for precise matching; fall back to name for defend/legacy
      if (entry.targetId && entry.targetId === id) {
        if (entry.isMiss) return { type: 'miss' as const, isMiss: true, isCritical: false };
        if (entry.damage && entry.damage > 0) return { type: 'damage' as const, value: entry.damage, isCritical: !!entry.isCritical, isMiss: false };
        if (entry.heal) return { type: 'heal' as const, value: entry.heal, isCritical: false, isMiss: false };
      }
      if (entry.action === 'Difesa' && entry.actorName === name) return { type: 'defend' as const, isCritical: false, isMiss: false };
    }
    return null;
  };

  // ── Screen shake + #41 hit animations on critical/damage hits (detected from log) ──
  const prevLogLenForShakeRef = useRef(0);
  useEffect(() => {
    if (!combat?.log) return;
    const prevLen = prevLogLenForShakeRef.current;
    const newEntries = combat.log.slice(prevLen);
    prevLogLenForShakeRef.current = combat.log.length;
    if (newEntries.length === 0) return;
    const lastEntry = newEntries[newEntries.length - 1];
    if (lastEntry.isCritical && lastEntry.damage && lastEntry.damage > 0) {
      queueMicrotask(() => {
        setScreenShake('normal');
        setTimeout(() => setScreenShake(null), 500);
      });
    }
    // ── #41: Trigger hit animation on target ──
    if (lastEntry.targetId && lastEntry.damage && lastEntry.damage > 0) {
      setHitTargetId(lastEntry.targetId);
      setHitIsCritical(!!lastEntry.isCritical);
      setTimeout(() => { setHitTargetId(null); setHitIsCritical(false); }, 400);
    }
    // ── #41: Trigger boss phase animation ──
    if (lastEntry.action === 'Cambio Fase') {
      const bossEnemy = enemies.find(e => e.isBoss && e.currentHp > 0);
      if (bossEnemy) {
        setBossPhaseId(bossEnemy.id);
        setTimeout(() => setBossPhaseId(null), 2000);
      }
    }
  }, [combat?.log?.length, enemies]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [combat?.log?.length, scrollToBottom]);

  // ── Sound effects: play sounds when new combat log entries appear ──
  const lastLogLenRef = useRef(0);
  useEffect(() => {
    if (!combat?.log) return;
    const prevLen = lastLogLenRef.current;
    const newEntries = combat.log.slice(prevLen);
    lastLogLenRef.current = combat.log.length;

    if (newEntries.length === 0) return;
    // Only play sound for the last entry (most recent action)
    const entry = newEntries[newEntries.length - 1];
    try {
      if (entry.isMiss) {
        audio.playMiss();
      } else if (entry.isCritical && entry.damage && entry.damage > 0) {
        audio.playCritical();
      } else if (entry.action === 'Difesa' || entry.action === 'Barricata' || entry.action === 'Immolazione' || entry.action === 'Scudo Vitale' || entry.action === 'Recupero Tattico' || entry.action === 'Resistenza Attiva') {
        if (entry.action === 'Immolazione') audio.playTaunt();
        else audio.playDefend();
      } else if (entry.action === 'Pronto Soccorso' || entry.action === 'Cura Gruppo' || entry.action === 'Adrenalina' || entry.action === 'Iniezione Stimolante' || entry.action === 'Disinfezione Totale') {
        audio.playHeal();
      } else if (entry.action === 'Sparo Mirato') {
        audio.playRangedAttack();
      } else if (entry.action === 'Veleno Acido') {
        audio.playPoisonTick();
      } else if (entry.action === 'Attacco di Carica') {
        audio.playAttack();
      } else if (entry.action === 'Avvelenamento') {
        audio.playPoisonTick();
      } else if (entry.action === 'Sanguinamento') {
        audio.playBleedTick();
      } else if (entry.action === 'Raffica') {
        audio.playExplosion();
      } else if (entry.action === 'Granata Stordente') {
        audio.playExplosion();
      } else if (entry.action === 'Colpo Mortale' || entry.action === 'Sparo Mirato' || entry.action === 'Attacco di Carica' || entry.action === 'Siero Inibitore') {
        audio.playSpecial();
      } else if (entry.action === 'Attacco' || entry.action === 'Pistola M1911' || entry.action === 'Fucile a Pompa' || entry.action === 'Magnum' || entry.action === 'Tubo di Piombo' || entry.action === 'Bisturi' || entry.action === 'Colpo corpo a corpo') {
        // Ranged or melee player attack
        if (entry.actorType === 'player') {
          const isRanged = entry.action === 'Pistola M1911' || entry.action === 'Fucile a Pompa' || entry.action === 'Magnum';
          if (isRanged) audio.playRangedAttack();
          else audio.playAttack();
        }
      } else if (entry.damage && entry.damage > 0) {
        // Any other damage entry (enemy attacks, etc.)
        if (entry.actorType === 'enemy') {
          playEnemyAttack(entry.actorName, entry.action);
        }
      } else if (entry.damage === 0 && entry.isMiss && entry.actorType === 'enemy') {
        // Enemy miss
        audio.playMiss();
      }
    } catch { /* audio not available */ }
  }, [combat?.log?.length]);

  useEffect(() => {
    if (!isPlayerTurn) {
      const interval = setInterval(scrollToBottom, 300);
      return () => clearInterval(interval);
    }
  }, [isPlayerTurn, scrollToBottom]);

  // ── Menu management: reset overlays + auto-open on player turn ──
  useEffect(() => {
    if (isPlayerTurn && !autoCombat) {
      // Reset overlays and open menu after a short delay (async to satisfy lint)
      const t = setTimeout(() => {
        setTargetingMode(null);
        setShowItemSelect(false);
        setPendingAction(null);
        setShowMenu(true);
      }, 350);
      return () => clearTimeout(t);
    } else {
      // Not player turn or auto-combat enabled — close everything
      const t = setTimeout(() => {
        setShowMenu(false);
        setTargetingMode(null);
        setShowItemSelect(false);
        setPendingAction(null);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isPlayerTurn, autoCombat, combat?.currentActorId]);

  // Keyboard support — reads store methods directly, refs for state
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tm = targetingModeRef.current;
      const doCancel = () => {
        setShowMenu(false);
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
 }, []);

  // ── Auto-combat: trigger AI turn when enabled ──
  const autoCombatRef = useRef(autoCombat);
  const isPlayerTurnRef = useRef(isPlayerTurn);
  useEffect(() => {
    autoCombatRef.current = autoCombat;
    isPlayerTurnRef.current = isPlayerTurn;
  }, [autoCombat, isPlayerTurn]);

  useEffect(() => {
    if (autoCombat && isPlayerTurn) {
      const timer = setTimeout(() => {
        setShowMenu(true); // Show menu just before AI acts so user sees the highlight
        const actionTimer = setTimeout(() => {
          setShowMenu(false);
          setTargetingMode(null);
          setShowItemSelect(false);
          setPendingAction(null);
          executeAutoCombatTurn();
        }, 800);
        return () => clearTimeout(actionTimer);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoCombat, isPlayerTurn, combat?.currentActorId]);

  const currentCharacter = party.find(p => p.id === combat.currentActorId);
  const aliveEnemies = enemies.filter(e => e.currentHp > 0);
  const aliveParty = party.filter(p => p.currentHp > 0);
  const usableItems = currentCharacter?.inventory.filter(i => i.usable) || [];
  const specialCd = combat.specialCooldowns?.[currentCharacter?.id || ''] ?? 0;
  const special2Cd = combat.special2Cooldowns?.[currentCharacter?.id || ''] ?? 0;
  const arch = currentCharacter?.archetype;

  // ── AI action prediction: which action will auto-combat pick? ──
  const aiPredictedAction = (() => {
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
    const myUsable = currentCharacter.inventory.filter(i => i.usable);
    const hasStatusCure = aliveParty.some(p => p.statusEffects.includes('poison') || p.statusEffects.includes('bleeding'));
    if (hasStatusCure && myUsable.some(i => i.effect?.statusCured)) return 'use_item' as CombatAction;
    const worstAlly = aliveParty.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
    if (worstAlly.currentHp / worstAlly.maxHp < 0.35 && myUsable.some(i => i.effect?.type === 'heal_full')) return 'use_item' as CombatAction;
    if (worstAlly.currentHp / worstAlly.maxHp < 0.55 && myUsable.some(i => i.effect?.type === 'heal' || i.effect?.type === 'heal_full')) return 'use_item' as CombatAction;
    return 'attack' as CombatAction;
  })();

  // Ammo count for current character's ranged weapon
  const currentWeaponAmmoCount = (() => {
    if (!currentCharacter?.weapon || currentCharacter.weapon.type !== 'ranged') return null;
    const requiredAmmoId = WEAPON_AMMO[currentCharacter.weapon.itemId];
    if (!requiredAmmoId) return null;
    const ammoItems = currentCharacter.inventory.filter(i => i.itemId === requiredAmmoId);
    const total = ammoItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    return total;
  })();

  // ── Click active character → toggle action menu ──
  const handleActiveCharClick = (e: React.MouseEvent) => {
    if (!isPlayerTurn) return;
    e.stopPropagation();
    setShowMenu(prev => !prev);
    setTargetingMode(null);
    setShowItemSelect(false);
  };

  // ── Select action from context menu ──
  const handleMenuAction = (action: CombatAction) => {
    setShowMenu(false);
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
      } else if (sp1.targetType === 'ally') {
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
      } else if (sp2.targetType === 'ally') {
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
      setTimeout(() => executeCombatTurn(), 300);
    } else if (action === 'flee') {
      if (enemies.some(e => e.isBoss)) return;
      setTimeout(() => executeCombatTurn(), 300);
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
    if (item.effect?.target === 'self') {
      selectCombatTarget(currentCharacter!.id);
      setTimeout(() => executeCombatTurn(), 300);
    } else {
      setPendingAction('use_item');
      setTargetingMode('ally');
    }
  };

  // ── Cancel any overlay ──
  const cancelAll = () => {
    setShowMenu(false);
    setTargetingMode(null);
    setShowItemSelect(false);
    setPendingAction(null);
  };

  if (!combat) return null;

  /* ═══ Shared sub-components ═══ */
  const renderTurnIndicator = () => (
    <div className="relative z-10 shrink-0 px-3 h-7 flex items-center justify-between">
      <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] sm:text-xs bg-red-500/10">
        Turno {combat.turn}
      </Badge>
      {!isPlayerTurn && (
        <span className="text-[10px] text-red-400/80 animate-pulse flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {enemies.find(e => e.id === combat.currentActorId)?.name}...
        </span>
      )}
      {isPlayerTurn && (
        <span className="text-[10px] text-green-400/80">
          ▸ Turno di {currentCharacter?.name}
        </span>
      )}
    </div>
  );

  const arenaShakeClass = screenShake === 'heavy'
    ? 'animate-screen-shake-heavy'
    : screenShake === 'normal'
      ? 'animate-screen-shake-improved'
      : '';

  const renderArenaEntities = () => (
    <div ref={arenaRef} className={`relative z-10 flex-1 min-h-0 overflow-hidden px-2 sm:px-4 pb-1.5 ${arenaShakeClass}`}>
      <div className="relative mx-2 sm:mx-auto max-w-2xl lg:max-w-none h-full flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(20,10,10,0.35) 0%, rgba(30,15,15,0.5) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(220,38,38,0.06)',
        }}
      >
        {/* ── ENEMIES — top row ── */}
        <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 lg:gap-14 px-3 py-1 min-h-0">
          {enemies.map((enemy, idx) => {
            const anim = getAnimForTarget(enemy.id, enemy.name);
            const isHurt = anim?.type === 'damage';
            const isMissAnim = anim?.type === 'miss';
            const isCrit = !!anim?.isCritical;
            const isDead = enemy.currentHp <= 0;
            const isActive = enemy.id === combat.currentActorId && !isPlayerTurn;
            const isTargetable = targetingMode === 'enemy' && !isDead;
            const pct = enemy.maxHp > 0 ? (enemy.currentHp / enemy.maxHp) * 100 : 0;
            const animClass = isMissAnim ? 'animate-dodge' : isHurt ? (isCrit ? 'animate-critical-impact' : 'entity-shake') : !isDead ? 'entity-enemy-idle' : 'entity-dead';
            // ── #41 animation classes ──
            const hitAnimClass = hitTargetId === enemy.id ? (hitIsCritical ? 'animate-flash-red' : 'animate-shake') : '';
            const deathAnimClass = deathTargetId === enemy.id ? 'animate-enemy-death' : '';
            const bossPhaseClass = bossPhaseId === enemy.id ? 'animate-boss-phase' : '';
            const bossGlowClass = enemy.isBoss && !isDead ? 'animate-pulse-glow' : '';
            const borderColor = isTargetable
              ? 'border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.6)] ring-1 ring-red-400/40'
              : isHurt
              ? 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
              : isDead ? 'border-gray-700/30' : isActive ? 'border-red-400/60 shadow-[0_0_10px_rgba(248,113,113,0.3)]' : 'border-gray-600/40';

            return (
              <div
                key={enemy.id}
                onClick={() => handleArenaEnemyClick(enemy.id)}
                className={`relative flex flex-col items-center gap-0.5 ${animClass} ${hitAnimClass} ${deathAnimClass} ${bossPhaseClass} ${isDead ? 'grayscale opacity-30' : ''} transition-all duration-150 ${isTargetable ? 'cursor-crosshair scale-105 hover:scale-110 hover:shadow-[0_0_24px_rgba(239,68,68,0.7)]' : ''}`}
              >
                {/* Active turn indicator */}
                {isActive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 text-[8px] text-red-300 font-bold whitespace-nowrap animate-bounce">
                    <Swords className="w-3 h-3" /> Attacca
                  </span>
                )}
                {isHurt && !isCrit && <div className="absolute -inset-1 rounded-lg bg-red-500/25 damage-flash pointer-events-none" />}
                {isCrit && isHurt && <div className="absolute -inset-1 rounded-lg bg-orange-500/35 damage-flash pointer-events-none" />}
                {isMissAnim && <div className="absolute -inset-1 rounded-lg bg-yellow-500/15 pointer-events-none animate-dodge" />}
                {/* Keyboard shortcut badge */}
                {isTargetable && (
                  <span className="absolute -top-2 -left-1 z-30 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                    {idx + 1}
                  </span>
                )}
                <div className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-56 lg:h-56 rounded-lg overflow-hidden border-2 shrink-0 relative ${borderColor} ${bossGlowClass}`}>
                  <img src={mediaUrl(ENEMY_IMAGES[enemy.definitionId] || '', dataVersion)} alt="" className="w-full h-full object-cover object-[center_15%]" draggable={false} onError={(e) => {
                    const t = e.currentTarget;
                    if (t.style.display !== 'none') {
                      t.style.display = 'none';
                      const fb = document.createElement('div');
                      fb.className = 'w-full h-full flex items-center justify-center bg-gray-900/80';
                      fb.innerHTML = `<span style="font-size:2.5rem">${enemy.icon || '🧟'}</span>`;
                      t.parentElement?.appendChild(fb);
                    }
                  }} />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold ${isDead ? 'text-gray-700' : enemy.isBoss ? 'text-red-300' : 'text-gray-300'}`}>
                  {enemy.name}
                </span>
                {/* Mini HP bar */}
                <div className="w-18 sm:w-20 h-2 rounded-full overflow-hidden bg-gray-800/80">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${pct}%`,
                    background: isDead ? '#374151' : pct > 60 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : pct > 30 ? 'linear-gradient(90deg, #ca8a04, #eab308)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
                    boxShadow: isDead ? 'none' : `0 0 6px ${pct > 60 ? 'rgba(34,197,94,0.4)' : pct > 30 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.5)'}`,
                  }} />
                </div>
                {enemy.isBoss && !isDead && <span className="absolute -top-1.5 -right-0.5 text-[6px] bg-red-700 text-white px-1 rounded font-bold">BOSS</span>}
                {/* ── #41 Critical slash overlay ── */}
                {hitIsCritical && hitTargetId === enemy.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <div className="animate-critical-slash text-orange-400 text-3xl font-black" style={{ textShadow: '0 0 10px rgba(251,146,60,0.8)' }}>✕</div>
                  </div>
                )}
                {/* ── #41 Flash overlay on critical (orange glow) ── */}
                {hitIsCritical && hitTargetId === enemy.id && (
                  <div className="absolute inset-0 rounded-lg animate-flash-white pointer-events-none z-30" style={{ backgroundColor: 'rgba(251,146,60,0.15)' }} />
                )}
                {isHurt && anim.value && (
                  <div className="absolute -top-2 right-0 z-30">
                    <div className="damage-number"><span className={`text-xs font-black ${isCrit ? 'text-orange-400' : 'text-red-400'}`}>-{anim.value}</span></div>
                  </div>
                )}
                {isTargetable && (
                  <Crosshair className="absolute inset-0 m-auto w-3 h-3 text-red-400 animate-pulse opacity-60 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

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
        <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 lg:gap-14 px-3 py-1 min-h-0">
          {party.map((char, idx) => {
            const isActive = char.id === combat.currentActorId && isPlayerTurn;
            const anim = getAnimForTarget(char.id, char.name);
            const isHurt = anim?.type === 'damage';
            const isMissAnim = anim?.type === 'miss';
            const isCrit = !!anim?.isCritical;
            const isHealing = anim?.type === 'heal';
            const isDead = char.currentHp <= 0;
            const isTargetable = targetingMode === 'ally' && !isDead;
            const pct = char.maxHp > 0 ? (char.currentHp / char.maxHp) * 100 : 0;
            const isPoisoned = char.statusEffects?.includes('poison') || false;
            const isBleeding = char.statusEffects?.includes('bleeding') || false;
            const animClass = isMissAnim ? 'animate-dodge' : isHurt ? (isCrit ? 'animate-critical-impact' : 'entity-shake') : !isDead ? 'entity-player-idle' : 'entity-dead';
            const borderColor = isTargetable
              ? 'border-green-400 shadow-[0_0_18px_rgba(74,222,128,0.5)] ring-1 ring-green-400/40'
              : isHurt
              ? 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
              : isHealing ? 'border-green-400/50' : isDead ? 'border-gray-700/30' : isActive ? 'border-yellow-400/70 shadow-[0_0_12px_rgba(250,204,21,0.4)]' : 'border-gray-600/40';

            return (
              <div
                key={char.id}
                onClick={(e) => {
                  if (isActive && !showMenu && !targetingMode && !showItemSelect) {
                    handleActiveCharClick(e);
                  } else if (isTargetable) {
                    handleArenaAllyClick(char.id);
                  }
                }}
                className={`relative flex flex-col items-center gap-0.5 ${animClass} ${isDead ? 'grayscale opacity-30' : ''} transition-all duration-150 ${
                  isActive && !showMenu && !targetingMode && !showItemSelect ? 'cursor-pointer' : ''
                } ${isTargetable ? 'cursor-crosshair scale-105 hover:scale-110' : ''}`}
              >
                {/* Active turn indicator */}
                {isActive && !showMenu && !targetingMode && !showItemSelect && (
                  <>
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 text-[8px] text-yellow-300 font-bold whitespace-nowrap animate-bounce">
                      <Hand className="w-3 h-3" /> Tocca
                    </span>
                  </>
                )}
                {isHurt && !isCrit && <div className="absolute -inset-1 rounded-lg bg-red-500/25 damage-flash pointer-events-none" />}
                {isCrit && isHurt && <div className="absolute -inset-1 rounded-lg bg-orange-500/35 damage-flash pointer-events-none" />}
                {isMissAnim && <div className="absolute -inset-1 rounded-lg bg-yellow-500/15 pointer-events-none animate-dodge" />}
                {isHealing && <div className="absolute -inset-1 rounded-lg bg-green-500/20 heal-effect pointer-events-none" />}
                {/* Keyboard shortcut badge for ally targeting */}
                {isTargetable && (
                  <span className="absolute -top-2 -left-1 z-30 bg-green-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                    {idx + 1}
                  </span>
                )}
                <div className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-56 lg:h-56 rounded-lg overflow-hidden border-2 shrink-0 relative ${borderColor}`}>
                  <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt="" className="w-full h-full object-cover object-[center_15%]" draggable={false} />
                  {/* ── BLEEDING VISUAL: blood drips on left + red pulse ── */}
                  {isBleeding && !isDead && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none bleeding-overlay" />
                      <div className="absolute left-0 top-0 bottom-0 w-[5px] overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/90 to-red-950 blood-streak" />
                      </div>
                      {[
                        { w: 8, h: 14, left: 5, delay: 0, dur: 2.2 },
                        { w: 10, h: 16, left: 12, delay: 0.9, dur: 2.6 },
                        { w: 7, h: 12, left: 8, delay: 1.6, dur: 2.0 },
                      ].map((drop, bi) => (
                        <div
                          key={`bd-${bi}`}
                          className="absolute blood-drip pointer-events-none"
                          style={{
                            left: `${drop.left}%`,
                            width: `${drop.w}px`,
                            height: `${drop.h}px`,
                            animationDelay: `${drop.delay}s`,
                            animationDuration: `${drop.dur}s`,
                          }}
                        >
                          <svg viewBox="0 0 10 16" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <radialGradient id={`bdrop-combat-${bi}`} cx="40%" cy="55%" r="55%">
                                <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.95" />
                                <stop offset="50%" stopColor="#7f1d1d" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#450a0a" stopOpacity="0.65" />
                              </radialGradient>
                              <radialGradient id={`bshine-combat-${bi}`} cx="35%" cy="30%" r="30%">
                                <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            <path
                              d="M5 0.5 C6.8 3.8, 9.2 7.5, 9.2 10.2 C9.2 13, 7.4 15.5, 5 15.5 C2.6 15.5, 0.8 13, 0.8 10.2 C0.8 7.5, 3.2 3.8, 5 0.5 Z"
                              fill={`url(#bdrop-combat-${bi})`}
                            />
                            <ellipse cx="3.5" cy="6.5" rx="1.8" ry="2.2" fill={`url(#bshine-combat-${bi})`} />
                          </svg>
                        </div>
                      ))}
                    </>
                  )}
                  {/* ── POISON VISUAL: strong violet overlay + edge glow ── */}
                  {isPoisoned && !isDead && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none poison-overlay" />
                      <div className="absolute inset-0 rounded-lg pointer-events-none poison-edge-glow" />
                    </>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold ${isDead ? 'text-gray-700' : isActive ? 'text-yellow-200' : 'text-gray-300'}`}>
                  {char.name}
                </span>
                {/* Mini HP bar */}
                <div className="w-18 sm:w-20 h-2 rounded-full overflow-hidden bg-gray-800/80">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${pct}%`,
                    background: isDead ? '#374151' : isPoisoned ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : isBleeding ? 'linear-gradient(90deg, #dc2626, #f87171)' : pct > 60 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : pct > 30 ? 'linear-gradient(90deg, #ca8a04, #eab308)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
                    boxShadow: isDead ? 'none' : isPoisoned ? '0 0 6px rgba(168,85,247,0.5)' : isBleeding ? '0 0 6px rgba(248,113,113,0.5)' : `0 0 6px ${pct > 60 ? 'rgba(34,197,94,0.4)' : pct > 30 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.5)'}`,
                  }} />
                </div>
                {(isPoisoned || isBleeding) && !isDead && (
                  <span className="text-[7px] animate-pulse leading-none">{isPoisoned ? '☠️' : '🩸'}</span>
                )}
                {/* Ammo indicator for ranged weapons */}
                {char.weapon?.type === 'ranged' && !isDead && (() => {
                  const ammoId = WEAPON_AMMO[char.weapon.itemId];
                  if (!ammoId) return null;
                  const ammoCount = char.inventory.filter(i => i.itemId === ammoId).reduce((s, i) => s + (i.quantity || 0), 0);
                  return (
                    <span className={`text-[7px] font-mono font-bold leading-none ${ammoCount === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      🔫 {ammoCount}
                    </span>
                  );
                })()}
                {isHurt && anim.value && (
                  <div className="absolute -top-2 right-0 z-30">
                    <div className="damage-number"><span className={`text-xs font-black ${isCrit ? 'text-orange-400' : 'text-red-400'}`}>-{anim.value}</span></div>
                  </div>
                )}
                {isHealing && anim.value && (
                  <div className="absolute -top-2 right-0 z-30">
                    <div className="heal-number"><span className="text-xs font-black text-green-400">+{anim.value}</span></div>
                  </div>
                )}
                {isTargetable && (
                  <Heart className="absolute inset-0 m-auto w-3 h-3 text-green-400 animate-pulse opacity-60 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTEXT MENU (action buttons) — floating in arena (DESKTOP only) ── */}
      <AnimatePresence>
        {(showMenu || autoCombat) && isPlayerTurn && (
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
              {!autoCombat && <button onClick={cancelAll} className="text-white/40 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>}
            </div>
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => !autoCombat && handleMenuAction('attack')}
                disabled={autoCombat}
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
              <button
                onClick={() => !autoCombat && handleMenuAction('special')}
                disabled={specialCd > 0 || autoCombat}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all relative ${
                  aiPredictedAction === 'special'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'text-gray-200 hover:bg-amber-950/40 hover:text-amber-200 hover:border-amber-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {(() => { const sp = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special1Id') || '') : undefined; return sp?.name || (arch === 'tank' ? 'Barricata' : arch === 'healer' ? 'Cura' : 'Mortale'); })()}
                {specialCd > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{specialCd} turni</span>
                )}
              </button>
              <button
                onClick={() => !autoCombat && handleMenuAction('special2')}
                disabled={special2Cd > 0 || autoCombat}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all relative ${
                  aiPredictedAction === 'special2'
                    ? 'bg-orange-500/20 border border-orange-500/40 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.3)] animate-pulse'
                    : 'text-gray-200 hover:bg-orange-950/40 hover:text-orange-200 hover:border-orange-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                {(() => { const sp = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special2Id') || '') : undefined; return sp?.name || (arch === 'tank' ? 'Immolazione' : arch === 'healer' ? 'Cura Gruppo' : 'Raffica'); })()}
                {special2Cd > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{special2Cd} turni</span>
                )}
              </button>
              <button
                onClick={() => !autoCombat && handleMenuAction('use_item')}
                disabled={usableItems.length === 0 || autoCombat}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                  aiPredictedAction === 'use_item'
                    ? 'bg-green-500/20 border border-green-500/40 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.3)] animate-pulse'
                    : 'text-gray-200 hover:bg-green-950/40 hover:text-green-200 hover:border-green-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-green-400" />
                Oggetto
                <span className="ml-auto text-[9px] text-gray-500">{usableItems.length}</span>
              </button>
              <button
                onClick={() => !autoCombat && handleMenuAction('defend')}
                disabled={autoCombat}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                  aiPredictedAction === 'defend'
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse'
                    : 'text-gray-200 hover:bg-cyan-950/40 hover:text-cyan-200 hover:border-cyan-700/50 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Difesa
              </button>
              <button
                onClick={() => handleMenuAction('flee')}
                disabled={enemies.some(e => e.isBoss)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 hover:border-gray-600 border border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Footprints className="w-3.5 h-3.5" />
                Fuga
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ITEM SELECT — floating in arena (DESKTOP only) ── */}
      <AnimatePresence>
        {showItemSelect && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15 }}
            className="hidden lg:block absolute z-40 left-2 sm:left-4 right-2 sm:right-4 bottom-2 sm:bottom-3 glass-dark rounded-lg"
          >
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Oggetti</span>
              <button onClick={cancelAll} className="text-white/40 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {usableItems.length === 0 ? (
              <p className="text-gray-500 text-xs px-3 py-3">Nessun oggetto utilizzabile.</p>
            ) : (
              <div className="p-1.5 max-h-32 overflow-y-auto inventory-scrollbar space-y-0.5">
                {usableItems.map(item => (
                  <button
                    key={item.uid}
                    onClick={() => handleItemSelect(item.uid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-200 hover:bg-amber-950/30 hover:text-amber-200 border border-transparent hover:border-amber-700/30 transition-all text-left"
                  >
                    <span className="text-base flex items-center">
                      <ItemIcon itemId={item.itemId} rarity={item.rarity} size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{item.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI MODE PANEL — top-right in arena (DESKTOP only) ── */}
      {!isCombatEnd && (
        <div className="hidden lg:flex absolute z-40 top-2 right-2 sm:top-3 sm:right-3 glass-dark rounded-lg px-4 py-2.5 items-center gap-3" style={{ minWidth: '240px' }}>
          <div className="flex items-center gap-1.5">
            {autoCombat && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
            <span className={`text-xs font-semibold ${autoCombat ? 'text-amber-300' : 'text-gray-500'}`}>
              {autoCombat ? '⚔️ Combattimento automatico' : '🤖 Combattimento manuale'}
            </span>
          </div>
          <button
            onClick={toggleAutoCombat}
            className={`text-xs px-3 py-1.5 rounded border font-semibold transition-all whitespace-nowrap ${
              autoCombat
                ? 'border-amber-500/30 text-amber-300 bg-amber-500/[0.06] hover:bg-amber-500/10'
                : 'border-white/[0.08] text-white/40 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white/60 hover:border-white/[0.15]'
            }`}
          >
            {autoCombat ? '⏹ Ferma AI' : '▶ Attiva AI'}
          </button>
        </div>
      )}

      {/* ── TARGETING HINT (DESKTOP only) ── */}
      <AnimatePresence>
        {targetingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:block absolute z-30 left-2 sm:left-4 bottom-2 sm:bottom-3"
          >
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border backdrop-blur-sm text-[10px] font-semibold ${
              targetingMode === 'enemy'
                ? 'bg-red-950/80 border-red-700/40 text-red-300'
                : 'bg-green-950/80 border-green-700/40 text-green-300'
            }`}>
              {targetingMode === 'enemy' ? (
                <Crosshair className="w-3 h-3" />
              ) : (
                <Heart className="w-3 h-3" />
              )}
              <span>{targetingMode === 'enemy' ? 'Scegli bersaglio' : 'Scegli alleato'}</span>
              <span className="text-gray-500 ml-1">| {targetingMode === 'enemy' ? aliveEnemies.length : aliveParty.length} targets · Esc per annullare</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderCombatLog = () => (
    <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-white/[0.06] glass-dark-inner p-2 sm:p-3 inventory-scrollbar">
      <div className="space-y-0.5">
        {combat.log.map((entry, i) => {
          const isNew = i === combat.log.length - 1;
          return (
            <motion.p
              key={i}
              initial={isNew ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm sm:text-base leading-relaxed ${
                entry.isCritical
                  ? 'text-yellow-400 font-bold'
                  : entry.isMiss
                  ? 'text-gray-500 italic'
                  : entry.damage && entry.damage > 0
                  ? entry.actorType === 'player' ? 'text-green-400' : 'text-red-400'
                  : entry.heal ? 'text-green-300'
                  : entry.action === 'Sanguinamento' ? 'text-red-400'
                  : entry.action === 'Avvelenamento' ? 'text-purple-400'
                  : entry.message.startsWith('---') ? 'text-gray-600 text-center'
                  : 'text-gray-400'
              }`}
            >
              {entry.isCritical && '💥 '}
              {entry.isMiss && '💨 '}
              <LogText text={entry.message} party={party.map(p => ({ name: p.name, avatarSrc: mediaUrl(p.avatarUrl || CHARACTER_IMAGES[p.archetype] || '', dataVersion) }))} />
            </motion.p>
          );
        })}
      </div>
    </div>
  );

  const renderAutoCombatBar = () => (
    <div className="shrink-0 border-t border-white/[0.06] bg-black/70 backdrop-blur-xl px-3 py-1.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {autoCombat && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
        <span className={`text-[10px] font-semibold ${autoCombat ? 'text-amber-300' : 'text-gray-500'}`}>
          {autoCombat ? '⚔️ Combattimento automatico' : '🤖 Combattimento manuale'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleAutoCombat}
          className={`text-[9px] px-2 py-1 rounded border font-semibold transition-all ${
            autoCombat
              ? 'border-amber-500/30 text-amber-300 bg-amber-500/[0.06] hover:bg-amber-500/10'
              : 'border-white/[0.08] text-white/40 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white/60 hover:border-white/[0.15]'
          }`}
        >
          {autoCombat ? '⏹ Ferma AI' : '▶ Attiva AI'}
        </button>
      </div>
    </div>
  );

  const renderBottomBars = () => (
    <>
      {/* Enemy turn hint */}
      {!isCombatEnd && !isPlayerTurn && (
        <div className="shrink-0 border-t border-red-900/30 bg-gray-950/95 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            <span className="text-red-300 text-xs font-semibold">
              {enemies.find(e => e.id === combat.currentActorId)?.name || 'Nemico'} sta agendo...
            </span>
          </div>
        </div>
      )}
      {/* Player turn hint + AI toggle (mobile) */}
      {isPlayerTurn && !showMenu && !targetingMode && !showItemSelect && !isCombatEnd && (
        <div className="shrink-0 border-t border-gray-800/50 bg-gray-950/80 px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Hand className="w-3 h-3" />
              <span>Clicca su <strong className="text-yellow-300">{currentCharacter?.name}</strong> per agire</span>
            </div>
            <button
              onClick={toggleAutoCombat}
              className={`lg:hidden text-[10px] px-2.5 py-1 rounded border font-semibold transition-all whitespace-nowrap ${
                autoCombat
                  ? 'border-amber-500/30 text-amber-300 bg-amber-500/[0.06]'
                  : 'border-white/[0.08] text-white/40 bg-white/[0.03]'
              }`}
            >
              {autoCombat ? '⏹ AI' : '▶ AI'}
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={`h-screen game-horror flex flex-col overflow-hidden relative ${killFlash ? 'animate-kill-flash' : ''}`}>

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
          {renderTurnIndicator()}
          {/* Combat log fills remaining space */}
          <div className="flex-1 min-h-0 px-3 py-1.5 flex flex-col">
            {renderCombatLog()}
          </div>
          {/* Bottom hint bars */}
          {renderBottomBars()}
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
          {renderTurnIndicator()}
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
            {renderCombatLog()}
          </div>
        </div>
      </div>

      {/* ── MOBILE ACTION BAR — below arena/log, never overlaps characters ── */}
      <AnimatePresence>
        {(showMenu || autoCombat) && isPlayerTurn && (
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
                {!autoCombat && (
                  <button onClick={cancelAll} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 p-1.5">
                <button
                  onClick={() => !autoCombat && handleMenuAction('attack')}
                  disabled={autoCombat}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
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
                <button
                  onClick={() => !autoCombat && handleMenuAction('special')}
                  disabled={specialCd > 0 || autoCombat}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed relative ${
                    aiPredictedAction === 'special'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                      : 'text-gray-300 active:bg-amber-950/50 active:text-amber-200 border border-transparent'
                  }`}
                >
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="truncate max-w-full">{(() => { const sp = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special1Id') || '') : undefined; return sp?.name || (arch === 'tank' ? 'Barricata' : arch === 'healer' ? 'Cura' : 'Mortale'); })()}</span>
                  {specialCd > 0 && (
                    <span className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded">{specialCd}t</span>
                  )}
                </button>
                <button
                  onClick={() => !autoCombat && handleMenuAction('special2')}
                  disabled={special2Cd > 0 || autoCombat}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed relative ${
                    aiPredictedAction === 'special2'
                      ? 'bg-orange-500/20 border border-orange-500/40 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)] animate-pulse'
                      : 'text-gray-300 active:bg-orange-950/50 active:text-orange-200 border border-transparent'
                  }`}
                >
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="truncate max-w-full">{(() => { const sp = currentCharacter ? getSpecialById(resolveSpecialId(currentCharacter, 'special2Id') || '') : undefined; return sp?.name || (arch === 'tank' ? 'Immolazione' : arch === 'healer' ? 'Cura Gruppo' : 'Raffica'); })()}</span>
                  {special2Cd > 0 && (
                    <span className="bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded">{special2Cd}t</span>
                  )}
                </button>
                <button
                  onClick={() => !autoCombat && handleMenuAction('use_item')}
                  disabled={usableItems.length === 0 || autoCombat}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    aiPredictedAction === 'use_item'
                      ? 'bg-green-500/20 border border-green-500/40 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse'
                      : 'text-gray-300 active:bg-green-950/50 active:text-green-200 border border-transparent'
                  }`}
                >
                  <Package className="w-5 h-5 text-green-400" />
                  <span>Oggetto</span>
                  <span className="text-[8px] text-gray-500">{usableItems.length}</span>
                </button>
                <button
                  onClick={() => !autoCombat && handleMenuAction('defend')}
                  disabled={autoCombat}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    aiPredictedAction === 'defend'
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse'
                      : 'text-gray-300 active:bg-cyan-950/50 active:text-cyan-200 border border-transparent'
                  }`}
                >
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Difesa</span>
                </button>
                <button
                  onClick={() => handleMenuAction('flee')}
                  disabled={enemies.some(e => e.isBoss)}
                  className="flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg text-[10px] font-medium text-gray-500 active:bg-gray-800/60 active:text-gray-200 border border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Footprints className="w-5 h-5" />
                  <span>Fuga</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE ITEM SELECT — below arena, never overlaps characters ── */}
      <AnimatePresence>
        {showItemSelect && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden shrink-0 px-2 pb-1.5"
          >
            <div className="glass-dark rounded-xl">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">🎒 Oggetti</span>
                <button onClick={cancelAll} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {usableItems.length === 0 ? (
                <p className="text-gray-500 text-xs px-3 py-3">Nessun oggetto utilizzabile.</p>
              ) : (
                <div className="p-1.5 max-h-40 overflow-y-auto inventory-scrollbar space-y-0.5">
                  {usableItems.map(item => (
                    <button
                      key={item.uid}
                      onClick={() => handleItemSelect(item.uid)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-gray-200 active:bg-amber-950/30 active:text-amber-200 border border-transparent transition-all text-left"
                    >
                      <span className="text-base flex items-center">
                        <ItemIcon itemId={item.itemId} rarity={item.rarity} size={20} />
                      </span>
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-[9px] text-gray-500">x{item.quantity}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Targeting hint (mobile only) ── */}
      <AnimatePresence>
        {targetingMode && isPlayerTurn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="lg:hidden shrink-0 px-2 pb-1.5"
          >
            <div className="glass-dark rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs text-gray-200">
                  {targetingMode === 'enemy' ? 'Scegli un nemico da attaccare' : 'Scegli un alleato da curare'}
                </span>
              </div>
              <button onClick={cancelAll} className="text-white/40 hover:text-white transition-colors px-2 py-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom bars: only on mobile, below the split ── */}
      <div className="lg:hidden shrink-0">
        {renderBottomBars()}
      </div>
    </div>
  );
}
