'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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

function RootPageInner() {
  const searchParams = useSearchParams();

  // Standalone game-only mode: ?mode=play&gameId=xxx
  // Bypasses the dashboard and goes directly to the game
  const standaloneMode = useMemo(() => {
    const mode = searchParams.get('mode');
    const id = searchParams.get('gameId');
    if (mode === 'play' && id) return { gameId: id };
    return null;
  }, [searchParams]);

  const [view, setView] = useState<ViewType>(
    standaloneMode ? 'play' : 'dashboard'
  );
  const [gameId, setGameId] = useState<string>(
    standaloneMode?.gameId ?? ''
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
    // In standalone game-only mode, goBack does nothing (no dashboard)
    if (standaloneMode) return;
    setView('dashboard');
    setGameId('');
  }, [standaloneMode]);

  if (view === 'editor' && gameId) {
    return <EditorShell gameId={gameId} onBack={goBack} onPlay={openPlay} />;
  }

  if (view === 'play' && gameId) {
    return <PlayShell gameId={gameId} onBack={goBack} isStandalone={!!standaloneMode} />;
  }

  return (
    <div className="h-full" style={{ background: '#0a0a0f' }}>
      <GameManager onOpenEditor={openEditor} onPlay={openPlay} />
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a0f' }} />
    }>
      <RootPageInner />
    </Suspense>
  );
}
