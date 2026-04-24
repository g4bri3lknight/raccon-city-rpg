'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { initGameData } from '@/game/data/loader';
import TitleScreen from '@/components/game/TitleScreen';
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
import { ErrorBoundary } from '@/components/game/ErrorBoundary';
import { playBgm, stopBgm, resumeAmbient } from '@/game/engine/sounds';
import type { BgmType } from '@/game/engine/sounds';

export default function GamePage() {
  const phase = useGameStore(s => s.phase);
  const prevPhaseRef = useRef(phase);
  const [dataReady, setDataReady] = useState(false);

  // ── Initialize game data from DB (fallback to static) ──
  useEffect(() => {
    initGameData().then(() => setDataReady(true)).catch(() => setDataReady(true));
  }, []);

  // F2 key toggles debug panel (dev mode only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        useGameStore.setState(s => ({ debugOpen: !s.debugOpen }));
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
      case 'event':
        // Location ambient is handled by playLocationAmbient() called from exploration.ts
        // When returning from combat, resume the ambient that was suspended
        if (prevPhase === 'combat' || prevPhase === 'qte') {
          try { resumeAmbient(); } catch {}
        }
        break;
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

  // Show loading screen while data is initializing
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🧟</div>
          <p className="text-white/60 text-sm">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-root">
      <ErrorBoundary name="Title">
        {phase === 'title' && <TitleScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="CharacterSelect">
        {phase === 'character-select' && <CharacterSelect />}
      </ErrorBoundary>
      <ErrorBoundary name="CharacterCreator">
        {phase === 'character-creator' && <CharacterCreator onComplete={() => useGameStore.getState().goToCharacterSelect()} onCancel={() => useGameStore.getState().goToCharacterSelect()} />}
      </ErrorBoundary>
      <ErrorBoundary name="Exploration">
        {phase === 'exploration' && <ExplorationScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="Combat">
        {phase === 'combat' && <CombatScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="EventExploration">
        {phase === 'event' && <ExplorationScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="GameOver">
        {phase === 'game-over' && <GameOverScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="Victory">
        {phase === 'victory' && <VictoryScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="Puzzle">
        {phase === 'puzzle' && <PuzzlePanel />}
      </ErrorBoundary>
      <ErrorBoundary name="QTE">
        {phase === 'qte' && <QTEPanel />}
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
        <DebugPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Admin">
        <AdminPanel />
      </ErrorBoundary>
    </div>
  );
}
