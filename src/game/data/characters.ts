import { CharacterArchetype, ItemInstance } from './types';

let uid = 0;
const genUid = () => `item_${++uid}_${Date.now()}`;

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'tank',
    name: 'Marcus Stone',
    description: 'Un ex-sicurezza della Umbrella Corporation. Robusto e resiliente, Marcus sa come assorbire i colpi e proteggere i compagni.',
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
    name: 'Dr. Sarah Chen',
    description: 'Medico del Raccoon City Hospital. La sua conoscenza medica è preziosa in questo inferno vivente.',
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
    passiveDescription: 'Ippocrate: Le cure di Sarah hanno un 20% di probabilità in più di essere efficaci.',
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
        effect: { type: 'heal', value: 50, target: 'one_ally' },
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
    name: 'Jake Morrison',
    description: 'Un corriere della Umbrella che ha scoperto i loro segreti. Veloce, letale, con un occhio per le armi.',
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
    passiveDescription: 'Precisione: Jake ha il 15% di probabilità in più di infliggere colpi critici.',
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
];

export function getCharacterStats(archetype: CharacterArchetype, level: number) {
  const hpGrowth = { tank: 12, healer: 8, dps: 9 };
  const atkGrowth = { tank: 2, healer: 1, dps: 3 };
  const defGrowth = { tank: 2, healer: 1, dps: 1 };
  const spdGrowth = { tank: 0, healer: 1, dps: 1 };

  return {
    maxHp: archetype.maxHp + hpGrowth[archetype.id] * (level - 1),
    atk: archetype.atk + atkGrowth[archetype.id] * (level - 1),
    def: archetype.def + defGrowth[archetype.id] * (level - 1),
    spd: archetype.spd + spdGrowth[archetype.id] * (level - 1),
  };
}
