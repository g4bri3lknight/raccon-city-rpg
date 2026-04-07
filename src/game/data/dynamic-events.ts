import { DynamicEvent } from '../types';

export const STATIC_DYNAMIC_EVENTS: Record<string, DynamicEvent> = {
  // ==========================================
  // BLACKOUT
  // ==========================================
  event_blackout: {
    id: 'event_blackout',
    title: 'Blackout Totale',
    description: 'Un improvviso buio avvolge l\'area. Le luci si spengono con un sibilo e l\'oscurità diventa totale. Nel buio, i suoni sembrano più vicini e più minacciosi. Ma forse le tenebre nascondono anche oggetti che la luce avrebbe nascosto.',
    icon: '🌑',
    type: 'blackout',
    duration: 3,
    effect: {
      encounterRateMod: 15,
      enemyStatMult: 0,
      searchBonus: true,
      damagePerTurn: 0,
    },
    triggerChance: 8,
    minTurn: 5,
    locationIds: [],
    onTriggerMessage: '💡 Le luci si spengono improvvisamente! Un blackout totale ha colpito la zona. Le tenebre nascondono sia pericoli che tesori nascosti...',
    onEndMessage: '💡 L\'energia torna gradualmente. Le luci lampeggiano e si stabilizzano. Il blackout è terminato.',
    choices: [
      {
        text: 'Restare al coperto e aspettare',
        outcome: {
          description: 'Vi barricate nell\'oscurità. Il tempo passa lento e i rumori vi fanno trasalire, ma alla fine le luci tornano. Nessun danno subito.',
          endEvent: true,
          hpChange: 0,
        },
      },
      {
        text: 'Cercare nel buio (bonus oggetti)',
        outcome: {
          description: 'Con la torcia accesa, esplorate l\'area al buio. Nell\'oscurità trovate oggetti che nessuno avrebbe notato alla luce del giorno.',
          endEvent: true,
          receiveItems: [{ itemId: 'herb_green', quantity: 1 }, { itemId: 'ammo_pistol', quantity: 3 }],
          hpChange: 0,
        },
      },
    ],
  },

  // ==========================================
  // ALARM
  // ==========================================
  event_alarm: {
    id: 'event_alarm',
    title: 'Allarme di Sicurezza',
    description: 'Un allarme piercing squarcia il silenzio! Le luci rosse lampeggiano e le sirene ululano. L\'allarme sta attirando ogni creatura nelle vicinanze verso la vostra posizione.',
    icon: '🚨',
    type: 'alarm',
    duration: 2,
    effect: {
      encounterRateMod: 25,
      enemyStatMult: 1.1,
      searchBonus: false,
      damagePerTurn: 0,
    },
    triggerChance: 6,
    minTurn: 8,
    locationIds: [],
    onTriggerMessage: '🚨 WEE-WOO-WEE-WOO! Un allarme di sicurezza si attiva! Le sirene attirano ogni creatura nelle vicinanze!',
    onEndMessage: '🚨 L\'allarme si spegne finalmente. Le luci rosse smettono di lampeggiare. Ma chissà quanti mostri sono arrivati intanto...',
    choices: [
      {
        text: 'Tentare di disabilitare l\'allarme',
        outcome: {
          description: 'Con mano ferma, individuate il pannello di controllo e disattivate l\'allarme. Il silenzio torna a regnare, ma qualcosa si è già avvicinato...',
          endEvent: true,
          hpChange: -5,
        },
      },
      {
        text: 'Fuggire verso un\'altra area',
        outcome: {
          description: 'Correte via dall\'area dell\'allarme. Nella fretta urtate contro dei detriti, ma almeno vi allontanate dal suono assordante.',
          endEvent: true,
          hpChange: -10,
        },
      },
      {
        text: 'Combattere e resistere',
        outcome: {
          description: 'Decidete di tenere la posizione. Qualsiasi cosa arrivi, sarete pronti. L\'allarme continua a suonare, ma voi siete pronti a tutto.',
          endEvent: true,
          hpChange: 0,
        },
      },
    ],
  },

  // ==========================================
  // COLLAPSE
  // ==========================================
  event_collapse: {
    id: 'event_collapse',
    title: 'Cedimento Strutturale',
    description: 'Il terreno trema sotto i vostri piedi! Le crepe si allargano nelle pareti e pezzi di soffitto iniziano a cadere. L\'edificio sta cedendo — dovete muovervi o verete sepolti.',
    icon: '💥',
    type: 'collapse',
    duration: 2,
    effect: {
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 5,
    },
    triggerChance: 5,
    minTurn: 10,
    locationIds: [],
    onTriggerMessage: '💥 CRACK! BOOM! Il soffitto si spacca! Un cedimento strutturale è in corso! Detti cadono intorno a voi!',
    onEndMessage: '💥 I crolli si attenuano. La struttura sembra essersi stabilizzata... per ora.',
    choices: [
      {
        text: 'Trovare riparo sotto una trave',
        outcome: {
          description: 'Vi tuffate sotto una trave portante robusta. I detriti cadono tutto intorno, ma siete al sicuro. Aspettate che il peggio passi prima di uscire.',
          endEvent: true,
          hpChange: 0,
        },
      },
      {
        text: 'Continuare a muoversi (rischio)',
        outcome: {
          description: 'Correte attraverso i detriti cadenti. Una pietra vi colpisce alla spalla, ma riuscite a uscire dalla zona di pericolo prima che il soffitto crolli del tutto.',
          endEvent: true,
          hpChange: -15,
        },
      },
    ],
  },

  // ==========================================
  // LOCKDOWN
  // ==========================================
  event_lockdown: {
    id: 'event_lockdown',
    title: 'Lockdown di Sicurezza',
    description: 'Le porte si chiudono con un tonfo metallico! Un sistema di sicurezza automatico ha attivato il protocollo di lockdown. Le serrature elettroniche si illuminano di rosso. Siete intrappolati.',
    icon: '🔒',
    type: 'lockdown',
    duration: 3,
    effect: {
      encounterRateMod: 0,
      enemyStatMult: 1.2,
      searchBonus: false,
      damagePerTurn: 0,
    },
    triggerChance: 5,
    minTurn: 12,
    locationIds: [],
    onTriggerMessage: '🔒 CLANK! Le porte blindate si chiudono automaticamente! Siete in lockdown — impossibile viaggiare fino a quando il sistema non viene disabilitato!',
    onEndMessage: '🔒 Le serrature si sbloccano con un click. Le porte si aprono lentamente. Siete di nuovo liberi di muovervi.',
    choices: [
      {
        text: 'Violare il sistema di sicurezza',
        outcome: {
          description: 'Esaminate il pannello di controllo e trovate una falla nel codice di sicurezza. Con un po\' di pazienza riuscite a bypassare il lockdown e a sbloccare le porte.',
          endEvent: true,
          receiveItems: [{ itemId: 'ammo_pistol', quantity: 4 }],
          hpChange: 0,
        },
      },
      {
        text: 'Aspettare che scada',
        outcome: {
          description: 'Non avete scelta — sedetevi e aspettate. Le ore passano lente nell\'ansia. Alla fine il sistema si resetta da solo e le porte si aprono.',
          endEvent: true,
          hpChange: 0,
        },
      },
    ],
  },

  // ==========================================
  // GAS LEAK
  // ==========================================
  event_gas_leak: {
    id: 'event_gas_leak',
    title: 'Fuga di Gas Tossico',
    description: 'Un odore acre e dolciastro riempie l\'aria. Il gas verde si diffonde rapidamente dalle condutture danneggiate. Le vostre vie respiratorie bruciano e la vista si offusca.',
    icon: '☠️',
    type: 'gas_leak',
    duration: 2,
    effect: {
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 8,
    },
    triggerChance: 7,
    minTurn: 6,
    locationIds: [],
    onTriggerMessage: '☠️ Un gas verdastro e tossico si diffonde nell\'aria! Le vostre vie respiratorie bruciano. Dovete trovare una via d\'uscita o una maschera!',
    onEndMessage: '☠️ Il gas si dissipa lentamente. L\'aria torna respirabile, ma i vostri polmoni bruciano ancora.',
    choices: [
      {
        text: 'Cercare una maschera antigas',
        outcome: {
          description: 'Frugate disperatamente tra le rovine e trovate una maschera antigas in un armadietto! Vi mettete la maschera e respirate a fondo. Trovate anche un antidoto per purificare il sangue dal gas.',
          endEvent: true,
          receiveItems: [{ itemId: 'antidote', quantity: 1 }],
          hpChange: -5,
        },
      },
      {
        text: 'Correre attraverso il gas',
        outcome: {
          description: 'Trattenete il fiato e correte. Il gas vi brucia la pelle e i polmoni. Arrivate dall\'altra parte tossendo violentemente, intossicati.',
          endEvent: true,
          hpChange: -20,
        },
      },
    ],
  },

  // ==========================================
  // FIRE
  // ==========================================
  event_fire: {
    id: 'event_fire',
    title: 'Incendio',
    description: 'Le fiamme divampano improvvisamente, bloccando i corridoi e le vie d\'uscita. Il calore è insopportabile e il fumo denso riempie la stanza. Il fuoco avanza inesorabile.',
    icon: '🔥',
    type: 'fire',
    duration: 2,
    effect: {
      encounterRateMod: 10,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 3,
    },
    triggerChance: 5,
    minTurn: 15,
    locationIds: [],
    onTriggerMessage: '🔥 Le fiamme esplodono all\'improvviso! L\'incendio blocca le vie di fuga! Il calore è soffocante!',
    onEndMessage: '🔥 Le fiamme si affievoliscono e si spengono. Il fumo si dissipa. L\'incendio è sotto controllo.',
    choices: [
      {
        text: 'Tentare di spegnere le fiamme',
        outcome: {
          description: 'Trovate un estintore e combattete le fiamme con coraggio. Il fuoco resiste ma alla fine cede sotto il getto di schiuma. Il corridoio è libero.',
          endEvent: true,
          hpChange: -5,
        },
      },
      {
        text: 'Cercare una via alternativa',
        outcome: {
          description: 'Lasciate che il fuoco bruci e cercate un\'altra via. Attraverso un condotto di ventilazione trovate una stanza sicura con alcuni rifornimenti abbandonati.',
          endEvent: true,
          receiveItems: [{ itemId: 'bandage', quantity: 2 }],
          hpChange: -8,
        },
      },
    ],
  },
};
