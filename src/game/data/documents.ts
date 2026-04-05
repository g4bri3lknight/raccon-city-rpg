import { GameDocument } from '../types';

export const DOCUMENTS: Record<string, GameDocument> = {
  // ==========================================
  // CITY OUTSKIRTS (2 documents)
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
    title: 'Memo Umbrella — Fuga T-Virus',
    content: 'MEMO INTERNO — CLASSIFICATO. Da: Dr. William Birkin. A: Direzione Umbrella. Oggetto: Incidente laboratorio Raccoon City. Il T-virus è stato accidentalmente rilasciato durante un sabotaggio alla rete di contenimento. Tutti i soggetti del Progetto Tyrant sono stati compromessi. Attivare il Protocollo di Pulizia immediatamente. Nessun testimone deve sopravvivere.',
    type: 'umbrella_file',
    locationId: 'city_outskirts',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: false,
  },

  // ==========================================
  // RPD STATION (3 documents)
  // ==========================================
  doc_police_log: {
    id: 'doc_police_log',
    title: 'Registro Radio della Polizia',
    content: '22:15 — Segnalazioni di attacchi nella zona est. Mandato pattuglia Irons. 23:42 — La pattuglia non risponde. Niente di niente sulla radio. 00:30 — Il capo Irons ha ordinato di sigillare il distretto. Dice che non sta arrivando nessun soccorso. 01:15 — Sentiamo dei rumori dal sotterraneo. Non so cosa sia, ma i cani della K-9 sono impazziti. Dio, aiutateci.',
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
    content: 'REGISTRO SPERIMENTALE — Top Secret. Soggetto: "Paziente Zero". Età: 34 anni. Sesso: M. Esposizione: diretta al G-virus inalato. Giorno 1: Febbre alta, delirio. Giorno 2: Mutazione cellulare rapida, crescita muscolare anomala. Giorno 3: Soggetto ha rifiutato il cibo. Ha attaccato il personale medico. Isolamento fallito. Il G-virus è infinitamente più instabile del T-virus. Se qualcuno viene infettato, la mutazione è irreversibile.',
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
  doc_nurse_note: {
    id: 'doc_nurse_note',
    title: 'Lettera dell\'Infermiera',
    content: 'A chi troverà questa lettera: mi chiamo Maria e sono un\'infermiera del turno di notte. Le cose qui sono peggiorate troppo in fretta. Prima i pazienti del reparto isolamento sono diventati aggressivi, poi le porte si sono chiuse da sole. Ho visto il dottor Chen nascondere una famiglia nel reparto pediatria. Se state leggendo questo, forse c\'è ancora speranza. Prendete gli antidoti nella farmacia al secondo piano. Vi prego, non dimenticateci.',
    type: 'note',
    locationId: 'hospital_district',
    icon: '📝',
    rarity: 'common',
    isSecret: false,
  },

  // ==========================================
  // SEWERS (2 documents)
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
    content: 'REPORT INTERNO — Smaltimento Rifiuti Biologici. Le creature fallite del Progetto Tyrant vengono smaltite attraverso il sistema fognario della città, come da accordi con il municipio. Tuttavia, recentemente diversi soggetti hanno mostrato segni di "riattivazione" post-smaltimento. Si raccomanda di installare telecamere nel condotto principale vicino alla grata nord. Inoltre, la stanza di stoccaggio segreta nel tratto C-7 deve essere monitorata costantemente. Nessun operatore non autorizzato deve accedervi.',
    type: 'umbrella_file',
    locationId: 'sewers',
    icon: '📁',
    rarity: 'rare',
    isSecret: false,
    hintRequired: 'doc_chief_diary',
  },

  // ==========================================
  // LABORATORY ENTRANCE (2 documents)
  // ==========================================
  doc_research_log: {
    id: 'doc_research_log',
    title: 'Registro del Team di Ricerca',
    content: 'Registro Operativo — Lab Umbrella, Livello B3. Settimana 12: Il T-virus è stato stabilizzato al 97%. I Licker prodotti hanno superato tutti i test di combattimento. Settimana 15: Il progetto G-virus sta progredendo. Birkin rifiuta di condividere i dati con il quartier generale. È paranoico, pensa che vogliano rubare il suo lavoro. Settimana 18: Evacuazione d\'emergenza. I contenitori si sono rotti. Tutto il personale deve dirigersi ai punti di raccolta. Questo è il mio ultimo aggiornamento.',
    type: 'umbrella_file',
    locationId: 'laboratory_entrance',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: false,
  },
  doc_tyrant_blueprint: {
    id: 'doc_tyrant_blueprint',
    title: 'Progetto Tyrant — Blueprints Originales',
    content: 'PROGETTO T-103 — TYRANT. Classe: Arma Biologica Organica (B.O.W.). Obiettivo: Creare un soldato biologico perfetto — immune al dolore, obbediente, estremamente resiliente. Il Tyrant è stato progettato per essere trasportato in capsule criogeniche e attivato sul campo. Il punto debole è la cellula regolatrice nel tronco cerebrale: se danneggiata, il Tyrant entra in uno stato di mutazione instabile che lo rende più lento ma devastante. Un colpo diretto al centro vitale con armi pesanti può fermarlo.',
    type: 'umbrella_file',
    locationId: 'laboratory_entrance',
    icon: '📄',
    rarity: 'legendary',
    isSecret: true,
  },

  // ==========================================
  // CLOCK TOWER (2 documents)
  // ==========================================
  doc_final_report: {
    id: 'doc_final_report',
    title: 'Report Finale Umbrella — Pulizia',
    content: 'ORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City. Priorità: Massima. Tutti i laboratori sotterranei devono essere distrutti. Tutti i documenti compromessi devono essere inceneriti. I sopravvissuti nelle strutture mediche sono da considerarsi perduti. Un missile termobarico è stato autorizzato per le ore 06:00 del mattino successivo. La Umbrella negherà ogni coinvolgimento. La storia ufficiale parlerà di una "fuga di gas tossico da un impianto chimico". Nessuno deve sapere la verità.',
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
};
