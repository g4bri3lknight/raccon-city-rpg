// ─── RPG Template System for the Editor ────────────────────────────────────────

/** Per-difficulty configuration (mirrors DiffConfig in config/index.ts). */
export interface TemplateDiffConfig {
  label: string;
  color: string;
  icon: string;
  statMult: number;
  lootMult: number;
  minEnemies: number;
  maxEnemies: number;
  expMult: number;
  enemyCritChance: number;
  description: string;
}

/** Full template configuration that drives the RPG editor. */
export interface GameTemplateConfig {
  templateId: string;
  validTypes: {
    difficultyLevels: string[];
    itemTypes: string[];
    documentTypes: string[];
    eventTypes: string[];
    endingTypes: string[];
    roomTypes: string[];
    statusEffects: string[];
    qteTriggerSources: string[];
  };
  difficultyDefaults: Record<string, TemplateDiffConfig>;
  systems: {
    limitedSaves: boolean;
    persistentPursuer: boolean;
    crafting: boolean;
    partySystem: boolean;
    bossPhases: boolean;
    secretRooms: boolean;
    dynamicEvents: boolean;
    questChains: boolean;
    ngPlus: boolean;
    achievements: boolean;
    randomizer: boolean;
    qte: boolean;
  };
  collectible: {
    enabled: boolean;
    maxPerRun: number;
    label: string;
  } | null;
  startMessage: string;
  defaultStartingItems: string[];
}

/** Template definition with metadata. */
export interface GameTemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string; // hex color for UI theming
  gameType: string;
  setting: string;
  config: GameTemplateConfig;
  themePreset: Record<string, string>;
}

// ─── Built-in templates ─────────────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: GameTemplateDef[] = [
  // ── 1. Survival Horror ──────────────────────────────────────────────────────
  {
    id: 'survival-horror',
    name: 'Survival Horror',
    description:
      'Risorse scarse, salvataggi limitati, nemici implacabili. Sopravvivi a un incubo.',
    icon: '🧟',
    color: '#ef4444',
    gameType: 'Survival Horror',
    setting: 'Urbana / Moderna',
    config: {
      templateId: 'survival-horror',
      validTypes: {
        difficultyLevels: ['facile', 'normale', 'incubo'],
        itemTypes: [
          'weapon',
          'healing',
          'ammo',
          'utility',
          'antidote',
          'bag',
          'collectible',
          'key',
          'armor',
          'accessory',
          'weapon_mod',
        ],
        documentTypes: ['diary', 'note', 'report', 'email', 'photo'],
        eventTypes: [
          'blackout',
          'alarm',
          'collapse',
          'lockdown',
          'gas_leak',
          'fire',
          'horde',
          'invasion',
        ],
        endingTypes: ['escape', 'hero', 'truth', 'dark'],
        roomTypes: [
          'normal',
          'safe_room',
          'boss_room',
          'secret',
          'shop',
          'puzzle',
          'corridor',
        ],
        statusEffects: ['poison', 'bleeding', 'stunned', 'adrenaline'],
        qteTriggerSources: ['boss', 'event', 'pursuer'],
      },
      difficultyDefaults: {
        facile: {
          label: 'Facile',
          color: '#22c55e',
          icon: '🏃',
          statMult: 0.6,
          lootMult: 1.5,
          minEnemies: 1,
          maxEnemies: 2,
          expMult: 1.4,
          enemyCritChance: 5,
          description:
            'Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia.',
        },
        normale: {
          label: 'Normale',
          color: '#eab308',
          icon: '⚔️',
          statMult: 0.85,
          lootMult: 1.1,
          minEnemies: 1,
          maxEnemies: 3,
          expMult: 1.0,
          enemyCritChance: 10,
          description: "Bilanciato. L'esperienza RPG completa.",
        },
        incubo: {
          label: 'Incubo',
          color: '#ef4444',
          icon: '💀',
          statMult: 1.4,
          lootMult: 0.6,
          minEnemies: 2,
          maxEnemies: 4,
          expMult: 0.8,
          enemyCritChance: 20,
          description:
            'Nemici potenti, poco bottino. Solo per i più coraggiosi.',
        },
      },
      systems: {
        limitedSaves: true,
        persistentPursuer: true,
        crafting: true,
        partySystem: true,
        bossPhases: true,
        secretRooms: true,
        dynamicEvents: true,
        questChains: true,
        ngPlus: true,
        achievements: true,
        randomizer: true,
        qte: true,
      },
      collectible: {
        enabled: true,
        maxPerRun: 10,
        label: 'Nastro di Salvataggio',
      },
      startMessage: '',
      defaultStartingItems: [],
    },
    themePreset: {
      'theme.primaryColor': '#dc2626',
      'theme.secondaryColor': '#ef4444',
      'theme.accentColor': '#f87171',
      'theme.backgroundColor': '#0a0a0a',
      'theme.fontFamily': 'Courier New',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.6',
      'theme.borderRadius': '12',
      'theme.borderColor': '#dc262620',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#dc2626',
      'theme.glowIntensity': '0.6',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#e5e5e5',
      'theme.titleGlow': '#dc2626',
      'theme.subtitleColor': '#f87171',
    },
  },

  // ── 2. Fantasy RPG ───────────────────────────────────────────────────────────
  {
    id: 'fantasy-rpg',
    name: 'Fantasy RPG',
    description:
      'Spade, magia e dungeon. Un classico GDR fantasy con party, quest e dungeon.',
    icon: '⚔️',
    color: '#8b5cf6',
    gameType: 'Classic RPG',
    setting: 'Medieval Fantasy',
    config: {
      templateId: 'fantasy-rpg',
      validTypes: {
        difficultyLevels: ['facile', 'normale', 'difficile'],
        itemTypes: [
          'weapon',
          'armor',
          'accessory',
          'consumable',
          'key',
          'quest_item',
          'material',
          'weapon_mod',
        ],
        documentTypes: ['diary', 'scroll', 'note', 'map_fragment', 'lore'],
        eventTypes: [
          'ambush',
          'trap',
          'discovery',
          'weather',
          'festival',
          'siege',
        ],
        endingTypes: ['hero', 'sacrifice', 'dark', 'secret', 'true'],
        roomTypes: [
          'normal',
          'safe_room',
          'boss_room',
          'secret',
          'shop',
          'puzzle',
          'corridor',
          'dungeon',
        ],
        statusEffects: [
          'poison',
          'burn',
          'stun',
          'freeze',
          'curse',
          'bleeding',
        ],
        qteTriggerSources: ['boss', 'event', 'trap', 'dragon'],
      },
      difficultyDefaults: {
        facile: {
          label: 'Facile',
          color: '#22c55e',
          icon: '🛡️',
          statMult: 0.6,
          lootMult: 1.5,
          minEnemies: 1,
          maxEnemies: 2,
          expMult: 1.4,
          enemyCritChance: 5,
          description: 'Avventura rilassante con bottino abbondante.',
        },
        normale: {
          label: 'Normale',
          color: '#eab308',
          icon: '⚔️',
          statMult: 0.85,
          lootMult: 1.1,
          minEnemies: 1,
          maxEnemies: 3,
          expMult: 1.0,
          enemyCritChance: 10,
          description: "L'esperienza GDR classica bilanciata.",
        },
        difficile: {
          label: 'Difficile',
          color: '#ef4444',
          icon: '💀',
          statMult: 1.3,
          lootMult: 0.7,
          minEnemies: 2,
          maxEnemies: 4,
          expMult: 0.9,
          enemyCritChance: 15,
          description:
            'Solo per avventurieri esperti. Risorse scarse.',
        },
      },
      systems: {
        limitedSaves: false,
        persistentPursuer: false,
        crafting: true,
        partySystem: true,
        bossPhases: true,
        secretRooms: true,
        dynamicEvents: true,
        questChains: true,
        ngPlus: true,
        achievements: true,
        randomizer: true,
        qte: true,
      },
      collectible: null,
      startMessage: '',
      defaultStartingItems: [],
    },
    themePreset: {
      'theme.primaryColor': '#a855f7',
      'theme.secondaryColor': '#facc15',
      'theme.accentColor': '#22c55e',
      'theme.backgroundColor': '#0a0a12',
      'theme.fontFamily': 'Georgia',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.05',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.55',
      'theme.borderRadius': '16',
      'theme.borderColor': '#a855f720',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#a855f7',
      'theme.glowIntensity': '0.4',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#fef3c7',
      'theme.titleGlow': '#f59e0b',
      'theme.subtitleColor': '#d8b4fe',
    },
  },

  // ── 3. Sci-Fi ────────────────────────────────────────────────────────────────
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    description:
      'Tecnologia avanzata, mondi alieni e pericoli spaziali. Esplora la galassia.',
    icon: '🚀',
    color: '#06b6d4',
    gameType: 'Sci-Fi RPG',
    setting: 'Spazio / Futuristica',
    config: {
      templateId: 'sci-fi',
      validTypes: {
        difficultyLevels: ['cadet', 'operative', 'veteran'],
        itemTypes: [
          'weapon',
          'armor',
          'tech_module',
          'healing',
          'ammo',
          'key',
          'data_chip',
          'accessory',
          'weapon_mod',
        ],
        documentTypes: ['log', 'report', 'email', 'data_pad', 'blueprint'],
        eventTypes: [
          'system_failure',
          'lockdown',
          'alert',
          'alien_invasion',
          'malfunction',
          'radiation_leak',
        ],
        endingTypes: ['escape', 'sacrifice', 'truth', 'rogue', 'unity'],
        roomTypes: [
          'normal',
          'safe_room',
          'boss_room',
          'secret',
          'shop',
          'puzzle',
          'corridor',
          'bridge',
          'lab',
        ],
        statusEffects: [
          'burn',
          'shock',
          'stun',
          'radiation',
          'hacked',
          'bleeding',
        ],
        qteTriggerSources: ['boss', 'event', 'hack', 'system'],
      },
      difficultyDefaults: {
        cadet: {
          label: 'Cadetto',
          color: '#22c55e',
          icon: '🎯',
          statMult: 0.6,
          lootMult: 1.5,
          minEnemies: 1,
          maxEnemies: 2,
          expMult: 1.4,
          enemyCritChance: 5,
          description: 'Addestramento base. Per reclute.',
        },
        operative: {
          label: 'Operativo',
          color: '#eab308',
          icon: '⚡',
          statMult: 0.85,
          lootMult: 1.1,
          minEnemies: 1,
          maxEnemies: 3,
          expMult: 1.0,
          enemyCritChance: 10,
          description: 'Missione standard. Equipaggiamento bilanciato.',
        },
        veteran: {
          label: 'Veterano',
          color: '#ef4444',
          icon: '🔥',
          statMult: 1.3,
          lootMult: 0.7,
          minEnemies: 2,
          maxEnemies: 4,
          expMult: 0.9,
          enemyCritChance: 15,
          description: 'Veterani dotati. Equipaggiamento scarso.',
        },
      },
      systems: {
        limitedSaves: false,
        persistentPursuer: false,
        crafting: true,
        partySystem: true,
        bossPhases: true,
        secretRooms: true,
        dynamicEvents: true,
        questChains: true,
        ngPlus: true,
        achievements: true,
        randomizer: true,
        qte: true,
      },
      collectible: null,
      startMessage: '',
      defaultStartingItems: [],
    },
    themePreset: {
      'theme.primaryColor': '#06b6d4',
      'theme.secondaryColor': '#8b5cf6',
      'theme.accentColor': '#3b82f6',
      'theme.backgroundColor': '#020a14',
      'theme.fontFamily': 'JetBrains Mono',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '0.95',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.5',
      'theme.borderRadius': '8',
      'theme.borderColor': '#06b6d420',
      'theme.buttonStyle': 'squared',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#06b6d4',
      'theme.glowIntensity': '0.5',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#cffafe',
      'theme.titleGlow': '#06b6d4',
      'theme.subtitleColor': '#67e8f9',
    },
  },

  // ── 4. Blank / Custom ────────────────────────────────────────────────────────
  {
    id: 'blank',
    name: 'Vuoto / Personalizzato',
    description:
      'Configurazione minima. Costruisci il tuo RPG da zero con tutte le opzioni disponibili.',
    icon: '📋',
    color: '#6b7280',
    gameType: 'Custom',
    setting: 'Personalizzata',
    config: {
      templateId: 'blank',
      validTypes: {
        difficultyLevels: ['facile', 'normale', 'difficile'],
        itemTypes: [
          'weapon',
          'armor',
          'accessory',
          'consumable',
          'key',
          'misc',
          'weapon_mod',
        ],
        documentTypes: ['diary', 'note', 'report', 'custom'],
        eventTypes: ['custom_event'],
        endingTypes: ['good', 'bad', 'neutral'],
        roomTypes: [
          'normal',
          'safe_room',
          'boss_room',
          'secret',
          'shop',
          'puzzle',
          'corridor',
        ],
        statusEffects: ['poison', 'stun', 'bleeding'],
        qteTriggerSources: ['boss', 'event'],
      },
      difficultyDefaults: {
        facile: {
          label: 'Facile',
          color: '#22c55e',
          icon: '🛡️',
          statMult: 0.7,
          lootMult: 1.3,
          minEnemies: 1,
          maxEnemies: 2,
          expMult: 1.2,
          enemyCritChance: 5,
          description: 'Per i principianti.',
        },
        normale: {
          label: 'Normale',
          color: '#eab308',
          icon: '⚔️',
          statMult: 1.0,
          lootMult: 1.0,
          minEnemies: 1,
          maxEnemies: 3,
          expMult: 1.0,
          enemyCritChance: 10,
          description: 'Equilibrato.',
        },
        difficile: {
          label: 'Difficile',
          color: '#ef4444',
          icon: '💀',
          statMult: 1.3,
          lootMult: 0.7,
          minEnemies: 2,
          maxEnemies: 4,
          expMult: 0.8,
          enemyCritChance: 20,
          description: 'Per esperti.',
        },
      },
      systems: {
        limitedSaves: true,
        persistentPursuer: true,
        crafting: true,
        partySystem: true,
        bossPhases: true,
        secretRooms: true,
        dynamicEvents: true,
        questChains: true,
        ngPlus: true,
        achievements: true,
        randomizer: true,
        qte: true,
      },
      collectible: null,
      startMessage: '',
      defaultStartingItems: [],
    },
    themePreset: {
      'theme.primaryColor': '#6b7280',
      'theme.secondaryColor': '#6b7280',
      'theme.accentColor': '#9ca3af',
      'theme.backgroundColor': '#0a0a0a',
      'theme.fontFamily': 'Inter',
      'theme.headingWeight': 'normal',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'flat',
      'theme.cardOpacity': '0.6',
      'theme.borderRadius': '12',
      'theme.borderColor': '#6b728020',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'subtle',
      'theme.glowEnabled': 'false',
      'theme.glowColor': '#6b7280',
      'theme.glowIntensity': '0.3',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#e5e5e5',
      'theme.titleGlow': '#6b7280',
      'theme.subtitleColor': '#9ca3af',
    },
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Find a built-in template by its id. */
export function getTemplateById(id: string): GameTemplateDef | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Convert a GameTemplateConfig into flat GameSetting-style entries.
 *
 * Produces:
 *   - `template.id`          → config.templateId
 *   - `template.config`      → JSON.stringify of the full config
 *   - `difficulty.{key}`     → JSON.stringify of each difficulty-level config
 */
export function serializeTemplateConfig(
  config: GameTemplateConfig,
): Record<string, string> {
  const result: Record<string, string> = {
    'template.id': config.templateId,
    'template.config': JSON.stringify(config),
  };

  for (const [key, diffConfig] of Object.entries(config.difficultyDefaults)) {
    result[`difficulty.${key}`] = JSON.stringify(diffConfig);
  }

  return result;
}

/**
 * Extract theme preset entries from a template definition.
 *
 * Returns a flat Record<string, string> of all `theme.*` keys
 * that can be seeded as GameSetting entries when creating a game.
 */
export function serializeTemplateThemePreset(
  template: GameTemplateDef,
): Record<string, string> {
  return { ...template.themePreset };
}
