'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { CombatState } from '@/game/types';

/**
 * Manages combat log scrolling behavior:
 * - Auto-scroll to bottom on new log entries
 * - Periodic scroll during enemy turns
 */
export function useCombatScroll(
  combat: CombatState | null,
  isPlayerTurn: boolean,
): React.RefObject<HTMLDivElement | null> {
  const logRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [combat?.log?.length, scrollToBottom]);

  useEffect(() => {
    if (!isPlayerTurn) {
      const interval = setInterval(scrollToBottom, 300);
      return () => clearInterval(interval);
    }
  }, [isPlayerTurn, scrollToBottom]);

  return logRef;
}
