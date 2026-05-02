'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ItemIcon from '@/components/game/ItemIcon';
import type { Rarity } from '@/game/types';
import type { TabId } from './config/tabGroups';
import { getEnumLabel } from './config/enumLabels';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface EntityCardGridProps {
  data: Record<string, unknown>[];
  activeTab: TabId;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
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

  // Character archetype badge
  if (activeTab === 'characters' && archetype) {
    badges.push(
      <Badge
        key="arch"
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-white/[0.08] text-white/50 bg-white/[0.03]"
      >
        {getEnumLabel('archetype', archetype)}
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

  // Location encounter rate + boss
  if (activeTab === 'locations') {
    const rate = Number(row.encounterRate ?? 0);
    if (rate > 0) {
      const color =
        rate >= 50
          ? 'text-red-400'
          : rate >= 35
            ? 'text-emerald-400'
            : 'text-green-400';
      badges.push(
        <span key="enc" className={`text-[10px] font-mono ${color}`}>
          ⚔️ {rate}%
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
  'items', 'locations', 'characters', 'enemies', 'npcs', 'recipes', 'specials',
]);

// ═══════════════════════════════════════════════════════════════
// EntityCardGrid — main exported component
// ═══════════════════════════════════════════════════════════════
export function EntityCardGrid({
  data,
  activeTab,
  onEdit,
  onDelete,
}: EntityCardGridProps) {
  const hasImageHeader = TABS_WITH_IMAGE_HEADER.has(activeTab);
  const canEdit = true;

  // Notifications use a completely custom card layout
  if (activeTab === 'notifications') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((row, idx) => {
          const rowId = String(row.id ?? '');
          return <NotificationCard key={rowId || `row-${idx}`} row={row} onEdit={() => onEdit(rowId)} onDelete={() => onDelete(rowId)} />;
        })}
      </div>
    );
  }

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

        return (
          <div
            key={rowId || `row-${idx}`}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all overflow-hidden"
          >
            {/* ── Image header ── */}
            {hasImageHeader && (
              <CardVisualHeader activeTab={activeTab} row={row} />
            )}

            {/* ── Card body ── */}
            <div className="p-4">
              {/* ── Title row: icon (fallback) + name ── */}
              <div className="flex items-start gap-2.5">
                {!hasImageHeader && iconEmoji && (
                  <span className="text-xl shrink-0 mt-0.5 leading-none">
                    {iconEmoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-white/85 truncate leading-snug">
                    {name}
                  </h3>
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

              {/* ── Action buttons (always visible on mobile, hover on desktop) ── */}
              {canEdit && (
                <div className="flex items-center gap-1 pt-3 mt-3 border-t border-white/[0.04] lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(rowId)}
                    className="h-7 px-2.5 text-[12px] gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Pencil className="w-3 h-3" />
                    Modifica
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(rowId)}
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
function NotificationCard({ row, onEdit, onDelete }: { row: Record<string, unknown>; onEdit: () => void; onDelete: () => void }) {
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

  return (
    <div
      className="group relative rounded-xl overflow-hidden border transition-all cursor-pointer hover:brightness-110 flex flex-col"
      style={{
        background: cardBg,
        borderColor: `${borderColor}80`,
        boxShadow: `0 0 24px ${borderColor}20`,
      }}
      onClick={onEdit}
    >
      {/* Scanline */}
      <div
        className="absolute inset-x-0 top-[40%] h-[1px] opacity-40 z-10 pointer-events-none"
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
        {/* Title — uses editable label, falls back to type label */}
        <div
          className="font-black tracking-wider uppercase text-xs"
          style={{
            color: titleColor,
            textShadow: titleGlow === 'none' ? undefined : titleGlow,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {label || typeLabel}
        </div>
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
            <p className="text-[12px] text-white/60 font-mono truncate">{notifId}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {shake && <span className="text-[10px] text-white/30">📳 Shake</span>}
              <span className="text-[10px] text-white/25">{duration}ms</span>
              {effectiveImageRef && <span className="text-[10px] text-emerald-400/50">🖼️</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
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
