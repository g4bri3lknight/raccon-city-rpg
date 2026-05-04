import type { TabId } from './tabGroups';

// ═══════════════════════════════════════════════════════════════
// Field Sections — groups fields into collapsible sections per tab
// ═══════════════════════════════════════════════════════════════
export interface FieldSection {
  id: string;
  label: string;
  icon: string;
  /** Field keys belonging to this section. Empty array = all remaining fields (catch-all). */
  fieldKeys: string[];
  /** If true, section starts collapsed */
  defaultCollapsed?: boolean;
  /** Conditionally hide this section based on form data */
  hiddenWhen?: {
    field: string;
    /** Hide when the field has a truthy non-empty value */
    hasValue?: boolean;
    /** Hide when the field equals this exact value */
    equals?: string;
  };
}

export type SectionMap = Record<string, FieldSection[]>;

/**
 * For each tab, defines the sections in order.
 * Fields NOT listed in any section are placed in the first "catch-all" section (fieldKeys: []).
 * Sections with `fieldKeys: []` capture any field not explicitly assigned to other sections.
 */
export const FIELD_SECTIONS: Partial<Record<TabId, FieldSection[]>> = {
  items: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: [] },
    { id: 'type', label: 'Tipo & Proprietà', icon: '🏷️', fieldKeys: ['type', 'rarity', 'icon', 'usable', 'equippable', 'stackable', 'unico', 'maxStack'] },
    { id: 'weapon', label: 'Arma', icon: '🔫', fieldKeys: ['weaponType', 'ammoType', 'modType'] },
    { id: 'effects', label: 'Effetti', icon: '✨', fieldKeys: ['effects'] },
  ],
  quests: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'npcId', 'name', 'description', 'type'] },
    { id: 'objective', label: 'Obiettivo', icon: '🎯', fieldKeys: ['targetId', 'targetCount'] },
    { id: 'rewards', label: 'Ricompense', icon: '🎁', fieldKeys: ['rewardItems', 'rewardExp', 'rewardDialogue'] },
    { id: 'order', label: 'Ordine & Prerequisiti', icon: '🔗', fieldKeys: ['sortOrder', 'prerequisiteQuestId'] },
  ],
  events: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'title', 'description', 'icon', 'type'] },
    { id: 'mechanics', label: 'Meccanica', icon: '⚙️', fieldKeys: ['duration', 'encounterRateMod', 'enemyStatMult', 'searchBonus', 'damagePerTurn', 'triggerChance', 'minTurn'] },
    { id: 'locations', label: 'Location', icon: '🗺️', fieldKeys: ['locationIds'] },
    { id: 'messages', label: 'Messaggi', icon: '💬', fieldKeys: ['onTriggerMessage', 'onEndMessage'] },
    { id: 'choices', label: 'Scelte', icon: '🔀', fieldKeys: ['choices'] },
    { id: 'chain', label: 'Catena Eventi', icon: '🔗', fieldKeys: ['chainId', 'nextEventId'] },
    { id: 'permanent', label: 'Effetto Permanente', icon: '📌', fieldKeys: ['permanentMapEffect'] },
  ],
  documents: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'title', 'type', 'icon', 'rarity'] },
    { id: 'content', label: 'Contenuto', icon: '📝', fieldKeys: ['content'] },
    { id: 'context', label: 'Contesto', icon: '📍', fieldKeys: ['locationId', 'isSecret', 'hintRequired'] },
  ],
  npcs: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'portrait'] },
    { id: 'location', label: 'Location & Badge', icon: '📍', fieldKeys: ['locationId', 'sortOrder', 'badgeLabel', 'badgeIcon', 'badgeColor'] },
    { id: 'dialogues', label: 'Dialoghi', icon: '💬', fieldKeys: ['greeting', 'dialogues', 'farewell', 'questCompletedDialogue', 'dynamicDialogues'] },
    { id: 'quest', label: 'Quest', icon: '📜', fieldKeys: ['questId'] },
    { id: 'trade', label: 'Commercio', icon: '🤝', fieldKeys: ['tradeInventory'] },
  ],
  archetypes: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['name', 'displayName', 'description', 'portraitEmoji', 'sortOrder'] },
    { id: 'stats', label: 'Statistiche Base', icon: '📊', fieldKeys: ['maxHp', 'atk', 'def', 'spd'] },
    { id: 'growth', label: 'Crescita', icon: '📈', fieldKeys: ['hpGrowth', 'atkGrowth', 'defGrowth', 'spdGrowth'] },
    { id: 'abilities', label: 'Abilità', icon: '⚡', fieldKeys: ['specialId', 'special2Id'] },
    { id: 'passive', label: 'Passiva', icon: '🛡️', fieldKeys: ['passiveName', 'passiveDescription'] },
    { id: 'equipment', label: 'Equipaggiamento', icon: '🎒', fieldKeys: ['startingItems'] },
  ],
  characters: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'archetypeId', 'name', 'displayName', 'description', 'portraitEmoji', 'sortOrder'] },
    { id: 'archetype-inherit', label: 'Eredità Archetipo', icon: '🔗', fieldKeys: [], hiddenWhen: { field: 'archetypeId', hasValue: false } },
    { id: 'stats', label: 'Statistiche (Custom)', icon: '📊', fieldKeys: ['maxHp', 'atk', 'def', 'spd'], hiddenWhen: { field: 'archetypeId', hasValue: true } },
    { id: 'abilities', label: 'Abilità (Custom)', icon: '⚡', fieldKeys: ['specialName', 'specialDescription', 'specialCost', 'special2Name', 'special2Description', 'special2Cost'], hiddenWhen: { field: 'archetypeId', hasValue: true } },
    { id: 'passive', label: 'Passiva (Custom)', icon: '🛡️', fieldKeys: ['passiveDescription'], hiddenWhen: { field: 'archetypeId', hasValue: true } },
    { id: 'equipment', label: 'Equipaggiamento', icon: '🎒', fieldKeys: ['startingItems'] },
  ],
  locations: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description'] },
    { id: 'rates', label: 'Probabilità', icon: '🎲', fieldKeys: ['encounterRate', 'searchChance', 'docChance', 'searchMax'] },
    { id: 'enemies', label: 'Nemici', icon: '⚔️', fieldKeys: ['isBossArea', 'bossId', 'enemyPool'] },
    { id: 'items', label: 'Oggetti', icon: '📦', fieldKeys: ['itemPool'] },
    { id: 'navigation', label: 'Navigazione', icon: '🚪', fieldKeys: ['nextLocations', 'lockedLocations'] },
    { id: 'events', label: 'Eventi & Contenuto', icon: '📖', fieldKeys: ['storyEvent', 'ambientText'] },
    { id: 'subareas', label: 'Sotto-Aree', icon: '🗺️', fieldKeys: ['subAreas'] },
    { id: 'map', label: 'Mappa', icon: '🗺️', fieldKeys: ['mapRow', 'mapCol', 'mapIcon', 'mapDanger', 'sortOrder'] },
  ],
  specials: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'icon', 'description', 'category', 'targetType', 'sortOrder'] },
    { id: 'mechanics', label: 'Meccanica', icon: '⚙️', fieldKeys: ['cooldown'] },
    { id: 'effects', label: 'Effetti', icon: '✨', fieldKeys: ['effects'] },
  ],
  enemies: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description', 'icon', 'isBoss', 'variantGroup'] },
    { id: 'stats', label: 'Statistiche', icon: '📊', fieldKeys: ['maxHp', 'atk', 'def', 'spd', 'expReward'] },
    { id: 'loot', label: 'Loot', icon: '📦', fieldKeys: ['lootTable'] },
    { id: 'abilities', label: 'Abilità', icon: '⚡', fieldKeys: ['abilities', 'sortOrder'] },
  ],
  'enemy-abilities': [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description', 'power', 'chance'] },
    { id: 'effects', label: 'Effetti', icon: '✨', fieldKeys: ['effects', 'sortOrder'] },
  ],
  'boss-phases': [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'enemyId', 'name', 'hpThreshold'] },
    { id: 'multipliers', label: 'Moltiplicatori', icon: '📈', fieldKeys: ['hpMultiplier', 'atkMultiplier', 'defMultiplier', 'spdMultiplier'] },
    { id: 'abilities', label: 'Nuove Abilità', icon: '⚡', fieldKeys: ['newAbilities'] },
    { id: 'transition', label: 'Transizione', icon: '🔄', fieldKeys: ['message', 'sortOrder'] },
  ],
  achievements: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description', 'icon', 'category', 'condition'] },
    { id: 'details', label: 'Dettagli', icon: '⚙️', fieldKeys: ['hidden', 'reward', 'sortOrder'] },
  ],
  endings: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'title', 'subtitle', 'description', 'icon', 'color'] },
    { id: 'requirements', label: 'Requisiti', icon: '🔒', fieldKeys: ['requirements', 'priority', 'sortOrder'] },
  ],
  'secret-rooms': [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description', 'locationId'] },
    { id: 'discovery', label: 'Scoperta', icon: '🔍', fieldKeys: ['discoveryMethod', 'searchChance', 'requiredDocumentId', 'requiredNpcQuestId'] },
    { id: 'hint', label: 'Suggerimento', icon: '💡', fieldKeys: ['hint'] },
    { id: 'loot', label: 'Loot', icon: '📦', fieldKeys: ['lootTable', 'uniqueItemId', 'uniqueItemQuantity', 'sortOrder'] },
  ],
  recipes: [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'name', 'description', 'icon', 'category'] },
    { id: 'ingredients', label: 'Ingredienti', icon: '🧪', fieldKeys: ['ingredients'] },
    { id: 'result', label: 'Risultato', icon: '🎯', fieldKeys: ['resultItemId', 'resultQty', 'difficulty', 'pointCost', 'pointOnly'] },
    { id: 'options', label: 'Opzioni', icon: '⚙️', fieldKeys: ['ngPlusOnly', 'forceMasterQuality', 'hidden', 'sortOrder'] },
  ],
  'quest-chains': [
    { id: 'info', label: 'Informazioni', icon: '📋', fieldKeys: ['id', 'npcId', 'name', 'description', 'sortOrder'] },
    { id: 'steps', label: 'Steps', icon: '👣', fieldKeys: ['steps'] },
    { id: 'reward', label: 'Ricompensa Finale', icon: '🎁', fieldKeys: ['finalReward'] },
  ],
};

/**
 * Check if a section should be hidden based on form data and hiddenWhen condition.
 */
export function isSectionHidden(section: FieldSection, formData: Record<string, unknown>): boolean {
  if (!section.hiddenWhen) return false;
  const { field, hasValue, equals } = section.hiddenWhen;
  const val = formData[field];
  if (hasValue === true) {
    // Hide when field has a truthy non-empty value
    return !!val && val !== '';
  }
  if (hasValue === false) {
    // Hide when field is falsy or empty
    return !val || val === '';
  }
  if (equals !== undefined) {
    return String(val) === equals;
  }
  return false;
}

/**
 * Distributes an array of FieldDefs into sections.
 * If FIELD_SECTIONS has a config for the given tab, uses it.
 * Otherwise, puts all fields in a single "Campi" section.
 *
 * @param formData Optional current form data — used to evaluate hiddenWhen conditions.
 */
export function getSectionsForTab(tabId: TabId, fields: { key: string }[], formData?: Record<string, unknown>): FieldSection[] {
  const sections = FIELD_SECTIONS[tabId];
  if (!sections || sections.length === 0) {
    return [{ id: 'fields', label: 'Campi', icon: '📋', fieldKeys: [] }];
  }

  // Build set of all explicitly-assigned field keys
  const explicitKeys = new Set<string>();
  for (const s of sections) {
    for (const k of s.fieldKeys) explicitKeys.add(k);
  }

  // Find the catch-all section (fieldKeys: [])
  const catchAllIdx = sections.findIndex(s => s.fieldKeys.length === 0);
  // Build its field list: all fields NOT explicitly assigned
  const catchAllKeys: string[] = [];
  for (const f of fields) {
    if (!explicitKeys.has(f.key)) catchAllKeys.push(f.key);
  }

  // Return resolved sections, filtering out hidden ones
  const resolved = sections.map((s, i) => ({
    ...s,
    fieldKeys: i === catchAllIdx ? catchAllKeys : s.fieldKeys,
  }));

  if (formData) {
    return resolved.filter(s => !isSectionHidden(s, formData));
  }
  return resolved;
}
