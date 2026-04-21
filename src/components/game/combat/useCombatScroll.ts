'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { CombatState } from '@/game/types';

/**
 * Manages combat log scrolling behavior:
 * - Auto-scroll to bottom on new log entries
 * - Periodic scroll during enemy turns
 * - Supports two log panels (desktop + mobile) via separate refs
 */
export function useCombatScroll(
  combat: CombatState | null,
  isPlayerTurn: boolean,
): { desktopLogRef: React.RefObject<HTMLDivElement | null>; mobileLogRef: React.RefObject<HTMLDivElement | null> } {
  const desktopLogRef = useRef<HTMLDivElement>(null);
  const mobileLogRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Scroll whichever panel is visible
        // On desktop: desktopLogRef element is visible, mobileLogRef element has display:none
        // On mobile: mobileLogRef element is visible, desktopLogRef element has display:none
        // We try both — scrolling a hidden element is a no-op, so it's safe
        if (desktopLogRef.current) {
          const el = desktopLogRef.current;
          // Only scroll if the element is actually visible (has non-zero dimensions)
          if (el.offsetHeight > 0) {
            el.scrollTop = el.scrollHeight;
          }
        }
        if (mobileLogRef.current) {
          const el = mobileLogRef.current;
          if (el.offsetHeight > 0) {
            el.scrollTop = el.scrollHeight;
          }
        }
      });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [combat?.log?.length, scrollToBottom]);

  useEffect(() => {
    if (!isPlayerTurn) {
      const interval = setInterval(scrollToBottom, 300);
      return () => clearInterval(interval);
    }
  }, [isPlayerTurn, scrollToBottom]);

  return { desktopLogRef, mobileLogRef };
}
