import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
// Default settings — seeded on first GET if table is empty
const DEFAULTS: Record<string, { value: string; label: string; group: string; sortOrder: number }> = {
  // ── Title Screen ──
  'titleScreen.umbrellaText':    { value: '',                               label: 'Sottotitolo Superiore',           group: 'titleScreen.texts',  sortOrder: 0 },
  'titleScreen.title':           { value: 'RPG GAME',                     label: 'Titolo Principale',              group: 'titleScreen.texts',  sortOrder: 1 },
  'titleScreen.subtitle':        { value: 'Un\'avventura indimenticabile', label: 'Sottotitolo',                    group: 'titleScreen.texts',  sortOrder: 2 },
  'titleScreen.description':     { value: 'Esplora un mondo di mistero e avventura. Scegli saggiamente le tue azioni per sopravvivere.', label: 'Descrizione', group: 'titleScreen.texts',  sortOrder: 3 },
  'titleScreen.newGameBtn':      { value: 'Nuova partita',                 label: 'Tasto Nuova Partita',            group: 'titleScreen.buttons', sortOrder: 10 },
  'titleScreen.loadGameBtn':     { value: 'Carica partita',                label: 'Tasto Carica Partita',           group: 'titleScreen.buttons', sortOrder: 11 },
  'titleScreen.warningText':     { value: 'Gioco a turni per 1-3 giocatori', label: 'Testo Avvertenza', group: 'titleScreen.texts', sortOrder: 4 },
  // Visual style
  'titleScreen.umbrellaColor':   { value: '#94a3b8',   label: 'Colore Sottotitolo Superiore', group: 'titleScreen.style',   sortOrder: 20 },
  'titleScreen.titleColor':      { value: '#ffffff',   label: 'Colore Titolo',            group: 'titleScreen.style',   sortOrder: 21 },
  'titleScreen.titleGlow':       { value: '0 0 40px rgba(148,163,184,0.4), 0 0 80px rgba(148,163,184,0.2), 0 0 120px rgba(148,163,184,0.1)', label: 'Ombra Titolo (text-shadow)', group: 'titleScreen.style', sortOrder: 22 },
  'titleScreen.subtitleColor':   { value: '#94a3b8',   label: 'Colore Sottotitolo',       group: 'titleScreen.style',   sortOrder: 23 },
  'titleScreen.overlayOpacity':  { value: '0.7',       label: 'Opacità Overlay Sfondo',   group: 'titleScreen.style',   sortOrder: 24 },
  'titleScreen.btnBg':           { value: '#1e293b',   label: 'Sfondo Pulsanti (hex)',    group: 'titleScreen.style',   sortOrder: 30 },
  'titleScreen.btnBorder':       { value: '#334155',   label: 'Bordo Pulsanti (hex)',     group: 'titleScreen.style',   sortOrder: 31 },
  'titleScreen.btnHoverBg':      { value: '#334155',   label: 'Sfondo Pulsanti Hover (hex)', group: 'titleScreen.style', sortOrder: 32 },
  'titleScreen.btnHoverBorder':  { value: '#475569',   label: 'Bordo Pulsanti Hover (hex)', group: 'titleScreen.style', sortOrder: 33 },
  'titleScreen.btnTextColor':    { value: '#e2e8f0',   label: 'Testo Pulsanti (hex)',     group: 'titleScreen.style',   sortOrder: 34 },
  'titleScreen.btnGlowHover':    { value: 'rgba(100,116,139,0.4)', label: 'Glow Hover Pulsanti (rgba)', group: 'titleScreen.style', sortOrder: 35 },

  // ── Custom Character ──
  'customCharacter.statBudget':     { value: '{"totalPoints":50,"minPerStat":5,"maxPerStat":25,"defaults":{"hp":10,"atk":12,"def":10,"spd":8}}', label: 'Budget Punti Stat Personalizzato', group: 'customCharacter', sortOrder: 50 },
  'customCharacter.startingItems':  { value: '[]', label: 'Oggetti Iniziali Personalizzato (JSON)', group: 'customCharacter', sortOrder: 51 },

  // ── Gameplay ──
  'gameplay.maxInventorySlots':     { value: '12',  label: 'Slot Massimi Inventario',          group: 'gameplay.inventory', sortOrder: 100 },
  'gameplay.maxItemBoxSlots':       { value: '48',  label: 'Slot Massimi Item Box',           group: 'gameplay.itembox',   sortOrder: 110 },
  'gameplay.defaultItemBoxItems':   { value: '[]',  label: 'Oggetti Default Item Box (JSON)', group: 'gameplay.itembox',   sortOrder: 111 },
  'gameplay.startingInventorySlots':{ value: '6',   label: 'Slot Iniziali Inventario',        group: 'gameplay.inventory', sortOrder: 101 },

  // ── Difficulty ──
  'difficulty.sopravvissuto': { value: '{"label":"Sopravvissuto","color":"#22c55e","icon":"🏃","statMult":0.6,"lootMult":1.5,"minEnemies":1,"maxEnemies":2,"expMult":1.4,"enemyCritChance":5,"description":"Nemici deboli, molto bottino, EXP bonus. Per chi vuole godersi la storia."}', label: 'Difficoltà: Sopravvissuto', group: 'difficulty', sortOrder: 200 },
  'difficulty.normale':       { value: '{"label":"Normale","color":"#eab308","icon":"⚔️","statMult":0.85,"lootMult":1.1,"minEnemies":1,"maxEnemies":3,"expMult":1.0,"enemyCritChance":10,"description":"Bilanciato. L\'esperienza RPG completa."}', label: 'Difficoltà: Normale', group: 'difficulty', sortOrder: 201 },
  'difficulty.incubo':        { value: '{"label":"Incubo","color":"#ef4444","icon":"💀","statMult":1.4,"lootMult":0.6,"minEnemies":2,"maxEnemies":4,"expMult":0.8,"enemyCritChance":20,"description":"Nemici potenti, poco bottino. Solo per i più coraggiosi."}', label: 'Difficoltà: Incubo', group: 'difficulty', sortOrder: 202 },

  // ── Game Info ──
  'game.version':              { value: '1.24.0', label: 'Versione Gioco',                       group: 'game', sortOrder: 50 },
  'game.versionDate':          { value: new Date().toISOString().slice(0, 10), label: 'Data Versione', group: 'game', sortOrder: 51 },
  'game.versionChangelog':       { value: '13 miglioramenti UI/UX: loading screen branded, HP party safe room, quest tracker, minimap, coda notifiche, quick-heal, contatore ricerche, drag&drop inventario, tooltip item, fix contrasto, accessibilità, scorciatoie tastiera con overlay (H)', label: 'Modifiche Versione', group: 'game', sortOrder: 52 },

  // ── Combat Constants ──
  'combat.missChance':             { value: '8',    label: '% Probabilità Mancata Base',           group: 'combat', sortOrder: 300 },
  'combat.baseCritChance':         { value: '10',   label: '% Probabilità Critico Base',          group: 'combat', sortOrder: 301 },
  'combat.dpsCritChance':          { value: '25',   label: '% Probabilità Critico DPS',            group: 'combat', sortOrder: 302 },
  'combat.critMultiplier':         { value: '1.8',  label: 'Moltiplicatore Critico',              group: 'combat', sortOrder: 303 },
  'combat.defenseConstant':        { value: '50',   label: 'Costante Difesa (formula)',           group: 'combat', sortOrder: 304 },
  'combat.defendMultiplier':       { value: '1.8',  label: 'Moltiplicatore Difesa (in difesa)',   group: 'combat', sortOrder: 305 },
  'combat.maxDefendReduction':     { value: '0.9',  label: 'Riduzione Difesa Max (cap)',           group: 'combat', sortOrder: 306 },
  'combat.adrenalineDmgBonus':     { value: '1.25', label: 'Bonus Danno Adrenalina',              group: 'combat', sortOrder: 307 },
  'combat.controlStatusBonus':     { value: '20',   label: '% Bonus Status Control',               group: 'combat', sortOrder: 308 },
  'combat.healerCritHealChance':   { value: '20',   label: '% Prob Crit Heal Healer',             group: 'combat', sortOrder: 309 },
  'combat.healerCritHealMult':     { value: '1.5',  label: 'Moltiplicatore Crit Heal',            group: 'combat', sortOrder: 310 },
  'combat.damageVarianceMin':      { value: '85',   label: '% Varianza Danno Min',                 group: 'combat', sortOrder: 311 },
  'combat.damageVarianceMax':      { value: '115',  label: '% Varianza Danno Max',                 group: 'combat', sortOrder: 312 },
  'combat.noMissDmgVarianceMin':   { value: '90',   label: '% Varianza Danno No-Miss Min',        group: 'combat', sortOrder: 313 },
  'combat.noMissDmgVarianceMax':   { value: '110',  label: '% Varianza Danno No-Miss Max',        group: 'combat', sortOrder: 314 },
  'combat.defaultStatusDuration':  { value: '3',    label: 'Durata Status Default (turni)',       group: 'combat', sortOrder: 315 },
  'combat.defaultCooldown':        { value: '2',    label: 'Cooldown Speciale Default (turni)',   group: 'combat', sortOrder: 316 },
  'combat.speed':                  { value: '1.0',  label: 'Velocità Combattimento',             group: 'combat', sortOrder: 320 },
  'combat.summaryDisplayTime':    { value: '3.5',  label: 'Tempo Summary (secondi)',            group: 'combat', sortOrder: 322, helpText: 'Durata schermata riassuntiva post-combattimento prima della transizione' },
  'combat.enemyScalingPerLevel':  { value: '2',    label: 'Scaling Nemici x Livello (%)',       group: 'combat', sortOrder: 330, helpText: 'Bonus % statistiche nemici per ogni livello party sopra 1 (es. 2 = +2% per livello)' },
  'combat.enemyScalingCap':       { value: '40',   label: 'Cap Scaling Nemici (%)',              group: 'combat', sortOrder: 331, helpText: 'Bonus massimo % statistiche nemici dallo scaling livello (es. 40 = max +40% a livello 21)' },
  'combat.fleeBaseChance':        { value: '30',   label: 'Fuga: Chance Base (%)',               group: 'combat', sortOrder: 340, helpText: 'Probabilità base di fuga dal combattimento' },
  'combat.fleeSpdWeight':         { value: '5',    label: 'Fuga: Peso Velocità',                group: 'combat', sortOrder: 341, helpText: 'Punti % fuga per ogni punto SPD in più/meno del nemico' },
  'combat.fleeMinChance':         { value: '10',   label: 'Fuga: Chance Minima (%)',             group: 'combat', sortOrder: 342, helpText: 'Probabilità minima di fuga anche se i nemici sono molto più veloci' },
  'combat.fleeMaxChance':         { value: '80',   label: 'Fuga: Chance Massima (%)',            group: 'combat', sortOrder: 343, helpText: 'Probabilità massima di fuga anche se il party è molto più veloce' },
  'combat.fleeBehavior':           { value: 'return', label: 'Comportamento Fuga',                group: 'combat', sortOrder: 344, helpText: 'Cosa succede quando il giocatore fugge: return=torna indietro, stay=resta, retry=nemici restano' },
  'combat.autoUseItems':           { value: 'true', label: 'AI usa oggetti',                     group: 'combat', sortOrder: 321 },

  // ── New Game+ ──
  'ngplus.cycle1Multiplier':       { value: '1.15', label: 'Molt. Ciclo 1 NG+',                group: 'ngplus', sortOrder: 400 },
  'ngplus.cycle2Multiplier':       { value: '1.30', label: 'Molt. Ciclo 2 NG+',                group: 'ngplus', sortOrder: 401 },
  'ngplus.cycle3PlusMultiplier':   { value: '1.50', label: 'Molt. Ciclo 3+ NG+',               group: 'ngplus', sortOrder: 402 },
  'ngplus.carriedCraftPointsPercent': { value: '30',  label: '% Craft Points Portati',          group: 'ngplus', sortOrder: 403 },
  'ngplus.bonusItemCycle':         { value: '2',    label: 'Ciclo Minimo Bonus Item',           group: 'ngplus', sortOrder: 404 },
  'ngplus.bonusItemId':            { value: 'antidote', label: 'Bonus Item ID NG+',              group: 'ngplus', sortOrder: 405 },
  'ngplus.bonusItemQuantity':      { value: '2',    label: 'Bonus Item Quantità NG+',           group: 'ngplus', sortOrder: 406 },

  // ── NPC Reputation ──
  'reputation.discountThreshold1':  { value: '4',    label: 'Soglia Sconto 1',                  group: 'reputation', sortOrder: 500 },
  'reputation.discountThreshold2':  { value: '7',    label: 'Soglia Sconto 2',                  group: 'reputation', sortOrder: 501 },
  'reputation.discountAmount1':     { value: '1',    label: 'Sconto 1 (prezzo -N)',              group: 'reputation', sortOrder: 502 },
  'reputation.discountAmount2':     { value: '2',    label: 'Sconto 2 (prezzo -N)',              group: 'reputation', sortOrder: 503 },
  'reputation.questRepGain':        { value: '2',    label: 'Reputazione per Quest',             group: 'reputation', sortOrder: 504 },
  'reputation.suspiciousThreshold': { value: '-2',   label: 'Soglia Sospetto',                   group: 'reputation', sortOrder: 505 },

  // ── Theme ──
  'theme.primaryColor':     { value: '#dc2626', label: 'Colore Primario',          group: 'theme.colors',       sortOrder: 600 },
  'theme.secondaryColor':   { value: '#ef4444', label: 'Colore Secondario',        group: 'theme.colors',       sortOrder: 601 },
  'theme.accentColor':      { value: '#f87171', label: 'Colore Accento',          group: 'theme.colors',       sortOrder: 602 },
  'theme.backgroundColor':  { value: '#0a0a0a', label: 'Sfondo',                  group: 'theme.colors',       sortOrder: 603 },
  'theme.fontFamily':       { value: 'Courier New', label: 'Font Family',          group: 'theme.typography',   sortOrder: 610 },
  'theme.headingWeight':    { value: 'extrabold', label: 'Peso Titoli',            group: 'theme.typography',   sortOrder: 611 },
  'theme.fontSizeScale':    { value: '1.0',     label: 'Scala Font',              group: 'theme.typography',   sortOrder: 612 },
  'theme.cardStyle':        { value: 'solid',   label: 'Stile Card',              group: 'theme.interface',    sortOrder: 620 },
  'theme.cardOpacity':      { value: '0.6',     label: 'Opacità Card',            group: 'theme.interface',    sortOrder: 621 },
  'theme.borderRadius':     { value: '12',      label: 'Border Radius',           group: 'theme.interface',    sortOrder: 622 },
  'theme.borderColor':      { value: '#dc262620', label: 'Colore Bordo',          group: 'theme.interface',    sortOrder: 623 },
  'theme.buttonStyle':      { value: 'rounded', label: 'Forma Pulsanti',          group: 'theme.buttons',      sortOrder: 630 },
  'theme.buttonVariant':    { value: 'filled',  label: 'Variante Pulsanti',       group: 'theme.buttons',      sortOrder: 631 },
  'theme.tableStyle':       { value: 'clean',   label: 'Stile Tabella',           group: 'theme.tables',       sortOrder: 640 },
  'theme.hoverHighlight':   { value: 'strong',  label: 'Evidenziazione Hover',    group: 'theme.tables',       sortOrder: 641 },
  'theme.glowEnabled':      { value: 'true',    label: 'Effetto Glow',            group: 'theme.effects',      sortOrder: 650 },
  'theme.glowColor':        { value: '#dc2626', label: 'Colore Glow',             group: 'theme.effects',      sortOrder: 651 },
  'theme.glowIntensity':    { value: '0.6',     label: 'Intensità Glow',          group: 'theme.effects',      sortOrder: 652 },
  'theme.scanlineEnabled':  { value: 'false',   label: 'Effetto Scanline',        group: 'theme.effects',      sortOrder: 653 },
  'theme.titleColor':       { value: '#e5e5e5', label: 'Colore Titolo',           group: 'theme.titleScreen',  sortOrder: 660 },
  'theme.titleGlow':        { value: '#dc2626', label: 'Glow Titolo',              group: 'theme.titleScreen',  sortOrder: 661 },
  'theme.subtitleColor':    { value: '#f87171', label: 'Colore Sottotitolo',       group: 'theme.titleScreen',  sortOrder: 662 },
};

async function ensureDefaults() {
  for (const [key, def] of Object.entries(DEFAULTS)) {
    await db.gameSetting.upsert({
      where: { key },
      update: {}, // only create if missing, never overwrite existing values
      create: { key, value: def.value, label: def.label, group: def.group, sortOrder: def.sortOrder },
    });
  }
}

// GET /api/admin/game-settings — return all settings (auto-seed defaults if empty)
export async function GET() {
  try {
    await ensureDefaults();
    const settings = await db.gameSetting.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(settings);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Game Settings]');
  }
}

// PUT /api/admin/game-settings — bulk update settings
// Body: { settings: { key: value, ... } }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object is required' }, { status: 400 });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.gameSetting.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          label: DEFAULTS[key]?.label ?? key,
          group: DEFAULTS[key]?.group ?? 'gameplay',
          sortOrder: DEFAULTS[key]?.sortOrder ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Game Settings]');
  }
}
