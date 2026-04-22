import type { MultiStepQuest } from '@/game/types';

export const SEED_QUEST_CHAINS: Record<string, MultiStepQuest> = {
  // ==========================================
  // CHAIN 1: "Sangue Infetto" (Infected Blood) — Dr. Chen
  // ==========================================
  chain_sangue_infetto: {
    id: 'chain_sangue_infetto',
    npcId: 'npc_dr_chen',
    name: 'Sangue Infetto',
    description: 'Il Dr. Chen ha bisogno del tuo aiuto per gestire dei campioni di sangue infetto. Una missione che metterà alla prova la tua coscienza.',
    steps: [
      {
        id: 'chain_sangue_step_1',
        description: 'Porta 2 Antidoti al Dr. Chen per curare i sopravvissuti.',
        type: 'fetch',
        targetId: 'antidote',
        targetCount: 2,
        nextStepId: 'chain_sangue_step_2',
        reward: {
          exp: 20,
          dialogue: ['Grazie per gli antidoti. Ora ho bisogno del tuo aiuto per qualcosa di più delicato...'],
        },
      },
      {
        id: 'chain_sangue_step_2',
        description: 'Parla con l\'Infermiera Chiara nell\'Ospedale Abbandonato. Ha informazioni cruciali sui campioni.',
        type: 'talk',
        targetId: 'npc_nurse_ghost',
        targetCount: 1,
        nextStepId: 'chain_sangue_step_3',
        reward: {
          dialogue: ['L\'Infermiera Chiara ti ha dato le informazioni necessarie. Ora devi decidere cosa fare.'],
        },
      },
      {
        id: 'chain_sangue_step_3',
        description: 'Scegli il destino dei campioni di sangue infetto.',
        type: 'choose',
        targetCount: 0,
        nextStepId: '',
        reward: {
          dialogue: ['La tua scelta avrà conseguenze permanenti. Scegli con attenzione.'],
        },
        branchChoice: {
          prompt: 'Cosa vuoi fare con i campioni di sangue infetto?',
          choices: [
            {
              text: 'Distruggere i campioni',
              description: 'Distruggi tutto nel reparto abbandonato per impedire che cada nelle mani sbagliate.',
              nextStepId: 'chain_sangue_step_3a',
              flag: 'destroyed_samples',
            },
            {
              text: 'Portare al laboratorio',
              description: 'Porta i campioni al laboratorio Umbrella. Rischioso, ma potrebbe portare a una cura.',
              nextStepId: 'chain_sangue_step_3b',
              flag: 'delivered_samples',
            },
          ],
        },
      },
      {
        id: 'chain_sangue_step_3a',
        description: 'Esplora l\'Ospedale Abbandonato per distruggere i campioni nel reparto segreto.',
        type: 'explore',
        targetId: 'abandoned_hospital',
        targetCount: 1,
        nextStepId: '',
        reward: {
          items: [{ itemId: 'spray', quantity: 2 }],
          exp: 30,
          dialogue: ['Hai distrutto i campioni. Il Dr. Chen ti ringrazia per aver protetto i sopravvissuti.'],
        },
      },
      {
        id: 'chain_sangue_step_3b',
        description: 'Esplora l\'ingresso del laboratorio Umbrella per consegnare i campioni.',
        type: 'explore',
        targetId: 'laboratory_entrance',
        targetCount: 1,
        nextStepId: '',
        reward: {
          items: [{ itemId: 'rocket_launcher', quantity: 1 }, { itemId: 'ammo_grenade', quantity: 2 }],
          exp: 30,
          dialogue: ['Hai consegnato i campioni. I ricercatori sono sbalorditi dalle tue capacità di sopravvivenza. Ti ricompensano generosamente.'],
        },
      },
    ],
    finalReward: {
      items: [],
      exp: 80,
      dialogue: [
        'Il Dr. Chen ti guarda con gratitudine: "Non so cosa avremmo fatto senza di te. Sei una persona eccezionale."',
        'Missione "Sangue Infetto" completata! +80 EXP',
      ],
    },
  },

  // ==========================================
  // CHAIN 2: "Ombre nel Cimitero" (Cemetery Shadows) — Pietro il Becchino
  // ==========================================
  chain_ombre_cimitero: {
    id: 'chain_ombre_cimitero',
    npcId: 'npc_gravedigger',
    name: 'Ombre nel Cimitero',
    description: 'Pietro il Becchino ha bisogno di aiuto per affrontare le presenze oscure che infestano il cimitero.',
    steps: [
      {
        id: 'chain_ombre_step_1',
        description: 'Elimina 3 zombie nel cimitero per rendere sicura la zona.',
        type: 'kill',
        targetId: 'zombie',
        targetCount: 3,
        nextStepId: 'chain_ombre_step_2',
        reward: {
          exp: 15,
          dialogue: ['Le creature sono state eliminate... per ora. Ma Pietro ha bisogno di altro aiuto.'],
        },
      },
      {
        id: 'chain_ombre_step_2',
        description: 'Trova 1 Torcia per esplorare le aree più buie del cimitero.',
        type: 'fetch',
        targetId: 'flashlight',
        targetCount: 1,
        nextStepId: 'chain_ombre_step_3',
        reward: {
          exp: 15,
          dialogue: ['Con questa torcia potrai vedere nelle tombe più oscure. Ora devi prendere una decisione...'],
        },
      },
      {
        id: 'chain_ombre_step_3',
        description: 'Scegli come procedere nelle profondità del cimitero.',
        type: 'choose',
        targetCount: 0,
        nextStepId: '',
        reward: {
          dialogue: ['Il destino del cimitero è nelle tue mani. Scegli saggiamente.'],
        },
        branchChoice: {
          prompt: 'Cosa vuoi fare nelle profondità del cimitero?',
          choices: [
            {
              text: 'Esplorare le catacombe',
              description: 'Scopri i segreti nascosti sotto le tombe antiche. Potrebbe essere pericoloso.',
              nextStepId: 'chain_ombre_step_3a',
              flag: 'explored_catacombs',
            },
            {
              text: 'Seppellire i morti',
              description: 'Dai pace alle anime tormentate raccogliendo bende per le salme.',
              nextStepId: 'chain_ombre_step_3b',
              flag: 'buried_dead',
            },
          ],
        },
      },
      {
        id: 'chain_ombre_step_3a',
        description: 'Esplora il cimitero per trovare l\'entrata delle catacombe segrete.',
        type: 'explore',
        targetId: 'cemetery',
        targetCount: 1,
        nextStepId: '',
        reward: {
          items: [{ itemId: 'key_lab', quantity: 1 }],
          exp: 25,
          dialogue: [
            'Nelle catacombe hai trovato una chiave del laboratorio Umbrella! Questo potrebbe esserti utile...',
            'Pietro trema: "Quello che hai trovato laggiù... non doveva essere scoperto."',
          ],
        },
      },
      {
        id: 'chain_ombre_step_3b',
        description: 'Raccogli 3 Bende per preparare le salme per la sepoltura dignitosa.',
        type: 'fetch',
        targetId: 'bandage',
        targetCount: 3,
        nextStepId: '',
        reward: {
          items: [{ itemId: 'herb_mixed', quantity: 2 }, { itemId: 'amulet', quantity: 1 }],
          exp: 25,
          dialogue: [
            'Hai dato una degna sepoltura ai morti. Le anime sembrano essersi pacificate.',
            'Pietro piange: "Grazie... per la prima volta da settimane il cimitero è in pace."',
          ],
        },
      },
    ],
    finalReward: {
      items: [],
      exp: 60,
      dialogue: [
        'Pietro il Becchino si inginocchia: "Sei un anima nobile. Che Dio ti benedica in questo inferno."',
        'Missione "Ombre nel Cimitero" completata! +60 EXP',
      ],
    },
  },

  // ==========================================
  // CHAIN 3: "Il Traditore" (The Traitor) — Soldato Reyes
  // ==========================================
  chain_il_traditore: {
    id: 'chain_il_traditore',
    npcId: 'npc_soldier_reyes',
    name: 'Il Traditore',
    description: 'Soldato Reyes sospetta che ci sia una spia tra i sopravvissuti. Aiutalo a scoprire la verità.',
    steps: [
      {
        id: 'chain_traditore_step_1',
        description: 'Porta 3 Munizioni Pistola a Reyes per armare le difese.',
        type: 'fetch',
        targetId: 'ammo_pistol',
        targetCount: 3,
        nextStepId: 'chain_traditore_step_2',
        reward: {
          exp: 15,
          dialogue: ['Reyes controlla le munizioni: "Bene. Ora possiamo iniziare a pattugliare seriamente."'],
        },
      },
      {
        id: 'chain_traditore_step_2',
        description: 'Elimina 2 Hunter per dimostrare le tue capacità a Reyes.',
        type: 'kill',
        targetId: 'hunter',
        targetCount: 2,
        nextStepId: 'chain_traditore_step_3',
        reward: {
          exp: 25,
          dialogue: ['Reyes è impressionato: "Non male. Ora posso fidarmi di te per la prossima fase."'],
        },
      },
      {
        id: 'chain_traditore_step_3',
        description: 'Trova 1 Nastro d\'Inchiostro per documentare le prove del tradimento.',
        type: 'fetch',
        targetId: 'ink_ribbon',
        targetCount: 1,
        nextStepId: 'chain_traditore_step_4',
        reward: {
          exp: 15,
          dialogue: ['Con le prove documentate, è ora di decidere a chi consegnarle...'],
        },
      },
      {
        id: 'chain_traditore_step_4',
        description: 'Scegli a chi consegnare le prove del tradimento.',
        type: 'choose',
        targetCount: 0,
        nextStepId: '',
        reward: {
          dialogue: ['Questo è il momento cruciale. La tua scelta potrebbe cambiare tutto.'],
        },
        branchChoice: {
          prompt: 'A chi vuoi consegnare le prove del tradimento?',
          choices: [
            {
              text: 'Consegnare al capo',
              description: 'Parla con il Dr. Voss al laboratorio. Potrebbe avere i mezzi per usare le prove.',
              nextStepId: 'chain_traditore_step_4a',
              flag: 'delivered_to_voss',
            },
            {
              text: 'Tenere per sé',
              description: 'Conserva le prove. La verità è un\'arma potente... e pericolosa.',
              nextStepId: 'chain_traditore_step_4b',
              flag: 'kept_evidence',
            },
          ],
        },
      },
      {
        id: 'chain_traditore_step_4a',
        description: 'Parla con il Dr. Voss al laboratorio per consegnare le prove.',
        type: 'talk',
        targetId: 'npc_umbrella_scientist',
        targetCount: 1,
        nextStepId: '',
        reward: {
          items: [{ itemId: 'magnum', quantity: 1 }, { itemId: 'ammo_magnum', quantity: 6 }],
          exp: 40,
          dialogue: [
            'Il Dr. Voss è scioccato: "Queste prove... potrebbero far cadere l\'intera Umbrella. Tieni, prendi questo — te lo meriti."',
            'Reyes annuisce: "Hai fatto la cosa giusta. La verità deve venire alla luce."',
          ],
        },
      },
      {
        id: 'chain_traditore_step_4b',
        description: 'Le prove sono al sicuro con te. La missione è completa.',
        type: 'choose',
        targetCount: 0,
        nextStepId: '',
        reward: {
          exp: 100,
          dialogue: [
            'Reyes ti guarda diffidente: "Capisco la tua scelta. Le prove sono più al sicuro con te che con chiunque altro."',
          ],
        },
        branchChoice: {
          prompt: 'Reyes ha un\'ultima cosa per te...',
          choices: [
            {
              text: 'Accetta la ricompensa segreta',
              description: 'Reyes ti consegna un giubbotto segreto della Umbrella.',
              nextStepId: '',
              flag: 'accepted_secret_reward',
            },
          ],
        },
      },
    ],
    finalReward: {
      items: [{ itemId: 'vest_umbrella', quantity: 1 }],
      exp: 100,
      dialogue: [
        'Reyes ti saluta militarmente: "Sei un soldato eccezionale. Se sopravviviamo a questo... ti offro una birra."',
        'Missione "Il Traditore" completata! +100 EXP + Giubbotto Umbrella!',
      ],
    },
  },
};

// Lookup: npcId → chainId
export const NPC_QUEST_CHAIN_MAP: Record<string, string> = {
  'npc_dr_chen': 'chain_sangue_infetto',
  'npc_gravedigger': 'chain_ombre_cimitero',
  'npc_soldier_reyes': 'chain_il_traditore',
};
