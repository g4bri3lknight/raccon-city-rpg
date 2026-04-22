/**
 * App Versioning System
 * 
 * Semantic Versioning: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes / major feature releases
 * - MINOR: New features (backwards compatible)
 * - PATCH: Bug fixes and small improvements
 * 
 * ⚠️ IMPORTANT: Every code change MUST update this file!
 * 
 * Format: { version, date, description }
 */

export const APP_VERSION = '1.2.0' as const;

export const VERSION_HISTORY: Array<{
  version: string;
  date: string;
  changes: string[];
}> = [
  {
    version: '1.0.0',
    date: '2025-03-04',
    changes: [
      'Sistema di versioning implementato',
      'Footer con versione dell\'applicazione',
    ],
  },
  {
    version: '1.0.1',
    date: '2025-03-04',
    changes: [
      'Fix footer che sovrapponeva il pannello titolo',
    ],
  },
  {
    version: '1.0.2',
    date: '2025-03-04',
    changes: [
      'Fix Colpo Mortale: ora colpisce correttamente il target selezionato',
      'Fix Raffica: ora applica il danno principale al target + danno collaterale agli altri',
      'Refactor handleDealDamage: risoluzione target primario all\'inizio, come attacco base',
    ],
  },
  {
    version: '1.0.3',
    date: '2025-03-04',
    changes: [
      'Fix log attacco base: non mostra più "usa [arma] ma non ha effetti" per armi con solo effetti passivi',
    ],
  },
  {
    version: '1.0.4',
    date: '2025-06-18',
    changes: [
      'Fix handleDealDamage: aggiunto fallback sicuro per effetti single-target quando la lookup per ID fallisce',
      'Fix resolveTargets: rimosso fallback per nome che poteva colpire il nemico sbagliato con nemici duplicati',
      'Fix executeEffectsInternal: aggiunto fallback definitionId per enemy re-instantiati',
      'Migliorato logging diagnostico per debug del targeting in combattimento',
    ],
  },
  {
    version: '1.0.5',
    date: '2025-06-20',
    changes: [
      'Fix critico store.ts: usava character.special1Id/special2Id invece di resolveSpecialId() per archetipi predefiniti',
      'Fix store.ts: risoluzione target per abilità speciali ora usa la stessa logica dell\'attacco base (solo nemici vivi, nessun fallback sbagliato)',
      'Fix Colpo Mortale: non mostra più "non ci sono bersagli validi" per archetipi predefiniti (DPS, Tank, Healer, Control)',
      'Fix Raffica: primo effetto ora infligge correttamente danni al target selezionato',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-06-20',
    changes: [
      'Refactor: eliminato store.ts monolitico (6352 righe), ora si usa store/index.ts con 14 slices modulari',
      'La migrazione risolve definitivamente i bug di targeting delle abilità speciali (le slices avevano già resolveSpecialId corretto)',
      'Zero breaking changes: tutti i 29 componenti continuano a importare da @/game/store senza modifiche',
      'Slices: core, exploration, combat, inventory, achievements, settings, puzzle, qte, documents, npc, events, safe-room, save, debug',
    ],
  },
  {
    version: '1.1.1',
    date: '2025-06-20',
    changes: [
      'Fix struttura: eliminata cartella duplicata src/app/api/api/ (57 route.ts identici a src/app/api/)',
      'Rimossi route fantasma /api/api/* che non venivano utilizzati',
    ],
  },
  {
    version: '1.1.2',
    date: '2025-06-20',
    changes: [
      'Fix advanceToNextActor: assignment to constant variable afterEnemyAttack — destrutturazione corretta con let',
    ],
  },
  {
    version: '1.1.3',
    date: '2025-06-20',
    changes: [
      'Fix combat slice: notifId non definito — sostituito con nextNotifId() da helpers',
    ],
  },
  {
    version: '1.2.0',
    date: '2025-06-20',
    changes: [
      'Fix anti-spam esplora: aggiunto flag isExploring che impedisce click multipli durante l\'elaborazione — previene race condition (combat + evento dinamico sovrapposti)',
      'Fix eventi dinamici: aggiunto disabled a tutti i tasti azione + opzioni viaggio quando evento attivo (non solo pointer-events-none CSS)',
      'Fix combat: pannello oggetti spostato più a sinistra (right 220px) per non sovrapporre il pannello azioni su desktop',
      'Fix notifId: sostituito con nextNotifId() in events.ts e npc.ts (ultimi residui del vecchio store.ts)',
      'Il selettore quantità per trasferimento oggetti era già implementato (ammo/healing/antidote con qty > 1)',
    ],
  },
];

/**
 * Get the latest version entry from history
 */
export function getLatestVersion() {
  return VERSION_HISTORY[VERSION_HISTORY.length - 1];
}

/**
 * Get formatted version string for display
 */
export function getVersionDisplay(): string {
  return `v${APP_VERSION}`;
}
