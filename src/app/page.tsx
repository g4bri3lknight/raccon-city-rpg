'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// Lazy-load heavy views to keep dashboard fast
const GameManager = dynamic(
  () => import('@/components/game/admin/tabs/GameManager'),
  { ssr: false }
);
const EditorShell = dynamic(
  () => import('@/components/game/EditorShell'),
  { ssr: false }
);
const PlayShell = dynamic(
  () => import('@/components/game/PlayShell'),
  { ssr: false }
);

type ViewType = 'dashboard' | 'editor' | 'play';

export default function RootPage() {
  const searchParams = useSearchParams();

  // Electron game-only mode: ?mode=play&gameId=xxx
  // Bypasses the dashboard and goes directly to the game
  const electronMode = useMemo(() => {
    const mode = searchParams.get('mode');
    const id = searchParams.get('gameId');
    if (mode === 'play' && id) return { gameId: id };
    return null;
  }, [searchParams]);

  const [view, setView] = useState<ViewType>(
    electronMode ? 'play' : 'dashboard'
  );
  const [gameId, setGameId] = useState<string>(
    electronMode?.gameId ?? ''
  );

  const openEditor = useCallback((id: string) => {
    setGameId(id);
    setView('editor');
  }, []);

  const openPlay = useCallback((id: string) => {
    setGameId(id);
    setView('play');
  }, []);

  const goBack = useCallback(() => {
    // In Electron game-only mode, goBack does nothing (no dashboard)
    if (electronMode) return;
    setView('dashboard');
    setGameId('');
  }, [electronMode]);

  if (view === 'editor' && gameId) {
    return <EditorShell gameId={gameId} onBack={goBack} onPlay={openPlay} />;
  }

  if (view === 'play' && gameId) {
    return <PlayShell gameId={gameId} onBack={goBack} />;
  }

  return (
    <div className="h-full" style={{ background: '#0a0a0f' }}>
      <GameManager onOpenEditor={openEditor} onPlay={openPlay} />
    </div>
  );
}
