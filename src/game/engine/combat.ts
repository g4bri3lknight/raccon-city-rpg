import {
  Character,
  EnemyInstance,
  CombatLogEntry,
  CombatState,
  ItemInstance,
  Archetype,
  StatusEffect,
  SpecialEffect,
  EffectTarget,
  EffectTrigger,
  SpecialAbilityDefinition,
  ActiveCombatEffect,
  ItemDefinition,
} from '../types';
import { ENEMIES, ARCHETYPE_SPECIAL_MAP, getSpecialById, ITEMS } from '../data/loader';
import { WEAPON_MODS } from '../data/weapon-mods';
import { EQUIPMENT_STATS, ALL_EQUIPMENT_IDS, ALL_MOD_ITEM_IDS } from '../data/equipment';

// ==========================================
// #3+#29 — STAT BONUS HELPERS
// ==========================================

/** Get total DEF for a character including armor + accessories */
export function getCharacterDef(char: Character): number {
  let def = char.baseDef;
  if (char.armor?.defBonus) def += char.armor.defBonus;
  if (char.accessory?.defBonus) def += char.accessory.defBonus;
  return def;
}

/** Get total ATK for a character including weapon + accessories */
export function getCharacterAtk(char: Character): number {
  let atk = char.baseAtk + (char.weapon?.atkBonus || 0);
  if (char.accessory?.atkBonus) atk += char.accessory.atkBonus;
  return atk;
}

/** Get total maxHP for a character including equipment */
export function getCharacterMaxHp(char: Character): number {
  let hp = char.maxHp;
  if (char.armor?.hpBonus) hp += char.armor.hpBonus;
  if (char.accessory?.hpBonus) hp += char.accessory.hpBonus;
  return hp;
}

/** Get total SPD for a character including equipment */
export function getCharacterSpd(char: Character): number {
  let spd = char.baseSpd;
  if (char.accessory?.spdBonus) spd += char.accessory.spdBonus;
  return spd;
}

/** Get extra crit chance from weapon mods + accessories */
export function getCharacterCritBonus(char: Character): number {
  let crit = 0;
  // #3 Weapon mod crit bonuses
  if (char.weapon?.modSlots) {
    for (const modId of char.weapon.modSlots) {
      const mod = WEAPON_MODS[modId];
      if (mod?.critBonus) crit += mod.critBonus;
    }
  }
  // #29 Accessory crit bonus
  if (char.accessory?.critBonus) crit += char.accessory.critBonus;
  return crit;
}

/** Get status effect apply chance bonus from weapon mods */
export function getCharacterStatusBonus(char: Character): number {
  let statusBonus = 0;
  if (char.weapon?.modSlots) {
    for (const modId of char.weapon.modSlots) {
      const mod = WEAPON_MODS[modId];
      if (mod?.statusBonus) statusBonus += mod.statusBonus;
    }
  }
  return statusBonus;
}

/** Check if character has specific resistance from equipment */
export function getCharacterResistance(char: Character, effectType: string): number {
  let resist = 0;
  if (char.armor?.specialEffect?.type === effectType) resist += char.armor.specialEffect.value;
  if (char.accessory?.specialEffect?.type === effectType) resist += char.accessory.specialEffect.value;
  return resist;
}

// ==========================================
// UTILITY
// ==========================================

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

// Control archetype passive: +20% chance to apply status effects
function getStatusChance(baseChance: number, archetype?: Archetype): number {
  if (archetype === 'control') {
    return Math.min(baseChance + 20, 100);
  }
  return baseChance;
}

/** Apply weapon mod status bonus to base chance */
function applyStatusBonus(baseChance: number, character: Character): number {
  const bonus = getCharacterStatusBonus(character);
  return Math.min(baseChance + bonus, 100);
}

// ==========================================
// DAMAGE CALCULATION
// ==========================================

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  isDefending: boolean,
  attackerArchetype?: Archetype,
  attackerHasAdrenaline?: boolean,
  critBonus: number = 0, // #3+#29 extra crit from mods/accessories
): { damage: number; isCritical: boolean; isMiss: boolean } {
  // Miss chance (reduced by dodge bonus from mods — effectively increases hit rate)
  const missChance = 8;
  if (chance(missChance)) {
    return { damage: 0, isCritical: false, isMiss: true };
  }

  // Base damage formula
  let baseDamage = attackerAtk * random(85, 115) / 100;

  // Adrenaline buff: +25% damage
  if (attackerHasAdrenaline) {
    baseDamage *= 1.25;
  }
  
  // Defense reduction
  let defMultiplier = defenderDef / (defenderDef + 50);
  
  // Defending bonus
  if (isDefending) {
    defMultiplier = Math.min(defMultiplier * 1.8, 0.9);
  }

  let damage = Math.max(1, Math.floor(baseDamage * (1 - defMultiplier)));

  // Critical hit (base + archetype + #3 mods + #29 accessories)
  let critChance = 10 + critBonus;
  if (attackerArchetype === 'dps') critChance = 25 + critBonus;
  const isCritical = chance(critChance);
  if (isCritical) {
    damage = Math.floor(damage * 1.8);
  }

  return { damage, isCritical, isMiss: false };
}

export function calculateDamageNoMiss(
  attackerAtk: number,
  defenderDef: number,
  isDefending: boolean,
  attackerArchetype?: Archetype,
  attackerHasAdrenaline?: boolean,
  critBonus: number = 0,
): { damage: number; isCritical: boolean; isMiss: false } {
  // Guaranteed hit (for Sparo Mirato)
  let baseDamage = attackerAtk * random(90, 110) / 100;

  // Adrenaline buff: +25% damage
  if (attackerHasAdrenaline) {
    baseDamage *= 1.25;
  }

  let defMultiplier = defenderDef / (defenderDef + 50);
  
  if (isDefending) {
    defMultiplier = Math.min(defMultiplier * 1.8, 0.9);
  }

  let damage = Math.max(1, Math.floor(baseDamage * (1 - defMultiplier)));

  let critChance = 10 + critBonus;
  if (attackerArchetype === 'dps') critChance = 25 + critBonus;
  const isCritical = chance(critChance);
  if (isCritical) {
    damage = Math.floor(damage * 1.8);
  }

  return { damage, isCritical, isMiss: false };
}

export function calculateHeal(
  baseHeal: number,
  healerArchetype?: Archetype,
): number {
  let heal = baseHeal;
  if (healerArchetype === 'healer') {
    if (chance(20)) heal = Math.floor(heal * 1.5);
  }
  return heal;
}

// ==========================================
// COMBAT ACTIONS
// ==========================================

// Weapon → ammo mapping
export const WEAPON_AMMO: Record<string, string> = {
  pistol: 'ammo_pistol',
  shotgun: 'ammo_shotgun',
  magnum: 'ammo_magnum',
  machinegun: 'ammo_machinegun',
  grenade_launcher: 'ammo_grenade',
};

export interface AppliedBuff {
  targetId: string;
  effect: StatusEffect;
  duration: number;
}

export interface ActionResult {
  log: CombatLogEntry;
  updatedEnemy?: EnemyInstance;
  updatedCharacter?: Character;
  updatedEnemies?: EnemyInstance[];
  updatedParty?: Character[];
  consumedAmmoUid?: string; // uid of ammo item consumed by ranged attack
  isMeleeFallback?: boolean; // true when ranged weapon has no ammo
  tauntTargetId?: string; // set when tank uses Immolation
  appliedBuff?: AppliedBuff; // set when a buff is applied to a character
  activeEffects?: ActiveCombatEffect[]; // new combat effects created (buffs, shields, hoTs, reflect)
}

export function executePlayerAttack(
  character: Character,
  enemy: EnemyInstance,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): ActionResult {
  const weapon = character.weapon;
  const isRanged = weapon?.type === 'ranged';
  let consumedAmmoUid: string | undefined;
  let isMeleeFallback = false;

  // Check ammo for ranged weapons
  let weaponBonus: number;
  let actionLabel = 'Attacco';

  if (isRanged) {
    const requiredAmmoId = WEAPON_AMMO[weapon!.itemId];
    const ammoItem = requiredAmmoId
      ? character.inventory.find(i => i.itemId === requiredAmmoId && (i.quantity || 0) > 0)
      : undefined;

    if (ammoItem) {
      // Has ammo → full ranged attack
      weaponBonus = weapon!.atkBonus;
      consumedAmmoUid = ammoItem.uid;
      actionLabel = `${weapon!.name}`;
    } else {
      // No ammo → melee fallback (butt/pistol whip), no weapon bonus
      isMeleeFallback = true;
      weaponBonus = 0;
      actionLabel = 'Colpo corpo a corpo';
    }
  } else {
    weaponBonus = weapon?.atkBonus || 0;
  }

  const totalAtk = getCharacterAtk(character);
  const critBonus = getCharacterCritBonus(character);
  const hasAdrenaline = character.statusEffects.includes('adrenaline');
  const { damage, isCritical, isMiss } = calculateDamage(
    totalAtk,
    enemy.def,
    enemy.isDefending,
    character.archetype,
    hasAdrenaline,
    critBonus,
  );

  const newHp = Math.max(0, enemy.currentHp - damage);
  let updatedEnemy: EnemyInstance = { ...enemy, currentHp: newHp, isDefending: false };

  let message = '';
  if (isMiss) {
    message = `${character.name} attacca ${enemy.name} ma manca il bersaglio!`;
  } else if (isCritical) {
    message = `${character.name} infligge un COLPO CRITICO a ${enemy.name} per ${damage} danni!`;
  } else {
    message = `${character.name} attacca ${enemy.name} e infligge ${damage} danni.`;
  }

  // Process weapon on_hit effects (only if attack landed)
  let weaponActiveEffects: ActiveCombatEffect[] | undefined;
  if (!isMiss && character.weapon) {
    const weaponDef = ITEMS[character.weapon.itemId];
    if (weaponDef?.effects && weaponDef.effects.length > 0) {
      const weaponResult = executeEffectsForTrigger(
        weaponDef.effects, 'on_hit', character, updatedEnemy, turn, party, enemies, 'weapon', character.weapon.name,
      );
      if (weaponResult.activeEffects && weaponResult.activeEffects.length > 0) {
        weaponActiveEffects = weaponResult.activeEffects;
      }
      if (weaponResult.log?.message) {
        message += ` [${weaponResult.log.message}]`;
      }
      // Merge weapon effect enemy updates for the primary target
      if (weaponResult.updatedEnemies) {
        const weaponUpdatedPrimary = weaponResult.updatedEnemies.find(e => e.id === updatedEnemy.id);
        if (weaponUpdatedPrimary) {
          updatedEnemy = weaponUpdatedPrimary;
        }
      }
    }
  }

  return {
    log: {
      turn,
      actorName: character.name,
      actorType: 'player',
      action: actionLabel,
      targetName: enemy.name,
      targetId: enemy.id,
      damage,
      isCritical,
      isMiss,
      message,
    },
    updatedEnemy,
    consumedAmmoUid,
    isMeleeFallback,
    activeEffects: weaponActiveEffects,
  };
}

// ==========================================
// SPECIAL ABILITIES - GENERIC EXECUTION
// Handles both predefined archetype specials and custom specials
// ==========================================

export function resolveSpecialId(character: Character, slot: 'special1Id' | 'special2Id'): string | undefined {
  // Custom characters store their special IDs directly
  if (character.archetype === 'custom') {
    return slot === 'special1Id' ? character.special1Id : character.special2Id;
  }
  // Predefined archetypes use the mapping
  const map = ARCHETYPE_SPECIAL_MAP[character.archetype];
  if (!map) return undefined;
  return slot === 'special1Id' ? map.special1 : map.special2;
}

export function executePlayerSpecial(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies?: EnemyInstance[],
): ActionResult {
  const specialId = resolveSpecialId(character, 'special1Id');
  const special = specialId ? getSpecialById(specialId) : undefined;

  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: `${character.name} non ha abilità speciale.` },
    };
  }

  return executeSpecialAbility(character, target, turn, party, enemies || [], special);
}

export function executePlayerSpecial2(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): ActionResult {
  const specialId = resolveSpecialId(character, 'special2Id');
  const special = specialId ? getSpecialById(specialId) : undefined;

  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale2', message: `${character.name} non ha abilità speciale secondaria.` },
    };
  }

  return executeSpecialAbility(character, target, turn, party, enemies, special);
}

// ==========================================
// TARGET RESOLUTION
// ==========================================

/** Resolve effect targets into concrete Character or EnemyInstance arrays */
function resolveTargets(
  effect: SpecialEffect,
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
): { enemies: EnemyInstance[]; allies: Character[] } {
  const t = effect.target;
  if (t === 'self') {
    return { enemies: [], allies: [character] };
  }
  if (t === 'enemy') {
    if ('currentHp' in target && 'definitionId' in target) {
      return { enemies: [target as EnemyInstance], allies: [] };
    }
    return { enemies: [], allies: [] };
  }
  if (t === 'all_enemies') {
    return { enemies: enemies.filter(e => e.currentHp > 0), allies: [] };
  }
  if (t === 'ally') {
    if ('statusEffects' in target && !('definitionId' in target)) {
      return { enemies: [], allies: [target as Character] };
    }
    return { enemies: [], allies: [character] };
  }
  if (t === 'all_allies') {
    return { enemies: [], allies: party.filter(p => p.currentHp > 0) };
  }
  if (t === 'lowest_hp_ally') {
    const alive = party.filter(p => p.currentHp > 0 && p.currentHp < p.maxHp);
    if (alive.length === 0) return { enemies: [], allies: [character] };
    alive.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
    return { enemies: [], allies: [alive[0]] };
  }
  if (t === 'random_enemy') {
    const alive = enemies.filter(e => e.currentHp > 0);
    if (alive.length === 0) return { enemies: [], allies: [] };
    return { enemies: [alive[Math.floor(Math.random() * alive.length)]], allies: [] };
  }
  return { enemies: [], allies: [] };
}

// ==========================================
// ATOMIC EFFECT HANDLERS
// ==========================================

function handleDealDamage(
  effect: SpecialEffect & { type: 'deal_damage' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { target: effTarget, powerMultiplier, excludePrimaryTarget, noMiss, guaranteedCrit, ignoreDef } = effect;
  const { enemies: enemyTargets } = resolveTargets(effect, character, target, party, enemies);
  if (enemyTargets.length === 0) return {};

  let updatedEnemies: EnemyInstance[] | undefined;
  let totalDmg = 0;
  let isCritical = false;
  let isMiss = false;
  const splashLog: string[] = [];
  const primaryEnemy = 'definitionId' in target ? target as EnemyInstance : null;

  updatedEnemies = enemies.map(e => {
    const isPrimary = primaryEnemy && e.id === primaryEnemy.id;
    if (excludePrimaryTarget && isPrimary) return e;

    const isTarget = enemyTargets.some(et => et.id === e.id);
    if (!isTarget) return e;

    const totalAtk = getCharacterAtk(character) * powerMultiplier;
    const critBonus = getCharacterCritBonus(character);
    const hasAdrenaline = character.statusEffects.includes('adrenaline');
    const calcResult = noMiss
      ? calculateDamageNoMiss(totalAtk, e.def, e.isDefending, character.archetype, hasAdrenaline, critBonus)
      : calculateDamage(totalAtk, e.def, e.isDefending, character.archetype, hasAdrenaline, critBonus);

    if (calcResult.isMiss) {
      if (isPrimary) isMiss = true;
      return { ...e, isDefending: false };
    }

    totalDmg += calcResult.damage;
    if (isPrimary) {
      isCritical = guaranteedCrit || calcResult.isCritical;
    }

    if (!isPrimary) {
      splashLog.push(`${e.name}: -${calcResult.damage}${calcResult.isCritical ? ' 💥' : ''}`);
    }

    const newHp = Math.max(0, e.currentHp - calcResult.damage);
    return { ...e, currentHp: newHp, isDefending: false };
  });

  let message = `${character.name} usa ${character === target ? '' : ''}`;
  const primaryTarget = primaryEnemy || enemyTargets[0];
  if (primaryTarget && !excludePrimaryTarget) {
    if (isMiss) {
      message = `${character.name} attacca ${primaryTarget.name} ma manca il bersaglio!`;
    } else if (isCritical || guaranteedCrit) {
      message = `${character.name} infligge un COLPO CRITICO a ${primaryTarget.name} per ${totalDmg} danni!`;
    } else {
      message = `${character.name} attacca ${primaryTarget.name} e infligge ${totalDmg} danni.`;
    }
  } else {
    message = `${character.name} infligge ${totalDmg} danni totali!`;
  }
  if (splashLog.length > 0) {
    message += ` Danni collaterali: ${splashLog.join(', ')}.`;
  }

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      targetName: primaryTarget?.name, targetId: primaryTarget?.id,
      damage: totalDmg, isCritical: isCritical || guaranteedCrit, isMiss,
      message,
    },
    updatedEnemies,
  };
}

function handleHeal(
  effect: SpecialEffect & { type: 'heal' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: healTargets } = resolveTargets(effect, character, target, party, enemies);
  if (healTargets.length === 0) return {};

  let updatedParty: Character[] | undefined;
  let totalHeal = 0;

  updatedParty = party.map(p => {
    const isTarget = healTargets.some(ht => ht.id === p.id);
    if (!isTarget) return p;

    const rawHeal = effect.amount || 0;
    // If percent is set, interpret amount as % of max HP
    const healAmount = effect.percent ? Math.floor(p.maxHp * rawHeal / 100) : rawHeal;
    const actualHeal = calculateHeal(healAmount, character.archetype);
    totalHeal += actualHeal;
    const newHp = Math.min(p.maxHp, p.currentHp + actualHeal);
    return { ...p, currentHp: newHp };
  });

  const healTarget = healTargets[0];
  const message = healTargets.length > 1
    ? `${character.name} cura il gruppo di ${totalHeal} HP totali!`
    : `${character.name} cura ${healTarget.name} di ${totalHeal} HP!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      targetName: healTarget.name, targetId: healTarget.id,
      heal: totalHeal, message,
    },
    updatedParty,
  };
}

function handleApplyStatus(
  effect: SpecialEffect & { type: 'apply_status' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
  sourceType?: 'special' | 'weapon' | 'armor' | 'accessory' | 'item',
): Partial<ActionResult> {
  const resolved = resolveTargets(effect, character, target, party, enemies);
  const statusTargets = resolved.enemies.length > 0 ? resolved.enemies : resolved.allies;
  if (statusTargets.length === 0) return {};

  const statusType = effect.statusType as StatusEffect;
  const baseChance = effect.chance;
  let effectiveChance = getStatusChance(baseChance, character.archetype);
  // Weapon effects benefit from weapon mod status bonus
  if (sourceType === 'weapon') {
    effectiveChance = applyStatusBonus(effectiveChance, character);
  }

  let updatedEnemies: EnemyInstance[] | undefined;
  let updatedParty: Character[] | undefined;
  const appliedNames: string[] = [];

  if (resolved.enemies.length > 0) {
    updatedEnemies = enemies.map(e => {
      const isTarget = resolved.enemies.some(et => et.id === e.id);
      if (!isTarget) return e;
      const updated = { ...e };
      if (chance(effectiveChance) && !updated.statusEffects.includes(statusType)) {
        updated.statusEffects = [...updated.statusEffects, statusType];
        appliedNames.push(e.name);
      }
      return updated;
    });
  } else if (resolved.allies.length > 0) {
    updatedParty = party.map(p => {
      const isTarget = resolved.allies.some(at => at.id === p.id);
      if (!isTarget) return p;
      const updated = { ...p };
      if (chance(effectiveChance) && !updated.statusEffects.includes(statusType)) {
        updated.statusEffects = [...updated.statusEffects, statusType];
        appliedNames.push(p.name);
      }
      return updated;
    });
  }

  if (appliedNames.length === 0) return {};

  const statusLabel = statusType === 'poison' ? 'avvelenato' : statusType === 'stunned' ? 'stordito' : statusType === 'bleeding' ? 'sanguinante' : 'adrenalina';
  const message = appliedNames.length > 1
    ? `${appliedNames.join(', ')} sono ${statusLabel}!`
    : `${appliedNames[0]} è ${statusLabel}!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message, statusEffect: statusType,
    },
    updatedEnemies,
    updatedParty,
  };
}

function handleRemoveStatus(
  effect: SpecialEffect & { type: 'remove_status' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: statusTargets } = resolveTargets(effect, character, target, party, enemies);
  if (statusTargets.length === 0) return {};

  const statusesToRemove = new Set(effect.statuses || []);
  let updatedParty: Character[] | undefined;
  const curedEntries: string[] = [];

  updatedParty = party.map(p => {
    const isTarget = statusTargets.some(ht => ht.id === p.id);
    if (!isTarget) return p;
    const cured: string[] = [];
    const cleaned = p.statusEffects.filter(s => {
      if (statusesToRemove.has(s)) {
        cured.push(s);
        return false;
      }
      return true;
    });
    if (cured.length > 0) {
      curedEntries.push(p.name);
    }
    return { ...p, statusEffects: cleaned };
  });

  if (curedEntries.length === 0) return {};

  const message = `Status negativi rimossi da ${curedEntries.join(', ')}!`;
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    updatedParty,
  };
}

function handleBuffStat(
  effect: SpecialEffect & { type: 'buff_stat' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: buffTargets } = resolveTargets(effect, character, target, party, enemies);
  if (buffTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = buffTargets.map(bt => ({
    id: `buff_${character.id}_${effect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'buff_stat' as const,
    targetId: bt.id,
    sourceId: character.id,
    stat: effect.stat,
    amount: effect.amount,
    remainingTurns: effect.duration,
  }));

  const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : 'VELOCITÀ';
  const message = buffTargets.length > 1
    ? `${character.name} potenzia il gruppo: +${effect.amount}% ${statLabel} per ${effect.duration} turni!`
    : `${character.name} potenzia ${buffTargets[0].name}: +${effect.amount}% ${statLabel} per ${effect.duration} turni!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    activeEffects: newEffects,
  };
}

function handleDebuffStat(
  effect: SpecialEffect & { type: 'debuff_stat' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { enemies: debuffTargets } = resolveTargets(effect, character, target, party, enemies);
  if (debuffTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = debuffTargets.map(dt => ({
    id: `debuff_${character.id}_${effect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'debuff_stat' as const,
    targetId: dt.id,
    sourceId: character.id,
    stat: effect.stat,
    amount: -effect.amount,
    remainingTurns: effect.duration,
  }));

  const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : 'VELOCITÀ';
  const message = `${character.name} riduce il ${statLabel} dei nemici di ${effect.amount}% per ${effect.duration} turni!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    activeEffects: newEffects,
  };
}

function handleShield(
  effect: SpecialEffect & { type: 'shield' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: shieldTargets } = resolveTargets(effect, character, target, party, enemies);
  if (shieldTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = shieldTargets.map(st => ({
    id: `shield_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'shield' as const,
    targetId: st.id,
    sourceId: character.id,
    amount: effect.amount,
    remainingTurns: effect.duration,
  }));

  const message = shieldTargets.length > 1
    ? `${character.name} crea uno scudo di ${effect.amount} su tutto il gruppo per ${effect.duration} turni!`
    : `${character.name} crea uno scudo di ${effect.amount} su ${shieldTargets[0].name} per ${effect.duration} turni!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    activeEffects: newEffects,
  };
}

function handleTaunt(
  effect: SpecialEffect & { type: 'taunt' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const message = `${character.name} provoca i nemici! Tutti gli attacchi saranno diretti su di lui per ${effect.duration} turni!`;
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    tauntTargetId: character.id,
  };
}

function handleLifesteal(
  effect: SpecialEffect & { type: 'lifesteal' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { enemies: lifestealTargets } = resolveTargets(effect, character, target, party, enemies);
  if (lifestealTargets.length === 0) return {};

  let updatedEnemies: EnemyInstance[] | undefined;
  let updatedCharacter: Character | undefined;
  let totalDmg = 0;
  let isCritical = false;

  updatedEnemies = enemies.map(e => {
    const isTarget = lifestealTargets.some(et => et.id === e.id);
    if (!isTarget) return e;

    const totalAtk = getCharacterAtk(character) * effect.power;
    const critBonus = getCharacterCritBonus(character);
    const hasAdrenaline = character.statusEffects.includes('adrenaline');
    const calcResult = calculateDamage(totalAtk, e.def, e.isDefending, character.archetype, hasAdrenaline, critBonus);

    if (calcResult.isMiss) return { ...e, isDefending: false };

    totalDmg += calcResult.damage;
    if (calcResult.isCritical) isCritical = true;

    return { ...e, currentHp: Math.max(0, e.currentHp - calcResult.damage), isDefending: false };
  });

  const healAmount = Math.floor(totalDmg * effect.percent / 100);
  if (healAmount > 0) {
    updatedCharacter = { ...character, currentHp: Math.min(character.maxHp, character.currentHp + healAmount) };
  }

  const lsTarget = lifestealTargets[0];
  const message = `${character.name} attacca ${lsTarget.name} per ${totalDmg} danni e cura ${healAmount} HP!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      targetName: lsTarget.name, targetId: lsTarget.id,
      damage: totalDmg, isCritical, heal: healAmount, message,
    },
    updatedEnemies,
    updatedCharacter,
  };
}

function handleRevive(
  effect: SpecialEffect & { type: 'revive' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: reviveTargets } = resolveTargets(effect, character, target, party, enemies);
  const deadAllies = reviveTargets.filter(a => a.currentHp <= 0);
  if (deadAllies.length === 0) return {};

  let updatedParty: Character[] | undefined;
  const revivedNames: string[] = [];

  updatedParty = party.map(p => {
    const isTarget = deadAllies.some(da => da.id === p.id);
    if (!isTarget) return p;
    revivedNames.push(p.name);
    const reviveHp = Math.max(1, Math.floor(p.maxHp * effect.hpPercent / 100));
    return { ...p, currentHp: reviveHp, statusEffects: [] };
  });

  const message = `${character.name} rianima ${revivedNames.join(', ')} con ${effect.hpPercent}% HP!`;
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    updatedParty,
  };
}

function handleHot(
  effect: SpecialEffect & { type: 'hot' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: hotTargets } = resolveTargets(effect, character, target, party, enemies);
  if (hotTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = hotTargets.map(ht => ({
    id: `hot_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'hot' as const,
    targetId: ht.id,
    sourceId: character.id,
    amount: effect.amountPerTurn,
    remainingTurns: effect.duration,
  }));

  const message = hotTargets.length > 1
    ? `${character.name} applica cura nel tempo a tutto il gruppo: +${effect.amountPerTurn} HP/turno per ${effect.duration} turni!`
    : `${character.name} applica cura nel tempo a ${hotTargets[0].name}: +${effect.amountPerTurn} HP/turno per ${effect.duration} turni!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    activeEffects: newEffects,
  };
}

function handleReflect(
  effect: SpecialEffect & { type: 'reflect' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: reflectTargets } = resolveTargets(effect, character, target, party, enemies);
  if (reflectTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = reflectTargets.map(rt => ({
    id: `reflect_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'reflect' as const,
    targetId: rt.id,
    sourceId: character.id,
    amount: effect.percent,
    remainingTurns: effect.duration,
  }));

  const message = `${character.name} attiva riflessione: ${effect.percent}% danno riflesso per ${effect.duration} turni!`;
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    activeEffects: newEffects,
  };
}

// ==========================================
// UNIFIED EFFECT TRIGGER SYSTEM
// Reusable executor for item/equipment/passive effects
// ==========================================

/**
 * Execute effects filtered by trigger from any source (weapon, armor, accessory, item).
 * This is the core of the unified effect system — all items share the same handler dispatch.
 */
export function executeEffectsForTrigger(
  effects: SpecialEffect[],
  trigger: EffectTrigger,
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  sourceType: 'special' | 'weapon' | 'armor' | 'accessory' | 'item',
  sourceName?: string,
): ActionResult {
  // Filter by trigger (effects without a trigger default to matching for backwards compat)
  const filtered = effects.filter(e => !e.trigger || e.trigger === trigger);
  if (filtered.length === 0) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: sourceName || 'Effetto', message: '' },
    };
  }

  // Mutable state that accumulates across effects
  let currentParty = [...party];
  let currentEnemies = [...enemies];
  let currentCharacter = { ...character };
  const allActiveEffects: ActiveCombatEffect[] = [];
  let tauntTargetId: string | undefined;
  const allLogParts: string[] = [];
  let totalDamage = 0;
  let totalHeal = 0;
  let anyCritical = false;
  let anyMiss = false;
  let primaryTargetName = '';
  let primaryTargetId = '';
  let primaryStatusEffect: string | undefined;
  const actionLabel = sourceName || 'Effetto';

  for (const effect of filtered) {
    // Check activation chance (if specified)
    if (effect.chance !== undefined && effect.chance < 100) {
      if (!chance(effect.chance)) continue;
    }

    let partial: Partial<ActionResult> = {};

    switch (effect.type) {
      case 'deal_damage':
        partial = handleDealDamage(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.log) {
          if (partial.log.damage) totalDamage += partial.log.damage;
          if (partial.log.isCritical) anyCritical = true;
          if (partial.log.isMiss) anyMiss = true;
          if (partial.log.targetName) { primaryTargetName = partial.log.targetName; primaryTargetId = partial.log.targetId || ''; }
        }
        break;

      case 'heal':
        partial = handleHeal(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        if (partial.log?.heal) totalHeal += partial.log.heal;
        break;

      case 'apply_status':
        partial = handleApplyStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn, sourceType);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedParty) currentParty = partial.updatedParty;
        if (partial.log?.statusEffect) primaryStatusEffect = partial.log.statusEffect;
        break;

      case 'remove_status':
        partial = handleRemoveStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        break;

      case 'buff_stat':
        partial = handleBuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) { ae.sourceType = sourceType; }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'debuff_stat':
        partial = handleDebuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) { ae.sourceType = sourceType; }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'shield':
        partial = handleShield(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) { ae.sourceType = sourceType; }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'taunt':
        partial = handleTaunt(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.tauntTargetId) tauntTargetId = partial.tauntTargetId;
        break;

      case 'lifesteal':
        partial = handleLifesteal(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedCharacter) currentCharacter = partial.updatedCharacter;
        if (partial.log?.damage) totalDamage += partial.log.damage;
        if (partial.log?.heal) totalHeal += partial.log.heal;
        break;

      case 'revive':
        partial = handleRevive(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        break;

      case 'hot':
        partial = handleHot(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) { ae.sourceType = sourceType; }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'reflect':
        partial = handleReflect(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) { ae.sourceType = sourceType; }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;
    }

    if (partial.log && partial.log.message) {
      allLogParts.push(partial.log.message);
    }
  }

  // If no effect produced output (all skipped by chance), return empty
  if (allLogParts.length === 0) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: actionLabel, message: '' },
    };
  }

  // Build combined log message
  let finalMessage = allLogParts.length === 1
    ? allLogParts[0]
    : allLogParts.join(' ');

  // Detect which results changed
  const characterChanged = !party.some(p => p.id === currentCharacter.id && p.currentHp === currentCharacter.currentHp && JSON.stringify(p.statusEffects) === JSON.stringify(currentCharacter.statusEffects));
  const partyChanged = party.some((p, i) => {
    const cp = currentParty[i];
    return cp && (p.currentHp !== cp.currentHp || JSON.stringify(p.statusEffects) !== JSON.stringify(cp.statusEffects));
  }) || currentParty.length !== party.length;
  const enemiesChanged = enemies.some((e, i) => {
    const ce = currentEnemies[i];
    return ce && (e.currentHp !== ce.currentHp || JSON.stringify(e.statusEffects) !== JSON.stringify(ce.statusEffects));
  }) || currentEnemies.length !== enemies.length;

  const result: ActionResult = {
    log: {
      turn,
      actorName: character.name,
      actorType: 'player',
      action: actionLabel,
      targetName: primaryTargetName || undefined,
      targetId: primaryTargetId || undefined,
      damage: totalDamage || undefined,
      heal: totalHeal || undefined,
      isCritical: anyCritical || undefined,
      isMiss: anyMiss || undefined,
      statusEffect: primaryStatusEffect,
      message: finalMessage,
    },
  };

  if (characterChanged) result.updatedCharacter = currentCharacter;
  if (partyChanged) result.updatedParty = currentParty;
  if (enemiesChanged) result.updatedEnemies = currentEnemies;
  if (tauntTargetId) result.tauntTargetId = tauntTargetId;
  if (allActiveEffects.length > 0) result.activeEffects = allActiveEffects;

  return result;
}

// ==========================================
// GENERIC SPECIAL ABILITY EXECUTION
// Handles abilities via atomic effects array
// ==========================================

function executeSpecialAbility(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  special: SpecialAbilityDefinition,
): ActionResult {
  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: `${character.name} non ha abilità speciale.` },
    };
  }

  // Data-driven atomic effects system
  return executeEffectsDriven(character, target, turn, party, enemies, special);
}

function executeEffectsDriven(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  special: SpecialAbilityDefinition,
): ActionResult {
  // Mutable state that accumulates across effects
  let currentParty = [...party];
  let currentEnemies = [...enemies];
  let currentCharacter = { ...character };
  const allActiveEffects: ActiveCombatEffect[] = [];
  let tauntTargetId: string | undefined;
  const allLogParts: string[] = [];
  let totalDamage = 0;
  let totalHeal = 0;
  let anyCritical = false;
  let anyMiss = false;
  let primaryTargetName = '';
  let primaryTargetId = '';
  let primaryStatusEffect: string | undefined;

  for (const effect of special.effects) {
    let partial: Partial<ActionResult> = {};

    switch (effect.type) {
      case 'deal_damage':
        partial = handleDealDamage(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.log) {
          if (partial.log.damage) totalDamage += partial.log.damage;
          if (partial.log.isCritical) anyCritical = true;
          if (partial.log.isMiss) anyMiss = true;
          if (partial.log.targetName) { primaryTargetName = partial.log.targetName; primaryTargetId = partial.log.targetId || ''; }
        }
        break;

      case 'heal':
        partial = handleHeal(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        if (partial.log?.heal) totalHeal += partial.log.heal;
        break;

      case 'apply_status':
        partial = handleApplyStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedParty) currentParty = partial.updatedParty;
        if (partial.log?.statusEffect) primaryStatusEffect = partial.log.statusEffect;
        break;

      case 'remove_status':
        partial = handleRemoveStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        break;

      case 'buff_stat':
        partial = handleBuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) allActiveEffects.push(...partial.activeEffects);
        break;

      case 'debuff_stat':
        partial = handleDebuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) allActiveEffects.push(...partial.activeEffects);
        break;

      case 'shield':
        partial = handleShield(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) allActiveEffects.push(...partial.activeEffects);
        break;

      case 'taunt':
        partial = handleTaunt(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.tauntTargetId) tauntTargetId = partial.tauntTargetId;
        break;

      case 'lifesteal':
        partial = handleLifesteal(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedCharacter) currentCharacter = partial.updatedCharacter;
        if (partial.log?.damage) totalDamage += partial.log.damage;
        if (partial.log?.heal) totalHeal += partial.log.heal;
        break;

      case 'revive':
        partial = handleRevive(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        break;

      case 'hot':
        partial = handleHot(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) allActiveEffects.push(...partial.activeEffects);
        break;

      case 'reflect':
        partial = handleReflect(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) allActiveEffects.push(...partial.activeEffects);
        break;
    }

    if (partial.log && partial.log.message) {
      allLogParts.push(partial.log.message);
    }
  }

  // Build a combined log message
  let finalMessage = allLogParts.join(' ');
  // If only one effect produced damage, use its specific message
  if (special.effects.length === 1 && allLogParts.length === 1) {
    finalMessage = allLogParts[0];
  }

  // Detect which results changed
  const characterChanged = !party.some(p => p.id === currentCharacter.id && p.currentHp === currentCharacter.currentHp && JSON.stringify(p.statusEffects) === JSON.stringify(currentCharacter.statusEffects));
  const partyChanged = party.some((p, i) => {
    const cp = currentParty[i];
    return cp && (p.currentHp !== cp.currentHp || JSON.stringify(p.statusEffects) !== JSON.stringify(cp.statusEffects));
  }) || currentParty.length !== party.length;
  const enemiesChanged = enemies.some((e, i) => {
    const ce = currentEnemies[i];
    return ce && (e.currentHp !== ce.currentHp || JSON.stringify(e.statusEffects) !== JSON.stringify(ce.statusEffects));
  }) || currentEnemies.length !== enemies.length;

  const result: ActionResult = {
    log: {
      turn,
      actorName: character.name,
      actorType: 'player',
      action: special.name,
      targetName: primaryTargetName || undefined,
      targetId: primaryTargetId || undefined,
      damage: totalDamage || undefined,
      heal: totalHeal || undefined,
      isCritical: anyCritical || undefined,
      isMiss: anyMiss || undefined,
      statusEffect: primaryStatusEffect,
      message: finalMessage,
    },
  };

  if (characterChanged) result.updatedCharacter = currentCharacter;
  if (partyChanged) result.updatedParty = currentParty;
  if (enemiesChanged) result.updatedEnemies = currentEnemies;
  if (tauntTargetId) result.tauntTargetId = tauntTargetId;
  if (allActiveEffects.length > 0) result.activeEffects = allActiveEffects;

  return result;
}

// ==========================================
// DEFEND
// ==========================================

export function executePlayerDefend(character: Character, turn: number): ActionResult {
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Difesa',
      message: `${character.name} assume una posizione difensiva. I danni saranno ridotti.`,
    },
    updatedCharacter: { ...character, isDefending: true },
  };
}

export function executeUseItem(
  character: Character,
  item: ItemInstance,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): { log: CombatLogEntry; updatedCharacter?: Character; updatedParty?: Character[]; updatedEnemies?: EnemyInstance[]; consumeItem: boolean; curedStatuses?: StatusEffect[]; activeEffects?: ActiveCombatEffect[]; appliedBuff?: { targetId: string; effect: StatusEffect; duration: number }; tauntTargetId?: string } {
  // --- Unified atomic effects system ONLY ---
  if (item.effects && item.effects.length > 0) {
    // Determine which statuses will be cured (for combatStatusDurations cleanup)
    const removedStatusEffects = item.effects
      .filter(e => (e.trigger === 'on_use' || e.trigger === undefined) && e.type === 'remove_status')
      .flatMap(e => (e as { statuses?: StatusEffect[] }).statuses || []) as StatusEffect[];

    const result = executeEffectsForTrigger(
      item.effects, 'on_use', character, target, turn, party, enemies, 'item', item.name,
    );
    return {
      log: result.log,
      updatedCharacter: result.updatedCharacter,
      updatedParty: result.updatedParty,
      updatedEnemies: result.updatedEnemies,
      consumeItem: true,
      activeEffects: result.activeEffects,
      appliedBuff: result.appliedBuff,
      tauntTargetId: result.tauntTargetId,
      curedStatuses: removedStatusEffects.length > 0 ? removedStatusEffects : undefined,
    };
  }

  // No effects defined
  return {
    log: { turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto', message: `${character.name} usa ${item.name} ma non ha effetto.` },
    consumeItem: true,
  };
}

export function executeEnemyAttack(
  enemy: EnemyInstance,
  party: Character[],
  turn: number,
  forcedTargetId?: string | null,
  enemies?: EnemyInstance[],
): { log: CombatLogEntry; updatedParty: Character[]; updatedEnemies?: EnemyInstance[]; appliedStatus?: { targetId: string; effect: StatusEffect; duration: number }; activeEffects?: ActiveCombatEffect[] } {
  // Pick random ability
  const ability = enemy.abilities.find(() => chance(100)) || enemy.abilities[0];
  
  // Pick random alive target (or forced target from taunt)
  const aliveTargets = party.filter(p => p.currentHp > 0);
  let target: Character;
  if (forcedTargetId) {
    const tauntTarget = aliveTargets.find(p => p.id === forcedTargetId);
    target = tauntTarget || aliveTargets[random(0, aliveTargets.length - 1)];
  } else {
    target = aliveTargets[random(0, aliveTargets.length - 1)];
  }
  if (!target) {
    return {
      log: { turn, actorName: enemy.name, actorType: 'enemy', action: 'Idle', message: `${enemy.name} guarda nella direzione dei giocatori.` },
      updatedParty: party,
    };
  }

  // ── Atomic effects path ──
  return executeEnemyAbilityEffects(enemy, ability.effects || [], ability.name, target, turn, party, enemies || []);
}

/**
 * Execute atomic effects for an enemy ability.
 * Handles deal_damage, apply_status, buff_stat, debuff_stat, heal, shield, hot, reflect, taunt, lifesteal
 * from the enemy's perspective (targeting party members).
 *
 * Target semantics from the enemy's point of view:
 *   'enemy' / 'all_enemies' → party members (the "enemies" of the enemy)
 *   'self' → the enemy itself
 *   'ally' / 'all_allies' → other enemies
 */
function executeEnemyAbilityEffects(
  enemy: EnemyInstance,
  effects: SpecialEffect[],
  abilityName: string,
  primaryTarget: Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): { log: CombatLogEntry; updatedParty: Character[]; updatedEnemies?: EnemyInstance[]; appliedStatus?: { targetId: string; effect: StatusEffect; duration: number }; activeEffects?: ActiveCombatEffect[] } {
  // Filter by trigger
  const filtered = effects.filter(e => !e.trigger || e.trigger === 'on_use');
  if (filtered.length === 0) {
    return {
      log: { turn, actorName: enemy.name, actorType: 'enemy', action: abilityName, message: '' },
      updatedParty: party,
    };
  }

  let currentParty = [...party];
  let currentEnemies = enemies ? [...enemies] : [];
  let currentEnemy = { ...enemy };
  const allActiveEffects: ActiveCombatEffect[] = [];
  const allLogParts: string[] = [];
  let totalDamage = 0;
  let totalHeal = 0;
  let anyCritical = false;
  let anyMiss = false;
  let primaryTargetName = '';
  let primaryTargetId = '';
  let primaryStatusEffect: string | undefined;
  let appliedStatus: { targetId: string; effect: StatusEffect; duration: number } | undefined;

  /**
   * Resolve effect targets for enemy abilities.
   * Inverted perspective: the enemy's "enemies" are the party members.
   */
  function resolveEnemyTargets(effect: SpecialEffect): { partyTargets: Character[]; enemyTargets: EnemyInstance[]; isSelf: boolean } {
    const t = effect.target;
    if (t === 'self') {
      return { partyTargets: [], enemyTargets: [currentEnemy], isSelf: true };
    }
    if (t === 'enemy') {
      // Single party member — use primaryTarget
      return { partyTargets: [primaryTarget], enemyTargets: [], isSelf: false };
    }
    if (t === 'random_enemy') {
      // Random alive party member
      const alive = currentParty.filter(p => p.currentHp > 0);
      if (alive.length === 0) return { partyTargets: [], enemyTargets: [], isSelf: false };
      return { partyTargets: [alive[Math.floor(Math.random() * alive.length)]], enemyTargets: [], isSelf: false };
    }
    if (t === 'all_enemies') {
      // All alive party members
      return { partyTargets: currentParty.filter(p => p.currentHp > 0), enemyTargets: [], isSelf: false };
    }
    if (t === 'ally') {
      // Single other enemy
      const otherEnemies = currentEnemies.filter(e => e.id !== enemy.id && e.currentHp > 0);
      if (otherEnemies.length > 0) return { partyTargets: [], enemyTargets: [otherEnemies[0]], isSelf: false };
      return { partyTargets: [], enemyTargets: [], isSelf: false };
    }
    if (t === 'all_allies') {
      // All alive enemies (including self)
      return { partyTargets: [], enemyTargets: currentEnemies.filter(e => e.currentHp > 0), isSelf: false };
    }
    if (t === 'lowest_hp_ally') {
      // Lowest HP enemy
      const otherEnemies = currentEnemies.filter(e => e.id !== enemy.id && e.currentHp > 0 && e.currentHp < e.maxHp);
      if (otherEnemies.length === 0) return { partyTargets: [], enemyTargets: [], isSelf: false };
      otherEnemies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
      return { partyTargets: [], enemyTargets: [otherEnemies[0]], isSelf: false };
    }
    return { partyTargets: [], enemyTargets: [], isSelf: false };
  }

  for (const effect of filtered) {
    // Check activation chance
    if (effect.chance !== undefined && effect.chance < 100) {
      if (!chance(effect.chance)) continue;
    }

    const { partyTargets, enemyTargets, isSelf } = resolveEnemyTargets(effect);

    switch (effect.type) {
      case 'deal_damage': {
        const dmgEffect = effect as SpecialEffect & { type: 'deal_damage' };
        const targets = isSelf ? enemyTargets : partyTargets;
        if (targets.length === 0) break;

        const allTargets = isSelf ? targets as EnemyInstance[] : targets as Character[];
        let dmg = 0;
        let crit = false;
        let miss = false;

        if (isSelf) {
          // Self-damage on enemy (unusual but supported)
          currentEnemies = currentEnemies.map(e => {
            if (!enemyTargets.some(et => et.id === e.id)) return e;
            const baseDmg = enemy.atk * dmgEffect.powerMultiplier;
            const { damage: d, isCritical: c, isMiss: m } = calculateDamage(baseDmg, e.def, e.isDefending);
            if (m) { miss = true; return { ...e, isDefending: false }; }
            dmg += d;
            if (c) crit = true;
            return { ...e, currentHp: Math.max(0, e.currentHp - d), isDefending: false };
          });
        } else {
          // Damage to party members
          currentParty = currentParty.map(p => {
            if (!partyTargets.some(pt => pt.id === p.id)) return p;
            const baseDmg = enemy.atk * dmgEffect.powerMultiplier;
            const defenderDef = getCharacterDef(p) + (p.isDefending ? 5 : 0);
            const noMiss = dmgEffect.noMiss;
            const calcResult = noMiss
              ? calculateDamageNoMiss(baseDmg, defenderDef, p.isDefending)
              : calculateDamage(baseDmg, defenderDef, p.isDefending);
            if (calcResult.isMiss) { miss = true; return { ...p, isDefending: false }; }
            dmg += calcResult.damage;
            if (calcResult.isCritical || dmgEffect.guaranteedCrit) crit = true;
            return { ...p, currentHp: Math.max(0, p.currentHp - calcResult.damage), isDefending: false };
          });
        }

        totalDamage += dmg;
        anyCritical = anyCritical || crit;
        anyMiss = anyMiss || miss;
        primaryTargetName = primaryTarget.name;
        primaryTargetId = primaryTarget.id;

        if (miss) {
          allLogParts.push(`${enemy.name} usa ${abilityName} ma ${primaryTarget.name} schiva l'attacco!`);
        } else if (crit) {
          allLogParts.push(`${enemy.name} usa ${abilityName} su ${primaryTarget.name} per ${dmg} danni! COLPO CRITICO!`);
        } else {
          allLogParts.push(`${enemy.name} usa ${abilityName} su ${primaryTarget.name} per ${dmg} danni!`);
        }
        break;
      }

      case 'apply_status': {
        const statusEffect = effect as SpecialEffect & { type: 'apply_status' };
        const targets = isSelf ? enemyTargets : partyTargets;
        if (targets.length === 0) break;

        const statusType = statusEffect.statusType as StatusEffect;
        const applyChance = statusEffect.chance;

        if (isSelf) {
          // Apply status to enemy
          currentEnemies = currentEnemies.map(e => {
            if (!enemyTargets.some(et => et.id === e.id)) return e;
            if (chance(applyChance) && !e.statusEffects.includes(statusType)) {
              return { ...e, statusEffects: [...e.statusEffects, statusType] };
            }
            return e;
          });
        } else {
          // Apply status to party members
          currentParty = currentParty.map(p => {
            if (!partyTargets.some(pt => pt.id === p.id)) return p;
            if (chance(applyChance) && !p.statusEffects.includes(statusType)) {
              const duration = statusEffect.duration || 3;
              appliedStatus = { targetId: p.id, effect: statusType, duration };
              return { ...p, statusEffects: [...p.statusEffects, statusType] };
            }
            return p;
          });
        }

        primaryStatusEffect = statusType;
        const statusNames: Record<string, string> = { poison: 'Avvelenato', bleeding: 'Sanguinamento', stunned: 'Stordito', adrenaline: 'Adrenalina' };
        const statusLabel = statusNames[statusType] || statusType;
        allLogParts.push(`${primaryTarget.name} è ${statusLabel}!`);
        break;
      }

      case 'heal': {
        const healEffect = effect as SpecialEffect & { type: 'heal' };
        // Heal targets enemies (self or allies)
        const healTargets = enemyTargets;
        if (healTargets.length === 0) break;

        currentEnemies = currentEnemies.map(e => {
          if (!healTargets.some(ht => ht.id === e.id)) return e;
          const rawHeal = healEffect.amount || 0;
          const healAmount = healEffect.percent ? Math.floor(e.maxHp * rawHeal / 100) : rawHeal;
          totalHeal += healAmount;
          return { ...e, currentHp: Math.min(e.maxHp, e.currentHp + healAmount) };
        });
        allLogParts.push(`${enemy.name} si cura di ${totalHeal} HP!`);
        break;
      }

      case 'buff_stat': {
        const buffEffect = effect as SpecialEffect & { type: 'buff_stat' };
        const buffTargets = isSelf ? [currentEnemy] : enemyTargets;
        if (buffTargets.length === 0) break;

        const newEffects: ActiveCombatEffect[] = buffTargets.map(bt => ({
          id: `buff_${enemy.id}_${buffEffect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'buff_stat' as const,
          targetId: bt.id,
          sourceId: enemy.id,
          sourceType: 'item' as const,
          stat: buffEffect.stat,
          amount: buffEffect.amount,
          remainingTurns: buffEffect.duration,
        }));
        allActiveEffects.push(...newEffects);
        allLogParts.push(`${enemy.name} potenzia se stesso: +${buffEffect.amount}% ${buffEffect.stat} per ${buffEffect.duration} turni!`);
        break;
      }

      case 'debuff_stat': {
        const debuffEffect = effect as SpecialEffect & { type: 'debuff_stat' };
        // Debuff party members
        const debuffTargets = partyTargets;
        if (debuffTargets.length === 0) break;

        const newEffects: ActiveCombatEffect[] = debuffTargets.map(dt => ({
          id: `debuff_${enemy.id}_${debuffEffect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'debuff_stat' as const,
          targetId: dt.id,
          sourceId: enemy.id,
          sourceType: 'item' as const,
          stat: debuffEffect.stat,
          amount: -debuffEffect.amount,
          remainingTurns: debuffEffect.duration,
        }));
        allActiveEffects.push(...newEffects);
        allLogParts.push(`${enemy.name} riduce le statistiche dei giocatori di ${debuffEffect.amount}% per ${debuffEffect.duration} turni!`);
        break;
      }

      case 'shield': {
        const shieldEffect = effect as SpecialEffect & { type: 'shield' };
        const shieldTargets = isSelf ? [currentEnemy] : enemyTargets;
        if (shieldTargets.length === 0) break;

        const newEffects: ActiveCombatEffect[] = shieldTargets.map(st => ({
          id: `shield_${enemy.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'shield' as const,
          targetId: st.id,
          sourceId: enemy.id,
          sourceType: 'item' as const,
          amount: shieldEffect.amount,
          shieldHp: shieldEffect.amount,
          remainingTurns: shieldEffect.duration,
        }));
        allActiveEffects.push(...newEffects);
        allLogParts.push(`${enemy.name} crea uno scudo di ${shieldEffect.amount} per ${shieldEffect.duration} turni!`);
        break;
      }

      case 'hot': {
        const hotEffect = effect as SpecialEffect & { type: 'hot' };
        const hotTargets = isSelf ? [currentEnemy] : enemyTargets;
        if (hotTargets.length === 0) break;

        const newEffects: ActiveCombatEffect[] = hotTargets.map(ht => ({
          id: `hot_${enemy.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'hot' as const,
          targetId: ht.id,
          sourceId: enemy.id,
          sourceType: 'item' as const,
          amount: hotEffect.amountPerTurn,
          remainingTurns: hotEffect.duration,
        }));
        allActiveEffects.push(...newEffects);
        allLogParts.push(`${enemy.name} rigenera ${hotEffect.amountPerTurn} HP/turno per ${hotEffect.duration} turni!`);
        break;
      }

      case 'taunt': {
        const tauntEffect = effect as SpecialEffect & { type: 'taunt' };
        // Taunt from enemy perspective: enemies force player targeting (not typical, but supported)
        allLogParts.push(`${enemy.name} provoca i giocatori!`);
        break;
      }

      case 'lifesteal': {
        const lsEffect = effect as SpecialEffect & { type: 'lifesteal' };
        const lsTargets = partyTargets;
        if (lsTargets.length === 0) break;

        let lsDmg = 0;
        currentParty = currentParty.map(p => {
          if (!partyTargets.some(pt => pt.id === p.id)) return p;
          const baseDmg = enemy.atk * (lsEffect.power || 1.0);
          const defenderDef = getCharacterDef(p) + (p.isDefending ? 5 : 0);
          const calcResult = calculateDamage(baseDmg, defenderDef, p.isDefending);
          if (calcResult.isMiss) { anyMiss = true; return { ...p, isDefending: false }; }
          lsDmg += calcResult.damage;
          if (calcResult.isCritical) anyCritical = true;
          return { ...p, currentHp: Math.max(0, p.currentHp - calcResult.damage), isDefending: false };
        });

        const healAmount = Math.floor(lsDmg * lsEffect.percent / 100);
        if (healAmount > 0) {
          currentEnemy = { ...currentEnemy, currentHp: Math.min(currentEnemy.maxHp, currentEnemy.currentHp + healAmount) };
          currentEnemies = currentEnemies.map(e => e.id === currentEnemy.id ? currentEnemy : e);
        }
        totalDamage += lsDmg;
        totalHeal += healAmount;
        allLogParts.push(`${enemy.name} usa ${abilityName} su ${primaryTarget.name} per ${lsDmg} danni e cura ${healAmount} HP!`);
        break;
      }

      case 'reflect': {
        const refEffect = effect as SpecialEffect & { type: 'reflect' };
        const refTargets = isSelf ? [currentEnemy] : enemyTargets;
        if (refTargets.length === 0) break;

        const newEffects: ActiveCombatEffect[] = refTargets.map(rt => ({
          id: `reflect_${enemy.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'reflect' as const,
          targetId: rt.id,
          sourceId: enemy.id,
          sourceType: 'item' as const,
          amount: refEffect.percent,
          remainingTurns: refEffect.duration,
        }));
        allActiveEffects.push(...newEffects);
        allLogParts.push(`${enemy.name} attiva riflessione: ${refEffect.percent}% danno riflesso per ${refEffect.duration} turni!`);
        break;
      }

      case 'remove_status': {
        const remEffect = effect as SpecialEffect & { type: 'remove_status' };
        const remTargets = isSelf ? enemyTargets : partyTargets;
        if (remTargets.length === 0) break;

        const statusesToRemove = new Set(remEffect.statuses || []);
        if (isSelf) {
          currentEnemies = currentEnemies.map(e => {
            if (!enemyTargets.some(et => et.id === e.id)) return e;
            return { ...e, statusEffects: e.statusEffects.filter(s => !statusesToRemove.has(s)) };
          });
        } else {
          currentParty = currentParty.map(p => {
            if (!partyTargets.some(pt => pt.id === p.id)) return p;
            return { ...p, statusEffects: p.statusEffects.filter(s => !statusesToRemove.has(s)) };
          });
        }
        allLogParts.push(`${enemy.name} rimuove status negativi!`);
        break;
      }

      case 'revive': {
        // Revive other enemies (unusual but supported)
        const reviveTargets = currentEnemies.filter(e => e.currentHp <= 0);
        if (reviveTargets.length === 0) break;

        currentEnemies = currentEnemies.map(e => {
          if (e.currentHp > 0) return e;
          const reviveHp = Math.max(1, Math.floor(e.maxHp * ((effect as SpecialEffect & { type: 'revive' }).hpPercent) / 100));
          return { ...e, currentHp: reviveHp, statusEffects: [] };
        });
        allLogParts.push(`${enemy.name} rianima un alleato!`);
        break;
      }

      case 'add_slots': {
        // Not meaningful for enemies — skip
        break;
      }
    }
  }

  if (allLogParts.length === 0) {
    return {
      log: { turn, actorName: enemy.name, actorType: 'enemy', action: abilityName, message: '' },
      updatedParty: party,
    };
  }

  const result: { log: CombatLogEntry; updatedParty: Character[]; updatedEnemies?: EnemyInstance[]; appliedStatus?: { targetId: string; effect: StatusEffect; duration: number }; activeEffects?: ActiveCombatEffect[] } = {
    log: {
      turn,
      actorName: enemy.name,
      actorType: 'enemy',
      action: abilityName,
      targetName: primaryTargetName || primaryTarget.name,
      targetId: primaryTargetId || primaryTarget.id,
      damage: totalDamage || undefined,
      heal: totalHeal || undefined,
      isCritical: anyCritical || undefined,
      isMiss: anyMiss || undefined,
      statusEffect: primaryStatusEffect,
      message: allLogParts.join(' '),
    },
    updatedParty: currentParty,
  };

  // Check if enemies changed
  const enemiesChanged = enemies && (enemies.some((e, i) => {
    const ce = currentEnemies[i];
    return ce && (e.currentHp !== ce.currentHp || JSON.stringify(e.statusEffects) !== JSON.stringify(ce.statusEffects));
  }) || currentEnemies.length !== enemies.length);
  if (enemiesChanged) result.updatedEnemies = currentEnemies;

  if (appliedStatus) result.appliedStatus = appliedStatus;
  if (allActiveEffects.length > 0) result.activeEffects = allActiveEffects;

  return result;
}

// ==========================================
// FLEE CALCULATION
// ==========================================

export function calculateFleeChance(party: Character[], enemies: EnemyInstance[]): boolean {
  if (enemies.some(e => e.isBoss)) return false;
  const avgSpd = party.filter(p => p.currentHp > 0).reduce((sum, p) => sum + p.baseSpd, 0) / party.length;
  const enemyAvgSpd = enemies.reduce((sum, e) => sum + e.spd, 0) / enemies.length;
  const fleeChance = 30 + (avgSpd - enemyAvgSpd) * 5;
  return chance(Math.min(Math.max(fleeChance, 10), 80));
}

// ==========================================
// LOOT GENERATION
// ==========================================

export function generateLoot(enemyDefId: string, lootMult: number = 1): string[] {
  const enemyDef = ENEMIES[enemyDefId];
  if (!enemyDef) return [];

  const loot: string[] = [];
  for (const entry of enemyDef.lootTable) {
    const adjustedChance = Math.min(entry.chance * lootMult, 100);
    if (chance(adjustedChance)) {
      const qty = entry.quantity || 1;
      for (let i = 0; i < qty; i++) {
        loot.push(entry.itemId);
      }
    }
  }

  // #3+#29 Random equipment/mod drops (rare)
  if (enemyDef.isBoss) {
    // Bosses have higher chance of dropping equipment or mods
    if (chance(25)) {
      if (chance(50)) {
        // Drop equipment
        const pick = ALL_EQUIPMENT_IDS[Math.floor(Math.random() * ALL_EQUIPMENT_IDS.length)];
        loot.push(pick);
      } else {
        // Drop weapon mod
        const pick = ALL_MOD_ITEM_IDS[Math.floor(Math.random() * ALL_MOD_ITEM_IDS.length)];
        loot.push(pick);
      }
    }
  } else {
    // Regular enemies have a small chance
    if (chance(5)) {
      if (chance(50)) {
        // More likely common equipment
        const commonEq = ALL_EQUIPMENT_IDS.filter(id => {
          const eq = EQUIPMENT_STATS[id];
          return eq && (eq.rarity === 'common' || eq.rarity === 'uncommon');
        });
        if (commonEq.length > 0) {
          const pick = commonEq[Math.floor(Math.random() * commonEq.length)];
          loot.push(pick);
        }
      } else {
        // Common mods
        const commonMods = ALL_MOD_ITEM_IDS.filter(id => {
          const mod = WEAPON_MODS[id];
          return mod && (mod.rarity === 'common' || mod.rarity === 'uncommon');
        });
        if (commonMods.length > 0) {
          const pick = commonMods[Math.floor(Math.random() * commonMods.length)];
          loot.push(pick);
        }
      }
    }
  }

  return loot;
}

// ==========================================
// ACTIVE EFFECT TICK PROCESSING
// ==========================================

export interface TickResult {
  log: CombatLogEntry[];
  updatedParty: Character[];
  updatedEnemies: EnemyInstance[];
  expiredEffects: string[];
}

/**
 * Process one tick of all active combat effects (HoT, buff/debuff, shield, reflect, taunt).
 * Processes HoT healing, decrements remainingTurns, and returns expired effect IDs.
 * NOTE: The store handles poison/bleed/stun via statusDurations — not duplicated here.
 */
export function processActiveEffectsTick(
  activeEffects: ActiveCombatEffect[],
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): TickResult {
  const log: CombatLogEntry[] = [];
  const expiredEffects: string[] = [];
  let updatedParty = [...party];

  for (const effect of activeEffects) {
    if (effect.remainingTurns <= 0) {
      expiredEffects.push(effect.id);
      continue;
    }

    // Process HoT: heal the target
    if (effect.type === 'hot') {
      updatedParty = updatedParty.map(p => {
        if (p.id === effect.targetId && p.currentHp > 0) {
          const amount = effect.amount || 0;
          const newHp = Math.min(p.maxHp, p.currentHp + amount);
          log.push({
            turn,
            actorName: p.name,
            actorType: 'player',
            action: 'Cura nel Tempo',
            targetName: p.name,
            targetId: p.id,
            heal: amount,
            message: `${p.name} recupera ${amount} HP dalla cura nel tempo!`,
          });
          return { ...p, currentHp: newHp };
        }
        return p;
      });
    }

    // Decrement remaining turns for all effects
    effect.remainingTurns--;

    // Log when effects expire
    if (effect.remainingTurns <= 0) {
      expiredEffects.push(effect.id);
      const targetName = party.find(p => p.id === effect.targetId)?.name
        || enemies.find(e => e.id === effect.targetId)?.name
        || 'sconosciuto';

      if (effect.type === 'shield') {
        log.push({
          turn, actorName: targetName, actorType: 'player', action: 'Scudo',
          message: `Lo scudo di ${targetName} si è dissolto!`,
        });
      } else if (effect.type === 'reflect') {
        log.push({
          turn, actorName: targetName, actorType: 'player', action: 'Riflessione',
          message: `L'effetto di riflessione di ${targetName} è terminato!`,
        });
      } else if (effect.type === 'taunt') {
        log.push({
          turn, actorName: targetName, actorType: 'player', action: 'Provocazione',
          message: `La provocazione di ${targetName} è terminata!`,
        });
      } else if (effect.type === 'buff_stat') {
        const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : 'VELOCITÀ';
        log.push({
          turn, actorName: targetName, actorType: 'player', action: 'Buff',
          message: `Il potenziamento di ${statLabel} di ${targetName} è terminato!`,
        });
      } else if (effect.type === 'debuff_stat') {
        const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : 'VELOCITÀ';
        log.push({
          turn, actorName: targetName, actorType: 'enemy', action: 'Debuff',
          message: `Il debuff di ${statLabel} è terminato!`,
        });
      } else if (effect.type === 'hot') {
        log.push({
          turn, actorName: targetName, actorType: 'player', action: 'Cura nel Tempo',
          message: `La cura nel tempo di ${targetName} è terminata!`,
        });
      }
    }
  }

  return { log, updatedParty, updatedEnemies: enemies, expiredEffects };
}

// ==========================================
// ON TAKE HIT — Armor/accessory reactive effects
// ==========================================

/**
 * Called when a character takes damage. Checks:
 * 1. Armor effects with trigger 'on_take_hit' (e.g., proc shield)
 * Returns mitigated damage (caller handles active shield absorption separately).
 */
export function onTakeHit(
  character: Character,
  attacker: EnemyInstance | Character,
  damage: number,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): { mitigatedDamage: number; shieldLog?: CombatLogEntry; activeEffects?: ActiveCombatEffect[]; reflectLog?: CombatLogEntry } {
  let mitigatedDamage = damage;
  const newActiveEffects: ActiveCombatEffect[] = [];

  // Check armor on_take_hit effects
  const armorDef = character.armor ? ITEMS[character.armor.itemId] : null;
  if (armorDef?.effects && armorDef.effects.length > 0) {
    const result = executeEffectsForTrigger(
      armorDef.effects, 'on_take_hit', character, attacker as EnemyInstance, turn, party, enemies, 'armor', character.armor!.name,
    );
    if (result.activeEffects && result.activeEffects.length > 0) {
      newActiveEffects.push(...result.activeEffects);
    }
    if (result.log?.message) {
      // Armor proc message logged via activeEffects (shield created, etc.)
    }
  }

  return {
    mitigatedDamage,
    activeEffects: newActiveEffects.length > 0 ? newActiveEffects : undefined,
  };
}

// ==========================================
// ON TURN START — Equipment passive effects
// ==========================================

/**
 * Called at the start of a character's turn. Checks:
 * 1. Armor effects with trigger 'on_turn_start'
 * 2. Accessory effects with trigger 'on_turn_start'
 */
export function onTurnStart(
  character: Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): { log: CombatLogEntry[]; updatedCharacter?: Character; activeEffects?: ActiveCombatEffect[] } {
  const logs: CombatLogEntry[] = [];
  const newActiveEffects: ActiveCombatEffect[] = [];
  let updatedCharacter: Character | undefined;

  // Check armor on_turn_start effects
  const armorDef = character.armor ? ITEMS[character.armor.itemId] : null;
  if (armorDef?.effects && armorDef.effects.length > 0) {
    const result = executeEffectsForTrigger(
      armorDef.effects, 'on_turn_start', character, character, turn, party, enemies, 'armor', character.armor!.name,
    );
    if (result.log?.message) logs.push(result.log);
    if (result.activeEffects) newActiveEffects.push(...result.activeEffects);
    if (result.updatedCharacter) updatedCharacter = result.updatedCharacter;
  }

  // Check accessory on_turn_start effects
  const accessoryDef = character.accessory ? ITEMS[character.accessory.itemId] : null;
  if (accessoryDef?.effects && accessoryDef.effects.length > 0) {
    const result = executeEffectsForTrigger(
      accessoryDef.effects, 'on_turn_start', character, character, turn, party, enemies, 'accessory', character.accessory!.name,
    );
    if (result.log?.message) logs.push(result.log);
    if (result.activeEffects) newActiveEffects.push(...result.activeEffects);
    if (result.updatedCharacter) updatedCharacter = result.updatedCharacter;
  }

  return {
    log: logs,
    updatedCharacter,
    activeEffects: newActiveEffects.length > 0 ? newActiveEffects : undefined,
  };
}

// ==========================================
// EXP AND LEVELING
// ==========================================

export function addExp(character: Character, amount: number): { updated: Character; leveledUp: boolean } {
  let newExp = character.exp + amount;
  let newLevel = character.level;
  let expToNext = character.expToNext;
  let leveledUp = false;

  while (newExp >= expToNext) {
    newExp -= expToNext;
    newLevel++;
    expToNext = Math.floor(expToNext * 1.5);
    leveledUp = true;
  }

  // Use statGrowth if available (unified for all characters), otherwise proportional fallback
  let hpIncrease: number;
  let atkIncrease: number;
  let defIncrease: number;
  let spdIncrease: number;

  if (character.statGrowth) {
    hpIncrease = character.statGrowth.hp;
    atkIncrease = character.statGrowth.atk;
    defIncrease = character.statGrowth.def;
    spdIncrease = character.statGrowth.spd;
  } else {
    hpIncrease = 10; atkIncrease = 2; defIncrease = 1; spdIncrease = 1;
  }

  return {
    updated: {
      ...character,
      exp: newExp,
      level: newLevel,
      expToNext,
      maxHp: character.maxHp + hpIncrease,
      currentHp: Math.min(character.currentHp + hpIncrease, character.maxHp + hpIncrease),
      baseAtk: character.baseAtk + atkIncrease,
      baseDef: character.baseDef + defIncrease,
      baseSpd: character.baseSpd + spdIncrease,
      maxInventorySlots: character.maxInventorySlots,
    },
    leveledUp,
  };
}
