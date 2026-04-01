import {
  Character,
  EnemyInstance,
  CombatLogEntry,
  CombatState,
  ItemInstance,
  Archetype,
  StatusEffect,
} from '../types';
import { ENEMIES } from '../data/enemies';

// ==========================================
// UTILITY
// ==========================================

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

// ==========================================
// DAMAGE CALCULATION
// ==========================================

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  isDefending: boolean,
  attackerArchetype?: Archetype,
): { damage: number; isCritical: boolean; isMiss: boolean } {
  // Miss chance
  const missChance = 8;
  if (chance(missChance)) {
    return { damage: 0, isCritical: false, isMiss: true };
  }

  // Base damage formula
  let baseDamage = attackerAtk * random(85, 115) / 100;
  
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
};

export interface ActionResult {
  log: CombatLogEntry;
  updatedEnemy?: EnemyInstance;
  updatedCharacter?: Character;
  updatedEnemies?: EnemyInstance[];
  updatedParty?: Character[];
  consumedAmmoUid?: string; // uid of ammo item consumed by ranged attack
  isMeleeFallback?: boolean; // true when ranged weapon has no ammo
  tauntTargetId?: string; // set when tank uses Immolation
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
  const { damage, isCritical, isMiss } = calculateDamage(
    totalAtk,
    enemy.def,
    enemy.isDefending,
    character.archetype,
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

export function executePlayerSpecial(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
): ActionResult {
  const result: ActionResult = { log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: '' } };

  switch (character.archetype) {
    case 'tank': {
      // Barricata - defend all allies
      character.isDefending = true;
      result.log = {
        turn, actorName: character.name, actorType: 'player', action: 'Barricata',
        message: `${character.name} erige una barricata! Danni ridotti fino al prossimo turno.`,
      };
      result.updatedCharacter = character;
      break;
    }
    case 'healer': {
      // Pronto Soccorso - heal one ally significantly + cure poison and bleeding
      if (target.id === character.id || party.some(p => p.id === target.id)) {
        const healTarget = target as Character;
        const healAmount = calculateHeal(70, character.archetype);
        const newHp = Math.min(healTarget.maxHp, healTarget.currentHp + healAmount);
        // Cure poison and bleeding
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
      // Colpo Mortale - massive critical attack
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
  }

  return result;
}

export function executePlayerSpecial2(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
): ActionResult {
  const result: ActionResult = { log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale2', message: '' } };

  switch (character.archetype) {
    case 'tank': {
      // Immolation — taunt: all enemy attacks target tank this turn
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
      // Cura Gruppo — heal all party members moderately
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
      // Raffica — primary target + splash damage to other alive enemies
      if (target.id !== character.id) {
        const enemyTarget = target as EnemyInstance;
        const weaponBonus = character.weapon?.atkBonus || 0;
        const totalAtk = (character.baseAtk + weaponBonus) * 1.3;

        // Primary target — full damage
        const primary = calculateDamage(totalAtk, enemyTarget.def, enemyTarget.isDefending, character.archetype);
        const primaryHp = Math.max(0, enemyTarget.currentHp - primary.damage);
        let updatedEnemies = enemies.map(e =>
          e.id === enemyTarget.id ? { ...e, currentHp: primaryHp, isDefending: false } : e
        );

        // Splash to other alive enemies — 40% damage
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
  }

  return result;
}

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

  const hpIncrease = { tank: 12, healer: 8, dps: 9 }[character.archetype];
  const atkIncrease = { tank: 2, healer: 1, dps: 3 }[character.archetype];
  const defIncrease = { tank: 2, healer: 1, dps: 1 }[character.archetype];
  const spdIncrease = { tank: 0, healer: 1, dps: 1 }[character.archetype];

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
