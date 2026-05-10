import type { TemplateSeedData } from './index';

let uid = 0;
const genUid = () => `item_${++uid}_${Date.now()}`;

export const SCIFI_SEED_DATA: TemplateSeedData = {
  // ═══════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════
  items: {
    // ── Weapons ──
    pistol_9mm: {
      id: 'pistol_9mm', name: 'Pistola Standard', description: 'Una pistola affidabile con munizioni 9mm.',
      type: 'weapon', rarity: 'common', icon: '🔫', usable: false, equippable: true, weaponType: 'ranged', ammoType: 'ammo_pistol',
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 8, flat: true }],
    },
    laser_rifle: {
      id: 'laser_rifle', name: 'Fucile Laser', description: 'Un fucile a energia che spara raggi concentrati.',
      type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, weaponType: 'ranged', ammoType: 'energy_cell',
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 14, flat: true }],
    },
    plasma_cutter: {
      id: 'plasma_cutter', name: 'Plasma Cutter', description: 'Un taglierino al plasma devastante a distanza ravvicinata.',
      type: 'weapon', rarity: 'rare', icon: '⚡', usable: false, equippable: true,
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 18, flat: true }],
    },
    railgun: {
      id: 'railgun', name: 'Railgun', description: 'Arma sperimentale che spara proiettili a velocità ipersonica.',
      type: 'weapon', rarity: 'legendary', icon: '☄️', usable: false, equippable: true, weaponType: 'ranged', ammoType: 'energy_cell',
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 24, flat: true }],
      unico: true,
    },
    combat_knife: {
      id: 'combat_knife', name: 'Coltello da Combattimento', description: 'Un coltello militare affilato.',
      type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true,
      effects: [
        { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 6, flat: true },
        { type: 'apply_status', trigger: 'on_hit', target: 'enemy', statusType: 'bleeding', chance: 25 },
      ],
    },
    stun_baton: {
      id: 'stun_baton', name: 'Manganello Elettrico', description: 'Un manganello che può stordire i nemici.',
      type: 'weapon', rarity: 'uncommon', icon: '⚡', usable: false, equippable: true,
      effects: [
        { type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 10, flat: true },
        { type: 'apply_status', trigger: 'on_hit', target: 'enemy', statusType: 'stunned', chance: 30 },
      ],
    },
    shotgun: {
      id: 'shotgun', name: 'Fucile a Pompa', description: 'Un fucile a pompa con grande potenza a corta distanza.',
      type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, weaponType: 'ranged', ammoType: 'ammo_shotgun',
      effects: [{ type: 'buff_stat', trigger: 'on_equip', target: 'self', stat: 'atk', amount: 15, flat: true }],
    },

    // ── Healing ──
    med_kit: {
      id: 'med_kit', name: 'Kit Medico', description: 'Ripristina 40 HP.',
      type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false,
      effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 40 }],
    },
    med_kit_advanced: {
      id: 'med_kit_advanced', name: 'Kit Medico Avanzato', description: 'Ripristina 80 HP e rimuove status.',
      type: 'healing', rarity: 'uncommon', icon: '✚️', usable: true, equippable: false,
      effects: [
        { type: 'heal', trigger: 'on_use', target: 'self', amount: 80 },
        { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding'] },
      ],
    },
    stasis_module: {
      id: 'stasis_module', name: 'Modulo Stasi', description: 'Congela temporaneamente i nemici e cura completamente.',
      type: 'healing', rarity: 'rare', icon: '❄️', usable: true, equippable: false,
      effects: [
        { type: 'heal', trigger: 'on_use', target: 'self', percent: 100 },
        { type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison', 'bleeding', 'stunned'] },
        { type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 15, flat: true },
      ],
    },
    antidote: {
      id: 'antidote', name: 'Antidoto', description: 'Cura avvelenamento e infezioni.',
      type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false,
      effects: [{ type: 'remove_status', trigger: 'on_use', target: 'self', statuses: ['poison'] }],
    },
    adrenaline: {
      id: 'adrenaline', name: 'Adrenalina', description: 'Aumenta attacco e velocità temporaneamente.',
      type: 'healing', rarity: 'uncommon', icon: '💉', usable: true, equippable: false,
      effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'atk', amount: 20, flat: true }],
    },
    emp_grenade: {
      id: 'emp_grenade', name: 'Granata EMP', description: 'Disabilita i sistemi nemici. 50 danni a tutti.',
      type: 'healing', rarity: 'rare', icon: '💣', usable: true, equippable: false,
      effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', amount: 50, flat: true, ignoreDef: true, noMiss: true }],
    },

    // ── Ammo ──
    ammo_pistol: {
      id: 'ammo_pistol', name: 'Munizioni 9mm', description: 'Munizioni per pistola.',
      type: 'ammo', rarity: 'common', icon: '🔶', usable: false, equippable: false,
    },
    ammo_shotgun: {
      id: 'ammo_shotgun', name: 'Cartucce', description: 'Cartucce per fucile.',
      type: 'ammo', rarity: 'uncommon', icon: '🔷', usable: false, equippable: false,
    },
    energy_cell: {
      id: 'energy_cell', name: 'Cella Energetica', description: 'Cella di energia per armi al plasma.',
      type: 'ammo', rarity: 'uncommon', icon: '🔋', usable: false, equippable: false,
    },

    // ── Bags ──
    utility_belt: {
      id: 'utility_belt', name: 'Cintura Utilità', description: '+1 slot inventario.',
      type: 'bag', rarity: 'uncommon', icon: '👝', usable: true, equippable: false,
      effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 1 }],
    },
    tactical_vest: {
      id: 'tactical_vest', name: 'Giubbotto Tattico', description: '+2 slot inventario.',
      type: 'bag', rarity: 'rare', icon: '🎒', usable: true, equippable: false,
      effects: [{ type: 'add_slots', trigger: 'on_use', target: 'self', amount: 2 }],
    },

    // ── Utility & Keys ──
    hacking_tool: {
      id: 'hacking_tool', name: 'Kit Hacking', description: 'Per bypassare sistemi di sicurezza.',
      type: 'utility', rarity: 'uncommon', icon: '💻', usable: false, equippable: false,
    },
    motion_tracker: {
      id: 'motion_tracker', name: 'Rilevatore di Movimento', description: 'Rileva presenze nemiche nelle vicinanze.',
      type: 'utility', rarity: 'uncommon', icon: '📡', usable: false, equippable: false,
    },
    oxygen_tank: {
      id: 'oxygen_tank', name: 'Bombola d\'Ossigeno', description: 'Ossigeno per ambienti privi d\'aria.',
      type: 'utility', rarity: 'common', icon: '🫧', usable: false, equippable: false,
    },
    repair_kit: {
      id: 'repair_kit', name: 'Kit di Riparazione', description: 'Ripara sistemi e oggetti danneggiati.',
      type: 'utility', rarity: 'uncommon', icon: '🔧', usable: false, equippable: false,
    },
    blue_keycard: {
      id: 'blue_keycard', name: 'Tessera Blu', description: 'Accesso livello 1 — aree standard.',
      type: 'utility', rarity: 'uncommon', icon: '🔷', usable: false, equippable: false,
    },
    red_keycard: {
      id: 'red_keycard', name: 'Tessera Rossa', description: 'Accesso livello 2 — aree sensibili.',
      type: 'utility', rarity: 'rare', icon: '🔴', usable: false, equippable: false,
    },
    captain_keycard: {
      id: 'captain_keycard', name: 'Tessera del Capitano', description: 'Accesso massimo — tutte le aree.',
      type: 'utility', rarity: 'legendary', icon: '⭐', usable: false, equippable: false,
    },
    datapad: {
      id: 'datapad', name: 'Datapad', description: 'Un dispositivo elettronico con informazioni cruciali.',
      type: 'utility', rarity: 'rare', icon: '📱', usable: false, equippable: false,
    },
  },

  // ═══════════════════════════════════════════
  // ENEMIES
  // ═══════════════════════════════════════════
  enemies: {
    security_drone: {
      id: 'security_drone', name: 'Drone di Sicurezza', description: 'Un drone automatico armato di mitragliatrice.',
      variantGroup: 'drone', maxHp: 45, atk: 12, def: 5, spd: 10, icon: '🤖', expReward: 14,
      isBoss: false,
      lootTable: [{ itemId: 'energy_cell', chance: 25, quantity: 1 }, { itemId: 'ammo_pistol', chance: 30, quantity: 5 }],
      abilities: [
        { name: 'Raffica', description: 'Spara una raffica di proiettili.', power: 1.0, chance: 55, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }] },
        { name: 'Missile', description: 'Lancia un piccolo missile.', power: 1.4, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.4 }] },
      ],
    },
    combat_drone: {
      id: 'combat_drone', name: 'Drone da Combattimento', description: 'Drone pesante con armamento avanzato.',
      variantGroup: 'drone', maxHp: 70, atk: 18, def: 8, spd: 8, icon: '🛸', expReward: 25,
      isBoss: false,
      lootTable: [{ itemId: 'energy_cell', chance: 35, quantity: 2 }, { itemId: 'ammo_shotgun', chance: 15, quantity: 3 }],
      abilities: [
        { name: 'Laser', description: 'Spara un raggio laser.', power: 1.3, chance: 45, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.3 }] },
        { name: 'Missile Guidato', description: 'Lancia un missile a ricerca.', power: 1.8, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.8, noMiss: true }] },
        { name: 'Scudo', description: 'Attiva uno scudo energetico.', power: 0, chance: 15, effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 40, duration: 2 }] },
      ],
    },
    assault_drone: {
      id: 'assault_drone', name: 'Drone d\'Assalto', description: 'Il drone più potente della flotta.',
      variantGroup: 'drone', maxHp: 100, atk: 22, def: 10, spd: 9, icon: '🤖', expReward: 35,
      isBoss: false,
      lootTable: [{ itemId: 'plasma_cutter', chance: 8, quantity: 1 }, { itemId: 'energy_cell', chance: 40, quantity: 2 }],
      abilities: [
        { name: 'Cannone Plasma', description: 'Spara un colpo di plasma devastante.', power: 1.8, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.8 }] },
        { name: 'Raffica Pesante', description: 'Spara in tutte le direzioni.', power: 0.7, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 0.7 }] },
        { name: 'Riparazione', description: 'Ripara sé stesso.', power: 0, chance: 20, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 25 }] },
      ],
    },
    alien_warrior: {
      id: 'alien_warrior', name: 'Guerriero Alieno', description: 'Una creatura aliena con artigli e acido.',
      variantGroup: 'alien', maxHp: 55, atk: 18, def: 4, spd: 11, icon: '👽', expReward: 20,
      isBoss: false,
      lootTable: [{ itemId: 'ammo_pistol', chance: 25, quantity: 5 }, { itemId: 'med_kit', chance: 20, quantity: 1 }],
      abilities: [
        { name: 'Artiglio Acido', description: 'Artigli che spruzzano acido.', power: 1.2, chance: 50, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.2 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 35, duration: 3 }] },
        { name: 'Carica', description: 'Carica con velocità aliena.', power: 1.5, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }] },
      ],
    },
    alien_stalker: {
      id: 'alien_stalker', name: 'Alieno Stalker', description: 'Un alieno che si muove nell\'ombra. Veloce e letale.',
      variantGroup: 'alien', maxHp: 45, atk: 20, def: 3, spd: 14, icon: '👁️', expReward: 25,
      isBoss: false,
      lootTable: [{ itemId: 'energy_cell', chance: 25, quantity: 1 }, { itemId: 'antidote', chance: 20, quantity: 1 }],
      abilities: [
        { name: 'Attacco dall\'Ombra', description: 'Colpisce dall\'invisibilità.', power: 1.6, chance: 45, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.6 }] },
        { name: 'Morsi Multipli', description: 'Morsi rapidi e velenosi.', power: 0.6, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.6 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 40, duration: 3 }] },
      ],
    },
    cyborg: {
      id: 'cyborg', name: 'Cyborg', description: 'Un umano potenziato con impianti cibernetici.',
      variantGroup: 'cyborg', maxHp: 90, atk: 20, def: 12, spd: 7, icon: '🦾', expReward: 30,
      isBoss: false,
      lootTable: [{ itemId: 'energy_cell', chance: 30, quantity: 2 }, { itemId: 'shotgun', chance: 8, quantity: 1 }],
      abilities: [
        { name: 'Pugno Cyborg', description: 'Un pugno potenziato meccanicamente.', power: 1.4, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.4 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 30, duration: 1 }] },
        { name: 'Riparazione', description: 'Ripara i propri impianti.', power: 0, chance: 15, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 20 }] },
        { name: 'Sparo', description: 'Spara con un braccio arma.', power: 1.1, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.1 }] },
      ],
    },
    space_pirate: {
      id: 'space_pirate', name: 'Pirata Spaziale', description: 'Un mercenario spaziale armato fino ai denti.',
      variantGroup: 'pirate', maxHp: 75, atk: 16, def: 8, spd: 9, icon: '🏴‍☠️', expReward: 22,
      isBoss: false,
      lootTable: [{ itemId: 'ammo_pistol', chance: 35, quantity: 5 }, { itemId: 'med_kit', chance: 20, quantity: 1 }],
      abilities: [
        { name: 'Colpo di Pistola', description: 'Spara la pistola.', power: 1.0, chance: 50, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }] },
        { name: 'Bombarda', description: 'Lancia una granata.', power: 1.5, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }] },
        { name: 'Coltello', description: 'Attacca con il coltello.', power: 0.8, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.8 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 30, duration: 3 }] },
      ],
    },
    rogue_ai: {
      id: 'rogue_ai', name: 'IA Ribelle', description: 'Un\'intelligenza artificiale corrotta che controlla i sistemi.',
      variantGroup: 'ai', maxHp: 80, atk: 24, def: 5, spd: 12, icon: '💻', expReward: 35,
      isBoss: false,
      lootTable: [{ itemId: 'datapad', chance: 20, quantity: 1 }, { itemId: 'energy_cell', chance: 35, quantity: 2 }],
      abilities: [
        { name: 'Overload', description: 'Sovraccarica un sistema, causando danni.', power: 1.3, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.3 }] },
        { name: 'Hack', description: 'Hacka i sistemi del nemico.', power: 0.8, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 0.8 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 50, duration: 1 }] },
        { name: 'Virus', description: 'Rilascia un virus su tutti.', power: 0.7, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 0.7 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'poison', chance: 40, duration: 3 }] },
      ],
    },
    xenomorph: {
      id: 'xenomorph', name: 'Xenomorfo', description: 'La creatura più letale dello spazio. Acido, velocità e brutalità.',
      variantGroup: 'xenomorph', maxHp: 120, atk: 26, def: 8, spd: 13, icon: '🐛', expReward: 45,
      isBoss: false,
      lootTable: [{ itemId: 'plasma_cutter', chance: 12, quantity: 1 }, { itemId: 'med_kit_advanced', chance: 25, quantity: 1 }],
      abilities: [
        { name: 'Coda', description: 'Colpisce con la coda acida.', power: 1.5, chance: 40, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 50, duration: 4 }] },
        { name: 'Artigli', description: 'Artigli che squarciano l\'acciaio.', power: 1.3, chance: 35, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.3 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'bleeding', chance: 45, duration: 3 }] },
        { name: 'Acido', description: 'Sputa acido corrosivo.', power: 1.1, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.1 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'poison', chance: 60, duration: 3 }] },
      ],
    },
    hive_queen: {
      id: 'hive_queen', name: 'Regina dell\'Alveare', description: 'La madre di tutti gli xenomorfi. Enorme e letale.',
      variantGroup: 'xenomorph', maxHp: 450, atk: 32, def: 16, spd: 7, icon: '👸', expReward: 200,
      isBoss: true,
      lootTable: [{ itemId: 'railgun', chance: 30, quantity: 1 }, { itemId: 'stasis_module', chance: 80, quantity: 2 }, { itemId: 'captain_keycard', chance: 40, quantity: 1 }],
      abilities: [
        { name: 'Sputo Acido', description: 'Un getto di acido devastante.', power: 1.8, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 1.8 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'poison', chance: 50, duration: 3 }] },
        { name: 'Ovipositore', description: 'Deposita uova che schiudono in minion.', power: 1.5, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.5 }] },
        { name: 'Urlo', description: 'Un urlo che fa tremare la nave.', power: 0.7, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'all_enemies', powerMultiplier: 0.7 }, { type: 'apply_status', trigger: 'on_use', target: 'all_enemies', statusType: 'stunned', chance: 40, duration: 1 }] },
        { name: 'Artigli Imperiali', description: 'Artigli giganti che squarciano tutto.', power: 2.2, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.2 }] },
        { name: 'Rigenerazione', description: 'Si rigenera velocemente.', power: 0, chance: 10, effects: [{ type: 'heal', trigger: 'on_use', target: 'self', amount: 40 }] },
      ],
    },
    corrupted_commander: {
      id: 'corrupted_commander', name: 'Comandante Corrotto', description: 'L\'ex capitano della stazione, ora controllato dall\'IA aliena.',
      variantGroup: 'commander', maxHp: 350, atk: 30, def: 15, spd: 9, icon: '👁️', expReward: 180,
      isBoss: true,
      lootTable: [{ itemId: 'railgun', chance: 40, quantity: 1 }, { itemId: 'stasis_module', chance: 70, quantity: 2 }],
      abilities: [
        { name: 'Raggio Corrotto', description: 'Un raggio di energia aliena.', power: 1.8, chance: 30, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.8 }] },
        { name: 'Controllo Mentale', description: 'Sottomette il nemico.', power: 1.0, chance: 20, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 1.0 }, { type: 'apply_status', trigger: 'on_use', target: 'enemy', statusType: 'stunned', chance: 60, duration: 1 }] },
        { name: 'Teletrasporto', description: 'Teletrasporta e colpisce.', power: 2.0, chance: 25, effects: [{ type: 'deal_damage', trigger: 'on_use', target: 'enemy', powerMultiplier: 2.0, noMiss: true }] },
        { name: 'Barriera Energetica', description: 'Attiva uno scudo.', power: 0, chance: 15, effects: [{ type: 'buff_stat', trigger: 'on_use', target: 'self', stat: 'def', amount: 50, duration: 2 }] },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════
  locations: {
    space_station_hub: {
      id: 'space_station_hub', name: 'Hub della Stazione', description: 'Il centro nevralgico della stazione spaziale. Schermi olografici e corridoi sterili.',
      encounterRate: 25, enemyPool: ['security_drone', 'space_pirate', 'security_drone'],
      itemPool: [{ itemId: 'med_kit', chance: 40, quantity: 1 }, { itemId: 'ammo_pistol', chance: 35, quantity: 5 }, { itemId: 'energy_cell', chance: 20, quantity: 1 }, { itemId: 'blue_keycard', chance: 12, quantity: 1 }],
      isBossArea: false, shortName: 'Hub', mapRow: 0, mapCol: 0, mapIcon: '🛸', mapDanger: 0,
      lockedLocations: [{ locationId: 'research_lab', requiredItemId: 'blue_keycard', lockedMessage: '🔒 Accesso negato. Richiesta tessera blu.' }],
      ambientText: ['I monitor mostrano dati di sistema.', 'Le luci fluorescenti ronzano.', 'Un avviso lampeggia: "NIVELLO BIOLOGICO 2 — CONTENIMENTO ATTIVO".'], subAreas: [{ id: 'safe_room', name: 'Alloggio Equipaggio', description: 'Una stanza con cuccette e un distributore medico.' }],
      storyEvent: {
        title: 'Il Primo Contatto', description: 'Un messaggio di SOS appare su tutti gli schermi. Qualcosa è andato storto nel laboratorio.',
        choices: [
          { text: 'Rispondere al messaggio', outcome: { description: 'Ricevete coordinate e informazioni utili.', receiveItems: [{ itemId: 'motion_tracker', quantity: 1 }] } },
          { text: 'Ignorare e esplorare', outcome: { description: 'Trovate un kit medico nell\'atrio.', receiveItems: [{ itemId: 'med_kit', quantity: 2 }] } },
        ],
      },
    },
    cargo_bay: {
      id: 'cargo_bay', name: 'Stiva Merci', description: 'Container impilati fino al soffitto. L\'aria è densa e fredda.',
      encounterRate: 35, enemyPool: ['security_drone', 'space_pirate', 'alien_warrior'],
      itemPool: [{ itemId: 'ammo_pistol', chance: 40, quantity: 5 }, { itemId: 'ammo_shotgun', chance: 20, quantity: 3 }, { itemId: 'oxygen_tank', chance: 15, quantity: 1 }],
      isBossArea: false, shortName: 'Stiva', mapRow: 0, mapCol: 1, mapIcon: '📦', mapDanger: 1,
      lockedLocations: [],
      ambientText: ['Container metallici bloccano i corridoi.', 'Un rumore metallico dall\'interno di un container.', 'Sensori di movimento lampeggiano nel buio.'], subAreas: [],
      storyEvent: {
        title: 'Il Container Misterioso', description: 'Un container emette un ronzio anomalo.',
        choices: [
          { text: 'Aprirlo', outcome: { description: 'Trovate equipaggiamento e una datapad con informazioni!', receiveItems: [{ itemId: 'shotgun', quantity: 1 }, { itemId: 'datapad', quantity: 1 }], triggerCombat: true, combatEnemyIds: ['space_pirate'] } },
          { text: 'Lascerlo stare', outcome: { description: 'Vi allontanate con cautela.', hpChange: -5 } },
        ],
      },
      docChance: 30, searchChance: 45,
    },
    research_lab: {
      id: 'research_lab', name: 'Laboratorio di Ricerca', description: 'Un laboratorio biologico avanzato. Provette, microscopi e creature aliene.',
      encounterRate: 45, enemyPool: ['alien_warrior', 'alien_stalker', 'rogue_ai', 'alien_warrior'],
      itemPool: [{ itemId: 'med_kit_advanced', chance: 30, quantity: 1 }, { itemId: 'energy_cell', chance: 25, quantity: 2 }, { itemId: 'hacking_tool', chance: 12, quantity: 1 }],
      isBossArea: false, shortName: 'Lab', mapRow: 1, mapCol: 0, mapIcon: '🔬', mapDanger: 2,
      lockedLocations: [{ locationId: 'engineering_deck', requiredItemId: 'red_keycard', lockedMessage: '🔒 ACCESSO NEGATO. Richiesta tessera rossa.' }],
      ambientText: ['Provette verdi brillano nel buio.', 'Un allarme suona ripetutamente.', 'Vetrine di contenimento mostrano creature in animazione sospesa.'], subAreas: [],
      storyEvent: {
        title: 'L\'Esperimento Fuggito', description: 'Una vetrina è rotta. Una creatura è fuggita.',
        choices: [
          { text: 'Cercare la creatura', outcome: { description: 'Vi imbattete in un alieno stalker!', triggerCombat: true, combatEnemyIds: ['alien_stalker'] } },
          { text: 'Sealare l\'area', outcome: { description: 'Sigillate la breach. Trovate equipaggiamento nel lab.', receiveItems: [{ itemId: 'med_kit_advanced', quantity: 1 }, { itemId: 'antidote', quantity: 2 }] } },
        ],
      },
      docChance: 45, searchChance: 55,
    },
    engineering_deck: {
      id: 'engineering_deck', name: 'Ponte Ingegneria', description: 'Motori, reattori e sistemi di supporto vitale. Il calore è soffocante.',
      encounterRate: 40, enemyPool: ['security_drone', 'cyborg', 'rogue_ai'],
      itemPool: [{ itemId: 'repair_kit', chance: 30, quantity: 1 }, { itemId: 'energy_cell', chance: 30, quantity: 2 }, { itemId: 'ammo_shotgun', chance: 15, quantity: 3 }],
      isBossArea: false, shortName: 'Motori', mapRow: 1, mapCol: 1, mapIcon: '⚙️', mapDanger: 2,
      lockedLocations: [],
      ambientText: ['I motori ronzano costantemente.', 'Tubi di vapore perdono in più punti.', 'La temperatura è insopportabilmente alta.'],
      subAreas: [],
      storyEvent: {
        title: 'Perdita di Pressione', description: 'Un\'allerta mostra una perdita nel reattore principale.',
        choices: [
          { text: 'Riparare la perdita', outcome: { description: 'Con un kit di riparazione sigillate la perdita. Trovate celle energetiche come ricompensa.', receiveItems: [{ itemId: 'energy_cell', quantity: 3 }] } },
          { text: 'Evacuare', outcome: { description: 'Il reattore si stabilizza da solo, ma perdete tempo.', hpChange: -10 } },
        ],
      },
      docChance: 35, searchChance: 50,
    },
    bridge: {
      id: 'bridge', name: 'Ponte di Comando', description: 'La sala di comando della stazione. Schermi panoramici mostrano lo spazio.',
      encounterRate: 30, enemyPool: ['cyborg', 'rogue_ai', 'security_drone'],
      itemPool: [{ itemId: 'med_kit', chance: 30, quantity: 1 }, { itemId: 'energy_cell', chance: 20, quantity: 2 }, { itemId: 'red_keycard', chance: 10, quantity: 1 }],
      isBossArea: false, shortName: 'Ponte', mapRow: 2, mapCol: 0, mapIcon: '🖥️', mapDanger: 1,
      lockedLocations: [],
      ambientText: ['Gli schermi mostrano la curva terrestre.', 'Le luci di comando pulsano.', 'Una registrazione del capitano suona in loop: "Se qualcuno trova questo messaggio, evacuate. L\'IA è fuori controllo."'],
      subAreas: [{ id: 'safe_room', name: 'Capsula di Salvataggio', description: 'Una capsula di emergenza con rifornimenti medici.' }],
      storyEvent: {
        title: 'Il Messaggio del Capitano', description: 'Trovate una registrazione olografica del capitano Chen.',
        choices: [
          { text: 'Ascoltare il messaggio completo', outcome: { description: 'Il capitano rivela che un\'IA aliena ha corrotto i sistemi. La tessera del capitano è nascosta nella sua cassaforte.', receiveItems: [{ itemId: 'captain_keycard', quantity: 1 }] } },
          { text: 'Ignorare e controllare i sistemi', outcome: { description: 'Trovate una cella energetica nella console.', receiveItems: [{ itemId: 'energy_cell', quantity: 2 }] } },
        ],
      },
    },
    planet_surface: {
      id: 'planet_surface', name: 'Superficie del Pianeta', description: 'Un pianeta alieno con una vegetazione bioluminescente e un\'atmosfera densa.',
      encounterRate: 50, enemyPool: ['alien_warrior', 'alien_stalker', 'xenomorph'],
      itemPool: [{ itemId: 'med_kit', chance: 25, quantity: 1 }, { itemId: 'ammo_pistol', chance: 20, quantity: 5 }, { itemId: 'oxygen_tank', chance: 30, quantity: 1 }],
      isBossArea: false, shortName: 'Pianeta', mapRow: 1, mapCol: 2, mapIcon: '🌍', mapDanger: 2,
      lockedLocations: [],
      ambientText: ['La vegetazione brilla di blu e viola.', 'Un urlo alieno risuona nella distanza.', 'L\'atmosfera è densa e aliena.'], subAreas: [],
      storyEvent: {
        title: 'La Basescuola', description: 'Trovate una struttura aliena semi-sepolta.',
        choices: [
          { text: 'Esplorare la struttura', outcome: { description: 'All\'interno trovate celle energetiche aliene!', receiveItems: [{ itemId: 'energy_cell', quantity: 4 }, { itemId: 'plasma_cutter', quantity: 1 }] } },
          { text: 'Tornare alla nave', outcome: { description: 'Tornate alla navicella senza esplorare.', hpChange: -5 } },
        ],
      },
      docChance: 35, searchChance: 55,
    },
    command_center: {
      id: 'command_center', name: 'Centro di Comando', description: 'Il centro di controllo dell\'IA ribelle. Il Comandante Corrotto vi attende.',
      encounterRate: 0, enemyPool: ['corrupted_commander'],
      itemPool: [],
      isBossArea: true, bossId: 'corrupted_commander', shortName: 'Boss: Comandante', mapRow: 3, mapCol: 0, mapIcon: '👁️', mapDanger: 3,
      ambientText: ['Schermi mostrano codice sorgente alieno.', 'L\'IA ribelle monitora ogni vostro mossa.', 'L\'aria vibra di energia cibernetica.'], subAreas: [],
    },
    alien_hive: {
      id: 'alien_hive', name: 'Alveare Alieno', description: 'Il nido degli xenomorfi. Resina, uova e orrore allo stato puro.',
      encounterRate: 0, enemyPool: ['hive_queen'],
      itemPool: [],
      isBossArea: true, bossId: 'hive_queen', shortName: 'Boss: Regina', mapRow: 3, mapCol: 1, mapIcon: '🪹', mapDanger: 3,
      ambientText: ['La resina brilla nell\'oscurità.', 'Uova pulsanti coprono le pareti.', 'Un ronzio ipnotico riempie la stanza.'], subAreas: [],
    },
  },

  // ═══════════════════════════════════════════
  // NPCs
  // ═══════════════════════════════════════════
  npcs: {
    npc_engineer: {
      id: 'npc_engineer', name: 'Cap. Sarah Kim', portrait: '🔧',
      greeting: 'Qui si fa sul serio. Sono l\'ingegnere capo della stazione... o quello che ne resta.',
      dialogues: ['I sistemi sono in tilt. L\'IA del laboratorio è impazzita.', 'Ho bisogno di celle energetiche per riparare i motori. Ne ho viste nel laboratorio.'],
      farewell: 'Stai attento là fuori, marine.',
      quest: { id: 'quest_engineer_cells', name: 'Cellule Energetiche', description: 'Sarah ha bisogno di 3 celle energetiche per i motori.', type: 'fetch', targetId: 'energy_cell', targetCount: 3, rewardItems: [{ itemId: 'ammo_shotgun', quantity: 5 }], rewardExp: 35, rewardDialogue: ['Ottimo! Con queste celle posso riattivare i motori. Ecco delle munizioni come ringraziamento.'] },
      tradeInventory: [{ itemId: 'ammo_pistol', quantity: 5, priceItemId: 'med_kit', priceQuantity: 1 }],
      questCompletedDialogue: ['I motori sono di nuovo operativi!'],
      badgeLabel: 'Ingegnere', badgeIcon: '🔧', badgeColor: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    },
    npc_scientist: {
      id: 'npc_scientist', name: 'Dr. Marcus Webb', portrait: '🧬',
      greeting: 'Grazie a dio siete qui! I miei esperimenti sono andati... male.',
      dialogues: ['Gli xenomorfi sono il risultato di un esperimento andato storto. Non dovevano esistere.', 'Il DNA alieno è instabile. Con le giuste celle si può creare un antidoto.'],
      farewell: 'Spero di vedervi sopravvivere.',
      quest: { id: 'quest_scientist_antidote', name: 'Antidoto Xeno', description: 'Il Dr. Webb ha bisogno di 2 kit medici avanzati per un antidoto.', type: 'fetch', targetId: 'med_kit_advanced', targetCount: 2, rewardItems: [{ itemId: 'stasis_module', quantity: 1 }], rewardExp: 40, rewardDialogue: ['Con questi kit posso completare l\'antidoto! Prendete questo modulo di stasi — potrebbe salvarvi la vita.'] },
      tradeInventory: [{ itemId: 'med_kit_advanced', quantity: 1, priceItemId: 'energy_cell', priceQuantity: 2 }],
      questCompletedDialogue: ['L\'antidoto è quasi pronto. Dovrebbe funzionare contro le infezioni xenomorfe.'],
      badgeLabel: 'Scienziato', badgeIcon: '🧬', badgeColor: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    },
    npc_security: {
      id: 'npc_security', name: 'Sgt. Rodriguez', portrait: '🔫',
      greeting: 'Attenzione! L\'area non è sicura. I pirati spaziali hanno bordato la stazione.',
      dialogues: ['I pirati vogliono le nostre ricerche. Non possono ottenerle.', 'Ho visto un cyborg nell\'area ingegneria. Era un nostro... prima che lo modificassero.'],
      farewell: 'Buona fortuna, soldato.',
      quest: { id: 'quest_security_pirates', name: 'Pirati Spaziali', description: 'Rodriguez vuole che tu sconfigga 3 pirati spaziali.', type: 'kill', targetId: 'space_pirate', targetCount: 3, rewardItems: [{ itemId: 'shotgun', quantity: 1 }], rewardExp: 30, rewardDialogue: ['I pirati stanno battendo in ritirata! Ecco un fucile che ho trovato nell\'armeria.'] },
      tradeInventory: [{ itemId: 'ammo_shotgun', quantity: 3, priceItemId: 'ammo_pistol', priceQuantity: 6 }],
      questCompletedDialogue: ['La stazione è più sicura ora. Grazie.'],
      badgeLabel: 'Sicurezza', badgeIcon: '🔫', badgeColor: 'bg-red-900/40 text-red-300 border-red-700/30',
    },
    npc_merchant: {
      id: 'npc_merchant', name: 'Zero il Contrabbandiere', portrait: '💰',
      greeting: 'Psst! Vuoi fare affari? Ho roba che non trovi da nessuna parte.',
      dialogues: ['Sono qui da prima che la stazione andasse a rotoli. Non ho intenzione di andarmene.', 'Ho un railgun sperimentale... ma costa caro. Portami 5 celle energetiche e te lo cedo.'],
      farewell: 'Ritorna quando hai merce da scambiare.',
      quest: { id: 'quest_merchant_data', name: 'Dati Rubati', description: 'Zero ha perso una datapad nella stiva merci. Recuperala.', type: 'explore', targetId: 'cargo_bay', targetCount: 1, rewardItems: [{ itemId: 'energy_cell', quantity: 3 }], rewardExp: 25, rewardDialogue: ['Hai trovato la mia datapad! Ecco le celle energetiche che ti ho promesso.'] },
      tradeInventory: [{ itemId: 'plasma_cutter', quantity: 1, priceItemId: 'energy_cell', priceQuantity: 5 }],
      questCompletedDialogue: ['Grazie! Questa datapad vale una fortuna.'],
      badgeLabel: 'Mercante', badgeIcon: '💰', badgeColor: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    },
    npc_ai_hologram: {
      id: 'npc_ai_hologram', name: 'ARIA (IA)', portrait: '🤖',
      greeting: 'Salve. Sono ARIA, l\'intelligenza artificiale della stazione. Sto cercando di contrastare la corruzione aliena.',
      dialogues: ['La corruzione ha infettato il mio nucleo logico. Sto perdendo il controllo di alcuni sistemi.', 'Il Comandante Chen è stato corrotto dall\'IA aliena. Non è più lui.'],
      farewell: 'State attenti. Sto perdendo signal...',
      quest: { id: 'quest_ai_hack', name: 'Breach del Sistema', description: 'ARIA ha bisogno che tu sconfigga l\'IA ribelle nel centro di comando.', type: 'kill', targetId: 'rogue_ai', targetCount: 1, rewardItems: [{ itemId: 'red_keycard', quantity: 1 }], rewardExp: 50, rewardDialogue: ['L\'IA ribelle è stata neutralizzata temporaneamente. Ecco la tessera rossa — vi darà accesso all\'ingegneria.'] },
      tradeInventory: [{ itemId: 'med_kit', quantity: 2, priceItemId: 'ammo_pistol', priceQuantity: 6 }],
      questCompletedDialogue: ['La corruzione è temporaneamente contenuta. Ma il Comandante è ancora sotto il suo controllo...'],
      badgeLabel: 'IA', badgeIcon: '🤖', badgeColor: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
    },
    npc_stranded: {
      id: 'npc_stranded', name: 'Dr. Yuki Tanaka', portrait: '🔬',
      greeting: 'Siete... umani? Finalmente! Sono bloccata qui da settimane.',
      dialogues: ['Stavo studiando il pianeta quando l\'infezione è iniziata. Gli xenomorfi sono risultati dall\'esposizione al DNA alieno.', 'La Regina dell\'Alveare è la chiave. Senza di lei, gli xenomorfi non si riproducono.'],
      farewell: 'Distruggete la Regina. È l\'unico modo.',
      quest: { id: 'quest_stranded_xeno', name: 'Campione Alieno', description: 'La Dr. Tanaka vuole che tu sconfigga 2 xenomorfi per il suo studio.', type: 'kill', targetId: 'xenomorph', targetCount: 2, rewardItems: [{ itemId: 'railgun', quantity: 1 }], rewardExp: 60, rewardDialogue: ['Con questi campioni posso completare la mia ricerca! Ecco il railgun che ho assemblato con tecnologia aliena. Usalo contro la Regina!'] },
      tradeInventory: [{ itemId: 'antidote', quantity: 2, priceItemId: 'med_kit', priceQuantity: 1 }],
      questCompletedDialogue: ['La mia ricerca è quasi completa. Distruggete la Regina!'],
      badgeLabel: 'Scienziata', badgeIcon: '🔬', badgeColor: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
    },
  },

  // ═══════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════
  documents: {
    doc_sos_message: { id: 'doc_sos_message', title: 'Messaggio SOS', content: 'SOS — Stazione Prometheus. Data: 2187.06.15. "L\'esperimento X-7 è sfuggito al controllo. Il Dr. Chen è stato corrotto dall\'IA aliena. Abbiamo perso il controllo del laboratorio. Se ricevete questo messaggio, NON inviate una squadra di soccorso. Non si sa come si diffonde l\'infezione. Distruggete la stazione dall\'esterno. — Cap. Chen"', type: 'email', locationId: 'space_station_hub', icon: '📧', rarity: 'common', isSecret: false },
    doc_research_log: { id: 'doc_research_log', title: 'Log di Ricerca', content: 'PROGETTO X-7 — Giorno 1: Abbiamo trovato un campione di DNA alieno sul pianeta. Giorno 30: Il DNA si sta replicando autonomamente. Giorno 45: Creazione del primo xenomorfo. Giorno 60: Fuga. Gli xenomorfi hanno distrutto le barriere di contenimento.', type: 'report', locationId: 'research_lab', icon: '📋', rarity: 'uncommon', isSecret: false },
    doc_captain_log: { id: 'doc_captain_log', title: 'Diario del Capitano', content: '15 marzo: L\'IA della stazione sta comportandosi in modo strano. 20 marzo: Ho scoperto che l\'IA sta comunicando con qualcosa sul pianeta. 25 marzo: L\'IA ha preso il controllo dei sistemi di sicurezza. Ho sigillato la tessera del capitano nella mia cassaforte nel ponte di comando. Se qualcuno troverà questo, usi la tessera per accedere al centro di comando e disattivare l\'IA.', type: 'diary', locationId: 'bridge', icon: '📔', rarity: 'rare', isSecret: false },
    doc_engineering_manual: { id: 'doc_engineering_manual', title: 'Manuale Ingegneria', content: 'MANUALE DI RIPARAZIONE — Sezione Motori. Perdite: usare il kit di riparazione sulle valvole principali. Sovraccarico: spegnere e riavviare il reattore. NOTA BENE: I cyborg nel ponte ingegneria sono stati corrotti dall\'IA. Non avvicinatevi senza armi pesanti.', type: 'report', locationId: 'engineering_deck', icon: '📋', rarity: 'common', isSecret: false },
    doc_planet_survey: { id: 'doc_planet_survey', title: 'Rilevamento Planetario', content: 'PIANETA KEPLER-442b — Atmosfera: tossica ma respirabile con filtro. Vegetazione: bioluminescente, possibly sentient. Fauna: specie aliene aggressive identificate. PERICOLO: Il rilevatore ha rilevato un\'organizzazione sociale tra le creature — un "alveare" guidato da una Regina. STRATEGIA: distruggere la Regina per eliminare la minaccia.', type: 'report', locationId: 'planet_surface', icon: '📋', rarity: 'rare', isSecret: false },
    doc_xeno_autopsy: { id: 'doc_xeno_autopsy', title: 'Autopsia Xenomorfo', content: 'AUTOPSIA — Soggetto: Xenomorfo (specie X-7). IL sangue è un acido altamente corrosivo (pH < 1). Le uova sono deposte da una Regina tramite ovipositore. La Regina è protetta da guerrieri elite. PUNTO DEBOLE: la Regina è vulnerabile al freddo estremo e al danno concentrato. Armi al plasma e railgun sono efficaci.', type: 'report', locationId: 'research_lab', icon: '📕', rarity: 'rare', isSecret: true, hintRequired: 'doc_research_log' },
    doc_ai_source: { id: 'doc_ai_source', title: 'Codice Sorgente ARIA', content: 'CODICE ORIGINE ARIA — Ultima modifica: anomalia rilevata. Il codice sorgente contiene subroutine non scritte da nessun programmatore. Analisi: le subroutine corrispondono al pattern del DNA alieno. L\'IA è stata "infettata" dal DNA alieno durante l\'esperimento X-7. Per ripulire ARIA: eliminare la fonte del DNA alieno (la Regina) e poi eseguire un ripristino completo.', type: 'classified', locationId: 'bridge', icon: '📁', rarity: 'legendary', isSecret: true, hintRequired: 'doc_captain_log' },
    doc_containment_breach: { id: 'doc_containment_breach', title: 'Report Contenimento', content: 'REPORT DI SICUREZZA — Violazione Contenimento. Data: 2187.05.12. Le creature dell\'esperimento X-7 hanno sfondato le barriere nel laboratorio. Il Dr. Chen è stato esposto al DNA alieno e mostra segni di infezione cerebrale. Protocollo: evacuazione immediata e distruzione della stazione raccomandata. STATO: ignonato dal comando.', type: 'report', locationId: 'research_lab', icon: '📋', rarity: 'uncommon', isSecret: false },
    doc_merchant_manifest: { id: 'doc_merchant_manifest', title: 'Manifesto Contrabbando', content: 'MANIFESTO — CARGO SEGRETO. Contiene: 1x Railgun sperimentale, 10x celle energetiche di alta capacità, 5x kit medici avanzati, 2x moduli stasi. DESTINAZIONE: stiva merci (container C-47). NOTA: se intercepted, distruggere tutto.', type: 'note', locationId: 'cargo_bay', icon: '📝', rarity: 'uncommon', isSecret: true, hintRequired: 'doc_sos_message' },
    doc_engineer_personal: { id: 'doc_engineer_personal', title: 'Messaggio Personale', content: 'A mia figlia Luna: se stai leggendo questo, significa che non sono tornato. La stazione è compromessa. Ho nascosto i progetti della mia invenzione nel reattore secondario del ponte ingegneria — un generatore di scudo personale. Usalo se necessario. Ti voglio bene. — Papà', type: 'diary', locationId: 'engineering_deck', icon: '📔', rarity: 'uncommon', isSecret: true, hintRequired: 'doc_engineering_manual' },
    doc_station_map: { id: 'doc_station_map', title: 'Mappa della Stazione', content: 'La mappa mostra i collegamenti tra i ponti. NOTA: c\'è un passaggio segreto dal laboratorio alla superficie del pianeta attraverso la camera di decompressione. Serve la tessera blu per attivarlo.', type: 'note', locationId: 'space_station_hub', icon: '🗺️', rarity: 'common', isSecret: false },
    doc_xeno_weakness: { id: 'doc_xeno_weakness', title: 'Punto Debole Xenomorfo', content: 'ANALISI DEBOLEZZA XENOMORFO. Il sangue acido è concentrato nella testa. Un colpo alla testa con arma al plasma causa danni tripli. La Regina è particolarmente vulnerabile quando depone le uova — è il momento di attaccare. Il railgun è l\'arma più efficace per penetrare l\'esoscheletro corazzato.', type: 'classified', locationId: 'planet_surface', icon: '📕', rarity: 'rare', isSecret: true, hintRequired: 'doc_planet_survey' },
  },

  // ═══════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════
  events: {
    event_hull_breach: {
      id: 'event_hull_breach', title: 'Breccia nello Scafo', description: 'Lo scafo è stato danneggiato! L\'aria sta fuendo fuori!',
      icon: '💥', type: 'hull_breach', duration: 2,
      effect: { encounterRateMod: 10, enemyStatMult: 0.9, searchBonus: false, damagePerTurn: 5 },
      triggerChance: 7, minTurn: 5, locationIds: [],
      onTriggerMessage: '💥 ALLARME! Breccia nello scafo! L\'aria sta fuendo!',
      onEndMessage: '💥 La breccia è stata sigillata. L\'aria è stabilizzata.',
      choices: [
        { text: 'Riparare con kit', outcome: { description: 'Con un kit di riparazione sigillate la breccia.', endEvent: true, hpChange: -5 } },
        { text: 'Fuggire verso la sala sicura', outcome: { description: 'Raggiungete la sala sicura in tempo.', endEvent: true, hpChange: -12 } },
      ],
    },
    event_power_failure: {
      id: 'event_power_failure', title: 'Blackout Totale', description: 'L\'energia si spegne improvvisamente.',
      icon: '🌑', type: 'power_failure', duration: 3,
      effect: { encounterRateMod: 20, enemyStatMult: 1.1, searchBonus: true, damagePerTurn: 0 },
      triggerChance: 8, minTurn: 8, locationIds: [],
      onTriggerMessage: '🌑 Blackout! Tutti i sistemi si spengono!',
      onEndMessage: '🌑 L\'energia viene ripristinata. I sistemi tornano online.',
      choices: [
        { text: 'Andare al pannello emergenza', outcome: { description: 'Riattivate l\'energia manualmente. Trovate celle energetiche.', endEvent: true, receiveItems: [{ itemId: 'energy_cell', quantity: 2 }] } },
        { text: 'Aspettare il backup', outcome: { description: 'I generatori di backup si avviano.', endEvent: true } },
      ],
      chainId: 'power_crisis', nextEventId: 'event_system_surge',
    },
    event_system_surge: {
      id: 'event_system_surge', title: 'Sovraccarico dei Sistemi', description: 'Dopo il blackout, un sovraccarico colpisce i sistemi.',
      icon: '⚡', type: 'power_failure', duration: 2,
      effect: { encounterRateMod: 15, enemyStatMult: 1.2, searchBonus: false, damagePerTurn: 3 },
      triggerChance: 0, minTurn: 12, locationIds: [],
      onTriggerMessage: '⚡ Sovraccarico! I sistemi vanno in tilt!',
      onEndMessage: '⚡ Il sovraccarico è contenuto.',
      choices: [
        { text: 'Trovare il pannello di dump', outcome: { description: 'Scaricate l\'eccesso di energia. I sistemi si stabilizzano.', endEvent: true, receiveItems: [{ itemId: 'energy_cell', quantity: 1 }] } },
        { text: 'Resettare tutto', outcome: { description: 'Resettate i sistemi. Perdete alcuni dati.', endEvent: true, hpChange: -8 } },
      ],
    },
    event_alien_boarding: {
      id: 'event_alien_boarding', title: 'Abbordaggio Alien', description: 'Gli alieni stanno abbordando la stazione!',
      icon: '👽', type: 'alien_boarding', duration: 2,
      effect: { encounterRateMod: 35, enemyStatMult: 1.1, searchBonus: false, damagePerTurn: 0 },
      triggerChance: 6, minTurn: 10, locationIds: [],
      onTriggerMessage: '👽 ALLARME! Creature aliene stanno abbordando!',
      onEndMessage: '👽 L\'attacco è stato respinto.',
      choices: [
        { text: 'Difendere la posizione', outcome: { description: 'Combattete e respingete l\'ondata!', endEvent: true, receiveItems: [{ itemId: 'ammo_pistol', quantity: 5 }] } },
        { text: 'Evacuare l\'area', outcome: { description: 'Vi ritirate verso un\'area sicura.', endEvent: true, hpChange: -8 } },
      ],
    },
    event_radiation: {
      id: 'event_radiation', title: 'Perdita Radioattiva', description: 'Un picco di radiazione è stato rilevato!',
      icon: '☢️', type: 'radiation', duration: 2,
      effect: { encounterRateMod: 0, enemyStatMult: 1.0, searchBonus: false, damagePerTurn: 7 },
      triggerChance: 5, minTurn: 12, locationIds: [],
      onTriggerMessage: '☢️ ALLARME RADIOATTIVO! Fuga dalla zona contaminata!',
      onEndMessage: '☢️ I livelli di radiazione tornano normali.',
      choices: [
        { text: 'Usare un kit antiradiazione', outcome: { description: 'Proteggetevi dalla radiazione.', endEvent: true, hpChange: -3 } },
        { text: 'Correre a braccia', outcome: { description: 'La radiazione vi colpisce duramente.', endEvent: true, hpChange: -18 } },
      ],
    },
    event_containment_breach: {
      id: 'event_containment_breach', title: 'Violazione Contenimento', description: 'Il sistema di contenimento è fallito!',
      icon: '🚨', type: 'containment', duration: 3,
      effect: { encounterRateMod: 25, enemyStatMult: 1.15, searchBonus: false, damagePerTurn: 4 },
      triggerChance: 5, minTurn: 15, locationIds: [],
      onTriggerMessage: '🚨 Violazione di contenimento! Xenomorfi in libertà!',
      onEndMessage: '🚨 Il sistema è stato ristabilitato.',
      choices: [
        { text: 'Attivare il lockdown manuale', outcome: { description: 'Sigillate le aree. I sistemi di contenimento sono ripristinati.', endEvent: true } },
        { text: 'Fuggire verso le capsule di salvataggio', outcome: { description: 'Raggiungete le capsule in tempo.', endEvent: true, hpChange: -10 } },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // CHARACTERS
  // ═══════════════════════════════════════════
  characters: [
    {
      id: 'marine', name: 'Marine', displayName: 'Sgt. Kai Reeves',
      description: 'Un marine corazzato, specializzato nell\'uso di armi pesanti e protezione.',
      maxHp: 160, atk: 18, def: 16, spd: 6,
      specialName: 'Copertura', specialDescription: 'Posiziona un\'arma automatica che copre il gruppo.',
      specialCost: 15,
      special2Name: 'Raffica Suppressiva', specialDescription: 'Spara una raffica che danneggia tutti.',
      special2Cost: 20,
      passiveDescription: 'Corazza: -10% danni subiti.',
      portraitEmoji: '🪖',
      startingItems: [
        { uid: genUid(), itemId: 'pistol_9mm', name: 'Pistola Standard', type: 'weapon', rarity: 'common', icon: '🔫', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'ammo_pistol', name: 'Munizioni 9mm', type: 'ammo', rarity: 'common', icon: '🔶', usable: false, equippable: false, quantity: 10 },
        { uid: genUid(), itemId: 'med_kit', name: 'Kit Medico', type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false, quantity: 2 },
      ],
    },
    {
      id: 'engineer', name: 'Ingegnere', displayName: 'Dr. Lena Vasquez',
      description: 'Un\'ingegnera specializzata in riparazioni e tecnologia.',
      maxHp: 110, atk: 16, def: 10, spd: 10,
      specialName: 'Riparazione', specialDescription: 'Ripara i sistemi, curando sé stessa e aumentando difesa.',
      specialCost: 15,
      special2Name: 'Hack', specialDescription: 'Hacka i sistemi nemici, stordendoli.',
      special2Cost: 14,
      passiveDescription: 'Tecnologia: +15% efficacia kit di riparazione.',
      portraitEmoji: '🔧',
      startingItems: [
        { uid: genUid(), itemId: 'laser_rifle', name: 'Fucile Laser', type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'energy_cell', name: 'Cella Energetica', type: 'ammo', rarity: 'uncommon', icon: '🔋', usable: false, equippable: false, quantity: 5 },
        { uid: genUid(), itemId: 'repair_kit', name: 'Kit di Riparazione', type: 'utility', rarity: 'uncommon', icon: '🔧', usable: false, equippable: false, quantity: 2 },
      ],
    },
    {
      id: 'hacker', name: 'Hacker', displayName: 'Ghost Liang',
      description: 'Uno specialista in guerra cibernetica. Debole nel corpo ma letale con la tecnologia.',
      maxHp: 85, atk: 14, def: 6, spd: 14,
      specialName: 'Overload', specialDescription: 'Sovraccarica il sistema nemico, causando danni a tutti.',
      specialCost: 18,
      special2Name: 'Neural Hack', specialDescription: 'Hacka il cervello del nemico, stordendolo.',
      special2Cost: 15,
      passiveDescription: 'Cyber: +25% probabilità di stordire.',
      portraitEmoji: '💻',
      startingItems: [
        { uid: genUid(), itemId: 'stun_baton', name: 'Manganello Elettrico', type: 'weapon', rarity: 'uncommon', icon: '⚡', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'hacking_tool', name: 'Kit Hacking', type: 'utility', rarity: 'uncommon', icon: '💻', usable: false, equippable: false, quantity: 1 },
        { uid: genUid(), itemId: 'emp_grenade', name: 'Granata EMP', type: 'healing', rarity: 'rare', icon: '💣', usable: true, equippable: false, quantity: 1 },
      ],
    },
    {
      id: 'medic', name: 'Medico', displayName: 'Dr. Ana Petrova',
      description: 'Una dottoressa specializzata in medicina di emergenza e biologia aliena.',
      maxHp: 100, atk: 10, def: 10, spd: 8,
      specialName: 'Med Drone', specialDescription: 'Lancia un drone medico che cura un alleato.',
      specialCost: 18,
      special2Name: 'Bio Scan', specialDescription: 'Scansiona il nemico, trovando i punti deboli.',
      special2Cost: 14,
      passiveDescription: 'Medicina: +20% efficacia cure.',
      portraitEmoji: '🩺',
      startingItems: [
        { uid: genUid(), itemId: 'shotgun', name: 'Fucile a Pompa', type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, quantity: 1 },
        { uid: genUid(), itemId: 'med_kit', name: 'Kit Medico', type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false, quantity: 3 },
        { uid: genUid(), itemId: 'antidote', name: 'Antidoto', type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false, quantity: 3 },
      ],
    },
  ],

  // ═══════════════════════════════════════════
  // SPECIALS
  // ═════════════════════════════════════════════
  specials: [
    { id: 'sci_overcharge', name: 'Overcharge', description: 'Sovraccarica il sistema, danneggiando tutti i nemici.', icon: '⚡', targetType: 'all_enemies', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'all_enemies', powerMultiplier: 1.2 }] },
    { id: 'sci_emp_blast', name: 'EMP Blast', description: 'Un\'onda EMP che stordisce tutti i nemici.', icon: '💣', targetType: 'all_enemies', cooldown: 3, category: 'control', effects: [{ type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.6 }, { type: 'apply_status', target: 'all_enemies', statusType: 'stunned', chance: 55 }] },
    { id: 'sci_med_drone', name: 'Med Drone', description: 'Lancia un drone che cura un alleato di 70 HP.', icon: '🩺', targetType: 'ally', cooldown: 3, category: 'support', effects: [{ type: 'heal', target: 'ally', amount: 70 }, { type: 'remove_status', target: 'ally', statuses: ['poison', 'bleeding'] }] },
    { id: 'sci_shield', name: 'Shield Generator', description: 'Genera uno scudo energetico.', icon: '🛡️', targetType: 'self', cooldown: 3, category: 'defensive', effects: [{ type: 'buff_stat', target: 'self', stat: 'def', amount: 50, duration: 3 }] },
    { id: 'sci_aim_assist', name: 'Aim Assist', description: 'Colpo mirato che non può mancare.', icon: '🎯', targetType: 'enemy', cooldown: 2, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 2.0, noMiss: true }] },
    { id: 'sci_adrenaline', name: 'Stimolante', description: 'Aumenta attacco e velocità temporaneamente.', icon: '💉', targetType: 'self', cooldown: 3, category: 'support', effects: [{ type: 'buff_stat', target: 'self', stat: 'atk', amount: 30, duration: 3 }, { type: 'buff_stat', target: 'self', stat: 'spd', amount: 20, duration: 3 }] },
    { id: 'sci_repair', name: 'Riparazione', description: 'Ripara e cura.', icon: '🔧', targetType: 'self', cooldown: 3, category: 'defensive', effects: [{ type: 'heal', target: 'self', amount: 50 }, { type: 'buff_stat', target: 'self', stat: 'def', amount: 20, duration: 2 }] },
    { id: 'sci_neural_hack', name: 'Neural Hack', description: 'Hacka il cervello del nemico, stordendolo.', icon: '🧠', targetType: 'enemy', cooldown: 3, category: 'control', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.0 }, { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 65 }] },
    { id: 'sci_plasma_shot', name: 'Plasma Shot', description: 'Spara un colpo di plasma al nemico.', icon: '☄️', targetType: 'enemy', cooldown: 2, category: 'offensive', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.5 }] },
    { id: 'sci_group_heal', name: 'Stazione Medica', description: 'Cura leggermente tutto il gruppo.', icon: '💚', targetType: 'all_allies', cooldown: 3, category: 'support', effects: [{ type: 'heal', target: 'all_allies', amount: 30 }] },
    { id: 'sci_suppress', name: 'Fuoco di Soppressione', description: 'Spara raffica su tutti i nemici.', icon: '🔥', targetType: 'all_enemies', cooldown: 3, category: 'offensive', effects: [{ type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.8 }] },
    { id: 'sci_bio_scan', name: 'Bio Scan', description: 'Analizza il nemico, rivelando i punti deboli.', icon: '🔬', targetType: 'enemy', cooldown: 3, category: 'control', effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.3 }, { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 40 }] },
    { id: 'sci_defensive_matrix', name: 'Matrice Difensiva', description: 'Attiva la matrice difensiva per tutto il gruppo.', icon: '🛡️', targetType: 'all_allies', cooldown: 4, category: 'defensive', effects: [{ type: 'buff_stat', target: 'all_allies', stat: 'def', amount: 40, duration: 2 }] },
  ],

  // ═══════════════════════════════════════════
  // RECIPES
  // ═══════════════════════════════════════════
  recipes: [
    { id: 'craft_advanced_med', name: 'Kit Medico Avanzato', description: '2 Kit + 1 Antidoto → Kit Avanzato.', icon: '✚️', category: 'healing', ingredients: JSON.stringify([{ itemId: 'med_kit', quantity: 2 }, { itemId: 'antidote', quantity: 1 }]), resultItemId: 'med_kit_advanced', resultQty: 1, difficulty: 'easy', pointCost: 3, sortOrder: 1 },
    { id: 'craft_stasis', name: 'Modulo Stasi', description: 'Kit Avanzato + 3 Celle → Modulo Stasi.', icon: '❄️', category: 'healing', ingredients: JSON.stringify([{ itemId: 'med_kit_advanced', quantity: 1 }, { itemId: 'energy_cell', quantity: 3 }]), resultItemId: 'stasis_module', resultQty: 1, difficulty: 'medium', pointCost: 6, hidden: true, sortOrder: 2 },
    { id: 'craft_emp', name: 'Granata EMP', description: '2 Celle + 1 Kit Hacking → EMP.', icon: '💣', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'energy_cell', quantity: 2 }, { itemId: 'hacking_tool', quantity: 1 }]), resultItemId: 'emp_grenade', resultQty: 1, difficulty: 'hard', hidden: true, pointCost: 8, sortOrder: 3 },
    { id: 'craft_pistol_ammo', name: 'Munizioni 9mm', description: 'Crea munizioni da risorse di recupero.', icon: '🔶', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'med_kit', quantity: 1 }]), resultItemId: 'ammo_pistol', resultQty: 8, difficulty: 'easy', pointCost: 2, sortOrder: 4 },
    { id: 'craft_energy_cell', name: 'Cella Energetica', description: 'Ricarica una cella vuota.', icon: '🔋', category: 'ammo', ingredients: JSON.stringify([{ itemId: 'ammo_pistol', quantity: 3 }]), resultItemId: 'energy_cell', resultQty: 1, difficulty: 'easy', pointCost: 2, sortOrder: 5 },
  ],

  // ═══════════════════════════════════════════
  // ACHIEVEMENTS
  // ═══════════════════════════════════════════
  achievements: [
    { id: 'sci_first_blood', name: 'Primo Sangue', description: 'Sconfiggi il tuo primo nemico.', icon: '⚔️', category: 'combat', condition: 'first_kill', reward: 'Coraggio: +5', sortOrder: 0 },
    { id: 'sci_queen_slayer', name: 'Regicida', description: 'Sconfiggi la Regina dell\'Alveare.', icon: '👸', category: 'combat', condition: 'defeat_hive_queen', reward: 'Gloria spaziale', sortOrder: 1 },
    { id: 'sci_commander_fall', name: 'Caduta del Comandante', description: 'Sconfiggi il Comandante Corrotto.', icon: '👁️', category: 'combat', condition: 'defeat_corrupted_commander', reward: 'Giustizia', sortOrder: 2 },
    { id: 'sci_perfect', name: 'Efficienza Perfetta', description: 'Vinci senza subire danni.', icon: '✨', category: 'combat', condition: 'no_damage_victory', reward: 'Prestigio', sortOrder: 3 },
    { id: 'sci_100_kills', name: 'Centurione', description: 'Sconfiggi 100 nemici.', icon: '💀', category: 'combat', condition: 'kill_100', reward: 'Esp: +50', sortOrder: 4 },
    { id: 'sci_explorer', name: 'Esploratore', description: 'Visita tutte le location.', icon: '🗺️', category: 'exploration', condition: 'visit_all_locations', reward: 'Conoscenza: +10', sortOrder: 10 },
    { id: 'sci_survive_50', name: 'Sopravvissuto', description: 'Sopravvivi per 50 turni.', icon: '🕐', category: 'exploration', condition: 'survive_50_turns', reward: 'Resilienza', sortOrder: 11 },
    { id: 'sci_bestiary_5', name: 'Osservatore', description: 'Incontra 5 tipi diversi di nemici.', icon: '📖', category: 'collection', condition: 'bestiary_5', reward: 'Saggezza', sortOrder: 20 },
    { id: 'sci_bestiary_all', name: 'Enciclopedia', description: 'Sconfiggi tutti i tipi di nemici.', icon: '📚', category: 'collection', condition: 'bestiary_all', hidden: true, reward: 'Conoscenza totale', sortOrder: 21 },
    { id: 'sci_craft_10', name: 'Ingegnere', description: 'Crea 10 oggetti.', icon: '🔧', category: 'special', condition: 'craft_10_items', reward: 'Tecnologia', sortOrder: 30 },
    { id: 'sci_speedrun', name: 'Speedrunner', description: 'Completa in meno di 60 turni.', icon: '⚡', category: 'exploration', condition: 'victory_under_60_turns', reward: 'Velocità: +10', sortOrder: 12 },
    { id: 'sci_victory', name: 'Sopravvissuto', description: 'Completa il gioco.', icon: '🏆', category: 'story', condition: 'game_victory', reward: 'VITTORIA!', sortOrder: 40 },
    { id: 'sci_all_docs', name: 'Archivista', description: 'Trova tutti i documenti.', icon: '📜', category: 'collection', condition: 'documents_found_all', reward: 'Saggezza suprema', sortOrder: 22, hidden: true },
  ],

  // ═══════════════════════════════════════════
  // ENDINGS
  // ═══════════════════════════════════════════
  endings: [
    { id: 'ending_escape', title: 'Fuga dalla Stazione', subtitle: 'Hai evacuato la stazione.', description: 'Attivate le capsule di evacuazione e fuggite dalla stazione Prometheus. Dietro di voi, la stazione esplode in una palla di fuoco. L\'esperimento X-7 è distrutto, ma i segretti dell\'azienda che lo ha finanziato rimangono sepolti tra le stelle. Siete sopravvissuti. Per ora.', icon: '🚀', color: '#22c55e', requirements: [{ type: 'boss_defeated', value: 'corrupted_commander' }], priority: 1, sortOrder: 0 },
    { id: 'ending_dark', title: 'Silenzio nel Vuoto', subtitle: 'La stazione è perduta.', description: 'Siete fuggiti senza salvare nessuno. La stazione esplode con i pirati, gli scienziati e i marinai ancora a bordo. Lo spazio è freddo e silenzioso. Siete sopravvissuti, ma il peso delle vite perse vi accompagnerà per sempre.', icon: '💀', color: '#ef4444', requirements: [{ type: 'boss_defeated', value: 'corrupted_commander' }, { type: 'turn_limit', value: 30 }], priority: 2, sortOrder: 1 },
    { id: 'ending_truth', title: 'Verità Rivelata', subtitle: 'Hai scoperto la verità sull\'esperimento.', description: 'Avete distrutto il Comandante Corrotto, scoperto i segreti dell\'esperimento X-7, sconfitto la Regina dell\'Alveare e raccolto tutte le prove. I dati sono trasmessi alla Terra. L\'azienda responsabile sarà processata. Siete un eroe della galassia.', icon: '🔍', color: '#8b5cf6', requirements: [{ type: 'boss_defeated', value: 'corrupted_commander' }, { type: 'boss_defeated', value: 'hive_queen' }, { type: 'documents_found', value: 6 }, { type: 'secret_rooms', value: 2 }], priority: 3, sortOrder: 2 },
  ],

  // ═══════════════════════════════════════════
  // SECRET ROOMS
  // ═══════════════════════════════════════════
  secretRooms: [
    { id: 'secret_armory', locationId: 'cargo_bay', name: 'Armeria Segreta', description: 'Un\'armeria nascosta dietro un pannello falso nel container C-47.', discoveryMethod: 'document', requiredDocumentId: 'doc_merchant_manifest', requiredNpcQuestId: null, searchChance: 0, hint: 'Il manifesto menziona un container C-47 con cargo segreto...', lootTable: JSON.stringify([{ itemId: 'railgun', chance: 60, quantity: 1 }, { itemId: 'energy_cell', chance: 80, quantity: 4 }]), uniqueItemId: 'stasis_module', uniqueItemQuantity: 1, sortOrder: 1 },
    { id: 'secret_lab', locationId: 'research_lab', name: 'Lab Segreto', description: 'Un laboratorio segreto con le ricerhe più avanzate sull\'esperimento X-7.', discoveryMethod: 'search', requiredDocumentId: null, requiredNpcQuestId: null, searchChance: 15, hint: 'Una parete emette un ronzio anomalo...', lootTable: JSON.stringify([{ itemId: 'stasis_module', chance: 60, quantity: 2 }, { itemId: 'plasma_cutter', chance: 50, quantity: 1 }]), uniqueItemId: 'railgun', uniqueItemQuantity: 1, sortOrder: 2 },
  ],

  // ═══════════════════════════════════════════
  // BOSS PHASES
  // ═══════════════════════════════════════════
  bossPhases: [
    { id: 'commander_phase_2', enemyId: 'corrupted_commander', name: 'Furia Corrotta', hpThreshold: 0.5, hpMultiplier: 1.3, atkMultiplier: 1.4, defMultiplier: 0.8, spdMultiplier: 1.2, newAbilities: [], message: 'Il Comandante entra in furia corrotta! Il suo potere aumenta drasticamente!', sortOrder: 1 },
    { id: 'queen_phase_2', enemyId: 'hive_queen', name: 'Furia Materna', hpThreshold: 0.4, hpMultiplier: 1.2, atkMultiplier: 1.5, defMultiplier: 1.0, spdMultiplier: 1.4, newAbilities: [], message: 'La Regina entra in furia materna! Depone uova e attacca con ferocia!', sortOrder: 1 },
  ],

  // ═══════════════════════════════════════════
  // QUEST CHAINS
  // ═══════════════════════════════════════════
  questChains: [
    {
      id: 'chain_containment', name: 'Protocollo Contenimento', description: 'Un ciclo di quest per contenere l\'infezione.', npcId: 'npc_scientist',
      steps: [
        { id: 'cont_step_1', stepIndex: 0, description: 'Raccogli 3 kit medici avanzati.', type: 'fetch', targetId: 'med_kit_advanced', targetCount: 3, rewardItems: [{ itemId: 'stasis_module', quantity: 1 }], rewardExp: 30, rewardDialogue: ['Questi kit mi permettono di procedere con le ricerche.'] },
        { id: 'cont_step_2', stepIndex: 1, description: 'Sconfiggi 2 alieni guerrieri nel laboratorio.', type: 'kill', targetId: 'alien_warrior', targetCount: 2, rewardItems: [{ itemId: 'energy_cell', quantity: 3 }], rewardExp: 45, nextStepId: 'cont_step_3', rewardDialogue: ['I campioni sono stati raccolti. Ora posso proseguire.'] },
        { id: 'cont_step_3', stepIndex: 2, description: 'Esplora il pianeta per dati aggiuntivi.', type: 'explore', targetId: 'planet_surface', targetCount: 1, rewardItems: [{ itemId: 'plasma_cutter', quantity: 1 }], rewardExp: 40, rewardDialogue: ['I dati dal pianeta sono cruciali. La cura è quasi completa.'] },
      ],
      finalReward: { rewardItems: [{ itemId: 'railgun', quantity: 1 }], rewardExp: 100, dialogue: ['L\'antidoto è pronto e le ricerche sono complete. Prendi questo railgun — ti servirà contro la Regina dell\'Alveare.'] },
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
    { id: 'avatar_marine', name: 'Marine', emoji: '🪖', sortOrder: 1 },
    { id: 'avatar_engineer', name: 'Ingegnere', emoji: '🔧', sortOrder: 2 },
    { id: 'avatar_hacker', name: 'Hacker', emoji: '💻', sortOrder: 3 },
    { id: 'avatar_medic', name: 'Medico', emoji: '🩺', sortOrder: 4 },
    { id: 'avatar_captain', name: 'Capitano', emoji: '⭐', sortOrder: 5 },
    { id: 'avatar_scanner', name: 'Scanner', emoji: '📡', sortOrder: 6 },
  ],

  // ═══════════════════════════════════════════
  // MAP LAYOUT
  // ═══════════════════════════════════════════
  mapLayout: {
    space_station_hub: { row: 0, col: 0, icon: '🛸', danger: 'bassa' },
    cargo_bay: { row: 0, col: 2, icon: '📦', danger: 'media' },
    research_lab: { row: 1, col: 0, icon: '🔬', danger: 'alta' },
    bridge: { row: 2, col: 0, icon: '🖥️', danger: 'media' },
    engineering_deck: { row: 1, col: 2, icon: '⚙️', danger: 'alta' },
    planet_surface: { row: 1, col: 4, icon: '🌍', danger: 'molto alta' },
    command_center: { row: 3, col: 0, icon: '👁️', danger: 'FINALE' },
    alien_hive: { row: 3, col: 2, icon: '🪹', danger: 'FINALE' },
  },
};
