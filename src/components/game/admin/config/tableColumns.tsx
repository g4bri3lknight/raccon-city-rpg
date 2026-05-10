import React, { useState, useRef, useEffect } from 'react';
import {
  X, Play, Pause, Eye,
  Volume2, ImageIcon,
} from 'lucide-react';
import ItemIcon from '@/components/game/ItemIcon';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Rarity } from '@/game/types';
import { adminFetch } from '@/lib/admin-fetch';
import type { TabId } from './tabGroups';
import { getEnumLabel } from './enumLabels';

// ═══════════════════════════════════════════════════════════════
// Table Column Definitions
// ═══════════════════════════════════════════════════════════════
export interface ColumnDef {
  key: string;
  label: string;
  width?: string; // CSS width class
  render?: (row: Record<string, unknown>, tabId: TabId) => React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// Sound Preview Button (used by TABLE_COLUMNS.sounds)
// ═══════════════════════════════════════════════════════════════
function SoundPreviewButton({ soundId, hasFile }: { soundId: string; hasFile: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!hasFile) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    } else {
      const audio = new Audio(`/api/media/sound?ref=${encodeURIComponent(soundId)}`);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlaying(true);
    }
  };

  return (
    <button
      type="button"
      onClick={togglePlay}
      disabled={!hasFile}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        hasFile
          ? playing
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            : 'bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] border border-white/[0.08]'
          : 'bg-white/[0.02] text-white/10 cursor-not-allowed border border-white/[0.04]'
      }`}
      title={hasFile ? (playing ? 'Ferma' : 'Riproduci') : 'Nessun file'}
    >
      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Image Preview Thumbnail (used by TABLE_COLUMNS.images)
// ═══════════════════════════════════════════════════════════════
function ImagePreviewThumbnail({ imageId, hasFile, altText }: { imageId: string; hasFile: boolean; altText: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!hasFile) {
    return (
      <div className="w-10 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLightbox(true)}
        className="w-10 h-10 rounded-md overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors"
        title={altText || 'Visualizza immagine'}
      >
        {!imgError ? (
          <img
            src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
            alt={altText || imageId}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-white/20" />
          </div>
        )}
      </button>
      {showLightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
              alt={altText || imageId}
              className="max-w-full max-h-[75vh] rounded-lg border border-white/[0.1] shadow-2xl"
            />
            <p className="text-xs text-white/40 text-center mt-2 font-mono">{imageId}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Location Background Thumbnail (used by TABLE_COLUMNS.locations)
// ═══════════════════════════════════════════════════════════════
function LocationBgThumbnail({ locationId }: { locationId: string }) {
  const [hasBg, setHasBg] = useState(false);
  const imageId = `bg_${locationId}`;

  useEffect(() => {
    // Check if image exists in DB
    adminFetch('/api/admin/images')
      .then(res => res.json())
      .then(items => {
        const found = Array.isArray(items) && items.some((r: Record<string, unknown>) => r.id === imageId && r.data);
        setHasBg(found);
      })
      .catch(() => setHasBg(false));
  }, [imageId]);

  if (!hasBg) {
    return (
      <div className="w-16 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <div
      className="w-16 h-10 rounded-md overflow-hidden border border-white/[0.08]"
      style={{ backgroundImage: `url('/api/media/image?id=${encodeURIComponent(imageId)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// TABLE_COLUMNS constant
// ═══════════════════════════════════════════════════════════════
export const TABLE_COLUMNS: Record<TabId, ColumnDef[]> = {
  items: [
    {
      key: '_icon',
      label: '',
      width: 'w-10',
      render: (row) => (
        <ItemIcon
          itemId={String(row.id)}
          rarity={(String(row.rarity) as Rarity) || 'common'}
          size={32}
        />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-36' },
    { key: 'name', label: 'Nome' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('itemType', String(row.type))}
        </Badge>
      ),
    },
    {
      key: 'rarity',
      label: 'Rarità',
      width: 'w-32',
      render: (row) => {
        const r = String(row.rarity);
        const rarityColor: Record<string, string> = {
          common: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
          uncommon: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
          rare: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/15',
          epic: 'border-purple-400/40 text-purple-300 bg-purple-400/15',
          legendary: 'border-emerald-300/40 text-emerald-200 bg-emerald-300/15',
        };
        return (
          <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${rarityColor[r] ?? ''}`}>
            {getEnumLabel('rarity', r)}
          </Badge>
        );
      },
    },
    {
      key: '_unico',
      label: 'Unico',
      width: 'w-16',
      render: (row) => (
        <span className={row.unico ? 'text-emerald-400' : 'text-white/20'}>
          {row.unico ? '★' : '—'}
        </span>
      ),
    },
    {
      key: '_stats',
      label: 'Stats / Effetti',
      width: 'w-56',
      render: (row) => {
        const parts: string[] = [];
        const itemType = String(row.type ?? '');
        // For weapons without effects, show weapon type
        if ((itemType === 'weapon' || itemType === 'weapon_mod') && row.weaponType) {
          parts.push(row.weaponType === 'melee' ? '🗡️ Melee' : '🔫 Ranged');
          if (row.ammoType) parts.push(`🔶 ${String(row.ammoType)}`);
          if (row.modType) parts.push(`🔗 ${String(row.modType)}`);
        }
        // Parse effects to show all effect types
        try {
          const effects = typeof row.effects === 'string' ? JSON.parse(row.effects) : (row.effects || []);
          if (Array.isArray(effects)) {
            for (const e of effects) {
              switch (e.type) {
                case 'buff_stat': {
                  const icons: Record<string, string> = { atk: '⚔️', def: '🛡️', hp: '❤️', spd: '💨', crit: '💥' };
                  const pct = e.percent ? `${e.percent}%` : '';
                  const flat = e.flat ? `${e.amount}` : '';
                  const val = pct || flat;
                  const label = e.stat ? (icons[e.stat] || '') : '';
                  const suffix = e.stat === 'crit' && e.flat ? '%' : '';
                  if (val) parts.push(`${label}${val}${suffix}`);
                  break;
                }
                case 'heal': {
                  const pct = e.percent ? `❤️${e.percent >= 100 ? 'Full HP' : e.percent + '%'}` : '';
                  const flat = e.amount ? `❤️+${e.amount} HP` : '';
                  parts.push(pct || flat);
                  break;
                }
                case 'deal_damage': {
                  const mult = e.powerMultiplier ? `💥×${e.powerMultiplier}` : (e.power ? `💥${e.power}` : '💥DMG');
                  if (e.target === 'all_enemies') parts.push(`${mult} (AOE)`);
                  else parts.push(mult);
                  break;
                }
                case 'remove_status': {
                  const statuses: string[] = Array.isArray(e.statuses) ? e.statuses : [];
                  if (statuses.length > 0) parts.push(`✨ Cure ${statuses.join('/')}`);
                  break;
                }
                case 'add_slots': {
                  parts.push(`🧳+${e.amount || 0} slot`);
                  break;
                }
                case 'shield': {
                  parts.push(`🛡️${e.amount || 0} HP`);
                  break;
                }
                case 'hot': {
                  parts.push(`💚${e.amountPerTurn || e.amount || 0} HP/t`);
                  break;
                }
                case 'reflect': {
                  parts.push(`🔥${e.percent || 0}% rifletti`);
                  break;
                }
                case 'status_resist': {
                  const sLabels: Record<string, string> = { poison: 'Veleno', bleeding: 'Sangui', stunned: 'Stord', all: 'Tutti' };
                  parts.push(`🧪${sLabels[e.statusType] || e.statusType} ${e.value}%`);
                  break;
                }
                case 'status_chance_boost': {
                  parts.push(`☠️+${e.amount}% status`);
                  break;
                }
              }
            }
          }
        } catch { /* ignore parse errors */ }
        if (parts.length === 0) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/50 flex flex-wrap gap-x-2 gap-y-0.5">{parts.map(p => <span key={p}>{p}</span>)}</span>;
      },
    },
  ],
  quests: [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome' },
    { key: 'npcId', label: 'NPC ID', width: 'w-32' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('questType', String(row.type))}
        </Badge>
      ),
    },
  ],
  events: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'title', label: 'Titolo' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('eventType', String(row.type))}
        </Badge>
      ),
    },
    {
      key: 'duration',
      label: 'Durata',
      width: 'w-20',
      render: (row) => <span className="text-white/50">{row.duration} turni</span>,
    },
    {
      key: 'chainId',
      label: 'Chain',
      width: 'w-28',
      render: (row) => {
        const c = String(row.chainId ?? '');
        if (!c) return <span className="text-white/15 text-[12px]">—</span>;
        return <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-purple-500/30 text-purple-300 bg-purple-500/10">{c}</Badge>;
      },
    },
    {
      key: 'nextEventId',
      label: 'Next →',
      width: 'w-36',
      render: (row) => {
        const n = String(row.nextEventId ?? '');
        if (!n) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/50 font-mono">{n}</span>;
      },
    },
  ],
  documents: [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'title', label: 'Titolo' },
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-36',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('documentType', String(row.type))}
        </Badge>
      ),
    },
    { key: 'locationId', label: 'Luogo', width: 'w-32' },
  ],
  sounds: [
    {
      key: '_preview',
      label: '',
      width: 'w-12',
      render: (row) => (
        <SoundPreviewButton soundId={String(row.id)} hasFile={typeof row.data === 'string'} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    { key: 'refKey', label: 'refKey', width: 'w-44' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-36',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('soundCategory', String(row.category))}
        </Badge>
      ),
    },
    {
      key: 'data',
      label: 'File',
      width: 'w-20',
      render: (row) => (
        <span className={`text-[12px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
  images: [
    {
      key: '_preview',
      label: '',
      width: 'w-14',
      render: (row) => (
        <ImagePreviewThumbnail imageId={String(row.id)} hasFile={typeof row.data === 'string'} altText={String(row.altText ?? row.name ?? '')} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    { key: 'refKey', label: 'refKey', width: 'w-44' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-32',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('imageCategory', String(row.category))}
        </Badge>
      ),
    },
    {
      key: 'data',
      label: 'File',
      width: 'w-20',
      render: (row) => (
        <span className={`text-[12px] ${typeof row.data === 'string' ? 'text-green-400' : 'text-white/20'}`}>
          {typeof row.data === 'string' ? '✓' : '—'}
        </span>
      ),
    },
  ],
  notifications: [
    {
      key: 'type',
      label: 'Tipo',
      width: 'w-36',
      render: (row) => {
        const t = String(row.type ?? '');
        const labels: Record<string, string> = {
          encounter: '⚔️ Incontro',
          victory: '🏆 Vittoria',
          defeat: '💀 Sconfitta',
          item_found: '📦 Oggetto',
          bag_expand: '🎒 Zaino',
          collectible_found: '💎 Collezionabile',
        };
        return <span className="text-[13px] text-white/70">{labels[t] || t}</span>;
      },
    },
    { key: 'label', label: 'Etichetta', width: 'w-36' },
    { key: 'icon', label: 'Icona', width: 'w-16' },
    {
      key: 'cardBg',
      label: 'Sfondo',
      width: 'w-12',
      render: (row) => (
        <div
          className="w-3 h-3 rounded-sm border border-white/10"
          style={{ backgroundColor: String(row.cardBg ?? '#1a1a2e') }}
          title={String(row.cardBg ?? '')}
        />
      ),
    },
    {
      key: 'titleColor',
      label: 'Titolo',
      width: 'w-12',
      render: (row) => (
        <div
          className="w-3 h-3 rounded-sm border border-white/10"
          style={{ backgroundColor: String(row.titleColor ?? '#ffffff') }}
          title={String(row.titleColor ?? '')}
        />
      ),
    },
    {
      key: 'shake',
      label: 'Shake',
      width: 'w-16',
      render: (row) => (
        <span className={row.shake ? 'text-emerald-400 text-[12px]' : 'text-white/15 text-[12px]'}>
          {row.shake ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Durata',
      width: 'w-20',
      render: (row) => <span className="text-white/50 text-[13px]">{row.duration}ms</span>,
    },
    {
      key: 'media',
      label: 'Media',
      width: 'w-20',
      render: (row) => {
        const hasImg = !!row.imageRef;
        const hasSnd = !!row.soundRef;
        return (
          <div className="flex items-center gap-1">
            {hasImg ? <ImageIcon className="w-3 h-3 text-emerald-400/70" /> : <ImageIcon className="w-3 h-3 text-white/10" />}
            {hasSnd ? <Volume2 className="w-3 h-3 text-green-400/70" /> : <Volume2 className="w-3 h-3 text-white/10" />}
          </div>
        );
      },
    },
  ],
  locations: [
    {
      key: '_preview',
      label: '',
      width: 'w-20',
      render: (row) => (
        <LocationBgThumbnail locationId={String(row.id)} />
      ),
    },
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-48' },
    {
      key: 'encounterRate',
      label: 'Viaggio',
      width: 'w-20',
      render: (row) => {
        const rate = Number(row.encounterRate ?? 0);
        if (rate === 0) return <span className="text-[12px] text-white/20">1 turn</span>;
        const turns = rate > 40 ? '2 turni' : '1 turn';
        const color = rate > 40 ? 'text-amber-400' : 'text-white/50';
        return <span className={`text-[13px] font-mono ${color}`}>{turns}</span>;
      },
    },
    {
      key: 'isBossArea',
      label: 'Boss',
      width: 'w-16',
      render: (row) => (
        <span className={row.isBossArea ? 'text-red-400 text-[12px] font-bold' : 'text-white/15 text-[12px]'}>
          {row.isBossArea ? 'BOSS' : '—'}
        </span>
      ),
    },
    {
      key: 'nextLocations',
      label: 'Uscite',
      width: 'w-20',
      render: (row) => {
        let exits: string[] = [];
        try { exits = typeof row.nextLocations === 'string' ? JSON.parse(row.nextLocations) : (row.nextLocations as string[] ?? []); } catch { /* empty */ }
        return <span className="text-[12px] text-white/40 font-mono">{exits.length}</span>;
      },
    },
    {
      key: '_roomCount',
      label: 'Stanze',
      width: 'w-20',
      render: (row) => {
        const count = Number(row._roomCount ?? 0);
        return <span className={`text-[12px] font-mono ${count > 0 ? 'text-white/50' : 'text-white/15'}`}>{count}</span>;
      },
    },
  ],
  npcs: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome', width: 'w-36' },
    {
      key: 'portrait',
      label: 'Ritratto',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.portrait ?? '❓')}</span>,
    },
    {
      key: 'locationId',
      label: 'Location',
      width: 'w-40',
      render: (row) => <span className="text-[12px] text-white/50 font-mono">{String(row.locationId ?? '')}</span>,
    },
    {
      key: 'questId',
      label: 'Quest',
      width: 'w-16',
      render: (row) => (
        <span className={row.questId ? 'text-emerald-400 text-[12px]' : 'text-white/15 text-[12px]'}>
          {row.questId ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'dialogues',
      label: 'Dialoghi',
      width: 'w-16',
      render: (row) => {
        let count = 0;
        try { count = typeof row.dialogues === 'string' ? JSON.parse(row.dialogues).length : Array.isArray(row.dialogues) ? row.dialogues.length : 0; } catch { count = 0; }
        return <span className="text-[12px] text-white/40 font-mono">{count}</span>;
      },
    },
  ],
  archetypes: [
    { key: 'portraitEmoji', label: '', width: 'w-12', render: (row) => <span className="text-sm">{String(row.portraitEmoji ?? '⚔️')}</span> },
    { key: 'name', label: 'Nome', width: 'w-40' },
    { key: 'displayName', label: 'Display', width: 'w-40', render: (row) => {
      const d = String(row.displayName ?? '');
      return d ? <span className="text-[13px] text-white/50">{d}</span> : <span className="text-white/15 text-[12px]">—</span>;
    }},
    {
      key: 'maxHp', label: 'HP', width: 'w-16',
      render: (row) => <span className="text-[12px] text-green-400/70 font-mono">{row.maxHp}</span>,
    },
    {
      key: 'atk', label: 'ATK', width: 'w-16',
      render: (row) => <span className="text-[12px] text-red-400/70 font-mono">{row.atk}</span>,
    },
    {
      key: 'def', label: 'DEF', width: 'w-16',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.def}</span>,
    },
    {
      key: 'spd', label: 'SPD', width: 'w-16',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.spd}</span>,
    },
    {
      key: 'growth', label: 'Growth', width: 'w-32',
      render: (row) => {
        const parts: string[] = [];
        const hp = Number(row.hpGrowth);
        const atk = Number(row.atkGrowth);
        const def = Number(row.defGrowth);
        const spd = Number(row.spdGrowth);
        if (hp !== 1.0) parts.push(`HP×${hp}`);
        if (atk !== 1.0) parts.push(`ATK×${atk}`);
        if (def !== 1.0) parts.push(`DEF×${def}`);
        if (spd !== 1.0) parts.push(`SPD×${spd}`);
        if (parts.length === 0) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/40 font-mono">{parts.join(' ')}</span>;
      },
    },
  ],
  characters: [
    { key: 'id', label: 'ID', width: 'w-28' },
    { key: 'displayName', label: 'Nome', width: 'w-36' },
    {
      key: 'archetype',
      label: 'Ruolo',
      width: 'w-28',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('archetype', String(row.archetype))}
        </Badge>
      ),
    },
    {
      key: 'portraitEmoji',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.portraitEmoji ?? '🎮')}</span>,
    },
    { key: 'name', label: 'Classe', width: 'w-28' },
    {
      key: 'maxHp',
      label: 'HP',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-green-400/70 font-mono">{row.maxHp}</span>,
    },
    {
      key: 'atk',
      label: 'ATK',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-red-400/70 font-mono">{row.atk}</span>,
    },
    {
      key: 'def',
      label: 'DEF',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.def}</span>,
    },
    {
      key: 'spd',
      label: 'SPD',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.spd}</span>,
    },
  ],
  specials: [
    {
      key: '_icon',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.icon ?? '⚡')}</span>,
    },
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-28',
      render: (row) => {
        const cat = String(row.category ?? '');
        const catColors: Record<string, string> = {
          offensive: 'border-red-500/30 text-red-400 bg-red-500/10',
          defensive: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
          support: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          control: 'border-emerald-600/30 text-emerald-500 bg-emerald-600/10',
        };
        return (
          <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${catColors[cat] ?? ''}`}>
            {getEnumLabel('specialCategory', cat)}
          </Badge>
        );
      },
    },
    {
      key: 'targetType',
      label: 'Bersaglio',
      width: 'w-28',
      render: (row) => (
        <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">
          {getEnumLabel('specialTargetType', String(row.targetType))}
        </Badge>
      ),
    },
    {
      key: 'cooldown',
      label: 'CD',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-white/40 font-mono">{row.cooldown}t</span>,
    },
  ],
  enemies: [
    {
      key: '_icon',
      label: '',
      width: 'w-12',
      render: (row) => <span className="text-sm">{String(row.icon ?? '🧟')}</span>,
    },
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome', width: 'w-36' },
    {
      key: 'maxHp',
      label: 'HP',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-green-400/70 font-mono">{row.maxHp}</span>,
    },
    {
      key: 'atk',
      label: 'ATK',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-red-400/70 font-mono">{row.atk}</span>,
    },
    {
      key: 'def',
      label: 'DEF',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.def}</span>,
    },
    {
      key: 'spd',
      label: 'SPD',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.spd}</span>,
    },
    {
      key: 'expReward',
      label: 'EXP',
      width: 'w-14',
      render: (row) => <span className="text-[12px] text-emerald-400/70 font-mono">{row.expReward}</span>,
    },
    {
      key: 'isBoss',
      label: 'Boss',
      width: 'w-16',
      render: (row) => (
        <span className={row.isBoss ? 'text-red-400 text-[12px] font-bold' : 'text-white/15 text-[12px]'}>
          {row.isBoss ? 'BOSS' : '—'}
        </span>
      ),
    },
    {
      key: 'variantGroup',
      label: 'Variante',
      width: 'w-24',
      render: (row) => {
        const vg = String(row.variantGroup ?? '');
        if (!vg) return <span className="text-white/15 text-[12px]">—</span>;
        return <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-white/10 text-white/70 bg-white/[0.04]">{vg}</Badge>;
      },
    },
    {
      key: 'abilities',
      label: 'Abilità',
      width: 'w-16',
      render: (row) => {
        let count = 0;
        try { count = typeof row.abilities === 'string' ? JSON.parse(row.abilities).length : Array.isArray(row.abilities) ? row.abilities.length : 0; } catch { count = 0; }
        return <span className="text-[12px] text-white/40 font-mono">{count}</span>;
      },
    },
  ],
  'enemy-abilities': [
    { key: 'id', label: 'ID', width: 'w-44' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    {
      key: 'power',
      label: 'Potenza',
      width: 'w-20',
      render: (row) => {
        const p = Number(row.power);
        const color = p >= 2.0 ? 'text-red-400' : p >= 1.5 ? 'text-emerald-400' : p >= 1.0 ? 'text-white/70' : 'text-green-400/70';
        return <span className={`text-[13px] font-mono ${color}`}>{p.toFixed(1)}x</span>;
      },
    },
    {
      key: 'chance',
      label: 'Prob. %',
      width: 'w-18',
      render: (row) => <span className="text-[12px] text-white/50 font-mono">{row.chance}%</span>,
    },
    {
      key: 'statusType',
      label: 'Status',
      width: 'w-28',
      render: (row) => {
        // Read status from atomic effects[] instead of legacy statusType
        let effectsArr: any[] = [];
        try { effectsArr = row.effects ? JSON.parse(row.effects) : []; } catch {}
        const statusEffect = effectsArr.find((e: any) => e.type === 'apply_status');
        if (!statusEffect) return <span className="text-white/15 text-[12px]">—</span>;
        const st = statusEffect.statusType;
        const statusColors: Record<string, string> = {
          poison: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
          bleeding: 'border-red-500/30 text-red-400 bg-red-500/10',
          stunned: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          adrenaline: 'border-emerald-600/30 text-emerald-500 bg-emerald-600/10',
        };
        return (
          <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${statusColors[st] ?? ''}`}>
            {getEnumLabel('statusEffect', st)} {statusEffect.chance ? `(${statusEffect.chance}%)` : ''}
          </Badge>
        );
      },
    },
  ],
  'boss-phases': [
    { key: 'id', label: 'ID', width: 'w-48' },
    {
      key: 'enemyId',
      label: 'Boss',
      width: 'w-36',
      render: (row) => {
        const bossNames: Record<string, string> = { tyrant_boss: 'T-103', nemesis_boss: 'NEMESIS', proto_tyrant: 'Proto-Tyrant' };
        const name = bossNames[String(row.enemyId)] || String(row.enemyId);
        return <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-red-500/30 text-red-400 bg-red-500/10">{name}</Badge>;
      },
    },
    { key: 'name', label: 'Fase', width: 'w-28' },
    {
      key: 'hpThreshold',
      label: 'HP %',
      width: 'w-16',
      render: (row) => <span className="text-[12px] text-red-400/80 font-mono">{Math.round(Number(row.hpThreshold) * 100)}%</span>,
    },
    {
      key: 'mults',
      label: 'Molt.',
      width: 'w-36',
      render: (row) => {
        const hp = Number(row.hpMultiplier);
        const atk = Number(row.atkMultiplier);
        const def = Number(row.defMultiplier);
        const spd = Number(row.spdMultiplier);
        const parts: string[] = [];
        if (hp !== 1.0) parts.push(`HP×${hp}`);
        if (atk !== 1.0) parts.push(`ATK×${atk}`);
        if (def !== 1.0) parts.push(`DEF×${def}`);
        if (spd !== 1.0) parts.push(`SPD×${spd}`);
        if (parts.length === 0) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-emerald-400/70 font-mono">{parts.join(' ')}</span>;
      },
    },
    {
      key: 'newAbilities',
      label: 'Abilità',
      width: 'w-24',
      render: (row) => {
        let count = 0;
        try { count = typeof row.newAbilities === 'string' ? JSON.parse(row.newAbilities).length : Array.isArray(row.newAbilities) ? row.newAbilities.length : 0; } catch { count = 0; }
        return count > 0 ? <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">+{count}</Badge> : <span className="text-white/15 text-[12px]">—</span>;
      },
    },
  ],
  'achievements': [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    { key: 'icon', label: 'Icona', width: 'w-12' },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-28',
      render: (row) => {
        const catColors: Record<string, string> = {
          combat: 'border-red-500/30 text-red-400 bg-red-500/10',
          exploration: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          collection: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          story: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          special: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        };
        const catLabels: Record<string, string> = { combat: 'Combattimento', exploration: 'Esplorazione', collection: 'Collezione', story: 'Storia', special: 'Speciale' };
        const cat = String(row.category);
        return <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${catColors[cat] || ''}`}>{catLabels[cat] || cat}</Badge>;
      },
    },
    { key: 'condition', label: 'Condizione', width: 'w-44' },
    {
      key: 'hidden',
      label: 'Nascosto',
      width: 'w-16',
      render: (row) => row.hidden ? <span className="text-[12px] text-emerald-400">✓</span> : <span className="text-white/15 text-[12px]">—</span>,
    },
    { key: 'reward', label: 'Ricompensa', width: 'w-36' },
  ],
  'endings': [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'title', label: 'Titolo', width: 'w-40' },
    { key: 'icon', label: 'Icona', width: 'w-12' },
    {
      key: 'priority',
      label: 'Priorità',
      width: 'w-20',
      render: (row) => <span className="text-[12px] text-white/50 font-mono">{row.priority}</span>,
    },
    {
      key: 'color',
      label: 'Colore',
      width: 'w-20',
      render: (row) => (
        <span className="w-4 h-4 rounded-sm inline-block" style={{ backgroundColor: String(row.color ?? '#22c55e') }} />
      ),
    },
    {
      key: 'requirements',
      label: 'Req.',
      width: 'w-16',
      render: (row) => {
        let count = 0;
        try { count = typeof row.requirements === 'string' ? JSON.parse(row.requirements).length : Array.isArray(row.requirements) ? row.requirements.length : 0; } catch { count = 0; }
        return <span className="text-[12px] text-white/40 font-mono">{count}</span>;
      },
    },
  ],
  'secret-rooms': [
    { key: 'id', label: 'ID', width: 'w-52' },
    { key: 'name', label: 'Nome', width: 'w-44' },
    { key: 'locationId', label: 'Location', width: 'w-36' },
    {
      key: 'discoveryMethod',
      label: 'Scoperta',
      width: 'w-28',
      render: (row) => {
        const m = String(row.discoveryMethod ?? 'search');
        const colors: Record<string, string> = {
          search: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
          document: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          npc_hint: 'border-emerald-600/30 text-emerald-500 bg-emerald-600/10',
        };
        return <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${colors[m] ?? ''}`}>{getEnumLabel('discoveryMethod', m)}</Badge>;
      },
    },
    {
      key: 'searchChance',
      label: 'Prob %',
      width: 'w-18',
      render: (row) => <span className="text-[12px] text-white/50 font-mono">{row.searchChance}%</span>,
    },
  ],
  recipes: [
    { key: 'id', label: 'ID', width: 'w-40' },
    { key: 'name', label: 'Nome' },
    {
      key: 'icon',
      label: '',
      width: 'w-10',
      render: (row) => <span className="text-sm">{String(row.icon ?? '🔧')}</span>,
    },
    {
      key: 'category',
      label: 'Categoria',
      width: 'w-28',
      render: (row) => {
        const colors: Record<string, string> = { ammo: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', healing: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10', booster: 'border-emerald-600/30 text-emerald-500 bg-emerald-600/10' };
        return <Badge variant="outline" className={`text-[12px] px-1.5 py-0 ${colors[String(row.category)] ?? ''}`}>{getEnumLabel('recipeCategory', String(row.category))}</Badge>;
      },
    },
    {
      key: 'ingredients',
      label: 'Ingredienti',
      width: 'w-48',
      render: (row) => {
        let ings: { itemId: string; quantity: number }[] = [];
        try { ings = typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : (Array.isArray(row.ingredients) ? row.ingredients : []); } catch { ings = []; }
        if (ings.length === 0) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/50 font-mono">{ings.map((i: { itemId: string; quantity: number }) => `${i.quantity ?? 1}×${i.itemId}`).join(', ')}</span>;
      },
    },
    {
      key: 'resultItemId',
      label: 'Risultato',
      width: 'w-40',
      render: (row) => {
        if (!row.resultItemId) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/70 font-mono">{row.resultQty > 1 ? `${row.resultQty}×` : ''}{String(row.resultItemId)}</span>;
      },
    },
    {
      key: 'difficulty',
      label: 'Difficoltà',
      width: 'w-24',
      render: (row) => {
        const colors: Record<string, string> = { easy: 'text-green-400', medium: 'text-emerald-400', hard: 'text-red-400' };
        return <span className={`text-[12px] ${colors[String(row.difficulty)] ?? 'text-white/50'}`}>{getEnumLabel('craftDifficulty', String(row.difficulty))}</span>;
      },
    },
  ],
  'avatars': [],
  'start-screen': [],
  settings:     [],
  'quest-chains': [
    { key: 'id', label: 'ID', width: 'w-48' },
    { key: 'npcId', label: 'NPC ID', width: 'w-36' },
    { key: 'name', label: 'Nome', width: 'w-40' },
    {
      key: 'description',
      label: 'Descrizione',
      width: 'w-56',
      render: (row) => {
        const d = String(row.description ?? '');
        if (!d) return <span className="text-white/15 text-[12px]">—</span>;
        return <span className="text-[12px] text-white/50" title={d}>{d.length > 60 ? d.slice(0, 60) + '…' : d}</span>;
      },
    },
    { key: 'sortOrder', label: 'Ordine', width: 'w-16' },
  ],
};
