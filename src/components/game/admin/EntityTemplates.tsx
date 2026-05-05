'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Scroll, Zap, Package, Skull, Users, Trophy, Flag, Sparkles, Crown, Wrench, Link2 } from 'lucide-react';
import type { TabId } from '@/components/game/admin/config/tabGroups';
import { TABS } from '@/components/game/admin/config/tabGroups';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  categoryIcon?: string;
  data: Record<string, unknown>;
}

interface EntityTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFromTemplate: (tabId: TabId, templateData: Record<string, unknown>) => void;
  activeTab: TabId;
}

// ═══════════════════════════════════════════════════════════════
// Template Definitions — matching FIELD_MAP fields per tab
// ═══════════════════════════════════════════════════════════════
const TEMPLATES: Record<TabId, TemplateDef[]> = {
  // ───────────────────────────────────────────────────────────────
  // ITEMS
  // ───────────────────────────────────────────────────────────────
  items: [
    {
      id: 'weapon_pistol',
      name: 'Pistola M1911',
      description: 'Pistola semiautomatica affidabile, munizioni abbondanti',
      icon: '🔫',
      data: {
        id: 'weapon_pistol',
        name: 'Pistola M1911',
        description: 'Pistola semiautomatica .45 ACP, affidabile e facile da trovare.',
        type: 'weapon',
        rarity: 'common',
        icon: '🔫',
        usable: false,
        equippable: true,
        stackable: false,
        unico: false,
        maxStack: 1,
        weaponType: 'ranged',
        ammoType: 'ammo_pistol',
        modType: '',
        effects: [
          { type: 'on_equip', stat: 'atk', value: 8, mode: 'flat' },
        ],
      },
    },
    {
      id: 'weapon_shotgun',
      name: 'Fucile a Pompa',
      description: 'Potente a distanza ravvicinata, munizioni rare',
      icon: '💥',
      data: {
        id: 'weapon_shotgun',
        name: 'Fucile a Pompa',
        description: 'Fucile a pompa devastante nel corpo a corpo. Munizioni scarse.',
        type: 'weapon',
        rarity: 'uncommon',
        icon: '💥',
        usable: false,
        equippable: true,
        stackable: false,
        unico: false,
        maxStack: 1,
        weaponType: 'ranged',
        ammoType: 'ammo_shotgun',
        modType: '',
        effects: [
          { type: 'on_equip', stat: 'atk', value: 15, mode: 'flat' },
        ],
      },
    },
    {
      id: 'weapon_knife',
      name: 'Coltello da Combattimento',
      description: 'Arma corpo a corpo base, uso illimitato',
      icon: '🗡️',
      data: {
        id: 'weapon_knife',
        name: 'Coltello da Combattimento',
        description: 'Coltello militare affilato. Non consuma munizioni.',
        type: 'weapon',
        rarity: 'common',
        icon: '🗡️',
        usable: false,
        equippable: true,
        stackable: false,
        unico: false,
        maxStack: 1,
        weaponType: 'melee',
        ammoType: '',
        modType: '',
        effects: [
          { type: 'on_equip', stat: 'atk', value: 5, mode: 'flat' },
        ],
      },
    },
    {
      id: 'healing_herb_green',
      name: 'Erba Verde',
      description: 'Ripristina una piccola quantità di HP',
      icon: '🌿',
      data: {
        id: 'healing_herb_green',
        name: 'Erba Verde',
        description: 'Erba medicinale che ripristina 25 HP.',
        type: 'healing',
        rarity: 'common',
        icon: '🌿',
        usable: true,
        equippable: false,
        stackable: true,
        unico: false,
        maxStack: 99,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [
          { type: 'on_use', stat: 'hp', value: 25, mode: 'flat' },
        ],
      },
    },
    {
      id: 'healing_first_aid',
      name: 'Kit Primo Soccorso',
      description: 'Kit medico completo, ripristina molti HP',
      icon: '🩹',
      data: {
        id: 'healing_first_aid',
        name: 'Kit Primo Soccorso',
        description: 'Kit medico completo che ripristina 60 HP.',
        type: 'healing',
        rarity: 'uncommon',
        icon: '🩹',
        usable: true,
        equippable: false,
        stackable: true,
        unico: false,
        maxStack: 5,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [
          { type: 'on_use', stat: 'hp', value: 60, mode: 'flat' },
        ],
      },
    },
    {
      id: 'ammo_pistol',
      name: 'Munizioni Pistola',
      description: 'Munizioni 9mm per pistola',
      icon: '🔮',
      data: {
        id: 'ammo_pistol',
        name: 'Munizioni Pistola',
        description: 'Pacco di munizioni 9mm. 15 colpi.',
        type: 'ammo',
        rarity: 'common',
        icon: '🔮',
        usable: false,
        equippable: false,
        stackable: true,
        unico: false,
        maxStack: 99,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [],
      },
    },
    {
      id: 'ammo_shotgun',
      name: 'Munizioni Fucile',
      description: 'Cartucce da caccia per fucile a pompa',
      icon: '🔶',
      data: {
        id: 'ammo_shotgun',
        name: 'Munizioni Fucile',
        description: 'Cartucce 12 gauge per fucile a pompa. 5 colpi.',
        type: 'ammo',
        rarity: 'uncommon',
        icon: '🔶',
        usable: false,
        equippable: false,
        stackable: true,
        unico: false,
        maxStack: 30,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [],
      },
    },
    {
      id: 'key_id_card',
      name: 'Tessera ID',
      description: 'Tessera di identità per accedere ad aree riservate',
      icon: '🔑',
      data: {
        id: 'key_id_card',
        name: 'Tessera ID',
        description: 'Tessera magnetica che apre porte e aree riservate.',
        type: 'key',
        rarity: 'uncommon',
        icon: '🔑',
        usable: false,
        equippable: false,
        stackable: false,
        unico: true,
        maxStack: 1,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [],
      },
    },
    {
      id: 'bag_small',
      name: 'Zaino Piccolo',
      description: 'Aumenta lo spazio nell\'inventario',
      icon: '🎒',
      data: {
        id: 'bag_small',
        name: 'Zaino Piccolo',
        description: 'Zaino compatto che aumenta la capacità dell\'inventario di 6 slot.',
        type: 'bag',
        rarity: 'common',
        icon: '🎒',
        usable: true,
        equippable: false,
        stackable: false,
        unico: false,
        maxStack: 1,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [],
      },
    },
    {
      id: 'armor_vest',
      name: 'Giubbotto Antiproiettile',
      description: 'Giubbotto balistico che riduce i danni subiti',
      icon: '🛡️',
      data: {
        id: 'armor_vest',
        name: 'Giubbotto Antiproiettile',
        description: 'Giubbotto balistico di livello militare. Riduce i danni subiti.',
        type: 'armor',
        rarity: 'rare',
        icon: '🛡️',
        usable: false,
        equippable: true,
        stackable: false,
        unico: false,
        maxStack: 1,
        weaponType: '',
        ammoType: '',
        modType: '',
        effects: [
          { type: 'on_equip', stat: 'def', value: 10, mode: 'flat' },
        ],
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // ENEMIES
  // ───────────────────────────────────────────────────────────────
  enemies: [
    {
      id: 'zombie_basic',
      name: 'Zombie',
      description: 'Nemico base, lento ma resistente',
      icon: '🧟',
      data: {
        id: 'zombie_basic',
        name: 'Zombie',
        description: 'Un abitante infetto, lento ma tenace. Attacca in gruppo.',
        maxHp: 60,
        atk: 10,
        def: 5,
        spd: 5,
        icon: '🧟',
        expReward: 15,
        lootTable: [],
        abilities: [],
        isBoss: false,
        variantGroup: 'zombie',
        sortOrder: 0,
      },
    },
    {
      id: 'zombie_dog',
      name: 'Cane Infetto',
      description: 'Veloce e aggressivo, attacca in branco',
      icon: '🐕',
      data: {
        id: 'zombie_dog',
        name: 'Cane Infetto',
        description: 'Un cane reso folle dal virus. Veloce e letale.',
        maxHp: 40,
        atk: 15,
        def: 3,
        spd: 12,
        icon: '🐕',
        expReward: 20,
        lootTable: [],
        abilities: [],
        isBoss: false,
        variantGroup: 'cerberus',
        sortOrder: 1,
      },
    },
    {
      id: 'hunter',
      name: 'Hunter',
      description: 'Bioterrorismo avanzato, salta e artiglia',
      icon: '🦎',
      data: {
        id: 'hunter',
        name: 'Hunter',
        description: 'B.O.W. prodotto da Umbrella. Attacca con artigli letali e salti devastanti.',
        maxHp: 120,
        atk: 25,
        def: 15,
        spd: 10,
        icon: '🦎',
        expReward: 50,
        lootTable: [],
        abilities: [],
        isBoss: false,
        variantGroup: 'hunter',
        sortOrder: 3,
      },
    },
    {
      id: 'cerberus',
      name: 'Cerberus',
      description: 'Cane da guardia sperimentale Umbrella',
      icon: '🐺',
      data: {
        id: 'cerberus',
        name: 'Cerberus',
        description: 'Cane da guardia infettato con il T-Virus. Più forte dei cani normali.',
        maxHp: 80,
        atk: 20,
        def: 8,
        spd: 15,
        icon: '🐺',
        expReward: 35,
        lootTable: [],
        abilities: [],
        isBoss: false,
        variantGroup: 'cerberus',
        sortOrder: 2,
      },
    },
    {
      id: 'licker',
      name: 'Licker',
      description: 'Cieco ma con udito supersviluppato e lingua artigliata',
      icon: '👁️',
      data: {
        id: 'licker',
        name: 'Licker',
        description: 'Creatura mutata priva di pelle. Si muove a tentoni con la lingua.',
        maxHp: 100,
        atk: 22,
        def: 10,
        spd: 8,
        icon: '👁️',
        expReward: 40,
        lootTable: [],
        abilities: [],
        isBoss: false,
        variantGroup: 'licker',
        sortOrder: 2,
      },
    },
    {
      id: 'tyrant_boss',
      name: 'T-103 Tyrant',
      description: 'Boss finale: bio-arma umanoide devastante',
      icon: '👾',
      data: {
        id: 'tyrant_boss',
        name: 'T-103 Tyrant',
        description: 'Bio-arma finale di Umbrella. Inarrestabile forza bruta.',
        maxHp: 500,
        atk: 40,
        def: 30,
        spd: 6,
        icon: '👾',
        expReward: 200,
        lootTable: [],
        abilities: [],
        isBoss: true,
        variantGroup: 'tyrant',
        sortOrder: 10,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // LOCATIONS
  // ───────────────────────────────────────────────────────────────
  locations: [
    {
      id: 'city_outskirts',
      name: 'Periferia della Città',
      description: 'Area pericolosa alla periferia, primo contatto con gli infetti',
      icon: '🏚️',
      data: {
        id: 'city_outskirts',
        name: 'Periferia della Città',
        description: 'Strade deserte e case abbandonate. I primi zombi si aggirano qui.',
        encounterRate: 30,
        isBossArea: false,
        bossId: '',
        nextLocations: ['rpd_station'],
        lockedLocations: [],
        mapRow: 0,
        mapCol: 0,
        mapIcon: '🏚️',
        mapDanger: '-1',
        sortOrder: 0,
      },
    },
    {
      id: 'rpd_station',
      name: 'Stazione di Polizia RPD',
      description: 'Commissariato abbandonato, nasconde prove e pericoli',
      icon: '🏛️',
      data: {
        id: 'rpd_station',
        name: 'Stazione di Polizia RPD',
        description: 'Il commissariato di Raccoon City. Una volta simbolo di legge, ora un labirinto di terrore.',
        encounterRate: 25,
        isBossArea: false,
        bossId: '',
        nextLocations: ['underground_lab'],
        lockedLocations: [],
        mapRow: 1,
        mapCol: 0,
        mapIcon: '🏛️',
        mapDanger: '-1',
        sortOrder: 1,
      },
    },
    {
      id: 'underground_lab',
      name: 'Laboratorio Sotterraneo',
      description: 'Laboratorio segreto Umbrella, fonte del contagio',
      icon: '⚗️',
      data: {
        id: 'underground_lab',
        name: 'Laboratorio Sotterraneo',
        description: 'Il cuore della ricerca Umbrella. Strutture di biocontenimento e creature sperimentali.',
        encounterRate: 45,
        isBossArea: false,
        bossId: '',
        nextLocations: [],
        lockedLocations: [],
        mapRow: 2,
        mapCol: 0,
        mapIcon: '⚗️',
        mapDanger: '-1',
        sortOrder: 2,
      },
    },
    {
      id: 'safe_room',
      name: 'Stanza Salva',
      description: 'Area sicura, nessun incontro, salva il progresso',
      icon: '🚪',
      data: {
        id: 'safe_room',
        name: 'Stanza Salva',
        description: 'Una stanza sicura dove riposare e organizzare l\'inventario.',
        encounterRate: 0,
        isBossArea: false,
        bossId: '',
        nextLocations: ['city_outskirts'],
        lockedLocations: [],
        mapRow: 1,
        mapCol: 1,
        mapIcon: '🚪',
        mapDanger: '-1',
        sortOrder: 3,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // NPCs
  // ───────────────────────────────────────────────────────────────
  npcs: [
    {
      id: 'npc_merchant',
      name: 'Mercante',
      description: 'Vende e compra oggetti, ha un inventario di scambi',
      icon: '🧔',
      data: {
        id: 'npc_merchant',
        name: 'Mercante',
        portrait: '🧔',
        locationId: 'safe_room',
        greeting: 'Benvenuto, sopravvissuto! Ho diverse cose che potrebbero interessarti...',
        dialogues: [
          'La situazione fuori è disperata.',
          'Prendi quello che ti serve, ma mi servono anche provviste.',
          'Attento là fuori, non è mai sicuro.',
        ],
        farewell: 'Stai attento là fuori. Torna quando vuoi.',
        questId: '',
        tradeInventory: [
          { itemId: 'healing_herb_green', giveQty: 1, receiveItemId: '', receiveQty: 0, price: 50 },
          { itemId: 'ammo_pistol', giveQty: 5, receiveItemId: '', receiveQty: 0, price: 80 },
          { itemId: 'ammo_shotgun', giveQty: 3, receiveItemId: '', receiveQty: 0, price: 120 },
        ],
        questCompletedDialogue: [],
        sortOrder: 0,
        badgeLabel: 'Mercante',
        badgeIcon: '💰',
        badgeColor: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
        dynamicDialogues: [],
      },
    },
    {
      id: 'npc_quest_giver',
      name: 'NPC Missione',
      description: 'Assegna missioni al giocatore',
      icon: '👤',
      data: {
        id: 'npc_quest_giver',
        name: 'NPC Missione',
        portrait: '👤',
        locationId: 'rpd_station',
        greeting: 'C\'è qualcosa che devi fare per me, sopravvissuto. Ascolta bene...',
        dialogues: [
          'Ho bisogno del tuo aiuto per un lavoro pericoloso.',
          'C\'è una ricompensa per chi porta a termine questa missione.',
        ],
        farewell: 'Non dimenticare quello che ti ho chiesto!',
        questId: 'fetch_quest',
        tradeInventory: [],
        questCompletedDialogue: [
          'Ottimo lavoro! Ecco la tua ricompensa.',
          'Non so come ringraziarti.',
        ],
        sortOrder: 1,
        badgeLabel: 'Missione',
        badgeIcon: '📜',
        badgeColor: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
        dynamicDialogues: [],
      },
    },
    {
      id: 'npc_healer',
      name: 'Curatore',
      description: 'Ripristita la salute del giocatore gratuitamente',
      icon: '👨‍⚕️',
      data: {
        id: 'npc_healer',
        name: 'Curatore',
        portrait: '👨‍⚕️',
        locationId: 'safe_room',
        greeting: 'Sei ferito? Fammi dare un\'occhiata... ti curerò subito.',
        dialogues: [
          'Prenditi cura di te stesso, là fuori è pericoloso.',
          'Riposati qui finché non ti senti meglio.',
        ],
        farewell: 'Riposati bene. Tornerai presto, ne sono certo.',
        questId: '',
        tradeInventory: [],
        questCompletedDialogue: [],
        sortOrder: 2,
        badgeLabel: 'Curatore',
        badgeIcon: '💚',
        badgeColor: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
        dynamicDialogues: [],
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // QUESTS
  // ───────────────────────────────────────────────────────────────
  quests: [
    {
      id: 'fetch_quest',
      name: 'Missione Raccolta',
      description: 'Raccogli oggetti specifici e riportali all\'NPC',
      icon: '📦',
      data: {
        id: 'fetch_quest',
        npcId: 'npc_quest_giver',
        name: 'Consegna Provvisioni',
        description: 'Raccogli 3 Kit Primo Soccorso e portali al mercante nella Stanza Salva.',
        type: 'fetch',
        targetId: 'healing_first_aid',
        targetCount: 3,
        rewardItems: [{ itemId: 'ammo_pistol', qty: 10 }],
        rewardExp: 50,
        rewardDialogue: [
          'Grazie per le provviste! Sono molto utili.',
          'Ecco qualcosa per te in cambio.',
        ],
        sortOrder: 0,
        prerequisiteQuestId: '',
      },
    },
    {
      id: 'kill_quest',
      name: 'Missione Eliminazione',
      description: 'Elimina un certo numero di nemici',
      icon: '⚔️',
      data: {
        id: 'kill_quest',
        npcId: 'npc_quest_giver',
        name: 'Pulisci la Zona',
        description: 'Elimina 5 Zombie nella Periferia della Città per rendere l\'area sicura.',
        type: 'kill',
        targetId: 'zombie_basic',
        targetCount: 5,
        rewardItems: [{ itemId: 'ammo_shotgun', qty: 5 }],
        rewardExp: 75,
        rewardDialogue: [
          'La zona è più sicura ora.',
          'Sei un vero sopravvissuto!',
        ],
        sortOrder: 1,
        prerequisiteQuestId: '',
      },
    },
    {
      id: 'explore_quest',
      name: 'Missione Esplorazione',
      description: 'Esplora una nuova area sulla mappa',
      icon: '🗺️',
      data: {
        id: 'explore_quest',
        npcId: 'npc_quest_giver',
        name: 'Scoperta Scientifica',
        description: 'Esplora il Laboratorio Sotterraneo e scopri cosa ci nasconde Umbrella.',
        type: 'explore',
        targetId: 'underground_lab',
        targetCount: 1,
        rewardItems: [{ itemId: 'armor_vest', qty: 1 }],
        rewardExp: 100,
        rewardDialogue: [
          'Hai scoperto la verità... è terrificante.',
          'Umbrella deve pagare per questo!',
        ],
        sortOrder: 2,
        prerequisiteQuestId: 'fetch_quest',
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // EVENTS
  // ───────────────────────────────────────────────────────────────
  events: [
    {
      id: 'blackout',
      name: 'Blackout',
      description: 'Oscurità totale per 3 turni, incontri aumentati',
      icon: '🌑',
      data: {
        id: 'event_blackout',
        title: 'Blackout',
        description: 'L\'elettricità salta. Oscurità totale avvolge l\'area.',
        icon: '🌑',
        type: 'blackout',
        duration: 3,
        encounterRateMod: 15,
        enemyStatMult: 1.0,
        searchBonus: false,
        damagePerTurn: 0,
        triggerChance: 5,
        minTurn: 5,
        locationIds: ['city_outskirts', 'rpd_station'],
        onTriggerMessage: '💡 Le luci si spengono all\'improvviso! Un buio totale avvolge tutto.',
        onEndMessage: '⚡ L\'elettricità torna lentamente. Le luci si riaccendono.',
        choices: [
          { text: 'Resta al buio e aspetta', effect: 'Attendi 3 turni', consequence: 'none' },
          { text: 'Cerca il quadro elettrico', effect: 'Rischia incontro per ripristinare luce', consequence: 'search' },
        ],
        chainId: '',
        nextEventId: '',
        permanentMapEffect: null,
      },
    },
    {
      id: 'alarm',
      name: 'Allarme',
      description: 'Allarme antintrusione attivato, nemici attratti',
      icon: '🚨',
      data: {
        id: 'event_alarm',
        title: 'Allarme',
        description: 'Un allarme antintrusione si attiva, attirando tutti i nemici nelle vicinanze.',
        icon: '🚨',
        type: 'alarm',
        duration: 2,
        encounterRateMod: 25,
        enemyStatMult: 1.1,
        searchBonus: false,
        damagePerTurn: 0,
        triggerChance: 8,
        minTurn: 3,
        locationIds: ['rpd_station', 'underground_lab'],
        onTriggerMessage: '🚨 SIRENA! Un allame penetrante squarcia il silenzio!',
        onEndMessage: '🔇 L\'allarme si spegne finalmente. Il silenzio torna...',
        choices: [
          { text: 'Scappa via', effect: 'Muoviti in un\'altra location', consequence: 'flee' },
          { text: 'Trova il pannello di controllo', effect: 'Disattiva manualmente l\'allarme', consequence: 'search' },
        ],
        chainId: '',
        nextEventId: '',
        permanentMapEffect: null,
      },
    },
    {
      id: 'nemesis_invasion',
      name: 'Invasione Nemesis',
      description: 'Nemesis attacca! Pericolo estremo per 4 turni',
      icon: '👹',
      data: {
        id: 'event_nemesis_invasion',
        title: 'Invasione Nemesis',
        description: 'S.T.A.R.S...! Nemesis è arrivato. Distrugge tutto sul suo cammino.',
        icon: '👹',
        type: 'nemesis_invasion',
        duration: 4,
        encounterRateMod: 40,
        enemyStatMult: 1.5,
        searchBonus: false,
        damagePerTurn: 10,
        triggerChance: 3,
        minTurn: 10,
        locationIds: ['rpd_station', 'city_outskirts', 'underground_lab'],
        onTriggerMessage: '💀 *TIIIR-R-R-R* Il suolo trema. Un\'ombra gigante si avvicina...',
        onEndMessage: '💨 Nemesis si allontana per ora. Ma tornerà.',
        choices: [
          { text: 'Combatti!', effect: 'Affronta Nemesis direttamente', consequence: 'combat' },
          { text: 'Nasconditi', effect: 'Sperando che passi oltre', consequence: 'hide' },
        ],
        chainId: '',
        nextEventId: '',
        permanentMapEffect: null,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // SPECIALS
  // ───────────────────────────────────────────────────────────────
  specials: [
    {
      id: 'offensive_aoe',
      name: 'Attacco AOE',
      description: 'Attacco ad area che colpisce tutti i nemici',
      icon: '💥',
      data: {
        id: 'special_aoe',
        name: 'Attacco AOE',
        icon: '💥',
        description: 'Lancia un attacco devastante che colpisce tutti i nemici sul campo.',
        category: 'offensive',
        targetType: 'all_enemies',
        cooldown: 3,
        effects: [
          { type: 'deal_damage', target: 'all_enemies', stat: 'hp', value: 30, mode: 'flat' },
        ],
        sortOrder: 0,
      },
    },
    {
      id: 'defensive_shield',
      name: 'Scudo Protettivo',
      description: 'Attiva uno scudo che riduce i danni subiti',
      icon: '🛡️',
      data: {
        id: 'special_shield',
        name: 'Scudo Protettivo',
        icon: '🛡️',
        description: 'Attiva uno scudo energetico che riduce i danni in arrivo.',
        category: 'defensive',
        targetType: 'self',
        cooldown: 4,
        effects: [
          { type: 'buff_stat', target: 'self', stat: 'def', value: 15, mode: 'flat', duration: 3 },
          { type: 'shield', target: 'self', value: 25 },
        ],
        sortOrder: 1,
      },
    },
    {
      id: 'support_heal',
      name: 'Cura di Gruppo',
      description: 'Cura tutti gli alleati nel party',
      icon: '💚',
      data: {
        id: 'special_group_heal',
        name: 'Cura di Gruppo',
        icon: '💚',
        description: 'Ripristina la salute di tutti i membri del party.',
        category: 'support',
        targetType: 'all_allies',
        cooldown: 3,
        effects: [
          { type: 'heal', target: 'all_allies', stat: 'hp', value: 25, mode: 'flat' },
        ],
        sortOrder: 2,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // DOCUMENTS
  // ───────────────────────────────────────────────────────────────
  documents: [
    {
      id: 'diary',
      name: 'Diario Sopravvissuto',
      description: 'Un diario trovato addosso a un sopravvissuto',
      icon: '📓',
      data: {
        id: 'doc_survivor_diary',
        title: 'Diario dello Sopravvissuto',
        content: '<p>14 Giugno — I rumori sono più forti questa notte. Ho visto qualcosa nel corridoio... non era umano. Devo andarmene da qui.</p><p>15 Giugno — Non c\'è via d\'uscita. Le porte sono bloccate. Scrivo queste parole nel caso qualcuno le trovi.</p>',
        type: 'diary',
        locationId: 'rpd_station',
        icon: '📓',
        rarity: 'common',
        isSecret: false,
        hintRequired: '',
      },
    },
    {
      id: 'umbrella_file',
      name: 'File Umbrella',
      description: 'Documento top-secret che rivela il progetto T-Virus',
      icon: '📁',
      data: {
        id: 'doc_umbrella_file',
        title: 'Progetto T-Virus — Rapporto #47',
        content: '<p><strong>CLASSIFICATO: TOP SECRET</strong></p><p>Il T-Virus ha superato le aspettative. I soggetti mostrano aggressività e rigenerazione cellulare avanzata. Il Progetto Tyrant è pronto per la fase finale.</p><p>— Dr. William Birkin</p>',
        type: 'umbrella_file',
        locationId: 'underground_lab',
        icon: '📁',
        rarity: 'rare',
        isSecret: true,
        hintRequired: 'doc_survivor_diary',
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // ACHIEVEMENTS
  // ───────────────────────────────────────────────────────────────
  achievements: [
    {
      id: 'first_kill',
      name: 'Primo Sangue',
      description: 'Sconfiggi il tuo primo nemico',
      icon: '⚔️',
      data: {
        id: 'achievement_first_kill',
        name: 'Primo Sangue',
        description: 'Hai sconfitto il tuo primo nemico. Il viaggio inizia qui.',
        icon: '⚔️',
        category: 'combat',
        condition: 'first_kill',
        hidden: false,
        reward: 'Coraggio: +5',
        sortOrder: 0,
      },
    },
    {
      id: 'explorer',
      name: 'Esploratore',
      description: 'Visita tutte le location sulla mappa',
      icon: '🗺️',
      data: {
        id: 'achievement_explorer',
        name: 'Esploratore',
        description: 'Hai esplorato ogni angolo della mappa. Nessun segreto è rimasto nascosto.',
        icon: '🗺️',
        category: 'exploration',
        condition: 'visit_all_locations',
        hidden: false,
        reward: 'Esplorazione: +10, Mappa: Completa',
        sortOrder: 1,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // ENDINGS
  // ───────────────────────────────────────────────────────────────
  endings: [
    {
      id: 'ending_escape',
      name: 'Fuga',
      description: 'Sfuggi dalla città con la tua vita',
      icon: '🏃',
      data: {
        id: 'ending_escape',
        title: 'Fuga',
        subtitle: 'Sopravvissuto... ma a quale prezzo?',
        description: 'Sei riuscito a fuggire da Raccoon City prima della distruzione. La città brucia alle tue spalle mentre l\'elicottero si allontana.',
        icon: '🏃',
        color: '#22c55e',
        requirements: [
          { type: 'escape', value: '' },
        ],
        priority: 1,
        sortOrder: 0,
      },
    },
    {
      id: 'ending_truth',
      name: 'Verità',
      description: 'Scopri la verità su Umbrella e sopravvivi',
      icon: '🔍',
      data: {
        id: 'ending_truth',
        title: 'Verità',
        subtitle: 'La verità è più terrificante del terrore',
        description: 'Hai scoperto i segreti di Umbrella e li hai rivelati al mondo. Il T-Virus è solo la punta dell\'iceberg. La vera battaglia inizia ora.',
        icon: '🔍',
        color: '#ef4444',
        requirements: [
          { type: 'has_document', value: 'doc_umbrella_file' },
          { type: 'kill_boss', value: 'tyrant_boss' },
          { type: 'complete_all_quests', value: '' },
        ],
        priority: 4,
        sortOrder: 1,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // RECIPES
  // ───────────────────────────────────────────────────────────────
  recipes: [
    {
      id: 'herb_mix',
      name: 'Miscela Erbe',
      description: 'Combina erbe per creare cure più potenti',
      icon: '🌿',
      data: {
        id: 'craft_herb_mix',
        name: 'Miscela Erbe',
        description: 'Combina erbe verdi per creare una medicina curativa.',
        icon: '🌿',
        category: 'healing',
        ingredients: [
          { itemId: 'healing_herb_green', quantity: 2 },
        ],
        resultItemId: 'healing_first_aid',
        resultQty: 1,
        difficulty: 'easy',
        pointCost: 3,
        pointOnly: false,
        ngPlusOnly: false,
        forceMasterQuality: false,
        hidden: false,
        sortOrder: 0,
      },
    },
    {
      id: 'ammo_craft',
      name: 'Craft Munizioni',
      description: 'Crea munizioni da materiali di recupero',
      icon: '🔶',
      data: {
        id: 'craft_ammo',
        name: 'Craft Munizioni',
        description: 'Ricicla polvere e cartucce per creare munizioni pistola.',
        icon: '🔶',
        category: 'ammo',
        ingredients: [
          { itemId: 'ammo_pistol', quantity: 3 },
        ],
        resultItemId: 'ammo_shotgun',
        resultQty: 2,
        difficulty: 'medium',
        pointCost: 5,
        pointOnly: false,
        ngPlusOnly: false,
        forceMasterQuality: false,
        hidden: false,
        sortOrder: 1,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // BOSS PHASES
  // ───────────────────────────────────────────────────────────────
  'boss-phases': [
    {
      id: 'phase_enrage',
      name: 'Fase Enrage',
      description: 'Il boss entra in modalità furia sotto il 50% HP',
      icon: '🔥',
      data: {
        id: 'tyrant_boss_phase_enrage',
        enemyId: 'tyrant_boss',
        name: 'Fase Enrage',
        hpThreshold: 0.5,
        hpMultiplier: 1.0,
        atkMultiplier: 1.5,
        defMultiplier: 1.3,
        spdMultiplier: 1.2,
        newAbilities: [],
        message: '⚠️ Il Tyrant si infuria! I muscoli si gonfiano, gli occhi brillano di rosso!',
        sortOrder: 0,
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // QUEST CHAINS
  // ───────────────────────────────────────────────────────────────
  'quest-chains': [
    {
      id: 'main_story',
      name: 'Catena Storia Principale',
      description: 'La storyline principale del gioco con 3 step e branching',
      icon: '📜',
      data: {
        id: 'chain_main_story',
        npcId: 'npc_quest_giver',
        name: 'Storia Principale',
        description: 'La missione principale per scoprire la verità su Raccoon City e Umbrella.',
        sortOrder: 0,
        steps: [
          {
            id: 'step_1_investigate',
            description: 'Indaga sulla Stazione di Polizia RPD per trovare prove.',
            type: 'explore',
            targetId: 'rpd_station',
            targetCount: 1,
            nextStepId: 'step_2_gather',
            reward: { items: [{ itemId: 'ammo_pistol', qty: 10 }], exp: 30 },
            branchChoice: null,
          },
          {
            id: 'step_2_gather',
            description: 'Raccogli 2 Kit Primo Soccorso dal Mercante.',
            type: 'fetch',
            targetId: 'healing_first_aid',
            targetCount: 2,
            nextStepId: 'step_3_confront',
            reward: { items: [{ itemId: 'armor_vest', qty: 1 }], exp: 50 },
            branchChoice: {
              prompt: 'Come procedere?',
              options: [
                { label: 'Attacco diretto', nextStepId: 'step_3_confront' },
                { label: 'Infiltrazione segreta', nextStepId: 'step_3_sneak' },
              ],
            },
          },
          {
            id: 'step_3_confront',
            description: 'Affronta il Tyrant nel Laboratorio Sotterraneo.',
            type: 'kill',
            targetId: 'tyrant_boss',
            targetCount: 1,
            nextStepId: '',
            reward: { items: [], exp: 200 },
            branchChoice: null,
          },
          {
            id: 'step_3_sneak',
            description: 'Recupera il File Umbrella senza combattere.',
            type: 'fetch',
            targetId: 'doc_umbrella_file',
            targetCount: 1,
            nextStepId: '',
            reward: { items: [{ itemId: 'key_id_card', qty: 1 }], exp: 150 },
            branchChoice: null,
          },
        ],
        finalReward: {
          items: [{ itemId: 'healing_first_aid', qty: 3 }, { itemId: 'ammo_shotgun', qty: 10 }],
          exp: 300,
          dialogues: [
            'Hai scoperto la verità su Umbrella!',
            'Raccoon City non sarà mai più la stessa.',
          ],
        },
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────
  // Tabs without templates (custom / config tabs)
  // ───────────────────────────────────────────────────────────────
  games: [],
  archetypes: [],
  characters: [],
  'enemy-abilities': [],
  'secret-rooms': [],
  notifications: [],
  avatars: [],
  'start-screen': [],
  settings: [],
  theme: [],
  sounds: [],
  images: [],
};

// ═══════════════════════════════════════════════════════════════
// Category icons per tab
// ═══════════════════════════════════════════════════════════════
function getTabIcon(tabId: TabId): string {
  const tab = TABS.find(t => t.id === tabId);
  if (tab) {
    // Extract icon name from React element for display
    const map: Record<TabId, string> = {
      items: '📦',
      enemies: '💀',
      locations: '📍',
      npcs: '👤',
      quests: '📜',
      events: '⚡',
      specials: '✨',
      documents: '📄',
      achievements: '🏆',
      endings: '🏁',
      recipes: '🔧',
      'boss-phases': '👑',
      'quest-chains': '🔗',
      games: '🎮',
      archetypes: '⚔️',
      characters: '🧑',
      'enemy-abilities': '🔥',
      'secret-rooms': '🚪',
      notifications: '🔔',
      avatars: '🖼️',
      'start-screen': '🖥️',
      settings: '⚙️',
      theme: '🎨',
      sounds: '🔊',
      images: '🖼️',
    };
    return map[tabId] ?? '📋';
  }
  return '📋';
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export function EntityTemplates({ open, onOpenChange, onCreateFromTemplate, activeTab }: EntityTemplatesProps) {
  const templates = TEMPLATES[activeTab] ?? [];
  const tabConfig = TABS.find(t => t.id === activeTab);
  const tabLabel = tabConfig?.label ?? activeTab;

  const handleUse = (template: TemplateDef) => {
    onCreateFromTemplate(activeTab, { ...template.data });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-white/[0.08]"
        style={{ backgroundColor: '#111118' }}
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-white/90">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/25 text-sm">
              {getTabIcon(activeTab)}
            </span>
            Template {tabLabel}
            <span className="text-sm font-normal text-white/30 ml-1">
              ({templates.length})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 admin-scrollbar">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl mb-4">
                📭
              </div>
              <p className="text-sm font-medium text-white/50 mb-1">Nessun template</p>
              <p className="text-xs text-white/25 max-w-[250px]">
                Non ci sono template predefiniti per questa sezione. Crea manualmente le tue entità.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-lg p-4 border transition-all duration-200 cursor-default bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-lg shrink-0 group-hover:border-emerald-500/20 group-hover:bg-emerald-600/10 transition-colors">
                      {template.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white/85 truncate group-hover:text-emerald-300 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleUse(template)}
                      className="text-xs gap-1.5 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200 hover:border-emerald-500/40 transition-colors"
                    >
                      Usa Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
