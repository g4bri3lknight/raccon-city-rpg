import {
  Character,
  EnemyInstance,
  CombatLogEntry,
  CombatState,
  ItemInstance,
  Archetype,
  StatusEffect,
} from '../types';
import { ENEMIES, ARCHETYPE_SPECIAL_MAP, getSpecialById } from '../data/loader';

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

// ==========================================
// DAMAGE CALCULATION
// ==========================================

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  isDefending: boolean,
  attackerArchetype?: Archetype,
  attackerHasAdrenaline?: boolean,
): { damage: number; isCritical: boolean; isMiss: boolean } {
  // Miss chance
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

  // Critical hit
  let critChance = 10;
  if (attackerArchetype === 'dps') critChance = 25;
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

  let critChance = 10;
  if (attackerArchetype === 'dps') critChance = 25;
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
}

export function executePlayerAttack(
  character: Character,
  enemy: EnemyInstance,
  turn: number,
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

  const totalAtk = character.baseAtk + weaponBonus;
  const hasAdrenaline = character.statusEffects.includes('adrenaline');
  const { damage, isCritical, isMiss } = calculateDamage(
    totalAtk,
    enemy.def,
    enemy.isDefending,
    character.archetype,
    hasAdrenaline,
  );

  const newHp = Math.max(0, enemy.currentHp - damage);
  const updatedEnemy: EnemyInstance = { ...enemy, currentHp: newHp, isDefending: false };

  let message = '';
  if (isMiss) {
    message = `${character.name} attacca ${enemy.name} ma manca il bersaglio!`;
  } else if (isCritical) {
    message = `${character.name} infligge un COLPO CRITICO a ${enemy.name} per ${damage} danni!`;
  } else {
    message = `${character.name} attacca ${enemy.name} e infligge ${damage} danni.`;
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

  // Fallback: use archetype switch for predefined characters without special IDs
  if (!special && character.archetype !== 'custom') {
    return executePlayerSpecialLegacy(character, target, turn, party);
  }

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

  // Fallback: use archetype switch for predefined characters without special IDs
  if (!special && character.archetype !== 'custom') {
    return executePlayerSpecial2Legacy(character, target, turn, party, enemies);
  }

  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale2', message: `${character.name} non ha abilità speciale secondaria.` },
    };
  }

  return executeSpecialAbility(character, target, turn, party, enemies, special);
}

// Generic special ability execution
function executeSpecialAbility(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  special: ReturnType<typeof getSpecialById>,
): ActionResult {
  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: `${character.name} non ha abilità speciale.` },
    };
  }

  const result: ActionResult = {
    log: { turn, actorName: character.name, actorType: 'player', action: special.name, message: '' },
  };

  switch (special.executionType) {
    // ── OFFENSIVE ──
    case 'colpo_mortale': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 1.6;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const { damage, isCritical, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, hasAdrenaline);
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Colpo Mortale',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical: true,
        message: `${character.name} esegue un COLPO MORTALE su ${enemyTarget.name} per ${damage} danni!`,
      };
      result.updatedEnemy = updated;
      break;
    }

    case 'raffica': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 1.3;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');

      const primary = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, hasAdrenaline);
      const primaryHp = Math.max(0, enemyTarget.currentHp - primary.damage);
      let updatedEnemies = enemies.map(e =>
        e.id === enemyTarget.id ? { ...e, currentHp: primaryHp, isDefending: false } : e
      );

      const splashLog: string[] = [];
      const splashAtk = (character.baseAtk + weaponBonus) * 0.6;
      updatedEnemies = updatedEnemies.map(e => {
        if (e.id !== enemyTarget.id && e.currentHp > 0) {
          const splash = calculateDamage(splashAtk, e.def, e.isDefending, undefined, hasAdrenaline);
          const newHp = Math.max(0, e.currentHp - splash.damage);
          if (!splash.isMiss) {
            splashLog.push(`${e.name}: -${splash.damage}`);
          }
          return { ...e, currentHp: newHp, isDefending: false };
        }
        return e;
      });

      let message = `${character.name} esegue una RAFFICA su ${enemyTarget.name} per ${primary.damage} danni!`;
      if (primary.isCritical) message = `${character.name} esegue una RAFFICA CRITICA su ${enemyTarget.name} per ${primary.damage} danni!`;
      if (primary.isMiss) message = `${character.name} spara una raffica ma manca ${enemyTarget.name}!`;
      if (splashLog.length > 0) {
        message += ` Danni collaterali: ${splashLog.join(', ')}.`;
      }

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Raffica',
        targetName: enemyTarget.name, targetId: enemyTarget.id,
        damage: primary.damage, isCritical: primary.isCritical, isMiss: primary.isMiss,
        message,
      };
      result.updatedEnemies = updatedEnemies;
      break;
    }

    case 'sparo_mirato': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 2.0;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      // Guaranteed hit - no miss
      const { damage, isCritical } = calculateDamageNoMiss(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, hasAdrenaline);
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };
      let message = `${character.name} esegue uno SPARO MIRATO su ${enemyTarget.name} per ${damage} danni!`;
      if (isCritical) message = `${character.name} esegue uno SPARO MIRATO CRITICO su ${enemyTarget.name} per ${damage} danni!`;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Sparo Mirato',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical,
        message,
      };
      result.updatedEnemy = updated;
      break;
    }

    case 'veleno_acido': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 0.9;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const { damage, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, undefined, hasAdrenaline);
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };
      
      let message = `${character.name} lancia VELENO ACIDO su ${enemyTarget.name} per ${damage} danni!`;
      if (isMiss) message = `${character.name} lancia veleno ma ${enemyTarget.name} schiva!`;
      
      // Apply poison
      if (!isMiss && special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
        if (!updated.statusEffects.includes('poison')) {
          updated.statusEffects = [...updated.statusEffects, 'poison'];
          message += ` ${enemyTarget.name} è avvelenato!`;
        }
      }

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Veleno Acido',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isMiss,
        message, statusEffect: 'poison',
      };
      result.updatedEnemy = updated;
      break;
    }

    case 'attacco_carica': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 1.4;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const { damage, isCritical, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, hasAdrenaline);
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };
      
      let message = `${character.name} esegue un ATTACCO DI CARICA su ${enemyTarget.name} per ${damage} danni!`;
      
      // Apply stun
      if (!isMiss && special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
        if (!updated.statusEffects.includes('stunned')) {
          updated.statusEffects = [...updated.statusEffects, 'stunned'];
          message += ` ${enemyTarget.name} è stordito!`;
        }
      }

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Attacco di Carica',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical, isMiss,
        message, statusEffect: 'stunned',
      };
      result.updatedEnemy = updated;
      break;
    }

    case 'gas_venefico': {
      // AOE poison - damages ALL living enemies
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 0.7;
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const livingEnemies = enemies.filter(e => e.currentHp > 0);
      let totalDmg = 0;
      const updatedEnemies = livingEnemies.map(e => {
        const { damage, isMiss } = calculateDamage(totalAtk, e.def, e.isDefending, undefined, hasAdrenaline);
        if (isMiss) return { ...e, isDefending: false };
        totalDmg += damage;
        const newHp = Math.max(0, e.currentHp - damage);
        const updated = { ...e, currentHp: newHp, isDefending: false };
        if (special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
          if (!updated.statusEffects.includes('poison')) {
            updated.statusEffects = [...updated.statusEffects, 'poison'];
          }
        }
        return updated;
      });

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Gas Venefico',
        damage: totalDmg,
        message: `${character.name} lancia Gas Venefico! Tutti i nemici sono avvelenati e subiscono ${totalDmg} danni!`,
        statusEffect: 'poison',
      };
      result.updatedEnemies = updatedEnemies;
      break;
    }

    case 'cristalli_sonici': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 1.1;
      const { damage, isCritical, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, character.statusEffects.includes('adrenaline'));
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };

      let message = `${character.name} attiva Cristalli Sonici! ${enemyTarget.name} è stordito e subisce ${damage} danni!`;

      // Apply stun
      if (!isMiss && special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
        if (!updated.statusEffects.includes('stunned')) {
          updated.statusEffects = [...updated.statusEffects, 'stunned'];
          message += ` ${enemyTarget.name} è stordito!`;
        }
      }

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Cristalli Sonici',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical, isMiss,
        message, statusEffect: 'stunned',
      };
      result.updatedEnemy = updated;
      break;
    }

    case 'frecce_etiche': {
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * 0.9;
      const { damage, isCritical, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, character.statusEffects.includes('adrenaline'));
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };

      let message = `${character.name} spara Frecce Elettriche! ${enemyTarget.name} è stordito e subisce ${damage} danni!`;

      // Apply stun
      if (!isMiss && special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
        if (!updated.statusEffects.includes('stunned')) {
          updated.statusEffects = [...updated.statusEffects, 'stunned'];
          message += ` ${enemyTarget.name} è stordito!`;
        }
      }

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Frecce Elettriche',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical, isMiss,
        message, statusEffect: 'stunned',
      };
      result.updatedEnemy = updated;
      break;
    }

    // ── DEFENSIVE ──
    case 'barricata': {
      character.isDefending = true;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Barricata',
        message: `${character.name} erige una barricata! Danni ridotti fino al prossimo turno.`,
      };
      result.updatedCharacter = character;
      break;
    }

    case 'immolazione': {
      character.isDefending = true;
      result.tauntTargetId = character.id;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Immolazione',
        message: `${character.name} si espone con IMMOLAZIONE! Tutti i nemici dovranno attaccarlo. Danni ridotti.`,
      };
      result.updatedCharacter = character;
      break;
    }

    case 'scudo_vitale': {
      // Heal 30 HP and set defending
      const healAmount = 30;
      const newHp = Math.min(character.maxHp, character.currentHp + healAmount);
      character.isDefending = true;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Scudo Vitale',
        heal: healAmount,
        message: `${character.name} attiva lo SCUDO VITALE! Recupera ${healAmount} HP e riduce i danni subiti.`,
      };
      result.updatedCharacter = { ...character, currentHp: newHp, isDefending: true };
      break;
    }

    // ── SUPPORT ──
    case 'pronto_soccorso': {
      if (target.id === character.id || party.some(p => p.id === target.id)) {
        const healTarget = target as Character;
        const healAmount = calculateHeal(70, character.archetype);
        const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
        const curedEffects: string[] = [];
        let cleanedStatus = [...healTarget.statusEffects];
        if (cleanedStatus.includes('poison')) {
          cleanedStatus = cleanedStatus.filter(s => s !== 'poison');
          curedEffects.push('avvelenamento');
        }
        if (cleanedStatus.includes('bleeding')) {
          cleanedStatus = cleanedStatus.filter(s => s !== 'bleeding');
          curedEffects.push('sanguinamento');
        }
        const updated = { ...healTarget, currentHp: newHp, statusEffects: cleanedStatus };
        const cureText = curedEffects.length > 0 ? ` e cura ${curedEffects.join(' e ')}` : '';
        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Pronto Soccorso',
          targetName: healTarget.name, targetId: healTarget.id, heal: healAmount,
          message: `${character.name} usa Pronto Soccorso su ${healTarget.name} ripristinando ${healAmount} HP${cureText}!`,
        };
        result.updatedCharacter = updated;
      }
      break;
    }

    case 'cura_gruppo': {
      const healAmount = calculateHeal(35, character.archetype);
      const updatedParty = party.map(p => {
        if (p.currentHp > 0) {
          return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + healAmount) };
        }
        return p;
      });
      const aliveCount = party.filter(p => p.currentHp > 0).length;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Cura Gruppo',
        heal: healAmount,
        message: `${character.name} usa Cura Gruppo! ${aliveCount} alleati guariti di ${healAmount} HP ciascuno.`,
      };
      result.updatedParty = updatedParty;
      break;
    }

    case 'adrenalina': {
      const healTarget = target as Character;
      // Adrenalina: heal 40 HP + 2-turn ATK buff (+25% damage)
      const healAmount = 40;
      const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
      const alreadyBuffed = healTarget.statusEffects.includes('adrenaline');
      const updatedStatus = alreadyBuffed
        ? healTarget.statusEffects
        : [...healTarget.statusEffects, 'adrenaline' as StatusEffect];
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Adrenalina',
        targetName: healTarget.name, targetId: healTarget.id, heal: healAmount,
        message: alreadyBuffed
          ? `${character.name} inietta ADRENALINA a ${healTarget.name}! +${healAmount} HP!`
          : `${character.name} inietta ADRENALINA a ${healTarget.name}! +${healAmount} HP e +25% danni per 2 turni!`,
      };
      result.updatedCharacter = { ...healTarget, currentHp: newHp, statusEffects: updatedStatus };
      if (!alreadyBuffed) {
        result.appliedBuff = { targetId: healTarget.id, effect: 'adrenaline', duration: 2 };
      }
      break;
    }

    case 'iniezione_stimolante': {
      const healTarget = target as Character;
      const healAmount = calculateHeal(special.healAmount || 45, character.archetype);
      const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
      const curedEffects: string[] = [];
      let cleanedStatus = [...healTarget.statusEffects];
      if (cleanedStatus.includes('poison')) { cleanedStatus = cleanedStatus.filter(s => s !== 'poison'); curedEffects.push('avvelenamento'); }
      if (cleanedStatus.includes('bleeding')) { cleanedStatus = cleanedStatus.filter(s => s !== 'bleeding'); curedEffects.push('sanguinamento'); }
      if (cleanedStatus.includes('stunned')) { cleanedStatus = cleanedStatus.filter(s => s !== 'stunned'); curedEffects.push('stordimento'); }
      const updated = { ...healTarget, currentHp: newHp, statusEffects: cleanedStatus };
      const cureText = curedEffects.length > 0 ? ` e rimuove ${curedEffects.join(' e ')}` : '';
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Iniezione Stimolante',
        targetName: healTarget.name, targetId: healTarget.id, heal: healAmount,
        message: `${character.name} usa INIEZIONE STIMOLANTE su ${healTarget.name}! +${healAmount} HP${cureText}!`,
      };
      result.updatedCharacter = updated;
      break;
    }

    case 'disinfezione_totale': {
      const healAmount = calculateHeal(special.healAmount || 20, character.archetype);
      const cleanedParty = party.map(p => {
        if (p.currentHp <= 0) return p;
        const newHp = Math.min(p.maxHp, p.currentHp + healAmount);
        const cleanedStatus: typeof p.statusEffects = [];
        return { ...p, currentHp: newHp, statusEffects: cleanedStatus };
      });
      const aliveCount = party.filter(p => p.currentHp > 0).length;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Disinfezione Totale',
        heal: healAmount,
        message: `${character.name} usa DISINFEZIONE TOTALE! ${aliveCount} alleati curati di ${healAmount} HP e tutti gli status negativi rimossi!`,
      };
      result.updatedParty = cleanedParty;
      break;
    }

    case 'recupero_tattico': {
      const healAmount = calculateHeal(special.healAmount || 50, character.archetype);
      const newHp = Math.min(character.maxHp, character.currentHp + healAmount);
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Recupero Tattico',
        heal: healAmount,
        message: `${character.name} usa RECUPERO TATTICO! Recupera ${healAmount} HP!`,
      };
      result.updatedCharacter = { ...character, currentHp: newHp };
      break;
    }

    case 'resistenza_attiva': {
      const healAmount = calculateHeal(special.healAmount || 25, character.archetype);
      const newHp = Math.min(character.maxHp, character.currentHp + healAmount);
      const hadStatus = character.statusEffects.length > 0;
      const cleanedStatus: typeof character.statusEffects = [];
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Resistenza Attiva',
        heal: healAmount,
        message: `${character.name} attiva RESISTENZA ATTIVA! +${healAmount} HP${hadStatus ? '. Tutti gli effetti negativi rimossi!' : '!'}`,
      };
      result.updatedCharacter = { ...character, currentHp: newHp, statusEffects: cleanedStatus };
      break;
    }

    case 'granata_stordente': {
      // AOE stun - damages ALL living enemies + high stun chance
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * (special.powerMultiplier || 0.8);
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const livingEnemies = enemies.filter(e => e.currentHp > 0);
      let totalDmg = 0;
      let stunnedCount = 0;
      const updatedEnemies = livingEnemies.map(e => {
        const { damage, isMiss } = calculateDamage(totalAtk, e.def, e.isDefending, undefined, hasAdrenaline);
        if (isMiss) return { ...e, isDefending: false };
        totalDmg += damage;
        const newHp = Math.max(0, e.currentHp - damage);
        const updated = { ...e, currentHp: newHp, isDefending: false };
        if (special.statusToApply && chance(getStatusChance(special.statusToApply.chance, character.archetype))) {
          if (!updated.statusEffects.includes('stunned')) {
            updated.statusEffects = [...updated.statusEffects, 'stunned'];
            stunnedCount++;
          }
        }
        return updated;
      });

      let message = `${character.name} lancia una GRANATA STORDENTE! ${totalDmg} danni totali ai nemici!`;
      if (stunnedCount > 0) message += ` ${stunnedCount} nemici storditi!`;

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Granata Stordente',
        damage: totalDmg,
        message,
        statusEffect: 'stunned',
      };
      result.updatedEnemies = updatedEnemies;
      break;
    }

    case 'siero_inibitore': {
      // Single target: moderate damage + poison AND stun
      if (target.id === character.id) break;
      const enemyTarget = target as EnemyInstance;
      const weaponBonus = character.weapon?.atkBonus || 0;
      const totalAtk = (character.baseAtk + weaponBonus) * (special.powerMultiplier || 1.0);
      const { damage, isCritical, isMiss } = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype, character.statusEffects.includes('adrenaline'));
      const newHp = Math.max(0, enemyTarget.currentHp - damage);
      const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };

      let message = `${character.name} inietta SIERO INIBITORE a ${enemyTarget.name} per ${damage} danni!`;
      const appliedEffects: string[] = [];

      // Apply poison
      if (!isMiss && chance(getStatusChance(65, character.archetype))) {
        if (!updated.statusEffects.includes('poison')) {
          updated.statusEffects = [...updated.statusEffects, 'poison'];
          appliedEffects.push('avvelenato');
        }
      }
      // Apply stun
      if (!isMiss && chance(getStatusChance(40, character.archetype))) {
        if (!updated.statusEffects.includes('stunned')) {
          updated.statusEffects = [...updated.statusEffects, 'stunned'];
          appliedEffects.push('stordito');
        }
      }
      if (appliedEffects.length > 0) message += ` ${enemyTarget.name} è ${appliedEffects.join(' e ')}!`;

      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Siero Inibitore',
        targetName: enemyTarget.name, targetId: enemyTarget.id, damage, isCritical, isMiss,
        message,
      };
      result.updatedEnemy = updated;
      break;
    }

    default:
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Speciale',
        message: `${character.name} usa un'abilità sconosciuta.`,
      };
  }

  return result;
}

// Legacy special execution for predefined archetypes (fallback)
function executePlayerSpecialLegacy(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
): ActionResult {
  const result: ActionResult = { log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: '' } };

  switch (character.archetype) {
    case 'tank': {
      character.isDefending = true;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Barricata',
        message: `${character.name} erige una barricata! Danni ridotti fino al prossimo turno.`,
      };
      result.updatedCharacter = character;
      break;
    }
    case 'healer': {
      if (target.id === character.id || party.some(p => p.id === target.id)) {
        const healTarget = target as Character;
        const healAmount = calculateHeal(70, character.archetype);
        const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
        const curedEffects: string[] = [];
        let cleanedStatus = [...healTarget.statusEffects];
        if (cleanedStatus.includes('poison')) {
          cleanedStatus = cleanedStatus.filter(s => s !== 'poison');
          curedEffects.push('avvelenamento');
        }
        if (cleanedStatus.includes('bleeding')) {
          cleanedStatus = cleanedStatus.filter(s => s !== 'bleeding');
          curedEffects.push('sanguinamento');
        }
        const updated = { ...healTarget, currentHp: newHp, statusEffects: cleanedStatus };
        const cureText = curedEffects.length > 0 ? ` e cura ${curedEffects.join(' e ')}` : '';
        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Pronto Soccorso',
          targetName: healTarget.name, targetId: healTarget.id, heal: healAmount,
          message: `${character.name} usa Pronto Soccorso su ${healTarget.name} ripristinando ${healAmount} HP${cureText}!`,
        };
        result.updatedCharacter = updated;
      }
      break;
    }
    case 'dps': {
      if (target.id !== character.id) {
        const enemyTarget = target as EnemyInstance;
        const weaponBonus = character.weapon?.atkBonus || 0;
        const totalAtk = (character.baseAtk + weaponBonus) * 1.6;
        const { damage, isCritical, isMiss } = calculateDamage(
          totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype,
        );
        const newHp = Math.max(0, enemyTarget.currentHp - damage);
        const updated = { ...enemyTarget, currentHp: newHp, isDefending: false };
        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Colpo Mortale',
          targetName: enemyTarget.name, targetId: enemyTarget.id, damage: damage, isCritical: true,
          message: `${character.name} esegue un COLPO MORTALE su ${enemyTarget.name} per ${damage} danni!`,
        };
        result.updatedEnemy = updated;
      }
      break;
    }
    case 'control': {
      if (target.id !== character.id) {
        const enemyTarget = target as EnemyInstance;
        const weaponBonus = character.weapon?.atkBonus || 0;
        const totalAtk = (character.baseAtk + weaponBonus) * 0.7;

        const calc = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype);
        let newHp = Math.max(0, enemyTarget.currentHp - calc.damage);
        const statusLog: string[] = [];

        if (!calc.isMiss && Math.random() * 100 < 75) {
          enemyTarget.statusEffects.push('poison');
          statusLog.push('(avvelenato)');
        }

        let message = `${character.name} lancia GAS VENEFICO!`;
        if (calc.isMiss) {
          message += ' Mancato!';
        } else {
          message += ` ${calc.damage} danni a ${enemyTarget.name}!`;
          if (statusLog.length > 0) message += ` ${statusLog.join(' ')}`;
          if (calc.isCritical) message += ' 💥 CRITICO!';
        }

        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Gas Venefico',
          targetName: enemyTarget.name, targetId: enemyTarget.id,
          damage: calc.damage, isCritical: calc.isCritical, isMiss: calc.isMiss,
          message,
        };
        result.updatedEnemy = { ...enemyTarget, currentHp: newHp, isDefending: false };
      }
      break;
    }
  }

  return result;
}

function executePlayerSpecial2Legacy(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): ActionResult {
  const result: ActionResult = { log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale2', message: '' } };

  switch (character.archetype) {
    case 'tank': {
      character.isDefending = true;
      result.tauntTargetId = character.id;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Immolazione',
        message: `${character.name} si espone con IMMOLAZIONE! Tutti i nemici dovranno attaccarlo. Danni ridotti.`,
      };
      result.updatedCharacter = character;
      break;
    }
    case 'healer': {
      const healAmount = calculateHeal(35, character.archetype);
      const updatedParty = party.map(p => {
        if (p.currentHp > 0) {
          return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + healAmount) };
        }
        return p;
      });
      const aliveCount = party.filter(p => p.currentHp > 0).length;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Cura Gruppo',
        heal: healAmount,
        message: `${character.name} usa Cura Gruppo! ${aliveCount} alleati guariti di ${healAmount} HP ciascuno.`,
      };
      result.updatedParty = updatedParty;
      break;
    }
    case 'dps': {
      if (target.id !== character.id) {
        const enemyTarget = target as EnemyInstance;
        const weaponBonus = character.weapon?.atkBonus || 0;
        const totalAtk = (character.baseAtk + weaponBonus) * 1.3;

        const primary = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype);
        const primaryHp = Math.max(0, enemyTarget.currentHp - primary.damage);
        let updatedEnemies = enemies.map(e =>
          e.id === enemyTarget.id ? { ...e, currentHp: primaryHp, isDefending: false } : e
        );

        const splashLog: string[] = [];
        const splashAtk = (character.baseAtk + weaponBonus) * 0.6;
        updatedEnemies = updatedEnemies.map(e => {
          if (e.id !== enemyTarget.id && e.currentHp > 0) {
            const splash = calculateDamage(splashAtk, e.def, e.isDefending);
            const newHp = Math.max(0, e.currentHp - splash.damage);
            if (!splash.isMiss) {
              splashLog.push(`${e.name}: -${splash.damage}`);
            }
            return { ...e, currentHp: newHp, isDefending: false };
          }
          return e;
        });

        let message = `${character.name} esegue una RAFFICA su ${enemyTarget.name} per ${primary.damage} danni!`;
        if (primary.isCritical) message = `${character.name} esegue una RAFFICA CRITICA su ${enemyTarget.name} per ${primary.damage} danni!`;
        if (primary.isMiss) message = `${character.name} spara una raffica ma manca ${enemyTarget.name}!`;
        if (splashLog.length > 0) {
          message += ` Danni collaterali: ${splashLog.join(', ')}.`;
        }

        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Raffica',
          targetName: enemyTarget.name, targetId: enemyTarget.id,
          damage: primary.damage, isCritical: primary.isCritical, isMiss: primary.isMiss,
          message,
        };
        result.updatedEnemies = updatedEnemies;
      }
      break;
    }
    case 'control': {
      if (target.id !== character.id) {
        const enemyTarget = target as EnemyInstance;
        const weaponBonus = character.weapon?.atkBonus || 0;
        const totalAtk = (character.baseAtk + weaponBonus) * 1.1;

        const calc = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype);
        let newHp = Math.max(0, enemyTarget.currentHp - calc.damage);
        const statusLog: string[] = [];

        if (!calc.isMiss && Math.random() * 100 < 65) {
          enemyTarget.statusEffects.push('stunned');
          statusLog.push('(stordito)');
        }

        let message = `${character.name} lancia CRISTALLI SONICI su ${enemyTarget.name}!`;
        if (calc.isMiss) {
          message += ' Mancato!';
        } else {
          message += ` ${calc.damage} danni!`;
          if (statusLog.length > 0) message += ` ${statusLog.join(' ')}`;
          if (calc.isCritical) message += ' 💥 CRITICO!';
        }

        result.log = {
          turn, actorName: character.name, actorType: 'player', action: 'Cristalli Sonici',
          targetName: enemyTarget.name, targetId: enemyTarget.id,
          damage: calc.damage, isCritical: calc.isCritical, isMiss: calc.isMiss,
          message,
        };
        result.updatedEnemies = enemies.map(e =>
          e.id === enemyTarget.id ? { ...e, currentHp: newHp, isDefending: false } : e
        );
      }
      break;
    }
  }

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
  target: Character,
  party: Character[],
  turn: number,
): { log: CombatLogEntry; updatedCharacter?: Character; updatedParty?: Character[]; consumeItem: boolean; curedStatuses?: StatusEffect[] } {
  if (!item.effect) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto', message: `${character.name} usa ${item.name} ma non ha effetto.` },
      consumeItem: true,
    };
  }

  const effect = item.effect;
  const curedStatuses: StatusEffect[] = [];

  switch (effect.type) {
    case 'heal': {
      const healAmount = calculateHeal(effect.value, character.archetype);

      // Check if this heal also cures status effects
      const statusCured = effect.statusCured || [];
      const actuallyCured = target.statusEffects.filter(s => statusCured.includes(s));
      curedStatuses.push(...actuallyCured);
      const newStatus = target.statusEffects.filter(s => !statusCured.includes(s));

      if (effect.target === 'all_allies') {
        const updatedParty = party.map(p => {
          if (p.currentHp > 0) {
            const partyCured = p.statusEffects.filter(s => statusCured.includes(s));
            const partyNewStatus = p.statusEffects.filter(s => !statusCured.includes(s));
            return {
              ...p,
              currentHp: Math.min(p.maxHp, p.currentHp + healAmount),
              statusEffects: partyNewStatus as typeof p.statusEffects,
            };
          }
          return p;
        });
        let message = `${character.name} usa ${item.name}. Tutti gli alleati guariscono di ${healAmount} HP!`;
        if (statusCured.length > 0) {
          const names = statusCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s);
          message += ` Effetti rimossi: ${names.join(', ')}.`;
        }
        return {
          log: {
            turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto',
            message,
            heal: healAmount,
          },
          updatedParty: updatedParty,
          consumeItem: true,
          curedStatuses: actuallyCured,
        };
      }

      let healTarget = target;
      const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
      let message = `${character.name} usa ${item.name} su ${healTarget.name}. Ripristinati ${healAmount} HP!`;
      if (actuallyCured.length > 0) {
        const names = actuallyCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s);
        message += ` ✨ ${names.join(', ')} curato/i!`;
      }
      return {
        log: {
          turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto',
          targetName: healTarget.name, targetId: healTarget.id, heal: healAmount,
          message,
        },
        updatedCharacter: { ...healTarget, currentHp: newHp, statusEffects: newStatus as typeof healTarget.statusEffects },
        consumeItem: true,
        curedStatuses: actuallyCured,
      };
    }
    case 'heal_full': {
      const statusCured = effect.statusCured || [];
      const actuallyCured = target.statusEffects.filter(s => statusCured.includes(s));
      curedStatuses.push(...actuallyCured);
      const newStatus = target.statusEffects.filter(s => !statusCured.includes(s));

      if (effect.target === 'all_allies') {
        const updatedParty = party.map(p => {
          if (p.currentHp > 0) {
            const partyCured = p.statusEffects.filter(s => statusCured.includes(s));
            const partyNewStatus = p.statusEffects.filter(s => !statusCured.includes(s));
            return { ...p, currentHp: p.maxHp, statusEffects: partyNewStatus as typeof p.statusEffects };
          }
          return p;
        });
        let message = `${character.name} usa ${item.name}. HP di tutti gli alleati completamente ripristinati!`;
        if (statusCured.length > 0) {
          const names = statusCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s);
          message += ` Effetti rimossi: ${names.join(', ')}.`;
        }
        return {
          log: { turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto', message, heal: 0 },
          updatedParty: updatedParty,
          consumeItem: true,
          curedStatuses: actuallyCured,
        };
      }

      const healAmount = target.maxHp - target.currentHp;
      let message = `${character.name} usa ${item.name} su ${target.name}. HP completamente ripristinati (+${healAmount})!`;
      if (actuallyCured.length > 0) {
        const names = actuallyCured.map(s => s === 'poison' ? 'avvelenamento' : s === 'bleeding' ? 'sanguinamento' : s);
        message += ` ✨ ${names.join(', ')} curato/i!`;
      }
      return {
        log: { turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto', targetName: target.name, targetId: target.id, heal: healAmount, message },
        updatedCharacter: { ...target, currentHp: target.maxHp, statusEffects: newStatus as typeof target.statusEffects },
        consumeItem: true,
        curedStatuses: actuallyCured,
      };
    }
    case 'cure': {
      const cured = effect.statusCured || [];
      const cureTarget = target;
      const newStatus = cureTarget.statusEffects.filter(s => !cured.includes(s));
      return {
        log: {
          turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto',
          targetName: cureTarget.name, targetId: cureTarget.id,
          message: `${character.name} usa ${item.name} su ${cureTarget.name}. ${cured.length > 0 ? 'Effetti curati!' : 'Nessun effetto da curare.'}`,
        },
        updatedCharacter: { ...cureTarget, statusEffects: newStatus as typeof cureTarget.statusEffects },
        consumeItem: true,
        curedStatuses: cured as StatusEffect[],
      };
    }
    default:
      return {
        log: { turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto', message: `${character.name} usa ${item.name}.` },
        consumeItem: true,
      };
    case 'kill_all': {
      // Rocket launcher: kills all enemies — handled by the store after this returns
      return {
        log: {
          turn, actorName: character.name, actorType: 'player', action: 'Usa Oggetto',
          message: `🚀 ${character.name} spara il Lanciarazzi RPG! UN\'ESPLOSIONE DEVASTANTE colpisce tutti i nemici! 💥💥💥`,
        },
        consumeItem: true,
      };
    }
  }
}

export function executeEnemyAttack(
  enemy: EnemyInstance,
  party: Character[],
  turn: number,
  forcedTargetId?: string | null,
): { log: CombatLogEntry; updatedParty: Character[]; appliedStatus?: { targetId: string; effect: StatusEffect; duration: number } } {
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

  const { damage, isCritical, isMiss } = calculateDamage(
    enemy.atk * ability.power,
    target.baseDef + (target.isDefending ? 5 : 0),
    target.isDefending,
  );

  let newHp = Math.max(0, target.currentHp - damage);
  let newStatus = [...target.statusEffects];

  let appliedStatus: { targetId: string; effect: StatusEffect; duration: number } | undefined;

  // Apply status effect
  if (ability.statusEffect && !isMiss && chance(ability.statusEffect.chance)) {
    if (!newStatus.includes(ability.statusEffect.type)) {
      newStatus.push(ability.statusEffect.type);
      appliedStatus = {
        targetId: target.id,
        effect: ability.statusEffect.type,
        duration: ability.statusEffect.duration || 3,
      };
    }
  }

  let message = '';
  if (isMiss) {
    message = `${enemy.name} usa ${ability.name} ma ${target.name} schiva l'attacco!`;
  } else {
    message = `${enemy.name} usa ${ability.name} su ${target.name} per ${damage} danni!`;
    if (isCritical) message += ' COLPO CRITICO!';
    if (ability.statusEffect && newStatus.includes(ability.statusEffect.type)) {
      const statusNames: Record<string, string> = { poison: 'Avvelenato', bleeding: 'Sanguinamento', stunned: 'Stordito' };
      message += ` ${target.name} è ${statusNames[ability.statusEffect.type]}!`;
    }
  }

  const updatedParty = party.map(p => {
    if (p.id === target.id) {
      return { ...p, currentHp: newHp, statusEffects: newStatus, isDefending: false };
    }
    return p;
  });

  return {
    log: {
      turn, actorName: enemy.name, actorType: 'enemy', action: ability.name,
      targetName: target.name, targetId: target.id, damage, isCritical, isMiss,
      statusEffect: ability.statusEffect?.type,
      message,
    },
    updatedParty,
    appliedStatus,
  };
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
  return loot;
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
