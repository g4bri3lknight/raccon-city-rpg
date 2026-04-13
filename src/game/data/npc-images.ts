// NPC portrait image URLs — generated dynamically from NPC ID
// Falls back to emoji if image is missing in DB

/** Generate the portrait image URL for an NPC by ID */
export function getNpcPortraitUrl(npcId: string): string {
  return `/api/media/image?id=${npcId}`;
}

// NPC badge labels
export const NPC_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  npc_marco: { label: 'Meccanico', icon: '🔧', color: 'bg-amber-900/40 text-amber-300 border-amber-700/30' },
  npc_dr_chen: { label: 'Medico', icon: '🥼', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30' },
  npc_soldier_reyes: { label: 'Soldato UBCS', icon: '🎖️', color: 'bg-red-900/40 text-red-300 border-red-700/30' },
  npc_hannah: { label: 'Esploratrice', icon: '🔦', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30' },
  npc_umbrella_scientist: { label: 'Scienziato Umbrella', icon: '🧬', color: 'bg-purple-900/40 text-purple-300 border-purple-700/30' },
};
