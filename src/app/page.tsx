'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/game/store';
import TitleScreen from '@/components/game/TitleScreen';
import CharacterSelect from '@/components/game/CharacterSelect';
import ExplorationScreen from '@/components/game/ExplorationScreen';
import CombatScreen from '@/components/game/CombatScreen';
import InventoryPanel from '@/components/game/InventoryPanel';
import GameOverScreen from '@/components/game/GameOverScreen';
import VictoryScreen from '@/components/game/VictoryScreen';
import GameNotification from '@/components/game/GameNotification';
import GameMap from '@/components/game/GameMap';
import DebugPanel from '@/components/game/DebugPanel';
import { playBgm, stopBgm } from '@/game/engine/sounds';
import type { BgmType } from '@/game/engine/sounds';

export default function GamePage() {
  const phase = useGameStore(s => s.phase);
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const prevPhaseRef = useRef(phase);

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
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Initialize audio context on first user interaction (browser policy)
    const initAudio = () => {
      try { playBgm('title'); } catch { /* retry on next interaction */ }
    };

    switch (phase) {
      case 'title':
      case 'character-select':
        playBgm('title');
        break;
      case 'exploration':
      case 'event':
        // Map location IDs to BGM types for cinematic location-specific ambient
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
      default:
        stopBgm();
    }

    // Resume audio context on first user interaction
    const handleInteraction = () => {
      try {
        if (phase === 'combat') playBgm('combat');
        else if (phase === 'title' || phase === 'character-select') playBgm('title');
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
  }, [phase, currentLocationId]);

  return (
    <div className="game-root">
      {phase === 'title' && <TitleScreen />}
      {phase === 'character-select' && <CharacterSelect />}
      {phase === 'exploration' && <ExplorationScreen />}
      {phase === 'combat' && <CombatScreen />}
      {phase === 'event' && <ExplorationScreen />}
      {phase === 'game-over' && <GameOverScreen />}
      {phase === 'victory' && <VictoryScreen />}
      <InventoryPanel />
      <GameNotification />
      <GameMap />
      <DebugPanel />
    </div>
  );
}
