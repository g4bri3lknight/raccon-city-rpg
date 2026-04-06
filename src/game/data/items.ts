import { ItemDefinition } from './types';

export const ITEMS: Record<string, ItemDefinition> = {
  // Weapons
  pipe: {
    id: 'pipe', name: 'Tubo di Piombo', description: 'Un pesante tubo di piombo.',
    type: 'weapon', rarity: 'common', icon: '⚒️', usable: false, equippable: true,
  },
  scalpel: {
    id: 'scalpel', name: 'Bisturi', description: 'Un bisturi da chirurgo.',
    type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true,
  },
  pistol: {
    id: 'pistol', name: 'Pistola M1911', description: 'Una pistola affidabile.',
    type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true,
  },
  shotgun: {
    id: 'shotgun', name: 'Fucile a Pompa', description: 'Un fucile a pompa devastante a distanza ravvicinata.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
  },
  combat_knife: {
    id: 'combat_knife', name: 'Coltello da Combattimento', description: 'Un coltello militare affilato.',
    type: 'weapon', rarity: 'uncommon', icon: '🗡️', usable: false, equippable: true,
  },
  magnum: {
    id: 'magnum', name: 'Magnum .357', description: 'Un revolver potentissimo. Causa danni devastanti.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
  },
  machinegun: {
    id: 'machinegun', name: 'Mitragliatrice MP5', description: 'Un\'arma automatica militare. Fuoco rapido e danni costanti. Consuma munizioni 5.56mm.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
  },
  grenade_launcher: {
    id: 'grenade_launcher', name: 'Lanciagranate M79', description: 'Un lanciagranate militare. Ogni colpo infligge danni esplosivi devastanti contro un singolo bersaglio.',
    type: 'weapon', rarity: 'rare', icon: '💣', usable: false, equippable: true,
  },
  rocket_launcher: {
    id: 'rocket_launcher', name: 'Lanciarazzi RPG', description: 'Un lanciarazzi con un solo colpo già caricato. Usalo in combattimento per eliminare istantaneamente tutti i nemici.',
    type: 'utility', rarity: 'legendary', icon: '🚀', usable: true, equippable: false,
    effect: { type: 'kill_all', value: 99999, target: 'all_enemies' },
  },

  // Healing
  bandage: {
    id: 'bandage', name: 'Benda', description: 'Ripristina 25 HP.',
    type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false,
    effect: { type: 'heal', value: 25, target: 'self' },
  },
  herb_green: {
    id: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP. Può essere miscelata con un\'erba rossa.',
    type: 'healing', rarity: 'common', icon: '🍃', usable: true, equippable: false,
    effect: { type: 'heal', value: 30, target: 'self' },
  },
  herb_red: {
    id: 'herb_red', name: 'Erba Rossa', description: 'Un\'erba potente che da sola non ha effetto. Miscelala con un\'Erba Verde per potenziare la cura.',
    type: 'utility', rarity: 'uncommon', icon: '🩸', usable: false, equippable: false,
  },
  herb_mixed: {
    id: 'herb_mixed', name: 'Erba Mista', description: 'Un miscuglio di erba verde e rossa. Ripristina 70 HP e cura status negativi.',
    type: 'healing', rarity: 'uncommon', icon: '🌿', usable: true, equippable: false,
    effect: { type: 'heal', value: 70, target: 'self', statusCured: ['poison', 'bleeding'] },
  },
  first_aid: {
    id: 'first_aid', name: 'Kit di Pronto Soccorso', description: 'Un kit medico completo. Ripristina tutti gli HP e cura veleno/sanguinamento a un alleato.',
    type: 'healing', rarity: 'uncommon', icon: '✚️', usable: true, equippable: false,
    effect: { type: 'heal_full', value: 0, target: 'one_ally', statusCured: ['poison', 'bleeding'] },
  },
  spray: {
    id: 'spray', name: 'Spray Medicale', description: 'Uno spray curativo. Ripristina 80 HP a un alleato.',
    type: 'healing', rarity: 'rare', icon: '🧴', usable: true, equippable: false,
    effect: { type: 'heal', value: 80, target: 'one_ally' },
  },

  // Antidote
  antidote: {
    id: 'antidote', name: 'Antidoto', description: 'Cura avvelenamento.',
    type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false,
    effect: { type: 'cure', value: 0, target: 'self', statusCured: ['poison'] },
  },

  // Ammo
  ammo_pistol: {
    id: 'ammo_pistol', name: 'Munizioni 9mm', description: 'Munizioni per pistola.',
    type: 'ammo', rarity: 'common', icon: '🔶', usable: false, equippable: false,
  },
  ammo_shotgun: {
    id: 'ammo_shotgun', name: 'Cartucce da Fucile', description: 'Cartucce per fucile a pompa.',
    type: 'ammo', rarity: 'uncommon', icon: '🔷', usable: false, equippable: false,
  },
  ammo_magnum: {
    id: 'ammo_magnum', name: 'Munizioni .357', description: 'Munizioni per magnum.',
    type: 'ammo', rarity: 'rare', icon: '🔴', usable: false, equippable: false,
  },
  ammo_machinegun: {
    id: 'ammo_machinegun', name: 'Munizioni 5.56mm', description: 'Munizioni per mitragliatrice.',
    type: 'ammo', rarity: 'uncommon', icon: '🟡', usable: false, equippable: false,
  },
  ammo_grenade: {
    id: 'ammo_grenade', name: 'Granate 40mm', description: 'Granate esplosive per lanciagranate.',
    type: 'ammo', rarity: 'rare', icon: '🟠', usable: false, equippable: false,
  },

  // Bags
  bag_small: {
    id: 'bag_small', name: 'Tasche da Caccia', description: 'Una sacca da caccia resistente. Aggiunge 1 slot all\'inventario. (Max 12 slot)',
    type: 'bag', rarity: 'uncommon', icon: '👝', usable: true, equippable: false,
    effect: { type: 'add_slots', value: 1, target: 'self' },
  },
  bag_medium: {
    id: 'bag_medium', name: 'Zaino Tattico', description: 'Uno zaino militare capiente. Aggiunge 2 slot all\'inventario. (Max 12 slot)',
    type: 'bag', rarity: 'rare', icon: '🎒', usable: true, equippable: false,
    effect: { type: 'add_slots', value: 2, target: 'self' },
  },

  // Utility
  flashlight: {
    id: 'flashlight', name: 'Torcia', description: 'Una torcia per illuminare le tenebre.',
    type: 'utility', rarity: 'common', icon: '🔦', usable: true, equippable: false,
  },
  lockpick: {
    id: 'lockpick', name: 'Grisaglie', description: 'Set di grisaglie per aprire serrature.',
    type: 'utility', rarity: 'uncommon', icon: '🗝️', usable: true, equippable: false,
  },
  ink_ribbon: {
    id: 'ink_ribbon', name: 'Nastro d\'Inchiostro', description: 'Un oggetto raro da collezione. Raccogline 10 per un obiettivo segreto.',
    type: 'collectible', rarity: 'legendary', icon: '🎀', usable: false, equippable: false,
  },

  // Keys — required for backtracking and puzzles
  key_rpd: {
    id: 'key_rpd', name: 'Chiave del Distretto di Polizia', description: 'Una chiave d\'argento con il logo della R.P.D.',
    type: 'utility', rarity: 'uncommon', icon: '🔑', usable: false, equippable: false,
  },
  key_sewers: {
    id: 'key_sewers', name: 'Chiave delle Fogne', description: 'Una chiave arrugginita trovata nelle fogne.',
    type: 'utility', rarity: 'uncommon', icon: '🔑', usable: false, equippable: false,
  },
  key_lab: {
    id: 'key_lab', name: 'Tessera Umbrella', description: 'Una tessera magnetica con il logo dell\'Umbrella Corp.',
    type: 'utility', rarity: 'rare', icon: '💳', usable: false, equippable: false,
  },
  crank_handle: {
    id: 'crank_handle', name: 'Manovella', description: 'Una manovella metallica per aprire chiuse idrauliche.',
    type: 'utility', rarity: 'uncommon', icon: '⚙️', usable: false, equippable: false,
  },
  fuse: {
    id: 'fuse', name: 'Fusibile', description: 'Un fusibile elettrico per ripristinare l\'energia.',
    type: 'utility', rarity: 'uncommon', icon: '🔌', usable: false, equippable: false,
  },

  // ── Crafting Materials ──
  gunpowder: {
    id: 'gunpowder', name: 'Polvere da Sparo', description: 'Polvere nera per ricaricare munizioni. Materiale di craft.',
    type: 'material', rarity: 'common', icon: '💥', usable: false, equippable: false,
  },
  metal_scrap: {
    id: 'metal_scrap', name: 'Pezzi di Metallo', description: 'Frammenti metallici recuperati. Materiale di craft.',
    type: 'material', rarity: 'common', icon: '🔩', usable: false, equippable: false,
  },
  empty_shell: {
    id: 'empty_shell', name: 'Cartuccia Vuota', description: 'Cartucce scariche da riutilizzare. Materiale di craft.',
    type: 'material', rarity: 'uncommon', icon: '🫧', usable: false, equippable: false,
  },
  distilled_water: {
    id: 'distilled_water', name: 'Acqua Distillata', description: 'Acqua pura per preparazioni chimiche. Materiale di craft.',
    type: 'material', rarity: 'common', icon: '💧', usable: false, equippable: false,
  },
  alcohol: {
    id: 'alcohol', name: 'Alcol', description: 'Alcol denaturato per disinfettare e miscelare. Materiale di craft.',
    type: 'material', rarity: 'common', icon: '🧪', usable: false, equippable: false,
  },

  // ── Crafted Healing Items ──
  crafted_antidote: {
    id: 'crafted_antidote', name: 'Antidoto', description: 'Antidoto artigianale. Cura avvelenamento immediatamente.',
    type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false,
    effect: { type: 'cure', value: 0, target: 'self', statusCured: ['poison'] },
  },
  strong_bandage: {
    id: 'strong_bandage', name: 'Cerotto Potente', description: 'Benda medica rinforzata. Ripristina 60 HP.',
    type: 'healing', rarity: 'uncommon', icon: '🩹', usable: true, equippable: false,
    effect: { type: 'heal', value: 60, target: 'self' },
  },
  strong_painkiller: {
    id: 'strong_painkiller', name: 'Analgesico Forte', description: 'Potente antidolorifico. Ripristina 100 HP.',
    type: 'healing', rarity: 'rare', icon: '💊', usable: true, equippable: false,
    effect: { type: 'heal', value: 100, target: 'self' },
  },

  // ── Crafted Boosters ──
  stimulant: {
    id: 'stimulant', name: 'Stimolante', description: 'Potenzia l\'ATTacco di +5 per 5 turni in combattimento.',
    type: 'booster', rarity: 'uncommon', icon: '⚡', usable: true, equippable: false,
    effect: { type: 'damage_boost', value: 5, target: 'self' },
  },
  elastic_bandage: {
    id: 'elastic_bandage', name: 'Benda Elastica', description: 'Protezione rinforzata. +5 DIFesa per 5 turni in combattimento.',
    type: 'booster', rarity: 'uncommon', icon: '🛡️', usable: true, equippable: false,
    effect: { type: 'defense_boost', value: 5, target: 'self' },
  },
  adrenaline_shot: {
    id: 'adrenaline_shot', name: 'Adrenalina', description: 'Iniezione di adrenalina. +3 VELocità per 5 turni in combattimento.',
    type: 'booster', rarity: 'uncommon', icon: '💊', usable: true, equippable: false,
    effect: { type: 'damage_boost', value: 0, target: 'self' },
  },
};

export function createItemInstance(itemId: string, quantity: number = 1): ItemDefinition & { uid: string; quantity: number } {
  const def = ITEMS[itemId];
  if (!def) throw new Error(`Item ${itemId} not found`);
  return {
    ...def,
    uid: `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity,
  };
}
