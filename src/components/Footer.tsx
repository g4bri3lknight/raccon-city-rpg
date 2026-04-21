'use client';

import { APP_VERSION, VERSION_HISTORY } from '@/config/version';

export default function Footer() {
  const latest = VERSION_HISTORY[VERSION_HISTORY.length - 1];

  return (
    <footer className="w-full shrink-0">
      <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-black/80 border-t border-white/5">
        <span className="text-[10px] sm:text-xs font-mono text-zinc-500 tracking-wider select-none">
          RACCOON CITY: ESCAPE FROM HORROR
        </span>
        <span className="text-[10px] sm:text-xs text-zinc-600 select-none">·</span>
        <span className="text-[10px] sm:text-xs font-mono text-amber-600/80 tracking-wider select-none">
          v{APP_VERSION}
        </span>
        {latest?.date && (
          <>
            <span className="text-[10px] sm:text-xs text-zinc-600 select-none">·</span>
            <span className="text-[10px] sm:text-xs font-mono text-zinc-600 tracking-wider select-none">
              {latest.date}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
