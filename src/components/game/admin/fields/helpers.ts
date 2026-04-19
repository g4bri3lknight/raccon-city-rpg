// ═══════════════════════════════════════════════════════════════
// Shared helper utilities for field editor components
// ═══════════════════════════════════════════════════════════════

import type { StartingItemEntry, StoryEventData } from './types';

/** Parse a value that could be string JSON, string[], or unknown into string[] */
export function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    if (val.trim() === '' || val.trim() === '[]') return [];
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
}

/** Parse starting items from various formats */
export function parseStartingItems(value: unknown): StartingItemEntry[] {
  if (Array.isArray(value)) {
    return value.map((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        const o = r as Record<string, unknown>;
        return {
          itemId: String(o.itemId ?? o.id ?? ''),
          quantity: typeof o.quantity === 'number' ? o.quantity : 1,
          isEquipped: !!o.isEquipped,
        };
      }
      return { itemId: String(r), quantity: 1 };
    }).filter(e => e.itemId);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseStartingItems(parsed);
    } catch { /* ignore */ }
  }
  return [];
}

/** Parse story event from various formats */
export function parseStoryEvent(val: unknown): StoryEventData | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as StoryEventData;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return null;
    try { return JSON.parse(trimmed) as StoryEventData; } catch { return null; }
  }
  return null;
}

/** Convert plain text to safe HTML for contentEditable */
export function plainTextToHtml(text: string): string {
  if (!text) return '';
  // If value already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*?>/i.test(text)) return text;
  // Escape HTML entities, then convert newlines
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}
