'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { CombatHeaderProps } from './types';
import type { TurnOrderEntry } from '@/game/types';

export default function CombatHeader({
  turn,
  isPlayerTurn,
  currentCharacterName,
  currentEnemyName,
  comboCount,
  turnOrder,
  currentActorId,
}: CombatHeaderProps) {
  return (
    <div className="relative z-10 shrink-0 px-2.5 sm:px-3 flex flex-col gap-0.5">
      {/* ── Top row: turn info + combo + current actor ── */}
      <div className="h-7 sm:h-6 flex items-center justify-between">
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

      {/* ── Turn Order Timeline ── */}
      {turnOrder && turnOrder.length > 0 && (
        <TurnOrderBar turnOrder={turnOrder} currentActorId={currentActorId} />
      )}
    </div>
  );
}

/** Horizontal timeline showing upcoming turn order */
function TurnOrderBar({ turnOrder, currentActorId }: {
  turnOrder: TurnOrderEntry[];
  currentActorId: string;
}) {
  // Show up to 10 entries to keep it compact
  const visible = turnOrder.slice(0, 10);

  return (
    <div className="turn-order-timeline px-1 py-0.5">
      {visible.map((entry, idx) => {
        const isActive = entry.id === currentActorId;
        const isDead = !entry.isAlive;

        return (
          <div key={`${entry.id}-${idx}`} className="flex items-center">
            <div
              className={`turn-order-entry ${isActive ? 'is-active' : ''} ${isDead ? 'is-dead' : ''}`}
              title={`${entry.name}${isDead ? ' (KO)' : ''}`}
            >
              <span className={`turn-order-icon ${entry.type === 'player' ? '' : ''}`}>
                {entry.icon}
              </span>
              {isActive && (
                <span className={`w-1 h-1 rounded-full mt-px ${entry.type === 'player' ? 'bg-green-400' : 'bg-red-400'}`} />
              )}
            </div>
            {idx < visible.length - 1 && (
              <span className="turn-order-arrow">›</span>
            )}
          </div>
        );
      })}
      {turnOrder.length > 10 && (
        <span className="text-[8px] text-white/20 ml-0.5">+{turnOrder.length - 10}</span>
      )}
    </div>
  );
}
