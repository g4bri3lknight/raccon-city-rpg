import { GameNPC } from '@/game/types';

export const SEED_NPCS: Record<string, GameNPC> = {
  // ==========================================
  // MARCO — City Outskirts
  // ==========================================
  npc_marco: {
    id: 'npc_marco',
    name: 'Marco',
    portrait: '🔧',
    greeting: 'Ehi, tu! Sei ancora vivo? Grazie a Dio! Mi chiamo Marco, ero il meccanico del distretto.',
    dialogues: [
      'Conosco ogni angolo di questa città — compresa un\'entrata posteriore alla R.P.D. che i poliziotti usavano per le pause fumatori. Se ti serve un consiglio, chiedi pure.',
      'Le strade verso est sono bloccate. L\'esercito ha montato dei check-point, ma da quello che ho sentito alla radio... non stanno lasciando passare nessuno.',
    ],
    farewell: 'Stai attento là fuori, amico. E se trovi un kit di primo soccorso, ti prego, portamelo. Ne ho un bisogno disperato.',
    quest: {
      id: 'quest_marco_firstaid',
      name: 'Kit di Sopravvivenza per Marco',
      description: 'Marco ha bisogno di un kit di primo soccorso. Trova un Kit di Pronto Soccorso nelle vicinanze e portaglielo.',
      type: 'fetch',
      targetId: 'first_aid',
      targetCount: 1,
      rewardItems: [{ itemId: 'ammo_pistol', quantity: 6 }],
      rewardExp: 30,
      rewardDialogue: [
        'Non credevo che qualcuno woulda mi avrebbe davvero aiutato! Ecco, ho trovato queste munizioni in un\'auto della polizia abbandonata. Prendile, te ne serviranno più di me.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'ammo_pistol',
        quantity: 6,
        priceItemId: 'bandage',
        priceQuantity: 3,
      },
    ],
  },

  // ==========================================
  // DR. CHEN — Hospital District
  // ==========================================
  npc_dr_chen: {
    id: 'npc_dr_chen',
    name: 'Dr. Chen',
    portrait: '🥼',
    greeting: 'Sssh! Abbassate la voce! Non fatevi sentire da quelle cose. Io sono il dottor Chen, reparto malattie infettive.',
    dialogues: [
      'Mi sono nascosto nel ripostiglio dei medicinali quando è iniziato il caos. Ho visto tutto — il virus che mutava i pazienti in quelle... creature. L\'ospedale era un laboratorio di ricerca per la Umbrella, e lo sapevano solo pochi di noi.',
      'C\'è un passaggio segreto nel reparto pediatria che porta a una stanza blindata sotto l\'edificio. L\'ho usato una volta per una "ispezione". Ma non volevo sapere cosa c\'era là sotto.',
    ],
    farewell: 'Se trovate degli antidoti, portatemeli. Ne ho bisogno per i pazienti che sto cercando di salvare nascosti al terzo piano.',
    quest: {
      id: 'quest_dr_chen_antidote',
      name: 'Antidoti per il Dr. Chen',
      description: 'Il Dr. Chen ha bisogno di 2 antidoti per curare i sopravvissuti nascosti. Trovali e portaglieli.',
      type: 'fetch',
      targetId: 'antidote',
      targetCount: 2,
      rewardItems: [{ itemId: 'spray', quantity: 1 }],
      rewardExp: 50,
      rewardDialogue: [
        'Grazie dal profondo del cuore. Questi antidoti salveranno delle vite. Prendi questo spray medicale — è potente, te ne servirà per affrontare quello che ti aspetta laggiù.',
      ],
    },
    tradeInventory: [],
    questCompletedDialogue: [
      'Grazie infinite. Questi antidoti salveranno delle vite.',
    ],
  },

  // ==========================================
  // SOLDIER REYES — RPD Station
  // ==========================================
  npc_soldier_reyes: {
    id: 'npc_soldier_reyes',
    name: 'Soldato Reyes',
    portrait: '🎖️',
    greeting: 'Non sparare! Sono umano! Soldato Reyes, UBCS — Unità di Biocontenimento della Umbrella.',
    dialogues: [
      'La mia squadra è stata decimata. Quelle cose nei corridoi... i soldati zombie sono i miei ex compagni. Li ho visti trasformarsi uno per uno. Non c\'è stato niente da fare.',
      'Abbiamo ricevuto l\'ordine di "contenere la situazione", ma sembrava più una missione di copertura. La Umbrella sapeva che sarebbe successo. Ci hanno mandati a morire.',
    ],
    farewell: 'Se vedi un soldato zombie, non esitare. Non è più tuo fratello d\'armi. È un mostro. E stai attento alle erbe verdi — con le giuste combinazioni possono salvarti la vita.',
    quest: {
      id: 'quest_reyes_soldiers',
      name: 'Elimina gli Zombie Soldati',
      description: 'Reyes vuole che tu metta a riposo 3 dei suoi ex compagni trasformati in zombie soldati UBCS.',
      type: 'kill',
      targetId: 'zombie_soldier',
      targetCount: 3,
      rewardItems: [
        { itemId: 'ammo_shotgun', quantity: 4 },
        { itemId: 'magnum', quantity: 1 },
      ],
      rewardExp: 60,
      rewardDialogue: [
        'Hai fatto quello che io non riuscivo a fare... grazie. Ecco — ho raccolto queste munizioni dai miei compagni caduti. E questo magnum... usalo bene.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'ammo_machinegun',
        quantity: 5,
        priceItemId: 'herb_green',
        priceQuantity: 2,
      },
    ],
  },

  // ==========================================
  // HANNAH — Sewers
  // ==========================================
  npc_hannah: {
    id: 'npc_hannah',
    name: 'Hannah',
    portrait: '🔦',
    greeting: 'Woah! Mi hai spaventata! Aspetta... sei umano? Che sollievo. Mi chiamo Hannah, esploravo le fogne cercando una via d\'uscita.',
    dialogues: [
      'Conosco bene questi condotti — sono una città sotterranea. Ci sono scorciatoie che i dipendenti della Umbrella usavano per spostarsi senza essere visti. Ma attenzione, le creature qui sono più aggressive che in superficie.',
      'Se riesci ad arrivare al laboratorio sotto l\'ospedale, potresti trovare il modo di fermare tutto questo. Ma devi essere coraggioso... e ben armato.',
    ],
    farewell: 'Stai attento nell\'acqua scura. Non sai mai cosa si nasconde sotto la superficie. E se hai bisogno di luce, ho una torcia di riserva.',
    quest: {
      id: 'quest_hannah_lab',
      name: 'Esplorare il Laboratorio',
      description: 'Hannah vuole che tu raggiunga l\'ingresso del laboratorio Umbrella e riferisca cosa trovi.',
      type: 'explore',
      targetId: 'laboratory_entrance',
      targetCount: 1,
      rewardItems: [{ itemId: 'lockpick', quantity: 1 }],
      rewardExp: 40,
      rewardDialogue: [
        'Ce l\'hai fatta! E sei tornato intero! Ecco, tieni queste grisaglie — le ho trovate in una stanza abbandonata nelle fogne. Ti serviranno per aprire le porte blindate del laboratorio.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'spray',
        quantity: 1,
        priceItemId: 'flashlight',
        priceQuantity: 1,
      },
    ],
  },

  // ==========================================
  // UMBRELLA SCIENTIST — Laboratory Entrance
  // ==========================================
  npc_umbrella_scientist: {
    id: 'npc_umbrella_scientist',
    name: 'Dr. Alessandro Voss',
    portrait: '🧬',
    greeting: 'Chi... chi siete? Siete della S.T.A.R.S.? No? Allora forse... forse siete diversi dagli altri.',
    dialogues: [
      'Mi chiamo Alessandro Voss. Ero uno dei ricercatori capo del progetto Tyrant. Ho contribuito a creare quei mostri. Ora tutto questo... è colpa mia.',
      'Il Tyrant — il T-103 — ha un punto debole. La cellula regolatrice nel tronco cerebrale. Se riuscite a danneggiarla con armi pesanti — fucile a pompa, magnum, o meglio ancora un lanciarazzi — potete fermarlo. Ma dovete colpire il centro vitale con precisione.',
      'Ho nascosto dei dati nei server di backup dell\'archivio. Contengono le prove di tutto ciò che l\'Umbrella ha fatto. Se sopravvivete, portatele alla luce. Il mondo deve sapere.',
    ],
    farewell: 'Portate alla luce la verità. È l\'unica cosa che posso chiedervi... è l\'unica cosa che mi rimane.',
    quest: {
      id: 'quest_voss_data',
      name: 'Dati del Progetto Tyrant',
      description: 'Il Dr. Voss vuole che tu sconfigga un nemico nel laboratorio e gli porti prove della tua forza. Sconfiggi un Hunter.',
      type: 'kill',
      targetId: 'hunter',
      targetCount: 2,
      rewardItems: [{ itemId: 'ammo_magnum', quantity: 4 }],
      rewardExp: 70,
      rewardDialogue: [
        'Hai dimostrato di poter affrontare le creature di questa facility. Ti dirò quello che so: il laboratorio ha un livello segreto accessibile tramite un pannello con il codice 4817. Dietro c\'è il laboratorio privato di Birkin, con equipaggiamento che potrebbe esserti utile per la fuga. Stai attento — le difese del Tyrant sono state progettate per resistere a qualsiasi cosa.',
      ],
    },
    questCompletedDialogue: [
      'Grazie... per non avermi ucciso. Meriterei molto peggio.',
    ],
    tradeInventory: [
      {
        itemId: 'rocket_launcher',
        quantity: 1,
        priceItemId: 'ammo_magnum',
        priceQuantity: 2,
      },
    ],
  },

  // ==========================================
  // PIETRO — Cemetery
  // ==========================================
  npc_gravedigger: {
    id: 'npc_gravedigger',
    name: 'Pietro il Becchino',
    portrait: '🪦',
    greeting: 'Shhh... non fate rumore. Loro sentono tutto. Mi chiamo Pietro, sono il becchino di questo cimitero da trent\'anni. Ormai non so più chi sia più pericoloso: i morti che camminano o i vivi che li hanno creati.',
    dialogues: [
      'Ho scavato abbastanza tombe da sapere quando qualcosa non va. Ultimamente la terra è troppo morbida in certe zone... come se qualcosa si muovesse sottoterra. E le lapidi? Alcune sono state spostate dall\'interno. Credetemi, non è opera di vandali.',
      'C\'è una cripta qui nel cimitero che non apro da anni. La famiglia Viscardi. Dicevano fossero tutti morti, ma la notte sento dei rumori da laggiù. Forse è meglio che non andiate a controllare.',
    ],
    farewell: 'Se trovate una torcia funzionante, portatemela. Di notte questo posto diventa un inferno e la mia lampada a olio sta finendo.',
    quest: {
      id: 'quest_gravedigger_flashlight',
      name: 'Luce per il Becchino',
      description: 'Pietro ha bisogno di una torcia per pattugliare il cimitero di notte. Trova una Torcia e portagliela.',
      type: 'fetch',
      targetId: 'flashlight',
      targetCount: 1,
      rewardItems: [{ itemId: 'first_aid', quantity: 1 }],
      rewardExp: 50,
      rewardDialogue: [
        'Grazie mille! Finalmente potrò vedere cosa diavolo si nasconde tra queste tombe di notte. Prendete questo kit medico — me lo ha dato un dottore che è passato di qui la scorsa settimana. Non l\'ho mai più rivisto.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'herb_green',
        quantity: 1,
        priceItemId: 'ammo_pistol',
        priceQuantity: 3,
      },
    ],
    questCompletedDialogue: [
      'Con questa torcia posso almeno vedere da dove vengono quei rumori.',
    ],
  },

  // ==========================================
  // INFERMIERA CHIARA — Abandoned Hospital
  // ==========================================
  npc_nurse_ghost: {
    id: 'npc_nurse_ghost',
    name: 'Infermiera Chiara',
    portrait: '👩‍⚕️',
    greeting: 'Non... non scappate! Sono viva, giuro! Mi chiamo Chiara, infermiera. Mi sono nascosta qui quando l\'ospedale è stato evacuato. Non sapevo che le cose sarebbero diventate così.',
    dialogues: [
      'Lavoravo al reparto sperimentale. Non sapevo cosa facessero davvero qui. I pazienti arrivavano di notte, non li vedevo mai uscire. Poi un giorno le porte si sono chiuse e abbiamo sentito le urla. Il virus si è diffuso troppo in fretta.',
      'Nella farmacia al secondo piano ci sono ancora degli antidoti, ma la porta è bloccata. Se riuscite a trovarne qualcuno da altre parti, portatemeli — mi servono per sopravvivere alle esalazioni che filtrano dai condotti.',
    ],
    farewell: 'Portatemi delle bende se ne trovate. Le mie riserve sono quasi esaurite e qui dentro è pieno di spigoli pericolosi.',
    quest: {
      id: 'quest_nurse_bandages',
      name: 'Bende per l\'Infermiera',
      description: 'Chiara ha bisogno di 3 bende per curarsi le ferite. Trova delle Bende e portagliele.',
      type: 'fetch',
      targetId: 'bandage',
      targetCount: 3,
      rewardItems: [{ itemId: 'spray', quantity: 1 }],
      rewardExp: 40,
      rewardDialogue: [
        'Oh, grazie! Queste bende sono un regalo dal cielo. Prendete questo spray medicale — l\'ho trovato nel magazzino dell\'ospedale. È potente, vi servirà per affrontare le creature qui fuori.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'bandage',
        quantity: 2,
        priceItemId: 'first_aid',
        priceQuantity: 1,
      },
    ],
    questCompletedDialogue: [
      'Grazie di cuore. Siete la prima persona gentile che incontro da giorni.',
    ],
  },

  // ==========================================
  // GIOVANNI — Water Tower
  // ==========================================
  npc_maintenance_worker: {
    id: 'npc_maintenance_worker',
    name: 'Giovanni Ferri',
    portrait: '🔧',
    greeting: 'Ehi! Finalmente qualcuno! Mi chiamo Giovanni, manutentore idraulico. Sono bloccato qui da due giorni — le scale sono piene di quelle cose striscianti.',
    dialogues: [
      'Questa torre non è una normale torre dell\'acqua. La Umbrella l\'ha convertita anni fa per smaltire rifiuti biologici dal laboratorio sotterraneo. Quello che pensate sia acqua verde? È virus diluito. Non toccatelo.',
      'C\'è un passaggio sotto la torre che porta direttamente al laboratorio Umbrella. Ma serve una tessera magnetica per attivare il pannello d\'accesso. Io l\'ho vista usare dai tecnici prima che scoppiasse tutto.',
    ],
    farewell: 'Se trovate munizioni per il fucile, portatele. Con queste creature qui intorno non si sa mai quando serviranno.',
    quest: {
      id: 'quest_giovanni_ammo',
      name: 'Munizioni per Giovanni',
      description: 'Giovanni ha bisogno di munizioni da pistola per difendersi. Trova 3 Munizioni da Pistola e portagliele.',
      type: 'fetch',
      targetId: 'ammo_pistol',
      targetCount: 3,
      rewardItems: [{ itemId: 'ammo_shotgun', quantity: 3 }],
      rewardExp: 35,
      rewardDialogue: [
        'Eccellente! Le userò per tenermi al sicuro finché non troverò una via d\'uscita. Ecco — ho nascosto delle cartucce da fucile nel serbatoio di contenimento. Prendetele, a me non servono più.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'antidote',
        quantity: 1,
        priceItemId: 'ammo_shotgun',
        priceQuantity: 3,
      },
    ],
    questCompletedDialogue: [
      'Grazie amico. Con queste munizioni posso almeno tenerle a distanza.',
    ],
  },
};
