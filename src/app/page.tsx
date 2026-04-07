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
import { playBgm, stopBgm, preloadCriticalSounds } from '@/game/engine/sounds';
import type { BgmType } from '@/game/engine/sounds';

export default function GamePage() {
  const phase = useGameStore(s => s.phase);
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const prevPhaseRef = useRef(phase);
  const [dataReady, setDataReady] = useState(false);

  // ── Initialize game data from DB (fallback to static) ──
  useEffect(() => {
    initGameData().then(() => setDataReady(true)).catch(() => setDataReady(true));
  }, []);

  // F2 key toggles debug panel
  useEffect(() => {
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
        const locationBgmMap: Record<string, string> = {
          city_outskirts: 'city_outskirts',
          rpd_station: 'rpd_station',
          hospital_district: 'hospital',
          sewers: 'sewers',
          laboratory_entrance: 'laboratory',
          clock_tower: 'clock_tower',
        };
        playBgm((locationBgmMap[currentLocationId] || 'city_outskirts') as BgmType);
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
        preloadCriticalSounds(); // preload critical SFX in background
        if (phase === 'combat') playBgm('combat');
        else if (phase === 'title' || phase === 'character-select' || phase === 'character-creator') playBgm('title');
        else if (phase === 'exploration' || phase === 'event') {
          const locationBgmMap: Record<string, string> = {
            city_outskirts: 'city_outskirts',
            rpd_station: 'rpd_station',
            hospital_district: 'hospital',
            sewers: 'sewers',
            laboratory_entrance: 'laboratory',
            clock_tower: 'clock_tower',
          };
          playBgm((locationBgmMap[currentLocationId] || 'city_outskirts') as BgmType);
        }
        else playBgm('city_outskirts');
      } catch { /* ok */ }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
  }, [phase, currentLocationId, dataReady]);

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
      {phase === 'title' && <TitleScreen />}
      {phase === 'character-select' && <CharacterSelect />}
      {phase === 'character-creator' && <CharacterCreator onComplete={() => useGameStore.getState().goToCharacterSelect()} onCancel={() => useGameStore.getState().goToCharacterSelect()} />}
      {phase === 'exploration' && <ExplorationScreen />}
      {phase === 'combat' && <CombatScreen />}
      {phase === 'event' && <ExplorationScreen />}
      {phase === 'game-over' && <GameOverScreen />}
      {phase === 'victory' && <VictoryScreen />}
      {phase === 'puzzle' && <PuzzlePanel />}
      {phase === 'qte' && <QTEPanel />}
      <InventoryPanel />
      <GameNotification />
      <GameMap />
      <AchievementPanel />
      <BestiaryPanel />
      <DocumentsPanel />
      <NPCDialogPanel />
      <DebugPanel />
      <AdminPanel />
    </div>
  );
}
