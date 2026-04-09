import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ==========================================
  // DELETE ALL EXISTING DATA
  // ==========================================
  console.log('🗑️  Deleting existing data...');
  await prisma.document.deleteMany();
  await prisma.dynamicEvent.deleteMany();
  await prisma.sideQuest.deleteMany();
  await prisma.item.deleteMany();
  console.log('✅ Existing data deleted.\n');

  // ==========================================
  // 1. ITEMS — 31 EXISTING + 12 NEW = 43 TOTAL
  // ==========================================
  console.log('📦 Seeding items...');

  const weaponStats: Record<string, { atkBonus: number; type: string; ammoType?: string }> = {
    pipe:            { atkBonus: 5,  type: 'melee' },
    scalpel:         { atkBonus: 4,  type: 'melee' },
    pistol:          { atkBonus: 8,  type: 'ranged', ammoType: 'ammo_pistol' },
    shotgun:         { atkBonus: 14, type: 'ranged', ammoType: 'ammo_shotgun' },
    combat_knife:    { atkBonus: 7,  type: 'melee' },
    magnum:          { atkBonus: 18, type: 'ranged', ammoType: 'ammo_magnum' },
    machinegun:      { atkBonus: 13, type: 'ranged', ammoType: 'ammo_machinegun' },
    grenade_launcher:{ atkBonus: 24, type: 'ranged', ammoType: 'ammo_grenade' },
  };

  const itemEffects: Record<string, { type: string; value: number; target: string; statusCured?: string[] }> = {
    rocket_launcher: { type: 'kill_all',        value: 99999, target: 'all_enemies' },
    bandage:         { type: 'heal',             value: 25,    target: 'self' },
    herb_green:      { type: 'heal',             value: 30,    target: 'self' },
    herb_mixed:      { type: 'heal',             value: 70,    target: 'self', statusCured: ['poison', 'bleeding'] },
    first_aid:       { type: 'heal_full',        value: 0,     target: 'one_ally', statusCured: ['poison', 'bleeding'] },
    spray:           { type: 'heal',             value: 80,    target: 'one_ally' },
    antidote:        { type: 'cure',             value: 0,     target: 'self', statusCured: ['poison'] },
    bag_small:       { type: 'add_slots',        value: 1,     target: 'self' },
    bag_medium:      { type: 'add_slots',        value: 2,     target: 'self' },
  };

  const existingItems = [
    // Weapons (9)
    { id: 'pipe',             name: 'Tubo di Piombo',                  description: 'Un pesante tubo di piombo.', type: 'weapon', rarity: 'common', icon: '⚒️', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'scalpel',          name: 'Bisturi',                        description: 'Un bisturi da chirurgo.', type: 'weapon', rarity: 'common', icon: '🔪', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'pistol',           name: 'Pistola M1911',                  description: 'Una pistola affidabile.', type: 'weapon', rarity: 'uncommon', icon: '🔫', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'shotgun',          name: 'Fucile a Pompa',                 description: "Un fucile a pompa devastante a distanza ravvicinata.", type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'combat_knife',     name: 'Coltello da Combattimento',      description: 'Un coltello militare affilato.', type: 'weapon', rarity: 'uncommon', icon: '🗡️', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'magnum',           name: 'Magnum .357',                    description: 'Un revolver potentissimo. Causa danni devastanti.', type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'machinegun',       name: 'Mitragliatrice MP5',             description: "Un'arma automatica militare. Fuoco rapido e danni costanti. Consuma munizioni 5.56mm.", type: 'weapon', rarity: 'rare', icon: '🔫', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'grenade_launcher', name: 'Lanciagranate M79',               description: 'Un lanciagranate militare. Ogni colpo infligge danni esplosivi devastanti contro un singolo bersaglio.', type: 'weapon', rarity: 'rare', icon: '💣', usable: false, equippable: true, stackable: false, maxStack: 1 },
    { id: 'rocket_launcher',  name: 'Lanciarazzi RPG',                description: 'Un lanciarazzi con un solo colpo già caricato. Usalo in combattimento per eliminare istantaneamente tutti i nemici.', type: 'utility', rarity: 'legendary', icon: '🚀', usable: true, equippable: false, stackable: false, maxStack: 1 },
    // Healing (6)
    { id: 'bandage',     name: 'Benda',                  description: 'Ripristina 25 HP.', type: 'healing', rarity: 'common', icon: '🩹', usable: true, equippable: false },
    { id: 'herb_green',  name: 'Erba Verde',             description: "Un'erba medicinale. Ripristina 30 HP. Può essere miscelata con un'erba rossa.", type: 'healing', rarity: 'common', icon: '🍃', usable: true, equippable: false },
    { id: 'herb_red',    name: 'Erba Rossa',             description: "Un'erba potente che da sola non ha effetto. Miscelala con un'Erba Verde per potenziare la cura.", type: 'utility', rarity: 'uncommon', icon: '🩸', usable: false, equippable: false },
    { id: 'herb_mixed',  name: 'Erba Mista',             description: 'Un miscuglio di erba verde e rossa. Ripristina 70 HP e cura status negativi.', type: 'healing', rarity: 'uncommon', icon: '🌿', usable: true, equippable: false },
    { id: 'first_aid',   name: 'Kit di Pronto Soccorso',  description: 'Un kit medico completo. Ripristina tutti gli HP e cura veleno/sanguinamento a un alleato.', type: 'healing', rarity: 'uncommon', icon: '✚️', usable: true, equippable: false },
    { id: 'spray',       name: 'Spray Medicale',         description: 'Uno spray curativo. Ripristina 80 HP a un alleato.', type: 'healing', rarity: 'rare', icon: '🧴', usable: true, equippable: false },
    // Antidote (1)
    { id: 'antidote',    name: 'Antidoto',               description: 'Cura avvelenamento.', type: 'antidote', rarity: 'common', icon: '💉', usable: true, equippable: false },
    // Ammo (5)
    { id: 'ammo_pistol',     name: 'Munizioni 9mm',        description: 'Munizioni per pistola.', type: 'ammo', rarity: 'common', icon: '🔶', usable: false, equippable: false, maxStack: 99 },
    { id: 'ammo_shotgun',    name: 'Cartucce da Fucile',   description: 'Cartucce per fucile a pompa.', type: 'ammo', rarity: 'uncommon', icon: '🔷', usable: false, equippable: false, maxStack: 50 },
    { id: 'ammo_magnum',     name: 'Munizioni .357',       description: 'Munizioni per magnum.', type: 'ammo', rarity: 'rare', icon: '🔴', usable: false, equippable: false, maxStack: 30 },
    { id: 'ammo_machinegun', name: 'Munizioni 5.56mm',     description: 'Munizioni per mitragliatrice.', type: 'ammo', rarity: 'uncommon', icon: '🟡', usable: false, equippable: false, maxStack: 99 },
    { id: 'ammo_grenade',    name: 'Granate 40mm',         description: 'Granate esplosive per lanciagranate.', type: 'ammo', rarity: 'rare', icon: '🟠', usable: false, equippable: false, maxStack: 20 },
    // Bags (2)
    { id: 'bag_small',  name: 'Tasche da Caccia',  description: "Una sacca da caccia resistente. Aggiunge 1 slot all'inventario. (Max 12 slot)", type: 'bag', rarity: 'uncommon', icon: '👝', usable: true, equippable: false, stackable: false, maxStack: 1 },
    { id: 'bag_medium', name: 'Zaino Tattico',     description: "Uno zaino militare capiente. Aggiunge 2 slot all'inventario. (Max 12 slot)", type: 'bag', rarity: 'rare', icon: '🎒', usable: true, equippable: false, stackable: false, maxStack: 1 },
    // Utility / Keys / Collectible (8)
    { id: 'flashlight',    name: 'Torcia',                     description: 'Una torcia per illuminare le tenebre.', type: 'utility', rarity: 'common', icon: '🔦', usable: true, equippable: false, stackable: false, maxStack: 1 },
    { id: 'lockpick',      name: 'Grisaglie',                  description: 'Set di grisaglie per aprire serrature.', type: 'utility', rarity: 'uncommon', icon: '🗝️', usable: true, equippable: false, stackable: false, maxStack: 1 },
    { id: 'ink_ribbon',    name: "Nastro d'Inchiostro",        description: 'Un oggetto raro da collezione. Raccogline 10 per un obiettivo segreto.', type: 'collectible', rarity: 'legendary', icon: '🎀', usable: false, equippable: false },
    { id: 'key_rpd',       name: 'Chiave del Distretto di Polizia', description: "Una chiave d'argento con il logo della R.P.D.", type: 'utility', rarity: 'uncommon', icon: '🔑', usable: false, equippable: false, stackable: false, maxStack: 1 },
    { id: 'key_sewers',    name: 'Chiave delle Fogne',         description: 'Una chiave arrugginita trovata nelle fogne.', type: 'utility', rarity: 'uncommon', icon: '🔑', usable: false, equippable: false, stackable: false, maxStack: 1 },
    { id: 'key_lab',       name: 'Tessera Umbrella',           description: 'Una tessera magnetica con il logo dell\'Umbrella Corp.', type: 'utility', rarity: 'rare', icon: '💳', usable: false, equippable: false, stackable: false, maxStack: 1 },
    { id: 'crank_handle',  name: 'Manovella',                  description: 'Una manovella metallica per aprire chiuse idrauliche.', type: 'utility', rarity: 'uncommon', icon: '⚙️', usable: false, equippable: false, stackable: false, maxStack: 1 },
    { id: 'fuse',          name: 'Fusibile',                   description: "Un fusibile elettrico per ripristinare l'energia.", type: 'utility', rarity: 'uncommon', icon: '🔌', usable: false, equippable: false, stackable: false, maxStack: 1 },
  ];

  const newItems = [
    // 1. defense_potion
    { id: 'defense_potion', name: 'Pozione Difensiva', description: 'Un liquido azzurro brillante che indurisce temporaneamente la pelle. Aumenta la difesa del 30% per il prossimo combattimento.', type: 'utility', rarity: 'uncommon', icon: '🛡️', usable: true, equippable: false, effectType: 'defense_boost', effectValue: 30, effectTarget: 'self' },
    // 2. adrenaline_shot
    { id: 'adrenaline_shot', name: 'Iniezione di Adrenalina', description: 'Una siringa pre-caricata con adrenalina pura. Ripristina 15 HP e rimuove la stanchezza.', type: 'healing', rarity: 'uncommon', icon: '💉', usable: true, equippable: false, effectType: 'heal', effectValue: 15, effectTarget: 'self' },
    // 3. bio_sensor
    { id: 'bio_sensor', name: 'Bio-Sensore', description: 'Un dispositivo elettronico portatile che rileva segni vitali nelle vicinanze. Utile per individuare creature nascoste durante le ricerche.', type: 'utility', rarity: 'rare', icon: '📡', usable: true, equippable: false, stackable: false, maxStack: 1 },
    // 4. tazer
    { id: 'tazer', name: 'Tazer', description: 'Un elettroshock militare ad alta tensione. Stordisce temporaneamente i bersagli umanoidi.', type: 'weapon', rarity: 'uncommon', icon: '⚡', usable: false, equippable: true, weaponType: 'melee', atkBonus: 8, stackable: false, maxStack: 1 },
    // 5. railgun
    { id: 'railgun', name: 'Railgun Sperimentale', description: "Un'arma a proiettili elettromagnetici sperimentale dell'Umbrella. Infligge danni devastanti perforando ogni tipo di armatura. Consuma munizioni Magnum.", type: 'weapon', rarity: 'legendary', icon: '🔫', usable: false, equippable: true, weaponType: 'ranged', atkBonus: 25, ammoType: 'ammo_magnum', stackable: false, maxStack: 1 },
    // 6. medikit_advanced
    { id: 'medikit_advanced', name: 'Kit Medico Avanzato', description: 'Un kit medico militare di prim\'ordine. Ripristina completamente tutti gli HP di un alleato e cura ogni stato negativo — veleno, sanguinamento, e infezione.', type: 'healing', rarity: 'rare', icon: '🩺', usable: true, equippable: false, effectType: 'heal_full', effectValue: 0, effectTarget: 'one_ally', effectStatusCured: '["poison","bleeding"]' },
    // 7. smoke_grenade
    { id: 'smoke_grenade', name: 'Granata Fumogena', description: 'Una granata che rilascia una fitta cortina di fumo. Garantisce la fuga sicura da qualsiasi combattimento.', type: 'utility', rarity: 'uncommon', icon: '💨', usable: true, equippable: false, stackable: false, maxStack: 3 },
    // 8. proximity_mine
    { id: 'proximity_mine', name: 'Mina di Prossimità', description: 'Una mina anti-uomo militare con sensore di movimento. Può essere utilizzata come munizione alternativa per il Lanciagranate M79.', type: 'ammo', rarity: 'rare', icon: '💣', usable: false, equippable: false, maxStack: 5 },
    // 9. thermal_scope
    { id: 'thermal_scope', name: 'Mirino Termico', description: 'Un mirino a infrarossi che rivela i bersagli nel buio e attraverso le pareti sottili. Aumenta la precisione delle armi da fuoco.', type: 'utility', rarity: 'rare', icon: '🔭', usable: true, equippable: false, stackable: false, maxStack: 1 },
    // 10. vaccine_sample
    { id: 'vaccine_sample', name: 'Campione di Vaccino', description: 'Una fiala contenente un vaccino sperimentale contro il T-virus. La Umbrella farebbe di tutto per recuperarlo. Raccogline tutti per un obiettivo segreto.', type: 'collectible', rarity: 'legendary', icon: '🧪', usable: false, equippable: false },
    // 11. dog_tag
    { id: 'dog_tag', name: 'Piastrina Militare', description: 'Una piastrina di identificazione militare. Apparteneva a un soldato dell\'UBCS caduto in combattimento. Un ricordo silenzioso dei caduti.', type: 'collectible', rarity: 'common', icon: '🏷️', usable: false, equippable: false },
    // 12. umbrella_keycard
    { id: 'umbrella_keycard', name: 'Tessera Umbrella Oro', description: "Una tessera d'accesso dorata con il logo dell'Umbrella Corp. Livello di autorizzazione: ORO — accesso illimitato a tutte le strutture.", type: 'key', rarity: 'rare', icon: '💳', usable: false, equippable: false, stackable: false, maxStack: 1 },
  ];

  // ── Armor items (from equipment.ts) ──
  const armorItems = [
    { id: 'vest_light', name: 'Gilet Leggero', description: 'Un gilet di protezione leggero. +3 DEF.', type: 'armor', rarity: 'common', icon: '🦺', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 3 },
    { id: 'vest_police', name: 'Giubbotto RPD', description: 'Un giubbotto antiproiettile del dipartimento di polizia. +5 DEF, +15 HP.', type: 'armor', rarity: 'uncommon', icon: '🦺', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 5, hpBonus: 15 },
    { id: 'vest_tactical', name: 'Giubbotto Tattico', description: 'Un giubbotto militare con piastra ceramica. +8 DEF, +25 HP.', type: 'armor', rarity: 'rare', icon: '🦺', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 8, hpBonus: 25 },
    { id: 'vest_umbrella', name: 'Armatura Umbrella', description: 'Armatura sperimentale Umbrella. +12 DEF, +40 HP, 50% resistenza veleno.', type: 'armor', rarity: 'legendary', icon: '🦺', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 12, hpBonus: 40, specialEffect: '{"type":"poison_resist","value":50}' },
    { id: 'lab_coat', name: 'Camice da Laboratorio', description: 'Un camice da laboratorio resistente. +2 DEF, +10 HP.', type: 'armor', rarity: 'common', icon: '🥼', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 2, hpBonus: 10 },
    { id: 'swat_armor', name: 'Armatura SWAT', description: 'Armatura completa della SWAT. +10 DEF, +30 HP, 40% resistenza sanguinamento.', type: 'armor', rarity: 'rare', icon: '🦺', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 10, hpBonus: 30, specialEffect: '{"type":"bleed_resist","value":40}' },
  ];

  // ── Accessory items (from equipment.ts) ──
  const accessoryItems = [
    { id: 'watch', name: 'Orologio da Polso', description: 'Un orologio che migliora i riflessi. +2 SPD.', type: 'accessory', rarity: 'common', icon: '⌚', usable: false, equippable: true, stackable: false, maxStack: 1, spdBonus: 2 },
    { id: 'amulet', name: 'Amuleto Benedetto', description: 'Un amuleto che infonde coraggio. +20 HP, +2 DEF.', type: 'accessory', rarity: 'uncommon', icon: '📿', usable: false, equippable: true, stackable: false, maxStack: 1, hpBonus: 20, defBonus: 2 },
    { id: 'compass', name: 'Bussola Militare', description: 'Una bussola che aumenta la precisione. +3 SPD, +2 ATK.', type: 'accessory', rarity: 'uncommon', icon: '🧭', usable: false, equippable: true, stackable: false, maxStack: 1, spdBonus: 3, atkBonus: 2 },
    { id: 'first_aid_badge', name: 'Distintivo Croce Rossa', description: 'Un distintivo che ispira cura. +30 HP, rigenera 3 HP/turno.', type: 'accessory', rarity: 'uncommon', icon: '🎖️', usable: false, equippable: true, stackable: false, maxStack: 1, hpBonus: 30, specialEffect: '{"type":"hp_regen","value":3}' },
    { id: 'dog_tags', name: 'Piastre Militari', description: 'Piastre di un soldato caduto. +3 ATK, +5% critico.', type: 'accessory', rarity: 'rare', icon: '🏷️', usable: false, equippable: true, stackable: false, maxStack: 1, atkBonus: 3, critBonus: 5 },
    { id: 'ring_virus', name: 'Anello del Virus-T', description: 'Un anello contaminato dal T-Virus. +5 ATK, +15 HP, riflette 5 danni.', type: 'accessory', rarity: 'legendary', icon: '💍', usable: false, equippable: true, stackable: false, maxStack: 1, atkBonus: 5, hpBonus: 15, specialEffect: '{"type":"thorns","value":5}' },
    { id: 'goggles', name: 'Occhiali Tattici', description: 'Lenti tattiche per una migliore mira. +8% critico.', type: 'accessory', rarity: 'uncommon', icon: '🥽', usable: false, equippable: true, stackable: false, maxStack: 1, critBonus: 8 },
    { id: 'gas_mask', name: 'Maschera Antigas', description: 'Protezione contro agenti chimici. +3 DEF, +15 HP, 80% resistenza veleno.', type: 'accessory', rarity: 'rare', icon: '😷', usable: false, equippable: true, stackable: false, maxStack: 1, defBonus: 3, hpBonus: 15, specialEffect: '{"type":"poison_resist","value":80}' },
  ];

  // ── Weapon mod items (from weapon-mods.ts) ──
  const weaponModItems = [
    { id: 'mod_red_dot', name: 'Mirino Red Dot', description: 'Un mirino a punto rosso. +8% probabilità critico.', type: 'weapon_mod', rarity: 'common', icon: '🔴', usable: false, equippable: false, stackable: false, maxStack: 1, critBonus: 8, modType: 'ranged' },
    { id: 'mod_laser_sight', name: 'Laser Sight', description: 'Un mirino laser che riduce la dodge nemica. -15% dodge nemico.', type: 'weapon_mod', rarity: 'uncommon', icon: '🔴', usable: false, equippable: false, stackable: false, maxStack: 1, dodgeBonus: 15, modType: 'ranged' },
    { id: 'mod_hollow_point', name: 'Proiettili Hollow Point', description: 'Proiettili espansivi che aumentano i danni critici. +15% critico.', type: 'weapon_mod', rarity: 'rare', icon: '🔶', usable: false, equippable: false, stackable: false, maxStack: 1, critBonus: 15, modType: 'ranged' },
    { id: 'mod_bio_rounds', description: 'Munizioni bio-contaminate. +20% probabilità status.', type: 'weapon_mod', rarity: 'rare', icon: '🧪', usable: false, equippable: false, stackable: false, maxStack: 1, statusBonus: 20, modType: 'any', name: 'Munizioni Bio-Contaminate' },
    { id: 'mod_titanium_blade', name: 'Lama in Titanio', description: 'Una lama di titanio ultra-affilata. +5 ATK, +10% critico.', type: 'weapon_mod', rarity: 'rare', icon: '🗡️', usable: false, equippable: false, stackable: false, maxStack: 1, atkBonus: 5, critBonus: 10, modType: 'melee' },
    { id: 'mod_shock_module', name: 'Modulo Shock', description: 'Un modulo elettrico che stordisce i bersagli. +30% status, solo corpo a corpo.', type: 'weapon_mod', rarity: 'uncommon', icon: '⚡', usable: false, equippable: false, stackable: false, maxStack: 1, statusBonus: 30, modType: 'melee' },
  ];

  for (const item of existingItems) {
    const ws = weaponStats[item.id];
    const ef = itemEffects[item.id];
    await prisma.item.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: item.stackable ?? (item.type === 'collectible' || item.type === 'key' ? true : item.type === 'weapon' || item.type === 'utility' || item.type === 'bag' ? false : true),
        maxStack: item.maxStack ?? 99,
        weaponType: ws?.type ?? null,
        atkBonus: ws?.atkBonus ?? null,
        ammoType: ws?.ammoType ?? null,
        effectType: ef?.type ?? null,
        effectValue: ef?.value ?? null,
        effectTarget: ef?.target ?? null,
        effectStatusCured: ef?.statusCured ? JSON.stringify(ef.statusCured) : null,
        addSlots: ef?.type === 'add_slots' ? ef.value : null,
      },
    });
  }

  for (const item of newItems) {
    await prisma.item.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: (item as any).stackable ?? (item.type === 'collectible' || item.type === 'key' ? true : item.type === 'weapon' ? false : true),
        maxStack: (item as any).maxStack ?? 99,
        weaponType: (item as any).weaponType ?? null,
        atkBonus: (item as any).atkBonus ?? null,
        ammoType: (item as any).ammoType ?? null,
        effectType: (item as any).effectType ?? null,
        effectValue: (item as any).effectValue ?? null,
        effectTarget: (item as any).effectTarget ?? null,
        effectStatusCured: (item as any).effectStatusCured ?? null,
        addSlots: (item as any).addSlots ?? null,
      },
    });
  }

  // Seed armor items
  for (const item of armorItems) {
    await prisma.item.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: item.stackable,
        maxStack: item.maxStack,
        defBonus: (item as any).defBonus ?? null,
        hpBonus: (item as any).hpBonus ?? null,
        specialEffect: (item as any).specialEffect ?? null,
        unico: true,
      },
    });
  }

  // Seed accessory items
  for (const item of accessoryItems) {
    await prisma.item.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: item.stackable,
        maxStack: item.maxStack,
        atkBonus: (item as any).atkBonus ?? null,
        defBonus: (item as any).defBonus ?? null,
        hpBonus: (item as any).hpBonus ?? null,
        spdBonus: (item as any).spdBonus ?? null,
        critBonus: (item as any).critBonus ?? null,
        specialEffect: (item as any).specialEffect ?? null,
        unico: true,
      },
    });
  }

  // Seed weapon mod items
  for (const item of weaponModItems) {
    await prisma.item.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        usable: item.usable,
        equippable: item.equippable,
        stackable: item.stackable,
        maxStack: item.maxStack,
        atkBonus: (item as any).atkBonus ?? null,
        critBonus: (item as any).critBonus ?? null,
        dodgeBonus: (item as any).dodgeBonus ?? null,
        statusBonus: (item as any).statusBonus ?? null,
        modType: (item as any).modType ?? null,
        unico: true,
      },
    });
  }

  const totalItems = existingItems.length + newItems.length + armorItems.length + accessoryItems.length + weaponModItems.length;
  console.log(`✅ Items seeded: ${existingItems.length} existing + ${newItems.length} new + ${armorItems.length} armor + ${accessoryItems.length} accessory + ${weaponModItems.length} weapon_mod = ${totalItems} total.\n`);

  // ==========================================
  // 2. SIDE QUESTS — 4 EXISTING + 12 NEW = 16 TOTAL
  // ==========================================
  console.log('📋 Seeding side quests...');

  const existingQuests = [
    // From npc_marco
    {
      id: 'quest_marco_firstaid',
      npcId: 'npc_marco',
      name: 'Kit di Sopravvivenza per Marco',
      description: 'Marco ha bisogno di un kit di primo soccorso. Trova un Kit di Pronto Soccorso nelle vicinanze e portaglielo.',
      type: 'fetch',
      targetId: 'first_aid',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'ammo_pistol', quantity: 6 }]),
      rewardExp: 30,
      rewardDialogue: JSON.stringify(["Non credevo che qualcuno mi avrebbe davvero aiutato! Ecco, ho trovato queste munizioni in un'auto della polizia abbandonata. Prendile, te ne serviranno più di me."]),
      sortOrder: 0,
    },
    // From npc_dr_chen
    {
      id: 'quest_dr_chen_antidote',
      npcId: 'npc_dr_chen',
      name: 'Antidoti per il Dr. Chen',
      description: 'Il Dr. Chen ha bisogno di 2 antidoti per curare i sopravvissuti nascosti. Trovali e portaglieli.',
      type: 'fetch',
      targetId: 'antidote',
      targetCount: 2,
      rewardItems: JSON.stringify([{ itemId: 'spray', quantity: 1 }]),
      rewardExp: 50,
      rewardDialogue: JSON.stringify(["Grazie dal profondo del cuore. Questi antidoti salveranno delle vite. Prendi questo spray medicale — è potente, te ne servirà per affrontare quello che ti aspetta laggiù."]),
      sortOrder: 0,
    },
    // From npc_soldier_reyes
    {
      id: 'quest_reyes_soldiers',
      npcId: 'npc_soldier_reyes',
      name: 'Elimina gli Zombie Soldati',
      description: 'Reyes vuole che tu metta a riposo 3 dei suoi ex compagni trasformati in zombie soldati UBCS.',
      type: 'kill',
      targetId: 'zombie_soldier',
      targetCount: 3,
      rewardItems: JSON.stringify([{ itemId: 'ammo_shotgun', quantity: 4 }, { itemId: 'magnum', quantity: 1 }]),
      rewardExp: 60,
      rewardDialogue: JSON.stringify(["Hai fatto quello che io non riuscivo a fare... grazie. Ecco — ho raccolto queste munizioni dai miei compagni caduti. E questo magnum... usalo bene."]),
      sortOrder: 0,
    },
    // From npc_hannah
    {
      id: 'quest_hannah_lab',
      npcId: 'npc_hannah',
      name: 'Esplorare il Laboratorio',
      description: 'Hannah vuole che tu raggiunga l\'ingresso del laboratorio Umbrella e riferisca cosa trovi.',
      type: 'explore',
      targetId: 'laboratory_entrance',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'lockpick', quantity: 1 }]),
      rewardExp: 40,
      rewardDialogue: JSON.stringify(["Ce l'hai fatta! E sei tornato intero! Ecco, tieni queste grisaglie — le ho trovate in una stanza abbandonata nelle fogne. Ti serviranno per aprire le porte blindate del laboratorio."]),
      sortOrder: 0,
    },
  ];

  const newQuests = [
    {
      id: 'quest_marco_ammo',
      npcId: 'npc_marco',
      name: 'Munizioni Scarse',
      description: 'Marco ha bisogno di munizioni per difendere il suo rifugio. Trova 10 munizioni 9mm per la sua pistola.',
      type: 'fetch',
      targetId: 'ammo_pistol',
      targetCount: 10,
      rewardItems: JSON.stringify([{ itemId: 'ammo_shotgun', quantity: 4 }]),
      rewardExp: 40,
      rewardDialogue: JSON.stringify(["Ottimo lavoro! Con queste cartucce da fucile possiamo tenere a bada quelle cose più a lungo. Sei un vero sopravvissuto."]),
      sortOrder: 1,
    },
    {
      id: 'quest_marco_herbs',
      npcId: 'npc_marco',
      name: 'Erbe per i Feriti',
      description: "Ci sono sopravvissuti feriti nel rifugio di Marco. Portagli 5 Erbe Verdi per curarli.",
      type: 'fetch',
      targetId: 'herb_green',
      targetCount: 5,
      rewardItems: JSON.stringify([{ itemId: 'spray', quantity: 1 }]),
      rewardExp: 30,
      rewardDialogue: JSON.stringify(["Le erbe arriveranno subito ai feriti. Ti meriti qualcosa di meglio di una semplice benda — ecco uno spray medicale. È potente, non sprecarlo."]),
      sortOrder: 2,
    },
    {
      id: 'quest_marco_escape',
      npcId: 'npc_marco',
      name: 'Via di Fuga',
      description: "Marco vuole che tu esplori la Torre dell'Orologio per trovare una possibile via di evacuazione.",
      type: 'explore',
      targetId: 'clock_tower',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'ink_ribbon', quantity: 2 }]),
      rewardExp: 100,
      rewardDialogue: JSON.stringify(["La Torre dell'Orologio... ci credevo che ci fosse un elicottero laggiù. Questi nastri d'inchiostro sono tutto quello che resta dei corrieri dell'Umbrella. Prendili — potrebbero essere utili."]),
      sortOrder: 3,
      prerequisiteQuestId: 'quest_marco_ammo',
    },
    {
      id: 'quest_dr_chen_files',
      npcId: 'npc_dr_chen',
      name: 'File Perduti',
      description: "Il Dr. Chen sospetta che ci siano documenti compromettenti alla R.P.D. Esplora il Distretto di Polizia per trovarli.",
      type: 'explore',
      targetId: 'rpd_station',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'first_aid', quantity: 2 }]),
      rewardExp: 60,
      rewardDialogue: JSON.stringify(["Se hai trovato dei file alla R.P.D., potrebbero contenere prove contro l'Umbrella. Ecco due kit medici — me ne serve uno per i pazienti, ma tu tieni entrambi. Ne avrai più bisogno tu."]),
      sortOrder: 1,
    },
    {
      id: 'quest_dr_chen_hunter',
      npcId: 'npc_dr_chen',
      name: 'Minaccia Biologica',
      description: "Il Dr. Chen è terrorizzato dagli Hunter che pattugliano la zona. Elimina 2 Hunter per proteggere i sopravvissuti.",
      type: 'kill',
      targetId: 'hunter',
      targetCount: 2,
      rewardItems: JSON.stringify([{ itemId: 'herb_red', quantity: 2 }]),
      rewardExp: 80,
      rewardDialogue: JSON.stringify(["Hai abbattuto quei mostri... Non so come ringraziarti. Queste erbe rosse sono rare — miscelale con quelle verdi per creare cure potenti. Potresti averne bisogno contro cose ancora peggiori."]),
      sortOrder: 2,
    },
    {
      id: 'quest_dr_chen_cure',
      npcId: 'npc_dr_chen',
      name: 'Siero Sperimentale',
      description: "Il Dr. Chen ha un'idea per un siero potenziato. Portagli 3 Erbe Rosse per completare la formula.",
      type: 'fetch',
      targetId: 'herb_red',
      targetCount: 3,
      rewardItems: JSON.stringify([{ itemId: 'medikit_advanced', quantity: 1 }]),
      rewardExp: 150,
      rewardDialogue: JSON.stringify(["Con queste erbe rosse... posso finalmente sintetizzare un siero avanzato. Eccoti un Kit Medico Avanzato — l'ho costruito con le scorte del laboratorio. Curerebbe anche un Tyrant, se ci fosse bisogno."]),
      sortOrder: 3,
      prerequisiteQuestId: 'quest_dr_chen_hunter',
    },
    {
      id: 'quest_reyes_report',
      npcId: 'npc_soldier_reyes',
      name: 'Rapporto UBCS',
      description: "Reyes vuole recuperare il report di smaltimento dell'Umbrella nascosto nelle fogne come prova del complotto.",
      type: 'fetch',
      targetId: 'doc_umbrella_disposal',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'magnum', quantity: 1 }]),
      rewardExp: 100,
      rewardDialogue: JSON.stringify(["Questo report... prova tutto quello che sapevamo. L'Umbrella ha scaricato le creature fallite nelle fogne come se fossero rifiuti. Tieni questo magnum — dovrai affrontare cose che nessun uomo dovrebbe vedere."]),
      sortOrder: 1,
    },
    {
      id: 'quest_reyes_dogs',
      npcId: 'npc_soldier_reyes',
      name: 'Branco di Cerberi',
      description: "Un branco di Cerberi Alpha sta bloccando la strada principale. Reyes ti chiede di eliminarne 2 per riprendere il controllo.",
      type: 'kill',
      targetId: 'cerberus_alpha',
      targetCount: 2,
      rewardItems: JSON.stringify([{ itemId: 'ammo_machinegun', quantity: 5 }]),
      rewardExp: 70,
      rewardDialogue: JSON.stringify(["I Cerberi... li abbiamo addestrati noi, sai? Ora ci cacciano. Ecco munizioni per la mitragliatrice — le avrai bisogno se ne trovi altri. Non c'è posto per la compassione qui."]),
      sortOrder: 2,
    },
    {
      id: 'quest_hannah_sewers',
      npcId: 'npc_hannah',
      name: 'Mappa delle Fogne',
      description: 'Hannah ha bisogno di una mappa dettagliata delle fogne per trovare scorciatoie segrete. Esplora le fogne a fondo.',
      type: 'explore',
      targetId: 'sewers',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'lockpick', quantity: 1 }]),
      rewardExp: 50,
      rewardDialogue: JSON.stringify(["Conosco bene questi condotti — ci sono passaggi che i dipendenti dell'Umbrella usavano per muoversi di nascosto. Ecco un set di grisaglie che ho trovato. Ti serviranno per le porte blindate."]),
      sortOrder: 1,
    },
    {
      id: 'quest_hannah_supplies',
      npcId: 'npc_hannah',
      name: 'Rifornimenti Nascosti',
      description: 'Hannah sa che ci sono antidoti nascosti in un deposito abbandonato. Trova 3 antidoti per i sopravvissuti.',
      type: 'fetch',
      targetId: 'antidote',
      targetCount: 3,
      rewardItems: JSON.stringify([{ itemId: 'herb_mixed', quantity: 2 }]),
      rewardExp: 60,
      rewardDialogue: JSON.stringify(["Questi antidoti salveranno delle vite. In cambio, ecco due Erbe Miste — le ho preparate mescolando erbe verdi e rosse. Curano quasi tutto. Stai attento laggiù."]),
      sortOrder: 2,
    },
    {
      id: 'quest_voss_data',
      npcId: 'npc_umbrella_scientist',
      name: 'Prove dell\'Umbrella',
      description: "Il Dr. Voss ti prega di esplorare l'ingresso del laboratorio per trovare prove contro l'Umbrella nei server di backup.",
      type: 'explore',
      targetId: 'laboratory_entrance',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'rocket_launcher', quantity: 1 }]),
      rewardExp: 120,
      rewardDialogue: JSON.stringify(["Hai trovato i dati? Allora il mondo saprà la verità. Questo lanciarazzi... era destinato al protocollo di pulizia. Usalo con saggezza — è l'unima cosa che può fermare un Tyrant."]),
      sortOrder: 1,
    },
    {
      id: 'quest_voss_tyrant',
      npcId: 'npc_umbrella_scientist',
      name: 'Sconfiggi il Tyrant',
      description: "Il Dr. Voss crede che il Tyrant T-103 sia l'unica via per fermare il caos. Sconfiggilo una volta per tutte.",
      type: 'kill',
      targetId: 'tyrant_boss',
      targetCount: 1,
      rewardItems: JSON.stringify([{ itemId: 'spray', quantity: 3 }]),
      rewardExp: 200,
      rewardDialogue: JSON.stringify(["L'hai distrutto... il Tyrant... la mia creazione. Non so se devo ringraziarti o piangere. Prendi questi spray — sono tutto quello che resta del laboratorio. Esci da questa città. Esci ora."]),
      sortOrder: 2,
      prerequisiteQuestId: 'quest_voss_data',
    },
  ];

  for (const quest of [...existingQuests, ...newQuests]) {
    await prisma.sideQuest.create({ data: quest });
  }

  console.log(`✅ Side quests seeded: ${existingQuests.length} existing + ${newQuests.length} new = ${existingQuests.length + newQuests.length} total.\n`);

  // ==========================================
  // 3. DYNAMIC EVENTS — 6 EXISTING + 12 NEW = 18 TOTAL
  // ==========================================
  console.log('⚡ Seeding dynamic events...');

  const existingEvents = [
    {
      id: 'event_blackout',
      title: 'Blackout Totale',
      description: "Un improvviso buio avvolge l'area. Le luci si spengono con un sibilo e l'oscurità diventa totale. Nel buio, i suoni sembrano più vicini e più minacciosi. Ma forse le tenebre nascondono anche oggetti che la luce avrebbe nascosto.",
      icon: '🌑',
      type: 'blackout',
      duration: 3,
      encounterRateMod: 15,
      enemyStatMult: 0,
      searchBonus: true,
      damagePerTurn: 0,
      triggerChance: 8,
      minTurn: 5,
      locationIds: '[]',
      onTriggerMessage: '💡 Le luci si spengono improvvisamente! Un blackout totale ha colpito la zona. Le tenebre nascondono sia pericoli che tesori nascosti...',
      onEndMessage: "💡 L'energia torna gradualmente. Le luci lampeggiano e si stabilizzano. Il blackout è terminato.",
      choices: JSON.stringify([
        { text: 'Restare al coperto e aspettare', outcome: { description: "Vi barricate nell'oscurità. Il tempo passa lento e i rumori vi fanno trasalire, ma alla fine le luci tornano. Nessun danno subito.", endEvent: true, hpChange: 0 } },
        { text: 'Cercare nel buio (bonus oggetti)', outcome: { description: "Con la torcia accesa, esplorate l'area al buio. Nell'oscurità trovate oggetti che nessuno avrebbe notato alla luce del giorno.", endEvent: true, receiveItems: [{ itemId: 'herb_green', quantity: 1 }, { itemId: 'ammo_pistol', quantity: 3 }], hpChange: 0 } },
      ]),
    },
    {
      id: 'event_alarm',
      title: 'Allarme di Sicurezza',
      description: 'Un allarme piercing squarcia il silenzio! Le luci rosse lampeggiano e le sirene ululano. L\'allarme sta attirando ogni creatura nelle vicinanze verso la vostra posizione.',
      icon: '🚨',
      type: 'alarm',
      duration: 2,
      encounterRateMod: 25,
      enemyStatMult: 1.1,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 6,
      minTurn: 8,
      locationIds: '[]',
      onTriggerMessage: '🚨 WEE-WOO-WEE-WOO! Un allarme di sicurezza si attiva! Le sirene attirano ogni creatura nelle vicinanze!',
      onEndMessage: "🚨 L'allarme si spegne finalmente. Le luci rosse smettono di lampeggiare. Ma chissà quanti mostri sono arrivati intanto...",
      choices: JSON.stringify([
        { text: "Tentare di disabilitare l'allarme", outcome: { description: "Con mano ferma, individuate il pannello di controllo e disattivate l'allarme. Il silenzio torna a regnare, ma qualcosa si è già avvicinato...", endEvent: true, hpChange: -5 } },
        { text: "Fuggire verso un'altra area", outcome: { description: "Correte via dall'area dell'allarme. Nella fretta urtate contro dei detriti, ma almeno vi allontanate dal suono assordante.", endEvent: true, hpChange: -10 } },
        { text: 'Combattere e resistere', outcome: { description: "Decidete di tenere la posizione. Qualsiasi cosa arrivi, sarete pronti. L'allarme continua a suonare, ma voi siete pronti a tutto.", endEvent: true, hpChange: 0 } },
      ]),
    },
    {
      id: 'event_collapse',
      title: 'Cedimento Strutturale',
      description: 'Il terreno trema sotto i vostri piedi! Le crepe si allargano nelle pareti e pezzi di soffitto iniziano a cadere. L\'edificio sta cedendo — dovete muovervi o verrete sepolti.',
      icon: '💥',
      type: 'collapse',
      duration: 2,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 5,
      triggerChance: 5,
      minTurn: 10,
      locationIds: '[]',
      onTriggerMessage: '💥 CRACK! BOOM! Il soffitto si spacca! Un cedimento strutturale è in corso! Detriti cadono intorno a voi!',
      onEndMessage: '💥 I crolli si attenuano. La struttura sembra essersi stabilizzata... per ora.',
      choices: JSON.stringify([
        { text: 'Trovare riparo sotto una trave', outcome: { description: "Vi tuffate sotto una trave portante robusta. I detriti cadono tutto intorno, ma siete al sicuro. Aspettate che il peggio passi prima di uscire.", endEvent: true, hpChange: 0 } },
        { text: 'Continuare a muoversi (rischio)', outcome: { description: "Correte attraverso i detriti cadenti. Una pietra vi colpisce alla spalla, ma riuscite a uscire dalla zona di pericolo prima che il soffitto crolli del tutto.", endEvent: true, hpChange: -15 } },
      ]),
    },
    {
      id: 'event_lockdown',
      title: 'Lockdown di Sicurezza',
      description: "Le porte si chiudono con un tonfo metallico! Un sistema di sicurezza automatico ha attivato il protocollo di lockdown. Le serrature elettroniche si illuminano di rosso. Siete intrappolati.",
      icon: '🔒',
      type: 'lockdown',
      duration: 3,
      encounterRateMod: 0,
      enemyStatMult: 1.2,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 5,
      minTurn: 12,
      locationIds: '[]',
      onTriggerMessage: "🔒 CLANK! Le porte blindate si chiudono automaticamente! Siete in lockdown — impossibile viaggiare fino a quando il sistema non viene disabilitato!",
      onEndMessage: "🔒 Le serrature si sbloccano con un click. Le porte si aprono lentamente. Siete di nuovo liberi di muovervi.",
      choices: JSON.stringify([
        { text: 'Violare il sistema di sicurezza', outcome: { description: "Esaminate il pannello di controllo e trovate una falla nel codice di sicurezza. Con un po' di pazienza riuscite a bypassare il lockdown e a sbloccare le porte.", endEvent: true, receiveItems: [{ itemId: 'ammo_pistol', quantity: 4 }], hpChange: 0 } },
        { text: 'Aspettare che scada', outcome: { description: "Non avete scelta — sedetevi e aspettate. Le ore passano lente nell'ansia. Alla fine il sistema si resetta da solo e le porte si aprono.", endEvent: true, hpChange: 0 } },
      ]),
    },
    {
      id: 'event_gas_leak',
      title: 'Fuga di Gas Tossico',
      description: "Un odore acre e dolciastro riempie l'aria. Il gas verde si diffonde rapidamente dalle condutture danneggiate. Le vostre vie respiratorie bruciano e la vista si offusca.",
      icon: '☠️',
      type: 'gas_leak',
      duration: 2,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 8,
      triggerChance: 7,
      minTurn: 6,
      locationIds: '[]',
      onTriggerMessage: "☠️ Un gas verdastro e tossico si diffonde nell'aria! Le vostre vie respiratorie bruciano. Dovete trovare una via d'uscita o una maschera!",
      onEndMessage: "☠️ Il gas si dissipa lentamente. L'aria torna respirabile, ma i vostri polmoni bruciano ancora.",
      choices: JSON.stringify([
        { text: 'Cercare una maschera antigas', outcome: { description: "Frugate disperatamente tra le rovine e trovate una maschera antigas in un armadietto! Vi mettete la maschera e respirate a fondo. Trovate anche un antidoto per purificare il sangue dal gas.", endEvent: true, receiveItems: [{ itemId: 'antidote', quantity: 1 }], hpChange: -5 } },
        { text: 'Correre attraverso il gas', outcome: { description: "Trattenete il fiato e correte. Il gas vi brucia la pelle e i polmoni. Arrivate dall'altra parte tossendo violentemente, intossicati.", endEvent: true, hpChange: -20 } },
      ]),
    },
    {
      id: 'event_fire',
      title: 'Incendio',
      description: "Le fiamme divampano improvvisamente, bloccando i corridoi e le vie d'uscita. Il calore è insopportabile e il fumo denso riempie la stanza. Il fuoco avanza inesorabile.",
      icon: '🔥',
      type: 'fire',
      duration: 2,
      encounterRateMod: 10,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 3,
      triggerChance: 5,
      minTurn: 15,
      locationIds: '[]',
      onTriggerMessage: "🔥 Le fiamme esplodono all'improvviso! L'incendio blocca le vie di fuga! Il calore è soffocante!",
      onEndMessage: '🔥 Le fiamme si affievoliscono e si spengono. Il fumo si dissipa. L\'incendio è sotto controllo.',
      choices: JSON.stringify([
        { text: 'Tentare di spegnere le fiamme', outcome: { description: "Trovate un estintore e combattete le fiamme con coraggio. Il fuoco resiste ma alla fine cede sotto il getto di schiuma. Il corridoio è libero.", endEvent: true, hpChange: -5 } },
        { text: 'Cercare una via alternativa', outcome: { description: "Lasciate che il fuoco bruci e cercate un'altra via. Attraverso un condotto di ventilazione trovate una stanza sicura con alcuni rifornimenti abbandonati.", endEvent: true, receiveItems: [{ itemId: 'bandage', quantity: 2 }], hpChange: -8 } },
      ]),
    },
  ];

  const newEvents = [
    {
      id: 'event_power_surge',
      title: 'Sovratensione Elettrica',
      description: "Le apparecchiature elettriche impazziscono! Scintille azzurre schizzano dai cavi scoperti e le lampade esplodono una dopo l'altra. Una scarica improvvisa potrebbe colpirvi da un momento all'altro.",
      icon: '⚡',
      type: 'power_surge',
      duration: 2,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 7,
      minTurn: 8,
      locationIds: '[]',
      onTriggerMessage: '⚡ BZZZT! Una violenta sovratensione elettrica percorre l\'intero edificio! Le apparecchiature impazziscono e scintille volano ovunque!',
      onEndMessage: '⚡ I cedimenti elettrici cessano. Le luci si stabilizzano con un ultimo tremolio.',
      choices: JSON.stringify([
        { text: 'Staccare la corrente dal quadro principale', outcome: { description: 'Correte al quadro elettrico e tagliate l\'alimentazione principale. Le scintille cessano immediatamente. Nel quadro trovate una batteria di riserva ancora carica.', endEvent: true, receiveItems: [{ itemId: 'fuse', quantity: 1 }], hpChange: 0 } },
        { text: 'Allontanarsi e aspettare', outcome: { description: 'Vi allontanate dalle apparecchiature elettriche. Una scintilla vi brucia leggermente il braccio, ma la sovratensione si esaurisce da sola dopo qualche minuto.', endEvent: true, hpChange: -8 } },
        { text: 'Cercare un pannello di controllo', outcome: { description: 'Attraversate la tempesta di scintille e raggiungete un terminale. Cercando di disattivare il sistema ricevete una forte scossa elettrica, ma riuscite a stabilizzare la rete.', endEvent: true, hpChange: -15 } },
      ]),
    },
    {
      id: 'event_earthquake',
      title: 'Terremoto',
      description: "La terra trema violentemente sotto i vostri piedi! Le pareti si crepano, le mensole cadono e il pavimento si spalanca. I passaggi si riempiono di macerie e polvere densa. Il terremoto sembra non voler finire mai.",
      icon: '🫨',
      type: 'earthquake',
      duration: 2,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 8,
      triggerChance: 5,
      minTurn: 20,
      locationIds: '[]',
      onTriggerMessage: '🫨 BOOOOM! Il terreno trema! Un terremoto violento scuote l\'intera zona! Le pareti si crepano e il soffitto minaccia di crollare!',
      onEndMessage: '🫨 Le scosse si attenuano gradualmente. Il terreno smette di tremare, ma i danni sono ovunque. Siete sopravvissuti.',
      choices: JSON.stringify([
        { text: 'Rifugiarsi sotto un tavolo robusto', outcome: { description: 'Vi tuffate sotto un tavolo di metallo mentre il soffitto piomba tutto intorno. Le scosse continuano ma la struttura regge. Quando il terremoto finisce, trovate una via d\'uscita tra le macerie.', endEvent: true, hpChange: -5 } },
        { text: 'Correre verso l\'uscita più vicina', outcome: { description: 'Correte disperatamente mentre tutto crolla intorno a voi. Una trave cade e vi sfiora, e dei calcinacci vi colpiscono alla testa. Riuscite a uscire, ma siete malconci.', endEvent: true, hpChange: -20 } },
      ]),
    },
    {
      id: 'event_swarm',
      title: 'Invasione di Insetti',
      description: "Un ronzio assordante riempie l'aria! Migliaia di insetti neri e lucidi emergono dalle crepe nei muri. Formiche, scarafaggi e vespe mostruose — tutte innaturalmente grandi — vi circondano in una nube vivente.",
      icon: '🪳',
      type: 'swarm',
      duration: 3,
      encounterRateMod: 5,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 2,
      triggerChance: 6,
      minTurn: 4,
      locationIds: '[]',
      onTriggerMessage: "🪳 BZZZZZ! Un'orda mostruosa di insetti emerge dalle pareti! Vi circondano da ogni parte, ronzando minacciosamente!",
      onEndMessage: '🪳 Lo sciame si disperde lentamente. Gli insetti scompaiono nelle fessure e nei tubi. L\'aria torna respirabile.',
      choices: JSON.stringify([
        { text: 'Usare il fuoco per allontanarli', outcome: { description: "Accendete una torcia improvvisata con stracci e alcol. Le fiamme spaventano lo sciame che si disperde urlante. Tra le ceneri trovate il nido con delle erbe medicinali usate come cibo.", endEvent: true, receiveItems: [{ itemId: 'herb_green', quantity: 2 }], hpChange: -3 } },
        { text: 'Coprirsi e attraversare lo sciame', outcome: { description: "Vi coprite il viso e correte attraverso la nube di insetti. Le punture vi bruciano dappertutto. Arrivate dall'altra parte coperti di morsi, intossicati e deboli.", endEvent: true, hpChange: -12 } },
        { text: 'Cercare un riparo sigillato', outcome: { description: "Troverete una stanza con porta stagna e vi chiudete dentro. Lo sciame passa ronzando furiosamente. Quando uscite, trovate dei rifornimenti lasciati da chi era qui prima.", endEvent: true, receiveItems: [{ itemId: 'bandage', quantity: 1 }], hpChange: 0 } },
      ]),
    },
    {
      id: 'event_evacuation',
      title: 'Evacuazione di Emergenza',
      description: "Sirene lontane ululano nella notte! Un altoparlante gracchiante annuncia: 'ATTENZIONE — Punto di evacuazione attivo presso la Torre dell'Orologio. Elitrasporto disponibile per i civili sopravvissuti. Tempo stimato: 20 minuti.' È una possibilità reale di fuga... o una trappola?",
      icon: '🚁',
      type: 'evacuation',
      duration: 2,
      encounterRateMod: -10,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 8,
      minTurn: 15,
      locationIds: '[]',
      onTriggerMessage: '🚁 WOOOP WOOOP! Un annuncio risuona dagli altoparlanti! "Punto di evacuazione attivo! Elitrasporto in arrivo!" Una possibilità di salvezza... o una trappola?',
      onEndMessage: '🚁 Le sirene si spengono. L\'annuncio non si ripete. Non c\'è nessun elicottero in arrivo. Era tutto un\'illusione... o no?',
      choices: JSON.stringify([
        { text: 'Correre verso il punto di evacuazione', outcome: { description: 'Correte disperatamente verso la Torre dell\'Orologio. Trovate un punto di raccolta con segni di recente attività — gocce di sangue, munizioni sparse. Nessun elicottero, ma qualcuno è stato qui. Trovate un kit medico abbandonato.', endEvent: true, receiveItems: [{ itemId: 'first_aid', quantity: 1 }], hpChange: 0 } },
        { text: 'Ignorare l\'annuncio', outcome: { description: 'Vi fidate del vostro istinto e ignorate l\'annuncio. Le sirene cessano dopo qualche minuto. Avete evitato una possibile trappola, ma non saprete mai se era reale.', endEvent: true, hpChange: 0 } },
        { text: 'Controllare la radio per conferme', outcome: { description: 'Sintonizzate la radio sulle frequenze di emergenza. Ricevete solo statica e un messaggio distorto: "...non andate alla torre... è una trappola dell\'Umbre..." La trasmissione si interrompe.', endEvent: true, hpChange: 0 } },
      ]),
    },
    {
      id: 'event_flood',
      title: 'Allagamento',
      description: "Un rombo sordo cresce nelle profondità. L'acqua grezza e fetida esplode dalle condutture e inondò i corridoi in pochi secondi. Il livello sale rapidamente — ginocchia, cosce, vita. Le creature acquatiche agitano l'acqua scura intorno a voi.",
      icon: '🌊',
      type: 'flood',
      duration: 2,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 3,
      triggerChance: 6,
      minTurn: 10,
      locationIds: '[]',
      onTriggerMessage: '🌊 GLOO GLOO GLOO! L\'acqua esplode dalle tubature! Un\'ondata improvvisa inonda l\'area! Il livello sale rapidamente!',
      onEndMessage: '🌊 Le acque si ritirano lentamente. L\'area è devastata ma percorribile. I vostri vestiti sono fradici.',
      choices: JSON.stringify([
        { text: 'Trovare un punto elevato', outcome: { description: 'Arrampicatevi su una scaffalatura metallica mentre l\'acqua sale. Dall\'alto vedete un oggetto che galleggia — una borsa impermeabile contenente munizioni e un antidoto.', endEvent: true, receiveItems: [{ itemId: 'ammo_pistol', quantity: 3 }, { itemId: 'antidote', quantity: 1 }], hpChange: 0 } },
        { text: 'Nuotare verso l\'uscita', outcome: { description: 'Vi tuffate nell\'acqua scura e nuotate verso l\'uscita. Qualcosa vi sfiora le gambe nell\'oscurità. Arrivate dall\'altra parte tremanti, intossicati dall\'acqua contaminata.', endEvent: true, hpChange: -15 } },
        { text: 'Tappare la conduttura principale', outcome: { description: 'Con uno sforzo erculeo, spingete un tavolo contro la conduttura rotta. L\'acqua smette di scorrere, ma siete esausti per lo sforzo e la corrente vi ha trascinato contro il muro.', endEvent: true, hpChange: -10 } },
      ]),
    },
    {
      id: 'event_sabotage',
      title: 'Sabotaggio Umbrella',
      description: "Esplosioni coordinate in sequenza! Qualcuno sta facendo saltare le strutture dell'Umbrella deliberatamente. Le pareti tremano, i soffitti si spaccano e l'intero edificio minaccia di venire giù. È qualcuno dall'interno? Un disperato? Un infiltrato?",
      icon: '💣',
      type: 'sabotage',
      duration: 3,
      encounterRateMod: 15,
      enemyStatMult: 1.0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 5,
      minTurn: 12,
      locationIds: '[]',
      onTriggerMessage: '💣 BOOM! BOOM! BOOM! Esplosioni in sequenza! Qualcuno sta facendo saltare le strutture dell\'Umbrella! I corridoi crollano intorno a voi!',
      onEndMessage: '💣 Le esplosioni cessano. Il silenzio che segue è ancor più terrificante. Chiunque fosse il responsabile, è fuggito.',
      choices: JSON.stringify([
        { text: 'Seguire il rumore delle esplosioni', outcome: { description: 'Vi dirigete verso la fonte delle esplosioni. Trovate un corridoi diroccato e tra le macerie... un deposito segreto dell\'Umbrella con armi e munizioni abbandonate nella fretta.', endEvent: true, receiveItems: [{ itemId: 'ammo_shotgun', quantity: 3 }, { itemId: 'ammo_magnum', quantity: 2 }], hpChange: -5 } },
        { text: 'Fuggire nella direzione opposta', outcome: { description: 'Correte via dalle esplosioni. Una deflagrazione vi raggiunge e vi sbalza contro un muro. Siete feriti ma vivi.', endEvent: true, hpChange: -18 } },
        { text: 'Cercare il responsabile', outcome: { description: 'Inseguite la fonte delle esplosioni. Vedete una figura incappucciata che corre via con una borsa di esplosivi. Non riuscite a raggiungerla, ma trovate una granata caduta lungo il percorso.', endEvent: true, receiveItems: [{ itemId: 'ammo_grenade', quantity: 1 }], hpChange: -8 } },
      ]),
    },
    {
      id: 'event_military_drop',
      title: 'Rifornimenti Militari',
      description: "Il sibilo di un paracadute taglia l'aria! Un contenitore militare cade dal cielo e atterra con un tonfo sordo nelle vicinanze. È contrassegnato con il sigillo dell'UBCS. Forse il governo sta ancora cercando di aiutare... o è una vecchia consegna mai ritirata.",
      icon: '📦',
      type: 'power_surge',
      duration: 1,
      encounterRateMod: 0,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 4,
      minTurn: 10,
      locationIds: '[]',
      onTriggerMessage: '📦 WHOOSH! Un contenitore militare cade dal cielo! È sigillato con il marchio UBCS. Potrebbe contenere rifornimenti preziosi!',
      onEndMessage: '📦 Il contenitore è stato aperto o ignorato. L\'opportunità è passata.',
      choices: JSON.stringify([
        { text: 'Aprire il contenitore', outcome: { description: 'Forzate il contenitore con un grimaldello. Dentro trovate munizioni militari e un kit medico da campo. Qualcuno voleva che questi rifornimenti arrivassero ai sopravvissuti.', endEvent: true, receiveItems: [{ itemId: 'ammo_machinegun', quantity: 5 }, { itemId: 'first_aid', quantity: 1 }], hpChange: 0 } },
        { text: 'Ignorare — potrebbe essere una trappola', outcome: { description: 'Vi fidate del vostro istinto e vi allontanate. Il contenitore rimane lì, sigillato. Non saprete mai cosa conteneva. La prudenza è la madre della sopravvivenza.', endEvent: true, hpChange: 0 } },
        { text: 'Ispezionare da lontano con la torcia', outcome: { description: `Avvicinatevi con cautela e illuminate il contenitore. Vedete un'etichetta: "PERICOLO — MATERIALE BIOLOGICO". È una consegna dell'Umbrella, non un salvataggio. Vi allontanate rapidamente.`, endEvent: true, hpChange: 0 } },
      ]),
    },
    {
      id: 'event_panic_civilians',
      title: 'Folla in Panico',
      description: "Urla disperate echeggiano nei corridoi! Un gruppo di civili terrorizzati irrompe nella vostra area, correndo ciechi verso l'uscita. Spintonano, urlano e piangono. Tra loro ci sono feriti, bambini e anziani. Qualcuno potrebbe essere infetto.",
      icon: '😱',
      type: 'swarm',
      duration: 2,
      encounterRateMod: 10,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 5,
      minTurn: 3,
      locationIds: '[]',
      onTriggerMessage: '😱 AAAAAH! Una folla di civili terrorizzati irrompe nell\'area! Corrono in ogni direzione, urlando e spintonando!',
      onEndMessage: '😱 La folla si disperde. Alcuni scappano, altri si nascondono. Il silenzio torna a regnare, amaro e vuoto.',
      choices: JSON.stringify([
        { text: 'Aiutare i feriti a mettersi al sicuro', outcome: { description: 'Fermate la folla e organizzate un punto di raccolta. Curate i feriti con le vostre scorte. Una donna vi porge un oggetto: "Prendilo, l\'ho trovato nel reparto chirurgico. Ti servirà più di me."', endEvent: true, receiveItems: [{ itemId: 'bandage', quantity: 3 }, { itemId: 'antidote', quantity: 1 }], hpChange: 0 } },
        { text: 'Allontanarsi e lasciarli passare', outcome: { description: 'Vi fate da parte mentre la folla passa come un fiume in piena. Nella confusione vi rubano delle munizioni dalla tasca. Quando la folla se ne va, trovate un borsone abbandonato con delle erbe.', endEvent: true, receiveItems: [{ itemId: 'herb_green', quantity: 2 }], hpChange: -3 } },
        { text: 'Controllare se qualcuno è infetto', outcome: { description: 'Esaminate i civili uno per uno. Uno ha un morso sul braccio — è nel primo stadio di infezione. Lo isolate mentre gli altri fuggono terrorizzati. L\'uomo infetto vi ringrazia con gli occhi pieni di lacrime prima che voi ve ne andiate.', endEvent: true, hpChange: 0 } },
      ]),
    },
    {
      id: 'event_gas_explosion',
      title: 'Esplosione di Gas',
      description: "Una scintilla accende una nuvola di gas accumulata! L'esplosione è devastante — un boato assordante seguito da una vampata di calore che vi scaraventa contro il muro. Le fiamme si diffondono rapidamente lungo le condutture del gas danneggiate.",
      icon: '💥',
      type: 'fire',
      duration: 2,
      encounterRateMod: 10,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 5,
      triggerChance: 4,
      minTurn: 14,
      locationIds: '[]',
      onTriggerMessage: '💥 BOOOOM! Una nube di gas esplode! L\'onda d\'urto vi scaraventa contro il muro! Le fiamme divampano ovunque!',
      onEndMessage: '💥 Le fiamme si spengono lentamente. Il gas si è esaurito. L\'area è piena di macerie carbonizzate.',
      choices: JSON.stringify([
        { text: 'Fuggire prima che esploda di nuovo', outcome: { description: 'Correte lontano dalle condutture di gas prima che altre esplosioni si verificano. Lungo la via trovate un armadietto medico sfondato con qualche benda ancora intatta.', endEvent: true, receiveItems: [{ itemId: 'bandage', quantity: 2 }], hpChange: -10 } },
        { text: 'Chiudere la valvola del gas', outcome: { description: 'Avanzate tra le fiamme e raggiungete la valvola principale. Con un ultimo sforzo la chiudete. Le fiamme si attenuano. Siete ustionato ma avete salvato l\'area da una deflagrazione più grande.', endEvent: true, hpChange: -20 } },
      ]),
    },
    {
      id: 'event_mutation_cloud',
      title: 'Nube di Mutazione',
      description: "Un vapore viola innaturale si alza dal pavimento. Non è gas — è il T-virus in forma aeriforme, concentrato e attivo. Le creature esposte si irrigidiscono e iniziano a mutare. Anche la vostra pelle prude e brucia. Dovete fuggire prima di essere contagiati.",
      icon: '☣️',
      type: 'gas_leak',
      duration: 2,
      encounterRateMod: 5,
      enemyStatMult: 1.3,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 5,
      minTurn: 16,
      locationIds: '[]',
      onTriggerMessage: '☣️ Un vapore viola innaturale sale dal pavimento! È T-virus aeriforme! Le creature iniziano a mutare! Fuggite o sarete contagiati!',
      onEndMessage: '☣️ Il vapore viola si dissipa lentamente. Le creature mutate tornano normali... o quasi. I vostri polmoni bruciano.',
      choices: JSON.stringify([
        { text: 'Tenere il fiato e correre', outcome: { description: 'Trattenete il respiro e correte attraverso il vapore viola. Le vostre narici bruciano ma riuscite a uscire prima di inalarlo. Un antidoto dall\'armadietto vi salva da una possibile infezione latente.', endEvent: true, receiveItems: [{ itemId: 'antidote', quantity: 2 }], hpChange: -5 } },
        { text: 'Usare un panno bagnato come filtro', outcome: { description: 'Bagnate un panno e vi coprite la bocca. Filtrate parzialmente il vapore ma non abbastanza. Tossite sangue e sentite la pelle bruciare. Siete stati esposti al virus.', endEvent: true, hpChange: -25 } },
        { text: 'Cercare una maschera antigas nei dintorni', outcome: { description: 'Frugate freneticamente e trovate una maschera antigas in un armadietto di sicurezza. La indossate appena in tempo. Il vetro della maschera si appanna ma il filtro vi protegge. Trovate anche delle munizioni nell\'armadietto.', endEvent: true, receiveItems: [{ itemId: 'ammo_pistol', quantity: 5 }], hpChange: 0 } },
      ]),
    },
    {
      id: 'event_helicopter_signal',
      title: 'Segnale Elicottero',
      description: "L'ormai familiare BRRR-BRRR-BRRR di un elicottero risuona sopra di voi! Una luce di ricerca danza sui tetti. È un elicottero militare — forse dell'esercito, forse dell'Umbrella. Lanciano un segnale luminoso verso la vostra posizione. Vogliono atterrare?",
      icon: '📡',
      type: 'evacuation',
      duration: 1,
      encounterRateMod: -15,
      enemyStatMult: 0,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 3,
      minTurn: 20,
      locationIds: '[]',
      onTriggerMessage: '📡 BRRR-BRRR-BRRR! Un elicottero sorvola la zona! Una luce di ricerca vi individua! Sta per atterrare!',
      onEndMessage: '📡 L\'elicottero si allontana senza atterrare. Il segnale si perde nel buio. Non tornerà.',
      choices: JSON.stringify([
        { text: 'Segnalarsi con una torcia', outcome: { description: 'Accendete la torcia e la agitate freneticamente. L\'elicottero vi vede! Lancia un kit di sopravvivenza legato a un paracadute. Poi si allontana — non può atterrare qui, è troppo pericoloso. Ma il kit è vostro.', endEvent: true, receiveItems: [{ itemId: 'spray', quantity: 1 }, { itemId: 'ammo_shotgun', quantity: 3 }], hpChange: 0 } },
        { text: 'Nascondersi — potrebbe essere l\'Umbrella', outcome: { description: 'Vi nascondete tra le rovine. L\'elicottero sorvola più volte ma non vi trova. Vedete il logo sull\'ala — è l\'Umbrella. Avete fatto bene a nascondervi. Lasciano cadere qualcosa nella zona: una piccola scatola medica.', endEvent: true, receiveItems: [{ itemId: 'bandage', quantity: 3 }], hpChange: 0 } },
      ]),
    },
    {
      id: 'event_uhf_disturbance',
      title: 'Disturbo Radio UHF',
      description: "La vostra radio emette un forte segnale UHF — una frequenza militare non autorizzata. Una voce distorta trasmette coordinate e codici di sicurezza. Tra il statica, riuscite a distinguere parole: '... SOPRAVVIVISSUTI ... RACCOGLTA ... T-103 ... ESTERMINARE ...'. L'Umbrella sta coordinando qualcosa.",
      icon: '📻',
      type: 'alarm',
      duration: 2,
      encounterRateMod: 20,
      enemyStatMult: 1.1,
      searchBonus: false,
      damagePerTurn: 0,
      triggerChance: 6,
      minTurn: 6,
      locationIds: '[]',
      onTriggerMessage: '📻 SHHHHK! La radio gracchia su una frequenza UHF! Una voce distorta trasmette: "...SOPRAVVIVISSUTI...RACCOGLTA...T-103...ESTERMINARE..." L\'Umbrella sta coordinando qualcosa!',
      onEndMessage: '📻 La trasmissione UHF si interrompe bruscamente. La radio torna al silenzio. Siete stati avvisati.',
      choices: JSON.stringify([
        { text: 'Registrare le coordinate e avvisare gli altri', outcome: { description: 'Trascrivete le coordinate dalla radio. Potrebbero indicare un punto di raccolta o... un bersaglio. Trovate un sopravvissuto nascosto nelle vicinanze che vi offre un antidoto in cambio delle informazioni.', endEvent: true, receiveItems: [{ itemId: 'antidote', quantity: 2 }], hpChange: 0 } },
        { text: 'Cambiare frequenza per non essere localizzati', outcome: { description: 'Spegnete la radio immediatamente per evitare che l\'Umbrella vi localizzi. Mentre vi muovete, trovate un punto di rifornimento dimenticato con delle munizioni.', endEvent: true, receiveItems: [{ itemId: 'ammo_pistol', quantity: 5 }], hpChange: 0 } },
        { text: 'Tentare di rispondere alla trasmissione', outcome: { description: 'Provate a comunicare sulla stessa frequenza. "Chiunque ascolti, siamo sopravvissuti civili!" La risposta è un creepente silenzio, seguito da: "LOCALIZZAZIONE IN CORSO." Vi muovete immediatamente. L\'adrenalina vi fa tremare le mani.', endEvent: true, hpChange: -5 } },
      ]),
    },
  ];

  for (const event of [...existingEvents, ...newEvents]) {
    await prisma.dynamicEvent.create({ data: event });
  }

  console.log(`✅ Dynamic events seeded: ${existingEvents.length} existing + ${newEvents.length} new = ${existingEvents.length + newEvents.length} total.\n`);

  // ==========================================
  // 4. DOCUMENTS — 14 EXISTING + 8 NEW = 22 TOTAL
  // ==========================================
  console.log('📄 Seeding documents...');

  const existingDocs = [
    // City Outskirts
    {
      id: 'doc_survivor_note',
      title: 'Nota del Sopravvissuto',
      content: "Se qualcuno trova questo messaggio, scappate. La città è perduta. Ho visto i militari aprire il fuoco sui civili — non per proteggerci, ma per coprire la fuga dei ricercatori della Umbrella. Il virus si sta diffondendo troppo velocemente. Non ci sono vie di fuga dal lato est. La polizia alla R.P.D. sta ancora resistendo, ma per quanto ancora? Io non ce la faccio più...",
      type: 'note',
      locationId: 'city_outskirts',
      icon: '📝',
      rarity: 'common',
      isSecret: false,
    },
    {
      id: 'doc_umbrella_memo',
      title: 'Urgente: Fuga T-Virus',
      content: "Da: Dr. William Birkin <w.birkin@umbrella-corp.net>\nA: Direzione Umbrella <board@umbrella-corp.net>\nOggetto: INCIDENTE CRITICO — Fuga T-Virus\nData: 24 settembre, 02:47\nPriorità: ■■■ MASSIMA\n\nIl T-virus è stato accidentalmente rilasciato durante un sabotaggio alla rete di contenimento del laboratorio sotterraneo. Tutti i soggetti del Progetto Tyrant sono stati compromessi.\n\nAttivare il Protocollo di Pulizia immediatamente. Nessun testimone deve sopravvivere.\n\n— W.B.",
      type: 'email',
      locationId: 'city_outskirts',
      icon: '📁',
      rarity: 'uncommon',
      isSecret: false,
    },
    // RPD Station
    {
      id: 'doc_police_log',
      title: 'Registro Radio della Polizia',
      content: "22:15 — Segnalazioni di attacchi nella zona est. Mandato pattuglia Irons. 23:42 — La pattuglia non risponde. Niente di niente sulla radio. 00:30 — Il capo Irons ha ordinato di sigillare il distretto. Dice che non sta arrivando nessun soccorso. 01:15 — Sentiamo dei rumori dal sotterraneo. Non so cosa sia, ma i cani della K-9 sono impazziti. Dio, aiutateci.",
      type: 'report',
      locationId: 'rpd_station',
      icon: '📋',
      rarity: 'common',
      isSecret: false,
    },
    {
      id: 'doc_chief_diary',
      title: 'Diario del Capo Irons',
      content: "La Umbrella mi ha contattato di nuovo. Stanno costruendo un laboratorio segreto sotto l'ospedale della città, accessibile solo tramite un passaggio nascosto nella cantina. Il capo del progetto è un tipo chiamato Birkin — un genio, ma pericolosamente instabile. Mi hanno pagato profumatamente per tenere la polizia lontana da certe zone della città. Non so più cosa sia giusto e cosa sia sbagliato. Gli esperimenti su quelle creature... li sento urlare di notte.",
      type: 'diary',
      locationId: 'rpd_station',
      icon: '📔',
      rarity: 'rare',
      isSecret: false,
    },
    {
      id: 'doc_locker_photo',
      title: "Foto Familiare nell'Armadietto",
      content: 'Una foto consumata dal tempo raffigura un agente in uniforme con la moglie e due bambini. Sul retro c\'è scritto a matita: "A mia moglie Sarah e ai miei ragazzi. Tornerò a casa. Prometto. — M. Branagh, R.P.D." L\'agente Branagh è tra i corpi nel parcheggio sotterraneo.',
      type: 'photo',
      locationId: 'rpd_station',
      icon: '📷',
      rarity: 'common',
      isSecret: false,
    },
    // Hospital District
    {
      id: 'doc_patient_record',
      title: 'Cartella Clinica — Soggetto Zero',
      content: "REGISTRO SPERIMENTALE — Top Secret. Soggetto: \"Paziente Zero\". Età: 34 anni. Sesso: M. Esposizione: diretta al G-virus inalato. Giorno 1: Febbre alta, delirio. Giorno 2: Mutazione cellulare rapida, crescita muscolare anomala. Giorno 3: Soggetto ha rifiutato il cibo. Ha attaccato il personale medico. Isolamento fallito. Il G-virus è infinitamente più instabile del T-virus. Se qualcuno viene infettato, la mutazione è irreversibile.",
      type: 'umbrella_file',
      locationId: 'hospital_district',
      icon: '📁',
      rarity: 'uncommon',
      isSecret: false,
    },
    {
      id: 'doc_doctor_journal',
      title: 'Diario del Dr. Birkin',
      content: "Il Nemesis è quasi completo. Abbiamo incastonato un parassita NE-α nel sistema nervoso di un Tyrant di classe T-103. Il risultato è un'arma biologica senziente — capace di seguire obiettivi specifici e adattarsi alle condizioni di combattimento. Ma ieri sera ho visto il Nemesis rompere la sua cella di contenimento. Ha ucciso tre tecnici prima che riuscissimo a sedarlo. L'Umbrella vuole usarlo contro i membri della S.T.A.R.S. che sono sopravvissuti al massacro della villa.",
      type: 'diary',
      locationId: 'hospital_district',
      icon: '📔',
      rarity: 'rare',
      isSecret: false,
    },
    {
      id: 'doc_nurse_note',
      title: 'Per chi troverà questa lettera...',
      content: "Da: Maria Rossi <m.rossi@rc-hospital.org>\nA: Chiunque\nOggetto: Se state leggendo questo\n\nA chi troverà questa lettera: mi chiamo Maria e sono un'infermiera del turno di notte. Le cose qui sono peggiorate troppo in fretta. Prima i pazienti del reparto isolamento sono diventati aggressivi, poi le porte si sono chiuse da sole. Ho visto il dottor Chen nascondere una famiglia nel reparto pediatria. Se state leggendo questo, forse c'è ancora speranza. Prendete gli antidoti nella farmacia al secondo piano. Vi prego, non dimenticateci.",
      type: 'email',
      locationId: 'hospital_district',
      icon: '📧',
      rarity: 'common',
      isSecret: false,
    },
    // Sewers
    {
      id: 'doc_worker_note',
      title: 'Nota del Manutentore',
      content: "Giornale di bordo — Operai municipalità. Turno: notte del 24. Abbiamo sentito dei rumori provenienti dai condotti principali. Pensavamo fosse un animale bloccato. Quello che abbiamo trovato era... non so descriverlo. Una creatura senza occhi, con una lingua enorme. Ha ucciso Rodriguez e Ferretti prima che potessimo scappare. Sono barricato nella sala pompe. L'acqua sta salendo. Se qualcuno legge questo, non venite a cercarmi.",
      type: 'note',
      locationId: 'sewers',
      icon: '📝',
      rarity: 'common',
      isSecret: false,
    },
    {
      id: 'doc_umbrella_disposal',
      title: 'Report Smaltimento Umbrella',
      content: "REPORT INTERNO — Smaltimento Rifiuti Biologici. Le creature fallite del Progetto Tyrant vengono smaltite attraverso il sistema fognario della città, come da accordi con il municipio. Tuttavia, recentemente diversi soggetti hanno mostrato segni di \"riattivazione\" post-smaltimento. Si raccomanda di installare telecamere nel condotto principale vicino alla grata nord. Inoltre, la stanza di stoccaggio segreta nel tratto C-7 deve essere monitorata costantemente. Nessun operatore non autorizzato deve accedervi.",
      type: 'umbrella_file',
      locationId: 'sewers',
      icon: '📁',
      rarity: 'rare',
      isSecret: false,
      hintRequired: 'doc_chief_diary',
    },
    // Laboratory Entrance
    {
      id: 'doc_research_log',
      title: 'Aggiornamento Settimanale Lab B3',
      content: "Da: Team Ricerca Alpha <research.alpha@umbrella-corp.net>\nA: Quartier Generale <hq@umbrella-corp.net>\nOggetto: Report settimanale — Lab Umbrella Livello B3\n\nRegistro Operativo: Settimana 12: Il T-virus è stato stabilizzato al 97%. I Licker prodotti hanno superato tutti i test di combattimento. Settimana 15: Il progetto G-virus sta progredendo. Birkin rifiuta di condividere i dati con il quartier generale. È paranoico, pensa che vogliamo rubare il suo lavoro. Settimana 18: Evacuazione d'emergenza. I contenitori si sono rotti. Tutto il personale deve dirigersi ai punti di raccolta. Questo è il mio ultimo aggiornamento.",
      type: 'email',
      locationId: 'laboratory_entrance',
      icon: '📧',
      rarity: 'uncommon',
      isSecret: false,
    },
    {
      id: 'doc_tyrant_blueprint',
      title: 'Progetto Tyrant — Blueprints Originali',
      content: "PROGETTO T-103 — TYRANT. Classe: Arma Biologica Organica (B.O.W.). Obiettivo: Creare un soldato biologico perfetto — immune al dolore, obbediente, estremamente resiliente. Il Tyrant è stato progettato per essere trasportato in capsule criogeniche e attivato sul campo. Il punto debole è la cellula regolatrice nel tronco cerebrale: se danneggiata, il Tyrant entra in uno stato di mutazione instabile che lo rende più lento ma devastante. Un colpo diretto al centro vitale con armi pesanti può fermarlo.",
      type: 'umbrella_file',
      locationId: 'laboratory_entrance',
      icon: '📄',
      rarity: 'legendary',
      isSecret: true,
    },
    // Clock Tower
    {
      id: 'doc_final_report',
      title: 'Ordine Esecutivo: Pulizia',
      content: "Da: Comitato Esecutivo Umbrella <exec@umbrella-corp.net>\nA: Tutti i Laboratori Sotterranei\nOggetto: ORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City\nPriorità: ■■■ MASSIMA\n\nORDINE ESECUTIVO — Protocollo di Pulizia Raccoon City. Priorità: Massima. Tutti i laboratori sotterranei devono essere distrutti. Tutti i documenti compromessi devono essere inceneriti. I sopravvissuti nelle strutture mediche sono da considerarsi perduti. Un missile termobarico è stato autorizzato per le ore 06:00 del mattino successivo. La Umbrella negherà ogni coinvolgimento. La storia ufficiale parlerà di una \"fuga di gas tossico da un impianto chimico\". Nessuno deve sapere la verità.",
      type: 'email',
      locationId: 'clock_tower',
      icon: '📧',
      rarity: 'rare',
      isSecret: false,
    },
    {
      id: 'doc_helicopter_log',
      title: "Diario del Pilota d'Elicottero",
      content: "Registro di volo — Operazione \"Ultima Speranza\". Sono un pilota civile arruolato d'urgenza. Mi hanno detto che devo evacuare i sopravvissuti dalla torre dell'orologio, ma da quello che vedo dalla cabina... non c'è nessuno. La città è un inferno. Il fuoco brucia ovunque e quelle cose — quelle cose sono ovunque. Devo mantenere la rotta per altri dieci minuti. Se non trovo nessuno, torno alla base. Che Dio aiuti Raccoon City.",
      type: 'note',
      locationId: 'clock_tower',
      icon: '📝',
      rarity: 'uncommon',
      isSecret: false,
    },
  ];

  const newDocs = [
    {
      id: 'doc_mercenary_log',
      title: 'Diario del Mercenario',
      content: "Giorno 3 — Sono rimasto senza munizioni da due giorni. Il mio contratto prevedeva l'estrazione in 24 ore. Nessuno è venuto. L'Umbrella ci ha usati come esca — voleva vedere quanto resistevano le creature contro truppe addestrate. Bufera è morto ieri. Non per i mostri — per lo shock. Ha visto cosa è successo al soggetto 17 e si è messo a urlare fino a perdere i sensi. Non si è più svegliato. Ho trovato questo rifugio sotto una banca. Se qualcuno legge, l'arma a solvente è nel cassetto sotto il letto.",
      type: 'diary',
      locationId: 'city_outskirts',
      icon: '📔',
      rarity: 'common',
      isSecret: false,
    },
    {
      id: 'doc_security_footage',
      title: 'Report Footage Sicurezza',
      content: "REPORT INTERNO — RPD Divisione Sicurezza. Analisi footage telecamere di sorveglianza, 24 settembre. Ore 01:45 — Il capitano Branagh registra una violazione al cancello est. Ore 02:12 — Le telecamere del parcheggio B rilevano movimenti anomali. Ore 02:30 — Perdita segnale telecamera corridoio C. Ultimo frame: una figura alta almeno due metri e mezzo con arti sproporzionati. Ore 03:00 — Tutte le telecamere offline. Il personale di sicurezza non risponde. Raccomandazione: attivare protocollo evacuazione immediata.",
      type: 'report',
      locationId: 'rpd_station',
      icon: '📋',
      rarity: 'uncommon',
      isSecret: false,
    },
    {
      id: 'doc_patient_letter',
      title: 'Lettera di un Paziente',
      content: "Cara mamma, mi dispiace di non essere venuto a trovarti domenica. Il dottore dice che devo restare in osservazione ancora qualche giorno — niente di grave, mi assicura. Ma la notte scorsa ho sentito delle urla dal piano di sotto. Non sembravano urla umane. L'infermiera Maria mi ha detto di non preoccuparmi, che sono solo gli impianti della vecchia struttura che scricchiolano. Ma ho visto un orderliness con gli occhi rossi portare una barella coperta verso il sotterraneo. Sulla barella si muoveva ancora. Ti voglio bene, mamma. Tuo figlio, Luca.",
      type: 'note',
      locationId: 'hospital_district',
      icon: '📝',
      rarity: 'common',
      isSecret: false,
    },
    {
      id: 'doc_umbrella_internal',
      title: 'Memo Interno Umbrella',
      content: "DA: Divisione Operazioni Speciali, Settore 7\nA: Dr. Alexander Ashford, Laboratorio Sotterraneo B4\nOGGETTO: Protocollo NEXUS — Implementazione Immediata\n\nAshford, il Direttivo ha approvato il Protocollo NEXUS. Tutti i soggetti di Classe C e superiori devono essere trasferiti nel nuovo impianto di Rockfort Island entro 48 ore. I Licker di Classe B saranno smaltiti come da procedura standard attraverso il sistema fognario. Il personale non autorizzato presente nella struttura durante il trasferimento sarà eliminato. Nessuna eccezione. Documenta tutto e brucia i file dopo la lettura.",
      type: 'umbrella_file',
      locationId: 'sewers',
      icon: '📁',
      rarity: 'rare',
      isSecret: true,
    },
    {
      id: 'doc_lab_account',
      title: 'Account del Laboratorio',
      content: "Da: Sistemi IT Umbrella <it-admin@umbrella-corp.net>\nA: Nuovo Personale, Lab Raccoon City\nOGGETTO: Credenziali di accesso temporanee\n\nBenvenuto nel laboratorio sotterraneo Raccoon City. Le vostre credenziali temporanee sono: Username: LAB_TEMP_47; Password: T-V1RUS_CLEANUP_99. Avete accesso ai livelli B1-B3. Il livello B4 richiede autorizzazione speciale dal Dr. Voss o dal Dr. Ashford. IMPORTANTE: Non tentare MAI di accedere al server principale senza supervisore. Le contromisure di sicurezza del Progetto Tyrant sono letali. In caso di emergenza, dirigersi al punto di evacuazione E-7. Buon lavoro.",
      type: 'email',
      locationId: 'laboratory_entrance',
      icon: '📧',
      rarity: 'uncommon',
      isSecret: false,
    },
    {
      id: 'doc_voss_diary',
      title: 'Diario del Dr. Voss',
      content: "3 ottobre — Sono un mostro. No, peggio: ho creato mostri. Il Tyrant T-103 è il mio capolavoro e la mia maledizione. Ricordo ancora i suoi occhi — vuoti, assenti, ma pieni di una rabbia primordiale. Birkin dice che è un successo. Io vedo solo sofferenza. 5 ottobre — I test sul campo iniziano domani. L'Umbrella vuole che il Tyrant venga testato contro i sopravvissuti della R.P.D. Mi rifiuto di essere presente. Ho copiato i dati sui server di backup. Se qualcuno troverà questo diario, per favore — portate queste prove alla luce. Il mondo deve sapere cosa l'Umbrella ha fatto. E cosa IO ho fatto.",
      type: 'diary',
      locationId: 'laboratory_entrance',
      icon: '📔',
      rarity: 'rare',
      isSecret: true,
    },
    {
      id: 'doc_military_orders',
      title: 'Ordini Militari Segreti',
      content: "CLASSIFICATO — UFFICIO COMANDO OPERAZIONI SPECIALI\nOPERAZIONE: PULIZIA RACCOON CITY\nPRIORITY: ALPHA\nOBBIETTIVO: Contenere il focolaio T-virus a Raccoon City. Nessun sopravvissuto civile deve lasciare la zona di quarantena. Le unità UBCS sono considerate sacrificabili. Il missile termobarico è autorizzato per le ore 06:00 se il contagio supera il 40% della popolazione. La copertura mediatica è già stata predisposta: \"esplosione in un impianto chimico\". Nessun militare deve parlare. Chiunque violi il silenzio sarà trattato come traditore.",
      type: 'report',
      locationId: 'city_outskirts',
      icon: '📋',
      rarity: 'rare',
      isSecret: false,
    },
    {
      id: 'doc_clock_tower_note',
      title: 'Nota nella Torre',
      content: "A chiunque trovi questo messaggio nella Torre dell'Orologio: sono il Vigile Anziano di Raccoon City. Sono salito qui quarant'anni fa per riparare l'orologio e non ne sono mai più sceso — è il mio rifugio, il mio nido. Ma stanotte le cose sono cambiate. Ho visto dal mio finestrino le luci del laboratorio sotto l'ospedale lampeggiare di rosso. Ho sentito le esplosioni e le urla. L'orologio si è fermato a mezzanotte e non è più ripartito. Forse è un segno. Nell'archivio dietro l'ingranaggio principale c'è un passaggio segreto che i costruttori hanno nascosto nel 1892. Forse sarà utile a qualcuno più giovane di me.",
      type: 'note',
      locationId: 'clock_tower',
      icon: '📝',
      rarity: 'legendary',
      isSecret: true,
    },
  ];

  for (const doc of [...existingDocs, ...newDocs]) {
    await prisma.document.create({ data: doc });
  }

  console.log(`✅ Documents seeded: ${existingDocs.length} existing + ${newDocs.length} new = ${existingDocs.length + newDocs.length} total.\n`);

  // ==========================================
  // VERIFICATION
  // ==========================================
  console.log('🔍 Verifying seed counts...');
  const itemCount = await prisma.item.count();
  const questCount = await prisma.sideQuest.count();
  const eventCount = await prisma.dynamicEvent.count();
  const docCount = await prisma.document.count();

  console.log(`  Items:     ${itemCount}`);
  console.log(`  Quests:    ${questCount}`);
  console.log(`  Events:    ${eventCount}`);
  console.log(`  Documents: ${docCount}`);
  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
