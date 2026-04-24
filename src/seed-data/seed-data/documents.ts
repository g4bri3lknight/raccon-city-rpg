import { GameDocument } from '@/game/types';

export const SEED_DOCUMENTS: Record<string, GameDocument> = {
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
    title: 'Urgente: Fuga T-Virus',
    content: 'Da: Dr. William Birkin <w.birkin@umbrella-corp.net>\nA: Direzione Umbrella <board@umbrella-corp.net>\nOggetto: INCIDENTE CRITICO — Fuga T-Virus\nData: 24 settembre, 02:47\nPriorità: ■■■ MASSIMA\n\nIl T-virus è stato accidentalmente rilasciato durante un sabotaggio alla rete di contenimento del laboratorio sotterraneo. Tutti i soggetti del Progetto Tyrant sono stati compromessi.\n\nAttivare il Protocollo di Pulizia immediatamente. Nessun testimone deve sopravvivere.\n\n— W.B.',
    type: 'email',
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
  doc_rpd_diary: {
    id: 'doc_rpd_diary',
    title: 'Diario del Capo Irons — Aggiunta',
    content: 'Aggiunta personale — 25 settembre. Ho trovato un pannello rimovibile dietro la foto di gruppo nell\'ufficio del capitano. Dietro c\'è un\'armeria segreta con equipaggiamento militare d\'epoca. Non ho ancora capito come aprire il meccanismo nascosto, ma ci sono delle incisioni sul telaio che sembrano un codice. Forse serve la combinazione giusta. Non lo dirò a nessuno — quella roba è mia.',
    type: 'diary',
    locationId: 'rpd_station',
    icon: '📔',
    rarity: 'rare',
    isSecret: true,
    hintRequired: 'doc_chief_diary',
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
  doc_lab_report: {
    id: 'doc_lab_report',
    title: 'Report Armi Improvvisate — Umbrella R&D',
    content: 'PROGETTO SPECIALE — Armi Improvvisate da Campo. Il nostro team ha sviluppato diverse armi utilizzando materiali di recupero: 1) Bomba Artigianale: tubo metallico riempito con polvere da sparo e schegge. Danno esplosivo garantito contro bersagli multipli. 2) Granata 40mm Potenziata: caricamento esplosivo modificato con frammentazione aumentata. 3) Munizioni Mitragliatrice: polvere ricaricata con maggiore potenza di sparo. Le ricette complete sono classificate TOP SECRET — consultare il manuale operativo Lab-B3 per i dettagli.',
    type: 'report',
    locationId: 'hospital_district',
    icon: '📋',
    rarity: 'rare',
    isSecret: true,
    hintRequired: 'doc_doctor_journal',
  },
  doc_nurse_note: {
    id: 'doc_nurse_note',
    title: 'Per chi troverà questa lettera...',
    content: 'Da: Maria Rossi <m.rossi@rc-hospital.org>\nA: Chiunque\nOggetto: Se state leggendo questo\n\nA chi troverà questa lettera: mi chiamo Maria e sono un\'infermiera del turno di notte. Le cose qui sono peggiorate troppo in fretta. Prima i pazienti del reparto isolamento sono diventati aggressivi, poi le porte si sono chiuse da sole. Ho visto il dottor Chen nascondere una famiglia nel reparto pediatria. Se state leggendo questo, forse c\'è ancora speranza. Prendete gli antidoti nella farmacia al secondo piano. Vi prego, non dimenticateci.',
    type: 'email',
    locationId: 'hospital_district',
    icon: '📧',
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
  doc_sewers_map: {
    id: 'doc_sewers_map',
    title: 'Mappa Condotti Fognari — Tratto C-7',
    content: 'PLANTOLOGIA UFFICIALE — Condotti Fognari Raccoon City. Tratto C-7 (Zona Industriale). La mappa mostra un percorso alternativo attraverso le condutture secondarie che porta direttamente al laboratorio Umbrella senza passare dal cancello principale. Le annotazioni a matita indicano un "punto di ricarica munizioni" nascosto in una nicchia del muro. La mappa include anche le istruzioni per ricaricare manualmente le munizioni 5.56mm usando polvere da sparo recuperata e bossoli vuoti. Utile per chi ha armi automatiche.',
    type: 'note',
    locationId: 'sewers',
    icon: '🗺️',
    rarity: 'rare',
    isSecret: true,
    hintRequired: 'doc_umbrella_disposal',
  },

  // ==========================================
  // LABORATORY ENTRANCE (2 documents)
  // ==========================================
  doc_research_log: {
    id: 'doc_research_log',
    title: 'Aggiornamento Settimanale Lab B3',
    content: 'Da: Team Ricerca Alpha <research.alpha@umbrella-corp.net>\nA: Quartier Generale <hq@umbrella-corp.net>\nOggetto: Report settimanale — Lab Umbrella Livello B3\n\nRegistro Operativo: Settimana 12: Il T-virus è stato stabilizzato al 97%. I Licker prodotti hanno superato tutti i test di combattimento. Settimana 15: Il progetto G-virus sta progredendo. Birkin rifiuta di condividere i dati con il quartier generale. È paranoico, pensa che vogliano rubare il suo lavoro. Settimana 18: Evacuazione d\'emergenza. I contenitori si sono rotti. Tutto il personale deve dirigersi ai punti di raccolta. Questo è il mio ultimo aggiornamento.',
    type: 'email',
    locationId: 'laboratory_entrance',
    icon: '📧',
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
    title: 'Ordine Esecutivo: Pulizia',
    content: 'Da: Comitato Esecutivo Umbrella <exec@umbrella-corp.net>\nA: Tutti i Laboratori Sotterranei\nOggetto: ORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City\nPriorità: ■■■ MASSIMA\n\nORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City. Priorità: Massima. Tutti i laboratori sotterranei devono essere distrutti. Tutti i documenti compromessi devono essere inceneriti. I sopravvissuti nelle strutture mediche sono da considerarsi perduti. Un missile termobarico è stato autorizzato per le ore 06:00 del mattino successivo. La Umbrella negherà ogni coinvolgimento. La storia ufficiale parlerà di una "fuga di gas tossico da un impianto chimico". Nessuno deve sapere la verità.',
    type: 'email',
    locationId: 'clock_tower',
    icon: '📧',
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

  // ==========================================
  // CEMETERY (2 documents)
  // ==========================================
  doc_cemetery_grave: {
    id: 'doc_cemetery_grave',
    title: 'Epitaffio sulla Lapide',
    content: 'Sulla lapide della famiglia Viscardi c\'è un\'iscrizione consumata dal tempo: "Qui giace colui che vide la verità. La Umbrella non perdona chi conosce i suoi segreti. — A.V., 1987". Sotto l\'epitaffio, delle lettere quasi illeggibili formano una sequenza che sembra un codice.',
    type: 'note',
    locationId: 'cemetery',
    icon: '🪦',
    rarity: 'common',
    isSecret: false,
  },
  doc_cemetery_catacomb: {
    id: 'doc_cemetery_catacomb',
    title: 'Registro Catacombe — Protocollo Viscardi',
    content: 'DOCUMENTO RISERVATO — Famiglia Viscardi. Le catacombe sotto il cimitero sono state convertite in un deposito di emergenza per i campioni del virus T. Le provette sono sigillate nei sarcofagi di marmo. In caso di fuga, attivare il protocollo di incenerimento tramite il pannello nella cripta principale. Solo il direttore del progetto ha il codice di accesso: 7391. La Umbrella monitorerà il sito tramite telecamere nascoste nelle statue angeliche.',
    type: 'umbrella_file',
    locationId: 'cemetery',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: true,
    hintRequired: 'doc_cemetery_grave',
  },

  // ==========================================
  // ABANDONED HOSPITAL (2 documents)
  // ==========================================
  doc_abandoned_records: {
    id: 'doc_abandoned_records',
    title: 'Registro Pazienti — Reparto Sperimentale',
    content: 'Registro Pazienti — Ospedale Psichiatrico Raccoon City. Reparto D (Sperimentale). I pazienti ricoverati tra il 1985 e il 1990 sono stati sottoposti a test con il virus T in fase embrionale. Nessun paziente è sopravvissuto oltre il sesto mese. I corpi sono stati smaltiti tramite il sistema fognario conforme all\'accordo con la Umbrella Corporation.',
    type: 'report',
    locationId: 'abandoned_hospital',
    icon: '📋',
    rarity: 'common',
    isSecret: false,
  },
  doc_abandoned_journal: {
    id: 'doc_abandoned_journal',
    title: 'Diario della Dottoressa Moretti',
    content: 'Diario personale — Dr.ssa Elena Moretti. 15 marzo 1998: Non resisto più. Quello che stiamo facendo qui non è medicina, è tortura. I pazienti del reparto D urlano di notte. La Umbrella ci ha ordinato di aumentare il dosaggio. L\'ho fatto, e adesso tre di loro si sono trasformati in qualcosa che non riesco a descrivere. Se qualcuno troverà questo diario, sappia che la Umbrella sapeva tutto fin dall\'inizio.',
    type: 'diary',
    locationId: 'abandoned_hospital',
    icon: '📔',
    rarity: 'uncommon',
    isSecret: true,
    hintRequired: 'doc_abandoned_records',
  },

  // ==========================================
  // WATER TOWER (2 documents)
  // ==========================================
  doc_water_maintenance: {
    id: 'doc_water_maintenance',
    title: 'Report Manutenzione Torre Idrica',
    content: 'Report trimestrale — Manutenzione Torre Idrica Zona Industriale. Le condutture principali presentano corrosione avanzata. Il liquido di scarto dal laboratorio Umbrella ha accelerato il deterioramento. Si raccomanda la sostituzione delle valvole di sicurezza nei prossimi 30 giorni. NOTA BENE: Il serbatoio di contenimento al livello inferiore non deve essere aperto senza attrezzature di protezione biologica di livello 4.',
    type: 'note',
    locationId: 'water_tower',
    icon: '📝',
    rarity: 'common',
    isSecret: false,
  },
  doc_water_umbrella: {
    id: 'doc_water_umbrella',
    title: 'Protocollo Smaltimento Bio-Rifiuti',
    content: 'PROTOCOLO UMBRELLA — Smaltimento Rifiuti Biologici Livello 4. La torre idrica della zona industriale è il punto di smaltimento primario per i campioni virus T e G non più necessari. Il sistema di diluizione nel serbatoio principale riduce la concentrazione virale al 0.01%. Tuttavia, l\'esposizione prolungata al liquido di scarto può causare mutazioni cellulari nei soggetti con sistema immunitario compromesso. Monitorare costantemente la qualità dell\'acqua nel raggio di 500 metri.',
    type: 'umbrella_file',
    locationId: 'water_tower',
    icon: '📁',
    rarity: 'uncommon',
    isSecret: true,
    hintRequired: 'doc_water_maintenance',
  },
};
