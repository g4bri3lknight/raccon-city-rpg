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
import { ENEMIES, ARCHETYPE_SPECIAL_MAP, getSpecialById, ITEMS, COMBAT_CONFIG } from '../data/loader';
import { ALL_EQUIPMENT_IDS, ALL_MOD_ITEM_IDS, EQUIPMENT_STATS } from '../data/equipment';
import { WEAPON_MODS } from '../data/weapon-mods';

// ==========================================
// #3+#29 — STAT BONUS HELPERS (EFFECTS-DRIVEN)
// ==========================================

/** Collect all on_equip effects from weapon, armor, accessory, and weapon mods */
function getOnEquipEffects(char: Character): SpecialEffect[] {
  const effects: SpecialEffect[] = [];
  // Weapon effects
  if (char.weapon) {
    for (const e of (char.weapon.effects || [])) {
      if (e.trigger === 'on_equip' || !e.trigger) effects.push(e);
    }
    // Installed mod effects
    if (char.weapon.modSlots) {
      for (const modId of char.weapon.modSlots) {
        const mod = WEAPON_MODS[modId];
        if (mod?.effects) {
          for (const e of mod.effects) {
            if (e.trigger === 'on_equip' || !e.trigger) effects.push(e);
          }
        }
      }
    }
  }
  // Armor effects
  if (char.armor?.effects) {
    for (const e of char.armor.effects) {
      if (e.trigger === 'on_equip' || !e.trigger) effects.push(e);
    }
  }
  // Accessory effects
  if (char.accessory?.effects) {
    for (const e of char.accessory.effects) {
      if (e.trigger === 'on_equip' || !e.trigger) effects.push(e);
    }
  }
  return effects;
}

/** Get total DEF for a character including armor + accessories (via on_equip effects) */
export function getCharacterDef(char: Character): number {
  let def = char.baseDef;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'buff_stat' && e.stat === 'def') {
      def += e.flat ? e.amount : Math.floor(char.baseDef * e.amount / 100);
    }
  }
  return def;
}

/** Get total ATK for a character including weapon + accessories + mods (via on_equip effects) */
export function getCharacterAtk(char: Character): number {
  let atk = char.baseAtk;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'buff_stat' && e.stat === 'atk') {
      atk += e.flat ? e.amount : Math.floor(char.baseAtk * e.amount / 100);
    }
  }
  return atk;
}

/** Get total maxHP for a character including equipment (via on_equip effects) */
export function getCharacterMaxHp(char: Character): number {
  let hp = char.maxHp;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'buff_stat' && e.stat === 'hp') {
      hp += e.flat ? e.amount : Math.floor(char.maxHp * e.amount / 100);
    }
  }
  return hp;
}

/** Get total SPD for a character including equipment (via on_equip effects) */
export function getCharacterSpd(char: Character): number {
  let spd = char.baseSpd;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'buff_stat' && e.stat === 'spd') {
      spd += e.flat ? e.amount : Math.floor(char.baseSpd * e.amount / 100);
    }
  }
  return spd;
}

/** Get extra crit chance from weapon mods + accessories (via on_equip effects) */
export function getCharacterCritBonus(char: Character): number {
  let crit = 0;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'buff_stat' && e.stat === 'crit' && e.flat) {
      crit += e.amount;
    }
  }
  return crit;
}

/** Get status effect apply chance bonus from weapon mods (via on_equip effects) */
export function getCharacterStatusBonus(char: Character): number {
  let statusBonus = 0;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'status_chance_boost') {
      statusBonus += e.amount;
    }
  }
  return statusBonus;
}

// ==========================================
// ACTIVE EFFECTS-AWARE STAT HELPERS
// Compute effective stats considering both equipment and active combat effects
// ==========================================

/** Get effective ATK for a character including equipment + active buff/debuff effects */
export function getEffectiveAtk(char: Character, activeEffects?: ActiveCombatEffect[]): number {
  let atk = getCharacterAtk(char);
  if (activeEffects) {
    for (const ae of activeEffects) {
      if (ae.type === 'buff_stat' && ae.stat === 'atk' && ae.targetId === char.id && ae.remainingTurns > 0) {
        atk += Math.floor(char.baseAtk * ae.amount / 100);
      }
      if (ae.type === 'debuff_stat' && ae.stat === 'atk' && ae.targetId === char.id && ae.remainingTurns > 0) {
        // ae.amount is already negative for debuffs
        atk += Math.floor(char.baseAtk * ae.amount / 100);
      }
    }
  }
  return Math.max(1, atk);
}

/** Get effective DEF for a character including equipment + active buff/debuff effects */
export function getEffectiveDef(char: Character, activeEffects?: ActiveCombatEffect[]): number {
  let def = getCharacterDef(char);
  if (activeEffects) {
    for (const ae of activeEffects) {
      if (ae.type === 'buff_stat' && ae.stat === 'def' && ae.targetId === char.id && ae.remainingTurns > 0) {
        def += Math.floor(char.baseDef * ae.amount / 100);
      }
      if (ae.type === 'debuff_stat' && ae.stat === 'def' && ae.targetId === char.id && ae.remainingTurns > 0) {
        def += Math.floor(char.baseDef * ae.amount / 100);
      }
    }
  }
  return Math.max(0, def);
}

/** Get effective DEF for an enemy including active debuff effects */
export function getEffectiveEnemyDef(enemy: EnemyInstance, activeEffects?: ActiveCombatEffect[]): number {
  let def = enemy.def;
  if (activeEffects) {
    for (const ae of activeEffects) {
      if (ae.type === 'debuff_stat' && ae.stat === 'def' && ae.targetId === enemy.id && ae.remainingTurns > 0) {
        // ae.amount is negative for debuffs
        def += Math.floor(enemy.def * ae.amount / 100);
      }
      if (ae.type === 'buff_stat' && ae.stat === 'def' && ae.targetId === enemy.id && ae.remainingTurns > 0) {
        def += Math.floor(enemy.def * ae.amount / 100);
      }
    }
  }
  return Math.max(0, def);
}

/** Get effective SPD for a character including equipment + active buff/debuff effects */
export function getEffectiveSpd(char: Character, activeEffects?: ActiveCombatEffect[]): number {
  let spd = getCharacterSpd(char);
  if (activeEffects) {
    for (const ae of activeEffects) {
      if (ae.type === 'buff_stat' && ae.stat === 'spd' && ae.targetId === char.id && ae.remainingTurns > 0) {
        spd += Math.floor(char.baseSpd * ae.amount / 100);
      }
      if (ae.type === 'debuff_stat' && ae.stat === 'spd' && ae.targetId === char.id && ae.remainingTurns > 0) {
        spd += Math.floor(char.baseSpd * ae.amount / 100);
      }
    }
  }
  return Math.max(1, spd);
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

// Control archetype passive: +X% chance to apply status effects (configurable)
function getStatusChance(baseChance: number, archetype?: Archetype): number {
  if (archetype === 'control') {
    return Math.min(baseChance + COMBAT_CONFIG.controlStatusBonus, 100);
  }
  return baseChance;
}

/** Apply weapon mod status bonus to base chance */
function applyStatusBonus(baseChance: number, character: Character): number {
  const bonus = getCharacterStatusBonus(character);
  return Math.min(baseChance + bonus, 100);
}

/** Get total status resistance for a character from equipment on_equip effects */
function getStatusResist(char: Character, statusType: string): number {
  let resist = 0;
  for (const e of getOnEquipEffects(char)) {
    if (e.type === 'status_resist') {
      const sr = e as SpecialEffect & { type: 'status_resist' };
      if (sr.statusType === statusType || sr.statusType === 'all') {
        resist += sr.value;
      }
    }
  }
  return Math.min(resist, 100); // Cap at 100%
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
  forceHit: boolean = false, // when true, skip miss check and use no-miss variance (Sparo Mirato)
): { damage: number; isCritical: boolean; isMiss: boolean } {
  // Miss chance (reduced by dodge bonus from mods — effectively increases hit rate)
  if (!forceHit) {
    const missChance = COMBAT_CONFIG.missChance;
    if (chance(missChance)) {
      return { damage: 0, isCritical: false, isMiss: true };
    }
  }

  // Base damage formula — tighter variance when forceHit (guaranteed hit)
  const varMin = forceHit ? COMBAT_CONFIG.noMissDmgVarianceMin : COMBAT_CONFIG.damageVarianceMin;
  const varMax = forceHit ? COMBAT_CONFIG.noMissDmgVarianceMax : COMBAT_CONFIG.damageVarianceMax;
  let baseDamage = attackerAtk * random(varMin, varMax) / 100;

  // Adrenaline buff: configurable damage bonus
  if (attackerHasAdrenaline) {
    baseDamage *= COMBAT_CONFIG.adrenalineDmgBonus;
  }
  
  // Defense reduction
  let defMultiplier = defenderDef / (defenderDef + COMBAT_CONFIG.defenseConstant);
  
  // Defending bonus
  if (isDefending) {
    defMultiplier = Math.min(defMultiplier * COMBAT_CONFIG.defendMultiplier, COMBAT_CONFIG.maxDefendReduction);
  }

  let damage = Math.max(1, Math.floor(baseDamage * (1 - defMultiplier)));

  // Critical hit (base + archetype + #3 mods + #29 accessories)
  let critChance = COMBAT_CONFIG.baseCritChance + critBonus;
  if (attackerArchetype === 'dps') critChance = COMBAT_CONFIG.dpsCritChance + critBonus;
  const isCritical = chance(critChance);
  if (isCritical) {
    damage = Math.floor(damage * COMBAT_CONFIG.critMultiplier);
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
  return calculateDamage(attackerAtk, defenderDef, isDefending, attackerArchetype, attackerHasAdrenaline, critBonus, true);
}

export function calculateHeal(
  baseHeal: number,
  healerArchetype?: Archetype,
): number {
  let heal = baseHeal;
  if (healerArchetype === 'healer') {
    if (chance(COMBAT_CONFIG.healerCritHealChance)) heal = Math.floor(heal * COMBAT_CONFIG.healerCritHealMult);
  }
  return heal;
}

// ==========================================
// COMBAT ACTIONS
// ==========================================

/** Get the ammo item ID required by a ranged weapon, from the DB-loaded item's ammoType field.
 *  Returns null for melee weapons or unknown items. */
export function getWeaponAmmoType(weaponItemId: string): string | null {
  return ITEMS[weaponItemId]?.ammoType ?? null;
}

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
  activeEffects?: ActiveCombatEffect[],
): ActionResult {
  const weapon = character.weapon;
  const isRanged = weapon?.type === 'ranged';
  let consumedAmmoUid: string | undefined;
  let isMeleeFallback = false;

  // Check ammo for ranged weapons
  let actionLabel = 'Attacco';

  if (isRanged) {
    const requiredAmmoId = getWeaponAmmoType(weapon!.itemId);
    const ammoItem = requiredAmmoId
      ? character.inventory.find(i => i.itemId === requiredAmmoId && (i.quantity || 0) > 0)
      : undefined;

    if (ammoItem) {
      // Has ammo → full ranged attack
      consumedAmmoUid = ammoItem.uid;
      actionLabel = `${weapon!.name}`;
    } else {
      // No ammo → melee fallback (butt/pistol whip)
      isMeleeFallback = true;
      actionLabel = 'Colpo corpo a corpo';
    }
  }

  const totalAtk = getEffectiveAtk(character, activeEffects);
  const critBonus = getCharacterCritBonus(character);
  const hasAdrenaline = character.statusEffects.includes('adrenaline');
  const effectiveEnemyDef = getEffectiveEnemyDef(enemy, activeEffects);
  const { damage, isCritical, isMiss } = calculateDamage(
    totalAtk,
    effectiveEnemyDef,
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
    // Only process if weapon has on_hit effects — skip if all effects are passive (on_equip, etc.)
    const onHitEffects = weaponDef?.effects?.filter(e => !e.trigger || e.trigger === 'on_hit');
    if (onHitEffects && onHitEffects.length > 0) {
      const weaponResult = executeEffectsForTrigger(
        weaponDef!.effects!, 'on_hit', character, updatedEnemy, turn, party, enemies, 'weapon', character.weapon.name, activeEffects, weaponDef!.icon,
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
    const id = slot === 'special1Id' ? character.special1Id : character.special2Id;
    return id || undefined;
  }
  // Predefined archetypes use the mapping
  const map = ARCHETYPE_SPECIAL_MAP[character.archetype];
  if (!map) return undefined;
  const id = slot === 'special1Id' ? map.special1 : map.special2;
  // Return undefined for empty strings (map not built yet or missing ability)
  return id || undefined;
}

export function executePlayerSpecial(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies?: EnemyInstance[],
  activeEffects?: ActiveCombatEffect[],
): ActionResult {
  const specialId = resolveSpecialId(character, 'special1Id');
  const special = specialId ? getSpecialById(specialId) : undefined;

  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: `${character.name} non ha abilità speciale.` },
    };
  }

  return executeSpecialAbility(character, target, turn, party, enemies || [], special, activeEffects);
}

export function executePlayerSpecial2(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  activeEffects?: ActiveCombatEffect[],
): ActionResult {
  const specialId = resolveSpecialId(character, 'special2Id');
  const special = specialId ? getSpecialById(specialId) : undefined;

  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale2', message: `${character.name} non ha abilità speciale secondaria.` },
    };
  }

  return executeSpecialAbility(character, target, turn, party, enemies, special, activeEffects);
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
    // Path 1: Target has an 'id' property — find the matching enemy in the enemies array.
    // Always try ID-based lookup first, regardless of whether definitionId is present,
    // to ensure we use the fresh enemy instance from the enemies array rather than a
    // potentially stale target reference.
    const targetId = (target as { id?: string }).id;
    if (targetId) {
      // Try alive first
      const matched = enemies.find(e => e.id === targetId && e.currentHp > 0);
      if (matched) {
        return { enemies: [matched], allies: [] };
      }
      // Also try dead enemies (for overkill / effects on dead targets)
      const matchedDead = enemies.find(e => e.id === targetId);
      if (matchedDead) {
        return { enemies: [matchedDead], allies: [] };
      }
    }
    // Path 2: Target is a proper EnemyInstance with definitionId but ID lookup failed —
    // use the target directly as a last resort (e.g., newly spawned enemy not yet in array)
    if ('currentHp' in target && 'definitionId' in target) {
      return { enemies: [target as EnemyInstance], allies: [] };
    }
    // Path 3: REMOVED — name-based fallback was dangerous when multiple enemies
    // share the same name (e.g., 3 Zombies). Could cause abilities to hit the wrong
    // enemy. Only ID-based resolution is safe.
    // If no target was matched, return empty and let the caller handle it.
    return { enemies: [], allies: [] };
  }
  if (t === 'all_enemies') {
    return { enemies: enemies.filter(e => e.currentHp > 0), allies: [] };
  }
  if (t === 'ally' || t === 'one_ally') {
    if ('statusEffects' in target && !('definitionId' in target)) {
      return { enemies: [], allies: [target as Character] };
    }
    return { enemies: [], allies: [character] };
  }
  if (t === 'all_allies') {
    // Include ALL party members (even dead) to support revive effects
    // Alive-only filtering is handled by individual effect handlers where needed
    return { enemies: [], allies: [...party] };
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
  activeEffects?: ActiveCombatEffect[],
): Partial<ActionResult> {
  const { target: effTarget, powerMultiplier, excludePrimaryTarget, noMiss, guaranteedCrit, ignoreDef } = effect;

  // ── PRIMARY TARGET RESOLUTION ──
  // Always determine the "primary enemy" from the `target` parameter.
  // This is the enemy the player selected — exactly like basic attack does it.
  // The store already resolved the correct target; we just need to find it in the enemies array.
  const targetId = (target as { id?: string }).id;
  let primaryEnemy: EnemyInstance | null = null;

  if (targetId) {
    // Always look up the fresh instance by ID in the current enemies array.
    // Try alive first, then allow dead (for overkill scenarios in multi-effect abilities).
    primaryEnemy = enemies.find(e => e.id === targetId && e.currentHp > 0) || null;
    if (!primaryEnemy) {
      primaryEnemy = enemies.find(e => e.id === targetId) || null;
    }
    // SAFETY FALLBACK: If ID lookup failed for a single-target effect, try using
    // the passed target directly. The store resolved the correct enemy instance
    // from selectedTarget, so if it's an EnemyInstance with a valid definitionId,
    // we can use it as a last resort. This prevents abilities like Colpo Mortale
    // or Raffica's first effect from silently doing nothing when the ID-based
    // lookup fails due to timing/state synchronization edge cases.
    if (!primaryEnemy && (effTarget === 'enemy') && 'definitionId' in target && 'currentHp' in target) {
      console.warn(`[Combat] handleDealDamage: target ${targetId} not found in enemies array ` +
        `(enemies=[${enemies.map(e => `${e.id}(${e.currentHp}/${e.maxHp})`).join(', ')}]), ` +
        `using passed target directly as fallback.`);
      primaryEnemy = target as EnemyInstance;
    } else if (!primaryEnemy && (effTarget === 'enemy' || effTarget === 'random_enemy')) {
      console.warn(`[Combat] handleDealDamage: target ${targetId} not found in enemies array ` +
        `(enemies=[${enemies.map(e => `${e.id}(${e.currentHp}/${e.maxHp})`).join(', ')}]), skipping effect.`);
    }
  }

  // ── DETERMINE WHICH ENEMIES TO DAMAGE ──
  let enemyTargets: EnemyInstance[];

  if (effTarget === 'enemy') {
    // Single-target: use the primary enemy directly (like basic attack)
    // FIX: If primaryEnemy was resolved via fallback (direct target reference),
    // ensure it still exists in the current enemies array for proper damage application.
    // If not found, try matching by definitionId (for cases where the enemy was
    // re-instantiated between target selection and effect execution).
    if (primaryEnemy) {
      const inArray = enemies.find(e => e.id === primaryEnemy.id);
      if (inArray) {
        enemyTargets = [inArray];
      } else if ('definitionId' in primaryEnemy) {
        // Fallback: match by definitionId among alive enemies of the same type
        const byDef = enemies.find(e => e.definitionId === (primaryEnemy as EnemyInstance).definitionId && e.currentHp > 0);
        if (byDef) {
          console.warn(`[Combat] handleDealDamage: target ${targetId} not in enemies, matched by definitionId to ${byDef.id}`);
          primaryEnemy = byDef;
          enemyTargets = [byDef];
        } else {
          enemyTargets = [];
        }
      } else {
        enemyTargets = [];
      }
    } else {
      enemyTargets = [];
    }
  } else if (effTarget === 'all_enemies') {
    // AoE: all alive enemies
    enemyTargets = enemies.filter(e => e.currentHp > 0);
  } else if (effTarget === 'random_enemy') {
    const alive = enemies.filter(e => e.currentHp > 0);
    enemyTargets = alive.length > 0 ? [alive[Math.floor(Math.random() * alive.length)]] : [];
  } else {
    // Other target types — use resolveTargets as fallback
    const resolved = resolveTargets(effect, character, target, party, enemies);
    enemyTargets = resolved.enemies;
  }

  if (enemyTargets.length === 0) return {};

  // When excludePrimaryTarget is true, check if there are any non-primary targets.
  // FIX: If primaryEnemy is null (target resolution failed), do NOT skip this effect
  // for AoE abilities — damage all valid targets instead. This prevents Raffica's
  // secondary effect (all_enemies + excludePrimaryTarget) from being silently
  // dropped when the target lookup fails.
  if (excludePrimaryTarget && primaryEnemy) {
    const nonPrimaryTargets = enemyTargets.filter(et => et.id !== primaryEnemy.id);
    if (nonPrimaryTargets.length === 0) return {};
  }

  let updatedEnemies: EnemyInstance[] | undefined;
  let totalDmg = 0;
  let primaryDmg = 0;
  let isCritical = false;
  let isMiss = false;
  let totalReflectDmg = 0;
  const splashLog: string[] = [];
  // Track primary target ID for reporting even when primaryEnemy is null
  const primaryTargetId = primaryEnemy?.id || enemyTargets[0]?.id;

  updatedEnemies = enemies.map(e => {
    const isPrimary = primaryEnemy && e.id === primaryEnemy.id;
    // FIX: Also treat the first resolved target as primary for damage tracking
    // when primaryEnemy is null (e.g., target was passed as Character instead of EnemyInstance)
    const isPrimaryForTracking = isPrimary || (!primaryEnemy && e.id === primaryTargetId);
    if (excludePrimaryTarget && isPrimary) return e;

    const isTarget = enemyTargets.some(et => et.id === e.id);
    if (!isTarget) return e;

    const totalAtk = getEffectiveAtk(character, activeEffects) * powerMultiplier;
    const critBonus = getCharacterCritBonus(character);
    const hasAdrenaline = character.statusEffects.includes('adrenaline');
    const effectiveDef = ignoreDef ? 0 : getEffectiveEnemyDef(e, activeEffects);
    const calcResult = noMiss
      ? calculateDamageNoMiss(totalAtk, effectiveDef, e.isDefending, character.archetype, hasAdrenaline, critBonus)
      : calculateDamage(totalAtk, effectiveDef, e.isDefending, character.archetype, hasAdrenaline, critBonus);

    if (calcResult.isMiss) {
      if (isPrimary || isPrimaryForTracking) isMiss = true;
      return { ...e, isDefending: false };
    }

    let finalDamage = calcResult.damage;
    // basedOnTargetHp: override ATK-based damage with HP-based damage
    // Must be calculated BEFORE guaranteedCrit so crit multiplier applies on top
    if (typeof effect.basedOnTargetHp === 'number' && effect.basedOnTargetHp > 0) {
      finalDamage = Math.floor(e.maxHp * effect.basedOnTargetHp / 100);
      // If natural crit was rolled, the multiplier was already applied to calcResult.damage
      // but we replaced it with HP-based damage, so re-apply the crit multiplier
      if (calcResult.isCritical) {
        finalDamage = Math.floor(finalDamage * COMBAT_CONFIG.critMultiplier);
      }
    }
    // guaranteedCrit: force critical damage multiplier if the random roll didn't crit
    if (guaranteedCrit && !calcResult.isCritical) {
      finalDamage = Math.floor(finalDamage * COMBAT_CONFIG.critMultiplier);
    }

    // FIX: Ensure minimum 1 damage when attack hits (before shield absorption)
    finalDamage = Math.max(1, finalDamage);

    // Shield absorption: check active shield effects on this enemy
    if (activeEffects) {
      const shieldEffects = activeEffects.filter(ae => ae.type === 'shield' && ae.targetId === e.id && ae.shieldHp && ae.shieldHp > 0);
      for (const shield of shieldEffects) {
        if (finalDamage <= 0) break;
        const absorbed = Math.min(shield.shieldHp!, finalDamage);
        shield.shieldHp! -= absorbed;
        finalDamage -= absorbed;
        if (isPrimary || isPrimaryForTracking) {
          splashLog.push(`🛡️ Scudo di ${e.name} assorbe ${absorbed} danni!`);
        }
        if (shield.shieldHp! <= 0) {
          splashLog.push(`Lo scudo di ${e.name} si rompe!`);
        }
      }
      // FIX: Ensure finalDamage doesn't go below 0 after shield absorption
      // (shields can absorb more than the damage dealt in edge cases)
      finalDamage = Math.max(0, finalDamage);
    }

    // Reflect: check active reflect effects on this enemy
    if (activeEffects) {
      const reflectEffects = activeEffects.filter(ae => ae.type === 'reflect' && ae.targetId === e.id && ae.remainingTurns > 0);
      for (const ref of reflectEffects) {
        // FIX: Use finalDamage (post-shield) instead of pre-shield calcResult.damage
        const reflectDmg = Math.floor(finalDamage * (ref.amount || 0) / 100);
        if (reflectDmg > 0) {
          totalReflectDmg += reflectDmg;
          splashLog.push(`🔄 ${e.name} riflette ${reflectDmg} danni!`);
        }
      }
    }

    totalDmg += finalDamage;
    if (isPrimary || isPrimaryForTracking) {
      primaryDmg = finalDamage;
      isCritical = guaranteedCrit || calcResult.isCritical;
    }

    if (!isPrimary && !isPrimaryForTracking) {
      const isCritForSplash = guaranteedCrit || calcResult.isCritical;
      if (finalDamage > 0) {
        splashLog.push(`${e.name}: ${finalDamage} danni${isCritForSplash ? ' 💥' : ''}`);
      }
    }

    const newHp = Math.max(0, e.currentHp - finalDamage);
    return { ...e, currentHp: newHp, isDefending: false };
  });

  let message = '';
  const primaryTarget = primaryEnemy || enemyTargets[0];
  if (primaryTarget && !excludePrimaryTarget) {
    if (isMiss) {
      message = `${character.name} manca ${primaryTarget.name}!`;
    } else if (isCritical || guaranteedCrit) {
      message = `${character.name} infligge un COLPO CRITICO a ${primaryTarget.name} per ${primaryDmg} danni!`;
    } else {
      message = `${character.name} infligge ${primaryDmg} danni a ${primaryTarget.name}.`;
    }
  } else if (excludePrimaryTarget && totalDmg > 0) {
    // Splash-only damage (primary target excluded) — e.g., Raffica's secondary effect
    message = `Danni collaterali: ${splashLog.join(', ')}.`;
  } else {
    message = `${character.name} infligge ${totalDmg} danni totali!`;
  }
  if (splashLog.length > 0 && !excludePrimaryTarget) {
    message += ` Danni collaterali: ${splashLog.join(', ')}.`;
  }

  // When excludePrimaryTarget is true, do NOT set targetName/targetId in the log
  // to avoid overwriting the primary target from a previous effect in executeEffectsInternal.
  // Only set targetIds with the actual damaged targets (excluding primary).
  const splashTargetIds = (() => {
    let ids = enemyTargets.map(t => t.id);
    if (excludePrimaryTarget && primaryEnemy) {
      ids = ids.filter(id => id !== primaryEnemy.id);
    }
    return ids.length > 0 ? ids : undefined;
  })();

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      targetName: excludePrimaryTarget ? undefined : primaryTarget?.name,
      targetId: excludePrimaryTarget ? undefined : primaryTarget?.id,
      targetIds: splashTargetIds,
      damage: totalDmg, isCritical: isCritical || guaranteedCrit, isMiss,
      message,
    },
    updatedEnemies,
    // Apply reflect damage to the attacking character
    updatedCharacter: totalReflectDmg > 0
      ? { ...character, currentHp: Math.max(0, character.currentHp - totalReflectDmg) }
      : undefined,
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
  let { allies: healTargets } = resolveTargets(effect, character, target, party, enemies);
  if (healTargets.length === 0) return {};
  // FIX: Filter out dead characters for all_allies heals — only handleRevive should revive
  if (effect.target === 'all_allies') {
    healTargets = healTargets.filter(ht => ht.currentHp > 0);
    if (healTargets.length === 0) return {};
  }

  let updatedParty: Character[] | undefined;
  let totalHeal = 0;
  const healPerTarget: Record<string, number> = {};

  updatedParty = party.map(p => {
    const isTarget = healTargets.some(ht => ht.id === p.id);
    if (!isTarget) return p;

    // percent can be: boolean true (use amount as %), or a number (use directly as %)
    let healAmount: number;
    if (effect.percent) {
      const pctValue = typeof effect.percent === 'number' ? effect.percent : (effect.amount || 0);
      healAmount = Math.floor(p.maxHp * pctValue / 100);
    } else {
      healAmount = effect.amount || 0;
    }
    const actualHeal = calculateHeal(healAmount, character.archetype);
    totalHeal += actualHeal;
    healPerTarget[p.id] = actualHeal;
    // Use effective maxHp (includes equipment bonuses) instead of base maxHp
    const effectiveMaxHp = getCharacterMaxHp(p);
    const newHp = Math.min(effectiveMaxHp, p.currentHp + actualHeal);
    return { ...p, currentHp: newHp };
  });

  const healTarget = healTargets[0];
  const isSelf = healTarget.id === character.id;
  const message = healTargets.length > 1
    ? `${character.name} cura tutti gli alleati! (${healTargets.map(t => `${t.name}: +${healPerTarget[t.id]} HP`).join(', ')})`
    : isSelf
      ? `${character.name} si è curato di ${totalHeal} HP!`
      : `${character.name} cura ${healTarget.name} di ${totalHeal} HP!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      targetName: healTarget.name, targetId: healTarget.id,
      // Always include targetIds for multi-target heals so animations show on all targets
      targetIds: healTargets.length > 1 ? healTargets.map(t => t.id) : undefined,
      heal: totalHeal,
      // Always provide healPerTarget so the animation shows per-target values, not the total
      healPerTarget: healPerTarget,
      message,
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
      // FIX: Apply status_resist from equipment
      const resistAmount = getStatusResist(p, statusType);
      const finalChance = Math.max(0, effectiveChance - resistAmount);
      if (chance(finalChance) && !updated.statusEffects.includes(statusType)) {
        updated.statusEffects = [...updated.statusEffects, statusType];
        appliedNames.push(p.name);
      }
      return updated;
    });
  }

  if (appliedNames.length === 0) {
    // Provide feedback that the status was attempted but failed
    const failedTargets = statusTargets.map(t => t.name);
    const statusLabel = statusType === 'poison' ? 'avvelenato' : statusType === 'stunned' ? 'stordito' : statusType === 'bleeding' ? 'sanguinante' : statusType === 'adrenaline' ? 'adrenalina' : statusType;
    const failedMessage = failedTargets.length > 1
      ? `${failedTargets.join(', ')} resistono a ${statusLabel}!`
      : `${failedTargets[0]} resiste a ${statusLabel}!`;
    return {
      log: {
        turn, actorName: character.name, actorType: 'player', action: 'Speciale',
        message: failedMessage,
      },
    };
  }

  const statusLabel = statusType === 'poison' ? 'avvelenato' : statusType === 'stunned' ? 'stordito' : statusType === 'bleeding' ? 'sanguinante' : statusType === 'adrenaline' ? 'adrenalina' : statusType;
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

  if (curedEntries.length === 0) {
    // No statuses were removed — provide feedback
    const selfTarget = statusTargets.length === 1 && statusTargets[0].id === character.id;
    const message = selfTarget
      ? `${character.name} non ha status negativi da rimuovere.`
      : `Nessun status negativo da rimuovere da ${statusTargets.map(t => t.name).join(', ')}.`;
    return {
      log: {
        turn, actorName: character.name, actorType: 'player', action: 'Speciale',
        message,
      },
    };
  }

  const allSelf = curedEntries.length === 1 && statusTargets.length === 1 && statusTargets[0].id === character.id;
  const message = allSelf
    ? `${character.name} si è liberato degli status negativi!`
    : `Status negativi rimossi da ${curedEntries.join(', ')}!`;
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
  let { allies: buffTargets } = resolveTargets(effect, character, target, party, enemies);
  // Filter out dead party members — buffs on dead characters are wasteful
  // (revive effects are handled separately and need all_allies to include dead)
  if (effect.target === 'all_allies') {
    buffTargets = buffTargets.filter(bt => bt.currentHp > 0);
  }
  if (buffTargets.length === 0) return {};

  // FIX: Ensure duration has a valid value — if undefined (e.g., on_equip effect used
  // accidentally in combat), default to 3 turns to avoid permanent buffs
  const buffDuration = effect.duration && effect.duration > 0 ? effect.duration : 3;

  const newEffects: ActiveCombatEffect[] = buffTargets.map(bt => ({
    id: `buff_${character.id}_${effect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'buff_stat' as const,
    targetId: bt.id,
    sourceId: character.id,
    stat: effect.stat,
    amount: effect.amount,
    remainingTurns: buffDuration,
  }));

  const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : effect.stat === 'spd' ? 'VELOCITÀ' : effect.stat === 'crit' ? 'CRITICO' : effect.stat.toUpperCase();
  const isSelf = buffTargets.length === 1 && buffTargets[0].id === character.id;
  const message = buffTargets.length > 1
    ? `${character.name} potenzia il gruppo: +${effect.amount}% ${statLabel} per ${buffDuration} turni!`
    : isSelf
      ? `${character.name} potenzia se stesso: +${effect.amount}% ${statLabel} per ${buffDuration} turni!`
      : `${character.name} potenzia ${buffTargets[0].name}: +${effect.amount}% ${statLabel} per ${buffDuration} turni!`;

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

  // FIX: Ensure duration has a valid value — default to 3 turns if undefined
  const debuffDuration = effect.duration && effect.duration > 0 ? effect.duration : 3;

  const newEffects: ActiveCombatEffect[] = debuffTargets.map(dt => ({
    id: `debuff_${character.id}_${effect.stat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'debuff_stat' as const,
    targetId: dt.id,
    sourceId: character.id,
    stat: effect.stat,
    amount: -effect.amount,
    remainingTurns: debuffDuration,
  }));

  const statLabel = effect.stat === 'atk' ? 'ATTACCO' : effect.stat === 'def' ? 'DIFESA' : effect.stat === 'spd' ? 'VELOCITÀ' : effect.stat.toUpperCase();
  const message = `${character.name} riduce il ${statLabel} dei nemici di ${effect.amount}% per ${debuffDuration} turni!`;

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
  // FIX: Filter out dead characters for all_allies shields
  const aliveShieldTargets = effect.target === 'all_allies'
    ? shieldTargets.filter(st => st.currentHp > 0)
    : shieldTargets;
  if (aliveShieldTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = aliveShieldTargets.map(st => ({
    id: `shield_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'shield' as const,
    targetId: st.id,
    sourceId: character.id,
    amount: effect.amount,
    shieldHp: effect.amount,
    remainingTurns: effect.duration,
  }));

  const isSelf = aliveShieldTargets.length === 1 && aliveShieldTargets[0].id === character.id;
  const message = aliveShieldTargets.length > 1
    ? `${character.name} crea uno scudo di ${effect.amount} su tutto il gruppo per ${effect.duration} turni!`
    : isSelf
      ? `${character.name} crea uno scudo di ${effect.amount} su se stesso per ${effect.duration} turni!`
      : `${character.name} crea uno scudo di ${effect.amount} su ${aliveShieldTargets[0].name} per ${effect.duration} turni!`;

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
  // FIX: Create an ActiveCombatEffect so the taunt duration is properly tracked
  // and expired by processActiveEffectsTick
  const newEffects: ActiveCombatEffect[] = [{
    id: `taunt_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'taunt' as const,
    targetId: character.id,
    sourceId: character.id,
    remainingTurns: effect.duration,
  }];
  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    tauntTargetId: character.id,
    activeEffects: newEffects,
  };
}

function handleLifesteal(
  effect: SpecialEffect & { type: 'lifesteal' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
  activeEffects?: ActiveCombatEffect[],
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

    const totalAtk = getEffectiveAtk(character, activeEffects) * (effect.power || 1.0);
    const critBonus = getCharacterCritBonus(character);
    const hasAdrenaline = character.statusEffects.includes('adrenaline');
    const effectiveDef = getEffectiveEnemyDef(e, activeEffects);
    const calcResult = calculateDamage(totalAtk, effectiveDef, e.isDefending, character.archetype, hasAdrenaline, critBonus);

    if (calcResult.isMiss) return { ...e, isDefending: false };

    totalDmg += calcResult.damage;
    if (calcResult.isCritical) isCritical = true;

    return { ...e, currentHp: Math.max(0, e.currentHp - calcResult.damage), isDefending: false };
  });

  const healAmount = Math.floor(totalDmg * effect.percent / 100);
  if (healAmount > 0) {
    // Use effective maxHp (includes equipment bonuses) instead of base maxHp
    const effectiveMaxHp = getCharacterMaxHp(character);
    updatedCharacter = { ...character, currentHp: Math.min(effectiveMaxHp, character.currentHp + healAmount) };
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
    const reviveHp = Math.max(1, Math.floor(getCharacterMaxHp(p) * effect.hpPercent / 100));
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
  // FIX: Filter out dead characters for all_allies HoT
  const aliveHotTargets = effect.target === 'all_allies'
    ? hotTargets.filter(ht => ht.currentHp > 0)
    : hotTargets;
  if (aliveHotTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = aliveHotTargets.map(ht => ({
    id: `hot_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'hot' as const,
    targetId: ht.id,
    sourceId: character.id,
    amount: effect.amountPerTurn,
    remainingTurns: effect.duration,
  }));

  const isSelf = aliveHotTargets.length === 1 && aliveHotTargets[0].id === character.id;
  const message = aliveHotTargets.length > 1
    ? `${character.name} applica cura nel tempo a tutto il gruppo: +${effect.amountPerTurn} HP/turno per ${effect.duration} turni!`
    : isSelf
      ? `${character.name} applica cura nel tempo a se stesso: +${effect.amountPerTurn} HP/turno per ${effect.duration} turni!`
      : `${character.name} applica cura nel tempo a ${aliveHotTargets[0].name}: +${effect.amountPerTurn} HP/turno per ${effect.duration} turni!`;

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
  // FIX: Filter out dead characters for all_allies reflect
  const aliveReflectTargets = effect.target === 'all_allies'
    ? reflectTargets.filter(rt => rt.currentHp > 0)
    : reflectTargets;
  if (aliveReflectTargets.length === 0) return {};

  const newEffects: ActiveCombatEffect[] = aliveReflectTargets.map(rt => ({
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

function handleAddSlots(
  effect: SpecialEffect & { type: 'add_slots' },
  character: Character,
  target: EnemyInstance | Character,
  party: Character[],
  enemies: EnemyInstance[],
  turn: number,
): Partial<ActionResult> {
  const { allies: slotTargets } = resolveTargets(effect, character, target, party, enemies);
  if (slotTargets.length === 0) return {};

  // FIX: Actually add inventory slots to the target characters
  let updatedParty: Character[] | undefined;
  const maxSlotsCap = 30; // reasonable upper cap
  const appliedNames: string[] = [];

  updatedParty = party.map(p => {
    const isTarget = slotTargets.some(st => st.id === p.id);
    if (!isTarget) return p;
    const newSlots = Math.min(maxSlotsCap, p.maxInventorySlots + effect.amount);
    if (newSlots > p.maxInventorySlots) {
      appliedNames.push(p.name);
      return { ...p, maxInventorySlots: newSlots };
    }
    return p;
  });

  const isSelf = slotTargets.length === 1 && slotTargets[0].id === character.id;
  const message = appliedNames.length > 0
    ? (isSelf
      ? `${character.name} espande l'inventario di +${effect.amount} slot! (${appliedNames[0]}: ${updatedParty!.find(p => appliedNames.includes(p.name))?.maxInventorySlots} slot)`
      : `${character.name} espande l'inventario: ${appliedNames.map(n => `${n} +${effect.amount} slot`).join(', ')}!`)
    : `${character.name} non può espandere ulteriormente l'inventario!`;

  return {
    log: {
      turn, actorName: character.name, actorType: 'player', action: 'Speciale',
      message,
    },
    updatedParty,
  };
}

// ==========================================
// UNIFIED EFFECT TRIGGER SYSTEM
// Reusable executor for item/equipment/passive/special effects
// ==========================================

/**
 * Internal unified effect execution engine.
 * Processes an array of effects and accumulates their results into a single ActionResult.
 *
 * Differences encapsulated by parameters:
 * - `actionLabel`:      what appears in the log's action field (e.g. special name, item name, "Effetto")
 * - `sourceType`:       if provided, passed to handleApplyStatus for weapon mod status bonus,
 *                        and stamped onto active combat effects (buff/debuff/shield/hot/reflect)
 * - `checkActivationChance`: if true, individual effect chance rolls can skip the effect
 *                            (used by items/equipment; specials always execute all their effects)
 */
function executeEffectsInternal(
  effects: SpecialEffect[],
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  actionLabel: string,
  sourceType?: 'special' | 'weapon' | 'armor' | 'accessory' | 'item',
  checkActivationChance: boolean = false,
  activeEffects?: ActiveCombatEffect[],
  sourceIcon?: string,
  sourceAbilityId?: string,
): ActionResult {
  if (effects.length === 0) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: actionLabel, message: `${character.name} usa ${actionLabel} ma non ha effetti!` },
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
  const mergedHealPerTarget: Record<string, number> = {};
  let anyCritical = false;
  let anyMiss = false;
  let primaryTargetName = '';
  let primaryTargetId = '';
  let primaryStatusEffect: string | undefined;
  const allTargetIds: string[] = [];  // Collect all target IDs for multi-target animations

  for (const effect of effects) {
    // Check activation chance (if enabled and specified)
    if (checkActivationChance && effect.type !== 'apply_status' && effect.chance !== undefined && effect.chance < 100) {
      if (!chance(effect.chance)) continue;
    }

    let partial: Partial<ActionResult> = {};

    switch (effect.type) {
      case 'deal_damage':
        partial = handleDealDamage(effect, currentCharacter, target, currentParty, currentEnemies, turn, activeEffects);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        // Propagate reflect damage to the attacking character
        if (partial.updatedCharacter) currentCharacter = partial.updatedCharacter;
        if (partial.log) {
          // FIX: Use != null instead of truthy check to handle damage=0 correctly
          if (partial.log.damage != null) totalDamage += partial.log.damage;
          if (partial.log.isCritical) anyCritical = true;
          if (partial.log.isMiss) anyMiss = true;
          if (partial.log.targetName) { primaryTargetName = partial.log.targetName; primaryTargetId = partial.log.targetId || ''; }
          if (partial.log.targetIds) allTargetIds.push(...partial.log.targetIds);
        }
        break;

      case 'heal':
        partial = handleHeal(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) {
          currentParty = partial.updatedParty;
          // FIX: Sync currentCharacter after party update (e.g., self-heal changes HP)
          const updatedSelf = currentParty.find(p => p.id === currentCharacter.id);
          if (updatedSelf) currentCharacter = updatedSelf;
        }
        if (partial.log?.heal) totalHeal += partial.log.heal;
        if (partial.log?.healPerTarget) Object.assign(mergedHealPerTarget, partial.log.healPerTarget);
        if (partial.log?.targetId) { primaryTargetName = partial.log.targetName || ''; primaryTargetId = partial.log.targetId; }
        if (partial.log?.targetIds) allTargetIds.push(...partial.log.targetIds);
        break;

      case 'apply_status':
        partial = handleApplyStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn, sourceType);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedParty) currentParty = partial.updatedParty;
        if (partial.log?.statusEffect) primaryStatusEffect = partial.log.statusEffect;
        break;

      case 'remove_status':
        partial = handleRemoveStatus(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) {
          currentParty = partial.updatedParty;
          // FIX: Sync currentCharacter after party update (status may have been removed from self)
          const updatedSelf = currentParty.find(p => p.id === currentCharacter.id);
          if (updatedSelf) currentCharacter = updatedSelf;
        }
        break;

      case 'buff_stat':
        partial = handleBuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'debuff_stat':
        partial = handleDebuffStat(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'shield':
        partial = handleShield(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'taunt':
        partial = handleTaunt(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        if (partial.tauntTargetId) tauntTargetId = partial.tauntTargetId;
        break;

      case 'lifesteal':
        partial = handleLifesteal(effect, currentCharacter, target, currentParty, currentEnemies, turn, activeEffects);
        if (partial.updatedEnemies) currentEnemies = partial.updatedEnemies;
        if (partial.updatedCharacter) currentCharacter = partial.updatedCharacter;
        // FIX: Use != null instead of truthy check to handle damage=0 correctly
        if (partial.log?.damage != null) totalDamage += partial.log.damage;
        if (partial.log?.heal) totalHeal += partial.log.heal;
        if (partial.log?.healPerTarget) Object.assign(mergedHealPerTarget, partial.log.healPerTarget);
        break;

      case 'revive':
        partial = handleRevive(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.updatedParty) currentParty = partial.updatedParty;
        break;

      case 'hot':
        partial = handleHot(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'reflect':
        partial = handleReflect(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        if (partial.activeEffects) {
          for (const ae of partial.activeEffects) {
            if (sourceType) ae.sourceType = sourceType;
            if (sourceIcon) ae.sourceIcon = sourceIcon;
            if (sourceAbilityId) ae.sourceAbilityId = sourceAbilityId;
          }
          allActiveEffects.push(...partial.activeEffects);
        }
        break;

      case 'add_slots':
        partial = handleAddSlots(effect, currentCharacter, target, currentParty, currentEnemies, turn);
        break;

      case 'status_resist':
        // Passive effect — no combat action needed, handled in status application
        partial = {
          log: {
            turn, actorName: character.name, actorType: 'player' as const, action: actionLabel,
            message: `${character.name} aumenta la resistenza agli status negativi!`,
          },
        };
        break;

      case 'status_chance_boost':
        // Passive effect — no combat action needed, handled in status application
        partial = {
          log: {
            turn, actorName: character.name, actorType: 'player' as const, action: actionLabel,
            message: `${character.name} aumenta la probabilità di infliggre status!`,
          },
        };
        break;
    }

    if (partial.log && partial.log.message) {
      allLogParts.push(partial.log.message);
    }
  }

  // If no effect produced output (all skipped by chance or target resolution failed),
  // provide fallback feedback with diagnostic info
  if (allLogParts.length === 0) {
    // DIAGNOSTIC: Log why effects didn't activate
    const effectSummary = effects.map(e => `${e.type}:${e.target}`).join(', ');
    const enemyCount = enemies.filter(e => e.currentHp > 0).length;
    console.warn(`[Combat] Effects did not activate for ${actionLabel}: effects=[${effectSummary}] aliveEnemies=${enemyCount} targetId=${'id' in target ? (target as {id?:string}).id : 'N/A'}`);

    // FALLBACK: For deal_damage effects targeting 'enemy' with no results,
    // attempt a direct damage application using the selected target.
    // FIX: Use currentEnemies instead of the original enemies array
    // (the original may be stale if previous effects modified enemy HP).
    // FIX: Do NOT fall back to first alive enemy — this caused abilities to
    // attack the wrong target. Only use the explicitly selected target.
    const hasDamageEffect = effects.some(e => e.type === 'deal_damage');
    if (hasDamageEffect && currentEnemies.filter(e => e.currentHp > 0).length > 0) {
      let fallbackEnemy: EnemyInstance | null = null;
      if ('id' in target) {
        fallbackEnemy = currentEnemies.find(e => e.id === (target as { id: string }).id && e.currentHp > 0) || null;
      }
      // Secondary fallback: match by definitionId if target has one (enemy re-instantiated)
      if (!fallbackEnemy && 'definitionId' in target) {
        fallbackEnemy = currentEnemies.find(e => e.definitionId === (target as EnemyInstance).definitionId && e.currentHp > 0) || null;
      }
      if (!fallbackEnemy) {
        return { log: { turn, actorName: character.name, actorType: 'player', action: actionLabel, message: `${character.name} usa ${actionLabel} ma non ci sono bersagli validi!` } };
      }
      const damageEffect = effects.find(e => e.type === 'deal_damage') as SpecialEffect & { type: 'deal_damage' };
      const pm = damageEffect.powerMultiplier || 1;
      const totalAtk = getEffectiveAtk(character, activeEffects) * pm;
      const critBonus = getCharacterCritBonus(character);
      const hasAdrenaline = character.statusEffects.includes('adrenaline');
      const effectiveDef = damageEffect.ignoreDef ? 0 : getEffectiveEnemyDef(fallbackEnemy, activeEffects);
      const calcResult = damageEffect.noMiss
        ? calculateDamageNoMiss(totalAtk, effectiveDef, fallbackEnemy.isDefending, character.archetype, hasAdrenaline, critBonus)
        : calculateDamage(totalAtk, effectiveDef, fallbackEnemy.isDefending, character.archetype, hasAdrenaline, critBonus);

      let finalDamage = calcResult.damage;
      if (damageEffect.guaranteedCrit && !calcResult.isCritical) {
        finalDamage = Math.floor(finalDamage * COMBAT_CONFIG.critMultiplier);
      }
      finalDamage = Math.max(1, finalDamage);
      const isCrit = damageEffect.guaranteedCrit || calcResult.isCritical;

      const updatedEnemies = currentEnemies.map(e => {
        if (e.id === fallbackEnemy.id) {
          return { ...e, currentHp: Math.max(0, e.currentHp - finalDamage), isDefending: false };
        }
        return e;
      });

      const message = isCrit
        ? `${character.name} infligge un COLPO CRITICO a ${fallbackEnemy.name} per ${finalDamage} danni!`
        : `${character.name} infligge ${finalDamage} danni a ${fallbackEnemy.name}.`;

      return {
        log: { turn, actorName: character.name, actorType: 'player', action: actionLabel, targetName: fallbackEnemy.name, targetId: fallbackEnemy.id, damage: finalDamage, isCritical: isCrit, message },
        updatedEnemies,
      };
    }

    return {
      log: { turn, actorName: character.name, actorType: 'player', action: actionLabel, message: `${character.name} usa ${actionLabel} ma gli effetti non si attivano!` },
    };
  }

  // Build combined log message — prefix with ability name for multi-effect abilities
  let finalMessage: string;
  if (allLogParts.length === 1) {
    finalMessage = allLogParts[0];
  } else {
    // For multi-effect abilities, prepend the ability name and join effects
    finalMessage = `${character.name} usa ${actionLabel}! ${allLogParts.join(' ')}`;
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
      action: actionLabel,
      targetName: primaryTargetName || undefined,
      targetId: primaryTargetId || undefined,
      targetIds: allTargetIds.length > 0 ? allTargetIds : undefined,
      damage: totalDamage > 0 ? totalDamage : undefined,
      heal: totalHeal > 0 ? totalHeal : undefined,
      healPerTarget: Object.keys(mergedHealPerTarget).length > 0 ? mergedHealPerTarget : undefined,
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
  activeEffects?: ActiveCombatEffect[],
  sourceIcon?: string,
  sourceAbilityId?: string,
): ActionResult {
  // Filter by trigger (effects without a trigger default to matching for backwards compat)
  const filtered = effects.filter(e => !e.trigger || e.trigger === trigger);
  const actionLabel = sourceName || 'Effetto';
  return executeEffectsInternal(filtered, character, target, turn, party, enemies, actionLabel, sourceType, true, activeEffects, sourceIcon, sourceAbilityId);
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
  activeEffects?: ActiveCombatEffect[],
): ActionResult {
  if (!special) {
    return {
      log: { turn, actorName: character.name, actorType: 'player', action: 'Speciale', message: `${character.name} non ha abilità speciale.` },
    };
  }

  // Data-driven atomic effects system
  return executeEffectsDriven(character, target, turn, party, enemies, special, activeEffects);
}

/**
 * Execute a special ability's effects directly (no trigger filtering, no activation chance check).
 * Delegates to the shared executeEffectsInternal engine.
 */
function executeEffectsDriven(
  character: Character,
  target: EnemyInstance | Character,
  turn: number,
  party: Character[],
  enemies: EnemyInstance[],
  special: SpecialAbilityDefinition,
  activeEffects?: ActiveCombatEffect[],
): ActionResult {
  return executeEffectsInternal(special.effects, character, target, turn, party, enemies, special.name, undefined, false, activeEffects, special.icon, special.id);
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
  activeEffects?: ActiveCombatEffect[],
): { log: CombatLogEntry; updatedCharacter?: Character; updatedParty?: Character[]; updatedEnemies?: EnemyInstance[]; consumeItem: boolean; curedStatuses?: StatusEffect[]; activeEffects?: ActiveCombatEffect[]; appliedBuff?: { targetId: string; effect: StatusEffect; duration: number }; tauntTargetId?: string } {
  // --- Unified atomic effects system ONLY ---
  if (item.effects && item.effects.length > 0) {
    // Determine which statuses will be cured (for combatStatusDurations cleanup)
    const removedStatusEffects = item.effects
      .filter(e => (e.trigger === 'on_use' || e.trigger === undefined) && e.type === 'remove_status')
      .flatMap(e => (e as { statuses?: StatusEffect[] }).statuses || []) as StatusEffect[];

    const result = executeEffectsForTrigger(
      item.effects, 'on_use', character, target, turn, party, enemies, 'item', item.name, activeEffects, item.icon,
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
  activeEffects?: ActiveCombatEffect[],
): { log: CombatLogEntry; updatedParty: Character[]; updatedEnemies?: EnemyInstance[]; appliedStatus?: { targetId: string; effect: StatusEffect; duration: number }; activeEffects?: ActiveCombatEffect[] } {
  // FIX: Pick ability using weighted random selection based on chance field.
  // Abilities with higher chance are more likely to be selected.
  // If no abilities have chance defined, fall back to uniform random.
  let ability: EnemyAbility | null = null;
  if (enemy.abilities.length > 0) {
    const totalWeight = enemy.abilities.reduce((sum, a) => sum + (a.chance || 50), 0);
    let roll = Math.random() * totalWeight;
    for (const a of enemy.abilities) {
      roll -= (a.chance || 50);
      if (roll <= 0) {
        ability = a;
        break;
      }
    }
    // Fallback in case of floating point issues
    if (!ability) ability = enemy.abilities[enemy.abilities.length - 1];
  }

  if (!ability) {
    return {
      log: { turn, actorName: enemy.name, actorType: 'enemy', action: 'Idle', message: `${enemy.name} guarda nella direzione dei giocatori.` },
      updatedParty: party,
    };
  }
  
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
  return executeEnemyAbilityEffects(enemy, ability.effects || [], ability.name, target, turn, party, enemies || [], activeEffects);
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
  activeEffects?: ActiveCombatEffect[],
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
  const allTargetIds: string[] = [];  // Collect all target IDs for multi-target animations

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
    // FIX: Check activation chance, but SKIP apply_status effects because they
    // already handle their own chance roll internally in the handler.
    // Without this fix, apply_status chance was rolled twice — once here and once
    // in the apply_status case below — making status effects much weaker than intended.
    if (effect.chance !== undefined && effect.chance < 100 && effect.type !== 'apply_status') {
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
            // BUG FIX: removed + (p.isDefending ? 5 : 0) — calculateDamage already handles defending via its multiplier
            const defenderDef = getEffectiveDef(p, activeEffects);
            const noMiss = dmgEffect.noMiss;
            const calcResult = noMiss
              ? calculateDamageNoMiss(baseDmg, defenderDef, p.isDefending)
              : calculateDamage(baseDmg, defenderDef, p.isDefending);
            if (calcResult.isMiss) { miss = true; return { ...p, isDefending: false }; }
            let finalDmg = calcResult.damage;
            // guaranteedCrit: force critical damage multiplier if the random roll didn't crit
            if (dmgEffect.guaranteedCrit && !calcResult.isCritical) {
              finalDmg = Math.floor(finalDmg * COMBAT_CONFIG.critMultiplier);
            }
            // FIX: Ensure minimum 1 damage when attack hits (before shield absorption)
            finalDmg = Math.max(1, finalDmg);
            // Shield absorption: check active shield effects on this character
            const shieldEffects = allActiveEffects.filter(ae => ae.type === 'shield' && ae.targetId === p.id && ae.shieldHp && ae.shieldHp > 0);
            for (const shield of shieldEffects) {
              if (finalDmg <= 0) break;
              const absorbed = Math.min(shield.shieldHp!, finalDmg);
              shield.shieldHp! -= absorbed;
              finalDmg -= absorbed;
              allLogParts.push(`🛡️ Scudo di ${p.name} assorbe ${absorbed} danni!`);
              if (shield.shieldHp! <= 0) {
                allLogParts.push(`Lo scudo di ${p.name} si rompe!`);
              }
            }
            // Reflect: check active reflect effects on this character
            const reflectEffects = allActiveEffects.filter(ae => ae.type === 'reflect' && ae.targetId === p.id && ae.remainingTurns > 0);
            for (const ref of reflectEffects) {
              // FIX: Use finalDmg (post-shield) instead of pre-shield calcResult.damage
              const reflectDmg = Math.floor(finalDmg * (ref.amount || 0) / 100);
              if (reflectDmg > 0) {
                currentEnemy = { ...currentEnemy, currentHp: Math.max(0, currentEnemy.currentHp - reflectDmg) };
                currentEnemies = currentEnemies.map(e => e.id === currentEnemy.id ? currentEnemy : e);
                allLogParts.push(`🔄 ${p.name} riflette ${reflectDmg} danni su ${enemy.name}!`);
              }
            }
            dmg += finalDmg;
            if (calcResult.isCritical || dmgEffect.guaranteedCrit) crit = true;
            return { ...p, currentHp: Math.max(0, p.currentHp - finalDmg), isDefending: false };
          });
        }

        totalDamage += dmg;
        anyCritical = anyCritical || crit;
        anyMiss = anyMiss || miss;
        primaryTargetName = primaryTarget.name;
        primaryTargetId = primaryTarget.id;
        // Track all party targets for multi-target animation
        for (const pt of partyTargets) {
          if (!allTargetIds.includes(pt.id)) allTargetIds.push(pt.id);
        }

        // Build damage log — for AoE, list all affected targets
        const isAoe = !isSelf && partyTargets.length > 1;
        if (miss) {
          allLogParts.push(`${enemy.name} usa ${abilityName} ma ${primaryTarget.name} schiva l'attacco!`);
        } else if (isAoe) {
          // AoE: list individual damage per target
          const targetDmgParts: string[] = [];
          for (const pt of partyTargets) {
            const updatedP = currentParty.find(p => p.id === pt.id);
            if (updatedP) {
              const dmgTaken = pt.currentHp - updatedP.currentHp;
              if (dmgTaken > 0) targetDmgParts.push(`${pt.name}: -${dmgTaken}`);
            }
          }
          const critLabel = crit ? ' COLPO CRITICO!' : '';
          allLogParts.push(`${enemy.name} usa ${abilityName}!${critLabel} ${targetDmgParts.join(', ')}`);
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
        const appliedNames: string[] = [];
        const resistedNames: string[] = [];

        if (isSelf) {
          // Apply status to enemy
          currentEnemies = currentEnemies.map(e => {
            if (!enemyTargets.some(et => et.id === e.id)) return e;
            if (chance(applyChance) && !e.statusEffects.includes(statusType)) {
              appliedNames.push(e.name);
              return { ...e, statusEffects: [...e.statusEffects, statusType] };
            }
            resistedNames.push(e.name);
            return e;
          });
        } else {
          // Apply status to party members
          currentParty = currentParty.map(p => {
            if (!partyTargets.some(pt => pt.id === p.id)) return p;
            // FIX: Apply status_resist from equipment
            const resistAmount = getStatusResist(p, statusType);
            const finalChance = Math.max(0, applyChance - resistAmount);
            if (chance(finalChance) && !p.statusEffects.includes(statusType)) {
              const duration = statusEffect.duration || 3;
              appliedStatus = { targetId: p.id, effect: statusType, duration };
              appliedNames.push(p.name);
              return { ...p, statusEffects: [...p.statusEffects, statusType] };
            }
            resistedNames.push(p.name);
            return p;
          });
        }

        primaryStatusEffect = statusType;
        const statusNames: Record<string, string> = { poison: 'Avvelenato', bleeding: 'Sanguinamento', stunned: 'Stordito', adrenaline: 'Adrenalina' };
        const statusLabel = statusNames[statusType] || statusType;
        if (appliedNames.length > 0) {
          allLogParts.push(`${appliedNames.join(', ')} è ${statusLabel}!`);
        } else if (resistedNames.length > 0) {
          allLogParts.push(`${resistedNames.join(', ')} resiste a ${statusLabel}!`);
        }
        break;
      }

      case 'heal': {
        const healEffect = effect as SpecialEffect & { type: 'heal' };
        // Heal targets enemies (self or allies)
        const healTargets = enemyTargets;
        if (healTargets.length === 0) break;

        let healThisEffect = 0;
        currentEnemies = currentEnemies.map(e => {
          if (!healTargets.some(ht => ht.id === e.id)) return e;
          const rawHeal = healEffect.amount || 0;
          const healAmount = typeof healEffect.percent === 'number' ? Math.floor(e.maxHp * healEffect.percent / 100) : rawHeal;
          totalHeal += healAmount;
          healThisEffect += healAmount;
          return { ...e, currentHp: Math.min(e.maxHp, e.currentHp + healAmount) };
        });
        // FIX: Use healThisEffect instead of totalHeal for the log message
        allLogParts.push(`${enemy.name} si cura di ${healThisEffect} HP!`);
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
          sourceType: 'special' as const,
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
          sourceType: 'special' as const,
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
          sourceType: 'special' as const,
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
          sourceType: 'special' as const,
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
          // BUG FIX: removed + (p.isDefending ? 5 : 0) — calculateDamage already handles defending via its multiplier
          const defenderDef = getEffectiveDef(p, activeEffects);
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
          sourceType: 'special' as const,
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
        // FIX: Use resolveEnemyTargets to respect effect.target instead of reviving ALL dead enemies
        const { enemyTargets: revTargets } = resolveEnemyTargets(effect);
        const deadTargets = revTargets.filter(e => e.currentHp <= 0);
        if (deadTargets.length === 0) break;
        const deadIds = new Set(deadTargets.map(dt => dt.id));

        currentEnemies = currentEnemies.map(e => {
          if (!deadIds.has(e.id)) return e;
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
      log: { turn, actorName: enemy.name, actorType: 'enemy', action: abilityName, message: `${enemy.name} usa ${abilityName} ma gli effetti non si attivano!` },
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
      targetIds: allTargetIds.length > 0 ? allTargetIds : undefined,
      damage: totalDamage > 0 ? totalDamage : undefined,
      heal: totalHeal > 0 ? totalHeal : undefined,
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
  const aliveParty = party.filter(p => p.currentHp > 0);
  if (aliveParty.length === 0) return false;
  const avgSpd = aliveParty.reduce((sum, p) => sum + getCharacterSpd(p), 0) / aliveParty.length;
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
  let updatedEnemies = [...enemies];
  // Clone effects to avoid mutating the input array
  const effectsToProcess = activeEffects.map(e => ({ ...e }));

  for (const effect of effectsToProcess) {
    if (effect.remainingTurns <= 0) {
      expiredEffects.push(effect.id);
      continue;
    }

    // Process HoT: heal the target (both party members and enemies)
    if (effect.type === 'hot') {
      // Party member HoT
      updatedParty = updatedParty.map(p => {
        if (p.id === effect.targetId && p.currentHp > 0) {
          const amount = effect.amount || 0;
          const effectiveMaxHp = getCharacterMaxHp(p);
          const newHp = Math.min(effectiveMaxHp, p.currentHp + amount);
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
      // Enemy HoT
      updatedEnemies = updatedEnemies.map(e => {
        if (e.id === effect.targetId && e.currentHp > 0) {
          const amount = effect.amount || 0;
          const newHp = Math.min(e.maxHp, e.currentHp + amount);
          log.push({
            turn,
            actorName: e.name,
            actorType: 'enemy',
            action: 'Cura nel Tempo',
            targetName: e.name,
            targetId: e.id,
            heal: amount,
            message: `${e.name} recupera ${amount} HP dalla cura nel tempo!`,
          });
          return { ...e, currentHp: newHp };
        }
        return e;
      });
    }

    // FIX: Clean up shields that have been broken (shieldHp <= 0) — they should
    // be expired immediately rather than lingering with 0 HP until duration expires
    if (effect.type === 'shield' && (effect.shieldHp ?? 0) <= 0) {
      expiredEffects.push(effect.id);
      const targetName = party.find(p => p.id === effect.targetId)?.name
        || enemies.find(e => e.id === effect.targetId)?.name
        || 'sconosciuto';
      log.push({
        turn, actorName: targetName, actorType: 'player', action: 'Scudo',
        message: `Lo scudo di ${targetName} si è rotto!`,
      });
      continue;
    }

    // Decrement remaining turns for all effects (on the cloned copy)
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

  return { log, updatedParty, updatedEnemies, expiredEffects };
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
      undefined, character.armor!.icon,
    );
    if (result.activeEffects && result.activeEffects.length > 0) {
      newActiveEffects.push(...result.activeEffects);
    }
    if (result.log?.message) {
      // Armor proc message logged via activeEffects (shield created, etc.)
    }
  }

  // FIX: Also check accessory on_take_hit effects (e.g., ring_virus reflect)
  // Previously, accessories with on_take_hit (like reflect) were never triggered
  const accessoryDef = character.accessory ? ITEMS[character.accessory.itemId] : null;
  if (accessoryDef?.effects && accessoryDef.effects.length > 0) {
    const result = executeEffectsForTrigger(
      accessoryDef.effects, 'on_take_hit', character, attacker as EnemyInstance, turn, party, enemies, 'accessory', character.accessory!.name,
      undefined, character.accessory!.icon,
    );
    if (result.activeEffects && result.activeEffects.length > 0) {
      newActiveEffects.push(...result.activeEffects);
    }
    if (result.log?.message) {
      // Accessory proc message logged via activeEffects
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
      undefined, character.armor!.icon,
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
      undefined, character.accessory!.icon,
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
