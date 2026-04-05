import { GameNPC } from '../types';

export const NPCS: Record<string, GameNPC> = {
  // ==========================================
  // MARCO — City Outskirts
  // ==========================================
  npc_marco: {
    id: 'npc_marco',
    name: 'Marco',
    portrait: '🔧',
    locationId: 'city_outskirts',
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
        'Non credevo che qualcuno woulda mi avrebbe davvero aiutato! Ecco, ho trovato queste munizioni in un\'auto della polizia abbandonata. Prendile, te ne servirai più di me.',
      ],
    },
    tradeInventory: [
      {
        itemId: 'ammo_pistol',
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
    locationId: 'hospital_district',
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
  },

  // ==========================================
  // SOLDIER REYES — RPD Station
  // ==========================================
  npc_soldier_reyes: {
    id: 'npc_soldier_reyes',
    name: 'Soldato Reyes',
    portrait: '🎖️',
    locationId: 'rpd_station',
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
    locationId: 'sewers',
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
    locationId: 'laboratory_entrance',
    greeting: 'Chi... chi siete? Siete della S.T.A.R.S.? No? Allora forse... forse siete diversi dagli altri.',
    dialogues: [
      'Mi chiamo Alessandro Voss. Ero uno dei ricercatori capo del progetto Tyrant. Ho contribuito a creare quei mostri. Ora tutto questo... è colpa mia.',
      'Il Tyrant — il T-103 — ha un punto debole. La cellula regolatrice nel tronco cerebrale. Se riuscite a danneggiarla con armi pesanti — fucile a pompa, magnum, o meglio ancora un lanciarazzi — potete fermarlo. Ma dovete colpire il centro vitale con precisione.',
      'Ho nascosto dei dati nei server di backup dell\'archivio. Contengono le prove di tutto ciò che l\'Umbrella ha fatto. Se sopravvivete, portatele alla luce. Il mondo deve sapere.',
    ],
    farewell: 'Portate alla luce la verità. È l\'unica cosa che posso chiedervi... è l\'unica cosa che mi rimane.',
    questCompletedDialogue: [
      'Grazie... per non avermi ucciso. Meriterei molto peggio.',
    ],
    tradeInventory: [
      {
        itemId: 'rocket_launcher',
        priceItemId: 'ammo_magnum',
        priceQuantity: 2,
      },
    ],
  },
};
