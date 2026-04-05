# 🎮 Raccoon City RPG — TODO List

> **Legenda**: ✅ Fatto | 🔄 In corso | ⬜ Da fare | 🚫 Scartato

---

## 🔧 SISTEMI DI GIOCO

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 1 | Sistema Puzzle (lucchetti, sequenze) | ✅ | Combination lock, sequenze Simon Says, integrazione eventi |
| 2 | Crafting avanzato (munizioni, antidoti, potenziamenti) | ⬜ | Oltre la combinazione erbe |
| 3 | Potenziamento Armi (componenti, mod) | ⬜ | +ATK, +precisione, effetti status |
| 4 | Difficoltà selezionabile (Sopravvissuto / Normale / Incubo) | ✅ | 3 livelli con statMult/lootMult/expMult + selezione in CharacterSelect |
| 5 | Permadeath opzionale | ⬜ | Personaggio morto = perso per sempre |
| 6 | Sistema Fuga/Inseguimento (QTE) | ✅ | QTE con frecce direzionali, timer, 3 esiti (successo/parziale/fallito), integrazione Nemesis |
| 7 | Safe Rooms (stanze sicure con musica rilassante) | ⬜ | Curarsi, gestire inventario, salvare |
| 8 | Item Box (deposito condiviso tra safe rooms) | ⬜ | Classico RE, deposita/ritira oggetti |

## ⚔️ COMBATTIMENTO

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 9 | Parata/Contrattacco (timing su difesa) | ⬜ | Bonus danni se difendi al momento giusto |
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
| 18 | NPC sopravvissuti (quest secondarie, info, commercio) | ✅ | 5 NPC (fetch/kill/explore quest), sistema commercio, dialoghi, NPCDialogPanel |
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
| 34 | Tema Safe Room (musica rilassante classica RE) | ⬜ | Piano/ambient |
| 35 | Voce narrante per eventi (TTS) | ⬜ | Legge documenti e dialoghi |
| 36 | Effetti sonori UI completi | ✅ | 16+ suoni: travel, search, encounter, victory, defeat, levelUp, puzzle, achievement, NPC, document |
| 37 | Grido di agonia diverso per tipo nemico | ✅ | Suoni unici per 6 tipi: zombie, cerberus, licker, hunter, tyrant, nemesis + death/DOT |

## 🎨 UI E QOL

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 38 | Schermata statistiche fine partita | ⬜ | Kill per tipo, danni, cure, turni, percorso |
| 39 | Tutorial/Help interattivo (tooltip) | ⬜ | Spiega meccaniche al primo uso |
| 40 | Log combattimento filtrabile | ⬜ | Per tipo: danni, cure, status, nemici |
| 41 | Animazioni migliorate (shake, flash, slow-mo) | ✅ | 8 animazioni CSS: shake, flash-red/white, boss-phase, fade-in, pulse-glow, critical-slash, enemy-death |
| 42 | Dark mode alternativo "Umbrella Labs" | ⬜ | Nero/verde acido |

## 🔄 REPLAYABILITÀ

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 43 | Boss Rush Mode | ⬜ | Tutti i boss in sequenza |
| 44 | Sfide giornaliere (missioni con condizioni particolari) | ⬜ | Es. sopravvivi 20 turni solo col coltello |
| 45 | Randomizer mode | ⬜ | Nemici, item e location randomizzati |
| 46 | Endless mode (onde infinite) | ⬜ | Nemici sempre più forti |
| 47 | Speedrun timer integrato | ⬜ | Timer con split per location |

## 🐛 FIX E COMPLETAMENTI

| # | Feature | Stato | Note |
|---|---------|-------|------|
| 48 | DOT veleno/sanguinamento (danno per turno) | ✅ | Fix completo: DOT su giocatori E nemici, durate tracciate, stun multi-turno |
| 49 | Usare Manovella e Fusibile | ✅ | Crank Handle (periferia→fogna) + Fusibile (RPD→laboratorio) con lockedLocations |
| 50 | Completare bestiary (debolezze, drop, strategie) | ✅ | Danger rating, location badges, boss phases section, 13 per-enemy strategy tips |

---

### 📊 Riepilogo

| Stato | Conteggio |
|-------|-----------|
| ✅ Fatto | 20 |
| 🔄 In corso | 0 |
| ⬜ Da fare | 30 |
| 🚫 Scartato | 0 |
| **Totale** | **50** |

---

*Ultimo aggiornamento: #14 Boss multi-fase, #24 Boss segreto, #27 Nemesis persistente, #33 Suoni ambientali, #36 UI sounds, #37 Grido nemici, #41 Animazioni, #49 Manovella/Fusibile, #50 Bestiary completato*
