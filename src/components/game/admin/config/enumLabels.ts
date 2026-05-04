// ═══════════════════════════════════════════════════════════════
// Enum Italian Translations
// ═══════════════════════════════════════════════════════════════
export const ENUM_LABELS: Record<string, Record<string, { it: string; hint?: string }>> = {
  itemType: {
    weapon:      { it: 'Arma' },
    healing:     { it: 'Cura' },
    ammo:        { it: 'Munizioni' },
    utility:     { it: 'Utilità' },
    antidote:    { it: 'Antidoto' },
    bag:         { it: 'Zaino' },
    collectible: { it: 'Collezionabile' },
    key:         { it: 'Chiave' },
    armor:       { it: 'Armatura', hint: 'Equipaggiabile: DEF, HP, effetto speciale' },
    accessory:   { it: 'Accessorio', hint: 'Equipaggiabile: ATK, DEF, HP, SPD, crit, effetto speciale' },
    weapon_mod:  { it: 'Mod Arma', hint: 'Da installare nell\'arma: ATK, crit, status' },
  },
  rarity: {
    common:    { it: 'Comune' },
    uncommon:  { it: 'Non Comune' },
    rare:      { it: 'Raro' },
    epic:      { it: 'Epico' },
    legendary: { it: 'Leggendario' },
  },
  questType: {
    fetch:   { it: 'Recupera', hint: 'portare un oggetto all\'NPC' },
    kill:    { it: 'Uccidi', hint: 'eliminare un nemico' },
    explore: { it: 'Esplora', hint: 'visitare una location' },
  },
  eventType: {
    blackout:  { it: 'Blackout', hint: 'buio totale' },
    alarm:     { it: 'Allarme', hint: 'aumenta incontri' },
    collapse:  { it: 'Crollo', hint: 'danni per turno' },
    lockdown:  { it: 'Isolamento', hint: 'aree chiuse' },
    gas_leak:  { it: 'Fuga di Gas', hint: 'danni cumulativi' },
    fire:      { it: 'Incendio', hint: 'danni gravi' },
    nemesis_invasion: { it: 'Invasione Nemesis', hint: 'Nemesis attacca ogni N turni' },
    horde:           { it: 'Orda', hint: 'ondata continua di nemici' },
  },
  documentType: {
    diary:          { it: 'Diario' },
    umbrella_file:  { it: 'Documento Umbrella' },
    note:           { it: 'Nota' },
    photo:          { it: 'Foto' },
    report:         { it: 'Rapporto' },
    email:          { it: 'Email' },
  },
  soundCategory: {
    combat:  { it: 'Combattimento' },
    enemy:   { it: 'Nemico' },
    weapon:  { it: 'Arma' },
    ui:      { it: 'Interfaccia' },
    ambient: { it: 'Ambientazione' },
    bgm:     { it: 'Musica' },
  },
  imageCategory: {
    background: { it: 'Sfondo' },
    icon:       { it: 'Icona' },
    portrait:   { it: 'Ritratto' },
    sprite:     { it: 'Sprite' },
    ui:         { it: 'Interfaccia' },
  },
  weaponType: {
    melee:  { it: 'Corpo a Corpo' },
    ranged: { it: 'A Distanza' },
  },
  discoveryMethod: {
    search:     { it: 'Ricerca', hint: 'scopribile tramite il pulsante Cerca' },
    document:   { it: 'Documento', hint: 'richiede un documento specifico' },
    npc_hint:   { it: 'Suggerimento NPC', hint: 'richiede una quest NPC completata' },
  },
  archetype: {
    tank:    { it: 'Tank' },
    healer:  { it: 'Medico' },
    dps:     { it: 'DPS' },
    control: { it: 'Controllo' },
    custom:  { it: 'Personalizzato' },
    survivor: { it: 'Sopravvissuto' },
  },
  specialCategory: {
    offensive: { it: 'Offensivo' },
    defensive: { it: 'Difensivo' },
    support:   { it: 'Supporto' },
    control:   { it: 'Controllo' },
  },
  specialTargetType: {
    self:        { it: 'Sé Stesso' },
    enemy:       { it: 'Nemico Singolo' },
    all_enemies: { it: 'Tutti i Nemici', hint: 'Colpisce tutti i nemici in combattimento' },
    ally:        { it: 'Alleato' },
    all_allies:  { it: 'Tutti gli Alleati' },
  },
  statusEffect: {
    poison:   { it: 'Avvelenamento' },
    bleeding: { it: 'Sanguinamento' },
    stunned:  { it: 'Stordimento' },
    adrenaline: { it: 'Adrenalina' },
  },
  modType: {
    melee:  { it: 'Corpo a Corpo', hint: 'Solo per armi melee' },
    ranged: { it: 'A Distanza', hint: 'Solo per armi a distanza' },
    any:    { it: 'Universale', hint: 'Compatibile con tutti i tipi di arma' },
  },
  mapDangerLevel: {
    '-1':    { it: '⚙️ Automatico', hint: 'Calcolato automaticamente in base al pool nemici della location' },
    '0':     { it: '🟢 Sicura', hint: 'Poche minacce, area sicura' },
    '1':     { it: '🟡 Moderata', hint: 'Minacce moderate, attenzione' },
    '2':     { it: '🟠 Pericolosa', hint: 'Pericoloso, preparati al combattimento' },
    '3':     { it: '🔴 Mortale', hint: 'Molto pericoloso, rischio morte' },
  },
  fleeBehavior: {
    return: { it: '🔙 Ritorna alla stanza precedente', hint: 'Il giocatore torna nella stanza da cui è arrivato. I nemici nella stanza corrente respawnano al re-ingresso.' },
    stay:   { it: '📍 Resta nella stanza', hint: 'Il giocatore rimane nella stanza ma i nemici scompaiono temporaneamente. Al re-ingresso i nemici tornano.' },
    retry:  { it: '🔁 Nemici restano (Riprova)', hint: 'I nemici restano nella stanza. Se rientri, ricomincia il combattimento con gli stessi nemici.' },
  },
  recipeCategory: {
    ammo:    { it: 'Munizioni' },
    healing: { it: 'Guarigione' },
    booster: { it: 'Potenziamento' },
  },
  craftDifficulty: {
    easy:   { it: 'Semplice' },
    medium: { it: 'Medio' },
    hard:   { it: 'Difficile' },
  },
  roomType: {
    normal:    { it: 'Normale' },
    safe_room: { it: 'Stanza Salvatica' },
    boss_room: { it: 'Stanza Boss' },
    secret:    { it: 'Stanza Segreta' },
    shop:      { it: 'Negozio' },
    puzzle:    { it: 'Stanza Puzzle' },
    corridor:  { it: 'Corridoio' },
  },
  roomOrientation: {
    auto:       { it: '⚙️ Automatico', hint: 'Dedotto dai collegamenti: orizzontale se collega sinistra/destra, verticale se collega sopra/sotto' },
    horizontal: { it: '↔️ Orizzontale', hint: 'Rettangolo largo — ideale per corridoi che collegano stanze a sinistra/destra' },
    vertical:   { it: '↕️ Verticale', hint: 'Rettangolo alto — ideale per corridoi che collegano stanze sopra/sotto' },
  },
};

// Helper: get Italian label for an enum value
export function getEnumLabel(enumGroup: string, value: string): string {
  return ENUM_LABELS[enumGroup]?.[value]?.it ?? value;
}

// Helper: get hint for an enum value
export function getEnumHint(enumGroup: string, value: string): string | undefined {
  return ENUM_LABELS[enumGroup]?.[value]?.hint;
}
