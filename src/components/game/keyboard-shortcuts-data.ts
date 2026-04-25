/**
 * Shared keyboard shortcuts data used by both:
 * - KeyboardShortcutsOverlay (quick-access via ? button or H key)
 * - SettingsPanel (full settings screen)
 */

export interface ShortcutEntry {
  key: string;
  action: string;
  ctx: string;
}

/** All keyboard shortcuts grouped by context */
export const SHORTCUT_GROUPS: { label: string; icon: string; shortcuts: ShortcutEntry[] }[] = [
  {
    label: 'Combattimento',
    icon: '⚔️',
    shortcuts: [
      { key: '1 / A', action: 'Attacca', ctx: 'Turno giocatore' },
      { key: '2 / S', action: 'Abilità Speciale', ctx: 'Turno giocatore' },
      { key: '3 / I', action: 'Usa Oggetto', ctx: 'Turno giocatore' },
      { key: '4 / D', action: 'Difendi', ctx: 'Turno giocatore' },
      { key: '5 / F', action: 'Fuggi', ctx: 'Turno giocatore' },
    ],
  },
  {
    label: 'Bersaglio',
    icon: '🎯',
    shortcuts: [
      { key: '1-N', action: 'Seleziona bersaglio', ctx: 'Modalità bersaglio' },
      { key: 'Esc', action: 'Annulla selezione', ctx: 'Modalità bersaglio / Oggetti' },
    ],
  },
  {
    label: 'QTE & Puzzle',
    icon: '🎮',
    shortcuts: [
      { key: '↑ ↓ ← →', action: 'Input direzionale', ctx: 'QTE / Puzzle sequenza' },
      { key: 'Spazio', action: 'Conferma input', ctx: 'QTE / Puzzle' },
    ],
  },
  {
    label: 'Generali',
    icon: '🖥️',
    shortcuts: [
      { key: 'H', action: 'Scorciatoie tastiera', ctx: 'Ovunque' },
      { key: 'Esc', action: 'Chiudi pannello', ctx: 'Ovunque' },
      { key: 'F2', action: 'Debug Panel', ctx: 'Solo sviluppo' },
      { key: 'F3', action: 'Admin Panel', ctx: 'Ovunque' },
    ],
  },
];
