'use client';

import { useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

/**
 * Reads the active game's `theme.primaryColor` setting and applies it
 * as CSS custom properties (`--admin-accent`, `--admin-accent-rgb`)
 * on `document.documentElement` so admin panel components can react to it.
 *
 * Falls back to emerald (#10b981) if no theme is configured.
 */
export function useAdminAccent(): void {
  useEffect(() => {
    let cancelled = false;

    async function loadAccent() {
      try {
        const res = await adminFetch('/api/game-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const primaryColor = data['theme.primaryColor'];
        if (primaryColor && primaryColor.startsWith('#')) {
          applyAdminAccent(primaryColor);
        }
      } catch {
        // silent — admin accent is optional
      }
    }

    loadAccent();

    // Also re-apply when settings might change (e.g. after saving in ThemeEditor)
    const handler = () => loadAccent();
    window.addEventListener('admin:settings-saved', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('admin:settings-saved', handler);
    };
  }, []);
}

/** Convert hex color to "r, g, b" string for use in rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Apply accent color as CSS custom properties on <html> */
function applyAdminAccent(hexColor: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--admin-accent', hexColor);
  root.style.setProperty('--admin-accent-rgb', hexToRgb(hexColor));
}
