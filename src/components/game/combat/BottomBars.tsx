'use client';

import { Loader2 } from 'lucide-react';
import type { BottomBarsProps } from './types';

export default function BottomBars({
  isCombatEnd,
  isPlayerTurn,
  currentEnemyName,
}: BottomBarsProps) {
  return (
    <>
      {/* Enemy turn hint */}
      {!isCombatEnd && !isPlayerTurn && (
        <div className="shrink-0 border-t border-red-900/30 bg-gray-950/95 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            <span className="text-red-300 text-xs font-semibold">
              {currentEnemyName || 'Nemico'} sta agendo...
            </span>
          </div>
        </div>
      )}
    </>
  );
}
