# 🎮 Raccoon City RPG — Guida Completa alle Abilità

> Documento di riferimento per tutte le abilità dei personaggi, dei nemici, degli oggetti e degli equipaggiamenti.
> Ogni abilità è definita attraverso il sistema **Effects Atomici** — un array di effetti elementari che il motore di combattimento esegue in sequenza.

---

## 📐 Architettura del Sistema Effects

### Come funziona

Ogni abilità (sia di un personaggio che di un nemico) contiene un array `effects[]`. Quando l'abilità viene usata, il motore esegue ogni effetto in ordine:

```json
{
  "name": "Colpo Mortale",
  "effects": [
    { "type": "deal_damage", "target": "enemy", "powerMultiplier": 1.6 }
  ]
}
```

Un'abilità può avere **multipli effetti** in cascata:

```json
{
  "name": "Veleno Acido",
  "effects": [
    { "type": "deal_damage", "target": "enemy", "powerMultiplier": 0.9 },
    { "type": "apply_status", "target": "enemy", "statusType": "poison", "chance": 70 }
  ]
}
```

### BaseEffect — Campi comuni a tutti gli effetti

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `type` | `SpecialEffectType` | ✅ | Il tipo di effetto (vedi lista sotto) |
| `target` | `EffectTarget` | ✅ | Chi subisce l'effetto (self, enemy, all_enemies, ally, all_allies, lowest_hp_ally, random_enemy) |
| `trigger` | `EffectTrigger` | ❌ | Quando si attiva (default: on_use). Usato principalmente per equipaggiamento passivo |
| `chance` | `number` (0-100) | ❌ | Probabilità di attivazione. Default: 100 |

---

## 🎯 Tipi di Target (`EffectTarget`)

| Valore | Descrizione | Esempio d'uso |
|--------|-------------|---------------|
| `self` | L'utente dell'abilità | Barricata, Immolazione, Pozione |
| `enemy` | Il bersaglio singolo nemico | Colpo Mortale, Morso |
| `all_enemies` | Tutti i nemici presenti | Granata Stordente, Devastazione (Nemesis) |
| `ally` | Un singolo alleato (da selezionare) | Pronto Soccorso, Adrenalina |
| `all_allies` | Tutti gli alleati del gruppo | Cura Gruppo, Disinfezione Totale, Barricata |
| `lowest_hp_ally` | Alleato con HP più bassi (auto-target) | Auto-triage |
| `random_enemy` | Un nemico casuale | Attacco erratico |

---

## ⏱️ Tipi di Trigger (`EffectTrigger`)

| Valore | Descrizione | Quando si usa |
|--------|-------------|---------------|
| `on_use` | All'uso attivo dell'abilità/oggetto | Abilità speciali, consumabili, attacchi nemici |
| `on_hit` | Quando l'attacco base colpisce | Effetti delle armi (es. applicare veleno con ogni colpo) |
| `on_take_hit` | Quando si subisce un colpo | Armature passive (es. riflettere danni) |
| `on_turn_start` | All'inizio del proprio turno | Equipaggiamento curativo (es. rigenerazione passiva) |
| `on_critical` | Quando si infligge un critico | Bonus extra sui colpi critici |

---

## ⚡ I 13 Tipi di Effetto Atomico

---

### 1. 💥 `deal_damage` — Infliggi Danni

Infligge danni calcolati in base all'ATK dell'utente, moltiplicati per `powerMultiplier`.

```json
{ "type": "deal_damage", "target": "enemy", "powerMultiplier": 1.6 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `powerMultiplier` | `number` | ✅ | Moltiplicatore dell'ATK (es. 1.6 = 160% dell'ATK). Valori comuni: 0.5-3.0 |
| `guaranteedCrit` | `boolean` | ❌ | Se `true`, l'attacco è sempre critico (danni x1.5 aggiuntivi) |
| `ignoreDef` | `boolean` | ❌ | Se `true`, ignora completamente la difesa del bersaglio |
| `noMiss` | `boolean` | ❌ | Se `true`, l'attacco non può fallire (100% precisione) |
| `basedOnTargetHp` | `number` | ❌ | Se presente, il danno è basato su % degli HP massimi del bersaglio invece che sull'ATK |
| `excludePrimaryTarget` | `boolean` | ❌ | Per splash: se `true`, il bersaglio primario non riceve questo effetto |

**Note meccaniche:**
- Formula danno: `danno = ATK * powerMultiplier - DEF_bersaglio * 0.5` (semplificata)
- Critico: danno * 1.5 con chance base basata su SPD
- Se `noMiss: true`, il calcolo della precisione viene saltato

---

### 2. 💚 `heal` — Cura

Ripristina HP al bersaglio.

```json
{ "type": "heal", "target": "self", "amount": 50 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `amount` | `number` | ✅ | HP da ripristinare |
| `percent` | `boolean` | ❌ | Se `true`, `amount` è interpretato come % degli HP massimi (es. 30 = 30% maxHP) |

**Note meccaniche:**
- La cura non può superare gli HP massimi del bersaglio
- Se `percent: true` e `amount: 30` su un personaggio con 100 maxHP → cura 30 HP

---

### 3. ☠️ `apply_status` — Applichi Status Effect

Applica uno status negativo o positivo al bersaglio, con probabilità.

```json
{ "type": "apply_status", "target": "enemy", "statusType": "poison", "chance": 70 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `statusType` | `string` | ✅ | Tipo di status: `poison`, `bleeding`, `stunned`, `adrenaline` |
| `chance` | `number` (0-100) | ✅ | Probabilità di applicare lo status |
| `duration` | `number` | ❌ | Turni di durata (sovrascrive il default) |

**Status disponibili:**

| Status | Effetto | Durata default |
|--------|---------|----------------|
| `poison` | 💀 Danni per turno (5% maxHP) | 3 turni |
| `bleeding` | 🩸 Danni per turno (3% maxHP) | 3 turni |
| `stunned` | 💫 Salta il prossimo turno | 1 turno |
| `adrenaline` | 💉 +25% ATK per X turni | 2 turni |

**Note meccaniche:**
- Se il bersaglio ha già lo stesso status, la durata viene sovrascritta (non sommata)
- Stunned: il personaggio salta il suo prossimo turno di azione
- Adrenaline: è un buff, non un debuff — può essere applicato agli alleati

---

### 4. 💊 `remove_status` — Rimuovi Status Effect

Rimuove uno o più status dal bersaglio.

```json
{ "type": "remove_status", "target": "self", "statuses": ["poison", "bleeding", "stunned"] }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `statuses` | `string[]` | ✅ | Array di status da rimuovere. Valori: `poison`, `bleeding`, `stunned`, `adrenaline` |

**Note meccaniche:**
- Rimuove immediatamente tutti gli status indicati
- Non cura i danni già subiti da DOT (poison/bleeding)
- Utile per pulire gli status negativi del proprio gruppo

---

### 5. 📈 `buff_stat` — Potenzia Statistica

Aumenta temporaneamente una statistica del bersaglio.

```json
{ "type": "buff_stat", "target": "all_allies", "stat": "def", "amount": 50, "duration": 3 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `stat` | `"atk"` \| `"def"` \| `"spd"` | ✅ | Quale statistica potenziare |
| `amount` | `number` | ✅ | Aumento percentuale (es. 50 = +50% DEF) |
| `duration` | `number` | ✅ | Quanti turni dura il buff |

**Note meccaniche:**
- Il buff è tracciato come `ActiveCombatEffect` nel combat state
- Si accumula con altri buff (più buff_def si sommano)
- Alla scadenza, l'effetto viene rimosso automaticamente
- Valori tipici: 20-50% per abilità normali

---

### 6. 📉 `debuff_stat` — Riduci Statistica

Riduce temporaneamente una statistica del bersaglio.

```json
{ "type": "debuff_stat", "target": "enemy", "stat": "def", "amount": 30, "duration": 2 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `stat` | `"atk"` \| `"def"` \| `"spd"` | ✅ | Quale statistica ridurre |
| `amount` | `number` | ✅ | Riduzione percentuale (es. 30 = -30% DEF) |
| `duration` | `number` | ✅ | Quanti turni dura il debuff |

**Note meccaniche:**
- Funziona identicamente a buff_stat ma con valori negativi
- Non può ridurre una stat sotto il 10% del valore base

---

### 7. 🛡️ `shield` — Scudo

Applica uno scudo che assorbe danni al posto degli HP.

```json
{ "type": "shield", "target": "self", "amount": 50, "duration": 2 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `amount` | `number` | ✅ | HP dello scudo (danni assorbiti prima di rompersi) |
| `duration` | `number` | ✅ | Turni di durata dello scudo |
| `procChance` | `number` | ❌ | Chance di attivazione per trigger on_take_hit (default: 100) |

**Note meccaniche:**
- Lo scudo assorbe danni al posto degli HP
- Se lo scudo ha 50 HP e si riceve 30 danni → rimangono 20 HP di scudo
- Se si ricevono 60 danni → scudo si rompe (0 HP rimanenti) e i 10 danni in eccesso vanno agli HP
- Alla scadenza, lo scudo scompare anche se ha ancora HP

---

### 8. 🔥 `taunt` — Provocazione

Forza i nemici a bersagliare un personaggio specifico.

```json
{ "type": "taunt", "target": "self", "duration": 2 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `duration` | `number` | ✅ | Quanti turni i nemici devono bersagliare il personaggio |

**Note meccaniche:**
- Quando un personaggio ha taunt attivo, i nemici non possono scegliere altri bersagli
- Molto utile per i tank (es. Immolazione)
- Il taunt viene rimosso alla scadenza o quando il personaggio muore

---

### 9. 🧛 `lifesteal` — Ruba Vita

Infligge danni e cura l'utente per una percentuale del danno.

```json
{ "type": "lifesteal", "target": "enemy", "percent": 50, "power": 1.0 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `percent` | `number` | ✅ | % del danno che viene convertito in cura per l'utente |
| `power` | `number` | ❌ | Moltiplicatore ATK per il danno (default: 1.0) |

**Note meccaniche:**
- Formula: `danno = ATK * power` → `cura = danno * percent / 100`
- Se il danno è 100 e percent è 50 → si curano 50 HP
- Se il bersaglio è morto (overkill), la cura è basata sugli HP effettivamente tolti

---

### 10. ✨ `revive` — Resuscita

Riporta in vita un alleato caduto con una percentuale dei suoi HP massimi.

```json
{ "type": "revive", "target": "ally", "hpPercent": 50 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `hpPercent` | `number` | ✅ | % degli HP massimi ripristinati alla resurrezione |

**Note meccaniche:**
- Il personaggio deve essere morto (HP = 0)
- Dopo la resurrezione, il personaggio riprende ad agire al suo turno
- L'HP ripristinato non può superare maxHP

---

### 11. ❤️‍🩹 `hot` — Heal Over Time (Cura nel Tempo)

Cura il bersaglio di una quantità fissa per turno.

```json
{ "type": "hot", "target": "self", "amountPerTurn": 5, "duration": 3 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `amountPerTurn` | `number` | ✅ | HP curati ad ogni tick (all'inizio del turno del bersaglio) |
| `duration` | `number` | ✅ | Quanti turni dura la cura |

**Note meccaniche:**
- Il tick avviene all'inizio del turno del bersaglio
- Usato principalmente per equipaggiamenti passivi (trigger: on_turn_start)
- Se il bersaglio ha già full HP, la cura viene persa (non si accumula)

---

### 12. 🪞 `reflect` — Riflessione

Riflette una percentuale dei danni subiti indietro all'attaccante.

```json
{ "type": "reflect", "target": "self", "percent": 20, "duration": 2 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `percent` | `number` | ✅ | % dei danni subiti che vengono riflessi |
| `duration` | `number` | ✅ | Quanti turni dura la riflessione |

**Note meccaniche:**
- Se si riceve 100 danni con reflect 20% → l'attaccante riceve 20 danni
- Usato principalmente per equipaggiamenti (trigger: on_take_hit)
- Il danno riflesso non è ridotto dalla difesa dell'attaccante

---

### 13. 🎒 `add_slots` — Aggiungi Slot Inventario

Aumenta il numero massimo di slot dell'inventario del personaggio.

```json
{ "type": "add_slots", "target": "self", "amount": 2 }
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `amount` | `number` | ✅ | Numero di slot da aggiungere |

**Note meccaniche:**
- Il massimo assoluto è configurabile nelle Impostazioni Gioco (admin): `maxInventorySlots` (default: 12)
- Se l'aggiunta supererebbe il massimo, si ferma al massimo
- Usato solo per borse (trigger: on_use, fuori combattimento)
- Non funziona in combattimento

---

## ⚔️ ABILITÀ DEI PERSONAGGI GIOCATORE (PG)

### Categoria: OFFENSIVE 🗡️

---

#### 💀 Colpo Mortale
- **ID**: `colpo_mortale`
- **Cooldown**: 2 turni
- **Descrizione**: Un attacco mirato e devastante che infligge danni critici massimi al bersaglio.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **1.6** |

**Analisi**: Danno singolo puro. x1.6 dell'ATK = 60% danni extra rispetto ad un attacco normale.

---

#### 🔥 Raffica
- **ID**: `raffica`
- **Cooldown**: 3 turni
- **Descrizione**: Spara una raffica che colpisce il bersaglio principale e danneggia anche gli altri nemici vicini.
- **Target**: Singolo nemico + splash su tutti

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **1.3** |
| 2 | `deal_damage` | target: `all_enemies`, powerMultiplier: **0.6**, excludePrimaryTarget: **true** |

**Analisi**: Danno concentrato (x1.3) + danni splash (x0.6) a tutti gli altri nemici. Eccellente contro gruppi.

---

#### 🎯 Sparo Mirato
- **ID**: `sparo_mirato`
- **Cooldown**: 3 turni
- **Descrizione**: Un colpo precisissimo che non può mancare e infligge ingenti danni al bersaglio.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **2.0**, noMiss: **true** |

**Analisi**: Il danno singolo più alto tra le abilità base. x2.0 ATK + impossibile da mancare. Ideale per boss.

---

#### ☣️ Veleno Acido
- **ID**: `veleno_acido`
- **Cooldown**: 2 turni
- **Descrizione**: Lancia una sostanza corrosiva che avvelena il nemico e infligge danni moderati.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **0.9** |
| 2 | `apply_status` | target: `enemy`, statusType: `poison`, chance: **70%** |

**Analisi**: Danno immediato (x0.9) + DOT veleno (5% maxHP/turno per 3 turni). Ottimo per boss con molti HP.

---

#### 🏃 Attacco di Carica
- **ID**: `attacco_carica`
- **Cooldown**: 3 turni
- **Descrizione**: Una carica brutale che infligge danni considerevoli e può stordire il nemico.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **1.4** |
| 2 | `apply_status` | target: `enemy`, statusType: `stunned`, chance: **50%** |

**Analisi**: Danno + controllo. x1.4 ATK + 50% di stordire il nemico (salta 1 turno).

---

### Categoria: DIFENSIVE 🛡️

---

#### 🛡️ Barricata
- **ID**: `barricata`
- **Cooldown**: 2 turni
- **Descrizione**: Solleva una barricata improvvisata, riducendo drasticamente i danni subiti per il prossimo turno.
- **Target**: Tutti gli alleati

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `buff_stat` | target: `all_allies`, stat: `def`, amount: **+50%**, duration: **3 turni** |

**Analisi**: +50% DEF a TUTTO il gruppo per 3 turni. Abilità difensiva più forte del gioco. Eccellente prima di una fase boss.

---

#### 🔥 Immolazione
- **ID**: `immolazione`
- **Cooldown**: 3 turni
- **Descrizione**: Si espone per attirare tutti gli attacchi nemici su di sé, proteggendo gli alleati.
- **Target**: Se stesso

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `taunt` | target: `self`, duration: **2 turni** |
| 2 | `buff_stat` | target: `self`, stat: `def`, amount: **+30%**, duration: **2 turni** |

**Analisi**: Tank puro. Attira tutti gli attacchi + si potenzia la difesa del 30%. Ideale per il tank del gruppo.

---

#### ✨ Scudo Vitale
- **ID**: `scudo_vitale`
- **Cooldown**: 3 turni
- **Descrizione**: Attiva uno scudo energetico che ripristina 30 HP e riduce i danni subiti.
- **Target**: Se stesso

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `self`, amount: **30 HP** |
| 2 | `buff_stat` | target: `self`, stat: `def`, amount: **+40%**, duration: **2 turni** |

**Analisi**: Cura immediata + potenziamento difesa. Ibrido cura/difesa.

---

#### 🔧 Recupero Tattico
- **ID**: `recupero_tattico`
- **Cooldown**: 2 turni
- **Descrizione**: Sfrutta le conoscenze di sopravvivenza per curarsi rapidamente e tornare in forze.
- **Target**: Se stesso

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `self`, amount: **50 HP** |

**Analisi**: Cura pura da 50 HP. Abbastanza per recuperare da un attacco nemico.

---

#### 💊 Resistenza Attiva
- **ID**: `resistenza_attiva`
- **Cooldown**: 3 turni
- **Descrizione**: Attiva un protocollo di resistenza che rimuove tutti gli status negativi e ripristina HP.
- **Target**: Se stesso

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `self`, amount: **25 HP** |
| 2 | `remove_status` | target: `self`, statuses: `poison, bleeding, stunned` |

**Analisi**: Cura leggera + pulizia status. "Panic button" per personaggi avvelenati/sanguinanti.

---

### Categoria: SUPPORT 💚

---

#### 💊 Pronto Soccorso
- **ID**: `pronto_soccorso`
- **Cooldown**: 2 turni
- **Descrizione**: Un intervento medico rapido che cura un alleato di 70 HP e rimuove veleno e sanguinamento.
- **Target**: Singolo alleato

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `ally`, amount: **70 HP** |
| 2 | `remove_status` | target: `ally`, statuses: `poison, bleeding` |

**Analisi**: Cura forte (70 HP) + pulizia DOT. La cura singola più potente.

---

#### 💚 Cura Gruppo
- **ID**: `cura_gruppo`
- **Cooldown**: 3 turni
- **Descrizione**: Distribuisce cure a tutto il gruppo, curando ogni alleato di una quantità moderata di HP.
- **Target**: Tutti gli alleati

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `all_allies`, amount: **35 HP** |

**Analisi**: 35 HP a TUTTI. Totale: 35 × numero_alleati. Eccellente con 3 personaggi (105 HP totali).

---

#### 💉 Adrenalina
- **ID**: `adrenalina`
- **Cooldown**: 3 turni
- **Descrizione**: Inietta adrenalina a un alleato, ripristinando 40 HP e aumentando ATK del 25% per 2 turni.
- **Target**: Singolo alleato

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `ally`, amount: **40 HP** |
| 2 | `apply_status` | target: `ally`, statusType: `adrenaline`, chance: **100%** |

**Analisi**: Cura + buff. Adrenaline = +25% ATK per 2 turni. Ideale per il DPS prima di un Colpo Mortale.

---

#### 🧪 Iniezione Stimolante
- **ID**: `iniezione_stimolante`
- **Cooldown**: 3 turni
- **Descrizione**: Un potente siero che cura un alleato di una grande quantità di HP e rimuove tutti gli effetti negativi.
- **Target**: Singolo alleato

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `ally`, amount: **45 HP** |
| 2 | `remove_status` | target: `ally`, statuses: `poison, bleeding, stunned` |

**Analisi**: Cura forte + pulizia completa. Più potente di Pronto Soccorso ma rimuove anche stunned.

---

#### 🧴 Disinfezione Totale
- **ID**: `disinfezione_totale`
- **Cooldown**: 3 turni
- **Descrizione**: Distribuisce un antisettico a tutto il gruppo, rimuovendo tutti gli status negativi e curando leggermente.
- **Target**: Tutti gli alleati

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `heal` | target: `all_allies`, amount: **20 HP** |
| 2 | `remove_status` | target: `all_allies`, statuses: `poison, bleeding, stunned` |

**Analisi**: Pulizia completa di gruppo + 20 HP a testa. Indispensabile dopo abilità AoE dei nemici.

---

### Categoria: CONTROL 🌀

---

#### 💨 Gas Venefico
- **ID**: `gas_venefico`
- **Cooldown**: 3 turni
- **Descrizione**: Lancia una granata di gas che avvelena tutti i nemici e infligge danni moderati.
- **Target**: Tutti i nemici

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `all_enemies`, powerMultiplier: **0.7** |
| 2 | `apply_status` | target: `all_enemies`, statusType: `poison`, chance: **65%** |

**Analisi**: Danno AoE (x0.7) + veleno AoE (65%). Eccellente contro gruppi numerosi.

---

#### 🔔 Cristalli Sonici
- **ID**: `cristalli_sonici`
- **Cooldown**: 3 turni
- **Descrizione**: Attiva un dispositivo sonico che stordisce il bersaglio e infligge danni moderati.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **1.1** |
| 2 | `apply_status` | target: `enemy`, statusType: `stunned`, chance: **60%** |

**Analisi**: Danno + CC singolo. 60% di stordire + x1.1 ATK. Simile ad Attacco di Carica ma meno danno e più CC.

---

#### ⚡ Frecce Elettriche
- **ID**: `frecce_etiche`
- **Cooldown**: 3 turni
- **Descrizione**: Spara una scarica elettrica che paralizza il nemico con alta probabilità.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **0.9** |
| 2 | `apply_status` | target: `enemy`, statusType: `stunned`, chance: **55%** |

**Analisi**: Simile a Cristalli Sonici ma meno danno base (x0.9 vs x1.1).

---

#### 💣 Granata Stordente
- **ID**: `granata_stordente`
- **Cooldown**: 3 turni
- **Descrizione**: Lancia una granata concussiva che infligge danni moderati a tutti i nemici con alta probabilità di stordirli.
- **Target**: Tutti i nemici

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `all_enemies`, powerMultiplier: **0.8** |
| 2 | `apply_status` | target: `all_enemies`, statusType: `stunned`, chance: **60%** |

**Analisi**: Stordimento AoE! 60% di stordire TUTTI i nemici + x0.8 danni. Fortissima contro gruppi.

---

#### 🧬 Siero Inibitore
- **ID**: `siero_inibitore`
- **Cooldown**: 3 turni
- **Descrizione**: Inietta un siero neurotossico al nemico, avvelenandolo e stordendolo simultaneamente.
- **Target**: Singolo nemico

| # | Effetto | Dettaglio |
|---|---------|-----------|
| 1 | `deal_damage` | target: `enemy`, powerMultiplier: **1.0** |
| 2 | `apply_status` | target: `enemy`, statusType: `poison`, chance: **70%** |
| 3 | `apply_status` | target: `enemy`, statusType: `stunned`, chance: **40%** |

**Analisi**: Triple effect! Danno (x1.0) + veleno (70%) + stordimento (40%). Il control singolo più forte.

---

### Archetipi Predefiniti — Abilità Assegnate

| Archetipo | Abilità 1 | Abilità 2 |
|-----------|-----------|-----------|
| 🛡️ Tank | Barricata | Immolazione |
| 💚 Healer | Pronto Soccorso | Cura Gruppo |
| ⚔️ DPS | Colpo Mortale | Raffica |
| 🌀 Control | Gas Venefico | Cristalli Sonici |

---

## 👹 ABILITÀ DEI NEMICI

### NEMICI COMUNI

---

#### 🧟 Zombie
**HP: 60 | ATK: 12 | DEF: 4 | SPD: 3 | EXP: 15**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Morso** | 60% | `deal_damage` x1.0 + `apply_status` poison 25% (dur 3) |
| **Artigliata** | 30% | `deal_damage` x0.8 + `apply_status` bleeding 20% (dur 3) |
| **Trascinamento** | 10% | `deal_damage` x0.6 |

**Pattern**: Attacco primario (Morso) con chance di avvelenare. Attacco secondario (Artigliata) sanguinante.

---

#### 👩 Zombie Donna
**HP: 50 | ATK: 11 | DEF: 3 | SPD: 4 | EXP: 14**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Morso** | 55% | `deal_damage` x1.0 + `apply_status` poison 20% (dur 3) |
| **Artigliata** | 30% | `deal_damage` x0.7 + `apply_status` bleeding 15% (dur 3) |
| **Urlo** | 15% | `deal_damage` x0.3 + `apply_status` stunned 20% (dur 1) |

**Pattern**: Simile allo zombie ma aggiunge Urlo con 20% stun. Più veloce ma meno resistente.

---

#### 🪖 Zombie Soldato UBCS
**HP: 80 | ATK: 15 | DEF: 8 | SPD: 3 | EXP: 22**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Colpo di Fucile** | 25% | `deal_damage` x1.2 |
| **Morso** | 45% | `deal_damage` x0.9 + `apply_status` poison 25% (dur 3) |
| **Carica** | 20% | `deal_damage` x1.0 + `apply_status` stunned 15% (dur 1) |
| **Coltello Rotante** | 10% | `deal_damage` x0.8 |

**Pattern**: Il nemico base più pericoloso. Alto ATK, alta DEF, Carica con stun, Colpo di Fucile potente.

---

#### 🩺 Zombie Dottore
**HP: 55 | ATK: 10 | DEF: 3 | SPD: 4 | EXP: 18**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Siringa Infetta** | 40% | `deal_damage` x0.8 + `apply_status` poison 45% (dur 3) |
| **Morso** | 35% | `deal_damage` x0.9 + `apply_status` poison 20% (dur 3) |
| **Bisturi** | 15% | `deal_damage` x0.7 + `apply_status` bleeding 30% (dur 3) |
| **Urlo** | 10% | `deal_damage` x0.2 + `apply_status` stunned 25% (dur 1) |

**Pattern**: Specialista in veleno. Siringa Infetta ha 45% chance di avvelenamento — la più alta tra i nemici base.

---

#### 🐕 Cerbero (Zombie Dog)
**HP: 40 | ATK: 16 | DEF: 2 | SPD: 10 | EXP: 20**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Attacco Rapido** | 50% | `deal_damage` x1.0 |
| **Morso Velenoso** | 35% | `deal_damage` x0.9 + `apply_status` poison 35% (dur 3) |
| **Ringhio** | 15% | `deal_damage` x0.3 + `apply_status` stunned 30% (dur 1) |

**Pattern**: Molto veloce (SPD 10), attacca spesso. Danno puro (x1.0) + veleno + stun.

---

#### 🐺 Cerbero Alpha
**HP: 70 | ATK: 22 | DEF: 4 | SPD: 12 | EXP: 35**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Morso Devastante** | 45% | `deal_damage` x1.3 + `apply_status` bleeding 40% (dur 3) |
| **Carica Brutale** | 30% | `deal_damage` x1.5, **noMiss: true** |
| **Ringhio Infernale** | 15% | `deal_damage` x0.4 + `apply_status` stunned 40% (dur 1) |
| **Artigli Multipli** | 10% | `deal_damage` x0.9 + `apply_status` bleeding 25% (dur 3) |

**Pattern**: Versione potenziata del Cerbero. **Carica Brutale non può mancare** (noMiss). Altamente letale.

---

### NEMICI AVANZATI

---

#### 👅 Licker
**HP: 80 | ATK: 20 | DEF: 5 | SPD: 9 | EXP: 30**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Lingua Artigliata** | 45% | `deal_damage` x1.2 |
| **Artiglio Devastante** | 35% | `deal_damage` x1.0 + `apply_status` bleeding 40% (dur 3) |
| **Salto** | 20% | `deal_damage` x1.5 |

**Pattern**: Attacchi potenti e sanguinanti. Salto (x1.5) è il più forte.

---

#### 👾 Licker Smasher
**HP: 130 | ATK: 28 | DEF: 8 | SPD: 6 | EXP: 45**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Pugno Terra** | 35% | `deal_damage` x1.8 + `apply_status` stunned 30% (dur 1) |
| **Lingua Artigliata** | 30% | `deal_damage` x1.4 |
| **Artiglio Squarciatore** | 25% | `deal_damage` x1.6 + `apply_status` bleeding 50% (dur 3) |
| **Corpo a Corpo** | 10% | `deal_damage` x1.2 |

**Pattern**: Versione tank del Licker. Danni enormi (fino a x1.8) + stun + bleeding 50%.

---

#### 🦎 Licker Crawler
**HP: 65 | ATK: 22 | DEF: 3 | SPD: 13 | EXP: 38**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Attacco dal Soffitto** | 40% | `deal_damage` x1.6 |
| **Lingua Fulminea** | 35% | `deal_damage` x1.2 + `apply_status` bleeding 35% (dur 3) |
| **Scatto sulle Pareti** | 15% | `deal_damage` x1.0 |
| **Morso Velenoso** | 10% | `deal_damage` x0.9 + `apply_status` poison 50% (dur 3) |

**Pattern**: Versione veloce del Licker (SPD 13 = il più veloce del gioco). Attacco dal Soffitto (x1.6) + veleno 50%.

---

#### 🦎 Hunter (B.O.W.)
**HP: 120 | ATK: 24 | DEF: 8 | SPD: 11 | EXP: 45**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Artigli Fendenti** | 40% | `deal_damage` x1.3 + `apply_status` bleeding 50% (dur 3) |
| **Salto Mortale** | 25% | `deal_damage` x1.8 |
| **Ruggito** | 15% | `deal_damage` x0.4 + `apply_status` stunned 40% (dur 1) |
| **Scatto** | 20% | `deal_damage` x1.0 |

**Pattern**: Nemico elite. Alti danni (x1.8 Salto) + bleeding 50% + stun. Bilanciato e pericoloso.

---

## 👹 BOSS

---

#### 👹 T-103 Tyrant
**HP: 350 | ATK: 30 | DEF: 15 | SPD: 7 | EXP: 100 | BOSS**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Pugno Devastante** | 35% | `deal_damage` x1.5 |
| **Carica** | 20% | `deal_damage` x2.0, **noMiss: true** |
| **Artiglio Mortale** | 25% | `deal_damage` x1.8 + `apply_status` bleeding 60% (dur 3) |
| **Urlo** | 10% | `deal_damage` x0.5 + `apply_status` stunned 50% (dur 1) |
| **Presa Mortale** | 10% | `deal_damage` x2.5, **noMiss: true** |

**⚠️ FASE 1 (HP ≤ 60%) — "Cortus"**: hpMult 1.2, atkMult 1.3, defMult 0.7, spdMult 1.3

| Abilità Fase | Chance | Effects |
|-------------|--------|---------|
| **Impatto Sismico** | 25% | `deal_damage` x2.2 + `apply_status` stunned 40% (dur 1) |
| **Rantolo Mortale** | 15% | `deal_damage` x0.8 + `apply_status` stunned 60% (dur 1) |

**⚠️ FASE 2 (HP ≤ 30%)**: hpMult 1.2, atkMult 1.3, defMult 0.7, spdMult 1.3
+ Impatto Sismico + Rantolo Mortale dalla Fase 1

**Pattern Boss**: Attacchi devastanti, Carica/Presa Mortale impossibili da schivare. Fase 2: +30% ATK, -30% DEF, +30% SPD, nuove abilità stun AoE.

---

#### 💀 NEMESIS
**HP: 500 | ATK: 35 | DEF: 18 | SPD: 9 | EXP: 200 | BOSS**

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Razzo** | 15% | `deal_damage` x2.5 |
| **Pugno Tentacolo** | 30% | `deal_damage` x2.0 |
| **S.T.A.R.S.!** | 20% | `deal_damage` x1.5 + `apply_status` stunned 45% (dur 1) |
| **Artiglio Multipli** | 25% | `deal_damage` x1.8 + `apply_status` bleeding 50% (dur 3) |
| **Devastazione** | 10% | `deal_damage` x3.0, target: `all_enemies` |

**⚠️ FASE 1 (HP ≤ 65%) — "Pursuer"**: hpMult 1.0, nuove abilità:

| Abilità Fase | Chance | Effects |
|-------------|--------|---------|
| **Barrage Razzo** | 20% | `deal_damage` x1.8, target: `all_enemies` |

**⚠️ FASE 2 (HP ≤ 35%) — "Avenger"**: hpMult 1.3, atkMult 1.4, defMult 0.8, spdMult 1.2

| Abilità Fase | Chance | Effects |
|-------------|--------|---------|
| **Presa Letale** | 15% | `deal_damage` x2.8, **noMiss: true** |
| **S.T.A.R.S.!!!** | 20% | `deal_damage` x0.6 + `apply_status` stunned 60% (dur 1), target: `all_enemies` |

**Pattern Boss**: Il boss più pericoloso. **Devastazione** (x3.0 AoE) + **Barrage Razzo** (x1.8 AoE). Fase 2: Presa Letale (x2.8 noMiss) + Stun AoE 60%.

---

#### 🧪 B.O.W. Proto-Tyrant
**HP: 450 | ATK: 38 | DEF: 12 | SPD: 8 | EXP: 250 | BOSS SEGRETO** (15% chance dopo Tyrant)

| Abilità | Chance Uso | Effects |
|---------|-----------|---------|
| **Sbataccio Anomalo** | 30% | `deal_damage` x1.6 + `apply_status` bleeding 55% (dur 3) |
| **Tentacolo Infetto** | 25% | `deal_damage` x2.0 + `apply_status` poison 50% (dur 3) |
| **Urlo Agonizzante** | 15% | `deal_damage` x0.6 + `apply_status` stunned 55% (dur 1) |
| **Scarica Brutale** | 20% | `deal_damage` x2.2 |
| **Mutazione Rapida** | 10% | `heal` target: `self`, amount: **30 HP** |

**⚠️ FASE 1 (HP ≤ 55%) — "Instabile"**: hpMult 1.0, nuove abilità:

| Abilità Fase | Chance | Effects |
|-------------|--------|---------|
| **Rigenerazione** | 15% | `heal` target: `self`, amount: **50 HP** |

**⚠️ FASE 2 (HP ≤ 25%) — "Completo"**: hpMult 1.5, atkMult 1.5, defMult 0.5, spdMult 1.4

| Abilità Fase | Chance | Effects |
|-------------|--------|---------|
| **Attacco Self-Destruct** | 10% | `deal_damage` x3.0, target: `all_enemies` |

**Pattern Boss**: Boss segreto con **self-heal** (30 HP + 50 HP rigenerazione). Alto ATK (38) + veleno + sanguinamento + stun. Fase 2: +50% HP/ATK, -50% DEF, Self-Destruct AoE x3.0.

---

## 🎒 ABILITÀ DEGLI OGGETTI (Consumabili)

| Oggetto | Icona | Effects | Trigger |
|---------|-------|---------|---------|
| **Rocket Launcher** | 🚀 | `deal_damage` x999, all_enemies, ignoreDef, noMiss | `on_use` |
| **Benda** | 🩹 | `heal` 25 HP, ally | `on_use` |
| **Erba Verde** | 🌿 | `heal` 30 HP, ally | `on_use` |
| **Erba Mista** | 🌿 | `heal` 60 HP + `remove_status` (poison, bleeding), ally | `on_use` |
| **First Aid Spray** | 💉 | `heal` 80 HP, ally | `on_use` |
| **Spray Disinfettante** | 🧴 | `remove_status` (poison), ally | `on_use` |
| **Antidoto** | 💊 | `remove_status` (poison), ally | `on_use` |
| **Borsa Piccola** | 🎒 | `add_slots` +1, self | `on_use` |
| **Borsa Media** | 🎒 | `add_slots` +2, self | `on_use` |

---

## 🛡️ ABILITÀ DEGLI EQUIPAGGIAMENTI (Passive)

| Equipaggiamento | Slot | Effects | Trigger | Descrizione |
|----------------|------|---------|---------|-------------|
| **Distintivo Primo Soccorso** | Accessorio | `hot` 3 HP/turno, duration: ∞ | `on_turn_start` | Rigenera 3 HP all'inizio di ogni turno |
| **Anello del Virus** | Accessorio | `reflect` 5%, duration: ∞ | `on_take_hit` | Riflette 5% dei danni subiti |

---

## 📊 Statistiche Totali

| Categoria | Numero | Note |
|-----------|--------|-------|
| Abilità PG (Specials) | 20 | 5 offensive, 5 difensive, 5 support, 5 control |
| Abilità Nemici Base | 38 | Incluse fasi boss |
| Nemici totali | 12 | + 3 boss con multi-fase |
| Oggetti con effects | 9 | 7 consumabili + 2 borse |
| Equipaggiamenti con effects | 2 | 2 accessori passivi |
| **Totale effetti definiti** | **69+** | Ogni abilità può avere 1-3 effetti |

---

*Documento generato automaticamente — Raccoon City RPG Effects System v2.0*
