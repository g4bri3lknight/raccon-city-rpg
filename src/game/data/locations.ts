import { LocationDefinition } from './types';

export const STATIC_LOCATIONS: Record<string, LocationDefinition> = {
  city_outskirts: {
    id: 'city_outskirts',
    name: 'Periferia di Raccoon City',
    description: 'Le strade ai margini della città sono piene di veicoli abbandonati. Il fumo denso nasconde il sole. In lontananza si sentono le sirene e le grida.',
    backgroundImage: '/api/media/image?id=bg_city_outskirts',
    encounterRate: 40,
    enemyPool: ['zombie', 'zombie_female', 'zombie', 'zombie_dog'],
    itemPool: [
      { itemId: 'bandage', chance: 50, quantity: 1 },
      { itemId: 'herb_green', chance: 30, quantity: 1 },
      { itemId: 'ammo_pistol', chance: 25, quantity: 4 },
      { itemId: 'bag_small', chance: 15, quantity: 1 },
      { itemId: 'key_sewers', chance: 15, quantity: 1 },
      { itemId: 'crank_handle', chance: 12, quantity: 1 },
      { itemId: 'rocket_launcher', chance: 5, quantity: 1 },
      { itemId: 'ink_ribbon', chance: 20, quantity: 1 },
    ],
    nextLocations: ['rpd_station', 'hospital_district'],
    isBossArea: false,
    lockedLocations: [
      { locationId: 'rpd_station', requiredItemId: 'key_rpd', lockedMessage: '🔒 La porta della R.P.D. è chiusa a chiave. Serve la chiave del distretto.' },
    ],
    ambientText: [
      'Il fumo denso brucia i polmoni...',
      'Un auto-sirena lontana ulula nella notte.',
      'Una carrozzeria contorta blocca la strada.',
      'Un giornale vola nel vento: "VIRUS NELLA CITTA\'"',
    ],
    subAreas: [
      { id: 'safe_room', name: 'Safe Room', description: 'Un rifugio sicuro con una vecchia macchina da scrivere e un armadietto per gli oggetti.' },
    ],
    storyEvent: {
      title: 'Primo Contatto',
      description: 'Mentre attraversate la periferia, notate un gruppo di sopravvissuti barricati in un negozio. Uno di loro vi fa segno di avvicinarvi.',
      choices: [
        {
          text: 'Avvicinarsi e offrire aiuto',
          outcome: {
            description: 'I sopravvissuti sono grati. Una donna vi consegna un kit medico prima di fuggire.',
            receiveItems: [{ itemId: 'first_aid', quantity: 1 }],
          },
        },
        {
          text: 'Ignorarli e proseguire',
          outcome: {
            description: 'Scegliete di non fidarvi. Mentre vi allontanate, sentite le loro grida alle vostre spalle...',
            hpChange: -5,
          },
        },
      ],
    },
  },
  rpd_station: {
    id: 'rpd_station',
    name: 'Stazione di Polizia R.P.D.',
    description: 'La Raccoon Police Department è un edificio imponente, ora silenzioso e spettrale. Le porte sono spalancate, i vetri rotti. Qualcosa si muove all\'interno.',
    backgroundImage: '/api/media/image?id=bg_rpd_station',
    encounterRate: 35,
    enemyPool: ['zombie', 'zombie_female', 'zombie_dog', 'cerberus_alpha', 'licker'],
    itemPool: [
      { itemId: 'herb_green', chance: 40, quantity: 1 },
      { itemId: 'ammo_pistol', chance: 35, quantity: 5 },
      { itemId: 'shotgun', chance: 10, quantity: 1 },
      { itemId: 'machinegun', chance: 8, quantity: 1 },
      { itemId: 'ammo_machinegun', chance: 15, quantity: 5 },
      { itemId: 'lockpick', chance: 15, quantity: 1 },
      { itemId: 'bag_small', chance: 20, quantity: 1 },
      { itemId: 'fuse', chance: 12, quantity: 1 },
      { itemId: 'rocket_launcher', chance: 5, quantity: 1 },
      { itemId: 'ink_ribbon', chance: 20, quantity: 1 },
    ],
    nextLocations: ['sewers', 'hospital_district', 'city_outskirts'],
    isBossArea: false,
    lockedLocations: [
      { locationId: 'sewers', requiredItemId: 'key_sewers', lockedMessage: '🔒 Il cancello delle fogne è sigillato. Serve una chiave arrugginita.' },
    ],
    ambientText: [
      'Il suono di passi pesanti riecheggia al piano di sopra...',
      'Una radio crepita: "...a tutti gli agenti... evacuate... non c\'è speranza..."',
      'File polizieschi sparsi sul pavimento coperti di polvere.',
      'L\'odore della polvere da sparo permea l\'aria.',
    ],
    subAreas: [
      { id: 'safe_room', name: 'Safe Room', description: 'L\'ufficio del capitano, chiuso a chiave dall\'interno. Un\'unica lampada illumina una macchina da scrivere e un armadietto blindato.' },
    ],
    storyEvent: {
      title: 'L\'Armeria',
      description: 'Trovate l\'armeria della stazione. La porta è chiusa con un lucchetto numerico a 4 cifre. Sulla serratura c\'è un graffio: "1974".',
      choices: [
        {
          text: 'Provare a decifrare il codice',
          outcome: {
            description: 'Dovete inserire il codice corretto sul lucchetto...',
          },
        },
        {
          text: 'Cercare un\'altra via',
          outcome: {
            description: 'Continuate a esplorare. Trovate un erba verde in una cella aperta.',
            receiveItems: [{ itemId: 'herb_green', quantity: 2 }],
          },
        },
      ],
      puzzle: {
        type: 'combination',
        combinationCode: '1974',
        successOutcome: {
          description: 'Il lucchetto si apre! Dentro trovate munizioni preziose e una cura medica.',
          receiveItems: [{ itemId: 'ammo_pistol', quantity: 6 }, { itemId: 'herb_red', quantity: 1 }],
          hpChange: 10,
        },
        failMessage: 'Il codice è sbagliato! Il lucchetto non si muove. Dovete rinunciare...',
      },
    },
  },
  hospital_district: {
    id: 'hospital_district',
    name: 'Ospedale di Raccoon City',
    description: 'L\'ospedale è un\'immagine di orrore. Le corsie sono coperte di detriti, le luci fluorescenze lampeggiano in modo ossessivo. I pazienti non sono più... pazienti.',
    backgroundImage: '/api/media/image?id=bg_hospital_district',
    encounterRate: 45,
    enemyPool: ['zombie_doctor', 'zombie_soldier', 'zombie_dog', 'licker', 'licker_crawler', 'hunter'],
    itemPool: [
      { itemId: 'first_aid', chance: 40, quantity: 1 },
      { itemId: 'antidote', chance: 30, quantity: 1 },
      { itemId: 'spray', chance: 15, quantity: 1 },
      { itemId: 'herb_red', chance: 20, quantity: 1 },
      { itemId: 'bag_small', chance: 15, quantity: 1 },
      { itemId: 'bag_medium', chance: 10, quantity: 1 },
      { itemId: 'key_rpd', chance: 12, quantity: 1 },
      { itemId: 'ammo_grenade', chance: 8, quantity: 1 },
      { itemId: 'rocket_launcher', chance: 5, quantity: 1 },
      { itemId: 'ink_ribbon', chance: 20, quantity: 1 },
    ],
    nextLocations: ['rpd_station', 'laboratory_entrance'],
    isBossArea: false,
    lockedLocations: [
      { locationId: 'laboratory_entrance', requiredItemId: 'key_lab', lockedMessage: '🔒 La porta della cantina è blindata. Serve una tessera magnetica Umbrella.' },
      { locationId: 'laboratory_entrance', requiredItemId: 'fuse', lockedMessage: '🔒 L\'alimentazione elettrica è interrotta. Serve un fusibile per ripristinare l\'energia e aprire la porta.' },
    ],
    ambientText: [
      'Un monitor cardiaco lampeggia nel buio... un battito irregolare...',
      'Carrelli della spesa medica rovesciati bloccano il corridoio.',
      'Una flebo si dondola dal soffitto, gocciolando un liquido scuro.',
      'L\'eco di una risata maniacale riecheggia da qualche parte...',
    ],
    subAreas: [
      { id: 'safe_room', name: 'Safe Room', description: 'La sala d\'attesa del reparto maternità, fortunatamente intatta. Un armadietto medico e un\'area di pronto soccorso.' },
    ],
    storyEvent: {
      title: 'Il Laboratorio Segreto',
      description: 'Nella cantina dell\'ospedale trovate un passaggio nascosto dietro un armadietto medico. Una porta di metallo con il logo della Umbrella Corporation.',
      choices: [
        {
          text: 'Entrare nel passaggio',
          outcome: {
            description: 'Scendete le scale. Trovate un piccolo laboratorio con provette e documenti segreti. Tra le scartoffie, un magnum e delle munizioni.',
            receiveItems: [{ itemId: 'magnum', quantity: 1 }, { itemId: 'ammo_magnum', quantity: 5 }],
            triggerCombat: true,
            combatEnemyIds: ['hunter'],
          },
        },
        {
          text: 'Tornare indietro',
          outcome: {
            description: 'Vi ritirate. Nell\'uscire, uno zombie vi sorprende alle spalle!',
            triggerCombat: true,
            combatEnemyIds: ['zombie', 'zombie'],
          },
        },
      ],
    },
  },
  sewers: {
    id: 'sewers',
    name: 'Fogne Sottostanti',
    description: 'Le fogne di Raccoon City sono un labirinto oscuro. L\'acqua verde e putrida scorre tra i condotti. Il suolo è scivoloso e il rumore delle gocce amplifica ogni suono.',
    backgroundImage: '/api/media/image?id=bg_sewers',
    encounterRate: 50,
    enemyPool: ['zombie_dog', 'cerberus_alpha', 'licker', 'licker_smasher', 'hunter'],
    itemPool: [
      { itemId: 'herb_green', chance: 35, quantity: 1 },
      { itemId: 'antidote', chance: 40, quantity: 1 },
      { itemId: 'flashlight', chance: 20, quantity: 1 },
      { itemId: 'ammo_shotgun', chance: 15, quantity: 4 },
      { itemId: 'ammo_machinegun', chance: 12, quantity: 4 },
      { itemId: 'ammo_grenade', chance: 8, quantity: 1 },
      { itemId: 'bag_medium', chance: 12, quantity: 1 },
      { itemId: 'key_lab', chance: 10, quantity: 1 },
      { itemId: 'rocket_launcher', chance: 5, quantity: 1 },
      { itemId: 'ink_ribbon', chance: 20, quantity: 1 },
    ],
    nextLocations: ['rpd_station', 'laboratory_entrance'],
    isBossArea: false,
    lockedLocations: [
      { locationId: 'laboratory_entrance', requiredItemId: 'key_lab', lockedMessage: '🔒 La porta del laboratorio è protetta da un lettore biometrico. Serve una tessera magnetica Umbrella.' },
      { locationId: 'laboratory_entrance', requiredItemId: 'crank_handle', lockedMessage: '🔒 Una chiusa idraulica blocca il passaggio verso il laboratorio. Serve una manovella per aprirla.' },
    ],
    ambientText: [
      'Il gocciolio dell\'acqua è l\'unico suono... finora.',
      'Qualcosa di grande si muove nell\'acqua scura.',
      'Una grata arrugginita cigola sotto il vostro peso.',
      'L\'odore della decomposizione è insopportabile.',
    ],
    subAreas: [
      { id: 'safe_room', name: 'Safe Room', description: 'Una piccola stazione di manutenzione con una porta rinforzata. L\'unico luogo asciutto e sicuro nelle fogne.' },
    ],
    storyEvent: {
      title: 'La Tomba Sottacqua',
      description: 'Trovate un corpo con una nota scritta col sangue: "Non scendere più in basso. Non scendere nel laboratorio. La Umbrella sa tutto."',
      choices: [
        {
          text: 'Seguire le istruzioni e tornare indietro',
          outcome: {
            description: 'Decidete di non ignorare l\'avvertimento. Trovate un kit medico vicino al corpo.',
            receiveItems: [{ itemId: 'first_aid', quantity: 2 }, { itemId: 'antidote', quantity: 1 }],
          },
        },
        {
          text: 'Ignorare l\'avvertimento e proseguire',
          outcome: {
            description: 'Proseguite coraggiosamente. Una figura si staglia nell\'oscurità...',
            triggerCombat: true,
            combatEnemyIds: ['licker', 'zombie_dog'],
          },
        },
      ],
    },
  },
  laboratory_entrance: {
    id: 'laboratory_entrance',
    name: 'Laboratorio Umbrella - Ingresso',
    description: 'Il quartier generale sotterraneo della Umbrella Corporation. Supercomputer, provette, e creature che non dovrebbero esistere. È qui che è iniziato tutto.',
    backgroundImage: '/api/media/image?id=bg_laboratory_entrance',
    encounterRate: 55,
    enemyPool: ['hunter', 'licker', 'licker_smasher', 'licker_crawler', 'zombie_soldier'],
    itemPool: [
      { itemId: 'spray', chance: 30, quantity: 1 },
      { itemId: 'antidote', chance: 40, quantity: 2 },
      { itemId: 'ammo_magnum', chance: 20, quantity: 4 },
      { itemId: 'ammo_machinegun', chance: 15, quantity: 5 },
      { itemId: 'ammo_grenade', chance: 10, quantity: 1 },
      { itemId: 'rocket_launcher', chance: 5, quantity: 1 },
      { itemId: 'herb_red', chance: 25, quantity: 1 },
      { itemId: 'bag_medium', chance: 15, quantity: 1 },
      { itemId: 'ink_ribbon', chance: 20, quantity: 1 },
    ],
    nextLocations: ['clock_tower', 'hospital_district', 'sewers'],
    isBossArea: false,
    ambientText: [
      'I server ronzano con un suono ipnotico e inquietante.',
      'Una provetta si spezza da sola, rilasciando un gas verdastro.',
      'Schermi mostrano sequenze genetiche impossibili.',
      'I tubi di vetro nelle pareti emanano una luce sinistra.',
    ],
    subAreas: [
      { id: 'safe_room', name: 'Safe Room', description: 'Un ufficio privato del dottor Voss, protetto da un codice di sicurezza. L\'unico luogo nel laboratorio libero da creature.' },
    ],
    storyEvent: {
      title: 'Il Computer Centrale',
      description: 'Trovate il computer principale del laboratorio. Lo schermo mostra un messaggio: "EMERGENZA: Protocollo di disattivazione richiesto. Ripetete la sequenza di sicurezza." Una serie di frecce lampeggia sullo schermo...',
      choices: [
        {
          text: 'Ripetere la sequenza di sicurezza',
          outcome: {
            description: 'Osservate le frecce e cercate di memorizzarle...',
          },
        },
        {
          text: 'Cercare un\'altra via di fuga',
          outcome: {
            description: 'Trovate una mappa dei condotti di ventilazione che porta alla torre dell\'orologio.',
            receiveItems: [{ itemId: 'lockpick', quantity: 1 }],
          },
        },
      ],
      puzzle: {
        type: 'sequence',
        sequencePattern: ['up', 'right', 'down', 'left', 'space'],
        successOutcome: {
          description: 'Sequenza corretta! I sistemi di sicurezza si disattivano. Trovate un deposito segreto con equipaggiamento prezioso.',
          receiveItems: [{ itemId: 'spray', quantity: 2 }, { itemId: 'ammo_magnum', quantity: 6 }],
        },
        failMessage: 'Sequenza errata! Il sistema attiva un allarme. Dovete fuggire!',
      },
    },
  },
  clock_tower: {
    id: 'clock_tower',
    name: 'Torre dell\'Orologio',
    description: 'La torre dell\'orologio si erge maestosa sopra la città distrutta. Da qui si vede l\'elicottero di soccorso... ma qualcosa blocca la via.',
    backgroundImage: '/api/media/image?id=bg_clock_tower',
    encounterRate: 0,
    enemyPool: ['tyrant_boss'],
    itemPool: [],
    nextLocations: [],
    isBossArea: true,
    bossId: 'tyrant_boss',
    ambientText: [
      'L\'elicottero è in vista! Ma non è abbastanza vicino.',
      'I meccanismi del grande orologio ticchettano inesorabili.',
      'Da qui si vede tutta Raccoon City in fiamme.',
      'Il vento ulula tra le strutture metalliche.',
    ],
  },
};
