'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { CombatHeaderProps } from './types';

export default function CombatHeader({
  turn,
  isPlayerTurn,
  currentCharacterName,
  currentEnemyName,
  comboCount,
}: CombatHeaderProps) {
  return (
    <div className="relative z-10 shrink-0 px-2.5 sm:px-3 h-8 sm:h-7 flex items-center justify-between">
      <Badge variant="outline" className="border-red-500/30 text-red-400 text-[11px] sm:text-xs bg-red-500/10">
        Turno {turn}
      </Badge>
      {comboCount >= 2 && (
        <Badge
          variant="outline"
          className={`border-amber-500/40 text-amber-400 text-[11px] sm:text-xs bg-amber-500/10 ${
            comboCount >= 5 ? 'animate-pulse' : ''
          }`}
        >
          🔥 Combo x{comboCount}
        </Badge>
      )}
      {!isPlayerTurn ? (
        <span className="text-[11px] sm:text-[10px] text-red-400/80 animate-pulse flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {currentEnemyName}...
        </span>
      ) : (
        <span className="text-[11px] sm:text-[10px] text-green-400/80">
          ▸ Turno di {currentCharacterName}
        </span>
      )}
    </div>
  );
}
