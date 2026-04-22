import { ItemDefinition } from '@/game/types';

export const SEED_ITEMS: Record<string, ItemDefinition> = {
  // Weapons
  pipe: {
    id: 'pipe', name: 'Tubo di Piombo', description: 'Un pesante tubo di piombo.',
    type: 'weapon', rarity: 'common', icon: '⚒️', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 5, flat: true }],
  },
  scalpel: {
    id: 'scalpel', name: 'Bisturi', description: 'Un bisturi da chirurgo.',
    type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 6, flat: true }],
  },
  pistol: {
    id: 'pistol', name: 'Pistola M1911', description: 'Una pistola affidabile.',
    type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 8, flat: true }],
  },
  shotgun: {
    id: 'shotgun', name: 'Fucile a Pompa', description: 'Un fucile a pompa devastante a distanza ravvicinata.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 15, flat: true }],
  },
  combat_knife: {
    id: 'combat_knife', name: 'Coltello da Combattimento', description: 'Un coltello militare affilato.',
    type: 'weapon', rarity: 'uncommon', icon: '🗡️', usable: false, equippable: true,
    effects: [
      { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 10, flat: true },
      { type: 'apply_status', trigger: 'on_hit', target: 'enemy', statusType: 'bleeding', chance: 25 },
    ],
  },
  magnum: {
    id: 'magnum', name: 'Magnum .357', description: 'Un revolver potentissimo. Causa danni devastanti.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 20, flat: true }],
  },
  machinegun: {
    id: 'machinegun', name: 'Mitragliatrice MP5', description: 'Un\'arma automatica militare. Fuoco rapido e danni costanti. Consuma munizioni 5.56mm.',
    type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 14, flat: true }],
  },
  grenade_launcher: {
    id: 'grenade_launcher', name: 'Lanciagranate M79', description: 'Un lanciagranate militare. Ogni colpo infligge danni esplosivi devastanti contro un singolo bersaglio.',
    type: 'weapon', rarity: 'rare', icon: '💣', usable: false, equippable: true,
    effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 25, flat: true }],
  },
  rocket_launcher: {
    id: 'rocket_launcher', name: 'Lanciarazzi RPG', description: 'Un lanciarazzi con un solo colpo già caricato. Usalo in combattimento per eliminare istantaneamente tutti i nemici.',
    type: 'utility', rarity: 'legendary', icon: '🚀', usable: true, equippable: false,
    effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 999, ignoreDef: true, noMiss: true }],
  },

  // Healing
  bandage: {
    id: 'bandage', name: 'Benda', description: 'Ripristina 25 HP a se stessi.',
    type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false,
    effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 25 }],
  },
  herb_green: {
    id: 'herb_green', name: 'Erba Verde', description: 'Un\'erba medicinale. Ripristina 30 HP a se stessi. Può essere miscelata con un\'erba rossa.',
    type: 'healing', rarity: 'common', icon: '🍃', usable: true, equippable: false,
    effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 30 }],
  },
  herb_red: {
    id: 'herb_red', name: 'Erba Rossa', description: 'Un\'erba potente che da sola non ha effetto. Miscelala con un\'Erba Verde per potenziare la cura.',
    type: 'utility', rarity: 'uncommon', icon: '🩸', usable: false, equippable: false,
  },
  herb_mixed: {
    id: 'herb_mixed', name: 'Erba Mista', description: 'Un miscuglio di erba verde e rossa. Ripristina 70 HP a se stessi e cura status negativi.',
    type: 'healing', rarity: 'uncommon', icon: '🌿', usable: true, equippable: false,
    effects: [
      { type: 'heal', trigger: 'on_use', target: 'self', amount: 70 },
      { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding'] },
    ],
  },
  first_aid: {
    id: 'first_aid', name: 'Kit di Pronto Soccorso', description: 'Un kit medico completo. Ripristina tutti gli HP e cura veleno/sanguinamento a se stessi.',
    type: 'healing', rarity: 'uncommon', icon: '✚️', usable: true, equippable: false,
    effects: [
      { type: 'heal', trigger: 'on_use', target: 'self', percent: 100 },
      { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding'] },
    ],
  },
  spray: {
    id: 'spray', name: 'Spray Medicale', description: 'Uno spray curativo. Ripristina 80 HP a se stessi.',
    type: 'healing', rarity: 'rare', icon: '🧴', usable: true, equippable: false,
    effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 80 }],
  },

  // Booster items
  adrenaline_shot: {
    id: 'adrenaline_shot', name: 'Iniezione di Adrenalina', description: 'Un\'iniezione di adrenalina. +20 ATK per 3 turni in combattimento.',
    type: 'healing', rarity: 'rare', icon: '💉', usable: true, equippable: false,
    effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'atk', amount: 20, flat: true }],
  },
  defense_pill: {
    id: 'defense_pill', name: 'Pillola Difensiva', description: 'Un integratore che potenzia le difese del corpo. +15 DEF per 3 turni.',
    type: 'healing', rarity: 'uncommon', icon: '💊', usable: true, equippable: false,
    effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 15, flat: true }],
  },
  // Explosive
  pipe_bomb: {
    id: 'pipe_bomb', name: 'Bomba Artigianale', description: 'Una bomba fatta con pezzi di ricambio. Infligge 50 danni a tutti i nemici.',
    type: 'healing', rarity: 'rare', icon: '💣', usable: true, equippable: false,
    effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', amount: 50, flat: true, ignoreDef: true, noMiss: true }],
  },

  // Antidote
  antidote: {
    id: 'antidote', name: 'Antidoto', description: 'Cura avvelenamento su se stessi.',
    type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false,
    effects: [{ type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison'] }],
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
    id: 'bag_small', name: 'Tasche da Caccia', description: 'Una sacca da caccia resistente. Aggiunge 1 slot all\'inventario.',
    type: 'bag', rarity: 'uncommon', icon: '👝', usable: true, equippable: false,
    effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 1 }],
  },
  bag_medium: {
    id: 'bag_medium', name: 'Zaino Tattico', description: 'Uno zaino militare capiente. Aggiunge 2 slot all\'inventario.',
    type: 'bag', rarity: 'rare', icon: '🎒', usable: true, equippable: false,
    effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 2 }],
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
};
