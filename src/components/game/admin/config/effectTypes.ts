// ═══════════════════════════════════════════════════════════════
// Effects Array Editor — atomic effects for special abilities
// ═══════════════════════════════════════════════════════════════

export const EFFECT_TARGET_OPTIONS = [
  { key: 'self', label: 'Sé Stesso' },
  { key: 'enemy', label: 'Nemico Singolo' },
  { key: 'all_enemies', label: 'Tutti i Nemici' },
  { key: 'ally', label: 'Un Alleato' },
  { key: 'all_allies', label: 'Tutti gli Alleati' },
  { key: 'lowest_hp_ally', label: 'Alleato con HP più bassi' },
];

export const EFFECT_STATUS_LIST = [
  { key: 'poison', label: 'Veleno' },
  { key: 'bleeding', label: 'Sanguinamento' },
  { key: 'stunned', label: 'Stordimento' },
  { key: 'adrenaline', label: 'Adrenalina' },
];

export const EFFECT_STAT_LIST = [
  { key: 'atk', label: 'ATK (Danni)' },
  { key: 'def', label: 'DEF (Difesa)' },
  { key: 'spd', label: 'SPD (Velocità)' },
  { key: 'hp', label: 'HP (Vita)' },
  { key: 'crit', label: 'CRIT (Critico %)' },
];

export type EffectCategory = 'offensive' | 'defensive' | 'support' | 'control';

export interface EffectFieldDef {
  key: string;
  label: string;
  tooltip: string;
  type: 'number' | 'boolean' | 'select' | 'multi-select';
  options?: { key: string; label: string }[];
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
}

export interface EffectTypeDef {
  key: string;
  label: string;
  emoji: string;
  tooltip: string;
  category: EffectCategory;
  defaultTarget: string;
  fields: EffectFieldDef[];
}

export const EFFECT_TYPES_CONFIG: EffectTypeDef[] = [
  {
    key: 'deal_damage',
    label: 'Danno',
    emoji: '💥',
    tooltip: 'Infligge danni al bersaglio basati sull\'ATK del personaggio, moltiplicato per il valore specificato.',
    category: 'offensive',
    defaultTarget: 'enemy',
    fields: [
      { key: 'powerMultiplier', label: 'Moltiplicatore ATK', tooltip: 'Moltiplicatore dell\'ATK. 1.0 = ATK normale, 1.6 = 160% dell\'ATK, 2.0 = doppio danno.', type: 'number', defaultValue: 1.0, min: 0.1, max: 10, step: 0.1 },
      { key: 'guaranteedCrit', label: 'Critico Garantito', tooltip: 'Se attivo, l\'attacco è sempre un critico (danno x1.5).', type: 'boolean', defaultValue: false },
      { key: 'ignoreDef', label: 'Ignora DEF', tooltip: 'Se attivo, ignora la DEF del bersaglio nel calcolo del danno.', type: 'boolean', defaultValue: false },
      { key: 'noMiss', label: 'Sempre Colpisce', tooltip: 'Se attivo, l\'attacco non può mancare il bersaglio (100% hit).', type: 'boolean', defaultValue: false },
      { key: 'basedOnTargetHp', label: '% HP Bersaglio', tooltip: 'Se > 0, il danno è una % degli HP massimi del bersaglio invece che basato sull\'ATK.', type: 'number', defaultValue: 0, min: 0, max: 100, step: 1 },
      { key: 'excludePrimaryTarget', label: 'Escludi Primario', tooltip: 'Per danni ad area: se attivo, il bersaglio principale non riceve il danno splash.', type: 'boolean', defaultValue: false },
    ],
  },
  {
    key: 'heal',
    label: 'Cura',
    emoji: '💚',
    tooltip: 'Ripristina HP al bersaglio. Puoi impostare un numero fisso di HP o una percentuale dei maxHP.',
    category: 'support',
    defaultTarget: 'ally',
    fields: [
      { key: 'amount', label: 'HP Cura', tooltip: 'Se "Percentuale" è spento: HP fissi da curare. Se "Percentuale" è acceso: percentuale dei maxHP (es. 100 = cura completa).', type: 'number', defaultValue: 50, min: 1, max: 9999, step: 1 },
      { key: 'percent', label: 'Percentuale', tooltip: 'Se attivo, il valore "HP Cura" viene interpretato come % dei maxHP del bersaglio (es. 100 = cura tutti gli HP).', type: 'boolean', defaultValue: false },
    ],
  },
  {
    key: 'apply_status',
    label: 'Applica Status',
    emoji: '☠️',
    tooltip: 'Applica uno status negativo al bersaglio con una probabilità. Se applicato, il bersaglio ne soffre per N turni.',
    category: 'control',
    defaultTarget: 'enemy',
    fields: [
      { key: 'statusType', label: 'Tipo Status', tooltip: 'Il tipo di status da applicare. Ognuno ha effetti diversi in combattimento.', type: 'select', options: EFFECT_STATUS_LIST, defaultValue: 'poison' },
      { key: 'chance', label: 'Probabilità %', tooltip: 'Probabilità di applicare lo status, in percentuale (0-100).', type: 'number', defaultValue: 50, min: 0, max: 100, step: 1 },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata dello status. Se vuoto o 0, usa il default di 3 turni.', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1 },
    ],
  },
  {
    key: 'remove_status',
    label: 'Rimuovi Status',
    emoji: '✨',
    tooltip: 'Rimuove status negativi specificati dal bersaglio. Utile combinato con Cura per curare e disintossicare insieme.',
    category: 'support',
    defaultTarget: 'ally',
    fields: [
      { key: 'statuses', label: 'Status da Rimuovere', tooltip: 'Gli status da rimuovere dal bersaglio. Seleziona tutti quelli che vuoi curare.', type: 'multi-select', options: EFFECT_STATUS_LIST, defaultValue: [] },
    ],
  },
  {
    key: 'buff_stat',
    label: 'Aumenta Statistica',
    emoji: '📈',
    tooltip: 'Aumenta una statistica del bersaglio. Con flat=true (on_equip) è un bonus fisso permanente. Senza flat è un % temporaneo (durata in turni).',
    category: 'defensive',
    defaultTarget: 'self',
    fields: [
      { key: 'stat', label: 'Statistica', tooltip: 'La statistica da aumentare. ATK=danni, DEF=difesa, SPD=velocità, HP=vita, CRIT=critico%.', type: 'select', options: EFFECT_STAT_LIST, defaultValue: 'atk' },
      { key: 'amount', label: 'Valore', tooltip: 'Importo dell\'aumento. Se flat=true è un bonus fisso (es. +5 ATK). Se false è una % (es. 30 = +30%).', type: 'number', defaultValue: 5, min: 1, max: 200, step: 1 },
      { key: 'flat', label: 'Bonus Fisso', tooltip: 'Se attivo, amount è un bonus piatto aggiunto direttamente (es. +5 ATK). Usato con on_equip per equipaggiamento permanente.', type: 'boolean', defaultValue: false },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata del buff. 0 o vuoto = permanente (per on_equip). Ignorato se flat=true senza durata.', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1 },
    ],
  },
  {
    key: 'debuff_stat',
    label: 'Riduci Statistica',
    emoji: '📉',
    tooltip: 'Riduce temporaneamente una statistica del bersaglio. Simile a Aumenta Stat ma applicato ai nemici.',
    category: 'control',
    defaultTarget: 'enemy',
    fields: [
      { key: 'stat', label: 'Statistica', tooltip: 'La statistica da ridurre. ATK = meno danni, DEF = più danni ricevuti, SPD = più lento.', type: 'select', options: EFFECT_STAT_LIST, defaultValue: 'atk' },
      { key: 'amount', label: 'Riduzione %', tooltip: 'Percentuale di riduzione (es. 30 = -30% della statistica base).', type: 'number', defaultValue: 30, min: 1, max: 200, step: 1 },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata del debuff. Al termine, la statistica torna al valore normale.', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
    ],
  },
  {
    key: 'shield',
    label: 'Scudo',
    emoji: '🛡️',
    tooltip: 'Applica uno scudo che assorbe danni. Se lo scudo ha HP residui alla scadenza, viene rimosso.',
    category: 'defensive',
    defaultTarget: 'self',
    fields: [
      { key: 'amount', label: 'HP Scudo', tooltip: 'HP di assorbimento dello scudo. I danni vengono sottratti dallo scudo prima degli HP.', type: 'number', defaultValue: 100, min: 1, max: 9999, step: 1 },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata dello scudo. Alla scadenza, lo scudo sparisce anche se ha HP residui.', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
    ],
  },
  {
    key: 'taunt',
    label: 'Provocazione',
    emoji: '🎯',
    tooltip: 'I nemici sono costretti a attaccare solo il personaggio che ha usato l\'abilità per N turni.',
    category: 'defensive',
    defaultTarget: 'self',
    fields: [
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni in cui i nemici sono costretti ad attaccare solo questo personaggio.', type: 'number', defaultValue: 2, min: 1, max: 10, step: 1 },
    ],
  },
  {
    key: 'lifesteal',
    label: 'Ruba Vita',
    emoji: '🧛',
    tooltip: 'Il personaggio ruba una % dei danni inflitti come HP curati. Funziona solo se l\'attacco colpisce.',
    category: 'offensive',
    defaultTarget: 'enemy',
    fields: [
      { key: 'percent', label: 'Percentuale %', tooltip: 'Percentuale dei danni inflitti che vengono convertiti in HP curati per l\'attaccante.', type: 'number', defaultValue: 30, min: 1, max: 100, step: 1 },
    ],
  },
  {
    key: 'revive',
    label: 'Rivivi',
    emoji: '👼',
    tooltip: 'Rianima un alleato caduto con una % dei suoi HP massimi. Il personaggio torna in combattimento.',
    category: 'support',
    defaultTarget: 'ally',
    fields: [
      { key: 'hpPercent', label: 'HP %', tooltip: 'Percentuale degli HP massimi del personaggio rianimato con cui torna in combattimento.', type: 'number', defaultValue: 50, min: 1, max: 100, step: 1 },
    ],
  },
  {
    key: 'hot',
    label: 'Cura nel Tempo',
    emoji: '🌿',
    tooltip: 'Il bersaglio recupera HP ogni turno per la durata specificata. Si accumula con altre cure.',
    category: 'support',
    defaultTarget: 'ally',
    fields: [
      { key: 'amountPerTurn', label: 'HP/Turno', tooltip: 'HP recuperati ad ogni turno per la durata dell\'effetto.', type: 'number', defaultValue: 20, min: 1, max: 999, step: 1 },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata della cura nel tempo. Ad ogni turno il bersaglio riceve la cura.', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
    ],
  },
  {
    key: 'reflect',
    label: 'Rifletti',
    emoji: '🪞',
    tooltip: 'Riflette una % dei danni ricevuti all\'attaccante. Attivo per N turni.',
    category: 'defensive',
    defaultTarget: 'self',
    fields: [
      { key: 'percent', label: 'Percentuale %', tooltip: 'Percentuale dei danni ricevuti che viene riflessa all\'attaccante.', type: 'number', defaultValue: 30, min: 1, max: 100, step: 1 },
      { key: 'duration', label: 'Durata (turni)', tooltip: 'Turni di durata del riflettimento. Passati questi turni, l\'effetto sparisce.', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
    ],
  },
  {
    key: 'add_slots',
    label: 'Aggiungi Slot',
    emoji: '🎒',
    tooltip: 'Aggiunge slot all\'inventario del personaggio. Effetto meta-game, usabile solo fuori combattimento.',
    category: 'support',
    defaultTarget: 'self',
    fields: [
      { key: 'amount', label: 'Slot da Aggiungere', tooltip: 'Numero di slot inventario da aggiungere (es. 1, 2).', type: 'number', defaultValue: 1, min: 1, max: 12, step: 1 },
      { key: 'maxSlots', label: 'Slot Massimi', tooltip: 'Limite massimo di slot (default 12). L\'effetto non supera questo cap.', type: 'number', defaultValue: 12, min: 1, max: 99, step: 1 },
    ],
  },
  {
    key: 'status_resist',
    label: 'Resistenza Status',
    emoji: '🧪',
    tooltip: 'Conferisce resistenza a uno status negativo (veleno, sanguinamento, stordimento). Attivo finché equipaggiato (on_equip).',
    category: 'defensive',
    defaultTarget: 'self',
    fields: [
      { key: 'statusType', label: 'Tipo Status', tooltip: 'Lo status a cui resistere. "all" = resistenza a tutti.', type: 'select', options: [{ key: 'poison', label: 'Veleno' }, { key: 'bleeding', label: 'Sanguinamento' }, { key: 'stunned', label: 'Stordimento' }, { key: 'all', label: 'Tutti' }], defaultValue: 'poison' },
      { key: 'value', label: 'Resistenza %', tooltip: 'Percentuale di riduzione probabilità (es. 50 = 50% meno probabilità di essere avvelenati).', type: 'number', defaultValue: 50, min: 1, max: 100, step: 1 },
    ],
  },
  {
    key: 'status_chance_boost',
    label: 'Bonus Status Chance',
    emoji: '☠️',
    tooltip: 'Aumenta la probabilità di applicare status negativi quando si attacca. Per weapon mod.',
    category: 'offensive',
    defaultTarget: 'self',
    fields: [
      { key: 'amount', label: 'Bonus %', tooltip: 'Percentuale extra aggiunta alla probabilità di applicare status (es. 30 = +30% in più).', type: 'number', defaultValue: 20, min: 1, max: 100, step: 1 },
    ],
  },
];

export const EFFECT_CATEGORY_COLORS: Record<EffectCategory, string> = {
  offensive: 'text-red-400 border-red-500/20 bg-red-500/10',
  defensive: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
  support: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
  control: 'text-emerald-500 border-emerald-600/20 bg-emerald-600/10',
};

export function parseEffectsArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p; } catch { /* empty */ }
  }
  return [];
}

export function getDefaultEffect(typeKey: string): Record<string, unknown> {
  const cfg = EFFECT_TYPES_CONFIG.find(t => t.key === typeKey);
  if (!cfg) return { type: typeKey };
  const result: Record<string, unknown> = { type: typeKey, target: cfg.defaultTarget };
  for (const f of cfg.fields) {
    result[f.key] = f.defaultValue;
  }
  return result;
}

export const TRIGGER_OPTIONS = [
  { value: 'on_equip', label: "All'equip", emoji: '🛡️', tooltip: "Attivo finché l'oggetto è equipaggiato. Per bonus statistici permanenti (armi, armature, accessori, mod)." },
  { value: 'on_use', label: "All'uso", emoji: '🫳', tooltip: "Si attiva quando il giocatore usa l'oggetto (consumabili)" },
  { value: 'on_hit', label: 'Al colpo', emoji: '⚔️', tooltip: "Si attiva dopo un attacco base (armi)" },
  { value: 'on_take_hit', label: 'Quando colpiti', emoji: '🛡️', tooltip: "Si attiva quando il personaggio riceve danni (armature)" },
  { value: 'on_turn_start', label: 'Inizio turno', emoji: '⏱️', tooltip: "Si attiva all'inizio del turno del personaggio (accessori/equip)" },
  { value: 'on_critical', label: 'Colpo critico', emoji: '💥', tooltip: "Si attiva quando il personaggio fa un colpo critico (accessori)" },
];
