import { SpecialAbilityDefinition, SpecialCategory } from '../types';

// ==========================================
// SPECIAL ABILITIES POOL
// At least 8 specials across 3 categories
// Custom characters can pick any 2 from this pool
// ==========================================

export const ALL_SPECIAL_ABILITIES: SpecialAbilityDefinition[] = [
  // ── OFFENSIVE ──
  {
    id: 'colpo_mortale',
    name: 'Colpo Mortale',
    description: 'Un attacco mirato e devastante che infligge danni critici massimi al bersaglio.',
    icon: '💀',
    targetType: 'enemy',
    cooldown: 2,
    category: 'offensive',
    executionType: 'colpo_mortale',
    powerMultiplier: 1.6,
  },
  {
    id: 'raffica',
    name: 'Raffica',
    description: 'Spara una raffica che colpisce il bersaglio principale e danneggia anche gli altri nemici vicini.',
    icon: '🔥',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    executionType: 'raffica',
    powerMultiplier: 1.3,
  },
  {
    id: 'sparo_mirato',
    name: 'Sparo Mirato',
    description: 'Un colpo precisissimo che non può mancare e infligge ingenti danni al bersaglio.',
    icon: '🎯',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    executionType: 'sparo_mirato',
    powerMultiplier: 2.0,
  },
  {
    id: 'veleno_acido',
    name: 'Veleno Acido',
    description: 'Lancia una sostanza corrosiva che avvelena il nemico e infligge danni moderati.',
    icon: '☣️',
    targetType: 'enemy',
    cooldown: 2,
    category: 'offensive',
    executionType: 'veleno_acido',
    powerMultiplier: 0.9,
    statusToApply: { type: 'poison', chance: 60 },
  },
  {
    id: 'attacco_carica',
    name: 'Attacco di Carica',
    description: 'Una carica brutale che infligge danni considerevoli e può stordire il nemico.',
    icon: '🏃',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    executionType: 'attacco_carica',
    powerMultiplier: 1.4,
    statusToApply: { type: 'stunned', chance: 40 },
  },

  // ── DEFENSIVE ──
  {
    id: 'barricata',
    name: 'Barricata',
    description: 'Solleva una barricata improvvisata, riducendo drasticamente i danni subiti per il prossimo turno.',
    icon: '🛡️',
    targetType: 'self',
    cooldown: 2,
    category: 'defensive',
    executionType: 'barricata',
  },
  {
    id: 'immolazione',
    name: 'Immolazione',
    description: 'Si espone per attirare tutti gli attacchi nemici su di sé, proteggendo gli alleati. Danni ridotti.',
    icon: '🔥',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    executionType: 'immolazione',
  },
  {
    id: 'scudo_vitale',
    name: 'Scudo Vitale',
    description: 'Attiva uno scudo energetico che ripristina 30 HP e riduce i danni subiti fino al prossimo turno.',
    icon: '✨',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    executionType: 'scudo_vitale',
  },
  {
    id: 'recupero_tattico',
    name: 'Recupero Tattico',
    description: 'Sfrutta le conoscenze di sopravvivenza per curarsi rapidamente e tornare in forze.',
    icon: '🔧',
    targetType: 'self',
    cooldown: 2,
    category: 'defensive',
    executionType: 'recupero_tattico',
    healAmount: 50,
  },
  {
    id: 'resistenza_attiva',
    name: 'Resistenza Attiva',
    description: 'Attiva un protocollo di resistenza che rimuove tutti gli status negativi e ripristina una modesta quantità di HP.',
    icon: '💊',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    executionType: 'resistenza_attiva',
    healAmount: 25,
  },

  // ── SUPPORT ──
  {
    id: 'pronto_soccorso',
    name: 'Pronto Soccorso',
    description: 'Un intervento medico rapido che cura un alleato di 70 HP e rimuove avvelenamento e sanguinamento.',
    icon: '💊',
    targetType: 'ally',
    cooldown: 2,
    category: 'support',
    executionType: 'pronto_soccorso',
    healAmount: 70,
  },
  {
    id: 'cura_gruppo',
    name: 'Cura Gruppo',
    description: 'Distribuisce cure a tutto il gruppo, curando ogni alleato di una quantità moderata di HP.',
    icon: '💚',
    targetType: 'all_allies',
    cooldown: 3,
    category: 'support',
    executionType: 'cura_gruppo',
    healAmount: 35,
  },
  {
    id: 'adrenalina',
    name: 'Adrenalina',
    description: 'Inietta adrenalina a un alleato, ripristinando 40 HP e aumentando i danni inflitti del 25% per 2 turni.',
    icon: '💉',
    targetType: 'ally',
    cooldown: 3,
    category: 'support',
    executionType: 'adrenalina',
  },
  {
    id: 'iniezione_stimolante',
    name: 'Iniezione Stimolante',
    description: 'Un potente siero che cura un alleato di una grande quantità di HP e rimuove tutti gli effetti negativi.',
    icon: '🧪',
    targetType: 'ally',
    cooldown: 3,
    category: 'support',
    executionType: 'iniezione_stimolante',
    healAmount: 45,
  },
  {
    id: 'disinfezione_totale',
    name: 'Disinfezione Totale',
    description: 'Distribuisce un antisettico a tutto il gruppo, rimuovendo tutti gli status negativi e curando leggermente ogni alleato.',
    icon: '🧴',
    targetType: 'all_allies',
    cooldown: 3,
    category: 'support',
    executionType: 'disinfezione_totale',
    healAmount: 20,
  },

  // ── CONTROL ──
  {
    id: 'gas_venefico',
    name: 'Gas Venefico',
    description: 'Lancia una granata di gas che avvelena tutti i nemici e infligge danni moderati.',
    icon: '💨',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    executionType: 'gas_venefico',
    powerMultiplier: 0.7,
    statusToApply: { type: 'poison', chance: 75 },
  },
  {
    id: 'cristalli_sonici',
    name: 'Cristalli Sonici',
    description: 'Attiva un dispositivo sonico che stordisce il bersaglio e infligge danni moderati.',
    icon: '🔔',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    executionType: 'cristalli_sonici',
    powerMultiplier: 1.1,
    statusToApply: { type: 'stunned', chance: 65 },
  },
  {
    id: 'frecce_etiche',
    name: 'Frecce Elettriche',
    description: 'Spara una scarica elettrica che paralizza il nemico con alta probabilità e infligge danni moderati.',
    icon: '⚡',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    executionType: 'frecce_etiche',
    powerMultiplier: 0.9,
    statusToApply: { type: 'stunned', chance: 50 },
  },
  {
    id: 'granata_stordente',
    name: 'Granata Stordente',
    description: 'Lancia una granata concussiva che infligge danni moderati a tutti i nemici con alta probabilità di stordirli.',
    icon: '💣',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    executionType: 'granata_stordente',
    powerMultiplier: 0.8,
    statusToApply: { type: 'stunned', chance: 55 },
  },
  {
    id: 'siero_inibitore',
    name: 'Siero Inibitore',
    description: 'Inietta un siero neurotossico al nemico, avvelenandolo e stordendolo simultaneamente.',
    icon: '🧬',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    executionType: 'siero_inibitore',
    powerMultiplier: 1.0,
    statusToApply: { type: 'poison', chance: 65 },
  },
];

export function getSpecialById(id: string): SpecialAbilityDefinition | undefined {
  return ALL_SPECIAL_ABILITIES.find(s => s.id === id);
}

// Map predefined archetype specials to the pool IDs (for backward compatibility)
export const ARCHETYPE_SPECIAL_MAP: Record<string, { special1: string; special2: string }> = {
  tank: { special1: 'barricata', special2: 'immolazione' },
  healer: { special1: 'pronto_soccorso', special2: 'cura_gruppo' },
  dps: { special1: 'colpo_mortale', special2: 'raffica' },
  control: { special1: 'gas_venefico', special2: 'cristalli_sonici' },
};

// Maps each preset archetype to the special ability category it draws from
export const ARCHETYPE_CATEGORY_MAP: Record<string, SpecialCategory> = {
  tank: 'defensive',
  healer: 'support',
  dps: 'offensive',
  control: 'control',
};

// Generate a passive description based on the highest custom stat
export function getCustomPassiveDescription(stats: { hp: number; atk: number; def: number; spd: number }): string {
  const entries = Object.entries(stats) as [keyof typeof stats, number][];
  const highest = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0]);
  const descriptions: Record<string, string> = {
    hp: 'Tenacia Sopravvissuta: Rigenera lentamente HP ogni turno grazie alla sua straordinaria vitalità.',
    atk: 'Istinto Predatorio: I colpi critici infliggono danni aggiuntivi grazie alla sua ferocia in combattimento.',
    def: 'Pelle Corazzata: Riduce ulteriormente i danni subiti grazie alla sua resilienza eccezionale.',
    spd: 'Riflessi Fulminei: Ha una chance di schivare gli attacchi nemici grazie alla sua velocità.',
  };
  return descriptions[highest[0]] || descriptions.atk;
}

// Stat point budget for custom archetype characters
export const CUSTOM_STAT_BUDGET = {
  totalPoints: 50,
  minPerStat: 5,
  maxPerStat: 25,
  defaults: { hp: 10, atk: 12, def: 10, spd: 8 },
};

// Default starting items for custom characters (generic survival kit)
export const CUSTOM_STARTING_ITEMS: { itemId: string; name: string; description: string; type: string; rarity: string; icon: string; usable: boolean; equippable: boolean; quantity: number; effect?: any; weaponStats?: any }[] = [
  {
    itemId: 'pipe',
    name: 'Tubo di Piombo',
    description: 'Un pesante tubo di piombo, affidabile come mazza.',
    type: 'weapon',
    rarity: 'common',
    icon: '🔧',
    usable: false,
    equippable: true,
    quantity: 1,
    weaponStats: { itemId: 'pipe', name: 'Tubo di Piombo', atkBonus: 5, type: 'melee' },
  },
  {
    itemId: 'bandage',
    name: 'Benda',
    description: 'Una benda per fermare le emorragie. Ripristina 25 HP.',
    type: 'healing',
    rarity: 'common',
    icon: '🩹',
    usable: true,
    equippable: false,
    quantity: 2,
    effect: { type: 'heal', value: 25, target: 'self' },
  },
  {
    itemId: 'herb_green',
    name: 'Erba Verde',
    description: "Un'erba medicinale. Ripristina 30 HP.",
    type: 'healing',
    rarity: 'common',
    icon: '🌿',
    usable: true,
    equippable: false,
    quantity: 2,
    effect: { type: 'heal', value: 30, target: 'self' },
  },
];

// Predefined avatar options (RE-themed) — images loaded from DB
export const PREDEFINED_AVATARS = [
  { id: 'avatar_soldier', name: 'Soldato UBCS', path: '/api/media/image?id=avatar_soldier', emoji: '🪖' },
  { id: 'avatar_medic', name: 'Infermiera', path: '/api/media/image?id=avatar_medic', emoji: '🩺' },
  { id: 'avatar_agent', name: 'Agente Speciale', path: '/api/media/image?id=avatar_agent', emoji: '🕵️' },
  { id: 'avatar_cop', name: 'Poliziotto RPD', path: '/api/media/image?id=avatar_cop', emoji: '👮' },
  { id: 'avatar_scientist', name: 'Scienziato', path: '/api/media/image?id=avatar_scientist', emoji: '🔬' },
  { id: 'avatar_civilian', name: 'Civile', path: '/api/media/image?id=avatar_civilian', emoji: '👤' },
  { id: 'avatar_jax', name: 'Mercenario', path: '/api/media/image?id=avatar_jax', emoji: '⚔️' },
  { id: 'avatar_elena', name: 'Medico', path: '/api/media/image?id=avatar_elena', emoji: '🩺' },
  { id: 'avatar_marco', name: 'Pilota', path: '/api/media/image?id=avatar_marco', emoji: '✈️' },
];
