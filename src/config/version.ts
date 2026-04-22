/**
 * App Versioning System
 * 
 * Semantic Versioning: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes / major feature releases
 * - MINOR: New features (backwards compatible)
 * - PATCH: Bug fixes and small improvements
 * 
 * ⚠️ IMPORTANT: Every code change MUST update this file!
 * 
 * Format: { version, date, description }
 */

export const APP_VERSION = '1.8.0' as const;

export const VERSION_HISTORY: Array<{
  version: string;
  date: string;
  changes: string[];
}> = [
  {
    version: '1.0.0',
    date: '2025-03-04',
    changes: [
      'Sistema di versioning implementato',
      'Footer con versione dell\'applicazione',
    ],
  },
  {
    version: '1.0.1',
    date: '2025-03-04',
    changes: [
      'Fix footer che sovrapponeva il pannello titolo',
    ],
  },
  {
    version: '1.0.2',
    date: '2025-03-04',
    changes: [
      'Fix Colpo Mortale: ora colpisce correttamente il target selezionato',
      'Fix Raffica: ora applica il danno principale al target + danno collaterale agli altri',
      'Refactor handleDealDamage: risoluzione target primario all\'inizio, come attacco base',
    ],
  },
  {
    version: '1.0.3',
    date: '2025-03-04',
    changes: [
      'Fix log attacco base: non mostra più "usa [arma] ma non ha effetti" per armi con solo effetti passivi',
    ],
  },
  {
    version: '1.0.4',
    date: '2025-06-18',
    changes: [
      'Fix handleDealDamage: aggiunto fallback sicuro per effetti single-target quando la lookup per ID fallisce',
      'Fix resolveTargets: rimosso fallback per nome che poteva colpire il nemico sbagliato con nemici duplicati',
      'Fix executeEffectsInternal: aggiunto fallback definitionId per enemy re-instantiati',
      'Migliorato logging diagnostico per debug del targeting in combattimento',
    ],
  },
  {
    version: '1.0.5',
    date: '2025-06-20',
    changes: [
      'Fix critico store.ts: usava character.special1Id/special2Id invece di resolveSpecialId() per archetipi predefiniti',
      'Fix store.ts: risoluzione target per abilità speciali ora usa la stessa logica dell\'attacco base (solo nemici vivi, nessun fallback sbagliato)',
      'Fix Colpo Mortale: non mostra più "non ci sono bersagli validi" per archetipi predefiniti (DPS, Tank, Healer, Control)',
      'Fix Raffica: primo effetto ora infligge correttamente danni al target selezionato',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-06-20',
    changes: [
      'Refactor: eliminato store.ts monolitico (6352 righe), ora si usa store/index.ts con 14 slices modulari',
      'La migrazione risolve definitivamente i bug di targeting delle abilità speciali (le slices avevano già resolveSpecialId corretto)',
      'Zero breaking changes: tutti i 29 componenti continuano a importare da @/game/store senza modifiche',
      'Slices: core, exploration, combat, inventory, achievements, settings, puzzle, qte, documents, npc, events, safe-room, save, debug',
    ],
  },
  {
    version: '1.1.1',
    date: '2025-06-20',
    changes: [
      'Fix struttura: eliminata cartella duplicata src/app/api/api/ (57 route.ts identici a src/app/api/)',
      'Rimossi route fantasma /api/api/* che non venivano utilizzati',
    ],
  },
  {
    version: '1.1.2',
    date: '2025-06-20',
    changes: [
      'Fix advanceToNextActor: assignment to constant variable afterEnemyAttack — destrutturazione corretta con let',
    ],
  },
  {
    version: '1.1.3',
    date: '2025-06-20',
    changes: [
      'Fix combat slice: notifId non definito — sostituito con nextNotifId() da helpers',
    ],
  },
  {
    version: '1.2.0',
    date: '2025-06-20',
    changes: [
      'Fix anti-spam esplora: aggiunto flag isExploring che impedisce click multipli durante l\'elaborazione — previene race condition (combat + evento dinamico sovrapposti)',
      'Fix eventi dinamici: aggiunto disabled a tutti i tasti azione + opzioni viaggio quando evento attivo (non solo pointer-events-none CSS)',
      'Fix combat: pannello oggetti spostato più a sinistra (right 220px) per non sovrapporre il pannello azioni su desktop',
      'Fix notifId: sostituito con nextNotifId() in events.ts e npc.ts (ultimi residui del vecchio store.ts)',
      'Il selettore quantità per trasferimento oggetti era già implementato (ammo/healing/antidote con qty > 1)',
    ],
  },
  {
    version: '1.3.0',
    date: '2025-06-20',
    changes: [
      'Audit completo: corretti 24 bug su tutto il codebase (6 critici, 8 alti, 7 medi, 3 bassi)',
      '[CRITICO] Fix save/load: aggiunti bestiary, achievements, autoCombat, dataVersion, searchedSafeRooms a tutte le 3 funzioni di salvataggio e loadGame',
      '[CRITICO] Fix saveGameVictory: aggiunti nemesisPursuitLevel, nemesisLastSeen/Location, bossPhases, lastAutoSaveTurn + size guard per randomizedLocationData',
      '[CRITICO] Fix closePuzzle: ora marca come completato solo se il puzzle è stato risolto — chiusura senza risoluzione non blocca più il puzzle',
      '[CRITICO] Fix startNewGamePlus: aggiunti reset per skipNextEncounter, nemesis*, bossPhases, debugOpen, godMode, autoCombat, randomizer*, ecc.',
      '[CRITICO] Fix ExplorationScreen: null guard su location spostato prima dell\'accesso alle proprietà',
      '[CRITICO] Fix loadGame: aggiunti searchedSafeRooms, skipNextEncounter, godMode, debugOpen, dataVersion, settingsOpen',
      '[ALTO] Fix goToCharacterSelect: aggiunto reset completo di tutti i campi GameState',
      '[ALTO] Fix GameNotification: ternario no-op corretto — label ora mostrato nel messaggio; particelle useMemo per evitare jitter',
      '[ALTO] Fix InventoryPanel: guardia null per selectedChar quando party è vuoto',
      '[ALTO] Fix SafeRoomPanel: h-screen → h-dvh sm:h-screen per viewport mobile',
      '[ALTO] Fix qte.ts: rimpiazzata mutazione diretta dello stato con set(); rimossi import inutilizzati',
      '[ALTO] Fix combat engine: clonazione activeEffects prima di handleDealDamage per evitare mutazione scudi; miss logga undefined invece di 0',
      '[MEDIO] Fix buildStartState: merge con getDefaultState() per garantire tutti i campi presenti',
      '[MEDIO] Fix determineEnding: aggiunto fallback se ending_escape non esiste',
      '[MEDIO] Fix ExplorationScreen: rimossi sottoscrizioni store inutilizzate (startQTE, encounterNpc); SafeRoomPanel in AnimatePresence; partyAvatarData in useMemo',
      '[MEDIO] Fix CombatScreen: useCallback per getAnimForTarget con useRef stabile',
      '[MEDIO] Fix NPCDialogPanel: setTimeout con cleanup mountedRef per prevenire side-effect dopo unmount',
      '[BASSO] Cleanup: rimosso NemesisInvasionState (dead code), parametro action inutile in playNemesisAttack',
    ],
  },
  {
    version: '1.4.0',
    date: '2025-06-21',
    changes: [
      'Secondo audit completo: corretti 18 bug su store, engine, UI e backend (3 critici, 3 alti, 5 medi, 7 bassi)',
      '[CRITICO] Fix explore(): aggiunta guardia null su location — previene crash se currentLocationId non valido',
      '[CRITICO] Fix travelTo(): aggiunta guardia null su currentLocation + optional chaining su lockedLocations',
      '[CRITICO] Fix searchArea(): aggiunta guardia null su location',
      '[ALTO] Fix handleHeal: cure percentuali ora usano getCharacterMaxHp() invece di p.maxHp — include bonus equipaggiamento',
      '[ALTO] Fix admin/enemy-abilities: rimosso campi inesistenti (statusType/Chance/Duration), aggiunto effects field',
      '[ALTO] Fix admin/seed-all: aggiunto header x-admin-key alle fetch interne — i seed ora funzionano correttamente',
      '[MEDIO] Fix upload routes: usano safeErrorResponse() invece di String(error) — non leakano più stack trace',
      '[MEDIO] Fix npc-chat: system prompt inviato con role system invece di assistant — protezione migliore da injection',
      '[MEDIO] Fix unlockAchievement: clearTimeout prima di settare nuovo timer — previene race condition su notifiche',
      '[MEDIO] Fix restartGame(): aggiunto isExploring: false al reset',
      '[MEDIO] Fix boss phase check: guardia divisione per zero se enemy.maxHp <= 0',
      '[BASSO] Fix debugKillAllEnemies: chiama advanceToNextActor() invece di executeCombatTurn() — vittoria ora innesca',
      '[BASSO] Cleanup engine/combat.ts: rimossi import inutilizzati (CombatState, EffectTarget, ItemDefinition)',
      '[BASSO] Cleanup bgm.ts: rimosso type BgmType duplicato — usa quello importato da sounds.ts',
      '[BASSO] Fix Rarity type: aggiunto epic al type union — corrisponde alle lookup tables in rarity-helpers.ts',
    ],
  },
  {
    version: '1.5.0',
    date: '2025-06-21',
    changes: [
      'Fix suoni: aggiunto setValueAtTime prima di linearRampToValueAtTime in _suspendAmbient e _resumeAmbient — l\'ambient ora si ferma correttamente durante il combat',
      'Fix suoni: rimosso preload dei suoni — ora i suoni si sentono solo se caricati nel DB, nessun 404 silenzioso',
      'Fix suoni: eliminato bgm.ts (codice morto con procedural BGM che non veniva usato)',
      'Fix missioni: encounterNpc() non filtra più le quest in-progress — le missione fetch/explore sono ora completabili',
      'Rimosso pannello badge dinamico compatto sopra i tasti azione',
      'Rimosso spinner \'[npc] sta parlando...\' e fake delay 400ms dal dialogo NPC — dialogo ora istantaneo con frasi statiche',
      'Rimosso label \'risposta predefinita\' da tutti i messaggi NPC',
      'Eliminata route API /api/npc-chat (213 righe di codice AI mai usata)',
    ],
  },
  {
    version: '1.5.1',
    date: '2025-06-21',
    changes: [
      '[CRITICO] Fix NPCDialogPanel: errore di build "const declarations must be initialized" — mancavano le parentesi [] nella destrutturazione di useState (regressione da v1.5.0)',
      '[CRITICO] Fix consegna missioni: handleTalk() ritornava prematuramente se l\'NPC non aveva dialogues — talkToNpc() non veniva mai chiamato e le quest fetch non si completavano',
      '[ALTO] Fix suono zombie: rimosso timer periodico playZombieMoan ogni 4-8s in combat — i suoni zombie ora si sentono solo quando lo zombie attacca (via getSoundForEntry)',
      '[ALTO] talkToNpc() ora restituisce { handled, chatMessage } — il dialogo NPC mostra il messaggio corretto (consegna, stato missione o frase casuale)',
      '[MEDIO] Rimosso notification overlay per eventi dinamici — l\'evento appare solo nel Registro Eventi senza popup',
      '[BASSO] Cleanup: rimosso campo isFallback inutilizzato da ChatMessage',
    ],
  },
  {
    version: '1.6.0',
    date: '2025-06-22',
    changes: [
      '[NUOVO] Sistema Victory Conditions: 5 sfide bonus EXP attivate nel combat loop (sopravvivi turni, distruggi punto debole, elimina bersaglio)',
      '[NUOVO] Sistema Combo Chain: combo counter progressivo per attacchi consecutivi sullo stesso bersaglio — da +10% (x2) a +50% (x8+) danno bonus',
      '[NUOVO] 3 Stanze Segrete: Armeria RPD (document), Bunker Fogne (search 15%), Lab Birkin (NPC hint) con loot esclusivo (magnum, zaino, lanciarazzi)',
      '[NUOVO] 2 Eventi Dinamici: Invasione Nemesis (minTurn 15, +130% enemy stats) e Ondata Zombie (minTurn 8, +40% encounter rate)',
      '[NUOVO] 6 Ricette Crafting: adrenalina, pillola difensiva, bomba artigianale, spray super, munizioni mitragliatrice, mega benda',
      '[NUOVO] 3 Nuovi Oggetti: Iniezione Adrenalina (+20 ATK), Pillola Difensiva (+15 DEF), Bomba Artigianale (50 dmg AoE)',
      '[UI] Combo counter badge in CombatHeader con animazione pulse a x5+',
      '[UI] Sfida bonus Victory Condition mostrata in CombatHeader durante il combat',
      '[REFATTORI] Victory conditions: rimosso avviso "DEAD CODE", importato nel combat loop',
      '[REFATTORI] DynamicEventType: aggiunti nemesis_invasion e horde al type union',
    ],
  },
  {
    version: '1.7.0',
    date: '2025-06-22',
    changes: [
      '[NUOVO] Sistema Ricette Scopribili: 9 ricette nascoste che si sbloccano esplorando — 6 ricette base sempre visibili',
      '[NUOVO] Discovery tramite documenti: 3 documenti (diario RPD, report lab, mappa fogne) sbloccano ricette segrete',
      '[NUOVO] Discovery randomica: 8% di probabilità per search di scoprire una ricetta nascosta',
      '[UI] Contatore ricette scoperte (es. 8/15) nei pannelli Crafting e Inventario',
      '[UI] Placeholder misteriosi "???" per ricette non ancora scoperte con icona lucchetto',
      '[PERSISTENZA] discoveredRecipes salvato/caricato in tutti gli slot + autosave + NG+',
      '[SISTEMA] CraftingRecipe.hidden field + discoverRecipe() action nel GameStore',
    ],
  },
  {
    version: '1.8.0',
    date: '2025-06-22',
    changes: [
      '[CRITICO] Fix 3 Stanze Segrete inaccessibili: RPD Armory (doc fantasma → doc_chief_diary), Lab Birkin (locationId errato → laboratory_entrance), Lab Birkin (quest fantasma → quest_voss_data creata per Dr. Voss)',
      '[CRITICO] Fix 3 Documenti fantasma per recipe discovery: creati doc_rpd_diary, doc_lab_report, doc_sewers_map con lore RE — ora 9 ricette nascoste sono scopribili tramite documenti',
      '[CRITICO] Fix 3 Achievement impossibili: "Combattimento Perfetto" (checkPerfectCombat), "Erborista" (herbCombineCount tracking), "Comando Automatico" (checkAutoCombatVictory su vittoria)',
      '[CRITICO] Fix Pipe Bomb: aggiunto flat/amount a DealDamageEffect + logica flat damage nel combat engine — ora infligge 50 danni fissi instead of ATK-based',
      '[ALTO] Fix Ending "Eroe": ora conta NPC con quest completate (npcQuestProgress.completed) invece di NPC incontrati (npcsEncountered)',
      '[ALTO] Fix Flashlight/Lockpick: impostato usable=false — non più consumabili senza effetto',
      '[ALTO] Fix Achievement Bestiary: contatore aggiornato da 12 a 13 nemici (include proto_tyrant)',
      '[ALTO] Aggiunto isExploring: boolean al tipo GameState + herbCombineCount: number per tracking achievement',
      '[MEDIO] Rimosso codice morto: useAIContentGenerator.ts, secrets.ts, dynamic-events.ts (3 file)',
      '[MEDIO] Fix softlock key_rpd: aggiunto al pool item city_outskirts (8% chance) oltre a hospital (12%)',
      '[MEDIO] Aggiunto campo hidden Boolean @default(false) a Prisma GameRecipe',
      '[MEDIO] Aggiunto quest_voss_data "Dati del Progetto Tyrant" al Dr. Voss — Sconfiggi 2 Hunter per sbloccare hint stanza segreta',
      '[MEDIO] Dr. Chen: aggiunto questCompletedDialogue per messaggio post-quest',
      '[NUOVO] 3 Documenti segreti: Diario Irons (RPD), Report Armi Improvvisate (Lab), Mappa Condotti C-7 (Fogne)',
      '[PERSISTENZA] herbCombineCount salvato/caricato in tutti gli slot save + autosave + NG+',
    ],
  },
];

/**
 * Get the latest version entry from history
 */
export function getLatestVersion() {
  return VERSION_HISTORY[VERSION_HISTORY.length - 1];
}

/**
 * Get formatted version string for display
 */
export function getVersionDisplay(): string {
  return `v${APP_VERSION}`;
}
