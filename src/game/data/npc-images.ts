// NPC portrait image URLs — loaded from DB via /api/media/image
// Falls back to emoji if image is missing in DB

export const NPC_PORTRAIT_URLS: Record<string, string> = {
  npc_marco: '/api/media/image?id=npc_marco',
  npc_dr_chen: '/api/media/image?id=npc_dr_chen',
  npc_soldier_reyes: '/api/media/image?id=npc_soldier_reyes',
  npc_hannah: '/api/media/image?id=npc_hannah',
  npc_umbrella_scientist: '/api/media/image?id=npc_umbrella_scientist',
};

// NPC badge labels
export const NPC_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  npc_marco: { label: 'Meccanico', icon: '🔧', color: 'bg-amber-900/40 text-amber-300 border-amber-700/30' },
  npc_dr_chen: { label: 'Medico', icon: '🥼', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30' },
  npc_soldier_reyes: { label: 'Soldato UBCS', icon: '🎖️', color: 'bg-red-900/40 text-red-300 border-red-700/30' },
  npc_hannah: { label: 'Esploratrice', icon: '🔦', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30' },
  npc_umbrella_scientist: { label: 'Scienziato Umbrella', icon: '🧬', color: 'bg-purple-900/40 text-purple-300 border-purple-700/30' },
};
