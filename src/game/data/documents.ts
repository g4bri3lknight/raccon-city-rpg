import { GameDocument } from '../types';

export const DOCUMENTS: Record<string, GameDocument> = {
  // ==========================================
  // CITY OUTSKIRTS (3 documents)
  // ==========================================
  doc_survivor_note: {
    id: 'doc_survivor_note',
    title: 'Nota del Sopravvissuto',
    content: 'Se qualcuno trova questo messaggio, scappate. La città è perduta. Ho visto i militari aprire il fuoco sui civili — non per proteggerci, ma per coprire la fuga dei ricercatori della Umbrella. Il virus si sta diffondendo troppo velocemente. Non ci sono vie di fuga dal lato est. La polizia alla R.P.D. sta ancora resistendo, ma per quanto ancora? Io non ce la faccio più...',
    type: 'note',
    locationId: 'city_outskirts',
    icon: '📝',
    rarity: 'common',
    isSecret: false,
  },
  doc_umbrella_memo: {
    id: 'doc_umbrella_memo',
    title: 'Fuga T-Virus — Avviso Urgente',
    content: `Il T-virus è stato accidentalmente rilasciato durante un sabotaggio alla rete di contenimento. Tutti i soggetti del Progetto Tyrant sono stati compromessi.

Attivare il Protocollo di Pulizia immediatamente. Nessun testimone deve sopravvivere.

Le squadre di recupero della USS devono evacuare il personale chiave entro le 02:00. I campioni del G-virus hanno la massima priorità — non lasciare nulla al nemico.

La sede centrale è informata. Niente comunicazione esterna non autorizzata.

Dr. William Birkin
Capo Ricercatore — Progetto Tyrant`,
    type: 'email',
    locationId: 'city_outskirts',
    icon: '📧',
    rarity: 'uncommon',
    isSecret: false,
    emailMeta: {
      from: 'Dr. William Birkin <w.birkin@umbrella-rc.int>',
      to: 'Direzione Umbrella <board@umbrella-corp.int>',
      date: '24 Settembre 1998, 21:47',
      cc: 'Sicurezza Interna <security@umbrella-corp.int>',
      priority: 'urgent',
      attachments: ['Protocollo_Pulizia_v3.2.enc', 'Mappa_Evacuazione_RaccoonCity.pdf'],
    },
  },
  doc_umbrella_order_email: {
    id: 'doc_umbrella_order_email',
    title: 'Ordine di Missione — Squadra Umbrella',
    content: `Alla cortese attenzione del Comandante USS,

Vi viene assegnata la missione "Operazione Nemesi" con il seguente mandato:

1. Recuperare i campioni del G-virus dal Dr. William Birkin
2. Eliminare tutti i membri rimanenti della S.T.A.R.S. nella zona di Raccoon City
3. Non lasciare tracce dell'intervento

L'Operazione deve essere completata entro 48 ore dall'attivazione. Le vostre identità coperte presso il dipartimento di polizia di Raccoon City rimangono attive per tutto il periodo operativo.

Il fallimento di questa missione non è un'opzione accettabile.

In attesa di conferma di ricevuta.

---
Col. Sergei Vladimir
Direzione Operazioni Speciali — Umbrella Corporation`,
    type: 'email',
    locationId: 'city_outskirts',
    icon: '📧',
    rarity: 'rare',
    isSecret: false,
    emailMeta: {
      from: 'Col. Sergei Vladimir <s.vladimir@umbrella-mil.int>',
      to: 'Comando USS <uss-command@umbrella-mil.int>',
      date: '23 Settembre 1998, 14:22',
      cc: 'Divisione B.O.W. <bow-division@umbrella-corp.int>',
      priority: 'high',
      attachments: ['Dossier_STARS_Targets.pdf', 'Mappa_Sicurezza_RPD.classified'],
    },
  },

  // ==========================================
  // RPD STATION (3 documents)
  // ==========================================
  doc_police_log: {
    id: 'doc_police_log',
    title: 'Registro Radio della Polizia',
    content: '22:15 — Segnalazioni di attacchi nella zona est. Mandato pattuglia Irons.\n23:42 — La pattuglia non risponde. Niente di niente sulla radio.\n00:30 — Il capo Irons ha ordinato di sigillare il distretto. Dice che non sta arrivando nessun soccorso.\n01:15 — Sentiamo dei rumori dal sotterraneo. Non so cosa sia, ma i cani della K-9 sono impazziti.\nDio, aiutateci.',
    type: 'report',
    locationId: 'rpd_station',
    icon: '📋',
    rarity: 'common',
    isSecret: false,
  },
  doc_chief_diary: {
    id: 'doc_chief_diary',
    title: 'Diario del Capo Irons',
    content: 'La Umbrella mi ha contattato di nuovo. Stanno costruendo un laboratorio segreto sotto l\'ospedale della città, accessibile solo tramite un passaggio nascosto nella cantina. Il capo del progetto è un tipo chiamato Birkin — un genio, ma pericolosamente instabile. Mi hanno pagato profumatamente per tenere la polizia lontana da certe zone della città. Non so più cosa sia giusto e cosa sia sbagliato. Gli esperimenti su quelle creature... li sento urlare di notte.',
    type: 'diary',
    locationId: 'rpd_station',
    icon: '📔',
    rarity: 'rare',
    isSecret: false,
  },
  doc_locker_photo: {
    id: 'doc_locker_photo',
    title: 'Foto Familiare nell\'Armadietto',
    content: 'Una foto consumata dal tempo raffigura un agente in uniforme con la moglie e due bambini. Sul retro c\'è scritto a matita: "A mia moglie Sarah e ai miei ragazzi. Tornerò a casa. Prometto. — M. Branagh, R.P.D." L\'agente Branagh è tra i corpi nel parcheggio sotterraneo.',
    type: 'photo',
    locationId: 'rpd_station',
    icon: '📷',
    rarity: 'common',
    isSecret: false,
  },

  // ==========================================
  // HOSPITAL DISTRICT (3 documents)
  // ==========================================
  doc_patient_record: {
    id: 'doc_patient_record',
    title: 'Cartella Clinica — Soggetto Zero',
    content: `REGISTRO SPERIMENTALE — Top Secret.

Soggetto: "Paziente Zero"
Età: 34 anni
Sesso: M
Esposizione: diretta al G-virus inalato

Giorno 1: Febbre alta, delirio.
Giorno 2: Mutazione cellulare rapida, crescita muscolare anomala.
Giorno 3: Soggetto ha rifiutato il cibo. Ha attaccato il personale medico. Isolamento fallito.

Il G-virus è infinitamente più instabile del T-virus. Se qualcuno viene infettato, la mutazione è irreversibile.`,
    type: 'umbrella_file',
    locationId: 'hospital_district',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: false,
  },
  doc_doctor_journal: {
    id: 'doc_doctor_journal',
    title: 'Diario del Dr. Birkin',
    content: 'Il Nemesis è quasi completo. Abbiamo incastonato un parassita NE-α nel sistema nervoso di un Tyrant di classe T-103. Il risultato è un\'arma biologica senziente — capace di seguire obiettivi specifici e adattarsi alle condizioni di combattimento. Ma ieri sera ho visto il Nemesis rompere la sua cella di contenimento. Ha ucciso tre tecnici prima che riuscissimo a sedarlo. L\'Umbrella vuole usarlo contro i membri della S.T.A.R.S. che sono sopravvissuti al massacro della villa.',
    type: 'diary',
    locationId: 'hospital_district',
    icon: '📔',
    rarity: 'rare',
    isSecret: false,
  },
  doc_hospital_email: {
    id: 'doc_hospital_email',
    title: 'Emergenza Biologica — Avviso Personale',
    content: `A tutto il personale ospedaliero,

Con effetto immediato, il reparto di terapia intensiva è stato posto in quarantena totale. Non è consentito l'accesso a nessun personale non autorizzato.

Tre pazienti del reparto isolamento hanno sviluppato sintomi mai registrati in precedenza: necrosi tissutale accelerata, aggressività estrema e rigenerazione cellulare anomala.

I test preliminari suggeriscono un agente patogeno di natura virale, ma la struttura molecolare non corrisponde a nessun virus noto nella letteratura medica.

Tutto il personale deve indossare equipaggiamento di protezione Livello 4. Chiunque mostri sintomi di febbre o confusione deve recarsi immediatamente alla stanza 204 per la valutazione.

Non contattare le autorità esterne. Questo ordine viene direttamente dalla direzione ospedaliera.

Dr. A. Chen
Primario — Ospedale Generale di Raccoon City`,
    type: 'email',
    locationId: 'hospital_district',
    icon: '📧',
    rarity: 'uncommon',
    isSecret: false,
    emailMeta: {
      from: 'Dr. A. Chen <a.chen@raccoon-hospital.org>',
      to: 'personale@raccoon-hospital.org',
      date: '24 Settembre 1998, 18:30',
      priority: 'urgent',
      attachments: ['Protocollo_Quarantena_v2.pdf'],
    },
  },

  // ==========================================
  // SEWERS (3 documents)
  // ==========================================
  doc_worker_note: {
    id: 'doc_worker_note',
    title: 'Nota del Manutentore',
    content: 'Giornale di bordo — Operai municipalità. Turno: notte del 24. Abbiamo sentito dei rumori provenienti dai condotti principali. Pensavamo fosse un animale bloccato. Quello che abbiamo trovato era... non so descriverlo. Una creatura senza occhi, con una lingua enorme. Ha ucciso Rodriguez e Ferretti prima che potessimo scappare. Sono barricato nella sala pompe. L\'acqua sta salendo. Se qualcuno legge questo, non venite a cercarmi.',
    type: 'note',
    locationId: 'sewers',
    icon: '📝',
    rarity: 'common',
    isSecret: false,
  },
  doc_umbrella_disposal: {
    id: 'doc_umbrella_disposal',
    title: 'Report Smaltimento Umbrella',
    content: `Le creature fallite del Progetto Tyrant vengono smaltite attraverso il sistema fognario della città, come da accordi con il municipio.

Tuttavia, recentemente diversi soggetti hanno mostrato segni di "riattivazione" post-smaltimento. Si raccomanda di installare telecamere nel condotto principale vicino alla grata nord.

Inoltre, la stanza di stoccaggio segreta nel tratto C-7 deve essere monitorata costantemente. Nessun operatore non autorizzato deve accedervi.

Questa direttiva è classificata ULTRA-SECRET. La violazione comporterà l'eliminazione immediata del soggetto responsabile secondo il Protocollo Omega.`,
    type: 'email',
    locationId: 'sewers',
    icon: '📧',
    rarity: 'rare',
    isSecret: false,
    hintRequired: 'doc_chief_diary',
    emailMeta: {
      from: 'Reparto Smaltimento <disposal@umbrella-facilities.int>',
      to: 'Sicurezza Laboratori <lab-security@umbrella-corp.int>',
      date: '18 Settembre 1998, 09:15',
      cc: 'Direzione Operativa <ops@umbrella-corp.int>',
      priority: 'high',
      attachments: ['Mappa_Condotti_C7.classified', 'Report_Riattivazione_Soggetti.pdf'],
    },
  },
  doc_sewer_email: {
    id: 'doc_sewer_email',
    title: 'Segnalazione Anomalia — Condotti C-7',
    content: `Si segnala un'anomalia critica nella sezione C-7 del sistema fognario.

Durante il turno di notte, le telecamere hanno registrato movimenti nei condotti che dovrebbero essere vuoti. L'analisi delle immagini mostra quello che sembra essere un organismo di grandi dimensioni — stimato 2-3 metri — che si muove tra i tubi principali.

La teoria più probabile è che uno o più soggetti smaltiti abbiano subìto riattivazione spontanea.

Richiedo l'invio immediato di una squadra di contenimento. Il settore deve essere sigillato.

NOTA: Il monitoraggio continuo mostra che l'organismo si sta dirigendo verso il collegamento con il laboratorio sotterraneo. Se raggiunge la struttura, le conseguenze potrebbero essere catastrofiche.

Tecnico M. Torres
Sicurezza Perimetrale — Settore Fognature`,
    type: 'email',
    locationId: 'sewers',
    icon: '📧',
    rarity: 'uncommon',
    isSecret: false,
    emailMeta: {
      from: 'Tecnico M. Torres <m.torres@umbrella-facilities.int>',
      to: 'Sicurezza Laboratori <lab-security@umbrella-corp.int>',
      date: '21 Settembre 1998, 03:44',
      priority: 'urgent',
      attachments: ['Frame_Cam07_Anomalia.jpg', 'Tracciato_Movimento_C7.gif'],
    },
  },

  // ==========================================
  // LABORATORY ENTRANCE (3 documents)
  // ==========================================
  doc_research_log: {
    id: 'doc_research_log',
    title: 'Registro del Team di Ricerca',
    content: `Registro Operativo — Lab Umbrella, Livello B3.

Settimana 12: Il T-virus è stato stabilizzato al 97%. I Licker prodotti hanno superato tutti i test di combattimento.
Settimana 15: Il progetto G-virus sta progredendo. Birkin rifiuta di condividere i dati con il quartier generale. È paranoico, pensa che vogliano rubare il suo lavoro.
Settimana 18: Evacuazione d'emergenza. I contenitori si sono rotti. Tutto il personale deve dirigersi ai punti di raccolta. Questo è il mio ultimo aggiornamento.`,
    type: 'umbrella_file',
    locationId: 'laboratory_entrance',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: false,
  },
  doc_tyrant_blueprint: {
    id: 'doc_tyrant_blueprint',
    title: 'Progetto Tyrant — Blueprints Originales',
    content: `PROGETTO T-103 — TYRANT.

Classe: Arma Biologica Organica (B.O.W.)
Obiettivo: Creare un soldato biologico perfetto — immune al dolore, obbediente, estremamente resiliente.

Il Tyrant è stato progettato per essere trasportato in capsule criogeniche e attivato sul campo. Il punto debole è la cellula regolatrice nel tronco cerebrale: se danneggiata, il Tyrant entra in uno stato di mutazione instabile che lo rende più lento ma devastante.

Un colpo diretto al centro vitale con armi pesanti può fermarlo.`,
    type: 'umbrella_file',
    locationId: 'laboratory_entrance',
    icon: '📄',
    rarity: 'legendary',
    isSecret: true,
  },
  doc_lab_email: {
    id: 'doc_lab_email',
    title: 'Avviso Critico — Contenimento Fallito',
    content: `ATTENZIONE — PRIORITÀ MASSIMA

Il sistema di contenimento del livello B3 ha subito un guasto critico alle 22:15. Diversi contenitori di T-virus si sono rotti durante un terremoto secondario.

Stato attuale:
- Contenimento primario: FALLITO
- Contenimento secondario: FALLITO
- Porte blast: ATTIVE ma danneggiate
- Evacuazione: IN CORSO

Tutti i ricercatori devono dirigersi immediatamente agli ascensori di superficie. NON utilizzare le scale di emergenza del livello B4 — la zona è già compromessa.

I campioni del G-virus nel laboratorio di Birkin sono intatti. Una squadra USS è in arrivo per recuperarli.

NON cercare di recuperare dati o attrezzature. L'evacuazione ha la massima priorità.

Dr. J. Trent
Coordinatore Sicurezza — Laboratorio Umbrella Raccoon City`,
    type: 'email',
    locationId: 'laboratory_entrance',
    icon: '📧',
    rarity: 'rare',
    isSecret: false,
    emailMeta: {
      from: 'Dr. J. Trent <j.trent@umbrella-rc.int>',
      to: 'tutto-il-personale@umbrella-rc.int',
      date: '24 Settembre 1998, 22:32',
      priority: 'urgent',
      attachments: ['Piano_Evacuazione_B3.pdf', 'Mappa_Zone_Compromesse.jpg'],
    },
  },

  // ==========================================
  // CLOCK TOWER (3 documents)
  // ==========================================
  doc_final_report: {
    id: 'doc_final_report',
    title: 'Report Finale Umbrella — Pulizia',
    content: `ORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City.

Priorità: Massima.

Tutti i laboratori sotterranei devono essere distrutti.
Tutti i documenti compromessi devono essere inceneriti.
I sopravvissuti nelle strutture mediche sono da considerarsi perduti.

Un missile termobarico è stato autorizzato per le ore 06:00 del mattino successivo. La Umbrella negherà ogni coinvolgimento. La storia ufficiale parlerà di una "fuga di gas tossico da un impianto chimico".

Nessuno deve sapere la verità.`,
    type: 'report',
    locationId: 'clock_tower',
    icon: '📋',
    rarity: 'rare',
    isSecret: false,
  },
  doc_helicopter_log: {
    id: 'doc_helicopter_log',
    title: 'Diario del Pilota d\'Elicottero',
    content: 'Registro di volo — Operazione "Ultima Speranza". Sono un pilota civile arruolato d\'urgenza. Mi hanno detto che devo evacuare i sopravvissuti dalla torre dell\'orologio, ma da quello che vedo dalla cabina... non c\'è nessuno. La città è un inferno. Il fuoco brucia ovunque e quelle cose — quelle cose sono ovunque. Devo mantenere la rotta per altri dieci minuti. Se non trovo nessuno, torno alla base. Che Dio aiuti Raccoon City.',
    type: 'note',
    locationId: 'clock_tower',
    icon: '📝',
    rarity: 'uncommon',
    isSecret: false,
  },
  doc_missile_authorization: {
    id: 'doc_missile_authorization',
    title: 'Autorizzazione Missilistica — Operazione "Fiamma Purificatrice"',
    content: `Da: Consiglio di Amministrazione Umbrella
A: Comando Forze Operative

Si autorizza formalmente l'esecuzione dell'Operazione "Fiamma Purificatrice" sulla città di Raccoon City, Stati Uniti.

Dettagli operativi:
- Ordigno: Missile termobarico tattico (carico convenzionale)
- Orario previsto: 06:00 del 28 Settembre 1998
- Zona bersaglio: Centro cittadino (raggio 5 km dal municipio)
- Giustificazione ufficiale: Incidente chimico alla Arklay Chemical Plant

La distruzione garantirà l'eliminazione di tutte le prove relative al Progetto T e al Progetto G. Nessun sopravvissuto è atteso nella zona di impatto.

Le squadre di pulizia post-impatto sono già in posizione. La storia ufficiale è stata preparata e distribuita ai media compiacenti.

Si ricorda a tutto il personale che questo ordine è classificato OMEGA. La divulgazione comporterà l'eliminazione immediata.

---
Confermato dal Consiglio di Amministrazione
Umbrella Corporation — Sede Centrale`,
    type: 'email',
    locationId: 'clock_tower',
    icon: '📧',
    rarity: 'legendary',
    isSecret: true,
    hintRequired: 'doc_final_report',
    emailMeta: {
      from: 'Consiglio di Amministrazione <board@umbrella-corp.int>',
      to: 'Comando Operazioni <ops-command@umbrella-mil.int>',
      date: '27 Settembre 1998, 23:15',
      cc: 'Relazioni Pubbliche <pr@umbrella-corp.int>',
      priority: 'urgent',
      attachments: ['Autorizzazione_Esecutiva_Omega.enc', 'Piano_Media_Copertura.pdf', 'Mappa_Impatto_Raggio5km.classified'],
    },
  },
};
