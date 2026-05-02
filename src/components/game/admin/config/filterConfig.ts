import type { TabId } from './tabGroups';
import { getEnumLabel } from './enumLabels';

// ═══════════════════════════════════════════════════════════════
// Filter definitions per tab
// Each tab can have one or more filterable fields
// ═══════════════════════════════════════════════════════════════
export interface FilterDef {
  key: string;           // field name in data
  label: string;         // display label
  enumGroup?: string;    // ENUM_LABELS key for translation
}

export const TAB_FILTERS: Partial<Record<TabId, FilterDef[]>> = {
  items: [
    { key: 'type', label: 'Tipo', enumGroup: 'itemType' },
    { key: 'rarity', label: 'Rarità', enumGroup: 'rarity' },
  ],
  quests: [
    { key: 'type', label: 'Tipo', enumGroup: 'questType' },
  ],
  events: [
    { key: 'type', label: 'Tipo', enumGroup: 'eventType' },
  ],
  documents: [
    { key: 'type', label: 'Tipo', enumGroup: 'documentType' },
  ],
  notifications: [
    {
      key: 'type',
      label: 'Tipo',
      enumGroup: undefined, // uses custom labels
      customLabels: {
        encounter: '⚔️ Incontro',
        victory: '🏆 Vittoria',
        defeat: '💀 Sconfitta',
        item_found: '📦 Oggetto',
        bag_expand: '🎒 Zaino',
        collectible_found: '💎 Collezionabile',
      } as Record<string, string>,
    },
  ],
  enemies: [
    { key: 'variantGroup', label: 'Variante' },
  ],
  specials: [
    { key: 'category', label: 'Categoria', enumGroup: 'specialCategory' },
  ],
  characters: [
    { key: 'archetype', label: 'Ruolo', enumGroup: 'archetype' },
  ],
  achievements: [
    { key: 'category', label: 'Categoria' },
  ],
  recipes: [
    { key: 'category', label: 'Categoria', enumGroup: 'recipeCategory' },
    { key: 'difficulty', label: 'Difficoltà', enumGroup: 'craftDifficulty' },
  ],
  'secret-rooms': [
    { key: 'discoveryMethod', label: 'Scoperta', enumGroup: 'discoveryMethod' },
  ],
};

// Derive unique values from data for a given filter
export function getFilterValues(
  data: Record<string, unknown>[],
  filter: FilterDef & { customLabels?: Record<string, string> },
): { value: string; label: string }[] {
  const values = new Set<string>();
  for (const row of data) {
    const v = String(row[filter.key] ?? '');
    if (v) values.add(v);
  }
  return Array.from(values).sort().map(v => ({
    value: v,
    label: filter.customLabels?.[v] ?? (filter.enumGroup ? getEnumLabel(filter.enumGroup, v) : v),
  }));
}
