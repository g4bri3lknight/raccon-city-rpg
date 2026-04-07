# 🎮 Raccoon City RPG — TODO List

> **Legenda**: ✅ Fatto | 🔄 In corso | ⬜ Da fare | 🚫 Scartato

---

## 🤖 INTELLIGENZA ARTIFICIALE — FASI DI INTEGRAZIONE

### Fase 1 — Dialoghi NPC con LLM
> Obiettivo: NPC con cui chattare liberamente, risposte contestuali basate sullo stato di gioco

| # | Task | Stato | Dettaglio |
|---|------|-------|-----------|
| AI-1.1 | API Route `/api/npc-chat` | ✅ | z-ai-web-dev-sdk, system prompt strutturato, conversation history (10 msg), fallback static |
| AI-1.2 | System Prompt per-NPC (5 personalità) | ✅ | Marco (mecchanico), Dr. Chen (medico), Reyes (soldato), Hannah (esploratrice), Dr. Voss (scienziato Umbrella) |
| AI-1.3 | NPCDialogPanel (chat UI completa) | ✅ | Input free-text, messaggi animati, badge "IA", loading spinner, fallback offline, Framer Motion |
| AI-1.4 | Contesto di gioco dinamico | ✅ | HP party, inventario, location, turno, difficoltà, progresso quest — tutto passato al LLM |
| AI-1.5 | Fallback graceful (offline) | ✅ | Se l'API fallisce, usa dialoghi statici casuali dall'array `npc.dialogues[]` |
| AI-1.6 | Mission Tracker + "Parla" contestuale | ✅ | Badge espandibile, label dinamico (📦 Consegna / 🗺️ Rapporto / ⚔️ Stato), verde se pronta |
| AI-1.7 | Streaming risposte LLM | ✅ | SSE streaming via `stream: true` SDK, progressiva nel panel, cursore animato, AbortController, fallback non-stream |
| AI-1.8 | Personality field nel NPC data | ✅ | Campo `personality?: string` in `GameNPC`, 5 NPC popolati, route.ts usa `npcPersonality` dinamico |
| AI-1.9 | Debug Panel AI/NPC/Quest | ✅ | Incontri NPC locale, Teleporta+Incontra, Quest casuale, +1 progress, Completa/Reset |

**Progresso Fase 1: 9/9 (100%) ✅ COMPLETATA**

---

### Fase 2 — Generazione Contenuti Dinamici
> Obiettivo: LLM genera eventi narrativi, documenti lore, e descrizioni procedurali in base allo stato di gioco

| # | Task | Stato | Dettaglio |
|---|------|-------|-----------|
| AI-2.1 | API Route `/api/generate-event` | ✅ | z-ai-web-dev-sdk, system prompt italiano per-location, validazione JSON, sanitize, cache, rate limit |
| AI-2.2 | API Route `/api/generate-document` | ✅ | 5 tipi documento, flavour per location, validazione, normalizzazione, cache, rate limit |
| AI-2.3 | Eventi narrativi procedurali | ✅ | explore() controlla eventi AI + statici, triggerChance + minTurn, generazione auto al turn 3+ |
| AI-2.4 | Documenti procedurali nelle location | ✅ | searchArea() e explore() controllano documenti AI + statici, generazione auto al turn 3+, 5 tipi documento |
| AI-2.5 | Cache e rate limiting AI | ✅ | AICache class: TTL 30min, max 100 entries, per-category cooldown (event 60s, doc 45s) |
| AI-2.6 | Integrazione con sistema scelte (StoryChoiceTag) | ✅ | API passa storyChoices al LLM per generare eventi contestuali; eventi integrati in explore() |
| AI-2.7 | Immagini generate per nemici | ✅ | `/api/generate-enemy` collegata al Debug Panel + pulsante "Generate Immagine Nemico" |

**Progresso Fase 2: 7/7 (100%) ✅ COMPLETATA**

---

### Fase 3 — TTS — Voce Narrante
> Obiettivo: Sintesi vocale per NPC, documenti, eventi narrativi e narratore

| # | Task | Stato | Dettaglio |
|---|------|-------|-----------|
| AI-3.1 | API Route `/api/tts` | ⬜ | z-ai-web-dev-sdk TTS skill — testo → audio |
| AI-3.2 | Voce NPC (dialoghi) | ⬜ | Voce unica per ogni NPC (5 voci distinte) |
| AI-3.3 | Lettura documenti | ⬜ | TTS per documenti trovati durante esplorazione |
| AI-3.4 | Narratore eventi | ⬜ | Voce narrante per eventi dinamici, combattimenti, transizioni |
| AI-3.5 | Toggle audio vocale on/off | ⬜ | Impostazione utente per abilitare/disabilitare TTS |
| AI-3.6 | Cache audio TTS generati | ⬜ | Evitare rigenerazione — salvare audio in localStorage/IndexedDB |
| AI-3.7 | UI per lettura documenti con audio | ⬜ | Pulsante ▶️ in DocumentPanel per ascoltare il documento |

**Progresso Fase 3: 0/7 (0%)**

---

### Fase 4 — AI Avanzata e Adaptive
> Obiettivo: Difficoltà adattiva, generazione boss/nemici, finali dinamici

| # | Task | Stato | Dettaglio |
|---|------|-------|-----------|
| AI-4.1 | Difficoltà adattiva AI | ⬜ | LLM analizza performance (kill/death ratio, tempo, HP) e suggerisce scaling |
| AI-4.2 | Generazione nemici procedurali | ⬜ | Nemici unici con stat e abilità generate da LLM per run randomizer |
| AI-4.3 | Finale dinamico personalizzato | ⬜ | LLM genera epilogo narrativo basato su tutte le scelte della run |
| AI-4.4 | AI Dungeon Master (eventi reattivi) | ⬜ | LLM che gestisce la campagna in stile D&D — risponde a scelte libere |
| AI-4.5 | Consigli strategici AI | ⬜ | Suggerimenti in combattimento basati su analisi della situazione (es. "Usa veleno su questo boss!") |
| AI-4.6 | Auto-combat migliorato con AI | ⬜ | Attualmente rule-based — LLM potrebbe prendere decisioni più intelligenti |

**Progresso Fase 4: 0/6 (0%)**

---

### 📊 Riepilogo AI

| Fase | Nome | Progresso | Dettaglio |
|------|------|-----------|-----------|
| **Fase 1** | Dialoghi NPC con LLM | **9/9 (100%) ✅** | Completata: streaming, personality data, chat completa, fallback, debug |
| **Fase 2** | Contenuti Dinamici | **7/7 (100%) ✅** | Completata: eventi procedurali, documenti lore, cache, story choices, enemy images |
| **Fase 3** | TTS Voce Narrante | **0/7 (0%)** | Da avviare (dipende da #35 della TODO principale) |
| **Fase 4** | AI Avanzata | **0/6 (0%)** | Da avviare (fase più ambiziosa) |
| **Totale AI** | | **16/29 (55%)** | |

---

## 🔧 SISTEMI DI GIOCO

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 1 | Sistema Puzzle (lucchetti, sequenze) | ✅ | Combination lock, sequenze Simon Says, integrazione eventi |
| 2 | Crafting avanzato (munizioni, antidoti, potenziamenti) | ✅ | 9 ricette, 5 materiali, solo safe room, CraftingPanel |
| 3 | Potenziamento Armi (componenti, mod) | ⬜ | +ATK, +precisione, effetti status |
| 4 | Difficoltà selezionabile (Sopravvissuto / Normale / Incubo) | ✅ | 3 livelli con statMult/lootMult/expMult + selezione in CharacterSelect |
| 5 | Permadeath opzionale | ⬜ | Personaggio morto = perso per sempre |
| 6 | Sistema Fuga/Inseguimento (QTE) | ✅ | QTE con frecce direzionali, timer, 3 esiti (successo/parziale/fallito), integrazione Nemesis |
| 7 | Safe Rooms (stanze sicure con musica rilassante) | ✅ | Sub-aree separate, salva, baule, crafting, tema piano ambient (CC0) |
| 8 | Item Box (deposito condiviso tra safe rooms) | ✅ | Classico RE, deposita/ritira, condiviso, auto-equip, save/load, tema musicale |

## ⚔️ COMBATTIMENTO

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 9 | Parata/Contrattacco (timing su difesa) | ✅ | Parry deterministico (prossimo attore nemico), 100% riduzione + 50% ATK counter, CD 3 turni |
| 10 | Sistema Combo (moltiplicatore turni consecutivi) | ⬜ | x1.1 → x1.2 → x1.3... |
| 11 | Nuovi status effect (Confusione, Paura, Congelamento, Bruciatura) | ⬜ | Oltre a veleno, sanguinamento, stordimento |
| 12 | Abilità Ultra / Limit Break (una tantum per combattimento) | ⬜ | Si carica subendo danni o usando skill |
| 13 | Sistema Elementi (fuoco/ghiaccio/elettrico/acido) | ⬜ | Debolezze e resistenze per nemico |
| 14 | Boss multi-fase (pattern cambia a soglie HP) | ✅ | 3 boss con 2 fasi ciascuno, stat multipli, nuove abilità per fase, transizione UI |
| 15 | Condizioni di vittoria alternative | ⬜ | Sopravvivi X turni, fuggi, distruggi punto debole |

## 🗺️ ESPLORAZIONE

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 16 | Documenti/Lore sparsi per le mappe | ✅ | 14 documenti in 6 location, 5 tipi, rarità, documenti segreti, panel lettura |
| 17 | Mappa dettagliata con Mini-Map | ✅ | Sub-aree esplorabili, conteggio documenti/NPC, tracked in exploredSubAreas |
| 18 | NPC sopravvissuti (quest secondarie, info, commercio) | ✅ | 5 NPC (fetch/kill/explore quest), sistema commercio, dialoghi AI, NPCDialogPanel |
| 19 | Ciclo giorno/notte | ⬜ | Notte = nemici forti + loot migliore |
| 20 | Eventi dinamici (blackout, allarmi, crolli) | ✅ | 6 eventi (blackout/alarm/collapse/lockdown/gas/fire), durata, effetti, scelte |
| 21 | Percorsi multipli e finali alternativi | ✅ | StoryChoiceTag tracking per 4 location, 8 tag tracciati |
| 22 | Punti di interesse nascosti (stanze segrete) | ✅ | 4 stanze segrete, 3 metodi scoperta (search/document/NPC), loot raro+unico |

## 📖 STORIA E NARRATIVA

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 23 | Finali multipli (almeno 3, basati su scelte/tempo) | ✅ | 4 finali (Fuga/Eroe/Verità/Buio), requisiti multipli, VictoryScreen dinamico |
| 24 | Boss opzionali segreti (B.O.W. sperimentale) | ✅ | Proto-Tyrant nel lab dopo aver sconfitto il Tyrant, 15% chance, loot raro |
| 25 | Relazioni tra personaggi (affinità → combo combattimento) | ⬜ | Scelte dialogo ↑↓ affinità |
| 26 | Flashback/Sequenze narrative pre-epidemia | ⬜ | Testo + immagine per ogni personaggio |
| 27 | Nemesis più persistente (ti insegue tra le location) | ✅ | 5 livelli di inseguimento, scaling stats, 5 label unici, 10-turn cooldown |

## 📈 PROGRESSIONE

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 28 | Skill Tree (punti da spendere per passive) | ⬜ | Critico, resistenza status, cura bonus... |
| 29 | Equipaggiamento aggiuntivo (armature, accessori) | ⬜ | Giubbotto antiproiettile, orologio, amuleto |
| 30 | Reputazione / Umbrella Rating | ⬜ | Influisce su finali e NPC |
| 31 | New Game+ potenziato (armi, livello, skin) | ⬜ | Oltre ai nastri d'inchiostro |
| 32 | Classifica / Score di fine partita | ⬜ | Tempo, kill, danni, oggetti, achievement |

## 🎵 AUDIO E ATMOSFERA

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 33 | Suoni ambientali esplorazione (passi, porte, gocce, vento) | ✅ | 6 location con suoni unici (sirene, ronzii, gocce, ingranaggi, ecc.) |
| 34 | Tema Safe Room (musica rilassante classica RE) | ✅ | Piano ambient CC0 "First Light Particles", play/stop su enter/exit |
| 35 | Voce narrante per eventi (TTS) | ⬜ | Legge documenti e dialoghi — **Fase 3 AI** |
| 36 | Effetti sonori UI completi | ✅ | 16+ suoni: travel, search, encounter, victory, defeat, levelUp, puzzle, achievement, NPC, document |
| 37 | Grido di agonia diverso per tipo nemico | ✅ | Suoni unici per 6 tipi: zombie, cerberus, licker, hunter, tyrant, nemesis + death/DOT |

## 🎨 UI E QOL

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 38 | Schermata statistiche fine partita | ✅ | 14 stat, kills per tipo, boss sconfitti, tempo di gioco, game-over + victory |
| 39 | Tutorial/Help interattivo (tooltip) | ⬜ | Spiega meccaniche al primo uso |
| 40 | Log combattimento filtrabile | ⬜ | Per tipo: danni, cure, status, nemici |
| 41 | Animazioni migliorate (shake, flash, slow-mo) | ✅ | 8 animazioni CSS: shake, flash-red/white, boss-phase, fade-in, pulse-glow, critical-slash, enemy-death |
| 42 | Dark mode alternativo "Umbrella Labs" | ✅ | Tema nero/verde acido, scanline CRT, toggle in header, save/load |

## 🔄 REPLAYABILITÀ

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 43 | Boss Rush Mode | ⬜ | Tutti i boss in sequenza |
| 44 | Sfide giornaliere (missioni con condizioni particolari) | ⬜ | Es. sopravvivi 20 turni solo col coltello |
| 45 | Randomizer mode | ✅ | Nemici/oggetti/percorsi random, tier bilanciati, chiavi accessibili, toggle in CharacterSelect |
| 46 | Endless mode (onde infinite) | ⬜ | Nemici sempre più forti |
| 47 | Speedrun timer integrato | ⬜ | Timer con split per location |

## 🐛 FIX E COMPLETAMENTI

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 48 | DOT veleno/sanguinamento (danno per turno) | ✅ | Fix completo: DOT su giocatori E nemici, durate tracciate, stun multi-turno |
| 49 | Usare Manovella e Fusibile | ✅ | Crank Handle (periferia→fogna) + Fusibile (RPD→laboratorio) con lockedLocations |
| 50 | Completare bestiary (debolezze, drop, strategie) | ✅ | Danger rating, location badges, boss phases section, 13 per-enemy strategy tips |

---

## 🔧 BUG FIX SESSION

| Fix | Stato | Dettaglio |
|-----|-------|-----------|
| Tasti bianco-su-bianco (Debug Panel) | ✅ | Sostituito shadcn Button con button nativo + Tailwind espliciti (fuori .game-horror) |
| Tasti bianco-su-bianco (vari overlay) | ✅ | Override variabili CSS shadcn dentro .game-horror in globals.css |
| Suoni notifica che si ripetono | ✅ | Rimosso state.key da useEffect deps, usato setState(prev => ...) per evitare feedback loop |
| React Rules of Hooks (NPCDialogPanel) | ✅ | Spostato return condizionale dopo tutti gli hook useCallback |
| playBgm not a function | ✅ | Aggiunto sistema BGM completo ad AudioEngine: playBgm/stopBgm, 10 BGM types, loop, gain, crossfade |
| Pulsante "Parla" contestuale | ✅ | Label dinamico (📦 Consegna / 🗺️ Rapporto / ⚔️ Stato) + verde quando quest pronta |
| Notification render-time side effects | ✅ | Spostata logica audio in useEffect con ref guard per evitare doppio play in Strict Mode |

---

## 🎵 SISTEMA AUDIO COMPLETO

| Sistema | Stato | Note |
|---------|-------|------|
| BGM System (playBgm/stopBgm) | ✅ | 10 BGM types (title, city, RPD, hospital, sewers, lab, clock tower, combat, gameover, victory), loop, gain, crossfade |
| AudioEngine (classe unificata) | ✅ | 60+ metodi SFX, cache buffer, Web Audio API, volume/mute master, resume context |
| WAV-based SFX library | ✅ | 57 file WAV pre-generati per tutti i suoni di gioco |
| Image Gen utility (nemici) | ⚠️ | Route `/api/generate-enemy` esiste, 15 immagini pre-gen, non collegata al frontend |

---

### 📊 Riepilogo Generale

| Stato | Conteggio |
|-------|-----------|
| ✅ Fatto | **28** |
| 🔄 In corso | **0** |
| ⬜ Da fare | **22** |
| 🚫 Scartato | **0** |
| **Totale Feature Originali** | **50** |

| Extra | Conteggio |
|-------|-----------|
| 🤖 AI Task completati | **16** / 29 |
| 🐛 Bug Fixes | **7** |
| 🎵 Audio Extra | **3 (+1 utility)** |

---

### 📋 Prossimi passi suggeriti

| Priorità | Task | Fase | Note |
|----------|------|------|------|
| 🟡 Media | AI-2.3 Eventi narrativi procedurali | 2 | Contenuto fresco per ogni run |
| 🟡 Media | AI-4.3 Finale dinamico personalizzato | 4 | Epilogo unico per ogni playthrough |
| 🟡 Media | AI-3.2 + 3.3 Voce NPC e lettura documenti | 3 | Eleva enormemente l'atmosfera |
| 🟢 Bassa | AI-4.1 Difficoltà adattiva | 4 | Complesso, richiede bilanciamento |
| 🟢 Bassa | AI-2.7 Immagini generate nemici | 2 | Completata — collegata al Debug Panel |

---

*Ultimo aggiornamento: Sessione 3 — 28/50 feature + 16/29 AI (Fase 1: 100% ✅, Fase 2: 100% ✅) + 7 bug fixes*
