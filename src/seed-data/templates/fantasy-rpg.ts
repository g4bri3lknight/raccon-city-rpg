import type { TemplateSeedData } from './index';

let uid = 0;
const genUid = () => `item_${++uid}_${Date.now()}`;

export const FANTASY_SEED_DATA: TemplateSeedData = {
  // ═══════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════
  items: {
    // ── Weapons ──
    iron_sword: {
      id: 'iron_sword', name: 'Spada di Ferro', description: 'Una spada di ferro robusta e affidabile.',
      type: 'weapon', rarity: 'common', icon: '🗡️', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 8, flat: true }],
    },
    steel_sword: {
      id: 'steel_sword', name: 'Spada d\'Acciaio', description: 'Lama affilata forgiata in acciaio puro.',
      type: 'weapon', rarity: 'uncommon', icon: '⚔️', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 14, flat: true }],
    },
    legendary_blade: {
      id: 'legendary_blade', name: 'Lama Leggendaria', description: 'Una spada magica che brilla di luce propria. Infligge danni devastanti.',
      type: 'weapon', rarity: 'legendary', icon: '✨', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 22, flat: true }],
      unico: true,
    },
    wooden_bow: {
      id: 'wooden_bow', name: 'Arco di Legno', description: 'Un arco semplice ma efficace per attacchi a distanza.',
      type: 'weapon', rarity: 'common', icon: '🏹', usable: false, equippable: true, weaponType: 'ranged', ammoType: 'arrow',
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 10, flat: true }],
    },
    fire_staff: {
      id: 'fire_staff', name: 'Bastone di Fuoco', description: 'Un bastone che incanala il fuoco elementale.',
      type: 'weapon', rarity: 'rare', icon: '🔥', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 16, flat: true }],
    },
    ice_staff: {
      id: 'ice_staff', name: 'Bastone del Gelo', description: 'Un bastone che incanala il gelo elementale.',
      type: 'weapon', rarity: 'rare', icon: '❄️', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 15, flat: true }],
    },
    war_hammer: {
      id: 'war_hammer', name: 'Martello da Guerra', description: 'Un pesante martello che può stordire i nemici.',
      type: 'weapon', rarity: 'uncommon', icon: '🔨', usable: false, equippable: true,
      effects: [
        { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 12, flat: true },
        { type: 'apply_status', trigger: 'on_hit', target: 'enemy', statusType: 'stunned', chance: 20 },
      ],
    },
    dagger: {
      id: 'dagger', name: 'Pugnale', description: 'Un pugnale veloce e letale. Può causare sanguinamento.',
      type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true,
      effects: [
        { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 6, flat: true },
        { type: 'apply_status', trigger: 'on_hit', target: 'enemy', statusType: 'bleeding', chance: 30 },
      ],
    },

    // ── Healing ──
    health_potion: {
      id: 'health_potion', name: 'Pozione di Cura', description: 'Ripristina 30 HP.',
      type: 'healing', rarity: 'common', icon: '🧪', usable: true, equippable: false,
      effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 30 }],
    },
    health_potion_large: {
      id: 'health_potion_large', name: 'Grande Pozione di Cura', description: 'Ripristina 70 HP e rimuove status negativi.',
      type: 'healing', rarity: 'uncommon', icon: '❤️‍🔥', usable: true, equippable: false,
      effects: [
        { type: 'heal', trigger: 'on_use', target: 'self', amount: 70 },
        { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding'] },
      ],
    },
    elixir: {
      id: 'elixir', name: 'Elisir', description: 'Pozione leggendaria. Cura completamente e potenzia difesa.',
      type: 'healing', rarity: 'rare', icon: '✨', usable: true, equippable: false,
      effects: [
        { type: 'heal', trigger: 'on_use', target: 'self', percent: 100 },
        { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding', 'stunned'] },
        { type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 10, flat: true },
      ],
    },
    antidote_herb: {
      id: 'antidote_herb', name: 'Erba Antidoto', description: 'Cura avvelenamento.',
      type: 'antidote', rarity: 'common', icon: '🌿', usable: true, equippable: false,
      effects: [{ type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison'] }],
    },
    mana_crystal: {
      id: 'mana_crystal', name: 'Cristallo di Mana', description: 'Ripristina energia e aumenta attacco temporaneamente.',
      type: 'healing', rarity: 'uncommon', icon: '💎', usable: true, equippable: false,
      effects: [
        { type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'atk', amount: 15, flat: true },
      ],
    },

    // ── Ammo ──
    arrow: {
      id: 'arrow', name: 'Freccia', description: 'Munizioni per arco.',
      type: 'ammo', rarity: 'common', icon: '🏹', usable: false, equippable: false,
    },
    fire_arrow: {
      id: 'fire_arrow', name: 'Freccia Infuocata', description: 'Freccia avvolta nelle fiamme.',
      type: 'ammo', rarity: 'uncommon', icon: '🔥', usable: false, equippable: false,
    },

    // ── Bags ──
    pouch: {
      id: 'pouch', name: 'Sacca da Viaggio', description: 'Aggiunge 1 slot all\'inventario.',
      type: 'bag', rarity: 'uncommon', icon: '👝', usable: true, equippable: false,
      effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 1 }],
    },
    backpack: {
      id: 'backpack', name: 'Zaino da Avventura', description: 'Aggiunge 2 slot all\'inventario.',
      type: 'bag', rarity: 'rare', icon: '🎒', usable: true, equippable: false,
      effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 2 }],
    },

    // ── Utility & Keys ──
    torch: {
      id: 'torch', name: 'Torcia', description: 'Illumina le tenebre delle dungeon.',
      type: 'utility', rarity: 'common', icon: '🔥', usable: false, equippable: false,
    },
    lockpick: {
      id: 'lockpick', name: 'Grimaldello', description: 'Apre serrature e porte chiuse.',
      type: 'utility', rarity: 'uncommon', icon: '🔑', usable: false, equippable: false,
    },
    dungeon_key: {
      id: 'dungeon_key', name: 'Chiave della Dungeon', description: 'Apre le porte della Dungeon Oscura.',
      type: 'utility', rarity: 'uncommon', icon: '🗝️', usable: false, equippable: false,
    },
    castle_key: {
      id: 'castle_key', name: 'Chiave del Castello', description: 'Apre le porte del castello.',
      type: 'utility', rarity: 'rare', icon: '🏰', usable: false, equippable: false,
    },
    ancient_amulet: {
      id: 'ancient_amulet', name: 'Amuleto Antico', description: 'Un amuleto magico che protegge chi lo indossa.',
      type: 'utility', rarity: 'rare', icon: '📿', usable: false, equippable: false,
    },
    scroll_fireball: {
      id: 'scroll_fireball', name: 'Pergamena — Palla di Fuoco', description: 'Lancia una palla di fuoco che infligge 60 danni a tutti i nemici.',
      type: 'healing', rarity: 'rare', icon: '📜', usable: true, equippable: false,
      effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', amount: 60, flat: true, ignoreDef: true, noMiss: true }],
    },
  },

  // ═══════════════════════════════════════════
  // ENEMIES
  // ═══════════════════════════════════════════
  enemies: {
    goblin: {
      id: 'goblin', name: 'Goblin', description: 'Piccolo ma furioso. Attacca in gruppo.',
      variantGroup: 'goblin', maxHp: 40, atk: 10, def: 3, spd: 8, icon: '👺', expReward: 12,
      isBoss: false,
      lootTable: [{ itemId: 'health_potion', chance: 25, quantity: 1 }, { itemId: 'arrow', chance: 30, quantity: 3 }],
      abilities: [
        { name: 'Pugnalata', description: 'Un colpo rapido con un pugnale arrugginito.', power: 1.0, chance: 60, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }] },
        { name: 'Lancio Pietra', description: 'Lancia una pietra.', power: 0.6, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.6 }] },
      ],
    },
    goblin_shaman: {
      id: 'goblin_shaman', name: 'Sciamano Goblin', description: 'Goblin che pratica magia oscura.',
      variantGroup: 'goblin', maxHp: 50, atk: 14, def: 4, spd: 7, icon: '🧙', expReward: 20,
      isBoss: false,
      lootTable: [{ itemId: 'mana_crystal', chance: 30, quantity: 1 }, { itemId: 'scroll_fireball', chance: 10, quantity: 1 }],
      abilities: [
        { name: 'Maledizione', description: 'Lancia una maledizione che avvelena.', power: 0.8, chance: 45, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.8 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 50, duration: 3 }] },
        { name: 'Palla di Fuoco', description: 'Lancia una piccola palla di fuoco.', power: 1.2, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.2 }] },
      ],
    },
    goblin_chief: {
      id: 'goblin_chief', name: 'Capo Goblin', description: 'Il capo dei goblin. Grande, forte e crudele.',
      variantGroup: 'goblin', maxHp: 80, atk: 18, def: 8, spd: 6, icon: '👹', expReward: 30,
      isBoss: false,
      lootTable: [{ itemId: 'steel_sword', chance: 10, quantity: 1 }, { itemId: 'health_potion_large', chance: 25, quantity: 1 }],
      abilities: [
        { name: 'Colpo Potente', description: 'Un colpo devastante.', power: 1.5, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 25, duration: 1 }] },
        { name: 'Urlo di Guerra', description: 'Un urlo che incute paura.', power: 0.5, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.5 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 40, duration: 1 }] },
        { name: 'Pugnalata Rapida', description: 'Colpisce con velocità.', power: 1.0, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }] },
      ],
    },
    skeleton: {
      id: 'skeleton', name: 'Scheletro', description: 'Ossa animate che brandiscono spade arrugginite.',
      variantGroup: 'skeleton', maxHp: 45, atk: 12, def: 6, spd: 5, icon: '💀', expReward: 14,
      isBoss: false,
      lootTable: [{ itemId: 'bone_shard', chance: 30, quantity: 1 }, { itemId: 'arrow', chance: 20, quantity: 2 }],
      abilities: [
        { name: 'Affondo', description: 'Un affondo con la spada.', power: 1.1, chance: 55, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.1 }] },
        { name: 'Lancio Osso', description: 'Lancia un osso affilato.', power: 0.7, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.7 }] },
      ],
    },
    skeleton_archer: {
      id: 'skeleton_archer', name: 'Scheletro Arcere', description: 'Scheletro armato di arco.',
      variantGroup: 'skeleton', maxHp: 35, atk: 14, def: 3, spd: 9, icon: '🏹', expReward: 18,
      isBoss: false,
      lootTable: [{ itemId: 'arrow', chance: 50, quantity: 5 }, { itemId: 'health_potion', chance: 15, quantity: 1 }],
      abilities: [
        { name: 'Freccia Velenosa', description: 'Spara una freccia avvelenata.', power: 1.0, chance: 50, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 30, duration: 3 }] },
        { name: 'Tiro Triplo', description: 'Spara tre frecce rapide.', power: 0.6, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.6 }] },
      ],
    },
    wolf: {
      id: 'wolf', name: 'Lupo', description: 'Un lupo selvaggio. Veloce e aggressivo.',
      variantGroup: 'wolf', maxHp: 35, atk: 14, def: 3, spd: 12, icon: '🐺', expReward: 16,
      isBoss: false,
      lootTable: [{ itemId: 'health_potion', chance: 20, quantity: 1 }],
      abilities: [
        { name: 'Morso', description: 'Un morso profondo.', power: 1.1, chance: 55, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.1 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 25, duration: 3 }] },
        { name: 'Ringhio', description: 'Un ringhio terrificante.', power: 0.3, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.3 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 30, duration: 1 }] },
      ],
    },
    dire_wolf: {
      id: 'dire_wolf', name: 'Lupo Gigante', description: 'Un lupo enorme con zanne affilate come spade.',
      variantGroup: 'wolf', maxHp: 65, atk: 20, def: 5, spd: 10, icon: '🐕', expReward: 28,
      isBoss: false,
      lootTable: [{ itemId: 'health_potion_large', chance: 20, quantity: 1 }, { itemId: 'arrow', chance: 25, quantity: 5 }],
      abilities: [
        { name: 'Zannata', description: 'Azzanna con forza.', power: 1.5, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 40, duration: 3 }] },
        { name: 'Carica', description: 'Una carica impossibile da fermare.', power: 1.8, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.8, noMiss: true }] },
      ],
    },
    dark_mage: {
      id: 'dark_mage', name: 'Mago Oscuro', description: 'Un mago corrotto dalle forze oscure.',
      variantGroup: 'dark_mage', maxHp: 70, atk: 22, def: 5, spd: 8, icon: '🧙‍♂️', expReward: 35,
      isBoss: false,
      lootTable: [{ itemId: 'scroll_fireball', chance: 20, quantity: 1 }, { itemId: 'mana_crystal', chance: 35, quantity: 1 }],
      abilities: [
        { name: 'Raggio Oscuro', description: 'Un raggio di energia nera.', power: 1.3, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.3 }] },
        { name: 'Maledizione', description: 'Maledice il bersaglio.', power: 0.7, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.7 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 60, duration: 3 }] },
        { name: 'Barriera', description: 'Si protegge e si cura.', power: 0, chance: 15, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 20 }] },
      ],
    },
    troll: {
      id: 'troll', name: 'Troll', description: 'Una bestia enorme con una rigenerazione impressionante.',
      variantGroup: 'troll', maxHp: 150, atk: 22, def: 12, spd: 4, icon: '🧌', expReward: 45,
      isBoss: false,
      lootTable: [{ itemId: 'health_potion_large', chance: 40, quantity: 1 }, { itemId: 'war_hammer', chance: 8, quantity: 1 }],
      abilities: [
        { name: 'Martellata', description: 'Colpisce con forza immensa.', power: 1.8, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.8 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 30, duration: 1 }] },
        { name: 'Rigenerazione', description: 'Rigenera ferite.', power: 0, chance: 20, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 30 }] },
        { name: 'Artigliata', description: 'Artigli devastanti.', power: 1.2, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.2 }] },
      ],
    },
    stone_golem: {
      id: 'stone_golem', name: 'Golem di Pietra', description: 'Un costrutto di pietra animato da magia antica.',
      variantGroup: 'golem', maxHp: 180, atk: 25, def: 20, spd: 3, icon: '🗿', expReward: 50,
      isBoss: false,
      lootTable: [{ itemId: 'ancient_amulet', chance: 10, quantity: 1 }, { itemId: 'mana_crystal', chance: 30, quantity: 2 }],
      abilities: [
        { name: 'Pugno di Pietra', description: 'Un pugno devastante.', power: 2.0, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.0 }] },
        { name: 'Scudo di Pietra', description: 'Indurisce la sua armatura.', power: 0, chance: 20, effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 50, duration: 2 }] },
        { name: 'Terremoto', description: 'Fa tremare il terreno.', power: 1.5, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 1.5 }] },
      ],
    },
    dragon_whelp: {
      id: 'dragon_whelp', name: 'Draco', description: 'Un giovane drago. Pericoloso ma non ancora adulto.',
      variantGroup: 'dragon', maxHp: 100, atk: 20, def: 10, spd: 9, icon: '🐉', expReward: 40,
      isBoss: false,
      lootTable: [{ itemId: 'fire_staff', chance: 10, quantity: 1 }, { itemId: 'mana_crystal', chance: 30, quantity: 1 }],
      abilities: [
        { name: 'Soffio di Fuoco', description: 'Sputa fuoco.', power: 1.4, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.4 }] },
        { name: 'Artigliata', description: 'Artigli di drago.', power: 1.1, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.1 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 35, duration: 3 }] },
        { name: 'Coda', description: 'Colpisce con la coda.', power: 1.2, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.2 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 30, duration: 1 }] },
      ],
    },
    demon_lord: {
      id: 'demon_lord', name: 'Signore Demoniaco', description: 'Un demone potentissimo che ha corrotto queste terre.',
      variantGroup: 'demon', maxHp: 400, atk: 32, def: 16, spd: 8, icon: '😈', expReward: 200,
      isBoss: true,
      lootTable: [{ itemId: 'legendary_blade', chance: 30, quantity: 1 }, { itemId: 'elixir', chance: 80, quantity: 2 }],
      abilities: [
        { name: 'Lama dell\'Ombra', description: 'Un colpo oscuro devastante.', power: 2.0, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.0 }] },
        { name: 'Piaga Demoniaca', description: 'Rilascia energia oscura su tutti.', power: 1.5, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 1.5 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'poison', chance: 50, duration: 3 }] },
        { name: 'Ruggito', description: 'Un ruggito infernale.', power: 0.6, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 0.6 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'stunned', chance: 40, duration: 1 }] },
        { name: 'Assorbimento', description: 'Assorbe energia vitale.', power: 1.5, chance: 15, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }, { type: 'heal', trigger: 'on_use', target: 'self', amount: 40 }] },
        { name: 'Sterminio', description: 'Attacco devastante su tutti.', power: 2.5, chance: 10, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 2.5 }] },
      ],
    },
    ancient_dragon: {
      id: 'ancient_dragon', name: 'Drago Antico', description: 'Il drago più antico e potente del regno. Il boss finale.',
      variantGroup: 'dragon', maxHp: 500, atk: 35, def: 18, spd: 7, icon: '🐲', expReward: 300,
      isBoss: true,
      lootTable: [{ itemId: 'legendary_blade', chance: 50, quantity: 1 }, { itemId: 'elixir', chance: 100, quantity: 3 }, { itemId: 'ancient_amulet', chance: 80, quantity: 1 }],
      abilities: [
        { name: 'Inferno', description: 'Rilascia un mare di fuoco.', power: 2.0, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 2.0 }] },
        { name: 'Zanna del Drago', description: 'Azzanna con zanne giganti.', power: 2.2, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.2 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 50, duration: 4 }] },
        { name: 'Tempesta di Ali', description: 'Crea una tempesta con le ali.', power: 1.5, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 1.5 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'stunned', chance: 40, duration: 1 }] },
        { name: 'Rigenerazione Draconica', description: 'Si rigenera lentamente.', power: 0, chance: 10, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 50 }] },
        { name: 'Apocalisse', description: 'Il colpo più devastante.', power: 3.0, chance: 8, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 3.0 }] },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════
  locations: {
    enchanted_forest: {
      id: 'enchanted_forest', name: 'Foresta Incantata', description: 'Un bosco antico dove gli alberi sembrano sussurrare. La nebbia avvolge ogni sentiero.',
      encounterRate: 35, enemyPool: ['goblin', 'wolf', 'goblin_shaman', 'wolf'],
      itemPool: [{ itemId: 'health_potion', chance: 40, quantity: 1 }, { itemId: 'arrow', chance: 30, quantity: 3 }, { itemId: 'torch', chance: 20, quantity: 1 }, { itemId: 'dungeon_key', chance: 10, quantity: 1 }],
      isBossArea: false, shortName: 'Foresta', mapRow: 0, mapCol: 0, mapIcon: '🌲', mapDanger: 0,
      lockedLocations: [
        { locationId: 'dark_dungeon', requiredItemId: 'dungeon_key', lockedMessage: '🔒 La porta della dungeon è sigillata. Serve una chiave.' },
      ],
      ambientText: ['Gli alberi sussurrano nell\'ombra...', 'Un ululato lontano rompe il silenzio.', 'Funghi luminosi illuminano il sentiero.', 'Una brezza fredda porta un odore di decomposizione.'],
      subAreas: [{ id: 'safe_room', name: 'Rifugio del Cacciatore', description: 'Una capanna abbandonata con un focolare acceso.' }],
      storyEvent: {
        title: 'Il Mercante Misterioso', description: 'Trovate un mercante seduto accanto a un fuoco. Vi fa cenno di avvicinarvi.',
        choices: [
          { text: 'Parlare con il mercante', outcome: { description: 'Il mercante vi offre pozioni a buon prezzo e vi dà informazioni sulla dungeon.', receiveItems: [{ itemId: 'health_potion', quantity: 2 }] } },
          { text: 'Ignorarlo e proseguire', outcome: { description: 'Proseguite nel bosco. Trovate delle frecce abbandonate.', receiveItems: [{ itemId: 'arrow', quantity: 3 }] } },
        ],
      },
    },
    village_square: {
      id: 'village_square', name: 'Piazza del Villaggio', description: 'Un villaggio pacifico... o almeno lo era. Ora le case sono vuote e i cittadini sono fuggiti.',
      encounterRate: 20, enemyPool: ['goblin', 'goblin', 'skeleton'],
      itemPool: [{ itemId: 'health_potion', chance: 45, quantity: 1 }, { itemId: 'arrow', chance: 25, quantity: 3 }, { itemId: 'pouch', chance: 15, quantity: 1 }, { itemId: 'lockpick', chance: 12, quantity: 1 }],
      isBossArea: false, shortName: 'Villaggio', mapRow: 0, mapCol: 1, mapIcon: '🏘️', mapDanger: 0,
      ambientText: ['Le case sono vuote e silenziose...', 'Un cartello: "ATTENZIONE: non uscite di notte."', 'Il pozzo del villaggio è asciutto.'], subAreas: [],
      storyEvent: {
        title: 'Il Sindaco Disperato', description: 'Il sindaco vi ferma. I goblin attaccano ogni notte e chiedono aiuto.',
        choices: [
          { text: 'Offrire aiuto', outcome: { description: 'Il sindaco vi ricompensa con equipaggiamento.', receiveItems: [{ itemId: 'steel_sword', quantity: 1 }, { itemId: 'health_potion', quantity: 2 }] } },
          { text: 'Rifiutare educatamente', outcome: { description: 'Il sindaco annuisce tristemente. Trovate una pozione abbandonata.', receiveItems: [{ itemId: 'health_potion', quantity: 1 }], hpChange: -5 } },
        ],
      },
    },
    mountain_pass: {
      id: 'mountain_pass', name: 'Passo Montano', description: 'Un sentiero ripido tra le montagne. Il vento ulula e i lupi pattugliano la zona.',
      encounterRate: 45, enemyPool: ['wolf', 'dire_wolf', 'wolf', 'goblin_chief'],
      itemPool: [{ itemId: 'health_potion', chance: 30, quantity: 1 }, { itemId: 'arrow', chance: 25, quantity: 5 }, { itemId: 'mana_crystal', chance: 15, quantity: 1 }],
      isBossArea: false, shortName: 'Montagne', mapRow: 1, mapCol: 0, mapIcon: '⛰️', mapDanger: 1,
      lockedLocations: [],
      ambientText: ['Il vento ulula tra le rocce...', 'Impronte enormi nel fango.', 'Una valigia abbandonata sul sentiero.'], subAreas: [],
      storyEvent: {
        title: 'La Frana', description: 'Un masso blocca il sentiero. Dovete trovare una via alternativa.',
        choices: [
          { text: 'Scalare la roccia', outcome: { description: 'Con fatica scalate oltre la frana. Trovate munizioni nascoste.', receiveItems: [{ itemId: 'fire_arrow', quantity: 5 }] } },
          { text: 'Tornare indietro', outcome: { description: 'Trovate un\'altra via più lunga ma più sicura.', hpChange: -5 } },
        ],
      },
      docChance: 35, searchChance: 50,
    },
    dark_dungeon: {
      id: 'dark_dungeon', name: 'Dungeon Oscura', description: 'Un\'antica prigione sotterranea. Le mura stillano umidità e i rumori sono inquietanti.',
      encounterRate: 50, enemyPool: ['skeleton', 'skeleton_archer', 'dark_mage', 'skeleton', 'goblin_shaman'],
      itemPool: [{ itemId: 'health_potion', chance: 35, quantity: 1 }, { itemId: 'mana_crystal', chance: 20, quantity: 1 }, { itemId: 'scroll_fireball', chance: 10, quantity: 1 }, { itemId: 'dungeon_key', chance: 8, quantity: 1 }],
      isBossArea: false, shortName: 'Dungeon', mapRow: 2, mapCol: 0, mapIcon: '🏚️', mapDanger: 2,
      lockedLocations: [
        { locationId: 'castle_throne', requiredItemId: 'castle_key', lockedMessage: '🔒 La porta del castello è sigillata. Serve la chiave del castello.' },
      ],
      ambientText: ['Gocce d\'acqua cadono nel buio...', 'Catene dondolano dal soffitto.', 'Un gemito proveniente dalle profondità.'], subAreas: [],
      storyEvent: {
        title: 'Il Prigioniero', description: 'Trovate una cella con un prigioniero morente. Vi prega di liberarlo.',
        choices: [
          { text: 'Liberarlo', outcome: { description: 'Il prigioniero vi rivela la posizione di un tesoro nascosto.', receiveItems: [{ itemId: 'castle_key', quantity: 1 }, { itemId: 'elixir', quantity: 1 }] } },
          { text: 'Ignorarlo', outcome: { description: 'Proseguite. Sentite le sue urla alle vostre spalle...', hpChange: -10 } },
        ],
      },
      docChance: 40, searchChance: 55,
    },
    crystal_cave: {
      id: 'crystal_cave', name: 'Grotta di Cristallo', description: 'Una grotta illuminata da cristalli luminosi. La magia è palpabile nell\'aria.',
      encounterRate: 40, enemyPool: ['stone_golem', 'dark_mage', 'dragon_whelp'],
      itemPool: [{ itemId: 'mana_crystal', chance: 40, quantity: 1 }, { itemId: 'elixir', chance: 10, quantity: 1 }, { itemId: 'fire_staff', chance: 8, quantity: 1 }],
      isBossArea: false, shortName: 'Grotta', mapRow: 2, mapCol: 1, mapIcon: '💎', mapDanger: 2,
      lockedLocations: [],
      ambientText: ['I cristalli pulsano di luce azzurra...', 'L\'eco dei vostri passi si moltiplica.', 'Un ronzio magico riempie l\'aria.'],
      subAreas: [{ id: 'safe_room', name: 'Santuario', description: 'Un piccolo santuario antico. L\'aria è pura e curativa.' }],
      storyEvent: {
        title: 'L\'Altare Magico', description: 'Trovate un altare circondato da cristalli. Un potere dormiente attende di essere risvegliato.',
        choices: [
          { text: 'Toccare i cristalli', outcome: { description: 'L\'energia scorre in voi. Siete più forti!', receiveItems: [{ itemId: 'mana_crystal', quantity: 3 }], hpChange: 10 } },
          { text: 'Lasciarli stare', outcome: { description: 'Vi allontanate con cautela. Trovate una pozione abbandonata.', receiveItems: [{ itemId: 'health_potion_large', quantity: 1 }] } },
        ],
      },
      docChance: 45, searchChance: 60,
    },
    abandoned_temple: {
      id: 'abandoned_temple', name: 'Tempio Abbandonato', description: 'Le rovine di un antico tempio. Le statue degli dei sono ancora in piedi.',
      encounterRate: 45, enemyPool: ['skeleton_archer', 'dark_mage', 'stone_golem', 'troll'],
      itemPool: [{ itemId: 'health_potion_large', chance: 30, quantity: 1 }, { itemId: 'scroll_fireball', chance: 15, quantity: 1 }, { itemId: 'ancient_amulet', chance: 8, quantity: 1 }],
      isBossArea: false, shortName: 'Tempio', mapRow: 1, mapCol: 1, mapIcon: '🏛️', mapDanger: 2,
      lockedLocations: [],
      ambientText: ['Le statue sembrano osservarvi...', 'Un coro di voci sommesse risuona nel tempio.', 'Iscrizioni antiche coprono le pareti.'],
      subAreas: [],
      storyEvent: {
        title: 'La Maledizione del Tempio', description: 'Il tempio è maledetto. Un\'energia oscura pulsa dal santuario interno.',
        choices: [
          { text: 'Entrare nel santuario', outcome: { description: 'Affrontate un golem di pietra!', triggerCombat: true, combatEnemyIds: ['stone_golem'] } },
          { text: 'Purificare il tempio', outcome: { description: 'Usate un cristallo per purificare il tempio. Trovate un amuleto antico.', receiveItems: [{ itemId: 'ancient_amulet', quantity: 1 }] } },
        ],
      },
      docChance: 40, searchChance: 50,
    },
    castle_throne: {
      id: 'castle_throne', name: 'Sala del Trono', description: 'La sala del trono del castello corrotto. Il Signore Demoniaco vi attende.',
      encounterRate: 0, enemyPool: ['demon_lord'],
      itemPool: [],
      isBossArea: true, bossId: 'demon_lord', shortName: 'Boss: Demone', mapRow: 3, mapCol: 0, mapIcon: '🏰', mapDanger: 3,
      ambientText: ['L\'aria è densa di energia oscura...', 'I torches bruciano di fuoco verde.', 'Un trono di ossa svetta al centro della sala.'],
      subAreas: [],
    },
    dragon_lair: {
      id: 'dragon_lair', name: 'Tana del Drago', description: 'La tana del Drago Antico. Oro e tesoriri brillano tra le rocce.',
      encounterRate: 0, enemyPool: ['ancient_dragon'],
      itemPool: [],
      isBossArea: true, bossId: 'ancient_dragon', shortName: 'Boss: Drago', mapRow: 3, mapCol: 1, mapIcon: '🐉', mapDanger: 3,
      ambientText: ['Il calore è soffocante...', 'Montagne d\'oro brillano nella luce del drago.', 'Le ossa di avventurieri passati coprono il suolo.'],
      subAreas: [],
    },
  },

  // ═══════════════════════════════════════════
  // NPCs
  // ═══════════════════════════════════════════
  npcs: {
    npc_blacksmith: {
      id: 'npc_blacksmith', name: 'Grum il Fabbro', portrait: '⚒️',
      greeting: 'Benvenuto nella mia forgia! Se hai bisogno di armi o armature, sei nel posto giusto.',
      dialogues: ['Le mie lame sono le migliori del regno. Forgiate nel fuoco del drago.', 'Ho sentito che un drago si è svegliato nelle montagne a est. Attento là fuori.'],
      farewell: 'Torna quando hai bisogno di riparazioni!',
      quest: { id: 'quest_blacksmith_ore', name: 'Minerale Raro', description: 'Grum ha bisogno di 3 cristalli di mana per forgiare un\'arma leggendaria.', type: 'fetch', targetId: 'mana_crystal', targetCount: 3, rewardItems: [{ itemId: 'steel_sword', quantity: 1 }], rewardExp: 40, rewardDialogue: ['Eccellente! Con questi cristalli posso forgiare qualcosa di speciale. Prendi questa spada!'] },
      tradeInventory: [{ itemId: 'arrow', quantity: 5, priceItemId: 'health_potion', priceQuantity: 2 }],
      questCompletedDialogue: ['Grazie per i cristalli!'],
      badgeLabel: 'Fabbro', badgeIcon: '⚒️', badgeColor: 'bg-orange-900/40 text-orange-300 border-orange-700/30',
    },
    npc_healer: {
      id: 'npc_healer', name: 'Suor Elena', portrait: ' свеч',
      greeting: 'Pace a te, viaggiatore. Sei ferito? Lascia che ti curi.',
      dialogues: ['Il tempio nelle montagne è corrotto. Qualcosa di oscuro si nasconde là dentro.', 'Le pozioni curative sono limitate. Usa le erbe con saggezza.'],
      farewell: 'Che la luce ti protegga, viaggiatore.',
      quest: { id: 'quest_healer_herbs', name: 'Erbe Medicinali', description: 'Suor Elena ha bisogno di 2 pozioni di cura per i malati del villaggio.', type: 'fetch', targetId: 'health_potion', targetCount: 2, rewardItems: [{ itemId: 'health_potion_large', quantity: 1 }], rewardExp: 25, rewardDialogue: ['Grazie! Queste pozioni salveranno molte vite. Prendi questa pozione forte come ricompensa.'] },
      tradeInventory: [{ itemId: 'health_potion', quantity: 2, priceItemId: 'arrow', priceQuantity: 5 }],
      questCompletedDialogue: ['Che la dea ti benedica.'],
      badgeLabel: 'Guaritrice', badgeIcon: '✨', badgeColor: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
    },
    npc_wizard: {
      id: 'npc_wizard', name: 'Archimago Theron', portrait: '🧙',
      greeting: 'Ah, un avventuriero! Ti interessa la magia antica? Ho pergamene e cristalli...',
      dialogues: ['Il Signore Demoniaco ha corrotto il cristallo che manteneva l\'equilibrio magico. Senza di esso, la magia oscura si diffonde.', 'Le pergamene di fuoco sono rare. Te ne vendo una, ma usala con cautela.'],
      farewell: 'Ricorda: la conoscenza è più potente di qualsiasi spada.',
      quest: { id: 'quest_wizard_scroll', name: 'Pergamena Perduta', description: 'Theron ha perso una pergamena nella dungeon oscura. Recuperala.', type: 'explore', targetId: 'dark_dungeon', targetCount: 1, rewardItems: [{ itemId: 'scroll_fireball', quantity: 2 }, { itemId: 'mana_crystal', quantity: 2 }], rewardExp: 50, rewardDialogue: ['Hai trovato la pergamena! Ecco la tua ricompensa. E prendi anche questi cristalli.'] },
      tradeInventory: [{ itemId: 'scroll_fireball', quantity: 1, priceItemId: 'mana_crystal', priceQuantity: 2 }],
      questCompletedDialogue: ['Grazie, giovane apprendista.'],
      badgeLabel: 'Mago', badgeIcon: '🧙', badgeColor: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    },
    npc_innkeeper: {
      id: 'npc_innkeeper', name: 'Borna la Locandiera', portrait: '🍺',
      greeting: 'Benvenuto alla Locanda del Cervo Bianco! Cibo caldo e letti morbidi!',
      dialogues: ['I goblin attaccano il villaggio ogni notte. Il sindaco non sa cosa fare.', 'Ho sentito che c\'è un passaggio segreto sotto la dungeon che porta al castello.'],
      farewell: 'Riposati bene. Domani sarà una lunga giornata.',
      quest: { id: 'quest_inn_goblins', name: 'Goblin nel Villaggio', description: 'Borna vuole che tu elimini 3 goblin che infestano le strade del villaggio.', type: 'kill', targetId: 'goblin', targetCount: 3, rewardItems: [{ itemId: 'health_potion', quantity: 3 }], rewardExp: 30, rewardDialogue: ['Finalmente il villaggio è tranquillo! Ecco le pozioni che avevo messo da parte per te.'] },
      tradeInventory: [{ itemId: 'health_potion', quantity: 1, priceItemId: 'arrow', priceQuantity: 4 }],
      questCompletedDialogue: ['Grazie! Ora posso dormire tranquilla.'],
      badgeLabel: 'Locandiera', badgeIcon: '🍺', badgeColor: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
    },
    npc_stranger: {
      id: 'npc_stranger', name: 'Lo Straniero', portrait: '🥷',
      greeting: '...Tu non dovresti essere qui. Ma visto che ci sei... posso aiutarti.',
      dialogues: ['Il demone nel castello non è il vero pericolo. Il drago nelle montagne è stato risvegliato dalla corruzione demoniaca.', 'Ho una mappa che mostra un passaggio segreto dalla grotta di cristallo alla tana del drago.'],
      farewell: 'Stai attento. Non tutti quelli che incontri in questo viaggio hanno buone intenzioni.',
      quest: { id: 'quest_stranger_troll', name: 'Il Troll del Passo', description: 'Lo Straniero chiede di sconfiggere il troll che blocca il passo montano.', type: 'kill', targetId: 'troll', targetCount: 1, rewardItems: [{ itemId: 'backpack', quantity: 1 }], rewardExp: 60, rewardDialogue: ['Il troll è stato sconfitto. Ora il passo è libero. Prendi questo zaino — ti servirà per il viaggio. E tieni questo amuleto. Ti proteggerà dal male.'] },
      tradeInventory: [{ itemId: 'elixir', quantity: 1, priceItemId: 'mana_crystal', priceQuantity: 3 }],
      questCompletedDialogue: ['Buona fortuna, avventuriero. Ci rivedremo.'],
      badgeLabel: 'Mistero', badgeIcon: '❓', badgeColor: 'bg-slate-900/40 text-slate-300 border-slate-700/30',
    },
    npc_ranger: {
      id: 'npc_ranger', name: 'Kael il Guardaboschi', portrait: '🏹',
      greeting: 'Salve, viaggiatore. La foresta è pericolosa di questi tempi.',
      dialogues: ['I lupi sono sempre più aggressivi. Qualcosa li sta spingendo fuori dalle loro tane.', 'Ho sentito che nella grotta di cristallo ci sono minerali magici molto preziosi.'],
      farewell: 'Che la fortuna ti accompagni.',
      quest: { id: 'quest_ranger_wolves', name: 'Lupo Gigante', description: 'Kael vuole che tu sconfigga il lupo gigante che terrorizza il bosco.', type: 'kill', targetId: 'dire_wolf', targetCount: 1, rewardItems: [{ itemId: 'wooden_bow', quantity: 1 }, { itemId: 'fire_arrow', quantity: 10 }], rewardExp: 45, rewardDialogue: ['Il lupo gigante è stato abbattuto! Ecco il mio arco migliore e delle frecce infuocate. Sei un vero cacciatore.'] },
      tradeInventory: [{ itemId: 'fire_arrow', quantity: 3, priceItemId: 'arrow', priceQuantity: 6 }],
      questCompletedDialogue: ['Grazie, amico. La foresta è più sicura ora.'],
      badgeLabel: 'Guardaboschi', badgeIcon: '🏹', badgeColor: 'bg-green-900/40 text-green-300 border-green-700/30',
    },
  },

  // ═══════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════
  documents: {
    doc_forest_map: { id: 'doc_forest_map', title: 'Mappa della Foresta', content: 'La mappa mostra un sentiero attraverso la foresta che porta a una grotta nascosta. Le annotazioni indicano "pericolo: golem" e "cristalli preziosi nella grotta di cristallo".', type: 'note', locationId: 'enchanted_forest', icon: '🗺️', rarity: 'common', isSecret: false },
    doc_village_notice: { id: 'doc_village_notice', title: 'Bando del Sindaco', content: 'AVVISO: I goblin attaccano ogni notte. Tutti i cittadini devono restare in casa dopo il tramonto. Le guardie pattuglieranno le strade. Chiunque trovi informazioni sulla loro tana nella foresta sarà ricompensato.', type: 'note', locationId: 'village_square', icon: '📋', rarity: 'common', isSecret: false },
    doc_mage_journal: { id: 'doc_mage_journal', title: 'Diario dell\'Archimago', content: 'Giorno 1: La corruzione si diffonde. Il Signore Demoniaco ha preso il controllo del cristallo d\'equilibrio. Giorno 5: Il drago si è svegliato. Non è colpa sua — la corruzione demoniaca lo ha spinto alla furia. Giorno 10: Se qualcuno trovasse questo diario, sappia che solo distruggendo il demone si può salvare il regno.', type: 'diary', locationId: 'crystal_cave', icon: '📔', rarity: 'rare', isSecret: false },
    doc_dungeon_prisoner: { id: 'doc_dungeon_prisoner', title: 'Messaggio del Prigioniero', content: 'Chi trova questo messaggio, vi prego di liberarmi! Sono stato imprigionato dal Signore Demoniaco. Ho la chiave del castello nascosta nella mia cella. Distruggete il demone e salvate il regno. La via per la tana del drago è attraverso la grotta di cristallo — cercate il cristallo d\'equilibrio.', type: 'note', locationId: 'dark_dungeon', icon: '📝', rarity: 'uncommon', isSecret: false },
    doc_temple_inscription: { id: 'doc_temple_inscription', title: 'Iscrizione del Tempio', content: 'GLI DII DELLA LUCE HANNO ERETTO QUESTO TEMPIO COME BARRIERA CONTRO LE FORZE OSCURE. IL CRISTALLO D\'EQUILIBRIO È LA CHIAVE. QUANDO LA LUCE SI SPEGNE, LE TENEBRE PREVARRANNO. LA PURIFICAZIONE RICHIEDE UN AMULETO ANTICO E UN CUORE PURO.', type: 'report', locationId: 'abandoned_temple', icon: '📜', rarity: 'rare', isSecret: false },
    doc_dragon_lore: { id: 'doc_dragon_lore', title: 'Cronache del Drago', content: 'Il Drago Antico è il custode delle montagne da millenni. Non è malvagio per natura — la corruzione demoniaca lo ha spinto alla furia. Per calmarlo, bisogna prima distruggere la fonte della corruzione: il Signore Demoniaco nel castello. Solo allora il drago tornerà a dormire.', type: 'diary', locationId: 'mountain_pass', icon: '📕', rarity: 'rare', isSecret: true, hintRequired: 'doc_mage_journal' },
    doc_secret_passage: { id: 'doc_secret_passage', title: 'Passaggio Segreto', content: 'Dietro la statua del cavaliere nel tempio c\'è un passaggio che conduce alla grotta di cristallo. La leva nascosta si trova sotto il basamento. ATTENZIONE: il passaggio è sorvegliato da un golem di pietra.', type: 'note', locationId: 'abandoned_temple', icon: '🗝️', rarity: 'uncommon', isSecret: true, hintRequired: 'doc_temple_inscription' },
    doc_blacksmith_note: { id: 'doc_blacksmith_note', title: 'Nota del Fabbro', content: 'Ho scoperto un modo per forgiare armi magiche usando cristalli di mana. Il processo è pericoloso, ma il risultato è una lama che brilla di luce propria. Serve: 3 cristalli di mana + 1 lingotto d\'acciaio + il fuoco di una fornace magica.', type: 'note', locationId: 'village_square', icon: '📝', rarity: 'common', isSecret: false },
    doc_villager_diary: { id: 'doc_villager_diary', title: 'Diario di un Contadino', content: '14 marzo: I goblin sono apparsi nel bosco. 18 marzo: Attaccano il villaggio ogni notte. 25 marzo: Il fabbro dice che ha visto un drago volare sopra le montagne. Stiamo tutti morendo di paura. Qualcuno deve fare qualcosa.', type: 'diary', locationId: 'village_square', icon: '📔', rarity: 'common', isSecret: false },
    doc_ranger_report: { id: 'doc_ranger_report', title: 'Report del Guardaboschi', content: 'REPORT — Patrol 47. Il numero di lupi nel bosco è triplicato. Ho avvistato un lupo gigante — dire_wolf — vicino al passo montano. Le grotte a est mostrano segni di attività di golem. Raccomando di inviare un gruppo di avventurieri esperti.', type: 'report', locationId: 'enchanted_forest', icon: '📋', rarity: 'uncommon', isSecret: false },
    doc_healer_recipe: { id: 'doc_healer_recipe', title: 'Ricetta Guaritrice', content: 'POZIONE ELIXIR: 1 Grande Pozione + 1 Cristallo di Mana + 1 Erba Antidoto = Elisir Leggendario. Cura completa, rimuove tutti i mali e potenzia la difesa. ATTENZIONE: La ricetta è segreta della confraternita guaritrice.', type: 'note', locationId: 'crystal_cave', icon: '🧪', rarity: 'rare', isSecret: true, hintRequired: 'doc_mage_journal' },
    doc_demon_summon: { id: 'doc_demon_summon', title: 'Rito di Evocazione', content: 'RITO PROIBITO — Evocazione del Signore Demoniaco. Ingredienti: sangue di innocente + ossa di drago + cristallo corrotto. La cerimonia deve avvenire nella sala del trono del castello durante l\'eclissi. Una volta evocato, il demone non può essere fermato senza distruggere il cristallo d\'equilibrio.', type: 'report', locationId: 'dark_dungeon', icon: '📕', rarity: 'legendary', isSecret: true, hintRequired: 'doc_temple_inscription' },
  },

  // ═══════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════
  events: {
    event_storm: {
      id: 'event_storm', title: 'Tempesta Magica', description: 'Una tempesta di energia magica si abbatte sulla zona.',
      icon: '⛈️', type: 'storm', duration: 2,
      effect: { encounterRateMod: 15, enemyStatMult: 1.1, searchBonus: true, damagePerTurn: 3 },
      triggerChance: 8, minTurn: 5, locationIds: [],
      onTriggerMessage: '⛈️ Una tempesta magica si abbatte! I fulmini arcuano nel cielo!',
      onEndMessage: '⛈️ La tempesta si placa. L\'aria è carica di magia residua.',
      choices: [
        { text: 'Cercare riparo', outcome: { description: 'Vi riparate sotto un albero. Trovate un cristallo di mana.', endEvent: true, receiveItems: [{ itemId: 'mana_crystal', quantity: 1 }] } },
        { text: 'Resistere', outcome: { description: 'Restate esposti. I fulmini vi sfiorano.', endEvent: true, hpChange: -8 } },
      ],
    },
    event_goblin_raid: {
      id: 'event_goblin_raid', title: 'Incursione Goblin', description: 'I goblin attaccano in massa!',
      icon: '👺', type: 'raid', duration: 2,
      effect: { encounterRateMod: 30, enemyStatMult: 0.9, searchBonus: false, damagePerTurn: 0 },
      triggerChance: 7, minTurn: 6, locationIds: [],
      onTriggerMessage: '👺 Un urlo di guerra! I goblin attaccano in massa!',
      onEndMessage: '👺 L\'incursione è respinta. I goblin sopravvissuti fuggono.',
      choices: [
        { text: 'Difendere la posizione', outcome: { description: 'Combattete valorosamente e respingete l\'attacco.', endEvent: true } },
        { text: 'Fuggire', outcome: { description: 'Scappate e trovate un riparo sicuro. Perdete qualche risorsa.', endEvent: true, hpChange: -5 } },
      ],
    },
    event_eclipse: {
      id: 'event_eclipse', title: 'Eclissi', description: 'Il sole si oscura. Un\'eclissi innaturale avvolge la terra.',
      icon: '🌑', type: 'eclipse', duration: 3,
      effect: { encounterRateMod: 20, enemyStatMult: 1.2, searchBonus: false, damagePerTurn: 2 },
      triggerChance: 5, minTurn: 12, locationIds: [],
      onTriggerMessage: '🌑 Un\'eclissi oscura il cielo! I mostri diventano più forti!',
      onEndMessage: '🌑 Il sole torna a brillare. L\'oscurità si ritira.',
      choices: [
        { text: 'Cercare copertura', outcome: { description: 'Vi nascondete in una grotta. Trovate pozioni abbandonate.', endEvent: true, receiveItems: [{ itemId: 'health_potion', quantity: 2 }] } },
        { text: 'Continuare a viaggiare', outcome: { description: 'Vi muovete nel buio. Siete più vulnerabili.', endEvent: true, hpChange: -10 } },
      ],
      chainId: 'eclipse_chain', nextEventId: 'event_dark_surge',
    },
    event_dark_surge: {
      id: 'event_dark_surge', title: 'Ondata Oscura', description: 'L\'energia oscura si intensifica dopo l\'eclissi.',
      icon: '💀', type: 'eclipse', duration: 2,
      effect: { encounterRateMod: 25, enemyStatMult: 1.3, searchBonus: false, damagePerTurn: 5 },
      triggerChance: 0, minTurn: 15, locationIds: [],
      onTriggerMessage: '💀 L\'energia oscura esplode! I mostri si scatenano!',
      onEndMessage: '💀 L\'energia oscura si placa gradualmente.',
      choices: [
        { text: 'Usare un cristallo di mana', outcome: { description: 'Il cristallo assorbe l\'energia oscura.', endEvent: true, hpChange: -5 } },
        { text: 'Resistere con la forza di volontà', outcome: { description: 'Resistete all\'onda oscura. Siete esausti.', endEvent: true, hpChange: -15 } },
      ],
    },
    event_festival: {
      id: 'event_festival', title: 'Festa del Villaggio', description: 'Gli abitanti organizzano una festa per ringraziare gli avventurieri.',
      icon: '🎉', type: 'festival', duration: 2,
      effect: { encounterRateMod: -10, enemyStatMult: 0.9, searchBonus: true, damagePerTurn: 0 },
      triggerChance: 5, minTurn: 8, locationIds: [],
      onTriggerMessage: '🎉 Una festa del villaggio! Cibo, musica e pozioni gratuite!',
      onEndMessage: '🎉 La festa finisce. Gli abitanti tornano alle loro case.',
      choices: [
        { text: 'Partecipare alla festa', outcome: { description: 'Vi godete la festa e ricevete doni.', endEvent: true, receiveItems: [{ itemId: 'health_potion_large', quantity: 1 }, { itemId: 'mana_crystal', quantity: 1 }] } },
        { text: 'Continuare l\'esplorazione', outcome: { description: 'Siete tentati dalla festa ma proseguite.', endEvent: true } },
      ],
    },
    event_plague: {
      id: 'event_plague', title: 'Pestilenza', description: 'Una malattia misteriosa si diffonde nell\'aria.',
      icon: '☠️', type: 'plague', duration: 2,
      effect: { encounterRateMod: 5, enemyStatMult: 1.0, searchBonus: false, damagePerTurn: 6 },
      triggerChance: 6, minTurn: 10, locationIds: [],
      onTriggerMessage: '☠️ Un\'aria malsana vi avvolge! La pestilenza si diffonde!',
      onEndMessage: '☠️ L\'aria torna pura. Sopravvissuti alla pestilenza.',
      choices: [
        { text: 'Usare un antidoto', outcome: { description: 'L\'antidoto vi protegge dalla peste.', endEvent: true, hpChange: -3 } },
        { text: 'Respirare through la bocca', outcome: { description: 'Non funziona. La peste vi colpisce.', endEvent: true, hpChange: -18 } },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // CHARACTERS
  // ═══════════════════════════════════════════
  characters: [
    {
      id: 'knight', name: 'Cavaliere', displayName: 'Sir Aldric',
      description: 'Un cavaliere corazzato, specializzato nella difesa e nell\'assorbimento danni.',
      maxHp: 160, atk: 16, def: 16, spd: 6,
      specialName: 'Scudo Sacro', specialDescription: 'Solleva uno scudo che riduce i danni subiti per 3 turni.',
      specialCost: 15,
      special2Name: 'Carica di Valore', specialDescription: 'Carica un nemico con tutto il peso dell\'armatura.',
      special2Cost: 12,
      passiveDescription: 'Resistenza: -10% danni subiti passivamente.',
      portraitEmoji: '🛡️',
      startingItems: [
        { uid: genUid(), itemId: 'iron_sword', name: 'Spada di Ferro', type: 'weapon', rarity: 'common', icon: '🗡️', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'health_potion', name: 'Pozione di Cura', type: 'healing', rarity: 'common', icon: '🧪', usable: true, equippable: false, quantity: 3 },
        { uid: genUid(), itemId: 'torch', name: 'Torcia', type: 'utility', rarity: 'common', icon: '🔥', usable: false, equippable: false, quantity: 1 },
      ],
    },
    {
      id: 'mage', name: 'Mago', displayName: 'Lira Stormweave',
      description: 'Una maga potente che infligge danni devastanti con le sue arti magiche.',
      maxHp: 90, atk: 22, def: 6, spd: 10,
      specialName: 'Palla di Fuoco', specialDescription: 'Lancia una palla di fuoco che colpisce tutti i nemici.',
      specialCost: 18,
      special2Name: 'Gelo', specialDescription: 'Congela il nemico, infliggendo danni e stordendolo.',
      special2Cost: 14,
      passiveDescription: 'Potenza Arcana: +15% danni magici.',
      portraitEmoji: '🧙‍♀️',
      startingItems: [
        { uid: genUid(), itemId: 'fire_staff', name: 'Bastone di Fuoco', type: 'weapon', rarity: 'rare', icon: '🔥', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'mana_crystal', name: 'Cristallo di Mana', type: 'healing', rarity: 'uncommon', icon: '💎', usable: true, equippable: false, quantity: 2 },
        { uid: genUid(), itemId: 'scroll_fireball', name: 'Pergamena — Palla di Fuoco', type: 'healing', rarity: 'rare', icon: '📜', usable: true, equippable: false, quantity: 1 },
      ],
    },
    {
      id: 'ranger', name: 'Ranger', displayName: 'Kael Swiftarrow',
      description: 'Un arciere esperto. Veloce, preciso e letale a distanza.',
      maxHp: 110, atk: 18, def: 8, spd: 14,
      specialName: 'Tiro Preciso', specialDescription: 'Un colpo mirato che non può mancare e infligge danni critici.',
      specialCost: 15,
      special2Name: 'Raffica di Frecce', specialDescription: 'Spara una raffica di frecce che colpiscono tutti i nemici.',
      special2Cost: 20,
      passiveDescription: 'Precisione: +20% probabilità di colpo critico.',
      portraitEmoji: '🏹',
      startingItems: [
        { uid: genUid(), itemId: 'wooden_bow', name: 'Arco di Legno', type: 'weapon', rarity: 'common', icon: '🏹', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'arrow', name: 'Freccia', type: 'ammo', rarity: 'common', icon: '🏹', usable: false, equippable: false, quantity: 10 },
        { uid: genUid(), itemId: 'dagger', name: 'Pugnale', type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true, quantity: 1 },
      ],
    },
    {
      id: 'cleric', name: 'Chierico', displayName: 'Madre Seraphina',
      description: 'Una guaritrice devota che mantiene in vita il gruppo con preghiere e pozioni.',
      maxHp: 100, atk: 10, def: 10, spd: 8,
      specialName: 'Preghiera Curativa', specialDescription: 'Cura un alleato di 70 HP e rimuove status negativi.',
      specialCost: 18,
      special2Name: 'Benedizione', specialDescription: 'Benedice tutto il gruppo, curando tutti leggeramente.',
      special2Cost: 22,
      passiveDescription: 'Fede: +20% efficacia cure.',
      portraitEmoji: '✨',
      startingItems: [
        { uid: genUid(), itemId: 'war_hammer', name: 'Martello da Guerra', type: 'weapon', rarity: 'uncommon', icon: '🔨', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'health_potion', name: 'Pozione di Cura', type: 'healing', rarity: 'common', icon: '🧪', usable: true, equippable: false, quantity: 4 },
        { uid: genUid(), itemId: 'antidote_herb', name: 'Erba Antidoto', type: 'antidote', rarity: 'common', icon: '🌿', usable: true, equippable: false, quantity: 2 },
      ],
    },
  ],

  // ═══════════════════════════════════════════
  // SPECIALS
  // ═══════════════════════════════════════════
  specials: [
    { id: 'fireball', name: 'Palla di Fuoco', description: 'Lancia una palla di fuoco che infligge danni a tutti i nemici.', icon: '🔥', targetType: 'all_enemies', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'all_enemies', powerMultiplier: 1.2 }] },
    { id: 'ice_lance', name: 'Lancia di Gelo', description: 'Congela il bersaglio, infliggendo danni e stordendolo.', icon: '❄️', targetType: 'enemy', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.3 }, { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 60 }] },
    { id: 'thunder_strike', name: 'Fulmine', description: 'Un fulmine che non può mancare il bersaglio.', icon: '⚡', targetType: 'enemy', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 2.0, noMiss: true }] },
    { id: 'shield_wall', name: 'Muro di Scudi', description: 'Riduce drasticamente i danni subiti per 3 turni.', icon: '🛡️', targetType: 'all_allies', cooldown: 3, category: 'defensive', effects: [{ type: 'buff_stat', target: 'all_allies', stat: 'def', amount: 50, duration: 3 }] },
    { id: 'holy_light', name: 'Luce Santa', description: 'Cura un alleato e rimuove tutti i mali.', icon: '✨', targetType: 'ally', cooldown: 3, category: 'support', effects: [{ type: 'heal', target: 'ally', amount: 60 }, { type: 'remove_status', target: 'ally', statuses: ['poison', 'bleeding', 'stunned'] }] },
    { id: 'heal_party', name: 'Preghiera di Gruppo', description: 'Cura leggermente tutto il gruppo.', icon: '💚', targetType: 'all_allies', cooldown: 3, category: 'support', effects: [{ type: 'heal', target: 'all_allies', amount: 30 }] },
    { id: 'backstab', name: 'Pugnalata Alle Spalle', description: 'Colpo critico devastante da dietro.', icon: '🗡️', targetType: 'enemy', cooldown: 2, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.8, guaranteedCrit: true }] },
    { id: 'war_cry', name: 'Urlo di Guerra', description: 'Aumenta l\'attacco di tutto il gruppo.', icon: '📯', targetType: 'all_allies', cooldown: 4, category: 'support', effects: [{ type: 'buff_stat', target: 'all_allies', stat: 'atk', amount: 30, duration: 3 }] },
    { id: 'poison_cloud', name: 'Nuvola Velenosa', description: 'Avvelena tutti i nemici.', icon: '☠️', targetType: 'all_enemies', cooldown: 3, category: 'control', effects: [{ type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.6 }, { type: 'apply_status', target: 'all_enemies', statusType: 'poison', chance: 65 }] },
    { id: 'stone_skin', name: 'Pelle di Pietra', description: 'Indurisce la pelle, aumentando drasticamente la difesa.', icon: '🪨', targetType: 'self', cooldown: 3, category: 'defensive', effects: [{ type: 'buff_stat', target: 'self', stat: 'def', amount: 60, duration: 2 }] },
    { id: 'rapid_shot', name: 'Tiro Rapido', description: 'Spara due frecce rapide sul bersaglio.', icon: '🏹', targetType: 'enemy', cooldown: 2, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.4 }] },
    { id: 'mana_shield', name: 'Scudo di Mana', description: 'Cura 30 HP e aumenta difesa.', icon: '🔷', targetType: 'self', cooldown: 3, category: 'defensive', effects: [{ type: 'heal', target: 'self', amount: 30 }, { type: 'buff_stat', target: 'self', stat: 'def', amount: 30, duration: 2 }] },
    { id: 'smite', name: 'Castigo Divino', description: 'Un attacco sacro devastante su un nemico.', icon: '☀️', targetType: 'enemy', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.6, noMiss: true }] },
    { id: 'purify', name: 'Purificazione', description: 'Rimuove tutti gli status negativi dal gruppo.', icon: '🧹', targetType: 'all_allies', cooldown: 3, category: 'support', effects: [{ type: 'heal', target: 'all_allies', amount: 15 }, { type: 'remove_status', target: 'all_allies', statuses: ['poison', 'bleeding', 'stunned'] }] },
    { id: 'charge', name: 'Carica', description: 'Una carica devastante che può stordire.', icon: '🐴', targetType: 'enemy', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.4 }, { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 50 }] },
  ],

  // ═══════════════════════════════════════════
  // RECIPES
  // ═══════════════════════════════════════════
  recipes: [
    { id: 'craft_large_potion', name: 'Grande Pozione', description: '2 Pozione di Cura → 1 Grande Pozione.', icon: '❤️‍🔥', category: 'healing', ingredients: JSON.stringify([{ itemId: 'health_potion', quantity: 2 }]), resultItemId: 'health_potion_large', resultQty: 1, difficulty: 'easy', pointCost: 3, sortOrder: 1 },
    { id: 'craft_elixir', name: 'Elixir', description: 'Grande Pozione + Cristallo + Erba → Elisir.', icon: '✨', category: 'healing', ingredients: JSON.stringify([{ itemId: 'health_potion_large', quantity: 1 }, { itemId: 'mana_crystal', quantity: 1 }, { itemId: 'antidote_herb', quantity: 1 }]), resultItemId: 'elixir', resultQty: 1, difficulty: 'medium', pointCost: 6, sortOrder: 2, hidden: true },
    { id: 'craft_fire_arrows', name: 'Freccia Infuocata', description: '5 Frecce + 1 Cristallo → 3 Frecce Infuocate.', icon: '🔥', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'arrow', quantity: 5 }, { itemId: 'mana_crystal', quantity: 1 }]), resultItemId: 'fire_arrow', resultQty: 3, difficulty: 'medium', pointCost: 5, sortOrder: 3 },
    { id: 'craft_scroll_fireball', name: 'Pergamena Fuoco', description: '2 Cristalli + 1 Freccia → Pergamena Palla di Fuoco.', icon: '📜', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'mana_crystal', quantity: 2 }, { itemId: 'arrow', quantity: 1 }]), resultItemId: 'scroll_fireball', resultQty: 1, difficulty: 'hard', pointCost: 8, hidden: true, sortOrder: 4 },
    { id: 'craft_arrow_from_bone', name: 'Freccia da Ossa', description: 'Ricicla materiali per creare frecce.', icon: '🏹', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'health_potion', quantity: 1 }]), resultItemId: 'arrow', resultQty: 5, difficulty: 'easy', pointCost: 3, sortOrder: 5 },
    { id: 'craft_health_potion', name: 'Pozione di Cura', description: 'Crea una pozione base.', icon: '🧪', category: 'healing', ingredients: JSON.stringify([{ itemId: 'antidote_herb', quantity: 2 }]), resultItemId: 'health_potion', resultQty: 1, difficulty: 'easy', pointCost: 2, sortOrder: 6 },
  ],

  // ═══════════════════════════════════════════
  // ACHIEVEMENTS
  // ═══════════════════════════════════════════
  achievements: [
    { id: 'fantasy_first_blood', name: 'Primo Sangue', description: 'Sconfiggi il tuo primo nemico.', icon: '⚔️', category: 'combat', condition: 'first_kill', reward: 'Coraggio: +5', sortOrder: 0 },
    { id: 'fantasy_dragon_slayer', name: 'Ammazzadraghi', description: 'Sconfiggi il Drago Antico.', icon: '🐉', category: 'combat', condition: 'defeat_ancient_dragon', reward: 'Gloria eterna', sortOrder: 1 },
    { id: 'fantasy_demon_killer', name: 'Cacciatore di Demoni', description: 'Sconfiggi il Signore Demoniaco.', icon: '😈', category: 'combat', condition: 'defeat_demon_lord', reward: 'Onore supremo', sortOrder: 2 },
    { id: 'fantasy_perfect', name: 'Combattimento Perfetto', description: 'Vinci senza subire danni.', icon: '✨', category: 'combat', condition: 'no_damage_victory', reward: 'Prestigio', sortOrder: 3 },
    { id: 'fantasy_100_kills', name: 'Centurione', description: 'Sconfiggi 100 nemici.', icon: '💀', category: 'combat', condition: 'kill_100', reward: 'Esp: +50', sortOrder: 4 },
    { id: 'fantasy_explorer', name: 'Esploratore', description: 'Visita tutte le location.', icon: '🗺️', category: 'exploration', condition: 'visit_all_locations', reward: 'Conoscenza: +10', sortOrder: 10 },
    { id: 'fantasy_survive_50', name: 'Sopravvissuto', description: 'Sopravvivi per 50 turni.', icon: '🕐', category: 'exploration', condition: 'survive_50_turns', reward: 'Resilienza', sortOrder: 11 },
    { id: 'fantasy_bestiary_5', name: 'Osservatore', description: 'Incontra 5 tipi diversi di nemici.', icon: '📖', category: 'collection', condition: 'bestiary_5', reward: 'Saggezza', sortOrder: 20 },
    { id: 'fantasy_bestiary_all', name: 'Enciclopedia', description: 'Sconfiggi tutti i tipi di nemici.', icon: '📚', category: 'collection', condition: 'bestiary_all', hidden: true, reward: 'Conoscenza totale', sortOrder: 21 },
    { id: 'fantasy_craft_10', name: 'Artigiano', description: 'Crea 10 oggetti.', icon: '🔨', category: 'special', condition: 'craft_10_items', reward: 'Creatività', sortOrder: 30 },
    { id: 'fantasy_speedrun', name: 'Speedrunner', description: 'Completa il gioco in meno di 60 turni.', icon: '⚡', category: 'exploration', condition: 'victory_under_60_turns', reward: 'Velocità: +10', sortOrder: 12 },
    { id: 'fantasy_victory', name: 'Eroe del Regno', description: 'Completa il gioco.', icon: '🏆', category: 'story', condition: 'game_victory', reward: 'VITTORIA!', sortOrder: 40 },
    { id: 'fantasy_all_docs', name: 'Saggio', description: 'Trova tutti i documenti.', icon: '📜', category: 'collection', condition: 'documents_found_all', reward: 'Saggezza suprema', sortOrder: 22, hidden: true },
  ],

  // ═══════════════════════════════════════════
  // ENDINGS
  // ═══════════════════════════════════════════
  endings: [
    { id: 'ending_hero', title: 'Eroe del Regno', subtitle: 'Hai salvato tutti coloro che potevi.', description: 'Avete sconfitto il drago e liberato il regno dalla corruzione. Il popolo vi acclama come eroe. La luce torna a brillare sulle terre un tempo oscure.', icon: '🦸', color: '#22c55e', requirements: [{ type: 'boss_defeated', value: 'ancient_dragon' }, { type: 'npc_saved', value: 4 }], priority: 2, sortOrder: 1 },
    { id: 'ending_dark', title: 'Cammino Oscuro', subtitle: 'Hai attraversato le tenebre a passi forsennati.', description: 'Siete fuggiti dal regno in tempo record, ma avete lasciato il popolo alla sua sorte. Il drago e il demone ancora regnano. Il vostro nome è dimenticato.', icon: '💀', color: '#ef4444', requirements: [{ type: 'boss_defeated', value: 'ancient_dragon' }, { type: 'turn_limit', value: 30 }], priority: 1, sortOrder: 0 },
    { id: 'ending_truth', title: 'Verità Rivelata', subtitle: 'Hai scoperto i segreti del regno.', description: 'Avete scoperto ogni segreto del regno antico, distrutto il Signore Demoniaco e calmato il drago. La verità è emersa dalle rovine. Il regno può rinascere.', icon: '🔍', color: '#8b5cf6', requirements: [{ type: 'boss_defeated', value: 'ancient_dragon' }, { type: 'boss_defeated', value: 'demon_lord' }, { type: 'documents_found', value: 6 }, { type: 'secret_rooms', value: 2 }], priority: 3, sortOrder: 2 },
  ],

  // ═══════════════════════════════════════════
  // SECRET ROOMS
  // ═══════════════════════════════════════════
  secretRooms: [
    { id: 'secret_temple_vault', locationId: 'abandoned_temple', name: 'Volta Segreta', description: 'Una volta nascosta sotto il tempio, piena di tesori antichi.', discoveryMethod: 'document', requiredDocumentId: 'doc_secret_passage', requiredNpcQuestId: null, searchChance: 0, hint: 'L\'iscrizione menziona una leva sotto la statua del cavaliere...', lootTable: JSON.stringify([{ itemId: 'legendary_blade', chance: 50, quantity: 1 }, { itemId: 'mana_crystal', chance: 80, quantity: 3 }]), uniqueItemId: 'ancient_amulet', uniqueItemQuantity: 1, sortOrder: 1 },
    { id: 'secret_dragon_hoard', locationId: 'crystal_cave', name: 'Tesoro del Drago', description: 'Un\'enorme catasta di oro e tesori, nascosta dietro una parete di cristallo.', discoveryMethod: 'search', requiredDocumentId: null, requiredNpcQuestId: null, searchChance: 15, hint: 'Un cristallo emana una luce diversa dalle altri...', lootTable: JSON.stringify([{ itemId: 'elixir', chance: 70, quantity: 2 }, { itemId: 'fire_staff', chance: 50, quantity: 1 }]), uniqueItemId: 'ice_staff', uniqueItemQuantity: 1, sortOrder: 2 },
  ],

  // ═══════════════════════════════════════════
  // BOSS PHASES
  // ═══════════════════════════════════════════
  bossPhases: [
    { id: 'demon_phase_2', enemyId: 'demon_lord', name: 'Furia Oscura', hpThreshold: 0.5, hpMultiplier: 1.2, atkMultiplier: 1.3, defMultiplier: 0.8, spdMultiplier: 1.2, newAbilities: [], message: 'Il Signore Demoniaco entra in furia! Il suo potere oscuro esplode!', sortOrder: 1 },
    { id: 'dragon_phase_2', enemyId: 'ancient_dragon', name: 'Furia Draconica', hpThreshold: 0.4, hpMultiplier: 1.1, atkMultiplier: 1.4, defMultiplier: 1.0, spdMultiplier: 1.3, newAbilities: [], message: 'Il drago infuriato scatena la sua furia più devastante!', sortOrder: 1 },
  ],

  // ═══════════════════════════════════════════
  // QUEST CHAINS
  // ═══════════════════════════════════════════
  questChains: [
    {
      id: 'chain_purification', name: 'La Purificazione', description: 'Un ciclo di quest per purificare il regno.', npcId: 'npc_wizard',
      steps: [
        { id: 'pur_step_1', stepIndex: 0, description: 'Raccogli 3 cristalli di mana per il rito.', type: 'fetch', targetId: 'mana_crystal', targetCount: 3, rewardItems: [{ itemId: 'scroll_fireball', quantity: 2 }], rewardExp: 30, rewardDialogue: ['I cristalli brillano di luce pura. Ottimo inizio.'] },
        { id: 'pur_step_2', stepIndex: 1, description: 'Sconfiggi il mago oscuro nella dungeon.', type: 'kill', targetId: 'dark_mage', targetCount: 1, rewardItems: [{ itemId: 'elixir', quantity: 1 }], rewardExp: 45, nextStepId: 'pur_step_3', rewardDialogue: ['Il mago oscuro è sconfitto! Ora posso procedere con il rito.'] },
        { id: 'pur_step_3', stepIndex: 2, description: 'Esplora la grotta di cristallo.', type: 'explore', targetId: 'crystal_cave', targetCount: 1, rewardItems: [{ itemId: 'mana_crystal', quantity: 3 }], rewardExp: 40, rewardDialogue: ['La grotta è pura! I cristalli rispondono al tuo coraggio.'] },
      ],
      finalReward: { rewardItems: [{ itemId: 'legendary_blade', quantity: 1 }], rewardExp: 100, dialogue: ['Hai purificato il regno dalla corruzione! Prendi questa Lama Leggendaria — è forgiata con la luce dei cristalli purificati.'] },
    },
  ],

  // ═══════════════════════════════════════════
  // BOSS PHASE ABILITIES
  // ═══════════════════════════════════════════
  bossPhaseAbilities: [],

  // ═══════════════════════════════════════════
  // AVATARS
  // ═══════════════════════════════════════════
  avatars: [
    { id: 'avatar_knight', name: 'Cavaliere', emoji: '🛡️', sortOrder: 1 },
    { id: 'avatar_mage', name: 'Mago', emoji: '🧙', sortOrder: 2 },
    { id: 'avatar_ranger', name: 'Ranger', emoji: '🏹', sortOrder: 3 },
    { id: 'avatar_cleric', name: 'Chierico', emoji: '✨', sortOrder: 4 },
    { id: 'avatar_dragon', name: 'Drago', emoji: '🐉', sortOrder: 5 },
    { id: 'avatar_elf', name: 'Elfo', emoji: '🧝', sortOrder: 6 },
  ],

  // ═══════════════════════════════════════════
  // MAP LAYOUT
  // ═══════════════════════════════════════════
  mapLayout: {
    enchanted_forest: { row: 0, col: 0, icon: '🌲', danger: 'bassa' },
    village_square: { row: 0, col: 2, icon: '🏘️', danger: 'bassa' },
    mountain_pass: { row: 1, col: 0, icon: '⛰️', danger: 'media' },
    abandoned_temple: { row: 1, col: 2, icon: '🏛️', danger: 'media' },
    dark_dungeon: { row: 2, col: 0, icon: '🏚️', danger: 'alta' },
    crystal_cave: { row: 2, col: 2, icon: '💎', danger: 'alta' },
    castle_throne: { row: 3, col: 0, icon: '🏰', danger: 'FINALE' },
    dragon_lair: { row: 3, col: 2, icon: '🐉', danger: 'FINALE' },
  },
};
