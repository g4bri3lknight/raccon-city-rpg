'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { refreshGameData } from '@/game/data/loader';
import { X } from 'lucide-react';
import TitleScreen from '@/components/game/TitleScreen';
import LoadingScreen from '@/components/game/LoadingScreen';
import CharacterSelect from '@/components/game/CharacterSelect';
import CharacterCreator from '@/components/game/CharacterCreator';
import ExplorationScreen from '@/components/game/ExplorationScreen';
import CombatScreen from '@/components/game/CombatScreen';
import InventoryPanel from '@/components/game/InventoryPanel';
import GameOverScreen from '@/components/game/GameOverScreen';
import VictoryScreen from '@/components/game/VictoryScreen';
import GameNotification from '@/components/game/GameNotification';
import GameMap from '@/components/game/GameMap';
import DebugPanel from '@/components/game/DebugPanel';
import AchievementPanel from '@/components/game/AchievementPanel';
import BestiaryPanel from '@/components/game/BestiaryPanel';
import DocumentsPanel from '@/components/game/DocumentsPanel';
import NPCDialogPanel from '@/components/game/NPCDialogPanel';
import PuzzlePanel from '@/components/game/PuzzlePanel';
import QTEPanel from '@/components/game/QTEPanel';
import AdminPanel from '@/components/game/AdminPanel';
import SettingsPanel from '@/components/game/SettingsPanel';
import { KeyboardShortcutsOverlay } from '@/components/game/KeyboardShortcutsOverlay';
import Footer from '@/components/Footer';
import { ErrorBoundary } from '@/components/game/ErrorBoundary';
import StandaloneLogPanel from '@/components/game/StandaloneLogPanel';
import { playBgm, stopBgm, resumeAmbient, playLocationAmbient, playSafeRoomAmbient, stopAllSounds } from '@/game/engine/sounds';

interface PlayShellProps {
  gameId: string;
  onBack: () => void;
  isStandalone?: boolean;
}

// Phases where the game is "in progress" and should prompt before exiting
const IN_PROGRESS_PHASES = new Set([
  'exploration', 'combat', 'event', 'puzzle', 'qte',
]);

export default function PlayShell({ gameId, onBack, isStandalone = false }: PlayShellProps) {
  const phase = useGameStore(s => s.phase);
  const prevPhaseRef = useRef(phase);
  const [dataReady, setDataReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // ── Draggable close button state ──
  const dragRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const [btnPos, setBtnPos] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const btnSize = 36;
  const btnMargin = 12;

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect();
    if (rect) {
      setBtnPos({ left: rect.left, top: rect.top });
    }
    setIsDragging(false);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origLeft: btnPos?.left ?? (window.innerWidth - btnSize - btnMargin),
      origTop: btnPos?.top ?? btnMargin,
    };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    // Only consider it a drag if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
    }
    setBtnPos({
      left: Math.max(0, Math.min(window.innerWidth - btnSize, dragRef.current.origLeft + dx)),
      top: Math.max(0, Math.min(window.innerHeight - btnSize, dragRef.current.origTop + dy)),
    });
  };

  const handleDragEnd = () => {
    if (!dragRef.current || !btnPos) { dragRef.current = null; return; }
    // Snap to nearest corner
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = btnPos.left + btnSize / 2;
    const cy = btnPos.top + btnSize / 2;
    const snapLeft = cx < vw / 2;
    const snapTop = cy < vh / 2;
    setBtnPos({
      left: snapLeft ? btnMargin : vw - btnSize - btnMargin,
      top: snapTop ? btnMargin : vh - btnSize - btnMargin,
    });
    dragRef.current = null;
  };

  // ── Set activeGameId cookie so API routes use the correct game DB ──
  useEffect(() => {
    document.cookie = `activeGameId=${encodeURIComponent(gameId)}; path=/; SameSite=Lax`;
    refreshGameData()
      .then(() => setFadeOut(true))
      .catch(() => setFadeOut(true));
    return () => {
      document.cookie = 'activeGameId=; path=/; max-age=0';
    };
  }, [gameId]);

  // ── Global mouse/touch move/up for draggable button ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e);
    const onTouchMove = (e: TouchEvent) => handleDragMove(e);
    const onMouseUp = () => handleDragEnd();
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  });

  // After fade-out animation completes, show game
  useEffect(() => {
    if (fadeOut) {
      const timer = setTimeout(() => setDataReady(true), 700);
      return () => clearTimeout(timer);
    }
  }, [fadeOut]);

  // Escape key handler — exit to dashboard (with confirmation if game in progress)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't capture Escape if a dialog/panel is open that uses Escape natively
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (IN_PROGRESS_PHASES.has(phase)) {
        const confirmed = window.confirm('Are you sure you want to exit? Unsaved progress will be lost.');
        if (!confirmed) return;
      }
      stopAllSounds();
      onBack();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, onBack]);

  // F2 key toggles debug panel (editor mode only — not in standalone)
  useEffect(() => {
    if (isStandalone) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        useGameStore.setState(s => ({ debugOpen: !s.debugOpen }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // H key toggles keyboard shortcuts overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        useGameStore.setState(s => ({ helpOpen: !s.helpOpen }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── BGM management based on game phase ──
  useEffect(() => {
    if (!dataReady) return;

    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    switch (phase) {
      case 'title':
      case 'character-select':
      case 'character-creator':
        playBgm('title');
        break;
      case 'exploration':
      case 'event': {
        // When returning from combat, resume the ambient that was suspended
        if (prevPhase === 'combat' || prevPhase === 'qte') {
          try { resumeAmbient(); } catch {}
        } else {
          // Entering exploration for the first time (from character-select, title, etc.)
          // Start the appropriate ambient sound and stop any playing BGM
          const state = useGameStore.getState();
          if (state.currentSubArea === 'safe_room' && state.currentLocationId) {
            try { playSafeRoomAmbient(state.currentLocationId); } catch {}
          } else if (state.currentLocationId) {
            try { playLocationAmbient(state.currentLocationId); } catch {}
          }
        }
        break;
      }
      case 'combat':
        playBgm('combat');
        break;
      case 'game-over':
        playBgm('gameover');
        break;
      case 'victory':
        playBgm('victory');
        break;
      case 'puzzle':
        // Keep current BGM during puzzles
        break;
      case 'qte':
        playBgm('combat');
        break;
      default:
        stopBgm();
    }

    const handleInteraction = () => {
      try {
        if (phase === 'combat') playBgm('combat');
        else if (phase === 'title' || phase === 'character-select' || phase === 'character-creator') playBgm('title');
        // Location ambient is handled by playLocationAmbient() — no BGM during exploration
      } catch { /* ok */ }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
  }, [phase, dataReady]);

  // Show branded loading screen while data is initializing
  if (!dataReady) {
    return <LoadingScreen fadeOut={fadeOut} />;
  }

  return (
    <div className="game-root">
      {!isStandalone && dataReady && (
        <button
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={(e) => {
            // Only trigger click if we didn't actually drag
            if (isDragging) {
              setIsDragging(false);
              return;
            }
            if (IN_PROGRESS_PHASES.has(phase)) {
              const confirmed = window.confirm('Are you sure you want to exit? Unsaved progress will be lost.');
              if (!confirmed) return;
            }
            stopAllSounds();
            onBack();
          }}
          className="fixed z-50 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/[0.1] text-white/40 hover:text-white hover:bg-black/80 hover:border-white/[0.25] active:scale-95 transition-all cursor-grab active:cursor-grabbing select-none"
          style={btnPos ? { left: btnPos.left, top: btnPos.top } : { top: 12, right: 12 }}
          title="Exit Game (Esc) — drag to move"
          aria-label="Exit Game"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <ErrorBoundary name="Title">
        <div key={phase === 'title' ? 'title' : undefined} className={phase === 'title' ? 'phase-enter' : ''}>
          {phase === 'title' && <TitleScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="CharacterSelect">
        <div key={phase === 'character-select' ? 'char-sel' : undefined} className={phase === 'character-select' ? 'phase-enter' : ''}>
          {phase === 'character-select' && <CharacterSelect />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="CharacterCreator">
        <div key={phase === 'character-creator' ? 'char-cre' : undefined} className={phase === 'character-creator' ? 'phase-enter' : ''}>
          {phase === 'character-creator' && <CharacterCreator onComplete={() => useGameStore.getState().goToCharacterSelect()} onCancel={() => useGameStore.getState().goToCharacterSelect()} />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="Exploration">
        <div key={phase === 'exploration' ? 'explo' : undefined} className={phase === 'exploration' ? 'phase-enter' : ''}>
          {phase === 'exploration' && <ExplorationScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="Combat">
        <div key={phase === 'combat' ? 'combat' : undefined} className={phase === 'combat' ? 'phase-enter' : ''}>
          {phase === 'combat' && <CombatScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="EventExploration">
        <div key={phase === 'event' ? 'event' : undefined} className={phase === 'event' ? 'phase-enter' : ''}>
          {phase === 'event' && <ExplorationScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="GameOver">
        <div key={phase === 'game-over' ? 'go' : undefined} className={phase === 'game-over' ? 'phase-enter' : ''}>
          {phase === 'game-over' && <GameOverScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="Victory">
        <div key={phase === 'victory' ? 'victory' : undefined} className={phase === 'victory' ? 'phase-enter' : ''}>
          {phase === 'victory' && <VictoryScreen />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="Puzzle">
        <div key={phase === 'puzzle' ? 'puzzle' : undefined} className={phase === 'puzzle' ? 'phase-enter' : ''}>
          {phase === 'puzzle' && <PuzzlePanel />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="QTE">
        <div key={phase === 'qte' ? 'qte' : undefined} className={phase === 'qte' ? 'phase-enter' : ''}>
          {phase === 'qte' && <QTEPanel />}
        </div>
      </ErrorBoundary>
      <ErrorBoundary name="Inventory">
        <InventoryPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Notification">
        <GameNotification />
      </ErrorBoundary>
      <ErrorBoundary name="GameMap">
        <GameMap />
      </ErrorBoundary>
      <ErrorBoundary name="Achievements">
        <AchievementPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Bestiary">
        <BestiaryPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Documents">
        <DocumentsPanel />
      </ErrorBoundary>
      <ErrorBoundary name="NPCDialog">
        <NPCDialogPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Settings">
        <SettingsPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Debug">
        <DebugPanel isStandalone={isStandalone} />
      </ErrorBoundary>
      <ErrorBoundary name="Admin">
        <AdminPanel isStandalone={isStandalone} />
      </ErrorBoundary>
      <KeyboardShortcutsOverlay />
      {isStandalone && <Footer />}
      {isStandalone && <StandaloneLogPanel />}
    </div>
  );
}
