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
        uid: genUid(), itemId: 'first_aid', name: 'Kit di Pronto Soccorso', description: 'Un kit medico completo. Ripristina 50 HP a un bersaglio.',
        type: 'healing', rarity: 'uncommon', icon: '🎒', usable: true, equippable: false, quantity: 2,
        effect: { type: 'heal', value: 50, target: 'one_ally', statusCured: ['poison', 'bleeding'] },
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

export function getCharacterStats(archetype: CharacterArchetype, level: number) {
  const hpGrowth = { tank: 12, healer: 8, dps: 9, control: 9 };
  const atkGrowth = { tank: 2, healer: 1, dps: 3, control: 2 };
  const defGrowth = { tank: 2, healer: 1, dps: 1, control: 1 };
  const spdGrowth = { tank: 0, healer: 1, dps: 1, control: 2 };

  return {
    maxHp: archetype.maxHp + hpGrowth[archetype.id as 'tank' | 'healer' | 'dps' | 'control'] * (level - 1),
    atk: archetype.atk + atkGrowth[archetype.id as 'tank' | 'healer' | 'dps' | 'control'] * (level - 1),
    def: archetype.def + defGrowth[archetype.id as 'tank' | 'healer' | 'dps' | 'control'] * (level - 1),
    spd: archetype.spd + spdGrowth[archetype.id as 'tank' | 'healer' | 'dps' | 'control'] * (level - 1),
  };
}

// Get growth rates for a given archetype (including 'custom')
export function getGrowthRates(archetype: Archetype, customGrowth?: { hp: number; atk: number; def: number; spd: number }) {
  if (archetype === 'custom' && customGrowth) {
    return customGrowth;
  }
  const growthMap: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
    tank: { hp: 12, atk: 2, def: 2, spd: 0 },
    healer: { hp: 8, atk: 1, def: 1, spd: 1 },
    dps: { hp: 9, atk: 3, def: 1, spd: 1 },
    control: { hp: 9, atk: 2, def: 1, spd: 2 },
  };
  return growthMap[archetype] || { hp: 10, atk: 2, def: 1, spd: 1 };
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

// Default starting items for custom characters
export function getCustomStartingItems() {
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
