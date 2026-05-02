'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutEntry[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    label: 'Navigazione',
    shortcuts: [
      { keys: 'Ctrl + K', description: 'Ricerca globale' },
      { keys: 'Ctrl + N', description: 'Nuova entità' },
      { keys: '?', description: 'Scelte rapide (questa finestra)' },
    ],
  },
  {
    label: 'Azioni Rapide',
    shortcuts: [
      { keys: 'Ctrl + D', description: 'Duplica selezionato' },
      { keys: 'Ctrl + E', description: 'Esporta selezione' },
      { keys: 'Delete', description: 'Elimina selezionato' },
      { keys: 'Ctrl + F', description: 'Focus ricerca tab' },
      { keys: 'Ctrl + S', description: 'Salva (nascondi se non applicabile)' },
    ],
  },
  {
    label: 'Vista',
    shortcuts: [
      { keys: 'Tab', description: 'Vista schede' },
      { keys: 'Ctrl + Shift + T', description: 'Vista tabella' },
      { keys: 'Ctrl + Shift + C', description: 'Vista cards' },
    ],
  },
];

export function KeyboardShortcutsOverlay({
  open,
  onOpenChange,
}: KeyboardShortcutsOverlayProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-[#111827] border border-white/[0.08] rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-white/90 mb-5">
          ⌨️ Scelte Rapide da Tastiera
        </h2>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[13px] text-white/50">
                      {shortcut.description}
                    </span>
                    <span className="bg-white/[0.08] border border-white/[0.12] rounded px-2 py-0.5 text-[12px] font-mono text-white/70 ml-4 shrink-0">
                      {shortcut.keys}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-white/30 text-center mt-6">
          Premi qualsiasi tasto per chiudere
        </p>
      </div>
    </div>
  );
}
