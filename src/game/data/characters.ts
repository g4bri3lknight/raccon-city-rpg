import { CharacterArchetype, Archetype, Character } from './types';

let uid = 0;
const genUid = () => `item_${++uid}_${Date.now()}`;

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'tank',
    name: 'Tank',
    displayName: 'Viktor Stahl',
    description: 'Combattente corazzato specializzato nell\'assorbimento danni e nella protezione dei compagni. Robusto e resiliente.',
    maxHp: 150,
    atk: 18,
    def: 14,
    spd: 6,
    specialName: 'Barricata',
    specialDescription: 'Solleva una barricata improvvisata, riducendo drasticamente i danni subiti per il prossimo turno.',
    specialCost: 15,
    special2Name: 'Immolazione',
    special2Description: 'Si espone per attirare tutti gli attacchi nemici su di sé, proteggendo gli alleati.',
    special2Cost: 10,
    passiveDescription: 'Resistenza: Riduce i danni subiti del 10% in modo passivo.',
    portraitEmoji: '🛡️',
    startingItems: [
      {
        uid: genUid(), itemId: 'pipe', name: 'Tubo di Piombo', description: 'Un pesante tubo di piombo, affidabile come mazza.',
        type: 'weapon', rarity: 'common', icon: '🔧', usable: false, equippable: true, quantity: 1,
        weaponStats: { itemId: 'pipe', name: 'Tubo di Piombo', atkBonus: 5, type: 'melee' },
      },
      {
        uid: genUid(), itemId: 'bandage', name: 'Benda', description: 'Una benda per fermare le emorragie. Ripristina 25 HP.',
        type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false, quantity: 2,
        effect: { type: 'heal', value: 25, target: 'self' },
      },
      {
        uid: genUid(), itemId: 'flashlight', name: 'Torcia', description: 'Una torcia che può accecare temporaneamente un nemico.',
        type: 'utility', rarity: 'common', icon: '🔦', usable: true, equippable: false, quantity: 1,
      },
    ],
  },
  {
    id: 'healer',
    name: 'Medico',
    displayName: 'Maren Voss',
    description: 'Specialista in cure e supporto medico. Le sue conoscenze mediche sono fondamentali per la sopravvivenza del gruppo.',
    maxHp: 90,
    atk: 10,
    def: 8,
    spd: 8,
    specialName: 'Pronto Soccorso',
    specialDescription: 'Un intervento medico rapido che cura un alleato di una quantità significativa di HP.',
    specialCost: 20,
    special2Name: 'Cura Gruppo',
    special2Description: 'Un intervento medico che distribuisbe cure a tutto il gruppo, curando ogni alleato di una quantità moderata di HP.',
    special2Cost: 25,
    passiveDescription: 'Ippocrate: Le cure hanno un 20% di probabilità in più di essere efficaci.',
    portraitEmoji: '💊',
    startingItems: [
      {
        uid: genUid(), itemId: 'scalpel', name: 'Bisturi', description: 'Un bisturi da chirurgo, affilato ma leggero.',
        type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true, quantity: 1,
        weaponStats: { itemId: 'scalpel', name: 'Bisturi', atkBonus: 4, type: 'melee' },
      },
      {
        uid: genUid(), itemId: 'first_aid', name: 'Kit di Pronto Soccorso', description: 'Un kit medico completo. Ripristina tutti gli HP e cura veleno/sanguinamento a un alleato.',
        type: 'healing', rarity: 'uncommon', icon: '✚️', usable: true, equippable: false, quantity: 2,
        effect: { type: 'heal_full', value: 0, target: 'one_ally', statusCured: ['poison', 'bleeding'] },
      },
      {
        uid: genUid(), itemId: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP.',
        type: 'healing', rarity: 'common', icon: '🌿', usable: true, equippable: false, quantity: 3,
        effect: { type: 'heal', value: 30, target: 'self' },
      },
    ],
  },
  {
    id: 'dps',
    name: 'DPS',
    displayName: 'Jax Draven',
    description: 'Attaccante veloce e letale. Specializzato nell\'infliggere il massimo danno possibile in tempi brevi.',
    maxHp: 110,
    atk: 22,
    def: 9,
    spd: 12,
    specialName: 'Colpo Mortale',
    specialDescription: 'Un attacco mirato e devastante che infligge danni critici massimi.',
    specialCost: 18,
    special2Name: 'Raffica',
    special2Description: 'Spara una raffica che colpisce il bersaglio principale e danneggia anche gli altri nemici vicini.',
    special2Cost: 22,
    passiveDescription: 'Precisione: +15% di probabilità di infliggere colpi critici.',
    portraitEmoji: '⚔️',
    startingItems: [
      {
        uid: genUid(), itemId: 'pistol', name: 'Pistola M1911', description: 'Una pistola affidabile. Danni discreti a distanza.',
        type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, quantity: 1,
        weaponStats: { itemId: 'pistol', name: 'Pistola M1911', atkBonus: 8, type: 'ranged', special: 'pierce', ammoType: 'ammo_pistol' },
      },
      {
        uid: genUid(), itemId: 'ammo_pistol', name: 'Munizioni 9mm', description: 'Un pacco di munizioni per pistola.',
        type: 'ammo', rarity: 'common', icon: '📦', usable: true, equippable: false, quantity: 6,
      },
      {
        uid: genUid(), itemId: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP.',
        type: 'healing', rarity: 'common', icon: '🌿', usable: true, equippable: false, quantity: 1,
        effect: { type: 'heal', value: 30, target: 'self' },
      },
    ],
  },
  {
    id: 'control',
    name: 'Controllo',
    displayName: 'Cassian Veyra',
    description: 'Esperto di tattiche di contenimento e manipolazione del campo di battaglia. Debilita i nemici con veleno, stordimento e dispositivi sonici.',
    maxHp: 100,
    atk: 14,
    def: 10,
    spd: 11,
    specialName: 'Gas Venefico',
    specialDescription: 'Lancia una granata di gas che avvelena tutti i nemici e riduce la loro velocità per due turni.',
    specialCost: 20,
    special2Name: 'Cristalli Sonici',
    special2Description: 'Attiva un dispositivo sonico che stordisce il bersaglio e infligge danni moderati.',
    special2Cost: 15,
    passiveDescription: 'Tattico: +20% probabilità di applicare status negativi (veleno, sanguinamento, stordimento).',
    portraitEmoji: '🎯',
    startingItems: [
      {
        uid: genUid(), itemId: 'combat_knife', name: 'Coltello da Combattimento', description: 'Un coltello militare affilato.',
        type: 'weapon', rarity: 'uncommon', icon: '🗡️', usable: false, equippable: true, quantity: 1,
        weaponStats: { itemId: 'combat_knife', name: 'Coltello da Combattimento', atkBonus: 6, type: 'melee' },
      },
      {
        uid: genUid(), itemId: 'antidote', name: 'Antidoto', description: 'Cura avvelenamento.',
        type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false, quantity: 3,
        effect: { type: 'cure', value: 0, target: 'self', statusCured: ['poison'] },
      },
      {
        uid: genUid(), itemId: 'flashlight', name: 'Torcia', description: 'Una torcia per illuminare le tenebre.',
        type: 'utility', rarity: 'common', icon: '🔦', usable: true, equippable: false, quantity: 1,
      },
    ],
  },
];

// Unified stat point system: all characters (preset + custom) use point allocation
// HP = statPoints × 10, ATK/DEF/SPD = statPoints directly, total budget = 50
export const ARCHETYPE_STAT_POINTS: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
  tank:    { hp: 16, atk: 8, def: 18, spd: 8 },   // HP=160, ATK=8,  DEF=18, SPD=8  (sum=50)
  healer:  { hp: 14, atk: 8, def: 12, spd: 16 },   // HP=140, ATK=8,  DEF=12, SPD=16 (sum=50)
  dps:     { hp: 12, atk: 18, def: 8, spd: 12 },   // HP=120, ATK=18, DEF=8,  SPD=12 (sum=50)
  control: { hp: 12, atk: 12, def: 12, spd: 14 },   // HP=120, ATK=12, DEF=12, SPD=14 (sum=50)
  custom:  { hp: 10, atk: 12, def: 10, spd: 8 },    // fallback defaults (sum=40)
};

// Compute proportional growth rates from stat point distribution
export function computeGrowthRates(stats: { hp: number; atk: number; def: number; spd: number }): { hp: number; atk: number; def: number; spd: number } {
  const total = stats.hp + stats.atk + stats.def + stats.spd;
  const budget = 12;
  return {
    hp: Math.max(4, Math.round((stats.hp / total) * budget)),
    atk: Math.max(1, Math.round((stats.atk / total) * budget)),
    def: Math.max(1, Math.round((stats.def / total) * budget)),
    spd: Math.max(0, Math.round((stats.spd / total) * budget)),
  };
}

export function getCharacterStats(archetype: CharacterArchetype, level: number) {
  const points = ARCHETYPE_STAT_POINTS[archetype.id] || ARCHETYPE_STAT_POINTS.custom;
  const growth = computeGrowthRates(points);
  return {
    maxHp: points.hp * 10 + growth.hp * (level - 1),
    atk: points.atk + growth.atk * (level - 1),
    def: points.def + growth.def * (level - 1),
    spd: points.spd + growth.spd * (level - 1),
  };
}

// Get growth rates for a given archetype (unified proportional system)
export function getGrowthRates(archetype: Archetype, customGrowth?: { hp: number; atk: number; def: number; spd: number }) {
  if (customGrowth) return customGrowth;
  const points = ARCHETYPE_STAT_POINTS[archetype];
  if (points) return computeGrowthRates(points);
  return { hp: 10, atk: 2, def: 1, spd: 1 };
}

// Get passive description for custom characters based on their stat distribution
export function getCustomPassiveDescription(stats: { hp: number; atk: number; def: number; spd: number }): string {
  const total = stats.hp + stats.atk + stats.def + stats.spd;
  const highest = Math.max(stats.hp, stats.atk, stats.def, stats.spd);
  
  if (highest === stats.hp) return 'Resistenza Innata: Sopravvive più a lungo grazie alla sua corporatura robusta. +10% HP massimo.';
  if (highest === stats.atk) return 'Istinto Predatore: I suoi colpi sono più precisi. +15% probabilità di colpo critico.';
  if (highest === stats.def) return 'Pelle Coriacea: Riduce i danni subiti del 10% in modo passivo.';
  return 'Riflessi Felini: La sua velocità naturale gli conferisce +10% probabilità di schivare.';
}

// Starting items: inherit from base archetype if available, otherwise generic kit
export function getCustomStartingItems(baseArchetype?: Archetype) {
  if (baseArchetype && baseArchetype !== 'custom') {
    const archetype = CHARACTER_ARCHETYPES.find(a => a.id === baseArchetype);
    if (archetype) {
      return archetype.startingItems.map(item => ({ ...item, uid: genUid() }));
    }
  }
  return [
    {
      uid: genUid(), itemId: 'pipe', name: 'Tubo di Piombo', description: 'Un pesante tubo di piombo, affidabile come mazza.',
      type: 'weapon' as const, rarity: 'common' as const, icon: '🔧', usable: false, equippable: true, quantity: 1,
      weaponStats: { itemId: 'pipe', name: 'Tubo di Piombo', atkBonus: 5, type: 'melee' as const },
    },
    {
      uid: genUid(), itemId: 'bandage', name: 'Benda', description: 'Una benda per fermare le emorragie. Ripristina 25 HP.',
      type: 'healing' as const, rarity: 'common' as const, icon: '🩹', usable: true, equippable: false, quantity: 2,
      effect: { type: 'heal' as const, value: 25, target: 'self' as const },
    },
    {
      uid: genUid(), itemId: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP.',
      type: 'healing' as const, rarity: 'common' as const, icon: '🌿', usable: true, equippable: false, quantity: 2,
      effect: { type: 'heal' as const, value: 30, target: 'self' as const },
    },
  ];
}
