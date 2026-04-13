import { SpecialAbilityDefinition } from '@/game/types';

// ==========================================
// SPECIAL ABILITIES POOL
// At least 8 specials across 3 categories
// Custom characters can pick any 2 from this pool
// ==========================================

export const SEED_SPECIALS: SpecialAbilityDefinition[] = [
  // ── OFFENSIVE ──
  {
    id: 'colpo_mortale',
    name: 'Colpo Mortale',
    description: 'Un attacco mirato e devastante che infligge danni critici massimi al bersaglio.',
    icon: '💀',
    targetType: 'enemy',
    cooldown: 2,
    category: 'offensive',
    effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 1.6 }],
  },
  {
    id: 'raffica',
    name: 'Raffica',
    description: 'Spara una raffica che colpisce il bersaglio principale e danneggia anche gli altri nemici vicini.',
    icon: '🔥',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 1.3 },
      { type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.6, excludePrimaryTarget: true },
    ],
  },
  {
    id: 'sparo_mirato',
    name: 'Sparo Mirato',
    description: 'Un colpo precisissimo che non può mancare e infligge ingenti danni al bersaglio.',
    icon: '🎯',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    effects: [{ type: 'deal_damage', target: 'enemy', powerMultiplier: 2.0, noMiss: true }],
  },
  {
    id: 'veleno_acido',
    name: 'Veleno Acido',
    description: 'Lancia una sostanza corrosiva che avvelena il nemico e infligge danni moderati.',
    icon: '☣️',
    targetType: 'enemy',
    cooldown: 2,
    category: 'offensive',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 0.9 },
      { type: 'apply_status', target: 'enemy', statusType: 'poison', chance: 70 },
    ],
  },
  {
    id: 'attacco_carica',
    name: 'Attacco di Carica',
    description: 'Una carica brutale che infligge danni considerevoli e può stordire il nemico.',
    icon: '🏃',
    targetType: 'enemy',
    cooldown: 3,
    category: 'offensive',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 1.4 },
      { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 50 },
    ],
  },

  // ── DEFENSIVE ──
  {
    id: 'barricata',
    name: 'Barricata',
    description: 'Solleva una barricata improvvisata, riducendo drasticamente i danni subiti per il prossimo turno.',
    icon: '🛡️',
    targetType: 'self',
    cooldown: 2,
    category: 'defensive',
    effects: [{ type: 'buff_stat', target: 'all_allies', stat: 'def', amount: 50, duration: 3 }],
  },
  {
    id: 'immolazione',
    name: 'Immolazione',
    description: 'Si espone per attirare tutti gli attacchi nemici su di sé, proteggendo gli alleati. Danni ridotti.',
    icon: '🔥',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    effects: [
      { type: 'taunt', target: 'self', duration: 2 },
      { type: 'buff_stat', target: 'self', stat: 'def', amount: 30, duration: 2 },
    ],
  },
  {
    id: 'scudo_vitale',
    name: 'Scudo Vitale',
    description: 'Attiva uno scudo energetico che ripristina 30 HP e riduce i danni subiti fino al prossimo turno.',
    icon: '✨',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    effects: [
      { type: 'heal', target: 'self', amount: 30 },
      { type: 'buff_stat', target: 'self', stat: 'def', amount: 40, duration: 2 },
    ],
  },
  {
    id: 'recupero_tattico',
    name: 'Recupero Tattico',
    description: 'Sfrutta le conoscenze di sopravvivenza per curarsi rapidamente e tornare in forze.',
    icon: '🔧',
    targetType: 'self',
    cooldown: 2,
    category: 'defensive',
    effects: [{ type: 'heal', target: 'self', amount: 50 }],
  },
  {
    id: 'resistenza_attiva',
    name: 'Resistenza Attiva',
    description: 'Attiva un protocollo di resistenza che rimuove tutti gli status negativi e ripristina una modesta quantità di HP.',
    icon: '💊',
    targetType: 'self',
    cooldown: 3,
    category: 'defensive',
    effects: [
      { type: 'heal', target: 'self', amount: 25 },
      { type: 'remove_status', target: 'self', statuses: ['poison', 'bleeding', 'stunned'] },
    ],
  },

  // ── SUPPORT ──
  {
    id: 'pronto_soccorso',
    name: 'Pronto Soccorso',
    description: 'Un intervento medico rapido che cura un alleato di 70 HP e rimuove avvelenamento e sanguinamento.',
    icon: '💊',
    targetType: 'ally',
    cooldown: 2,
    category: 'support',
    effects: [
      { type: 'heal', target: 'ally', amount: 70 },
      { type: 'remove_status', target: 'ally', statuses: ['poison', 'bleeding'] },
    ],
  },
  {
    id: 'cura_gruppo',
    name: 'Cura Gruppo',
    description: 'Distribuisce cure a tutto il gruppo, curando ogni alleato di una quantità moderata di HP.',
    icon: '💚',
    targetType: 'all_allies',
    cooldown: 3,
    category: 'support',
    effects: [{ type: 'heal', target: 'all_allies', amount: 35 }],
  },
  {
    id: 'adrenalina',
    name: 'Adrenalina',
    description: 'Inietta adrenalina a un alleato, ripristinando 40 HP e aumentando i danni inflitti del 25% per 2 turni.',
    icon: '💉',
    targetType: 'ally',
    cooldown: 3,
    category: 'support',
    effects: [
      { type: 'heal', target: 'ally', amount: 40 },
      { type: 'apply_status', target: 'ally', statusType: 'adrenaline', chance: 100 },
    ],
  },
  {
    id: 'iniezione_stimolante',
    name: 'Iniezione Stimolante',
    description: 'Un potente siero che cura un alleato di una grande quantità di HP e rimuove tutti gli effetti negativi.',
    icon: '🧪',
    targetType: 'ally',
    cooldown: 3,
    category: 'support',
    effects: [
      { type: 'heal', target: 'ally', amount: 45 },
      { type: 'remove_status', target: 'ally', statuses: ['poison', 'bleeding', 'stunned'] },
    ],
  },
  {
    id: 'disinfezione_totale',
    name: 'Disinfezione Totale',
    description: 'Distribuisce un antisettico a tutto il gruppo, rimuovendo tutti gli status negativi e curando leggermente ogni alleato.',
    icon: '🧴',
    targetType: 'all_allies',
    cooldown: 3,
    category: 'support',
    effects: [
      { type: 'heal', target: 'all_allies', amount: 20 },
      { type: 'remove_status', target: 'all_allies', statuses: ['poison', 'bleeding', 'stunned'] },
    ],
  },

  // ── CONTROL ──
  {
    id: 'gas_venefico',
    name: 'Gas Venefico',
    description: 'Lancia una granata di gas che avvelena tutti i nemici e infligge danni moderati.',
    icon: '💨',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    effects: [
      { type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.7 },
      { type: 'apply_status', target: 'all_enemies', statusType: 'poison', chance: 65 },
    ],
  },
  {
    id: 'cristalli_sonici',
    name: 'Cristalli Sonici',
    description: 'Attiva un dispositivo sonico che stordisce il bersaglio e infligge danni moderati.',
    icon: '🔔',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 1.1 },
      { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 60 },
    ],
  },
  {
    id: 'frecce_etiche',
    name: 'Frecce Elettriche',
    description: 'Spara una scarica elettrica che paralizza il nemico con alta probabilità e infligge danni moderati.',
    icon: '⚡',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 0.9 },
      { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 55 },
    ],
  },
  {
    id: 'granata_stordente',
    name: 'Granata Stordente',
    description: 'Lancia una granata concussiva che infligge danni moderati a tutti i nemici con alta probabilità di stordirli.',
    icon: '💣',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    effects: [
      { type: 'deal_damage', target: 'all_enemies', powerMultiplier: 0.8 },
      { type: 'apply_status', target: 'all_enemies', statusType: 'stunned', chance: 60 },
    ],
  },
  {
    id: 'siero_inibitore',
    name: 'Siero Inibitore',
    description: 'Inietta un siero neurotossico al nemico, avvelenandolo e stordendolo simultaneamente.',
    icon: '🧬',
    targetType: 'enemy',
    cooldown: 3,
    category: 'control',
    effects: [
      { type: 'deal_damage', target: 'enemy', powerMultiplier: 1.0 },
      { type: 'apply_status', target: 'enemy', statusType: 'poison', chance: 70 },
      { type: 'apply_status', target: 'enemy', statusType: 'stunned', chance: 40 },
    ],
  },
];
