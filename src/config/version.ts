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

export const APP_VERSION = '1.0.3' as const;

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
