'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS, CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, LogOut, Package, Hammer, Wrench,
  Save, Upload, Search, CheckCircle2, Eye, Heart
} from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';
import ItemBoxPanel from './ItemBoxPanel';
import CraftingPanel from './CraftingPanel';
import EquipmentPanel from './EquipmentPanel';
import { CompactHpPanel } from './HpBar';

type SafeRoomTab = 'itembox' | 'crafting' | 'equipment';
type SaveMode = 'save' | 'load';

export default function SafeRoomPanel() {
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const searchedSafeRooms = useGameStore(s => s.searchedSafeRooms);
  const searchSafeRoom = useGameStore(s => s.searchSafeRoom);
  const exitSafeRoom = useGameStore(s => s.exitSafeRoom);
  const party = useGameStore(s => s.party);
  const dataVersion = useGameStore(s => s.dataVersion);
  const [activeTab, setActiveTab] = useState<SafeRoomTab>('itembox');
  const [saveModal, setSaveModal] = useState<SaveMode | null>(null);

  const location = LOCATIONS[currentLocationId];
  const safeRoomDef = location?.subAreas?.find(sa => sa.id === 'safe_room');
  const hasBeenSearched = searchedSafeRooms.includes(currentLocationId);
  const hasItemPool = (location?.itemPool?.length ?? 0) > 0;

  const tabs: { id: SafeRoomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'itembox', label: 'Item Box', icon: <Package className="w-5 h-5" /> },
    { id: 'crafting', label: 'Crafting', icon: <Hammer className="w-5 h-5" /> },
    { id: 'equipment', label: 'Mod/Potenziamenti', icon: <Wrench className="w-5 h-5" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-dvh sm:h-screen game-horror flex flex-col overflow-hidden"
      role="main"
    >
      {/* Header */}
      <div className="relative h-20 sm:h-32 shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-emerald-950/20 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)]" />

        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Home className="w-5 h-5 text-emerald-400" />
              <Badge className="border-emerald-500/30 text-emerald-400 text-sm bg-emerald-500/10 px-2.5 py-0.5">
                SAFE ROOM
              </Badge>
              <Badge variant="outline" className="border-white/[0.1] text-white/50 text-sm">
                {location?.name}
              </Badge>
              {/* Header buttons: Esci first, then Salva/Carica */}
              <div className="ml-auto flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exitSafeRoom}
                  className="text-sm border-red-500/20 hover:border-red-400/40 text-red-400/70 hover:text-red-300 bg-red-950/20 hover:bg-red-900/30 h-9 px-3"
                  title="Esci dalla Safe Room"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Esci</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveModal('save')}
                  className="text-sm border-white/10 hover:border-amber-500/30 text-white/50 hover:text-amber-400 bg-white/[0.06] hover:bg-amber-500/[0.06] h-9 px-3"
                  title="Salva partita"
                  aria-label="Salva partita"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Salva</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveModal('load')}
                  className="text-sm border-white/10 hover:border-cyan-500/30 text-white/50 hover:text-cyan-400 bg-white/[0.06] hover:bg-cyan-500/[0.06] h-9 px-3"
                  title="Carica partita"
                  aria-label="Carica partita"
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Carica</span>
                </Button>
              </div>
            </div>
            {safeRoomDef && (
              <p className="text-sm text-white/50 mt-1 max-w-lg hidden sm:block">{safeRoomDef.description}</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Search bar */}
      {hasItemPool && (
        <div className="shrink-0 px-3 py-2.5 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            {hasBeenSearched ? (
              <div className="flex items-center gap-2 text-xs text-white/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-500/40" />
                <span>Area già perlustrata</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={searchSafeRoom}
                className="text-sm border-amber-500/20 hover:border-amber-400/40 text-amber-400/80 hover:text-amber-300 bg-amber-950/20 hover:bg-amber-900/30 h-9 px-4 gap-2"
              >
                <Search className="w-4 h-4" />
                Cerca nella stanza
              </Button>
            )}
            {!hasBeenSearched && (
              <span className="text-[10px] text-white/20 italic">Una sola volta per Safe Room</span>
            )}
          </div>
        </div>
      )}

      {/* Party HP Bar Row */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Heart className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Gruppo</span>
        </div>
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 scrollbar-none">
          {party.map(char => {
            const pct = char.maxHp > 0 ? Math.max(0, Math.min(100, (char.currentHp / char.maxHp) * 100)) : 0;
            const hpColor = char.currentHp <= 0 ? '#6b7280' : pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#f87171';
            return (
              <div key={char.id} className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.06]">
                <div className={`w-8 h-8 rounded overflow-hidden border shrink-0 ${char.currentHp <= 0 ? 'grayscale opacity-40 border-gray-700/30' : 'border-gray-600/40'}`}>
                  <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt={char.name} className="w-full h-full object-cover object-[center_15%]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-white truncate leading-tight">{char.name}</span>
                  <span className="font-mono font-bold text-[9px] leading-none" style={{ color: hpColor }}>
                    {char.currentHp}/{char.maxHp}
                  </span>
                  <div className="w-16 h-1 rounded-full overflow-hidden bg-white/[0.08]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: hpColor, boxShadow: `0 0 4px ${hpColor}66` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden lg:flex gap-2 overflow-x-auto">
          {party.map(char => (
            <div key={char.id} className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06]">
              <div className={`w-8 h-8 rounded overflow-hidden border shrink-0 ${char.currentHp <= 0 ? 'grayscale opacity-40 border-gray-700/30' : 'border-gray-600/40'}`}>
                <img src={mediaUrl(char.avatarUrl || CHARACTER_IMAGES[char.archetype] || '', dataVersion)} alt={char.name} className="w-full h-full object-cover object-[center_15%]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-white truncate block leading-tight">{char.name}</span>
              </div>
              <div className="w-28 h-10 shrink-0 overflow-hidden rounded">
                <CompactHpPanel
                  current={char.currentHp}
                  max={char.maxHp}
                  statusEffects={char.statusEffects}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="shrink-0 px-3 pt-3 pb-0 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                  : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
              aria-label={`Tab ${tab.label}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content area — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'itembox' && <ItemBoxPanel />}
        {activeTab === 'crafting' && (
          <div className="h-full overflow-y-auto p-4 inventory-scrollbar">
            <CraftingPanel />
          </div>
        )}
        {activeTab === 'equipment' && (
          <div className="h-full overflow-y-auto p-4 inventory-scrollbar">
            <EquipmentPanel />
          </div>
        )}
      </div>

      {/* Save/Load Modal */}
      {saveModal && (
        <SaveLoadPanel
          mode={saveModal}
          defaultOpen={saveModal}
          onClose={() => setSaveModal(null)}
        />
      )}
    </motion.div>
  );
}
