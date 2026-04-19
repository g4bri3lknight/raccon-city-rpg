export const RARITY_DOT_COLOR: Record<string, string> = {
  common: 'bg-gray-400',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-amber-500',
};

export const RARITY_BADGE: Record<string, string> = {
  common: 'bg-gray-700 text-gray-300',
  uncommon: 'bg-green-900/50 text-green-400',
  rare: 'bg-blue-900/50 text-blue-400',
  epic: 'bg-purple-900/50 text-purple-400',
  legendary: 'bg-amber-900/50 text-amber-400',
};

export const RARITY_LABEL: Record<string, string> = {
  common: 'Comune',
  uncommon: 'Non Comune',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Leggendario',
};

export const RARITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  common: { text: 'text-gray-400', bg: 'bg-gray-800/50', border: 'border-gray-600' },
  uncommon: { text: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' },
  rare: { text: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700' },
  epic: { text: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-700' },
  legendary: { text: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700' },
};

export const TYPE_LABELS: Record<string, string> = {
  weapon: 'Arma',
  healing: 'Cura',
  ammo: 'Munizioni',
  utility: 'Utilità',
  antidote: 'Antidoto',
  bag: 'Borsa',
  collectible: 'Collezionabile',
  key: 'Chiave',
  armor: 'Armatura',
  accessory: 'Accessorio',
  weapon_mod: 'Mod Arma',
};

export const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

export const TYPE_ORDER: Record<string, number> = {
  weapon: 0,
  weapon_mod: 1,
  armor: 2,
  accessory: 3,
  healing: 4,
  ammo: 5,
  antidote: 6,
  utility: 7,
  bag: 8,
  collectible: 9,
  key: 10,
};
