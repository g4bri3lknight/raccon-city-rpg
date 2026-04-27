'use client';

import { GAME_CONFIG } from '@/game/data/loader';

export default function Footer() {
  return (
    <footer className="w-full shrink-0">
      <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-black/80 border-t border-white/5">
        <span className="text-[10px] sm:text-xs font-mono text-zinc-500 tracking-wider select-none">
          RPG GAME ENGINE
        </span>
        {GAME_CONFIG.version && (
          <>
            <span className="text-[10px] sm:text-xs text-zinc-600 select-none">·</span>
            <span className="text-[10px] sm:text-xs font-mono text-amber-600/80 tracking-wider select-none">
              v{GAME_CONFIG.version}
            </span>
          </>
        )}
        {GAME_CONFIG.versionDate && (
          <>
            <span className="text-[10px] sm:text-xs text-zinc-600 select-none">·</span>
            <span className="text-[10px] sm:text-xs font-mono text-zinc-600 tracking-wider select-none">
              {GAME_CONFIG.versionDate}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
