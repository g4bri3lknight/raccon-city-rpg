// Character utility functions — used at runtime by store.ts and loader.ts.
// Static character data lives in src/seed-data/characters.ts (seed routes).

// Compute proportional growth rates from stat point distribution
export function computeGrowthRates(stats: { hp: number; atk: number; def: number; spd: number }): { hp: number; atk: number; def: number; spd: number } {
  const total = stats.hp + stats.atk + stats.def + stats.spd;
  const budget = 12;
  return {
    hp: Math.max(4, Math.round((stats.hp / total) * budget)),
    atk: Math.max(1, Math.round((stats.atk / total) * budget)),
    def: Math.max(1, Math.round((stats.def / total) * budget)),
    spd: Math.max(0, Math.round((stats.spd / total) * budget)),
  };
}

// Get passive description for custom characters based on their stat distribution
export function getCustomPassiveDescription(stats: { hp: number; atk: number; def: number; spd: number }): string {
  const highest = Math.max(stats.hp, stats.atk, stats.def, stats.spd);

  if (highest === stats.hp) return 'Resistenza Innata: Sopravvive più a lungo grazie alla sua corporatura robusta. +10% HP massimo.';
  if (highest === stats.atk) return 'Istinto Predatore: I suoi colpi sono più precisi. +15% probabilità di colpo critico.';
  if (highest === stats.def) return 'Pelle Coriacea: Riduce i danni subiti del 10% in modo passivo.';
  return 'Riflessi Felini: La sua velocità naturale gli conferisce +10% probabilità di schivare.';
}
