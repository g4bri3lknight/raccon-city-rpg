'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { initGameData } from '@/game/data/loader';
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
import { ErrorBoundary } from '@/components/game/ErrorBoundary';
import { playBgm, stopBgm, resumeAmbient, playLocationAmbient, playSafeRoomAmbient } from '@/game/engine/sounds';
import type { BgmType } from '@/game/engine/sounds';

export default function PlayPage() {
  const phase = useGameStore(s => s.phase);
  const prevPhaseRef = useRef(phase);
  const [dataReady, setDataReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // ── Initialize game data from DB (fallback to static) ──
  useEffect(() => {
    initGameData()
      .then(() => setFadeOut(true))
      .catch(() => setFadeOut(true));
  }, []);

  // After fade-out animation completes, show game
  useEffect(() => {
    if (fadeOut) {
      const timer = setTimeout(() => setDataReady(true), 700);
      return () => clearTimeout(timer);
    }
  }, [fadeOut]);

  // F2 key — disabled in standalone mode (debug panel not available)
  // DebugPanel and AdminPanel are rendered with isStandalone=true to block them

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
        <DebugPanel isStandalone />
      </ErrorBoundary>
      <ErrorBoundary name="Admin">
        <AdminPanel isStandalone />
      </ErrorBoundary>
      <KeyboardShortcutsOverlay />
    </div>
  );
}
