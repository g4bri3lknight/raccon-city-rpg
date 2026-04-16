// NPC portrait image URLs — generated dynamically from NPC ID
// Falls back to emoji if image is missing in DB

/** Generate the portrait image URL for an NPC by ID */
export function getNpcPortraitUrl(npcId: string): string {
  return `/api/media/image?id=portrait_${npcId}`;
}

// NPC badges are now loaded from DB (GameNPC.badgeLabel/badgeIcon/badgeColor)
// via loader.ts. This re-export is kept for backward compatibility.
// Consumers should read badge data directly from NPC objects.
