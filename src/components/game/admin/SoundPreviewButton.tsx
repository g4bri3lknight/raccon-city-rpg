'use client';

import { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export function SoundPreviewButton({ soundId, hasFile }: { soundId: string; hasFile: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!hasFile) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    } else {
      const audio = new Audio(`/api/media/sound?ref=${encodeURIComponent(soundId)}`);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={togglePlay}
      disabled={!hasFile}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        hasFile
          ? playing
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            : 'bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] border border-white/[0.08]'
          : 'bg-white/[0.02] text-white/10 cursor-not-allowed border border-white/[0.04]'
      }`}
      title={hasFile ? (playing ? 'Ferma' : 'Riproduci') : 'Nessun file'}
    >
      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
    </button>
  );
}
