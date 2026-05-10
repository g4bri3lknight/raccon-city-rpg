'use client';

import { useState, useRef, useCallback } from 'react';
import { Pencil, Trash2, Copy, AlertTriangle, Link2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ItemIcon from '@/components/game/ItemIcon';
import type { Rarity } from '@/game/types';
import type { TabId } from './config/tabGroups';
import { getEnumLabel } from './config/enumLabels';

// ═══════════════════════════════════════════════════════════════
// Helper: determine the display-name field for a given tab
// ═══════════════════════════════════════════════════════════════
function getNameField(tabId: TabId): string {
  if (tabId === 'documents' || tabId === 'events') return 'title';
  if (tabId === 'characters') return 'displayName';
  if (tabId === 'notifications') return 'label';
  return 'name';
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface EntityCardGridProps {
  data: Record<string, unknown>[];
  activeTab: TabId;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClone?: (id: string) => void;
  crossRefs?: Record<string, Record<string, number>>;
  brokenRefs?: Record<string, Array<{ field: string; targetId: string }>>;
  typeLabels?: Record<string, string>;
  // #5 — Inline rename
  onInlineRename?: (id: string, newName: string) => void;
  // #8 — Drag & drop reorder
  reorderable?: boolean;
  onReorder?: (fromId: string, toId: string) => void;
  // #9 — Bulk selection
  selectedIds?: Set<string>;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
  // #13 — Custom entity color
  entityColor?: string;
}

// ═══════════════════════════════════════════════════════════════
// ImgWithFallback — image that falls back to emoji placeholder
// ═══════════════════════════════════════════════════════════════
function ImgWithFallback({
  src,
  alt,
  fallbackIcon,
  className,
  containerClassName,
}: {
  src: string;
  alt: string;
  fallbackIcon: string;
  className?: string;
  containerClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={containerClassName ?? 'w-full h-full'}>
      {failed ? (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
          <span className="text-3xl opacity-20">{fallbackIcon}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={className}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// StatPill — compact stat display for combat entities
// ═══════════════════════════════════════════════════════════════
function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center py-1 px-1.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
      <div className={`text-[11px] font-mono ${color ?? 'text-white/50'}`}>
        {value}
      </div>
      <div className="text-[8px] text-white/20 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rarity colors (from tableColumns)
// ═══════════════════════════════════════════════════════════════
const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
  uncommon: 'border-sky-400/30 text-sky-300 bg-sky-400/10',
  rare: 'border-amber-400/30 text-amber-300 bg-amber-400/10',
  epic: 'border-purple-400/30 text-purple-300 bg-purple-400/10',
  legendary: 'border-amber-300/40 text-amber-200 bg-amber-300/15',
};

// ═══════════════════════════════════════════════════════════════
// CardVisualHeader — image preview for supported entity types
// Falls back to null (icon shown inline instead)
// ═══════════════════════════════════════════════════════════════
function CardVisualHeader({
  activeTab,
  row,
}: {
  activeTab: TabId;
  row: Record<string, unknown>;
}) {
  // Items: use ItemIcon (loads image from DB, falls back to emoji internally)
  if (activeTab === 'items') {
    return (
      <div className="flex items-center justify-center py-8 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ItemIcon
          itemId={String(row.id)}
          rarity={(String(row.rarity) as Rarity) || 'common'}
          size={72}
          showBorder
        />
      </div>
    );
  }

  // Locations: show location background image
  if (activeTab === 'locations') {
    const mapIcon = String(row.mapIcon ?? '🗺️');
    return (
      <ImgWithFallback
        src={`/api/media/image?id=${encodeURIComponent(`bg_${String(row.id)}`)}`}
        alt={String(row.name ?? '')}
        fallbackIcon={mapIcon}
        className="w-full h-full object-cover"
        containerClassName="w-full aspect-video overflow-hidden"
      />
    );
  }

  // Characters: show portrait image (stored as bare entityId in media)
  if (activeTab === 'characters') {
    const emoji = String(row.portraitEmoji ?? '🎮');
    return (
      <div className="flex items-center justify-center py-7 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ImgWithFallback
          src={`/api/media/image?id=${encodeURIComponent(String(row.id))}`}
          alt={String(row.displayName ?? row.name ?? '')}
          fallbackIcon={emoji}
          className="w-24 h-24 object-cover rounded-xl"
          containerClassName="w-24 h-24 rounded-xl overflow-hidden border border-white/[0.08]"
        />
      </div>
    );
  }

  // Enemies: show sprite image (stored as bare entityId in media)
  if (activeTab === 'enemies') {
    const emoji = String(row.icon ?? '🧟');
    return (
      <div className="flex items-center justify-center py-7 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ImgWithFallback
          src={`/api/media/image?id=${encodeURIComponent(String(row.id))}`}
          alt={String(row.name ?? '')}
          fallbackIcon={emoji}
          className="w-24 h-24 object-contain"
          containerClassName="w-24 h-24"
        />
      </div>
    );
  }

  // NPCs: show portrait image (stored as portrait_{entityId} in media)
  if (activeTab === 'npcs') {
    const emoji = String(row.portrait ?? '❓');
    return (
      <div className="flex items-center justify-center py-7 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ImgWithFallback
          src={`/api/media/image?id=${encodeURIComponent(`portrait_${String(row.id)}`)}`}
          alt={String(row.name ?? '')}
          fallbackIcon={emoji}
          className="w-24 h-24 object-cover rounded-full"
          containerClassName="w-24 h-24 rounded-full overflow-hidden border border-white/[0.08]"
        />
      </div>
    );
  }

  // Recipes: show resulting item icon
  if (activeTab === 'recipes') {
    const resultItemId = String(row.resultItemId ?? '');
    const emoji = String(row.icon ?? '🔧');
    return (
      <div className="flex items-center justify-center py-7 bg-gradient-to-b from-white/[0.04] to-transparent">
        {resultItemId ? (
          <ImgWithFallback
            src={`/api/media/image?id=${encodeURIComponent(`icon_${resultItemId}`)}`}
            alt={resultItemId}
            fallbackIcon={emoji}
            className="w-20 h-20 object-contain"
            containerClassName="w-20 h-20"
          />
        ) : (
          <span className="text-4xl opacity-30">{emoji}</span>
        )}
        {row.resultQty && Number(row.resultQty) > 1 && (
          <span className="absolute bottom-2 right-2 text-[10px] font-mono text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded">×{row.resultQty}</span>
        )}
      </div>
    );
  }

  // Specials: show icon image (stored as special_{entityId} in media)
  if (activeTab === 'specials') {
    const emoji = String(row.icon ?? '⚡');
    return (
      <div className="flex items-center justify-center py-7 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ImgWithFallback
          src={`/api/media/image?id=${encodeURIComponent(`special_${String(row.id)}`)}`}
          alt={String(row.name ?? '')}
          fallbackIcon={emoji}
          className="w-20 h-20 object-contain"
          containerClassName="w-20 h-20"
        />
      </div>
    );
  }

  // No visual header — icon will be shown inline as fallback
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CardInfoBadges — type/category/rarity badges
// ═══════════════════════════════════════════════════════════════
/* ── Notification hover animations (#10) ── */
const NOTIF_ANIM_STYLE = `
  .notif-card:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  .notif-card {
    transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.3s ease;
  }
  .notif-card:hover .notif-scanline {
    opacity: 0.8;
    animation: scanline-sweep 0.8s ease-in-out;
  }
  @keyframes scanline-sweep {
    0% { top: 20%; opacity: 0; }
    30% { opacity: 0.8; }
    70% { opacity: 0.8; }
    100% { top: 80%; opacity: 0; }
  }
  .notif-shake:hover {
    animation: notif-shake-anim 0.4s ease-in-out;
  }
  @keyframes notif-shake-anim {
    0%, 100% { transform: translateX(0); }
    10% { transform: translateX(-4px) rotate(-1deg); }
    20% { transform: translateX(4px) rotate(1deg); }
    30% { transform: translateX(-3px) rotate(-0.5deg); }
    40% { transform: translateX(3px) rotate(0.5deg); }
    50% { transform: translateX(-2px); }
    60% { transform: translateX(2px); }
    70% { transform: translateX(-1px); }
    80% { transform: translateX(1px); }
    90% { transform: translateX(0); }
  }
  .notif-card:hover .notif-glow-pulse {
    animation: glow-pulse-anim 1s ease-in-out infinite alternate;
  }
  @keyframes glow-pulse-anim {
    0% { opacity: 0.3; }
    100% { opacity: 0.7; }
  }
`;

function CardInfoBadges({
  activeTab,
  row,
}: {
  activeTab: TabId;
  row: Record<string, unknown>;
}) {
  const badges: React.ReactNode[] = [];

  const type = String(row.type ?? '');
  const category = String(row.category ?? '');
  const archetype = String(row.archetype ?? '');
  const rarity = String(row.rarity ?? '');

  // Type badge for items
  if (activeTab === 'items' && type) {
    badges.push(
      <Badge
        key="type"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {getEnumLabel('itemType', type)}
      </Badge>
    );
  }

  // Rarity badge for items & documents
  if ((activeTab === 'items' || activeTab === 'documents') && rarity) {
    badges.push(
      <Badge
        key="rarity"
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${RARITY_COLORS[rarity] ?? ''}`}
      >
        {getEnumLabel('rarity', rarity)}
      </Badge>
    );
  }

  // Unique indicator for items
  if (activeTab === 'items' && row.unico) {
    badges.push(
      <span key="unico" className="text-[10px] text-amber-400 font-medium">
        ★ Unico
      </span>
    );
  }

  // Quest type badge
  if (activeTab === 'quests' && type) {
    badges.push(
      <Badge
        key="type"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {getEnumLabel('questType', type)}
      </Badge>
    );
  }

  // Event type badge
  if (activeTab === 'events' && type) {
    badges.push(
      <Badge
        key="type"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {getEnumLabel('eventType', type)}
      </Badge>
    );
    if (row.duration) {
      badges.push(
        <span key="dur" className="text-[10px] text-white/40">
          {row.duration} turni
        </span>
      );
    }
  }

  // Document type badge
  if (activeTab === 'documents' && type) {
    badges.push(
      <Badge
        key="type"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {getEnumLabel('documentType', type)}
      </Badge>
    );
  }

  // Character archetype badge — show resolved archetypeName if linked, otherwise fallback
  const archetypeName = String(row.archetypeName ?? '');
  if (activeTab === 'characters' && (archetypeName || archetype)) {
    badges.push(
      <Badge
        key="arch"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {archetypeName || getEnumLabel('archetype', archetype)}
      </Badge>
    );
  }

  // Special category + target
  if (activeTab === 'specials') {
    if (type) {
      const catColors: Record<string, string> = {
        offensive: 'border-red-500/30 text-red-400 bg-red-500/10',
        defensive: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
        support: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        control: 'border-emerald-600/30 text-emerald-500 bg-emerald-600/10',
      };
      badges.push(
        <Badge
          key="cat"
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${catColors[type] ?? 'border-white/[0.08] text-white/50 bg-white/[0.03]'}`}
        >
          {getEnumLabel('specialCategory', type)}
        </Badge>
      );
    }
    if (row.targetType) {
      badges.push(
        <span key="tgt" className="text-[10px] text-white/35">
          → {getEnumLabel('specialTargetType', String(row.targetType))}
        </span>
      );
    }
  }

  // Enemy variant
  if (activeTab === 'enemies') {
    const vg = String(row.variantGroup ?? '');
    if (vg) {
      badges.push(
        <Badge
          key="vg"
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/40 bg-white/[0.03]"
        >
          {vg}
        </Badge>
      );
    }
    if (row.isBoss) {
      badges.push(
        <span
          key="boss"
          className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold"
        >
          BOSS
        </span>
      );
    }
  }

  // Location travel cost + boss + room count
  if (activeTab === 'locations') {
    const rate = Number(row.encounterRate ?? 0);
    if (rate > 0) {
      const turns = rate > 40 ? '2 turni' : '1 turn';
      const color = rate > 40 ? 'text-amber-400' : 'text-white/40';
      badges.push(
        <span key="travel" className={`text-[10px] font-mono ${color}`}>
          🚶 {turns}
        </span>
      );
    }
    if (row.isBossArea) {
      badges.push(
        <span
          key="boss"
          className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold"
        >
          BOSS
        </span>
      );
    }
    const roomCount = Number(row._roomCount ?? 0);
    if (roomCount > 0) {
      badges.push(
        <span key="rooms" className="text-[10px] text-white/35">
          🚪 {roomCount} stanze
        </span>
      );
    }
    let exits: string[] = [];
    try {
      exits =
        typeof row.nextLocations === 'string'
          ? JSON.parse(row.nextLocations)
          : (row.nextLocations as string[] ?? []);
    } catch {
      /* empty */
    }
    if (exits.length > 0) {
      badges.push(
        <span key="exits" className="text-[10px] text-white/35">
          🚪 {exits.length} uscite
        </span>
      );
    }
  }

  // NPC location + quest indicator
  if (activeTab === 'npcs') {
    if (row.locationId) {
      badges.push(
        <span key="loc" className="text-[10px] text-white/35 font-mono truncate max-w-[120px]">
          📍 {String(row.locationId)}
        </span>
      );
    }
    if (row.questId) {
      badges.push(
        <span key="quest" className="text-[10px] text-emerald-400">
          📜 Quest
        </span>
      );
    }
  }

  // Enemy ability power/chance
  if (activeTab === 'enemy-abilities') {
    if (row.power) {
      const p = Number(row.power);
      const color =
        p >= 2.0
          ? 'text-red-400'
          : p >= 1.5
            ? 'text-emerald-400'
            : 'text-white/50';
      badges.push(
        <span key="pow" className={`text-[10px] font-mono ${color}`}>
          ⚡ {p.toFixed(1)}x
        </span>
      );
    }
    if (row.chance) {
      badges.push(
        <span key="chance" className="text-[10px] text-white/35">
          {row.chance}%
        </span>
      );
    }
  }

  // Boss phase HP threshold
  if (activeTab === 'boss-phases') {
    if (row.hpThreshold != null) {
      badges.push(
        <span key="hp" className="text-[10px] text-red-400/80 font-mono">
          HP {Math.round(Number(row.hpThreshold) * 100)}%
        </span>
      );
    }
    if (row.enemyId) {
      badges.push(
        <Badge
          key="boss"
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-400 bg-red-500/10"
        >
          {String(row.enemyId)}
        </Badge>
      );
    }
  }

  // Achievement category
  if (activeTab === 'achievements' && category) {
    const catLabels: Record<string, string> = {
      combat: '⚔️ Combattimento',
      exploration: '🗺️ Esplorazione',
      collection: '📦 Collezione',
      story: '📖 Storia',
      special: '⭐ Speciale',
    };
    badges.push(
      <Badge
        key="cat"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/40 bg-white/[0.03]"
      >
        {catLabels[category] ?? category}
      </Badge>
    );
    if (row.hidden) {
      badges.push(
        <span key="hidden" className="text-[10px] text-white/30">
          👁️ Nascosto
        </span>
      );
    }
  }

  // Ending color
  if (activeTab === 'endings') {
    if (row.color) {
      badges.push(
        <span
          key="color"
          className="w-3 h-3 rounded-sm inline-block"
          style={{ backgroundColor: String(row.color) }}
        />
      );
    }
    if (row.priority != null) {
      badges.push(
        <span key="prio" className="text-[10px] text-white/35 font-mono">
          Priorità {row.priority}
        </span>
      );
    }
  }

  // Recipe category + difficulty
  if (activeTab === 'recipes') {
    if (category) {
      badges.push(
        <Badge
          key="cat"
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
        >
          {getEnumLabel('recipeCategory', category)}
        </Badge>
      );
    }
    if (row.difficulty) {
      const colors: Record<string, string> = {
        easy: 'text-green-400',
        medium: 'text-emerald-400',
        hard: 'text-red-400',
      };
      badges.push(
        <span
          key="diff"
          className={`text-[10px] ${colors[String(row.difficulty)] ?? 'text-white/50'}`}
        >
          {getEnumLabel('craftDifficulty', String(row.difficulty))}
        </span>
      );
    }
  }

  // Secret room discovery method
  if (activeTab === 'secret-rooms') {
    const method = String(row.discoveryMethod ?? 'search');
    badges.push(
      <Badge
        key="method"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/40 bg-white/[0.03]"
      >
        {getEnumLabel('discoveryMethod', method)}
      </Badge>
    );
    if (row.searchChance) {
      badges.push(
        <span key="chance" className="text-[10px] text-white/35">
          {row.searchChance}%
        </span>
      );
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">{badges}</div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CardStatsRow — numeric stats for combat entities
// ═══════════════════════════════════════════════════════════════
function CardStatsRow({
  activeTab,
  row,
}: {
  activeTab: TabId;
  row: Record<string, unknown>;
}) {
  // Combat entities with HP/ATK/DEF/SPD
  if (['enemies', 'characters', 'archetypes'].includes(activeTab)) {
    return (
      <div className="grid grid-cols-4 gap-1.5 mt-2.5">
        <StatPill label="HP" value={row.maxHp} color="text-green-400/80" />
        <StatPill label="ATK" value={row.atk} color="text-red-400/80" />
        <StatPill label="DEF" value={row.def} color="text-emerald-400/80" />
        <StatPill label="SPD" value={row.spd} color="text-sky-400/80" />
      </div>
    );
  }

  // Enemies: extra EXP
  if (activeTab === 'enemies' && row.expReward) {
    return (
      <div className="mt-2">
        <div className="grid grid-cols-4 gap-1.5">
          <StatPill label="HP" value={row.maxHp} color="text-green-400/80" />
          <StatPill label="ATK" value={row.atk} color="text-red-400/80" />
          <StatPill label="DEF" value={row.def} color="text-emerald-400/80" />
          <StatPill label="SPD" value={row.spd} color="text-sky-400/80" />
        </div>
        <div className="flex items-center justify-center mt-1.5">
          <span className="text-[10px] text-white/30">
            EXP: <span className="text-emerald-400/60 font-mono">{row.expReward}</span>
          </span>
        </div>
      </div>
    );
  }

  // Specials: cooldown
  if (activeTab === 'specials' && row.cooldown) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="text-center py-1 px-3 rounded-md bg-white/[0.03] border border-white/[0.04]">
          <div className="text-[11px] font-mono text-white/50">
            {row.cooldown}
          </div>
          <div className="text-[8px] text-white/20 uppercase tracking-wider">
            Cooldown
          </div>
        </div>
      </div>
    );
  }

  // Quests: target info
  if (activeTab === 'quests') {
    const parts: React.ReactNode[] = [];
    if (row.targetId) parts.push(<span key="tid" className="text-[11px] text-white/35 font-mono truncate">🎯 {String(row.targetId)}</span>);
    if (row.targetCount && Number(row.targetCount) > 1) parts.push(<span key="tc" className="text-[10px] text-white/25">×{row.targetCount}</span>);
    if (row.rewardExp && Number(row.rewardExp) > 0) parts.push(<span key="exp" className="text-[10px] text-emerald-400/50">+{row.rewardExp} EXP</span>);
    if (parts.length > 0) return <div className="flex items-center gap-2 flex-wrap mt-2">{parts}</div>;
  }

  // Archetypes: growth
  if (activeTab === 'archetypes') {
    const hp = Number(row.hpGrowth);
    const atk = Number(row.atkGrowth);
    const def = Number(row.defGrowth);
    const spd = Number(row.spdGrowth);
    const growths: string[] = [];
    if (hp !== 1.0) growths.push(`HP×${hp}`);
    if (atk !== 1.0) growths.push(`ATK×${atk}`);
    if (def !== 1.0) growths.push(`DEF×${def}`);
    if (spd !== 1.0) growths.push(`SPD×${spd}`);
    if (growths.length > 0) {
      return (
        <div className="mt-2">
          <div className="grid grid-cols-4 gap-1.5">
            <StatPill label="HP" value={row.maxHp} color="text-green-400/80" />
            <StatPill label="ATK" value={row.atk} color="text-red-400/80" />
            <StatPill label="DEF" value={row.def} color="text-emerald-400/80" />
            <StatPill label="SPD" value={row.spd} color="text-sky-400/80" />
          </div>
          <p className="text-[10px] text-white/25 font-mono mt-1.5 text-center">
            {growths.join(' · ')}
          </p>
        </div>
      );
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Entity types that have image preview headers
// ═══════════════════════════════════════════════════════════════
const TABS_WITH_IMAGE_HEADER = new Set<string>([
  'locations',
]);

const TABS_WITH_COMPACT_LAYOUT = new Set<string>([
  'items', 'recipes', 'npcs', 'characters', 'enemies', 'archetypes', 'specials', 'enemy-abilities', 'boss-phases',
]);

// ═══════════════════════════════════════════════════════════════
// CompactCardImage — 92×92 image thumbnail for horizontal cards
// ═══════════════════════════════════════════════════════════════
function CompactCardImage({
  activeTab,
  row,
}: {
  activeTab: TabId;
  row: Record<string, unknown>;
}) {
  // Items
  if (activeTab === 'items') {
    return (
      <div className="w-[92px] h-[92px] shrink-0 flex items-center justify-center bg-white/[0.03] rounded-lg border border-white/[0.06]">
        <ItemIcon
          itemId={String(row.id)}
          rarity={(String(row.rarity) as Rarity) || 'common'}
          size={72}
          showBorder
        />
      </div>
    );
  }

  // Characters
  if (activeTab === 'characters') {
    const emoji = String(row.portraitEmoji ?? '🎮');
    return (
      <ImgWithFallback
        src={`/api/media/image?id=${encodeURIComponent(String(row.id))}`}
        alt={String(row.displayName ?? row.name ?? '')}
        fallbackIcon={emoji}
        className="w-[92px] h-[92px] object-cover rounded-lg"
        containerClassName="w-[92px] h-[92px] shrink-0 rounded-lg overflow-hidden border border-white/[0.08]"
      />
    );
  }

  // Enemies
  if (activeTab === 'enemies') {
    const emoji = String(row.icon ?? '🧟');
    return (
      <ImgWithFallback
        src={`/api/media/image?id=${encodeURIComponent(String(row.id))}`}
        alt={String(row.name ?? '')}
        fallbackIcon={emoji}
        className="w-[92px] h-[92px] object-contain"
        containerClassName="w-[92px] h-[92px] shrink-0"
      />
    );
  }

  // NPCs
  if (activeTab === 'npcs') {
    const emoji = String(row.portrait ?? '❓');
    return (
      <ImgWithFallback
        src={`/api/media/image?id=${encodeURIComponent(`portrait_${String(row.id)}`)}`}
        alt={String(row.name ?? '')}
        fallbackIcon={emoji}
        className="w-[92px] h-[92px] object-cover rounded-full"
        containerClassName="w-[92px] h-[92px] shrink-0 rounded-full overflow-hidden border border-white/[0.08]"
      />
    );
  }

  // Recipes
  if (activeTab === 'recipes') {
    const resultItemId = String(row.resultItemId ?? '');
    const emoji = String(row.icon ?? '🔧');
    return (
      <div className="w-[92px] h-[92px] shrink-0 flex items-center justify-center bg-white/[0.03] rounded-lg border border-white/[0.06] relative">
        {resultItemId ? (
          <ImgWithFallback
            src={`/api/media/image?id=${encodeURIComponent(`icon_${resultItemId}`)}`}
            alt={resultItemId}
            fallbackIcon={emoji}
            className="w-[72px] h-[72px] object-contain"
            containerClassName="w-[72px] h-[72px]"
          />
        ) : (
          <span className="text-4xl opacity-30">{emoji}</span>
        )}
        {row.resultQty && Number(row.resultQty) > 1 && (
          <span className="absolute bottom-1 right-1 text-[9px] font-mono text-white/40 bg-black/50 px-1 py-px rounded">×{row.resultQty}</span>
        )}
      </div>
    );
  }

  // Specials
  if (activeTab === 'specials') {
    const emoji = String(row.icon ?? '⚡');
    return (
      <ImgWithFallback
        src={`/api/media/image?id=${encodeURIComponent(`special_${String(row.id)}`)}`}
        alt={String(row.name ?? '')}
        fallbackIcon={emoji}
        className="w-[92px] h-[92px] object-contain"
        containerClassName="w-[92px] h-[92px] shrink-0"
      />
    );
  }

  // Archetypes, enemy-abilities, boss-phases: emoji fallback
  const emoji = String(row.icon ?? (activeTab === 'archetypes' ? '⚔️' : activeTab === 'enemy-abilities' ? '🔥' : '👑'));
  return (
    <div className="w-[92px] h-[92px] shrink-0 flex items-center justify-center bg-white/[0.03] rounded-lg border border-white/[0.06]">
      <span className="text-4xl opacity-25">{emoji}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EntityCardGrid — main exported component
// ═══════════════════════════════════════════════════════════════
export function EntityCardGrid({
  data,
  activeTab,
  onEdit,
  onDelete,
  onClone,
  crossRefs = {},
  brokenRefs = {},
  typeLabels = {},
  onInlineRename,
  reorderable = false,
  onReorder,
  selectedIds = new Set(),
  selectionMode = false,
  onToggleSelect,
  entityColor,
}: EntityCardGridProps) {
  const hasImageHeader = TABS_WITH_IMAGE_HEADER.has(activeTab);
  const hasCompactLayout = TABS_WITH_COMPACT_LAYOUT.has(activeTab);
  const canEdit = true;

  // ── #13 — Compute entity color styles ──
  const entityColorStyle = entityColor
    ? { '--entity-color': entityColor } as React.CSSProperties
    : undefined;

  // ── #5 Inline rename state ──
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── #8 Drag & drop state ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const nameField = getNameField(activeTab);

  // ── #5 Inline rename handlers ──
  const handleStartEdit = useCallback((rowId: string, currentName: string) => {
    setEditingNameId(rowId);
    setEditingNameValue(currentName);
    // Focus input after React re-render
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingNameId && editingNameValue.trim() && onInlineRename) {
      onInlineRename(editingNameId, editingNameValue.trim());
    }
    setEditingNameId(null);
    setEditingNameValue('');
  }, [editingNameId, editingNameValue, onInlineRename]);

  const handleCancelEdit = useCallback(() => {
    setEditingNameId(null);
    setEditingNameValue('');
  }, []);

  // ── #8 Drag & drop handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, rowId: string) => {
    setDragId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(rowId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toId: string) => {
    e.preventDefault();
    const fromId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (fromId && fromId !== toId && onReorder) {
      onReorder(fromId, toId);
    }
  }, [dragId, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  // Notifications use a completely custom card layout
  if (activeTab === 'notifications') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: NOTIF_ANIM_STYLE }} />
        <input type="text" ref={editInputRef} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((row, idx) => {
            const rowId = String(row.id ?? '');
            const isSelected = selectionMode && selectedIds.has(rowId);
            const currentLabel = String(row.label ?? '');
            const isEditing = editingNameId === rowId;
            return (
              <div key={rowId || `row-${idx}`} className="relative">
                {/* #9 — Selection checkbox overlay */}
                {selectionMode && (
                  <div
                    className="absolute top-2 right-2 z-30"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect?.(rowId); }}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 border border-emerald-400'
                        : 'bg-black/40 border border-white/20 hover:border-white/40'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
                <NotificationCard
                  row={row}
                  onEdit={() => onEdit(rowId)}
                  onDelete={() => onDelete(rowId)}
                  onClone={onClone ? () => onClone(rowId) : undefined}
                  crossRefs={crossRefs}
                  brokenRefs={brokenRefs}
                  typeLabels={typeLabels}
                  selectionMode={selectionMode}
                  isSelected={isSelected}
                  onToggleSelect={() => onToggleSelect?.(rowId)}
                  editingName={isEditing}
                  editingNameValue={editingNameValue}
                  onStartEditName={() => handleStartEdit(rowId, currentLabel)}
                  onSaveEditName={handleSaveEdit}
                  onCancelEditName={handleCancelEdit}
                  onChangeEditName={setEditingNameValue}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ── Compact horizontal cards for combat, items, recipes, NPCs ──
  if (hasCompactLayout) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {data.map((row, idx) => {
          const rowId = String(row.id ?? '');
          const name = activeTab === 'characters'
            ? String(row.displayName ?? row.name ?? row.id ?? '')
            : String(row.name ?? row.title ?? row.id ?? '');
          const description = String(row.description ?? '');
          const subtitle = activeTab === 'characters'
            ? String(row.name ?? row.id ?? '')
            : String(row.id ?? '');

          const rowBroken = brokenRefs[rowId];
          const rowCross = crossRefs[rowId];
          const hasBroken = rowBroken && rowBroken.length > 0;
          const crossEntries = rowCross ? Object.entries(rowCross) : [];
          const crossTotal = crossEntries.reduce((s, [, c]) => s + c, 0);
          const isSelected = selectionMode && selectedIds.has(rowId);
          const isEditing = editingNameId === rowId;
          const isDragging = dragId === rowId;
          const isDragOver = dragOverId === rowId;

          return (
            <div
              key={rowId || `row-${idx}`}
              draggable={reorderable && !isEditing}
              onDragStart={(e) => handleDragStart(e, rowId)}
              onDragOver={(e) => handleDragOver(e, rowId)}
              onDrop={(e) => handleDrop(e, rowId)}
              onDragEnd={handleDragEnd}
              className={`group flex gap-2.5 p-2 rounded-lg border bg-white/[0.02] hover:bg-white/[0.04] transition-all relative ${
                hasBroken
                  ? 'border-red-500/30 hover:border-red-500/50'
                  : isSelected
                    ? 'border-emerald-500/40 hover:border-emerald-500/60'
                    : entityColor
                      ? 'hover:border-[var(--entity-color)]/60'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
              } ${
                isDragging ? 'opacity-50 scale-95' : ''
              } ${
                isDragOver && !isDragging ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : ''
              }`}
              style={entityColor ? { borderColor: `${entityColor}30`, ...entityColorStyle } : undefined}
            >
              {entityColor && (
                <div className="absolute top-0 left-0 right-0 h-[2px] z-30" style={{ backgroundColor: entityColor }} />
              )}
              {reorderable && (
                <div className="absolute top-1.5 left-1.5 z-20 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-60 md:opacity-0 md:group-hover:opacity-60 transition-opacity">
                  <GripVertical className="w-3.5 h-3.5 text-white/60" />
                </div>
              )}
              {selectionMode && (
                <div className="absolute top-1.5 right-1.5 z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(rowId); }}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-emerald-500 border border-emerald-400' : 'bg-black/40 border border-white/20 hover:border-white/40'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}

              {/* Image (left) */}
              <CompactCardImage activeTab={activeTab} row={row} />

              {/* Content (right) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="min-w-0">
                  {isEditing && onInlineRename ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingNameValue}
                      onChange={(e) => setEditingNameValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
                      }}
                      className="text-xs font-medium text-white/85 bg-transparent border-b border-emerald-500 outline-none w-full py-0 focus:border-emerald-400 transition-colors"
                    />
                  ) : (
                    <h3
                      className="text-xs font-medium text-white/85 truncate leading-snug cursor-text hover:text-emerald-300/90 transition-colors"
                      onDoubleClick={(e) => { e.stopPropagation(); if (onInlineRename) handleStartEdit(rowId, name); }}
                      onClick={(e) => { if (!onInlineRename) return; if (window.matchMedia('(hover: none)').matches) { e.stopPropagation(); handleStartEdit(rowId, name); } }}
                      title="Doppio clic per rinominare"
                    >{name}</h3>
                  )}
                  <p className="text-[10px] text-white/20 font-mono truncate">{subtitle}</p>
                  <CardInfoBadges activeTab={activeTab} row={row} />
                </div>
                <div>
                  {description && (
                    <p className="text-[11px] text-white/25 line-clamp-1 mt-1 leading-relaxed">{description}</p>
                  )}
                  <CardStatsRow activeTab={activeTab} row={row} />
                  {crossTotal > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      <span className="text-[9px] text-sky-400/60">🔗</span>
                      {crossEntries.slice(0, 3).map(([type, count]) => (
                        <span key={type} className="text-[9px] px-1 py-px rounded-full bg-sky-500/8 border border-sky-500/15 text-sky-400/80">
                          {count}× {typeLabels[type] || type}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => onEdit(rowId)} className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-emerald-300 transition-colors" title="Modifica">
                      <Pencil className="w-3 h-3" />
                    </button>
                    {onClone && (
                      <button type="button" onClick={() => onClone(rowId)} className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-sky-300 transition-colors" title="Duplica">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    <button type="button" onClick={() => onDelete(rowId)} className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-red-300 transition-colors" title="Elimina">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {hasBroken && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-[9px] text-red-400">{rowBroken.length} ref errate</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Standard vertical cards (locations, etc.) ──
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {data.map((row, idx) => {
        const rowId = String(row.id ?? '');
        // Characters: displayName is the actual character name, name is the role
        const name = activeTab === 'characters'
          ? String(row.displayName ?? row.name ?? row.id ?? '')
          : String(row.name ?? row.title ?? row.id ?? '');
        const description = String(row.description ?? '');
        const subtitle = activeTab === 'characters'
          ? String(row.name ?? row.id ?? '')
          : String(row.id ?? '');

        // Icon fallback for entities without image headers
        const iconEmoji = hasImageHeader
          ? ''
          : String(
              row.icon ??
                row.portraitEmoji ??
                ''
            );

        const rowBroken = brokenRefs[rowId];
        const rowCross = crossRefs[rowId];
        const hasBroken = rowBroken && rowBroken.length > 0;
        const crossEntries = rowCross ? Object.entries(rowCross) : [];
        const crossTotal = crossEntries.reduce((s, [, c]) => s + c, 0);

        // ── #9 Bulk selection state ──
        const isSelected = selectionMode && selectedIds.has(rowId);

        // ── #5 Inline rename state ──
        const isEditing = editingNameId === rowId;

        // ── #8 Drag state ──
        const isDragging = dragId === rowId;
        const isDragOver = dragOverId === rowId;

        return (
          <div
            key={rowId || `row-${idx}`}
            draggable={reorderable && !isEditing}
            onDragStart={(e) => handleDragStart(e, rowId)}
            onDragOver={(e) => handleDragOver(e, rowId)}
            onDrop={(e) => handleDrop(e, rowId)}
            onDragEnd={handleDragEnd}
            className={`group rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden relative ${
              hasBroken
                ? 'border-red-500/30 hover:border-red-500/50'
                : isSelected
                  ? 'border-emerald-500/40 hover:border-emerald-500/60'
                  : entityColor
                    ? 'hover:border-[var(--entity-color)]/60'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
            } ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isDragOver && !isDragging ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : ''
            }`}
            style={entityColor ? { borderColor: `${entityColor}30`, ...entityColorStyle } : undefined}
          >
            {/* ── #13 Entity color accent bar ── */}
            {entityColor && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px] z-30"
                style={{ backgroundColor: entityColor }}
              />
            )}
            {/* ── #8 Drag handle — visible on mobile for touch, hover on desktop ── */}
            {reorderable && (
              <div className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-60 md:opacity-0 md:group-hover:opacity-60 transition-opacity">
                <GripVertical className="w-4 h-4 text-white/60" />
              </div>
            )}

            {/* ── #9 Selection checkbox overlay ── */}
            {selectionMode && (
              <div
                className="absolute top-2 right-2 z-20 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(rowId); }}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-emerald-500 border border-emerald-400'
                    : 'bg-black/40 border border-white/20 hover:border-white/40'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* ── Image header ── */}
            {hasImageHeader && (
              <CardVisualHeader activeTab={activeTab} row={row} />
            )}

            {/* ── Card body ── */}
            <div className="p-4">
              {/* ── Title row: icon (fallback) + name (+ #5 inline rename) ── */}
              <div className="flex items-start gap-2.5">
                {!hasImageHeader && iconEmoji && (
                  <span className="text-xl shrink-0 mt-0.5 leading-none">
                    {iconEmoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {isEditing && onInlineRename ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingNameValue}
                      onChange={(e) => setEditingNameValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      className="text-sm font-medium text-white/85 bg-transparent border-b border-emerald-500 outline-none w-full py-0.5 focus:border-emerald-400 transition-colors"
                    />
                  ) : (
                    <h3
                      className="text-sm font-medium text-white/85 truncate leading-snug cursor-text hover:text-emerald-300/90 transition-colors"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onInlineRename) handleStartEdit(rowId, name);
                      }}
                      onClick={(e) => {
                        // On touch devices, single tap triggers rename (no hover = touch)
                        if (!onInlineRename) return;
                        if (window.matchMedia('(hover: none)').matches) {
                          e.stopPropagation();
                          handleStartEdit(rowId, name);
                        }
                      }}
                      title="Doppio clic per rinominare"
                    >
                      {name}
                    </h3>
                  )}
                  <p className="text-[11px] text-white/20 font-mono mt-0.5 truncate">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* ── Badges: type, rarity, category, etc. ── */}
              <CardInfoBadges activeTab={activeTab} row={row} />

              {/* ── Description (truncated) ── */}
              {description && (
                <p className="text-[12px] text-white/30 line-clamp-2 mt-2 leading-relaxed">
                  {description}
                </p>
              )}

              {/* ── Stats row (combat entities, etc.) ── */}
              <CardStatsRow activeTab={activeTab} row={row} />

              {/* ── Cross-refs badges (#4) ── */}
              {crossTotal > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  <span className="text-[10px] text-sky-400/60 mr-0.5">🔗</span>
                  {crossEntries.map(([type, count]) => (
                    <span key={type} className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/8 border border-sky-500/15 text-sky-400/80">
                      {count}× {typeLabels[type] || type}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Broken refs warning (#7) ── */}
              {hasBroken && (
                <div
                  className="mt-2 px-2 py-1.5 rounded-md bg-red-500/8 border border-red-500/15"
                  title={rowBroken.map(r => `${r.field} → ${r.targetId}`).join(', ')}
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-red-400/80 font-medium">
                      {rowBroken.length} ref. rotto{rowBroken.length > 1 ? 'i' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {rowBroken.map((r, i) => (
                      <span key={i} className="text-[10px] text-red-400/50 font-mono truncate">
                        {r.field}: <span className="line-through">{r.targetId}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Action buttons (always visible on mobile, hover on desktop) ── */}
              {canEdit && (
                <div className="flex items-center gap-1 pt-3 mt-3 border-t border-white/[0.04] lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onEdit(rowId); }}
                    className="h-7 px-2.5 text-[12px] gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Pencil className="w-3 h-3" />
                    Modifica
                  </Button>
                  <div className="flex-1" />
                  {onClone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onClone(rowId); }}
                      className="h-7 px-2 text-[12px] gap-1 text-sky-400/70 hover:text-sky-300 hover:bg-sky-500/10"
                      title="Duplica"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onDelete(rowId); }}
                    className="h-7 px-2.5 text-[12px] gap-1.5 text-red-400/70 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NotificationCard — styled card that mimics the in-game notification
// ═══════════════════════════════════════════════════════════════
function NotificationCard({ row, onEdit, onDelete, onClone, crossRefs: crossRefsProp, brokenRefs: brokenRefsProp, typeLabels: typeLabelsProp, selectionMode, isSelected, onToggleSelect, editingName, editingNameValue, onStartEditName, onSaveEditName, onCancelEditName, onChangeEditName }: {
  row: Record<string, unknown>;
  onEdit: () => void;
  onDelete: () => void;
  onClone?: () => void;
  crossRefs?: Record<string, Record<string, number>>;
  brokenRefs?: Record<string, Array<{ field: string; targetId: string }>>;
  typeLabels?: Record<string, string>;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  editingName?: boolean;
  editingNameValue?: string;
  onStartEditName?: () => void;
  onSaveEditName?: () => void;
  onCancelEditName?: () => void;
  onChangeEditName?: (v: string) => void;
}) {
  const cardBg = String(row.cardBg ?? '#1a1a2e');
  const borderColor = String(row.borderColor ?? '#333333');
  const titleColor = String(row.titleColor ?? '#ffffff');
  const titleGlow = String(row.titleGlow ?? 'none');
  const scanlineColor = String(row.scanlineColor ?? 'rgba(255,255,255,0.3)');
  const label = String(row.label ?? '');
  const icon = String(row.icon ?? '');
  const notifType = String(row.type ?? 'item_found');
  const notifId = String(row.id ?? '');
  // Auto-derive image ref from notification ID (matches MediaUploadBox pattern)
  const effectiveImageRef = String(row.imageRef ?? '') || (notifId ? `notif_img_${notifId}` : '');
  const hasImage = effectiveImageRef.length > 0;
  const shake = !!row.shake;
  const duration = Number(row.duration ?? 2500);

  // Type labels
  const TYPE_LABELS: Record<string, string> = {
    encounter: '⚔️ Incontro',
    victory: '🏆 Vittoria',
    defeat: '💀 Sconfitta',
    item_found: '📦 Oggetto',
    bag_expand: '🎒 Zaino',
    collectible_found: '💎 Collezionabile',
  };
  const typeLabel = TYPE_LABELS[notifType] || notifType;

  // Broken refs for this notification
  const notifBroken = brokenRefsProp?.[notifId];
  const hasNotifBroken = notifBroken && notifBroken.length > 0;
  // Cross refs for this notification
  const notifCross = crossRefsProp?.[notifId];
  const notifCrossTotal = notifCross ? Object.values(notifCross).reduce((s, c) => s + c, 0) : 0;

  const displayText = label || typeLabel;

  return (
    <div
      className={`notif-card group relative rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col ${shake ? 'notif-shake' : ''} ${
        isSelected ? 'ring-2 ring-emerald-500/50' : ''
      }`}
      style={{
        background: cardBg,
        borderColor: `${borderColor}80`,
        boxShadow: `0 0 24px ${borderColor}20`,
      }}
      onClick={(e) => {
        if (editingName) return;
        onEdit();
      }}
    >
      {/* Broken ref warning bar */}
      {hasNotifBroken && (
        <div className="absolute top-0 inset-x-0 h-1 bg-red-500/60 z-20 rounded-t-xl" title={`${notifBroken.length} riferimenti rotti`} />
      )}

      {/* Glow pulse overlay on hover (#10) */}
      {titleGlow !== 'none' && (
        <div className="notif-glow-pulse absolute inset-0 pointer-events-none z-0 rounded-xl opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${borderColor}40, transparent 70%)`,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Scanline */}
      <div
        className="absolute inset-x-0 top-[40%] h-[1px] opacity-40 z-10 pointer-events-none notif-scanline"
        style={{ background: `linear-gradient(90deg, transparent, ${scanlineColor}, transparent)` }}
      />

      {/* ── Notification content ── */}
      <div className="relative px-5 py-5 text-center flex-1 flex flex-col justify-center">
        {/* Icon or uploaded image */}
        {hasImage ? (
          <div className="flex justify-center mb-1.5">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/30">
              <img
                src={`/api/media/image?ref=${encodeURIComponent(effectiveImageRef)}`}
                alt="Notifica"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        ) : (
          icon ? <div className="text-2xl mb-1">{icon}</div> : null
        )}
        {/* Title — #5 inline rename support */}
        {editingName && onChangeEditName ? (
          <input
            type="text"
            value={editingNameValue ?? ''}
            onChange={(e) => onChangeEditName(e.target.value)}
            onBlur={(e) => {
              e.stopPropagation();
              onSaveEditName?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onSaveEditName?.();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCancelEditName?.();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="font-black tracking-wider uppercase text-xs bg-transparent border-b border-emerald-500 outline-none w-full text-center py-0.5 focus:border-emerald-400 transition-colors"
            style={{
              color: titleColor,
              textShadow: titleGlow === 'none' ? undefined : titleGlow,
              fontFamily: "'Courier New', monospace",
            }}
            autoFocus
          />
        ) : (
          <div
            className="font-black tracking-wider uppercase text-xs cursor-text hover:brightness-125 transition-all"
            style={{
              color: titleColor,
              textShadow: titleGlow === 'none' ? undefined : titleGlow,
              fontFamily: "'Courier New', monospace",
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEditName?.();
            }}
            title="Doppio clic per rinominare"
          >
            {displayText}
          </div>
        )}
        {/* Type badge (small, below title) */}
        <div className="mt-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/25 font-mono">
            {typeLabel}
          </span>
        </div>
      </div>

      {/* ── Card footer with metadata + actions (always at bottom) ── */}
      <div className="px-3 py-2.5 border-t border-white/[0.06] bg-black/20 backdrop-blur-sm mt-auto">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] text-white/60 font-mono truncate">{notifId}</p>
              {hasNotifBroken && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {shake && <span className="text-[10px] text-white/30">📳 Shake</span>}
              <span className="text-[10px] text-white/25">{duration}ms</span>
              {effectiveImageRef && <span className="text-[10px] text-emerald-400/50">🖼️</span>}
              {notifCrossTotal > 0 && (
                <span className="text-[10px] text-sky-400/60" title={`${notifCrossTotal} entità usano questa notifica`}>
                  🔗 {notifCrossTotal}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {onClone && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onClone(); }}
                className="h-6 w-6 p-0 text-sky-400/60 hover:text-sky-300 hover:bg-sky-500/10"
                title="Duplica"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-6 w-6 p-0 text-red-400/60 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
